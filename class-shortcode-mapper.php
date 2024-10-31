<?php
/**
 * Shortcode Mapping Class
 *
 * Functionality:
 * 1. Listen to plugin changes to trigger a shortcode mapping check.
 * 2. SC Mapping check against shortcodes.pagebuildersandwich.com REST API.
 * 3. Update the local DB collection of SC mappings.
 * 4. Manual triggering of SC mapping update via the PBS editor.
 * 5. Integrate with SC inspector area for SC settings.
 *
 * @since 2.18
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSShortcodeMapper' ) ) {

	/**
	 * This is where all the shortcode mapper functionality happens.
	 */
	class PBSShortcodeMapper {

		/**
		 * The URL of the Shortcode Mapper API Endpoint.
		 *
		 * @var string
		 */
		const SHORTCODE_MAPPING_URL = 'http://shortcodes.pagebuildersandwich.com/wp-json/pbs/v1/shortcode_maps/';

		/**
		 * The interval when to update the shortcode mapping.
		 *
		 * @var int
		 */
		const OCCASSIONAL_UPDATE_INTERVAL = DAY_IN_SECONDS;

		/**
		 * Hook into the frontend.
		 */
		function __construct() {
			// Perform mapping updates occassionally.
			add_action( 'admin_head', array( $this, 'sometimes_update_mappings' ), 999 );
			add_action( 'plugins_loaded', array( $this, 'sometimes_update_mappings' ), 999 );

			// Activating plugins should trigger a mapper update.
			add_action( 'activated_plugin', array( $this, 'clear_transient_to_update' ), 999 );

			// Switching themes should trigger a mapper update.
			add_action( 'after_switch_theme', array( $this, 'clear_transient_to_update' ), 999 );

			// Add the mapped shortcodes to the editor.
			add_filter( 'pbs_localize_scripts', array( $this, 'add_shortcode_mappings' ) );

			// We need all the post types for some shortcode options.
			add_filter( 'pbs_localize_scripts', array( $this, 'add_post_types' ) );

			// Used by the image/images attribute for getting image URLs from image IDs.
			add_action( 'wp_ajax_pbs_get_attachment_urls', array( $this, 'get_attachment_urls' ) );

			// Handle manual updates from the sc picker modal. Used by _pbs-frame-shortcode-picker.js.
			add_action( 'wp_ajax_pbs_update_shortcode_mappings', array( $this, 'ajax_pbs_update_shortcode_mappings' ) );

			if ( pbs_is_dev() ) {
				add_shortcode( 'pbs_sc_map_test', array( $this, 'pbs_sc_map_test' ) );
				add_action( 'init', array( $this, 'add_sample_mapping' ) );
			}
		}


		/**
		 * Remove the transient update checker so that the update will trigger again.
		 *
		 * @since 2.18
		 *
		 * @return void
		 */
		public function clear_transient_to_update() {
			delete_transient( 'pbs_scmapper_daily_check' );
		}


		/**
		 * There is no hook for updated plugins. Instead of checking during updates,
		 * just perform check occassionally.
		 *
		 * @since 2.18
		 *
		 * @return void
		 */
		public function sometimes_update_mappings() {
			if ( is_user_logged_in() && false === get_transient( 'pbs_scmapper_daily_check' ) ) {
				$this->update_shortcode_mappings();
				set_transient( 'pbs_scmapper_daily_check', 1, self::OCCASSIONAL_UPDATE_INTERVAL );
			}
		}


		/**
		 * Handle the manual updating of shortcode mappings from an ajax call.
		 *
		 * @since 2.18
		 *
		 * @return void
		 */
		public function ajax_pbs_update_shortcode_mappings() {
			if ( empty( $_POST['nonce'] ) ) { // Input var: okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var: okay.
			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}

			$this->update_shortcode_mappings();

			echo wp_json_encode( self::get_mappings() );
			die();
		}


		/**
		 * Update shortcode mappings.
		 *
		 * @since 2.18
		 *
		 * @return void
		 */
		public function update_shortcode_mappings() {
			$plugins = $this->get_all_plugin_slugs();
			$theme = $this->get_theme_slug();
			$shortcode_hashes = $this->get_all_shortcodes_and_hashes();

			$args = array(
				'headers' => array(
					'Content-Type' => 'application/x-www-form-urlencoded;charset=UTF-8',
				),
				'body' => 'plugins=' . urlencode( wp_json_encode( $plugins ) )
					. '&theme=' . urlencode( $theme )
					. '&shortcodes=' . urlencode( wp_json_encode( $shortcode_hashes ) ),
			);

			// Get the shortcode mappings from the server.
			$response = wp_remote_post( self::SHORTCODE_MAPPING_URL, $args );

			// Save the response.
			if ( ! is_wp_error( $response ) ) {
				if ( ! empty( $response['response']['code'] ) ) {
					if ( 200 === $response['response']['code'] ) {

						// Get the mappings.
						$mappings = json_decode( $response['body'], true );

						if ( ! is_array( $mappings ) ) {
							return;
						}

						// The attributes are serialized, unserialize them.
						foreach ( $mappings as $shortcode => $mapping ) {
							if ( preg_match( '/^_/', $shortcode ) ) {
								continue;
							}
							if ( ! empty( $mappings[ $shortcode ]['attributes'] ) ) {
								$mappings[ $shortcode ]['attributes'] = unserialize( $mappings[ $shortcode ]['attributes'] );
							}
						}

						// Save in the DB.
						self::save_mappings( $mappings );

						if ( ! empty( $mappings['_total'] ) ) {
							update_option( 'pbs_shortcode_mappings_total', $mappings['_total'] );
						}
						if ( ! empty( $mappings['_mapped_plugins'] ) ) {
							update_option( 'pbs_shortcode_mapped_plugins_total', $mappings['_mapped_plugins'] );
						}
						if ( ! empty( $mappings['_mapped_shortcodes'] ) ) {
							update_option( 'pbs_shortcode_mapped_shortcodes_total', $mappings['_mapped_shortcodes'] );
						}
					}
				}
			}
		}


		/**
		 * Get all the shortcode mappings.
		 *
		 * @since 2.18
		 *
		 * @return array The saved shortcode mappings.
		 */
		public static function get_mappings() {
			$mappings = get_option( 'pbs_shortcode_mappings' );
			if ( is_serialized( $mappings ) ) {
				$mappings = unserialize( $mappings );
			}
			if ( ! $mappings ) {
				$mappings = array();
			}
			return apply_filters( 'pbs_shortcode_mappings', $mappings );
		}


		/**
		 * Save the shortcode mappings in the DB.
		 *
		 * @since 2.18
		 *
		 * @param array $mappings The shortcode mappings array.
		 */
		public static function save_mappings( $mappings ) {
			update_option( 'pbs_shortcode_mappings', serialize( $mappings ) );
		}


		/**
		 * Gets all the available shortcodes in WP & hash representations of
		 * their information. The hash is computed by the SC Mapper API as:
		 *     $data = wp_json_encode( $shortcode->attributes ) . $shortcode->name . $shortcode->description;
	 	 *     $hash = substr( md5( $data ), 0, 5 );
		 *
		 * @since 2.18
		 *
		 * @return array Shortcodes and their hashes.
		 */
		private function get_all_shortcodes_and_hashes() {
			$shortcodes = PageBuilderSandwich::get_all_shortcodes();
			$mappings = self::get_mappings();

			$mapped_shortcodes_and_hashes = array();
			foreach ( $shortcodes as $shortcode ) {
				if ( ! empty( $mappings[ $shortcode ] ) ) {
					$hash = wp_json_encode( $mappings[ $shortcode ]['attributes'] );

					$name = '';
					if ( ! empty( $mappings[ $shortcode ]['name'] ) ) {
						$name = $mappings[ $shortcode ]['name'];
					}
					$hash .= $name;

					$desc = '';
					if ( ! empty( $mappings[ $shortcode ]['description'] ) ) {
						$desc = $mappings[ $shortcode ]['description'];
					}
					$hash .= $desc;

					$hash = substr( md5( $hash ), 0, 5 );

					$mapped_shortcodes_and_hashes[ $shortcode ] = $hash;
				}
			}

			return $mapped_shortcodes_and_hashes;
		}


		/**
		 * Gets all the active plugin slugs.
		 *
		 * @since 2.18
		 *
		 * @return array Active plugin slugs.
		 */
		private function get_all_plugin_slugs() {
			if ( ! function_exists( 'get_plugins' ) ) {
			    require_once ABSPATH . 'wp-admin/includes/plugin.php';
			}

			$all_plugins = get_plugins();
			$plugins = get_option( 'active_plugins', array() );
			$active_plugins = array();
			foreach ( $plugins as $slug ) {

				// The slug is either the directory name of the plugin, or the
				// slug generated from the plugin name.
				if ( false !== stripos( $slug, '/' ) ) {
					$slug = dirname( $slug );
				} else if ( ! empty( $all_plugins[ $slug ]['Name'] ) ) {
					$slug = sanitize_title( $all_plugins[ $slug ]['Name'] );
				}

				if ( $slug ) {
					$active_plugins[] = $slug;
				}
			}

			return $active_plugins;
		}


		/**
		 * Gets the theme slug.
		 *
		 * @since 2.18
		 *
		 * @return string The theme slug.
		 */
		private function get_theme_slug() {
			return get_option( 'stylesheet' );
		}


		/**
		 * Add the shortcode mappings into the editor parameters.
		 *
		 * @since 2.18
		 *
		 * @param array $params The localization parameters.
		 *
		 * @return array The modified localization parameters.
		 */
		public function add_shortcode_mappings( $params ) {
			$params['shortcode_mappings'] = self::get_mappings();
			return $params;
		}


		/**
		 * Gets all post type slugs and their display names.
		 *
		 * @since 2.18
		 *
		 * @param array $params The localization parameters.
		 *
		 * @return array The modified localization parameters.
		 */
		public function add_post_types( $params ) {
			$args = array(
			   'public' => true,
			   '_builtin' => true,
			);
			$post_types = get_post_types( $args, 'objects' );
			$args = array(
			   'public' => true,
			   '_builtin' => false,
			);
			$post_types2 = get_post_types( $args, 'objects' );
			$post_types = array_merge( $post_types, $post_types2 );
			$ret = array();
			foreach ( $post_types as $post_type ) {
				$slugname = $post_type->name;
				$name = $post_type->name;
				if ( ! empty( $post_type->labels->singular_name ) ) {
					$name = $post_type->labels->singular_name . ' (' . $slugname . ')';
				}
				$ret[ $slugname ] = $name;
			}

			$params['post_types'] = $ret;
			return $params;
		}


		/**
		 * Ajax handler for getting attachment URLs from an attachment ID.
		 *
		 * @since 2.18
		 */
		public function get_attachment_urls() {
			if ( empty( $_POST['nonce'] ) ) { // Input var: okay.
				die();
			}
			if ( ! wp_verify_nonce( sanitize_key( $_POST['nonce'] ), 'pbs' ) ) { // Input var: okay.
				die();
			}
			if ( empty( $_POST['image_ids'] ) ) { // Input var: okay.
				die();
			}

			$image_ids = trim( sanitize_text_field( wp_unslash( $_POST['image_ids'] ) ) ); // Input var: okay.
			$image_ids = explode( ',', $image_ids );

			$ret = array();
			foreach ( $image_ids as $image_id ) {
				$image_data = wp_get_attachment_image_src( $image_id, 'medium' );
				if ( empty( $image_data ) ) {
					$image_data = wp_get_attachment_image_src( $image_id, 'full' );
				}
				if ( empty( $image_data ) ) {
					continue;
				}
				$ret[ $image_id ] = $image_data[0];
			}

			echo wp_json_encode( $ret );
			die();
		}


		/**
		 * Adds testing shortcode mapping for the pbs_sc_map_test shortcode.
		 * Only used during development.
		 *
		 * @since 2.18
		 *
		 * @return void
		 */
		public function add_sample_mapping() {
			require_once( '_shortcode-mapper-tester.php' );

			$mappings = self::get_mappings();
			if ( empty( $mappings['pbs_sc_map_test'] ) ) {
				$mappings['pbs_sc_map_test'] = pbs_shortcode_mapper_test_data();
				self::save_mappings( $mappings );
			}
		}


		/**
		 * Dummy shortcode content that just outputs the shortcoe attributes.
		 * Only used during development.
		 *
		 * @since 2.18
		 *
		 * @param array  $atts Attributes.
		 * @param string $content Shortcode content.
		 *
		 * @return string $atts dump.
		 */
		public function pbs_sc_map_test( $atts, $content = '' ) {

			require_once( '_shortcode-mapper-tester.php' );
			$settings = pbs_shortcode_mapper_test_data();

			$ret = '<h3>' . esc_html( $settings['name'] ) . '<span style="font-size: .8em; display: block; font-style: italic; font-weight: normal !important;">' . esc_html( $settings['description'] ) . '</span></h3>';

			$ret .= '<table>';
			foreach ( $settings['attributes'] as $attr ) {
				$value = '';
				if ( array_key_exists( $attr['attribute'], $atts ) ) {
					$value = $atts[ $attr['attribute'] ];
				}
				if ( 'content' === $attr['attribute'] ) {
					$value = $content;
				}
				$ret .= '<tr>';
				$ret .= '<th>' . esc_html( $attr['name'] ) . '<span style="font-size: .8em; display: block; font-style: italic; font-weight: normal;">' . esc_html( $attr['description'] ) . '</span></th>';
				$ret .= '<td>' . esc_html( $value ) . '</td>';
				$ret .= '</tr>';
			}
			$ret .= '</table>';

			return $ret;
		}
	}
}

new PBSShortcodeMapper();
