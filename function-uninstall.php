<?php
/**
 * Uninstall file
 *
 * @since 3.1
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! function_exists( 'pbs_uninstall' ) ) {

	/**
	 * Uninstall function for Freemius.
	 */
	function pbs_uninstall() {

		// Used by class-migration.php.
		delete_option( 'pbs_no_migration_notice' );

		// Used by class-intro.php.
		delete_option( 'pbs_first_load_intro' ); // Old intro option.
		delete_option( 'pbs_first_load_intro_v3' );

		// Used by class-licensing.php.
		delete_option( 'pbs_license_status' );
		delete_option( 'pbs_license' );

		// Used by the admin notice for new users.
		delete_option( 'pbs_plugin_activation_notice' );

		// Used by class-lite-tracking.php.
		delete_option( 'pbs_lite_tracking_seconds' );
		delete_option( 'pbs_lite_tracking_shown60' );
		delete_option( 'pbs_lite_tracking_shown120' );
		delete_option( 'pbs_lite_tracking_shown180' );
		delete_option( 'pbs_lite_tracking_rated' );

		// Used by class-icons-uploader.php.
		delete_option( 'pbs_uploaded_svg' );

		// Used by class-stats-tracking.php.
		delete_option( 'pbs_stats_tracking_opted_in' ); // Deprecated.

		// Used by class-shortcode-mapper.php.
		delete_option( 'pbs_shortcode_mappings' );
		delete_option( 'pbs_shortcode_mappings_total' );
		delete_option( 'pbs_shortcode_mapped_plugins_total' );
		delete_option( 'pbs_shortcode_mapped_shortcodes_total' );

		// Used by class-freemius.php.
		delete_option( 'pbs_premium_notice' );

		// Used by class-ask-rating.php.
		delete_option( 'pbs_install_date' );
		delete_option( 'pbs_has_rated' );

		// Old stuff as of 4.2.2 in class-ask-rating.php.
		delete_option( 'pbs_asked_rate_editing_time' );
		delete_option( 'pbs_asked_rate_edited_posts' );
		delete_option( 'pbs_ask_total_editing_time' );
		delete_option( 'pbs_ask_posts_edited' );

		// Used by class-admin-settings.
		delete_option( 'pbs_lite_options' );
	}
}
