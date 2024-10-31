<?php
/**
 * Edit button in the block editor.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSMetaBoxGutenberg' ) ) {

	/**
	 * This is where all the meta box functionality happens.
	 */
	class PBSMetaBoxGutenberg {

		/**
		 * Hook into the backend.
		 */
		function __construct() {

			if ( ! function_exists( 'register_block_type' ) ) {
				return;
			}

            add_action( 'save_post', array( $this, 'note_saved_with_pbs' ) );
            add_action( 'admin_footer', array( $this, 'add_block_edit_button' ) );
			add_filter( 'pbs_localize_admin_scripts', array( $this, 'localize_admin_scripts' ) );
		}

		/**
		 * Add the JS params we need for the meta box to work.
		 *
		 * @since 2.9
		 *
		 * @param array $params Localization parameters.
		 *
		 * @return array The modified parameters.
		 */
		public function localize_admin_scripts( $params ) {

			$screen = get_current_screen();
			if ( 'post' !== $screen->base ) {
				return $params;
			}

            $params['is_editing'] = true;
            $params['is_last_saved_with_pbs'] = $this->is_last_saved_with_pbs();
			$params['meta_is_page'] = 'page' === $screen->id;
			$params['meta_not_saved'] = get_post_status() === 'auto-draft';
			$params['meta_permalink'] = apply_filters( 'pbs_meta_box_permalink', get_permalink() );

			global $post;
			if ( $post ) {
				$params['post_id'] = $post->ID;
			}
			return $params;
		}

		/**
		 * Adds a post meta when the post is saved using PBS. This is used to detect whether a page was
		 * last edited with PBS.
		 */
		public function note_saved_with_pbs( $post_id ) {
            if ( wp_is_post_revision( $post_id ) ) {
                return;
            }

            if ( ! empty( $_REQUEST ) && ! empty( $_REQUEST['action'] ) ) {
                if ( 'gambit_builder_save_content' === $_REQUEST['action'] ) {
                    update_post_meta( $post_id, 'pbs_last_saved_with_pbs', '1' );
                    return;
                }
            }
            delete_post_meta( $post_id, 'pbs_last_saved_with_pbs' );
        }
        
        public function is_last_saved_with_pbs( $post_id = null ) {
            if ( empty( $post_id ) ) {
                global $post;
				$post_id = $post->ID;
            }
            return !! get_post_meta( $post_id, 'pbs_last_saved_with_pbs', true );
        }

		public function add_block_edit_button() {
            $screen = get_current_screen();
			if ( 'post' !== $screen->base ) {
				return;
            }
            
			?>
			<script id="pbs-gutenberg-edit-button" type="text/html">
				<input value='<?php echo esc_attr( __( 'Edit with Page Builder Sandwich', 'page-builder-sandwich' ) ) ?>' type='button' id='pbs-admin-edit-with-pbs' class='button button-large'/>
            </script>
            
            <script id="pbs-gutenberg-panel" type="text/html">
                <div id="pbs-gutenberg-editor-overlay">
                    <p><?php esc_html_e( 'This post was edited using Page Builder Sandwich.', 'page-builder-sandwich' ) ?></p>
                    <a id="pbs-back-to-block-editor" class="button button-large" href="#"><?php esc_html_e( 'Edit with Block Editor', 'page-builder-sandwich' ) ?></a>
                </div>
            </script>
			<?php
		}
	}
}

new PBSMetaBoxGutenberg();
