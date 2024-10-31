<?php
/**
 * Contact Form 7 element.
 *
 * @since 4.0
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSElementCF7' ) ) {

	/**
	 * This is where all the CF7 functionality happens.
	 */
	class PBSElementCF7 {

		/**
		 * Hook into the frontend.
		 */
		function __construct() {
			add_filter( 'pbs_localize_scripts', array( $this, 'localize_scripts' ) );
		}


		/**
		 *
		 * Check if Contact Form 7 plugin is activated.
		 *
		 * Get first contact form id.
		 *
		 * @param array $params Localization params.
		 *
		 * @return array Modified localization params.
		 */
		public function localize_scripts( $params ) {

			if ( class_exists( 'WPCF7' ) ) {
				$params['has_wpcf7'] = 'has_wpcf7';

				$args = array(
				 	'posts_per_page' => 1,
					'post_type' => 'wpcf7_contact_form',
					'post_status' => 'publish',
					'suppress_filters' => false,
				);

				// @codingStandardsIgnoreLine
				$posts_array = get_posts( $args );

				if ( ! empty( $posts_array ) ) {
					$id = '';
					foreach ( $posts_array as $post_type ) {
						$id = $post_type->ID;
					}
					$params['contact_form7'] = $id;
				}
			}
			return $params;
		}
	}
}

new PBSElementCF7();
