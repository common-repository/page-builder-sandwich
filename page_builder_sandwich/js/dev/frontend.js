/* globals pbsFrontendParams */

/**
 * IE 10 & IE 11 doesn't support SVG.innerHTML. This polyfill adds it.
 *
 * @see https://github.com/phaistonian/SVGInnerHTML
 */

/* jshint ignore:start */
( function( view ) {

	var constructors, dummy, innerHTMLPropDesc;

if ( ( !! window.MSInputMethodContext && !! document.documentMode ) ||
	 ( navigator.appVersion.indexOf( 'MSIE 10' ) !== -1 ) ) {

	constructors = ['SVGSVGElement', 'SVGGElement'];
	dummy = document.createElement( 'dummy' );

	if ( ! constructors[0] in view ) {
	    return false;
	}

	if ( Object.defineProperty ) {

	    innerHTMLPropDesc = {

	        get: function() {

	            dummy.innerHTML = '';

	            Array.prototype.slice.call( this.childNodes )
	            .forEach( function( node, index ) {
	                dummy.appendChild( node.cloneNode( true ) );
	            } );

	            return dummy.innerHTML;
	        },

	        set: function( content ) {
	            var self = this;
				var parent = this;
				var allNodes = Array.prototype.slice.call( self.childNodes );
				var fn = function( to, node ) {
					var newNode;

	                    if ( 1 !== node.nodeType ) {
	                        return false;
	                    }

	                    newNode = document.createElementNS( 'http://www.w3.org/2000/svg', node.nodeName );

	                    Array.prototype.slice.call( node.attributes )
	                    .forEach( function( attribute ) {
	                        newNode.setAttribute( attribute.name, attribute.value );
	                    } );

	                    if ( 'TEXT' === node.nodeName ) {
	                        newNode.textContent = node.innerHTML;
	                    }

	                    to.appendChild( newNode );

	                    if ( node.childNodes.length ) {

	                        Array.prototype.slice.call( node.childNodes )
	                        .forEach( function( node, index ) {
	                            fn( newNode, node );
	                        } );

	                    }
	                };

	            // /> to </tag>
	            content = content.replace( /<(\w+)([^<]+?)\/>/, '<$1$2></$1>' );

	            // Remove existing nodes
	            allNodes.forEach( function( node, index ) {
	                node.parentNode.removeChild( node );
	            } );

	            dummy.innerHTML = content;

	            Array.prototype.slice.call( dummy.childNodes )
	            .forEach( function( node ) {
	                fn( self, node );
	            } );

	        }, enumerable: true, configurable: true
	    };

	    try {
	        constructors.forEach( function(constructor, index ) {
	            Object.defineProperty( window[constructor].prototype, 'innerHTML', innerHTMLPropDesc );
	        } );
	    } catch ( ex ) {

	        // TODO: Do something meaningful here
	    }

	} else if ( Object.prototype.__defineGetter__ ) {

	    constructors.forEach( function(constructor, index ) {
	        window[constructor].prototype.__defineSetter__( 'innerHTML', innerHTMLPropDesc.set );
	        window[constructor].prototype.__defineGetter__( 'innerHTML', innerHTMLPropDesc.get );
	    } );

	}
}

}( window ) );
/* jshint ignore:end */

/**
 * Custom events cause errors in in IE 11. This polyfill fixes it.
 *
 * @see http://stackoverflow.com/a/31783177/174172
 */
( function() {

	function CustomEvent ( event, params ) {
		var evt;
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		evt = document.createEvent( 'CustomEvent' );
		evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
		return evt;
	}

	// Only do this for IE11 & IE10
	if ( ( !! window.MSInputMethodContext && !! document.documentMode ) ||
		 ( navigator.appVersion.indexOf( 'MSIE 10' ) !== -1 ) ) {

		CustomEvent.prototype = window.Event.prototype;

		window.CustomEvent = CustomEvent;
	}
} )();


window.pbsIsRTL = function() {
	var html = document.querySelector( 'html' );
	return 'rtl' === html.getAttribute( 'dir' );
};

/**
 * Checks if the browser is mobile (and tablet).
 */
window.pbsIsMobile = function() {
	return navigator.userAgent.match( /(Mobi|Android)/ );
};

// From http://davidwalsh.name/element-matches-selector
window.pbsSelectorMatches = function( el, selector ) {
	var p = Element.prototype;
	var f = p.matches || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || function( s ) {
		return [].indexOf.call( document.querySelectorAll( s ), this ) !== -1;
	};
	if ( 1 !== el.nodeType && el.parentNode ) {
		el = el.parentNode;
	}
	if ( 1 !== el.nodeType ) {
		return false;
	}
	return f.call( el, selector );
};

window.pbsParent = function( el, selector ) {
	while ( ! window.pbsSelectorMatches( el, selector ) && 'BODY' !== el.tagName ) {
		el = el.parentNode;
	}
	return window.pbsSelectorMatches( el, selector ) ? el : null;
};

window.pbsIndex = function( el ) {
	return el ? Array.prototype.indexOf.call( el.parentNode.children, el ) : 0;
};

