<?php
/**
 * Frame admin class.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSFrameAdmin' ) ) {

	/**
	 * This is where the admin gets modified for iframe use.
	 */
	class PBSFrameAdmin {


		/**
		 * Hook into WordPress.
		 */
		function __construct() {
			add_action( 'admin_footer', array( $this, 'add_iframe_script' ), 0 );
		}


		/**
		 * Add the iframe script.
		 */
		public function add_iframe_script() {

			// Sidebar admin toggler.
			?><div id="pbs-admin-menu-toggler"></div><?php

			// Sidebar toggle overlay.
			?><div id="pbs-admin-menu-toggler-overlay"></div><?php

			?>
			<script>
			// Make sure we're inside an iframe.
			if ( sessionStorage.getItem( 'pbs_in_admin_iframe' ) && window.location !== window.parent.location ) {

				// Remove NextGEN's script because it causes errors.
				window.Frame_Event_Publisher = {
					broadcast: function() {}
				};

				// Since we are in an iframe, if possible, move over the title of the admin page
				// into the modal window.
				if ( document.querySelector('h1') ) {
					if ( document.querySelector('h1').childNodes ) {
						window.parent.document.querySelector( '.pbs-admin-modal .media-frame-title h1' ).innerHTML = document.querySelector('h1').childNodes[0].textContent;
						document.querySelector('h1').childNodes[0].textContent = '';
					}
				}

				// Menu toggler.
				jQuery( document ).ready( function( $ ) {

					// Identify that we are in an iframe.
					document.body.classList.add( 'pbs-admin-in-frame' );

					$( '#pbs-admin-menu-toggler, #pbs-admin-menu-toggler-overlay' ).click( function() {
						$( 'body' ).toggleClass( 'pbs-show-admin-menu' );
					} );
				} );
			}
			</script>
			<?php
		}
	}
}

new PBSFrameAdmin();
