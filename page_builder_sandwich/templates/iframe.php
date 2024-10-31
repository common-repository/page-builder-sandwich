<?php
/**
 * The iframe template, this displays the site in a responsive wrapper.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title><?php esc_html_e( 'Page Builder Sandwich', 'page-builder-sandwich' ) . ' | ' . get_the_title(); ?></title>
	<?php

	// @codingStandardsIgnoreStart

	// Enqueue the stylesheet.
	?><link rel="stylesheet" href="<?php echo esc_url( add_query_arg( 'ver', VERSION_PAGE_BUILDER_SANDWICH, plugins_url( 'page_builder_sandwich/css/iframe.css', PBS_FILE ) ) ) ?>" type="text/css" media="all"><?php

	// Enqueue the script.
	$js_dir = defined( 'WP_DEBUG' ) && WP_DEBUG ? 'dev' : 'min';
	$js_suffix = defined( 'WP_DEBUG' ) && WP_DEBUG ? '' : '-min';

	?><script async type="text/javascript" src="<?php echo esc_url( add_query_arg( 'ver', VERSION_PAGE_BUILDER_SANDWICH, plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/iframe' . $js_suffix . '.js', PBS_FILE ) ) ) ?>"></script><?php

	// @codingStandardsIgnoreEnd

	do_action( 'pbs_iframe_header' );
	?>
</head>
<body class="pbs-iframe" data-scroll="0">
	<div id="pbs-iframe-controls">
		<div class="pbs-buttons">
			<div class="pbs-go-responsive" data-type="desktop">100%</div>
			<div class="pbs-go-responsive" data-type="tablet">768px</div>
			<div class="pbs-go-responsive" data-type="phone">360px</div>
		</div>
		<div class="pbs-iframe-note"><?php esc_html_e( 'You are in responsive view mode with limited editing capabilities. Some of your changes will only apply to smaller screens.', 'page-builder-sandwich' ) ?> <a href="#">Learn more</a></div>
		<div class="pbs-save">
			<div class="pbs-buttons">
				<div class="pbs-hide-elements"><?php esc_html_e( 'Toggle hidden elements', 'page-builder-sandwich' ) ?></div>
			</div>
		</div>
	</div>
	<div id="pbs-iframe-wrapper">
		<div id="pbs-iframe-responsive-wrapper">
			<?php
			// To be filled up by Javascript.
			?>
			<iframe src="" frameborder="0"></iframe>
		</div>
	</div>
	<?php

	do_action( 'pbs_iframe_footer' );

	?>
</body>
</html>