( function() {
	var ready = function() {

		// Check if IE11 then add class to html tag.
		var isIE11 = !! navigator.userAgent.match( /Trident.*rv[ :]*11\./ );
		if ( isIE11 ) {
			document.querySelector( 'html' ).classList.add( 'pbs-ie11' );
		}

		// Add the theme name in the HTML tag for compatibility scripts and styles.
		document.querySelector( 'html' ).classList.add( 'theme-' + pbsFrontendParams.theme_name );
	};
	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals WebFont */

window.pbsLoadFonts = function( fontArray ) {
	if ( fontArray.length ) {
		WebFont.load( {
			google: {
				families: fontArray
			}
		} );
	}
};

window.pbsInitFonts = function() {

	var elements, fontsFound = [];

	if ( 'undefined' === typeof WebFont ) {
		return;
	}

	elements = document.querySelectorAll( '[data-font-family]' );
	Array.prototype.forEach.call( elements, function( el ) {
		var font = el.getAttribute( 'data-font-family' );
		if ( -1 === fontsFound.indexOf( font ) ) {
			fontsFound.push( font );
		}
	} );

	window.pbsLoadFonts( fontsFound );
};

( function() {
	var ready = function() {
		window.pbsInitFonts();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

window._pbsFixRowWidth = function( element ) {

	var dataWidth = element.getAttribute( 'data-width' );

	if ( ! dataWidth ) {
		window._pbsRowReset( element );
		return;
	}

	// Nested rows cannot be full width
	if ( element.parentNode.classList.contains( 'pbs-col' ) ) {
		window._pbsRowReset( element );
	} else if ( 'undefined' === typeof dataWidth || ! dataWidth ) {
		window._pbsRowReset( element );
	} else if ( 'full-width' === dataWidth ) {
		window._pbsFullWidthRow( element );
	} else {
		window._pbsFullWidthRow( element, true );
	}

	clearTimeout( window._pbsFixRowWidthsResizeTrigger );
	window._pbsFixRowWidthsResizeTrigger = setTimeout( function() {
		window._pbsFixRowWidthsResizeNoReTrigger = true;
		window.dispatchEvent( new CustomEvent( 'resize' ) );
	}, 1 );
};

window._pbsRowReset = function( element ) {
	element.style.width = '';
	element.style.position = '';
	element.style.maxWidth = '';
	if ( ! window.pbsIsRTL() ) {
		element.style.left = '';
	} else {
		element.style.right = '';
	}
	element.style.webkitTransform = '';
	element.style.mozTransform = '';
	element.style.msTransform = '';
	element.style.transform = '';

	// Element.style.marginLeft = '';
	// element.style.marginRight = '';
	// element.style.paddingLeft = '';
	// element.style.paddingRight = '';
};

window._pbsFullWidthRow = function( element, fitToContentWidth ) {

	var origWebkitTransform = element.style.webkitTransform;
	var origMozTransform = element.style.mozTransform;
	var origMSTransform = element.style.msTransform;
	var origTransform = element.style.transform;

	var bodyWidth, rect, bodyRect, actualWidth, paddingLeft, paddingRight;

    // Reset changed parameters for contentWidth so that width recalculation on resize will work
	element.style.width = 'auto';
	element.style.position = 'relative';
	element.style.maxWidth = 'none';
	element.style.webkitTransform = '';
	element.style.mozTransform = '';
	element.style.msTransform = '';
	element.style.transform = '';
	element.style.marginLeft = '0px';
	element.style.marginRight = '0px';

	if ( 'undefined' !== typeof fitToContentWidth && fitToContentWidth ) {
		element.style.paddingLeft = '';
		element.style.paddingRight = '';
	}

	// Make sure our parent won't hide our content
	element.parentNode.style.overflowX = 'visible';

	// Reset the left parameter
	if ( ! window.pbsIsRTL() ) {
		element.style.left = '0px';
	} else {
		element.style.right = '0px';
	}

	// Assign the new full-width styles
	bodyWidth = document.body.clientWidth;
	rect = element.getBoundingClientRect();
	bodyRect = document.body.getBoundingClientRect();

	element.style.width = bodyWidth + 'px';
	element.style.position = 'relative';
	element.style.maxWidth = bodyWidth + 'px';
	if ( ! window.pbsIsRTL() ) {
		element.style.left = ( -rect.left + bodyRect.left ) + 'px';
	} else {
		element.style.right = ( rect.right - bodyRect.right ) + 'px';
	}
	element.style.webkitTransform = origWebkitTransform;
	element.style.mozTransform = origMozTransform;
	element.style.msTransform = origMSTransform;
	element.style.transform = origTransform;

	if ( 'undefined' === typeof fitToContentWidth ) {
		return;
	}
	if ( ! fitToContentWidth ) {
		return;
	}

	// Calculate the required left/right padding to ensure that the content width is being followed
	actualWidth = rect.width;

	if ( ! window.pbsIsRTL() ) {
		paddingLeft = rect.left - bodyRect.left;
		paddingRight = bodyWidth - actualWidth - rect.left + bodyRect.left;
	} else {
		paddingLeft = bodyWidth - actualWidth + rect.right - bodyRect.right;
		paddingRight = -rect.right + bodyRect.right;
	}

	// If the width is too large, don't pad
	if ( actualWidth > bodyWidth ) {
		paddingLeft = 0;
		paddingRight = 0;
	}

	element.style.paddingLeft = paddingLeft + 'px';
	element.style.paddingRight = paddingRight + 'px';
};

window.pbsFixRowWidths = function() {
	var fullRows = document.querySelectorAll( '.pbs-row' );
	Array.prototype.forEach.call( fullRows, function( el ) {
		window._pbsFixRowWidth( el );
	} );
};

window.addEventListener( 'resize', function() {
	if ( window._pbsFixRowWidthsResizeNoReTrigger ) {
		delete window._pbsFixRowWidthsResizeNoReTrigger;
		return;
	}
	window.pbsFixRowWidths();
} );
window.pbsFixRowWidths();

( function() {
	var ready = function() {
		setTimeout( function() {
			window.pbsFixRowWidths();
		}, 1 );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

( function() {

	// We have special rendering for IE.
	var isIE = !! navigator.userAgent.match( /MSIE/ ) ||
	           !! navigator.userAgent.match( /Trident.*rv[ :]*11\./ ) ||
			   !! navigator.userAgent.match( /Edge\/12/ );

	var _initTimeout = null;
	var _working, pbsParallaxUpdateDimensions, ready;

	window.pbsDestroyParallax = function( element ) {
		var parallaxes = element.querySelectorAll( '.pbs-parallax' );
		Array.prototype.forEach.call( parallaxes, function( el ) {
			if ( el.parentNode === element ) {
				element.removeChild( el );
			}
		} );
	};

	window.pbsInitParallax = function( element, forceReset ) {

		var parallaxDiv;

		if ( ! element.getAttribute( 'data-pbs-parallax' ) ) {
			window.pbsDestroyParallax( element );
			return;
		}

		if ( forceReset ) {
			window.pbsDestroyParallax( element );
		}

		parallaxDiv = element.querySelector( '.pbs-parallax' );
		if ( ! parallaxDiv || parallaxDiv.parentNode !== element ) {
			parallaxDiv = document.createElement( 'DIV' );
			parallaxDiv.classList.add( 'pbs-parallax' );
			element.insertBefore( parallaxDiv, element.firstChild );
		}
		parallaxDiv.style.backgroundColor = element.style.backgroundColor;
		parallaxDiv.style.backgroundImage = element.style.backgroundImage;
		parallaxDiv.style.backgroundSize = element.style.backgroundSize;
		parallaxDiv.style.backgroundRepeat = element.style.backgroundRepeat;
		parallaxDiv.setAttribute( 'data-speed', element.getAttribute( 'data-pbs-parallax' ) );

		// Update right away.
		clearTimeout( _initTimeout );
		_initTimeout = setTimeout( function() {
			window.requestAnimationFrame( window.pbsUpdateParallax );
		}, 10 );
	};

	window.pbsInitAllParallax = function( forceReset ) {
		var rows = document.querySelectorAll( '[data-pbs-parallax]' );
		Array.prototype.forEach.call( rows, function( el ) {
			window.pbsInitParallax( el, forceReset );
		} );
	};

	_working = false;

	pbsParallaxUpdateDimensions = function( parallaxElem ) {

		var rowElem = parallaxElem.parentNode;
		var rowRect = rowElem.getBoundingClientRect();
		var speed = parseFloat( parallaxElem.getAttribute( 'data-speed' ) );
		var height = parseInt( rowRect.height, 10 );
		var minTop = parseInt( rowRect.top, 10 );
		var bottom = parseInt( rowRect.bottom, 10 );
		var scrollY = window.scrollY || window.pageYOffset;
		var max = bottom + scrollY;
		var windowHeight = window.innerHeight;
		var min = minTop - windowHeight + scrollY;
		var percentage, basedHeight, parallaxHeight, parallaxHeightDiff;

		if ( speed < 0 ) {
			max = min;
			min = bottom + scrollY;
		}
		percentage = ( scrollY - min ) / ( max - min );

		basedHeight = windowHeight;
		if ( height > windowHeight ) {
			basedHeight = height;
		}
		parallaxHeight = ( 1 + Math.abs( speed ) ) * basedHeight;
		parallaxHeightDiff = Math.abs( speed ) * basedHeight - 10; // 10 bleed (5px top & bottom).

		parallaxElem.style.height = parallaxHeight + 'px';
		return -percentage * parallaxHeightDiff - 5;

	};

	window.pbsUpdateParallax = function() {
	        var i, parallaxes, parallax, len, movement, scrollY, translate3d;
	        scrollY = window.scrollY || window.pageYOffset;

			parallaxes = document.querySelectorAll( '.pbs-parallax' );
	        for ( i = 0, len = parallaxes.length; i < len; i++ ) {
	            parallax = parallaxes[i];

				// IE better performs with absolute.
				parallax.style.position = isIE ? 'absolute' : 'fixed';

				movement = pbsParallaxUpdateDimensions( parallax );

	            parallax.style['-webkit-transition'] = '-webkit-transform 1ms linear';
	            parallax.style['-moz-transition'] = '-moz-transform 1ms linear';
	            parallax.style['-ms-transition'] = '-ms-transform 1ms linear';
	            parallax.style['-o-transition'] = '-o-transform 1ms linear';
				parallax.style.transition = 'transform 1ms linear';

	            translate3d = 'translate3d(0, ' + movement + 'px, 0)';
	            parallax.style['-webkit-transform'] = translate3d;
	            parallax.style['-moz-transform'] = translate3d;
	            parallax.style['-ms-transform'] = translate3d;
	            parallax.style['-o-transform'] = translate3d;
	            parallax.style.transform = translate3d;

	            parallax.style['-webkit-transition'] = '-webkit-transform -1ms linear';
	            parallax.style['-moz-transition'] = '-moz-transform -1ms linear';
	            parallax.style['-ms-transition'] = '-ms-transform -1ms linear';
	            parallax.style['-o-transition'] = '-o-transform -1ms linear';
				parallax.style.transition = 'transform -1ms linear';

				parallax.style.transformStyle = 'flat';
	        }

		_working = false;
	};

	ready = function() {
		window.addEventListener( 'scroll', function() {
			if ( ! _working ) {
				_working = true;
				window.requestAnimationFrame( window.pbsUpdateParallax );
			}
		} );
		window.addEventListener( 'resize', function() {
			window.pbsInitAllParallax( true );
		} );

		window.pbsInitAllParallax();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * Frontend functions for video backgrounds for rows.
 */

/* globals YT, $f */

window.pbsInitVideoBG = function( element ) {

	var video, videoInner, id, videoDetails, r;

	if ( window.pbsIsMobile() ) {
		return;
	}

	// Videos need to be destroyed for it to refresh when changing sources.
	if ( ! element.getAttribute( 'data-pbs-video-webm' ) && ! element.getAttribute( 'data-pbs-video-mp4' ) && ! element.getAttribute( 'data-pbs-video-url' ) ) {
		window.pbsDestroyVideoBG( element );
		return;
	}

	// Take note of the old video src.
	if ( ! element._oldWebmSrc ) {
		element._oldWebmSrc = element.getAttribute( 'data-pbs-video-webm' );
	}
	if ( ! element._oldMp4Src ) {
		element._oldMp4Src = element.getAttribute( 'data-pbs-video-mp4' );
	}
	if ( ! element._oldUrl ) {
		element._oldUrl = element.getAttribute( 'data-pbs-video-url' );
	}

	// If the video src changed, then we need to destroy the video to make it refresh.
	// If we don't do this, the new source won't show up.
	if ( null !== element.getAttribute( 'data-pbs-video-webm' ) && element._oldWebmSrc !== element.getAttribute( 'data-pbs-video-webm' ) ) {
		window.pbsDestroyVideoBG( element );
		element._oldWebmSrc = element.getAttribute( 'data-pbs-video-webm' );
		element._oldUrl = '';
	}

	if ( null !== element.getAttribute( 'data-pbs-video-mp4' ) && element._oldMp4Src !== element.getAttribute( 'data-pbs-video-mp4' ) ) {
		window.pbsDestroyVideoBG( element );
		element._oldMp4Src = element.getAttribute( 'data-pbs-video-mp4' );
		element._oldUrl = '';
	}
	if ( null !== element.getAttribute( 'data-pbs-video-url' ) && element._oldUrl !== element.getAttribute( 'data-pbs-video-url' ) ) {
		window.pbsDestroyVideoBG( element );
		element._oldUrl = element.getAttribute( 'data-pbs-video-url' );
		element._oldWebmSrc = '';
		element._oldMp4Src = '';
	}

	// Create the necessary HTML for the video.
	video = element.querySelector( '.pbs-video-bg' );
	videoInner = element.querySelector( '.pbs-video-bg > *' );
	videoDetails = null;
	if ( element.getAttribute( 'data-pbs-video-url' ) ) {
		videoDetails = window.pbsGetVideoDataFromURL( element.getAttribute( 'data-pbs-video-url' ) );
	}
	if ( ! video || video.parentNode !== element ) {
		if ( element.getAttribute( 'data-pbs-video-webm' ) || element.getAttribute( 'data-pbs-video-mp4' ) ) {
			video = document.createElement( 'DIV' );
			videoInner = document.createElement( 'VIDEO' );
			video.insertBefore( videoInner, video.firstChild );
		} else if ( ! videoDetails || 'youtube' === videoDetails.type ) {
			video = document.createElement( 'DIV' );
			videoInner = document.createElement( 'DIV' );
			id = 'pbs-video-bg-' + ( Math.random().toString( 16 ) + '000000000' ).substr( 2, 8 );
			videoInner.setAttribute( 'id', id );
			video.insertBefore( videoInner, video.firstChild );
		} else {
			video = document.createElement( 'DIV' );
			videoInner = document.createElement( 'IFRAME' );
			id = 'pbs-video-bg-' + ( Math.random().toString( 16 ) + '000000000' ).substr( 2, 8 );
			videoInner.setAttribute( 'id', id );
			videoInner.setAttribute( 'src', '//player.vimeo.com/video/' + videoDetails.id + '?api=1&player_id=' + id + '&html5=1&autopause=0&autoplay=1&badge=0&byline=0&loop=1&title=0' );
			videoInner.setAttribute( 'frameborder', '0' );
			video.insertBefore( videoInner, video.firstChild );
		}

		video.classList.add( 'pbs-video-bg' );
		element.insertBefore( video, element.firstChild );
	}

	// If the background is tinted, also tint the video.
	if ( element.style.backgroundImage.match( /rgba\(/i ) ) {

		// Carry over the background color.
		r = /(rgba\(\s*[\d\.]+\s*,\s*[\d\.]+\s*,\s*[\d\.]+\s*,\s*)([\d\.]+)(.*)/i;
		video.style.backgroundColor = element.style.backgroundColor;
		video.style.backgroundColor = video.style.backgroundColor.replace( r, '$11$3' );

		// Carry over the opacity to give the illusion of a tinted video.
		if ( element.style.backgroundColor.match( r ) ) {
			videoInner.style.opacity = 1 - parseFloat( element.style.backgroundColor.replace( r, '$2' ) );
		} else {
			videoInner.style.opacity = 0;
		}

	// If the background ISN'T tinted, make sure the video isn't tinted.
	} else {
		video.style.backgroundColor = 'none';
		videoInner.style.opacity = 1;
	}

	// Initialize the video.
	if ( element.getAttribute( 'data-pbs-video-webm' ) || element.getAttribute( 'data-pbs-video-mp4' ) ) {
		window.pbsInitUploadedVideo( element );
	} else if ( element.getAttribute( 'data-pbs-video-url' ) ) {
		if ( 'youtube' === videoDetails.type ) {
			window.pbsInitYouTubeVideo( element );
		} else {
			window.pbsInitVimeoVideo( element );
		}
	}
};

window.pbsInitAllVideoBGs = function() {
	var rows = document.querySelectorAll( '[data-pbs-video-webm], [data-pbs-video-mp4], [data-pbs-video-url]' );
	Array.prototype.forEach.call( rows, function( el ) {
		window.pbsInitVideoBG( el );
	} );
};

window.pbsDestroyVideoBG = function( element ) {
	var videos = element.querySelectorAll( '.pbs-video-bg' );
	Array.prototype.forEach.call( videos, function( el ) {
		if ( el.parentNode === element ) {
			element.removeChild( el );
		}
	} );
};

window.pbsDestroyAllVideoBG = function() {
	var rows = document.querySelectorAll( '[data-pbs-video-webm], [data-pbs-video-mp4], [data-pbs-video-url]' );
	Array.prototype.forEach.call( rows, function( el ) {
		window.pbsDestroyVideoBG( el );
	} );
};

window.pbsGetVideoDataFromURL = function( url ) {

	var match;

	url = url.trim();

	/*
	 * Check for YouTube.
	 */
	match = url.match( /^.*youtube\.com\/watch\?v=([^\&\?\/]+).*$/i );
	if ( match ) {
		return {
			type: 'youtube',
			id: match[1]
		};
	}
	match = url.match( /^.*youtube\.com\/embed\/([^\&\?\/]+).*$/i );
	if ( match ) {
		return {
			type: 'youtube',
			id: match[1]
		};
	}
	match = url.match( /^.*youtube\.com\/v\/([^\&\?\/]+).*$/i );
	if ( match ) {
		return {
			type: 'youtube',
			id: match[1]
		};
	}
	match = url.match( /^.*youtu\.be\/([^\&\?\/]+).*$/i );
	if ( match ) {
		return {
			type: 'youtube',
			id: match[1]
		};
	}

	/*
	 * Check for Vimeo.
	 */
	match = url.match( /^.*vimeo\.com\/(\w*\/)*(\d+).*$/i );
	if ( match ) {
		return {
			type: 'vimeo',
			id: match[2]
		};
	}

	/*
	 * Non-URL form.
	 */
	match = url.match( /^(.*?)(\d{6,})(.*?)$/i );
	if ( match ) {
		return {
			type: 'vimeo',
			id: match[2]
		};
	}

	return {
		type: 'youtube',
		id: url
	};
};

window.pbsInitVimeoVideo = function( element ) {
	var player;
	var videoDetails = window.pbsGetVideoDataFromURL( element.getAttribute( 'data-pbs-video-url' ) );
	if ( 'vimeo' !== videoDetails.type ) {
		return;
	}

	player = $f( element.querySelector( 'iframe' ) );

	player.addEvent( 'ready', function( id ) {
		player = $f( id );
		player.api( 'setVolume', 0 );
		window.pbsResizeYTVimeoVideo( element );
	} );
	window.pbsResizeYTVimeoVideo( element );
};

window._pbsYouTubeAPIInit = false;
window.pbsInitYouTubeVideo = function( element ) {

	var videoID, tag, firstScriptTag, video, elementID;
	var videoDetails = window.pbsGetVideoDataFromURL( element.getAttribute( 'data-pbs-video-url' ) );
	if ( 'youtube' !== videoDetails.type ) {
		return;
	}
	videoID = videoDetails.id;

	// Add the YT API if it's not there yet.
	if ( ! document.querySelector( 'script[src="https://www.youtube.com/iframe_api"]' ) ) {
		tag = document.createElement( 'script' );
		tag.src = 'https://www.youtube.com/iframe_api';
		firstScriptTag = document.getElementsByTagName( 'script' )[0];
		firstScriptTag.parentNode.insertBefore( tag, firstScriptTag );

		// This will call onYouTubeIframeAPIReady when loaded.
	} else if ( ! window._pbsYouTubeAPIInit ) {

		// Just wait for the YT API to finish loading, it will init the videos again.
	} else {

		if ( ! element.querySelector( '.pbs-video-bg' ) ) {
			return;
		}
		video = element.querySelector( '.pbs-video-bg > *' );
		elementID = video.getAttribute( 'id' );
		new YT.Player( elementID, {
			height: 'auto',
			width: 'auto',
			videoId: videoID,
			playerVars: {
				autohide: 1,
				autoplay: 1,
				fs: 0,
				showinfo: 0,
				loop: 1,
				modestBranding: 1,
				start: 0,
				controls: 0,
				rel: 0,
				disablekb: 1,
				iv_load_policy: 3,
				wmode: 'transparent'
			},
			events: {
				'onReady': function( event ) {
					var player = event.target;
					var prevCurrTime;
					var timeLastCall = +new Date() / 1000;
					var currTime = 0;
					var firstRun = true;

					player.playVideo();
					player.mute();
					player.setPlaybackQuality( 'hd720' );

					prevCurrTime = player.getCurrentTime();

					player.loopInterval = setInterval( function() {
						if ( 'undefined' !== typeof player.loopTimeout ) {
							clearTimeout( player.loopTimeout );
						}

						if ( prevCurrTime === player.getCurrentTime() ) {
							currTime = prevCurrTime + ( +new Date() / 1000 - timeLastCall );
						} else {
							currTime = player.getCurrentTime();
							timeLastCall = +new Date() / 1000;
						}
						prevCurrTime = player.getCurrentTime();

						if ( currTime + ( firstRun ? 0.45 : 0.21 ) >= player.getDuration() ) {
							try {
								player.pauseVideo();
								player.seekTo( 0 );
								player.playVideo();
							} catch ( err ) {

								// This means our video was removed.
								clearInterval( player.loopInterval );
							}
							firstRun = false;
						}
					}, 150 );
				},
				'onStateChange': function( event ) {
					if ( event.data === YT.PlayerState.ENDED ) {
						if ( 'undefined' !== typeof event.target.loopTimeout ) {
							clearTimeout( event.target.loopTimeout );
						}
						event.target.seekTo( 0 );

					// Make the video visible when we start playing
					// } else if ( event.data === YT.PlayerState.PLAYING ) {
						// jQuery(event.target.getIframe()).parent().css('visibility', 'visible');
					}
				}
			}
		} );
		window.pbsResizeYTVimeoVideo( element );
	}

};

window.pbsResizeYTVimeoVideo = function( element ) {

	var container = element.querySelector( '.pbs-video-bg' );
	var rect = element.getBoundingClientRect();
	var containerWidth, containerHeight, finalWidth, finalHeight, deltaWidth;
	var deltaHeight, marginTop, marginLeft, width, height, aspectRatio = [16, 9];

	if ( ! container ) {
		return;
	}

	container.style.width = 'auto';
	container.style.height = 'auto';
	container.style.marginTop = 'auto';
	container.style.marginLeft = 'auto';

	containerWidth = rect.width;
	containerHeight = rect.height;

	finalHeight = containerHeight;
	finalWidth = aspectRatio[0] / aspectRatio[1] * containerHeight;

	deltaWidth = ( aspectRatio[0] / aspectRatio[1] * containerHeight ) - containerWidth;
	deltaHeight = ( containerWidth * aspectRatio[1] ) / aspectRatio[0] - containerHeight;

	if ( finalWidth >= containerWidth && finalHeight >= containerHeight ) {
		height = containerHeight;
		width = aspectRatio[0] / aspectRatio[1] * containerHeight;
	} else {
		width = containerWidth;
		height = ( containerWidth * aspectRatio[1] ) / aspectRatio[0];
	}

	marginTop = -( height - containerHeight ) / 2;
	marginLeft = -( width - containerWidth ) / 2;

	container.style.width = width + 'px';
	container.style.height = height + 'px';
	container.style.marginTop = marginTop + 'px';
	container.style.marginLeft = marginLeft + 'px';
};

window.pbsInitAllYouTubeVideos = function() {
	var rows = document.querySelectorAll( '[data-pbs-video-url]' );
	Array.prototype.forEach.call( rows, function( el ) {
		window.pbsInitYouTubeVideo( el );
	} );
};

window.pbsResizeAllVideos = function() {
	var rows = document.querySelectorAll( '[data-pbs-video-url]' );
	Array.prototype.forEach.call( rows, function( el ) {
		window.pbsResizeYTVimeoVideo( el );
	} );
};

function onYouTubeIframeAPIReady() { // jshint ignore:line
	window._pbsYouTubeAPIInit = true;
	window.pbsInitAllYouTubeVideos();
}

window.pbsInitUploadedVideo = function( element ) {

	var webm, mp4;

	// Create the video element.
	var video = element.querySelector( '.pbs-video-bg video' );
	video.setAttribute( 'poster', element.style.backgroundImage );
	video.setAttribute( 'playsinline', '' );
	video.setAttribute( 'autoplay', '' );
	video.setAttribute( 'muted', '' );
	video.setAttribute( 'loop', '' );

	webm = video.querySelector( 'source[type="video/webm"]' );
	if ( webm ) {
		webm.parentNode.removeChild( webm );
	}
	mp4 = video.querySelector( 'source[type="video/mp4"]' );
	if ( mp4 ) {
		mp4.parentNode.removeChild( mp4 );
	}

	// Create mp4 (as the second entry because it has larger filesize).
	mp4 = document.createElement( 'SOURCE' );
	video.insertBefore( mp4, video.firstChild );
	mp4.setAttribute( 'src', element.getAttribute( 'data-pbs-video-mp4' ) );
	mp4.setAttribute( 'type', 'video/mp4' );

	// Create webm (as the first entry because it has smaller filesize).
	webm = document.createElement( 'SOURCE' );
	video.insertBefore( webm, video.firstChild );
	webm.setAttribute( 'src', element.getAttribute( 'data-pbs-video-webm' ) );
	webm.setAttribute( 'type', 'video/webm' );
};

( function() {
	var ready = function() {
		window.pbsInitAllVideoBGs();

		window.addEventListener( 'resize', function() {
			window.pbsResizeAllVideos();
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * Froogaloop code below for Vimeo.
 */

// jshint ignore:start
// jscs:disable
// Fix for multiple Vimeo videos not working: https://github.com/vimeo/player-api/issues/19
// @from https://github.com/proofme/player-api/blob/master/javascript/froogaloop.min.js
var Froogaloop = function() {
function n( e ) {
return new n.fn.init( e );
}function e( n, e, t ) {
if ( ! t.contentWindow.postMessage )return ! 1;var r = JSON.stringify( { method:n, value:e } );t.contentWindow.postMessage( r, d );
}function t( n ) {
var e, t;try {
e = JSON.parse( n.data ), t = e.event || e.method;
}catch ( r ) {}if ( 'ready' != t || a || ( a = ! 0 ), ! /^https?:\/\/player.vimeo.com/.test( n.origin ) )return ! 1;'*' === d && ( d = n.origin );var o = e.value, l = e.data, u = '' === u ? null : e.player_id, s = i( t, u ), f = [];return s ? ( void 0 !== o && f.push( o ), l && f.push( l ), u && f.push( u ), f.length > 0 ?
s.apply( null, f ) : s.call() ) : ! 1;
}function r( n, e, t ) {
t ? ( u[t] || ( u[t] = {} ), u[t][n] = e ) : u[n] = e;
}function i( n, e ) {
return e ? ( u[e] || {} )[n] : u[n];
}function o( n, e ) {
if ( e ) {
var t = u[e];if ( ! t || ! t[n] )return ! 1;t[n] = null;
}else {
if ( ! u[n] )return ! 1;u[n] = null;
}return ! 0;
}function l( n ) {
return !! ( n && n.constructor && n.call && n.apply );
}var u = {}, a = ! 1, d = ( Array.prototype.slice, '*' );return n.fn = n.prototype = { element:null, init:function( n ) {
return 'string' == typeof n && ( n = document.getElementById( n ) ), this.element = n, this;
}, api:function( n, t ) {
if ( ! this.element || ! n )
return ! 1;var i = this, o = i.element, u = '' !== o.id ? o.id : null, a = l( t ) ? null : t, d = l( t ) ? t : null;return d && r( n, d, u ), e( n, a, o ), i;
}, addEvent:function( n, t ) {
if ( ! this.element )return ! 1;var i = this, o = i.element, l = '' !== o.id ? o.id : null;return r( n, t, l ), 'ready' != n ? e( 'addEventListener', n, o ) : 'ready' == n && a && t.call( null, l ), i;
}, removeEvent:function( n ) {
if ( ! this.element )return ! 1;var t = this, r = t.element, i = '' !== r.id ? r.id : null, l = o( n, i );'ready' != n && l && e( 'removeEventListener', n, r );
} }, n.fn.init.prototype = n.fn, window.addEventListener ?
window.addEventListener( 'message', t, ! 1 ) : window.attachEvent( 'onmessage', t ), window.Froogaloop = window.$f = n;
}();
// jshint ignore:end
// jscs:enable

window.pbsDestroyKenBurns = function( element ) {
	var kenburns = element.querySelectorAll( '.pbs-kenburns-bg' );
	Array.prototype.forEach.call( kenburns, function( el ) {
		if ( el.parentNode === element ) {
			element.removeChild( el );
		}
	} );
};

window.pbsDestroyAllKenBurns = function() {
	var rows = document.querySelectorAll( '.pbs-row[data-pbs-kenburns-1]' );
	Array.prototype.forEach.call( rows, function( el ) {
		window.pbsDestroyKenBurns( el );
	} );
};

window.pbsInitKenBurns = function( element ) {
	var i, bg, bgs, numImages = 0;

	if ( ! element.hasAttribute( 'data-pbs-kenburns-1' ) ) {
		window.pbsDestroyKenBurns( element );
		return;
	}

	// Add all the necessary divs. 1 div = 1 image.
	for ( i = 5; i > 0; i-- ) {
		if ( element.getAttribute( 'data-pbs-kenburns-' + i + '' ) ) {
			if ( ! numImages ) {
				numImages = i;
			}

			// Add lacking divs.
			while ( element.querySelectorAll( '.pbs-kenburns-bg' ).length < numImages ) {
				bg = document.createElement( 'DIV' );
				bg.classList.add( 'pbs-kenburns-bg' );
				element.insertBefore( bg, element.firstChild );
			}

			// Remove excess divs.
			while ( element.querySelectorAll( '.pbs-kenburns-bg' ).length > numImages ) {
				bgs = element.querySelectorAll( '.pbs-kenburns-bg' );
				bg = bgs[ bgs.length - 1 ];
				bg.parentNode.removeChild( bg );
			}

			// Assign the image.
			bg = element.querySelectorAll( '.pbs-kenburns-bg' )[ i - 1 ];
			bg.setAttribute( 'class', '' );
			bg.classList.add( 'pbs-kenburns-bg' );
			bg.classList.add( 'pbs-kenburns-bg-' + numImages );
			bg.style.backgroundImage = 'url(' + element.getAttribute( 'data-pbs-kenburns-' + i ) + ')';
		}
	}
};

window.pbsInitAllKenBurns = function() {
	var rows = document.querySelectorAll( '.pbs-row[data-pbs-kenburns-1]' );
	Array.prototype.forEach.call( rows, function( el ) {
		window.pbsInitKenBurns( el );
	} );
};

( function() {
	var ready = function() {
		window.pbsInitAllKenBurns();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals hljs */

window.pbsInitAllPretext = function() {

	var codes;
	if ( 'undefined' === typeof hljs ) {
		return;
	}

	codes = document.querySelectorAll( '.pbs-main-wrapper pre' );
	Array.prototype.forEach.call( codes, function( el ) {
		hljs.highlightBlock( el );
	} );
};

( function() {
	var ready = function() {
		window.pbsInitAllPretext();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();


window.pbsTabsRefreshActiveTab = function( tabsElement ) {
	var id, tabs, activeTab;
	var radio = tabsElement.querySelector( '.pbs-tab-state:checked' );
	if ( ! radio ) {
		radio = tabsElement.querySelector( '.pbs-tab-state' );
	}
	id = radio.getAttribute( 'id' );
	tabs = tabsElement.querySelector( '.pbs-tab-tabs ' );
	if ( tabs ) {
		activeTab = tabs.querySelector( '.pbs-tab-active' );
		if ( activeTab ) {
			activeTab.classList.remove( 'pbs-tab-active' );
		}
		activeTab = tabs.querySelector( '[for="' + id + '"]' );
		if ( activeTab ) {
			activeTab.classList.add( 'pbs-tab-active' );
		}
	}
};

( function() {
	var ready = function() {

		var elements;

		// Initialize.
		document.addEventListener( 'change', function( ev ) {
			if ( ev.target ) {
				if ( ev.target.classList.contains( 'pbs-tab-state' ) ) {
					window.pbsTabsRefreshActiveTab( ev.target.parentNode );
				}
			}
		} );

		// On first load, the first tab is active.
		elements = document.querySelectorAll( '[data-ce-tag="tabs"]' );
		Array.prototype.forEach.call( elements, function( el ) {
			el = el.querySelector( '[data-ce-tag="tab"]' );
			if ( el ) {
				el.classList.add( 'pbs-tab-active' );
			}
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["AOS"] = factory();
	else
		root["AOS"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /**
	                                                                                                                                                                                                                                                                   * *******************************************************
	                                                                                                                                                                                                                                                                   * AOS (Animate on scroll) - wowjs alternative
	                                                                                                                                                                                                                                                                   * made to animate elements on scroll in both directions
	                                                                                                                                                                                                                                                                   * *******************************************************
	                                                                                                                                                                                                                                                                   */

	// Modules & helpers


	var _aos = __webpack_require__(1);

	var _aos2 = _interopRequireDefault(_aos);

	var _lodash = __webpack_require__(5);

	var _lodash2 = _interopRequireDefault(_lodash);

	var _lodash3 = __webpack_require__(6);

	var _lodash4 = _interopRequireDefault(_lodash3);

	var _observer = __webpack_require__(7);

	var _observer2 = _interopRequireDefault(_observer);

	var _detector = __webpack_require__(8);

	var _detector2 = _interopRequireDefault(_detector);

	var _handleScroll = __webpack_require__(9);

	var _handleScroll2 = _interopRequireDefault(_handleScroll);

	var _prepare = __webpack_require__(10);

	var _prepare2 = _interopRequireDefault(_prepare);

	var _elements = __webpack_require__(13);

	var _elements2 = _interopRequireDefault(_elements);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	/**
	 * Private variables
	 */
	var $aosElements = [];
	var initialized = false;

	// Detect not supported browsers (<=IE9)
	// http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
	var browserNotSupported = document.all && !window.atob;

	/**
	 * Default options
	 */
	var options = {
	  offset: 120,
	  delay: 0,
	  easing: 'ease',
	  duration: 400,
	  disable: false,
	  once: false,
	  startEvent: 'DOMContentLoaded'
	};

	/**
	 * Refresh AOS
	 */
	var refresh = function refresh() {
	  var initialize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

	  // Allow refresh only when it was first initialized on startEvent
	  if (initialize) initialized = true;

	  if (initialized) {
	    // Extend elements objects in $aosElements with their positions
	    $aosElements = (0, _prepare2.default)($aosElements, options);
	    // Perform scroll event, to refresh view and show/hide elements
	    (0, _handleScroll2.default)($aosElements, options.once);

	    return $aosElements;
	  }
	};

	/**
	 * Hard refresh
	 * create array with new elements and trigger refresh
	 */
	var refreshHard = function refreshHard() {
	  $aosElements = (0, _elements2.default)();
	  refresh();
	};

	/**
	 * Disable AOS
	 * Remove all attributes to reset applied styles
	 */
	var disable = function disable() {
	  $aosElements.forEach(function (el, i) {
	    el.node.removeAttribute('data-aos');
	    el.node.removeAttribute('data-aos-easing');
	    el.node.removeAttribute('data-aos-duration');
	    el.node.removeAttribute('data-aos-delay');
	  });
	};

	/**
	 * Check if AOS should be disabled based on provided setting
	 */
	var isDisabled = function isDisabled(optionDisable) {
	  return optionDisable === true || optionDisable === 'mobile' && _detector2.default.mobile() || optionDisable === 'phone' && _detector2.default.phone() || optionDisable === 'tablet' && _detector2.default.tablet() || typeof optionDisable === 'function' && optionDisable() === true;
	};

	/**
	 * Initializing AOS
	 * - Create options merging defaults with user defined options
	 * - Set attributes on <body> as global setting - css relies on it
	 * - Attach preparing elements to options.startEvent,
	 *   window resize and orientation change
	 * - Attach function that handle scroll and everything connected to it
	 *   to window scroll event and fire once document is ready to set initial state
	 */
	var init = function init(settings) {
	  options = _extends(options, settings);

	  // Create initial array with elements -> to be fullfilled later with prepare()
	  $aosElements = (0, _elements2.default)();

	  /**
	   * Don't init plugin if option `disable` is set
	   * or when browser is not supported
	   */
	  if (isDisabled(options.disable) || browserNotSupported) {
	    return disable();
	  }

	  /**
	   * Set global settings on body, based on options
	   * so CSS can use it
	   */
	  document.querySelector('body').setAttribute('data-aos-easing', options.easing);
	  document.querySelector('body').setAttribute('data-aos-duration', options.duration);
	  document.querySelector('body').setAttribute('data-aos-delay', options.delay);

	  /**
	   * Handle initializing
	   */
	  if (options.startEvent === 'DOMContentLoaded' && ['complete', 'interactive'].indexOf(document.readyState) > -1) {
	    // Initialize AOS if default startEvent was already fired
	    refresh(true);
	  } else if (options.startEvent === 'load') {
	    // If start event is 'Load' - attach listener to window
	    window.addEventListener(options.startEvent, function () {
	      refresh(true);
	    });
	  } else {
	    // Listen to options.startEvent and initialize AOS
	    document.addEventListener(options.startEvent, function () {
	      refresh(true);
	    });
	  }

	  /**
	   * Refresh plugin on window resize or orientation change
	   */
	  window.addEventListener('resize', (0, _lodash4.default)(refresh, 50, true));
	  window.addEventListener('orientationchange', (0, _lodash4.default)(refresh, 50, true));

	  /**
	   * Handle scroll event to animate elements on scroll
	   */
	  window.addEventListener('scroll', (0, _lodash2.default)(function () {
	    (0, _handleScroll2.default)($aosElements, options.once);
	  }, 99));

	  /**
	   * Watch if nodes are removed
	   * If so refresh plugin
	   */
	  document.addEventListener('DOMNodeRemoved', function (event) {
	    var el = event.target;
	    if (el && el.nodeType === 1 && el.hasAttribute && (el.hasAttribute('data-aos') || el.hasAttribute('data-aos-js'))) {
	      (0, _lodash4.default)(refreshHard, 50, true);
	    }
	  });

	  /**
	   * Observe [aos] elements
	   * If something is loaded by AJAX
	   * it'll refresh plugin automatically
	   */
	  (0, _observer2.default)('[data-aos], [data-aos-js]', refreshHard);

	  return $aosElements;
	};

	/**
	 * Export Public API
	 */

	module.exports = {
	  init: init,
	  refresh: refresh,
	  refreshHard: refreshHard
	};

/***/ },
/* 1 */
/***/ function(module, exports) {

	// removed by extract-text-webpack-plugin

/***/ },
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	/**
	 * lodash (Custom Build) <https://lodash.com/>
	 * Build: `lodash modularize exports="npm" -o ./`
	 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
	 * Released under MIT license <https://lodash.com/license>
	 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	 */

	/** Used as the `TypeError` message for "Functions" methods. */
	var FUNC_ERROR_TEXT = 'Expected a function';

	/** Used as references for various `Number` constants. */
	var NAN = 0 / 0;

	/** `Object#toString` result references. */
	var symbolTag = '[object Symbol]';

	/** Used to match leading and trailing whitespace. */
	var reTrim = /^\s+|\s+$/g;

	/** Used to detect bad signed hexadecimal string values. */
	var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

	/** Used to detect binary string values. */
	var reIsBinary = /^0b[01]+$/i;

	/** Used to detect octal string values. */
	var reIsOctal = /^0o[0-7]+$/i;

	/** Built-in method references without a dependency on `root`. */
	var freeParseInt = parseInt;

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = (typeof global === 'undefined' ? 'undefined' : _typeof(global)) == 'object' && global && global.Object === Object && global;

	/** Detect free variable `self`. */
	var freeSelf = (typeof self === 'undefined' ? 'undefined' : _typeof(self)) == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root = freeGlobal || freeSelf || Function('return this')();

	/** Used for built-in method references. */
	var objectProto = Object.prototype;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var objectToString = objectProto.toString;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeMax = Math.max,
	    nativeMin = Math.min;

	/**
	 * Gets the timestamp of the number of milliseconds that have elapsed since
	 * the Unix epoch (1 January 1970 00:00:00 UTC).
	 *
	 * @static
	 * @memberOf _
	 * @since 2.4.0
	 * @category Date
	 * @returns {number} Returns the timestamp.
	 * @example
	 *
	 * _.defer(function(stamp) {
	 *   console.log(_.now() - stamp);
	 * }, _.now());
	 * // => Logs the number of milliseconds it took for the deferred invocation.
	 */
	var now = function now() {
	  return root.Date.now();
	};

	/**
	 * Creates a debounced function that delays invoking `func` until after `wait`
	 * milliseconds have elapsed since the last time the debounced function was
	 * invoked. The debounced function comes with a `cancel` method to cancel
	 * delayed `func` invocations and a `flush` method to immediately invoke them.
	 * Provide `options` to indicate whether `func` should be invoked on the
	 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
	 * with the last arguments provided to the debounced function. Subsequent
	 * calls to the debounced function return the result of the last `func`
	 * invocation.
	 *
	 * **Note:** If `leading` and `trailing` options are `true`, `func` is
	 * invoked on the trailing edge of the timeout only if the debounced function
	 * is invoked more than once during the `wait` timeout.
	 *
	 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
	 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
	 *
	 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
	 * for details over the differences between `_.debounce` and `_.throttle`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Function
	 * @param {Function} func The function to debounce.
	 * @param {number} [wait=0] The number of milliseconds to delay.
	 * @param {Object} [options={}] The options object.
	 * @param {boolean} [options.leading=false]
	 *  Specify invoking on the leading edge of the timeout.
	 * @param {number} [options.maxWait]
	 *  The maximum time `func` is allowed to be delayed before it's invoked.
	 * @param {boolean} [options.trailing=true]
	 *  Specify invoking on the trailing edge of the timeout.
	 * @returns {Function} Returns the new debounced function.
	 * @example
	 *
	 * // Avoid costly calculations while the window size is in flux.
	 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
	 *
	 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
	 * jQuery(element).on('click', _.debounce(sendMail, 300, {
	 *   'leading': true,
	 *   'trailing': false
	 * }));
	 *
	 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
	 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
	 * var source = new EventSource('/stream');
	 * jQuery(source).on('message', debounced);
	 *
	 * // Cancel the trailing debounced invocation.
	 * jQuery(window).on('popstate', debounced.cancel);
	 */
	function debounce(func, wait, options) {
	  var lastArgs,
	      lastThis,
	      maxWait,
	      result,
	      timerId,
	      lastCallTime,
	      lastInvokeTime = 0,
	      leading = false,
	      maxing = false,
	      trailing = true;

	  if (typeof func != 'function') {
	    throw new TypeError(FUNC_ERROR_TEXT);
	  }
	  wait = toNumber(wait) || 0;
	  if (isObject(options)) {
	    leading = !!options.leading;
	    maxing = 'maxWait' in options;
	    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
	    trailing = 'trailing' in options ? !!options.trailing : trailing;
	  }

	  function invokeFunc(time) {
	    var args = lastArgs,
	        thisArg = lastThis;

	    lastArgs = lastThis = undefined;
	    lastInvokeTime = time;
	    result = func.apply(thisArg, args);
	    return result;
	  }

	  function leadingEdge(time) {
	    // Reset any `maxWait` timer.
	    lastInvokeTime = time;
	    // Start the timer for the trailing edge.
	    timerId = setTimeout(timerExpired, wait);
	    // Invoke the leading edge.
	    return leading ? invokeFunc(time) : result;
	  }

	  function remainingWait(time) {
	    var timeSinceLastCall = time - lastCallTime,
	        timeSinceLastInvoke = time - lastInvokeTime,
	        result = wait - timeSinceLastCall;

	    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
	  }

	  function shouldInvoke(time) {
	    var timeSinceLastCall = time - lastCallTime,
	        timeSinceLastInvoke = time - lastInvokeTime;

	    // Either this is the first call, activity has stopped and we're at the
	    // trailing edge, the system time has gone backwards and we're treating
	    // it as the trailing edge, or we've hit the `maxWait` limit.
	    return lastCallTime === undefined || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
	  }

	  function timerExpired() {
	    var time = now();
	    if (shouldInvoke(time)) {
	      return trailingEdge(time);
	    }
	    // Restart the timer.
	    timerId = setTimeout(timerExpired, remainingWait(time));
	  }

	  function trailingEdge(time) {
	    timerId = undefined;

	    // Only invoke if we have `lastArgs` which means `func` has been
	    // debounced at least once.
	    if (trailing && lastArgs) {
	      return invokeFunc(time);
	    }
	    lastArgs = lastThis = undefined;
	    return result;
	  }

	  function cancel() {
	    if (timerId !== undefined) {
	      clearTimeout(timerId);
	    }
	    lastInvokeTime = 0;
	    lastArgs = lastCallTime = lastThis = timerId = undefined;
	  }

	  function flush() {
	    return timerId === undefined ? result : trailingEdge(now());
	  }

	  function debounced() {
	    var time = now(),
	        isInvoking = shouldInvoke(time);

	    lastArgs = arguments;
	    lastThis = this;
	    lastCallTime = time;

	    if (isInvoking) {
	      if (timerId === undefined) {
	        return leadingEdge(lastCallTime);
	      }
	      if (maxing) {
	        // Handle invocations in a tight loop.
	        timerId = setTimeout(timerExpired, wait);
	        return invokeFunc(lastCallTime);
	      }
	    }
	    if (timerId === undefined) {
	      timerId = setTimeout(timerExpired, wait);
	    }
	    return result;
	  }
	  debounced.cancel = cancel;
	  debounced.flush = flush;
	  return debounced;
	}

	/**
	 * Creates a throttled function that only invokes `func` at most once per
	 * every `wait` milliseconds. The throttled function comes with a `cancel`
	 * method to cancel delayed `func` invocations and a `flush` method to
	 * immediately invoke them. Provide `options` to indicate whether `func`
	 * should be invoked on the leading and/or trailing edge of the `wait`
	 * timeout. The `func` is invoked with the last arguments provided to the
	 * throttled function. Subsequent calls to the throttled function return the
	 * result of the last `func` invocation.
	 *
	 * **Note:** If `leading` and `trailing` options are `true`, `func` is
	 * invoked on the trailing edge of the timeout only if the throttled function
	 * is invoked more than once during the `wait` timeout.
	 *
	 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
	 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
	 *
	 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
	 * for details over the differences between `_.throttle` and `_.debounce`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Function
	 * @param {Function} func The function to throttle.
	 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
	 * @param {Object} [options={}] The options object.
	 * @param {boolean} [options.leading=true]
	 *  Specify invoking on the leading edge of the timeout.
	 * @param {boolean} [options.trailing=true]
	 *  Specify invoking on the trailing edge of the timeout.
	 * @returns {Function} Returns the new throttled function.
	 * @example
	 *
	 * // Avoid excessively updating the position while scrolling.
	 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
	 *
	 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
	 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
	 * jQuery(element).on('click', throttled);
	 *
	 * // Cancel the trailing throttled invocation.
	 * jQuery(window).on('popstate', throttled.cancel);
	 */
	function throttle(func, wait, options) {
	  var leading = true,
	      trailing = true;

	  if (typeof func != 'function') {
	    throw new TypeError(FUNC_ERROR_TEXT);
	  }
	  if (isObject(options)) {
	    leading = 'leading' in options ? !!options.leading : leading;
	    trailing = 'trailing' in options ? !!options.trailing : trailing;
	  }
	  return debounce(func, wait, {
	    'leading': leading,
	    'maxWait': wait,
	    'trailing': trailing
	  });
	}

	/**
	 * Checks if `value` is the
	 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
	 * @example
	 *
	 * _.isObject({});
	 * // => true
	 *
	 * _.isObject([1, 2, 3]);
	 * // => true
	 *
	 * _.isObject(_.noop);
	 * // => true
	 *
	 * _.isObject(null);
	 * // => false
	 */
	function isObject(value) {
	  var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);
	  return !!value && (type == 'object' || type == 'function');
	}

	/**
	 * Checks if `value` is object-like. A value is object-like if it's not `null`
	 * and has a `typeof` result of "object".
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	 * @example
	 *
	 * _.isObjectLike({});
	 * // => true
	 *
	 * _.isObjectLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isObjectLike(_.noop);
	 * // => false
	 *
	 * _.isObjectLike(null);
	 * // => false
	 */
	function isObjectLike(value) {
	  return !!value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) == 'object';
	}

	/**
	 * Checks if `value` is classified as a `Symbol` primitive or object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	 * @example
	 *
	 * _.isSymbol(Symbol.iterator);
	 * // => true
	 *
	 * _.isSymbol('abc');
	 * // => false
	 */
	function isSymbol(value) {
	  return (typeof value === 'undefined' ? 'undefined' : _typeof(value)) == 'symbol' || isObjectLike(value) && objectToString.call(value) == symbolTag;
	}

	/**
	 * Converts `value` to a number.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to process.
	 * @returns {number} Returns the number.
	 * @example
	 *
	 * _.toNumber(3.2);
	 * // => 3.2
	 *
	 * _.toNumber(Number.MIN_VALUE);
	 * // => 5e-324
	 *
	 * _.toNumber(Infinity);
	 * // => Infinity
	 *
	 * _.toNumber('3.2');
	 * // => 3.2
	 */
	function toNumber(value) {
	  if (typeof value == 'number') {
	    return value;
	  }
	  if (isSymbol(value)) {
	    return NAN;
	  }
	  if (isObject(value)) {
	    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
	    value = isObject(other) ? other + '' : other;
	  }
	  if (typeof value != 'string') {
	    return value === 0 ? value : +value;
	  }
	  value = value.replace(reTrim, '');
	  var isBinary = reIsBinary.test(value);
	  return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
	}

	module.exports = throttle;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 6 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	/**
	 * lodash (Custom Build) <https://lodash.com/>
	 * Build: `lodash modularize exports="npm" -o ./`
	 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
	 * Released under MIT license <https://lodash.com/license>
	 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	 */

	/** Used as the `TypeError` message for "Functions" methods. */
	var FUNC_ERROR_TEXT = 'Expected a function';

	/** Used as references for various `Number` constants. */
	var NAN = 0 / 0;

	/** `Object#toString` result references. */
	var symbolTag = '[object Symbol]';

	/** Used to match leading and trailing whitespace. */
	var reTrim = /^\s+|\s+$/g;

	/** Used to detect bad signed hexadecimal string values. */
	var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

	/** Used to detect binary string values. */
	var reIsBinary = /^0b[01]+$/i;

	/** Used to detect octal string values. */
	var reIsOctal = /^0o[0-7]+$/i;

	/** Built-in method references without a dependency on `root`. */
	var freeParseInt = parseInt;

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = (typeof global === 'undefined' ? 'undefined' : _typeof(global)) == 'object' && global && global.Object === Object && global;

	/** Detect free variable `self`. */
	var freeSelf = (typeof self === 'undefined' ? 'undefined' : _typeof(self)) == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root = freeGlobal || freeSelf || Function('return this')();

	/** Used for built-in method references. */
	var objectProto = Object.prototype;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var objectToString = objectProto.toString;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeMax = Math.max,
	    nativeMin = Math.min;

	/**
	 * Gets the timestamp of the number of milliseconds that have elapsed since
	 * the Unix epoch (1 January 1970 00:00:00 UTC).
	 *
	 * @static
	 * @memberOf _
	 * @since 2.4.0
	 * @category Date
	 * @returns {number} Returns the timestamp.
	 * @example
	 *
	 * _.defer(function(stamp) {
	 *   console.log(_.now() - stamp);
	 * }, _.now());
	 * // => Logs the number of milliseconds it took for the deferred invocation.
	 */
	var now = function now() {
	  return root.Date.now();
	};

	/**
	 * Creates a debounced function that delays invoking `func` until after `wait`
	 * milliseconds have elapsed since the last time the debounced function was
	 * invoked. The debounced function comes with a `cancel` method to cancel
	 * delayed `func` invocations and a `flush` method to immediately invoke them.
	 * Provide `options` to indicate whether `func` should be invoked on the
	 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
	 * with the last arguments provided to the debounced function. Subsequent
	 * calls to the debounced function return the result of the last `func`
	 * invocation.
	 *
	 * **Note:** If `leading` and `trailing` options are `true`, `func` is
	 * invoked on the trailing edge of the timeout only if the debounced function
	 * is invoked more than once during the `wait` timeout.
	 *
	 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
	 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
	 *
	 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
	 * for details over the differences between `_.debounce` and `_.throttle`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Function
	 * @param {Function} func The function to debounce.
	 * @param {number} [wait=0] The number of milliseconds to delay.
	 * @param {Object} [options={}] The options object.
	 * @param {boolean} [options.leading=false]
	 *  Specify invoking on the leading edge of the timeout.
	 * @param {number} [options.maxWait]
	 *  The maximum time `func` is allowed to be delayed before it's invoked.
	 * @param {boolean} [options.trailing=true]
	 *  Specify invoking on the trailing edge of the timeout.
	 * @returns {Function} Returns the new debounced function.
	 * @example
	 *
	 * // Avoid costly calculations while the window size is in flux.
	 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
	 *
	 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
	 * jQuery(element).on('click', _.debounce(sendMail, 300, {
	 *   'leading': true,
	 *   'trailing': false
	 * }));
	 *
	 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
	 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
	 * var source = new EventSource('/stream');
	 * jQuery(source).on('message', debounced);
	 *
	 * // Cancel the trailing debounced invocation.
	 * jQuery(window).on('popstate', debounced.cancel);
	 */
	function debounce(func, wait, options) {
	  var lastArgs,
	      lastThis,
	      maxWait,
	      result,
	      timerId,
	      lastCallTime,
	      lastInvokeTime = 0,
	      leading = false,
	      maxing = false,
	      trailing = true;

	  if (typeof func != 'function') {
	    throw new TypeError(FUNC_ERROR_TEXT);
	  }
	  wait = toNumber(wait) || 0;
	  if (isObject(options)) {
	    leading = !!options.leading;
	    maxing = 'maxWait' in options;
	    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
	    trailing = 'trailing' in options ? !!options.trailing : trailing;
	  }

	  function invokeFunc(time) {
	    var args = lastArgs,
	        thisArg = lastThis;

	    lastArgs = lastThis = undefined;
	    lastInvokeTime = time;
	    result = func.apply(thisArg, args);
	    return result;
	  }

	  function leadingEdge(time) {
	    // Reset any `maxWait` timer.
	    lastInvokeTime = time;
	    // Start the timer for the trailing edge.
	    timerId = setTimeout(timerExpired, wait);
	    // Invoke the leading edge.
	    return leading ? invokeFunc(time) : result;
	  }

	  function remainingWait(time) {
	    var timeSinceLastCall = time - lastCallTime,
	        timeSinceLastInvoke = time - lastInvokeTime,
	        result = wait - timeSinceLastCall;

	    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
	  }

	  function shouldInvoke(time) {
	    var timeSinceLastCall = time - lastCallTime,
	        timeSinceLastInvoke = time - lastInvokeTime;

	    // Either this is the first call, activity has stopped and we're at the
	    // trailing edge, the system time has gone backwards and we're treating
	    // it as the trailing edge, or we've hit the `maxWait` limit.
	    return lastCallTime === undefined || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
	  }

	  function timerExpired() {
	    var time = now();
	    if (shouldInvoke(time)) {
	      return trailingEdge(time);
	    }
	    // Restart the timer.
	    timerId = setTimeout(timerExpired, remainingWait(time));
	  }

	  function trailingEdge(time) {
	    timerId = undefined;

	    // Only invoke if we have `lastArgs` which means `func` has been
	    // debounced at least once.
	    if (trailing && lastArgs) {
	      return invokeFunc(time);
	    }
	    lastArgs = lastThis = undefined;
	    return result;
	  }

	  function cancel() {
	    if (timerId !== undefined) {
	      clearTimeout(timerId);
	    }
	    lastInvokeTime = 0;
	    lastArgs = lastCallTime = lastThis = timerId = undefined;
	  }

	  function flush() {
	    return timerId === undefined ? result : trailingEdge(now());
	  }

	  function debounced() {
	    var time = now(),
	        isInvoking = shouldInvoke(time);

	    lastArgs = arguments;
	    lastThis = this;
	    lastCallTime = time;

	    if (isInvoking) {
	      if (timerId === undefined) {
	        return leadingEdge(lastCallTime);
	      }
	      if (maxing) {
	        // Handle invocations in a tight loop.
	        timerId = setTimeout(timerExpired, wait);
	        return invokeFunc(lastCallTime);
	      }
	    }
	    if (timerId === undefined) {
	      timerId = setTimeout(timerExpired, wait);
	    }
	    return result;
	  }
	  debounced.cancel = cancel;
	  debounced.flush = flush;
	  return debounced;
	}

	/**
	 * Checks if `value` is the
	 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
	 * @example
	 *
	 * _.isObject({});
	 * // => true
	 *
	 * _.isObject([1, 2, 3]);
	 * // => true
	 *
	 * _.isObject(_.noop);
	 * // => true
	 *
	 * _.isObject(null);
	 * // => false
	 */
	function isObject(value) {
	  var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);
	  return !!value && (type == 'object' || type == 'function');
	}

	/**
	 * Checks if `value` is object-like. A value is object-like if it's not `null`
	 * and has a `typeof` result of "object".
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	 * @example
	 *
	 * _.isObjectLike({});
	 * // => true
	 *
	 * _.isObjectLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isObjectLike(_.noop);
	 * // => false
	 *
	 * _.isObjectLike(null);
	 * // => false
	 */
	function isObjectLike(value) {
	  return !!value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) == 'object';
	}

	/**
	 * Checks if `value` is classified as a `Symbol` primitive or object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	 * @example
	 *
	 * _.isSymbol(Symbol.iterator);
	 * // => true
	 *
	 * _.isSymbol('abc');
	 * // => false
	 */
	function isSymbol(value) {
	  return (typeof value === 'undefined' ? 'undefined' : _typeof(value)) == 'symbol' || isObjectLike(value) && objectToString.call(value) == symbolTag;
	}

	/**
	 * Converts `value` to a number.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to process.
	 * @returns {number} Returns the number.
	 * @example
	 *
	 * _.toNumber(3.2);
	 * // => 3.2
	 *
	 * _.toNumber(Number.MIN_VALUE);
	 * // => 5e-324
	 *
	 * _.toNumber(Infinity);
	 * // => Infinity
	 *
	 * _.toNumber('3.2');
	 * // => 3.2
	 */
	function toNumber(value) {
	  if (typeof value == 'number') {
	    return value;
	  }
	  if (isSymbol(value)) {
	    return NAN;
	  }
	  if (isObject(value)) {
	    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
	    value = isObject(other) ? other + '' : other;
	  }
	  if (typeof value != 'string') {
	    return value === 0 ? value : +value;
	  }
	  value = value.replace(reTrim, '');
	  var isBinary = reIsBinary.test(value);
	  return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
	}

	module.exports = debounce;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 7 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	var doc = window.document;
	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

	var listeners = [];
	var observer = void 0;

	function ready(selector, fn) {
	  // Store the selector and callback to be monitored
	  listeners.push({
	    selector: selector,
	    fn: fn
	  });

	  if (!observer && MutationObserver) {
	    // Watch for changes in the document
	    observer = new MutationObserver(check);
	    observer.observe(doc.documentElement, {
	      childList: true,
	      subtree: true,
	      removedNodes: true
	    });
	  }
	  // Check if the element is currently in the DOM
	  check();
	}

	function check() {
	  // Check the DOM for elements matching a stored selector
	  for (var i = 0, len = listeners.length, listener, elements; i < len; i++) {
	    listener = listeners[i];
	    // Query for elements matching the specified selector
	    elements = doc.querySelectorAll(listener.selector);
	    for (var j = 0, jLen = elements.length, element; j < jLen; j++) {
	      element = elements[j];
	      // Make sure the callback isn't invoked with the
	      // same element more than once
	      if (!element.ready) {
	        element.ready = true;
	        // Invoke the callback with the element
	        listener.fn.call(element, element);
	      }
	    }
	  }
	}

	exports.default = ready;

/***/ },
/* 8 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/**
	 * Device detector
	 */
	var Detector = function () {
	  function Detector() {
	    _classCallCheck(this, Detector);
	  }

	  _createClass(Detector, [{
	    key: "phone",
	    value: function phone() {
	      var check = false;
	      (function (a) {
	        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
	      })(navigator.userAgent || navigator.vendor || window.opera);
	      return check;
	    }
	  }, {
	    key: "mobile",
	    value: function mobile() {
	      var check = false;
	      (function (a) {
	        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
	      })(navigator.userAgent || navigator.vendor || window.opera);
	      return check;
	    }
	  }, {
	    key: "tablet",
	    value: function tablet() {
	      return this.mobile() && !this.phone();
	    }
	  }]);

	  return Detector;
	}();

	;

	exports.default = new Detector();

/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	/**
	 * Set or remove aos-animate class
	 * @param {node} el         element
	 * @param {int}  top        scrolled distance
	 * @param {void} once
	 */
	var setState = function setState(el, top, once) {
	  var attrOnce = el.node.getAttribute('data-aos-once');

	  if (top > el.position) {
	    if (el.node.hasAttribute('data-aos-js') && !el.node._aosjsDispatched) {
	      window.dispatchEvent(new CustomEvent('pbs.aos.animate', { detail: el.node }));
	      el.node._aosjsDispatched = true;
	    }
	    el.node.classList.add('aos-animate');
	  } else if (typeof attrOnce !== 'undefined') {
	    if (attrOnce === 'false' || !once && attrOnce !== 'true') {
	      el.node.classList.remove('aos-animate');
	    }
	  }
	};

	/**
	 * Scroll logic - add or remove 'aos-animate' class on scroll
	 *
	 * @param  {array} $elements         array of elements nodes
	 * @param  {bool} once               plugin option
	 * @return {void}
	 */
	var handleScroll = function handleScroll($elements, once) {
	  var scrollTop = window.pageYOffset;
	  var windowHeight = window.innerHeight;
	  /**
	   * Check all registered elements positions
	   * and animate them on scroll
	   */
	  $elements.forEach(function (el, i) {
	    setState(el, windowHeight + scrollTop, once);
	  });
	};

	exports.default = handleScroll;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _calculateOffset = __webpack_require__(11);

	var _calculateOffset2 = _interopRequireDefault(_calculateOffset);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var prepare = function prepare($elements, options) {
	  $elements.forEach(function (el, i) {
	    el.node.classList.add('aos-init');
	    el.position = (0, _calculateOffset2.default)(el.node, options.offset);
	  });
	  return $elements;
	}; /* Clearing variables */

	exports.default = prepare;

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _offset = __webpack_require__(12);

	var _offset2 = _interopRequireDefault(_offset);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var calculateOffset = function calculateOffset(el, optionalOffset) {
	  var elementOffsetTop = 0;
	  var additionalOffset = 0;
	  var windowHeight = window.innerHeight;
	  var attrs = {
	    offset: el.getAttribute('data-aos-offset'),
	    anchor: el.getAttribute('data-aos-anchor'),
	    anchorPlacement: el.getAttribute('data-aos-anchor-placement')
	  };

	  if (attrs.offset && !isNaN(attrs.offset)) {
	    additionalOffset = parseInt(attrs.offset);
	  }

	  if (attrs.anchor && document.querySelectorAll(attrs.anchor)) {
	    el = document.querySelectorAll(attrs.anchor)[0];
	  }

	  elementOffsetTop = (0, _offset2.default)(el).top;

	  switch (attrs.anchorPlacement) {
	    case 'top-bottom':
	      // Default offset
	      break;
	    case 'center-bottom':
	      elementOffsetTop += el.offsetHeight / 2;
	      break;
	    case 'bottom-bottom':
	      elementOffsetTop += el.offsetHeight;
	      break;
	    case 'top-center':
	      elementOffsetTop += windowHeight / 2;
	      break;
	    case 'bottom-center':
	      elementOffsetTop += windowHeight / 2 + el.offsetHeight;
	      break;
	    case 'center-center':
	      elementOffsetTop += windowHeight / 2 + el.offsetHeight / 2;
	      break;
	    case 'top-top':
	      elementOffsetTop += windowHeight;
	      break;
	    case 'bottom-top':
	      elementOffsetTop += el.offsetHeight + windowHeight;
	      break;
	    case 'center-top':
	      elementOffsetTop += el.offsetHeight / 2 + windowHeight;
	      break;
	  }

	  if (!attrs.anchorPlacement && !attrs.offset && !isNaN(optionalOffset)) {
	    additionalOffset = optionalOffset;
	  }

	  return elementOffsetTop + additionalOffset;
	}; /**
	    * Calculate offset
	    * basing on element's settings like:
	    * - anchor
	    * - offset
	    *
	    * @param  {Node} el [Dom element]
	    * @return {Integer} [Final offset that will be used to trigger animation in good position]
	    */

	exports.default = calculateOffset;

/***/ },
/* 12 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	/**
	 * Get offset of DOM element Helper
	 * including these with translation
	 *
	 * @param  {Node} el [DOM element]
	 * @return {Object} [top and left offset]
	 */
	var offset = function offset(el) {
	  var _x = 0;
	  var _y = 0;

	  while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
	    _x += el.offsetLeft - (el.tagName != 'BODY' ? el.scrollLeft : 0);
	    _y += el.offsetTop - (el.tagName != 'BODY' ? el.scrollTop : 0);
	    el = el.offsetParent;
	  }

	  return {
	    top: _y,
	    left: _x
	  };
	};

	exports.default = offset;

/***/ },
/* 13 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	/**
	 * Generate initial array with elements as objects
	 * This array will be extended later with elements attributes values
	 * like 'position'
	 */
	var createArrayWithElements = function createArrayWithElements(elements) {
	  elements = elements || document.querySelectorAll('[data-aos], [data-aos-js]');
	  var finalElements = [];

	  [].forEach.call(elements, function (el, i) {
	    finalElements.push({
	      node: el
	    });
	  });

	  return finalElements;
	};

	exports.default = createArrayWithElements;

/***/ }
/******/ ])
});
;
//# sourceMappingURL=aos.js.map

/* globals AOS */
( function() {
	var ready = function() {
		setTimeout( function() {
			if ( 'undefined' !== typeof AOS ) {
				AOS.init( {
					disable: 'mobile'
				} );
			}
		}, 300 );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

( function() {
	var ready = function() {
		document.addEventListener( 'change', function( ev ) {
			var row, endHeight, startHeight;

			if ( 'toggleradio' === ev.target.getAttribute( 'data-ce-tag' ) ) {

				row = ev.target.parentNode.querySelector( '.pbs-row' );
				if ( ev.target.checked ) {

					// Show the content.
					row.style.webkitTransition = '';
					row.style.mozTransition = '';
					row.style.msTransition = '';
					row.style.transition = '';
					row.style.height = 'auto';
					endHeight = getComputedStyle( row ).height;
					row.style.height = '0px';
					row.offsetHeight; // Force repaint.
					row.style.webkitTransition = 'all .3s ease-in-out';
					row.style.mozTransition = 'all .3s ease-in-out';
					row.style.msTransition = 'all .3s ease-in-out';
					row.style.transition = 'all .3s ease-in-out';
					row.style.height = endHeight;

				} else {

					// Hide the content.
					row.style.webkitTransition = '';
					row.style.mozTransition = '';
					row.style.msTransition = '';
					row.style.transition = '';
					row.style.height = 'auto';
					startHeight = getComputedStyle( row ).height;
					row.style.height = startHeight;
					row.offsetHeight; // Force repaint.
					row.style.webkitTransition = 'all .3s ease-in-out';
					row.style.mozTransition = 'all .3s ease-in-out';
					row.style.msTransition = 'all .3s ease-in-out';
					row.style.transition = 'all .3s ease-in-out';
					row.style.height = '0px';
				}

				row.addEventListener( 'transitionend', function transitionEnd( event ) {
					if ( 'height' === event.propertyName ) {
						this.style.webkitTransition = '';
						this.style.mozTransition = '';
						this.style.msTransition = '';
						this.style.transition = '';
						this.style.height = '';
						this.removeEventListener( 'transitionend', transitionEnd, false );
					}
				}, false );
			}
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * Stops a currently running count up.
 */
window.pbsStopCountUp = function( element ) {
	clearTimeout( element.countUpTimeout );
	if ( element._countUpOrigInnerHTML ) {
		element.innerHTML = element._countUpOrigInnerHTML;
		element._countUpOrigInnerHTML = undefined;
	}
	element.style.visibility = '';
};

/**
 * Stops all counting.
 */
window.pbsStopAllCountUp = function() {
	var elements = document.querySelectorAll( '[data-pbs-count-up]' );
	Array.prototype.forEach.call( elements, function( el ) {
		window.pbsStopCountUp( el );
	} );
};

/**
 * Initialize an element to begin counting up.
 */
window.pbsInitCountUp = function( el ) {

	var lang, time, delay, divisions, splitValues, nums, k, i, num, isComma;
	var isFloat, decimalPlaces, val, newNum, output;

	window.pbsStopCountUp( el );

	// If no number, don't do anything.
	if ( ! /[0-9]/.test( el.innerHTML ) ) {
		return;
	}

	// Remember the element.
	el._countUpOrigInnerHTML = el.innerHTML;

	// Check location language.
	lang = document.querySelector( 'html' ).getAttribute( 'lang' ) || undefined;

	// Get the given time and delay by their attributes.
	time = el.getAttribute( 'data-cu-time' );
	delay = el.getAttribute( 'data-cu-delay' );

	// Number of times the number will change.
	divisions = time / delay;

	// Split numbers and html tags.
	splitValues = el.innerHTML.split( /(<[^>]+>|[0-9.][,.0-9]*[0-9]*)/ );

	// Contains all numbers to be displayed.
	nums = [];

	// Set blank strings to ready the split values.
	for ( k = 0; k < divisions; k++ ) {
		nums.push( '' );
	}

	// Loop through all numbers and html tags.
	for ( i = 0; i < splitValues.length; i++ ) {

		// If number split it into smaller numbers and insert it to nums.
		if ( /([0-9.][,.0-9]*[0-9]*)/.test( splitValues[ i ] ) && ! /<[^>]+>/.test( splitValues[ i ] ) ) {
			num = splitValues[ i ];

			// Test if numbers have comma.
			isComma = /[0-9]+,[0-9]+/.test( num );

			// Remove comma for computation purposes.
			num = num.replace( /,/g, '' );

			// Test if values have point.
			isFloat = /^[0-9]+\.[0-9]+$/.test( num );

			// Check number of decimals places.
			decimalPlaces = isFloat ? ( num.split( '.' )[1] || [] ).length : 0;

			// Start adding numbers from the end.
			k = nums.length - 1;

			// Create small numbers
			for ( val = divisions; val >= 1; val-- ) {
				newNum = parseInt( num / divisions * val, 10 );

				// If has decimal point, add it again.
				if ( isFloat ) {
					newNum = parseFloat( num / divisions * val ).toFixed( decimalPlaces );
					newNum = parseFloat( newNum ).toLocaleString( lang );
				}

				// If has comma, add it again.
				if ( isComma ) {
					newNum = newNum.toLocaleString( lang );
				}

				// Insert all small numbers.
				nums[ k-- ] += newNum;

			}
		} else {

			// Insert all non-numbers in the same place.
			for ( k = 0; k < divisions; k++ ) {
				nums[ k ] += splitValues[ i ];
			}
		}
	}

	// The last value of the element should be the original one.
	nums[ nums.length - 1 ]  = el.innerHTML;

	el.innerHTML = nums[0];
	el.style.visibility = 'visible';

	// Function for displaying output with the set time and delay.
	output = function() {
		el.innerHTML = nums.shift();
		if ( nums.length ) {
			clearTimeout( el.countUpTimeout );
			el.countUpTimeout = setTimeout( output, delay );
		} else {
			el._countUpOrigInnerHTML = undefined;
		}
	};
	el.countUpTimeout = setTimeout( output, delay );
};

/**
 * Initialize all elements to count up.
 */
window.pbsInitAllCountUp = function() {
	var elements = document.querySelectorAll( '[data-pbs-count-up]' );
	Array.prototype.forEach.call( elements, function( el ) {
		window.pbsInitCountUp( el );
	} );
};

/**
 * Initialize on start up.
 */
window.addEventListener( 'pbs.aos.animate', function( el ) {
	if ( el.detail.getAttribute( 'data-pbs-count-up' ) ) {
		window.pbsInitCountUp( el.detail );
	}
} );

/**
 * Bring back the visibility on the start.
 */
( function() {
	var ready = function() {
		var elements = document.querySelectorAll( '[data-pbs-count-up]' );
		Array.prototype.forEach.call( elements, function( el ) {
			el.style.visibility = '';
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/*! fluidvids.js v2.4.1 | (c) 2014 @toddmotto | https://github.com/toddmotto/fluidvids */

/* globals define, module */

( function( root, factory ) {
  if ( 'function' === typeof define && define.amd ) {
    define( factory );
} else if ( 'object' === typeof exports ) {
    module.exports = factory;
  } else {
    root.fluidvids = factory();
  }
} )( this, function() {

  'use strict';

  var fluidvids = {
    selector: ['iframe', 'object'],
    players: ['www.youtube.com', 'player.vimeo.com']
  };

  var css = [
    '.fluidvids {',
      'width: 100%; max-width: 100%; position: relative;',
    '}',
    '.fluidvids-item {',
      'position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;',
    '}'
  ].join( '' );

  var head = document.head || document.getElementsByTagName( 'head' )[0];

  function matches ( src ) {
    return new RegExp( '^(https?:)?\/\/(?:' + fluidvids.players.join( '|' ) + ').*$', 'i' ).test( src );
  }

  function getRatio ( height, width ) {
    return ( ( parseInt( height, 10 ) / parseInt( width, 10 ) ) * 100 ) + '%';
  }

  function fluid ( elem ) {
	  var wrap;
    if ( ! matches( elem.src ) && ! matches( elem.data ) || !! elem.getAttribute( 'data-fluidvids' ) ) {
		return;
	}
	wrap = document.createElement( 'div' );
    elem.parentNode.insertBefore( wrap, elem );
    elem.className += ( elem.className ? ' ' : '' ) + 'fluidvids-item';
    elem.setAttribute( 'data-fluidvids', 'loaded' );
    wrap.className += 'fluidvids';
    wrap.style.paddingTop = getRatio( elem.height, elem.width );
    wrap.appendChild( elem );
  }

  function addStyles () {
    var div = document.createElement( 'div' );
    div.innerHTML = '<p>x</p><style>' + css + '</style>';
    head.appendChild( div.childNodes[1] );
  }

  fluidvids.render = function() {
    var nodes = document.querySelectorAll( fluidvids.selector.join() );
    var i = nodes.length;
    while ( i-- ) {
      fluid( nodes[i] );
    }
  };

  fluidvids.init = function( obj ) {
	  var key;
    for ( key in obj ) {
      fluidvids[key] = obj[key];
    }
    fluidvids.render();
    addStyles();
  };

  return fluidvids;

} );

/* globals fluidvids */

// Call Twitter API when the CT editor saves/stops because Twitter's iframe doesn't have a src.
( function() {
	var ready = function() {
		if ( 'undefined' !== typeof fluidvids ) {
			setTimeout( function() {
				fluidvids.init( {
				  selector: [

					  // Compatible with themes that define Jetpack's responsive video functionality.
					  '.pbs-main-wrapper *:not(.pbs-video-bg):not(.jetpack-video-wrapper) iframe:not([id*="pbs-video-bg"])',
					  '.pbs-main-wrapper *:not(.pbs-video-bg):not(.jetpack-video-wrapper) object:not([id*="pbs-video-bg"])'
				  ],
				  players: [
					  'www.youtube.com',
					  'player.vimeo.com',
					  'fast.wistia.net'
				  ]
				} );
			}, 1 );
		}
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals pbsFrontendParams */
( function() {
	var ready = function() {

		var mainContainer, style, columns;

		// Columns can contain spaces, we remove those so that the
		// CSS :empty rules can apply to columns.
		columns = document.querySelectorAll( '.pbs-col' );
		Array.prototype.forEach.call( columns, function( el ) {
			if ( el.innerHTML.match( /^\s*$/gi ) ) {
				el.innerHTML = '';
			}
		} );

		// Forced overflow.
		if ( pbsFrontendParams.force_overflow ) {
			mainContainer = document.querySelector( '.pbs-main-wrapper' );
			while ( mainContainer && 'BODY' !== mainContainer.tagName ) {
				style = getComputedStyle( mainContainer );
				if ( 'hidden' === style.overflow ) {
					mainContainer.style.overflow = 'visible';
				}
				mainContainer = mainContainer.parentNode;
			}
		}
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

window.pbsSwitchResponsiveStylesFrontend = function( screenSize, oldScreenSize ) {

	var styles, sizes, style, selector, i, elements;

	// Only do this if we have PBS in the page.
	if ( ! document.querySelector( '.pbs-main-wrapper' ) ) {
		return;
	}

	// Don't do anything if we're still in the same screen size.
	if ( screenSize === oldScreenSize ) {
		return;
	}

	// Don't do this while editing, because we have our own switcher there
	// that's specific for the editor.
	if ( typeof PBS !== 'undefined' && PBS.isEditing ) {
		return;
	}

	// All our styles.
	styles = {
		'margin-top': '.pbs-main-wrapper [style*="margin:"], .pbs-main-wrapper [style*="margin-top:"]',
		'margin-bottom': '.pbs-main-wrapper [style*="margin:"], .pbs-main-wrapper [style*="margin-bottom:"]'
	};

	// The different non-desktop screen sizes.
	sizes = ['tablet', 'phone'];

	for ( style in styles ) {
		if ( ! styles.hasOwnProperty( style ) ) {
			continue;
		}

		// Selector for all the different styles we need to switch out.
		selector = styles[ style ];
		for ( i = 0; i < sizes.length; i++ ) {
			selector += ', [data-pbs-' + sizes[ i ] + '-' + style + ']';
		}

		// Loop through all the affected elements and switch out the styles.
		elements = document.querySelectorAll( selector );
		Array.prototype.forEach.call( elements, function( element ) { // jshint ignore:line
			if ( element.style[ style ] ) {
				element.setAttribute( 'data-pbs-' + oldScreenSize + '-' + style, element.style[ style ] );
			}
			if ( element.getAttribute( 'data-pbs-' + screenSize + '-' + style ) ) {
				element.style[ style ] = element.getAttribute( 'data-pbs-' + screenSize + '-' + style );
			} else if ( 'phone' === screenSize && element.getAttribute( 'data-pbs-tablet-' + style ) ) {
				element.style[ style ] = element.getAttribute( 'data-pbs-tablet-' + style );
			} else if ( element.getAttribute( 'data-pbs-desktop-' + style ) ) {
				element.style[ style ] = element.getAttribute( 'data-pbs-desktop-' + style );
			} else {
				element.style[ style ] = '';
			}

		} );

		// After switching and we end up in the desktop view, remove the desktop attribute
		// because we don't need to keep it.
		if ( 'desktop' === screenSize ) {
			elements = document.querySelectorAll( '[data-pbs-' + screenSize + '-' + style + ']' );
			Array.prototype.forEach.call( elements, function( element ) { // jshint ignore:line
				element.removeAttribute( 'data-pbs-' + screenSize + '-' + style );
			} );
		}
	}
};

// Initialize style switching for the frontend.
( function() {
	var pbsGetWindowSize = function() {
		if ( window.innerWidth > 800 ) {
			return 'desktop';
		}
		if ( window.innerWidth < 400 ) {
			return 'phone';
		}
		return 'tablet';
	};

	var ready = function() {
		var view = pbsGetWindowSize();
		if ( 'desktop' !== view ) {
			window.pbsSwitchResponsiveStylesFrontend( pbsGetWindowSize(), 'desktop' );
		}
		window.addEventListener( 'resize', function() {
			var newView = pbsGetWindowSize();
			window.pbsSwitchResponsiveStylesFrontend( pbsGetWindowSize(), view );
			view = newView;
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * Based from http://stackoverflow.com/questions/8917921/cross-browser-javascript-not-jquery-scroll-to-top-animation
 */
( function() {

	var scrollTo = function( selector ) {

		var scrollY, scrollTargetY, speed, easing, currentTime, time;

		var to = document.querySelector( selector );
		if ( ! to ) {
			return;
		}

		scrollY = window.scrollY || document.documentElement.scrollTop;
		scrollTargetY = scrollY + to.getBoundingClientRect().top;
		speed = 2000;
		easing = function( t ) {
			return t < 0.5 ? 2 * t * t : -1 + ( 4 - 2 * t ) * t;
		},
		currentTime = 0;

		// Min time .1, max time .8 seconds
		time = Math.max( 0.1, Math.min( Math.abs( scrollY - scrollTargetY ) / speed, 0.8 ) );

		// Add animation loop
		function tick() {
			var p, t;
			currentTime += 1 / 60;

			p = currentTime / time;
			t = easing( p );

			if ( p < 1 ) {
				requestAnimationFrame( tick );
				window.scrollTo( 0, scrollY + ( ( scrollTargetY - scrollY ) * t ) );
			} else {
				window.scrollTo( 0, scrollTargetY );
			}
		}

		tick();
	};

	var ready = function() {
		document.body.addEventListener( 'click', function( ev ) {
			var target, match, anchor;
			if ( typeof PBS !== 'undefined' && PBS.isEditing ) {
				return;
			}
			if ( ev.target.tagName ) {
				if ( 'A' === ev.target.tagName ) {
					target = ev.target.getAttribute( 'href' );
					if ( target ) {
						match = target.match( /^#(\w+)/ );
						if ( match ) {
							anchor = document.querySelector( 'a[name="' + match[1] + '"]' );
							if ( anchor ) {
								ev.preventDefault();
								scrollTo( 'a[name="' + match[1] + '"]' );
								return;
							}
						}
						if ( target.match( /^[\.#]\w+/ ) ) {
							ev.preventDefault();
							scrollTo( target );
							return;
						}
					}
				}
			}
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

