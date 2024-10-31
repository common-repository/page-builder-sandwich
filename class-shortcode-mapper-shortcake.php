<?php
/**
 * Dummy shortcode_ui_register_for_shortcode function.
 * This file is only used if Shortcake UI isn't available.
 *
 * @package Page Builder Sandwich
 *
 * @see PBSShortcodeMapper3rdParty::_shortcode_ui_shortcode_args
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! function_exists( 'shortcode_ui_register_for_shortcode' ) ) {

	/**
	 * Dummy function to capture calls to shortcode_ui_register_for_shortcode since
	 * the function does not exist.
	 *
	 * @param string $shortcode_tag The shortcode.
	 * @param array  $args The shortcode attributes.
	 */
	function shortcode_ui_register_for_shortcode( $shortcode_tag, $args = array() ) {
		PBSShortcodeMapper3rdParty::_shortcode_ui_shortcode_args( $args, $shortcode_tag );
	}
}
