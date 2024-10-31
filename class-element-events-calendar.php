<?php
/**
 * Events Calendar element.
 *
 * @since 4.0
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSElementEventsCalendar' ) ) {

	/**
	 * This is where all the Events Calendar functionality happens.
	 */
	class PBSElementEventsCalendar {

		/**
		 * Hook into the frontend.
		 */
		function __construct() {
			add_filter( 'pbs_localize_scripts', array( $this, 'localize_scripts' ) );
		}


		/**
		 *
		 * Check if Events Calendar plugin is activated.
		 *
		 * Get first events id.
		 *
		 * @param array $params Localization params.
		 *
		 * @return array Modified localization params.
		 */
		public function localize_scripts( $params ) {

			if ( class_exists( 'Tribe__Events__Main' ) ) {
				$params['has_events_calendar'] = 'has_events_calendar';
				$events = tribe_get_events();
				if ( ! empty( $events ) ) {
					$params['events_calendar'] = $events[0]->ID;
				}
			}
			return $params;
		}
	}
}

new PBSElementEventsCalendar();
