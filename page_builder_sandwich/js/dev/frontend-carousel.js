/* globals Siema, PBSEditor */

!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define("Siema",[],t):"object"==typeof exports?exports.Siema=t():e.Siema=t()}(this,function(){return function(e){function t(s){if(i[s])return i[s].exports;var r=i[s]={i:s,l:!1,exports:{}};return e[s].call(r.exports,r,r.exports,t),r.l=!0,r.exports}var i={};return t.m=e,t.c=i,t.i=function(e){return e},t.d=function(e,i,s){t.o(e,i)||Object.defineProperty(e,i,{configurable:!1,enumerable:!0,get:s})},t.n=function(e){var i=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(i,"a",i),i},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="",t(t.s=0)}([function(e,t,i){"use strict";function s(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(t,"__esModule",{value:!0});var r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},n=function(){function e(e,t){for(var i=0;i<t.length;i++){var s=t[i];s.enumerable=s.enumerable||!1,s.configurable=!0,"value"in s&&(s.writable=!0),Object.defineProperty(e,s.key,s)}}return function(t,i,s){return i&&e(t.prototype,i),s&&e(t,s),t}}(),o=function(){function e(t){var i=this;s(this,e),this.config=e.mergeSettings(t),this.selector="string"==typeof this.config.selector?document.querySelector(this.config.selector):this.config.selector,this.selectorWidth=this.selector.offsetWidth,this.innerElements=[].slice.call(this.selector.children),this.currentSlide=this.config.startIndex,this.transformProperty=e.webkitOrNot(),["resizeHandler","touchstartHandler","touchendHandler","touchmoveHandler","mousedownHandler","mouseupHandler","mouseleaveHandler","mousemoveHandler"].forEach(function(e){i[e]=i[e].bind(i)}),this.init()}return n(e,[{key:"init",value:function(){if(window.addEventListener("resize",this.resizeHandler),this.config.draggable&&(this.pointerDown=!1,this.drag={startX:0,endX:0,startY:0,letItGo:null},this.selector.addEventListener("touchstart",this.touchstartHandler),this.selector.addEventListener("touchend",this.touchendHandler),this.selector.addEventListener("touchmove",this.touchmoveHandler,{passive:!0}),this.selector.addEventListener("mousedown",this.mousedownHandler),this.selector.addEventListener("mouseup",this.mouseupHandler),this.selector.addEventListener("mouseleave",this.mouseleaveHandler),this.selector.addEventListener("mousemove",this.mousemoveHandler)),null===this.selector)throw new Error("Something wrong with your selector 😭");this.resolveSlidesNumber(),this.selector.style.overflow="hidden",this.sliderFrame=document.createElement("div"),this.sliderFrame.style.width=this.selectorWidth/this.perPage*this.innerElements.length+"px",this.sliderFrame.style.webkitTransition="all "+this.config.duration+"ms "+this.config.easing,this.sliderFrame.style.transition="all "+this.config.duration+"ms "+this.config.easing,this.config.draggable&&(this.selector.style.cursor="-webkit-grab");for(var e=document.createDocumentFragment(),t=0;t<this.innerElements.length;t++){var i=document.createElement("div");i.style.cssFloat="left",i.style.float="left",i.style.width=100/this.innerElements.length+"%",i.appendChild(this.innerElements[t]),e.appendChild(i)}this.sliderFrame.appendChild(e),this.selector.innerHTML="",this.selector.appendChild(this.sliderFrame),this.slideToCurrent(),this.config.onInit.call(this)}},{key:"resolveSlidesNumber",value:function(){if("number"==typeof this.config.perPage)this.perPage=this.config.perPage;else if("object"===r(this.config.perPage)){this.perPage=1;for(var e in this.config.perPage)window.innerWidth>=e&&(this.perPage=this.config.perPage[e])}}},{key:"prev",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:1,t=arguments[1];if(!(this.innerElements.length<=this.perPage)){var i=this.currentSlide;0===this.currentSlide&&this.config.loop?this.currentSlide=this.innerElements.length-this.perPage:this.currentSlide=Math.max(this.currentSlide-e,0),i!==this.currentSlide&&(this.slideToCurrent(),this.config.onChange.call(this),t&&t.call(this))}}},{key:"next",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:1,t=arguments[1];if(!(this.innerElements.length<=this.perPage)){var i=this.currentSlide;this.currentSlide===this.innerElements.length-this.perPage&&this.config.loop?this.currentSlide=0:this.currentSlide=Math.min(this.currentSlide+e,this.innerElements.length-this.perPage),i!==this.currentSlide&&(this.slideToCurrent(),this.config.onChange.call(this),t&&t.call(this))}}},{key:"goTo",value:function(e,t){this.innerElements.length<=this.perPage||(this.currentSlide=Math.min(Math.max(e,0),this.innerElements.length-this.perPage),this.slideToCurrent(),t&&t.call(this))}},{key:"slideToCurrent",value:function(){this.sliderFrame.style[this.transformProperty]="translate3d(-"+this.currentSlide*(this.selectorWidth/this.perPage)+"px, 0, 0)"}},{key:"updateAfterDrag",value:function(){var e=this.drag.endX-this.drag.startX,t=Math.abs(e),i=Math.ceil(t/(this.selectorWidth/this.perPage));e>0&&t>this.config.threshold&&this.innerElements.length>this.perPage?this.prev(i):e<0&&t>this.config.threshold&&this.innerElements.length>this.perPage&&this.next(i),this.slideToCurrent()}},{key:"resizeHandler",value:function(){this.resolveSlidesNumber(),this.selectorWidth=this.selector.offsetWidth,this.sliderFrame.style.width=this.selectorWidth/this.perPage*this.innerElements.length+"px",this.slideToCurrent()}},{key:"clearDrag",value:function(){this.drag={startX:0,endX:0,startY:0,letItGo:null}}},{key:"touchstartHandler",value:function(e){e.stopPropagation(),this.pointerDown=!0,this.drag.startX=e.touches[0].pageX,this.drag.startY=e.touches[0].pageY}},{key:"touchendHandler",value:function(e){e.stopPropagation(),this.pointerDown=!1,this.sliderFrame.style.webkitTransition="all "+this.config.duration+"ms "+this.config.easing,this.sliderFrame.style.transition="all "+this.config.duration+"ms "+this.config.easing,this.drag.endX&&this.updateAfterDrag(),this.clearDrag()}},{key:"touchmoveHandler",value:function(e){e.stopPropagation(),null===this.drag.letItGo&&(this.drag.letItGo=Math.abs(this.drag.startY-e.touches[0].pageY)<Math.abs(this.drag.startX-e.touches[0].pageX)),this.pointerDown&&this.drag.letItGo&&(this.drag.endX=e.touches[0].pageX,this.sliderFrame.style.webkitTransition="all 0ms "+this.config.easing,this.sliderFrame.style.transition="all 0ms "+this.config.easing,this.sliderFrame.style[this.transformProperty]="translate3d("+(this.currentSlide*(this.selectorWidth/this.perPage)+(this.drag.startX-this.drag.endX))*-1+"px, 0, 0)")}},{key:"mousedownHandler",value:function(e){e.preventDefault(),e.stopPropagation(),this.pointerDown=!0,this.drag.startX=e.pageX}},{key:"mouseupHandler",value:function(e){e.stopPropagation(),this.pointerDown=!1,this.selector.style.cursor="-webkit-grab",this.sliderFrame.style.webkitTransition="all "+this.config.duration+"ms "+this.config.easing,this.sliderFrame.style.transition="all "+this.config.duration+"ms "+this.config.easing,this.drag.endX&&this.updateAfterDrag(),this.clearDrag()}},{key:"mousemoveHandler",value:function(e){e.preventDefault(),this.pointerDown&&(this.drag.endX=e.pageX,this.selector.style.cursor="-webkit-grabbing",this.sliderFrame.style.webkitTransition="all 0ms "+this.config.easing,this.sliderFrame.style.transition="all 0ms "+this.config.easing,this.sliderFrame.style[this.transformProperty]="translate3d("+(this.currentSlide*(this.selectorWidth/this.perPage)+(this.drag.startX-this.drag.endX))*-1+"px, 0, 0)")}},{key:"mouseleaveHandler",value:function(e){this.pointerDown&&(this.pointerDown=!1,this.selector.style.cursor="-webkit-grab",this.drag.endX=e.pageX,this.sliderFrame.style.webkitTransition="all "+this.config.duration+"ms "+this.config.easing,this.sliderFrame.style.transition="all "+this.config.duration+"ms "+this.config.easing,this.updateAfterDrag(),this.clearDrag())}},{key:"updateFrame",value:function(){this.sliderFrame=document.createElement("div"),this.sliderFrame.style.width=this.selectorWidth/this.perPage*this.innerElements.length+"px",this.sliderFrame.style.webkitTransition="all "+this.config.duration+"ms "+this.config.easing,this.sliderFrame.style.transition="all "+this.config.duration+"ms "+this.config.easing,this.config.draggable&&(this.selector.style.cursor="-webkit-grab");for(var e=document.createDocumentFragment(),t=0;t<this.innerElements.length;t++){var i=document.createElement("div");i.style.cssFloat="left",i.style.float="left",i.style.width=100/this.innerElements.length+"%",i.appendChild(this.innerElements[t]),e.appendChild(i)}this.sliderFrame.appendChild(e),this.selector.innerHTML="",this.selector.appendChild(this.sliderFrame),this.slideToCurrent()}},{key:"remove",value:function(e,t){if(e<0||e>this.innerElements.length)throw new Error("Item to remove doesn't exist 😭");this.innerElements.splice(e,1),this.currentSlide=e<this.currentSlide?this.currentSlide-1:this.currentSlide,this.updateFrame(),t&&t.call(this)}},{key:"insert",value:function(e,t,i){if(t<0||t>this.innerElements.length+1)throw new Error("Unable to inset it at this index 😭");if(this.innerElements.indexOf(e)!==-1)throw new Error("The same item in a carousel? Really? Nope 😭");this.innerElements.splice(t,0,e),this.currentSlide=t<=this.currentSlide?this.currentSlide+1:this.currentSlide,this.updateFrame(),i&&i.call(this)}},{key:"prepend",value:function(e,t){this.insert(e,0),t&&t.call(this)}},{key:"append",value:function(e,t){this.insert(e,this.innerElements.length+1),t&&t.call(this)}},{key:"destroy",value:function(){var e=arguments.length>0&&void 0!==arguments[0]&&arguments[0],t=arguments[1];if(window.removeEventListener("resize",this.resizeHandler),this.selector.style.cursor="auto",this.selector.removeEventListener("touchstart",this.touchstartHandler),this.selector.removeEventListener("touchend",this.touchendHandler),this.selector.removeEventListener("touchmove",this.touchmoveHandler),this.selector.removeEventListener("mousedown",this.mousedownHandler),this.selector.removeEventListener("mouseup",this.mouseupHandler),this.selector.removeEventListener("mouseleave",this.mouseleaveHandler),this.selector.removeEventListener("mousemove",this.mousemoveHandler),e){for(var i=document.createDocumentFragment(),s=0;s<this.innerElements.length;s++)i.appendChild(this.innerElements[s]);this.selector.innerHTML="",this.selector.appendChild(i),this.selector.removeAttribute("style")}t&&t.call(this)}}],[{key:"mergeSettings",value:function(e){var t={selector:".siema",duration:200,easing:"ease-out",perPage:1,startIndex:0,draggable:!0,threshold:20,loop:!1,onInit:function(){},onChange:function(){}},i=e;for(var s in i)t[s]=i[s];return t}},{key:"webkitOrNot",value:function(){var e=document.documentElement.style;return"string"==typeof e.transform?"transform":"WebkitTransform"}}]),e}();t.default=o,e.exports=t.default}])});

