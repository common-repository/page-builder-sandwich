<?php
/**
 * The image inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-image">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
	<# if ( ! data.value ) { #>
		<div class="pbs-image-preview" data-id="{{ data.value }}"></div>
	<# } else {
		var imageIDs = data.value.split( ',' );
		for ( var i = 0; i < imageIDs.length; i++ ) {
			#>
			<div class="pbs-image-preview" data-id="{{ imageIDs[ i ] }}">
				<div class="pbs-image-preview-remove"></div>
			</div>
			<#
		}
	} #>
</script>
