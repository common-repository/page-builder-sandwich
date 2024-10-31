<?php
/**
 * Display our settings page.
 *
 * @since 3.4
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBS_Admin_Settings' ) ) {

	/**
	 * This is where all the admin page creation happens.
	 */
	class PBS_Admin_Settings {

		/**
		 * Hook into WordPress.
		 */
		function __construct() {
			add_action( 'admin_menu', array( $this, 'create_admin_menu' ), 11 );
			add_action( 'admin_init', array( $this, 'migrate_and_unify_old_settings' ), 0 );
			add_action( 'admin_init', array( $this, 'settings_page_init' ) );

			if ( PBS_IS_LITE ) {
				add_action( 'admin_init', array( $this, 'lite_settings_init' ) );
				add_filter( 'pbs_localize_scripts', array( $this, 'add_premium_flags_param' ) );
			}

			add_action( 'wp_ajax_premium_flag_toggle', array( $this, 'ajax_premium_flag_toggle' ) );
		}


		/**
		 * The old settings used `pbs_lite_options`, now we're unifying them
		 * all to `pbs_options`. This is to move the old ones into the new one.
		 *
		 * @since 4.0
		 */
		public function migrate_and_unify_old_settings() {

			// Check if we have some old settings.
			$has_old_settings = false;
			$options = get_option( 'pbs_lite_options' );
			if ( $options ) {
				if ( ! empty( $options['pbs_show_premium_flag'] ) ) {
					$has_old_settings = true;
				}
				delete_option( 'pbs_lite_options' );
			}

			if ( $has_old_settings ) {
				$options = get_option( 'pbs_options' );
				if ( ! $options ) {
					$options = array();
				}
				$options['pbs_show_premium_flag'] = true;
				update_option( 'pbs_options', $options );
			}
		}

		/**
		 * Initialize our options page.
		 *
		 * @since 4.4.2
		 */
		public function settings_page_init() {

			// Register a new setting for lite options.
			register_setting(
				'pbs_options_group', // Group name.
				'pbs_options' // Option name.
			);
		}


		/**
		 * Initialize our settings page.
		 *
		 * @since 3.4
		 */
		public function lite_settings_init() {

			// Register the lite settings section.
			add_settings_section(
				'pbs_lite_section', // ID.
				__( 'Lite Settings', 'page-builder-sandwich' ), // Title.
				'__return_false', // Callback.
				'pbs_options_group' // Group name.
			);

			// Register the premium flags field.
			add_settings_field(
				'pbs_show_premium_flag', // ID.
				__( 'Hide Premium Feature Flags', 'page-builder-sandwich' ), // Title.
				array( $this, 'pbs_premium_flag_field' ), // Callback
				'pbs_options_group', // Group name.
				'pbs_lite_section', // Section.
				array(
					'name' => 'pbs_show_premium_flag',
				) // Args.
			);
		}


		/**
		 * Creates the PBS admin settings.
		 *
		 * @since 3.4
		 *
		 * @param array $args The arguments passed from add_settings_field.
		 */
		public function pbs_premium_flag_field( $args ) {
			$options = get_option( 'pbs_options' );

			?>
			<label>
				<input
					type="checkbox"
					name="pbs_options[<?php echo esc_attr( $args['name'] ); ?>]"
					value="1"
					<?php checked( ! empty( $options[ $args['name'] ] ) && $options[ $args['name'] ], '1' ) ?>
				/>
				<?php esc_html_e( 'Hide all elements, tools and options that are only available in the premium version.', 'page-builder-sandwich' ) ?>
			</label>
			<p class="description">
				<?php esc_html_e( 'The premium version has a lot of stuff to offer, we\'ve added flags on the areas which are only available in the premium version so that you can see what\'s in store for you. You can choose to hide those by checking this option.', 'page-builder-sandwich' ) ?>
			</p>
			<?php
		}


		/**
		 * Creates the PBS admin settings menu item.
		 *
		 * @since 3.4
		 */
		public function create_admin_menu() {
			add_submenu_page(
				'page-builder-sandwich', // Parent slug.
				esc_html__( 'Page Builder Sandwich Settings', 'page-builder-sandwich' ), // Page title.
				esc_html__( 'Settings', 'page-builder-sandwich' ), // Menu title.
				'manage_options', // Permissions.
				'page-builder-sandwich-settings', // Slug.
				array( $this, 'create_admin_settings_page' ) // Page creation function.
			);
		}


		/**
		 * Creates the contents of the settings page.
		 *
		 * @since 3.4
		 */
		public function create_admin_settings_page() {

			// Add settings saved message with the class of "updated".
			if ( isset( $_GET['settings-updated'] ) ) { // Input var: okay. WPCS: CSRF ok.
				add_settings_error( 'pbs_messages', 'pbs_message', esc_html__( 'Settings Saved', 'page-builder-sandwich' ), 'updated' );
			}

			// Show error/update messages.
			settings_errors( 'pbs_messages' );

			?>
			<div class="wrap">
				<h1><?php echo esc_html( get_admin_page_title() ) ?></h1>
				<form action="options.php" method="post">
					<?php
					// Output security fields.
					settings_fields( 'pbs_options_group' );

					// Output setting sections and fields.
					do_settings_sections( 'pbs_options_group' );

					// Output save settings button.
					submit_button();
					?>
				</form>
			</div>
			<?php
		}

		/**
		 * Add the hide premium flags parameter.
		 *
		 * @param array $params Localized parameters.
		 *
		 * @return array Localized parameters.
		 */
		public function add_premium_flags_param( $params ) {
			$options = get_option( 'pbs_options' );
			$params['show_premium_flags'] = true;
			if ( ! empty( $options['pbs_show_premium_flag'] ) ) {
				if ( is_array( $options ) && '1' === $options['pbs_show_premium_flag'] ) {
					$params['show_premium_flags'] = false;
				}
			}
			return $params;
		}

		/**
		 * Ajax handler for toggling premium flags.
		 */
		public function ajax_premium_flag_toggle() {
			if ( empty( $_POST['nonce'] ) || ! isset( $_POST['hide'] ) ) { // Input var okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var okay.
			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}

			$options = get_option( 'pbs_options' );
			if ( ! $options ) {
				$options = array();
			}
			$options['pbs_show_premium_flag'] = sanitize_key( $_POST['hide'] ); // Input var okay.
			update_option( 'pbs_options', $options );

			die();
		}
	}
} // End if().

new PBS_Admin_Settings();
