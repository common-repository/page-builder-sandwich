<?php
/**
 * The checkbox inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-checkbox">
	<# var checked = data.value === data.checked ? 'checked' : ''; #>
	<# var id = window.PBSEditor.generateHash(); #>
	<div class="pbs-option-horizontal-layout">
		<div class="pbs-option-subtitle">{{ data.name }}</div>
		<input id="pbs-checkbox-{{ id }}" type="checkbox" value="1" {{ checked }} />
		<label for="pbs-checkbox-{{ id }}"></label>
	</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>
