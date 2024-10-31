<?php
/**
 * Advanced Custom Fields element.
 *
 * @since 4.0
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSElementACF' ) ) {

	/**
	 * This is where all the ACF functionality happens.
	 */
	class PBSElementACF {

		/**
		 * Hook into the frontend.
		 */
		function __construct() {
			add_filter( 'pbs_localize_scripts', array( $this, 'localize_scripts' ) );
		}


		/**
		 * Check if Advanced Custom Fields plugin is activated.
		 *
		 * Get first field name value.
		 *
		 * @param array $params Localization params.
		 *
		 * @return array Modified localization params.
		 */
		public function localize_scripts( $params ) {

			if ( class_exists( 'acf' ) ) {
				$params['has_acf'] = 'has_acf';
				$get_field = get_fields();
				if ( ! empty( $get_field ) ) {
					if ( is_array( $get_field ) ) {
						$fields = array_keys( $get_field );
						if ( count( $fields ) ) {
							$field_name = $fields[0];
							$params['acf_field_name'] = $field_name;
						}
					}
				}
			}
			return $params;
		}
	}
}

new PBSElementACF();
