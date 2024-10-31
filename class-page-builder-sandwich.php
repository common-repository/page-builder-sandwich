<?php
/**
 * Page Builder Sandwich main functionality class
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

// Initializes plugin class.
if ( ! class_exists( 'PageBuilderSandwich' ) ) {

	/**
	 * This is where all the plugin's functionality happens.
	 */
	class PageBuilderSandwich {

		/**
		 * If the page contains multiple contents from other posts, multiple
		 * PBS wrappers can be added in. This makes sure that it's only added once.
		 *
		 * @var boolean
		 */
		private $added_builder_wrapper_once = false;

		/**
		 * If the page contains multiple contents from other posts, multiple
		 * PBS wrappers can be added in. This makes sure that it's only added once
		 * during the fallback function.
		 *
		 * @var boolean
		 */
		private $added_builder_wrapper_fallback_once = false;

		/**
		 * The holder for our main post's post_id. We'll use this in other places
		 * such as in class-title.php to check whether we're in our main post.
		 *
		 * @var int
		 */
		public static $main_post_id = 0;

		/**
		 * Holds the main PBS instance.
		 *
		 * @since 4.3
		 *
		 * @var PageBuilderSandwich
		 */
		private static $_instance = null;

		/**
		 * Get/create the PBS instance.
		 *
		 * @since 4.3
		 *
		 * @return PageBuilderSandwich
		 */
		public static function instance() {
			if ( empty( self::$_instance ) ) {
				self::$_instance = new PageBuilderSandwich();
			}

			return self::$_instance;
		}

		/**
		 * Hook into WordPress.
		 *
		 * @return	void
		 * @since	1.0
		 */
		function __construct() {

			new PBSCompatibility();

			/**
			 * Necessary stuff to make content work for non-editors / logged out users.
			 */

			// These are the scripts which is needed by non-editors.
			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend' ) );

			// Gathers all the ce-tags so we can include the different scripts needed (see previous line).
			add_filter( 'the_content', array( $this, 'gather_ce_tags' ), 0 );
			add_filter( 'the_content', array( $this, 'add_spec_style_tag' ), 9999999 );

			// Allow all stuff in TinyMCE.
			add_filter( 'tiny_mce_before_init', array( $this, 'tinymce_allow_divs' ), 20 );
			add_filter( 'teeny_mce_before_init', array( $this, 'tinymce_allow_divs' ), 20 );

			/**
			 * Allow others to stop the loading of PBS when necessary, e.g. other builders, and stuff that can heavily conflict.
			 */

			if ( ! apply_filters( 'pbs_load_editor', true ) ) {
				return;
			}

			/**
			 * All stuff below are for the editor.
			 */
			// Our admin-side scripts & styles.
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );

			// Enqueues scripts and styles specific for all parts of the plugin.
			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_editor' ) );

			// Apply different markers that we need for the builder to work properly in the frontend.
			add_filter( 'the_content', array( $this, 'escape_pretext_shortcodes' ), 0 );
			add_filter( 'the_content', array( $this, 'add_shortcode_markers' ), 0 );
			add_filter( 'pbs_save_content', array( $this, 'remove_shortcode_markers' ) );
			add_filter( 'the_content', array( $this, 'add_oembed_markers' ), 0 );
			add_filter( 'pbs_save_content', array( $this, 'remove_oembed_markers' ) );
			add_filter( 'the_content', array( $this, 'add_iframe_markers' ), 0 );

			// Add the wrapper to detect the content area for the builder.
			add_filter( 'the_content', array( $this, 'add_builder_wrapper' ), 9 );
			add_filter( 'the_content', array( $this, 'add_builder_wrapper_fallback' ), 999999 );

			// Important: We have to delay some filters so that our `add_builder_wrapper` works correctly.
			$this->delay_the_content_filters();

			// Saving handlers.
			add_action( 'wp_ajax_gambit_builder_save_content', array( $this, 'save_content' ) );
			add_filter( 'pbs_save_content', array( $this, 'cleanup_content' ), 999 );

			// Other necessary scripts.
			add_action( 'wp_footer', array( $this, 'add_builder_templates' ) );
			add_action( 'wp_footer', array( $this, 'add_wplink_dependencies' ) );
			add_action( 'wp_footer', array( $this, 'add_empty_text_placeholder' ) );

			// Add our admin bar button.
			if ( ! is_admin() ) {
				add_action( 'admin_bar_menu', array( $this, 'add_edit_admin_bar_button' ), 999 );
			}

			// Minimum styling to make the default content editor play nice with PBS's saved content.
			add_action( 'admin_init', array( $this, 'add_editor_styles' ) );

			new PBSRenderShortcode();
		}


		/**
		 * We need to delay these filters because OTHER plugins & themes MAY append some stuff
		 * in `the_content` filter which SHOULDN'T be editable in PBS. So the solution would be
		 * to grab/wrap the content BEFORE priority 10. We do ours in priority 9.
		 *
		 * But we need wpautop to first run, but that's called at priority 10 - which is too late.
		 * to fix this, we move wpautop to priority 8.
		 */
		public function delay_the_content_filters() {
			remove_filter( 'the_content', 'wpautop' );
			add_filter( 'the_content', 'wpautop', 8 );

			// Since we moved wpautop to priority 8, it might conflict with others which need to run
			// before wpautop, delay those also.
			if ( ! empty( $GLOBALS['wp_embed'] ) ) {
				remove_filter( 'the_content', array( $GLOBALS['wp_embed'], 'run_shortcode' ), 8 );
				add_filter( 'the_content', array( $GLOBALS['wp_embed'], 'run_shortcode' ), 7 );
				remove_filter( 'the_content', array( $GLOBALS['wp_embed'], 'autoembed' ), 8 );
				add_filter( 'the_content', array( $GLOBALS['wp_embed'], 'autoembed' ), 7 );
			}
		}


		/**
		 * We are adding divs with attributes normally not allowed in TinyMCE. Allow our divs in TinyMCE.
		 *
		 * @since 2.9
		 *
		 * @param array $init TinyMCE init parameters.
		 *
		 * @return array The modified TinyMCE init parameters.
		 */
		public function tinymce_allow_divs( $init ) {
			if ( ! empty( $init['extended_valid_elements'] ) ) {
				$init['extended_valid_elements'] .= ',';
			} else {
				$init['extended_valid_elements'] = '';
			}
			$init['extended_valid_elements'] .= 'div[*]';
		    return apply_filters( 'pbs_tinymce_allow_divs', $init );
		}


		/**
		 * Checks whether the current user has editing privileges in the current
		 * page/post/CPT.
		 *
		 * @since 2.0
		 *
		 * @return boolean Returns true if the current page is a post and if its editable.
		 */
		public static function is_editable_by_user() {

			// If $wp_query is not yet defined, other functions below would
			// encounter errors because they're called too early. Check it first.
			global $wp_query;
			if ( ! isset( $wp_query ) ) {
				return false;
			}

			$is_editable = true;

			// Don't show in the customizer.
			if ( is_customize_preview() ) {
				$is_editable = false;
			}

			// Don't show for non-single pages.
			if ( ! is_single() && ! is_page() ) {
				$is_editable = false;
			}

			// Don't show if we are not in the main query.
			if ( ! is_main_query() ) {
				$is_editable = false;
			}

			// Don't show if post data is not available.
			if ( empty( $GLOBALS['post'] ) ) {
				$is_editable = false;
			}

			if ( $is_editable ) {

				global $post;
				if ( is_single() ) {
					if ( $post ) {
						$is_editable = current_user_can( 'edit_post', $post->ID );
					} else {
						$is_editable = current_user_can( 'edit_posts' );
					}
				} else {
					if ( $post ) {
						$is_editable = current_user_can( 'edit_page', $post->ID );
					} else {
						$is_editable = current_user_can( 'edit_pages' );
					}
				}
			}

			return apply_filters( 'pbs_is_editable_by_user', $is_editable );
		}


		/**
		 * Adds PBS required template files.
		 *
		 * @since 2.0
		 */
		public function add_builder_templates() {
			if ( ! self::is_editable_by_user() ) {
				return;
			}

			global $pbs_url_for_templates;
			$pbs_url_for_templates = trailingslashit( plugins_url( 'page_builder_sandwich', __FILE__ ) );

			include 'page_builder_sandwich/templates/pbs-modal.php';
			include 'page_builder_sandwich/templates/option-border.php';
			include 'page_builder_sandwich/templates/option-text.php';
			include 'page_builder_sandwich/templates/option-textarea.php';
			include 'page_builder_sandwich/templates/option-color.php';
			include 'page_builder_sandwich/templates/option-margins-and-paddings.php';
			include 'page_builder_sandwich/templates/option-select.php';
			include 'page_builder_sandwich/templates/option-checkbox.php';
			include 'page_builder_sandwich/templates/option-button2.php';
			include 'page_builder_sandwich/templates/option-shortcode-generic.php';
			include 'page_builder_sandwich/templates/option-image.php';
			include 'page_builder_sandwich/templates/option-file.php';
			include 'page_builder_sandwich/templates/option-number.php';
			include 'page_builder_sandwich/templates/option-note.php';
			include 'page_builder_sandwich/templates/option-link.php';
			include 'page_builder_sandwich/templates/frame-admin.php';
			include 'page_builder_sandwich/templates/frame-shortcode-picker.php';
			include 'page_builder_sandwich/templates/frame-predesigned-picker.php';
			include 'page_builder_sandwich/templates/modal-intro-tour.php';

			global $pbs_fs;
			if ( ! PBS_IS_LITE && $pbs_fs->can_use_premium_code() ) {
				include 'page_builder_sandwich/templates/option-multicheck.php';
				include 'page_builder_sandwich/templates/option-iframe.php';

				include 'page_builder_sandwich/templates/design-element-page-headings.php';
				include 'page_builder_sandwich/templates/design-element-page-headings-2.php';
				include 'page_builder_sandwich/templates/design-element-page-headings-3.php';
				include 'page_builder_sandwich/templates/design-element-page-headings-4.php';
				include 'page_builder_sandwich/templates/design-element-page-headings-5.php';
				include 'page_builder_sandwich/templates/design-element-call-to-actions.php';
				include 'page_builder_sandwich/templates/design-element-call-to-actions-2.php';
				include 'page_builder_sandwich/templates/design-element-call-to-actions-3.php';
				include 'page_builder_sandwich/templates/design-element-call-to-actions-4.php';
				include 'page_builder_sandwich/templates/design-element-call-to-actions-5.php';
				include 'page_builder_sandwich/templates/design-element-call-to-actions-6.php';
				include 'page_builder_sandwich/templates/design-element-testimonials.php';
				include 'page_builder_sandwich/templates/design-element-testimonials-2.php';
				include 'page_builder_sandwich/templates/design-element-testimonials-3.php';
				include 'page_builder_sandwich/templates/design-element-testimonials-4.php';
				include 'page_builder_sandwich/templates/design-element-testimonials-5.php';
				// include 'page_builder_sandwich/templates/design-element-testimonials-6.php';
				include 'page_builder_sandwich/templates/design-element-pricing-tables.php';
				include 'page_builder_sandwich/templates/design-element-pricing-tables-2.php';
				include 'page_builder_sandwich/templates/design-element-pricing-tables-3.php';
				include 'page_builder_sandwich/templates/design-element-pricing-tables-4.php';
				include 'page_builder_sandwich/templates/design-element-pricing-tables-5.php';
				include 'page_builder_sandwich/templates/design-element-large-features.php';
				include 'page_builder_sandwich/templates/design-element-large-features-2.php';
				include 'page_builder_sandwich/templates/design-element-large-features-3.php';
				include 'page_builder_sandwich/templates/design-element-large-features-4.php';
				include 'page_builder_sandwich/templates/design-element-large-features-5.php';
				include 'page_builder_sandwich/templates/design-element-large-features-6.php';
				include 'page_builder_sandwich/templates/design-element-large-features-7.php';
				include 'page_builder_sandwich/templates/design-element-large-features-8.php';
				include 'page_builder_sandwich/templates/design-element-large-features-9.php';
				include 'page_builder_sandwich/templates/design-element-large-features-10.php';
				include 'page_builder_sandwich/templates/design-element-large-features-11.php';
				include 'page_builder_sandwich/templates/design-element-large-features-12.php';
				include 'page_builder_sandwich/templates/design-element-large-features-13.php';
				include 'page_builder_sandwich/templates/design-element-large-features-14.php';
				include 'page_builder_sandwich/templates/design-element-team-members.php';
				include 'page_builder_sandwich/templates/design-element-team-members-2.php';
				include 'page_builder_sandwich/templates/design-element-team-members-3.php';
				include 'page_builder_sandwich/templates/design-element-team-members-4.php';
				include 'page_builder_sandwich/templates/design-element-gallery-1.php';
				include 'page_builder_sandwich/templates/design-element-gallery-2.php';
				include 'page_builder_sandwich/templates/design-element-gallery-3.php';
				include 'page_builder_sandwich/templates/design-element-gallery-4.php';
				include 'page_builder_sandwich/templates/design-element-gallery-5.php';

			} else {
				include 'page_builder_sandwich/templates/modal-learn-premium.php';
				include 'page_builder_sandwich/templates/modal-learn-premium-elements.php';
				include 'page_builder_sandwich/templates/option-text-dummy.php';
			}
		}


		/**
		 * Adds the necessary script and markup for the link dialog modal.
		 * This modal is used to create/edit text links.
		 *
		 * @since 2.1
		 */
		public function add_wplink_dependencies() {
			if ( self::is_editable_by_user() ) {

				// Render the link dialog html.
				require_once ABSPATH . WPINC . '/class-wp-editor.php';
				_WP_Editors::wp_link_dialog();

				// We need this dummy textarea to make the link modal work.
				echo '<textarea id="dummy-wplink-textarea"></textarea>';

				// The variable adminajax isn't normally defined in the frontend and is needed by wpLink.
				echo '<script>var ajaxurl = "' . esc_url( admin_url( 'admin-ajax.php' ) ) . '";</script>';
			}
		}


		/**
		 * Adds PBS buttons to the admin bar in the frontend. These buttons are used
		 * directly by our editor.
		 *
		 * @since 2.0
		 *
		 * @param object $wp_admin_bar The admin bar object.
		 *
		 * @return void
		 */
		public function add_edit_admin_bar_button( $wp_admin_bar ) {
			if ( ! self::is_editable_by_user() ) {
				return;
			}
			$args = array(
				'id'    => 'gambit_builder_edit',
				'title' => '<span class="ab-icon"></span>' . __( 'Page Builder Sandwich', 'page-builder-sandwich' ),
				'href'  => apply_filters( 'pbs_admin_bar_edit_button_url', '#' ),
				'meta'  => array( 'class' => 'pbs-adminbar-icon' ),
			);
			$wp_admin_bar->add_node( $args );

			global $pbs_fs;
			if ( PBS_IS_LITE || ! $pbs_fs->can_use_premium_code() ) {
				$args = array(
					'id'    => 'pbs_go_premium',
					'title' => '<span class="ab-icon"></span>'
						. __( 'Learn More About Premium', 'page-builder-sandwich' ),
					'href'  => '#',
					'meta'  => array(
						'class' => 'pbs-adminbar-icon',
					),
				);
				$wp_admin_bar->add_node( $args );
			}

			/**
			 * Allow others to add more admin bar buttons.
			 *
			 * @since 4.0
			 *
			 * @param object $wp_admin_bar The admin bar object.
			 */
			do_action( 'pbs_pre_add_edit_admin_bar_button', $wp_admin_bar );

			// Save button label.
			$save_label = '<span id="pbs-save-publish-label">' . __( 'Save and Update', 'page-builder-sandwich' ) . '</span>';
			$save_label .= '<span id="pbs-save-draft-label">' . __( 'Save as Draft', 'page-builder-sandwich' ) . '</span>';
			$save_label .= '<span id="pbs-save-pending-label">' . __( 'Save as Pending Review', 'page-builder-sandwich' ) . '</span>';
			$args = array(
				'id'    => 'gambit_builder_save',
				'title' => $save_label,
				'href'  => '#',
				'meta'  => array( 'class' => 'pbs-adminbar-icon pbs-adminbar-right' ),
			);
			$wp_admin_bar->add_node( $args );
			$args = array(
				'id'    => 'gambit_builder_save_options',
				'title' => '<span class="ab-icon"></span>
							<span id="pbs-save-button">
								<span id="pbs-save-publish">' . esc_html__( 'Save and Publish', 'page-builder-sandwich' ) . '</span>
								<span id="pbs-save-pending">' . esc_html__( 'Save as Pending Review', 'page-builder-sandwich' ) . '</span>
								<span id="pbs-save-draft">' . esc_html__( 'Save as Draft', 'page-builder-sandwich' ) . '</span>
							</span>',
				'href'  => '#',
				'meta'  => array( 'class' => 'pbs-adminbar-icon pbs-adminbar-right' ),
			);
			$wp_admin_bar->add_node( $args );
			$args = array(
				'id'    => 'gambit_builder_cancel',
				'title' => __( 'Cancel', 'page-builder-sandwich' ),
				'href'  => '#',
				'meta'  => array( 'class' => 'pbs-adminbar-icon pbs-adminbar-right' ),
			);
			$wp_admin_bar->add_node( $args );
			$args = array(
				'id'    => 'gambit_builder_busy',
				'title' => '<span class="ab-icon"></span>' . __( 'Saving, Please wait...', 'page-builder-sandwich' ),
				'href'  => '#',
				'meta'  => array( 'class' => 'pbs-adminbar-icon' ),
			);
			$wp_admin_bar->add_node( $args );

			$args = array(
				'id'    => 'pbs_help_docs',
				'title' => '<span class="ab-icon"></span>',
				'href'  => '#',
				'meta'  => array( 'class' => 'pbs-adminbar-icon pbs-adminbar-right' ),
			);
			$wp_admin_bar->add_node( $args );

			/**
			 * Allow others to add more admin bar buttons.
			 *
			 * @since 4.0
			 *
			 * @param object $wp_admin_bar The admin bar object.
			 */
			do_action( 'pbs_post_add_edit_admin_bar_button', $wp_admin_bar );

			if ( PBS_IS_PRO ) {
				$args = array(
					'id'    => 'gambit_builder_css',
					'title' => '<span class="ab-icon"></span>' . __( 'CSS', 'page-builder-sandwich' ),
					'href'  => '#',
					'meta'  => array( 'class' => 'pbs-adminbar-icon pbs-adminbar-right' ),
				);
				$wp_admin_bar->add_node( $args );
				$args = array(
					'id'    => 'gambit_builder_js',
					'title' => '<span class="ab-icon"></span>' . __( 'Javascript', 'page-builder-sandwich' ),
					'href'  => '#',
					'meta'  => array( 'class' => 'pbs-adminbar-icon pbs-adminbar-right' ),
				);
				$wp_admin_bar->add_node( $args );
				$args = array(
					'id'    => 'gambit_builder_source',
					'title' => '<span class="ab-icon"></span>' . __( 'Source', 'page-builder-sandwich' ),
					'href'  => '#',
					'meta'  => array( 'class' => 'pbs-adminbar-icon pbs-adminbar-right' ),
				);
				$wp_admin_bar->add_node( $args );
			}
		}


		/**
		 * Adds markers to oembed URLs so PBS can edit them.
		 *
		 * @since 2.0
		 *
		 * @param string $content The current post content.
		 *
		 * @return string The modified content.
		 */
		public function add_oembed_markers( $content ) {
			if ( ! self::is_editable_by_user() ) {
				return $content;
			}

			// Check all one liner URLs for possible embedable URLs.
			preg_match_all( '/^\s*(?:http|https)?(?:\:\/\/)?(?:www.)?(([A-Za-z0-9-]+\.)*[A-Za-z0-9-]+\.[A-Za-z]+)(?:\/.*)?\s*$/im', $content, $oembed_urls, PREG_SET_ORDER | PREG_OFFSET_CAPTURE );

			if ( ! empty( $oembed_urls ) ) {

				require_once ABSPATH . WPINC . '/class-oembed.php';

				// Use the embed object for checking oembeds.
				$embed_object = _wp_oembed_get_object();
				$oembed_args = array(
					'discover' => false, // Turn this off to stop remote gets, we only need to check URLs.
				);

				for ( $i = count( $oembed_urls ) - 1; $i >= 0; $i-- ) {
					$match = $oembed_urls[ $i ];
					$oembed_url = $match[0][0];

					// Check whether the URL is an oembed URL.
					if ( ! $embed_object->get_provider( $oembed_url, $oembed_args ) ) {
						continue;
					}

					$modifiedo_embed_url = '<div data-ce-moveable data-ce-static data-ce-tag="embed" data-url="' . esc_url( $oembed_url ) . '">' . "\n" . $oembed_url . "\n" . '</div>';

					$content = substr( $content, 0, $match[0][1] ) . $modifiedo_embed_url . substr( $content, $match[0][1] + strlen( $match[0][0] ) );

				}
			}

			remove_action( 'the_content', array( $this, 'add_oembed_markers' ), 1 );

			return apply_filters( 'pbs_add_oembed_markers', $content );
		}


		/**
		 * When saving content, remove oembeds and bring them back to normal URLs
		 * to let WP perform its normal embed procedures.
		 *
		 * @since 2.0
		 *
		 * @param string $content The current post content.
		 *
		 * @return string The modified content.
		 */
		public function remove_oembed_markers( $content ) {
			if ( ! class_exists( 'simple_html_dom' ) ) {
				require_once( 'page_builder_sandwich/inc/simple_html_dom.php' );
			}

			// Remove all data-shortcode and replace it with the decoded shortcode. Do this from last to first to preserve nesting.
			$html = new simple_html_dom();
			$html->load( $content, true, false );

			$elements = $html->find( '[data-ce-tag="embed"]' );
			for ( $i = count( $elements ) - 1; $i >= 0; $i-- ) {
				$element = $elements[ $i ];
				$url = $element->{'data-url'};

				$elements[ $i ]->outertext = '<p>' . $url . '</p>';
			}
			$content = (string) $html;

			return apply_filters( 'pbs_remove_oembed_markers', $content );
		}


		/**
		 * Strings inside preformatted text that look like shortcodes get detected
		 * as shortcodes. To prevent this, escape "[" inside preformatted text.
		 *
		 * @since 3.0
		 *
		 * @param string $content The current post content.
		 *
		 * @return string The modified content.
		 */
		public function escape_pretext_shortcodes( $content ) {

			if ( ! class_exists( 'simple_html_dom' ) ) {
				require_once( 'page_builder_sandwich/inc/simple_html_dom.php' );
			}

			// Remove all data-shortcode and replace it with the decoded shortcode. Do this from last to first to preserve nesting.
			$html = new simple_html_dom();
			$html->load( $content, true, false );

			$elements = $html->find( 'pre' );
			for ( $i = count( $elements ) - 1; $i >= 0; $i-- ) {
				$elements[ $i ]->innertext = preg_replace( '/\[/', '&#91;', $elements[ $i ]->innertext );
			}
			$content = (string) $html;

			return apply_filters( 'pbs_escape_pretext_shortcodes', $content );
		}


		/**
		 * Adds Shortcode markers to shortcode-like strings.
		 *
		 * @since 3.0.1
		 *
		 * @param string $content The post content.
		 *
		 * @return string The modified content.
		 */
		public function _add_shortcode_markers( $content ) {

			// Some shortcodes register their shortcode tags late. Instead
			// of using get_shortcode_regex(), build our own regex using the
			// same method, but capture all sc-like tags instead of just
			// using the registered ones.
			// @codingStandardsIgnoreStart
			$shortcode_pattern =
				'\\[' // Opening bracket
			    . '(\\[?)' // 1: Optional second opening bracket for escaping shortcodes: [[tag]].
				    . "([^\s\\[\\]]+)" // 2: Shortcode name
				// . "([^\\d\\s<>\\/\\[\\]][^\\s<>\\/\\[\\]]{0,})" // 2: Shortcode name
			    . '(?![\\w-])' // Not followed by word character or hyphen
			    . '(' // 3: Unroll the loop: Inside the opening shortcode tag
			    .     '[^\\]\\/]*' // Not a closing bracket or forward slash
			    .     '(?:'
			    .         '\\/(?!\\])' // A forward slash not followed by a closing bracket
			    .         '[^\\]\\/]*' // Not a closing bracket or forward slash
			    .     ')*?'
			    . ')'
			    . '(?:'
			    .     '(\\/)' // 4: Self closing tag ...
			    .     '\\]' // ... and closing bracket
			    . '|'
			    .     '\\]' // Closing bracket
			    .     '(?:'
			    .         '(' // 5: Unroll the loop: Optionally, anything between the opening and closing shortcode tags
			    .             '[^\\[]*+' // Not an opening bracket
			    .             '(?:'
			    .                 '\\[(?!\\/\\2\\])' // An opening bracket not followed by the closing shortcode tag
			    .                 '[^\\[]*+' // Not an opening bracket
			    .             ')*+'
			    .         ')'
			    .         '\\[\\/\\2\\]' // Closing shortcode tag
			    .     ')?'
			    . ')'
			    . '(\\]?)'; // 6: Optional second closing brocket for escaping shortcodes: [[tag]]
			// @codingStandardsIgnoreEnd

			preg_match_all( "/$shortcode_pattern/", $content, $shortcodes, PREG_SET_ORDER | PREG_OFFSET_CAPTURE );

			// Wrap markers around shortcodes found.
			if ( ! empty( $shortcodes ) ) {
				for ( $i = count( $shortcodes ) - 1; $i >= 0; $i-- ) {
					$match = $shortcodes[ $i ];

					$shortcode = substr( $content, $match[0][1], strlen( $match[0][0] ) );
					$shortcode_tag = $match[2][0];
					$based_shortcode = base64_encode( $shortcode );

					$modified_shortcode = '<div data-ce-moveable data-ce-static data-ce-tag="shortcode" data-base="' . $shortcode_tag . '" data-shortcode="' . $based_shortcode . '">' . $shortcode . '</div>';
					// $modified_shortcode = '<div data-ce-moveable data-ce-static data-base="' . $shortcode_tag . '" data-shortcode="' . $based_shortcode . '">' . $shortcode . '</div>';
					$content = substr( $content, 0, $match[0][1] ) . $modified_shortcode . substr( $content, $match[0][1] + strlen( $match[0][0] ) );
				}
			}

			return $content;
		}


		/**
		 * Wrap all shortcodes with markers so PBS can handle shortcode editing.
		 *
		 * @since 2.0
		 *
		 * @param string $content The current post content.
		 *
		 * @return string The modified content.
		 */
		public function add_shortcode_markers( $content ) {
			if ( ! self::is_editable_by_user() ) {
				return $content;
			}

			// Ignore all brackets inside HTML tags because that may screw up our shortcode pattern. HACKY I know, but we have no choice or else we will most likely get false positive.
			$content = preg_replace_callback( '/<[^>]+[\[\]][^>]+>/', array( $this, '_add_shortcode_markers_hacky_brackets' ), $content );

			// Escape all brackets inside script tags.
			$content = preg_replace_callback( '/<script.*?[\[\]].*?<\/script>/', array( $this, '_add_shortcode_markers_hacky_brackets' ), $content );

			// Escape all brackets inside style tags.
			$content = preg_replace_callback( '/<style.*?[\[\]].*?<\/style>/', array( $this, '_add_shortcode_markers_hacky_brackets' ), $content );

			// Add wrappers around all shortcodes that we can find.
			$content = $this->_add_shortcode_markers( $content );

			// Bring back the brackets we removed above.
			$content = preg_replace( '/—–\{——/', '[', $content );
			$content = preg_replace( '/—–\}——/', ']', $content );

			remove_action( 'the_content', array( $this, 'add_shortcode_markers' ), 1 );

			// Stray spaces can create lost paragraph tags.
			$content = preg_replace( '/(\/\w+>)\s+(<\/\w+)/', '$1$2', $content );
			return apply_filters( 'pbs_add_shortcode_markers', $content );
		}


		/**
		 * Replace all brackets with a hacky replacement which is meant to be
		 * re-replaced by the add_shortcode_markers function.
		 *
		 * @since 4.3
		 *
		 * @param array $matches The matching regex string.
		 *
		 * @return string The replaced string.
		 */
		public function _add_shortcode_markers_hacky_brackets( $matches ) {
			$content = $matches[0];
			$content = preg_replace( '/\[/', '—–{——', $content );
			$content = preg_replace( '/\]/', '—–}——', $content );
			return $content;
		}


		/**
		 * Wrap all iframe tags so PBS can edit them.
		 *
		 * @since 2.7
		 *
		 * @param string $content The current post content.
		 *
		 * @return string The modified content.
		 */
		public function add_iframe_markers( $content ) {
			if ( ! self::is_editable_by_user() ) {
				return $content;
			}

			preg_match_all( '/<iframe[^>]+>\s*<\/iframe\s*>/', $content, $iframes, PREG_SET_ORDER | PREG_OFFSET_CAPTURE );

			// Add markers to all iframes.
			if ( ! empty( $iframes ) ) {
				for ( $i = count( $iframes ) - 1; $i >= 0; $i-- ) {
					$match = $iframes[ $i ];

					$iframe = substr( $content, $match[0][1], strlen( $match[0][0] ) );

					$iframe = "\n\n" . $iframe . "\n\n";

					$content = substr( $content, 0, $match[0][1] ) . $iframe . substr( $content, $match[0][1] + strlen( $match[0][0] ) );
				}
			}

			return apply_filters( 'pbs_add_iframe_markers', $content );
		}


		/**
		 * As a fallback, if our builder wrapper cannot be added into the content,
		 * re-create the content for the builder, and add it alongside the
		 * final generated content. When the editor starts, the rendered content
		 * gets hidden, then the original content gets shown for editing.
		 *
		 * @since 4.3
		 *
		 * @param string $content The post content.
		 *
		 * @return string The modified content.
		 */
		public function add_builder_wrapper_fallback( $content ) {
			if ( ! self::is_editable_by_user() ) {
				return $content;
			}

			// Make sure that the wrapper is only added once.
			if ( $this->added_builder_wrapper_fallback_once ) {
				return $content;
			}

			// Only do this fallback when there's no main wrapper applied.
			if ( preg_match( '/<div[^>]+data-editable[^>]+pbs-main-wrapper/', $content ) ) {
				return $content;
			}

			$this->added_builder_wrapper_fallback_once = true;

			// Get the actual content, and then run the default filters to render it.
			$orig_content = get_the_content( null, false );

			// Run the default the_content filters on our raw content.
			add_filter( 'pbs_run_content_filters', 'wptexturize' );
			add_filter( 'pbs_run_content_filters', 'convert_smilies', 20 );
			add_filter( 'pbs_run_content_filters', 'wpautop' );
			add_filter( 'pbs_run_content_filters', 'shortcode_unautop' );
			add_filter( 'pbs_run_content_filters', 'prepend_attachment' );
			add_filter( 'pbs_run_content_filters', 'wp_make_content_images_responsive' );
			add_filter( 'pbs_run_content_filters', 'do_shortcode', 11 );

			if ( $GLOBALS['wp_embed'] ) {
				add_filter( 'pbs_run_content_filters', array( $GLOBALS['wp_embed'], 'run_shortcode' ), 8 );
				add_filter( 'pbs_run_content_filters', array( $GLOBALS['wp_embed'], 'autoembed' ), 8 );
			}

			add_filter( 'pbs_run_content_filters', array( $this, 'escape_pretext_shortcodes' ), 0 );
			add_filter( 'pbs_run_content_filters', array( $this, 'add_shortcode_markers' ), 0 );
			add_filter( 'pbs_run_content_filters', array( $this, 'add_oembed_markers' ), 0 );
			add_filter( 'pbs_run_content_filters', array( $this, 'add_iframe_markers' ), 0 );

			$orig_content = apply_filters( 'pbs_run_content_filters', $orig_content );

			// Add the wrapper to detect the content area for the builder.
			$this->added_builder_wrapper_once = false;
			$orig_content = $this->add_builder_wrapper( $orig_content );

			// This is performed by the_content, so do it also.
			$orig_content = str_replace( ']]>', ']]&gt;', $orig_content );

			// Fallback to adding the editor after the content then switching it
			// when about to edit.
			$content = '<div class="pbs-orig-page-content">' . $content . '</div>' . $orig_content;

			return apply_filters( 'pbs_add_builder_wrapper', $content );
		}


		/**
		 * Wraps the whole content in a wrapper that PBS will use for editing.
		 *
		 * @since 2.0
		 *
		 * @param string $content The post content.
		 *
		 * @return string The wrapped content.
		 */
		public function add_builder_wrapper( $content ) {

			$content = apply_filters( 'pbs_add_builder_wrapper_pre', $content );

			if ( ! self::is_editable_by_user() ) {
				$content = '<div class="pbs-main-wrapper">' . $content . '</div>';
			} else {
				$content = '<div data-editable data-name="main-content" class="pbs-main-wrapper">' . $content . '</div>';
			}
			return apply_filters( 'pbs_add_builder_wrapper', $content );
		}


		/**
		 * Remove shortcode wrappers so we have the normal looking (bracketted)
		 * shortcodes in our content when saving.
		 *
		 * @since 2.7
		 *
		 * @param string $content The current post content.
		 *
		 * @return string The modified content.
		 */
		public function remove_shortcode_markers( $content ) {
			if ( ! class_exists( 'simple_html_dom' ) ) {
				require_once( 'page_builder_sandwich/inc/simple_html_dom.php' );
			}

			// Remove all data-shortcode and replace it with the decoded shortcode. Do this from last to first to preserve nesting.
			$html = new simple_html_dom();
			$html->load( $content, true, false );

			$shortcodes = $html->find( '[data-shortcode]' );
			for ( $i = count( $shortcodes ) - 1; $i >= 0; $i-- ) {
				$shortcode_container = $shortcodes[ $i ];
				$shortcode = base64_decode( $shortcode_container->{'data-shortcode'} );
				if ( ! defined( 'PBS_DOING_AUTOSAVE' ) ) {
					$shortcode = addslashes( $shortcode );
				}
				$shortcodes[ $i ]->outertext = $shortcode;
			}
			$content = (string) $html;

			return apply_filters( 'pbs_remove_shortcode_markers', $content );
		}


		/**
		 * If the post has a pbs_style meta data, it means that pseudo styles are needed
		 * by the post, add the styles to the output.
		 *
		 * @since 2.9
		 *
		 * @param string $content The html content.
		 *
		 * @return string The cleaned html content.
		 */
		public function add_spec_style_tag( $content ) {
			global $post;
			if ( ! $post ) {
				return $content;
			}
			if ( get_post_meta( $post->ID, 'pbs_style', true ) ) {
				$style = get_post_meta( $post->ID, 'pbs_style', true );
				$style = wp_strip_all_tags( $style );

				// Compatibility with an error in 4.4.2
				$style = preg_replace( '/undefined/', '', $style );

				$content = '<style id="pbs-style">' . $style . '</style>' . $content;
			}
			return apply_filters( 'pbs_add_spec_style_tag', $content );
		}


		/**
		 * Cleans up the content before saving. This is similar to the REVERSE wpautop
		 * applied by TinyMCE via Javascript. This makes sure that we do not get stray
		 * paragraph tags saved/rendered that mess up the output.
		 *
		 * We're mimicking the behavior seen when clicking 'Visual' then 'Text' in
		 * TinyMCE, then hitting save. The process that cleans up the html during the transition
		 * is what we want to achieve.
		 *
		 * @param string $content The html content.
		 *
		 * @return string The cleaned html content.
		 */
		public function cleanup_content( $content ) {

			// Remove line breaks, except for those inside preformatted tags.
			$content = preg_replace( '/[\r\n](?![^<]*<\/pre>)/', ' ', $content );

			// Separate divs into their own lines.
			$content = preg_replace( '/(<\/?div[^>]*>)[\s]+/', "$1\n", $content );

			// Replace simple p tags with \n\n.
			$content = preg_replace( '/\s*<p>\s*(.*?)\s*<\/p>\s*/', "\n\n$1\n\n", $content );

			// Cleanup remaining p tags, remove the start and end spaces.
			$content = preg_replace( '/(<p[^>]*>)\s*(.*?)\s*(<\/p>)/', '$1$2$3', $content );

			// Cleanup remaining p tags, remove the trailing spaces.
			$content = preg_replace( '/(<\/p>)\s*(<\/\w+>)/', "$1\n\n$2", $content );

			// Multiple p tags can convert to multiple \n's, just keep to 2 \ns.
			$content = preg_replace( '/\n\n{2,}/', "\n\n", $content );

			// Noscripts can sometimes appear because of some plugins, this messes up the content.
			$content = preg_replace( '/<noscript[^>]*>.*?<\/noscript>/', '', $content );

			return apply_filters( 'pbs_cleanup_content', $content );
		}


		/**
		 * Ajax save content handler.
		 *
		 * @since 2.0
		 *
		 * @return void
		 */
		public function save_content() {

			// Check if we have the necessary fields.
			if ( empty( $_POST['post_id'] ) ||  // Input var: okay.
				 ( ! isset( $_POST['title'] ) && empty( $_POST['post_status'] ) && ! isset( $_POST['main-content'] ) ) ||  // Input var: okay.
				 empty( $_POST['save_nonce'] ) ) { // Input var: okay.
				die();
			}

			// Security check.
			if ( ! wp_verify_nonce( sanitize_key( $_POST['save_nonce'] ), 'pbs' ) ) { // Input var: okay.
				die();
			}

			// Sanitize data.
			$post_id = intval( $_POST['post_id'] ); // Input var: okay.

			$post_data = array(
				'ID' => $post_id,
			);

			// Check if we just need to update the status.
			if ( ! empty( $_POST['post_status'] ) ) { // Input var: okay.
				$post_data['post_status'] = sanitize_text_field( wp_unslash( $_POST['post_status'] ) ); // Input var: okay.
			}

			do_action( 'pbs_pre_save_content' );

			// The new content.
			if ( isset( $_POST['main-content'] ) ) { // Input var: okay.
				$content = sanitize_post_field( 'post_content', wp_unslash( $_POST['main-content'] ), $post_id, 'db' ); // Input var: okay. WPCS: sanitization ok.
				$content = apply_filters( 'pbs_save_content', $content, $post_id );

				$post_data['post_content'] = $content;
				$post_data['post_content_filtered'] = ''; // Blank this field to clear cached copies of the content. This is to also support Jetpack's Markdown module.
			}

			$post_data = apply_filters( 'pbs_save_content_data', $post_data, $_POST, $post_id ); // Input var: okay.

			// Update the post.
			$post_id = wp_update_post( $post_data );

			if ( ! empty( $_POST['style'] ) ) { // Input var: okay.
				$style = sanitize_post_field( 'post_content', wp_unslash( $_POST['style'] ), $post_id, 'db' ); // Input var: okay. WPCS: sanitization ok.
				$style = wp_strip_all_tags( $style );
				$style = apply_filters( 'pbs_save_style', $style, $post_id );
				update_post_meta( $post_id, 'pbs_style', $style );
			} else {
				delete_post_meta( $post_id, 'pbs_style' );
			}

			do_action( 'pbs_saved_content', $post_id );

			die( esc_url( get_permalink( $post_id ) ) );
		}


		/**
		 * Includes admin scripts and styles needed.
		 *
		 * @since	1.0
		 *
		 * @return	void
		 */
		public function enqueue_admin_scripts() {

			// Admin styles.
			wp_enqueue_style( __CLASS__ . '-admin', plugins_url( 'page_builder_sandwich/css/admin.min.css', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );

			$js_dir = defined( 'WP_DEBUG' ) && WP_DEBUG ? 'dev' : 'min';
			$js_suffix = defined( 'WP_DEBUG' ) && WP_DEBUG ? '' : '-min';

			global $pbs_fs;
			$localize_params = array(
				'is_lite' => PBS_IS_LITE || ! $pbs_fs->can_use_premium_code(),
				'nonce' => wp_create_nonce( 'pbs' ),
				'ajax_url' => admin_url( 'admin-ajax.php' ),
			);
			$localize_params = apply_filters( 'pbs_localize_admin_scripts', $localize_params );

			// Admin javascript.
			wp_enqueue_script( __CLASS__ . '-admin', plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/admin' . $js_suffix . '.js', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );
			wp_localize_script( __CLASS__ . '-admin', 'pbsParams', $localize_params );
		}


		/**
		 * Make the TinyMCE editor content look pretty.
		 *
		 * @since 1.0
		 *
		 * @return void
		 */
		public function add_editor_styles() {
		    add_editor_style( plugins_url( 'page_builder_sandwich/css/style.min.css', __FILE__ ) );
		}


		/**
		 * Includes frontend scripts needed for non-editors.
		 *
		 * @since 2.7
		 *
		 * @return void
		 */
		public function enqueue_frontend() {
			$js_dir = defined( 'WP_DEBUG' ) && WP_DEBUG ? 'dev' : 'min';
			$js_suffix = defined( 'WP_DEBUG' ) && WP_DEBUG ? '' : '-min';

			wp_enqueue_style( __CLASS__ , plugins_url( 'page_builder_sandwich/css/style.min.css', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );

			wp_enqueue_script( __CLASS__, plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/frontend' . $js_suffix . '.js', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );

			$localize_params = array(
				'theme_name' => str_replace( ' ', '-', strtolower( wp_get_theme()->Name ) ),
			);
			$localize_params = apply_filters( 'pbs_localize_frontend_scripts', $localize_params );
			wp_localize_script( __CLASS__, 'pbsFrontendParams', $localize_params );
		}


		/**
		 * Includes frontend scripts needed for editors.
		 *
		 * @since 1.0
		 *
		 * @return void
		 */
		public function enqueue_editor() {

			$js_dir = defined( 'WP_DEBUG' ) && WP_DEBUG ? 'dev' : 'min';
			$js_suffix = defined( 'WP_DEBUG' ) && WP_DEBUG ? '' : '-min';

			if ( isset( $_GET['pbsdebug'] ) ) { // Input var okay.
				$js_dir = 'dev';
				$js_suffix = '';
			}

			if ( ! self::is_editable_by_user() ) {
				return;
			}

			// Load WP Template.
			wp_enqueue_script( 'wp-util' );

			// Used for inspector views and templating.
			wp_enqueue_script( 'backbone' );

			// Used for the media manager modal.
			wp_enqueue_script( 'media-editor' );

			// Requirements for the image editor (replace, edit & crop).
			wp_enqueue_script( 'image-edit', admin_url( '/js/image-edit.js' ) );
			wp_enqueue_script( 'imgareaselect' );
			wp_enqueue_style( 'imgareaselect' );
			wp_enqueue_style( 'media' );
			wp_enqueue_script( 'media' );

			wp_enqueue_style( 'wp-color-picker' );
			wp_enqueue_script( 'jquery-ui-core' );
			wp_enqueue_script( 'jquery-ui-slider' );

			// Link dialog modal.
			wp_enqueue_style( 'editor-buttons' );
			wp_enqueue_script( 'wplink' );

			do_action( 'pbs_enqueue_scripts' );

			// Load WP's color picker.
			wp_enqueue_style( 'wp-color-picker' );
			wp_enqueue_script( 'iris', admin_url( 'js/iris.min.js' ), array( 'jquery-ui-draggable', 'jquery-ui-slider', 'jquery-touch-punch' ), false, 1 );

			// Various icons used in PBS.
			wp_enqueue_style( 'dashicons' );
			wp_enqueue_style( 'genericons', plugins_url( 'page_builder_sandwich/css/inc/genericons/genericons.min.css', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );
			wp_enqueue_media();

			// wp.hooks is now supported in WP 5.0
			if ( ! function_exists( 'register_block_type' ) ) {
				wp_enqueue_script( 'event-manager', plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/inc/event-manager/event-manager' . $js_suffix . '.js', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );
			}

			// Content Tools.
			wp_enqueue_style( 'content-tools', plugins_url( 'page_builder_sandwich/css/inc/content-tools/content-tools.min.css', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );
			wp_enqueue_script( 'content-tools', plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/inc/content-tools/content-tools' . $js_suffix . '.js', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );

			$deps = array( 'content-tools', 'backbone', 'wp-util', 'media-editor', 'iris' );
			if ( function_exists( 'register_block_type' ) ) {
				$deps[] = 'wp-hooks';
			}

			// Main PBS editor script.
			wp_enqueue_style( __CLASS__ . '-builder' , plugins_url( 'page_builder_sandwich/css/editor.min.css', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );
			wp_enqueue_script( __CLASS__ . '-builder', plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/script' . $js_suffix . '.js', __FILE__ ), $deps, VERSION_PAGE_BUILDER_SANDWICH );

			// Display error notices with PBS.
			wp_enqueue_script( __CLASS__ . '-error-notice', plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/script-error-notice' . $js_suffix . '.js', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );

			$error_notice_params = array();
			$error_notice_params = apply_filters( 'pbs_error_notice_localize_scripts', $error_notice_params );

			wp_localize_script( __CLASS__ . '-error-notice', 'errorNoticeParams', $error_notice_params );

			// We need a dummy image ID for the images in pre-designed sections,
			// This is so that the replace/edit buttons appear in the media manager.
			$query = new WP_Query( array(
				'post_status' => 'any',
				'post_type' => 'attachment',
				'posts_per_page' => 1,
			) );
			$dummy_image_id = 0;
			if ( $query->have_posts() ) {
				$query->the_post();
				$dummy_image_id = get_the_ID();
			}
			wp_reset_postdata();

			// Take note of our post ID, we'll use this to check in various
			// places if we are using items from our main post.
			self::$main_post_id = $GLOBALS['post']->ID;

			global $pbs_fs;
			$localize_params = array(
				'is_lite' => PBS_IS_LITE || ! $pbs_fs->can_use_premium_code(),
				'is_rtl' => is_rtl(),
				'ajax_url' => admin_url( 'admin-ajax.php' ),
				'admin_url' => admin_url( '/' ),
				'post_id' => $GLOBALS['post']->ID,
				'theme' => wp_get_theme()->Name,
				'stylesheet_directory_uri' => trailingslashit( get_stylesheet_directory_uri() ),
				'nonce' => wp_create_nonce( 'pbs' ),
				'shortcodes' => self::get_all_shortcodes(),
				'shortcodes_to_hide' => apply_filters( 'pbs_shortcodes_to_hide_in_picker', array() ),
				'default_icon' => plugins_url( 'page_builder_sandwich/images/shortcode-icon.png', __FILE__ ),
				'additional_shortcodes' => apply_filters( 'pbs_shortcodes', array() ),
				'is_admin_bar_showing' => is_admin_bar_showing(),
				'plugin_url' => trailingslashit( plugins_url( '/', __FILE__ ) ),
				'post_status' => ! empty( $GLOBALS['post']->ID ) ? get_post_status( $GLOBALS['post']->ID ) : '',
				'dummy_image_id' => $dummy_image_id,
				'buy_url' => admin_url( '/admin.php?page=page-builder-sandwich-pricing' ),
				'site_url' => get_site_url(),
				'is_preview' => is_preview(),
			);
			$localize_params = apply_filters( 'pbs_localize_scripts', $localize_params );

			wp_localize_script( __CLASS__ . '-builder', 'pbsParams', $localize_params );

		}


		/**
		 * Get all ContentTool/ContentEdit tags/elements used in the content, then run
		 * filters to enqueue the scripts needed by those used tags/elements.
		 *
		 * @since 2.7
		 *
		 * @param string $content The post content.
		 *
		 * @return string The original post content.
		 */
		public function gather_ce_tags( $content ) {

			preg_match_all( '/data\-ce\-tag=[\'"]([^\'"]+)[\'"]/', $content, $data_tags, PREG_PATTERN_ORDER );

			if ( empty( $data_tags[1] ) ) {
				return $content;
			}

			$tags = array_unique( $data_tags[1] );
			foreach ( $tags as $tag ) {
				$tag = strtolower( $tag );
				do_action( "pbs_enqueue_element_scripts_{$tag}", $tag );
			}

			return $content;
		}


		/**
		 * Gets all available shortcodes in the site.
		 *
		 * @since 2.0
		 *
		 * @return array The array of available shortcodes.
		 */
		public static function get_all_shortcodes() {
			$shortcodes = array();
			$ignored_functions = array(
				'__return_false',
				'__return_null',
			);

			global $shortcode_tags;
			if ( is_array( $shortcode_tags ) ) {
				foreach ( $shortcode_tags as $base => $function ) {
					if ( in_array( $function, $ignored_functions, true ) ) {
						continue;
					}
					if ( in_array( $base, $shortcodes, true ) ) {
						continue;
					}
					$shortcodes[] = $base;
				}
			}

			/**
			 * The embed shortcode isn't included by default in the list
			 * UNLESS you have an embed shortcode already in there,
			 * add it into the list.
			 */
			if ( array_search( 'embed', $shortcodes ) === false ) {
				if ( ! empty( $GLOBALS['wp_embed'] ) ) {
					$shortcodes[] = 'embed';
					add_shortcode( 'embed', array( $GLOBALS['wp_embed'], 'shortcode' ) );
				}
			}

			return apply_filters( 'pbs_get_all_shortcodes', $shortcodes );
		}


		/**
		 * Add the empty placeholder text via CSS styles.
		 *
		 * @since 4.3
		 */
		public function add_empty_text_placeholder() {
			if ( ! self::is_editable_by_user() ) {
				return;
			}
			?>
			<style>
			.ce-element--empty.ce-element--type-text:before {
				content: '<?php esc_attr_e( 'Click here to add text', 'page-builder-sandwich' ) ?>';
			}
			</style>
			<?php
		}
	}

	PageBuilderSandwich::instance();

}
