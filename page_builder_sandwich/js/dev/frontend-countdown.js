/* globals countdown, pbsCountdownParams */

window.pbsInitCountdown = function( element ) {

	var display, displayParam, dateIsPast, date, prop, subElement, recreateDivs, i;
	var sep, num, label;

	if ( ! countdown ) {
		return;
	}
	clearTimeout( element._pbsCountdownTimeout );

	display = ( element.getAttribute( 'data-date-display' ) || 'DAYS,HOURS,MINUTES,SECONDS' ).split( ',' );
	displayParam = 0;
	for ( i = 0; i < display.length; i++ ) {
		displayParam |= countdown[ display[ i ] ];
	}

	dateIsPast = ( new Date() ) > ( new Date( element.getAttribute( 'data-date' ) ) );
	date = countdown( new Date( element.getAttribute( 'data-date' ) ), null, displayParam );

	// Check if we need to recreate the divs.
	recreateDivs = false;
	if ( display.length !== element.querySelectorAll( '.pbs-countdown-num' ).length ) {
		recreateDivs = true;
	} else {
		for ( i = 0; i < display.length; i++ ) {
			prop = display[ i ].toLowerCase();
			if ( date.hasOwnProperty( prop ) ) {
				subElement = element.querySelector( '.pbs-countdown-' + prop );
				if ( ! subElement ) {
					recreateDivs = true;
					break;
				}
			}
		}
	}

	// Recreate all the divs.
	if ( recreateDivs ) {
		while ( element.firstChild ) {
			element.removeChild( element.firstChild );
		}
		for ( i = display.length - 1; i >= 0; i-- ) {
			prop = display[ i ].toLowerCase();
			if ( date.hasOwnProperty( prop ) ) {
				prop = display[ i ].toLowerCase();
				subElement = document.createElement( 'DIV' );
				subElement.classList.add( 'pbs-countdown-num' );
				subElement.classList.add( 'pbs-countdown-' + prop );
				subElement.innerHTML = '<span></span><span></span>';
				subElement.firstChild.nextSibling.innerHTML = pbsCountdownParams[ prop ];
				element.insertBefore( subElement, element.firstChild );

				if ( 0 !== i ) {
					sep = document.createElement( 'DIV' );
					sep.classList.add( 'pbs-countdown-sep' );
					sep.innerHTML = ':';
					element.insertBefore( sep, element.firstChild );
				}
			}
		}
	}

	// Update text.
	for ( i = 0; i < display.length; i++ ) {
		prop = display[ i ].toLowerCase();
		if ( date.hasOwnProperty( prop ) ) {
			subElement = element.querySelector( '.pbs-countdown-' + prop );
			if ( subElement ) {

				// Add the number with a leading zero if it's only a single digit.
				num = ( 1 === date[ prop ].toString().length ? '0' : '' ) + date[ prop ];

				// If the date is past, use 00
				if ( dateIsPast ) {
					num = '00';
				}
				subElement.firstChild.innerHTML = num;

				// Update the label.
				if ( element.getAttribute( 'data-label-' + prop ) ) {
					label = element.getAttribute( 'data-label-' + prop );
					if ( subElement.firstChild.nextSibling.innerHTML !== label ) {
						subElement.firstChild.nextSibling.innerHTML = label;
					}
				}
			}
		}
	}

	// Call again.
	element._pbsCountdownTimeout = setTimeout( function() {
		window.pbsInitCountdown( element );
	}, 1000 );
};

window.pbsInitAllCountdown = function() {
	var elements = document.querySelectorAll( '[data-ce-tag="countdown"]' );
	Array.prototype.forEach.call( elements, function( el ) {
		window.pbsInitCountdown( el );
	} );
};

( function() {
	var ready = function() {
		window.pbsInitAllCountdown();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();
