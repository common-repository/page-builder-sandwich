<?php
/**
 * The number inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-number">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<div class="pbs-option-horizontal-layout">
		<div class="pbs-option-number-slider"></div>
		<input type="number" value="{{ data.value }}" min="{{ data.min || 0 }}" max="{{ data.max || 1000 }}" step="{{ data.step || 1 }}"/>
		<# if ( data.unit ) { #>
			<span class="pbs-option-number-unit">{{{ data.unit }}}</span>
		<# } #>
	</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>
