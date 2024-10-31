<?php
/**
 * Countdown Element class.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSElementCountdown' ) ) {

	/**
	 * This is where all the countdown element functionality happens.
	 */
	class PBSElementCountdown {


		/**
		 * Hook into WordPress.
		 */
		function __construct() {
			global $pbs_fs;
			if ( ! PBS_IS_LITE && $pbs_fs->can_use_premium_code() ) {
				add_action( 'pbs_enqueue_element_scripts_countdown', array( $this, 'add_countdown_script' ) );
				add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_editor' ) );
			}
		}


		/**
		 * Add the scripts needed by the countdown element.
		 *
		 * @since 4.0
		 *
		 * @return void
		 */
		public function add_countdown_script() {
			$js_dir = defined( 'WP_DEBUG' ) && WP_DEBUG ? 'dev' : 'min';
			$js_suffix = defined( 'WP_DEBUG' ) && WP_DEBUG ? '' : '-min';

			// Admin javascript.
			wp_enqueue_script( 'pbs-element-countdown-dep', plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/inc/countdown/countdown' . $js_suffix . '.js', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );
			wp_enqueue_script( 'pbs-element-countdown', plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/frontend-countdown' . $js_suffix . '.js', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );

			wp_localize_script( 'pbs-element-countdown', 'pbsCountdownParams', array(
				'years' => __( 'Years', 'page-builder-sandwich' ),
				'months' => __( 'Months', 'page-builder-sandwich' ),
				'weeks' => __( 'Weeks', 'page-builder-sandwich' ),
				'days' => __( 'Days', 'page-builder-sandwich' ),
				'hours' => __( 'Hours', 'page-builder-sandwich' ),
				'minutes' => __( 'Minutes', 'page-builder-sandwich' ),
				'seconds' => __( 'Seconds', 'page-builder-sandwich' ),
			) );
		}


		/**
		 * Includes frontend scripts needed for editors.
		 *
		 * @since 4.0
		 *
		 * @return void
		 */
		public function enqueue_editor() {
			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return;
			}
			$this->add_countdown_script();
		}
	}
}

new PBSElementCountdown();
