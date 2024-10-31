<?php
/**
 * Template file for the font picker modal popup.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

global $pbs_fs;
?>
<script type="text/html" id="tmpl-pbs-icon-frame">
	<div class="media-frame-title">
		<h1></h1>
		<label>
			<input type="search" placeholder="<?php echo esc_attr( sprintf( __( 'Search for %s', 'page-builder-sandwich' ), __( 'Icon', 'page-builder-sandwich' ) ) ) ?>" id="pbs-icon-search-input" class="search"/>
		</label>
	</div>
	<div class="media-frame-content pbs-search-list-frame">
		<div class="pbs-icon-display pbs-search-list">
			<div class="pbs-no-results"><?php esc_html_e( 'No matches found', 'page-builder-sandwich' ) ?></div>
		</div>
	</div>
	<div class="media-frame-toolbar">
		<div class="media-toolbar">
			<div class="media-toolbar-secondary">
				<?php if ( PBS_IS_LITE || ! $pbs_fs->can_use_premium_code() ) { ?>
					<p class="pbs-premium-flag">
						<?php printf( esc_html__( 'Only %sDashicons%s are available. Upgrading to Premium will unlock more icons, bullet & button icons and the ability to upload your own.', 'page-builder-sandwich' ),
							'<a href="https://developer.wordpress.org/resource/dashicons/" target="_blank">',
							'</a>'
						) ?>
					</p>
				<?php } else { ?>
					<p>
						<?php printf( esc_html__( 'You can upload your own icons by dropping an SVG file anywhere to upload it. You can find more info in the %sdocs%s', 'page-builder-sandwich' ),
							'<a href="http://docs.pagebuildersandwich.com/article/62-how-to-upload-your-own-icons" target="_blank">',
							'</a>'
						) ?>
					</p>
				<?php } ?>
			</div>
			<div class="media-toolbar-primary search-form">
				<button type="button" class="button button-primary media-button button-large">Use Selected Icon</button>
			</div>
		</div>
	</div>
</script>
