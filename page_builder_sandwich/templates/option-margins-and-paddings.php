<?php
/**
 * The margins & paddings inspector option.
 *
 * @package Page Builder Sandwich
 *
 * @deprecated
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-margins-and-paddings">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<div class='pbs-option-margins-and-paddings'>
		<div class='pbs-option-row-margin'>
			<span><?php esc_html_e( 'Margin', 'page-builder-sandwich' ) ?></span>
			<input type="text" value="{{ data['margin-top'] }}" data-style="margin-top"/>
			<# if ( data.disableHorizontalMargins ) { #>
				<input type="text" value="{{ data['margin-right'] }}" data-style="margin-right" disabled="disabled"/>
			<# } else { #>
				<input type="text" value="{{ data['margin-right'] }}" data-style="margin-right"/>
			<# } #>
			<input type="text" value="{{ data['margin-bottom'] }}" data-style="margin-bottom"/>
			<# if ( data.disableHorizontalMargins ) { #>
				<input type="text" value="{{ data['margin-left'] }}" data-style="margin-left" disabled="disabled"/>
			<# } else { #>
				<input type="text" value="{{ data['margin-left'] }}" data-style="margin-left"/>
			<# } #>
		</div>
		<div class='pbs-option-row-border'>
			<span><?php esc_html_e( 'Border', 'page-builder-sandwich' ) ?></span>
			<input type="text" value="{{ data['border-top-width'] }}" data-style="border-top-width"/>
			<input type="text" value="{{ data['border-right-width'] }}" data-style="border-right-width"/>
			<input type="text" value="{{ data['border-bottom-width'] }}" data-style="border-bottom-width"/>
			<input type="text" value="{{ data['border-left-width'] }}" data-style="border-left-width"/>
		</div>
		<div class='pbs-option-row-padding'>
			<span><?php esc_html_e( 'Padding', 'page-builder-sandwich' ) ?></span>
			<input type="text" value="{{ data['padding-top'] }}" data-style="padding-top"/>
			<# if ( data.disableHorizontalPaddings ) { #>
				<input type="text" value="{{ data['padding-right'] }}" data-style="padding-right" disabled="disabled"/>
			<# } else { #>
				<input type="text" value="{{ data['padding-right'] }}" data-style="padding-right"/>
			<# } #>
			<input type="text" value="{{ data['padding-bottom'] }}" data-style="padding-bottom"/>
			<# if ( data.disableHorizontalPaddings ) { #>
				<input type="text" value="{{ data['padding-left'] }}" data-style="padding-left" disabled="disabled"/>
			<# } else { #>
				<input type="text" value="{{ data['padding-left'] }}" data-style="padding-left"/>
			<# } #>
		</div>
	</div>
</script>
