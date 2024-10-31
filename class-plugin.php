<?php
/**
Plugin Name: Page Builder Sandwich
Description: A revolutionary WordPress front-end drag & drop page builder. Create pages effortlessly & without any code. Get amazing results from any theme.
Author: WordPress Page Builder Sandwich Team
Version: 5.1.0
Author URI: https://pagebuildersandwich.com
Plugin URI: https://pagebuildersandwich.com
Text Domain: page-builder-sandwich
Domain Path: /languages/
SKU: PBS
 *
 * The main plugin file
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

// Freemius: auto deactivate the free version when activating the paid one.
if ( function_exists( 'pbs_fs' ) ) {
	pbs_fs()->set_basename( true, __FILE__ );
	return;
}

// Identifies the current plugin version.
defined( 'VERSION_PAGE_BUILDER_SANDWICH' ) || define( 'VERSION_PAGE_BUILDER_SANDWICH', '5.1.0' );

// The slug used for translations & other identifiers.
defined( 'PAGE_BUILDER_SANDWICH' ) || define( 'PAGE_BUILDER_SANDWICH', 'page-builder-sandwich' );

defined( 'PBS_FILE' ) || define( 'PBS_FILE', __FILE__ );

if ( ! function_exists( 'pbs_is_dev' ) ) {
	/**
	 * Returns true if we are in development mode and not in a built copy.
	 *
	 * @since 2.18
	 *
	 * @return boolean True if we are developing.
	 */
	function pbs_is_dev() {
		if ( defined( 'WP_DEBUG' ) ) {
			if ( WP_DEBUG ) {
				return file_exists( trailingslashit( plugin_dir_path( __FILE__ ) ) . '_design-element-cleanup.php' );
			}
		}
		return false;
	}
}

// Constants that we need.
require_once( 'constants.php' );

// Freemius stuff.
require_once( 'class-freemius.php' );
require_once( 'module-migration.php' );

// This is the main plugin functionality.
require_once( 'class-compatibility.php' );
require_once( 'class-render-shortcode.php' );
require_once( 'class-page-builder-sandwich.php' );
require_once( 'class-migration.php' );
require_once( 'class-intro.php' );
require_once( 'class-meta-box.php' );
require_once( 'class-meta-box-gutenberg.php' );
require_once( 'class-icons.php' );
require_once( 'class-shortcodes.php' );
require_once( 'class-element-widget.php' );
require_once( 'class-element-sidebar.php' );
require_once( 'class-element-html.php' );
require_once( 'class-element-map.php' );
require_once( 'class-translations.php' );
require_once( 'class-shortcode-mapper.php' );
require_once( 'class-shortcode-mapper-3rd-party.php' );
require_once( 'class-inspector.php' );
require_once( 'class-frame-admin.php' );
require_once( 'class-heartbeat.php' );
require_once( 'class-pbs-ask-rating.php' );
require_once( 'class-admin-welcome.php' );
require_once( 'class-pbs-admin-settings.php' );
require_once( 'class-admin-settings-map.php' );
require_once( 'class-title.php' );
require_once( 'class-responsive-iframe.php' );
require_once( 'class-page-template.php' );
require_once( 'class-blank-page-template.php' );


