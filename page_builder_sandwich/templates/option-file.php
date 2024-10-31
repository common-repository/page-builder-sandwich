<?php
/**
 * The file inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-file">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<#
	var placeholder = 'http://';
	if ( data.placeholder ) {
		placeholder = data.placeholder;
	}
	#>
	<div class="pbs-option-horizontal-layout">
		<input type="text" value="{{ data.value }}" placeholder="{{ placeholder }}"/>
		<button><?php esc_html_e( 'Upload', 'page-builder-sandwich' ) ?></button>
	</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>
