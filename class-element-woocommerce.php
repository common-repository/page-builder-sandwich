<?php
/**
 * WooCommerce element.
 *
 * @since 4.0
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSElementWooCommerce' ) ) {

	/**
	 * This is where all the newsletter functionality happens.
	 */
	class PBSElementWooCommerce {

		/**
		 * Hook into the frontend.
		 */
		function __construct() {
			add_filter( 'pbs_localize_scripts', array( $this, 'localize_scripts' ) );
		}


		/**
		 * Check if WooCommerce plugin is activated.
		 *
		 * @param array $params Localization params.
		 *
		 * @return array Modified localization params.
		 */
		public function localize_scripts( $params ) {

			if ( class_exists( 'WooCommerce' ) ) {
				$params['has_woocommerce'] = 'has_woocommerce';
			}
			return $params;
		}
	}
}

new PBSElementWooCommerce();
