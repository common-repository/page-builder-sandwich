<?php
/**
 * Introduction Tour for the frontend.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSIntro' ) ) {

	/**
	 * This is where all the intro functionality happens.
	 */
	class PBSIntro {

		/**
		 * Hook into the frontend.
		 */
		function __construct() {
			add_filter( 'pbs_localize_scripts', array( $this, 'localize_scripts' ) );

			add_action( 'wp_ajax_pbs_did_tour', array( $this, 'did_tour' ) );
		}

		/**
		 * Trigger the tour to show only for first time usage.
		 *
		 * @param array $args Localization array.
		 *
		 * @return array The modified localization array.
		 */
		public function localize_scripts( $args ) {
			$args['do_intro'] = get_option( 'pbs_first_load_intro_v4' ) === false;
			return $args;
		}


		/**
		 * When the tour plays in the frontend, update the did play tour.
		 *
		 * @since 4.0.1
		 */
		public function did_tour() {
			if ( empty( $_POST['nonce'] ) ) { // Input var: okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var: okay.
			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}

			update_option( 'pbs_first_load_intro_v4', 'done' );

			die();
		}
	}
}

new PBSIntro();