window.pbsRefreshCarousel = function( element ) {
	if ( element.getAttribute( 'data-full-width' ) ) {
		window._pbsFullWidthRow( element, false );
	} else {
		window._pbsRowReset( element );
	}

	if ( element.siema ) {
		element.siema.resizeHandler();
	}
};

window.pbsDestroyCarousel = function( element ) {
	if ( element.siema ) {

		// Remove interval.
		clearInterval( element._pbsCarouselInterval );
		element.siema.destroy( true, function() {
		} );
	}
};

window.pbsInitCarouselBullets = function( element ) {

	var bullet, i, numSlides = element.querySelector( 'div' ).children.length;
	var bulletContainer = document.createElement( 'DIV' );
	var bulletColor = element.getAttribute( 'data-bullet-color' );
	var currentSlide = element.siema ? element.siema.currentSlide : 0;
	bulletContainer.setAttribute( 'data-ce-tag', 'static' );
	bulletContainer.classList.add( 'pbs-carousel-bullet-wrapper' );

	for ( i = 0; i < numSlides; i++ ) {
		bullet = document.createElement( 'DIV' );
		bullet.setAttribute( 'data-ce-tag', 'static' );
		bullet.setAttribute( 'data-slide', i );
		bullet.classList.add( 'pbs-carousel-bullet' );
		bulletContainer.appendChild( bullet );

		// If bullet colors are specified.
		if ( bulletColor ) {
			bullet.style.backgroundColor = bulletColor;
		}

		// Bullet click handler.
		bullet.addEventListener( 'click', function( ev ) { // jshint ignore:line

			var sliderWrapper = this.querySelector( 'div' );
			var slide = ev.target.getAttribute( 'data-slide' );
			this.siema.goTo( slide );
			this.setAttribute( 'data-slide', slide );

			if ( 'slideshow' === this.getAttribute( 'data-type' ) ) {
				sliderWrapper.style.transition = 'none';
				sliderWrapper.style.opacity = 0;
				setTimeout( function() {
					var time = parseInt( this.parentNode.getAttribute( 'data-anim-duration' ), 10 ) || 400;
					this.style.transition = 'opacity ' + time + 'ms ease-in-out';
					this.style.opacity = 1;
				}.bind( sliderWrapper ), 20 );
			}
		}.bind( element ) );
	}

	element.appendChild( bulletContainer );

	element.setAttribute( 'data-slide', currentSlide );
};

