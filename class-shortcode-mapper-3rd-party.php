<?php
/**
 * Support for 3rd party Shortcode Mapping systems.
 *
 * Functionality:
 * 1. Checks for other shortcode mapping systems,
 * 2. Converts mapped shortcodes from other systems to PBS,
 * 3. Simulates 3rd party mapping functions to convert them to PBS
 *
 * @since 2.19
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSShortcodeMapper3rdParty' ) ) {

	/**
	 * This is where all the shortcode mapper functionality happens.
	 */
	class PBSShortcodeMapper3rdParty {

		/**
		 * Hook into the frontend.
		 */
		function __construct() {

			// Add support for other shortcode mappers like VC & Shortcake.
			add_action( 'plugins_loaded', array( $this, 'add_third_party_mappers' ) );
		}


		/**
		 * Handle the other shortcode mappings from other plugins.
		 */
		public function add_third_party_mappers() {

			// Support Visual Composer's shortcodes.
			add_action( 'init', array( $this, 'add_visual_composer_support' ) );

			// Support Shortcake UI shortcodes.
			add_action( 'init', array( $this, 'add_shortcake_support' ) );
		}


		/**
		 * Get shortcode mappings made for Visual Composer.
		 *
		 * @see https://wpbakery.atlassian.net/wiki/pages/viewpage.action?pageId=524332
		 */
		public function add_visual_composer_support() {
			if ( class_exists( 'WPBMap' ) ) {
				// Use WPBMap::getAllShortCodes() to catch the mappings.
				// Loop through all the shortcodes and enter them into our mapper.
				$data = WPBMap::getAllShortCodes();
				foreach ( $data as $shortcode_tag => $params ) {
					self::_vc_map( $params );
				}
			} else if ( ! function_exists( 'vc_map' ) ) {
				// Define our own vc_map( $attributes ) to catch those mappings.
				require_once( 'class-shortcode-mapper-vc.php' );
			}
		}


		/**
		 * Get shortcode mappings made for Shortcake UI.
		 *
		 * @see https://github.com/wp-shortcake/shortcake/wiki/Registering-Shortcode-UI
		 * @see https://github.com/fusioneng/Shortcake/blob/master/dev.php for sample args.
		 */
		public function add_shortcake_support() {
			if ( function_exists( 'shortcode_ui_register_for_shortcode' ) ) {
				// Capture calls to apply_filters( 'shortcode_ui_shortcode_args', $args, $shortcode_tag ); to catch the mappings.
				add_filter( 'shortcode_ui_shortcode_args', array( self, '_shortcode_ui_shortcode_args' ), 11, 2 );
			} else {
				// Define our own shortcode_ui_register_for_shortcode( $shortcode_tag, $args = array() ) to catch mappings.
				require_once( 'class-shortcode-mapper-shortcake.php' );
			}
		}


		/**
		 * Get shortcode mappings made for Shortcake UI.
		 *
		 * @param array  $args The shortcode attributes.
		 * @param string $shortcode_tag The shortcode.
		 *
		 * @return array The modified arguments.
		 *
		 * @see https://github.com/wp-shortcake/shortcake/wiki/Registering-Shortcode-UI
		 * @see https://github.com/fusioneng/Shortcake/blob/master/dev.php for sample args.
		 */
		public static function _shortcode_ui_shortcode_args( $args, $shortcode_tag ) {
			// TODO Add shortcode data to our own mapper.
			return $args;
		}


		/**
		 * Get shortcode mappings made for Visual Composer's vc_map.
		 *
		 * @param array $params The shortcode parameters.
		 *
		 * @see https://wpbakery.atlassian.net/wiki/pages/viewpage.action?pageId=524332
		 */
		public static function _vc_map( $params ) {
			// TODO Add shortcode data to our own mapper.
		}
	}
}

// Commented because this is not ready yet!
// new PBSShortcodeMapper3rdParty(); // @codingStandardsIgnoreLine
