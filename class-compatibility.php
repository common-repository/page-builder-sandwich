<?php
/**
 * Compatibility stuff for various plugins.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSCompatibility' ) ) {

	/**
	 * Compatibility class.
	 */
	class PBSCompatibility {


		/**
		 * Hook into WordPress.
		 *
		 * @since 2.7
		 *
		 * @return void
		 */
		function __construct() {
			add_filter( 'pbs_load_editor', array( $this, 'yellow_pencil' ) );
			add_action( 'pbs_pre_save_content', array( $this, 'syntaxhighlighter_evolved' ), 1 );
		}


		/**
		 * Compatibility for Yellow Pencil. Turn off PBS when YP editor is on.
		 *
		 * @since 2.7
		 *
		 * @param bool $load true if we should continue loading PBS.
		 *
		 * @return	boolean True if we should continue loading PBS.
		 */
		public function yellow_pencil( $load ) {
			if ( ! is_admin() && ! empty( $_GET['yellow_pencil_frame'] ) ) { // Input var okay.
				return false;
			}
			return $load;
		}


		/**
		 * Compatibility with SyntaxHighlighter Evolved. Remove some regex/modifications
		 * that this plugin does upon saving because it messes up the saved content.
		 *
		 * @since 4.3
		 *
		 * @see syntaxhighlighter.php:51 version 3.2.1
		 */
		public function syntaxhighlighter_evolved() {
			if ( class_exists( 'SyntaxHighlighter' ) ) {

				// @codingStandardsIgnoreLine
				global $SyntaxHighlighter;

				// @codingStandardsIgnoreLine
				remove_filter( 'content_save_pre', array( $SyntaxHighlighter, 'encode_shortcode_contents_slashed_noquickedit' ), 1 );
			}
		}
	}
}
