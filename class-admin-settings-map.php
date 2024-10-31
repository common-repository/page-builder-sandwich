<?php
/**
 * Display our map settings page.
 *
 * @since 4.4.5
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSAdminSettingsMap' ) ) {

	/**
	 * This is where all the admin page creation happens.
	 */
	class PBSAdminSettingsMap {

		/**
		 * Hook into WordPress.
		 */
		function __construct() {
			add_action( 'admin_init', array( $this, 'map_settings_init' ) );
			add_filter( 'pbs_localize_frontend_scripts', array( $this, 'localize_setting_params' ) );
		}


		/**
		 * Initialize our settings page.
		 *
		 * @since 3.4
		 */
		public function map_settings_init() {

		    // Register the lite settings section.
		    add_settings_section(
		        'pbs_map_section', // ID.
		        __( 'Map Settings', 'page-builder-sandwich' ), // Title.
				'__return_false', // Callback.
		        'pbs_options_group' // Group name.
		    );

		    // Register the premium flags field.
		    add_settings_field(
		        'pbs_map_api_key', // ID.
				__( 'Google Map API Key (Required)', 'page-builder-sandwich' ), // Title.
		        array( $this, 'pbs_map_api_key_field' ), // Callback
		        'pbs_options_group', // Group name.
		        'pbs_map_section', // Section.
		        array(
		            'name' => 'pbs_map_api_key',
		        ) // Args.
		    );
		}


		/**
		 * Creates the PBS admin setting for Google Map API key.
		 *
		 * @since 4.4.5
		 *
		 * @param array $args The arguments passed from add_settings_field.
		 */
		public function pbs_map_api_key_field( $args ) {
			$options = get_option( 'pbs_options' );
			$value = ! empty( $options ) ? $options[ $args['name'] ] : '';

		    ?>
			<label>
				<input name="pbs_options[<?php echo esc_attr( $args['name'] ); ?>]" type="text" value="<?php echo esc_attr( $value ) ?>" class="regular-text" placeholder="AbCdEfGhijKlMn-G12345678901234567890"/>
			</label>
			<p class="description">
				<?php esc_html_e( 'You will need a Google Javascript Map API key in order for the Map element to work. Due to recent changes with Google\'s Map APIs, you will now need to supply your own API key with billing enabled. You will need to enable Maps JavaScript API and Geocoding API for the map to fully work.', 'page-builder-sandwich' ) ?>
				<br>
				<?php printf( esc_html__( 'You can follow the instructions to %sget your API Key here%s.', 'page-builder-sandwich' ), '<a href="https://developers.google.com/maps/gmp-get-started" target="_blank">', '</a>' ) ?>
			</p>
		    <?php
		}


		/**
		 * Add some responsive settings in pbsParams.
		 * 
		 * @since 4.4.5
		 *
		 * @param array $params Localization params.
		 *
		 * @return array Modified localization params.
		 */
		public function localize_setting_params( $params ) {
			$options = get_option( 'pbs_options' );
			$params['map_api_key'] = isset( $options['pbs_map_api_key'] ) ? $options['pbs_map_api_key'] : '';
			return $params;
		}
	}
}

new PBSAdminSettingsMap();
