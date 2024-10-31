<?php
/**
 * Ask rating after 14 days of being installed.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBS_Ask_Rating' ) ) {

	/**
	 * This is where all the tracking functionality happens.
	 */
	class PBS_Ask_Rating {

		/**
		 * Hook into WordPress.
		 */
		function __construct() {

			// Show our rating notice if possible.
			add_action( 'admin_notices', array( $this, 'ask_rating' ) );

			// Handler for when the user clicked on a rate button.
			add_action( 'wp_ajax_pbs_hide_rating', array( $this, 'rated' ) );
		}


		/**
		 * Show rating notice, only shows after 10 days of being installed.
		 *
		 * @since 4.2.2
		 */
		public function ask_rating() {
			if ( ! current_user_can( 'update_plugins' ) ) {
				return;
			}

			// If already rated, do nothing.
			if ( get_option( 'pbs_has_rated' ) ) {
				return;
			}

			// If we don't have an install date, add it.
			if ( ! get_option( 'pbs_install_date' ) ) {
				add_option( 'pbs_install_date', date( 'Y-m-d h:i:s' ) );
			}

			$install_date = get_option( 'pbs_install_date' );
			$display_date = date( 'Y-m-d h:i:s' );
			$datetime1 = new DateTime( $install_date );
			$datetime2 = new DateTime( $display_date );
			$diff_interval = round( ( $datetime2->format( 'U' ) - $datetime1->format( 'U' ) ) / ( 60 * 60 * 24 ) );

			?>
			<div class="notice notice-warning pbs-rate-notice">
				<img src="<?php echo esc_url( plugins_url( 'page_builder_sandwich/images/pbs-logo.png', PBS_FILE ) ) ?>" alt="PBS Logo" height="70" width="70"/>
					<p>May I ask you to give it a <strong>5-star rating</strong> on Wordpress? <br>This will help to spread its popularity and make PBS better.<br><br>Your help is much appreciated. Thank you very much,<br> ~ Neil James @ PBN Hosting SL
					<p>
					<a class="button button-primary pbs-rate-hide" href="https://wordpress.org/support/plugin/page-builder-sandwich/reviews/#new-post" target="_blank" title="<?php esc_attr_e( 'Yes, you deserve it', 'page-builder-sandwich' ) ?>"><?php esc_html_e( 'Yes, you deserve it', 'page-builder-sandwich' ) ?></a>
					<a class="button button-default pbs-rate-hide" title="<?php esc_attr_e( 'I already did', 'page-builder-sandwich' ) ?>"><?php esc_html_e( 'I already did', 'page-builder-sandwich' ) ?></a>
					<a class="button button-default pbs-rate-hide" title="<?php esc_attr_e( 'It\'s no good, I don\'t want to rate it', 'page-builder-sandwich' ) ?>"><?php esc_html_e( 'It\'s no good, I don\'t want to rate it', 'page-builder-sandwich' ) ?></a>
				</p>
			</div>
			<?php
		}


		/**
		 * Rated click ajax handler.
		 *
		 * @since 4.2.2
		 */
		public function rated() {
			if ( empty( $_POST['nonce'] ) ) { // Input var: okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var: okay.
			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}

			update_option( 'pbs_has_rated', true );

			die();
		}
	}
} // End if().

new PBS_Ask_Rating();