// Initializes plugin class.
if ( ! class_exists( 'PageBuilderSandwichPlugin' ) ) {

	/**
	 * Initializes core plugin that is readable by WordPress.
	 *
	 * @return	void
	 * @since	1.0
	 */
	class PageBuilderSandwichPlugin {

		/**
		 * Hook into WordPress.
		 *
		 * @return	void
		 * @since	1.0
		 */
		function __construct() {

			// Our translations.
			add_action( 'plugins_loaded', array( $this, 'load_text_domain' ), 1 );

			// Plugin links.
			add_filter( 'plugin_row_meta', array( $this, 'plugin_links' ), 10, 2 );

			// Plugin links for internal developer tools.
			add_filter( 'plugin_row_meta', array( $this, 'dev_tool_links' ), 10, 2 );

			// Add edit with PBS links to posts & pages.
			add_filter( 'post_row_actions', array( $this, 'add_pbs_edit_link' ), 10, 2 );
			add_filter( 'page_row_actions', array( $this, 'add_pbs_edit_link' ), 10, 2 );

			new PBSMigration();
		}


		/**
		 * Loads the translations.
		 *
		 * @return	void
		 * @since	1.0
		 */
		public function load_text_domain() {
			load_plugin_textdomain( PAGE_BUILDER_SANDWICH, false, basename( dirname( __FILE__ ) ) . '/languages/' );
		}


		/**
		 * Adds plugin links.
		 *
		 * @access	public
		 * @param	array  $plugin_meta The current array of links.
		 * @param	string $plugin_file The plugin file.
		 * @return	array The current array of links together with our additions.
		 * @since	1.0
		 **/
		public function plugin_links( $plugin_meta, $plugin_file ) {
			if ( plugin_basename( __FILE__ ) === $plugin_file ) {

				$plugin_meta[] = sprintf( "<a href='%s' target='_blank'>%s</a>",
					'http://docs.pagebuildersandwich.com/',
					__( 'Documentation', 'page-builder-sandwich' )
				);

				global $pbs_fs;
				if ( PBS_IS_LITE || ! $pbs_fs->can_use_premium_code() ) {
					$plugin_meta[] = sprintf( "<a href='%s' target='_blank'>%s</a>",
						'https://wordpress.org/support/plugin/page-builder-sandwich#new-post',
						__( 'Support Forum', 'page-builder-sandwich' )
					);
					$plugin_meta[] = sprintf( "<a href='%s' target='_blank'>%s</a>",
						esc_url( admin_url( '/admin.php?page=page-builder-sandwich-pricing' ) ),
						__( 'Go Premium', 'page-builder-sandwich' )
					);

				} else {
					$plugin_meta[] = sprintf( "<a href='%s' target='_blank'>%s</a>",
						esc_url( admin_url( '/admin.php?page=page-builder-sandwich-contact' ) ),
						__( 'Get Customer Support', 'page-builder-sandwich' )
					);
				}
			}
			return $plugin_meta;
		}


		/**
		 * Adds plugin links for different developer tools (for internal use only, these won't show up in user's sites).
		 *
		 * @access	public
		 * @param	array  $plugin_meta The current array of links.
		 * @param	string $plugin_file The plugin file.
		 * @return	array The current array of links together with our additions.
		 * @since	2.16
		 **/
		public function dev_tool_links( $plugin_meta, $plugin_file ) {
			if ( plugin_basename( __FILE__ ) === $plugin_file ) {

				if ( pbs_is_dev() ) {
					$plugin_meta[] = sprintf( "<br><a href='%s' target='_blank'>%s</a>",
						plugins_url( '_design-element-cleanup.php', __FILE__ ),
						'[DEV TOOL] Pre-Designed Element HTML Cleaner'
					);
				}
			}
			return $plugin_meta;
		}


		/**
		 * Adds "Edit with PBS" links to posts, pages and CPTs.
		 * Will only add a link to viewable post types.
		 *
		 * @since 3.1
		 *
		 * @param array   $actions The list of links for this post.
		 * @param WP_Post $post The current post.
		 *
		 * @return array The list of links to display.
		 */
		public function add_pbs_edit_link( $actions, $post ) {
			$post_type_object = get_post_type_object( $post->post_type );
			$can_edit_post = current_user_can( 'edit_post', $post->ID );

			if ( is_post_type_viewable( $post_type_object ) ) {
				if ( in_array( $post->post_status, array( 'pending', 'draft', 'future' ), true ) ) {
					if ( $can_edit_post ) {
						$actions['edit_pbs'] = sprintf( '<a href="%s" title="%s" onclick="localStorage.setItem( \'pbs-open-%d\', \'1\' )">%s</a>',
							esc_url( get_preview_post_link( $post ) ),
							esc_attr__( 'Edit with Page Builder Sandwich', 'page-builder-sandwich' ),
							absint( $post->ID ),
							esc_html__( 'Edit with Page Builder Sandwich', 'page-builder-sandwich' )
						);
					}
				} elseif ( 'trash' !== $post->post_status ) {
					$actions['edit_pbs'] = sprintf( '<a href="%s" title="%s" onclick="localStorage.setItem( \'pbs-open-%d\', \'1\' )">%s</a>',
						esc_url( get_permalink( $post->ID ) ),
						esc_attr__( 'Edit with Page Builder Sandwich', 'page-builder-sandwich' ),
						absint( $post->ID ),
						esc_html__( 'Edit with Page Builder Sandwich', 'page-builder-sandwich' )
					);
				}
			}

			return $actions;
		}
	}

	new PageBuilderSandwichPlugin();
} // End if().
