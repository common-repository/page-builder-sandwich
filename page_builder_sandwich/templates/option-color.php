<?php
/**
 * The color inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-color">
	<# if ( typeof data.name !== 'undefined' ) { #>
		<div class="pbs-option-horizontal-layout">
	<# } #>
	<# if ( typeof data.name !== 'undefined' ) { #>
		<div class="pbs-option-subtitle">{{ data.name }}</div>
	<# } #>
	<div class="pbs-color-preview">
		<div class="pbs-color-preview-color" style="background: {{ data.value }};"></div>
		<div class="pbs-color-transparent-bg"></div>
	</div>
	<# if ( typeof data.name !== 'undefined' ) { #>
		</div>
	<# } #>
	<div class="pbs-color-popup">
		<input type="text" id="{{ data.id }}" value="{{ data.value }}"/>
	</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>