window.pbsInitCarousel = function( element, args ) {

	var onChangeProxy = function() {};
	var onInitProxy = function() {};

	if ( element.getAttribute( 'data-full-width' ) ) {
		window._pbsFullWidthRow( element, false );
	} else {
		window._pbsRowReset( element );
	}

	if ( 'undefined' === typeof args ) {
		args = {};
	}

	args.selector = element;
	args.loop = true;

	if ( 'slideshow' === element.getAttribute( 'data-type' ) && 'undefined' === typeof args.draggable ) {
		args.draggable = false;
	}

	if ( args.onInit ) {
		onInitProxy = args.onInit;
	}
	if ( element.getAttribute( 'data-anim-duration' ) || ! args.duration ) {
		args.duration = element.getAttribute( 'data-anim-duration' ) || 400;
	}
	args.onInit = function() {

		var interval = parseInt( this.getAttribute( 'data-delay' ), 10 ) || 4000;
		interval += parseInt( this.getAttribute( 'data-anim-duration' ), 10 ) || 400;

		// Create bullets.
		window.pbsInitCarouselBullets( this );

		// Create timer.
		this._pbsCarouselInterval = setInterval( function() {
		    if ( typeof PBS !== 'undefined' && PBS.isEditing ) {
				return;
			}
			if ( ! this._pbsMouseOver ) {
				this.siema.next();
			}
		}.bind( this ), interval );

		this.addEventListener( 'mouseenter', function() {
			this._pbsMouseOver = true;
		}.bind( this ) );

		this.addEventListener( 'mouseleave', function() {
			this._pbsMouseOver = null;
		}.bind( this ) );

		onInitProxy( this );
	}.bind( element );

	if ( args.onChange ) {
		onChangeProxy = args.onChange;
	}
	args.onChange = function() {

		var sliderWrapper = element.querySelector( 'div' );

		element.setAttribute( 'data-slide', element.siema.currentSlide );
		onChangeProxy( this );

		if ( 'slideshow' === this.getAttribute( 'data-type' ) ) {
			sliderWrapper.style.transition = 'none';
			sliderWrapper.style.opacity = 0;
			setTimeout( function() {
				var time = parseInt( this.getAttribute( 'data-anim-duration' ), 10 ) || 400;
				this.style.transition = 'opacity ' + time + 'ms ease-in-out';
				this.style.opacity = 1;
			}.bind( sliderWrapper ), 20 );
		}

	}.bind( element );

	element.siema = new Siema( args );
};

