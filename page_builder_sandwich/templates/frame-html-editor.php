<?php
/**
 * Template file for the widget picker modal popup.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-html-frame">
	<div class="media-frame-title">
		<h1></h1>
	</div>
	<div class="media-frame-content">
		<textarea></textarea>
	</div>
	<div class="media-frame-toolbar">
		<div class="media-toolbar">
			<div class="media-toolbar-secondary">
				<p>
					<?php esc_html_e( 'Paste your HTML above.', 'page-builder-sandwich' ) ?>
				</p>
			</div>
			<div class="media-toolbar-primary search-form">
				<button type="button" class="button button-primary media-button button-large">Insert HTML</button>
			</div>
		</div>
	</div>
</script>
