<?php
/**
 * Render Shortcode Class
 *
 * This class is in charge of getting rendered shortcodes to show up in the
 * frontend builder for previewing.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

// Initializes Shortcode class.
if ( ! class_exists( 'PBSRenderShortcode' ) ) {

	/**
	 * This is where all the plugin's functionality happens.
	 */
	class PBSRenderShortcode {


		/**
		 * Holds the rendered form of the shortcode (outputted by do_shortcode)
		 *
		 * @var string
		 */
		public $saved_shortcode_data = '';


		/**
		 * Holds the list of style handles that exist before the shortcode was rendered.
		 * This is used to gather the style handles introduced by rendering the shortcode.
		 *
		 * @var array
		 */
		public $original_style_handles;


		/**
		 * Holds the list of script handles that exist before the shortcode was rendered.
		 * This is used to gather the script handles introduced by rendering the shortcode.
		 *
		 * @var array
		 */
		public $original_script_handles;


		/**
		 * If ob_start() was called outside this class, then this would be true.
		 *
		 * @since 2.9.2
		 *
		 * @var boolean
		 */
		public static $did_initial_ob_start = false;


		/**
		 * Hook into the page render in order to bypass all page rendering.
		 *
		 * @return void
		 */
		function __construct() {
			add_filter( 'the_content', array( $this, 'shortcode_render' ), 9999 );
			add_action( 'after_setup_theme', array( $this, 'shortcode_render_halt_early' ), 0 );
			add_action( 'shutdown', array( $this, 'shortcode_render_end' ), 0 );
		}


		/**
		 * Checks whether the page was loaded in order to get the rendered
		 * output of a shortcode.
		 *
		 * @param bool $check_user_priv If true, check user privileges.
		 *
		 * @return bool True if the page request is for rendering a shortcode,
		 *              False if the page request is a normal request.
		 */
		public function is_doing_shortcode_render( $check_user_priv = true ) {
			if ( $check_user_priv ) {
				if ( ! PageBuilderSandwich::is_editable_by_user() ) {
					return false;
				}
			}
			if ( empty( $_POST['nonce'] ) ) { // Input var: okay.
				return false;
			}
			if ( ! wp_verify_nonce( sanitize_key( $_POST['nonce'] ), 'pbs' ) ) { // Input var: okay.
				return false;
			}
			if ( empty( $_POST['action'] ) || 'pbs_shortcode_render' !== $_POST['action'] ) { // Input var: okay.
				return false;
			}
			return true;
		}


		/**
		 * Called very early in the WP page lifecycle, if the page request isn't
		 * for getting the rendered output of a shortcode, cancel the `ob_start()`
		 * initiated at the beginning of this script.
		 *
		 * @return void
		 */
		public function shortcode_render_halt_early() {
			if ( is_admin() ) {
				return;
			}

			// At this part of the lifecycle, we do not have access yet to
			// user privileges.
			if ( ! $this->is_doing_shortcode_render( false ) && self::$did_initial_ob_start ) {
				// @codingStandardsIgnoreStart
				@ob_end_flush();
				// @codingStandardsIgnoreEnd
			}
		}


		/**
		 * Called before anything in the page is outputted, if the page request
		 * isn't for getting the rendered output of a shortcode, cancel the
		 * `ob_start()` initiated at the beginning of this script.
		 *
		 * Take note that `shortcode_render_halt_early()` could already have
		 * cancelled `ob_start()`
		 *
		 * @see shortcode_render_halt_early()
		 *
		 * @return void
		 */
		public function shortcode_render_halt_head() {
			if ( is_admin() ) {
				return;
			}
			if ( ! $this->is_doing_shortcode_render() ) {
				if ( ob_get_level() ) {
					ob_end_flush();
				}
			}
		}


		/**
		 * Called at the very end of the WP page lifecycle, prevents any normal
		 * output and just output the rendered shortcode data.
		 *
		 * @return void
		 */
		public function shortcode_render_end() {
			if ( is_admin() ) {
				return;
			}
			if ( ! $this->is_doing_shortcode_render() ) {
				return;
			}

		    // We'll need to get the number of ob levels we're in, so that we can iterate over each, collecting
		    // that buffer's output into the final output.
		    $levels = ob_get_level();

		    for ( $i = 0; $i < $levels; $i++ ) {
		        ob_get_clean();
		    }

			$data = array();

			// Print out our shortcode output.
			$data['output'] = do_shortcode( $this->saved_shortcode_data );

			// Print out the styles and scripts used by the shortcode.
			global $wp_scripts, $wp_styles;

			ob_start();
			if ( $wp_styles && is_array( $wp_styles->queue ) ) {
				foreach ( $wp_styles->queue as $handle ) {
					if ( ! in_array( $handle, $this->original_style_handles, true ) ) {
						$wp_styles->do_item( $handle );
					}
				}
			}
			$data['styles'] = ob_get_clean();

			ob_start();
			if ( $wp_scripts && is_array( $wp_scripts->queue ) ) {
				foreach ( $wp_scripts->queue as $handle ) {
					if ( ! in_array( $handle, $this->original_script_handles, true ) ) {
						$wp_scripts->do_item( $handle );
					}
				}
			}
			$data['scripts'] = ob_get_clean();

			echo wp_json_encode( $data );
		}


		/**
		 * Overrides the page content and turns it into blank. Also renders
		 * the shortcode in the content area and saves it for later outputting
		 * for `shortcode_render_end()`
		 *
		 * @see shortcode_render_end()
		 *
		 * @param string $content The original post content.
		 *
		 * @return string The altered post content
		 */
		public function shortcode_render( $content ) {
			if ( is_admin() ) {
				return $content;
			}
			if ( ! $this->is_doing_shortcode_render() ) {
				return $content;
			}

			// Remember the original list of styles and scripts.
			global $wp_scripts, $wp_styles;
			$this->original_style_handles = $wp_styles->queue;
			$this->original_script_handles = $wp_scripts->queue;

			// Render and remember the shortcode.
			$shortcode = '';
			if ( ! empty( $_POST['shortcode'] ) ) { // Input var: okay. WPCS: CSRF ok.
				$shortcode = base64_decode( wp_unslash( $_POST['shortcode'] ) ); // Input var: okay. WPCS: CSRF ok. WPCS: sanitization ok.
			}

			// We will render this later to make sure the shortcode is available.
			$this->saved_shortcode_data = $shortcode;

			return '';
		}
	}

}



/**
 * This is needed during shortcode rendering, we need to do this at the root level.
 */
if ( ! empty( $_POST['action'] ) && ! empty( $_POST['nonce'] ) && 'pbs_shortcode_render' === $_POST['action'] ) { // Input var: okay.

	// Don't do this while in login pages.
	if ( ! empty( $GLOBALS['pagenow'] ) && ! in_array( $GLOBALS['pagenow'], array( 'wp-login.php', 'wp-register.php' ), true ) ) {
		ob_start();
		PBSRenderShortcode::$did_initial_ob_start = true;
	}
}
