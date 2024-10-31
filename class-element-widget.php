<?php
/**
 * Widget Element class.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSElementWidget' ) ) {

	/**
	 * This is where all the widget element functionality happens.
	 */
	class PBSElementWidget {

		/**
		 * Holds the list of widgets available in WordPress.
		 * Only contains some information about the widgets.
		 *
		 * @var array
		 */
		public static $widget_slugs = array();

		/**
		 * Hook into WordPress.
		 */
		function __construct() {
			add_filter( 'pbs_localize_scripts', array( $this, 'add_widget_list' ) );
			add_action( 'wp_footer', array( $this, 'add_picker_frame_template' ) );
			add_action( 'wp_ajax_pbs_get_widget_templates', array( $this, 'get_widget_templates' ) );

			// When a menu has been added/changed/deleted, refresh the widgets
			// so that widgets that use menus e.g. custom menu get updated.
			add_action( 'wp_update_nav_menu', array( $this, 'menu_was_updated' ) );
			add_action( 'wp_create_nav_menu', array( $this, 'menu_was_updated' ) );
			add_action( 'created_nav_menu', array( $this, 'menu_was_updated' ) );
			add_action( 'wp_delete_nav_menu', array( $this, 'menu_was_updated' ) );
			add_action( 'wp_update_nav_menu_item', array( $this, 'menu_was_updated' ) );

			// Tell JS to refresh our widget settings in the editor. This is used
			// when the page redirected and we couldn't refresh it right away.
			if ( get_transient( 'pbs_widget_force_update' ) ) {
				add_action( 'wp_footer', array( $this, 'refresh_widgets' ) );
				add_action( 'admin_footer', array( $this, 'refresh_widgets' ) );
			}
		}


		/**
		 * Gather all the widgets available in WordPress.
		 *
		 * @since 2.11
		 *
		 * @return array a list of all widgets found.
		 */
		public static function gather_all_widgets() {
			if ( empty( self::$widget_slugs ) ) {
				global $wp_widget_factory;
				foreach ( $wp_widget_factory->widgets as $widget_slug => $widget_data ) {

					try {
						$widget_class = get_class( $widget_data );
						$widget_instance = new $widget_class( $widget_data->id_base, $widget_data->name, $widget_data->widget_options );
					} catch ( Exception $e ) { // PHP < 7 Error handling.
						// Do nothing.
						continue;
					} catch ( Error $e ) { // PHP 7 Error handling.
						// Do nothing.
						continue;
					}

					// Sometimes descriptions do not work.
					$description = '';
					if ( ! empty( $widget_data->widget_options['description'] ) ) {
						$description = $widget_data->widget_options['description'];
					}

					self::$widget_slugs[ $widget_slug ] = array(
						'name' => $widget_data->name,
						'description' => $description,
						'id_base' => $widget_data->control_options['id_base'],
					);
				}
			}

			return self::$widget_slugs;
		}


		/**
		 * Add the list of available widgets for JS.
		 *
		 * @since 2.11
		 *
		 * @param array $params Localization parameters.
		 *
		 * @return array The modified parameters.
		 */
		public function add_widget_list( $params ) {
			$params['widget_list'] = self::gather_all_widgets();
			$params['widget_list_hash'] = md5( serialize( self::gather_all_widgets() ) );
			return $params;
		}


		/**
		 * Echo templates for rendering widget settings. We need to do this in an
		 * ajax handler since some widgets enqueue scripts and we cannot
		 * dequeue them afterwards. We can safely get only the form elements
		 * with ajax.
		 *
		 * @since 2.11.2
		 *
		 * @see _pbs-widget-templates.js
		 */
		public function get_widget_templates() {
			if ( empty( $_POST['nonce'] ) ) { // Input var okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var okay.
			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}

			$all_widgets = self::gather_all_widgets();

			global $wp_widget_factory;
			foreach ( $all_widgets as $widget_slug => $widget_info ) {
				$factory_instance = $wp_widget_factory->widgets[ $widget_slug ];
				$widget_class = get_class( $factory_instance );
				$widget_instance = new $widget_class( $factory_instance->id_base, $factory_instance->name, $factory_instance->widget_options );

				ob_start();
				$widget_instance->form( array() );
				$form = ob_get_clean();

				// Strip all harmful scripts.
				$form = preg_replace( '/<script[^>]*>[\s\S]*?<\/script>/', '', $form );

				?>
				<script type="text/html" id="tmpl-pbs-widget-<?php echo esc_attr( $widget_slug ) ?>">
					<?php
					echo $form; // WPCS: XSS ok.
					?>
				</script>
				<?php

			}

			die();
		}


		/**
		 * Add the widget picker frame.
		 *
		 * @since 2.11
		 */
		public function add_picker_frame_template() {
			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return;
			}

			include 'page_builder_sandwich/templates/frame-widget-picker.php';
		}


		/**
		 * Called when a menu (nav_menu) gets updated/created/deleted.
		 * This prompts PBS to refresh the settings of widgets in the editor.
		 *
		 * @since 3.3
		 *
		 * @param int $menu_id The ID of the menu.
		 */
		public function menu_was_updated( $menu_id ) {

			// We set a transient here so that we can also prompt PBS when
			// the the admin page is redirected.
			set_transient( 'pbs_widget_force_update', '1', HOUR_IN_SECONDS );

			add_action( 'wp_footer', array( $this, 'refresh_widgets' ) );
			add_action( 'admin_footer', array( $this, 'refresh_widgets' ) );
		}


		/**
		 * Tell JS to refresh our widget settings in the editor.
		 *
		 * @since 3.3
		 */
		public function refresh_widgets() {
			delete_transient( 'pbs_widget_force_update' );
			?>
			<script>
			localStorage.removeItem( 'pbs_get_widget_templates_hash' );
			</script>
			<?php
		}
	}
}

new PBSElementWidget();


/**
 * Some plugins may declare widget classes with unique class structures (some with
 * type hinting also), these may produce unwanted errors and may just cause the
 * frontend to error out and stop working.
 *
 * This function handles those specific errors and prevents the error from
 * stalling the page.
 *
 * @since 2.16
 *
 * @param int    $errno The error number thrown.
 * @param string $errstr The error message.
 * @param string $errfile The file that generated the error.
 * @param int    $errline The line in $errfile that threw the error.
 *
 * @throws ErrorException If the exception is specific to this script.
 *
 * @return boolean True whether we handled the error ourselves, false otherwise.
 */
function pbs_widget_catchable_error_handler( $errno, $errstr, $errfile, $errline ) {
	if ( E_RECOVERABLE_ERROR === $errno && stripos( $errstr, 'class-element-widget.php' ) ) {
		throw new ErrorException( $errstr, $errno, 0, $errfile, $errline );
	}
	return false;
}
set_error_handler( 'pbs_widget_catchable_error_handler' );
