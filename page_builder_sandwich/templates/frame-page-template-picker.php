<?php
/**
 * Template file for the page template picker modal popup.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

global $pbs_fs;

$button_class = 'pbs-disabled';
if ( ! PBS_IS_LITE && $pbs_fs->can_use_premium_code() ) {
	$button_class = '';
}
?>
<script type="text/html" id="tmpl-pbs-page-template-frame">
	<div class="media-frame-title">
		<h1></h1>
		<label>
			<input type="search" placeholder="<?php echo esc_attr( sprintf( __( 'Search for %s', 'page-builder-sandwich' ), __( 'Page Templates', 'page-builder-sandwich' ) ) ) ?>" class="search"/>
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
				<p>
					<?php esc_html_e( 'Page templates are a good starting point for your design. Choosing one will replace the contents of your page.', 'page-builder-sandwich' ) ?>
				</p>
			</div>
			<div class="media-toolbar-primary search-form">
				<button type="button" class="button button-primary media-button button-large <?php echo esc_attr( $button_class ) ?>"><?php esc_html_e( 'Replace Contents With Page Template', 'page-builder-sandwich' ) ?></button>
			</div>
		</div>
	</div>
</script>
