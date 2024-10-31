<?php
/**
 * Html Element class.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSElementHtml' ) ) {

	/**
	 * This is where all the html element functionality happens.
	 */
	class PBSElementHtml {

		/**
		 * Hook into WordPress.
		 */
		function __construct() {
			add_action( 'wp_footer', array( $this, 'add_html_frame_template' ) );
			add_filter( 'the_content', array( $this, 'fix_escaped_script_ampersands' ), 999 );
			add_filter( 'the_content', array( $this, 'render_original_saved_html' ), 999 );
		}


		/**
		 * Add the widget picker frame.
		 *
		 * @since 2.12
		 */
		public function add_html_frame_template() {
			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return;
			}

			include 'page_builder_sandwich/templates/frame-html-editor.php';
		}


		/**
		 * Ampersands inside <script> tags get escaped into special characters, undo that.
		 * This is safe to do with all script tags inside the content.
		 *
		 * @since 2.16
		 *
		 * @param string $content The post content.
		 *
		 * @return string The modified content.
		 */
		public function fix_escaped_script_ampersands( $content ) {
			return preg_replace_callback( '#(<script[^>]*>)(.*?)(</script>)#si', array( $this, 'replace_escaped_amps' ), $content );
		}


		/**
		 * Converts all &#038; from a string into an ampersand sign. To be used
		 * in conjunction with preg_replace_callback.
		 *
		 * @since 2.16
		 *
		 * @param array $matches The matching terms in preg_replace_callback.
		 *
		 * @return string The adjusted/replaced string.
		 */
		public function replace_escaped_amps( $matches ) {
			$content = $matches[2];
			$content = preg_replace( '/&#038;/', '&', $content );
			return $matches[1] . $content . $matches[3];
		}


		/**
		 * Re-placed the HTML in HTML elements so that the output is always
		 * refreshed and not cluttered. Also makes sure that the data-html
		 * attribute in the element always has a value.
		 *
		 * @since 4.3.2
		 *
		 * @param string $content The content.
		 *
		 * @return string The content with the fixed html embed.
		 */
		public function render_original_saved_html( $content ) {
			if ( ! class_exists( 'simple_html_dom' ) ) {
				require_once( 'page_builder_sandwich/inc/simple_html_dom.php' );
			}

			// Replace the contents with the data-html and replace it with the decoded html.
			$html = new simple_html_dom();
			$html->load( $content, true, false );

			$elements = $html->find( '[data-ce-tag="html"]' );
			for ( $i = count( $elements ) - 1; $i >= 0; $i-- ) {
				$element = $elements[ $i ];

				// This is the html that's encoded in base64.
				$custom_html = $element->{'data-html'};

				// If there's no data-html (< PBS 4.3.2), use the rendered HTML and encode it.
				if ( ! $custom_html ) {
					$custom_html = base64_encode( $element->innertext );
					if ( $custom_html ) {
						$element->{'data-html'} = $custom_html;
					}
				}

				// Use the original html data as the input for the html.
				$custom_html = base64_decode( $custom_html );
				$custom_html = apply_filters( 'pbs_rerender_custom_html', $custom_html );

				if ( $custom_html ) {
					$elements[ $i ]->innertext = $custom_html;
				}
			}
			$content = (string) $html;

			return apply_filters( 'pbs_render_original_saved_html', $content );
		}
	}
}

new PBSElementHtml();
