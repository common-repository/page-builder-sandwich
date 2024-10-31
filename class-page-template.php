<?php
/**
 * Page Templates
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSPageTemplate' ) ) {

	/**
	 * Page templates class.
	 */
	class PBSPageTemplate {


		/**
		 * Hook into WordPress.
		 *
		 * @since 4.0
		 *
		 * @return void
		 */
		function __construct() {

			// Add the page template button to the PBS admin bar.
			add_filter( 'pbs_pre_add_edit_admin_bar_button', array( $this, 'add_template_button' ) );

			// Add the template files for the page templates.
			add_action( 'wp_footer', array( $this, 'add_page_templates' ) );
		}


		/**
		 * Add our responsive buttons on the admin bar for PBS.
		 *
		 * @param object $wp_admin_bar The admin bar object.
		 */
		public function add_template_button( $wp_admin_bar ) {

			$args = array(
				'id'    => 'pbs_page_templates',
				'title' => esc_html__( 'Templates', 'page-builder-sandwich' ),
				'href'  => '#',
				'meta'  => array( 'class' => 'pbs-adminbar-icon' ),
			);
			$wp_admin_bar->add_node( $args );
		}


		/**
		 * Adds PBS page templates.
		 *
		 * @since 4.0
		 */
		public function add_page_templates() {
			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return;
			}

			global $pbs_url_for_templates;
			$pbs_url_for_templates = trailingslashit( plugins_url( 'page_builder_sandwich', __FILE__ ) );

			// Include the modal frame picker.
			include 'page_builder_sandwich/templates/frame-page-template-picker.php';

			// Include the templates.
			global $pbs_fs;
			if ( ! PBS_IS_LITE && $pbs_fs->can_use_premium_code() ) {
				include 'page_builder_sandwich/templates/page-template-hotel.php';
				include 'page_builder_sandwich/templates/page-template-law.php';
				include 'page_builder_sandwich/templates/page-template-fashion.php';
				include 'page_builder_sandwich/templates/page-template-farm.php';
				include 'page_builder_sandwich/templates/page-template-restaurant.php';
				include 'page_builder_sandwich/templates/page-template-concert.php';
				include 'page_builder_sandwich/templates/page-template-forum.php';
				include 'page_builder_sandwich/templates/page-template-portfolio.php';
				// @codingStandardsIgnoreLine
				// include 'page_builder_sandwich/templates/page-template-car-repair.php';
				include 'page_builder_sandwich/templates/page-template-non-profit.php';
				include 'page_builder_sandwich/templates/page-template-lifestyle-blog.php';
				include 'page_builder_sandwich/templates/page-template-industrial.php';
				include 'page_builder_sandwich/templates/page-template-wedding.php';
			} else {

				// This template is auto-generated from the other page-template-* files.
				include 'page_builder_sandwich/templates/page-template-sample.php';
			}
		}
	}
}

new PBSPageTemplate();
