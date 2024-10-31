<?php
/**
 * ALL Shortcodes used by Page Builder Sandwich.
 * This can spun off into another plugin so that PBS can be turned off and the shortcodes
 * can be retained.
 *
 * @since 2.11
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSShortcodes' ) ) {

	/**
	 * This is where all the shortcode functionality happens.
	 */
	class PBSShortcodes {

		/**
		 * Shortcodes to hide from the frontend.
		 *
		 * @var array
		 */
		private $shortcodes_to_hide = array(
			'pbs_widget',
			'pbs_sidebar',
		);


		/**
		 * A unique incremental identifier for widget shortcodes.
		 *
		 * @var int
		 */
		public $widget_ids = 1;


		/**
		 * Hook into the frontend.
		 */
		function __construct() {
			add_shortcode( 'pbs_widget', array( $this, 'widget' ) );
			add_shortcode( 'pbs_sidebar', array( $this, 'sidebar' ) );
			add_filter( 'pbs_shortcodes_to_hide_in_picker', array( $this, 'hide_shortcodes_from_picker' ) );
		}


		/**
		 * Remove PBS internal shortcodes from the shortcode picker modal & other processes.
		 *
		 * @since 2.18
		 *
		 * @param array $shortcodes The list of shortcodes.
		 *
		 * @return array The modified list of shortcodes.
		 */
		public function hide_shortcodes_from_picker( $shortcodes ) {
			return array_merge( $shortcodes, $this->shortcodes_to_hide );
		}


		/**
		 * Widget shortcode.
		 *
		 * @since 2.11
		 *
		 * @param array  $atts Shortcode parameters.
		 * @param string $content Shortcode wrapped content.
		 *
		 * @return string The rendered widget
		 */
		public function widget( $atts, $content = '' ) {
			if ( empty( $atts['widget'] ) ) {
				$atts['widget'] = 'WP_Widget_Text';
			}

			$widget_slug = $atts['widget'];
			unset( $atts['widget'] );

			// Check if the widget exists. Widgets slugs are the class names in PHP.
			if ( ! class_exists( $widget_slug ) ) {
				return '';
			}

			ob_start();
			the_widget( $widget_slug, $atts, array(
				'widget_id' => 'pbs_widget_' . $this->widget_ids++,
			) );
			return ob_get_clean();
		}


		/**
		 * Sidebar shortcode.
		 *
		 * @since 2.12
		 *
		 * @param array  $atts Shortcode parameters.
		 * @param string $content Shortcode wrapped content.
		 *
		 * @return string The rendered sidebar
		 */
		public function sidebar( $atts, $content = '' ) {
			$atts = shortcode_atts( array(
				'id' => '',
			), $atts, 'pbs_sidebar' );

			if ( empty( $atts['id'] ) ) {
				return '';
			}

			if ( is_active_sidebar( $atts['id'] ) ) {
				ob_start();
				dynamic_sidebar( $atts['id'] );
				return ob_get_clean();
			}

			return '';
		}
	}
}

new PBSShortcodes();
