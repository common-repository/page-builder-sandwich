<?php
/**
 * The border inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-border">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
		<div class="pbs-color-preview" style="background: {{ data['border-color'] }};"></div>
		<select>
			<#
			var borders = {
				'none': '<?php esc_attr_e( 'None', 'page-builder-sandwich' ) ?>',
				'solid': '<?php esc_attr_e( 'Solid', 'page-builder-sandwich' ) ?>',
				'dashed': '<?php esc_attr_e( 'Dashed', 'page-builder-sandwich' ) ?>',
				'dotted': '<?php esc_attr_e( 'Dotted', 'page-builder-sandwich' ) ?>',
				'double': '<?php esc_attr_e( 'Double', 'page-builder-sandwich' ) ?>',
				'groove': '<?php esc_attr_e( 'Groove', 'page-builder-sandwich' ) ?>',
				'ridge': '<?php esc_attr_e( 'Ridge', 'page-builder-sandwich' ) ?>',
				'inset': '<?php esc_attr_e( 'Inset', 'page-builder-sandwich' ) ?>',
				'outset': '<?php esc_attr_e( 'Outset', 'page-builder-sandwich' ) ?>'
			};
			#>
			<# for ( var key in borders ) { #>
				<# if ( data['border-style'] === key ) { #>
					<option value="{{ key }}" selected="selected">{{ borders[ key ] }}</option>
				<# } else { #>
					<option value="{{ key }}">{{ borders[ key ] }}</option>
				<# } #>
			<# } #>
		</select>
		<label>Radius</label><input type="text" class="radius" value="{{ data['border-radius'] }}"/>
		<div class="pbs-color-popup">
			<input type="text" id="{{ data.id }}" value="{{ data['border-color'] }}"/>
		</div>
</script>
