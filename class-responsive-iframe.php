<?php
/**
 * Responsive iframe.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSResponsiveIframe' ) ) {

	/**
	 * Responsive iframe class.
	 */
	class PBSResponsiveIframe {


		/**
		 * Hook into WordPress.
		 *
		 * @since 4.0
		 *
		 * @return void
		 */
		function __construct() {
			add_action( 'wp', array( $this, 'replace_page_with_iframe' ), 999 );

			// Add the iframe parameter for the edit button on the admin bar (frontend).
			add_filter( 'pbs_admin_bar_edit_button_url', array( $this, 'add_iframe_to_admin_bar_edit_button' ) );

			// Add the responsive buttons to the PBS admin bar.
			add_filter( 'pbs_post_add_edit_admin_bar_button', array( $this, 'add_responsive_buttons' ) );

			// Add the iframe parameter to the meta box edit button.
			add_filter( 'pbs_meta_box_permalink', array( $this, 'add_iframe_param_to_meta_box_button' ) );
		}


		/**
		 * Replaces the entire page with our iframe template.
		 * Kills the current process.
		 */
		public function replace_page_with_iframe() {
			$iframe_var = isset( $_GET['pbs_iframe'] ); // Input var okay.

			if ( PageBuilderSandwich::is_editable_by_user() && $iframe_var ) {
				include( 'page_builder_sandwich/templates/iframe.php' );
				exit();
			}
		}


		/**
		 * The URL placed in the edit button in the admin bar is '#' by default.
		 * In implementing the responsive iframe, we need the edit button to
		 * (instead of turning on the PBS editor right away) to open the same page
		 * with the iframe parameter to load the iframe template.
		 *
		 * @param string $pbs_edit_url The URL link of the button, '#' by default.
		 *
		 * @return string The modified URL link.
		 */
		public function add_iframe_to_admin_bar_edit_button( $pbs_edit_url ) {
			if ( ! isset( $_GET['pbs_iframe'] ) ) { // Input var okay.
				global $wp_the_query;
				$current_object = $wp_the_query->get_queried_object();
				$edit_post_link = get_permalink( $current_object->ID );
				$pbs_edit_url = add_query_arg( 'pbs_iframe', '1', $edit_post_link );
			}
			return $pbs_edit_url;
		}


		/**
		 * Add our responsive buttons on the admin bar for PBS.
		 *
		 * @param object $wp_admin_bar The admin bar object.
		 */
		public function add_responsive_buttons( $wp_admin_bar ) {
			$args = array(
				'id'    => 'pbs_responsive_desktop',
				'title' => '<span class="ab-icon"></span>',
				'href'  => '#',
				'meta'  => array( 'class' => 'pbs-adminbar-icon' ),
			);
			$wp_admin_bar->add_node( $args );
			$args = array(
				'id'    => 'pbs_responsive_tablet',
				'title' => '<span class="ab-icon"></span>',
				'href'  => '#',
				'meta'  => array( 'class' => 'pbs-adminbar-icon' ),
			);
			$wp_admin_bar->add_node( $args );
			$args = array(
				'id'    => 'pbs_responsive_phone',
				'title' => '<span class="ab-icon"></span>',
				'href'  => '#',
				'meta'  => array( 'class' => 'pbs-adminbar-icon' ),
			);
			$wp_admin_bar->add_node( $args );
		}


		/**
		 * Add the iframe parameter to the meta box edit button.
		 *
		 * @param string $permalink The permalink to the frontend of the page being edited.
		 *
		 * @return string The modified permalink.
		 */
		public function add_iframe_param_to_meta_box_button( $permalink ) {
			return add_query_arg( 'pbs_iframe', '1', $permalink );
		}
	}
} // End if().

new PBSResponsiveIframe();
