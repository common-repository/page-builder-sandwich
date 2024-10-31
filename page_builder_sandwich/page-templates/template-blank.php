<?php
/**
 * Blank Template
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?><!DOCTYPE html>
<html <?php language_attributes(); ?> class="no-js">
	<head>
		<meta charset="<?php bloginfo( 'charset' ); ?>">
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<?php if ( ! current_theme_supports( 'title-tag' ) ) : ?>
		<title><?php echo wp_get_document_title(); ?></title>
		<?php endif; ?>
		<?php wp_head(); ?>
	</head>
	<body <?php body_class(); ?>>
		<div class="entry-content">
			<?php

			while ( have_posts() ) : the_post();
				the_content();
			endwhile;

			wp_footer();
			?>
		</div>
	</body>
</html>
