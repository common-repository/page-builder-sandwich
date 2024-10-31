<?php
/**
 * The various dummy options to display to lite users in the inspector.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-dummy-option-text">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<input type="text" disabled="disabled"/>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>

<script type="text/html" id="tmpl-pbs-dummy-option-color">
	<div class="pbs-option-horizontal-layout">
		<div class="pbs-option-subtitle">{{ data.name }}</div>
		<div class="pbs-color-preview" style="background: {{ data.value }};"></div>
	</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>

<script type="text/html" id="tmpl-pbs-dummy-option-number">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<div class="pbs-option-horizontal-layout">
		<div class="pbs-option-number-slider">
			<span class="ui-slider-handle ui-state-default ui-corner-all" tabindex="0" style="left: 0%;"></span>
		</div>
		<input type="number" disabled="disabled"/>
		<# if ( data.unit ) { #>
			<span class="pbs-option-number-unit">{{{ data.unit }}}</span>
		<# } #>
	</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>

<script type="text/html" id="tmpl-pbs-dummy-option-select">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<select disabled="disabled">
		<option value="" selected="selected">— <?php esc_attr_e( 'Select one', 'page-builder-sandwich' ) ?> —</option>
	</select>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>

<script type="text/html" id="tmpl-pbs-dummy-option-checkbox">
	<div class="pbs-option-horizontal-layout pbs-checkbox">
		<div class="pbs-option-subtitle">{{ data.name }}</div>
		<input type="checkbox" value="1"/>
		<label></label>
	</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>

<script type="text/html" id="tmpl-pbs-dummy-option-button2">
	<div class="pbs-option-horizontal-layout">
		<div class="pbs-option-subtitle">{{ data.name }}</div>
		<input type="button" value="{{ data.button }}"/>
	</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>

<script type="text/html" id="tmpl-pbs-dummy-option-image">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
	<div class="pbs-image-preview" data-id=""></div>
</script>

<script type="text/html" id="tmpl-pbs-dummy-option-textarea">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<textarea></textarea>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>

<script type="text/html" id="tmpl-pbs-dummy-option-file">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<input type="text" disabled="disabled"/>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>
