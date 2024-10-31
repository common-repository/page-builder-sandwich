<?php
/**
 * Title editing functionality.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSTitle' ) ) {

	/**
	 * This is where all the title editing functionality happens.
	 */
	class PBSTitle {


		/**
		 * Holds whether we're done with the header.
		 *
		 * @var boolean
		 */
		public $done_with_header = false;


		/**
		 * Holds whether we're done with the footer.
		 *
		 * @var boolean
		 */
		public $done_with_footer = false;


		/**
		 * Hook into WordPress.
		 */
		function __construct() {
			add_action( 'the_title', array( $this, 'add_title_markers' ), 11, 2 );

			add_action( 'wp_head', array( $this, 'done_with_header' ) );
			add_action( 'wp_footer', array( $this, 'done_with_footer' ) );

			add_filter( 'pbs_save_content_data', array( $this, 'save_title' ), 10, 3 );
		}


		/**
		 * Note when we've finished doing the header of the page.
		 */
		public function done_with_header() {
			$this->done_with_header = true;
		}


		/**
		 * Note when we've finished doing the footer of the page.
		 */
		public function done_with_footer() {
			$this->done_with_footer = true;
		}


		/**
		 * Add markers around the title
		 *
		 * @since 3.3
		 *
		 * @param string $title The title.
		 * @param int    $post_id The post id.
		 */
		public function add_title_markers( $title, $post_id = null ) {

			// Allow others to disable this feature.
			if ( ! apply_filters( 'pbs_title_editing', true ) ) {
				return $title;
			}

			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return $title;
			}
			global $post;
			if ( empty( $post_id ) ) {
				return $title;
			}

			// Check if we're in our main post.
			if ( empty( PageBuilderSandwich::$main_post_id ) ) {
				return $title;
			}

			// Check if we're in our main post.
			if ( PageBuilderSandwich::$main_post_id !== $post_id ) {
				return $title;
			}

			// Check if we're in our main post.
			if ( ! is_main_query() ) {
				return $title;
			}
			if ( ! $this->done_with_header || $this->done_with_footer ) {
				return $title;
			}
			return $title . '<span data-pbs-title-marker-post-id="' . esc_attr( $post_id ) . '"></span>';
		}


		/**
		 * Add the title to the post being saved.
		 *
		 * @since 3.3
		 *
		 * @param array $post_data The post data to be saved.
		 * @param array $data The incoming post data.
		 * @param int   $post_id The post id.
		 *
		 * @return array The post data to be saved.
		 */
		public function save_title( $post_data, $data, $post_id ) {
			if ( ! empty( $data['title'] ) ) { // Input var: okay.
				$title = sanitize_post_field( 'post_title', wp_unslash( $data['title'] ), $post_id, 'db' );

				$post_data['post_title'] = $title;
			}
			return $post_data;
		}
	}
} // End if().

new PBSTitle();
