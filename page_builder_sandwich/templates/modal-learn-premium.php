<?php
/**
 * Learn more about premium modal.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-learn-premium">
	<?php /* translators: Placeholders are for strong html tags. */ ?>
	<h2><?php printf( esc_html__( 'Do More With%1$sPage Builder Sandwich %2$sPremium%3$s', 'page-builder-sandwich' ), '<br><span>', '<strong>', '</strong></span>' ) ?></h2>
	<div class="pbs-learn-carousel">
		<div class="pbs-learn-slides">
			<div class="pbs-learn-slide" data-state="active">
				<img src="<?php echo esc_url( plugins_url( 'page_builder_sandwich/images/learn-premium-slide-1.jpg', PBS_FILE ) ) ?>"/>
				<h3><?php esc_html_e( 'Use 50+ Beautiful Templates', 'page-builder-sandwich' ) ?></h3>
				<p><?php esc_html_e( '10 Full Page Templates and 40+ Small Pre-Designed Templates', 'page-builder-sandwich' ) ?></p>
			</div>
			<div class="pbs-learn-slide">
				<img src="<?php echo esc_url( plugins_url( 'page_builder_sandwich/images/learn-premium-slide-2.jpg', PBS_FILE ) ) ?>"/>
				<h3><?php esc_html_e( 'Premium Elements', 'page-builder-sandwich' ) ?></h3>
				<p><?php esc_html_e( 'Buttons, Countdown, Carousels, Icon Labels, Newsletters, Toggle, More Icons, and Plenty More.', 'page-builder-sandwich' ) ?></p>
			</div>
			<div class="pbs-learn-slide">
				<img src="<?php echo esc_url( plugins_url( 'page_builder_sandwich/images/learn-premium-slide-3.jpg', PBS_FILE ) ) ?>"/>
				<h3><?php esc_html_e( 'More Styling Options', 'page-builder-sandwich' ) ?></h3>
				<p><?php esc_html_e( 'Sweet Animations, Fancy Shadows, Background Patterns, Tab Styles, and Plenty More.', 'page-builder-sandwich' ) ?></p>
			</div>
			<div class="pbs-learn-slide">
				<img src="<?php echo esc_url( plugins_url( 'page_builder_sandwich/images/learn-premium-slide-4.jpg', PBS_FILE ) ) ?>"/>
				<h3><?php esc_html_e( 'Advanced Shortcode Controls', 'page-builder-sandwich' ) ?></h3>
				<p><?php esc_html_e( 'Access Color Pickers, Number Sliders, Image Pickers, Boolean Toggles, and More for 600+ Mapped Shortcodes.', 'page-builder-sandwich' ) ?></p>
			</div>
			<div class="pbs-learn-slide">
				<img src="<?php echo esc_url( plugins_url( 'page_builder_sandwich/images/learn-premium-slide-5.jpg', PBS_FILE ) ) ?>"/>
				<h3><?php esc_html_e( 'Premium E-Mail Support', 'page-builder-sandwich' ) ?></h3>
				<p><?php esc_html_e( 'Got a Problem? Contact Us From Within the Plugin and We\'ll Help You Out!', 'page-builder-sandwich' ) ?></p>
			</div>
		</div>
		<div class="pbs-learn-indicators">
			<label data-state="active">
				<input class="pbs-learn-indicator" name="pbs-learn-indicator" data-slide="1" checked type="radio" />
			</label>
			<label>
				<input class="pbs-learn-indicator" name="pbs-learn-indicator" data-slide="2" type="radio" />
			</label>
			<label>
				<input class="pbs-learn-indicator" name="pbs-learn-indicator" data-slide="3" type="radio" />
			</label>
			<label>
				<input class="pbs-learn-indicator" name="pbs-learn-indicator" data-slide="4" type="radio" />
			</label>
			<label>
				<input class="pbs-learn-indicator" name="pbs-learn-indicator" data-slide="5" type="radio" />
			</label>
		</div>
	</div>
	<p class="pbs-learn-buy-button">
		<a href='<?php echo esc_url( admin_url( '/admin.php?page=page-builder-sandwich-pricing' ) ) ?>' class="pbs-buy-button" target="_buy"><?php esc_html_e( 'Buy Now, starts at $39', 'page-builder-sandwich' ) ?></a>
		<a href='http://demo.pagebuildersandwich.com/?pbs_iframe=1' class="pbs-trial-button" target="_buy"><?php esc_html_e( 'Try A Live Demo', 'page-builder-sandwich' ) ?></a>
	</p>
</script>
