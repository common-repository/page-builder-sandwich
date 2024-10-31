<?php
/**
 * The link inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-link">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<div class="pbs-option-horizontal-layout">
		<#
		var placeholder = '';
		if ( data.placeholder ) {
			placeholder = data.placeholder;
		}
		var value = value;
		if ( 'object' === typeof data.value ) {
			value = data.value.url;
		}
		#>
		<input type="text" value="{{ value }}" placeholder="{{ placeholder }}"/>
		<# var c = ! data.class ? 'default' : data.class; #>
		<input type="button" value="{{ data.button ? data.button : '<?php esc_attr_e( 'Select Link', 'page-builder-sandwich' ) ?>' }}" class="pbs-option-button-{{ c }}"/>
	</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>
