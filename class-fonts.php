<?php
/**
 * Fonts class.
 *
 * This is in charge of adding the font picker, and enqueuing the necessary
 * font files and styles for the picker and in the final content.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSFonts' ) ) {

	/**
	 * This is where all the map element functionality happens.
	 */
	class PBSFonts {


		/**
		 * Google Font API Key for PBS.
		 */
		const GOOGLE_API_KEY = 'AIzaSyDS1XfK5O1n2KXV3a1sonEffs966tQt54g';


		/**
		 * After the_content, this will be true if a font was used in the content.
		 *
		 * @var bool
		 */
		public $used_custom_font_in_content = false;


		/**
		 * Hook into WordPress.
		 */
		function __construct() {

			// Add all the fonts in pbsParams.
			add_filter( 'pbs_localize_scripts', array( $this, 'add_fonts_in_params' ) );

			// Add our font loader when editing.
			add_action( 'wp_enqueue_scripts', array( $this, 'add_font_script' ) );

			// Add our font loader when not editing (if there is a font used).
			add_action( 'the_content', array( $this, 'frontend_enqueue_webfont' ) );

			add_action( 'wp_footer', array( $this, 'add_anti_fout' ) );
		}


		/**
		 * Enqueue the font loader.
		 */
		public function enqueue_webfont_loader() {
			wp_enqueue_script( 'webfontloader', '//ajax.googleapis.com/ajax/libs/webfont/1/webfont.js', array(), VERSION_PAGE_BUILDER_SANDWICH );
		}


		/**
		 * Add the scripts needed by changing fonts.
		 *
		 * @since 3.4
		 */
		public function add_font_script() {
			if ( PageBuilderSandwich::is_editable_by_user() ) {
				$this->enqueue_webfont_loader();
			}
		}


		/**
		 * Check the content if there are any fonts included in the content.
		 * If there's a font, then we enqueue the webfont loader.
		 *
		 * @param string $content The page's content.
		 *
		 * @return string The modified content.
		 */
		public function frontend_enqueue_webfont( $content ) {

			// If editing, webfontloader is already enqueued.
			if ( PageBuilderSandwich::is_editable_by_user() ) {
				return $content;
			}

			if ( preg_match( '/\sdata-font-family=/', $content ) ) {
				$this->used_custom_font_in_content = true;
				$this->enqueue_webfont_loader();
			}

			return $content;
		}


		/**
		 * Add required JS parameters to our script.
		 *
		 * @since 2.9
		 *
		 * @param array $params The localization parameters.
		 *
		 * @return array The modified localization parameters.
		 */
		public function add_fonts_in_params( $params ) {
			require_once( 'function-google-fonts.php' );
			$params['google_fonts'] = pbs_get_all_google_fonts();
			return $params;
		}


		/**
		 * If a font was used, we need to add this style to prevent the
		 * Flash Of Unstyled Text (FOUT).
		 */
		public function add_anti_fout() {
			if ( $this->used_custom_font_in_content ) {
				?>
				<style id="pbs-font-anti-fout">
				html:not(.wf-active):not(.wf-inactive) [data-font-family] {
					visibility: hidden !important;
				}
				</style>
				<?php
			}
		}
	}
}

new PBSFonts();
