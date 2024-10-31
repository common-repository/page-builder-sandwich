<?php
/**
 * Blank Page Template
 *
 * @package Page Builder Sandwich
 *
 * Inspired by https://github.com/wpexplorer/page-templater
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSBlankPageTemplate' ) ) {

	/**
	 * Page templates class.
	 */
	class PBSBlankPageTemplate {


		/**
		 * Hook into WordPress.
		 *
		 * @since 4.3
		 *
		 * @return void
		 */
		function __construct() {

			// Add our blank template.
			add_action( 'wp_loaded', array( $this, 'add_template' ), 10, 999 );

			// Add a filter to the save post to inject out template into the page cache.
			add_filter( 'wp_insert_post_data', array( $this, 'register_project_templates' ) );

			// Add a filter to the template include to determine if the page has our
			// template assigned and return it's path.
			add_filter( 'template_include', array( $this, 'view_project_template' ) );

			// Add your templates to this array.
			$this->templates = array(
				'page_builder_sandwich/page-templates/template-blank.php' => __( 'Blank Template', 'page-builder-sandwich' ),
			);
		}


		/**
		 * Adds our page template.
		 */
		public function add_template() {

			// Add a filter to the attributes metabox to inject template into the cache.
			if ( version_compare( floatval( get_bloginfo( 'version' ) ), '4.7', '<' ) ) {

				// 4.6 and older.
				add_filter( 'page_attributes_dropdown_pages_args', array( $this, 'register_project_templates' ) );
			} else {

				// Add a filter to the wp 4.7 version attributes metabox.
				$post_types = get_post_types();
				foreach ( $post_types as $post_type ) {
					if ( post_type_supports( $post_type, 'editor' ) ) {
						add_filter( 'theme_' . $post_type . '_templates', array( $this, 'add_new_template' ) );
					}
				}
			}
		}


		/**
		 * Adds our template to the page template dropdown for v4.7+.
		 *
		 * @param array $posts_templates The current page templates.
		 *
		 * @return array The modified page templates.
		 */
		public function add_new_template( $posts_templates ) {
			$posts_templates = array_merge( $posts_templates, $this->templates );
			return $posts_templates;
		}


		/**
		 * Adds our template to the pages cache in order to trick WordPress
		 * into thinking the template file exists where it doens't really exist.
		 *
		 * @param array $atts The page attributes.
		 *
		 * @return array The modified page attributes.
		 */
		public function register_project_templates( $atts ) {

			// Create the key used for the themes cache.
			$cache_key = 'page_templates-' . md5( get_raw_theme_root( get_stylesheet() ) . '/' . get_stylesheet() );

			// Retrieve the cache list.
			// If it doesn't exist, or it's empty prepare an array.
			$templates = wp_get_theme()->get_page_templates();
			if ( empty( $templates ) ) {
				$templates = array();
			}

			// New cache, therefore remove the old one.
			wp_cache_delete( $cache_key , 'themes' );

			// Now add our template to the list of templates by merging our templates
			// with the existing templates array from the cache.
			$templates = array_merge( $templates, $this->templates );

			// Add the modified cache to allow WordPress to pick it up for listing
			// available templates.
			wp_cache_add( $cache_key, $templates, 'themes', 1800 );

			return $atts;
		}

		/**
		 * Checks if the template is assigned to the page
		 *
		 * @param string $template The current page template name.
		 *
		 * @return string The page template to use.
		 */
		public function view_project_template( $template ) {

			// Return template if post is empty.
			global $post;
			if ( ! $post ) {
				return $template;
			}
			
			if ( ! is_single() ) {
				return $template;
			}

			// Return default template if we don't have a custom one defined.
			$blank_template = get_post_meta( $post->ID, '_wp_page_template', true );
			if ( empty( $this->templates[ $blank_template ] ) ) {
				return $template;
			}
			$file = plugin_dir_path( __FILE__ ) . $blank_template;

			// Just to be safe, we check if the file exist first.
			if ( file_exists( $file ) ) {

				global $content_width;
				$content_width = 1170;

				return $file;
			} else {
				echo $file; // @codingStandardsIgnoreLine
			}

			return $template;
		}
	}
}

new PBSBlankPageTemplate();