window.pbsInitAllCarousels = function() {
	var elements = document.querySelectorAll( '[data-ce-tag="carousel"]' );
	Array.prototype.forEach.call( elements, function( el ) {
		window.pbsInitCarousel( el );
	} );

};

// Convert old Glide carousel to the new Siema.
window.pbsConvertGlideCarouselToSiema = function( carousel ) {
	var slides, removeMe;
	if ( carousel.classList.contains( 'glide--carousel' ) ) {
		carousel.classList.remove( 'glide--carousel', 'glide--horizontal', 'glide--slider' );

		slides = carousel.querySelector( '.glide__track' ).children;
		Array.prototype.forEach.call( slides, function( slide ) {
			var row = slide.querySelector( '.pbs-row' );
			carousel.insertBefore( row, null );
		} );
	}

	removeMe = carousel.querySelector( '.glide__wrapper' );
	if ( removeMe ) {
		carousel.removeChild( removeMe );
	}

	removeMe = carousel.querySelector( '.glide__bullets' );
	if ( removeMe ) {
		carousel.removeChild( removeMe );
	}
};

( function() {

	// Initialize.
	var ready = function() {
		var refresh, debouncedRefresh;

		// Convert old Glide carousel to the new Siema.
		var carousels = document.querySelectorAll( '[data-ce-tag="carousel"]' );
		Array.prototype.forEach.call( carousels, function( carousel ) {
			window.pbsConvertGlideCarouselToSiema( carousel );
		} );

		window.pbsInitAllCarousels();

		refresh = function() {
			var elements = document.querySelectorAll( '[data-ce-tag="carousel"]' );
			Array.prototype.forEach.call( elements, function( el ) {
				window.pbsRefreshCarousel( el );
			} );
		};
		debouncedRefresh = function() {
			clearTimeout( window._pbsCarouselRefreshTimeout );
			window._pbsCarouselRefreshTimeout = setTimeout( refresh, 50 );
		};

		window.addEventListener( 'resize', debouncedRefresh );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();
