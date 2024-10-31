<?php
/**
 * Learn more about premium modal.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-learn-premium-elements">
	<?php /* translators: Placeholders are for strong html tags. */ ?>
	<h2><?php printf( esc_html__( 'Hey, Yellow Tags Are %1$1sPremium Features!%2$2s', 'page-builder-sandwich' ), '<br><strong>', '</strong>' ) ?></h2>
	<p class="pbs-learn-desc"><?php esc_html_e( 'Consider going premium to get access to more awesome premium elements, formatting tools and inspector properties.', 'page-builder-sandwich' ) ?></p>
	<p class="pbs-learn-buy-button">
		<a href='<?php echo esc_url( admin_url( '/admin.php?page=page-builder-sandwich-pricing' ) ) ?>' class="pbs-buy-button" target="_buy"><?php esc_html_e( 'Buy now, starts at $39', 'page-builder-sandwich' ) ?></a>
		<a href='http://demo.pagebuildersandwich.com/?pbs_iframe=1' class="pbs-trial-button" target="_buy"><?php esc_html_e( 'Try premium version demo', 'page-builder-sandwich' ) ?></a>
		<a href='#' class="pbs-flags-button" style="display:none;">
			<span class="pbs-flags-off-label"><?php //esc_html_e( 'Hide premium features', 'page-builder-sandwich' ) ?></span>
			<span class="pbs-flags-on-label"><?php //esc_html_e( 'Show premium features', 'page-builder-sandwich' ) ?></span>
		</a>
	</p>
</script>
