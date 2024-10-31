<?php
/**
 * Template file for the pre-designed section picker modal popup.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-predesigned-frame">
	<div class="media-frame-title">
		<h1></h1>
		<label>
			<input type="search" placeholder="<?php echo esc_attr( sprintf( __( 'Search for %s', 'page-builder-sandwich' ), __( 'Pre-Designed Sections', 'page-builder-sandwich' ) ) ) ?>" class="search"/>
		</label>
	</div>
	<div class="media-frame-content pbs-search-list-frame">
		<div class="pbs-search-list">
			<div class="pbs-no-results"><?php esc_html_e( 'No matches found', 'page-builder-sandwich' ) ?></div>
		</div>
		<?php
		?>
	</div>
	<div class="media-frame-toolbar">
		<div class="media-toolbar">
			<div class="media-toolbar-secondary">
			</div>
			<div class="media-toolbar-primary search-form">
				<button type="button" class="button button-primary media-button button-large"><?php esc_html_e( 'Insert Design', 'page-builder-sandwich' ) ?></button>
			</div>
		</div>
	</div>
</script>
