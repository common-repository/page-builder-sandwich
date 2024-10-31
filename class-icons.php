<?php
/**
 * Icon support for Page Builder Sandwich
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSIcons' ) ) {

	/**
	 * This is where all the icon functionality happens.
	 */
	class PBSIcons {


		/**
		 * SVG HTML tags that we allow in TinyMCE.
		 *
		 * @var string
		 */
		public $allowed_svg_tags_tinymce = 'symbol[id|viewBox|viewbox],a[class|clip-path|clip-rule|fill|fill-opacity|fill-rule|filter|id|mask|opacity|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|target|transform|href|xlink:href|xlink:title],circle[class|clip-path|clip-rule|cx|cy|fill|fill-opacity|fill-rule|filter|id|mask|opacity|r|requiredFeatures|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|transform],clipPath[class|clipPathUnits|id],defs,ellipse[class|clip-path|clip-rule|cx|cy|fill|fill-opacity|fill-rule|filter|id|mask|opacity|requiredFeatures|rx|ry|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|transform],feGaussianBlur[class|color-interpolation-filters|id|requiredFeatures|stdDeviation],filter[class|color-interpolation-filters|filterRes|filterUnits|height|id|primitiveUnits|requiredFeatures|width|x|xlink:href|y],foreignObject[class|font-size|height|id|opacity|requiredFeatures|style|transform|width|x|y],g[class|clip-path|clip-rule|id|display|fill|fill-opacity|fill-rule|filter|mask|opacity|requiredFeatures|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|transform|font-family|font-size|font-style|font-weight|text-anchor],image[class|clip-path|clip-rule|filter|height|id|mask|opacity|requiredFeatures|style|systemLanguage|transform|width|x|xlink:href|xlink:title|y],line[class|clip-path|clip-rule|fill|fill-opacity|fill-rule|filter|id|marker-end|marker-mid|marker-start|mask|opacity|requiredFeatures|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|transform|x1|x2|y1|y2],linearGradient[class|id|gradientTransform|gradientUnits|requiredFeatures|spreadMethod|systemLanguage|x1|x2|xlink:href|y1|y2],marker[id|class|markerHeight|markerUnits|markerWidth|orient|preserveAspectRatio|refX|refY|systemLanguage|viewBox],mask[class|height|id|maskContentUnits|maskUnits|width|x|y],metadata[class|id],path[class|clip-path|clip-rule|d|fill|fill-opacity|fill-rule|filter|id|marker-end|marker-mid|marker-start|mask|opacity|requiredFeatures|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|transform],pattern[class|height|id|patternContentUnits|patternTransform|patternUnits|requiredFeatures|style|systemLanguage|viewBox|width|x|xlink:href|y],polygon[class|clip-path|clip-rule|id|fill|fill-opacity|fill-rule|filter|id|class|marker-end|marker-mid|marker-start|mask|opacity|points|requiredFeatures|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|transform],polyline[class|clip-path|clip-rule|id|fill|fill-opacity|fill-rule|filter|marker-end|marker-mid|marker-start|mask|opacity|points|requiredFeatures|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|transform],radialGradient[class|cx|cy|fx|fy|gradientTransform|gradientUnits|id|r|requiredFeatures|spreadMethod|systemLanguage|xlink:href],rect[class|clip-path|clip-rule|fill|fill-opacity|fill-rule|filter|height|id|mask|opacity|requiredFeatures|rx|ry|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|transform|width|x|y],stop[class|id|offset|requiredFeatures|stop-color|stop-opacity|style|systemLanguage],switch[class|id|requiredFeatures|systemLanguage],text[class|clip-path|clip-rule|fill|fill-opacity|fill-rule|filter|font-family|font-size|font-style|font-weight|id|mask|opacity|requiredFeatures|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|text-anchor|transform|x|xml:space|y],textPath[class|id|method|requiredFeatures|spacing|startOffset|style|systemLanguage|transform|xlink:href],tspan[class|clip-path|clip-rule|dx|dy|fill|fill-opacity|fill-rule|filter|font-family|font-size|font-style|font-weight|id|mask|opacity|requiredFeatures|rotate|stroke|stroke-dasharray|stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|stroke-width|style|systemLanguage|text-anchor|textLength|transform|x|xml:space|y]';


		/**
		 * SVG HTML tags that we allow for sanitization.
		 *
		 * @var array
		 */
		public static $allowed_svg_tags = array(
			'svg' => array(
				'xmlns' => array(),
				'viewBox' => array(),
				'viewbox' => array(),
				'x' => array(),
				'y' => array(),
			),
			'symbol' => array(
				'id' => array(),
				'viewBox' => array(),
				'viewbox' => array(),
			),
			'a' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'id' => array(),
				'mask' => array(),
				'opacity' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
				'target' => array(),
				'href' => array(),
				'xlink:href' => array(),
				'xlink:title' => array(),
			),
			'circle' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'cx' => array(),
				'cy' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'id' => array(),
				'mask' => array(),
				'opacity' => array(),
				'r' => array(),
				'requiredFeatures' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
			),

			'clipPath' => array(
				'class' => array(),
				'clipPathUnits' => array(),
				'id' => array(),
			),

			'defs' => array(),

			'ellipse' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'cx' => array(),
				'cy' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'id' => array(),
				'mask' => array(),
				'opacity' => array(),
				'requiredFeatures' => array(),
				'rx' => array(),
				'ry' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
			),

			'feGaussianBlur' => array(
				'class' => array(),
				'color-interpolation-filters' => array(),
				'id' => array(),
				'requiredFeatures' => array(),
				'stdDeviation' => array(),
			),

			'filter' => array(
				'class' => array(),
				'color-interpolation-filters' => array(),
				'filterRes' => array(),
				'filterUnits' => array(),
				'height' => array(),
				'id' => array(),
				'primitiveUnits' => array(),
				'requiredFeatures' => array(),
				'width' => array(),
				'x' => array(),
				'xlink:href' => array(),
				'y' => array(),
			),

			'foreignObject' => array(
				'class' => array(),
				'font-size' => array(),
				'height' => array(),
				'id' => array(),
				'opacity' => array(),
				'requiredFeatures' => array(),
				'style' => array(),
				'transform' => array(),
				'width' => array(),
				'x' => array(),
				'y' => array(),
			),

			'g' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'id' => array(),
				'display' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'mask' => array(),
				'opacity' => array(),
				'requiredFeatures' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
				'font-family' => array(),
				'font-size' => array(),
				'font-style' => array(),
				'font-weight' => array(),
				'text-anchor' => array(),
			),

			'image' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'filter' => array(),
				'height' => array(),
				'id' => array(),
				'mask' => array(),
				'opacity' => array(),
				'requiredFeatures' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
				'width' => array(),
				'x' => array(),
				'xlink:href' => array(),
				'xlink:title' => array(),
				'y' => array(),
			),

			'line' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'id' => array(),
				'marker-end' => array(),
				'marker-mid' => array(),
				'marker-start' => array(),
				'mask' => array(),
				'opacity' => array(),
				'requiredFeatures' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
				'x1' => array(),
				'x2' => array(),
				'y1' => array(),
				'y2' => array(),
			),

			'linearGradient' => array(
				'class' => array(),
				'id' => array(),
				'gradientTransform' => array(),
				'gradientUnits' => array(),
				'requiredFeatures' => array(),
				'spreadMethod' => array(),
				'systemLanguage' => array(),
				'x1' => array(),
				'x2' => array(),
				'xlink:href' => array(),
				'y1' => array(),
				'y2' => array(),
			),

			'marker' => array(
				'id' => array(),
				'class' => array(),
				'markerHeight' => array(),
				'markerUnits' => array(),
				'markerWidth' => array(),
				'orient' => array(),
				'preserveAspectRatio' => array(),
				'refX' => array(),
				'refY' => array(),
				'systemLanguage' => array(),
				'viewBox' => array(),
			),

			'mask' => array(
				'class' => array(),
				'height' => array(),
				'id' => array(),
				'maskContentUnits' => array(),
				'maskUnits' => array(),
				'width' => array(),
				'x' => array(),
				'y' => array(),
			),

			'metadata' => array(
				'class' => array(),
				'id' => array(),
			),

			'path' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'd' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'id' => array(),
				'marker-end' => array(),
				'marker-mid' => array(),
				'marker-start' => array(),
				'mask' => array(),
				'opacity' => array(),
				'requiredFeatures' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
			),

			'pattern' => array(
				'class' => array(),
				'height' => array(),
				'id' => array(),
				'patternContentUnits' => array(),
				'patternTransform' => array(),
				'patternUnits' => array(),
				'requiredFeatures' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'viewBox' => array(),
				'width' => array(),
				'x' => array(),
				'xlink:href' => array(),
				'y' => array(),
			),

			'polygon' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'id' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'id' => array(),
				'class' => array(),
				'marker-end' => array(),
				'marker-mid' => array(),
				'marker-start' => array(),
				'mask' => array(),
				'opacity' => array(),
				'points' => array(),
				'requiredFeatures' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
			),

			'polyline' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'id' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'marker-end' => array(),
				'marker-mid' => array(),
				'marker-start' => array(),
				'mask' => array(),
				'opacity' => array(),
				'points' => array(),
				'requiredFeatures' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
			),

			'radialGradient' => array(
				'class' => array(),
				'cx' => array(),
				'cy' => array(),
				'fx' => array(),
				'fy' => array(),
				'gradientTransform' => array(),
				'gradientUnits' => array(),
				'id' => array(),
				'r' => array(),
				'requiredFeatures' => array(),
				'spreadMethod' => array(),
				'systemLanguage' => array(),
				'xlink:href' => array(),
			),

			'rect' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'height' => array(),
				'id' => array(),
				'mask' => array(),
				'opacity' => array(),
				'requiredFeatures' => array(),
				'rx' => array(),
				'ry' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
				'width' => array(),
				'x' => array(),
				'y' => array(),
			),

			'stop' => array(
				'class' => array(),
				'id' => array(),
				'offset' => array(),
				'requiredFeatures' => array(),
				'stop-color' => array(),
				'stop-opacity' => array(),
				'style' => array(),
				'systemLanguage' => array(),
			),

			'switch' => array(
				'class' => array(),
				'id' => array(),
				'requiredFeatures' => array(),
				'systemLanguage' => array(),
			),

			'text' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'font-family' => array(),
				'font-size' => array(),
				'font-style' => array(),
				'font-weight' => array(),
				'id' => array(),
				'mask' => array(),
				'opacity' => array(),
				'requiredFeatures' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'text-anchor' => array(),
				'transform' => array(),
				'x' => array(),
				'xml:space' => array(),
				'y' => array(),
			),

			'textPath' => array(
				'class' => array(),
				'id' => array(),
				'method' => array(),
				'requiredFeatures' => array(),
				'spacing' => array(),
				'startOffset' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'transform' => array(),
				'xlink:href' => array(),
			),

			'title' => array(),
			'tspan' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'dx' => array(),
				'dy' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'font-family' => array(),
				'font-size' => array(),
				'font-style' => array(),
				'font-weight' => array(),
				'id' => array(),
				'mask' => array(),
				'opacity' => array(),
				'requiredFeatures' => array(),
				'rotate' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'systemLanguage' => array(),
				'text-anchor' => array(),
				'textLength' => array(),
				'transform' => array(),
				'x' => array(),
				'xml:space' => array(),
				'y' => array(),
			),

			'use' => array(
				'class' => array(),
				'clip-path' => array(),
				'clip-rule' => array(),
				'fill' => array(),
				'fill-opacity' => array(),
				'fill-rule' => array(),
				'filter' => array(),
				'height' => array(),
				'id' => array(),
				'mask' => array(),
				'stroke' => array(),
				'stroke-dasharray' => array(),
				'stroke-dashoffset' => array(),
				'stroke-linecap' => array(),
				'stroke-linejoin' => array(),
				'stroke-miterlimit' => array(),
				'stroke-opacity' => array(),
				'stroke-width' => array(),
				'style' => array(),
				'transform' => array(),
				'width' => array(),
				'x' => array(),
				'xlink:href' => array(),
				'y' => array(),
			),

		);

		/**
		 * Hook into the frontend.
		 *
		 * @since 2.9
		 */
		function __construct() {
			add_filter( 'the_content', array( $this, 'prepend_icon_data' ), 11 );
			add_filter( 'tiny_mce_before_init', array( $this, 'allow_svgs_in_tinymce' ), 20 );
			add_filter( 'teeny_mce_before_init', array( $this, 'allow_svgs_in_tinymce' ), 20 );
			add_action( 'wp_ajax_pbs_icon_search', array( $this, 'search_icon' ) );
			add_filter( 'pbs_localize_scripts', array( $this, 'localize_scripts' ) );
			add_action( 'wp_footer', array( $this, 'add_builder_templates' ) );
		}

		/**
		 * Adds the icon dictionary at the start of the content.
		 *
		 * @since 2.9
		 *
		 * @param string $content The page/post content.
		 *
		 * @return string The modified content.
		 */
		public function prepend_icon_data( $content ) {
			global $post;

			if ( empty( $post ) ) {
				return $content;
			}

			if ( ! get_post_meta( $post->ID, 'pbs_icons' ) ) {
				return $content;
			}

			$icon_html = wp_kses( get_post_meta( $post->ID, 'pbs_icons', true ), self::$allowed_svg_tags );
			$icon_html = str_replace( '<svg', '<svg style="display: none" id="pbs-icons-' . esc_attr( $post->ID ) . '"', $icon_html );

			return apply_filters( 'pbs_prepend_icon_data', $icon_html . $content );
		}


		/**
		 * We are adding svgs & other related tags not allowed in TinyMCE. Allow them in TinyMCE.
		 *
		 * @since 2.9
		 *
		 * @param array $init TinyMCE init parameters.
		 *
		 * @return array The modified TinyMCE init parameters.
		 */
		public function allow_svgs_in_tinymce( $init ) {
			if ( ! empty( $init['extended_valid_elements'] ) ) {
				$init['extended_valid_elements'] .= ',';
			} else {
				$init['extended_valid_elements'] = '';
			}
			$init['extended_valid_elements'] .= 'svg[*],use[*],' . $this->allowed_svg_tags_tinymce;

		    return apply_filters( 'pbs_allow_svgs_in_tinymce', $init );
		}


		/**
		 * Add the modal frame for the icon picker.
		 *
		 * @since 2.9
		 */
		public function add_builder_templates() {
			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return;
			}
			include 'page_builder_sandwich/templates/frame-icon-picker.php';
		}


		/**
		 * Add required JS parameters to our script.
		 *
		 * @since 2.9
		 *
		 * @param array $params The localization parameters.
		 *
		 * @return array The modified localization parameters.
		 */
		public function localize_scripts( $params ) {

			// Used for grouping icons.
			$params['icon_groups'] = array(
				__( 'Uploaded Icons', 'page-builder-sandwich' ) => '^0 ',
				sprintf( __( '%1$sCinema Icons%1$s by %1$sIcons8%1$s', 'page-builder-sandwich' ), '<a href="https://icons8.com/web-app/category/Cinema" target="_blank">', '</a>', '<a href="https://icons8.com/" target="_blank">', '</a>' ) => '^cinema ',
				sprintf( __( '%1$sDashicons%1$s', 'page-builder-sandwich' ), '<a href="https://developer.wordpress.org/resource/dashicons/" target="_blank">', '</a>' ) => '^dashicons ',
				sprintf( __( '%1$sFont Awesome%1$s', 'page-builder-sandwich' ), '<a href="https://fortawesome.github.io/Font-Awesome/" target="_blank">', '</a>' ) => '^font awesome ',
				sprintf( __( '%1$sGenericons%1$s by %1$sAutomattic%1$s', 'page-builder-sandwich' ), '<a href="http://genericons.com/" target="_blank">', '</a>', '<a href="https://automattic.com/" target="_blank">', '</a>' ) => '^genericons ',
				sprintf( __( '%1$sKameleon%1$s by %1$sWebalys - Get more icons%1$s', 'page-builder-sandwich' ), '<a href="https://getdpd.com/cart/hoplink/20951?referrer=213bgg49o90gog" target="_blank">', '</a>', '<a href="https://getdpd.com/cart/hoplink/20951?referrer=213bgg49o90gog" target="_blank">', '</a>' ) => '^kameleon ',
				sprintf( __( '%1$sNucleo%1$s by %1$sNucleoApp - Get more icons%1$s', 'page-builder-sandwich' ), '<a href="https://nucleoapp.com/?ref=bfintal" target="_blank">', '</a>', '<a href="https://nucleoapp.com/?ref=bfintal" target="_blank">', '</a>' ) => '^nucleo ',
				sprintf( __( '%1$sStreamline%1$s by %1$sWebalys - Get more icons%1$s', 'page-builder-sandwich' ), '<a href="https://getdpd.com/cart/hoplink/12244?referrer=213bgg49o90gog" target="_blank">', '</a>', '<a href="https://getdpd.com/cart/hoplink/12244?referrer=213bgg49o90gog" target="_blank">', '</a>' ) => '^streamline ',
				sprintf( __( 'Icons by %1$sTaras Shypka%1$s', 'page-builder-sandwich' ), '<a href="https://dribbble.com/Bugsster" target="_blank">', '</a>' ) => '^taras shypka ',
			);
			return $params;
		}


		/**
		 * Ajax icon search handler. Echo out the search results as a JSON string.
		 *
		 * @since 2.9
		 */
		public function search_icon() {
			if ( empty( $_POST['nonce'] ) ) { // Input var: okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var: okay.
			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}
			if ( empty( $_POST['s'] ) ) { // Input var: okay.
				die();
			}
			$s = strtolower( trim( sanitize_text_field( wp_unslash( $_POST['s'] ) ) ) ); // Input var: okay.

			include 'class-icons-helper.php';
			$all_icons = pbs_icons();

			$keys = preg_grep( '|' . preg_quote( $s ) . '|', array_keys( $all_icons ) );
			$matched_icons = array_slice( array_intersect_key( $all_icons, array_flip( $keys ) ), 0, 500 );

			// Check if we have a match in the saved SVGs.
			$saved_svg_data = get_option( 'pbs_uploaded_svg' );
			if ( ! empty( $saved_svg_data ) ) {
				if ( is_serialized( $saved_svg_data ) ) {
					$saved_svg_data = unserialize( $saved_svg_data );

					$keys = preg_grep( '|' . preg_quote( $s ) . '|', array_keys( $saved_svg_data ) );
					$matched_saved_icons = array_intersect_key( $saved_svg_data, array_flip( $keys ) );

					foreach ( $matched_saved_icons as $saved_name => $saved_svg ) {
						$matched_icons[ '0 uploaded ' . $saved_name ] = $saved_svg;
					}
				}
			}

			ksort( $matched_icons );
			$matched_icons = apply_filters( 'pbs_search_icon', $matched_icons );

			echo wp_json_encode( $matched_icons );
			die();
		}
	}
}

new PBSIcons();
