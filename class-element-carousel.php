<?php
/**
 * Carousel Element class.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSElementCarousel' ) ) {

	/**
	 * This is where all the carousel element functionality happens.
	 */
	class PBSElementCarousel {


		/**
		 * Hook into WordPress.
		 */
		function __construct() {
			global $pbs_fs;
			if ( ! PBS_IS_LITE && $pbs_fs->can_use_premium_code() ) {
				add_action( 'pbs_enqueue_element_scripts_carousel', array( $this, 'add_carousel_script' ) );
				add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_editor' ) );
			}
		}


		/**
		 * Add the scripts needed by the carousel element.
		 *
		 * @since 2.8
		 *
		 * @return void
		 */
		public function add_carousel_script() {
			$js_dir = defined( 'WP_DEBUG' ) && WP_DEBUG ? 'dev' : 'min';
			$js_suffix = defined( 'WP_DEBUG' ) && WP_DEBUG ? '' : '-min';

			// Admin javascript.
			wp_enqueue_script( 'pbs-element-carousel', plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/frontend-carousel' . $js_suffix . '.js', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );
		}


		/**
		 * Includes frontend scripts needed for editors.
		 *
		 * @since 2.16
		 *
		 * @return void
		 */
		public function enqueue_editor() {
			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return;
			}
			$this->add_carousel_script();
		}
	}
}

new PBSElementCarousel();
