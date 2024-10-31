<?php
/**
 * Template file for the shortcode picker modal popup.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

global $pbs_fs;
?>
<script type="text/html" id="tmpl-pbs-shortcode-frame">
	<div class="media-frame-title">
		<h1></h1>
		<label>
			<input type="search" placeholder="<?php echo esc_attr( sprintf( __( 'Search for %s', 'page-builder-sandwich' ), __( 'Shortcode', 'page-builder-sandwich' ) ) ) ?>" id="pbs-icon-search-input" class="search"/>
		</label>
	</div>
	<div class="media-frame-content pbs-search-list-frame">
		<div class="pbs-search-list">
			<div class="pbs-no-results"><?php esc_html_e( 'No matches found', 'page-builder-sandwich' ) ?></div>
		</div>
	</div>
	<div class="media-frame-toolbar">
		<div class="media-toolbar">
			<div class="media-toolbar-secondary">
				<p>
					<?php
					$total_label = esc_html__( 'hundreds of plugins', 'page-builder-sandwich' );
					if ( get_option( 'pbs_shortcode_mapped_plugins_total' ) ) {
						$total_label = sprintf( esc_html__( '%s plugins', 'page-builder-sandwich' ), number_format( intval( get_option( 'pbs_shortcode_mapped_plugins_total' ) ) ) );
					}
					$total_sc_label = esc_html__( 'hundreds of shortcodes', 'page-builder-sandwich' );
					if ( get_option( 'pbs_shortcode_mapped_shortcodes_total' ) ) {
						$total_sc_label = sprintf( esc_html__( '%s shortcodes', 'page-builder-sandwich' ), number_format( intval( get_option( 'pbs_shortcode_mapped_shortcodes_total' ) ) ) );
					}

					esc_html_e( 'Tip: You can also type in shortcodes directly in the content.', 'page-builder-sandwich' );
					echo '<br><strong>';
					printf( esc_html__( 'Fun fact: There are a total of %s and %s in our shortcode mapping database.', 'page-builder-sandwich' ), $total_label, $total_sc_label ); // WPCS: XSS ok.
					echo '</strong>';
					?>

					<br>
					<a href="#" class="pbs-refresh-mappings"><?php esc_html_e( 'Click here to refresh shortcode mappings from the database', 'page-builder-sandwich' ) ?></a>
				</p>
			</div>
			<div class="media-toolbar-primary search-form">
				<button type="button" class="button button-primary media-button button-large"><?php esc_html_e( 'Insert Selected Shortcode', 'page-builder-sandwich' ) ?></button>
			</div>
		</div>
	</div>
</script>
