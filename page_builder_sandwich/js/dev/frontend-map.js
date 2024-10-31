/* globals initPBSMaps, google, PBSEditor */

if ( ! window.PBSEditor ) {
	window.PBSEditor = {};
}

/**
 * Converts a hex color to its RGB components.
 *
 * @see http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
 */
window.PBSEditor.hexToRgb = function( hex ) {

	var shorthandRegex, result;
	var isRGB = hex.match( /rgba?\(\s*([\d]+)\s*,\s*([\d]+)\s*,\s*([\d]+)\s*/ );
	if ( isRGB ) {
		return {
			r: parseInt( isRGB[1], 10 ),
			g: parseInt( isRGB[2], 10 ),
			b: parseInt( isRGB[3], 10 )
		};
	}

    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace( shorthandRegex, function( m, r, g, b ) {
        return r + r + g + g + b + b;
    } );

    result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec( hex );
    return result ? {
        r: parseInt( result[1], 16 ),
        g: parseInt( result[2], 16 ),
        b: parseInt( result[3], 16 )
    } : null;
};

window.PBSEditor.rgbToHex = function( r, g, b ) {
	return '#' + r.toString( 16 ) + g.toString( 16 ) + b.toString( 16 );
};

/**
 * Converts an RGB color to HSL.
 *
 * @see http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
 */
window.PBSEditor.rgbToHsl = function( r, g, b ) {
	var max, h, s, l, min, d;

    r /= 255, g /= 255, b /= 255;
    max = Math.max( r, g, b ), min = Math.min( r, g, b );
    l = ( max + min ) / 2;

    if ( max === min ) {
        h = s = 0; // Achromatic
    } else {
        d = max - min;
        s = l > 0.5 ? d / ( 2 - max - min ) : d / ( max + min );
        switch ( max ){
            case r: h = ( g - b ) / d + ( g < b ? 6 : 0 ); break;
            case g: h = ( b - r ) / d + 2; break;
            case b: h = ( r - g ) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h, s: s, l: l };
};


// All initialized maps are placed here for cleanup reference.
var pbsMapsInitialized = [];

initPBSMaps = function( mapElem, successCallback, failCallback ) { // jshint ignore:line

	// Cleanup all other previously initialized maps.
	var cleanup = function() {
		var i, elem;
		for ( i = pbsMapsInitialized.length - 1; i >= 0; i-- ) {
			elem = pbsMapsInitialized[ i ].getDiv();
			while ( elem.parentNode && 'BODY' !== elem.parentNode.tagName ) {
				elem = elem.parentNode;
			}
			if ( ! elem.parentNode ) {
				if ( pbsMapsInitialized[ i ].marker ) {
					pbsMapsInitialized[ i ].marker.setMap( null );
					delete( pbsMapsInitialized[ i ].marker );
				}
				delete( pbsMapsInitialized[ i ] );
				pbsMapsInitialized.splice( i, 1 );
			}
		}
	};

	var geocoder;
	var initMap = function( mapElem, successCallback, failCallback ) {

		var center, latLonMatch;

		// Do some cleanup first.
		cleanup();

		center = mapElem.getAttribute( 'data-center' ) || '37.09024, -95.712891';
		center = center.trim();

		latLonMatch = center.match( /^([-+]?\d{1,2}([.]\d+)?)\s*,?\s*([-+]?\d{1,3}([.]\d+)?)$/ );
		if ( latLonMatch ) {
			mapElem.setAttribute( 'data-lat', latLonMatch[1] );
			mapElem.setAttribute( 'data-lng', latLonMatch[3] );
			center = { lat: parseFloat( latLonMatch[1] ), lng: parseFloat( latLonMatch[3] ) };
			_initMap( mapElem, center );
			if ( successCallback ) {
				successCallback();
			}

		} else if ( 'undefined' !== typeof geocoder ) {
			geocoder.geocode( { 'address': center }, function( results, status ) {
				var center;

				if ( status === google.maps.GeocoderStatus.OK ) {
					mapElem.setAttribute( 'data-lat', results[0].geometry.location.lat() );
					mapElem.setAttribute( 'data-lng', results[0].geometry.location.lng() );
					center = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
					_initMap( mapElem, center );
					if ( successCallback ) {
						successCallback();
					}
				} else if ( failCallback ) {
					failCallback();
				}
			  } );
		}
	};

	var _initMap = function( mapElem, center ) {
		var zoom = mapElem.getAttribute( 'data-zoom' ) || 3;
		var disableUI = '1' === mapElem.getAttribute( 'data-disable-ui' );
		var color = mapElem.getAttribute( 'data-color' ) || false;
		var customColor = mapElem.getAttribute( 'data-custom' ) || '';
		var marker = '1' === mapElem.getAttribute( 'data-marker' );
		var markerImage = mapElem.getAttribute( 'data-marker-image' ) || '';
		var customMapType, rgb, hsl, map;
		var args = {
			center: center,
			zoom: zoom,
			disableDefaultUI: disableUI
		};

		zoom = parseInt( zoom, 10 );

		// STANDARD-PRO-ONLY-START

		// Add the styles.
		if ( customColor ) {
			customMapType = new google.maps.StyledMapType( JSON.parse( atob( customColor ) ) );

		} else if ( color ) {

			rgb = PBSEditor.hexToRgb( color );
			color = PBSEditor.rgbToHex( rgb.r, rgb.g, rgb.b );
			hsl = PBSEditor.rgbToHsl( rgb.r, rgb.g, rgb.b );

			customMapType = new google.maps.StyledMapType( [
				{
					stylers: [
						{ hue: color },
						{ visibility: 'simplified' },
						{ gamma: 0.6 },
						{ weight: 0.5 },
						{ saturation: hsl.s },
						{ lightness: hsl.l }
					]
				}, {
					elementType: 'labels',
					stylers: [ { visibility: 'on' } ]
				}, {
					featureType: 'water',
					stylers: [ { color: color } ]
				}
			],
			{
				name: 'Styled'
			} );
		}

		// STANDARD-PRO-ONLY-END

		// Create the map.
		if ( args.zoom ) {
			args.zoom = parseInt( args.zoom, 10 );
		}
		map = new google.maps.Map( mapElem, args );
		pbsMapsInitialized.push( map );
		mapElem.map = map;

		// STANDARD-PRO-ONLY-START

		// Use the styled map.
		if ( customColor || color ) {
			map.mapTypes.set( 'styled', customMapType );
			map.setMapTypeId( 'styled' );
		}

		// Draw the marker/image marker.
		if ( marker && markerImage ) {
			map.marker = new google.maps.Marker( {
				position: center,
				map: map,
				icon: markerImage
			} );
		} else if ( marker ) {
			map.marker = new google.maps.Marker( {
				position: center,
				map: map
			} );
		}

		// STANDARD-PRO-ONLY-END
	};

	var maps;

	if ( 'undefined' === typeof google ) {
		return;
	}
	geocoder = new google.maps.Geocoder();

	if ( 'undefined' !== typeof mapElem ) {
		initMap( mapElem, successCallback, failCallback );
		return;
	}

	maps = document.querySelectorAll( '[data-ce-tag="map"]' );
	Array.prototype.forEach.call( maps, function( el ) {
		initMap( el, successCallback, failCallback );
	} );
};

/**
 * Re-centers the map to its settings.
 */
window.pbsMapsReCenter = function( mapElem ) {
	var lat, lng, i;
	if ( 'undefined' !== typeof google ) {
		if ( mapElem && mapElem.nodeType ) {
			lat = parseFloat( mapElem.getAttribute( 'data-lat' ) );
			lng = parseFloat( mapElem.getAttribute( 'data-lng' ) );
			if ( ! isNaN( lat ) ) {
				google.maps.event.trigger( mapElem.map, 'resize' );
				mapElem.map.setCenter( { lat: lat, lng: lng } );
			}
			return;
		}
		for ( i = 0; i < pbsMapsInitialized.length; i++ ) {
			window.pbsMapsReCenter( pbsMapsInitialized[ i ].getDiv() );
		}
	}
};

( function() {
	var ready = function() {

		/**
		 * Re-center the map on window resize.
		 */
		window.addEventListener( 'resize', window.pbsMapsReCenter );

		/**
		 * Make maps work inside tabs.
		 */
		document.onclick = function( event ) {
			var el = event.target, input, panel, maps;
			if ( el.parentNode && el.parentNode.classList && el.parentNode.classList.contains( 'pbs-tab-tabs' ) ) {
				input = el.parentNode.parentNode.querySelector( '[id="' + el.getAttribute( 'for' ) + '"]' );
				if ( ! input ) {
					return;
				}
				panel = el.parentNode.parentNode.querySelector( '[data-panel="' + input.getAttribute( 'data-tab' ) + '"]' );
				if ( ! panel ) {
					return;
				}
				maps = panel.querySelectorAll( '[data-ce-tag="map"]' );
				Array.prototype.forEach.call( maps, function( el ) {
					setTimeout( function() {
						window.pbsMapsReCenter( el );
					}, 1 );
				} );
			}
		};
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();
