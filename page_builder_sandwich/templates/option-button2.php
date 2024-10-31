<?php
/**
 * The button2 inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-button2">
	<div class="pbs-option-horizontal-layout">
		<div class="pbs-option-subtitle">{{ data.name }}</div>
		<# var c = ! data.class ? 'default' : data.class; #>
		<input type="button" value="{{ data.button }}" class="pbs-option-button-{{ c }}"/>
	</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>
