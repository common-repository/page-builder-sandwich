/**
 * Main script for the iframe template.
 */

var ready = function() {

	var iframe, url;

	// Responsive buttons.
	document.body.addEventListener( 'click', function( ev ) {
		ev.preventDefault();
		if ( ev.target.classList.contains( 'pbs-go-responsive' ) ) {
			window.pbsGoResponsive( ev.target.getAttribute( 'data-type' ) );
		}
	} );

	// While the iframe is still loading, show the loading background.
	iframe = document.querySelector( 'iframe' );
	iframe.addEventListener( 'load', function() {
		document.body.classList.add( 'pbs-iframe-loaded' );
	} );

	// If the iframe loads too long, just show the iframe.
	setTimeout( function() {
		document.body.classList.add( 'pbs-iframe-loaded' );
	}, 5000 );

	// Take note of the scroll position of the iframe wrapper.
	// This is mostly for aesthetics to make the note fade in/out.
	document.querySelector( '#pbs-iframe-wrapper' ).addEventListener( 'scroll', function( ev ) {
		document.body.setAttribute( 'data-scroll', ev.target.scrollTop );
	} );

	// Add the iframe'd source url to the iframe.
	url = window.location.toString().replace( /[&\?]?pbs_iframe(=\d)?/g, '' );
	iframe.setAttribute( 'src', url );
	iframe.focus();

	// Help button to show "responsive" articles.
	document.querySelector( '.pbs-iframe-note a' ).addEventListener( 'click', function( ev ) {
		ev.preventDefault();
		window.open( 'https://docs.pagebuildersandwich.com/article/188-how-to-use-responsive-mode', '_help' );
	} );

	// Toggle hide elements for mobile screens.
	document.querySelector( '.pbs-hide-elements' ).addEventListener( 'click', function( ev ) {
		ev.preventDefault();
		if ( iframe.contentDocument.body.classList.contains( 'pbs-hide-responsive' ) ) {
			iframe.contentDocument.body.classList.remove( 'pbs-hide-responsive' );
			document.body.classList.remove( 'pbs-hide-responsive' );
		} else {
			iframe.contentDocument.body.classList.add( 'pbs-hide-responsive' );
			document.body.classList.add( 'pbs-hide-responsive' );
		}
	} );

};
( function() {
	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

// Check for messages posted by the iframe. If the iframe unloaded, then we will
// get a message from it. Break the iframe when that happens.
window.addEventListener( 'message', function receiveMessage( ev ) {
	var iframe = document.querySelector( 'iframe' );

	// If the href cannot be accessed, this means that the user clicked on a URL
	// that trigger a cross-domain error. Break out of the iframe to fix the links.
	try {
		iframe.contentWindow.location.href;
	} catch ( err ) {
		document.body.classList.remove( 'pbs-iframe-loaded' );
		window.location.href = iframe.src;
		return;
	}

	if ( 'pbs_iframe_change' === ev.data && window.location.href !== iframe.contentWindow.location.href && window.location.href.indexOf( iframe.contentWindow.location.href ) === -1 ) {

		// If the iframe URL was changed (e.g. done editing & clicked on another link),
		// remove the iframe and proceed to the new link.
		document.body.classList.remove( 'pbs-iframe-loaded' );
		window.location = iframe.contentWindow.location.href;

	} else if ( 'pbs_iframe_change' === ev.data && window.location.href !== iframe.contentWindow.location.href && window.location.href.indexOf( iframe.contentWindow.location.href ) !== -1 ) {

		// If the iframe was refreshed, reset the state.
		window.pbsGoResponsive( 'desktop' );
		document.body.classList.remove( 'pbs-iframe-loaded' );
	}
}, false );

// Function that the iframe calls to change the responsive size of the iframe.
window.pbsGoResponsive = function( type ) {

	var oldView = window.pbsGetWindowSize();
	document.body.classList.remove( 'pbs-tablet' );
	document.body.classList.remove( 'pbs-phone' );
	if ( type && 'desktop' !== type ) {
		document.body.classList.add( 'pbs-' + type );
	}

	if ( 'desktop' === type ) {
		if ( document.querySelector( 'iframe' ).contentDocument.body ) {
			document.querySelector( 'iframe' ).contentDocument.body.classList.remove( 'pbs-hide-responsive' );
		}
		document.body.classList.remove( 'pbs-hide-responsive' );
	}

	setTimeout( function() {
		var iframe = document.querySelector( 'iframe' );
		var doc = iframe.contentDocument;

		// Empty columns are normally hidden in the front view for responsive sizes.
		// Do this manually.
		var emptyElements = doc.querySelectorAll( 'p.ce-element--type-text.ce-element--empty:only-child' );
		var view = window.pbsGetWindowSize();
		Array.prototype.forEach.call( emptyElements, function( el ) {
			el.parentNode.style.display = 'phone' === view || 'tablet' === view ? 'none' : '';
		} );

		// Trigger the editor to switch responsive styles.
		if ( iframe.contentWindow.pbsSwitchResponsiveStyles ) {
			iframe.contentWindow.pbsSwitchResponsiveStyles( view, oldView );
		}

	}, 700 );
};

window.pbsGetWindowSize = function() {
	if ( document.body.classList.contains( 'pbs-tablet' ) ) {
		return 'tablet';
	}
	if ( document.body.classList.contains( 'pbs-phone' ) ) {
		return 'phone';
	}
	return 'desktop';
};
