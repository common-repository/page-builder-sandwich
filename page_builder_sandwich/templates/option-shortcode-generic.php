<?php
/**
 * The generic shortcode text input inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-shortcode-generic-option">
	<div class="pbs-option-subtitle">{{ data.attr }}</div>
	<input type="text" id="{{ data.attr }}" value="{{ data.value }}">
</script>
<script type="text/html" id="tmpl-pbs-shortcode-generic-content">
	<div class="pbs-option-subtitle">{{ data.attr }}</div>
	<textarea id="{{ data.attr }}">{{{ data.value }}}</textarea>
</script>
