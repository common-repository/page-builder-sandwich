/* globals ContentTools, pbsNewsletterParams */

window.pbsInitAllNewsletters = function() {
	var newsletters = document.querySelectorAll( '[data-ce-tag="newsletter"]' );
	Array.prototype.forEach.call( newsletters, function( el ) {
		window.pbsNewsletterClearMessage( el );
		el.querySelector( 'input' ).addEventListener( 'keyup', function( ev ) {
			if ( ! ev.target.parentNode.classList.contains( 'pbs-show-on-typed' ) ) {
				return;
			}
			if ( '' !== ev.target.value.trim() ) {
				ev.target.parentNode.classList.add( 'pbs-typed' );
			}
		} );
		el.querySelector( '.pbs-button' ).addEventListener( 'click', function( ev ) {

			// Disable the field.
			var container = ev.target.parentNode;
			var input = container.querySelector( 'input' );
			var email = input.value.trim();
			var payload, xhr;

			if ( input.getAttribute( 'disabled', 'disabled' ) ) {
				return;
			}

			input.setAttribute( 'disabled', 'disabled' );

			window.pbsNewsletterClearMessage( container );

			// Simple email verify.
			if ( ! email.match( /\S+@\S+/ ) ) {
				window.pbsNewsletterShowMessage( container, 'Invalid email address.', true );
				input.removeAttribute( 'disabled' );
				input.focus();
				ev.preventDefault();
				return false;
			}

		    // Collect the contents of each region into a FormData instance
		    payload = new FormData();
			payload.append( 'action', 'pbs_newsletter_subscribe' );
			payload.append( 'nonce', pbsNewsletterParams.nonce );
			payload.append( 'post_id', pbsNewsletterParams.post_id );
			payload.append( 'email', email );
			payload.append( 'newsletter_id', ev.target.parentNode.getAttribute( 'id' ) );

		    xhr = new XMLHttpRequest();

			xhr.onload = function() {
				var message;
				if ( xhr.status >= 200 && xhr.status < 400 ) {
					if ( ! xhr.responseText ) {
						message = 'Thank you for subscribing!';
						if ( container.getAttribute( 'data-success-message' ) ) {
							message = container.getAttribute( 'data-success-message' );
						}
						window.pbsNewsletterShowMessage( container, message, false );
						container.classList.add( 'pbs-success' );
					} else {
						window.pbsNewsletterShowMessage( container, xhr.responseText, true );
						input.focus();
					}
				} else {
					window.pbsNewsletterShowMessage( container, 'Something went wrong. Please contact the administrator.', true );
					input.focus();
				}
				input.removeAttribute( 'disabled' );
			};

		    xhr.open( 'POST', pbsNewsletterParams.ajax_url );
		    xhr.send( payload );

			ev.preventDefault();
			return false;
		} );
	} );
};

window.pbsNewsletterShowMessage = function( container, message, isError ) {
	var notice = document.createElement( 'span' );
	notice.classList.add( 'pbs-newsletter-notice' );
	notice.innerHTML = message;
	container.appendChild( notice );
	container.classList.remove( 'pbs-notice-success' );
	if ( ! isError ) {
		container.classList.add( 'pbs-notice-success' );
	} else {
		setTimeout( function() {
			container.classList.add( 'pbs-has-notice' );
		}, 1 );
	}
};
window.pbsNewsletterClearMessage = function( container ) {
	var notice = container.querySelector( '.pbs-newsletter-notice' );
	if ( notice ) {
		notice.parentNode.removeChild( notice );
	}
	container.classList.remove( 'pbs-success' );
	container.classList.remove( 'pbs-has-notice' );
	container.classList.remove( 'pbs-notice-success' );
};
window.pbsNewsletterResetTypes = function() {
	var newsletters = document.querySelectorAll( '[data-ce-tag="newsletter"].pbs-typed' );
	Array.prototype.forEach.call( newsletters, function( el ) {
		el.classList.remove( 'pbs-typed' );
	} );
};

( function() {
	var ready = function() {

		var editor;

		// Initialize newsletters on start up.
		window.pbsInitAllNewsletters();

		// Update the newsletter when the PBS editor stops.
		if ( 'undefined' !== typeof ContentTools ) {
			editor = ContentTools.EditorApp.get();
			editor.bind( 'stop', function() {
				window.pbsInitAllNewsletters();
				window.pbsNewsletterResetTypes();
			} );

			editor.bind( 'start', function() {
				var newsletters = document.querySelectorAll( '[data-ce-tag="newsletter"]' );
				Array.prototype.forEach.call( newsletters, function( el ) {
					window.pbsNewsletterClearMessage( el );
				} );
				window.pbsNewsletterResetTypes();
			} );
		}
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();
