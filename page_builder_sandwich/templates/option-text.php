<?php
/**
 * The text inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-text">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<#
	var placeholder = '';
	if ( data.placeholder ) {
		placeholder = data.placeholder;
	}
	#>
	<input type="text" value="{{ data.value }}" placeholder="{{ placeholder }}"/>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# }

	if ( typeof data.type_orig !== 'undefined' && typeof data.type !== 'undefined' && data.type_orig.toLowerCase() !== data.type.toLowerCase() && data.first_of_type ) { #>
		<# if ( data.type_orig === 'image' || data.type_orig === 'images' ) { #>
			<p class="pbs-description-sc-map-premium pbs-premium-flag">
			<?php esc_html_e( 'Heads up! You can also pick images from the media manager and get access to more controls with our Premium Version.', 'page-builder-sandwich' ) ?>
			</p>
		<# } else if ( data.type_orig === 'color' ) { #>
			<p class="pbs-description-sc-map-premium pbs-premium-flag">
			<?php esc_html_e( 'You can also access a nifty color picker with our Premium Version.', 'page-builder-sandwich' ) ?>
			</p>
		<# } else if ( data.type_orig === 'number' ) { #>
			<p class="pbs-description-sc-map-premium pbs-premium-flag">
			<?php esc_html_e( 'The Premium Version comes with a neat number slider.', 'page-builder-sandwich' ) ?>
			</p>
		<# } else if ( data.type_orig === 'boolean' ) { #>
			<p class="pbs-description-sc-map-premium pbs-premium-flag">
			<?php esc_html_e( 'The Premium Version allows you to use switches to easily turn on and off settings.', 'page-builder-sandwich' ) ?>
			</p>
		<# } else if ( data.type_orig === 'multicheck' ) { #>
			<p class="pbs-description-sc-map-premium pbs-premium-flag">
			<?php esc_html_e( 'Get the Premium Version to use grouped checkboxes, and get access to more controls.', 'page-builder-sandwich' ) ?>
			</p>
		<# } else if ( data.type_orig === 'multicheck_post_type' ) { #>
			<p class="pbs-description-sc-map-premium pbs-premium-flag">
			<?php esc_html_e( 'You get to use post type checkboxes with the Premium Version.', 'page-builder-sandwich' ) ?>
			</p>
		<# } else if ( data.type_orig === 'dropdown_post_type' ) { #>
			<p class="pbs-description-sc-map-premium pbs-premium-flag">
			<?php esc_html_e( 'Get the Premium Version to use post type dropdowns, and get access to more controls.', 'page-builder-sandwich' ) ?>
			</p>
		<# } else if ( data.type_orig === 'dropdown_post' ) { #>
			<p class="pbs-description-sc-map-premium pbs-premium-flag">
			<?php esc_html_e( 'The Premium Version will allow you to use post / CPT dropdowns, and get access to more controls.', 'page-builder-sandwich' ) ?>
			</p>
		<# } #>
		</p>
	<# } #>
</script>
