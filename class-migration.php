<?php
/**
 * Migrate content written using the OLD PBS to the new PBS.
 * This is mostly columns using the old method.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSMigration' ) ) {

	/**
	 * This is where all the migration functionality happens.
	 */
	class PBSMigration {

		/**
		 * The number of pages found to have OLD PBS content.
		 *
		 * @var	int
		 */
		public $page_count = 0;


		/**
		 * Hook into the admin.
		 */
		function __construct() {
			add_action( 'admin_init', array( $this, 'check_old_version' ) );
			add_action( 'wp_ajax_pbs_migrate', array( $this, 'ajax_do_migrate' ) );
		}


		/**
		 * Decides whether we should display a migration notice.
		 */
		public function check_old_version() {
			if ( get_option( 'pbs_no_migration_notice' ) ) {
				return;
			}
			global $wpdb;

			$count = $wpdb->get_var( "SELECT count(*) FROM $wpdb->posts WHERE post_type != 'revision' AND post_content LIKE '%<table%pbsandwich_column%'" ); // Db call ok; no-cache ok.
			$count = (int) $count;
			$this->page_count = $count;

			if ( ! $count ) {
				update_option( 'pbs_no_migration_notice', 'none' );
				return;
			}

			add_action( 'admin_notices', array( $this, 'show_migration_notice' ) );
			add_action( 'admin_head', array( $this, 'add_migration_script' ) );
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_ajax' ) );
		}


		/**
		 * Enqueues wp.ajax, needed for migration.
		 */
		public function enqueue_ajax() {
			wp_enqueue_script( 'wp-util' );
		}


		/**
		 * Display the migration notice.
		 *
		 * @see admin_notices
		 */
		public function show_migration_notice() {
			?>
			<div class="update-nag notice pbs-migration-notice">
				<h4><?php esc_html_e( 'Page Builder Sandwich Important Update Notice', 'page-builder-sandwich' ) ?></h4>
			    <p>
					<?php esc_html_e( 'Page Builder Sandwich has been completely re-written and is now <strong>a frontend page builder</strong>! Your content will need to be migrated to the new system for it to work correctly.', 'page-builder-sandwich' ) ?>
					<em><?php
						printf(
							esc_html__( 'This migration process will adjust the old column structure into the new one on %d affected post(s)/page(s). Make sure to back up your site data first before proceeding.', 'page-builder-sandwich' ),
							absint( $this->page_count )
						);
					?></em>
					<br><br>
					<a class="button"><?php esc_html_e( 'Start the migration process', 'page-builder-sandwich' ) ?></a>
				</p>
			</div>
			<?php
		}


		/**
		 * Print the script used by the migration notice for sending ajax commands.
		 *
		 * @see	admin_head
		 */
		public function add_migration_script() {
			$nonce = wp_create_nonce( 'pbs' );
			?>
			<script>
			jQuery(document).on( 'click', '.pbs-migration-notice .button', function() {
				/* globals alert */

				wp.ajax.send( 'pbs_migrate', {
					success: function(data) {
						alert( data.success + ' posts/pages succussfully migrated!' );
						document.querySelector('.pbs-migration-notice').remove();
					},
				    error: function(data) {
						alert( data.failed + ' out of ' + ( data.failed + data.success ) + ' posts/pages could not be migrated.' );
					},
				    data: {
						nonce: '<?php esc_attr_e( $nonce ); ?>'
				    }
				  });

			});
			</script>
			<?php
		}


		/**
		 * The ajax handler for the migrate button.
		 */
		public function ajax_do_migrate() {
			if ( empty( $_POST['nonce'] ) ) { // Input var okay.
				wp_send_json_error();
			}
			if ( ! wp_verify_nonce( sanitize_key( $_POST['nonce'] ), 'pbs' ) ) { // Input var okay.
				wp_send_json_error();
			}

			$this->migrate();
		}


		/**
		 * Performs the actual migration. This just updates the contents of posts that are found
		 * to have OLD PBS columns and converts them to the newer syntax.
		 */
		public function migrate() {
			if ( get_option( 'pbs_no_migration_notice' ) ) {
				return;
			}

			global $wpdb;
			$success = 0;
			$failed = 0;

			$rows = $wpdb->get_results( "SELECT * FROM $wpdb->posts WHERE post_type != 'revision' AND post_content LIKE '%<table%pbsandwich_column%'" ); // Db call ok; no-cache ok.
			if ( ! $rows ) {
				return;
			}

			if ( ! class_exists( 'simple_html_dom' ) ) {
				require_once( 'page_builder_sandwich/inc/simple_html_dom.php' );
			}

			foreach ( $rows as $post ) {
				$content = $post->post_content;

				// Load the HMTL.
				$html = new simple_html_dom();

				// Replace OLD column system.
				$html->load( $content, false, false );
				$old_rows = $html->find( 'table.pbsandwich_column' );
				foreach ( $old_rows as $old_row ) {
					$old_columns = $old_row->find( 'tr', 0 )->children();
					$new_columns = '';
					foreach ( $old_columns as $old_column ) {
						$content = trim( $old_column->innertext );
						if ( ! preg_match( '/^\s*\<p/', $content ) ) {
							$content = '<p>' . $content . '</p>';
						}
						$content = preg_replace( "/\r?\n\r?\n\r?/", '</p><p>', $content );
						$new_columns .= '<div class="pbs-col">' . $content . '</div>';
					}
					$old_row->outertext = '<div class="pbs-row">' . $new_columns . '</div>';
				}
				$content = (string) $html;

				// Remove stray ui-sortable classes that the OLD PBS used.
				$html->load( $content, false, false );
				$stray_ui_handles = $html->find( '[class*="ui-sortable"]' );
				foreach ( $stray_ui_handles as $stray_ui_handle ) {
					$class = preg_replace( '/ui-sortable(-\w+)?/', '', $stray_ui_handle->class );
					$class = trim( preg_replace( '/\s+/', ' ', $class ) );
					if ( ! $class ) {
						$class = null;
					}
					$stray_ui_handle->class = $class;
				}
				$content = (string) $html;

				// Replace OLD PBS_BUTTON shortcodes.
				$content = preg_replace_callback( '/\[pbs_button[^\]]*\]/', array( $this, 'convert_pbs_button_to_link' ), $content );

				// Update the content.
				$post_id = wp_update_post( array(
					'ID' => $post->ID,
					'post_content' => $content,
				) );

				if ( is_wp_error( $post_id ) ) {
					$failed++;
				} else {
					$success++;
				}
			}

			if ( $failed ) {
				wp_send_json_error( array(
					'success' => $success,
				 	'failed' => $failed,
				) );
			} else {

				// Hide the migration notice!
				update_option( 'pbs_no_migration_notice', 'none' );

				wp_send_json_success( array(
					'success' => $success,
				 	'failed' => $failed,
				) );
			}
		}


		/**
		 * Converts a [pbs_button] shortcode found by preg_replace_callback
		 * into the new non-shortcode format.
		 *
		 * @param array $match The matches found by preg_replace_callback.
		 */
		public function convert_pbs_button_to_link( $match ) {
			$shortcode = $match[0];
			$atts = shortcode_parse_atts( $shortcode );

			return sprintf( '<p%s><a href="%s" class="pbs-button"%s>%s</a></p>',
				! empty( $atts['align'] ) ? ' style="text-align: ' . esc_attr( $atts['align'] ) . '"' : '',
				! empty( $atts['url'] ) ? esc_url( $atts['url'] ) : '',
				! empty( $atts['target'] ) && 'true' === $atts['target'] ? ' target="_blank"' : '',
				! empty( $atts['label'] ) ? $atts['label'] : ''
			);
		}
	}

}
