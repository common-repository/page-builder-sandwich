<?php
/**
 * The note inspector option.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-option-note">
	<div class="pbs-option-subtitle">{{ data.name }}</div>
	<# if ( data.desc ) { #>
		<p class="pbs-description">{{{ data.desc }}}</p>
	<# } #>
</script>
