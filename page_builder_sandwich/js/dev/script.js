/* globals ContentTools, ContentEdit, ContentSelect, pbsParams, PBSEditor, HS, fastdom */

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
 * IE doesn't support constructor.name. This polyfill adds it.
 *
 * @see http://matt.scharley.me/2012/03/monkey-patch-name-ie.html
 */

if ( undefined === Function.prototype.name  && undefined !== Object.defineProperty ) {
    Object.defineProperty( Function.prototype, 'name', {
        get: function() {
            var funcNameRegex = /function\s([^(]{1,})\(/;
            var results = ( funcNameRegex ).exec( ( this ).toString() );
            return ( results && results.length > 1 ) ? results[1].trim() : '';
        },
        set: function() {}
    } );
}

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

!(function(win) {

/**
 * FastDom
 *
 * Eliminates layout thrashing
 * by batching DOM read/write
 * interactions.
 *
 * @author Wilson Page <wilsonpage@me.com>
 * @author Kornel Lesinski <kornel.lesinski@ft.com>
 */

'use strict';

/**
 * Mini logger
 *
 * @return {Function}
 */
var debug = 0 ? console.log.bind(console, '[fastdom]') : function() {};

/**
 * Normalized rAF
 *
 * @type {Function}
 */
var raf = win.requestAnimationFrame
  || win.webkitRequestAnimationFrame
  || win.mozRequestAnimationFrame
  || win.msRequestAnimationFrame
  || function(cb) { return setTimeout(cb, 16); };

/**
 * Initialize a `FastDom`.
 *
 * @constructor
 */
function FastDom() {
  var self = this;
  self.reads = [];
  self.writes = [];
  self.raf = raf.bind(win); // test hook
  debug('initialized', self);
}

FastDom.prototype = {
  constructor: FastDom,

  /**
   * Adds a job to the read batch and
   * schedules a new frame if need be.
   *
   * @param  {Function} fn
   * @public
   */
  measure: function(fn, ctx) {
    debug('measure');
    var task = !ctx ? fn : fn.bind(ctx);
    this.reads.push(task);
    scheduleFlush(this);
    return task;
  },

  /**
   * Adds a job to the
   * write batch and schedules
   * a new frame if need be.
   *
   * @param  {Function} fn
   * @public
   */
  mutate: function(fn, ctx) {
    debug('mutate');
    var task = !ctx ? fn : fn.bind(ctx);
    this.writes.push(task);
    scheduleFlush(this);
    return task;
  },

  /**
   * Clears a scheduled 'read' or 'write' task.
   *
   * @param {Object} task
   * @return {Boolean} success
   * @public
   */
  clear: function(task) {
    debug('clear', task);
    return remove(this.reads, task) || remove(this.writes, task);
  },

  /**
   * Extend this FastDom with some
   * custom functionality.
   *
   * Because fastdom must *always* be a
   * singleton, we're actually extending
   * the fastdom instance. This means tasks
   * scheduled by an extension still enter
   * fastdom's global task queue.
   *
   * The 'super' instance can be accessed
   * from `this.fastdom`.
   *
   * @example
   *
   * var myFastdom = fastdom.extend({
   *   initialize: function() {
   *     // runs on creation
   *   },
   *
   *   // override a method
   *   measure: function(fn) {
   *     // do extra stuff ...
   *
   *     // then call the original
   *     return this.fastdom.measure(fn);
   *   },
   *
   *   ...
   * });
   *
   * @param  {Object} props  properties to mixin
   * @return {FastDom}
   */
  extend: function(props) {
    debug('extend', props);
    if (typeof props != 'object') throw new Error('expected object');

    var child = Object.create(this);
    mixin(child, props);
    child.fastdom = this;

    // run optional creation hook
    if (child.initialize) child.initialize();

    return child;
  },

  // override this with a function
  // to prevent Errors in console
  // when tasks throw
  catch: null
};

/**
 * Schedules a new read/write
 * batch if one isn't pending.
 *
 * @private
 */
function scheduleFlush(fastdom) {
  if (!fastdom.scheduled) {
    fastdom.scheduled = true;
    fastdom.raf(flush.bind(null, fastdom));
    debug('flush scheduled');
  }
}

/**
 * Runs queued `read` and `write` tasks.
 *
 * Errors are caught and thrown by default.
 * If a `.catch` function has been defined
 * it is called instead.
 *
 * @private
 */
function flush(fastdom) {
  debug('flush');

  var writes = fastdom.writes;
  var reads = fastdom.reads;
  var error;

  try {
    debug('flushing reads', reads.length);
    runTasks(reads);
    debug('flushing writes', writes.length);
    runTasks(writes);
  } catch (e) { error = e; }

  fastdom.scheduled = false;

  // If the batch errored we may still have tasks queued
  if (reads.length || writes.length) scheduleFlush(fastdom);

  if (error) {
    debug('task errored', error.message);
    if (fastdom.catch) fastdom.catch(error);
    else throw error;
  }
}

/**
 * We run this inside a try catch
 * so that if any jobs error, we
 * are able to recover and continue
 * to flush the batch until it's empty.
 *
 * @private
 */
function runTasks(tasks) {
  debug('run tasks');
  var task; while (task = tasks.shift()) task();
}

/**
 * Remove an item from an Array.
 *
 * @param  {Array} array
 * @param  {*} item
 * @return {Boolean}
 */
function remove(array, item) {
  var index = array.indexOf(item);
  return !!~index && !!array.splice(index, 1);
}

/**
 * Mixin own properties of source
 * object into the target.
 *
 * @param  {Object} target
 * @param  {Object} source
 */
function mixin(target, source) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) target[key] = source[key];
  }
}

// There should never be more than
// one instance of `FastDom` in an app
var exports = win.fastdom = (win.fastdom || new FastDom()); // jshint ignore:line

// Expose to CJS & AMD
if ((typeof define)[0] == 'f') define(function() { return exports; });
else if ((typeof module)[0] == 'o') module.exports = exports;

})( typeof window !== 'undefined' ? window : this);


/* exported PBS */
var PBS = {};

ContentEdit.INDENT = '';
ContentEdit.DEFAULT_MAX_ELEMENT_WIDTH = 2000;
ContentTools.HIGHLIGHT_HOLD_DURATION = 999999;
ContentEdit.RESIZE_CORNER_SIZE = 0;

var initPBS = function() {

	var editor, extraWrapper, editableWrappers, i;
	var starterInterval;

	if ( ! document.querySelector( '[data-name="main-content"]' ) ) {
		return;
	}

	// It's possible that there might be multiple editable wrappers, remove them except for the first one.
	editableWrappers = document.querySelectorAll( '.pbs-main-wrapper[data-editable][data-name="main-content"]' );
	if ( editableWrappers.length > 1 ) {
		for ( i = 1; i < editableWrappers.length; i++ ) {
			editableWrappers[ i ].removeAttribute( 'data-editable' );
			editableWrappers[ i ].removeAttribute( 'data-name' );
		}
	}

	// If multiple pbs-main-wrapper's exist, make the others uneditable.
	while ( document.querySelectorAll( '.pbs-main-wrapper[data-name="main-content"]' ).length > 1 ) {
		extraWrapper = document.querySelectorAll( '.pbs-main-wrapper[data-name="main-content"]' )[1];
		extraWrapper.removeAttribute( 'data-name' );
		if ( null !== extraWrapper.getAttribute( 'data-editable' ) ) {
			extraWrapper.removeAttribute( 'data-editable' );
		}
	}

	// Auto-start PBS if the localStorage key is set.
	if ( localStorage ) {
		if ( localStorage.getItem( 'pbs-open-' + pbsParams.post_id ) ) {
			localStorage.removeItem( 'pbs-open-' + pbsParams.post_id );
			starterInterval = setInterval( function() {
				if ( PBS.isReady ) {
					PBS.edit();
					clearInterval( starterInterval );
				}
			}, 200 );
		}
	}

	// Auto-start PBS if there is a hash.
	if ( window.location.hash ) {
		if ( 0 === window.location.hash.indexOf( '#pbs-edit' ) ) {
			starterInterval = setInterval( function() {
				if ( PBS.isReady ) {
					PBS.edit();
					clearInterval( starterInterval );
				}
			}, 200 );
		}
	}

	editor = ContentTools.EditorApp.get();

	// Fastdom may produce errors. Clear all Fastdom on stop.
	wp.hooks.addAction( 'pbs.stop', 'pbs', function() {
		var i;
		if ( fastdom ) {
			for ( i = fastdom.reads.length - 1; i >= 0; i-- ) {
				fastdom.clear( fastdom.reads[ i ] );
			}
			for ( i = fastdom.writes.length - 1; i >= 0; i-- ) {
				fastdom.clear( fastdom.writes[ i ] );
			}
		}
	} );

	// Longer interval time to save on processing intensity.
	editor.bind( 'start', function() {
		clearInterval( editor._toolbox._updateToolsTimeout );
		editor._toolbox._updateToolsTimeout = setInterval( editor._toolbox._updateTools, 300 );
	} );

	/**
	 * Remove the inspector scrollbar when a modal is visible. We are only
	 * going to use the Media Manager modal, so just check that one.
	 */
	editor.bind( 'start', function() {
		editor._toolboxScrollCheckInterval = setInterval( function() {
			var elements = document.querySelectorAll( '.media-modal-backdrop' );
			var toolbox, hasModal = false;
			if ( elements ) {
				Array.prototype.forEach.call( elements, function( el ) {
					if ( 0 !== el.offsetWidth || 0 !== el.offsetHeight ) {
						hasModal = true;
					}
				} );
			}

			toolbox = document.querySelector( '.ct-toolbox' );
			if ( toolbox ) {
				if ( toolbox.style['overflow-y'] !== ( hasModal ? 'hidden' : '' ) ) {
					toolbox.style['overflow-y'] = hasModal ? 'hidden' : '';
				}
			}
		}, 300 );
	} );
	editor.bind( 'stop', function() {
		clearInterval( editor._toolboxScrollCheckInterval );
	} );

	/****************************************************************
	 * Debounced shift key listener to display all column outlines.
	 ****************************************************************/

	 // Disable highlighting
	editor.bind( 'start', function() {
		this._handleHighlightOn = function() {};
		this._handleHighlightOff = function() {};
	} );

	editor.bind( 'stop', function() {

		// Trigger a resize event when transitioning with the inspector.
		window._pbsBodyTransitionIntervalNum = 0;
		clearInterval( window._pbsBodyTransitionInterval );
		window._pbsBodyTransitionInterval = setInterval( function() {
			window._pbsBodyTransitionIntervalNum++;
			window.dispatchEvent( new CustomEvent( 'resize' ) );
			if ( window._pbsBodyTransitionIntervalNum >= 30 ) {
				clearInterval( window._pbsBodyTransitionInterval );
			}
		}, 16 );
	} );

	ContentEdit.Root.get().bind( 'focus', function( element ) {
		document.body.setAttribute( 'data-pbs-focused', element.constructor.name );
	} );

	ContentEdit.Root.get().bind( 'blur', function() {
		document.body.removeAttribute( 'data-pbs-focused' );
	} );

	/**
	 * Add a special class to ignore all pointer events of all elements
	 * before our content editor. So that we can do stuff above the fold
	 * without headings/menus getting in our way.
	 */
	editor.bind( 'start', function() {

		var curElement;
		var element = document.querySelector( '.pbs-main-wrapper' );

		while ( element && 'body' !== element.tagName ) {
			curElement = element;
			while ( curElement.previousSibling ) {

				if ( 1 !== curElement.previousSibling.nodeType ) {
					curElement = curElement.previousSibling;
					continue;
				}

				// If this contains the title (it's editable), don't add this.
				if ( curElement.previousSibling.querySelector( '.pbs-title-editor' ) ) {
					curElement = curElement.previousSibling;
					continue;
				}

				// If this is the adminbar, don't add this.
				if ( curElement.previousSibling.closest( '#wpadminbar' ) ) {
					curElement = curElement.previousSibling;
					continue;
				}

				if ( curElement.previousSibling.classList ) {
					curElement.previousSibling.classList.add( 'pbs-ignore-while-editing' );
				}
				curElement = curElement.previousSibling;
			}
			element = element.parentNode;
		}
	} );

	// Remove the ignore all pointer-events class when done.
	editor.bind( 'stop', function() {
		var elements = document.querySelectorAll( '.pbs-ignore-while-editing' );
		if ( elements ) {
			Array.prototype.forEach.call( elements, function( el ) {
				el.classList.remove( 'pbs-ignore-while-editing' );
			} );
		}
	} );

	wp.hooks.doAction( 'pbs.init' );
};

ContentEdit.DRAG_HOLD_DURATION = 400;

ContentEdit.Root.get().bind( 'drag', function() {
	document.querySelector( '[data-name="main-content"]' ).classList.add( 'dragging' );
} );

ContentEdit.Root.get().bind( 'drop', function() {
	document.querySelector( '[data-name="main-content"]' ).classList.remove( 'dragging' );

	// After a drop, adjust row widths
	if ( window.pbsFixRowWidths ) {
		window.pbsFixRowWidths();
	}
} );

window.cssToStyleObject = function( cssString ) {
	var regex = /([\w-]*)\s*:\s*([^;]*)/g;
	var match, properties = {};
	while ( match = regex.exec( cssString ) ) {
		properties[match[1]] = match[2];
	}
	return properties;
};
window.cssToStyleString = function( cssObject ) {
	var i, s = '';
	for ( i in cssObject ) {
		if ( cssObject.hasOwnProperty( i ) ) {
			s += i + ':' + cssObject[ i ] + ';';
		}
	}
	return s;
};

/****************************************************************
 * Bring back the blank on mouse move in ContentTools. Since we
 * are using nested elements, the change breaks our containers.
 ****************************************************************/
ContentEdit.Element.prototype._onMouseMove = function() {};

/****************************************************************
 * These functions are used across the other included scripts.
 ****************************************************************/
/* exported __slice, __indexOf, __extends, __bind */

// jscs:disable
var i, l, key, __slice, __indexOf, __hasProp, __extends, __bind; // jshint ignore:line
// jscs:enable

__slice = [].slice;

__indexOf = [].indexOf || function( item ) {
	for ( i = 0, l = this.length; i < l; i++ ) {
		if ( i in this && this[i] === item ) {
			return i;
		}
	}
	return -1;
};

__hasProp = {}.hasOwnProperty;

__extends = function( child, parent ) {
	for ( key in parent ) {
		if ( __hasProp.call( parent, key ) ) {
			child[key] = parent[key];
		}
	}
	function ctor() {
		this.constructor = child;
	}
	ctor.prototype = parent.prototype;
	child.prototype = new ctor();
	child.__super__ = parent.prototype;
	return child;
};

__bind = function( fn, me ) {
	return function() {
		return fn.apply( me, arguments );
	};
};

// Use this syntax to include other Javascript files, included files must start with "_"
/**
 * The main PBS class.
 */
PBSI = class {
	constructor( controller ) {
		this._controller = controller;
	}

	get isReady() {
		return this._controller.isReady;
	}

	get isEditing() {
		return this._controller.isEditing;
	}

	get controller() {
		return this._controller;
	}

	init() {
		this._controller.init();
	}

	edit() {
		if ( ! this.isEditing ) {
			this._controller.edit();
		}
	}

	save() {
		if ( this.isEditing ) {
			this._controller.save();
		}
	}

	cancel() {
		if ( this.isEditing ) {
			this._controller.cancel();
		}
	}
}

/**
 * Ignition buttons. These are meant to be attached to the admin bar implementation.
 * This is just a simple class that places the classes we need and calls a callback
 * with hooks.
 */

PBSButton = {};
PBSButton.ButtonI = class {
	isMounted() {}
	get domElement() {}
	mount() {}
	unmount() {}
}

PBSButton.Button = class extends PBSButton.ButtonI {
	constructor( domElement, id, callback = function() {} ) {
		super();
		this._domElement = domElement;
		this.id = id;
		this.callback = callback;
		this._isMounted = false;
	}

	isMounted() {
		return this._isMounted;
	}

	get domElement() {
		return this._domElement;
	}

	mount() {
		if ( ! this.isMounted() ) {

			this._domElement.classList.add( 'pbs-ignition-button' );
			this._domElement.classList.add( 'pbs-ignition-button--' + this.id );

			this._callbackBound = this._callback.bind( this );
			this._domElement.addEventListener( 'click', this._callbackBound );
			this._isMounted = true;
		}
	}

	unmount() {
		if ( this.isMounted() ) {
			this._domElement.classList.remove( 'pbs-ignition-button' );
			this._domElement.classList.remove( 'pbs-ignition-button--' + this.id );
			this._domElement.removeEventListener( 'click', this._callbackBound );
			this._isMounted = false;
		}
	}

	_callback( ev ) {
		ev.preventDefault();
		if ( ! wp.hooks.applyFilters( 'pbs.button.click.' + this.id, true, ev ) ) {
			return;
		}
		this.callback( ev );
	}
}

/**
 * The controller controls the main actions of the PBS editor.
 * At the highest level, the editor can start, stop or show that it's busy (saving).
 *
 * The HTML tag and the dom given here will reflect the current status of the
 * editor via classes.
 */
PBSController = {};
PBSController.ControllerI = class {
	constructor( contentDom, contentProvider, saveProvider ) {}
	get isEditing() {}
	get isReady() {}
	set isReady( isReady ) {}
	get isBusy() {}
	set isBusy( isBusy ) {}
	get contentProvider() {}
	init() {}
	edit() {}
	cancel() {}
	save( callback = function() {} ) {}
	destroy() {}
}

PBSController.Controller = class extends PBSController.ControllerI {
	constructor( contentDom, contentProvider, saveProvider ) {
		super( contentDom, contentProvider );
		this._contentDom = contentDom;
		this._contentProvider = contentProvider;
		this._saveProvider = saveProvider;
		this._isEditing = false;
		this._isReady = false;
		this._isBusy = false;
	}

	get contentProvider() {
		return this._contentProvider;
	}

	get isReady() {
		return this._isReady;
	}

	set isReady( isReady ) {
		if ( this._isReady === !! isReady ) {
			return;
		}
		this._isReady = !! isReady;
		if ( this._isReady ) {
			document.body.parentNode.classList.add( 'pbs-ready' );
			wp.hooks.doAction( 'pbs.ready' );
		}
	}

	get isEditing() {
		return this._isEditing;
	}

	get isBusy() {
		return this._isBusy;
	}

	set isBusy( isBusy ) {
		if ( this._isBusy === !! isBusy ) {
			return;
		}
		this._isBusy = !! isBusy;
		if ( this._isBusy ) {
			document.body.parentNode.classList.add( 'pbs-busy' );
			wp.hooks.doAction( 'pbs.busy' );
		} else {
			document.body.parentNode.classList.remove( 'pbs-busy' );
			wp.hooks.doAction( 'pbs.notbusy' );
		}
	}

	init() {
		this.isReady = true;
	}

	edit() {
		if ( ! this.isReady ) {
			return false;
		}
		if ( ! wp.hooks.applyFilters( 'pbs.edit.continue', true ) ) {
			return false;
		}
		document.body.parentNode.classList.add( 'pbs-editing' );
		this._contentDom.classList.add( 'pbs-editing' );
		this._isEditing = true;
		wp.hooks.doAction( 'pbs.edit' );
		wp.hooks.doAction( 'pbs.start' );
		this._saveProvider.clearData();
		return true;
	}

	cancel() {
		document.body.parentNode.classList.remove( 'pbs-editing' );
		this._contentDom.classList.remove( 'pbs-editing' );
		this._isEditing = false;
		wp.hooks.doAction( 'pbs.cancel' );
		wp.hooks.doAction( 'pbs.stop' );
	}

	save( callback = function() {} ) {

		wp.hooks.doAction( 'pbs.save.before', this );

		// Get the content and save it!
		var content = this._contentProvider.content;
		content = wp.hooks.applyFilters( 'pbs.save', content ).replace( /\\/g, '\\\\' );
		this._saveProvider.addData( 'main-content', content );

		// Show that we're busy saving.
		this.isBusy = true;

		// Perform the actual saving.
		this._saveProvider.save( this._saveCallback.bind( this, callback ) );
	}

	_saveCallback( callback = function() {} ) {

		if ( typeof callback === 'function' ) {
			callback();
		}

		// No longer busy.
		this.isBusy = false;

		// Reset the state of PBS.
		document.body.parentNode.classList.remove( 'pbs-editing' );
		this._contentDom.classList.remove( 'pbs-editing' );
		this._isEditing = false;
		wp.hooks.doAction( 'pbs.stop' );

		// Allow others to do something after saving.
		wp.hooks.doAction( 'pbs.save.after', this );
	}

	destroy() {
		document.body.parentNode.classList.remove( 'pbs-ready' );
		document.body.parentNode.classList.remove( 'pbs-busy' );
		document.body.parentNode.classList.remove( 'pbs-editing' );
		this._contentDom.classList.remove( 'pbs-editing' );
		this._isEditing = false;
		this.isReady = false;
		this.isBusy = false;
		wp.hooks.doAction( 'pbs.destroy' );
	}
}

PBSController.CTController = class extends PBSController.Controller {

	constructor( CTEditor, contentDom, contentProvider, saveProvider ) {
		super( contentDom, contentProvider, saveProvider );
		this._editor = CTEditor;

		// Instead of allowing a call to init() to indicate that the editor is ready,
		// we need to wait for CT to finish doing its thing for the editor to
		// become ready.
		wp.hooks.addAction( 'pbs.ct.mounted', 'pbs', this.ctMounted.bind( this ) );

		// Before clicking the save button, make all our manual modifications permanent.
		wp.hooks.addAction( 'pbs.save.before', 'pbs', window.PBSEditor.updateModifiedContent );

		// Listen to CT's stop and save triggers to get called before
		// triggering PBS to stop / save.
		this._editor.bind( 'stop', this.ctStopped.bind( this ) );
	}

	edit() {
		if ( ! this._editor._ignition ) {
			throw 'Content Tools is not mounted yet';
		}

		if ( super.edit() ) {

			// Prompt CT to start.
			this._editor._ignition.trigger( 'start' );
		}
	}

	cancel() {

		if ( ! this._editor._ignition ) {
			throw 'Content Tools is not mounted yet';
		}

		// Let CT handle this call.
		// super.cancel();

		// Prompt CT to cancel.
		return this._editor._ignition.trigger( 'stop', false );
	}

	save( callback = function() {} ) {

		if ( ! this._editor._ignition ) {
			throw 'Content Tools is not mounted yet';
		}

		super.save( callback );

		// Prompt CT to save.
        return this._editor._ignition.trigger( 'stop', true );
	}

	// When CT gets mounted, we are finally ready.
	ctMounted() {
		this.isReady = true;
	}

	ctStopped() {
		super.cancel();
	}

	// Don't set PBS isReady because the pbs.ct.mounted hook will set it.
	init() {
		// super.init();

		window._contentToolsShim( this._editor );
		this._editor.init( [ this._contentDom ], 'data-name' );
	}

	destroy() {
		super.destroy();
		this._editor.destroy();
	}
}

PBSController.PostCTController = class extends PBSController.CTController {
	constructor( CTEditor, contentDom, contentProvider, saveProvider ) {
		super( CTEditor, contentDom, contentProvider, saveProvider );
	}

	save( callback = function() {} ) {

		var reloadPageIfPreviewBound = function( xhr ) {

			// Reload the page if needed.
			this.reloadPageIfPreview( xhr );

			// Remove the handler so that other non-post editors won't do this.
			wp.hooks.removeAction( 'pbs.save.post.xhr', 'pbs', reloadPageIfPreviewBound );
		}.bind( this );

		this._saveProvider.addData( 'action', 'gambit_builder_save_content' );
		this._saveProvider.addData( 'save_nonce', pbsParams.nonce ); // Separate this dependency
		this._saveProvider.addData( 'post_id', pbsParams.post_id ); // Separate this dependency

		// Temporary fix.
		// this._saveProvider.addData( 'style', this._contentProvider.styles );
		var styleData = '';
		if ( document.querySelector('style#pbs-style') ) {
			styleData = document.querySelector('style#pbs-style').innerHTML;
		}
		this._saveProvider.addData( 'style', styleData );

		wp.hooks.doAction( 'pbs.save.post.before', this );

		// Reload the page for posts only.
		wp.hooks.addAction( 'pbs.save.post.xhr', 'pbs', reloadPageIfPreviewBound );
		return super.save( callback );
	}

	reloadPageIfPreview( xhr ) {

		var currentHref;

		// If we're not in the permalink, direct to the permalink so that
		// if the user presses on refresh, they will see the new content.
		if ( xhr.responseText.match( /(http|https):\/\// ) ) {
			currentHref = window.location.href.replace( /#\.*$/, '' );
			if ( xhr.responseText !== currentHref ) {
				window.location.href = xhr.responseText;
				return;
			}
		}

		// If the builder wrapper failed to render, this means that
		// we're showing just the post content when editing.
		var isFallbackWrapper = !! document.querySelector( '.pbs-orig-page-content' ); // Separate this dependency

		if ( isFallbackWrapper ) {
			window.location.reload();
		}
	}
}

/**
 * The main content being edited.
 */
PBSContent = {};
PBSContent.ContentI = class {
	constructor( contentElement, styleElement ) {}
	get content() {}
	set content( html ) {}
	get styles() {}
	set styles( styles ) {}
	get contentElement() {}
	get styleElement() {}
}

PBSContent.Content = class extends PBSContent.ContentI {
	constructor( contentElement, styleElement ) {
		super( contentElement, styleElement );
		this._contentElement = contentElement;
		this._styleElement = styleElement;
	}

	get content() {
		return this._contentElement.innerHTML;
	}

	set content( html ) {
		this._contentElement.innerHTML = html;
		return this;
	}

	get styles() {
		return this._styleElement ? this._styleElement.innerHTML : '';
	}

	set styles( styles ) {
		this._styleElement.innerHTML = html;
		return this;
	}

	get contentElement() {
		return this._contentElement;
	}

	get styleElement() {
		return this._styleElement;
	}
}

PBSContent.CTContent = class extends PBSContent.Content {
	constructor( ctEditor, contentElement, styleElement ) {
		super( contentElement, styleElement );
		this._editor = ctEditor;
	}

	get content() {
		var regions = this._editor.regions();

		return regions.hasOwnProperty( 'main-content' ) ? regions['main-content'].html() : '';
	}

	set content( html ) {
		var regions = this._editor.regions();

		if ( ! regions.hasOwnProperty( 'main-content' ) ) {
			throw 'The content dom cannot be found';
		}

		regions['main-content'].setContent( html );

		return this;
	}

	set styles( styles ) {
		// TODO
		return super.styles( styles );
	}

	get styles() {
		return super.styles;
	}
}

/**
 * This is in charge of saving stuff.
 */
PBSSaver = {};
PBSSaver.SaverI = class {
	constructor() {}
	get data() {}
	set data( data ) {}
	save( callback = function() {} ) {}
	addData( name, value ) {}
	clearData() {}
}

PBSSaver.Saver = class extends PBSSaver.SaverI {

	constructor() {
		super();
		this._data = {};
	}

	save( callback = function() {} ) {
		super.save( callback );
		callback();
		return this;
	}

	get data() {
		return this._data;
	}

	set data( data ) {
		this._data = data;
		return this;
	}

	addData( name, value ) {
		this._data[ name ] = value;
		return this;
	}

	clearData() {
		this._data = {};
	}
}

PBSSaver.AjaxSaver = class extends PBSSaver.Saver {

	constructor() {
		super();
		this._data = new FormData();
	}

	save( callback = function() {} ) {

		var xhr = new XMLHttpRequest();
		xhr.onload = this._postCallback.bind( this, xhr, callback );
		xhr.open( 'POST', pbsParams.ajax_url );
		xhr.send( this.data );
	}

	_postCallback( xhr, callback = function() {} ) {

		if ( xhr.status >= 200 && xhr.status < 400 ) {
			super.save( callback );

		} else {
			if ( alert ) {
				alert( 'Oops! I encountered an error during saving: ' + xhr.statusText );
			}
			throw 'There was an ajax error during saving: ' + xhr.statusText;
		}
	}

	addData( name, value ) {
		this._data.append( name, value );
		return this;
	}

	clearData() {
		this._data = new FormData();
	}
}

PBSSaver.AjaxPostSaver = class extends PBSSaver.AjaxSaver {

	save( callback = function() {} ) {
		this.data = wp.hooks.applyFilters( 'pbs.save.payload', this.data );
		super.save( callback );
		wp.hooks.doAction( 'pbs.save.payload.after', this.data );
	}

	_postCallback( xhr, callback = function() {} ) {

		super._postCallback( xhr, callback );

		if ( xhr.status >= 200 && xhr.status < 400 ) {

			// Allow others to do stuff after receiving a successful post.
			wp.hooks.doAction( 'pbs.save.post.xhr', xhr, this );
		}
	}
}

/**
 * The admin bar class is the main top bar where our main PBS buttons are present.
 * We mainly add/remove buttons to this.
 */
PBSAdminBar = {};
PBSAdminBar.AdminBarI = class {
	constructor( controller, saveProvider, domElement, editElement, saveElement, cancelElement, busyIndicatorElement, { savePublishElement, saveDraftElement, savePendingElement } ) {}
	get domElement() {}
	addButton( name, button ) {}
	getButton( name ) {}
	getButtons() {}
	removeButton( name ) {}
}

PBSAdminBar.AdminBar = class extends PBSAdminBar.AdminBarI {
	constructor( controller, saveProvider, domElement, editElement, saveElement, cancelElement, busyIndicatorElement, { savePublishElement, saveDraftElement, savePendingElement, postStatus } ) {
		super( controller, saveProvider, domElement, editElement, saveElement, cancelElement, busyIndicatorElement, { savePublishElement, saveDraftElement, savePendingElement, postStatus } );
		this._controller = controller;
		this._saveProvider = saveProvider;
		this._domElement = domElement;
		this._editElement = editElement;
		this._saveElement = saveElement;
		this._cancelElement = cancelElement;
		this._busyIndicatorElement = busyIndicatorElement;
		this.buttons = {};

		this._domElement.classList.add( 'pbs-adminbar' );

		// Add the required buttons.
		this.addButton( 'edit', new PBSButton.Button( this._editElement, 'edit', this._controller.edit.bind( this._controller ) ) );
		this.addButton( 'save', new PBSButton.Button( this._saveElement, 'save', this._save.bind( this ) ) );
		this.addButton( 'cancel', new PBSButton.Button( this._cancelElement, 'cancel', this._controller.cancel.bind( this._controller ) ) );
		this.addButton( 'busy', new PBSButton.Button( this._busyIndicatorElement, 'busy' ) );

		// Other optional buttons.
		if ( savePublishElement ) {
			this.addButton( 'save-publish', new PBSButton.Button( savePublishElement, 'save-publish', this._savePublish.bind( this ) ) );
		}
		if ( saveDraftElement ) {
			this.addButton( 'save-draft', new PBSButton.Button( saveDraftElement, 'save-draft', this._saveDraft.bind( this ) ) );
		}
		if ( savePendingElement ) {
			this.addButton( 'save-pending', new PBSButton.Button( savePendingElement, 'save-pending', this._savePending.bind( this ) ) );
		}

		// Optional post status.
		if ( postStatus ) {
			this.applyPostStatusClass( postStatus );
		}
	}

	applyPostStatusClass( postStatus ) {
		var status, allStatus = ['publish', 'draft', 'pending'];
		if ( ! this._domElement ) {
			return;
		}
		for ( status of allStatus ) {
			if ( status !== postStatus ) {
				this._domElement.classList.remove( 'pbs-post-status-' + status );
			}
		}
		this._domElement.classList.add( 'pbs-post-status-' + postStatus );
	}

	_save() {
		this._controller.save.call( this._controller );
	}

	_savePublish() {
		this._saveProvider.addData( 'post_status', 'publish' );
		this.applyPostStatusClass( 'publish' );
		this._controller.save.call( this._controller );
	}

	_saveDraft() {
		this._saveProvider.addData( 'post_status', 'draft' );
		this.applyPostStatusClass( 'draft' );
		this._controller.save.call( this._controller );
	}

	_savePending() {
		this._saveProvider.addData( 'post_status', 'pending' );
		this.applyPostStatusClass( 'pending' );
		this._controller.save.call( this._controller );
	}

	get domElement() {
		return this._domElement;
	}

	addButton( name, button ) {
		this.buttons[ name ] = button;
		button.mount();
	}

	getButton( name ) {
		if ( typeof this.buttons[ name ] !== 'undefined' ) {
			return this.buttons[ name ];
		}
		return null;
	}

	removeButton( name ) {
		var button = this.getButton( name );

		if ( button ) {
			button.unmount();
			this.buttons[ name ] = undefined;
			delete this.buttons[ name ];
		}
	}

	getButtons() {
		return this.buttons;
	}
}

PBSAdminBar.CTAdminBar = class extends PBSAdminBar.AdminBar {
	constructor( controller, saveProvider, domElement, editElement, saveElement, cancelElement, busyIndicatorElement, { savePublishElement, saveDraftElement, savePendingElement, postStatus } ) {
		super( controller, saveProvider, domElement, editElement, saveElement, cancelElement, busyIndicatorElement, { savePublishElement, saveDraftElement, savePendingElement, postStatus } );
		wp.hooks.addAction( 'pbs.ct.mounted.pre', 'pbs', this.mountButtons.bind( this ), 1 );
	}

	mountButtons( ignition ) {
		ignition._domElement = this.domElement;
	  	ignition._domEdit = this.getButton( 'edit' ).domElement;
		ignition._domConfirm = this.getButton( 'save' ).domElement;
		ignition._domCancel = this.getButton( 'cancel' ).domElement;
		ignition._domBusy = this.getButton( 'busy' ).domElement;
	}
}

PBSModal = {};
PBSModal.ModalI = class {
	constructor( template ) {}
	get element() {}
	init() {}
	destroy() {}
	show() {}
	hide() {}
}

PBSModal.Modal = class extends PBSModal.ModalI {
	constructor( template ) {
		super( template );
		this._template = template;
		this._domElement = null;
	}

	get element() {
		return this._domElement;
	}

	init() {
		var closeButton;

		super.init();

		this._domElement = document.createElement( 'DIV' );
		this._domElement.classList.add( 'pbs-modal-background' );
		this._domElement.innerHTML = wp.template( 'pbs-modal' )();

		this._domElement.querySelector( '.pbs-modal-content-wrapper' ).setAttribute( 'id', 'pbs-modal-' + this._template );

		closeButton = this._domElement.querySelector( '.pbs-modal-close' );
		if ( closeButton ) {
			closeButton.addEventListener( 'click', this.hide.bind( this ) );
		}
		this._domElement.addEventListener( 'click', function( ev ) {
			if ( ev.currentTarget === ev.target ) {
				this.hide();
			}
		}.bind( this ) );

		this._domElement.querySelector( '.pbs-modal-content' ).innerHTML = wp.template( this._template )();

		document.body.appendChild( this._domElement );

		wp.hooks.doAction( 'pbs.modal.init', this );
	}

	destroy() {
		super.destroy();

		if ( this._domElement ) {
			this._domElement.parentNode.removeChild( this._domElement );
			this._domElement = null;

			wp.hooks.doAction( 'pbs.modal.destroy', this );
		}
	}

	show() {
		if ( ! this._domElement ) {
			throw 'Modal has not been initialized yet.';
		}

		super.show();

		this._domElement.classList.add( 'pbs-modal-show' );
		setTimeout( function() {
			if ( this._domElement ) {
				this._domElement.classList.add( 'pbs-modal-anim' );
			}
		}.bind( this ), 50 );

		wp.hooks.doAction( 'pbs.modal.show', this );
	}

	hide() {
		if ( ! this._domElement ) {
			throw 'Modal has not been initialized yet.';
		}

		super.hide();

		this._domElement.classList.remove( 'pbs-modal-show' );
		this._domElement.classList.remove( 'pbs-modal-anim' );

		wp.hooks.doAction( 'pbs.modal.hide', this );
	}
}

new ( function() {
	var ready = function() {

		var editor = ContentTools.EditorApp.get();
		var pbsMainWrapper = document.querySelector( '.pbs-main-wrapper' );
		var pbsStyle = document.querySelector( 'style#pbs-style' );
		var saveProvider = new PBSSaver.AjaxPostSaver();

		if ( ! pbsStyle ) {
			pbsStyle = document.createElement('STYLE');
			pbsStyle.setAttribute('id', 'pbs-style');
			document.body.appendChild(pbsStyle);
		}

		var contentProvider = new PBSContent.CTContent(
			editor,
			pbsMainWrapper,
			pbsStyle
		);
		var ignitionController = new PBSController.PostCTController( editor, pbsMainWrapper, contentProvider, saveProvider );

		PBS = new PBSI( ignitionController );

		var adminBar = new PBSAdminBar.CTAdminBar(
			ignitionController,
			saveProvider,

			document.querySelector( '#wpadminbar' ),
			document.querySelector( '#wp-admin-bar-gambit_builder_edit' ),
			document.querySelector( '#wp-admin-bar-gambit_builder_save' ),
			document.querySelector( '#wp-admin-bar-gambit_builder_cancel' ),
			document.querySelector( '#wp-admin-bar-gambit_builder_busy' ),

			// Optional arguments.
			{
				savePublishElement: document.querySelector( '#wp-admin-bar-gambit_builder_save_options #pbs-save-publish' ),
				saveDraftElement: document.querySelector( '#wp-admin-bar-gambit_builder_save_options #pbs-save-draft' ),
				savePendingElement: document.querySelector( '#wp-admin-bar-gambit_builder_save_options #pbs-save-pending' ),

				postStatus: pbsParams.post_status
			}
		);

		var openHelp = function( ev ) {
			ev.preventDefault();
			window.open( 'http://docs.pagebuildersandwich.com/', '_help' );
		};
		var helpButton = new PBSButton.Button( document.querySelector( '#wp-admin-bar-pbs_help_docs' ), 'help', openHelp );
		adminBar.addButton( 'help', helpButton );

		PBS.init();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentTools, ContentEdit, HTMLString */

/**
 * We need to perform some functions with ContentTools that shouldn't necessarily be part
 * of ContentTools itself since they are outside its scope. We add them in here
 */

window.PBSEditor = {};

window.PBSEditor.getToolUI = function( name ) {
	var tool;

	// Check in the toolbox formatting bar.
	if ( window.PBSEditor.ToolboxFormatting ) {
		tool = window.PBSEditor.ToolboxFormatting.getInstance().getTool( name );
		if ( tool ) {
			return tool;
		}
	}

	if ( ContentTools.EditorApp.get()._toolboxElements._toolUIs[ name ] ) {
		return ContentTools.EditorApp.get()._toolboxElements._toolUIs[ name ];
	}
	return ContentTools.EditorApp.get()._toolbox._toolUIs[ name ];
};

/**
 * Add a new property _ceElement to all domElement that reference a ContentEdit Element
 */
ContentEdit.Root.get().bind( 'mount', function( element ) {

    // Map the element to it's DOM element
    element.domElement()._ceElement = element;
} );

/**
 * Remove the yellow highlight in CT that highlights the whole editing area.
 */
ContentTools.EditorApp.get().highlightRegions = function() {};

/**
 * Updates the whole Editor's content if something in the DOM was manually changed.
 */
window.PBSEditor.updateModifiedContent = function() {

	// Go through all the editable regions of CT
	var i, regions = ContentTools.EditorApp.get().regions();
	for ( i in regions ) {
		if ( regions.hasOwnProperty( i ) ) {

			// Go through all the children / Element Nodes
			window.PBSEditor.updateModifiedContentRecursive( regions[ i ] );
		}
	}
};

/**
 * Updates the element's content status recursively
 */
window.PBSEditor.updateModifiedContentRecursive = function( element ) {

	var ctElement, k, children = element.children;
	if ( children ) {
		for ( k = 0; k < children.length; k++ ) {

			// Check if the html CT thinks it has matches the actual html in the Dom.
			ctElement = children[ k ];

			if ( 'undefined' !== typeof ctElement.content && ctElement.content.html() !== ctElement._domElement.innerHTML ) {

				// Update the Element's content
				window.PBSEditor.updateElementContent( ctElement, ctElement._domElement.innerHTML );
			}

			window.PBSEditor.updateModifiedContentRecursive( ctElement );
		}
	}
};

/**
 * Updates an Element object's content into newContent.
 */
window.PBSEditor.updateElementContent = function( element, newContent ) {
	if ( 'Shortcode' === element.constructor.name ) {
		return;
	}

	// Retain preserve whitespace, or else some elements (e.g. preformatted) will lose line breaks.
	element.content = new HTMLString.String( newContent, element.content.preserveWhitespace() ).trim();
	element.updateInnerHTML();
	element.taint();
};

/**
 * Gets the unique ID of an element if it exists. Null if there is none.
 * Mostly used for adding pseudo element styles using addPseudoElementStyles
 */
window.PBSEditor.getUniqueClassName = function( domElement ) {
	var classes, matches;
	if ( domElement.getAttribute( 'class' ) ) {
		classes = domElement.getAttribute( 'class' );
		matches = classes.match( /pbsguid-\w+/ );
		if ( matches ) {
			return matches[0];
		}
	}
	return null;
};

/**
 * Removes the unique ID of an element if it has one.
 * Mostly used for adding pseudo element styles using addPseudoElementStyles
 */
window.PBSEditor.removeUniqueClassName = function( domElement ) {
	var classes, matches;
	if ( domElement.getAttribute( 'class' ) ) {
		classes = domElement.getAttribute( 'class' );
		matches = classes.match( /pbsguid-\w+/ );
		if ( matches ) {
			domElement.classList.remove( matches[0] );
			return true;
		}
	}
	return false;
};

/**
 * Generates a unique ID.
 * Mostly used for adding pseudo element styles using addPseudoElementStyles
 */
window.PBSEditor.generateUniqueClassName = function() {
	var name;
	do {
		name = 'pbsguid-' + window.PBSEditor.generateHash();
	} while ( document.querySelector( '.' + name ) );
	return name;
};

/**
 * Generates a unique hash.
 * Used for identifying unique stuff.
 */
window.PBSEditor.generateHash = function() {
	return Math.floor( ( 1 + Math.random() ) * 0x100000000 ).toString( 36 ).substring( 1 );
};

/**
 * Adds raw pseudo element styles directly into the style tag dedicated to pseudo element styles.
 * Similar to window.PBSEditor.addPseudoElementStyles, except that this doesn't
 * perform any duplication checks and just directly adds the styles.
 * @param string styles The styles to add.
 * @return string The added styles.
 */
window.PBSEditor.addPseudoElementStylesRaw = function( styles ) {

	// Create style tag if it doesn't exist yet.
	var styleTag = document.querySelector( 'style#pbs-style' );
	var currentStyles, mainRegion;

	if ( ! styleTag ) {
		styleTag = document.createElement( 'style' );
		styleTag.setAttribute( 'id', 'pbs-style' );
		document.body.appendChild( styleTag );
	}
	currentStyles = styleTag.innerHTML + styles;

	// Taint the whole editor.
	mainRegion = ContentTools.EditorApp.get().regions()['main-content'];
	if ( 'undefined' === typeof mainRegion._debouncedTaint ) {
		mainRegion._debouncedTaint = _.debounce( function() {
			this.taint();
		}.bind( mainRegion ), 400 );
	}
	mainRegion._debouncedTaint();

	// Save the new styles.
	styleTag.innerHTML = currentStyles;
	return styles;
};

/**
 * Adds a pseudo element style. Adds the style tag used by PBS if it doesn't exist yet.
 * @param string selector The full selector (with the pseudo element) to add
 * @param object styles An object containing the style-name & style-value pairs to add
 * @return string The added style string.
 */
window.PBSEditor.addPseudoElementStyles = function( selector, styles ) {

	var currentStyles, styleName, value, escapedSelector, re, mainRegion;
	var styleString = '';

	// Clean up first.
	var selectorStillExists = window.PBSEditor.removePseudoElementStyles( selector, Object.keys( styles ) );

	// Create style tag if it doesn't exist yet.
	var styleTag = document.querySelector( 'style#pbs-style' );
	if ( ! styleTag ) {
		styleTag = document.createElement( 'style' );
		styleTag.setAttribute( 'id', 'pbs-style' );
		document.body.appendChild( styleTag );
	}
	currentStyles = styleTag.innerHTML;

	// Create a string of styles.
	for ( styleName in styles ) {
		if ( styles.hasOwnProperty( styleName ) ) {
			value = styles[ styleName ];
			if ( value.trim ) {
				value = value.trim();
			}
			if ( value ) {
				styleString += styleName + ': ' + value + ';';
			}
		}
	}

	// Add the style.
	escapedSelector = selector.replace( /\./g, '\\.' );
	if ( selectorStillExists ) {
		re = new RegExp( '(' + escapedSelector + '\\s*\\{)', 'gm' );
		currentStyles = currentStyles.replace( re, '$1' + styleString );
	} else {
		currentStyles += selector + ' {' + styleString + '}';
	}

	// Taint the whole editor.
	mainRegion = ContentTools.EditorApp.get().regions()['main-content'];
	if ( 'undefined' === typeof mainRegion._debouncedTaint ) {
		mainRegion._debouncedTaint = _.debounce( function() {
			this.taint();
		}.bind( mainRegion ), 400 );
	}
	mainRegion._debouncedTaint();

	// Save the new styles.
	styleTag.innerHTML = currentStyles;
	return styleString;
};

/**
 * Gets a pseudo element style.
 * @param string selector The full selector (with the pseudo element) to get
 * @param string style The name of the style to get
 * @return string The existing style, null if none was found.
 */
window.PBSEditor.getPseudoElementStyles = function( selector, style ) {

	var currentStyles, selectorPattern, re, matches, stylesMatch, k, styleMatch, value;

	// Create style tag if it doesn't exist yet.
	var styleTag = document.querySelector( 'style#pbs-style' );
	if ( ! styleTag ) {
		return null;
	}
	currentStyles = styleTag.innerHTML;
	selectorPattern = selector.replace( /\./g, '\\.' );

	re = new RegExp( selectorPattern + '\\s*\\{([\\s\\S]*?)\\}', 'm' );
	matches = currentStyles.match( re );
	if ( ! matches ) {
		return null;
	}
	stylesMatch = matches[1].replace( /;$/, '' ).split( ';' );
	for ( k = 0; k < stylesMatch.length; k++ ) {
		styleMatch = stylesMatch[ k ].match( new RegExp( '^' + style + '\\s*:([\\s\\S]*$)' ) );
		if ( styleMatch ) {
			value = styleMatch[1].trim();
			if ( value ) {
				value = value.replace( /\s*!important/, '' );
			}
			return value;
		}
	}
	return null;
};

/**
 * Removes a set of pseudo element styles. Also cleans up the style tag,
 * and also removes it if no longer needed.
 * @param string selector The full selector (with the pseudo element) to get
 * @param string|array styles A style name or a list of style names to remove.
 * @return boolean False if the guid used in the selector is no longer used. True if the guid is still used.
 */
window.PBSEditor.removePseudoElementStyles = function( selector, styles ) {

	var styleTag, selectorPattern, re, stylesMatch, currentStyles, i, styleName, matches, k;

	if ( 'string' === typeof styles ) {
		styles = [ styles ];
	}
	styleTag = document.querySelector( 'style#pbs-style' );
	if ( ! styleTag ) {
		return false;
	}
	selectorPattern = selector.replace( /\./g, '\\.' );

	// Remove the style from the style tag.
	currentStyles = styleTag.innerHTML;

	for ( i = 0; i < styles.length; i++ ) {
		styleName = styles[ i ];
		re = new RegExp( selectorPattern + '\\s*\\{([\\s\\S]*?)\\}', 'm' );
		matches = currentStyles.match( re );
		if ( matches ) {
			stylesMatch = matches[1].replace( /;$/, '' ).split( ';' );
			for ( k = 0; k < stylesMatch.length; k++ ) {
				if ( stylesMatch[ k ].match( new RegExp( '^' + styleName + '\\s*:' ) ) ) {
					stylesMatch.splice( k, 1 );
					break;
				}
			}
			stylesMatch = stylesMatch.join( ';' );
			currentStyles = currentStyles.replace( matches[0], '' );
			currentStyles += selector + ' {' + stylesMatch + '}';
		}
	}

	// Remove empty styles/selectors.
	currentStyles = currentStyles.replace( /(^|[^\}])+\{[\s]*\}/gm, '' ).trim();

	// If no more styles, remove the style tag.
	if ( ! currentStyles ) {
		styleTag.parentNode.removeChild( styleTag );
		return false;
	} else {
		styleTag.innerHTML = currentStyles;
	}

	// If return true if the guid selector is still being used. False if it isn't used anymore.
	re = new RegExp( selectorPattern + '\\s*\\{', 'gm' );
	return !! styleTag.innerHTML.match( re );
};

/**
 * Converts an SVG element into a URL string that can be added as a CSS background-image rule.
 * @param DOM Object svgElement The SVG dom element.
 * @return string The converted URL() string that can be added as a CSS background-image rule.
 */
window.PBSEditor.convertSVGToBackgroundImage = function( svgElement ) {

	var svgString;

	// We always need this for SVG to work.
	svgElement.setAttribute( 'xmlns', 'http://www.w3.org/2000/svg' );
	svgString = svgElement.outerHTML;

	// Convert all " to '.
	svgString = svgString.replace( /"/g, '\'' );

	// Convert all < to %3C
	svgString = svgString.replace( /</g, '%3C' );

	// Convert all > to %3E
	svgString = svgString.replace( />/g, '%3E' );

	// Convert all & to %26
	svgString = svgString.replace( /&/g, '%26' );

	// Convert all # to %23
	svgString = svgString.replace( /#/g, '%23' );

	// Remove all line breaks
	svgString = svgString.replace( /\n/g, '' );

	// Wrap in url("")
	// Prefix with data:image/svg+xml,
	svgString = 'url("data:image/svg+xml,' + svgString + '")';
	return svgString;
};

window.PBSEditor.isCtrlDown = false;
window.PBSEditor.isShiftDown = false;

( function() {
	var ready = function() {
		document.addEventListener( 'keydown', function( ev ) {
			if ( ev.ctrlKey || ev.metaKey ) {
				window.PBSEditor.isCtrlDown = true;
			}
			if ( ev.shiftKey ) {
				window.PBSEditor.isShiftDown = true;
			}
		} );
		document.addEventListener( 'keyup', function( ev ) {
			if ( ! ev.ctrlKey && ! ev.metaKey ) {
				window.PBSEditor.isCtrlDown = false;
			}
			if ( ! ev.shiftKey ) {
				window.PBSEditor.isShiftDown = false;
			}
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

// TODO: CHECK IF STILL NEEDED.
/**
 * ContentTools does not support left & right placements ONLY, it always
 * includes the center. This adjusts things to ignore the center placement
 * only if left & right are given.
 */
( function() {
	var _Root = ContentEdit.Root.get();
	var proxied = _Root._getDropPlacement;
	_Root._getDropPlacement = function( x, y ) {

		var placements, rect, _ref, vert, horz;

		if ( ! this._dropTarget ) {
			return null;
		}

		placements = this._dropTarget.constructor.placements;
		if ( placements.indexOf( 'center' ) === -1 && placements.indexOf( 'left' ) !== -1 && placements.indexOf( 'right' ) !== -1 ) {

			rect = this._dropTarget.domElement().getBoundingClientRect();
	        _ref = [ x - rect.left, y - rect.top ], x = _ref[0], y = _ref[1];

			horz = 'center';
			if ( x < rect.width / 2 ) {
				horz = 'left';
			} else {
				horz = 'right';
			}

	        vert = 'above';
	        if ( y > rect.height / 2 ) {
	          vert = 'below';
	        }

			return [ vert, horz ];
		}

		return proxied.call( this, x, y );
	};
} )();

/**
 * Disallow links to work when editing.
 */
( function() {
	var ready = function() {
		document.body.addEventListener( 'click', function( ev ) {
			if ( PBS.isEditing ) {
				if ( 'A' === ev.target.tagName ) {
					if ( window.pbsSelectorMatches( ev.target, '.pbs-main-wrapper *' ) ) {
						ev.preventDefault();
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

/* globals ContentEdit */

/**
 * Style function
 * Gets or sets a CSS style
 */
ContentEdit.Element.prototype.style = function( name, value ) {
	var style;

	if ( 'undefined' === typeof value ) {
		if ( ! this._domElement ) {
			return null;
		}
		style = this._domElement.style[ name ];
		if ( ! style ) {
			style = window.getComputedStyle( this._domElement );
			return style[ name ];
		}
		return style;
	}

	if ( ! this._domElement ) {
		return value;
	}

	// Don't do anything if the value remains the same.
	if ( this._domElement.style[ name ] === value ) {
		return value;
	}

	this._domElement.style[ name ] = value;
	style = this._domElement.getAttribute( 'style' );
	if ( null === style ) {
        this._attributes.style = '';
        if ( this.isMounted() ) {
			this._domElement.removeAttribute( 'style' );
        }
		if ( 'undefined' === typeof this.debouncedTaint ) {
			this.debouncedTaint = _.debounce( function() {
				this.taint();
			}.bind( this ), 400 );
		}
		return this.debouncedTaint();
	}

	// Make sure rgba() opacity don't have more than 2 decimals.
	while ( style.match( /(rgba\(\s*\d+,\s*\d+,\s*\d+,\s*\d+.\d{2})\d+/i ) ) {
		style = style.replace( /(rgba\(\s*\d+,\s*\d+,\s*\d+,\s*\d+.\d{2})\d+/i, '$1' );
	}
	return this.attr( 'style', style );
};

/**
 * Gets the default styling for the element.
 */
ContentEdit.Element.prototype.defaultStyle = function( name ) {

	var origStyleAttribute, defaultStyle;

	if ( ! this._domElement ) {
		return '';
	}

	// Get the original state of the style attribute.
	origStyleAttribute = this._domElement.getAttribute( 'style' );

	// Reset the style.
	this._domElement.style[ name ] = '';

	// Get the style value.
	defaultStyle = window.getComputedStyle( this._domElement );

	if ( 'undefined' !== typeof defaultStyle[ name ] ) {
		defaultStyle = defaultStyle[ name ];
	} else {
		defaultStyle = 0;
	}

	// Bring back the default style attribute.
	if ( origStyleAttribute ) {
		this._domElement.setAttribute( 'style', origStyleAttribute );
	} else {
		this._domElement.removeAttribute( 'style' );
	}

	return defaultStyle;
};

/**
 * The removeAttribute function in CT doesn't delete existing attributes that are blank.
 * This allows the deletion of blank attributes.
 */
( function() {
	var proxy = ContentEdit.Element.prototype.removeAttr;
	ContentEdit.Element.prototype.removeAttr = function( name ) {
		name = name.toLowerCase();
		if ( ! this._attributes[ name ] && this._attributes.hasOwnProperty( name ) ) {
			delete this._attributes[ name ];
			if ( this.isMounted() && 'class' !== name.toLowerCase() ) {
				this._domElement.removeAttribute( name );
			}
			return this.taint();
		}
		return proxy.call( this, name );
	};
} )();

/**
 * Override attr so that changes trigger a debounced taint to fix the history/undo.
 */
ContentEdit.Element.prototype.attr = function( name, value, forceSet ) {
	name = name.toLowerCase();
	if ( value === void 0 ) {
		return this._attributes[name];
	}

	if ( this._attributes[name] === value ) {
		return;
	}

	this._attributes[name] = value;
	if ( this.isMounted() && 'class' !== name.toLowerCase() ) {
		if ( '' !== value || forceSet ) {
			this._domElement.setAttribute( name, value );
		} else {
			this._domElement.removeAttribute( name );
		}
	}

	// Do the debounce taint.
	if ( 'undefined' === typeof this.debouncedTaint ) {
		this.debouncedTaint = _.debounce( function() {
			this.taint();
		}.bind( this ), 400 );
	}

	ContentEdit.Root.get().trigger( 'debounced_taint', this );

	return this.debouncedTaint();
};

/**
 * Removes all CSS classes of the element.
 */
ContentEdit.Element.prototype.removeAllCSSClasses = function() {
	var i;

	if ( this._domElement && this._domElement.classList ) {
		for ( i = this._domElement.classList.length - 1; i >= 0; i-- ) {
			this.removeCSSClass( this._domElement.classList.item( i ) );
		}
	}
};

/* globals ContentTools, ContentEdit */

/**
 * Some necessary functions in ContentTools aren't implemented yet.
 * We'll implement it on our own first until they arrive
 */

window._contentToolsShim = function( editor ) {
	editor.start = function() {
	    ContentTools.EditorApp.getCls().prototype.start.call( this );
	    editor.trigger( 'start' );
	};

	editor.stop = function() {
	    ContentTools.EditorApp.getCls().prototype.stop.call( this );
	    editor.trigger( 'stop' );
	};
};

( function() {
	var proxied = ContentEdit.Element.prototype._addCSSClass;
	var ignoredClasses = [
		'ce-element--drop',
		'ce-element--drop-above',
		'ce-element--drop-below',
		'ce-element--drop-left',
		'ce-element--drop-right',
		'ce-element--drop-center',
		'ce-element--over',
		'ce-element--resize-top-left',
		'ce-element--resize-top-right',
		'ce-element--resize-bottom-left',
		'ce-element--resize-bottom-right',
		'ce-element--resize',
		'ce-element--resizing',
		// 'ce-element--dragging',
		'ce-element--focused'
	];
    ContentEdit.Element.prototype._addCSSClass = function( className ) {
		if ( ignoredClasses.indexOf( className ) !== -1 ) {
			return;
		}
		if ( 'ce-element--over' === className ) {
			ContentEdit.Root.get().trigger( 'over', this );
		}
		return proxied.call( this, className );
	};
} )();

( function() {
	var proxied = ContentEdit.Element.prototype._removeCSSClass;
	var ignoredClasses = [
		'ce-element--drop',
		'ce-element--drop-above',
		'ce-element--drop-below',
		'ce-element--drop-left',
		'ce-element--drop-right',
		'ce-element--drop-center',
		'ce-element--over',
		'ce-element--resize-top-left',
		'ce-element--resize-top-right',
		'ce-element--resize-bottom-left',
		'ce-element--resize-bottom-right',
		'ce-element--resize',
		'ce-element--resizing',
		// 'ce-element--dragging',
		'ce-element--focused'
	];
    ContentEdit.Element.prototype._removeCSSClass = function( className ) {
		if ( ignoredClasses.indexOf( className ) !== -1 ) {
			return;
		}
		if ( 'ce-element--over' === className ) {
			ContentEdit.Root.get().trigger( 'out', this );
		}
		return proxied.call( this, className );
	};
} )();

/**
 * Fires pbs.ct.ready when the edit button becomes available.
 */
( function() {
	var ready = function() {
		var starterInterval;

		if ( ! document.querySelector( '[data-name="main-content"]' ) ) {
			return;
		}

		// Auto-start PBS if the localStorage key is set.
		starterInterval = setInterval( function() {
			if ( document.querySelector( '.ct-widget--active' ) ) {
				wp.hooks.doAction( 'pbs.ct.ready' );
				clearInterval( starterInterval );
			}
		}, 200 );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentTools, pbsParams */

ContentTools.IgnitionUIOriginal = ContentTools.IgnitionUI;
ContentTools.IgnitionUI = ( function( _super ) {
	__extends( IgnitionUI, _super );

	function IgnitionUI() {
		IgnitionUI.__super__.constructor.call( this );
	}

	// Override mounting, let PBS override the mounting of ignition buttons.
	IgnitionUI.prototype.mount = function() {
		wp.hooks.doAction( 'pbs.ct.mounted.pre', this );
		wp.hooks.doAction( 'pbs.ct.mounted', this );
	}

	return IgnitionUI;

} )( ContentTools.IgnitionUIOriginal );

/* globals ContentTools */

( function() {
	var proxied = ContentTools.History.prototype.undo;
	ContentTools.History.prototype.undo = function() {
		var ret = proxied.call( this );
		wp.hooks.doAction( 'pbs.undo' );
		return ret;

	};
} )();

( function() {
	var proxied = ContentTools.History.prototype.redo;
	ContentTools.History.prototype.redo = function() {

		var ret = proxied.call( this );
		wp.hooks.doAction( 'pbs.redo' );
		return ret;

	};
} )();

/* globals ContentEdit, ContentTools */

/**
 * Also use the bounding client rect for determining the current size.
 * This is a fallback, for cases where the width & height attributes
 * are not present. Or else the SHIFT+CTRL/CMD+CLICK action on resizables
 * will not work.
 */
( function() {
	var proxied = ContentEdit.ResizableElement.prototype.size;
    ContentEdit.ResizableElement.prototype.size = function( newSize ) {
		var height, width, rect;
		if ( ! newSize && this._domElement ) {
			rect = this._domElement.getBoundingClientRect();
			width = parseInt( rect.width || 1, 10 );
			height = parseInt( rect.height || 1, 10 );
			return [ width, height ];
		}
		return proxied.call( this, newSize );
    };
} )();

/**
 * Make sure that images do not get squished if the container width is narrower
 * than the image's width. Always set the height to auto to make it auto-adjust.
 */
( function() {
	var proxied = ContentEdit.ResizableElement.prototype.size;
	ContentEdit.ResizableElement.prototype.size = function( newSize ) {
		var ratio, parentWidth, ret = proxied.call( this, newSize );

		// Fix the height attribute to be always auto.
		if ( newSize && 2 === newSize.length && this.parent() ) {
			if ( this.parent()._domElement ) {
				parentWidth = window.pbsGetBoundingClientRect( this.parent()._domElement ).width;
				if ( newSize[0] > parentWidth ) {
					ratio = newSize[1] / newSize[0];
					newSize[0] = parentWidth;
					newSize[1] = newSize[0] * ratio;
				}
				this._domElement.style.width = newSize[0] + 'px';
				this._domElement.style.height = newSize[1] + 'px';
		   }
	   }
	   return ret;
   };
} )();

/**
 * When clicking on a resizable element while holding down SHIFT + CTRL/CMD
 * will reset the size to their defaults.
 */
( function() {
	var proxied = ContentEdit.ResizableElement.prototype._onMouseDown;
	ContentEdit.ResizableElement.prototype._onMouseDown = function( ev ) {
		var corner = this._getResizeCorner( ev.clientX, ev.clientY );

		if ( corner ) {
			if ( window.PBSEditor.isCtrlDown && window.PBSEditor.isShiftDown ) {
				this.style( 'width', 'auto' );
				this.style( 'height', 'auto' );
				this.attr( 'height', '' );
				this.attr( 'width', '' );
			}
		}

		proxied.call( this, ev );
	};
} )();

/**
 * Allow `*` droppers.
 */
( function() {
   var proxied = ContentEdit.Element.prototype.drop;
   ContentEdit.Element.prototype.drop = function( element, placement ) {
		var root = ContentEdit.Root.get();
		if ( element && 'undefined' !== typeof element.type ) {
			if ( ! this.constructor.droppers[ element.type() ] && ! element.constructor.droppers[ this.type() ] && element.constructor.droppers['*'] ) {
				element._removeCSSClass( 'ce-element--drop' );
				element._removeCSSClass( 'ce-element--drop-' + placement[0] );
				element._removeCSSClass( 'ce-element--drop-' + placement[1] );
				element.constructor.droppers['*']( this, element, placement );
				root.trigger( 'drop', this, element, placement );
				return;
			}
		}
		return proxied.call( this, element, placement );
	};
} )();
( function() {
   var proxied = ContentEdit.Element.prototype._onOver;
    ContentEdit.Element.prototype._onOver = function( ev ) {
		var root, dragging;
		var ret = proxied.call( this, ev );
		if ( ! ret ) {

	        root = ContentEdit.Root.get();
	        dragging = root.dragging();

	        if ( ! dragging ) {
				return;
	        }
	        if ( dragging === this ) {
				return;
	        }
	        if ( root._dropTarget ) {
				return;
	        }
	        if ( this.constructor.droppers['*'] ) {
				this._addCSSClass( 'ce-element--drop' );
				return root._dropTarget = this;
	        }
		}
		return ret;
    };
} )();

/**
 * We are using our own resizers, remove this because it's causing reflow.
 */
( function() {
	ContentEdit.ResizableElement.prototype._getResizeCorner = function() {
		return null;
	};
} )();

/**
 * Override this because we're not hiding widgetUIs, and the monitoring is causing reflow.
 */
( function() {
	ContentTools.WidgetUI.prototype.hide = function() {
		this.removeCSSClass( 'ct-widget--active' );
	};
} )();

// @see https://gist.github.com/bfintal/63527d3f9dd85e0b15d6

/* globals PBSEditor */

PBSEditor.Frame = wp.media.view.Frame.extend( {
	className: 'pbs-icon-modal',
	template:  wp.template( 'pbs-icon-frame' ),

	events: {
		'click .media-toolbar-primary button': '_primaryClicked'
	},

	initialize: function() {
		wp.media.view.Frame.prototype.initialize.apply( this, arguments );

		_.defaults( this.options, {
			title: 'My Modal', // Default title of the modal.
			button: 'My Button', // Default submit button of the modal.
			modal: true
		} );

		// Initialize modal container view.
		if ( this.options.modal ) {
			this.modal = new wp.media.view.Modal( {
				controller: this
			} );

			this.modal.content( this );

			this.modal.on( 'open', _.bind( function() {
				this._onOpen();
			}, this ) );

			this.modal.on( 'close', _.bind( function() {
				this._onClose();
			}, this ) );
		}
	},

	open: function( args ) {
		if ( ! args ) {
			args = {};
		}

		// Combine the default options and the arguments given.
		this.options = _.defaults( args, this.options );

		if ( args.content ) {
			this.modal.content( args.content( this ) );
		}
		this.modal.open();
		this.modal.el.children[0].classList.add( 'pbs-modal-frame' );
		if ( this.className ) {
			this.modal.el.children[0].classList.add( this.className );
		}

		if ( this.modal.el.querySelector( '.media-frame-title h1' ) ) {
			this.modal.el.querySelector( '.media-frame-title h1' ).textContent = this.options.title;
		}
		if ( this.modal.el.querySelector( '.media-toolbar-primary button' ) ) {
			this.modal.el.querySelector( '.media-toolbar-primary button' ).textContent = this.options.button;
		}

		this.modal.el.children[0].classList.add( 'pbs-frame-hide' );
		setTimeout( function() {
			this.modal.el.children[0].classList.remove( 'pbs-frame-hide' );
		}.bind( this ), 50 );
	},

	close: function() {
		this.modal.close();
	},

	_primaryClicked: function() {

		// Do stuff when the submit button is clicked.
		this.modal.close();
		if ( this.options.successCallback ) {
			this.options.successCallback( this );
		}
	},

	_onOpen: function() {

		// Do stuff when modal opens.
		if ( this.options.openCallback ) {
			this.options.openCallback( this );
		}
	},

	_onClose: function() {

		// Do stuff when modal closes.
		if ( this.options.closeCallback ) {
			this.options.closeCallback( this );
		}
	}
} );

/* globals PBSEditor */

PBSEditor.SearchFrame = PBSEditor.Frame.extend( {
	className: 'pbs-icon-modal',
	template:  wp.template( 'pbs-icon-frame' ),

	events: {
		'click .media-toolbar-primary button': '_primaryClicked'
	},

	_onOpen: function() {

		PBSEditor.Frame.prototype._onOpen.apply( this );
		setTimeout( function() {
			var searchInput = this.modal.el.querySelector( 'input[type="search"]' );
			searchInput.focus();
			searchInput.select();
		}.bind( this ), 1 );
		if ( ! this.selected ) {
			this.modal.el.querySelector( '.media-toolbar-primary button' ).setAttribute( 'disabled', 'disabled' );
		}
		this.modal.el.querySelector( '.pbs-no-results' ).style.display = '';

	},
	_onClose: function() {
		this.modal.el.querySelector( 'input[type="search"]' ).focus();
	},
	searchKeyup: function( ev ) {
		clearTimeout( this._searchTimeout );
		this._searchTimeout = setTimeout( function() {
			this.doSearch( ev );
		}.bind( this ), 400 );
	},
	reset: function() {
		this.selected = null;
		this.model.el.querySelector( '.pbs-no-results' ).style.display = '';
		this.modal.el.querySelector( '.media-toolbar-primary button' ).setAttribute( 'disabled', 'disabled' );
	},
	doSearch: function( ev ) {
		var keyword = ev.target.value.trim().toLowerCase();
		var shortcodes = this.modal.el.querySelectorAll( '.pbs-search-list > *' );
		var hasResult = false;
		Array.prototype.forEach.call( shortcodes, function( el ) {
			if ( '' === keyword || el.textContent.trim().toLowerCase().indexOf( keyword ) !== -1 ) {
				el.style.display = '';
				hasResult = true;
			} else {
				el.style.display = 'none';
			}
		} );
		this.modal.el.querySelector( '.pbs-no-results' ).style.display = hasResult ? '' : 'flex';
	},
	select: function( ev ) {
		var target = ev.target;
		while ( ! target.parentNode.classList.contains( 'pbs-search-list' ) ) {
			target = target.parentNode;
		}
		this.selected = target;
		if ( this.modal.el.querySelector( '.pbs-selected' ) ) {
			this.modal.el.querySelector( '.pbs-selected' ).classList.remove( 'pbs-selected' );
		}
		target.classList.add( 'pbs-selected' );

		this.modal.el.querySelector( '.media-toolbar-primary button' ).removeAttribute( 'disabled' );

		// Double clicking on an item selects it.
		if ( this._justClicked === target ) {
			this._primaryClicked();
		}
		this._justClicked = target;
		clearTimeout( this._justClickedTimeout );
		this._justClickedTimeout = setTimeout( function() {
			this._justClicked = false;
		}.bind( this ), 300 );
	}
} );

/**
 * The Icon picker modal popup.
 *
 * Call by using: PBSEditor.iconFrame.open(). Additional arguments may be given.
 */

/* globals pbsParams, PBSEditor */

PBSEditor._IconFrame = PBSEditor.Frame.extend( {
	className: 'pbs-icon-modal',
	template:  wp.template( 'pbs-icon-frame' ),

	events: {
		'click .media-toolbar-primary button': '_primaryClicked',
		'keyup [type="search"]': 'searchKeyup',
		'click .pbs-icon-display [data-name]': 'selectIcon'
	},
	_onOpen: function() {
		PBSEditor.Frame.prototype._onOpen.apply( this );
		setTimeout( function() {
			var searchInput = this.modal.el.querySelector( 'input[type="search"]' );
			if ( '' === searchInput.value ) {
				searchInput.value = 'dashicons';
				this.searchKeyup( { target: searchInput } );
			}
			searchInput.focus();
			searchInput.select();
		}.bind( this ), 1 );
		if ( ! this.selected ) {
			this.modal.el.querySelector( '.media-toolbar-primary button' ).setAttribute( 'disabled', 'disabled' );
		}
	},
	_onClose: function() {
		this.modal.el.querySelector( 'input[type="search"]' ).focus();
	},
	searchKeyup: function( ev ) {
		clearTimeout( this._searchTimeout );
		this._searchTimeout = setTimeout( function() {
			this.doSearch( ev );
		}.bind( this ), 400 );
	},
	reset: function() {
		var item;
		this._searchResults = [];
		this.modal.el.querySelector( '.pbs-no-results' ).style.display = '';
		while ( this.modal.el.querySelector( '.pbs-search-list > *:not(.pbs-no-results)' ) ) {
			item = this.modal.el.querySelector( '.pbs-search-list > *:not(.pbs-no-results)' );
			item.parentNode.removeChild( item );
		}
		this._prevKeyword = '';
		this.selected = null;
		this._currentGroup = null;
		this.modal.el.querySelector( '.media-toolbar-primary button' ).setAttribute( 'disabled', 'disabled' );
	},
	doSearch: function( ev ) {
		var request;
		var keyword = ev.target.value.trim();

		if ( ! keyword ) {
			return;
		}
		if ( this._prevKeyword === keyword ) {
			return;
		}
		this.reset();
		this._prevKeyword = keyword;

		// Remember searches.
		if ( 'undefined' === typeof pbsParams.icon_searches ) {
			pbsParams.icon_searches = [];
		}
		if ( 'undefined' !== typeof ev.keyCode ) {
			pbsParams.icon_searches.push( keyword );
		}

		request = new XMLHttpRequest();
		request.open( 'POST', pbsParams.ajax_url, true );
		request.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8' );
		request.onload = function() {
			var response;
			if ( request.status >= 200 && request.status < 400 ) {
				if ( request.responseText ) {
					response = JSON.parse( request.responseText );

					if ( 'undefined' !== typeof response.length || 0 === response.length ) {
						this.displayNoResults();
						return;
					}
					this._searchResults = response;

					this.displayResults();
					return;
				}
				this.displayNoResults();
			}
		}.bind( this );
		request.send( 'action=pbs_icon_search&nonce=' + pbsParams.nonce + '&s=' + keyword );
	},
	displayNoResults: function() {
		this.modal.el.querySelector( '.pbs-no-results' ).style.display = 'flex';
	},
	displayResults: function() {
		var key, result, currGroup, item, groupRegex, icon;
		var keys = Object.keys( this._searchResults ), groupLabel;

		if ( ! keys.length ) {
			return;
		}

		key = keys[0];
		result = this._searchResults[ Object.keys( this._searchResults )[0] ];
		delete this._searchResults[ key ];

		// Create the list of groups if it doesn't exist yet.
		if ( 'undefined' === typeof this.groups ) {
			this.groups = {};
			for ( groupLabel in pbsParams.icon_groups ) {
				if ( pbsParams.icon_groups.hasOwnProperty( groupLabel ) ) {
					this.groups[ groupLabel ] = new RegExp( pbsParams.icon_groups[ groupLabel ], 'i' );
				}
			}
		}

		// Create the group label if it doesn't exist yet.
		currGroup = '';
		for ( groupLabel in this.groups ) {
			if ( this.groups.hasOwnProperty( groupLabel ) ) {
				groupRegex = this.groups[ groupLabel ];
				if ( key.match( groupRegex ) ) {
					currGroup = groupLabel;
					break;
				}
			}
		}
		if ( this._currentGroup !== currGroup ) {
			item = document.createElement( 'h4' );
			item.innerHTML = groupLabel;
			item.classList.add( 'pbs-icon-group-title' );
			this.modal.el.querySelector( '.pbs-icon-display' ).appendChild( item );
			this._currentGroup = currGroup;
		}

		// Create the icon.
		icon = document.createElement( 'div' );
		icon.innerHTML = result;
		icon.setAttribute( 'data-name', key );
		this.modal.el.querySelector( '.pbs-icon-display' ).appendChild( icon );

		if ( keys.length > 1 ) {
			setTimeout( function() {
				this.displayResults();
			}.bind( this ), 5 );
		}

		this.modal.el.querySelector( '.pbs-no-results' ).style.display = '';
	},
	selectIcon: function( ev ) {
		var target = ev.target;
		while ( ! target.getAttribute( 'data-name' ) ) {
			target = target.parentNode;
		}
		this.selected = target;
		if ( this.modal.el.querySelector( '.pbs-icon-display .pbs-selected' ) ) {
			this.modal.el.querySelector( '.pbs-icon-display .pbs-selected' ).classList.remove( 'pbs-selected' );
		}
		target.classList.add( 'pbs-selected' );

		this.modal.el.querySelector( '.media-toolbar-primary button' ).removeAttribute( 'disabled' );

		// Double clicking on an icon selects it.
		if ( this._justClicked === target ) {
			this._primaryClicked();
		}
		this._justClicked = target;
		clearTimeout( this._justClickedTimeout );
		this._justClickedTimeout = setTimeout( function() {
			this._justClicked = false;
		}.bind( this ), 300 );
	}
} );

( function() {
	var ready = function() {
		PBSEditor.iconFrame = new PBSEditor._IconFrame();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

wp.hooks.addFilter( 'pbs.save.payload', 'pbs', function( payload ) {
	if ( 'undefined' !== typeof pbsParams.icon_searches ) {
		payload.append( 'icon_searches', pbsParams.icon_searches );
	}
	return payload;
} );

/**
 * The Icon picker modal popup.
 *
 * Call by using: PBSEditor.widgetFrame.open(). Additional arguments may be given.
 */

/* globals PBSEditor */

PBSEditor._WidgetFrame = PBSEditor.SearchFrame.extend( {
	className: 'pbs-widget-modal',
	template:  wp.template( 'pbs-widget-frame' ),

	events: {
		'click .media-toolbar-primary button': '_primaryClicked',
		'keyup [type="search"]': 'searchKeyup',
		'click [data-widget-slug]': 'select'
	}
} );

( function() {
	var ready = function() {
		PBSEditor.widgetFrame = new PBSEditor._WidgetFrame();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * The shortcode picker modal popup.
 *
 * Call by using: PBSEditor.shortcodeFrame.open(). Additional arguments may be given.
 */

/* globals PBSEditor, pbsParams, PBSInspectorOptions */

PBSEditor._ShortcodeFrame = PBSEditor.SearchFrame.extend( {
	className: 'pbs-shortcode-modal',
	template:  wp.template( 'pbs-shortcode-frame' ),

	events: {
		'click .media-toolbar-primary button': '_primaryClicked',
		'keyup [type="search"]': 'searchKeyup',
		'click [data-shortcode-tag]': 'select',
		'click .pbs-refresh-mappings': 'refreshShortcodeMappings'
	},
	_onOpen: function() {
		PBSEditor.SearchFrame.prototype._onOpen.apply( this );
		this.initShortcodeList();
	},
	initShortcodeList: function() {
		var allShortcodes = [], sc, tag, i;
		var div, title, desc, owner, preview;
		var shortcodeArea = this.modal.el.querySelector( '.pbs-search-list' ), map;

		if ( ! shortcodeArea.querySelector( '*:not(.pbs-no-results)' ) ) {

			// Gather all shortcodes.
			for ( i = 0; i < pbsParams.shortcodes.length; i++ ) {
				tag = pbsParams.shortcodes[ i ];

				// Allow shortcodes to be hidden from the shortcode picker.
				if ( 'undefined' !== typeof pbsParams.shortcodes_to_hide && -1 !== pbsParams.shortcodes_to_hide.indexOf( tag ) ) {
					continue;
				}

				sc = {
					'tag': tag,
					'name': tag.replace( /[\-_]/g, ' ' ),
					'desc': '',
					'owner': '',
					'ownerslug': '',
					'image': '',
					'isMapped': false
				};
				if ( pbsParams.shortcode_mappings[ tag ] ) {
					map = pbsParams.shortcode_mappings[ tag ];
					if ( '1' === map.is_hidden ) {
						continue;
					}
					sc.desc = map.description;
					sc.owner = map.owner;
					sc.ownerslug = map['owner-slug'];
					sc.image = 'http://ps.w.org/' + sc.ownerslug + '/assets/icon-128x128.png), url(http://ps.w.org/' + sc.ownerslug + '/assets/icon.svg), url(' + pbsParams.plugin_url + 'page_builder_sandwich/assets/element-icons/shortcode_single.svg';

					// If theme shortcode, use the theme's screenshot as the icon.
					if ( map.owner === pbsParams.theme ) {
						sc.image = pbsParams.stylesheet_directory_uri + 'screenshot.png';
					}

					sc.isMapped = true;
					if ( map.name ) {
						sc.name = map.name;
					}
				}
				if ( PBSInspectorOptions.Shortcode[ pbsParams.shortcodes[ i ] ] ) {
					map = PBSInspectorOptions.Shortcode[ pbsParams.shortcodes[ i ] ];
					if ( '1' === map.is_hidden ) {
						continue;
					}
					if ( map.label ) {
						sc.name = map.label;
					}
					if ( map.name ) {
						sc.name = map.name;
					}
					if ( map.desc ) {
						sc.desc = map.desc;
					}
					if ( map.owner ) {
						sc.owner = map.owner;
					}
					if ( map.image ) {
						sc.image = map.image;
					}
					sc.isMapped = true;
				}

				allShortcodes.push( sc );
			}

			// Sort.
			allShortcodes.sort( function( a, b ) {
				var x = a.name.toLowerCase();
				var y = b.name.toLowerCase();
				var ret = x < y ? -1 : x > y ? 1 : 0;
				var xMap = a.isMapped;
				var yMap = b.isMapped;
				return xMap === yMap ? ret : xMap ? -1 : 1;
			} );

			// Display.
			for ( tag in allShortcodes ) {
				if ( allShortcodes.hasOwnProperty( tag ) ) {
					sc = allShortcodes[ tag ];

					div = document.createElement( 'DIV' );
					div.setAttribute( 'data-shortcode-tag', sc.tag );
					title = document.createElement( 'H4' );
					title.innerHTML = sc.name;
					div.appendChild( title );
					if ( sc.desc ) {
						desc = document.createElement( 'P' );
						desc.innerHTML = sc.desc;
						div.appendChild( desc );
					}
					owner = document.createElement( 'P' );
					owner.classList.add( 'pbs-shortcode-owner' );
					owner.innerHTML = sc.owner + ' [' + sc.tag + ']';
					div.appendChild( owner );
					if ( sc.isMapped ) {
						preview = document.createElement( 'DIV' );
						preview.classList.add( 'pbs-shortcode-owner-image' );
						if ( sc.image ) {
							preview.setAttribute( 'style', 'background-image: url(' + sc.image + ')' );
						}
						div.appendChild( preview );
						div.classList.add( 'pbs-has-owner-image' );
					}
					shortcodeArea.appendChild( div );
				}
			}
		}
	},
	refreshShortcodeMappings: function( ev ) {

		var payload, xhr;

		ev.preventDefault();

		if ( this._isUpdatingShortcodes ) {
			return;
		}
		this._isUpdatingShortcodes = true;

		this.modal.$el.addClass( 'pbs-busy' );

		payload = new FormData();
		payload.append( 'action', 'pbs_update_shortcode_mappings' );
		payload.append( 'nonce', pbsParams.nonce );

		xhr = new XMLHttpRequest();

		xhr.onload = function() {
			var response, shortcode, shortcodeArea, noResults;

			this.modal.$el.removeClass( 'pbs-busy' );
			if ( xhr.status >= 200 && xhr.status < 400 ) {
				this._isUpdatingShortcodes = null;
				response = JSON.parse( xhr.responseText );
				if ( response ) {

					// Remove current mappings.
					for ( shortcode in pbsParams.shortcode_mappings ) {
						if ( pbsParams.shortcode_mappings.hasOwnProperty( shortcode ) ) {
							window.pbsRemoveInspector( shortcode );
						}
					}

					// Add the mappings into the correct place.
					pbsParams.shortcode_mappings = response;

					// Remove all the shortcodes.
					shortcodeArea = this.modal.el.querySelector( '.pbs-search-list' );
					noResults = shortcodeArea.querySelector( '.pbs-no-results' );
					noResults.parentNode.removeChild( noResults );
					while ( shortcodeArea.firstChild ) {
						shortcodeArea.removeChild( shortcodeArea.firstChild );
					}
					shortcodeArea.appendChild( noResults );

					// Re-initialize the shortcode list.
					this.initShortcodeList();
				}
			}
		}.bind( this );

		// There was a connection error of some sort.
		xhr.onerror = function() {
			this.modal.$el.removeClass( 'pbs-busy' );
			this._isUpdatingShortcodes = null;
		};

		xhr.open( 'POST', pbsParams.ajax_url );
		xhr.send( payload );

		return false;
	}
} );

( function() {
	var ready = function() {
		PBSEditor.shortcodeFrame = new PBSEditor._ShortcodeFrame();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * The Icon picker modal popup.
 *
 * Call by using: PBSEditor.widgetFrame.open(). Additional arguments may be given.
 */

/* globals PBSEditor */

PBSEditor._PredesignedFrame = PBSEditor.SearchFrame.extend( {
	className: 'pbs-predesigned-modal',
	template:  wp.template( 'pbs-predesigned-frame' ),

	events: {
		'click .media-toolbar-primary button': '_primaryClicked',
		'keyup [type="search"]': 'searchKeyup',
		'click [data-template]': 'select'
	},

	_onOpen: function() {
		PBSEditor.SearchFrame.prototype._onOpen.apply( this );
		this.initList();
	},

	initList: function() {
		var container, designElements;

		if ( this.modal.el.querySelector( '.pbs-search-list > *:not(.pbs-no-results)' ) ) {
			return;
		}

		container = this.modal.el.querySelector( '.pbs-search-list' );
		designElements = document.querySelectorAll( '[data-design-element-template]' );
		Array.prototype.forEach.call( designElements, function( el ) {
			var templateID = el.getAttribute( 'id' );
			var name = el.getAttribute( 'data-name' );
			var description = el.getAttribute( 'data-description' );
			var image = el.getAttribute( 'data-image' );
			var elem;

			var button = document.createElement( 'DIV' );
			button.setAttribute( 'data-template', templateID );
			button.setAttribute( 'data-root-only', el.getAttribute( 'data-root-only' ) );

			if ( image ) {
				elem = document.createElement( 'img' );
				elem.setAttribute( 'src', image );
				elem.setAttribute( 'alt', name ? name : templateID );
				button.appendChild( elem );
			}

			if ( name ) {
				elem = document.createElement( 'h4' );
				elem.innerHTML = name;
				button.appendChild( elem );
			}

			if ( description ) {
				elem = document.createElement( 'p' );
				elem.classList.add( 'description' );
				elem.innerHTML = description;
				button.appendChild( elem );
			}

			container.appendChild( button );
		} );
	}
} );

( function() {
	var ready = function() {
		PBSEditor.predesignedFrame = new PBSEditor._PredesignedFrame();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * The Icon picker modal popup.
 *
 * Call by using: PBSEditor.widgetFrame.open(). Additional arguments may be given.
 */

/* globals PBSEditor, pbsParams */

PBSEditor._PageTemplateFrame = PBSEditor.SearchFrame.extend( {
	className: 'pbs-page-template-modal',
	template:  wp.template( 'pbs-page-template-frame' ),

	events: {
		'click .media-toolbar-primary button': '_primaryClicked',
		'keyup [type="search"]': 'searchKeyup',
		'click [data-template]': 'select'
	},

	_onOpen: function() {
		PBSEditor.SearchFrame.prototype._onOpen.apply( this );
		this.initList();
	},

	initList: function() {
		var container, designElements;

		if ( this.modal.el.querySelector( '.pbs-search-list > *:not(.pbs-no-results)' ) ) {
			return;
		}

		container = this.modal.el.querySelector( '.pbs-search-list' );
		designElements = document.querySelectorAll( '[data-page-template-template]' );
		Array.prototype.forEach.call( designElements, function( el ) {
			var templateID = el.getAttribute( 'id' );
			var name = el.getAttribute( 'data-name' );
			var description = el.getAttribute( 'data-description' );
			var image = el.getAttribute( 'data-image' );
			var elem;

			var button = document.createElement( 'DIV' );
			button.setAttribute( 'data-template', templateID );
			button.setAttribute( 'data-root-only', el.getAttribute( 'data-root-only' ) || false );

			if ( pbsParams.is_lite ) {
				button.classList.add( 'pbs-lite-template' );
				button.setAttribute( 'data-preview', el.getAttribute( 'data-preview' ) );
				button.addEventListener( 'click', function() {
					window.open( this.getAttribute( 'data-preview' ), 'pbs-preview' );
				} );
			}

			if ( image ) {
				elem = document.createElement( 'img' );
				elem.setAttribute( 'src', image );
				elem.setAttribute( 'alt', name ? name : templateID );
				button.appendChild( elem );
			}

			if ( pbsParams.is_lite ) {
				elem = document.createElement( 'button' );
				elem.classList.add( 'preview' );
				elem.innerHTML = pbsParams.labels.view_template;
				button.appendChild( elem );
			}

			if ( name ) {
				elem = document.createElement( 'h4' );
				elem.innerHTML = name;
				if ( pbsParams.is_lite ) {
					elem.innerHTML += ' <span>(' + pbsParams.labels.premium + ')</span>';
				}
				button.appendChild( elem );
			}

			if ( description ) {
				elem = document.createElement( 'p' );
				elem.classList.add( 'description' );
				elem.innerHTML = description;
				button.appendChild( elem );
			}

			container.appendChild( button );
		} );
	}
} );

( function() {
	var ready = function() {
		PBSEditor.pageTemplateFrame = new PBSEditor._PageTemplateFrame();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * The HTML editor modal popup.
 *
 * Call by using: PBSEditor.htmlFrame.open(). Additional arguments may be given.
 */

/* globals PBSEditor */

PBSEditor._HtmlFrame = PBSEditor.Frame.extend( {
	className: 'pbs-html-modal',
	template:  wp.template( 'pbs-html-frame' ),

	events: {
		'click .media-toolbar-primary button': '_primaryClicked',
		'keydown textarea': 'tabHandler'
	},
	_onOpen: function() {
		PBSEditor.Frame.prototype._onOpen.apply( this );
		setTimeout( function() {
			var input = this.modal.el.querySelector( 'textarea' );
			input.focus();
			if ( '' === input.value ) {
				input.value = '<div>\n\t<p>Sample HTML</p>\n</div>';
				input.select();
			}
		}.bind( this ), 1 );
	},
	_onClose: function() {
		this.modal.el.querySelector( 'textarea' ).focus();
	},
	tabHandler: function( e ) {
		var val, start, end;
		if ( 9 === e.keyCode ) {

			// Get caret position/selection.
            val = e.target.value;
            start = e.target.selectionStart;
            end = e.target.selectionEnd;

            // Set textarea value to: text before caret + tab + text after caret.
            e.target.value = val.substring( 0, start ) + '\t' + val.substring( end );

            // Put caret at right position again.
            e.target.selectionStart = e.target.selectionEnd = start + 1;

            // Prevent the focus lose
			e.preventDefault();
            return false;
		}
	},
	getHtml: function() {
		var html = this.modal.el.querySelector( 'textarea' ).value.trim();

		// This fixes malformed HTML.
		var dummy = document.createElement( 'div' );
	    dummy.innerHTML = html;
	    return dummy.innerHTML.replace( /\s{2,}/g, ' ' );
	},
	setHtml: function( html ) {

		// Beautify.
		html = html.trim();
		html = this.formatXml( html ).trim();
		this.modal.el.querySelector( 'textarea' ).value = html;
	},

	// @see https://gist.github.com/kurtsson/3f1c8efc0ccd549c9e31
	formatXml: function( xml ) {
		var pad, nodes, node, n, indent, padding, i;
		var formatted = '';
	    var reg = /(>)(<)(\/*)/g;
	    xml = xml.toString().replace( reg, '$1\r\n$2$3' );
	    pad = 0;
	    nodes = xml.split( '\r\n' );
	    for ( n in nodes ) {
	      node = nodes[n];
	      indent = 0;
	      if ( node.match( /.+<\/\w[^>]*>$/ ) ) {
	        indent = 0;
	      } else if ( node.match( /^<\/\w/ ) ) {
	        if ( 0 !== pad ) {
	          pad -= 1;
	        }
	      } else if ( node.match( /^<\w[^>]*[^\/]>.*$/ ) ) {
	        indent = 1;
	      } else {
	        indent = 0;
	      }

	      padding = '';
	      for ( i = 0; i < pad; i++ ) {
	        padding += '  ';
	      }

	      formatted += padding + node + '\r\n';
	      pad += indent;
	    }
	    return formatted;
	}
} );

( function() {
	var ready = function() {
		PBSEditor.htmlFrame = new PBSEditor._HtmlFrame();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * The admin settings modal popup.
 *
 * Call by using: PBSEditor.adminFrame.open(). Additional arguments may be given.
 */

/* globals PBSEditor */

PBSEditor._AdminFrame = PBSEditor.Frame.extend( {
	className: 'pbs-admin-modal',
	template:  wp.template( 'pbs-admin-frame' ),

	events: {},

	_onOpen: function() {
		PBSEditor.Frame.prototype._onOpen.apply( this );

		// Set a session storage value so we can know (from the admin-side)
		// that we are inside a pbs iframe.
		sessionStorage.setItem( 'pbs_in_admin_iframe', 1 );

		setTimeout( function() {
			var iframe;
			this.modal.el.classList.add( 'pbs-busy' );
			iframe = this.modal.el.querySelector( 'iframe' );
			iframe.onload = function() {
				this.modal.el.classList.remove( 'pbs-busy' );
			}.bind( this );
			iframe.setAttribute( 'src', this.options.url );
		}.bind( this ), 1 );
	},
	_onClose: function() {

		// Reset the session storage value for the pbs iframe.
		sessionStorage.removeItem( 'pbs_in_admin_iframe' );

		this.modal.el.querySelector( 'iframe' ).setAttribute( 'src', '' );

		PBSEditor.Frame.prototype._onClose.apply( this );
	}
} );

( function() {
	var ready = function() {
		PBSEditor.adminFrame = new PBSEditor._AdminFrame();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals wpLink */

/**
 * Usage:
 *
 * window.pbsLinkFrame.open( {
 * 		url: 'http://currenturl.com',
 * 		text: 'Current text',
 * 		target: false,
 * 		hasText: true,
 * 		hasNewWindow: true
 * }, function( url, text, target ) {
 * 		// Do whatever.
 * } );
 */

window.pbsLinkFrame = {

	callback: null,

	open: function( args, callback ) {

		if ( 'undefined' === typeof args ) {
			args = {};
		}

		// Open the link dialog box.
		// @see http://stackoverflow.com/questions/11812929/use-wordpress-link-insert-dialog-in-metabox
		wpLink.open( 'dummy-wplink-textarea' );

		// Set the field values.
		// #link-options are backward compatible with 4.1.x.
		document.querySelector( '#wp-link-url, #link-options #url-field' ).value = args.url || '';
		document.querySelector( '#wp-link-text, #link-options #link-title-field' ).value = args.text || '';
		document.querySelector( '#wp-link-target, #link-options #link-target-checkbox' ).checked = !! args.target;

		// Show / hide the text field if needed.
		if ( 'undefined' === typeof args.hasText ) {
			document.querySelector( '#wp-link-wrap' ).classList.add( 'has-text-field' );
		} else if ( args.hasText ) {
			document.querySelector( '#wp-link-wrap' ).classList.add( 'has-text-field' );
		} else {
			document.querySelector( '#wp-link-wrap' ).classList.remove( 'has-text-field' );
		}

		// Show / hide the new window checkbox.
		if ( 'undefined' === typeof args.hasNewWindow ) {
			document.querySelector( '#wp-link .link-target' ).style.display = '';
		} else {
			document.querySelector( '#wp-link .link-target' ).style.display = args.hasNewWindow ? '' : 'none';
		}

		// Remember our callback function.
		this.callback = callback;

		// Create our handler;
		this.clickHandler = function() {

			// #link-options are backward compatible with 4.1.x.
			var url = document.querySelector( '#wp-link-url, #link-options #url-field' ).value,
				text = document.querySelector( '#wp-link-text, #link-options #link-title-field' ).value,
				target = document.querySelector( '#wp-link-target, #link-options #link-target-checkbox' ).checked;

			// Callback.
			this.callback( url, text, target );

			// Remove the click handler.
			document.querySelector( '#wp-link-submit' ).removeEventListener( 'click', this.clickHandler );

			// Close the dialog.
			wpLink.close();

		}.bind( this );

		// Set the click handler.
		document.querySelector( '#wp-link-submit' ).addEventListener( 'click', this.clickHandler );
	}
};

/* globals ContentTools, ContentEdit, PBSEditor */

PBSEditor.Overlays = [];

PBSEditor.Overlay = ( function() {

	function Overlay() {
		var editor = ContentTools.EditorApp.get();

		this.showOnTaint = true;
		this._domElement = null;
		this._active = false;
		this._shown = false;
		this._isMounted = false;
		this._classname = '';

		PBSEditor.Overlays.push( this );

		// Hide when mouse out.
		wp.hooks.addAction( 'pbs.element.out', 'pbs.element', function( element ) {
			if ( this.element && element && element._domElement ) {
				if ( this.element._domElement === element._domElement || element._domElement.contains( this.element._domElement ) )  {
					if ( 0 === this.constructor.name.toLowerCase().indexOf( 'toolbar' ) ) {
						this._hide();
					}
				}
			}
		}.bind( this ) );

		wp.hooks.addAction( 'pbs.element.over', 'pbs.element', function( element ) {

			var applyToElem;

			if ( Overlay.active ) {
				return;
			}

			// Don't show overlays when dragging.
			if ( ContentEdit.Root.get().dragging() ) {
				return;
			}

			if ( ! element._domElement ) {
				return;
			}

			// If an element was deleted, this.element can be null.
			if ( this.element && ! this.element._domElement ) {
				this.element = null;
			}

			// New apply to function.
			if ( this.canApplyTo ) {
				applyToElem = this.canApplyTo( element );
				if ( applyToElem ) {
					this._show( applyToElem );
					this.element = applyToElem;
				} else if ( this._shown ) {
					this._hide();
				}
				return;
			}

			/*

			// Check the element stack if this element canApply, or if not,
			// if any of its parent are.
			var couldApply = this.canApply( element );
			while ( element !== null && element.constructor.name !== 'Region' && ! couldApply ) {
				element = element.parent();
				couldApply = this.canApply( element );
			}

			if ( couldApply ) {
				this.element = this.applyTo( element );
				this._shown = true;
				this._show( this.element );
			} else {
				this._hide();
			}
			*/
		}.bind( this ) );

		ContentEdit.Root.get().bind( 'unmount', function( element ) {
			if ( element === this.element ) {
				this._hide();
			}
		}.bind( this ) );

		ContentEdit.Root.get().bind( 'drag', function() {
			this._hide();
		}.bind( this ) );
		ContentEdit.Root.get().bind( 'drop', function() {
			this._hide();
		}.bind( this ) );

		document.addEventListener( 'mouseover', function( ev ) {
			if ( ! this._isMounted ) {
				return;
			}
			if ( ! Overlay.active ) {
				if ( window.pbsSelectorMatches( ev.target, '[data-name="main-content"], [data-name="main-content"] *, .pbs-quick-action-overlay, .pbs-quick-action-overlay *, .pbs-toolbar, .pbs-toolbar *' ) ) {
					return;
				}

				// This._hide();
			}
		}.bind( this ) );

		ContentEdit.Root.get().bind( 'taint', function( element ) {
			if ( this.showOnTaint && this.element === element ) {
				this._show( element );
			}
		}.bind( this ) );
		ContentEdit.Root.get().bind( 'debounced_taint', function( element ) {
			if ( this.showOnTaint && this.element === element ) {
				this._show( element );
			}
		}.bind( this ) );

		wp.hooks.addAction( 'pbs.edit', 'pbs', function() {
			this._domElement = this.createElement();
			this.mount();
		}.bind( this ) );
		editor.bind( 'stop', function() {
			this.unmount();
		}.bind( this ) );
	}

	Overlay.prototype.mount = function() {
		this._domElement.classList.add( 'pbs-quick-action-overlay' );
		this._domElement.classList.add( 'pbs-overlay-' + this.constructor.name.toLowerCase() );
		if ( this._classname ) {
			this._domElement.classList.add( this._classname );
		}
		document.body.appendChild( this._domElement );
		this.addEventHandlers();
		this._isMounted = true;
	};

	Overlay.prototype.unmount = function() {
		this.element = null;
		this.removeEventHandlers();
		document.body.removeChild( this._domElement );
		this._isMounted = false;
	};

	Overlay.prototype.addEventHandlers = function() {
		this._mousedownBound = this._mousedown.bind( this );
		this._mousemoveBound = this._mousemove.bind( this );
		this._mouseupBound = this._mouseup.bind( this );
		this._mouseenterBound = this._mouseenter.bind( this );
		this._mouseleaveBound = this._mouseleave.bind( this );

		this._domElement.addEventListener( 'mousedown', this._mousedownBound );
		this._domElement.addEventListener( 'mouseenter', this._mouseenterBound );
		this._domElement.addEventListener( 'mouseleave', this._mouseleaveBound );
		document.addEventListener( 'mousemove', this._mousemoveBound );
		document.addEventListener( 'mouseup', this._mouseupBound );
	};

	Overlay.prototype.removeEventHandlers = function() {
		this._domElement.removeEventListener( 'mousedown', this._mousedownBound );
		this._domElement.removeEventListener( 'mouseenter', this._mouseenterBound );
		this._domElement.removeEventListener( 'mouseleave', this._mouseleaveBound );
		document.removeEventListener( 'mousemove', this._mousemoveBound );
		document.removeEventListener( 'mouseup', this._mouseupBound );
	};

	Overlay.prototype._mousedown = function( ev ) {

		var root = ContentEdit.Root.get();

		if ( ! this.canApply() ) {
			this._active = false;
			return;
		}

		// Blur the currently selected element.
        if ( root.focused() ) {
			root.focused().blur();
        }

		this._active = true;
		this.startX = parseInt( ev.screenX, 10 );
		this.startY = parseInt( ev.screenY, 10 );
		this.deltaX = 0;
		this.deltaY = 0;
		Overlay.active = true;
		this._domElement.classList.add( 'pbs-active' );
		document.body.classList.add( 'pbs-overlay-is-active' );
		document.body.classList.add( 'pbs-overlay-' + this.constructor.name.toLowerCase() );
		this.onClick( ev );
		this.onMoveStart( ev );
	};

	Overlay.prototype._mousemove = function( ev ) {

		if ( ! this._active ) {
			return;
		}

		if ( this.prevMouseMoveTimeStamp ) {
			if ( ev.timeStamp - this.prevMouseMoveTimeStamp < 60 ) {
				return;
			}
		}
		this.prevMouseMoveTimeStamp = ev.timeStamp;

		this.deltaX = parseInt( ev.screenX, 10 ) - this.startX;
		this.deltaY = parseInt( ev.screenY, 10 ) - this.startY;

		ev.preventDefault();
		ev.stopPropagation();
		wp.hooks.doAction( 'pbs.overlay.drag' );

		this.onMove( ev );

		// Update the other overlays.
		clearTimeout( Overlay._hideOverlayTimeout );
		Overlay._hideOverlayTimeout = setTimeout( function() {
			Overlay.hideOtherOverlays( this );
		}.bind( this ), 10 );
	};

	Overlay.hideOtherOverlays = function( callingOverlay ) {
		Array.prototype.forEach.call( PBSEditor.Overlays, function( overlay ) {
			if ( overlay !== callingOverlay ) {
				overlay._hide();
			}
		} );
	};

	Overlay.hideAll = function() {
		Array.prototype.forEach.call( PBSEditor.Overlays, function( overlay ) {
			overlay._hide();
		} );
	};

	Overlay.prototype._mouseup = function() {
		this._active = false;
		Overlay.active = false;
		this._domElement.classList.remove( 'pbs-active' );
		document.body.classList.remove( 'pbs-overlay-is-active' );
		document.body.classList.remove( 'pbs-overlay-active-' + this.constructor.name.toLowerCase() );
	};

	Overlay.prototype._mouseenter = function( ev ) {
		this._domElement.classList.add( 'pbs-over' );
		document.body.classList.add( 'pbs-overlay-hovered' );
		document.body.classList.add( 'pbs-overlay-hovered-' + this.constructor.name.toLowerCase() );
		this.onEnter( ev );
	};

	Overlay.prototype._mouseleave = function() {
		this._domElement.classList.remove( 'pbs-over' );
		document.body.classList.remove( 'pbs-overlay-hovered' );
		document.body.classList.remove( 'pbs-overlay-hovered-' + this.constructor.name.toLowerCase() );
		this.onLeave();
	};

	Overlay.prototype._show = function( element ) {
		var root = ContentEdit.Root.get();
		if ( ! root.dragging() && element ) {
			this._domElement.classList.add( 'pbs-overlay-show' );
			if ( this.shown && this.element === element ) {
				return;
			}
			this.show( element );
			this._shown = true;
		}
	};

	Overlay.prototype._hide = function() {
		if ( this._domElement ) {
			this._domElement.classList.remove( 'pbs-overlay-show' );
		}
		this.hide();
		this._shown = false;
	};

	Overlay.active = false;
	Overlay.prevOverElement = null;

	Overlay.prototype.canApply = function() {
		return ! Overlay.active;
	};

	// Override these.
	Overlay.prototype.createElement = function() {};
	Overlay.prototype.onMoveStart = function() {};
	Overlay.prototype.onMove = function() {};
	Overlay.prototype.onClick = function() {};
	Overlay.prototype.show = function( element ) {}; // jshint ignore:line
	Overlay.prototype.hide = function() {};
	Overlay.prototype.onEnter = function() {};
	Overlay.prototype.onLeave = function() {};
	Overlay.prototype.canApplyTo = function( element ) { // jshint ignore:line
		return false;
	};

	return Overlay;
} )();

/**
 * Prevent mouse events when an overlay is active.
 */
( function() {
	var proxied = ContentEdit.Element.prototype._onMouseDown;
    ContentEdit.Element.prototype._onMouseDown = function( ev ) {
		if ( PBSEditor.Overlay.active ) {
			return;
		}
		return proxied.call( this, ev );
	};
} )();
( function() {
	var proxied = ContentEdit.Element.prototype._onMouseMove;
    ContentEdit.Element.prototype._onMouseMove = function( ev ) {
		if ( PBSEditor.Overlay.active ) {
			return;
		}
		ContentEdit.Root.get().trigger( 'mousemove', this );
		return proxied.call( this, ev );
	};
} )();
( function() {
	var proxied = ContentEdit.Element.prototype._onMouseOver;
    ContentEdit.Element.prototype._onMouseOver = function( ev ) {
		if ( PBSEditor.Overlay.active ) {
			return;
		}
		return proxied.call( this, ev );
	};
} )();
( function() {
	var proxied = ContentEdit.Element.prototype._onMouseOut;
    ContentEdit.Element.prototype._onMouseOut = function( ev ) {
		if ( PBSEditor.Overlay.active ) {
			return;
		}
		return proxied.call( this, ev );
	};
} )();
( function() {
	var proxied = ContentEdit.Element.prototype._onMouseUp;
    ContentEdit.Element.prototype._onMouseUp = function( ev ) {
		if ( PBSEditor.Overlay.active ) {
			return;
		}
		return proxied.call( this, ev );
	};
} )();

/**
 * Instead of using CT's mouse events, just create out own one.
 */
( function() {
	var currentOverElement = null;
	var currentTarget = null;
	var pbsOverElement = _.throttle( function( target ) {
		if ( currentTarget === target ) {
			wp.hooks.doAction( 'pbs.element.over', currentOverElement );
			return;
		}
		if ( ! target._ceElement ) {
			wp.hooks.doAction( 'pbs.nonelement.over', target );
			while ( ! target._ceElement ) {
				target = target.parentNode;
				if ( ! target || 'BODY' === target.tagName ) {
					return;
				}
			}
			if ( 'Region' === target._ceElement.constructor.name ) {
				return;
			}
		}
		if ( null !== currentOverElement && target._ceElement ) {
			wp.hooks.doAction( 'pbs.element.out', currentOverElement );
		}
		if ( PBSEditor.Overlay.active ) {
			return;
		}
		currentTarget = target;
		currentOverElement = target._ceElement;
		wp.hooks.doAction( 'pbs.element.over', target._ceElement );
	}, 50 );
	var mouseListener = function( ev ) {
		pbsOverElement( ev.target );
	};
	ContentTools.EditorApp.get().bind( 'start', function() {
		window.addEventListener( 'mousemove', mouseListener );
		window.addEventListener( 'mouseover', mouseListener );
		window.addEventListener( 'mouseleave', mouseListener );
	} );
	ContentTools.EditorApp.get().bind( 'stop', function() {
		window.removeEventListener( 'mousemove', mouseListener );
		window.removeEventListener( 'mouseover', mouseListener );
		window.removeEventListener( 'mouseleave', mouseListener );
	} );
} )();

/* globals ContentEdit, PBSEditor, __extends, fastdom */

PBSEditor.OverlayControls = ( function( _super ) {
	__extends( OverlayControls, _super );

	function OverlayControls( controls ) {
		OverlayControls.__super__.constructor.call( this );
		this.showOnTaint = false;
		this.shown = false;

		if ( 'undefined' === typeof controls ) {
			controls = [];
		}
		this.controls = controls;

		ContentEdit.Root.get().bind( 'taint', function() {
			this.updatePosition( this.element );
		}.bind( this ) );
		ContentEdit.Root.get().bind( 'focus', function() {
			this._hide();
		}.bind( this ) );
		document.addEventListener( 'mousedown', function( ev ) {
			var focused = ContentEdit.Root.get().focused();
			if ( focused ) {
				if ( focused._domElement === ev.target ) {
					this._hide();
				}
			}
		}.bind( this ) );
		ContentEdit.Root.get().bind( 'focus', function() {
			this._hide();
		}.bind( this ) );
		document.addEventListener( 'keydown', function( ev ) {
			if ( [ 40, 37, 39, 38, 9, 8, 46, 13, 16, 91, 18 ].indexOf( ev.keyCode ) === -1 ) {
				this._hide();
			}
		}.bind( this ) );
		window.addEventListener( 'resize', function() {
			this._hide();
		}.bind( this ) );
	}

	OverlayControls.prototype.createElement = function() {

		var wrapper, i, control;
		var element = document.createElement( 'DIV' );

		if ( ! this.controls.length ) {
			return element;
		}

		wrapper = document.createElement( 'DIV' );
		wrapper.classList.add( 'pbs-overlay-wrapper' );
		element.appendChild( wrapper );

		for ( i = 0; i < this.controls.length; i++ ) {
			control = document.createElement( 'DIV' );
			control.classList.add( 'pbs-overlay-' + this.controls[ i ].name );
			control.control = this.controls[ i ];
			this.controls[ i ]._domElement = control;
			control.addEventListener( 'mouseenter', function( overlay ) {
				overlay._domElement.classList.add( 'pbs-over-' + this.control.name );
				this.control._domElement.classList.add( 'pbs-control-over' );
			}.bind( control, this ) );
			control.addEventListener( 'mouseleave', function( overlay ) {
				overlay._domElement.classList.add( 'pbs-over-' + this.control.name );
				this.control._domElement.classList.remove( 'pbs-control-over' );
			}.bind( control, this ) );
			wrapper.appendChild( control );
		}

		this._locationDragging = null;
		return element;
	};

	OverlayControls.prototype.updatePosition = function( element ) {

		// This can be called when the element was deleted.
		if ( ! element || ! element._domElement ) {
			return;
		}

		fastdom.measure( function() {

			var styles, rect, top, height, left, width;

			// This can be called when the element was deleted.
			if ( ! element || ! element._domElement ) {
				return;
			}

			styles = this._cachedStyles;
			rect = this._cachedRect;

			styles = window.pbsGetComputedStyle( element._domElement );
			rect = window.pbsGetBoundingClientRect( element._domElement );

			if ( this._cachedStyles === styles && this._cachedRect === rect ) {
				return;
			}

			top = rect.top, height = rect.height, left = rect.left, width = rect.width;

			fastdom.mutate( function() {
				var i, hide;

				this._domElement.style.top = ( top + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
				this._domElement.style.height = height + 'px';
				this._domElement.style.left = left + 'px';
				this._domElement.style.width = width + 'px';

				for ( i = 0; i < this.controls.length; i++ ) {

					hide = false;
					if ( 'function' === typeof this.controls[ i ].display ) {
						if ( ! this.controls[ i ].display( element ) ) {
							hide = true;
						}
					}

					this.controls[ i ]._domElement.style.display = hide ? 'none' : '';

					if ( ! hide && 'function' === typeof this.controls[ i ].refresh ) {
						this.controls[ i ].refresh( this, element, styles, rect );
					}
				}

				this._cachedStyles = styles;
				this._cachedRect = rect;
			}.bind( this ) );
		}.bind( this ) );
	};

	OverlayControls.prototype._hide = function() {
		if ( this._domElement && this._domElement.getAttribute( 'class' ).indexOf( 'pbs-active-' ) !== -1 ) {
			return;
		}
		this.shown = false;
		return OverlayControls.__super__._hide.call( this );
	};

	OverlayControls.prototype.hide = function() {
		if ( ! this._domElement ) {
			return;
		}
	};

	OverlayControls.prototype.show = function( element ) {
		this.shown = true;
		this.updatePosition( element );
	};

	OverlayControls.prototype.onMoveStart = function( ev ) {
		var i, styles = getComputedStyle( this.element._domElement );
		var rect = this.element._domElement.getBoundingClientRect();

		for ( i = 0; i < this.controls.length; i++ ) {
			if ( this._locationDragging === this.controls[ i ].name ) {
				if ( this.controls[ i ].onMoveStart ) {
					this.controls[ i ].onMoveStart( this, this.element, styles, rect, ev );
				}
			}
		}
	};

	OverlayControls.prototype.onMove = function( ev ) {
		var i;
		for ( i = 0; i < this.controls.length; i++ ) {
			if ( this._locationDragging === this.controls[ i ].name ) {
				if ( this.controls[ i ].onMove ) {
					this.controls[ i ].onMove( this, this.element, this.deltaX, this.deltaY, ev );
				}
				break;
			}
		}

		// Update the position of the overlay.
		this.updatePosition( this.element );
	};

	OverlayControls.prototype.onClick = function( ev ) {
		var i;

		this._locationDragging = null;

		for ( i = 0; i < this.controls.length; i++ ) {
			this._domElement.classList.remove( 'pbs-active-' + this.controls[ i ].name );

			if ( this.controls[ i ].onClick ) {
				this.controls[ i ].onClick( this, this.element );
			}
		}

		for ( i = 0; i < this.controls.length; i++ ) {
			if ( ev.target === this.controls[ i ]._domElement ) {
				this._locationDragging = this.controls[ i ].name;
				this._domElement.classList.add( 'pbs-active-' + this.controls[ i ].name );
				this._domElement.classList.add( 'pbs-active' );
				this.controls[ i ]._domElement.classList.add( 'pbs-control-active' );
				break;
			}
		}

		this.updatePosition( this.element );

	};

	OverlayControls.prototype._mouseup = function( ev ) {
		var i, ret = OverlayControls.__super__._mouseup.call( this, ev );

		for ( i = 0; i < this.controls.length; i++ ) {
			this._domElement.classList.remove( 'pbs-active-' + this.controls[ i ].name );
			this.controls[ i ]._domElement.classList.remove( 'pbs-control-active' );

			if ( this._locationDragging === this.controls[ i ].name ) {
				if ( this.controls[ i ].onMoveStop ) {
					this.controls[ i ].onMoveStop( this, this.element, ev );
				}
			}
		}

		this._locationDragging = null;

		return ret;
	};

	return OverlayControls;

} )( PBSEditor.Overlay );

/* globals PBSEditor, __extends, pbsParams, fastdom */

PBSEditor.OverlayElement = ( function( _super ) {
	__extends( OverlayElement, _super );

	function OverlayElement() {

		var controls = [
			{
				name: 'resize-bottom-left',
				display: function( element ) {
					if ( 'Image' === element.constructor.name ) {
						return true;
					} else if ( 'Icon' === element.constructor.name ) {
						return true;
					}
					return false;
				},
				refresh: function( overlay, element, styles, rect ) {

					fastdom.measure( function() {
						var height = rect.height, width = rect.width;

						fastdom.mutate( function() {

							var side;
							if ( height < 150 || width < 150 ) {
								side = height;
								if ( height > width ) {
									side = width;
								}
								side = side * 0.3;
								this._domElement.style.width = side + 'px';
								this._domElement.style.height = side + 'px';
							} else {
								this._domElement.style.width = '';
								this._domElement.style.height = '';
							}
						}.bind( this ) );
					}.bind( this ) );
				},
				onMoveStart: function( overlay, element, styles, rect ) {
					var label;

					this._initWidth = rect.width;
					this._initHeight = rect.height;
					this._aspectRatio = rect.width / rect.height;

					label = rect.width + ' &times; ' + parseInt( rect.height, 10 ) + ' px';
					if ( 'Image' === element.constructor.name ) {
						if ( '100%' === element.attr( 'width' ) ) {
							label = '100%';
						}

						// Hide the image toolbar.
						wp.hooks.doAction( 'pbs.element.out', element );
					}

					this._overlaySize = document.createElement( 'DIV' );
					this._overlaySize.classList.add( 'pbs-size-indicator' );
					this._overlaySize.innerHTML = label;
					this._overlaySize.style.top = ( rect.top + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
					this._overlaySize.style.left = rect.right + 'px';
					document.body.appendChild( this._overlaySize );
				},
				onMove: function( overlay, element, deltaX ) {
					var height, remainder,
						width = -deltaX + this._initWidth;

					if ( window.PBSEditor.isShiftDown ) {
						remainder = width % 10;
						width -= remainder;
					}
					width = parseInt( width, 10 );

					height = 1 / this._aspectRatio * width;

					fastdom.mutate( function() {

						var rect, rectWidth, rectTop, rectRight, label;

						element.style( 'height', height + 'px' );
						element.style( 'width', width + 'px' );

						if ( 'Image' === element.constructor.name ) {
							element.attr( 'width', width );
							element.attr( 'height', parseInt( height, 10 ) );
						}

						rect = element._domElement.getBoundingClientRect();
						rectWidth = rect.width;
						rectTop = rect.top;
						rectRight = rect.right;
						label = width + ' &times; ' + parseInt( height, 10 ) + ' px';

						if ( 'Image' === element.constructor.name && width > rectWidth ) {
							element.style( 'width', '100%' );
							element.style( 'height', 'auto' );
							label = '100%';
						}

						this._overlaySize.style.top = ( rectTop + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
						this._overlaySize.style.left = rectRight + 'px';
						this._overlaySize.innerHTML = label;

					}.bind( this ) );
				},
				onMoveStop: function( overlay, element ) {
					document.body.removeChild( this._overlaySize );
					if ( 'Image' === element.constructor.name ) {
						element.style( 'height', 'auto' );

						// Show again the image toolbar.
						wp.hooks.doAction( 'pbs.element.over', element );
					}
				}
			},
			{
				name: 'resize-top-left',
				display: function( element ) {
					if ( 'Image' === element.constructor.name ) {
						return true;
					} else if ( 'Icon' === element.constructor.name ) {
						return true;
					}
					return false;
				},
				refresh: function( overlay, element, styles, rect ) {

					fastdom.measure( function() {
						var height = rect.height, width = rect.width;

						fastdom.mutate( function() {
							var side;
							if ( height < 150 || width < 150 ) {
								side = height;
								if ( height > width ) {
									side = width;
								}
								side = side * 0.3;
								this._domElement.style.width = side + 'px';
								this._domElement.style.height = side + 'px';
							} else {
								this._domElement.style.width = '';
								this._domElement.style.height = '';
							}
						}.bind( this ) );
					}.bind( this ) );
				},
				onMoveStart: function( overlay, element, styles, rect ) {
					var label;
					this._initWidth = rect.width;
					this._initHeight = rect.height;
					this._aspectRatio = rect.width / rect.height;

					label = rect.width + ' &times; ' + parseInt( rect.height, 10 ) + ' px';
					if ( 'Image' === element.constructor.name ) {
						if ( '100%' === element.attr( 'width' ) ) {
							label = '100%';
						}

						// Hide the image toolbar.
						wp.hooks.doAction( 'pbs.element.out', element );
					}

					this._overlaySize = document.createElement( 'DIV' );
					this._overlaySize.classList.add( 'pbs-size-indicator' );
					this._overlaySize.innerHTML = label;
					this._overlaySize.style.top = ( rect.top + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
					this._overlaySize.style.left = rect.right + 'px';
					document.body.appendChild( this._overlaySize );
				},
				onMove: function( overlay, element, deltaX ) {
					var height, remainder,
						width = -deltaX + this._initWidth;

					if ( window.PBSEditor.isShiftDown ) {
						remainder = width % 10;
						width -= remainder;
					}
					width = parseInt( width, 10 );

					height = 1 / this._aspectRatio * width;

					fastdom.mutate( function() {

						var rect, rectWidth, rectTop, rectRight, label;

						element.style( 'height', height + 'px' );
						element.style( 'width', width + 'px' );

						if ( 'Image' === element.constructor.name ) {
							element.attr( 'width', width );
							element.attr( 'height', parseInt( height, 10 ) );
						}

						rect = element._domElement.getBoundingClientRect();
						rectWidth = rect.width;
						rectTop = rect.top;
						rectRight = rect.right;
						label = width + ' &times; ' + parseInt( height, 10 ) + ' px';

						if ( 'Image' === element.constructor.name && width > rectWidth ) {
							element.style( 'width', '100%' );
							element.style( 'height', 'auto' );
							label = '100%';
						}

						this._overlaySize.style.top = ( rectTop + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
						this._overlaySize.style.left = rectRight + 'px';
						this._overlaySize.innerHTML = label;

					}.bind( this ) );
				},
				onMoveStop: function( overlay, element ) {
					document.body.removeChild( this._overlaySize );
					if ( 'Image' === element.constructor.name ) {
						element.style( 'height', 'auto' );

						// Show again the image toolbar.
						wp.hooks.doAction( 'pbs.element.over', element );
					}
				}
			},
			{
				name: 'resize-top-right',
				display: function( element ) {
					if ( 'Image' === element.constructor.name ) {
						return true;
					} else if ( 'Icon' === element.constructor.name ) {
						return true;
					}
					return false;
				},
				refresh: function( overlay, element, styles, rect ) {

					fastdom.measure( function() {
						var height = rect.height, width = rect.width;

						fastdom.mutate( function() {

							var side;
							if ( height < 150 || width < 150 ) {
								side = height;
								if ( height > width ) {
									side = width;
								}
								side = side * 0.3;
								this._domElement.style.width = side + 'px';
								this._domElement.style.height = side + 'px';
							} else {
								this._domElement.style.width = '';
								this._domElement.style.height = '';
							}
						}.bind( this ) );
					}.bind( this ) );
				},
				onMoveStart: function( overlay, element, styles, rect ) {
					var label;
					this._initWidth = rect.width;
					this._initHeight = rect.height;
					this._aspectRatio = rect.width / rect.height;

					label = rect.width + ' &times; ' + parseInt( rect.height, 10 ) + ' px';
					if ( 'Image' === element.constructor.name ) {
						if ( '100%' === element.attr( 'width' ) ) {
							label = '100%';
						}

						// Hide the image toolbar.
						wp.hooks.doAction( 'pbs.element.out', element );
					}

					this._overlaySize = document.createElement( 'DIV' );
					this._overlaySize.classList.add( 'pbs-size-indicator' );
					this._overlaySize.innerHTML = label;
					this._overlaySize.style.top = ( rect.top + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
					this._overlaySize.style.left = rect.right + 'px';
					document.body.appendChild( this._overlaySize );
				},
				onMove: function( overlay, element, deltaX ) {
					var remainder, height,
						width = deltaX + this._initWidth;

					if ( window.PBSEditor.isShiftDown ) {
						remainder = width % 10;
						width -= remainder;
					}
					width = parseInt( width, 10 );

					height = 1 / this._aspectRatio * width;

					fastdom.mutate( function() {

						var rect, rectWidth, rectTop, rectRight, label;

						element.style( 'height', height + 'px' );
						element.style( 'width', width + 'px' );

						if ( 'Image' === element.constructor.name ) {
							element.attr( 'width', width );
							element.attr( 'height', parseInt( height, 10 ) );
						}

						rect = element._domElement.getBoundingClientRect();
						rectWidth = rect.width;
						rectTop = rect.top;
						rectRight = rect.right;
						label = width + ' &times; ' + parseInt( height, 10 ) + ' px';

						if ( 'Image' === element.constructor.name && width > rectWidth ) {
							element.style( 'width', '100%' );
							element.style( 'height', 'auto' );
							label = '100%';
						}

						this._overlaySize.style.top = ( rectTop + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
						this._overlaySize.style.left = rectRight + 'px';
						this._overlaySize.innerHTML = label;

					}.bind( this ) );
				},
				onMoveStop: function( overlay, element ) {
					document.body.removeChild( this._overlaySize );
					if ( 'Image' === element.constructor.name ) {
						element.style( 'height', 'auto' );

						// Show again the image toolbar.
						wp.hooks.doAction( 'pbs.element.over', element );
					}
				}
			},
			{
				name: 'resize-bottom-right',
				display: function( element ) {
					if ( 'Image' === element.constructor.name ) {
						return true;
					} else if ( 'Icon' === element.constructor.name ) {
						return true;
					}
					return false;
				},
				refresh: function( overlay, element, styles, rect ) {

					fastdom.measure( function() {
						var height = rect.height, width = rect.width;

						fastdom.mutate( function() {

							var side;
							if ( height < 150 || width < 150 ) {
								side = height;
								if ( height > width ) {
									side = width;
								}
								side = side * 0.3;
								this._domElement.style.width = side + 'px';
								this._domElement.style.height = side + 'px';
							} else {
								this._domElement.style.width = '';
								this._domElement.style.height = '';
							}
						}.bind( this ) );
					}.bind( this ) );
				},
				onMoveStart: function( overlay, element, styles, rect ) {
					var label;
					this._initWidth = rect.width;
					this._initHeight = rect.height;
					this._aspectRatio = rect.width / rect.height;

					label = rect.width + ' &times; ' + parseInt( rect.height, 10 ) + ' px';
					if ( 'Image' === element.constructor.name ) {
						if ( '100%' === element.attr( 'width' ) ) {
							label = '100%';
						}

						// Hide the image toolbar.
						wp.hooks.doAction( 'pbs.element.out', element );
					}

					this._overlaySize = document.createElement( 'DIV' );
					this._overlaySize.classList.add( 'pbs-size-indicator' );
					this._overlaySize.innerHTML = label;
					this._overlaySize.style.top = ( rect.top + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
					this._overlaySize.style.left = rect.right + 'px';
					document.body.appendChild( this._overlaySize );
				},
				onMove: function( overlay, element, deltaX ) {
					var remainder, height,
						width = deltaX + this._initWidth;

					if ( window.PBSEditor.isShiftDown ) {
						remainder = width % 10;
						width -= remainder;
					}
					width = parseInt( width, 10 );

					height = 1 / this._aspectRatio * width;

					fastdom.mutate( function() {

						var rect, rectWidth, rectTop, rectRight, label;

						element.style( 'height', height + 'px' );
						element.style( 'width', width + 'px' );

						if ( 'Image' === element.constructor.name ) {
							element.attr( 'width', width );
							element.attr( 'height', parseInt( height, 10 ) );
						}

						rect = element._domElement.getBoundingClientRect();
						rectWidth = rect.width;
						rectTop = rect.top;
						rectRight = rect.right;
						label = width + ' &times; ' + parseInt( height, 10 ) + ' px';

						if ( 'Image' === element.constructor.name && width > rectWidth ) {
							element.style( 'width', '100%' );
							element.style( 'height', 'auto' );
							label = '100%';
						}

						this._overlaySize.style.top = ( rectTop + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
						this._overlaySize.style.left = rectRight + 'px';
						this._overlaySize.innerHTML = label;

					}.bind( this ) );
				},
				onMoveStop: function( overlay, element ) {
					document.body.removeChild( this._overlaySize );
					if ( 'Image' === element.constructor.name ) {
						element.style( 'height', 'auto' );

						// Show again the image toolbar.
						wp.hooks.doAction( 'pbs.element.over', element );
					}
				}
			},
			{
				name: 'resize-bottom',
				display: function( element ) {
					if ( 'Map' === element.constructor.name ) {
						return true;
					}
					if ( 'Spacer' === element.constructor.name ) {
						return true;
					}
					return false;
				},
				refresh: function( overlay, element, styles, rect ) {

					fastdom.measure( function() {
						var height = rect.height, width = rect.width;

						fastdom.mutate( function() {
							var side;
							if ( height < 150 || width < 150 ) {
								side = height;
								if ( height > width ) {
									side = width;
								}
								side = side * 0.3;
								this._domElement.style.width = side + 'px';
								this._domElement.style.height = side + 'px';
							} else {
								this._domElement.style.width = '';
								this._domElement.style.height = '';
							}
						}.bind( this ) );
					}.bind( this ) );
				},
				onMoveStart: function( overlay, element, styles, rect ) {
					this._initWidth = rect.width;
					this._initHeight = rect.height;

					this._domElement.style.top =
					this._overlaySize = document.createElement( 'DIV' );
					this._overlaySize.classList.add( 'pbs-size-indicator' );
					this._overlaySize.innerHTML = rect.height + ' px';
					this._overlaySize.style.top = ( rect.top + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
					this._overlaySize.style.left = rect.right + 'px';
					document.body.appendChild( this._overlaySize );
				},
				onMove: function( overlay, element, deltaX, deltaY ) {
					var remainder, height = deltaY + this._initHeight;

					if ( window.PBSEditor.isShiftDown ) {
						remainder = height % 10;
						height -= remainder;
					}
					height = parseInt( height, 10 );

					fastdom.measure( function() {
						var rect = element._domElement.getBoundingClientRect(),
							rectTop = rect.top,
							rectRight = rect.right,
							rectHeight = rect.height;

						fastdom.mutate( function() {
							element.style( 'height', height + 'px' );
							this._overlaySize.style.top = ( rectTop + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
							this._overlaySize.style.left = rectRight + 'px';
							this._overlaySize.innerHTML = rectHeight + ' px';
						}.bind( this ) );
					}.bind( this ) );
				},
				onMoveStop: function( overlay, element ) {
					document.body.removeChild( this._overlaySize );
					if ( 'Image' === element.constructor.name ) {
						fastdom.mutate( function() {
							element.style( 'height', 'auto' );
						} );
					}
				}
			},
			{
				name: 'margin-top',
				display: function( element ) {
					if ( 'Shortcode' === element.constructor.name ) {
						return false;
					} else if ( 'Title' === element.constructor.name ) {
						return false;
					} else if ( 'Spacer' === element.constructor.name ) {
						return false;
					} else if ( 'Embed' === element.constructor.name ) {
						return false;
					} else if ( 'Text' === element.constructor.name ) {
						if ( element.content.isWhitespace() ) {
							return false;
						}
					}
					return true;
				},
				refresh: function( overlay, element, styles, rect ) {

					var marginTop = element._domElement.style.marginTop;
					if ( ! marginTop ) {
						marginTop = styles.marginTop;
					}

					if ( this._domElement.getAttribute( 'data-value' ) !== 'margin-' + marginTop ) {

						if ( rect.width > 100 ) {
							this._domElement.setAttribute( 'data-label', pbsParams.labels.margin + ': ' + marginTop );
						} else {
							this._domElement.setAttribute( 'data-label', marginTop );
						}

						if ( parseInt( marginTop, 10 ) < 0 ) {
							this._domElement.style.height = '0px';
						} else {
							this._domElement.style.height = marginTop;
						}

						this._domElement.setAttribute( 'data-value', 'margin-' + marginTop );
					}
				},
				onMoveStart: function( overlay, element, styles ) {
					this._initValue = parseInt( styles.marginTop, 10 );
				},
				onMove: function( overlay, element, deltaX, deltaY ) {
					var remainder, margin = deltaY + this._initValue;

					if ( window.PBSEditor.isShiftDown ) {
						remainder = margin % 10;
						margin -= remainder;
					}

					element.style( 'margin-top', margin + 'px' );
				}
			},
			{
				name: 'margin-bottom',
				display: function( element ) {
					if ( 'Shortcode' === element.constructor.name ) {
						return false;
					} else if ( 'Title' === element.constructor.name ) {
						return false;
					} else if ( 'Embed' === element.constructor.name ) {
						return false;
					} else if ( 'Spacer' === element.constructor.name ) {
						return false;
					} else if ( 'Text' === element.constructor.name ) {
						if ( element.content.isWhitespace() ) {
							return false;
						}
					}
					return true;
				},
				refresh: function( overlay, element, styles, rect ) {

					var marginBottom = element._domElement.style.marginBottom;
					if ( ! marginBottom ) {
						marginBottom = styles.marginBottom;
					}

					if ( this._domElement.getAttribute( 'data-value' ) !== 'margin-' + marginBottom ) {
						if ( rect.width > 100 ) {
							this._domElement.setAttribute( 'data-label', pbsParams.labels.margin + ': ' + marginBottom );
						} else {
							this._domElement.setAttribute( 'data-label', marginBottom );
						}

						if ( parseInt( marginBottom, 10 ) < 0 ) {
							this._domElement.style.height = '0px';
						} else {
							this._domElement.style.height = marginBottom;
						}

						this._domElement.setAttribute( 'data-value', 'margin-' + marginBottom );
					}
				},
				onMoveStart: function( overlay, element, styles ) {
					this._initValue = parseInt( styles.marginBottom, 10 );
				},
				onMove: function( overlay, element, deltaX, deltaY ) {
					var remainder, margin = deltaY + this._initValue;

					if ( window.PBSEditor.isShiftDown ) {
						remainder = margin % 10;
						margin -= remainder;
					}

					fastdom.mutate( function() {
						element.style( 'margin-bottom', margin + 'px' );
					} );
				}
			}
		];

		OverlayElement.__super__.constructor.call( this, controls );
		this.showOnTaint = false;
	}

	OverlayElement.prototype.canApplyTo = function( element ) {
		if ( this.element === element ) {
			return element;
		}
		if ( 'Static' === element.constructor.name ) {
			return false;
		}

		// Highlight the whole list.
		if ( [ 'List', 'ListItem', 'ListItemText' ].indexOf( element.constructor.name ) !== -1 ) {
			if ( 'List' === element.constructor.name ) {
				return element;
			}
			if ( 'ListItem' === element.constructor.name ) {
				return element.parent();
			}
			return element.parent().parent();
		}

		// Nothing for tabs, but yes for the tabs container.
		if ( [ 'Tab', 'TabPanelContainer' ].indexOf( element.constructor.name ) !== -1 ) {
			if ( 'TabContainer' === element.parent().constructor.name ) {
				return element.parent();
			}
			if ( 'TabContainer' === element.parent().parent().constructor.name ) {
				return element.parent();
			}
			return false;
		}

		// Nothing for table contents.
		if ( [ 'TableRow', 'TableSection' ].indexOf( element.constructor.name ) !== -1 ) {
			return false;
		}
		if ( [ 'Div', 'DivRow', 'DivCol', 'Region' ].indexOf( element.constructor.name ) !== -1 ) {
			return false;
		}
		return element;
	};

	return OverlayElement;

} )( PBSEditor.OverlayControls );

/* globals PBSEditor, __extends, pbsParams, fastdom */

PBSEditor.OverlayColumn = ( function( _super ) {
	__extends( OverlayColumn, _super );

	function OverlayColumn() {

		var controls = [
			{
				name: 'padding-top',
				refresh: function( overlay, element, styles ) {

					fastdom.measure( function() {
						var paddingTop = element._domElement.style.paddingTop;
						if ( ! paddingTop ) {
							paddingTop = styles.paddingTop;
						}

						fastdom.mutate( function() {
							if ( this._domElement.getAttribute( 'data-value' ) !== 'padding-' + paddingTop ) {
								this._domElement.setAttribute( 'data-label', pbsParams.labels.padding + ': ' + paddingTop );
								this._domElement.setAttribute( 'data-value', 'padding-' + paddingTop );
								this._domElement.style.height = paddingTop;
							}
						}.bind( this ) );
					}.bind( this ) );
				},
				onMoveStart: function( overlay, element, styles ) {
					this._initValue = parseInt( styles.paddingTop, 10 );
				},
				onMove: function( overlay, element, deltaX, deltaY ) {

					var remainder, padding = deltaY + this._initValue;
					if ( padding < 0 ) {
						padding = 0;
					}

					if ( window.PBSEditor.isShiftDown ) {
						remainder = padding % 10;
						padding -= remainder;
					}

					element.style( 'padding-top', padding + 'px' );
				}
			},
			{
				name: 'padding-bottom',
				refresh: function( overlay, element, styles ) {

					fastdom.measure( function() {

						// Rewritten this way for performance.
						var paddingBottom = element._domElement.style.paddingBottom;
						if ( ! paddingBottom ) {
							paddingBottom = styles.paddingBottom;
						}

						fastdom.mutate( function() {
							if ( this._domElement.getAttribute( 'data-value' ) !== 'padding-' + paddingBottom ) {
								this._domElement.setAttribute( 'data-label', pbsParams.labels.padding + ': ' + paddingBottom );
								this._domElement.setAttribute( 'data-value', 'padding-' + paddingBottom );
								this._domElement.style.height = paddingBottom;
							}
						}.bind( this ) );
					}.bind( this ) );
				},
				onMoveStart: function( overlay, element, styles ) {
					this._initValue = parseInt( styles.paddingBottom, 10 );
				},
				onMove: function( overlay, element, deltaX, deltaY ) {

					var remainder, padding = -deltaY + this._initValue;
					if ( padding < 0 ) {
						padding = 0;
					}

					if ( window.PBSEditor.isShiftDown ) {
						remainder = padding % 10;
						padding -= remainder;
					}

					element.style( 'padding-bottom', padding + 'px' );
				}
			},
			{
				name: 'padding-left',
				refresh: function( overlay, element, styles, rect ) {

					fastdom.measure( function() {
						var paddingLeft = element._domElement.style.paddingLeft;
						if ( ! paddingLeft ) {
							paddingLeft = styles.paddingLeft;
						}

						fastdom.mutate( function() {
							if ( this._domElement.getAttribute( 'data-value' ) !== 'padding-' + paddingLeft ) {

								if ( parseInt( rect.height, 10 ) > 100 ) {
									this._domElement.setAttribute( 'data-label', pbsParams.labels.padding + ': ' + paddingLeft );
								} else {
									this._domElement.setAttribute( 'data-label', paddingLeft );
								}
								this._domElement.setAttribute( 'data-value', 'padding-' + paddingLeft );
								this._domElement.style.width = paddingLeft;
							}
						}.bind( this ) );
					}.bind( this ) );
				},
				onMoveStart: function( overlay, element, styles ) {
					this._initValue = parseInt( styles.paddingLeft, 10 );
				},
				onMove: function( overlay, element, deltaX ) {

					var remainder, padding = deltaX + this._initValue;
					if ( padding < 0 ) {
						padding = 0;
					}

					if ( window.PBSEditor.isShiftDown ) {
						remainder = padding % 10;
						padding -= remainder;
					}

					element.style( 'padding-left', padding + 'px' );
				}
			},
			{
				name: 'padding-right',
				refresh: function( overlay, element, styles, rect ) {

					fastdom.measure( function() {
						var paddingRight = element._domElement.style.paddingRight;
						if ( ! paddingRight ) {
							paddingRight = styles.paddingRight;
						}

						fastdom.mutate( function() {
							if ( this._domElement.getAttribute( 'data-value' ) !== 'padding-' + paddingRight ) {
								if ( parseInt( rect.height, 10 ) > 100 ) {
									this._domElement.setAttribute( 'data-label', pbsParams.labels.padding + ': ' + paddingRight );
								} else {
									this._domElement.setAttribute( 'data-label', paddingRight );
								}

								this._domElement.setAttribute( 'data-value', 'padding-' + paddingRight );
								this._domElement.style.width = paddingRight;
							}
						}.bind( this ) );
					}.bind( this ) );

				},
				onMoveStart: function( overlay, element, styles ) {
					this._initValue = parseInt( styles.paddingRight, 10 );
				},
				onMove: function( overlay, element, deltaX ) {

					var remainder, padding = -deltaX + this._initValue;
					if ( padding < 0 ) {
						padding = 0;
					}

					if ( window.PBSEditor.isShiftDown ) {
						remainder = padding % 10;
						padding -= remainder;
					}

					element.style( 'padding-right', padding + 'px' );
				}
			}
		];

		OverlayColumn.__super__.constructor.call( this, controls );
		this.showOnTaint = false;
	}

	OverlayColumn.prototype.canApplyTo = function( element ) {
		if ( this.element === element ) {
			return element;
		}
		if ( this.element !== element ) {
			if ( this.element && this.element._domElement.parentNode ) {
				if ( this.element._domElement.parentNode.classList.contains( '.pbs-col' ) ) {
					if ( this.element._domElement.parentNode.contains( element._domElement ) ) {
						return element;
					}
				}
			}
		}

		if ( 'DivCol' === element.constructor.name ) {
			return element;
		}

		if ( 'DivCol' !== element.constructor.name ) {
			element = element.parent();
			while ( element && 'Region' !== element.constructor.name ) {
				if ( 'DivCol' === element.constructor.name ) {
					return element;
				}
				element = element.parent();
			}
		}

		return false;
	};

	return OverlayColumn;

} )( PBSEditor.OverlayControls );

/* globals PBSEditor, ContentEdit, __extends, pbsParams, fastdom */

PBSEditor.OverlayRow = ( function( _super ) {
	__extends( OverlayRow, _super );

	OverlayRow.showOnTaint = false;

	function OverlayRow() {
		OverlayRow.__super__.constructor.call( this );
		this.showOnTaint = false;
		this.shown = false;

		ContentEdit.Root.get().bind( 'focus', function() {
			this._hide();
		}.bind( this ) );
		document.addEventListener( 'mousedown', function( ev ) {
			var focused = ContentEdit.Root.get().focused();
			if ( focused ) {
				if ( focused._domElement === ev.target ) {
					this._hide();
				}
			}
		}.bind( this ) );
		ContentEdit.Root.get().bind( 'focus', function() {
			this._hide();
		}.bind( this ) );
		document.addEventListener( 'keydown', function( ev ) {
			if ( [ 40, 37, 39, 38, 9, 8, 46, 13, 16, 91, 18 ].indexOf( ev.keyCode ) === -1 ) {
				this._hide();
			}
		}.bind( this ) );
		window.addEventListener( 'resize', function() {
			this._hide();
		}.bind( this ) );
	}

	OverlayRow.prototype.createElement = function() {
		var element = document.createElement( 'DIV' );

		this._topMargin = document.createElement( 'DIV' );
		this._topMargin.classList.add( 'pbs-overlay-margin-top' );
		this._topMargin.addEventListener( 'mouseenter', function() {
			this._domElement.classList.add( 'pbs-over-margin-top' );
		}.bind( this ) );
		this._topMargin.addEventListener( 'mouseleave', function() {
			this._domElement.classList.remove( 'pbs-over-margin-top' );
		}.bind( this ) );
		element.appendChild( this._topMargin );

		this._bottomMargin = document.createElement( 'DIV' );
		this._bottomMargin.classList.add( 'pbs-overlay-margin-bottom' );
		this._bottomMargin.addEventListener( 'mouseenter', function() {
			this._domElement.classList.add( 'pbs-over-margin-bottom' );
		}.bind( this ) );
		this._bottomMargin.addEventListener( 'mouseleave', function() {
			this._domElement.classList.remove( 'pbs-over-margin-bottom' );
		}.bind( this ) );
		element.appendChild( this._bottomMargin );

		this._bottomResize = document.createElement( 'DIV' );
		this._bottomResize.classList.add( 'pbs-overlay-resize-bottom' );
		this._bottomResize.addEventListener( 'mouseenter', function() {
			this._domElement.classList.add( 'pbs-over-resize-bottom' );
		}.bind( this ) );
		this._bottomResize.addEventListener( 'mouseleave', function() {
			this._domElement.classList.remove( 'pbs-over-resize-bottom' );
		}.bind( this ) );
		element.appendChild( this._bottomResize );

		this._columnControls = [];
		this._columnLabels = [];

		return element;
	};

	OverlayRow.prototype.updatePosition = function( element ) {

		fastdom.measure( function() {
			var rect = window.pbsGetBoundingClientRect( element._domElement );

			fastdom.mutate( function() {

				this._domElement.style.top = ( rect.top + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
				this._domElement.style.height = rect.height + 'px';
				this._domElement.style.left = ( rect.left ) + 'px';
				this._domElement.style.width = ( rect.width ) + 'px';
			}.bind( this ) );
		}.bind( this ) );
	};

	OverlayRow.prototype.hide = function() {
		OverlayRow.__super__.hide.call( this );

		this.shown = false;

		// If row is nested, add a class.
		document.body.classList.remove( 'pbs-overlay-is-nested-row' );

		// ClearInterval( this._updatePositionTimeout );
	};

	OverlayRow.prototype.show = function( element ) {

		var styles, rect, elementName = element.parent().constructor.name;
		var label, o, i, totalWidth = 0, totalWidthNoMargin = 0, margin, columnRect;
		var marginTop, marginBottom, topMarginDataValue, bottomMarginDataValue;
		var rowLeftPadding, height;

		this.shown = true;

		fastdom.mutate( function() {
			this._topMargin.style.display = '';
			this._bottomMargin.style.display = '';
			this._bottomResize.style.display = '';

			if ( 'Div' === elementName ) {
				this._topMargin.style.display = 'none';
				this._bottomMargin.style.display = 'none';
				this._bottomResize.style.display = 'none';
			} else if ( 'TabPanelContainer' === elementName ) {
				this._topMargin.style.display = 'none';
				this._bottomMargin.style.display = 'none';
				this._bottomResize.style.display = 'none';
			} else if ( 'Carousel' === elementName ) {
				this._topMargin.style.display = 'none';
				this._bottomMargin.style.display = 'none';
			}

			this._domElement.classList.remove( 'pbs-active-margin-top' );
			this._domElement.classList.remove( 'pbs-active-margin-bottom' );
			this._domElement.classList.remove( 'pbs-active-resize-bottom' );
		}.bind( this ) );

		this.updatePosition( element );

		fastdom.measure( function() {

			styles = window.pbsGetComputedStyle( element._domElement );
			marginTop = element._domElement.style.marginTop;
			if ( ! marginTop ) {
				marginTop = styles.marginTop;
			}
			marginBottom = element._domElement.style.marginBottom;
			if ( ! marginBottom ) {
				marginBottom = styles.marginBottom;
			}
			topMarginDataValue = this._topMargin.getAttribute( 'data-value' );
			bottomMarginDataValue = this._bottomMargin.getAttribute( 'data-value' );

			fastdom.mutate( function() {

				if ( topMarginDataValue !== 'margin-' + marginTop ) {
					this._topMargin.setAttribute( 'data-label', pbsParams.labels.margin + ': ' + marginTop );
					this._topMargin.setAttribute( 'data-value', 'margin-' + marginTop );
					this._topMargin.style.height = marginTop;
				}

				if ( bottomMarginDataValue !== 'margin-' + marginBottom ) {
					this._bottomMargin.setAttribute( 'data-label', pbsParams.labels.margin + ': ' + marginBottom );
					this._bottomMargin.style.height = marginBottom;
					this._bottomMargin.setAttribute( 'data-value', 'margin-' + marginBottom );
				}
			}.bind( this ) );
		}.bind( this ) );

		// Remove existing column controls.
		for ( i = this._columnControls.length - 1; i >= 0; i-- ) {
			this._columnControls[ i ].parentNode.removeChild( this._columnControls[ i ] );
		}
		for ( i = this._columnLabels.length - 1; i >= 0; i-- ) {
			this._columnLabels[ i ].parentNode.removeChild( this._columnLabels[ i ] );
		}

		/**
		 * Column widths.
		 */

		this._columnControls = [];
		this._columnLabels = [];
		this._columnWidths = [];
		this._columnMarginRight = [];

		rect = window.pbsGetBoundingClientRect( element._domElement );
		height = rect.height;
		rowLeftPadding = parseInt( element.style( 'padding-left' ), 10 );
		for ( i = 0; i < element.children.length; i++ ) {
			columnRect = window.pbsGetBoundingClientRect( element.children[ i ]._domElement );
			this._columnWidths.push( columnRect.width );
			this._columnMarginRight.push( element.children[ i ]._domElement.style.marginRight );
		}

		for ( i = 0; i < element.children.length - 1; i++ ) {
			o = document.createElement( 'DIV' );
			o.classList.add( 'pbs-overlay-column-width-' + i );
			o.classList.add( 'pbs-overlay-column-width' );
			o._index = i;
			o._this = this;
			if ( height > 100 ) {
				o.setAttribute( 'data-label', pbsParams.labels.column_width );
			} else {
				o.setAttribute( 'data-label', pbsParams.labels.width );
			}

			o.addEventListener( 'mouseenter', function() {
				this._this._domElement.classList.add( 'pbs-over-column-width-' + this._index );
				this._this._domElement.classList.add( 'pbs-overlay-column-width' );
			} );
			o.addEventListener( 'mouseleave', function() {
				this._this._domElement.classList.remove( 'pbs-over-column-width-' + this._index );
				this._this._domElement.classList.remove( 'pbs-overlay-column-width' );
			} );

			totalWidth += this._columnWidths[ i ];
			totalWidthNoMargin += this._columnWidths[ i ];

			// The left row padding can affect the location of the columns.
			o.style.left = ( rowLeftPadding + totalWidth ) + 'px';

			if ( this._columnMarginRight[ i ] ) {
				margin = parseInt( this._columnMarginRight[ i ], 10 );
				totalWidth += margin;
				o.style.width = margin + 'px';
				o.style.marginLeft = '0px';
			}

			this._domElement.appendChild( o );
			this._columnControls.push( o );
		}
		if ( element.children.length ) {
			totalWidthNoMargin += this._columnWidths[ element.children.length - 1 ];
		}

		totalWidth = 0;
		for ( i = 0; i < element.children.length; i++ ) {

			label = document.createElement( 'DIV' );
			label.classList.add( 'pbs-overlay-column-label' );
			label.innerHTML = ( this._columnWidths[ i ] / totalWidthNoMargin * 100 ).toFixed( 1 ) + '%';

			// The left row padding can affect the location of the columns.
			if ( ! i ) {
				label.style.left = totalWidth + 'px';
			} else {
				label.style.left = ( rowLeftPadding + totalWidth ) + 'px';
			}

			totalWidth += this._columnWidths[ i ];
			if ( this._columnMarginRight[ i ] ) {
				totalWidth += parseInt( this._columnMarginRight[ i ], 10 );
			}

			this._domElement.appendChild( label );
			this._columnLabels.push( label );
		}

		// If row is nested, add a class.
		fastdom.mutate( function() {
			if ( 'DivCol' === element.parent().constructor.name ) {
				document.body.classList.add( 'pbs-overlay-is-nested-row' );
			} else {
				document.body.classList.remove( 'pbs-overlay-is-nested-row' );
			}
		} );
	};

	OverlayRow.prototype.onMoveStart = function() {
		var i, styles = getComputedStyle( this.element._domElement );
		var rect = this.element._domElement.getBoundingClientRect();
		var rectHeight = rect.height;
		this.marginTopInitialValue = parseInt( styles.marginTop, 10 );
		this.marginBottomInitialValue = parseInt( styles.marginBottom, 10 );
		this.resizeBottomInitialValue = parseInt( styles.minHeight, 10 );
		if ( parseInt( rectHeight, 10 ) > this.resizeBottomInitialValue ) {
			this.resizeBottomInitialValue = parseInt( rectHeight, 10 );
		}
		this.columnWidthInitialValues = [];
		for ( i = 0; i < this.element.children.length; i++ ) {
			rect = this.element.children[ i ]._domElement.getBoundingClientRect();
			this.columnWidthInitialValues.push( rect.width );
		}
	};

	OverlayRow.prototype.onMove = function() {
		var label, width, margin, remainder, height, rect, totalWidth, totalWidthNoMargin, i;
		var change, colRect;
		var columnRect, rowLeftPadding;

		rect = this.element._domElement.getBoundingClientRect();

		if ( 'margin-top' === this._locationDragging ) {
			margin = this.deltaY + this.marginTopInitialValue;
			if ( window.PBSEditor.isShiftDown ) {
				remainder = margin % 10;
				margin -= remainder;
			}
			this.element.style( 'margin-top', margin + 'px' );

			this._topMargin.setAttribute( 'data-label', pbsParams.labels.margin + ': ' + margin + 'px' );
			this._topMargin.style.height = margin + 'px';
			this._topMargin.setAttribute( 'data-value', 'margin-' + margin + 'px' );

		} else if ( 'margin-bottom' === this._locationDragging ) {

			margin = this.deltaY + this.marginBottomInitialValue;
			if ( window.PBSEditor.isShiftDown ) {
				remainder = margin % 10;
				margin -= remainder;
			}
			this.element.style( 'margin-bottom', margin + 'px' );

			if ( rect.width > 100 ) {
				this._bottomMargin.setAttribute( 'data-label', pbsParams.labels.margin + ': ' + margin + 'px' );
			} else {
				this._bottomMargin.setAttribute( 'data-label', margin + 'px' );
			}
			this._bottomMargin.style.height = margin + 'px';
			this._bottomMargin.setAttribute( 'data-value', 'margin-' + margin + 'px' );

		} else if ( 'resize-bottom' === this._locationDragging ) {

			height = this.deltaY + this.resizeBottomInitialValue;
			if ( window.PBSEditor.isShiftDown ) {
				remainder = height % 10;
				height -= remainder;
			}
			this.element.style( 'min-height', height + 'px' );

			// Resize indicator.
			label = parseInt( height, 10 );
			if ( parseInt( rect.height, 10 ) > label ) {
				label = parseInt( rect.height, 10 );
			}

			this._overlaySize.innerHTML = parseInt( label, 10 ) + 'px';

		} else if ( 0 === this._locationDragging.indexOf( 'column-' ) ) {

			width = this.deltaX + this.columnWidthInitialValues[ this._columnDragging ];
			if ( window.PBSEditor.isShiftDown ) {
				remainder = width % 10;
				width -= remainder;
			}

			change = this.columnWidthInitialValues[ this._columnDragging ] - width;
			totalWidth = 0;
			totalWidthNoMargin = 0;
			for ( i = 0; i < this.element.children.length; i++ ) {
				colRect = this.element.children[ i ]._domElement.getBoundingClientRect();
				totalWidth += colRect.width;
				totalWidthNoMargin += colRect.width;
				if ( i < this.element.children.length - 1 ) {
					this._columnControls[ i ].style.left = totalWidth + 'px';
					if ( this.element.children[ i ]._domElement.style.marginRight ) {
						totalWidth += parseInt( this.element.children[ i ]._domElement.style.marginRight, 10 );
					}
				}
			}
			this.element._domElement.classList.add( 'pbs-overlay-changing-cols' );
			for ( i = 0; i < this.element.children.length; i++ ) {

				// We previously used flex-grow, don't use it anymore.
				this.element.children[ i ].style( 'flex-grow', '' );

				if ( i === this._columnDragging ) {
					this.element.children[ i ].style( 'flex-basis', ( width / totalWidthNoMargin * 100 ) + '%' );
				} else if ( i === this._columnDragging + 1 ) {
					this.element.children[ i ].style( 'flex-basis', ( ( this.columnWidthInitialValues[ i ] + change ) / totalWidthNoMargin * 100 ) + '%' );
				} else {
					this.element.children[ i ].style( 'flex-basis', ( this.columnWidthInitialValues[ i ] / totalWidthNoMargin * 100 ) + '%' );
				}
			}
		}

		rect = window.pbsGetBoundingClientRect( this.element._domElement );

		this._domElement.style.top = ( rect.top + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
		this._domElement.style.height = rect.height + 'px';
		this._domElement.style.left = ( rect.left ) + 'px';
		this._domElement.style.width = ( rect.width ) + 'px';

		// Adjust the column width labels.
		rowLeftPadding = parseInt( this.element.style( 'padding-left' ), 10 );
		totalWidthNoMargin = 0;
		totalWidth = 0;
		for ( i = 0; i < this.element.children.length; i++ ) {
			columnRect = this.element.children[ i ]._domElement.getBoundingClientRect();
			totalWidthNoMargin += columnRect.width;
		}
		for ( i = 0; i < this.element.children.length; i++ ) {
			columnRect = this.element.children[ i ]._domElement.getBoundingClientRect();

			this._columnLabels[ i ].classList.add( 'pbs-overlay-column-label' );
			this._columnLabels[ i ].innerHTML = ( columnRect.width / totalWidthNoMargin * 100 ).toFixed( 1 ) + '%';

			if ( ! i ) {
				this._columnLabels[ i ].style.left = totalWidth + 'px';
			} else {
				this._columnLabels[ i ].style.left = rowLeftPadding + totalWidth + 'px';
			}

			totalWidth += columnRect.width;
			if ( this.element.children[ i ]._domElement.style.marginRight ) {
				totalWidth += parseInt( this.element.children[ i ]._domElement.style.marginRight, 10 );
			}
		}

		wp.hooks.doAction( 'pbs.overlay.row.move', this, this._locationDragging );
	};

	OverlayRow.prototype.canApplyTo = function( element ) {
		if ( this.element === element ) {
			return element;
		}
		if ( this.element !== element ) {
			if ( this.element && this.element._domElement.parentNode ) {
				if ( this.element._domElement.parentNode.classList.contains( '.pbs-row' ) ) {
					if ( this.element._domElement.parentNode.contains( element._domElement ) ) {
						return element;
					}
				}
				if ( this.element._domElement.parentNode.classList.contains( '.pbs-col' ) ) {
					if ( this.element._domElement.parentNode.parentNode.contains( element._domElement ) ) {
						return element;
					}
				}
			}
		}

		if ( 'DivRow' === element.constructor.name ) {
			return element;
		}

		if ( 'DivRow' !== element.constructor.name ) {
			element = element.parent();
			while ( element && 'Region' !== element.constructor.name ) {
				if ( 'DivRow' === element.constructor.name ) {
					return element;
				}
				element = element.parent();
			}
		}

		return false;
	};

	OverlayRow.prototype._mouseup = function() {
		var i;

		OverlayRow.__super__._mouseup.call( this );
		this._domElement.classList.remove( 'pbs-active-margin-top' );
		this._domElement.classList.remove( 'pbs-active-margin-bottom' );
		this._domElement.classList.remove( 'pbs-active-resize-bottom' );
		if ( this.element && this.element._domElement ) {
			this.element._domElement.classList.remove( 'pbs-overlay-changing-cols' );
		}
		this._domElement.classList.remove( 'pbs-active-overlay-column' );
		for ( i = 0; i < 10; i++ ) {
			this._domElement.classList.remove( 'pbs-active-column-' + i );
		}
		if ( this._overlaySize ) {
			this._overlaySize.parentNode.removeChild( this._overlaySize );
			this._overlaySize = null;
		}
	};

	OverlayRow.prototype.onClick = function( ev ) {
		var i, styles, rect, label;
		this._locationDragging = null;
		this._domElement.classList.remove( 'pbs-active-overlay-column' );
		if ( ev.target === this._topMargin ) {
			this._locationDragging = 'margin-top';
		} else if ( ev.target === this._bottomMargin ) {
			this._locationDragging = 'margin-bottom';
		} else if ( ev.target === this._bottomResize ) {
			this._locationDragging = 'resize-bottom';
		} else {
			for ( i = 0; i < this._columnControls.length; i++ ) {
				if ( ev.target === this._columnControls[ i ] ) {
					this._locationDragging = 'column-' + this._columnControls[ i ]._index;
					this._columnDragging = this._columnControls[ i ]._index;
					this._domElement.classList.add( 'pbs-active-overlay-column' );
					break;
				}
			}
		}

		this._domElement.classList.remove( 'pbs-active-margin-top' );
		this._domElement.classList.remove( 'pbs-active-margin-bottom' );
		this._domElement.classList.remove( 'pbs-active-bottom-resize' );
		for ( i = 0; i < 10; i++ ) {
			this._domElement.classList.remove( 'pbs-active-column-' + i );
		}
		if ( this._locationDragging ) {
			this._domElement.classList.add( 'pbs-active-' + this._locationDragging );
		}

		// Resize indicator.
		if ( 'resize-bottom' === this._locationDragging ) {
			styles = getComputedStyle( this.element._domElement );
			rect = this.element._domElement.getBoundingClientRect();
			this._overlaySize = document.createElement( 'DIV' );
			this._overlaySize.classList.add( 'pbs-size-indicator' );

			label = parseInt( styles.minHeight, 10 );
			if ( parseInt( rect.height, 10 ) > label ) {
				label = parseInt( rect.height, 10 );
			}
			this._overlaySize.innerHTML = label + 'px';
			this._overlaySize.style.top = ( rect.top + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
			this._overlaySize.style.left = rect.right + 'px';
			document.body.appendChild( this._overlaySize );
		}
	};

	return OverlayRow;

} )( PBSEditor.Overlay );

/* globals ContentEdit, pbsParams, ContentTools */

/**
 * This changes the drop behavior to use overlays to represent the droppable
 * location instead of adding a pseudo element.
 */

( function() {

	// Triggered when finding out whether to drop above or below an element.
	var _Root = ContentEdit.Root.get();
	var proxiedCancelDragging, proxiedOnStopDragging, proxiedOnMouseOut;
	var proxiedOnMouseOver;
	var proxiedDrop;
	var indicatorTimeout = null;
	var dropIndicator = null;
	var prevDropTarget = null;
	var prevDropPlacement = null;
	var showDropIndicator;
	var hideDropIndicator, proxiedStartDragging, pbsOverElement, mouseListener;

	var proxiedGetDropPlacement = _Root._getDropPlacement;
	_Root._getDropPlacement = function( x, y ) {
		var placement = proxiedGetDropPlacement.call( this, x, y );

		if ( placement ) {

			// Don't allow left/right dropping anymore.
			placement[1] = 'center';

			showDropIndicator( placement );
		}
		return placement;
	};

	// Triggered when dragging is cancelled.
	proxiedCancelDragging = _Root.cancelDragging;
	_Root.cancelDragging = function() {
		if ( this._dragging ) {
			hideDropIndicator();
		}
		return proxiedCancelDragging.call( this );
	};

	// Triggered when dragging is stopped.
	proxiedOnStopDragging = _Root._onStopDragging;
	_Root._onStopDragging = function( ev ) {
		return proxiedOnStopDragging.call( this, ev );
	};

	// Triggered on mouseout when dragging.
	proxiedOnMouseOut = ContentEdit.Element.prototype._onMouseOut;
	ContentEdit.Element.prototype._onMouseOut = function( ev ) {
		var ret = proxiedOnMouseOut.call( this, ev );
		var root = ContentEdit.Root.get();
		if ( root.dragging() ) {
			hideDropIndicator();
		}
		return ret;
	};

	// Triggered when hovering over an element. Cancel overlay when
	// hovered over the dragged element.
	proxiedOnMouseOver = ContentEdit.Element.prototype._onMouseOver;
	ContentEdit.Element.prototype._onMouseOver = function( ev ) {
		var ret = proxiedOnMouseOver.call( this, ev );
		var root = ContentEdit.Root.get();
		if ( root.dragging() === this ) {
			hideDropIndicator();
			ev.stopPropagation();
			ev.preventDefault();
		}
		return ret;
	};

	// Triggered after a successful drop.
	proxiedDrop = ContentEdit.Element.prototype.drop;
	ContentEdit.Element.prototype.drop = function( element, placement ) {
		var ret = proxiedDrop.call( this, element, placement );
		if ( element ) {
			hideDropIndicator();
		}
		return ret;
	};

	showDropIndicator = function( placement ) {

		var dropTargetDom, styles, rect, toolbarHeight, scrollY, marginTop;
		var dropIndicatorJustCreated = false;
		var root = ContentEdit.Root.get();

		if ( ! dropIndicator ) {
			dropIndicator = document.createElement( 'DIV' );
			dropIndicator.classList.add( 'pbs-drop-indicator' );
			dropIndicator.appendChild( document.createElement( 'SPAN' ) );
			dropIndicator.appendChild( document.createElement( 'SPAN' ) );
			dropIndicatorJustCreated = true;
		}

		dropTargetDom = root._dropTarget._domElement;

		if ( prevDropTarget === dropTargetDom && prevDropPlacement === placement[0] ) {
			return;
		}

		prevDropTarget = dropTargetDom;
		prevDropPlacement = placement[0];

		clearTimeout( indicatorTimeout );

		dropIndicator.firstChild.innerHTML = pbsParams.labels.move_above_s.replace(  /%s/, root._dropTarget.typeName() );
		dropIndicator.firstChild.nextSibling.innerHTML = pbsParams.labels.move_below_s.replace(  /%s/, root._dropTarget.typeName() );

		styles = window.pbsGetComputedStyle( root._dropTarget._domElement );
		rect = window.pbsGetBoundingClientRect( root._dropTarget._domElement );
		toolbarHeight = window.formattingToolbarHeight();
		scrollY = window.pbsScrollY();

		if ( rect.height + parseInt( styles.marginTop, 10 ) + parseInt( styles.marginBottom, 10 ) < 60 ) {
			dropIndicator.classList.add( 'pbs-drop-indicator-small' );
		} else {
			dropIndicator.classList.remove( 'pbs-drop-indicator-small' );
		}

		// Add the classes for the drop indicator (whether to show up or down).
		dropIndicator.classList.add( 'pbs-drop-indicator-' + placement[0] );
		if ( 'above' === placement[0] ) {
			dropIndicator.classList.remove( 'pbs-drop-indicator-below' );
		} else {
			dropIndicator.classList.remove( 'pbs-drop-indicator-above' );
		}

		// If we're dropping on an empty paragraph inside a column, then that means we're
		// dropping it inside the column, change the labels to make it appropriate.
		if ( 'P' === dropTargetDom.tagName && 'DIV' === dropTargetDom.parentNode.tagName ) {
			if ( dropTargetDom.parentNode.classList && dropTargetDom.classList ) {
				if ( dropTargetDom.parentNode.classList.contains( 'pbs-col' ) && dropTargetDom.classList.contains( 'ce-element--empty' ) ) {
					dropIndicator.firstChild.innerHTML = pbsParams.labels.move_inside_column;
					dropIndicator.firstChild.nextSibling.innerHTML = pbsParams.labels.move_inside_column;
					dropIndicator.classList.remove( 'pbs-drop-indicator-above' );
					dropIndicator.classList.add( 'pbs-drop-indicator-below' );
				}
			}
		}

		// Only include the top margin if it's positive, or else it will
		// screw up the overlay height & positioning. This makes it tolerable.
		marginTop = 0;
		if ( parseInt( styles.marginTop, 10 ) > 0 ) {
			marginTop = parseInt( styles.marginTop, 10 );
		}

		dropIndicator.style.top = ( rect.top + scrollY - toolbarHeight - 32 - marginTop ) + 'px';
		dropIndicator.style.left = rect.left + 'px';
		dropIndicator.style.width = rect.width + 'px';
		dropIndicator.style.height = ( rect.height + marginTop + parseInt( styles.marginBottom, 10 ) ) + 'px';

		if ( dropIndicatorJustCreated ) {
			setTimeout( function() {
				if ( dropIndicator ) {
					dropIndicator.classList.add( 'pbs-drop-indicator-show' );
				}
			}, 10 );

			document.body.appendChild( dropIndicator );
		}
	};

	hideDropIndicator = function() {
		prevDropTarget = null;
		prevDropPlacement = null;

		clearTimeout( indicatorTimeout );
		indicatorTimeout = setTimeout( function() {
			if ( dropIndicator ) {
				document.body.removeChild( dropIndicator );
				dropIndicator = null;
			}
		}, 10 );
	};

	/**
	 * Introduce a cool dragging animation.
	 */
	proxiedStartDragging = _Root.startDragging;
	_Root.startDragging = function( element, x, y ) {
		var ret = proxiedStartDragging.call( this, element, x, y );
		if ( ! this._dragging ) {
			return;
		}
		setTimeout( function() {
			if ( this._draggingDOMElement ) {
				this._draggingDOMElement.classList.add( 'pbs-drag-helper-show' );
			}
		}.bind( this ), 10 );
		return ret;
	};

	/**
	 * Dragging elements while not over any element doesn't show the dragging
	 * indicator. This handles dragging outside existing elements.
	 */
	pbsOverElement = _.throttle( function( ev ) {

		var elements, pointerY, closestDistance, closestElement, placement, doExit;

		// Only do this when dragging.
		var root = ContentEdit.Root.get();
		if ( ! root.dragging() ) {
			return;
		}

		// Don't do this inside containers.
		if ( window.pbsSelectorMatches( ev.target, '.ct-widget, .ct-widget *' ) ) {
			hideDropIndicator();
			root._dropTarget = null;
			return;
		}

		elements = document.querySelectorAll( '.pbs-main-wrapper > .ce-element, .pbs-main-wrapper > [data-ce-tag]' );

		pointerY = ev.pageY;
		closestDistance = 999999999;
		closestElement = null;
		placement = [ 'above', 'center' ];
		doExit = false;

		Array.prototype.forEach.call( elements, function( el ) {

			var rect, scrollY, top, bottom, elemY, dist;

			if ( ! el._ceElement ) {
				return;
			}

			if ( el._ceElement === root.dragging() ) {
				return;
			}

			// Window.
			if ( window.pbsSelectorMatches( el, '.ce-element *, [data-ce-tag] *' ) ) {
				doExit = true;
				return;
			}

			rect = window.pbsGetBoundingClientRect( el );
			scrollY = window.pbsScrollY();

			top = rect.top + scrollY;
			bottom = top + rect.height;

			// Find closest Y point to the pointer.
			if ( pointerY <= top ) {
				elemY = top;
			} else if ( pointerY >= bottom ) {
				elemY = bottom;
			} else {
				elemY = pointerY;
			}

			// Find closest X point to the pointer.
			// if ( pointerX <= left ) {
			// 	elemX = left;
			// } else if ( pointerX >= right ) {
			// 	elemX = right;
			// } else {
			// 	elemX = pointerX;
			// }

			// Compute distance.
			// var dist = Math.pow( pointerX - elemX, 2 ) + Math.pow( pointerY - elemY, 2 );
			// var dist = Math.pow( pointerY - elemY, 2 );
			dist = Math.abs( pointerY - elemY );

			// If inside an element, don't do anything.
			if ( 0 === dist ) {
				doExit = true;
				return;
			}

			// Find the nearest element.
			if ( dist < closestDistance ) {
				closestDistance = dist;
				closestElement = el._ceElement;
				placement[0] = pointerY <= top + rect.height / 2 ? 'above' : 'below';
			}
		} );

		if ( doExit ) {
			return;
		}

		// Show the drop indicator on the closest element.
		if ( closestElement ) {
			root._dropTarget = closestElement;
			showDropIndicator( placement );
		}
	}, 30 );

	mouseListener = function( ev ) {
		pbsOverElement( ev );
	};
	ContentTools.EditorApp.get().bind( 'start', function() {
		window.addEventListener( 'mousemove', mouseListener );
		window.addEventListener( 'mouseover', mouseListener );
	} );
	ContentTools.EditorApp.get().bind( 'stop', function() {
		window.removeEventListener( 'mousemove', mouseListener );
		window.removeEventListener( 'mouseover', mouseListener );
	} );
} )();

/**
 * Since we're using our own drag overlay methods, we don't need to use
 * CT's drag classes. Don't add/remove them to increase performance.
 */
( function() {
	var proxiedRemove, proxiedAdd;

	proxiedAdd = ContentEdit.Element.prototype._addCSSClass;
	ContentEdit.Element.prototype._addCSSClass = function( className ) {
		if ( -1 !== className.indexOf( 'ce-element--drop' ) ) {
			return;
		}
		return proxiedAdd.call( this, className );
	};

	proxiedRemove = ContentEdit.Element.prototype._removeCSSClass;
	ContentEdit.Element.prototype._removeCSSClass = function( className ) {
		if ( -1 !== className.indexOf( 'ce-element--drop' ) ) {
			return;
		}
		return proxiedRemove.call( this, className );
	};
} )();

/* globals ContentTools, ContentEdit, PBSEditor */

( function() {
	var ready = function() {
		var i, origTitles = [], titles, editor;

		// Titles SHOULD be h1, but also try h2, h3, h4.
		var findInThese = [ 'h1', 'h2', 'h3', 'h4', '' ];
		var titleMarkers = null;
		for ( i = 0; i < findInThese.length; i++ ) {
			if ( document.querySelectorAll( findInThese[ i ] + ' [data-pbs-title-marker-post-id]' ).length ) {
				titleMarkers = document.querySelectorAll( findInThese[ i ] + ' [data-pbs-title-marker-post-id]' );
			}
		}

		if ( ! titleMarkers ) {
			titleMarkers = document.querySelectorAll( '[data-pbs-title-marker-post-id]' );
		}

		// Change the structure from an HTML marker, into a class name marker.
		titles = [];
		Array.prototype.forEach.call( titleMarkers, function( marker ) {

			var titleElement = marker.parentNode;
			var postID = marker.getAttribute( 'data-pbs-title-marker-post-id' );

			titleElement.classList.add( 'pbs-title-editor' );
			titleElement.getAttribute( 'pbs-post-id', postID );

			titles.push( titleElement );
		} );

		// Remove all markers because we don't need them anymore.
		titleMarkers = document.querySelectorAll( '[data-pbs-title-marker-post-id]' );
		Array.prototype.forEach.call( titleMarkers, function( marker ) {
			marker.parentNode.removeChild( marker );
		} );

		if ( ! titles.length ) {
			return;
		}

		editor = ContentTools.EditorApp.get();

		PBSEditor.Title = ( function() {

			function Title( domElement ) {
				this._domElement = domElement;
			}

			Title.prototype.mount = function() {
				this._domElement.setAttribute( 'contenteditable', 'true' );

				this._onPasteBound = Title.prototype._onPaste.bind( this );
				this._domElement.addEventListener( 'paste', this._onPasteBound );

				this._onKeyDownBound = Title.prototype._onKeyDown.bind( this );
				this._domElement.addEventListener( 'keydown', this._onKeyDownBound );

				this._onFocusBound = Title.prototype._onFocus.bind( this );
				this._domElement.addEventListener( 'focus', this._onFocusBound );

				this._onBlurBound = Title.prototype._onBlur.bind( this );
				this._domElement.addEventListener( 'blur', this._onBlurBound );

				this._onMouseEnterBound = Title.prototype._onMouseEnter.bind( this );
				this._domElement.addEventListener( 'mouseenter', this._onMouseEnterBound );

				this._onMouseLeaveBound = Title.prototype._onMouseLeave.bind( this );
				this._domElement.addEventListener( 'mouseleave', this._onMouseLeaveBound );
			};

			Title.prototype.unmount = function() {
				this._domElement.removeEventListener( 'paste', this._onKeyDownBound );
				this._domElement.removeEventListener( 'keydown', this._onKeyDownBound );
				this._domElement.removeEventListener( 'focus', this._onFocusBound );
				this._domElement.removeEventListener( 'blur', this._onBlurBound );
				this._domElement.removeEventListener( 'mouseenter', this._onMouseEnterBound );
				this._domElement.removeEventListener( 'mouseleave', this._onMouseLeaveBound );

				this._domElement.removeAttribute( 'contenteditable' );

				this._domElement.classList.remove( 'ce-element--focused' );
			};

			Title.prototype._onKeyDown = function( ev ) {
				if ( ev.ctrlKey || ev.metaKey ) {

					// R, I, B
					if ( [ 82, 73, 66 ].indexOf( ev.keyCode ) !== -1 ) {
						ev.preventDefault();
					}

					// Z (Undo should only work with the title only when focused)
					if ( [ 90 ].indexOf( ev.keyCode ) !== -1 ) {
						ev.stopPropagation();
					}
				}
			};

			// Turn all pastes into plain text for the title.
			// @see http://stackoverflow.com/questions/12027137/javascript-trick-for-paste-as-plain-text-in-execcommand
			Title.prototype._onPaste = function( ev ) {
				var text = '';
				ev.preventDefault();
			    if ( ev.clipboardData || ev.originalEvent.clipboardData ) {
					text = ( ev.originalEvent || ev ).clipboardData.getData( 'text/plain' );
			    } else if ( window.clipboardData ) {
					text = window.clipboardData.getData( 'Text' );
			    }
			    if ( document.queryCommandSupported( 'insertText' ) ) {
					document.execCommand( 'insertText', false, text );
			    } else {
					document.execCommand( 'paste', false, text );
			    }
			};

			Title.prototype._onFocus = function() {
				var root = ContentEdit.Root.get();
				if ( root.focused() ) {
					root.focused().blur();
				}
				this._domElement.classList.add( 'ce-element--focused' );
				PBSEditor.Overlay.hideOtherOverlays( null );
			};

			Title.prototype._onBlur = function() {
				this._domElement.classList.remove( 'ce-element--focused' );
			};

			Title.prototype._onMouseEnter = function() {
				wp.hooks.doAction( 'pbs.element.over', this );
			};

			Title.prototype._onMouseLeave = function() {
			};

			Title.prototype.parent = function() {
				return null;
			};

			return Title;
		} )();

		for ( i = 0; i < titles.length; i++ ) {
			titles[ i ] = new PBSEditor.Title( titles[ i ] );
		}

		editor.bind( 'start', function() {
			var i;

			origTitles = [];
			for ( i = 0; i < titles.length; i++ ) {
				titles[ i ].mount();
				origTitles.push( titles[ i ]._domElement.textContent );
			}
		} );
		editor.bind( 'stop', function() {
			var i;

			for ( i = 0; i < titles.length; i++ ) {
				titles[ i ].unmount();
			}
		} );

		wp.hooks.addAction( 'pbs.save.post.before', 'pbs', function( pbsController ) {
			var i;

			for ( i = titles.length - 1; i >= 0; i-- ) {
				if ( origTitles[ i ] !== titles[ i ]._domElement.textContent ) {
					pbsController._saveProvider.addData( 'title', titles[ i ]._domElement.textContent );
					break;
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

/* globals PBSEditor, __extends, fastdom */

PBSEditor.Toolbar = ( function( _super ) {
	__extends( Toolbar, _super );

	function Toolbar( elementName, tools ) {
		Toolbar.__super__.constructor.call( this );
		this.tools = tools;
		this.elementName = elementName;
	}

	Toolbar.toolClickHandler = function( ev ) {
		if ( this.tool.onClick ) {
			this.tool.onClick( this.toolbar.element, this, ev );
			this.toolbar.updatePosition( this.toolbar.element );
		}
	};

	Toolbar.toolMouseDownHandler = function( ev ) {
		if ( this.tool.onMouseDown ) {
			this.tool.onMouseDown( this.toolbar.element, this, ev );
			this.toolbar.updatePosition( this.toolbar.element );
		}
	};

	Toolbar.toolMouseEnterHandler = function( ev ) {
		if ( this.tool.onMouseEnter ) {
			this.tool.onMouseEnter( this.toolbar.element, this.toolbar, ev );
			this.toolbar.updatePosition( this.toolbar.element );
		}
	};

	Toolbar.toolMouseLeaveHandler = function( ev ) {
		if ( this.tool.onMouseLeave ) {
			this.tool.onMouseLeave( this.toolbar.element, this.toolbar, ev );
			this.toolbar.updatePosition( this.toolbar.element );
		}
	};

	Toolbar.prototype.createElement = function() {
		var tool, i, buttonExists;
		var element = document.createElement( 'DIV' );
		var buttonContainer = document.createElement( 'DIV' );

		element.style.display = 'none';
		element.classList.add( 'pbs-overlay-toolbar' );
		element.classList.add( 'pbs-toolbar-' + this.elementName.toLowerCase().replace( /[^\w\d]/, '-' ) );

		buttonContainer.classList.add( 'pbs-toolbar-wrapper' );
		element.appendChild( buttonContainer );
		this._buttonContainer = buttonContainer;

		for ( i = 0; i < this.tools.length; i++ ) {
			tool = document.createElement( 'DIV' );
			tool.classList.add( 'pbs-toolbar-tool' );

			if ( this.tools[ i ].id ) {
				tool.setAttribute( 'data-toolbar-id', this.tools[ i ].id );
			}

			tool.toolbar = this;
			tool.tool = this.tools[ i ];

			if ( this.tools[ i ].label ) {
				tool.classList.add( 'pbs-toolbar-label' );
				tool.innerHTML = this.tools[ i ].label;
				buttonContainer.appendChild( tool );
				continue;
			}

			tool.classList.add( 'pbs-toolbar-tool-' + this.tools[ i ].id );
			if ( this.tools[ i ].tooltip ) {
				tool.setAttribute( 'data-tooltip', this.tools[ i ].tooltip );
			}

			tool.addEventListener( 'click', Toolbar.toolClickHandler.bind( tool ) );
			tool.addEventListener( 'mousedown', Toolbar.toolMouseDownHandler.bind( tool ) );
			tool.addEventListener( 'mouseenter', Toolbar.toolMouseEnterHandler.bind( tool ) );
			tool.addEventListener( 'mouseleave', Toolbar.toolMouseLeaveHandler.bind( tool ) );

			// If the button exists already, replace the existing one.
			buttonExists = false;
			if ( this.tools[ i ].id ) {
				buttonExists = buttonContainer.querySelector( '[data-toolbar-id="' + this.tools[ i ].id + '"]' );
			}
			if ( buttonExists ) {
				buttonExists.parentNode.replaceChild( tool, buttonExists );
			} else {
				buttonContainer.appendChild( tool );
			}
		}

		return element;
	};

	Toolbar.prototype.canApplyTo = function( element ) {

		if ( this.element === element ) {
			return element;
		}

		if ( element.constructor && element.constructor.name === this.elementName ) {
			return element;
		}

		return false;
	};

	Toolbar.prototype.checkIfTooSmall = function( element ) {
		fastdom.measure( function() {
			var rect = window.pbsGetBoundingClientRect( element._domElement );
			var width = rect.width;

			fastdom.mutate( function() {
				if ( width <= 150 ) {
					this._domElement.classList.add( 'pbs-toolbar-top' );
				} else {
					this._domElement.classList.remove( 'pbs-toolbar-top' );
				}
			}.bind( this ) );
		}.bind( this ) );
	};

	Toolbar.prototype.checkIfTooShort = function( element ) {
		fastdom.measure( function() {
			var rect = window.pbsGetBoundingClientRect( element._domElement );
			var height = rect.height;

			fastdom.mutate( function() {
				if ( height <= 28 ) {
					this._domElement.classList.add( 'pbs-toolbar-short' );
				} else {
					this._domElement.classList.remove( 'pbs-toolbar-short' );
				}
			}.bind( this ) );
		}.bind( this ) );
	};

	Toolbar.prototype.checkIfTooHigh = function( element ) {
		fastdom.measure( function() {
			var rect = window.pbsGetBoundingClientRect( element._domElement );
			var top = rect.top;

			fastdom.mutate( function() {
				if ( top <= 82 ) {
					this._domElement.classList.add( 'pbs-toolbar-too-high' );
				} else {
					this._domElement.classList.remove( 'pbs-toolbar-too-high' );
				}
			}.bind( this ) );
		}.bind( this ) );
	};

	Toolbar.prototype.updateTools = function( element ) {

		var tool;

		// Dynamic labels. Used for labels that change depending on what's selected.
		var tools = this._buttonContainer.querySelectorAll( '.pbs-toolbar-tool' );
		Array.prototype.forEach.call( tools, function( el ) {

			if ( ! el.tool ) {
				return;
			}

			tool = el.tool;

			if ( tool['class'] ) {
				el.classList.add( tool['class'] );
			}

			if ( 'function' === typeof tool.tooltip ) {
				el.setAttribute( 'data-tooltip', tool.tooltip( element ) );
			}

			if ( 'function' === typeof tool.label ) {
				el.innerHTML = tool.label( element );
			}

			el.classList.remove( 'pbs-toolbar-tool-hide' );
			if ( 'function' === typeof tool.display ) {
				if ( ! tool.display( element, el ) ) {
					el.classList.add( 'pbs-toolbar-tool-hide' );
				}
			}

		}.bind( this ) );
	};

	Toolbar.prototype.show = function( element ) {
		Toolbar.__super__.show.call( this, element );
		this.checkIfTooSmall( element );
		this.checkIfTooHigh( element );
		this.checkIfTooShort( element );
		this.updateTools( element );
	};

	Toolbar.prototype._mouseenter = function( ev ) {
		Toolbar.__super__._mouseenter.call( this, ev );
	};

	return Toolbar;

} )( PBSEditor.OverlayControls );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarElement = ( function( _super ) {
	__extends( ToolbarElement, _super );

	function ToolbarElement() {

		ToolbarElement.__super__.constructor.call( this,
			'Text',
			[
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					display: function( element ) {
						return ! element.content.isWhitespace();
					},
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					display: function( element ) {
						return ! element.content.isWhitespace();
					},
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					display: function( element ) {
						return ! element.content.isWhitespace();
					},
					onClick: function( element ) {
						if ( 'IconLabel' === element.parent().constructor.name ) {
							element.parent().clone();
							return;
						}
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					display: function( element ) {
						return ! element.content.isWhitespace();
					},
					onClick: function( element ) {
						if ( 'IconLabel' === element.parent().constructor.name ) {
							element.parent().parent().detach( element.parent() );
							return;
						}
						element.parent().detach( element );
					}
				}
			]
		);
	}

	return ToolbarElement;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, ContentTools, pbsParams */

PBSEditor.ToolbarImage = ( function( _super ) {

	var toolbars = [];

	__extends( ToolbarImage, _super );

	toolbars.push(
		{
			label: function( element ) {
				if ( ! element.a ) {
					return pbsParams.labels.image;
				}
				return element.a.href || pbsParams.labels.image;
			}
		},
		{
			id: 'move',
			tooltip: pbsParams.labels.move,
			onMouseDown: function( element, toolbar, ev ) {
				ev.stopPropagation();
				element.drag( ev.pageX, ev.pageY );
			}
		},

		// {
		// 	id: 'link',
		// 	tooltip: pbsParams.labels.edit_link,
		// 	onClick: function( element ) {
		// 		// Open the link editor.
		// 		window.PBSEditor.getToolUI( 'link' ).apply( element, null, function() { } );
		// 	}
		// },
		// {
		// 	id: 'unlink',
		// 	tooltip: pbsParams.labels.unlink,
		// 	display: function( element ) {
		// 		if ( element.a ) {
		// 			return true;
		// 		}
		// 		return false;
		// 	},
		// 	onClick: function( element, view ) {
		// 		element.a = undefined;
		// 		view.toolbar.canApply( element );
		// 	}
		// },
		{
			id: 'settings',
			tooltip: pbsParams.labels.properties,
			onClick: function( element ) {
				element.inspect();
			}
		},
		{
			id: 'clone',
			tooltip: pbsParams.labels.clone,
			onClick: function( element ) {
				element.clone();
			}
		},
		{
			id: 'remove',
			tooltip: pbsParams.labels['delete'],
			onClick: function( element ) {
				element.remove();
			}
		}
	);

	function ToolbarImage() {

		ToolbarImage.__super__.constructor.call( this,
			'Image',
			toolbars
		);
	}

	return ToolbarImage;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarNewsletter = ( function( _super ) {
	__extends( ToolbarNewsletter, _super );

	function ToolbarNewsletter() {

		ToolbarNewsletter.__super__.constructor.call( this,
			'Newsletter',
			[
				{
					label: pbsParams.labels.newsletter
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.remove();
					}
				}
			]
		);
	}

	return ToolbarNewsletter;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarHtml = ( function( _super ) {
	__extends( ToolbarHtml, _super );

	function ToolbarHtml() {

		ToolbarHtml.__super__.constructor.call( this,
			'Html',
			[
				{
					label: pbsParams.labels.html
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					onClick: function( element ) {
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.parent().detach( element );
					}
				}
			]
		);
	}

	return ToolbarHtml;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarIframe = ( function( _super ) {
	__extends( ToolbarIframe, _super );

	function ToolbarIframe() {

		ToolbarIframe.__super__.constructor.call( this,
			'IFrame',
			[
				{
					label: pbsParams.labels.iframe
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'edit',
					tooltip: pbsParams.labels.edit,
					onClick: function( element ) {
						element._onDoubleClick();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.parent().detach( element );
					}
				}
			]
		);
	}

	return ToolbarIframe;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarEmbed = ( function( _super ) {
	__extends( ToolbarEmbed, _super );

	function ToolbarEmbed() {

		ToolbarEmbed.__super__.constructor.call( this,
			'Embed',
			[
				{
					label: pbsParams.labels.embedded_url
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					onClick: function( element ) {
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.remove();
					}
				}
			]
		);
	}

	return ToolbarEmbed;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarMap = ( function( _super ) {
	__extends( ToolbarMap, _super );

	function ToolbarMap() {

		ToolbarMap.__super__.constructor.call( this,
			'Map',
			[
				{
					label: pbsParams.labels.map
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					onClick: function( element ) {
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.parent().detach( element );
					}
				}
			]
		);
	}

	return ToolbarMap;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarIcon = ( function( _super ) {
	__extends( ToolbarIcon, _super );

	function ToolbarIcon() {

		ToolbarIcon.__super__.constructor.call( this,
			'Icon',
			[
				{
					label: pbsParams.labels.icon
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					display: function( element ) {
						if ( 'IconLabel' === element.parent().constructor.name ) {
							return false;
						}
						return true;
					},
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					display: function( element ) {
						if ( 'IconLabel' === element.parent().constructor.name ) {
							return false;
						}
						return true;
					},
					onClick: function( element ) {
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					display: function( element ) {
						if ( 'IconLabel' === element.parent().constructor.name ) {
							return false;
						}
						return true;
					},
					onClick: function( element ) {
						element.parent().detach( element );
					}
				}
			]
		);
	}

	return ToolbarIcon;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, PBSInspectorOptions, __extends, pbsParams */

PBSEditor.ToolbarShortcode = ( function( _super ) {
	__extends( ToolbarShortcode, _super );

	function ToolbarShortcode() {

		ToolbarShortcode.__super__.constructor.call( this,
			'Shortcode',
			[
				{
					label: function( element ) {
						var label = wp.hooks.applyFilters( 'pbs.toolbar.shortcode.label', element.sc_base );

						// Use the label of the shortcode if it is provided.
						if ( PBSInspectorOptions.Shortcode[ element.sc_base ] ) {
							if ( PBSInspectorOptions.Shortcode[ element.sc_base ].label ) {
								label = wp.hooks.applyFilters( 'pbs.toolbar.shortcode.label', PBSInspectorOptions.Shortcode[ element.sc_base ].label );
							}
						}

						return label;
					}
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					onClick: function( element ) {
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.parent().detach( element );
					}
				}
			]
		);
	}

	return ToolbarShortcode;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarList = ( function( _super ) {
	__extends( ToolbarList, _super );

	function ToolbarList() {

		ToolbarList.__super__.constructor.call( this,
			'List',
			[
				{
					label: pbsParams.labels.list
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					onClick: function( element ) {
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.remove();
					}
				}
			]
		);
	}

	ToolbarList.prototype.canApplyTo = function( element ) {
		var ret = ToolbarList.__super__.canApplyTo.call( element );

		if ( ! ret ) {
			if ( element.constructor ) {
				if ( 'ListItem' === element.constructor.name ) {
					return element.parent();
				}
				if ( element.parent() && 'ListItem' === element.parent().constructor.name ) {
					return element.parent().parent();
				}
			}
		}

		return ret;
	};

	return ToolbarList;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarButton = ( function( _super ) {
	__extends( ToolbarButton, _super );

	function ToolbarButton() {

		ToolbarButton.__super__.constructor.call( this,
			'Button',
			[
				{
					label: function( element ) {
						var button = element._domElement.querySelector( '.pbs-button' );
						if ( button.getAttribute( 'href' ) ) {
							return button.getAttribute( 'href' );
						}
						return pbsParams.labels.button;
					}
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					display: function( element ) {
						return ! element.content.isWhitespace();
					},
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					onClick: function( element ) {
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.remove();
					}
				}
			]
		);
	}

	return ToolbarButton;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, ContentTools, ContentEdit, pbsParams */

PBSEditor.ToolbarRow = ( function( _super ) {
	__extends( ToolbarRow, _super );

	function ToolbarRow() {

		ToolbarRow.__super__.constructor.call( this,
			'DivRow',
			[
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					display: function( element ) {

						// Hide when the row is inside tabs.
						if ( 'TabPanelContainer' === element.parent().constructor.name ) {
							return false;
						}

						// Hide when the row is inside a toggle.
						if ( 'Toggle' === element.parent().constructor.name ) {
							return false;
						}

						return true;
					},
					onMouseDown: function( element, toolbar, ev ) {

						ev.stopPropagation();

						// Carousels.
						if ( 'Carousel' === element.parent().constructor.name ) {
							element = element.parent();
						}

						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {

						ContentTools.EditorApp.get()._toolboxProperties.inspect( element.children[0] );

						// Show carousel settings.
						if ( 'Carousel' === element.parent().constructor.name ) {
							document.querySelector( '.pbs-toolbox-properties [data-name="Carousel"]' ).dispatchEvent( new CustomEvent( 'click' ) );
							return;
						}

						// ContentTools.EditorApp.get()._toolboxProperties.inspect( element.children[0] );
						document.querySelector( '.pbs-toolbox-properties [data-name="DivRow"]' ).dispatchEvent( new CustomEvent( 'click' ) );
					}
				},
				{
					id: 'add',
					tooltip: function( element ) {

						// Add carousel slide.
						if ( 'Carousel' === element.parent().constructor.name ) {
							return pbsParams.labels.add_slide;
						}

						// Add column.
						return pbsParams.labels.add_column;
					},
					display: function( element ) {

						// Hide when the row is inside a toggle.
						if ( 'Toggle' === element.parent().constructor.name ) {
							return false;
						}

						return true;
					},
					onClick: function( element ) {

						var root = ContentEdit.Root.get();

						// Add carousel slide.
						if ( 'Carousel' === element.parent().constructor.name ) {
							element.parent().addSlide();
							return;
						}

						// Add column.
						if ( root.focused() ) {
							if ( root.focused().blur ) {
								root.focused().blur();
							}
						}
						element.addNewColumn( 1 );
					}
				},
				{
					id: 'clone',
					tooltip: function( element ) {

						// Clone carousel.
						if ( 'Carousel' === element.parent().constructor.name ) {
							return pbsParams.labels.clone_slide;
						}

						// Clone row.
						return pbsParams.labels.clone_row;
					},
					display: function( element ) {

						// Hide when the row is inside tabs.
						if ( 'TabPanelContainer' === element.parent().constructor.name ) {
							return false;
						}

						// Hide when the row is inside a toggle.
						if ( 'Toggle' === element.parent().constructor.name ) {
							return false;
						}

						return true;
					},
					onClick: function( element ) {
						var newRow;

						// Clone slide.
						if ( 'Carousel' === element.parent().constructor.name ) {
							element.parent().cloneSlide();
							return;
						}

						newRow = element.clone();
						window._pbsFixRowWidth( newRow._domElement );
					}
				},
				{
					id: 'responsive_hide',
					tooltip: function() {
						return window.innerWidth <= 400 ? pbsParams.labels.hide_in_phones : pbsParams.labels.hide_in_tablets;
					},
					display: function( element, button ) {

						// Hide when the row is inside a carousel.
						if ( 'Carousel' === element.parent().constructor.name ) {
							return false;
						}

						// Hide when the row is inside tabs.
						if ( 'TabPanelContainer' === element.parent().constructor.name ) {
							return false;
						}

						// Hide when the row is inside a toggle.
						if ( 'Toggle' === element.parent().constructor.name ) {
							return false;
						}

						if ( window.innerWidth > 800 ) {
							return false;
						}

						if ( window.innerWidth > 400 ) {
							if ( element.attr( 'data-pbs-hide-tablet' ) ) {
								button.classList.add( 'pbs-responsive-hidden' );
							} else {
								button.classList.remove( 'pbs-responsive-hidden' );
							}
						} else {
							if ( '1' === element.attr( 'data-pbs-hide-phone' ) || '2' === element.attr( 'data-pbs-hide-phone' ) ) {
								button.classList.add( 'pbs-responsive-hidden' );
							} else {
								button.classList.remove( 'pbs-responsive-hidden' );
							}
						}
						return true;
					},
					onClick: function( element, button ) {
						if ( window.innerWidth > 400 ) {

							if ( element.attr( 'data-pbs-hide-tablet' ) ) {
								element.removeAttr( 'data-pbs-hide-tablet' );
								if ( '2' === element.attr( 'data-pbs-hide-phone' ) ) {
									element.removeAttr( 'data-pbs-hide-phone' );
								}
								button.classList.remove( 'pbs-responsive-hidden' );
							} else {
								element.attr( 'data-pbs-hide-tablet', '1' );
								if ( '0' !== element.attr( 'data-pbs-hide-phone' ) && '1' !== element.attr( 'data-pbs-hide-phone' ) ) {
									element.attr( 'data-pbs-hide-phone', '2' );
								}
								button.classList.add( 'pbs-responsive-hidden' );
							}
						} else {

							if ( '0' !== element.attr( 'data-pbs-hide-phone' ) ) {
								element.attr( 'data-pbs-hide-phone', '0' );
								button.classList.remove( 'pbs-responsive-hidden' );
							} else {
								element.attr( 'data-pbs-hide-phone', '1' );
								button.classList.add( 'pbs-responsive-hidden' );
							}
						}
					}
				},
				{
					id: 'remove2',
					tooltip: function( element ) {

						// Delete carousel slide.
						if ( 'Carousel' === element.parent().constructor.name ) {
							return pbsParams.labels.delete_slide;
						}

						// Delete column.
						return pbsParams.labels.delete_column;
					},
					display: function( element ) {

						// Hide when the row is inside tabs.
						if ( 'TabPanelContainer' === element.parent().constructor.name ) {
							return false;
						}

						// Hide when the row is inside a toggle.
						if ( 'Toggle' === element.parent().constructor.name ) {
							return false;
						}

						return true;
					},
					onClick: function( element ) {
						if ( 'Carousel' === element.parent().constructor.name ) {
							element.parent().removeSlide();
							return;
						}

						element.children[0].remove();
					},
					onMouseLeave: function() {
						document.querySelector( '.pbs-toolbar-divcol' ).classList.remove( 'pbs-col-delete-highlight' );
					},
					onMouseEnter: function() {
						document.querySelector( '.pbs-toolbar-divcol' ).classList.add( 'pbs-col-delete-highlight' );
					}
				},
				{
					id: 'remove',
					tooltip: function( element ) {

						// Delete carousel.
						if ( 'Carousel' === element.parent().constructor.name ) {
							return pbsParams.labels.delete_carousel;
						}

						// Delete row.
						return pbsParams.labels.delete_row;
					},
					display: function( element ) {

						// Hide when the row is inside tabs.
						if ( 'TabPanelContainer' === element.parent().constructor.name ) {
							return false;
						}

						// Hide when the row is inside a toggle.
						if ( 'Toggle' === element.parent().constructor.name ) {
							return false;
						}

						return true;
					},
					onClick: function( element ) {
						if ( 'Carousel' === element.parent().constructor.name ) {
							element.parent().remove();
							return;
						}

						element.remove();
					},
					onMouseLeave: function() {
						document.querySelector( '.pbs-toolbar-divrow' ).classList.remove( 'pbs-row-delete-highlight' );
					},
					onMouseEnter: function() {
						document.querySelector( '.pbs-toolbar-divrow' ).classList.add( 'pbs-row-delete-highlight' );
					}
				}
			]
		);
	}

	ToolbarRow.prototype.canApplyTo = function( element ) {

		this._domElement.classList.remove( 'pbs-col-first-selected' );
		if ( 'DivCol' === element.constructor.name ) {
			if ( 0 === element.parent().children.indexOf( element ) ) {
				this._domElement.classList.add( 'pbs-col-first-selected' );
			}
		}

		this._domElement.classList.remove( 'pbs-row-selected' );
		if ( 'DivRow' === element.constructor.name ) {
			this._domElement.classList.add( 'pbs-row-selected' );
			return element;
		}

		if ( 'DivRow' !== element.constructor.name ) {
			element = element.parent();
			while ( element && 'Region' !== element.constructor.name ) {
				if ( 'DivCol' === element.constructor.name ) {
					if ( 0 === element.parent().children.indexOf( element ) ) {
						this._domElement.classList.add( 'pbs-col-first-selected' );
					}
				}
				if ( 'DivRow' === element.constructor.name ) {
					return element;
				}
				element = element.parent();
			}
		}

		return false;
	};

	ToolbarRow.prototype.show = function( element ) {
		ToolbarRow.__super__.show.call( this, element );
	};

	return ToolbarRow;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, ContentTools, ContentEdit, pbsParams */

PBSEditor.ToolbarColumn = ( function( _super ) {
	__extends( ToolbarColumn, _super );

	function ToolbarColumn() {

		ToolbarColumn.__super__.constructor.call( this,
			'DivCol',
			[
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					display: function( element ) {
						return 0 !== element.parent().children.indexOf( element );
					},
					onClick: function( element ) {
						ContentTools.EditorApp.get()._toolboxProperties.inspect( element );
					}
				},
				{
					id: 'add',
					tooltip: pbsParams.labels.add_column,
					display: function( element ) {
						return 0 !== element.parent().children.indexOf( element );
					},
					onClick: function( element ) {
						var root, index, col;
						root = ContentEdit.Root.get();
						if ( root.focused() ) {
							if ( root.focused().blur ) {
								root.focused().blur();
							}
						}
						index = element.parent().children.indexOf( element ) + 1;
						col = element.parent().addNewColumn( index );
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					display: function( element ) {

						if ( element.parent() ) {
							if ( element.parent().parent() ) {
								if ( 'Toggle' === element.parent().parent().constructor.name ) {
									return false;
								}
							}
						}

						return 0 !== element.parent().children.indexOf( element );
					},
					onClick: function( element ) {
						element.clone();
					}
				},

				// {
				// 	id: 'move-horizontal',
				// 	tooltip: pbsParams.labels.clone,
				// 	onMouseDown: function( element, toolbar, ev ) {
				// 		ev.stopPropagation();
				// 		element.drag( ev.pageX, ev.pageY );
				// 	},
				// 	display: function( element ) {
				// 		return 0 !== element.parent().children.indexOf( element );
				// 	}
				// },
				{
					id: 'remove',
					tooltip: pbsParams.labels.delete_column,
					display: function( element ) {
						return 0 !== element.parent().children.indexOf( element );
					},
					onClick: function( element ) {
						element.remove();
					},
					onMouseLeave: function() {
						document.querySelector( '.pbs-toolbar-divcol' ).classList.remove( 'pbs-col-delete-highlight' );
					},
					onMouseEnter: function() {
						document.querySelector( '.pbs-toolbar-divcol' ).classList.add( 'pbs-col-delete-highlight' );
					}
				}
			]
		);
	}

	ToolbarColumn.prototype.canApplyTo = function( element ) {

		if ( 'DivCol' === element.constructor.name ) {
			return element;
		}

		if ( 'DivCol' !== element.constructor.name ) {
			element = element.parent();
			while ( element && 'Region' !== element.constructor.name ) {
				if ( 'DivCol' === element.constructor.name ) {
					return element;
				}
				element = element.parent();
			}
		}

		return false;
	};

	ToolbarColumn.prototype.show = function( element ) {
		ToolbarColumn.__super__.show.call( this, element );

		if ( element.parent() ) {
			if ( 0 === element.parent().children.indexOf( element ) ) {
				this._domElement.classList.add( 'pbs-col-on-first' );
			} else {
				this._domElement.classList.remove( 'pbs-col-on-first' );
			}
		}
	};

	return ToolbarColumn;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarCountdown = ( function( _super ) {
	__extends( ToolbarCountdown, _super );

	function ToolbarCountdown() {

		ToolbarCountdown.__super__.constructor.call( this,
			'Countdown',
			[
				{
					label: pbsParams.labels.countdown
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					onClick: function( element ) {
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.remove();
					}
				}
			]
		);
	}

	return ToolbarCountdown;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarTabContainer = ( function( _super ) {
	var toolbar = [];

	__extends( ToolbarTabContainer, _super );

	toolbar.push(
		{
			id: 'move',
			tooltip: pbsParams.labels.move,
			onMouseDown: function( element, toolbar, ev ) {
				ev.stopPropagation();
				element.parent().drag( ev.pageX, ev.pageY );
			}
		},
		{
			id: 'add',
			tooltip: pbsParams.labels.add_tab,
			onClick: function( element ) {
				element.parent().addTab();
			}
		},
		{
			id: 'settings',
			tooltip: pbsParams.labels.properties,
			onClick: function( element ) {
				element.inspect();
			}
		},
		{
			id: 'clone',
			tooltip: pbsParams.labels.clone,
			onClick: function( element ) {
				element.parent().clone();
			}
		},
		{
			id: 'remove',
			tooltip: pbsParams.labels['delete'],
			onClick: function( element ) {
				element.parent().remove();
			}
		}
	);

	function ToolbarTabContainer() {

		ToolbarTabContainer.__super__.constructor.call( this,
			'TabContainer',
			toolbar
		);
	}

	ToolbarTabContainer.prototype.canApplyTo = function( element ) {

		if ( 'Tab' === element.constructor.name ) {
			return element.parent();
		}

		return ToolbarTabContainer.__super__.canApplyTo.call( this, element );
	};

	return ToolbarTabContainer;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarTable = ( function( _super ) {
	__extends( ToolbarTable, _super );

	function ToolbarTable() {

		ToolbarTable.__super__.constructor.call( this,
			'Table',
			[
				{
					label: pbsParams.labels.table
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.parent().detach( element );
					}
				}
			]
		);
	}

	return ToolbarTable;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarTitle = ( function( _super ) {
	__extends( ToolbarTitle, _super );

	function ToolbarTitle() {

		ToolbarTitle.__super__.constructor.call( this,
			'Title',
			[
				{
					label: pbsParams.labels.post_title
				}
			]
		);
	}

	return ToolbarTitle;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarSpacer = ( function( _super ) {
	__extends( ToolbarSpacer, _super );

	function ToolbarSpacer() {

		ToolbarSpacer.__super__.constructor.call( this,
			'Spacer',
			[
				{
					label: pbsParams.labels.spacer
				},
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					onClick: function( element ) {
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.parent().detach( element );
					}
				}
			]
		);
	}

	return ToolbarSpacer;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarToggle = ( function( _super ) {
	var toolbars = [];

	__extends( ToolbarToggle, _super );

	toolbars.push(
		{
			label: pbsParams.labels.toggle
		},
		{
			id: 'move',
			tooltip: pbsParams.labels.move,
			onMouseDown: function( element, toolbar, ev ) {
				ev.stopPropagation();
				element.parent().drag( ev.pageX, ev.pageY );
			}
		},
		{
			id: 'clone',
			tooltip: pbsParams.labels.clone,
			onClick: function( element ) {
				element.parent().clone();
			}
		},
		{
			id: 'remove',
			tooltip: pbsParams.labels['delete'],
			onClick: function( element ) {
				element.parent().remove();
			}
		}
	);

	function ToolbarToggle() {

		ToolbarToggle.__super__.constructor.call( this,
			'ToggleTab',
			toolbars
		);
	}

	return ToolbarToggle;

} )( PBSEditor.Toolbar );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.ToolbarHr = ( function( _super ) {
	__extends( ToolbarHr, _super );

	function ToolbarHr() {

		ToolbarHr.__super__.constructor.call( this,
			'Hr',
			[
				{
					id: 'move',
					tooltip: pbsParams.labels.move,
					onMouseDown: function( element, toolbar, ev ) {
						ev.stopPropagation();
						element.drag( ev.pageX, ev.pageY );
					}
				},
				{
					id: 'settings',
					tooltip: pbsParams.labels.properties,
					onClick: function( element ) {
						element.inspect();
					}
				},
				{
					id: 'clone',
					tooltip: pbsParams.labels.clone,
					onClick: function( element ) {
						element.clone();
					}
				},
				{
					id: 'remove',
					tooltip: pbsParams.labels['delete'],
					onClick: function( element ) {
						element.remove();
					}
				}
			]
		);
	}

	return ToolbarHr;

} )( PBSEditor.Toolbar );

/* globals ContentTools, PBSEditor, pbsSelectorMatches */

/**
 * The Tooltip API
 */
PBSEditor.Tooltip = ( function() {

    function Tooltip( name, selector, labelFunction, tools ) {
		this._domElement = null;
		this.name = name || this.constructor.name.toLowerCase();
		this.labelFunction = labelFunction || function() {};
		this.selector = selector || '';
		this.tools = tools || [];

		this.init();
    }

	Tooltip.prototype.init = function() {
		this._onMouseOverBound = this._onMouseOver.bind( this );
		this._onMouseOutBound = this._onMouseOut.bind( this );

		// Add/remove the event listeners to the editor.
		ContentTools.EditorApp.get().bind( 'start', function() {

			var label, i, tool;

			this._domElement = document.createElement( 'DIV' );
			this._domElement.classList.add( 'pbs-tooltip--' + this.name );
			this._domElement.classList.add( 'pbs-tooltip' );

			label = document.createElement( 'DIV' );
			this._domElement.appendChild( label );

			for ( i = 0; i < this.tools.length; i++ ) {
				tool = document.createElement( 'DIV' );
				tool.classList.add( 'pbs-tooltip-button' );
				tool.classList.add( 'pbs-tooltip-button-' + this.tools[ i ].name );
				tool.addEventListener( 'click', this.tools[ i ].onClick.bind( this ) );
				this._domElement.appendChild( tool );
			}

			document.body.appendChild( this._domElement );

			document.addEventListener( 'mouseover', this._onMouseOverBound );
			document.addEventListener( 'mouseout', this._onMouseOutBound );
		}.bind( this ) );
		ContentTools.EditorApp.get().bind( 'stop', function() {
			this.hide();
			document.removeEventListener( 'mouseover', this._onMouseOverBound );
			document.removeEventListener( 'mouseout', this._onMouseOutBound );

			this._domElement.parentNode.removeChild( this._domElement );
			this._domElement = null;
		}.bind( this ) );
	};

	Tooltip.prototype._onMouseOver = function( ev ) {

		var target;

		// Find whether the selector matches the element (or any of it's parents).
		if ( pbsSelectorMatches( ev.target, '.pbs-main-wrapper ' + this.selector + ', .pbs-main-wrapper ' + this.selector + ' *' ) ) {
			target = ev.target;

			// Find the element that matched (if a child matched).
			while ( ! pbsSelectorMatches( target, '.pbs-main-wrapper ' + this.selector ) ) {
				target = target.parentNode;
			}

			this.target = target;
			this.show( target );
		}
	};

	/**
	 * Hide tooltip on mouse out.
	 */
	Tooltip.prototype._onMouseOut = function( ev ) {

		// Out of bounds.
		if ( ! ev.relatedTarget ) {
			this.hide();
			return;
		}

		// Pbs-button -> tooltip / tooltip-button
		if ( pbsSelectorMatches( ev.target, '.pbs-main-wrapper ' + this.selector ) || pbsSelectorMatches( ev.target, '.pbs-main-wrapper ' + this.selector + ' *' ) ) {
			if ( ev.relatedTarget === this._domElement || this._domElement.contains( ev.relatedTarget ) ) {
				return;
			}
		}

		// Tooltip / tooltip-button -> pbs-button
		if ( this._domElement === ev.target || this._domElement.contains( ev.target ) ) {
			if ( pbsSelectorMatches( ev.relatedTarget, '.pbs-main-wrapper ' + this.selector ) || pbsSelectorMatches( ev.relatedTarget, '.pbs-main-wrapper ' + this.selector + ' *' ) ) {
				return;
			}
		}

		// Tooltip <-> tooltip-button
		if ( this._domElement === ev.target || this._domElement.contains( ev.target ) ) {
			if ( this._domElement === ev.relative || this._domElement.contains( ev.relatedTarget ) ) {
				return;
			}
		}

		this.hide();
	};

	Tooltip.prototype.show = function( domElementTarget ) {
		var rect = window.pbsGetBoundingClientRect( domElementTarget );

		this._domElement.style.top = ( rect.top + window.pbsScrollY() - window.formattingToolbarHeight() ) + 'px';
		this._domElement.style.left = ( rect.left + rect.width / 2 ) + 'px';

		if ( 'function' === typeof this.labelFunction ) {
			this._domElement.firstChild.innerHTML = this.labelFunction( domElementTarget );
		} else {
			this._domElement.firstChild.innerHTML = this.labelFunction;
		}
		this._domElement.classList.add( 'pbs-tooltip-show' );
		this.element = domElementTarget;
	};

	Tooltip.prototype.hide = function() {
		this._domElement.classList.remove( 'pbs-tooltip-show' );
	};

	return Tooltip;

} )();

/* globals PBSEditor, __extends */

PBSEditor.TooltipLink = ( function( _super ) {
	__extends( TooltipLink, _super );

	function TooltipLink() {
		TooltipLink.__super__.constructor.call( this,
			'link',
			'.ce-element--type-text a:not(.pbs-button)',
			function( element ) {
				var link = element.getAttribute( 'href' );
				if ( link.length > 70 ) {
					link = link.substr( 0, 70 ) + '...';
				}
				return link;
			},
			[
				{
					name: 'visit',
					onClick: function() {
						window.open( this.target.getAttribute( 'href' ), '_linktool' );
						this.hide();
					}
				},
				{
					name: 'edit',
					onClick: function() {

						window.pbsLinkFrame.open( {
							url: this.target.getAttribute( 'href' ),
							text: this.target.innerHTML,
							target: this.target.getAttribute( 'target' ) || false,
							hasText: this.target.innerText === this.target.innerHTML
						}, function( url, text, target ) {

							this.target.innerText = text;
							this.target.setAttribute( 'href', url );

							if ( target ) {
								this.target.setAttribute( 'target', target );
							} else {
								this.target.removeAttribute( 'target' );
							}

							this.target.parentNode._ceElement._syncContent();

						}.bind( this ) );

						this.hide();
					}
				},
				{
					name: 'unlink',
					onClick: function() {

						var element = this.target.parentNode._ceElement;
						var textNode = document.createTextNode( this.target.innerHTML );
						this.target.parentNode.replaceChild( textNode, this.target );
						element._syncContent();
						this.hide();
					}
				}
			]
		);
	}

	return TooltipLink;

} )( PBSEditor.Tooltip );

/* globals PBSEditor, ContentTools, __extends, pbsParams */

PBSEditor.TooltipInput = ( function( _super ) {
	__extends( TooltipInput, _super );

	function TooltipInput() {
		TooltipInput.__super__.constructor.call( this,
			'input',
			'p[class*="ce-element--"] input[type="text"]',
			pbsParams.labels.input_field,
			[
				{
					name: 'settings',
					onClick: function() {
						ContentTools.EditorApp.get()._toolboxProperties.inspect( this.element );
					}
				}
			]
		);
	}

	return TooltipInput;

} )( PBSEditor.Tooltip );

/* globals PBSEditor, __extends, pbsParams */

PBSEditor.TooltipTab = ( function( _super ) {
	__extends( TooltipTab, _super );

	function TooltipTab() {
		TooltipTab.__super__.constructor.call( this,
			'button',
			'[data-ce-tag="tab"]',
			pbsParams.labels.tab,
			[
				{
					name: 'remove',
					onClick: function() {
						this.element._ceElement.parent().parent().removeTab( this.element._ceElement );
						this.hide();
					}
				}
			]
		);
	}

	return TooltipTab;

} )( PBSEditor.Tooltip );

/* globals ContentEdit, AOS */

( function() {
	var ready = function() {

		// Update when something gets deleted.
		ContentEdit.Root.get().bind( 'detach', function() {
			if ( 'undefined' !== typeof AOS ) {
				AOS.refresh();
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
 * These are SPEED helper functions. Use these functions instead of the
 * typical ones to gain speed.
 */

/* globals ContentTools, PBSEditor, ContentEdit, fastdom */

var elemsWithBoundingRects = [];
var elemsWithComputedStyles = [];
var showActualRect = false;

window.pbsGetBoundingClientRect = function( element ) {
	if ( showActualRect || ! element._boundingClientRect ) {
		element._boundingClientRect = element.getBoundingClientRect();
		elemsWithBoundingRects.push( element );
	}
	return element._boundingClientRect;
};

window.pbsGetComputedStyle = function( element ) {
	if ( ! element._computedStyle ) {
		element._computedStyle = getComputedStyle( element );
		elemsWithComputedStyles.push( element );
	}
	return element._computedStyle;
};

window.pbsScrollY = function() {
	if ( ! window._prevScrollY ) {
		window._prevScrollY = window.scrollY || window.pageYOffset;
	}
	return window._prevScrollY;
};

window.addEventListener( 'scroll', function() {
	window._prevScrollY = null;
} );

window.formattingToolbarHeight = function() {
	var toolbar;
	if ( this._formattingToolbarHeight ) {
		return this._formattingToolbarHeight;
	}
	if ( ! window.PBSEditor.ToolboxFormatting ) {
		return 0;
	}
	toolbar = window.PBSEditor.ToolboxFormatting.getInstance()._domElement;
	toolbar = window.pbsGetBoundingClientRect( toolbar );
	this._formattingToolbarHeight = toolbar.height;
	return this._formattingToolbarHeight;
};

( function() {
	var clearClientRects = function() {
		var i;
		for ( i = 0; i < elemsWithBoundingRects.length; i++ ) {
			if ( elemsWithBoundingRects[ i ] ) {
				elemsWithBoundingRects[ i ]._boundingClientRect = null;
			}
		}
		elemsWithBoundingRects = [];
		for ( i = 0; i < elemsWithComputedStyles.length; i++ ) {
			if ( elemsWithComputedStyles[ i ] ) {
				elemsWithComputedStyles[ i ]._computedStyle = null;
			}
		}
		elemsWithComputedStyles = [];
	};
	var mousedown = false;
	var mouseDownListener = function() {
		mousedown = true;
		clearClientRects();
	};
	var mouseUpListener = function() {
		mousedown = false;
		showActualRect = false;
		clearClientRects();
	};
	var mouseMoveListener = function() {
		if ( mousedown ) {
			clearClientRects();
		}
	};
	var overlayDragListener = function() {
		showActualRect = true;
		clearClientRects();
	};
	var clearRectsAndOverlays = function() {
		if ( this._clearRectsAndOverlaysTimeout ) {
			return;
		}
		this._clearRectsAndOverlaysTimeout = setTimeout( function() {
			PBSEditor.Overlay.hideAll();
			clearClientRects();
			this._clearRectsAndOverlaysTimeout = null;
		}.bind( this ), 100 );
	};
	var clearWhenTransitionEnds = function( ev ) {
		if ( ev.target.classList ) {
			if ( ev.target.classList.contains( 'pbs-overlay-toolbar' ) ) {
				return;
			}
			if ( ev.target.classList.contains( 'pbs-toolbar-tool' ) ) {
				return;
			}
		}
		if ( ev.target.parentNode.classList ) {
			if ( ev.target.parentNode.classList.contains( 'pbs-quick-action-overlay' ) ) {
				return;
			}
		}
		if ( 'undefined' !== typeof ev.target._ceElement ) {
			clearRectsAndOverlays();
		} else if ( 'undefined' !== typeof ev.target.parentNode._ceElement ) {
			clearRectsAndOverlays();
		}
	};
	ContentTools.EditorApp.get().bind( 'start', function() {

		// Clear during startup animation.
		setTimeout( function() {
			clearRectsAndOverlays();
		}, 401 );

		// It's possible that the page contents may change during editing,
		// we can mostly detect this when the body (content) changes heights.
		// When that happens, clear all the overlays and clear all the
		// memorized rects and measurements.
		this.clearInterval = setInterval( function() {
			fastdom.measure( function() {
				if ( Math.abs( this._oldBodyHeight - document.body.clientHeight ) > 15 ) {
					this._oldBodyHeight = document.body.clientHeight;
					fastdom.mutate( function() {
						clearRectsAndOverlays();
					} );
				}
			} );
		}, 500 );

		window.addEventListener( 'mouseup', mouseUpListener );
		window.addEventListener( 'mousedown', mouseDownListener );
		window.addEventListener( 'mousemove', mouseMoveListener );
		window.addEventListener( 'keydown', clearClientRects );
		window.addEventListener( 'keyup', clearClientRects );
		window.addEventListener( 'resize', clearClientRects );
		window.addEventListener( 'scroll', clearClientRects );
		document.addEventListener( 'transitionend', clearWhenTransitionEnds );
		document.addEventListener( 'transitionstart', clearWhenTransitionEnds );
		document.addEventListener( 'transitioncancel', clearWhenTransitionEnds );
		wp.hooks.addAction( 'pbs.rects.changed', 'pbs', clearClientRects );
		wp.hooks.addAction( 'pbs.overlay.drag', 'pbs', overlayDragListener );
		wp.hooks.addAction( 'pbs.image.mounted', 'pbs', clearRectsAndOverlays );
		wp.hooks.addAction( 'pbs.embed.update_embed_content', 'pbs', clearRectsAndOverlays );
		wp.hooks.addAction( 'pbs.iframe.resized', 'pbs', clearRectsAndOverlays );
		wp.hooks.addAction( 'pbs.carousel.repositioned', 'pbs', clearRectsAndOverlays );
		wp.hooks.addAction( 'pbs.dom.reposition', 'pbs', clearRectsAndOverlays );
		ContentEdit.Root.get().bind( 'unmount', clearRectsAndOverlays );
		ContentEdit.Root.get().bind( 'mount', clearRectsAndOverlays );
	} );
	ContentTools.EditorApp.get().bind( 'stop', function() {
		clearInterval( this.clearInterval );
		window.removeEventListener( 'mouseup', mouseUpListener );
		window.removeEventListener( 'mousedown', mouseDownListener );
		window.removeEventListener( 'mousemove', mouseMoveListener );
		window.removeEventListener( 'keydown', clearClientRects );
		window.removeEventListener( 'keyup', clearClientRects );
		window.removeEventListener( 'resize', clearClientRects );
		window.removeEventListener( 'scroll', clearClientRects );
		document.removeEventListener( 'transitionend', clearWhenTransitionEnds );
		document.removeEventListener( 'transitionstart', clearWhenTransitionEnds );
		document.removeEventListener( 'transitioncancel', clearWhenTransitionEnds );
		wp.hooks.removeAction( 'pbs.rects.changed', 'pbs', clearClientRects );
		wp.hooks.removeAction( 'pbs.overlay.drag', 'pbs', overlayDragListener );
		wp.hooks.removeAction( 'pbs.image.mounted', 'pbs', clearRectsAndOverlays );
		wp.hooks.removeAction( 'pbs.embed.update_embed_content', 'pbs', clearRectsAndOverlays );
		wp.hooks.removeAction( 'pbs.iframe.resized', 'pbs', clearRectsAndOverlays );
		wp.hooks.removeAction( 'pbs.carousel.repositioned', 'pbs', clearRectsAndOverlays );
		wp.hooks.removeAction( 'pbs.dom.reposition', 'pbs', clearRectsAndOverlays );
		ContentEdit.Root.get().unbind( 'unmount', clearRectsAndOverlays );
		ContentEdit.Root.get().unbind( 'mount', clearRectsAndOverlays );
	} );
} )();

/* globals ContentEdit, ContentSelect, PBSEditor, ContentTools */

/**
 * These are additional behavior adjustments for newly introduced block elements
 * for CT (e.g. Shortcode & Embed elements).
 *
 * Behaviors added are for handling keypresses when the element is selected, etc.
 */

/**
 * All elements are placed here. Helpful for specifying droppers for new elements.
 */
PBSEditor.allDroppers = {
	'Carousel': ContentEdit.Element._dropVert,
	'DivRow': ContentEdit.Element._dropVert,
	'Div': ContentEdit.Element._dropVert,
	'Embed': ContentEdit.Element._dropVert,
	'Hr': ContentEdit.Element._dropVert,
	'IFrame': ContentEdit.Element._dropVert,
	'Shortcode': ContentEdit.Element._dropVert,
	'Static': ContentEdit.Element._dropVert,
	'Text': ContentEdit.Element._dropVert,
	'Image': ContentEdit.Element._dropVert,
	'List': ContentEdit.Element._dropVert,
	'PreText': ContentEdit.Element._dropVert,
	'Table': ContentEdit.Element._dropVert,
	'Video': ContentEdit.Element._dropVert,
	'Tabs': ContentEdit.Element._dropVert,
	'Toggle': ContentEdit.Element._dropVert,
	'IconLabel': ContentEdit.Element._dropVert
};

/**
 * Check if this is one of our new elements.
 * Our new elements are all derived from the ContentEdit.Static class.
 */
PBSEditor.isNewStaticLikeElement = function( element ) {
	if ( 'Static' === element.constructor.name ) {
		return false;
	}
	if ( 'Icon' === element.constructor.name ) {
		return false;
	}
	if ( 'undefined' === typeof element._content ) {
		return false;
	}
	return true;
};

/********************************************************************************
 * Handle moving left/up into an element.
 ********************************************************************************/
ContentEdit.Text.prototype._elementOverrideKeyLeft = ContentEdit.Text.prototype._keyLeft;
ContentEdit.Text.prototype._keyLeft = function( ev ) {

	var elem;
	var selection = ContentSelect.Range.query( this._domElement );

	if ( 0 === selection.get()[0] ) {

		elem = this.previousContent();
		if ( elem && elem.focus ) {
			if ( PBSEditor.isNewStaticLikeElement( elem ) ) {
				ev.preventDefault();
				ev.stopPropagation(); // We need this or else the SC won't get focused
				elem.focus();
				return;
			}
		}
	}

	return this._elementOverrideKeyLeft( ev );
};

/********************************************************************************
 * Handle moving right/down into an element.
 ********************************************************************************/
ContentEdit.Text.prototype._elementOverrideKeyRight = ContentEdit.Text.prototype._keyRight;
ContentEdit.Text.prototype._keyRight = function( ev ) {

	var elem;
	var selection = ContentSelect.Range.query( this._domElement );

	if ( this._atEnd( selection ) ) {

		elem = this.nextContent();
		if ( elem && elem.focus ) {
			if ( PBSEditor.isNewStaticLikeElement( elem ) ) {
				ev.preventDefault();
				ev.stopPropagation(); // We need this or else the SC won't get focused
				elem.focus();
				return;
			}
		}
	}

	return this._elementOverrideKeyRight( ev );
};

/*******************************************************************************************
 * Handle keypresses when an Element is focused.
 * We cannot handle keypresses inside the element since it cannot be focused.
 *******************************************************************************************/
( function() {
	var ready = function() {
		var editor = ContentEdit.Root.get();
		document.addEventListener( 'keydown', function( ev ) {

			var sc, p, elem, parent, selection, index;

			if ( ! editor.focused() ) {
				return;
			}
			if ( ev.target ) {
				if ( ['INPUT', 'TEXTAREA'].indexOf( ev.target.tagName ) !== -1 ) {
					return;
				}
			}

			if ( ! PBSEditor.isNewStaticLikeElement( editor.focused() ) ) {
				return;
			}

			// Only continue when nothing's selected
			if ( ['body', 'html'].indexOf( ev.target.tagName.toLowerCase() ) === -1 ) {
				return;
			}

			// Don't handle individual shift, alt, ctrl, command/window keypresses.
			if ( [16, 17, 18, 91, 92].indexOf( ev.which ) !== -1 ) {
				return;
			}

			sc = editor.focused();
			index = sc.parent().children.indexOf( sc );

			// Don't double return
			if ( -1 !== [13, 8, 46].indexOf( ev.which ) ) {
				ev.preventDefault();
			}

			// Delete & backspace deletes the element then move to the next/prev element.

			// Backspace, focus on the end of the previous element.
			if ( 8 === ev.which ) {
				sc.blur();
				if ( sc.parent().children[ index - 1 ] ) {
					elem = sc.parent().children[ index - 1 ];
					elem.focus();
					if ( elem.content ) {
				        selection = new ContentSelect.Range( elem.content.length(), elem.content.length() );
				        selection.select( elem._domElement );
					}
				} else if ( sc.parent().children[ index + 1 ] ) {
					elem = sc.parent().children[ index + 1 ];
					elem.focus();
					if ( elem.content ) {
				        selection = new ContentSelect.Range( elem.content.length(), elem.content.length() );
				        selection.select( elem._domElement );
					}
				} else {

					// No children.
					parent = sc.parent();
					setTimeout( function() {
						parent.children[0].focus();
					}, 10 );
				}

			// Delete, focus on the start of the next element.
		} else if ( 46 === ev.which ) {
				sc.blur();
				if ( sc.parent().children[ index + 1 ] ) {
					sc.parent().children[ index + 1 ].focus();
				} else if ( sc.parent().children[ index - 1 ] ) {
					sc.parent().children[ index - 1 ].focus();
				} else {

					// No children.
					parent = sc.parent();
					setTimeout( function() {
						parent.children[0].focus();
					}, 10 );
				}
			}
			if ( 8 === ev.which || 46 === ev.which ) {
				sc.parent().detach( sc );
				return;
			}

			// On down & right keypress and there's a next element, focus on it.
			if ( 40 === ev.which || 39 === ev.which ) {
				if ( sc.nextContent() && sc.parent().children.indexOf( sc ) !== sc.parent().children.length - 1 ) {
					ev.preventDefault();
					sc.nextContent().focus();
					return;
				}
			}

			// On up & left keypress and there's a previous element, focus on it.
			if ( 38 === ev.which || 37 === ev.which ) {
				if ( sc.previousContent() && 0 !== sc.parent().children.indexOf( sc ) ) {
					ev.preventDefault();
					sc.previousContent().focus();
					return;
				}
			}

			// On keypress, create a new blank element and focus on it.
			// This is so that we can insert elements in other places
			if ( 38 !== ev.which && 37 !== ev.which ) { // Not up or left
				index++;
			}
			p = new ContentEdit.Text( 'p' );
			sc.parent().attach( p, index );
			sc.blur();
			p.focus();
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

// TODO: do we still need this.
/********************************************************************************
 * Include elements as previous content
 ********************************************************************************/
ContentEdit.Node.prototype._overridePreviousContent = ContentEdit.Node.prototype.previousContent;
ContentEdit.Node.prototype.previousContent = function() {
    var node = this.previousWithTest( function( node ) {
		return node.content !== void 0 || PBSEditor.isNewStaticLikeElement( node );
    } );
	return node;
};

/********************************************************************************
 * Include elements as next content
 ********************************************************************************/
ContentEdit.Node.prototype._overrideNextContent = ContentEdit.Node.prototype.nextContent;
ContentEdit.Node.prototype.nextContent = function() {
	return this.nextWithTest( function( node ) {
		return node.content !== void 0 || PBSEditor.isNewStaticLikeElement( node );
	} );
};

/**
 * Spell-checking triggers oninput, after oninput, sync content or the text will
 * remain the same before-spell-checking.
 * To replicate:
 * - Create a new element, type in "this is a tes."
 * - Spell check "tes" into "test"
 * - Make entire text bold (ctrl+b), "test" will revert to "tes".
 */
( function() {
	var proxied = ContentEdit.Element.prototype._addDOMEventListeners;
	ContentEdit.Element.prototype._addDOMEventListeners = function() {
		if ( this._syncContent ) {
			this._domElement.oninput = function() {
				if ( this._syncContent ) {
					return this._syncContent();
				}
			}.bind( this );
		}
		return proxied.call( this );
	};
} )();

( function() {

	ContentEdit.Element.prototype.clone = function() {
		var newElem;
		if ( this.blur ) {
			this.blur();
		}
		newElem = document.createElement( 'DIV' );
		newElem.innerHTML = this.html();
		newElem = this.constructor.fromDOMElement( newElem.firstChild );
		this.parent().attach( newElem, this.parent().children.indexOf( this ) + 1 );
		return newElem;
	};

	ContentEdit.Element.prototype.inspect = function() {
		ContentTools.EditorApp.get()._toolboxProperties.inspect( this );
	};

	ContentEdit.Element.prototype.remove = function() {
		if ( this.blur ) {
			this.blur();
		}
		if ( ! this.isMounted() ) {
			return;
		}
		this.parent().detach( this );
	};
} )();

/**
 * When attaching an element, remove any blank paragraphs beside it to clean
 * the contents.
 */
( function() {
	ContentEdit.Root.get().bind( 'attach', function( element, attachedElement ) {
		var i;

		// If the drag helped was dragged, ignore it.
		if ( 'NewElementDragHelper' === attachedElement.constructor.name ) {
			return;
		}

		// The element with a newly dragged element has at least 3 elements:
		// 1. The placeholder NewElementDragHelper,
		// 2. The new newly added element, and
		// 3. The current element/s.
		if ( element.children.length < 2 ) {
			return;
		}

		// Go through each element and remove the blank ones.
		for ( i = element.children.length - 1; i >= 0; i-- ) {

			// If the attached element is blank, it means the user pressed
			// enter. Just leave it.
			if ( element.children[ i ] === attachedElement ) {
				continue;
			}

			if ( element.children[ i ].content ) {
				if ( element.children[ i ].content.isWhitespace ) {
					if ( element.children[ i ].content.isWhitespace() ) {
						element.children[ i ].remove();
					}
				}
			}
		}
	} );
} )();

/* globals ContentEdit */

( function() {
	var proxied = ContentEdit.Static.prototype._onMouseUp;
	ContentEdit.Static.prototype._onMouseUp = function( ev ) {
		proxied.call( this, ev );
		clearTimeout( this._dragTimeout );

		clearTimeout( this._doubleClickTimeout );
		this._doubleClickTimeout = setTimeout( ( function( _this ) {
			return function() {
				_this._doubleClickCount = 0;
			};
		} )( this ), 500 );
		this._doubleClickCount++;
	};
} )();

( function() {
	var proxied = ContentEdit.Static.prototype._onMouseOut;
	ContentEdit.Static.prototype._onMouseOut = function( ev ) {
		proxied.call( this, ev );
		this._doubleClickCount = 0;
		clearTimeout( this._dragTimeout );
	};
} )();

( function() {
	var proxied = ContentEdit.Static.prototype._onMouseMove;
	ContentEdit.Static.prototype._onMouseMove = function( ev ) {
		proxied.call( this, ev );
		this._doubleClickCount = 0;
	};
} )();

( function() {
	var proxied = ContentEdit.Static.prototype._onMouseDown;
	ContentEdit.Static.prototype._onMouseDown = function( ev ) {

		// We need to do this or else StaticDoubleClicks will go out of editing mode right after entering it.
		ev.preventDefault();

		proxied.call( this, ev );
		clearTimeout( this._dragTimeout );

		if ( this.domElement() !== ev.target ) {
			return;
		}

		this._dragTimeout = setTimeout( ( function( _this ) {
			return function() {
				return _this.drag( ev.pageX, ev.pageY );
			};
		} )( this ), ContentEdit.DRAG_HOLD_DURATION / 2 );

		clearTimeout( this._doubleClickTimeout );
		this._doubleClickTimeout = setTimeout( ( function( _this ) {
			return function() {
				_this._doubleClickCount = 0;
			};
		} )( this ), 500 );
		this._doubleClickCount++;

		// Call the _onDoubleClick handler if there is one.
		if ( 3 === this._doubleClickCount ) {
			clearTimeout( this._dragTimeout );
			this._doubleClickCount = 0;
			if ( 'function' === typeof this._onDoubleClick ) {
				this._onDoubleClick( ev );
			}
		}
	};
} )();

/* globals ContentEdit, ContentSelect */

// Converts a static element into a text element containing a
// given text and returns the created text element.
ContentEdit.Static.prototype.convertToText = function( text, keepSize ) {

	var elem, index, rect, marginBottom, nextRect;

	if ( 'undefined' === typeof keepSize ) {
		keepSize = false;
	}

	elem = document.createElement( 'P' );
	elem.innerHTML = text;
	elem = ContentEdit.Text.fromDOMElement( elem );

	this.blur();

	index = this.parent().children.indexOf( this );
	rect = this._domElement.getBoundingClientRect();

	// Take note the space between this element and the next so we
	// can maintain the spacing after converting.
	marginBottom = 0;
	if ( this._domElement.nextElementSibling ) {
		nextRect = this._domElement.nextElementSibling.getBoundingClientRect();
		marginBottom = nextRect.top - rect.bottom;
	}

	this.parent().attach( elem, index );
	this.parent().detach( this );

	// Change the element's size & margin to that we won't move the
	// page contents while editing the shortcode.
	if ( keepSize ) {
		elem._domElement.style.minHeight = rect.height + 'px';
		elem._domElement.style.marginBottom = marginBottom + 'px';
	}

	// Focus & place cursor at the end
	elem.focus();

	( function( elem ) {
		setTimeout( function() {
			var selection = new ContentSelect.Range( elem.content.length(), elem.content.length() );
			if ( elem._domElement ) {
				selection.select( elem._domElement );
			}
		}, 1 );
	}( elem ) );

	return elem;
};

/* globals ContentEdit, __extends, PBSEditor */

ContentEdit.StaticEditable = ( function( _super ) {
	__extends( StaticEditable, _super );

	function StaticEditable( tagName, attributes, content ) {
		this._doubleClickCount = 0;
		StaticEditable.__super__.constructor.call( this, tagName, attributes );
		this._content = content;
	}

	StaticEditable.droppers = PBSEditor.allDroppers;

    StaticEditable.prototype.blur = function() {
		var root = ContentEdit.Root.get();
		if ( this.isFocused() ) {
			this._removeCSSClass( 'ce-element--focused' );
			root._focused = null;
			return root.trigger( 'blur', this );
		}
    };

    StaticEditable.prototype._onMouseOver = function( ev ) {
		StaticEditable.__super__._onMouseOver.call( this, ev );
		return this._addCSSClass( 'ce-element--over' );
    };

    StaticEditable.prototype.focus = function( supressDOMFocus ) {
		var root;
		root = ContentEdit.Root.get();
		if ( this.isFocused() ) {
			return;
		}
		if ( root.focused() ) {
			root.focused().blur();
		}
		this._addCSSClass( 'ce-element--focused' );
		root._focused = this;
		if ( this.isMounted() && ! supressDOMFocus ) {
			this.domElement().focus();
		}
		return root.trigger( 'focus', this );
    };

	StaticEditable.prototype.cssTypeName = function() {
		return 'staticeditable';
	};

	StaticEditable.prototype.typeName = function() {
		return 'StaticEditable';
	};

	return StaticEditable;

} )( ContentEdit.Static );

/* globals ContentEdit, ContentSelect, ContentTools, HTMLString */

( function() {
	var proxied = ContentEdit.Text.prototype._keyReturn;
	ContentEdit.Text.prototype._keyReturn = function( ev ) {

		var selection, tip, tail, cursor, br;

		if ( this.content.isWhitespace() ) {
			return proxied.call( this, ev );
		}

		// On shift/ctrl/command + enter, add a line break
		if ( ev.shiftKey || ev.metaKey || ev.ctrlKey ) {

			this.storeState();

			ContentSelect.Range.query( this._domElement );
			selection = ContentSelect.Range.query( this._domElement );
			tip = this.content.substring( 0, selection.get()[0] );
			tail = this.content.substring( selection.get()[1] );
			cursor = selection.get()[0] + 1;
			br = new HTMLString.String( '<br><br>', true );

			// Only insert 1 br
			if ( 0 !== tail.length() ) {
				br = new HTMLString.String( '<br>', true );
			}

			this.content = tip.concat( br, tail );
			this.updateInnerHTML();
			this.restoreState();
			selection.set( cursor, cursor );
			this.selection( selection );
			return this.taint();

		} else {
			return proxied.call( this, ev );
		}

	};
} )();

/**
 * When hitting return on a text, carry over the styles to the newly created one.
 */
( function() {
	var proxied = ContentEdit.Text.prototype._keyReturn;
	ContentEdit.Text.prototype._keyReturn = function( ev ) {

		var selection, tip, tail, style, focused;

		if ( this.content.isWhitespace() ) {
			return proxied.call( this, ev );
		}

		ContentSelect.Range.query( this._domElement );
		selection = ContentSelect.Range.query( this._domElement );
		tip = this.content.substring( 0, selection.get()[0] );
		tail = this.content.substring( selection.get()[1] );

		// If returned in the middle of the string, carry over the p styles.
		if ( tip.length() && tail.length() ) {
			proxied.call( this, ev );

			focused = ContentEdit.Root.get().focused();
			if ( focused ) {
				focused.attr( 'style', this.attr( 'style' ) );
			}

			return;
		}

		// If returned from the end, carry over some styles.
		if ( tip.length() && ! tail.length() ) {
			proxied.call( this, ev );

			focused = ContentEdit.Root.get().focused();
			if ( focused ) {

				// Font.
				if ( 'P' === this._domElement.tagName ) {
					style = this.style( 'font-family' );
					if ( style ) {

						// But only if the font is not the default font.
						if ( ContentTools.Tools.FontPicker ) {
							if ( style !== ContentTools.Tools.FontPicker.defaultPFont ) {
								focused.style( 'font-family', style );
							}
						}
					}
				}
			}

			return;
		}

		proxied.call( this, ev );
	};
} )();

/**
 * The new CT doesn't allow us to select empty paragraph tags inside divs,
 * this fixes it.
 */
( function() {
	ContentEdit.Text.prototype._onMouseDown = function( ev ) {

		ContentEdit.Text.__super__._onMouseDown.call( this, ev );

		clearTimeout( this._dragTimeout );
		this._dragTimeout = setTimeout( ( function( _this ) {
			return function() {
				return _this.drag( ev.pageX, ev.pageY );
			};
		} )( this ), ContentEdit.DRAG_HOLD_DURATION );

		if ( 0 === this.content.length() && ContentEdit.Root.get().focused() === this ) {
			ev.preventDefault();
			if ( document.activeElement !== this._domElement ) {
				this._domElement.focus();
			}
			return new ContentSelect.Range( 0, 0 ).select( this._domElement );
		}
	};
} )();

/**
 * Fix some caret and blurring problems.
 */
( function() {

	// If typing while the caret isn't in the text element, move it back.
	// This only happens when
	// var keydownHandler = function( ev ) {
	// 	var root = ContentEdit.Root.get();
	// 	var element = root.focused();
	// 	if ( ! element ) {
	// 		return;
	// 	}
	//
	// 	If ( element.content.isWhitespace() ) {
	// 		var selection = new ContentSelect.Range( 1, 1 );
	// 		selection.select( element.domElement() );
	// 	}
	// };

	// On semi-blur (clicking on another area that DOESN'T trigger a blur event),
	// bring back the caret to the original position.
	// Only entertain clicks on the area being edited.
	var bringBackState = false;
	var mouseDownHandler = function( ev ) {
		var root, element;
		if ( ! ev.target._ceElement ) {
			if ( window.pbsSelectorMatches( ev.target, '[data-editable]' ) ) {
				root = ContentEdit.Root.get();
				element = root.focused();
				if ( ! element ) {
					return;
				}
				element.storeState();
				bringBackState = true;
			}
		}
	};
	var mouseUpHandler = function() {
		var root, element;
		if ( bringBackState ) {
			bringBackState = false;

			root = ContentEdit.Root.get();
			element = root.focused();
			if ( ! element ) {
				return;
			}
			element.restoreState();
		}
	};

	var proxiedFocus = ContentEdit.Text.prototype.focus;
	var proxiedBlur = ContentEdit.Text.prototype.blur;

	ContentEdit.Text.prototype.focus = function( supressDOMFocus ) {
		var ret = proxiedFocus.call( this, supressDOMFocus );
		document.addEventListener( 'mousedown', mouseDownHandler );
		document.addEventListener( 'mouseup', mouseUpHandler );
		return ret;
	};
	ContentEdit.Text.prototype.blur = function() {
		var ret = proxiedBlur.call( this );
		document.removeEventListener( 'mousedown', mouseDownHandler );
		document.removeEventListener( 'mouseup', mouseUpHandler );
		return ret;
	};
} )();

/**
 * When emptying a contenteditable, browsers add a <BR> tag in the content and
 * is causing problems. Remove the <BR> if it's the only content there.
 */
( function() {
	var syncProxy, keyDownProxy;

	syncProxy = ContentEdit.Text.prototype._syncContent;
	ContentEdit.Text.prototype._syncContent = function() {
		if ( this._domElement.innerHTML.match( /^<br\/?>$/ ) ) {
			this._domElement.innerHTML = this._domElement.innerHTML.replace( /^<br\/?>$/, '' );
		}
		syncProxy.call( this );
	};

	keyDownProxy = ContentEdit.Text.prototype._onKeyDown;
	ContentEdit.Text.prototype._onKeyDown = function( ev ) {
		if ( this._domElement.innerHTML.match( /^<br\/?>$/ ) ) {
			this._domElement.innerHTML = this._domElement.innerHTML.replace( /^<br\/?>$/, '' );
		}
		keyDownProxy.call( this, ev );
	};
} )();

// Remove the &nbsp;s added in by the previous function on blur.
( function() {
	var proxiedBlur = ContentEdit.Text.prototype.blur;
	ContentEdit.Text.prototype.blur = function() {
		var innerHTML;

		if ( this._domElement ) {
			innerHTML = this._domElement.innerHTML;
			innerHTML = innerHTML.replace( /(\s|&nbsp;)+(<\/a>)/, '$2' );
			innerHTML = innerHTML.replace( /(<a\s[^>]+>)(&nbsp;|\s)+/, '$1' );
			if ( this._domElement.innerHTML !== innerHTML ) {
				this._domElement.innerHTML = innerHTML;
				this._syncContent();
			}
		}
		return proxiedBlur.call( this );
	};
} )();

/**
 * If you have colored text, then you delete all the text and type again,
 * the default browser behavior would be to add a <font> tag with a color
 * attribute. This fixes it into a span tag instead.
 */
( function() {
	var proxy = ContentEdit.Text.prototype._syncContent;
	ContentEdit.Text.prototype._syncContent = function() {
	  if ( this._domElement.innerHTML.match( /<font(>|\s)/ ) ) {
		  this.storeState();
		  this._domElement.innerHTML = this._domElement.innerHTML.replace( /<font(>|\s)/, '<span$1' );
		  if ( this._domElement.innerHTML.match( /<\/font>/ ) ) {
			  this._domElement.innerHTML = this._domElement.innerHTML.replace( /<\/font>/, '</span>' );
		  }
		  if ( this._domElement.innerHTML.match( /color=['"][^'"]+['"]/ ) ) {
			  this._domElement.innerHTML = this._domElement.innerHTML.replace( /color=['"]([^'"]+)['"]/, 'style="color: $1"' );
		  }
		  this.restoreState();
	  }
	  return proxy.call( this );
	};
} )();

// Fixed: 'innerHTML' undefined errors encountered randomly when editing normal text.
( function() {
	var proxied = ContentEdit.Text.prototype._syncContent;
	ContentEdit.Text.prototype._syncContent = function( ev ) {
		if ( this._domElement ) {
			if ( 'undefined' !== typeof this._domElement.innerHTML ) {
				return proxied.call( this, ev );
			}
		}
		return this._flagIfEmpty();
	};
} )();

// Empty paragraphs can be saved and may look weird. Get rid of them.
( function() {
	var proxied = ContentEdit.Text.prototype.html;
	ContentEdit.Text.prototype.html = function() {
		var ret = proxied.call( this );
		if ( ret.match( /<p>[\s\n]*<\/p>/g ) ) {
			return '';
		}
		if ( ret.match( /<p data-placeholder="[^"]*">[\s\n]*<\/p>/g ) ) {
			return '';
		}
		return ret;
	};
} )();

/**
 * When pressing the up key, when the prev element isn't a text element, don't go in it.
 * This is much simpler than finding the editable text and focusing on it.
 */
( function() {
	var proxied = ContentEdit.Text.prototype._keyUp;
	ContentEdit.Text.prototype._keyUp = function( ev ) {

		var index, prevSibling;
		var selection = ContentSelect.Range.query( this._domElement );

		if ( 0 !== selection.get()[0] ) {
			return proxied.call( this, ev );
		}

		index = this.parent().children.indexOf( this );
		if ( 0 === index ) {
			ev.preventDefault();
			return;
		}

		prevSibling = this.parent().children[ index - 1 ];
		if ( 'undefined' === typeof prevSibling.content ) {
			ev.preventDefault();
			return;
		}

		prevSibling.focus();
	};
} )();

/**
 * When pressing the down key, when the next element isn't a text element, don't go in it.
 * This is much simpler than finding the editable text and focusing on it.
 */
( function() {
	var proxied = ContentEdit.Text.prototype._keyDown;
	ContentEdit.Text.prototype._keyDown = function( ev ) {

		var index, nextSibling;
		var selection = ContentSelect.Range.query( this._domElement );

		if ( ! this._atEnd( selection ) ) {
			return proxied.call( this, ev );
		}

		index = this.parent().children.indexOf( this );
		if ( this.parent().children.length - 1 === index ) {
			ev.preventDefault();
			return;
		}

		nextSibling = this.parent().children[ index + 1 ];
		if ( 'undefined' === typeof nextSibling.content ) {
			ev.preventDefault();
			return;
		}

		nextSibling.focus();
	};
} )();

/**
 * When the return key is pressed at the beginning of a paragraph (with contents),
 * create a new paragraph before it.
 */
( function() {
	var proxied = ContentEdit.Text.prototype._keyReturn;
	ContentEdit.Text.prototype._keyReturn = function( ev ) {
		var element, selection, tail, tip;
		ev.preventDefault();
		if ( this.content.isWhitespace() ) {
			return proxied.call( this, ev );
		}
		ContentSelect.Range.query( this._domElement );
		selection = ContentSelect.Range.query( this._domElement );
		tip = this.content.substring( 0, selection.get()[0] );
		tail = this.content.substring( selection.get()[1] );
		if ( ! ev.shiftKey && ! tip.length() ) {
			element = new ContentEdit.Text( 'p', {}, '' );
			this.parent().attach( element, this.parent().children.indexOf( this ) );
			element.focus();
			return;
		}
		return proxied.call( this, ev );
	};
} )();

/* globals ContentEdit, ContentTools */

/**
 * Stop all counting when editing text element.
 */
( function() {
	var proxied = ContentEdit.Text.prototype._onMouseDown;
    ContentEdit.Text.prototype._onMouseDown = function( ev ) {
		var ret = proxied.call( this, ev );
		if ( this._domElement ) {
			window.pbsStopCountUp( this._domElement );
			this.isFocused();
		}
		return ret;
	};
} )();

/**
 * Stop all counting when clicking on text element.
 */
( function() {
	var proxied = ContentEdit.Text.prototype._onKeyDown;
	ContentEdit.Text.prototype._onKeyDown = function( ev ) {
		if ( this._domElement ) {
			window.pbsStopCountUp( this._domElement );
		}
		return proxied.call( this, ev );
	};
} )();

/**
 * Stop counting on blur.
 */
( function() {
	var proxiedBlur = ContentEdit.Text.prototype.blur;
	ContentEdit.Text.prototype.blur = function() {
		if ( this._domElement ) {
			window.pbsStopCountUp( this._domElement );
		}
		return proxiedBlur.call( this );
	};
} )();

/**
 * Contents are synced when editing, stop counting when this happens to retain the value.
 */
( function() {
	var proxied = ContentEdit.Text.prototype._syncContent;
	ContentEdit.Text.prototype._syncContent = function( ev ) {
		if ( this._domElement ) {
			window.pbsStopCountUp( this._domElement );
		}
		return proxied.call( this, ev );
	};
} )();

/**
 * When elements are just being mounted, stop counting to correctly edit the original value.
 */
( function() {
	var proxied = ContentEdit.Text.fromDOMElement;
	ContentEdit.Text.fromDOMElement = function( domElement ) {
		if ( domElement ) {
			window.pbsStopCountUp( domElement );
		}
		return proxied.call( this, domElement );
    };
} )();

/**
 * When unmounting (dragging or stopped editing), stop counting.
 */
( function() {
	var proxied = ContentEdit.Text.prototype.unmount;
	ContentEdit.Text.prototype.unmount = function() {
		if ( this._domElement ) {
			window.pbsStopCountUp( this._domElement );
		}
		return proxied.call( this );
    };
} )();

/**
 * Stop counting when clicking save button.
 */
( function() {
	var ready = function() {
		if ( typeof wp !== 'undefined' && typeof wp.hooks !== 'undefined' ) {
			wp.hooks.addAction( 'pbs.stop', 'pbs', window.pbsStopAllCountUp );
			wp.hooks.addAction( 'pbs.save.before', 'pbs', window.pbsStopAllCountUp );
		}
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentEdit, HTMLString, ContentSelect, pbsParams */

/**
 * Add Markdown capabilities to the text element. See the inline comments
 * for the markdown patterns.
 */

/**
 * Tag conersion markdowns - these convert a paragraph tag to other tags
 * like headings and blockquotes. These are triggered on BLUR.
 */
( function() {
	var proxied, hr, index;
	if ( ! pbsParams.is_lite ) {
		proxied = ContentEdit.Text.prototype.blur;
		ContentEdit.Text.prototype.blur = function( ev ) {

			var text = this.content.text();

			// -- HR
			if ( text.match( /^\-{1,}$/ ) ) {
				hr = new ContentEdit.Hr( 'hr' );
				index = this.parent().children.indexOf( this );

				this.parent().attach( hr, index + 1 );
				this.parent().detach( this );
				return;
			}

			return proxied.call( this, ev );

		};
	}
} )();

/**
 * Content conversion markdowns - these modify the content to have new markup,
 * like converting URLs to links. These are done on BLUR.
 */
( function() {
	var proxied;
	if ( ! pbsParams.is_lite ) {
		proxied = ContentEdit.Text.prototype.blur;
		ContentEdit.Text.prototype.blur = function( ev ) {

			var html, linkRegex;

			// Convert lone URLs into links.
			// Add a short 1ms delay for this so that other processes like embedding
			// can apply themselves normally.
			var _this = this;
			setTimeout( function() {
				var urlRegex = /(^|\s)(https?:\/\/[^\s/$.?#].[^\s\)]*)($|\s)/ig;
				var html = _this.content.html().replace( /\&nbsp\;/ig, ' ' );
				if ( html.match( urlRegex ) ) {
					html = html.replace( urlRegex, '$1<a href="$2">$2</a>$3' );
					_this.content = new HTMLString.String( html );
					_this.updateInnerHTML();
					_this.taint();
				}
			}, 1 );

			// Convert [...](url) into links.
			linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s/$.?#].[^\s\)]*)\)/ig;
			html = this.content.html().replace( /\&nbsp\;/ig, ' ' );
			if ( this.content.html().match( linkRegex ) ) {
				html = this.content.html().replace( linkRegex, '<a href="$2">$1</a>' );
				this.content = new HTMLString.String( html );
				this.updateInnerHTML();
				this.taint();
			}

			return proxied.call( this, ev );

		};
	}
} )();

/**
 * Realtime conversion markdown - these convert the current element WHILE
 * typing, like converting the current paragraph into a bullet list. These
 * are done on KEYUP.
 */
( function() {
	var proxied;
	if ( ! pbsParams.is_lite ) {
		proxied = ContentEdit.Text.prototype._onKeyUp;
		ContentEdit.Text.prototype._onKeyUp = function( ev ) {

			var text, selection, saveSelection;
			var matchingCode, start, end, tip, code, tail, offset, startOffset;
			var ret = proxied.call( this, ev );

			if ( 'p' !== this._tagName ) {
				return proxied.call( this, ev );
			}

			text = this.content.text();

			// ## Heading 1
			if ( text.match( /^\#\s/i ) ) {
				this.content = this.content.slice( 2 ).trimLeft();

				saveSelection = ContentSelect.Range.query( this._domElement );
				saveSelection.set( saveSelection.get()[0] - 2, saveSelection.get()[0] - 2 );

				window.PBSEditor.getToolUI( 'paragraphPicker' ).tool.applyTag( this, 'h1', null, function() {} );

				saveSelection.select( this._domElement );

			// ## Heading 2
			} else if ( text.match( /^\#\#\s/i ) ) {
				this.content = this.content.slice( 2 ).trimLeft();

				saveSelection = ContentSelect.Range.query( this._domElement );
				saveSelection.set( saveSelection.get()[0] - 3, saveSelection.get()[0] - 3 );

				window.PBSEditor.getToolUI( 'paragraphPicker' ).tool.applyTag( this, 'h2', null, function() {} );

				saveSelection.select( this._domElement );

			// ### Heading 3
			} else if ( text.match( /^\#\#\#\s/i ) ) {
				this.content = this.content.slice( 3 ).trimLeft();

				saveSelection = ContentSelect.Range.query( this._domElement );
				saveSelection.set( saveSelection.get()[0] - 4, saveSelection.get()[0] - 4 );

				window.PBSEditor.getToolUI( 'paragraphPicker' ).tool.applyTag( this, 'h3', null, function() {} );

				saveSelection.select( this._domElement );

			// #### Heading 4
			} else if ( text.match( /^\#\#\#\#\s/i ) ) {
				this.content = this.content.slice( 4 ).trimLeft();

				saveSelection = ContentSelect.Range.query( this._domElement );
				saveSelection.set( saveSelection.get()[0] - 5, saveSelection.get()[0] - 5 );

				window.PBSEditor.getToolUI( 'paragraphPicker' ).tool.applyTag( this, 'h4', null, function() {} );

				saveSelection.select( this._domElement );

			// ##### Heading 5
			} else if ( text.match( /^\#\#\#\#\#\s/i ) ) {
				this.content = this.content.slice( 5 ).trimLeft();

				saveSelection = ContentSelect.Range.query( this._domElement );
				saveSelection.set( saveSelection.get()[0] - 6, saveSelection.get()[0] - 6 );

				window.PBSEditor.getToolUI( 'paragraphPicker' ).tool.applyTag( this, 'h5', null, function() {} );

				saveSelection.select( this._domElement );

			// ###### Heading 6
			} else if ( text.match( /^\#\#\#\#\#\#\s/i ) ) {
				this.content = this.content.slice( 6 ).trimLeft();

				saveSelection = ContentSelect.Range.query( this._domElement );
				saveSelection.set( saveSelection.get()[0] - 7, saveSelection.get()[0] - 7 );

				window.PBSEditor.getToolUI( 'paragraphPicker' ).tool.applyTag( this, 'h6', null, function() {} );

				saveSelection.select( this._domElement );

			// * Bullet list
			} else if ( text.match( /^(\*|\-)\s/i ) ) {
				this.content = this.content.slice( 2 ).trimLeft();
				selection = new ContentSelect.Range( this.content.length );
				window.PBSEditor.getToolUI( 'unordered-list' ).apply( this, selection );

			// 1. Numbered list
			} else if ( text.match( /^1(\.|\))\s/i ) ) {
				this.content = this.content.slice( 3 ).trimLeft();
				selection = new ContentSelect.Range( this.content.length );
				window.PBSEditor.getToolUI( 'ordered-list' ).apply( this, selection );

			// \s\s\s\s Preformatted
			} else if ( text.match( /^\s\s\s\s/i ) ) {
				this.content = this.content.trimLeft();
				selection = new ContentSelect.Range( this.content.length );
				window.PBSEditor.getToolUI( 'paragraphPicker' ).tool.applyTag( this, 'pre', selection, function() {} );

			// > Blockquote
			} else if ( text.match( /^\>\s/i ) ) {
				this.content = this.content.slice( 1 ).trimLeft();

				saveSelection = ContentSelect.Range.query( this._domElement );
				saveSelection.set( saveSelection.get()[0] - 2, saveSelection.get()[0] - 2 );

				window.PBSEditor.getToolUI( 'paragraphPicker' ).tool.applyTag( this, 'blockquote', null, function() {} );

				saveSelection.select( this._domElement );

			// `Code`
			} else if ( text.match( /`[^`]+`/i ) ) {
				matchingCode = text.match( /(`)([^`]+)(`)/i );
				start = matchingCode.index;
				end = start + matchingCode[0].length - 1;

				tip = this.content.substring( 0, start );
				code = this.content.substring( start + 1, end );
				tail = this.content.substring( end + 1 );

				offset = 2;
				if ( '`' === this.content.substring( end ).text() ) {
					tail = tail.concat( '&nbsp;' );
					offset--;
				} else {
					tail = ( new HTMLString.String( '&nbsp;', true ) ).concat( tail );
					offset--;
				}

				startOffset = 0;
				if ( 0 !== start && ' ' !== this.content.characters[ start - 1 ].c() ) {
					tip = tip.concat( '&nbsp;' );
					startOffset++;
					offset--;
				}

				saveSelection = ContentSelect.Range.query( this._domElement );
				saveSelection.set( saveSelection.get()[0] - offset, saveSelection.get()[0] - offset );

				this.content = tip.concat( code, tail );
				this.updateInnerHTML();

				selection = new ContentSelect.Range( start + startOffset, end - 1 + startOffset );
				window.PBSEditor.getToolUI( 'code' ).tool.apply( this, selection, function() {} );

				saveSelection.select( this._domElement );
			}

			return ret;
		};
	}
} )();

/* globals ContentEdit, HTMLString, ContentSelect */

( function() {
	var proxied = ContentEdit.Text.prototype._onKeyUp;
	ContentEdit.Text.prototype._onKeyUp = function( ev ) {

		var selection;
		var ret = proxied.call( this, ev );

		if ( 9 === ev.keyCode ) {
			if ( 'lorem' === this.content.text().toLowerCase() ) {
				this.content = new HTMLString.String( 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. At dolor sed numquam? Sapiente autem adipisci, minus expedita enim, suscipit laboriosam deleniti possimus sequi pariatur explicabo numquam alias atque officia sit.' );
				this.updateInnerHTML();
				this.taint();

				selection = new ContentSelect.Range( this.content.length(), this.content.length() );
				selection.select( this._domElement );
			}
		}

		return ret;
	};
} )();

( function() {
	var proxied = ContentEdit.Text.prototype.blur;
	ContentEdit.Text.prototype.blur = function( ev ) {

		var selection;
		if ( 'lorem' === this.content.text().toLowerCase() ) {
			this.content = new HTMLString.String( 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. At dolor sed numquam? Sapiente autem adipisci, minus expedita enim, suscipit laboriosam deleniti possimus sequi pariatur explicabo numquam alias atque officia sit.' );
			this.updateInnerHTML();
			this.taint();

			selection = new ContentSelect.Range( this.content.length(), this.content.length() );
			selection.select( this._domElement );
		}

		return proxied.call( this, ev );

	};
} )();

/* globals ContentEdit, __extends, PBSEditor, ContentSelect, pbsParams */

ContentEdit.Button = ( function( _super ) {
	__extends( Button, _super );

	function Button( tagName, attributes, content ) {
		Button.__super__.constructor.call( this, tagName, attributes, content );
	}

	Button.create = function() {

		var a = document.createElement( 'A' );
		var o = document.createElement( 'P' );
		o.setAttribute( 'data-ce-tag', 'button' );

		a.classList.add( 'pbs-button' );
		a.setAttribute( 'href', '' );
		a.innerHTML = pbsParams.labels.button;
		o.appendChild( a );

		return ContentEdit.Button.fromDOMElement( o );
	};

    Button.droppers = PBSEditor.allDroppers;

	Button.prototype.cssTypeName = function() {
		return 'button';
	};

	Button.prototype.typeName = function() {
		return 'Button';
	};

	Button.prototype.restoreState = function() {
		var ret;

		if ( ! this._savedSelection ) {
			return;
		}
		if ( ! ( this.isMounted() && this.isFocused() ) ) {
			this._savedSelection = void 0;
			return;
		}

		this._domElement.querySelector( '.pbs-button' ).setAttribute( 'contenteditable', '' );
		ret = Button.__super__.restoreState.call( this );
		this._domElement.removeAttribute( 'contenteditable' );

		return ret;
	};

	Button.prototype.drag = function( x, y ) {
		this._domElement.querySelector( '.pbs-button' ).removeAttribute( 'contenteditable' );
		return Button.__super__.drag.call( this, x, y );
	};

	Button.prototype.blur = function() {
		if ( this.isMounted() ) {
			this._domElement.querySelector( '.pbs-button' ).removeAttribute( 'contenteditable' );

			if ( this._domElement.innerHTML.match( /(\s*<br>\s*)/g ) ) {
				this._domElement.innerHTML = this._domElement.innerHTML.replace( /(\s*<br>\s*)/g, '' );
				this._syncContent();
			}
		}
		return Button.__super__.blur.call( this );
	};

    Button.prototype.focus = function( supressDOMFocus ) {
		var ret;
		if ( this.isMounted() ) {
			this._domElement.querySelector( '.pbs-button' ).setAttribute( 'contenteditable', '' );
		}
		ret = Button.__super__.focus.call( this, supressDOMFocus );
		if ( this.isMounted() ) {
			this._domElement.removeAttribute( 'contenteditable' );
			this._domElement.querySelector( '.pbs-button' ).focus();
		}
		return ret;
    };

	Button.prototype._keyReturn = function( ev ) {
		var element, selection, tip;
		ev.preventDefault();
		if ( this.content.isWhitespace() ) {
			return Button.__super__._keyReturn.call( this, ev );
		}

		ContentSelect.Range.query( this._domElement.querySelector( '.pbs-button' ) );
		selection = ContentSelect.Range.query( this._domElement.querySelector( '.pbs-button' ) );
		tip = this.content.substring( 0, selection.get()[0] );

		if ( ! tip.length() ) {
			element = new ContentEdit.Text( 'p', {}, '' );
			this.parent().attach( element, this.parent().children.indexOf( this ) );
			element.focus();
		} else {
			element = new ContentEdit.Text( 'p', {}, '' );
			this.parent().attach( element, this.parent().children.indexOf( this ) + 1 );
			element.focus();
		}
	};

    Button.prototype.storeState = function() {
		if ( ! ( this.isMounted() && this.isFocused() ) ) {
			return;
		}
		return this._savedSelection = ContentSelect.Range.query( this._domElement.querySelector( '.pbs-button' ) );
    };

	Button.prototype.restoreState = function() {
		if ( ! this._savedSelection ) {
			return;
		}
		if ( ! ( this.isMounted() && this.isFocused() ) ) {
			this._savedSelection = void 0;
			return;
		}
		this._domElement.querySelector( '.pbs-button' ).setAttribute( 'contenteditable', '' );
		this._addCSSClass( 'ce-element--focused' );
		if ( document.activeElement !== this.domElement().querySelector( '.pbs-button' ) ) {
			this.domElement().querySelector( '.pbs-button' ).focus();
		}
		this._savedSelection.select( this._domElement.querySelector( '.pbs-button' ) );
		return this._savedSelection = void 0;
    };

	return Button;

} )( ContentEdit.Text );

ContentEdit.TagNames.get().register( ContentEdit.Button, 'button' );

/**
 * Support old buttons. Old buttons were text elements with a link.pbs-button inside.
 * convert old buttons into the new button element.
 */
( function() {
	var proxied = ContentEdit.Text.fromDOMElement;
	ContentEdit.Text.fromDOMElement = function( domElement ) {
		if ( domElement.firstChild && domElement.firstChild.classList && domElement.firstChild === domElement.lastChild ) {
			if ( 'A' === domElement.firstChild.tagName && domElement.firstChild.classList.contains( 'pbs-button' ) ) {
				domElement.setAttribute( 'data-ce-tag', 'button' );
				return ContentEdit.Button.fromDOMElement( domElement );
			}
		}
		return proxied.call( this, domElement );
	};
} )();

/* globals ContentEdit, HTMLString, pbsParams, __extends, PBSEditor, console, ContentTools */

ContentEdit.Shortcode = ( function( _super ) {
	__extends( Shortcode, _super );

	Shortcode.sc_raw = '';
	Shortcode.sc_hash = '';
	Shortcode.sc_base = '';

	// Used for checking whether we should do an ajax update
	Shortcode.sc_prev_raw = '';

	function Shortcode( tagName, attributes, content ) {
		this.sc_hash = attributes['data-shortcode'];
		this.sc_base = attributes['data-base'];
		this.sc_raw = Shortcode.atob( this.sc_hash );
		this.sc_prev_raw = this.sc_raw;
		this.model = new Backbone.Model( {} );
		this.parseShortcode();
		this.model.element = this;
		this.model.listenTo( this.model, 'change', this.modelChanged.bind( this ) );

		this._doubleClickCount = 0;

		Shortcode.__super__.constructor.call( this, tagName, attributes );

		this._content = content;
	}

	Shortcode.btoa = function( str ) {
	    return btoa( encodeURIComponent( str ).replace( /%([0-9A-F]{2})/g, function( match, p1 ) {
	        return String.fromCharCode( '0x' + p1 );
	    } ) );
	};

	Shortcode.atob = function( str ) {
		return decodeURIComponent( Array.prototype.map.call( window.atob( str ), function( c ) {
	        return '%' + ( '00' + c.charCodeAt( 0 ).toString( 16 ) ).slice( -2 );
	    } ).join( '' ) );
	};

	Shortcode.prototype.mount = function() {
		var ret = Shortcode.__super__.mount.call( this );

		var scStyles = getComputedStyle( this._domElement );
		if ( '0px' === scStyles.height ) {
			this._domElement.classList.add( 'pbs--blank' );
		} else {
			this._domElement.classList.remove( 'pbs--blank' );
		}

		setTimeout( function() {
			var scStyles;
			if ( this._domElement ) {
				scStyles = getComputedStyle( this._domElement );
				if ( '0px' === scStyles.height ) {
					this._domElement.classList.add( 'pbs--blank' );
				} else {
					this._domElement.classList.remove( 'pbs--blank' );
				}
			}
		}.bind( this ), 1 );

		return ret;
	};

	// Creates the base element of the shortcode div.
	// Does not have any contents, need to run `ajaxUpdate` after attaching to update.
	Shortcode.createShortcode = function( shortcode ) {

		var o = document.createElement( 'DIV' );
		o.setAttribute( 'data-ce-moveable', '' );
		o.setAttribute( 'data-ce-tag', 'shortcode' );
		o.setAttribute( 'data-base', shortcode.shortcode.tag );
		o.setAttribute( 'data-shortcode', Shortcode.btoa( shortcode.shortcode.string() ) );

		return ContentEdit.Shortcode.fromDOMElement( o );
	};

	Shortcode.fromDOMElement = function( domElement ) {
	    var newElement = new this( domElement.tagName, this.getDOMElementAttributes( domElement ), domElement.innerHTML );

		// This global variable is set to TRUE when we have just added a pre-designed element,
		// in this case, we need to refresh the shortcode to make it's render updated.
		if ( PBSEditor._justAddedDesignElement ) {
			newElement.ajaxUpdate( true );
		}

		return newElement;
	};

	Shortcode.prototype.convertToText = function() {
		var innerHTML = this._domElement.innerHTML;
		var elem = Shortcode.__super__.convertToText.call( this, this.sc_raw );

		elem.origShortcode = this.sc_raw;
		elem.origInnerHTML = innerHTML;
		elem.isShortcodeEditing = true;

		return elem;
	};

	Shortcode.prototype.parseShortcode = function() {
		var sc = wp.shortcode.next( this.sc_base, this.sc_raw, 0 );
		var attributeName, i;

		for ( attributeName in sc.shortcode.attrs.named ) {
			if ( sc.shortcode.attrs.named.hasOwnProperty( attributeName ) ) {
				this.model.set( attributeName, sc.shortcode.attrs.named[ attributeName ], { silent: true } );
			}
		}

		for ( i = 0; i < sc.shortcode.attrs.numeric.length; i++ ) {
			this.model.set( i, sc.shortcode.attrs.numeric[ i ], { silent: true } );
		}

		this.model.set( 'content', sc.shortcode.content, { silent: true } );
	};

	Shortcode.prototype._onDoubleClick = function() {
		ContentTools.EditorApp.get()._toolboxProperties.inspect( this );
	};

	Shortcode.prototype.cssTypeName = function() {
		return 'shortcode';
	};

	Shortcode.prototype.typeName = function() {
		return 'Shortcode';
	};

	Shortcode.prototype.clone = function() {
		var clone, newElement, index;
        var root = ContentEdit.Root.get();
        if ( root.focused() === this ) {
			root.focused().blur();
        }
		clone = document.createElement( 'div' );
		clone.innerHTML = this.html();
		newElement = Shortcode.fromDOMElement( clone.childNodes[0] );
		index = this.parent().children.indexOf( this );
		this.parent().attach( newElement, index + 1 );

		newElement.focus();
	};

	Shortcode.prototype.modelChanged = function() {
		var _this = this;

		this.updateSCRaw();
		this.updateSCHash();

		clearTimeout( this._scRefreshTrigger );
		this._scRefreshTrigger = setTimeout( function() {
			_this.ajaxUpdate();
		}, 500 );
	};

	Shortcode.prototype.setSCAttr = function( name, value ) {
		this.model.set( name, value );
	};

	Shortcode.prototype.setSCContent = function( value ) {
		this.model.set( 'content', value );
	};

	Shortcode.prototype.updateSCRaw = function() {
		var keys, i, value, attrName;
		var sc = '';
		sc += '[' + this.sc_base;

		keys = this.model.keys();
		for ( i = 0; i < keys.length; i++ ) {
			attrName = keys[ i ];
			if ( 'content' !== attrName ) {
				value = this.model.get( attrName ) || '';
				value = value.replace( /\n/g, '<br>' );
				sc += ' ' + attrName + '="' + value + '"';
			}
		}
		sc += ']';

		if ( this.model.get( 'content' ) ) {
			sc += this.model.get( 'content' );
		}

		sc += '[/' + this.sc_base + ']';

		this.sc_raw = sc;
	};

	Shortcode.prototype.updateSCHash = function() {
		this.sc_hash = Shortcode.btoa( this.sc_raw );
		this.attr( 'data-shortcode', this.sc_hash );
	};

	Shortcode.prototype.unmount = function() {
		Shortcode.__super__.unmount.call( this );

		// Re-init the shortcode scripts to make sure it still works.
		setTimeout( function() {
			this.runInitScripts();
		}.bind( this ), 100 );
	};

	Shortcode.prototype.runInitScripts = function() {

		var i, map, ranInitCode = false;

		if ( this._scriptsToRun ) {
			for ( i = 0; i < this._scriptsToRun.length; i++ ) {
				try {

					/**
					 * Yes, this is a form of eval'ed code, but we can do this because:
					 * 1. We only do this when editing,
					 * 2. Logged out users will never see this code,
					 * 3. Script init code comes from the plugin's rendered shortcode,
					 * 4. This is only performed when refreshing shortcodes
					 */

					// jshint evil:true
					( new Function( this._scriptsToRun[ i ] ) )();

					ranInitCode = true;

				} catch ( err ) {

					// Shortcode init failed.
					console.log( 'PBS:', this.sc_base, 'init code errored out.' );
				}
			}
		}

		// Run shortcode mapping init code.
		if ( 'undefined' !== typeof pbsParams.shortcode_mappings[ this.sc_base ] ) {
			map = pbsParams.shortcode_mappings[ this.sc_base ];
			if ( 'undefined' !== typeof map.init_code ) {
				try {

					/**
					 * Yes, this is a form of eval'ed code, but we can do this because:
					 * 1. We only do this when editing,
					 * 2. Logged out users will never see this code,
					 * 3. map.init_code doesn't come from any user input like GET vars,
					 * 4. This is only performed when refreshing shortcodes
					 */

					// jshint evil:true
					if ( this._domElement ) {
						( new Function( map.init_code ) ).bind( this._domElement.firstChild )();
					} else {
						( new Function( map.init_code ) )();
					}

					ranInitCode = true;

					wp.hooks.doAction( 'pbs.rects.changed' );

				} catch ( err ) {

					// Shortcode init failed.
					console.log( 'PBS:', this.sc_base, 'init code errored out.' );
				}
			}
		}

		// Refresh the dom element if some init code was used.
		if ( ranInitCode ) {
			setTimeout( function() {
				if ( this._domElement ) {
					this._content = this._domElement.innerHTML;
					wp.hooks.doAction( 'pbs.rects.changed' );
				}
			}.bind( this ), 10 );
		} else if ( this._domElement ) {
			this._content = this._domElement.innerHTML;
		}

		wp.hooks.doAction( 'pbs.rects.changed' );

	};

	Shortcode.prototype.ajaxUpdate = function( forceUpdate ) {
		clearTimeout( this._ajaxUpdateTimeout );
		this._ajaxUpdateTimeout = setTimeout( function() {
			this._ajaxUpdate( forceUpdate );
		}.bind( this ), 500 );
	};

	Shortcode.prototype._ajaxUpdate = function( forceUpdate ) {

		var payload, _this, request;

		// If nothing was changed, don't update.
		if ( this.sc_prev_raw === this.sc_raw && ! forceUpdate ) {
			return;
		}

		payload = new FormData();
		payload.append( 'action', 'pbs_shortcode_render' );
		payload.append( 'shortcode', this.sc_hash );
		payload.append( 'nonce', pbsParams.nonce );

		this._domElement.classList.add( 'pbs--rendering' );

		_this = this;
		request = new XMLHttpRequest();
		request.open( 'POST', window.location.href );

		request.onload = function() {
			var i, node, response, enqueued, dummyContainer, currentHead;
			var enqueuedScriptsPending, scriptsToRun, scriptURL, styleURL, style;
			var scStyles;

			if ( request.status >= 200 && request.status < 400 ) {

				// The response should be a JSON object,
				// If not we probably encountered an error during rendering.
				try {
					response = JSON.parse( request.responseText );
				} catch ( err ) {

					console.log( 'PBS: Error getting rendered shortcode' );

					_this._domElement.classList.remove( 'pbs--rendering' );

					// Min-height is set during editing, remove it
					_this._domElement.style.minHeight = '';
					_this._domElement.style.marginBottom = '';

					// Take note of the new hash to prevent unnecessary updating.
					_this.sc_prev_raw = _this.sc_raw;

					wp.hooks.doAction( 'pbs.rects.changed' );
					return;
				}

				// Create a dummy container for the scripts and styles the shortcode needs
				enqueued = response.scripts + response.styles;
				dummyContainer = document.createElement( 'div' );
				dummyContainer.innerHTML = enqueued.trim();

				// Add the scripts & styles if they aren't in yet.
				currentHead = document.querySelector( 'html' ).innerHTML;
				enqueuedScriptsPending = 0;
				scriptsToRun = [];

				if ( enqueued.trim().length ) {
					for ( i = dummyContainer.childNodes.length - 1; i >= 0; i-- ) {
						if ( dummyContainer.childNodes[i].getAttribute ) {
							node = dummyContainer.childNodes[i];

							// Scripts.
							if ( 'SCRIPT' === node.tagName ) {

								// JS scripts added are most likely initialization code.
								if ( ! node.getAttribute( 'src' ) ) {
									scriptsToRun.unshift( node.innerHTML );
									continue;

								} else {

									// Dynamically load these scripts.
									scriptURL = node.getAttribute( 'src' );
									if ( ! document.querySelector( 'script[src="' + scriptURL + '"]' ) ) {

										// We count these so we can run initialization
										// when everything has completed loading.
										enqueuedScriptsPending++;

										/* jshint loopfunc:true */
										jQuery.getScript( node.getAttribute( 'src' ) )
										.done( function() {
											enqueuedScriptsPending--;
										} )
										.fail( function() {
											enqueuedScriptsPending--;
										} );
									}

									continue;
								}

							// Styles.
						} else if ( 'LINK' === node.tagName ) {

								// Include the style files if they aren't added in yet.
								if ( 'stylesheet' === node.getAttribute( 'rel' ) && node.getAttribute( 'href' ) ) {
									styleURL = node.getAttribute( 'href' );
									if ( document.querySelector( 'link[href="' + styleURL + '"]' ) ) {
										continue;
									}
								}
							}

							// Add the script or styles.
							if ( currentHead.indexOf( node.outerHTML ) === -1 ) {
								document.body.appendChild( node );
							}
						}
					}
				}

				// Add the results
				dummyContainer = document.createElement( 'div' );
				dummyContainer.innerHTML = response.output.trim();

				if ( ! _this._domElement ) {
					return;
				}

				// Add the rendered shortcode output.
				_this._domElement.innerHTML = '';
				if ( dummyContainer.innerHTML.length ) {
					for ( i = dummyContainer.childNodes.length - 1; i >= 0; i-- ) {
						node = dummyContainer.childNodes[ i ];
						if ( 3 === dummyContainer.childNodes[ i ].nodeType ) {
							_this._domElement.insertBefore( node, _this._domElement.firstChild );
						} else {

							// If a script was outputted, we can use this to
							// initialize the shortcode.
							if ( 'SCRIPT' === node.tagName ) {
								scriptsToRun.unshift( node.innerHTML );
								continue;
							}

							// Insert rendered output.
							_this._domElement.insertBefore( node, _this._domElement.firstChild );
						}
					}
				}
				_this._content = dummyContainer.innerHTML;

				// Run initialization scripts.
				if ( scriptsToRun ) {
					_this._scriptsToRun = scriptsToRun;
					_this._scriptRunInterval = setInterval( function() {
						if ( ! enqueuedScriptsPending ) {
							this.runInitScripts();
							clearInterval( this._scriptRunInterval );
						}
					}.bind( _this ), 100 );
				}

				// If the first element is floated, mimic the float so that the shortcode can be selectable.
				_this.style( 'float', '' );
				if ( 1 === _this._domElement.children.length ) {
					try {
						style = getComputedStyle( _this._domElement.firstChild );
						if ( 'left' === style.float || 'right' === style.float ) { // jshint ignore:line
							_this.style( 'float', style.float ); // jshint ignore:line
						}
					} catch ( err ) {}
				}

				// Trigger the shortcode to render.
				// This should be listened to by plugins/shortcodes so that they can render correctly upon showing up in the page
				document.dispatchEvent( new CustomEvent( 'pbs:shortcode-render', { detail: document.querySelector( '.pbs--rendering' ) } ) );
			}
			_this._domElement.classList.remove( 'pbs--rendering' );
			_this._domElement.classList.remove( 'pbs--blank' );

			// Min-height is set during editing, remove it
			_this._domElement.style.minHeight = '';
			_this._domElement.style.marginBottom = '';

			// Take note of the new hash to prevent unnecessary updating.
			_this.sc_prev_raw = _this.sc_raw;

			scStyles = getComputedStyle( _this._domElement );
			if ( '0px' === scStyles.height ) {
				_this._domElement.classList.add( 'pbs--blank' );
			} else {
				_this._domElement.classList.remove( 'pbs--blank' );
			}

			wp.hooks.doAction( 'pbs.rects.changed' );

		};

		// There was a connection error of some sort.
		request.onerror = function() {
			_this._domElement.classList.remove( 'pbs--rendering' );

			// Min-height is set during editing, remove it
			_this._domElement.style.minHeight = '';
			_this._domElement.style.marginBottom = '';

			// Take note of the new hash to prevent unnecessary updating.
			_this.sc_prev_raw = _this.sc_raw;
		};
		request.send( payload );
	};

	return Shortcode;

} )( ContentEdit.StaticEditable );

ContentEdit.TagNames.get().register( ContentEdit.Shortcode, 'shortcode' );

/****************************************************************
 * Checks the contents of the element then converts shortcodes
 * into shortcode elements. Also retains normal text
 * into text elements.
 ****************************************************************/
ContentEdit.Text.prototype.convertShortcodes = function() {

	// Find shortcodes
	var html = this.content.html();
	var textParts = [];
	var shortcodes = [];
	var shortcodeRegex, shortcodeMatch, prevIndex, base, sc, i, isShortcode;
	var elem, insertAt, parent, dom, minHeight, bottomMargin, doAjax, scStyles;

	if ( '' === html.trim() ) {
		return;
	}

	shortcodeRegex = /\[([^\/][^\s\]\[]+)[^\]]*\]/g;
	shortcodeMatch = shortcodeRegex.exec( html );

	if ( ! shortcodeMatch ) {
		return;
	}

	prevIndex = 0;
	while ( shortcodeMatch ) {

		// Don't render shortcodes that do not exist.
		if ( pbsParams.shortcodes.indexOf( shortcodeMatch[1] ) === -1 ) {
			shortcodeMatch = shortcodeRegex.exec( html );
			continue;
		}

		// The regex can capture nested shortcodes, ignore those and let the parent shortcode
		// handle the rendering
		if ( shortcodeMatch.index < prevIndex ) {
			shortcodeMatch = shortcodeRegex.exec( html );
			continue;
		}

		base = shortcodeMatch[1];
		sc = wp.shortcode.next( base, html, shortcodeMatch.index );
		textParts.push( html.substr( prevIndex, shortcodeMatch.index - prevIndex ) );
		shortcodes.push( sc );

		prevIndex = shortcodeMatch.index + sc.content.length;
		shortcodeMatch = shortcodeRegex.exec( html );
	}

	// Don't continue if no shortcodes are found.
	if ( 0 === shortcodes.length ) {
		return;
	}

	// Get the last part of the text.
	textParts.push( html.substr( prevIndex ) );

	insertAt = this.parent().children.indexOf( this );
	parent = this.parent();
	dom = this._domElement;

	if ( dom && dom.style.minHeight ) {
		minHeight = dom.style.minHeight;
		bottomMargin = dom.style.bottomMargin;
	}

	// Modify the current element and create the shortcodes seen.
	for ( i = 0; i < textParts.length + shortcodes.length; i++ ) {

		isShortcode = 1 === i % 2;
		elem = null;

		// The first element is always the original text element that will be altered.
		if ( 0 === i ) {
			this.content = new HTMLString.String( textParts[ i ], true );
			this.updateInnerHTML();
			this.taint();
			continue;
		}

		// Create either a shortcode or a text element.
		if ( isShortcode ) {
			elem = ContentEdit.Shortcode.createShortcode( shortcodes[ Math.floor( i / 2 ) ] );
		} else {

			// Don't create empty text elements.
			if ( textParts[ i / 2 ].trim() ) {
				elem = document.createElement( 'P' );
				elem.innerHTML = textParts[ i / 2 ];
				elem = ContentEdit.Text.fromDOMElement( elem );
			}
		}

		// Attach the new elements.
		if ( elem ) {

			insertAt++;

			parent.attach( elem, insertAt );

			// If we just edited a shortcode (turned it into a text element), we will have a minHeight,
			// Copy it over to prevent the screen from jumping around because the heights are changing.
			// Only do this for the first shortcode.
			if ( 1 === i ) {
				if ( dom && minHeight ) {
					elem._domElement.style.minHeight = minHeight;
					elem._domElement.style.bottomMargin = bottomMargin;
				}
			}

			if ( 'Shortcode' === elem.constructor.name ) {

				// If we just edited a shortcode (turned it into a text element), we will have the original
				// shortcode remembered in this.origShortcode. If unedited, then just bring back the old
				// shortcode contents instead of doing an ajax call again.
				doAjax = true;
				if ( 1 === i ) {
					if ( elem.sc_raw === this.origShortcode ) {
						elem._domElement.innerHTML = this.origInnerHTML;
						elem._content = this.origInnerHTML;

						scStyles = getComputedStyle( elem._domElement );
						if ( '0px' === scStyles.height ) {
							elem._domElement.classList.add( 'pbs--blank' );
						} else {
							elem._domElement.classList.remove( 'pbs--blank' );
						}

						doAjax = false;
					}
				}

				if ( doAjax ) {
					elem.ajaxUpdate( true );
				}

			}
		}
	}

	// If the current element was converted into a blank, remove it.
	if ( this.parent() && this.content.isWhitespace() ) {
		this.parent().detach( this );
	}

};

/********************************************************************************
 * Event handlers to listen for typing shortcodes inside text elements
 ********************************************************************************/

// When hitting return.
( function() {
	var proxied = ContentEdit.Text.prototype._keyReturn;
	ContentEdit.Text.prototype._keyReturn = function( ev ) {
		var ret;

		if ( this.isShortcodeEditing ) {
			this.blur();
			return this.convertShortcodes();
		}

		ret = proxied.call( this, ev );
		this.convertShortcodes();
		return ret;
	};
} )();

// On text element blur.
( function() {
	var ready = function() {
		ContentEdit.Root.get().bind( 'blur', function( element ) {
			if ( 'Text' === element.constructor.name ) {
				element.convertShortcodes();
			}
		} );

		// Saving WHILE shortcodes are being edited get an error, blur the text before being able to save to prevent this.
		if ( document.querySelector( '#wpadminbar' ) ) {
			document.querySelector( '#wpadminbar' ).addEventListener( 'mouseover', function() {
				var root = ContentEdit.Root.get();
				var focused = root.focused();
				if ( focused ) {
					if ( 'Text' === focused.constructor.name ) {
						if ( focused.content ) {

							// Only do this IN shortcodes, or else the blur gets annoying.
							if ( focused.content.html().match( /\[\w+[^\]]+\]/ ) ) {
								focused.blur();
							}
						}
					}
				}
			} );
		}
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/********************************************************************************
 * Float left/right shortcodes that have their only child as floated left/right.
 ********************************************************************************/
( function() {
	var ready = function() {

		// Carry over the float property to the parent shortcode div to make the behavior the same
		var shortcodes = document.querySelectorAll( '[data-name="main-content"] [data-shortcode]' );
		Array.prototype.forEach.call( shortcodes, function( el ) {
			var style;

			if ( 1 === el.children.length ) {
				try {
					style = getComputedStyle( el.firstChild );
					if ( 'left' === style.float || 'right' === style.float ) { // jshint ignore:line
						el.style.float = style.float; // jshint ignore:line
					}
				} catch ( err ) {}
			}
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentEdit, __extends, PBSEditor */

ContentEdit.Hr = ( function( _super ) {
	__extends( Hr, _super );

	function Hr( tagName, attributes ) {
		this.model = new Backbone.Model( {} );

		Hr.__super__.constructor.call( this, tagName, attributes );

		this._content = '';
	}

    Hr.prototype.blur = function() {
      var root = ContentEdit.Root.get();
      if ( this.isFocused() ) {
        this._removeCSSClass( 'ce-element--focused' );
        root._focused = null;
        return root.trigger( 'blur', this );
      }
    };

    Hr.droppers = PBSEditor.allDroppers;

    Hr.prototype.focus = function( supressDOMFocus ) {
      var root;
      root = ContentEdit.Root.get();
      if ( this.isFocused() ) {
        return;
      }
      if ( root.focused() ) {
        root.focused().blur();
      }
      this._addCSSClass( 'ce-element--focused' );
      root._focused = this;
      if ( this.isMounted() && ! supressDOMFocus ) {
        this.domElement().focus();
      }
      return root.trigger( 'focus', this );
    };

	Hr.prototype.cssTypeName = function() {
		return 'hr';
	};

	Hr.prototype.typeName = function() {
		return 'Horizontal Rule';
	};

	Hr.prototype._onDoubleClick = function() {
		this.inspect();
	};

	return Hr;

} )( ContentEdit.Static );

ContentEdit.TagNames.get().register( ContentEdit.Hr, 'hr' );

/* globals ContentEdit, ContentTools, pbsParams, __extends */

ContentEdit.Embed = ( function( _super ) {
	__extends( Embed, _super );

	function Embed( tagName, attributes, content ) {
		this.url = attributes['data-url'];
		this.model = new Backbone.Model( {} );

		this._doubleClickCount = 0;

		Embed.__super__.constructor.call( this, tagName, attributes );

		this._content = content;
	}

	// Creates the base element of the shortcode div.
	// Does not have any contents, need to run `ajaxUpdate` after attaching to update.
	Embed.create = function( url ) {

		var o = document.createElement( 'DIV' );
		o.setAttribute( 'data-ce-moveable', '' );
		o.setAttribute( 'data-ce-tag', 'embed' );
		o.setAttribute( 'data-url', url );

		return ContentEdit.Embed.fromDOMElement( o );
	};

    Embed.prototype.mount = function() {
		var ret = Embed.__super__.mount.call( this );

		/*
		 * Use jQuery's html here since oEmbeds may have a script tag
		 * with them and that doesn't run with innerHTML.
		 */
		this._domElement.innerHTML = '';
		jQuery( this._domElement ).html( this._content );

		// Allow others to perform additional mounting functions.
		wp.hooks.doAction( 'pbs.embed.mount', this );

		return ret;
	};

	Embed.prototype._onDoubleClick = function() {
		this.inspect();
	};

	Embed.prototype.cssTypeName = function() {
		return 'embed';
	};

	Embed.prototype.typeName = function() {
		return 'Embed';
	};

	Embed.prototype.updateEmbedContent = function( url ) {

		var request = new XMLHttpRequest();
		var payload = new FormData();

		if ( ! url ) {
			url = this._domElement.getAttribute( 'data-url' );
		}

		payload.append( 'post_ID', pbsParams.post_id );
		payload.append( 'type', 'embed' );
		payload.append( 'action', 'parse-embed' );
		payload.append( 'shortcode', '[embed]' + url + '[/embed]' );

		request.open( 'POST', pbsParams.ajax_url );

		request.onload = function() {
			var response;

			if ( request.status >= 200 && request.status < 400 ) {
				response = JSON.parse( request.responseText );

				// Check if WP's check for embeddable URL failed.
				if ( ! response.success ) {
					return;
				}

				/*
				 * Use jQuery's html here since oEmbeds may have a script tag
				 * with them and that doesn't run with innerHTML.
				 */

				// _this._domElement.innerHTML = response.data.body;
				jQuery( this._domElement ).html( '<p>' + response.data.body + '</p>' );
				this._content = '<p>' + response.data.body + '</p>';

				this._domElement.classList.remove( 'pbs--rendering' );

				wp.hooks.doAction( 'pbs.embed.update_embed_content', this );

			}
		}.bind( this );

		// There was a connection error of some sort.
		request.onerror = function() {
		};
		request.send( payload );
	};

	Embed.updateEmbedContent = function( url, textElement ) {

		var payload = new FormData();
		var request = new XMLHttpRequest();

		payload.append( 'post_ID', pbsParams.post_id );
		payload.append( 'type', 'embed' );
		payload.append( 'action', 'parse-embed' );
		payload.append( 'shortcode', '[embed]' + url + '[/embed]' );

		request.open( 'POST', pbsParams.ajax_url );

		request.onload = function() {
			var response, elem, insertAt, parent;

			if ( request.status >= 200 && request.status < 400 ) {
				response = JSON.parse( request.responseText );

				// Check if WP's check for embeddable URL failed.
				if ( ! response.success ) {
					return;
				}

				if ( ! textElement.parent() ) {
					return;
				}

				// If successful, convert the element into an Embed element.
				elem = ContentEdit.Embed.create( url );
				insertAt = textElement.parent().children.indexOf( textElement );
				parent = textElement.parent();

				parent.attach( elem, insertAt );
				parent.detach( textElement );

				/*
				 * Use jQuery's html here since oEmbeds may have a script tag
				 * with them and that doesn't run with innerHTML.
				 */

				jQuery( elem._domElement ).html( '<p>' + response.data.body + '</p>' );
				elem._content = '<p>' + response.data.body + '</p>';

				elem._domElement.classList.remove( 'pbs--rendering' );

				wp.hooks.doAction( 'pbs.embed.update_embed_content', elem );

			}
		};

		// There was a connection error of some sort.
		request.onerror = function() {
		};
		request.send( payload );
	};

	return Embed;

} )( ContentEdit.StaticEditable );

ContentEdit.TagNames.get().register( ContentEdit.Embed, 'embed' );

/****************************************************************
 * Checks the contents of the element then converts URLs
 * into oembed elements.
 ****************************************************************/
ContentEdit.Text.prototype.convertOEmbedURLs = function() {

	var text;

	if ( this.content.isWhitespace() ) {
		return;
	}

	// Get the content
	text = this.content.text();
	if ( ! text ) {
		return;
	}

	// Don't embed links.
	if ( this.content.html().match( /<a[^>]+/g ) ) {
		return;
	}

	text = text.trim();
	if ( ! text ) {
		return;
	}

	// Simple URL matching: @stephenhay
	// @see https://mathiasbynens.be/demo/url-regex
	if ( ! text.match( /^https?:\/\/[^\s/$.?#].[^\s]*$/ ) ) {
		return;
	}

	ContentEdit.Embed.updateEmbedContent( text, this );
};

// On text element blur.
( function() {
	var ready = function() {
		ContentEdit.Root.get().bind( 'blur', function( element ) {
			if ( 'Text' === element.constructor.name ) {
				element.convertOEmbedURLs();
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
 * When stopping the editor, the iframes get invalidated, re-run the scripts
 * included with the embeds to fix the iframes.
 */
( function() {
	var ready = function() {
		var editor = ContentTools.EditorApp.get();
		editor.bind( 'stop', function() {

			var shortcodes = document.querySelectorAll( '[data-ce-tag="embed"]' );
			Array.prototype.forEach.call( shortcodes, function( el ) {

				/*
				 * Use jQuery's html here since oEmbeds may have a script tag
				 * with them and that doesn't run with innerHTML.
				 */
				var html = el.innerHTML;
				el.innerHTML = '';
				jQuery( el ).html( html );
			} );
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentEdit, ContentTools, ContentSelect, HTMLString, hljs */

( function() {

	// Updating the html contents removes all highlighting markup.
	ContentEdit.PreText.prototype.unhighlight = function() {
		this.updateInnerHTML();
	};

	// Turn on highlight syntaxing on the element.
	ContentEdit.PreText.prototype.rehighlight = function() {
		if ( this._domElement && 'undefined' !== typeof hljs ) {
			this.storeState();
			this.removeAllCSSClasses();
			hljs.highlightBlock( this._domElement );
			this.restoreState();
		}
	};

} )();

/**
 * When generating the html to save, don't include any markup. The additional
 * markup are the syntax highlighting stuff.
 */
( function() {
	var proxied = ContentEdit.PreText.prototype.html;
	ContentEdit.PreText.prototype.html = function( indent ) {
		proxied.call( this, indent );
		this._cached = this._cached.replace( /<\/?\w+[^>]*>/g, '' );
		return ( '' + indent + '<' + this._tagName + ( this._attributesToString() ) + '>' ) + ( '' + this._cached.replace( /\n/g, '\r\n' ) + '</' + this._tagName + '>' );
    };

} )();

/**
 * Remove all syntax highlighting when focsed on the element. Don't do syntax
 * highlighting during editing.
 */
( function() {
	var proxied = ContentEdit.PreText.prototype.focus;
    ContentEdit.PreText.prototype.focus = function() {
		var ret = proxied.call( this );
		this.unhighlight();
		return ret;
    };
} )();

/**
 * Re-apply the syntax highlighting during mounting.
 */
( function() {
	var proxied = ContentEdit.PreText.prototype.mount;
    ContentEdit.PreText.prototype.mount = function() {
		var ret = proxied.call( this );
		this.rehighlight();
		return ret;
    };
} )();

( function() {
	var proxied = ContentEdit.PreText.prototype.blur;
    ContentEdit.PreText.prototype.blur = function() {
		var ret = proxied.call( this );
		this.rehighlight();
		return ret;
    };
} )();

/**
 * When just starting out, remove all markup in the code. Assume those are all
 * syntax highlighting stuff.
 */
( function() {
	var proxied = ContentEdit.PreText.fromDOMElement;
    ContentEdit.PreText.fromDOMElement = function( domElement ) {
		domElement.innerHTML = domElement.innerHTML.replace( /<\/?\w+[^>]*>/g, '' );
		return proxied.call( this, domElement );
    };
} )();

/**
 * After we stop, turn on syntax highlighting since they will get removed.
 */
( function() {
	var ready = function() {
		var editor = ContentTools.EditorApp.get();
		editor.bind( 'stop', function() {
			if ( window.pbsInitAllPretext ) {
				window.pbsInitAllPretext();
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
 * Support tabs inside PreText elements.
 */
( function() {
	var proxied = ContentEdit.PreText.prototype._onKeyDown;
    ContentEdit.PreText.prototype._onKeyDown = function( ev ) {
		var selection, preserveWhitespace, insertAt;

		if ( 9 === ev.keyCode ) {
			ev.preventDefault();
			ContentSelect.Range.query( this._domElement );
			selection = ContentSelect.Range.query( this._domElement );
			preserveWhitespace = this.content.preserveWhitespace();

			// TODO: When a string is selected, multi-indent:
			// 1. find the last \n before index 0, then turn into \n\t
			// 2. turn all \n into \n\t in the selected string.

			insertAt = selection.get()[1];
			this.content = this.content.insert( insertAt, new HTMLString.String( '\t', preserveWhitespace ), preserveWhitespace );
			this.updateInnerHTML();
			insertAt += 1;
			selection = new ContentSelect.Range( insertAt, insertAt );
			selection.select( this.domElement() );
		}
		return proxied.call( this, ev );
    };
} )();

/* globals ContentTools, ContentEdit, fluidvids */

// Called when a Twitter embed element is mounted.
( function() {
	var editor = ContentTools.EditorApp.get();

	if ( fluidvids && fluidvids.render ) {
		wp.hooks.addAction( 'pbs.embed.mount', 'pbs.embed', fluidvids.render );
		wp.hooks.addAction( 'pbs.embed.update_embed_content', 'pbs.embed', fluidvids.render );

		// When editing stops, re-init all parallax (they would be surely removed).
		editor.bind( 'stop', fluidvids.render );
		editor.bind( 'start', fluidvids.render );
	}
} )();

( function() {
	var proxy = ContentEdit.Element.prototype.mount;
	ContentEdit.Element.prototype.mount = function() {
		var ret = proxy.call( this );
		if ( fluidvids && fluidvids.render ) {

			// Compatible with themes that define Jetpack's responsive video functionality.
			if ( ! this._domElement.querySelector( '.jetpack-video-wrapper' ) ) {
				fluidvids.render();
			}
		}
		return ret;
	};
} )();

/* globals ContentTools, twttr */

/**
 * Twitter iframe embeds don't have a src attribute, so the iframe breaks when
 * CT/editor starts/stops, this script fixes the Twitter embeds by using
 * Twitter's Widget Library/API.
 *
 * @see https://dev.twitter.com/web/javascript/creating-widgets#create-tweet
 */

// Called when a Twitter embed element is mounted.
var pbsTwitterMount = function( element ) {

	var tweetID;
	var domElement = element._domElement || element;

	if ( domElement.querySelector( '[data-tweet-id]' ) ) {
		tweetID = domElement.querySelector( '[data-tweet-id]' ).getAttribute( 'data-tweet-id' );

		domElement.innerHTML = '';
		twttr.widgets.createTweet( tweetID, domElement );

	}
};
wp.hooks.addAction( 'pbs.embed.mount', 'pbs.embed', pbsTwitterMount );

// Call Twitter API when the CT editor saves/stops because Twitter's iframe doesn't have a src.
( function() {
	var ready = function() {
		var editor = ContentTools.EditorApp.get();
		editor.bind( 'stop', function() {

			var shortcodes = document.querySelectorAll( '[data-tweet-id]' );
			Array.prototype.forEach.call( shortcodes, function( el ) {
				pbsTwitterMount( el.parentNode );
			} );

		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentEdit, __extends */

ContentEdit.IFrame = ( function( _super ) {
	__extends( IFrame, _super );

	function IFrame( tagName, attributes, content ) {
		this.model = new Backbone.Model( {} );

		IFrame.__super__.constructor.call( this, tagName, attributes );
		this._content = content;
	}

	IFrame.prototype.html = function() {
		return '<p>' + this._content + '</p>';
    };

	IFrame.prototype._onDoubleClick = function() {

		// Escape characters to prevent this from being read as html.
		var html = this._domElement.innerHTML.replace( /</g, '&lt;' ).replace( /<p>|<\/p>/g, '' ).replace( /data-ce-tag=['"]iframe['"]/, '' );
		var textElement = this.convertToText( html, false );
		textElement.isIframeEditing = true;
	};

	IFrame.prototype.cssTypeName = function() {
		return 'iframe';
	};

	IFrame.prototype.typeName = function() {
		return 'IFrame';
	};

	IFrame.convertTextToIFrame = function( html, textElement ) {

		// If successful, convert the element into an IFrame element.
		var elem = new ContentEdit.IFrame( 'P', [], html ),
			insertAt = textElement.parent().children.indexOf( textElement ),
			parent = textElement.parent();

		parent.attach( elem, insertAt );
		parent.detach( textElement );
	};

	return IFrame;

} )( ContentEdit.StaticEditable );

ContentEdit.TagNames.get().register( ContentEdit.IFrame, 'iframe' );

/**
 * Iframes are rendered inside paragraph tags. This handles the reading process of CT.
 */
( function() {
	var proxied = ContentEdit.Text.fromDOMElement;
	ContentEdit.Text.fromDOMElement = function( domElement ) {
		if ( domElement ) {

			if ( domElement.children && 1 === domElement.children.length ) {
				if ( domElement.firstChild.firstChild ) {
					if ( domElement.firstChild.classList.contains( 'fluidvids' ) && 'IFRAME' === domElement.firstChild.firstChild.tagName ) {
						domElement.replaceChild( domElement.firstChild.firstChild, domElement.firstChild );
						domElement.firstChild.classList.remove( 'fluidvids-item' );
						domElement.firstChild.removeAttribute( 'data-fluidvids' );
					}
				}
			}

			if ( domElement.children && 1 === domElement.children.length && 'IFRAME' === domElement.firstChild.tagName ) {
				return new ContentEdit.IFrame( domElement.tagName, this.getDOMElementAttributes( domElement ), domElement.innerHTML );
			}
		}
		return proxied.call( this, domElement );
	};
} )();

/****************************************************************
 * Checks the contents of the element then converts URLs
 * into oiframe elements.
 ****************************************************************/
ContentEdit.Text.prototype.convertIFrameTags = function() {

	var text;

	if ( this.content.isWhitespace() ) {
		return;
	}

	// Get the content
	text = this.content.text();

	if ( ! text ) {
		return;
	}

	text = text.trim();
	if ( ! text ) {
		return;
	}

	if ( ! text.match( /^\s*<iframe.*/ ) ) {
		return;
	}

	ContentEdit.IFrame.convertTextToIFrame( text, this );
};

// On text element blur.
( function() {
	var ready = function() {
		ContentEdit.Root.get().bind( 'blur', function( element ) {
			if ( 'Text' === element.constructor.name ) {
				element.convertIFrameTags();
			}
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

// Saving WHILE shortcodes are being edited get an error, blur the text before being able to save to prevent this.
( function() {
	var ready = function() {
		if ( document.querySelector( '#wpadminbar' ) ) {
			document.querySelector( '#wpadminbar' ).addEventListener( 'mouseover', function() {
				var root = ContentEdit.Root.get();
				var focused = root.focused();
				if ( focused ) {
					if ( 'Text' === focused.constructor.name ) {
						if ( focused.content ) {

							// Only do this for iframes.
							if ( focused.content.text().match( /^\s*<iframe.*/ ) ) {
								focused.blur();
							}
						}
					}
				}
			} );
		}
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

// When hitting return.
( function() {
	var proxied = ContentEdit.Text.prototype._keyReturn;
	ContentEdit.Text.prototype._keyReturn = function( ev ) {
		if ( this.isIframeEditing ) {
			this.blur();
			return;
		}
		return proxied.call( this, ev );
	};
} )();

/* globals ContentEdit, ContentSelect, pbsSelectorMatches, __extends, PBSEditor, ContentTools, HTMLString */

/**
 * Divs
 */
ContentEdit.Div = ( function( _super ) {
	__extends( Div, _super );

	function Div( tagName, attributes ) {
		Div.__super__.constructor.call( this, tagName, attributes );
	}

	Div.prototype.cssTypeName = function() {
		return 'div';
	};
	Div.prototype.type = function() {
		return 'Div';
	};
	Div.prototype.typeName = function() {
		return 'Div';
	};

    Div.prototype._onMouseUp = function( ev ) {

		// Only do the event if we are the target, this is so that we won't bubble to other divs.
		if ( ev.target !== this._domElement ) {
			return;
		}

		Div.__super__._onMouseUp.call( this, ev );
		clearTimeout( this._dragTimeout );

		clearTimeout( this._doubleClickTimeout );
		this._doubleClickTimeout = setTimeout( ( function( _this ) {
			return function() {
				_this._doubleClickCount = 0;
			};
		} )( this ), 500 );
		this._doubleClickCount++;
	};

    Div.prototype._onMouseOut = function( ev ) {
		Div.__super__._onMouseOut.call( this, ev );
		clearTimeout( this._dragTimeout );

		this._doubleClickCount = 0;
		clearTimeout( this._dragTimeout );
	};

    Div.prototype._onMouseDown = function( ev ) {

		// Only do the event if we are the target, this is so that we won't bubble to other divs.
		if ( ev.target !== this._domElement ) {
			return;
		}

		Div.__super__._onMouseDown.call( this, ev );
		clearTimeout( this._dragTimeout );
		if ( this.domElement() !== ev.target ) {
			return;
		}

		// This fixes dragging in Firefox.
		ev.preventDefault();

		this._dragTimeout = setTimeout( ( function( _this ) {
			return function() {
				return _this.drag( ev.pageX, ev.pageY );
			};
		} )( this ), ContentEdit.DRAG_HOLD_DURATION );

		clearTimeout( this._doubleClickTimeout );
		this._doubleClickTimeout = setTimeout( ( function( _this ) {
			return function() {
				_this._doubleClickCount = 0;
			};
		} )( this ), 500 );
		this._doubleClickCount++;

		// Call the _onDoubleClick handler if there is one.
		if ( 3 === this._doubleClickCount ) {
			clearTimeout( this._dragTimeout );
			this._doubleClickCount = 0;
			if ( 'function' === typeof this._onDoubleClick ) {
				if ( this._onDoubleClick ) {
					this._onDoubleClick( ev );
				}
			}
		}
    };

	Div.prototype._onMouseOver = function( ev ) {

		// Only do the event if we are the target, this is so that we won't bubble to other divs.
		if ( ev.target !== this._domElement ) {
			return;
		}

		Div.__super__._onMouseOver.call( this, ev );
	};

    Div.prototype._onMouseMove = function( ev ) {
		this._doubleClickCount = 0;
		Div.__super__._onMouseMove.call( this, ev );
    };

	Div.prototype.attach = function( component, index ) {
		if ( 2 === this.children.length && 'undefined' !== typeof this.children[0].content && this.children[0].content.isWhitespace() ) {
			this.detach( this.children[0] );
		}
		if ( 2 === this.children.length && 'undefined' !== typeof this.children[1].content && this.children[1].content.isWhitespace() ) {
			this.detach( this.children[1] );
		}

		Div.__super__.attach.call( this, component, index );
	};

	Div.prototype.detach = function( element ) {
		ContentEdit.NodeCollection.prototype.detach.call( this, element );

		// Make sure that we have at least 1 blank line, do not delete the last line.
		// Do this in a small timeout since this can trigger when a drop is cancelled.
		setTimeout( function() {
			if ( 0 === this.children.length ) {
				this.attach( new ContentEdit.Text( 'p' ), 0 );
			}
		}.bind( this ), 1 );
	};

	Div.prototype._onDoubleClick = function() {
		this.inspect();
	};

	Div.prototype.focus = function() {
		var next = this.nextContent();
		if ( next && next.focus ) {
			next.focus();
		}
	};

    Div.prototype.blur = function() {
      var root;
      root = ContentEdit.Root.get();
      if ( this.isFocused() ) {
        this._removeCSSClass( 'ce-element--focused' );
        root._focused = null;
        return root.trigger( 'blur', this );
      }
	  if ( this._domElement && root.focused() ) {
		  if ( root.focused()._domElement ) {
			  if ( this._domElement.contains( root.focused()._domElement ) ) {
				  root.focused().blur();
			  }
		  }
	  }
    };

	Div._dropInside = function( element, target, placement ) {
		var insertIndex = 0;
		if ( 'below' === placement[0] ) {
			insertIndex = target.children.length;
		}
		return target.attach( element, insertIndex );
	};

	Div.droppers = PBSEditor.allDroppers;

	Div._fromDOMElement = function( domElement ) {
		var cls;

		var tagNames = ContentEdit.TagNames.get();
		if ( domElement.getAttribute( 'data-ce-tag' ) ) {
			cls = tagNames.match( domElement.getAttribute( 'data-ce-tag' ) );
		} else if ( domElement.classList.contains( 'pbs-row' ) ) {
			cls = tagNames.match( 'row' );
		} else if ( domElement.classList.contains( 'pbs-col' ) ) {
			cls = tagNames.match( 'column' );
		} else if ( domElement.getAttribute( 'data-shortcode' ) ) {
			cls = tagNames.match( 'shortcode' );
		} else if ( 'DIV' === domElement.tagName ) {

			// Cls = tagNames.match('static');
			return null;
		} else {
			cls = tagNames.match( domElement.tagName );
		}

		return cls.fromDOMElement( domElement );
	};

	Div.fromDOMElement = function( domElement ) {

		var c, childNode, childNodes, list, _i, _len, tagNames, cls;
		var element = this._fromDOMElement( domElement );
		if ( element ) {
			return element;
		}

		list = new this( domElement.tagName, this.getDOMElementAttributes( domElement ) );
		childNodes = ( function() {
	        var _i, _len, _ref, _results;
	        _ref = domElement.childNodes;
	        _results = [];
	        for ( _i = 0, _len = _ref.length; _i < _len; _i++ ) {
				c = _ref[_i];
				_results.push( c );
	        }
			return _results;
		} )();

		tagNames = ContentEdit.TagNames.get();
		for ( _i = 0, _len = childNodes.length; _i < _len; _i++ ) {
			childNode = childNodes[_i];
			if ( 1 !== childNode.nodeType ) {
				continue;
			}

			if ( childNode.getAttribute( 'data-ce-tag' ) ) {
				cls = tagNames.match( childNode.getAttribute( 'data-ce-tag' ) );
			} else {
				cls = tagNames.match( childNode.tagName );
			}

			element = cls.fromDOMElement( childNode );
			if ( element ) {
				list.attach( element );
			}
		}

		// If the column doesn't contain anything, create a single blank paragraph tag
		if ( 0 === list.children.length ) {
			list.attach( new ContentEdit.Text( 'p' ), 0 );
		}
		return list;
	};

	return Div;

} )( ContentEdit.ElementCollection );

ContentEdit.TagNames.get().register( ContentEdit.Div, 'div' );

/**
 * Rows
 */
ContentEdit.DivRow = ( function( _super ) {
	__extends( DivRow, _super );

	function DivRow( tagName, attributes ) {
		DivRow.__super__.constructor.call( this, tagName, attributes );
		this.isCompundElement = true;
	}

	DivRow.prototype.cssTypeName = function() {
		return 'row';
	};
	DivRow.prototype.type = function() {
		return 'DivRow';
	};
	DivRow.prototype.typeName = function() {
		return 'Row';
	};

	// Cancel the drag event on mouse up
	DivRow.prototype._onMouseUp = function( ev ) {
		DivRow.__super__._onMouseUp.call( this, ev );
		clearTimeout( this._dragTimeout );

		// If we fall inside the check for a click between rows, check if
		// we should create an empty paragraph between rows.
		if ( this._checkForBetweenRowClick ) {
			this.testClickBetweenRows( ev );
		}
		clearTimeout( this._betweenRowSelectorTimeout );
	};

    DivRow.prototype._onMouseOut = function( ev ) {
		DivRow.__super__._onMouseOut.call( this, ev );
		clearTimeout( this._dragTimeout );

		// We are no longer checking whether between rows are clicked.
		this._checkForBetweenRowClick = false;
		clearTimeout( this._betweenRowSelectorTimeout );
	};

	DivRow.prototype._onMouseMove = function( ev ) {

		var row;
		var root = ContentEdit.Root.get();

		// We are no longer checking whether between rows are clicked.
		this._checkForBetweenRowClick = false;
		clearTimeout( this._betweenRowSelectorTimeout );

		if ( null !== root._dropTarget ) {

			// Dragging a row inside a column should put it above/below the whole parent row
			if ( 'DivCol' === root._dropTarget.constructor.name && 'DivRow' === root.dragging().constructor.name ) {
				row = root._dropTarget.parent();
				root._dropTarget._onMouseOut( ev );
				row._onOver( ev );
				return;
			}

			// Allow cancelling drag when hovering the currently dragged item.
			if ( ev.target === root.dragging()._domElement ) {
				root._dropTarget._removeCSSClass( 'ce-element--drop' );
		        root._dropTarget._removeCSSClass( 'ce-element--drop-above' );
		        root._dropTarget._removeCSSClass( 'ce-element--drop-below' );
		        root._dropTarget._removeCSSClass( 'ce-element--drop-center' );
		        root._dropTarget._removeCSSClass( 'ce-element--drop-left' );
		        root._dropTarget._removeCSSClass( 'ce-element--drop-right' );
				root._dropTarget = null;
				return;
			}

			// Don't allow rows to be dragged inside themselves
			if ( pbsSelectorMatches( root._dropTarget._domElement, '.ce-element--dragging *' ) ) {
				root._dropTarget._removeCSSClass( 'ce-element--drop' );
		        root._dropTarget._removeCSSClass( 'ce-element--drop-above' );
		        root._dropTarget._removeCSSClass( 'ce-element--drop-below' );
		        root._dropTarget._removeCSSClass( 'ce-element--drop-center' );
		        root._dropTarget._removeCSSClass( 'ce-element--drop-left' );
		        root._dropTarget._removeCSSClass( 'ce-element--drop-right' );
				root._dropTarget = null;
				return;
			}
		}

		DivRow.__super__._onMouseMove.call( this, ev );
		clearTimeout( this._dragTimeout );
	};

	// Allow dragging the column
    DivRow.prototype._onMouseDown = function( ev ) {
		DivRow.__super__._onMouseDown.call( this, ev );
		clearTimeout( this._dragTimeout );

		// Check if between rows is clicked.
		this._checkForBetweenRowClick = true;
		clearTimeout( this._betweenRowSelectorTimeout );
		this._betweenRowSelectorTimeout = setTimeout( function() {
			this._checkForBetweenRowClick = false;
		}.bind( this ), 300 );

		if ( this.domElement() !== ev.target ) {
			return;
		}

		// This fixes dragging in Firefox.
		ev.preventDefault();

		// Return this.drag(ev.pageX, ev.pageY);
		return this._dragTimeout = setTimeout( ( function( _this ) {
			return function() {
				return _this.drag( ev.pageX, ev.pageY );
			};
		} )( this ), ContentEdit.DRAG_HOLD_DURATION );
    };

	// Allow these elements to be dropped around Rows
	DivRow.droppers = PBSEditor.allDroppers;

	// Make sure all rows have the pbs-row class
	DivRow.prototype.mount = function() {
		DivRow.__super__.mount.call( this );
		this.addCSSClass( 'pbs-row' );

		// Full-width rows get busted when mounting, this fixes them.
		if ( window._pbsFixRowWidth ) {
			window._pbsFixRowWidth( this._domElement );
		}
	};

	// Create Row elements from dom elements
	DivRow.fromDOMElement = function( domElement ) {
		var childNode, childNodes, list, _i, _len, tagNames, element;

		list = new this( domElement.tagName, this.getDOMElementAttributes( domElement ) );
		childNodes = domElement.children;

		tagNames = ContentEdit.TagNames.get();
		for ( _i = 0, _len = childNodes.length; _i < _len; _i++ ) {
			childNode = childNodes[_i];
			if ( 1 !== childNode.nodeType ) {
				continue;
			}

			// Only allow div columns to be placed inside rows
			if ( 'div' !== childNode.tagName.toLowerCase()  && ! childNode.classList.contains( 'pbs-col' ) ) {
				continue;
			}

			element = tagNames.match( 'column' ).fromDOMElement( childNode );
			if ( element ) {
				list.attach( element );
			}

		}

		return list;
	};

	// Don't allow focus on rows so that we don't override the focus behavior of columns.
	DivRow.prototype.focus = function() {
		return;
	};

	DivRow.prototype.addNewColumn = function( index ) {

		var existingGap, i, currFlexBasis, col, p;

		if ( 'undefined' === typeof index ) {
			index = this.children.length;
		}

		// If existing columns have a gap, copy it.
		existingGap = this.hasColumnGap();

		// If any columns don't have a flex-basis yet, add one.
		for ( i = 0; i < this.children.length; i++ ) {
			currFlexBasis = this.children[ i ].style( 'flex-basis' );
			if ( ! currFlexBasis || '0px' === currFlexBasis ) {
				this.children[ i ].style( 'flex-basis', ( 100 / ( this.children.length + 1 ) ) + '%' );
			}
		}

		col = new ContentEdit.DivCol( 'div' );
		p = new ContentEdit.Text( 'p', {}, '' );
		col.attach( p );
		this.attach( col, index );

		// Add some default width.
		col.style( 'flex-grow', '1' );
		col.style( 'justify-content', 'center' );
		col.style( 'flex-basis', ( 100 / this.children.length ) + '%' );

		// Apply existing column gap to the new column, or the previous column if adding on the end of the row.
		if ( existingGap && index !== this.children.length - 1 ) {
			col.style( 'margin-right', existingGap );
		} else if ( existingGap ) {
			this.children[ index - 1 ].style( 'margin-right', existingGap );
		}

		return col;
	};

	DivRow.prototype.adjustColumnNumber = function( numColumns ) {

		if ( this.children.length < numColumns ) {
			while ( this.children.length < numColumns ) {
				this.addNewColumn();
			}

		} else if ( this.children.length > numColumns ) {
			while ( this.children.length > numColumns ) {
				this.children[ numColumns ].blurIfFocused();
				this.children[ numColumns - 1 ].merge( this.children[ numColumns ] );
			}
		}
	};

	DivRow.prototype.adjustColumns = function( columnEquation ) {

		var i, denom, grow, nums;
		var highestDenom = 1;
		var arrWidths = columnEquation.replace( /(\s*\+\s*|\s+)/g, ' ' ).split( ' ' );

		this.adjustColumnNumber( arrWidths.length );

		for ( i = 0; i < arrWidths.length; i++ ) {
			if ( arrWidths[i].indexOf( '/' ) !== -1 ) {
				denom = parseInt( arrWidths[i].split( '/' )[1], 10 );
				if ( denom > highestDenom ) {
					highestDenom = denom;
				}
			}
		}

		// Adjust the sizes
		for ( i = 0; i < arrWidths.length; i++ ) {
			grow = 1;
			if ( arrWidths[i].indexOf( '/' ) !== -1 ) {
				nums = arrWidths[i].split( '/' );
				grow = nums[0] / nums[1] * highestDenom;
			} else {
				grow = parseInt( arrWidths[i], 10 );
			}
			this.children[i].style( 'flex-grow', grow );
		}

	};

	DivRow.prototype.clone = function() {

		var clone, newRow, index;

        this.blurIfFocused();
		clone = document.createElement( 'div' );
		clone.innerHTML = this.html();
		newRow = ContentEdit.Div.fromDOMElement( clone.childNodes[0] );
		index = this.parent().children.indexOf( this );
		this.parent().attach( newRow, index + 1 );
		newRow.focus();
		return newRow;
	};

	DivRow.prototype.getColumnEquation = function() {

		var col, colStyle, i, totalGrow = 0;
		var equation = '';

		for ( i = 0; i < this.children.length; i++ ) {
			col = this.children[ i ];
			colStyle = window.getComputedStyle( col._domElement );
			totalGrow += parseFloat( colStyle[ 'flex-grow' ] );
		}

		for ( i = 0; i < this.children.length; i++ ) {
			col = this.children[ i ];
			colStyle = window.getComputedStyle( col._domElement );
			equation += equation ? ' + ' : '';
			equation += parseFloat( colStyle[ 'flex-grow' ] ) + '/' + totalGrow;
		}

		return equation;
	};

	DivRow.prototype.blurIfFocused = function() {

		var currElem;
        var root = ContentEdit.Root.get();
        if ( root.focused() ) {
			currElem = root.focused();
			while ( currElem ) {
				if ( currElem === this ) {
					root.focused().blur();
					return;
				}
				currElem = currElem.parent();
			}
        }
	};

	DivRow.prototype.hasColumnGap = function() {

		var i;
		var existingMargin = '';
		var currMargin = '';

		for ( i = 0; i < this.children.length; i++ ) {
			if ( i < this.children.length - 1 ) {
				if ( '' === currMargin ) {
					currMargin = this.children[ i ]._domElement.style['margin-right'];
					existingMargin = currMargin;
				} else {
					if ( currMargin !== this.children[ i ]._domElement.style['margin-right'] ) {
						existingMargin = '';
					}
				}
			} else {
				if ( '' !== this.children[ i ]._domElement.style['margin-right'] ) {
					existingMargin = '';
				}
			}
		}
		return existingMargin;
	};

	DivRow.prototype.testClickBetweenRows = function( ev ) {

		var clickedOnTop, clickedOnBottom, index, doAddEmpty, otherElement, p;

		// Check if we're clicking on a row.
		if ( ! ev.target._ceElement ) {
			return;
		}
		if ( 'DivCol' !== ev.target._ceElement.constructor.name && 'DivRow' !== ev.target._ceElement.constructor.name ) {
			return;
		}
		if ( 'DivCol' === ev.target._ceElement.constructor.name ) {
			if ( ev.target._ceElement.parent() !== this ) {
				return;
			}
		}
		if ( 'DivRow' === ev.target._ceElement.constructor.name ) {
			if ( ev.target._ceElement !== this ) {
				return;
			}
		}

		// Prevent rows which are inside compound elements.
		if ( 'Region' !== this.parent().constructor.name && 'DivCol' !== this.parent().constructor.name ) {
			return;
		}

		// Check if we clicked near the edge.
		clickedOnTop = false;
		clickedOnBottom = false;
		if ( ev.offsetY < 10 ) {
			clickedOnTop = true;
		} else if ( ev.offsetY > ev.target.offsetHeight - 10 ) {
			clickedOnBottom = true;
		} else {
			return;
		}

		// Add the empty paragraph element if necessary.
		index = this.parent().children.indexOf( this );
		doAddEmpty = true;
		if ( clickedOnTop ) {
			if ( index ) {
				otherElement = this.parent().children[ index - 1 ];
				if ( 'Text' === otherElement.type() ) {
					doAddEmpty = false;
				}
			}
			if ( doAddEmpty ) {
				p = new ContentEdit.Text( 'p', {}, '' );
				this.parent().attach( p, index );
				p.focus();
			}
		} else if ( clickedOnBottom ) {
			if ( index < this.parent().children.length - 1 ) {
				otherElement = this.parent().children[ index + 1 ];
				if ( 'Text' === otherElement.type() ) {
					doAddEmpty = false;
				}
			}
			if ( doAddEmpty ) {
				p = new ContentEdit.Text( 'p', {}, '' );
				this.parent().attach( p, index + 1 );
				p.focus();
			}
		}
	};

	return DivRow;

} )( ContentEdit.ElementCollection );

ContentEdit.TagNames.get().register( ContentEdit.DivRow, 'row' );

/**
 * Columns
 */
ContentEdit.DivCol = ( function( _super ) {
	__extends( DivCol, _super );

	function DivCol( tagName, attributes ) {
		DivCol.__super__.constructor.call( this, tagName, attributes );
	}

	DivCol.prototype.cssTypeName = function() {
		return 'col';
	};

	DivCol.prototype.type = function() {
	  return 'DivCol';
	};

	DivCol.prototype.typeName = function() {
		return 'Column';
	};

	// Cancel the drag event on mouse up
	DivCol.prototype._onMouseUp = function( ev ) {
		DivCol.__super__._onMouseUp.call( this, ev );
		clearTimeout( this._dragTimeout );
	};

    DivCol.prototype._onMouseOut = function( ev ) {
		DivCol.__super__._onMouseOut.call( this, ev );
		clearTimeout( this._dragTimeout );
	};

    DivCol.prototype._onMouseDown = function( ev ) {
		DivCol.__super__._onMouseDown.call( this, ev );

		clearTimeout( this._dragTimeout );
		if ( this.domElement() !== ev.target ) {
			return;
		}

		// This fixes dragging in Firefox.
		ev.preventDefault();

		if ( ! this.draggableParent ) {
			this.draggableParent = this.parent();
		}

		return this._dragTimeout = setTimeout( ( function( _this ) {
			return function() {
				return _this.draggableParent.drag( ev.pageX, ev.pageY );
			};
		} )( this ), ContentEdit.DRAG_HOLD_DURATION );

	};

    DivCol.prototype._onMouseMove = function( ev ) {

		var root, dragging;
		DivCol.__super__._onMouseMove.call( this, ev );
		DivCol.__super__._onMouseOver.call( this, ev );

		clearTimeout( this._dragTimeout );

		root = ContentEdit.Root.get();
		dragging = root.dragging();

		// When dragging into a column, drag over the parent row instead.
		if ( dragging && ev.target === this._domElement ) {

			this._onMouseOut( ev );
			this.parent()._onOver( ev );
			this.parent()._removeCSSClass( 'ce-element--over' );

		} else if ( ev.target !== this._domElement ) {

			this._removeCSSClass( 'ce-element--over' );
		}
	};

	// No longer needed, but keep
	/*
	DivCol._dropColumn = function(element, target, placement) {

		var insertIndex;

		// If the column is dragged above/below a column, create a new row for the column then use that
		// but if the column is alone, bring the whole row to keep the styles.
		if ( target._domElement.classList.contains('pbs-drop-outside-row') ) {

			if ( element.parent().children.length === 1 ) {
				var row = element.parent();
				row.parent().detach( row );

				insertIndex = target.parent().parent().children.indexOf( target.parent() );
				if ( placement[0] === 'below' ) {
					insertIndex++;
				}

				return target.parent().parent().attach( row, insertIndex );

			} else {
				element.parent().detach( element );

				insertIndex = target.parent().parent().children.indexOf( target.parent() );
				if ( placement[0] === 'below' ) {
					insertIndex++;
				}

				var newRow;
				newRow = new ContentEdit.DivRow('div');
				newRow.attach( element );

				return target.parent().parent().attach( newRow, insertIndex );

			}

		} else {

			element.parent().detach(element);
			insertIndex = target.parent().children.indexOf(target);
			if (placement[1] === 'right' || placement[1] === 'center') {
				insertIndex++;
			}
			return target.parent().attach(element, insertIndex);
		}
	};
	*/

	// Not needed anymore, but keep
	/*
	DivCol._dropInsideOrOutside = function( element, target, placement ) {

		var row, insertIndex;

		// When dragging on the top/bottom edge of a column,
		// we'll have this class for dragging to before/after the parent row
		if ( target._domElement.classList.contains('pbs-drop-outside-row') ) {

			row = target.parent();
			element.parent().detach(element);
			insertIndex = row.parent().children.indexOf( row );
			if ( placement[0] === 'below' ) {
				insertIndex++;
			}
			return row.parent().attach( element, insertIndex );

		} else if ( element.constructor.name === 'DivCol' && target.constructor.name !== 'DivCol' ) {

			if ( element.parent().children.length === 1 ) {
				row = element.parent();
				row.parent().detach( row );

				insertIndex = target.parent().children.indexOf( target );
				if ( placement[0] === 'below' ) {
					insertIndex++;
				}

				return target.parent().attach( row, insertIndex );

			} else {
				element.parent().detach( element );

				insertIndex = target.parent().children.indexOf( target );
				if ( placement[0] === 'below' ) {
					insertIndex++;
				}

				var newRow;
				newRow = new ContentEdit.DivRow('div');
				newRow.attach( element );

				return target.parent().attach( newRow, insertIndex );
			}



		} else {
			return ContentEdit.Div._dropInside( element, target, placement );
		}
	};
	*/

	// Allow pressing tab / shift+tab to move between columns.
	DivCol.prototype._onKeyDown = function( ev ) {

		var index, parent;

		DivCol.__super__._onMouseDown.call( this, ev );

		// Add new column.
		if ( 190 === ev.keyCode && ( ev.metaKey || ev.ctrlKey ) && ev.shiftKey ) {
			index = this.parent().children.indexOf( this );
			this.blurIfFocused();
			this.parent().addNewColumn( index + 1 ).focus();
			ev.preventDefault();
			return;
		}

		// Delete column.
		if ( 188 === ev.keyCode && ( ev.metaKey || ev.ctrlKey ) && ev.shiftKey ) {
			index = this.parent().children.indexOf( this );
			this.blurIfFocused();
			parent = this.parent();
			parent.detach( this );
			if ( index > 0 && parent && parent.children.length ) {
				index--;
			}
			if ( parent && parent.children.length ) {
				parent.children[ index ].focus();
			}
			ev.preventDefault();
			return;
		}

		// Don't do this for lists & tables.
		if ( ev.target._ceElement ) {
			if ( ev.target._ceElement.constructor.name.toLowerCase().indexOf( 'list' ) !== -1 ) {
				return;
			} else if ( ev.target._ceElement.constructor.name.toLowerCase().indexOf( 'table' ) !== -1 ) {
				return;
			}
		}

		// Check if tab is pressed.
		if ( 9 === ev.keyCode ) {
			if ( ! ev.shiftKey && this.nextSibling() ) {
				this.nextSibling().focus();

				// Don't propagate to nested columns.
				ev.stopPropagation();
			} else if ( ev.shiftKey && this.previousSibling() ) {
				this.previousSibling().focus();

				// Don't propagate to nested columns.
				ev.stopPropagation();
			}

		}

	};

	DivCol.droppers = {};

	DivCol.prototype.attach = function( component, index ) {
		DivCol.__super__.attach.call( this, component, index );

		setTimeout( function() {
			this.cleanEmptyParagraphs();
		}.bind( this ), 10 );
	};

	DivCol.prototype.cleanEmptyParagraphs = function() {

		var i;
		var numEmpties = 0;
		var numNonEmpties = 0;

		if ( ! this.isMounted() ) {
			return;
		}

		// Check how many empty paragraphs are there.
		for ( i = this.children.length - 1; i >= 0; i-- ) {
			if ( 'undefined' !== typeof this.children[i].content ) {
				if ( this.children[i].content.isWhitespace() ) {
					numEmpties++;
					continue;
				}
			}
			numNonEmpties++;
		}

		// Remove empty paragraph tags, retain one.
		if ( numEmpties > 1 ) {
			for ( i = 0; i < this.children.length; i++ ) {
				if ( 'undefined' !== typeof this.children[i].content ) {
					if ( this.children[i].content.isWhitespace() && ! this.children[i].isFocused() ) {
						if ( numEmpties > 1 && 0 === numNonEmpties ) {
							this.detach( this.children[i] );
							numEmpties--;
						} else {
							this.detach( this.children[i] );
						}
						i--;
					}
				}
			}
		}

		// Remove all empties.
		if ( numEmpties && numNonEmpties ) {
			for ( i = 0; i < this.children.length; i++ ) {
				if ( 'undefined' !== typeof this.children[i].content ) {
					if ( this.children[i].content.isWhitespace() && ! this.children[i].isFocused() ) {
						this.detach( this.children[i] );
						i--;
					}
				}
			}
		}
	};

	DivCol.prototype.mount = function() {
		DivCol.__super__.mount.call( this );

		// Make sure columns have a .pbs-col class
		this.addCSSClass( 'pbs-col' );

		this.cleanEmptyParagraphs();
	};

	DivCol.prototype.merge = function( element ) {

		var i;

		// Append the other column's content
		var len = element.children.length;
		for ( i = 0; i < len; i++ ) {
			this.attach( element.children[0] );
		}

		// Remove the old column
		element.parent().detach( element );

		// Clean out the empty elements
		len = this.children.length;
		for ( i = len - 1; i >= 0; i-- ) {
			if ( this.children[i].content ) {
				if ( this.children[i].content.isWhitespace() ) {
					this.detach( this.children[i] );
				}
			}
		}

		return this.taint();
    };

	DivCol.fromDOMElement = function( domElement ) {
		var c, childNode, childNodes, list, _i, _len, tagNames, cls, element;
		list = new this( domElement.tagName, this.getDOMElementAttributes( domElement ) );
		childNodes = ( function() {
	        var _i, _len, _ref, _results;
	        _ref = domElement.childNodes;
	        _results = [];
	        for ( _i = 0, _len = _ref.length; _i < _len; _i++ ) {
				c = _ref[_i];
				_results.push( c );
	        }
			return _results;
		} )();

		tagNames = ContentEdit.TagNames.get();
		for ( _i = 0, _len = childNodes.length; _i < _len; _i++ ) {
			childNode = childNodes[_i];
			if ( 1 !== childNode.nodeType ) {
				continue;
			}

			if ( childNode.getAttribute( 'data-ce-tag' ) ) {
				cls = tagNames.match( childNode.getAttribute( 'data-ce-tag' ) );
			} else {
				cls = tagNames.match( childNode.tagName );
			}

			element = cls.fromDOMElement( childNode );
			if ( element ) {
				list.attach( element );
			}
		}

		// If the column doesn't contain anything, create a single blank paragraph tag
		if ( 0 === list.children.length ) {
			list.attach( new ContentEdit.Text( 'p' ), 0 );
		}
		return list;
	};

	DivCol.prototype.focus = function() {
		var next = this.nextContent();
		if ( next && next.focus ) {
			next.focus();
		}
	};

	DivCol.prototype.clone = function() {

		var clone, newCol, index;
		var existingGap = this.parent().hasColumnGap();

		this.blurIfFocused();
		clone = document.createElement( 'div' );
		clone.innerHTML = this.html();
		newCol = ContentEdit.Div.fromDOMElement( clone.childNodes[0] );
		index = this.parent().children.indexOf( this );
		this.parent().attach( newCol, index + 1 );
		newCol.focus();

		// Remove existing column gap in the original column if there is one.
		if ( existingGap && this.style( 'margin-right' ) !== existingGap ) {
			this.style( 'margin-right', existingGap );
		}

		return newCol;
	};

	DivCol.prototype.blurIfFocused = function() {
		var currElem;
        var root = ContentEdit.Root.get();
        if ( root.focused() ) {
			currElem = root.focused();
			while ( currElem ) {
				if ( currElem === this ) {
					root.focused().blur();
					return;
				}
				currElem = currElem.parent();
			}
        }
	};

	return DivCol;

} )( ContentEdit.Div );

ContentEdit.TagNames.get().register( ContentEdit.DivCol, 'column' );

/**
 * Remove empty elements inside columns upon drop
 */
ContentEdit.Root.get().bind( 'drop', function( element, droppedElement ) {

	var col, i;

	if ( null === droppedElement ) {
		return;
	}
	if ( null === droppedElement.parent() ) {
		return;
	}

	if ( 'DivCol' === droppedElement.parent().constructor.name || 'Div' === droppedElement.parent().constructor.name ) {
		col = droppedElement.parent();
		for ( i = 0; i < col.children.length; i++ ) {
			if ( null === col.children[i].content || 'undefined' === typeof col.children[i].content ) {
				continue;
			}
			if ( col.children.length > 1 && col.children[i].content.isWhitespace() && col.children[i] !== element ) {
				col.detach( col.children[i] );
			}
		}

	} else if ( 'DivRow' === droppedElement.parent().constructor.name ) {
		col = droppedElement;
		for ( i = 0; i < col.children.length; i++ ) {
			if ( null === col.children[i].content || 'undefined' === typeof col.children[i].content ) {
				continue;
			}
			if ( col.children.length > 1 && col.children[i].content.isWhitespace() && col.children[i] !== element ) {
				col.detach( col.children[i] );
			}
		}
	}
} );

/**
 * Remove full-width attribute and styles when a Row becomes nested.
 */
ContentEdit.Root.get().bind( 'drop', function( element, droppedElement ) {
	if ( null === droppedElement ) {
		return;
	}
	if ( null === droppedElement.parent() ) {
		return;
	}

	if ( 'DivRow' === element.constructor.name ) {
		if ( 'Div' === element.parent().constructor.name || 'DivCol' === element.parent().constructor.name ) {

			if ( element.attr( 'data-width' ) ) {

				element.style( 'margin-right', '' );
				element.style( 'margin-left', '' );

				if ( 'full-width-retain-content' === element.attr( 'data-width' ) ) {
					element.style( 'padding-right', '' );
					element.style( 'padding-left', '' );
				}

				// Remove the width if nested.
				element.removeAttr( 'data-width' );
			}
		}
	}
} );

/**
 * When pressing the return key at the end of a div, create a new paragraph outside the div
 */

// (function() {
// 	var proxied = ContentEdit.Text.prototype._keyReturn;
// 	ContentEdit.Text.prototype._keyReturn = function(ev) {
// 		ev.preventDefault();
//
// 		If ( ! this.content.isWhitespace() ) {
// 			return proxied.call( this, ev );
// 		}
//
// 		If ( ( this.parent().constructor.name === 'DivCol' || this.parent().constructor.name === 'Div' ) && this.parent().children.indexOf(this) === this.parent().children.length - 1 ) {
//
// 			Var row = this.parent().parent();
// 			this.parent().detach(this);
// 			var index = row.parent().children.indexOf(row) + 1;
// 			var p = new ContentEdit.Text('p', {}, '');
// 			row.parent().attach(p, index );
// 			p.focus();
// 			return;
// 		}
//
// 		Return proxied.call( this, ev );
// 	};
// })();

/**
 * Don't triger an empty text dettach if the text is.
 */
( function() {
	var proxied = ContentEdit.Text.prototype.blur;
	ContentEdit.Text.prototype.blur = function( ev ) {

		var otherWhitespaces, otherNonWhitespaces, i, sibling, error;

		if ( this.content.isWhitespace() ) {
			if ( this.parent() ) {
				if ( 'Div' === this.parent().constructor.name || 'DivCol' === this.parent().constructor.name ) {
					otherWhitespaces = 0;
					otherNonWhitespaces = 0;
					for ( i = 0; i < this.parent().children.length; i++ ) {
						sibling = this.parent().children[ i ];
						if ( sibling.content ) {
							if ( sibling.content.isWhitespace() ) {
								otherWhitespaces++;
								continue;
							}
						}
						otherNonWhitespaces++;
					}
					if ( 1 === otherWhitespaces && 0 === otherNonWhitespaces ) {
						if ( this.isMounted() ) {
							this._syncContent();
						}
						if ( this.isMounted() ) {
							try {
								this._domElement.blur();
							} catch ( _error ) {
								error = _error;
							}
							this._domElement.removeAttribute( 'contenteditable' );
						}
						return ContentEdit.Text.__super__.blur.call( this );
					}
				}
			}
		}
		return proxied.call( this, ev );
	};
} )();

/**
 * When dragging a column on an element inside it, remove the effects to make it look like
 * nothing's happening.
 */

// ContentEdit.Element.prototype._onColOverrideMouseOver = ContentEdit.Element.prototype._onMouseOver;
// ContentEdit.Element.prototype._onMouseOver = function(ev) {
// 	var ret = this._onColOverrideMouseOver(ev);
//
// 	Var root = ContentEdit.Root.get();
// 	var dragging = root.dragging();
//
// 	If ( dragging ) {
// 		if ( dragging.constructor.name === 'DivCol' ) {
// 			if ( pbsSelectorMatches( ev.target, '.ce-element--dragging *' ) ) {
// 				var over = document.querySelector('.ce-element--over');
// 				if ( over ) {
// 			        over._ceElement._removeCSSClass('ce-element--over');
// 					dragging._addCSSClass('ce-element--over');
// 				}
// 			}
// 		}
// 	}
//
// 	Return ret;
// };

// Remove the computed widths on rows on saving.
wp.hooks.addFilter( 'pbs.save', 'pbs', function( html ) {

	html = html.replace( /(<[^>]+pbs-row[^>]+style=[^>]*[^-])(max-width:\s?[-0-9.\w]+;?\s?)([^>]+>)/g, '$1$3' );
	html = html.replace( /(<[^>]+pbs-row[^>]+style\=[^>]*[^-])(width:\s?[-0-9.\w]+;?\s?)([^>]+>)/g, '$1$3' );
	html = html.replace( /(<[^>]+pbs-row[^>]+style=[^>]*[^-])(left:\s?[-0-9.\w]+;?\s?)([^>]+>)/g, '$1$3' );

	// Remove spaces surrounding divs.
	html = html.replace( /(<div[^>]+>)\s+/gm, '$1' );
	html = html.replace( /\s+(<\/div>)/gm, '$1' );

	// For full-width-retain-content,
	// Don't save left/right paddings & margins since those will be computed by the full-width script.
	html = html.replace( /<[^>]+pbs-row[^>]+data-width\=["']full-width-retain-content["'][^>]+>/g,
		function( match ) {
			match = match.replace( /(padding:\s?)([\d\w.]+)\s([\d\w.]+)\s([\d\w.]+)\s([\d\w.]+)[;"']/, 'padding-top: $2; padding-bottom: $4;' );
			match = match.replace( /(padding:\s?)([\d\w.]+)\s([\d\w.]+)\s([\d\w.]+)[;"']/, 'padding-top: $2; padding-bottom: $4;' );
			match = match.replace( /(padding:\s?)([\d\w.]+)\s([\d\w.]+)[;"']/, 'padding-top: $2; padding-bottom: $2;' );
			match = match.replace( /(padding:\s?)([\d\w.]+)[;"']/, 'padding-top: $2; padding-bottom: $2;' );

			match = match.replace( /\s?padding-left:\s?[\d\w.]+;?\s?/g, '' );
			match = match.replace( /\s?padding-right:\s?[\d\w.]+;?\s?/g, '' );

			match = match.replace( /(margin:\s?)([\d\w.]+)\s([\d\w.]+)\s([\d\w.]+)\s([\d\w.]+)[;"']/, 'margin-top: $2; margin-bottom: $4;' );
			match = match.replace( /(margin:\s?)([\d\w.]+)\s([\d\w.]+)\s([\d\w.]+)[;"']/, 'margin-top: $2; margin-bottom: $4;' );
			match = match.replace( /(margin:\s?)([\d\w.]+)\s([\d\w.]+)[;"']/, 'margin-top: $2; margin-bottom: $2;' );
			match = match.replace( /(margin:\s?)([\d\w.]+)[;"']/, 'margin-top: $2; margin-bottom: $2;' );

			match = match.replace( /\s?margin-left:\s?[\d\w.-]+;?\s?/g, '' );
			match = match.replace( /\s?margin-right:\s?[\d\w.-]+;?\s?/g, '' );

			match = match.replace( /([^-])left:\s?[-\d\w.]+;?\s?/g, '$1' );
			return match;
		}
	);

	// For full-width,
	// Don't save left/right margins since those will be computed by the full-width script.
	html = html.replace( /<[^>]+pbs-row[^>]+data-width\=["']full-width["'][^>]+>/g,
		function( match ) {
			match = match.replace( /(margin:\s?)([\d\w.]+)\s([\d\w.]+)\s([\d\w.]+)\s([\d\w.]+)[;"']/, 'margin-top: $2; margin-bottom: $4;' );
			match = match.replace( /(margin:\s?)([\d\w.]+)\s([\d\w.]+)\s([\d\w.]+)[;"']/, 'margin-top: $2; margin-bottom: $4;' );
			match = match.replace( /(margin:\s?)([\d\w.]+)\s([\d\w.]+)[;"']/, 'margin-top: $2; margin-bottom: $2;' );
			match = match.replace( /(margin:\s?)([\d\w.]+)[;"']/, 'margin-top: $2; margin-bottom: $2;' );

			match = match.replace( /\s?margin-left:\s?[\d\w.-]+;?\s?/g, '' );
			match = match.replace( /\s?margin-right:\s?[\d\w.-]+;?\s?/g, '' );

			match = match.replace( /([^-])left:\s?[-\d\w.]+;?\s?/g, '$1' );
			return match;
		}
	);

	return html;
} );

/**
 * Fixes issue: When pasting multiple lines of text inside a row, the text gets pasted OUTSIDE the row.
 * Problem: CT checks if the parent is not of type 'Region'
 * Solution: Check also if the parent is a 'DivRow'.
 * Most of this code comes from _EditorApp.prototype.paste
 */
( function() {
	var _EditorApp = ContentTools.EditorApp.getCls();
	var proxied = _EditorApp.prototype.paste;
	_EditorApp.prototype.paste = function( element, clipboardData ) {
		var content, encodeHTML, i, insertAt, insertIn, insertNode, item, lastItem, line, lineLength, lines, type, _i, _len;

		content = clipboardData;
        lines = content.split( '\n' );
        lines = lines.filter( function( line ) {
			return '' !== line.trim();
        } );
        if ( ! lines ) {
			return proxied.call( this, element, clipboardData );
        }
		encodeHTML = HTMLString.String.encode;
        type = element.type();
		if ( 'PreText' === type || 'ListItemText' === type || 'DivRow' !== element.parent().type() ) {
			return proxied.call( this, element, clipboardData );
		}

		// We're sure that the element is inside a Row.
		if ( lines.length > 1 || ! element.content ) {
            insertNode = element;
			insertIn = insertNode.parent();
			insertAt = insertIn.children.indexOf( insertNode ) + 1;
			for ( i = _i = 0, _len = lines.length; _i < _len; i = ++_i ) {
				line = lines[i];
				line = encodeHTML( line );
				item = new ContentEdit.Text( 'p', {}, line );
				lastItem = item;
				insertIn.attach( item, insertAt + i );
			}
			lineLength = lastItem.content.length();
			lastItem.focus();
			return lastItem.selection( new ContentSelect.Range( lineLength, lineLength ) );
		}
		return proxied.call( this, element, clipboardData );
	};
} )();

/* global ContentEdit, ContentTools */

// Remove parallax when CT is starting.
( function() {
	var proxy = ContentEdit.DivRow.fromDOMElement;
	ContentEdit.DivRow.fromDOMElement = function( domElement ) {
		window.pbsDestroyParallax( domElement );
		return proxy.call( this, domElement );
	};
} )();

// Recreate parallax when mounting.
( function() {
	var proxy = ContentEdit.DivRow.prototype.mount;
	ContentEdit.DivRow.prototype.mount = function() {
		var ret = proxy.call( this );
		window.pbsInitParallax( this._domElement );
		return ret;
	};
} )();

( function() {
	var ready = function() {
		var editor = ContentTools.EditorApp.get();

		// When something is detached update all parallax.
		ContentEdit.Root.get().bind( 'detach', function() {
			window.pbsUpdateParallax();
		} );

		// When editing stops, re-init all parallax (they would be surely removed).
		editor.bind( 'stop', function() {
			window.pbsInitAllParallax();
		} );

		// When an option is changed, update all parallax.
		wp.hooks.addAction( 'pbs.option.changed', 'pbs.option', function() {
			window.pbsInitAllParallax();
		} );

		// When resizing the row, update the parallax.
		wp.hooks.addAction( 'pbs.overlay.row.move', 'pbs.overlay', function() {
			window.pbsUpdateParallax();
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * Editor functions for video backgrounds for rows.
 */

/* global ContentEdit, ContentTools */

// Remove parallax when CT is starting.
( function() {
	var proxy = ContentEdit.DivRow.fromDOMElement;
	ContentEdit.DivRow.fromDOMElement = function( domElement ) {
		window.pbsDestroyVideoBG( domElement );
		return proxy.call( this, domElement );
	};
} )();

// Recreate parallax when mounting.
( function() {
	var proxy = ContentEdit.DivRow.prototype.mount;
	ContentEdit.DivRow.prototype.mount = function() {
		var ret = proxy.call( this );
		window.pbsInitVideoBG( this._domElement );
		return ret;
	};
} )();

( function() {
	var ready = function() {
		var editor = ContentTools.EditorApp.get();

		// When something is detached update all parallax.
		ContentEdit.Root.get().bind( 'detach', function() {
			window.pbsInitAllVideoBGs();
		} );

		// When editing stops, re-init all parallax (they would be surely removed).
		editor.bind( 'stop', function() {
			window.pbsInitAllVideoBGs();
		} );

		// When an option is changed, update all parallax.
		wp.hooks.addAction( 'pbs.option.changed', 'pbs.option', function() {
			window.pbsInitAllVideoBGs();
		} );

		// When resizing the row, update the parallax.
		wp.hooks.addAction( 'pbs.overlay.row.move', 'pbs.overlay', function() {
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
 * Editor functions for video backgrounds for rows.
 */

/* global ContentEdit, ContentTools */

// Remove parallax when CT is starting.
( function() {
	var proxy = ContentEdit.DivRow.fromDOMElement;
	ContentEdit.DivRow.fromDOMElement = function( domElement ) {
		window.pbsDestroyKenBurns( domElement );
		return proxy.call( this, domElement );
	};
} )();

// Recreate parallax when mounting.
( function() {
	var proxy = ContentEdit.DivRow.prototype.mount;
	ContentEdit.DivRow.prototype.mount = function() {
		var ret = proxy.call( this );
		window.pbsInitKenBurns( this._domElement );
		return ret;
	};
} )();

( function() {
	var ready = function() {

		var editor = ContentTools.EditorApp.get();

		// When something is detached update all parallax.
		ContentEdit.Root.get().bind( 'detach', function() {
			window.pbsInitAllKenBurns();
		} );

		// When editing stops, re-init all parallax (they would be surely removed).
		editor.bind( 'stop', function() {
			window.pbsInitAllKenBurns();
		} );

		// When an option is changed, update all parallax.
		wp.hooks.addAction( 'pbs.option.changed', 'pbs.option', function() {
			window.pbsInitAllKenBurns();
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentEdit, __extends, PBSEditor */

ContentEdit.Icon = ( function( _super ) {
	__extends( Icon, _super );

	function Icon( tagName, attributes, content ) {

		if ( ! attributes['data-ce-tag'] ) {
			attributes['data-ce-tag'] = 'icon';
		}
		if ( ! attributes.role ) {
			attributes.role = 'presentation';
		}

		Icon.__super__.constructor.call( this, tagName, attributes );

        this._content = content;
	}

	Icon.prototype.cssTypeName = function() {
		return 'icon';
	};

	Icon.prototype.typeName = function() {
		return 'Icon';
	};

	Icon.create = function( svg ) {
		var elem = document.createElement( 'DIV' );
		elem.style.height = '100px';
		elem.style.width = '100px';
		elem.innerHTML = svg;

		return ContentEdit.IconLabel.fromDOMElement( elem );
	};

    Icon.fromDOMElement = function( domElement ) {
		return new this( domElement.tagName, this.getDOMElementAttributes( domElement ), domElement.innerHTML );
    };

    Icon.droppers = PBSEditor.allDroppers;

	Icon.prototype.mount = function() {
		var ret = Icon.__super__.mount.call( this );

		// Required attributes.
		var svg = this._domElement.querySelector( 'svg' );
		svg.setAttribute( 'xmlns', 'http://www.w3.org/2000/svg' );
		svg.setAttributeNS( 'http://www.w3.org/2000/xmlns/', 'xmlns:xlink', 'http://www.w3.org/1999/xlink' );

		// We need to add a whitespace inside the svg tag or else
		// TinyMCE in the backend will remove the svg.
		// content = content.replace( /\s*\<\/svg>/g, ' </svg>' );
		svg.innerHTML = svg.innerHTML.trim() + ' ';

		this._content = this._domElement.innerHTML;

		return ret;
	};

	Icon.prototype.change = function( svg ) {
		var a = this._domElement.querySelector( 'a' );
		if ( a ) {
			a.innerHTML = svg.outerHTML;
		} else {
			this._domElement.innerHTML = svg.outerHTML;
		}
		this._content = this._domElement.innerHTML;
		this.taint();
	};

	Icon.prototype.blur = function() {
		var root = ContentEdit.Root.get();
		if ( this.isFocused() ) {
			root._focused = null;
			return root.trigger( 'blur', this );
		}
	};

	Icon.prototype.focus = function( supressDOMFocus ) {
		var root = ContentEdit.Root.get();
		if ( this.isFocused() ) {
			return;
		}
		if ( root.focused() ) {
			root.focused().blur();
		}
		root._focused = this;
		if ( this.isMounted() && ! supressDOMFocus ) {
			this.domElement().focus();
		}
		return root.trigger( 'focus', this );
	};

	Icon.droppers = PBSEditor.allDroppers;

	Icon.prototype._onDoubleClick = function() {
		this.inspect();
	};

	Icon.prototype.getLink = function() {
		var a = this._domElement.querySelector( 'a' );
		if ( a ) {
			return {
				url: a.getAttribute( 'href' ),
				target: a.getAttribute( 'target' ) || ''
			};
		}
		return {
			url: '',
			target: ''
		};
	};

	Icon.prototype.setLink = function( url, target ) {
		var a, svg;
		if ( ! url ) {
			this.removeLink();
			return;
		}
		a = this._domElement.querySelector( 'a' );
		if ( a ) {
			a.setAttribute( 'href', url );
			if ( target ) {
				a.setAttribute( 'target', target );
			} else {
				a.removeAttribute( 'target' );
			}
			this._domElement.innerHTML = a.outerHTML;
			this._content = this._domElement.innerHTML;
			this.taint();
		} else {
			a = document.createElement( 'A' );
			a.setAttribute( 'href', url );
			if ( target ) {
				a.setAttribute( 'target', target );
			}
			svg = this._domElement.querySelector( 'svg' );

			// Colorize the SVG if we need to.
			svg.style.fill = '';
			svg.removeAttribute( 'fill' );
			if ( this._domElement.style.fill ) {
				svg.setAttribute( 'fill', this._domElement.style.fill );
			}

			a.appendChild( svg );
			this._domElement.appendChild( a );
			this._content = this._domElement.innerHTML;
			this.taint();
		}
	};

	Icon.prototype.removeLink = function() {
		var svg;
		if ( this._domElement.querySelector( 'a' ) ) {
			svg = this._domElement.querySelector( 'svg' );
			this._domElement.innerHTML = svg.outerHTML;
			this._content = this._domElement.innerHTML;
			this.taint();
		}
	};

	Icon.prototype.removeFills = function() {
		var svgs = this._domElement.querySelectorAll( 'svg' );
		this.style( 'fill', '' );
		Array.prototype.forEach.call( svgs, function( svg ) {
			svg.style.fill = '';
			svg.removeAttribute( 'fill' );
		} );
		this._content = this._domElement.innerHTML;
		this.taint();
	};

	Icon.prototype.setFill = function( fill ) {
		var svgs = this._domElement.querySelectorAll( 'svg' );
		this.style( 'fill', fill );
		Array.prototype.forEach.call( svgs, function( svg ) {
			svg.style.fill = fill;
			svg.setAttribute( 'fill', fill );
		} );
		this._content = this._domElement.innerHTML;
		this.taint();
	};

	return Icon;

} )( ContentEdit.Static );

ContentEdit.TagNames.get().register( ContentEdit.Icon, 'icon' );

/* globals ContentEdit, __extends, PBSEditor, pbsParams */

ContentEdit.Html = ( function( _super ) {
	__extends( Html, _super );

	function Html( tagName, attributes, content ) {
		this.model = new Backbone.Model( {} );

		Html.__super__.constructor.call( this, tagName, attributes );
		this._content = content;
	}

	Html.prototype.openEditor = function() {
		PBSEditor.htmlFrame.open( {
			title: pbsParams.labels.html,
			button: pbsParams.labels.html_frame_button,
			successCallback: function( frameView ) {
				var html = frameView.getHtml();
				this._domElement.innerHTML = html;
				this._content = html;

				// Store the raw html as base64 in this attribute for later editing.
				this.attr( 'data-html', btoa( html ) );

				if ( ! html ) {
					if ( this.nextContent() ) {
						this.nextContent().focus();
					} else if ( this.previousContent() ) {
						this.previousContent().focus();
					}
					this.parent().detach( this );
				}
			}.bind( this ),
			openCallback: function( frameView ) {
				var content = this._content;

				// Use the base64 encoded data-html attribute that stored the raw HTML.
				if ( this.attr( 'data-html' ) ) {
					content = atob( this.attr( 'data-html' ) );
				}

				frameView.setHtml( content );
			}.bind( this )
		} );
	};

	Html.prototype._onDoubleClick = function() {
		this.inspect();
	};

	Html.prototype.cssTypeName = function() {
		return 'html';
	};

	Html.prototype.typeName = function() {
		return 'Html';
	};

    Html.prototype.focus = function( supressDOMFocus ) {
		var root;
		root = ContentEdit.Root.get();
		if ( this.isFocused() ) {
			return;
		}
		if ( root.focused() ) {
			root.focused().blur();
		}
		this._addCSSClass( 'ce-element--focused' );
		root._focused = this;
		if ( this.isMounted() && ! supressDOMFocus ) {
			this.domElement().focus();
		}
		return root.trigger( 'focus', this );
    };

    Html.prototype.blur = function() {
		var root;
		root = ContentEdit.Root.get();
        this._removeCSSClass( 'ce-element--over' );
        this._removeCSSClass( 'ce-element--focused' );
        root._focused = null;
        return root.trigger( 'blur', this );
    };

	Html.prototype._onMouseOver = function( ev ) {
		Html.__super__._onMouseOver.call( this, ev );
		return this._addCSSClass( 'ce-element--over' );
	};

	return Html;

} )( ContentEdit.StaticEditable );

ContentEdit.TagNames.get().register( ContentEdit.Html, 'html' );

/**
 * Widgets are actually just shortcodes.
 */

/* globals pbsParams */

wp.hooks.addFilter( 'pbs.toolbar.shortcode.label', 'pbs.toolbar', function( scBase ) {
	if ( 'pbs_sidebar' === scBase ) {
		return pbsParams.labels.sidebar;
	}
	return scBase;
} );

/* globals ContentEdit, __extends, PBSEditor, ContentTools, google */

ContentEdit.Map = ( function( _super ) {
	__extends( Map, _super );

	function Map( tagName, attributes ) {
		if ( ! attributes['data-ce-tag'] ) {
			attributes['data-ce-tag'] = 'map';
		}

		this.model = new Backbone.Model( {} );

		Map.__super__.constructor.call( this, tagName, attributes );

		this._content = '';
	}

    Map.prototype.blur = function() {
      var root = ContentEdit.Root.get();
      if ( this.isFocused() ) {
		  this._removeCSSClass( 'ce-element--over' );
        this._removeCSSClass( 'ce-element--focused' );
        root._focused = null;
        return root.trigger( 'blur', this );
      }
    };

	Map.prototype._onMouseOver = function( ev ) {
		Map.__super__._onMouseOver.call( this, ev );
		return this._addCSSClass( 'ce-element--over' );
	};

    Map.prototype._onMouseUp = function( ev ) {
		Map.__super__._onMouseUp.call( this, ev );

		this.updateMapData();

		this._removeCSSClass( 'pbs-map-editing' );
		this._dragging = false;
		this._clicked = false;
		clearInterval( this._forceCentered );
    };

	Map.prototype.updateMapData = function() {

		var latlng, center, zoom;

		// If the map didn't load.
		if ( ! this._domElement.map ) {
			return
		}

		if ( ! this._dragging && this._domElement ) {
			latlng = this._domElement.map.getCenter();
			center = latlng.lat().toFixed( 6 ) + ', ' + latlng.lng().toFixed( 6 );

			if ( this.attr( 'data-center' ) !== center ) {
				this.attr( 'data-center', center );
				this.attr( 'data-lat', latlng.lat().toFixed( 6 ) );
				this.attr( 'data-lng', latlng.lng().toFixed( 6 ) );
				this.model.set( 'data-center', center );

				// Move existing markers.
				if ( this._domElement.map.marker ) {
					this._domElement.map.marker.setPosition( this._domElement.map.getCenter() );
				}
			}
		}

		zoom = this._domElement.map.getZoom();
		if ( parseInt( this.attr( 'data-zoom' ), 10 ) !== zoom ) {
			this.attr( 'data-zoom', zoom );
			this.model.trigger( 'change', this.model );
		}

	};

    Map.prototype._onMouseDown = function( ev ) {
		this._clicked = true;
		this.focus();
		clearTimeout( this._dragTimeout );
			return this._dragTimeout = setTimeout( ( function( _this ) {
				return function() {
					_this._dragging = true;
				return _this.drag( ev.pageX, ev.pageY );
			};
		} )( this ), ContentEdit.DRAG_HOLD_DURATION * 2 );
    };

    Map.prototype._onMouseMove = function( ev ) {
		if ( ! this._dragging ) {
			clearTimeout( this._dragTimeout );
		}
		if ( ! this._dragging && this._clicked ) {
			this._addCSSClass( 'pbs-map-editing' );
		}
		Map.__super__._onMouseMove.call( this, ev );

    };

    Map.droppers = PBSEditor.allDroppers;

    Map.prototype.focus = function( supressDOMFocus ) {
		var root;
		root = ContentEdit.Root.get();
		if ( this.isFocused() ) {
			return;
		}
		if ( root.focused() ) {
			root.focused().blur();
		}
		this._addCSSClass( 'ce-element--focused' );
		root._focused = this;
		if ( this.isMounted() && ! supressDOMFocus ) {
			this.domElement().focus();
		}
		return root.trigger( 'focus', this );
    };

	Map.prototype.cssTypeName = function() {
		return 'map';
	};

	Map.prototype.typeName = function() {
		return 'Map';
	};

	Map.prototype.mount = function() {
		var ret = Map.__super__.mount.call( this );

		if ( window.initPBSMaps && 'undefined' !== typeof google ) {
			window.initPBSMaps( this._domElement, function() {

				if ( ! this._domElement.map ) {
					return;
				}

				// Update the map properties when changed.
				google.maps.event.addListener( this._domElement.map, 'zoom_changed', _.throttle( function() {
					this.updateMapData();
				}.bind( this ), 2 ) );
				google.maps.event.addListener( this._domElement.map, 'drag', _.throttle( function() {
					this.updateMapData();
				}.bind( this ), 2 ) );

				// Google Maps overrides the click action, trigger our own double click.
				google.maps.event.addListener( this._domElement.map, 'dblclick', _.throttle( function() {
					this._onDoubleClick();
				}.bind( this ), 2 ) );

				// Disable the some map behavior during editing.
				this._domElement.map.setOptions( {
					scrollwheel: false,
					keyboardShortcuts: false,
					fullscreenControl: false,
					disableDoubleClickZoom: true
				} );

			}.bind( this ) );

		} else {
			this._domElement.classList.add( 'pbs--unavailable' );
		}

		return ret;
	};

	Map.prototype.unmount = function() {
		if ( 'undefined' !== typeof google ) {
			google.maps.event.clearInstanceListeners( this._domElement.map );
		}
		return Map.__super__.unmount.call( this );
	};

	// Creates the base element of the shortcode div.
	// Does not have any contents, need to run `ajaxUpdate` after attaching to update.
	Map.create = function() {

		var o = document.createElement( 'DIV' );
		o.setAttribute( 'data-ce-tag', 'map' );
		o.setAttribute( 'data-ce-moveable', '' );

		return ContentEdit.Map.fromDOMElement( o );
	};

	Map.prototype._onDoubleClick = function() {
		this.inspect();
	};

	return Map;

} )( ContentEdit.Static );

ContentEdit.TagNames.get().register( ContentEdit.Map, 'map' );

( function() {
	var ready = function() {
		var mapRefreshInterval, editor = ContentTools.EditorApp.get();
		if ( window.initPBSMaps ) {

			// When we end editing, the DOM gets rebuilt, we need to re-init the maps.
			editor.bind( 'stop', window.initPBSMaps );
		}

		if ( window.pbsMapsReCenter ) {
			editor.bind( 'start', function() {
				mapRefreshInterval = setInterval( function() {
					if ( document.querySelector( '.ce-element--dragging' ) || document.querySelector( '.pbs-map-editing' ) ) {
						return;
					}
					window.pbsMapsReCenter();
				}, 1000 );
			} );
			editor.bind( 'stop', function() {
				clearInterval( mapRefreshInterval );
			} );
		}
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentEdit, __extends, PBSEditor, ContentTools, ContentSelect */

ContentEdit.Carousel = ( function( _super ) {
	__extends( Carousel, _super );

	function Carousel( tagName, attributes ) {
		Carousel.__super__.constructor.call( this, tagName, attributes );
		this.isCompundElement = true;
	}

	Carousel.prototype.cssTypeName = function() {
		return 'carousel';
	};

	Carousel.prototype.type = function() {
		return 'Carousel';
	};

	Carousel.prototype.typeName = function() {
		return 'Carousel';
	};

	Carousel.fromDOMElement = function( domElement ) {

		var cls, c, childNode, childNodes, list, _i, _len, tagNames, element;

		window.pbsDestroyCarousel( domElement );

		list = new this( domElement.tagName, this.getDOMElementAttributes( domElement ) );
		childNodes = ( function() {
			var _i, _len, _ref, _results;
			_ref = domElement.childNodes;
			_results = [];
			for ( _i = 0, _len = _ref.length; _i < _len; _i++ ) {
				c = _ref[_i];
				_results.push( c );
			}
			return _results;
		} )();

		tagNames = ContentEdit.TagNames.get();
		for ( _i = 0, _len = childNodes.length; _i < _len; _i++ ) {
			childNode = childNodes[_i];
			if ( 1 !== childNode.nodeType ) {
				continue;
			}

			if ( childNode.getAttribute( 'data-ce-tag' ) ) {
				cls = tagNames.match( childNode.getAttribute( 'data-ce-tag' ) );
			} else {
				cls = tagNames.match( childNode.tagName );
			}

			element = cls.fromDOMElement( childNode );
			if ( element ) {
				list.attach( element );
			}
		}

		return list;
	};

	Carousel.prototype.initBackendCarousel = function() {
		window.pbsInitCarousel( this._domElement, {
			easing: 'ease-in-out',
			perPage: 1,
			draggable: false,
			loop: true
		} );
	};

	Carousel.prototype.mount = function() {

		var ret = Carousel.__super__.mount.call( this );

		// Bring back the slider
		if ( window.pbsInitCarousel ) {

			// Convert the old carousel to the new one.
			window.pbsConvertGlideCarouselToSiema( this._domElement );

			// Initialize carousel.
			this.initBackendCarousel();
		}

		return ret;
	};

	Carousel.prototype.unmount = function() {
		window.pbsDestroyCarousel( this._domElement );
		return Carousel.__super__.unmount.call( this );
	};

    Carousel.prototype.blur = function() {
		var root;
		root = ContentEdit.Root.get();
		this._removeCSSClass( 'ce-element--focused' );
		root._focused = null;
		return root.trigger( 'blur', this );
    };

	Carousel.prototype.focus = function() {

        var root = ContentEdit.Root.get();

		// Blur the currently selected element.
        if ( root.focused() ) {
			root.focused().blur();
        }

		this.children[ this._domElement.siema.currentSlide ].children[0].focus();
	};

	Carousel.prototype.getLastVisibleElement = function() {
		var i;
		var allVisibles = this._domElement.querySelectorAll( '.glide__slide.active *' );
		for ( i = allVisibles.length - 1; i >= 0; i-- ) {
			if ( allVisibles[ i ]._ceElement ) {
				return allVisibles[ i ]._ceElement;
			}
		}
		return null;
	};

	Carousel.prototype.getFirstVisibleElement = function() {
		return this._domElement.querySelector( '.glide__slide.active .pbs-col *' )._ceElement;
	};

	Carousel.getCarouselNodeFromChild = function( element ) {
		while ( 'Carousel' !== element.constructor.name && 'Region' !== element.constructor.name ) {
			element = element.parent();
		}
		return 'Carousel' === element.constructor.name ? element : null;
	};

	Carousel.prototype.addSlide = function() {

		var index = this._domElement.siema.currentSlide;
		var row, col, p;

		row = new ContentEdit.DivRow( 'div' );

		col = new ContentEdit.DivCol( 'div' );
		row.attach( col );

		p = new ContentEdit.Text( 'p', {}, '' );
		col.attach( p );

		row.style( 'min-height', '200px' );
		col.style( 'justify-content', 'center' );

		window.pbsDestroyCarousel( this._domElement );
		this.attach( row, index + 1 );
		this.initBackendCarousel();
		this._domElement.siema.goTo( index + 1 );
		this._domElement.setAttribute( 'data-slide', index + 1 );
	};

	Carousel.prototype.removeSlide = function() {

		var index = this._domElement.siema.currentSlide;

		if ( 1 === this._domElement.siema.innerElements.length ) {
			this.remove();
			return;
		}

		window.pbsDestroyCarousel( this._domElement );
		this.detach( this.children[ index ] );
		this.initBackendCarousel();

		index = index - 1 < 0 ? 0 : index - 1;
		this._domElement.siema.goTo( index );
		this._domElement.setAttribute( 'data-slide', index );
	};

	Carousel.prototype.cloneSlide = function() {

		var index = this._domElement.siema.currentSlide;
		var item;

		window.pbsDestroyCarousel( this._domElement );
		item = this.children[ index ].clone();
		this.attach( item, index + 1 );
		this.initBackendCarousel();
		this._domElement.siema.goTo( index + 1 );
		this._domElement.setAttribute( 'data-slide', index + 1 );
	};

	Carousel.prototype.moveSlideLeft = function() {

		var index = this._domElement.siema.currentSlide;
		var item;

		if ( 0 === index ) {
			return;
		}

		window.pbsDestroyCarousel( this._domElement );
		item = this.children[ index ];
		this.detach( item );
		this.attach( item, index - 1 );
		this.initBackendCarousel();
		this._domElement.siema.goTo( index - 1 );
		this._domElement.setAttribute( 'data-slide', index - 1 );
	};

	Carousel.prototype.moveSlideRight = function() {

		var item;
		var index = this._domElement.siema.currentSlide;

		if ( this._domElement.siema.innerElements.length - 1 === index ) {
			return;
		}

		window.pbsDestroyCarousel( this._domElement );
		item = this.children[ index ];
		this.detach( item );
		this.attach( item, index + 1 );
		this.initBackendCarousel();
		this._domElement.siema.goTo( index + 1 );
		this._domElement.setAttribute( 'data-slide', index + 1 );
	};

	Carousel.droppers = PBSEditor.allDroppers;

	return Carousel;

} )( ContentEdit.Div );

ContentEdit.TagNames.get().register( ContentEdit.Carousel, 'carousel' );

( function() {
	var proxied = ContentEdit.DivCol.prototype._onMouseDown;
    ContentEdit.DivCol.prototype._onMouseDown = function( ev ) {
		if ( 'Carousel' === this.parent().parent().constructor.name ) {
			this.draggableParent = this.parent().parent();
		}
		return proxied.call( this, ev );
	};
} )();

( function() {
	var proxiedRow = ContentEdit.DivRow.prototype._onMouseDown;
    ContentEdit.DivRow.prototype._onMouseDown = function( ev ) {
		if ( 'Carousel' === this.parent().constructor.name ) {
			return;
		}
		return proxiedRow.call( this, ev );
	};
} )();

( function() {
	var proxiedCol = ContentEdit.DivCol.prototype._onMouseMove;
    ContentEdit.DivCol.prototype._onMouseMove = function( ev ) {

		var root, dragging, carousel;

		proxiedCol.call( this, ev );

		root = ContentEdit.Root.get();
		dragging = root.dragging();

		if ( null !== root._dropTarget ) {

			// If dropping a stuff on a carousel (not beside on contents), let it drop before/after the carousel.
			if ( 'Carousel' === root._dropTarget.parent().constructor.name ) {
				carousel = root._dropTarget.parent();
				while ( 'Carousel' !== carousel.constructor.name ) {
					carousel = carousel.parent();
				}
				root._dropTarget._onMouseOut( ev );
				carousel._onOver( ev );
				return;
			}

			// If dropping a carousel inside a carousel (even on contents), let it drop before/after the carousel.
			if ( 'Carousel' === root._dropTarget.parent().constructor.name && 'Carousel' === dragging.constructor.name ) {
				carousel = root._dropTarget.parent();
				while ( 'Carousel' !== carousel.constructor.name ) {
					carousel = carousel.parent();
				}
				root._dropTarget._onMouseOut( ev );
				carousel._onOver( ev );
				return;
			}
		}

	};

} )();

// Turn on carousels again when done editing.
( function() {
	var ready = function() {
		var editor = ContentTools.EditorApp.get();

		editor.bind( 'stop', function() {
			if ( window.pbsInitAllCarousels ) {
				window.pbsInitAllCarousels();
			}
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentEdit, __extends, PBSEditor, ContentTools */

ContentEdit.Countdown = ( function( _super ) {
	__extends( Countdown, _super );

	function Countdown( tagName, attributes ) {
		this.model = new Backbone.Model( {} );

		Countdown.__super__.constructor.call( this, tagName, attributes );

		this._content = '';
	}

	Countdown.create = function() {

		var d;
		var o = document.createElement( 'DIV' );
		o.setAttribute( 'data-ce-tag', 'countdown' );
		o.setAttribute( 'data-ce-moveable', '' );

		// By default, the date to countdown to is set to a week from now.
		d = new Date();
		d.setDate( d.getDate() + 7 );
		o.setAttribute( 'data-date', d.getFullYear() + '/' + ( d.getMonth() + 1 ) + '/' + d.getDate() + ' 00:00:00' );

		return ContentEdit.Countdown.fromDOMElement( o );
	};

    Countdown.prototype.blur = function() {
      var root = ContentEdit.Root.get();
      if ( this.isFocused() ) {
        this._removeCSSClass( 'ce-element--focused' );
        root._focused = null;
        return root.trigger( 'blur', this );
      }
    };

    Countdown.droppers = PBSEditor.allDroppers;

	Countdown.prototype.mount = function() {
		var ret = ContentEdit.Countdown.__super__.mount.call( this );
		window.pbsInitCountdown( this._domElement );
		return ret;
	};

    Countdown.prototype.focus = function( supressDOMFocus ) {
      var root;
      root = ContentEdit.Root.get();
      if ( this.isFocused() ) {
        return;
      }
      if ( root.focused() ) {
        root.focused().blur();
      }
      this._addCSSClass( 'ce-element--focused' );
      root._focused = this;
      if ( this.isMounted() && ! supressDOMFocus ) {
        this.domElement().focus();
      }
      return root.trigger( 'focus', this );
    };

	Countdown.prototype.cssTypeName = function() {
		return 'countdown';
	};

	Countdown.prototype.typeName = function() {
		return 'Countdown';
	};

	Countdown.prototype._onDoubleClick = function() {
		this.inspect();
	};

	return Countdown;

} )( ContentEdit.Static );

ContentEdit.TagNames.get().register( ContentEdit.Countdown, 'countdown' );

( function() {
	var ready = function() {

		// When editing stops, re-init all parallax (they would be surely removed).
	    var editor = ContentTools.EditorApp.get();
		editor.bind( 'stop', function() {
			window.pbsInitAllCountdown && window.pbsInitAllCountdown();
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentEdit, __extends, PBSEditor, ContentSelect */

ContentEdit.Tabs = ( function( _super ) {
	__extends( Tabs, _super );

	function Tabs( tagName, attributes ) {
		Tabs.__super__.constructor.call( this, tagName, attributes );
		this.isCompundElement = true;
	}

	Tabs.prototype.cssTypeName = function() {
		return 'tabs';
	};

	Tabs.prototype.type = function() {
		return 'Tabs';
	};

	Tabs.prototype.typeName = function() {
		return 'Tabs';
	};

	Tabs.fromDOMElement = function( domElement ) {

		var c, childNode, childNodes, list, _i, _len, tagNames, cls, element;
		var pInputs = domElement.querySelector( 'p > [data-ce-tag="tabradio"]' );

		// WordPress content editor can wrap the inputs with a paragraph, unwrap it.
		if ( pInputs ) {
			if ( pInputs.parentNode.parentNode === domElement ) {
				pInputs.parentNode.outerHTML = pInputs.parentNode.innerHTML;
			}
		}

		list = new this( domElement.tagName, this.getDOMElementAttributes( domElement ) );
		childNodes = ( function() {
			var _i, _len, _ref, _results;
			_ref = domElement.childNodes;
			_results = [];
			for ( _i = 0, _len = _ref.length; _i < _len; _i++ ) {
				c = _ref[_i];
				_results.push( c );
			}
			return _results;
		} )();

		tagNames = ContentEdit.TagNames.get();
		for ( _i = 0, _len = childNodes.length; _i < _len; _i++ ) {
			childNode = childNodes[_i];
			if ( 1 !== childNode.nodeType ) {
				continue;
			}

			if ( childNode.getAttribute( 'data-ce-tag' ) ) {
				cls = tagNames.match( childNode.getAttribute( 'data-ce-tag' ) );
			} else {
				cls = tagNames.match( childNode.tagName );
			}

			element = cls.fromDOMElement( childNode );
			if ( element ) {
				list.attach( element );
			}
		}

		return list;
	};

	Tabs.prototype.detachTabAndContent = function( tab ) {
		var inputID = tab._domElement.getAttribute( 'for' );
		var inputElem = this._domElement.querySelector( '[id="' + inputID + '"]' )._ceElement;
		var tabID = inputElem.attr( 'data-tab' );
		var tabRow = this._domElement.querySelector( '[data-panel="' + tabID + '"]' )._ceElement;
		inputElem.parent().detach( inputElem );
		tab.parent().detach( tab );
		tabRow.parent().detach( tabRow );
		this.reIndexTabs();
		return tabRow;
	};

	Tabs.prototype.attachTabAndContent = function( tab, index, row ) {
		var tabsID = this._domElement.getAttribute( 'class' ).match( /pbs-tabs-(\w+)/ )[0];

		var radio;
		var tabIndex = this.numTabs() + 1;

		var hash = window.PBSEditor.generateHash();
		while ( document.querySelector( '[id="pbs-tab-' + hash + '"]' ) ) {
			hash = window.PBSEditor.generateHash();
		}

		radio = document.createElement( 'input' );
		radio.classList.add( 'pbs-tab-state' );
		radio.setAttribute( 'type', 'radio' );
		radio.setAttribute( 'name', tabsID );
		radio.setAttribute( 'id', 'pbs-tab-' + hash );
		radio.setAttribute( 'data-tab', tabIndex );
		radio.setAttribute( 'data-ce-tag', 'static' );
		this.attach( ContentEdit.Static.fromDOMElement( radio ), 0 );

		tab.attr( 'for', 'pbs-tab-' + hash );
		row.attr( 'data-panel', tabIndex );

		this._domElement.querySelector( '.pbs-tab-tabs' )._ceElement.attach( tab, index );
		this._domElement.querySelector( '.pbs-tab-panels' )._ceElement.attach( row );

	};

	/**
	 * Fixes the indices of the tabs.
	 * Only works when there is only 1 tab missing.
	 */
	Tabs.prototype.reIndexTabs = function() {
		var i, radio;
		var numTabs = this._domElement.querySelectorAll( '.pbs-tab-state' ).length;
		for ( i = 1; i <= numTabs; i++ ) {
			radio = this._domElement.querySelector( '[data-tab="' + i + '"]' );
			if ( ! radio ) {
				radio = this._domElement.querySelector( '[data-tab="' + ( i + 1 ) + '"]' );
				if ( radio ) {
					radio._ceElement.attr( 'data-tab', i );
					this._domElement.querySelector( '[data-panel="' + ( i + 1 ) + '"]' )._ceElement.attr( 'data-panel', i );
				}
			}
		}
	};

	Tabs.prototype.getOpenTab = function() {
		var radio = this._domElement.querySelector( '.pbs-tab-state:checked' )._ceElement;
		var panel = this._domElement.querySelector( '[data-panel="' + radio.attr( 'data-tab' ) + '"]' );
		if ( ! panel ) {
			panel = this._domElement.querySelector( '[data-panel]' );
		}
		return panel._ceElement;
	};

	Tabs.prototype.numTabs = function() {
		return this._domElement.querySelectorAll( '.pbs-tab-state' ).length;
	};

	Tabs.prototype.addTab = function() {
		var firstTab = this._domElement.querySelector( '.pbs-tab-state' )._ceElement;
		var radioID = 'pbs-tab-' + window.PBSEditor.generateHash();
		var tabNum = this.numTabs() + 1;
		var tab, tabContainer, panelContainer, row, col, p;
		var radio = new ContentEdit.TabRadio( 'input', {
			'data-ce-tag': 'tabradio',
			'class': 'pbs-tab-state',
			'data-tab': tabNum,
			'id': radioID,
			'name': firstTab.attr( 'name' ),
			'type': 'radio'
		} );
		this.attach( radio, 0 );

		tab = new ContentEdit.Tab( 'label', {
			'data-ce-tag': 'tab',
			'for': radioID
		}, '<span>New Tab</span>' );

		tabContainer = this._domElement.querySelector( '.pbs-tab-tabs' )._ceElement;
		tabContainer.attach( tab, tabContainer.children.length );

		// Copy all existing tab styles.
		if ( tabContainer.children.length ) {
			tab.attr( 'style', tabContainer.children[0].attr( 'style' ) );
		}

		panelContainer = this._domElement.querySelector( '.pbs-tab-panels' )._ceElement;
		row = new ContentEdit.DivRow( 'div', {
			'data-panel': tabNum
		} );
		panelContainer.attach( row );

		col = new ContentEdit.DivCol( 'div' );
		row.attach( col );

		p = new ContentEdit.Text( 'p', {}, '' );
		col.attach( p );

		tab.openTab();
		p.focus();
	};

	Tabs.prototype.removeTab = function( tab ) {
		var radio, otherTab, focusTo;

		if ( 'undefined' === typeof tab ) {
			radio = this._domElement.querySelector( '.pbs-tab-state:checked' )._ceElement;
			tab = this._domElement.querySelector( 'label[for="' + radio.attr( 'id' ) + '"]' )._ceElement;
		}

		otherTab = tab.nextSibling();
		if ( ! otherTab ) {
			otherTab = tab.previousSibling();
		}

		this.detachTabAndContent( tab );
		if ( otherTab ) {
			otherTab.openTab();
		} else {
			this.blur();
			focusTo = this.nextSibling();
			if ( ! focusTo ) {
				focusTo = this.previousSibling();
			}
			if ( focusTo ) {
				focusTo.focus();
			}
			this.parent().detach( this );
		}
	};

	Tabs.prototype.mount = function() {
		var ret = Tabs.__super__.mount.call( this );

		// Add a unique ID for the checkbox & label pair.
		var radios = this._domElement.querySelectorAll( '[data-ce-tag="tabradio"]' );
		var newRadioGroupName = 'pbs-tab-' + window.PBSEditor.generateHash();
		Array.prototype.forEach.call( radios, function( el, i ) {
			var radio, radioID, label, newRadioID;

			radio = el._ceElement;
			radioID = radio.attr( 'id' );

			radio.checked = 0 === i;

			if ( ! document.querySelectorAll( '[id="' + radioID + '"]' ).length ) {
				return;
			}

			label = this._domElement.querySelector( '[for="' + radioID + '"]' )._ceElement;
			newRadioID = 'pbs-tab-' + window.PBSEditor.generateHash();

			radio.attr( 'id', newRadioID );
			radio.attr( 'name', newRadioGroupName );
			label.attr( 'for', newRadioID );
		}.bind( this ) );
		if ( radios.length ) {
			radios[0].checked = true;
		}
		return ret;
	};

	Tabs.prototype.clone = function() {
		var newTabs = Tabs.__super__.clone.call( this );

		// After cloning, because we cloned the tabs, we also cloned
		// the checkboxes with the same name. Because of this, the original
		// checkbox status gets lost. Re-check the original checkbox.
		var label = this._domElement.querySelector( '.pbs-tab-active' );
		var id = label.getAttribute( 'for' );
		var radio = this._domElement.querySelector( '[id="' + id + '"]' );
		radio.checked = true;

		return newTabs;
	};

	Tabs.droppers = PBSEditor.allDroppers;

	return Tabs;

} )( ContentEdit.Div );

ContentEdit.TagNames.get().register( ContentEdit.Tabs, 'tabs' );

ContentEdit.Tab = ( function( _super ) {
	__extends( Tab, _super );

	function Tab( tagName, attributes, content ) {
		Tab.__super__.constructor.call( this, tagName, attributes, content );
	}

	Tab.prototype.cssTypeName = function() {
		return 'tab';
	};

	Tab.prototype.type = function() {
		return 'Tab';
	};

	Tab.prototype.typeName = function() {
		return 'Tab';
	};

	Tab.prototype.parentTab = function() {
		return this.parent().parent();
	};

	Tab.prototype.setActiveTab = function() {
		var activeTab = this.parentTab()._domElement.querySelector( '.pbs-tab-tabs .pbs-tab-active' );
		if ( activeTab ) {
			activeTab._ceElement.removeCSSClass( 'pbs-tab-active' );
		}
		this.addCSSClass( 'pbs-tab-active' );
	};

	Tab.prototype._onMouseDown = function( ev ) {
		setTimeout( function() {
			this.setActiveTab();
		}.bind( this ), 1 );
		ev.stopPropagation();
		return Tab.__super__._onMouseDown.call( this, ev );
	};

	Tab.prototype.openTab = function() {
		this.parentTab()._domElement.querySelector( '[id="' + this.attr( 'for' ) + '"]' ).checked = true;
		this.setActiveTab();
	};

	Tab._dropTab = function( element, target, placement ) {

		var originalTabElement, otherTab, tabRow;

		var insertIndex = target.parent().children.indexOf( target );
		if ( 'left' !== placement[1] ) {
			insertIndex += 1;
		}

		// Different handling if the tab is dropped into another set of tabs.
		if ( element.parent() !== target.parent() ) {

			originalTabElement = element.parentTab();

			// Get the closest tab.
			otherTab = element.previousSibling();
			if ( ! otherTab ) {
				otherTab = element.nextSibling();
			}

			tabRow = element.parentTab().detachTabAndContent( element );

			target.parentTab().attachTabAndContent( element, insertIndex, tabRow );
			element.openTab();

			// Open the other tab since a tab was removed.
			if ( otherTab ) {
				otherTab.openTab();
			} else {

				// If there are no more tabs, just remove the whole thing.
				originalTabElement.parent().detach( originalTabElement );
			}

			return;
		}

		element.parent().detach( element );
		return target.parent().attach( element, insertIndex );
	};

	Tab.prototype._onMouseOver = function( ev ) {
		var root = ContentEdit.Root.get();
		if ( root.dragging() ) {
			this.openTab();
		}
		return Tab.__super__._onMouseOver.call( this, ev );
	};

	Tab.droppers = {
		'Tab': Tab._dropTab
	};

	Tab.placements = [ 'left', 'right' ];

	// If a tab is focused, check the matching radio button since they are all disabled.
	Tab.prototype.focus = function() {
		this.openTab();
		return Tab.__super__.focus.call( this );
	};

	Tab.prototype._keyReturn = function( ev ) {
		var next;
		ev.preventDefault();
		next = this.nextSibling();
		if ( next ) {
			next.focus();
		}
	};

	Tab.prototype.isLastTab = function() {
		return this.parent().children.indexOf( this ) === this.parent().children.length - 1;
	};

	//
	Tab.prototype.getMatchingPanel = function() {
		var inputID = this.attr( 'for' );
		var inputElem = this.parentTab()._domElement.querySelector( '[id="' + inputID + '"]' )._ceElement;
		var tabID = inputElem.attr( 'data-tab' );
		return this.parentTab()._domElement.querySelector( '[data-panel="' + tabID + '"]' )._ceElement;
	};

	/**
	 * Make sure the saved HTML has the first tab active.
	 */
	Tab.prototype.html = function() {
		var r;
		var ret = Tab.__super__.html.call( this );
		if ( 0 === this.parent().children.indexOf( this ) ) {
			if ( ! ret.match( /pbs-tab-active/ ) ) {
				r = new RegExp( '(<' + this._tagName + '[^>]+class=[\'"])' );
				if ( ret.match( r ) ) {
					ret = ret.replace( r, '$1pbs-tab-active ' );
				} else {
					r = new RegExp( '(<' + this._tagName + ')' );
					ret = ret.replace( r, '$1 class="pbs-tab-active"' );
				}
			}
		} else {
			ret = ret.replace( /\s*pbs-tab-active\s*/g, '' );
			ret = ret.replace( /\s*class=[\'\"][\'\"]/g, '' );
		}
		return ret;
	};

	Tab.prototype._keyLeft = function( ev ) {
		var selection;
		if ( 0 === this.parent().children.indexOf( this ) ) {
			selection = ContentSelect.Range.query( this._domElement );
			if ( 0 === selection.get()[0] && selection.isCollapsed() ) {
				this._keyUp( ev );
			}
		}
		return Tab.__super__._keyLeft.call( this, ev );
	};

	Tab.prototype._keyUp = function( ev ) {
		var selection, tabs, index, elem, p;
		if ( 0 === this.parent().children.indexOf( this ) ) {
			selection = ContentSelect.Range.query( this._domElement );
			if ( 0 === selection.get()[0] && selection.isCollapsed() ) {

				tabs = this.parent().parent();
				index = tabs.parent().children.indexOf( tabs );
				if ( index > 0 ) {
					if ( tabs.parent().children[ index - 1 ].content ) {
						elem = tabs.parent().children[ index - 1 ];
						elem.focus();

						selection = new ContentSelect.Range( elem.content.length(), elem.content.length() );
						return selection.select( elem.domElement() );
					}
				}
				p = new ContentEdit.Text( 'p', {}, '' );
				tabs.parent().attach( p, index );
				p.focus();
			}
		}
		return Tab.__super__._keyUp.call( this, ev );
	};

	Tab.prototype._keyDown = function( ev ) {

		var selection, row;

		if ( this.parent().children.indexOf( this ) === this.parent().children.length - 1 ) {
			selection = ContentSelect.Range.query( this._domElement );
			if ( ! ( this._atEnd( selection ) && selection.isCollapsed() ) ) {
				return;
			}
			if ( this._atEnd( selection ) ) {
				ev.preventDefault();
				row = this.getMatchingPanel();
				row.children[0].children[0].focus();
				return;
			}
		}
		return Tab.__super__._keyDown.call( this, ev );
	};

	Tab.prototype._keyRight = function( ev ) {

		var row;
		var selection = ContentSelect.Range.query( this._domElement );
		if ( ! ( this._atEnd( selection ) && selection.isCollapsed() ) ) {
			return;
		}
		if ( this.isLastTab() ) {
			ev.preventDefault();
			row = this.getMatchingPanel();
			row.children[0].children[0].focus();
			return;
		}
		return Tab.__super__._keyRight.call( this, ev );
	};

	return Tab;

} )( ContentEdit.Text );

ContentEdit.TagNames.get().register( ContentEdit.Tab, 'tab' );

ContentEdit.TabContainer = ( function( _super ) {
	__extends( TabContainer, _super );

	function TabContainer( tagName, attributes ) {
		TabContainer.__super__.constructor.call( this, tagName, attributes );
	}

	TabContainer.prototype.cssTypeName = function() {
		return 'tabcontainer';
	};

	TabContainer.prototype.type = function() {
		return 'TabContainer';
	};

	TabContainer.prototype.typeName = function() {
		return 'TabContainer';
	};

	TabContainer._dropOutside = function( element, target, placement ) {
		var insertIndex;
		element.parent().detach( element );
		insertIndex = target.parent().parent().children.indexOf( target.parent() );
		if ( 'below' === placement[0] ) {
			insertIndex += 1;
		}
		return target.parent().parent().attach( element, insertIndex );
	};

	TabContainer.prototype._onOver = function( ev ) {
		var root;
		var ret = TabContainer.__super__._onOver.call( this, ev );
		if ( ret ) {
			root = ContentEdit.Root.get();
			this._removeCSSClass( 'ce-element--drop' );
			this.parent()._addCSSClass( 'ce-element--drop' );
			return root._dropTarget = this.parent();
		}
		return ret;
	};

	TabContainer.droppers = {
		'*': TabContainer._dropOutside
	};

	// TabContainer.placements = [ 'above', 'below' ];

	// Cancel the drag event on mouse up
	TabContainer.prototype._onMouseUp = function( ev ) {
		TabContainer.__super__._onMouseUp.call( this, ev );
		clearTimeout( this._dragTimeout );
	};

	TabContainer.prototype._onMouseOut = function( ev ) {
		TabContainer.__super__._onMouseOut.call( this, ev );
		clearTimeout( this._dragTimeout );
	};

	TabContainer.prototype._onMouseDown = function( ev ) {
		TabContainer.__super__._onMouseDown.call( this, ev );

		clearTimeout( this._dragTimeout );
		if ( this.domElement() !== ev.target ) {
			return;
		}

		// This fixes dragging in Firefox.
		ev.preventDefault();

		// If we are in the drag row handle, drag the whole row
		// @see _onMouseMove
		// if ( this._domElement.classList.contains('pbs-drag-row') ) {
		// 	return this.parent().drag(ev.pageX, ev.pageY);
		// }

		if ( ! this.draggableParent ) {
			this.draggableParent = this.parent();
		}

		return this._dragTimeout = setTimeout( ( function( _this ) {
			return function() {

				// Drag the column
				return _this.draggableParent.drag( ev.pageX, ev.pageY );
			};
		} )( this ), ContentEdit.DRAG_HOLD_DURATION );

	};

	TabContainer.prototype._onDoubleClick = function() {
		this.inspect();
	};

	TabContainer.fromDOMElement = function( domElement ) {

		var c, childNode, childNodes, list, _i, _len;
		var tagNames, cls, element;

		list = new this( domElement.tagName, this.getDOMElementAttributes( domElement ) );
		childNodes = ( function() {
			var _i, _len, _ref, _results;
			_ref = domElement.childNodes;
			_results = [];
			for ( _i = 0, _len = _ref.length; _i < _len; _i++ ) {
				c = _ref[_i];
				_results.push( c );
			}
			return _results;
		} )();

		tagNames = ContentEdit.TagNames.get();
		for ( _i = 0, _len = childNodes.length; _i < _len; _i++ ) {
			childNode = childNodes[_i];
			if ( 1 !== childNode.nodeType ) {
				continue;
			}

			if ( childNode.getAttribute( 'data-ce-tag' ) ) {
				cls = tagNames.match( childNode.getAttribute( 'data-ce-tag' ) );
			} else {
				cls = tagNames.match( childNode.tagName );
			}

			element = cls.fromDOMElement( childNode );
			if ( element ) {
				list.attach( element );
			}
		}

		return list;
	};

	return TabContainer;

} )( ContentEdit.Div );
ContentEdit.TagNames.get().register( ContentEdit.TabContainer, 'tabcontainer' );

ContentEdit.TabPanelContainer = ( function( _super ) {
	__extends( TabPanelContainer, _super );

	function TabPanelContainer( tagName, attributes ) {
		TabPanelContainer.__super__.constructor.call( this, tagName, attributes );
	}

	TabPanelContainer.prototype.cssTypeName = function() {
		return 'tabpanelcontainer';
	};

	TabPanelContainer.prototype.type = function() {
		return 'TabPanelContainer';
	};

	TabPanelContainer.prototype.typeName = function() {
		return 'TabPanelContainer';
	};

	TabPanelContainer.fromDOMElement = function( domElement ) {

		var c, childNode, childNodes, list, _i, _len;
		var tagNames, cls, element;
		list = new this( domElement.tagName, this.getDOMElementAttributes( domElement ) );
		childNodes = ( function() {
			var _i, _len, _ref, _results;
			_ref = domElement.childNodes;
			_results = [];
			for ( _i = 0, _len = _ref.length; _i < _len; _i++ ) {
				c = _ref[_i];
				_results.push( c );
			}
			return _results;
		} )();

		tagNames = ContentEdit.TagNames.get();
		for ( _i = 0, _len = childNodes.length; _i < _len; _i++ ) {
			childNode = childNodes[_i];
			if ( 1 !== childNode.nodeType ) {
				continue;
			}

			if ( childNode.getAttribute( 'data-ce-tag' ) ) {
				cls = tagNames.match( childNode.getAttribute( 'data-ce-tag' ) );
			} else {
				cls = tagNames.match( childNode.tagName );
			}

			element = cls.fromDOMElement( childNode );
			if ( element ) {
				list.attach( element );
			}
		}

		return list;
	};

	return TabPanelContainer;

} )( ContentEdit.Div );
ContentEdit.TagNames.get().register( ContentEdit.TabPanelContainer, 'tabpanelcontainer' );

ContentEdit.TabRadio = ( function( _super ) {
	__extends( TabRadio, _super );

	function TabRadio( tagName, attributes ) {
		TabRadio.__super__.constructor.call( this, tagName, attributes );
	}

	TabRadio.prototype.cssTypeName = function() {
		return 'tabradio';
	};

	TabRadio.prototype.type = function() {
		return 'TabRadio';
	};

	TabRadio.prototype.typeName = function() {
		return 'TabRadio';
	};

	// Disable the radio buttons since when a tab is focused it is preventing text
	// keyboard navigation, since the radio buttons get focused.
	TabRadio.prototype.mount = function() {
		var ret = TabRadio.__super__.mount.call( this );
		this._domElement.setAttribute( 'disabled', 'disabled' );
		return ret;
	};

	// Re-enable all radio buttons or else we cannot switch tabs after editing.
	TabRadio.prototype.unmount = function() {
		this._domElement.removeAttribute( 'disabled' );
		return TabRadio.__super__.unmount.call( this );
	};

	return TabRadio;

} )( ContentEdit.Static );

ContentEdit.TagNames.get().register( ContentEdit.TabRadio, 'tabradio' );

wp.hooks.addFilter( 'pbs.overlay.margin_top.can_apply', 'pbs.overlay', function( apply, element ) {
	var parent;
	if ( element && element._domElement && element._domElement.parentNode && element._domElement.parentNode.classList ) {
		parent = element._domElement.parentNode;
		if ( parent.classList && parent.classList.contains( 'pbs-tab-tabs' ) ) {
			return false;
		}
	}
	return apply;
} );
wp.hooks.addFilter( 'pbs.overlay.margin_bottom.can_apply', 'pbs.overlay', function( apply, element ) {
	var parent;
	if ( element && element._domElement && element._domElement.parentNode && element._domElement.parentNode.classList ) {
		parent = element._domElement.parentNode;
		if ( parent.classList && parent.classList.contains( 'pbs-tab-tabs' ) ) {
			return false;
		}
	}
	return apply;
} );

/**
 * Dragging columns inside tabs, drag the whole tabs element.
 */
( function() {
	var proxied = ContentEdit.DivCol.prototype._onMouseDown;
	ContentEdit.DivCol.prototype._onMouseDown = function( ev ) {
		if ( this.parent().parent()._domElement.classList.contains( 'pbs-tab-panels' ) ) {
			this.draggableParent = this.parent().parent().parent();
		}
		return proxied.call( this, ev );
	};
} )();

( function() {
	var proxied = ContentEdit.DivRow.prototype._onOver;
	ContentEdit.DivRow.prototype._onOver = function( ev ) {
		var root;
		var ret = proxied.call( this, ev );
		if ( ret && 'TabPanelContainer' === this.parent().constructor.name ) {
			root = ContentEdit.Root.get();
			this._removeCSSClass( 'ce-element--drop' );
			this.parent().parent()._addCSSClass( 'ce-element--drop' );
			return root._dropTarget = this.parent().parent();
		}
		return ret;
	};
} )();

/* globals ContentEdit, __extends, pbsParams */

ContentEdit.Newsletter = ( function( _super ) {
	__extends( Newsletter, _super );

	function Newsletter( tagName, attributes, content ) {
		if ( attributes ) {
			if ( 'newsletter' !== attributes['data-ce-tag'] ) {
				return new ContentEdit.Text( tagName, attributes, content );
			}
			if ( ! attributes['data-service'] ) {
				attributes['data-service'] = 'mailchimp';
			}
			if ( attributes['class'] ) {
				attributes['class'] = attributes['class'].replace( /(^|\s)pbs-typed(\s|$)/, ' ' ).trim();
			}
			if ( ! attributes.id ) {
				attributes.id = window.PBSEditor.generateUniqueClassName();
			}
		}

		Newsletter.__super__.constructor.call( this, tagName, attributes, content );
	}

	Newsletter.prototype.cssTypeName = function() {
		return 'newsletter';
	};

	Newsletter.prototype.typeName = function() {
		return 'Newsletter';
	};

    Newsletter.prototype.blur = function() {
		var text;
		if ( this._domElement ) {
			if ( this._domElement.children ) {
				this._domElement.children[0].blur();
			}
			text = this._domElement.querySelector( 'input' );
			text.value = '';
		}
		return Newsletter.__super__.blur.call( this );
    };

	Newsletter.prototype.focus = function() {
		var ret = Newsletter.__super__.focus.call( this );
		if ( this._domElement.children ) {
			this._domElement.children[0].focus();
		}
		return ret;
	};

	Newsletter.prototype.setPlaceholder = function( ev ) {
		var text = this._domElement.querySelector( 'input' );
		if ( 'focus' === ev.type && '' === text.value ) {
			text.value = text.getAttribute( 'placeholder' );
			return;
		}
		text.setAttribute( 'placeholder', text.value );
		this._syncContent();
	};

	Newsletter.prototype.unmount = function() {
		var input = this._domElement.querySelector( 'input' );
		input.removeEventListener( 'keyup', this._setPlaceholderBound );
		input.removeEventListener( 'focus', this._setPlaceholderBound );
		return Newsletter.__super__.unmount.call( this );
	};

	Newsletter.prototype.mount = function() {
		var input;
		var ret = Newsletter.__super__.mount.call( this );
		var button = this._domElement.querySelector( '.pbs-button' );
		if ( button ) {
			button.classList.add( 'pbs-no-toolbar' );
		}
		input = this._domElement.querySelector( 'input' );
		this._setPlaceholderBound = this.setPlaceholder.bind( this );
		input.addEventListener( 'keyup', this._setPlaceholderBound );
		input.addEventListener( 'focus', this._setPlaceholderBound );
		return ret;
	};

	Newsletter.prototype._onKeyUp = function( ev ) {
		var ret = Newsletter.__super__._onKeyUp.call( this, ev );
		this.ensureContents();
		return ret;
	};

	Newsletter.prototype.ensureContents = function() {
		var button, i;
		var stuffChanged = this.removeAllText();
		var input = this._domElement.querySelector( 'input[type="text"]' );
		if ( ! input ) {
			input = document.createElement( 'INPUT' );
			input.setattr( 'type', 'text' );
			this._domElement.insertBefore( input );
			stuffChanged = true;
		}
		button = this._domElement.querySelector( 'a.pbs-button' );
		if ( ! button ) {
			button = document.createElement( 'A' );
			button.setAttribute( 'class', 'pbs-button pbs-no-toolbar' );
			button.setAttribute( 'href', '#' );
			button.textContent = pbsParams.labels.newsletter_default_button;
			this._domElement.appendChild( button );
			stuffChanged = true;
		}
		for ( i = this._domElement.children.length - 1; i >= 0; i-- ) {
			if ( this._domElement.children[ i ] !== input && this._domElement.children[ i ] !== button ) {
				this._domElement.removeChild( this._domElement.children[ i ] );
				stuffChanged = true;
			}
		}

		if ( stuffChanged ) {
			this._syncContent();
		}
	};

	Newsletter.prototype.removeAllText = function() {

	    // Loop through all the nodes of the element
		var node, i;
		var stuffChanged = false;
	    var nodes = this._domElement.childNodes;
	    for ( i = 0; i < nodes.length; i++ ) {

	        node = nodes[i];

	        // If it's a text node, remove it
	        if ( node.nodeType === Node.TEXT_NODE ) {

	            node.parentNode.removeChild( node );
				stuffChanged = true;

	            i--; // Have to update our incrementor since we just removed a node from childNodes
	        }
	    }
		return stuffChanged;
	};

	Newsletter.prototype._keyReturn = function( ev ) {
		var range, sel;
		this.blur();
		range = document.createRange();
		sel = window.getSelection();
		range.selectNodeContents( this._domElement );
		range.collapse( false );
		sel.removeAllRanges();
		sel.addRange( range );
		Newsletter.__super__._keyReturn.call( this, ev );
	};

	return Newsletter;

} )( ContentEdit.Text );

ContentEdit.TagNames.get().register( ContentEdit.Newsletter, 'newsletter' );

// Disallow adding/changing links for the subscribe button.
wp.hooks.addFilter( 'inspector.button.link.can_apply', 'inspector', function( canApply, element ) {
	if ( window.pbsSelectorMatches( element, '[data-ce-tag="newsletter"] *' ) ) {
		return false;
	}
	return canApply;
} );

/* globals ContentEdit, ContentTools */

var _pbsToolbarImageHasTextContent, _pbsToolbarImageGetParent;
var _pbsUpdateNonCaptionedImage, _pbsToolbarImageGetParent, _pbsImageGetMetaData;
var _pbsUpdateNonCaptionedImageCTElement;

// Remove the size class when resizing images, so that WP can detect
// that we now have a custom size.
var root = ContentEdit.Root.get();
root._overrideImageOnStopResizing = root._onStopResizing;
root._onStopResizing = function( ev ) {

	var match;
	if ( 'Image' === this._resizing.constructor.name ) {
		match = this._resizing._attributes['class'].match( /size-\w+/ );
		if ( match ) {
			this._resizing.removeCSSClass( match[0] );
		}

		// Set the height style to auto, so that images & icons won't get smushed in responsive mode.
		this._resizing.style( 'height', 'auto' );
	}

	return this._overrideImageOnStopResizing( ev );
}.bind( root );

// Open the edit Media Manager window on double click
ContentEdit.Image.prototype._onDblclick = function() {
	this.inspect();
};

ContentEdit.Image.prototype.openMediaManager = function( closeCallback ) {
	var frame = wp.media.editor.open( 'edit', {
		frame: 'image',
		state: 'image-details',
		metadata: _pbsImageGetMetaData( this._domElement )
	} );

	frame.state( 'image-details' ).on( 'update', function( imageData ) {
		_pbsUpdateNonCaptionedImageCTElement( this, imageData );
	}.bind( this ) );

	frame.state( 'replace-image' ).on( 'replace', function( imageData ) {
		_pbsUpdateNonCaptionedImageCTElement( this, imageData );
	}.bind( this ) );

	// Delete the frame's state so that opening another frame won't have the settings
	// of the previous frame.
	frame.on( 'close', function() {
		wp.media.editor.remove( 'edit' );
		frame.detach();

		if ( closeCallback ) {
			setTimeout( closeCallback, 1 );
		}
	} );
};

// Remove image edit event listener.
ContentEdit.Image.prototype._removeDOMEventListeners = function() {
	this._domElement.removeEventListener( 'dblclick', this._onDblClickBound );
	window.removeEventListener( 'keydown', this._onKeyDownBound );
};

// Simpler mounting, don't add an anchor tag.
ContentEdit.Image.prototype.mount = function() {

	var i, responsiveAttributes, classes, parentWidth, imageWidth, imageHeight, ratio, load, ret;

	// Remove responsive attributes added in by WordPress since these are
	// dynamically added on creation.
	if ( this._attributes ) {
		responsiveAttributes = [ 'srcset', 'sizes', 'data-lazy-loaded', 'data-lazy-src', 'data-pin-nopin', 'src-orig', 'scale' ];
		for ( i = 0; i < responsiveAttributes.length; i++ ) {
			if ( this._attributes[ responsiveAttributes[ i ] ] ) {
				delete this._attributes[ responsiveAttributes[ i ]  ];
			}
		}
	}

	// Remove alignnone. We won't support alignnone since they are problematic.
	if ( this._attributes ) {
		if ( this._attributes['class'] ) {
			classes = this._attributes['class'].split( ' ' );
			if ( classes.indexOf( 'alignnone' ) !== -1 ) {
				classes[ classes.indexOf( 'alignnone' ) ] = 'aligncenter';
				this._attributes['class'] = classes.join( ' ' );
			}
		}
	}

	this._domElement = document.createElement( 'img' );
	for ( i in this._attributes ) {
		if ( this._attributes.hasOwnProperty( i ) ) {
			if ( this._attributes[ i ] ) {
				this._domElement.setAttribute( i, this._attributes[ i ] );
			}
		}
	}

	// Edit image edit event listener.
	this._onDblClickBound = this._onDblclick.bind( this );
	this._domElement.addEventListener( 'dblclick', this._onDblClickBound );

	// Character press event listener.
	this._onKeyDownBound = this._onKeyDown.bind( this );
	window.addEventListener( 'keydown', this._onKeyDownBound );

	// Loading image.
	if ( this._attributes.height && this._attributes.width ) {
		parentWidth = window.pbsGetBoundingClientRect( this.parent()._domElement ).width;
		imageWidth = parseInt( this._attributes.width, 10 );
		imageHeight = parseInt( this._attributes.height, 10 );
		if ( imageWidth > parentWidth ) {
			ratio = imageHeight / imageWidth;
			imageWidth = parentWidth;
			imageHeight = imageWidth * ratio;
		}
		this._domElement.style.height = imageHeight + 'px';
		this._domElement.style.width = imageWidth + 'px';
		this._domElement.classList.add( 'pbs-image-loading' );
		load = function() {
			if ( this._domElement ) {
				this._domElement.style.height = '';
				this._domElement.style.width = '';
				this._domElement.classList.remove( 'pbs-image-loading' );
				this._domElement.removeEventListener( 'load', load );
			}
		}.bind( this );
		this._domElement.addEventListener( 'load', load );
	}

	ret = ContentEdit.Image.__super__.mount.call( this );

	wp.hooks.doAction( 'pbs.image.mounted' );

	return ret;
};

// If typed while an image is focused, create a new paragraph.
ContentEdit.Image.prototype._onKeyDown = function( ev ) {

	// If ONLY shift is pressed, don't do anything.
	if ( 16 === ev.keyCode || 91 === ev.keyCode || 93 === ev.keyCode ) {
		return;
	}

	// If ctrl is pressed, don't do anything.
	if ( ev.ctrlKey || ev.metaKey ) {
		return;
	}

	// If something else is selected, don't do anything.
	if ( ['input', 'select', 'textarea', 'button'].indexOf( ev.target.tagName.toLowerCase() ) !== -1 ) {
		return;
	}
	if ( this.isFocused() ) {

		// This fixes the bug where an empty div is added when pressing enter.
		ev.preventDefault();

		ContentTools.Tools.Paragraph.apply( this, null, function() {} );
	}
};

// Simpler droppers
ContentEdit.Image._dropBoth = function( element, target, placement ) {
	var insertIndex;
	element.parent().detach( element );
	insertIndex = target.parent().children.indexOf( target );
	if ( 'below' === placement[0] && 'center' === placement[1] ) {
		insertIndex += 1;
	}
	element.removeCSSClass( 'alignleft' );
	element.removeCSSClass( 'alignright' );
	element.removeCSSClass( 'aligncenter' );
	element.removeCSSClass( 'alignnone' );
	if ( ['left', 'right', 'center'].indexOf( placement[1] ) !== -1 ) {
		element.addCSSClass( 'align' + placement[1] );
	}
	return target.parent().attach( element, insertIndex );
};

// Override the droppers to allow for 'alignleft', 'alignright', 'aligncenter',
// classes instead of just 'align-left' and 'align-right'.
ContentEdit.Image.droppers = {
	'Image': ContentEdit.Image._dropBoth,
	'PreText': ContentEdit.Image._dropBoth,
	'Static': ContentEdit.Image._dropBoth,
	'Text': ContentEdit.Image._dropBoth
};

wp.hooks.addFilter( 'pbs.shortcode.allow_raw_edit', 'pbs.shortcode', function( allow, scBase, element ) {
	var target, frame;

	if ( 'caption' === scBase ) {
		target = element._domElement.querySelector( 'img' );

		frame = wp.media.editor.open( 'edit', {
			frame: 'image',
			state: 'image-details',
			metadata: _pbsImageGetMetaData( target )
		} );

		frame.state( 'image-details' ).on( 'update', function( imageData ) {
			_pbsUpdateNonCaptionedImage( target, imageData );
		} );

		frame.state( 'replace-image' ).on( 'replace', function( imageData ) {
			_pbsUpdateNonCaptionedImage( target, imageData );
		} );

		// Delete the frame's state so that opening another frame won't have the settings
		// of the previous frame.
		frame.on( 'close', function() {
			wp.media.editor.remove( 'edit' );
			frame.detach();
		} );
		return false;
	}
	return allow;
} );

/************************************************************************************
 * From updateImage function js/tinymce/plugins/wpeditimage/plugins.js
 ************************************************************************************/

_pbsToolbarImageHasTextContent = function( node ) {
	return node && !! ( node.textContent || node.innerText );
};

_pbsToolbarImageGetParent = function( node, className ) {
	while ( node && node.parentNode ) {
		if ( node.className && ( ' ' + node.className + ' ' ).indexOf( ' ' + className + ' ' ) !== -1 ) {
			return node;
		}

		node = node.parentNode;
	}

	return false;
};
_pbsUpdateNonCaptionedImage = function( imageNode, imageData ) {

	var key, classes, node, captionNode, id, attrs, linkAttrs, width, height;
	var align, oldA, linkNode, i, textElement, currElement, parent, index;
	var scData, newElem, shortcode;

	// Classes = tinymce.explode( imageData.extraClasses, ' ' );
	classes = imageData.extraClasses.split( ' ' );

	if ( ! classes ) {
		classes = [];
	}

	if ( ! imageData.caption ) {
		classes.push( 'align' + imageData.align );
	}

	if ( imageData.attachment_id ) {
		classes.push( 'wp-image-' + imageData.attachment_id );
		if ( imageData.size && 'custom' !== imageData.size ) {
			classes.push( 'size-' + imageData.size );
		}
	}

	width = imageData.width;
	height = imageData.height;

	if ( 'custom' === imageData.size ) {
		width = imageData.customWidth;
		height = imageData.customHeight;
	}

	attrs = {
		src: imageData.url,
		width: width || null,
		height: height || null,
		alt: imageData.alt,
		title: imageData.title || null,
		'class': classes.join( ' ' ) || null
	};

	// Dom.setAttribs( imageNode, attrs );
	for ( key in attrs ) {
		if ( attrs.hasOwnProperty( key ) ) {
			imageNode.setAttribute( key, attrs[ key ] );
		}
	}

	linkAttrs = {
		href: imageData.linkUrl,
		rel: imageData.linkRel || null,
		target: imageData.linkTargetBlank ? '_blank' : null,
		'class': imageData.linkClassName || null
	};

	if ( imageNode.parentNode && 'A' === imageNode.parentNode.nodeName && ! _pbsToolbarImageHasTextContent( imageNode.parentNode ) ) {

		// Update or remove an existing link wrapped around the image
		if ( imageData.linkUrl ) {

			// Update the attributes of the link
			// dom.setAttribs( imageNode.parentNode, linkAttrs );
			for ( key in linkAttrs ) {
				if ( linkAttrs.hasOwnProperty( key ) ) {
					if ( null !== linkAttrs[ key ] ) {
						imageNode.parentNode.setAttribute( key, linkAttrs[ key ] );
					}
				}
			}
		} else {

			// Unwrap the image from the link.
			// dom.remove( imageNode.parentNode, true );
			oldA = imageNode.parentNode;
			oldA.parentNode.insertBefore( imageNode, oldA );
			oldA.parentNode.removeChild( oldA );

		}

	} else if ( imageData.linkUrl ) { // If a link was added to a non-linked image

		linkNode = _pbsToolbarImageGetParent( imageNode, 'a' );
		if ( linkNode ) {

			// The image is inside a link together with other nodes,
			// or is nested in another node, move it out
			// dom.insertAfter( imageNode, linkNode );
			imageNode.parentNode.insertBefore( linkNode, imageNode.nextSibling );
		}

		// Add link wrapped around the image
		// linkNode = dom.create( 'a', linkAttrs );
		linkNode = document.createElement( 'a' );
		for ( i in linkAttrs ) {
			if ( linkAttrs.hasOwnProperty( i ) ) {
				if ( null !== linkAttrs[ i ] ) {
					linkNode.setAttribute( i, linkAttrs[ i ] );
				}
			}
		}
		imageNode.parentNode.insertBefore( linkNode, imageNode );
		linkNode.appendChild( imageNode );
	}

	// CaptionNode = editor.dom.getParent( imageNode, '.mceTemp' );
	captionNode = _pbsToolbarImageGetParent( imageNode, '.mceTemp' );

	if ( imageNode.parentNode && 'A' === imageNode.parentNode.nodeName && ! _pbsToolbarImageHasTextContent( imageNode.parentNode ) ) {
		node = imageNode.parentNode;
	} else {
		node = imageNode;
	}

	// Find the main Text element
	textElement = null;
	currElement = node;
	while ( currElement ) {
		if ( currElement._ceElement ) {
			textElement = currElement._ceElement;
			break;
		}
		currElement = currElement.parentNode;
	}

	// Captioned image.
	if ( imageData.caption ) {

		id = imageData.attachment_id ? 'attachment_' + imageData.attachment_id : null;
		align = 'align' + ( imageData.align || 'none' );

		// Default data
		scData = {
			tag: 'caption',
			type: 'closed',
			content: node.outerHTML + ' ' + imageData.caption,
			attrs: {
				id: id,
				align: align,
				width: width
			}
		};

		// Generate the shortcode
		shortcode = new wp.shortcode( scData ).string();
		parent = textElement.parent();
		index = parent.children.indexOf( textElement );

		shortcode = wp.shortcode.next( 'caption', shortcode, 0 );
		newElem = ContentEdit.Shortcode.createShortcode( shortcode );
		parent.attach( newElem, index );
		parent.detach( textElement );

		newElem.ajaxUpdate( true );
		newElem.focus();

		textElement = newElem;

	} else {

		// Normal image.
		parent = textElement.parent();
		index = parent.children.indexOf( textElement );
		newElem = ContentEdit.Image.fromDOMElement( node );
		parent.attach( newElem, index );
		parent.detach( textElement );
		newElem.focus();
	}
};

_pbsToolbarImageGetParent = function( node, className ) {
	while ( node && node.parentNode ) {
		if ( node.className && ( ' ' + node.className + ' ' ).indexOf( ' ' + className + ' ' ) !== -1 ) {
			return node;
		}

		node = node.parentNode;
	}

	return false;
};

_pbsUpdateNonCaptionedImageCTElement = function( imageNode, imageData ) {

	var classes, id, attrs, linkAttrs, width, height, align, cls, i, key;
	var scData, shortcode, newElem, index;

	// Classes = tinymce.explode( imageData.extraClasses, ' ' );
	classes = imageData.extraClasses.split( ' ' );

	if ( ! classes ) {
		classes = [];
	}

	if ( ! imageData.caption ) {
		classes.push( 'align' + imageData.align );
	}

	if ( imageData.attachment_id ) {
		classes.push( 'wp-image-' + imageData.attachment_id );
		if ( imageData.size && 'custom' !== imageData.size ) {
			classes.push( 'size-' + imageData.size );
		}
	}

	width = imageData.width;
	height = imageData.height;

	if ( 'custom' === imageData.size ) {
		width = imageData.customWidth;
		height = imageData.customHeight;
	}

	attrs = {
		src: imageData.url,
		width: width || null,
		height: height || null,
		alt: imageData.alt,
		title: imageData.title || null,
		'class': classes.join( ' ' ) || null
	};

	// The aspect ratio might have changed.
	imageNode._aspectRatio = height / width;
	imageNode.size( [width, height] );

	// Remove any existing attachment id class
	cls = imageNode.attr( 'class' ).match( /wp-image-\d+/ );
	if ( cls ) {
		imageNode.removeCSSClass( cls[0] );
	}
	cls = imageNode.attr( 'class' ).match( /size-\w+/ );
	if ( cls ) {
		imageNode.removeCSSClass( cls[0] );
	}

	// Add the classes
	imageNode.removeCSSClass( 'alignleft' );
	imageNode.removeCSSClass( 'alignright' );
	imageNode.removeCSSClass( 'aligncenter' );
	imageNode.removeCSSClass( 'alignnone' );
	for ( i = 0; i < classes.length; i++ ) {
		if ( classes[ i ] ) {
			imageNode.addCSSClass( classes[ i ] );
		}
	}

	// Add the other attributes
	for ( key in attrs ) {
		if ( ! attrs.hasOwnProperty( key ) ) {
			continue;
		}
		if ( 'class' === key ) {
			continue;
		}
		if ( null !== attrs[ key ] ) {
			imageNode.attr( key, attrs[ key ] );
		} else {
			imageNode.removeAttr( key );
		}
	}

	linkAttrs = {
		href: imageData.linkUrl,
		rel: imageData.linkRel || null,
		target: imageData.linkTargetBlank ? '_blank' : null,
		'class': imageData.linkClassName || null
	};

	if ( imageNode.a ) {
		if ( imageData.linkUrl ) {

			// Update the attributes of the link
			// dom.setAttribs( imageNode.parentNode, linkAttrs );
			for ( key in linkAttrs ) {
				if ( linkAttrs.hasOwnProperty( key ) ) {
					if ( null !== linkAttrs[ key ] ) {
						imageNode.a[ key ] = linkAttrs[ key ];
					} else {
						delete imageNode.a[ key ];
					}
				}
			}
		} else {
			imageNode.a = null;
		}
	} else if ( imageData.linkUrl ) {
		imageNode.a = {};
		for ( key in linkAttrs ) {
			if ( linkAttrs.hasOwnProperty( key ) ) {
				if ( null !== linkAttrs[ key ] ) {
					imageNode.a[ key ] = linkAttrs[ key ];
				}
			}
		}
	}

	// We always come from a non-captioned image, transform into a caption shortcode and
	// never from a captioned image (that's another function)
	if ( imageData.caption ) {

		id = imageData.attachment_id ? 'attachment_' + imageData.attachment_id : null;
		align = 'align' + ( imageData.align || 'none' );

		// Default data
		scData = {
			tag: 'caption',
			type: 'closed',
			content: imageNode.html() + ' ' + imageData.caption,
			attrs: {
				id: id,
				align: align,
				width: width
			}
		};

		// Generate the shortcode
		shortcode = new wp.shortcode( scData );//.string();

		newElem = ContentEdit.Shortcode.createShortcode( wp.shortcode.next( 'caption', shortcode.string(), 0 ) );
		index = imageNode.parent().children.indexOf( imageNode );
		imageNode.parent().attach( newElem, index );
		imageNode.parent().detach( imageNode );
		newElem.ajaxUpdate( true );
		return;

	}

};

// From js/tinymce/plugins/wpeditimage/plugin.js
_pbsImageGetMetaData = function( img ) {

	// Modified from extractImageData() in plugin.js
	var attachmentID = img.getAttribute( 'class' ).match( /wp-image-(\d+)/ );
	var align = img.getAttribute( 'class' ).match( /align(\w+)/ );
	var size = img.getAttribute( 'class' ).match( /size-(\w+)/ );
	var i, aClasses, metadata, width, height, captionClassName, captionBlock;
	var classes, c, caption, link;

	var tmpClasses = img.getAttribute( 'class' ).split( ' ' );
	var extraClasses = [];

	var classRegex = /wp-image-\d+|align\w+|size-\w+|ce-element[-\w]*/;

	// Extract classes on Image Elements
	if ( img._ceElement ) {
		if ( img._ceElement.a && img._ceElement.a['class'] ) {
			aClasses = img._ceElement.a['class'].split( ' ' );
			for ( i = 0; i < aClasses.length; i++ ) {
				if ( ! aClasses[ i ].match( classRegex ) ) {
					extraClasses.push( aClasses[ i ] );
				}
			}
		}
	}

	for ( i = 0; i < tmpClasses.length; i++ ) {
		if ( ! tmpClasses[ i ].match( classRegex ) ) {
			extraClasses.push( tmpClasses[ i ] );
		}
	}

	metadata = {
		attachment_id: attachmentID ? attachmentID[1] : false,
		size: size ? size[1] : 'custom',
		caption: '',
		align: align ? align[1] : 'none',
		extraClasses: extraClasses.join( ' ' ),
		link: false,
		linkUrl: '',
		linkClassName: '',
		linkTargetBlank: false,
		linkRel: '',
		title: ''
	};
	metadata.url = img.getAttribute( 'src' );
	metadata.alt = img.getAttribute( 'alt' );
	metadata.title = img.getAttribute( 'title' );

	width = img.getAttribute( 'width' );
	height = img.getAttribute( 'height' );

	metadata.customWidth = metadata.width = width;
	metadata.customHeight = metadata.height = height;

	// Extract caption
	captionClassName = [];
	captionBlock = img.parentNode;
	while ( null !== captionBlock && 'undefined' !== typeof captionBlock.classList ) {

		if ( captionBlock.classList.contains( 'wp-caption' ) ) {
			break;
		}
		captionBlock = captionBlock.parentNode;
	}

	if ( captionBlock && captionBlock.classList ) {
		classes = captionBlock.classList;

		for ( i = 0; i < classes.length; i++ ) {
			c = classes.item( i );
			if ( /^align/.test( c ) ) {
				metadata.align = c.replace( 'align', '' );
			} else if ( c && 'wp-caption' !== c ) {
				captionClassName.push( c );
			}
		}

		metadata.captionClassName = captionClassName.join( ' ' );

		caption = captionBlock.querySelector( '.wp-caption-text' );
		if ( caption ) {
			metadata.caption = caption.innerHTML.replace( /<br[^>]*>/g, '$&\n' ).replace( /^<p>/, '' ).replace( /<\/p>$/, '' );
		}
	}

	// Extract linkTo
	if ( img.parentNode && 'A' === img.parentNode.nodeName ) {
		link = img.parentNode;
		metadata.linkUrl = link.getAttribute( 'href' );
		metadata.linkTargetBlank = '_blank' === link.getAttribute( 'target' ) ? true : false;
		metadata.linkRel = link.getAttribute( 'rel' );
		metadata.linkClassName = link.className;
	}

	// Extract linkTo for Image Elements
	if ( img._ceElement ) {
		if ( img._ceElement.a ) {
			metadata.linkUrl = img._ceElement.a.href;
			metadata.linkTargetBlank = '_blank' === img._ceElement.a.target ? true : false;
			metadata.linkRel = img._ceElement.a.rel;
			metadata.linkClassName = img._ceElement.a['class'];
		}
	}

	return metadata;
};

// Upon load, unwrap all images from their paragraph tags so that they can all be rendered as Image Elements.
/**
Scenarios:
<p><img>blahblah</p> --> <img><p>blahblah</p>
<p>start<img>end</p> --> <p>start</p><img><p>end</p>
*/
( function() {
	var ready = function() {

		var editableArea, selector, el, mainImageNode, p, startingIndex;
		var endingIndex, tip, tail, newContent, clonedPNode;

		if ( ! document.querySelector( '[data-name="main-content"]' ) ) {
			return;
		}

		editableArea = document.querySelector( '[data-name="main-content"]' );
		selector = 'a:not([data-ce-tag]) > img.alignright, a:not([data-ce-tag]) > img.alignleft, a:not([data-ce-tag]) > img.aligncenter, a:not([data-ce-tag]) > img.alignnone, p > img.alignright, p > img.alignleft, p > img.aligncenter, p > img.alignnone';

		while ( editableArea.querySelector( selector ) ) {
			el = editableArea.querySelector( selector );
			mainImageNode = el;
			if ( 'A' === el.parentNode.tagName ) {
				mainImageNode = el.parentNode;
				mainImageNode.setAttribute( 'data-ce-tag', 'img' );
			}

			if ( 'P' === mainImageNode.parentNode.tagName ) {
				p = mainImageNode.parentNode;
				startingIndex = p.innerHTML.indexOf( mainImageNode.outerHTML );
				endingIndex = startingIndex + mainImageNode.outerHTML.length;
				tip = p.innerHTML.substr( 0, startingIndex ).trim();
				tail = p.innerHTML.substr( endingIndex ).trim();

				newContent = '';
				if ( '' !== tip ) {
					clonedPNode = p.cloneNode();
					clonedPNode.innerHTML = tip;
					newContent += clonedPNode.outerHTML;
				}
				newContent += mainImageNode.outerHTML;
				if ( '' !== tail ) {
					clonedPNode = p.cloneNode();
					clonedPNode.innerHTML = tail;
					newContent += clonedPNode.outerHTML;
				}
				p.outerHTML = newContent;
			}
		}

		// WordPress adds br tags after images in certain scenario, remove them
		// since we do not need them.
		while ( editableArea.querySelector( 'img ~ br, [data-ce-tag="img"] ~ br' ) ) {
			editableArea.querySelector( 'img ~ br, [data-ce-tag="img"] ~ br' ).remove();
		}
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/*******************************************************************************
 * Clean image tags on saving.
 *******************************************************************************/
wp.hooks.addFilter( 'pbs.save', 'pbs', function( html ) {

	// Remove the data-ce-tag="img" left by CT.
	html = html.replace( /\sdata-ce-tag=["']img["']/g, '' );

	// Remove the empty class left by CT.
	html = html.replace( /(<a[^>]*)\sclass((\s|>)[^>]*>)/g, '$1$2' );

	// Put back images inside paragraph tags.
	html = html.replace( /((<a[^>]+>\s*)?<img[^>]*>(\s*<\/a>)?)\s*(<p[^\w>]*>)/g, '$4$1' );

	// Wrap images which aren't inside paragraph tags inside paragraph tags.
	html = html.replace( /(<[^pa][^>]*>\s*)(<img[^>]*>)/g, '$1<p>$2</p>' );
	html = html.replace( /(<[^p][^>]*>\s*)(<a[^>]+>\s*<img[^>]*>\s*<\/a>)/g, '$1<p>$2</p>' );

	// Remove br tags after images since WP sometimes adds them.
	html = html.replace( /((<a[^>]+>\s*)?<img[^>]*>(\s*<\/a>)?)\s*(<br[^>]*>)*/g, '$1' );

	return html;
} );

/**
 * Widgets are actually just shortcodes.
 */

/* globals pbsParams */

wp.hooks.addFilter( 'pbs.toolbar.shortcode.label', 'pbs.toolbar', function( scBase ) {
	if ( 'pbs_widget' === scBase ) {
		return pbsParams.labels.widget;
	}
	return scBase;
} );

/**
 * Widgets which are (previously) used in the content, but have been disabled in the site will still
 * show up in the content. Their templates would not be available anymore, this would cause
 * errors, so override the section creation and disable it.
 *
 * Instead of displaying the widget settings in the inspector, it now reverts to just a normal shortcode.
 */
wp.hooks.addFilter( 'pbs.inspector.do_add_section_options', 'pbs.inspector', function( doContinue, optionName, model, divGroup, element, toolboxUI ) {
	if ( 'widgetSettings' === optionName && model && model.attributes && model.attributes.widget ) {

		// DoContinue = true only if the widget template is there.
		doContinue = !! document.querySelector( '#tmpl-pbs-widget-' + model.attributes.widget );
		if ( ! doContinue ) {
			toolboxUI.addGenericShortcodeOptions( divGroup, element );
		}
	}
	return doContinue;
} );

/* globals ContentEdit, __extends, PBSEditor */

ContentEdit.Spacer = ( function( _super ) {
	__extends( Spacer, _super );

	function Spacer( tagName, attributes ) {
		if ( ! attributes ) {
			attributes = {};
		}
		if ( ! attributes['data-ce-tag'] ) {
			attributes['data-ce-tag'] = 'spacer';
		}
		this.model = new Backbone.Model( {} );

		Spacer.__super__.constructor.call( this, tagName, attributes );

		this._content = '';
	}

    Spacer.prototype.blur = function() {
      var root = ContentEdit.Root.get();
      if ( this.isFocused() ) {
        this._removeCSSClass( 'ce-element--focused' );
        root._focused = null;
        return root.trigger( 'blur', this );
      }
    };

    Spacer.droppers = PBSEditor.allDroppers;

    Spacer.prototype.focus = function( supressDOMFocus ) {
      var root;
      root = ContentEdit.Root.get();
      if ( this.isFocused() ) {
        return;
      }
      if ( root.focused() ) {
        root.focused().blur();
      }
      this._addCSSClass( 'ce-element--focused' );
      root._focused = this;
      if ( this.isMounted() && ! supressDOMFocus ) {
        this.domElement().focus();
      }
      return root.trigger( 'focus', this );
    };

	Spacer.prototype.cssTypeName = function() {
		return 'spacer';
	};

	Spacer.prototype.typeName = function() {
		return 'Spacer';
	};

	return Spacer;

} )( ContentEdit.Static );

ContentEdit.TagNames.get().register( ContentEdit.Spacer, 'spacer' );

/* globals ContentEdit, __extends, PBSEditor, ContentSelect */

ContentEdit.Toggle = ( function( _super ) {
	__extends( Toggle, _super );

	function Toggle( tagName, attributes ) {
		Toggle.__super__.constructor.call( this, tagName, attributes );
		this.isCompundElement = true;
	}

	Toggle.prototype.cssTypeName = function() {
		return 'toggle';
	};

	Toggle.prototype.type = function() {
		return 'Toggle';
	};

	Toggle.prototype.typeName = function() {
		return 'Toggle';
	};

	Toggle.fromDOMElement = function( domElement ) {

		var c, childNode, childNodes, list, _i, _len, tagNames, cls, element;
		var pInputs = domElement.querySelector( 'p > [data-ce-tag="toggleradio"]' );

		// WordPress content editor can wrap the inputs with a paragraph, unwrap it.
		if ( pInputs ) {
			if ( pInputs.parentNode.parentNode === domElement ) {
				pInputs.parentNode.outerHTML = pInputs.parentNode.innerHTML;
			}
		}

		list = new this( domElement.tagName, this.getDOMElementAttributes( domElement ) );
		childNodes = ( function() {
			var _i, _len, _ref, _results;
			_ref = domElement.childNodes;
			_results = [];
			for ( _i = 0, _len = _ref.length; _i < _len; _i++ ) {
				c = _ref[_i];
				_results.push( c );
			}
			return _results;
		} )();

		tagNames = ContentEdit.TagNames.get();
		for ( _i = 0, _len = childNodes.length; _i < _len; _i++ ) {
			childNode = childNodes[_i];
			if ( 1 !== childNode.nodeType ) {
				continue;
			}

			if ( childNode.getAttribute( 'data-ce-tag' ) ) {
				cls = tagNames.match( childNode.getAttribute( 'data-ce-tag' ) );
			} else {
				cls = tagNames.match( childNode.tagName );
			}

			element = cls.fromDOMElement( childNode );
			if ( element ) {
				list.attach( element );
			}
		}

		return list;
	};

	Toggle.prototype.mount = function() {
		var uid, tab;
		var ret = Toggle.__super__.mount.call( this );

		// Add a unique ID for the checkbox & label pair.
		var radio = this._domElement.querySelector( '[data-ce-tag="toggleradio"]' )._ceElement;
		var radioID = radio.attr( 'id' );
		var addID = false;
		if ( ! radioID ) {
			addID = true;
		} else if ( document.querySelectorAll( '[id="' + radioID + '"]' ).length > 1 ) {
			addID = true;
		}
		if ( addID ) {
			uid = 'pbs-toggle-' + window.PBSEditor.generateHash();
			tab = this._domElement.querySelector( '[data-ce-tag="toggletab"]' )._ceElement;
			radio.attr( 'id', uid );
			tab.attr( 'for', uid );
		}
		return ret;
	};

	Toggle.prototype.unmount = function() {
		var radio = this._domElement.querySelector( '[data-ce-tag="toggleradio"]' );
		radio.removeAttribute( 'disabled' );
		Toggle.__super__.unmount.call( this );
	};

	Toggle.prototype._onMouseOver = function( ev ) {
		var root = ContentEdit.Root.get();
		if ( root.dragging() ) {
			this._domElement.querySelector( '[data-ce-tag="toggletab"]' )._ceElement.openTab();
		}
		return Toggle.__super__._onMouseOver.call( this, ev );
	};

	Toggle.droppers = PBSEditor.allDroppers;

	return Toggle;

} )( ContentEdit.Div );

ContentEdit.TagNames.get().register( ContentEdit.Toggle, 'toggle' );

ContentEdit.ToggleTab = ( function( _super ) {
	__extends( ToggleTab, _super );

	function ToggleTab( tagName, attributes, content ) {
		ToggleTab.__super__.constructor.call( this, tagName, attributes, content );
	}

	ToggleTab.prototype.cssTypeName = function() {
		return 'toggletab';
	};

	ToggleTab.prototype.type = function() {
		return 'ToggleTab';
	};

	ToggleTab.prototype.typeName = function() {
		return 'ToggleTab';
	};

	ToggleTab.prototype._onMouseDown = function( ev ) {
		ToggleTab.__super__._onMouseDown.call( this, ev );

		setTimeout( function() {
			this.openTab();
		}.bind( this ), 1 );

		clearTimeout( this._dragTimeout );
		if ( this.domElement() !== ev.target ) {
			return;
		}

		// This fixes dragging in Firefox.
		// ev.preventDefault();

		// If we are in the drag row handle, drag the whole row
		// @see _onMouseMove
		// if ( this._domElement.classList.contains('pbs-drag-row') ) {
		// 	return this.parent().drag(ev.pageX, ev.pageY);
		// }

		if ( ! this.draggableParent ) {
			this.draggableParent = this.parent();
		}

		return this._dragTimeout = setTimeout( ( function( _this ) {
			return function() {

				// Drag the column
				return _this.draggableParent.drag( ev.pageX, ev.pageY );
			};
		} )( this ), ContentEdit.DRAG_HOLD_DURATION );

	};

	ToggleTab.prototype.openTab = function() {
		this.parent()._domElement.querySelector( 'input[type="checkbox"]' ).checked = true;
	};

	ToggleTab.prototype._onMouseOver = function( ev ) {
		var root = ContentEdit.Root.get();
		if ( root.dragging() ) {
			this.openTab();
		}
		return ToggleTab.__super__._onMouseOver.call( this, ev );
	};

	// ToggleTab.droppers = {};

	// ToggleTab.placements = [];

	// If a tab is focused, check the matching radio button since they are all disabled.
	ToggleTab.prototype.focus = function() {
		this.openTab();
		return ToggleTab.__super__.focus.call( this );
	};

	ToggleTab.prototype._keyReturn = function( ev ) {
		var next;
		ev.preventDefault();
		next = this.nextSibling();
		if ( next ) {
			next.focus();
		}
	};

	/**
	 * Make sure the saved HTML has the first tab active.
	 */

	// ToggleTab.prototype.html = function() {
	// 	var ret = ToggleTab.__super__.html.call( this );
	// 	if ( this.parent().children.indexOf( this ) === 0 ) {
	// 		if ( ! ret.match( /pbs-tab-active/ ) ) {
	// 			var r = new RegExp( '(<' + this._tagName + '[^>]+class=[\'"])' );
	// 			if ( ret.match( r ) ) {
	// 				ret = ret.replace( r, '$1pbs-tab-active ' );
	// 			} else {
	// 				r = new RegExp( '(<' + this._tagName + ')' );
	// 				ret = ret.replace( r, '$1 class="pbs-tab-active"' );
	// 			}
	// 		}
	// 	} else {
	// 		ret = ret.replace( /\s*pbs-tab-active\s*/g, '' );
	// 		ret = ret.replace( /\s*class=[\'\"][\'\"]/g, '' );
	// 	}
	// 	return ret;
	// };

	// ToggleTab.prototype._keyLeft = function( ev ) {
	// 	if ( this.parent().children.indexOf( this ) === 0 ) {
	// 		var selection = ContentSelect.Range.query( this._domElement );
	// 		if ( selection.get()[0] === 0 && selection.isCollapsed() ) {
	// 			this._keyUp( ev );
	// 		}
	// 	}
	// 	return ToggleTab.__super__._keyLeft.call( this, ev );
	// };

	// Tab.prototype._keyUp = function( ev ) {
	// 	if ( this.parent().children.indexOf( this ) === 0 ) {
	// 		var selection = ContentSelect.Range.query( this._domElement );
	// 		if ( selection.get()[0] === 0 && selection.isCollapsed() ) {
	//
	// 			Var tabs = this.parent().parent();
	// 			var index = tabs.parent().children.indexOf( tabs );
	// 			if ( index > 0 ) {
	// 				if ( tabs.parent().children[ index - 1 ].content ) {
	// 					var elem = tabs.parent().children[ index - 1 ];
	// 					elem.focus();
	//
	// 			        Selection = new ContentSelect.Range( elem.content.length(), elem.content.length() );
	// 			        return selection.select( elem.domElement() );
	// 				}
	// 			}
	// 			var p = new ContentEdit.Text('p', {}, '');
	// 			tabs.parent().attach( p, index );
	// 			p.focus();
	// 		}
	// 	}
	// 	return Tab.__super__._keyUp.call( this, ev );
	// };

	ToggleTab.prototype._keyDown = function( ev ) {

		var selection, row;
		if ( this.parent().children.indexOf( this ) === this.parent().children.length - 1 ) {
			selection = ContentSelect.Range.query( this._domElement );
			if ( ! ( this._atEnd( selection ) && selection.isCollapsed() ) ) {
				return;
			}
			if ( this._atEnd( selection ) ) {
				ev.preventDefault();
				row = this.getMatchingPanel();
				row.children[0].children[0].focus();
				return;
			}
		}
		return ToggleTab.__super__._keyDown.call( this, ev );
	};

	ToggleTab.prototype._keyRight = function( ev ) {

		var row;
		var selection = ContentSelect.Range.query( this._domElement );
		if ( ! ( this._atEnd( selection ) && selection.isCollapsed() ) ) {
			return;
		}
		ev.preventDefault();
		row = this.nextSibling();
		row.children[0].children[0].focus();
		return;
	};

	return ToggleTab;

} )( ContentEdit.Text );

ContentEdit.TagNames.get().register( ContentEdit.ToggleTab, 'toggletab' );

ContentEdit.ToggleRadio = ( function( _super ) {
	__extends( ToggleRadio, _super );

	function ToggleRadio( tagName, attributes ) {
		ToggleRadio.__super__.constructor.call( this, tagName, attributes );
	}

	ToggleRadio.prototype.cssTypeName = function() {
		return 'toggleradio';
	};

	ToggleRadio.prototype.type = function() {
		return 'ToggleRadio';
	};

	ToggleRadio.prototype.typeName = function() {
		return 'ToggleRadio';
	};

	// Disable the radio buttons since when a tab is focused it is preventing text
	// keyboard navigation, since the radio buttons get focused.
	ToggleRadio.prototype.mount = function() {
		var ret = ToggleRadio.__super__.mount.call( this );
		this._domElement.setAttribute( 'disabled', 'disabled' );
		return ret;
	};

	// Re-enable all radio buttons or else we cannot switch tabs after editing.
	ToggleRadio.prototype.unmount = function() {
		this._domElement.removeAttribute( 'disabled' );
		return ToggleRadio.__super__.unmount.call( this );
	};

	return ToggleRadio;

} )( ContentEdit.Static );

ContentEdit.TagNames.get().register( ContentEdit.ToggleRadio, 'toggleradio' );

/**
 * Dragging columns inside tabs, drag the whole tabs element.
 */
( function() {
	var proxied = ContentEdit.DivCol.prototype._onMouseDown;
	ContentEdit.DivCol.prototype._onMouseDown = function( ev ) {
		if ( 'Toggle' === this.parent().parent().constructor.name ) {
			this.draggableParent = this.parent().parent();
		}
		return proxied.call( this, ev );
	};
} )();

/**
 * Dragging before/after the main toggle's row should drag on the toggle itself.
 */
( function() {
	var proxied = ContentEdit.DivRow.prototype._onOver;
	ContentEdit.DivRow.prototype._onOver = function( ev ) {
		var root;
		var ret = proxied.call( this, ev );
		if ( ret && 'Toggle' === this.parent().constructor.name ) {
			root = ContentEdit.Root.get();
			this._removeCSSClass( 'ce-element--drop' );
			this.parent()._addCSSClass( 'ce-element--drop' );
			return root._dropTarget = this.parent();
		}
		return ret;
	};
} )();

/**
 * Dragging stuff on top of the toggle label should be ignored, drop target should
 * be the toggle element.
 */
( function() {
	var proxied = ContentEdit.Text.prototype._onOver;
	ContentEdit.Text.prototype._onOver = function( ev ) {
		var root = ContentEdit.Root.get();
		if ( root.dragging() ) {
			if ( 'Toggle' === this.parent().constructor.name ) {
				root._dropTarget = this.parent();
			}
		}
		return proxied.call( this, ev );
	};
} )();

/* globals ContentEdit, __extends, PBSEditor, ContentSelect */

ContentEdit.IconLabel = ( function( _super ) {
	__extends( IconLabel, _super );

	function IconLabel( tagName, attributes ) {
		IconLabel.__super__.constructor.call( this, tagName, attributes );
		this.isCompundElement = true;
	}

	IconLabel.prototype.cssTypeName = function() {
		return 'iconlabel';
	};

	IconLabel.prototype.type = function() {
		return 'IconLabel';
	};

	IconLabel.prototype.typeName = function() {
		return 'IconLabel';
	};

	IconLabel.fromDOMElement = function( domElement ) {

		var cls, p, tagNames, element;
		var c, childNode, childNodes, list, _i, _len;

		// If there's no P tag because it was blank and was auto-deleted, recreate it.
		if ( ! domElement.querySelector( 'p' ) ) {
			p = document.createElement( 'P' );
			domElement.appendChild( p );
		}

		list = new this( domElement.tagName, this.getDOMElementAttributes( domElement ) );
		childNodes = ( function() {
			var _i, _len, _ref, _results;
			_ref = domElement.childNodes;
			_results = [];
			for ( _i = 0, _len = _ref.length; _i < _len; _i++ ) {
				c = _ref[_i];
				_results.push( c );
			}
			return _results;
		} )();

		tagNames = ContentEdit.TagNames.get();
		for ( _i = 0, _len = childNodes.length; _i < _len; _i++ ) {
			childNode = childNodes[_i];
			if ( 1 !== childNode.nodeType ) {
				continue;
			}

			if ( childNode.getAttribute( 'data-ce-tag' ) ) {
				cls = tagNames.match( childNode.getAttribute( 'data-ce-tag' ) );
			} else {
				cls = tagNames.match( childNode.tagName );
			}

			element = cls.fromDOMElement( childNode );
			if ( element ) {
				list.attach( element );
			}
		}

		return list;
	};

    IconLabel.prototype.focus = function() {
		this.children[1].focus();
	};

	IconLabel.prototype._onDoubleClick = function() {
		this.inspect();
	};

	IconLabel.droppers = PBSEditor.allDroppers;

	return IconLabel;

} )( ContentEdit.Div );

ContentEdit.TagNames.get().register( ContentEdit.IconLabel, 'iconlabel' );

/**
 * Don't delete the p tag when pressing the delete key.
 */
( function() {
   var proxied = ContentEdit.Text.prototype._keyDelete;
   ContentEdit.Text.prototype._keyDelete = function( ev ) {

	   var selection;

	   if ( this.parent() && 'IconLabel' === this.parent().constructor.name ) {
		   selection = ContentSelect.Range.query( this._domElement );
		   if ( ! ( this._atEnd( selection ) && selection.isCollapsed() ) ) {
			   return;
		   }
		   ev.preventDefault();
		   return;
	   }
	   return proxied.call( this, ev );
   };
} )();

/**
 * Don't delete the p tag when pressing the backspace key.
 */
( function() {
   var proxied = ContentEdit.Text.prototype._keyBack;
   ContentEdit.Text.prototype._keyBack = function( ev ) {
	   var selection;
	   if ( this.parent() && 'IconLabel' === this.parent().constructor.name ) {
		   selection = ContentSelect.Range.query( this._domElement );
		   if ( ! ( 0 === selection.get()[0] && selection.isCollapsed() ) ) {
			   return;
		   }
		   ev.preventDefault();
		   this._syncContent();
		   return;
	   }
	   return proxied.call( this, ev );
   };
} )();

/**
 * Don't do anything when pressing enter inside the text.
 */
( function() {
	var proxied = ContentEdit.Text.prototype._keyReturn;
	ContentEdit.Text.prototype._keyReturn = function( ev ) {
		if ( this.parent() && 'IconLabel' === this.parent().constructor.name ) {
			if ( this.parent().nextSibling() ) {
				this.parent().nextSibling().focus();
			}
			ev.preventDefault();
			return;
		}
		return proxied.call( this, ev );
	};
} )();

/**
 * Don't allow the text inside an icon label to be detached.
 */
( function() {
	var proxied = ContentEdit.Text.prototype.blur;
	ContentEdit.Text.prototype.blur = function( ev ) {
		if ( this.parent() && 'IconLabel' === this.parent().constructor.name ) {
			if ( this.isMounted() ) {
				this._syncContent();
			}
			if ( this.isMounted() ) {
				try {
					this._domElement.blur();
				} catch ( _error ) {

					// Error = _error;
				}
				this._domElement.removeAttribute( 'contenteditable' );
			}
			return ContentEdit.Text.__super__.blur.call( this );
		}
		return proxied.call( this, ev );
	};
} )();

/**
 * When dragging an icon label's child, drag the parent.
 */
( function() {
	var proxied = ContentEdit.Text.prototype.drag;
    ContentEdit.Text.prototype.drag = function( x, y ) {
		if ( this.parent() && 'IconLabel' === this.parent().constructor.name ) {
			this.parent().drag( x, y );
			return;
		}
		return proxied.call( this, x, y );
	};
} )();

( function() {
	var proxied = ContentEdit.Icon.prototype.drag;
    ContentEdit.Icon.prototype.drag = function( x, y ) {
		if ( this.parent() && 'IconLabel' === this.parent().constructor.name ) {
			this.parent().drag( x, y );
			return;
		}
		return proxied.call( this, x, y );
	};
} )();

/**
 * Don't allow dropping stuff inside the icon label.
 */
( function() {
	var proxied = ContentEdit.Text.prototype._onOver;
	ContentEdit.Text.prototype._onOver = function( ev ) {
		var root;
		var ret = proxied.call( this, ev );
		if ( ret && this.parent() && 'IconLabel' === this.parent().constructor.name ) {
			root = ContentEdit.Root.get();
			this._removeCSSClass( 'ce-element--drop' );
			this.parent()._addCSSClass( 'ce-element--drop' );
			return root._dropTarget = this.parent();
		}
		return ret;
	};
} )();

( function() {
	var proxied = ContentEdit.Icon.prototype._onOver;
	ContentEdit.Icon.prototype._onOver = function( ev ) {
		var root;
		var ret = proxied.call( this, ev );
		if ( ret && this.parent() && 'IconLabel' === this.parent().constructor.name ) {
			root = ContentEdit.Root.get();
			this._removeCSSClass( 'ce-element--drop' );
			this.parent()._addCSSClass( 'ce-element--drop' );
			return root._dropTarget = this.parent();
		}
		return ret;
	};
} )();

/**
 * A collection of functions that extend the capabilities of HTMLString to
 * manipulate CSS styles.
 *
 * This is used by various formatting tools.
 */

/* globals HTMLString, __slice */

/**
 * Removes a style from a string.
 */
HTMLString.String.prototype.removeStyle = function() {
	var c, from, i, to, _i, styleName = null;
	var newString, z, currentStyles, newStyles;

	from = arguments[0], to = arguments[1];
	if ( arguments.length >= 3 ) {
		styleName = arguments[2];
	}

	if ( ! styleName ) {
		return this;
	}

	if ( to < 0 ) {
		to = this.length() + to + 1;
	}
	if ( from < 0 ) {
		from = this.length() + from;
	}

	newString = this.copy();
	for ( i = _i = from; from <= to ? _i < to : _i > to; i = from <= to ? ++_i : --_i ) {

		c = newString.characters[ i ];

		// Make sure we have a span tag for styling.
		if ( c._tags.length ) {

			// Remove all tags except for anchor tags.
			for ( z = c._tags.length - 1; z >= 0; z-- ) {
				if ( 'a' !== c.tags()[ z ].name() ) {

					currentStyles = window.cssToStyleObject( c.tags()[0].attr( 'style' ) );
					if ( currentStyles[ styleName ] ) {
						delete currentStyles[ styleName ];

						newStyles = window.cssToStyleString( currentStyles );
						newString.characters[ i ]._tags[0].attr( 'style', newStyles );

						// Remove the span if it doesn't have any styles.
						if ( 'span' === newString.characters[ i ]._tags[0].name() ) {
							if ( '' === newString.characters[ i ]._tags[0].attr( 'style' ).trim() ) {
								newString.characters[ i ].removeTags();
							}
						}
					}
				}
			}
		}
	}

	newString.optimize();

	return newString;
};

/**
 * Removes all inline styles from all the content.
 */
HTMLString.String.prototype.removeStyles = function() {
	var z, c, from, i, newString, to, _i, newStyles, tagName, attr, attrsToKeep;
	from = arguments[0], to = arguments[1], tagName = arguments[2], newStyles = arguments[3];

	if ( to < 0 ) {
		to = this.length() + to + 1;
	}
	if ( from < 0 ) {
		from = this.length() + from;
	}

	newString = this.copy();
	for ( i = _i = from; from <= to ? _i < to : _i > to; i = from <= to ? ++_i : --_i ) {
		c = newString.characters[ i ];

		// Make sure we have a span tag for styling.
		if ( c._tags.length ) {

			for ( z = c._tags.length - 1; z >= 0; z-- ) {

				// For links, retain the class pbs-button, href, target, and title
				if ( 'a' === c.tags()[ z ].name() ) {

					attrsToKeep = {};
					for ( attr in c.tags()[ z ]._attributes ) {
						if ( ! c.tags()[ z ]._attributes.hasOwnProperty( attr ) ) {
							continue;
						}

						if ( -1 !== [ 'href', 'target', 'title', 'contenteditable' ].indexOf( attr ) ) {
							attrsToKeep[ attr ] = c.tags()[ z ]._attributes[ attr ];
						} else if ( 'class' === attr ) {
							if ( -1 !== c.tags()[ z ]._attributes[ attr ].indexOf( 'pbs-button' ) ) {
								attrsToKeep['class'] = 'pbs-button';
							}
						}
					}

					newString.characters[i].removeTags( c.tags()[ z ] );
					newString.characters[i].addTags( new HTMLString.Tag( 'a', attrsToKeep ) );

				} else {

					// Remove all existing tags.
					newString.characters[i].removeTags( c.tags()[ z ] );
				}
			}

		}
	}

	newString.optimize();

	return newString;
};

/**
 * Checks whether a specific style is present anywhere in the content.
 * If the style name is not given, the function checks if there is any style defined.
 */
HTMLString.String.prototype.hasStyle = function() {
	var c, from, i, to, _i, styleName = null, currentStyles;
	from = arguments[0], to = arguments[1];
	if ( arguments.length >= 3 ) {
		styleName = arguments[2];
	}

	if ( to < 0 ) {
		to = this.length() + to + 1;
	}
	if ( from < 0 ) {
		from = this.length() + from;
	}

	// NewString = this.copy();
	for ( i = _i = from; from <= to ? _i < to : _i > to; i = from <= to ? ++_i : --_i ) {
		c = this.characters[i];

		// Make sure we have a span tag for styling.
		if ( ! c ) {
			continue;
		}
		if ( ! c._tags.length ) {
			continue;
		}

		if ( ! styleName ) {
			if ( ['b', 'strong', 'i', 'em'].indexOf( c.tags()[0].name() ) !== -1 ) {
				return true;
			}
			if ( c.tags()[0].attr( 'style' ) ) {
				return true;
			}
		} else {
			currentStyles = window.cssToStyleObject( c.tags()[0].attr( 'style' ) );
			if ( 'undefined' !== typeof currentStyles[ styleName ] ) {
				return currentStyles[ styleName ];
			}
		}
	}

	return false;
};

/**
 * Applies a style to the content.
 */
HTMLString.String.prototype.style = function() {
	var c, from, i, newString, tags, to, _i, newStyles, tagName;
	var dummy, isBr, z, currentStyles, styleName;
	var applyStyle, expectedStyleValue, k;

	from = arguments[0], to = arguments[1], tagName = arguments[2], newStyles = arguments[3];
	tags = new HTMLString.Tag( 'span' );

	if ( to < 0 ) {
		to = this.length() + to + 1;
	}
	if ( from < 0 ) {
		from = this.length() + from;
	}

	// Create a dummy element where we can test styles.
	dummy = document.createElement( tagName );
	dummy.style.display = 'none';
	document.body.appendChild( dummy );

	newString = this.copy();
	for ( i = _i = from; from <= to ? _i < to : _i > to; i = from <= to ? ++_i : --_i ) {
		c = newString.characters[i];

		// Make sure we have a span tag for styling.
		if ( ! c._tags.length ) {
			c.addTags( tags );
		}

		// Don't apply styles to BR tags.
		isBr = false;
		for ( z = 0; z < c._tags.length; z++ ) {
			if ( 'br' === c._tags[ z ].name() ) {
				isBr = true;
				break;
			}
		}
		if ( isBr ) {
			continue;
		}

		// Add the new styles to the existing styles.
		currentStyles = window.cssToStyleObject( c.tags()[0].attr( 'style' ) );
		for ( styleName in newStyles ) {
			if ( newStyles.hasOwnProperty( styleName ) && newStyles[ styleName ] ) {

				if ( 'string' === typeof newStyles[ styleName ] ) {
					newStyles[ styleName ] = [ '', newStyles[ styleName ] ];
				} else if ( '' !== newStyles[ styleName ][0] ) {
					newStyles[ styleName ].unshift( '' );
				}
				expectedStyleValue = newStyles[ styleName ][ newStyles[ styleName ].length - 1 ];

				// Go through styles we want to apply.
				for ( k = 0; k < newStyles[ styleName ].length; k++ ) {
					applyStyle = newStyles[ styleName ][ k ];

					// Try it out if it works.
					/*
					Var dummyStyleAttribute = '';
					if ( applyStyle ) {
						dummyStyleAttribute = 'style="' + styleName + ': ' + applyStyle + '"';
					}
					dummy.innerHTML = '<span ' + dummyStyleAttribute + '>' + c.c() + '</span>';
					var appliedStyles = window.getComputedStyle( dummy.firstChild );

					if ( appliedStyles[ styleName ] === expectedStyleValue ) {
						break;
					}
					*/
				}

				currentStyles[ styleName ] = applyStyle;

			} else {

				// Remove the style.
				delete currentStyles[ styleName ];
			}

			// If the style is blank, just don't include it.
			if ( '' === currentStyles[ styleName ] ) {
				delete currentStyles[ styleName ];
			}

		}

		// Apply the styles.
		newString.characters[i]._tags[0].attr( 'style', window.cssToStyleString( currentStyles ) );

		// Remove the span if it doesn't have any styles.
		if ( 'span' === newString.characters[i]._tags[0].name() ) {
			if ( '' === newString.characters[i]._tags[0].attr( 'style' ).trim() ) {
				newString.characters[i].removeTags();
			}
		}
	}

	// Remove the style tester.
	document.body.removeChild( dummy );

	newString.optimize();

	return newString;
};

/**
 * Gets the style of the content. This only returns the first encountered
 * style.
 */
HTMLString.String.prototype.getStyle = function( styleName, element ) {
	var dashedStyleName = styleName;
	var nodeToCheck, nodeHTML, foundNode, i, style, styleRegex, match;

	styleName = styleName.replace( /-([a-z])/g, function( m, w ) {
	    return w.toUpperCase();
	} );

	// We check this node's styles.
	nodeToCheck = element._domElement;

	// If the highlighted text is a node, find it in the element
	nodeHTML = this.html();
	foundNode = false;
	if ( 0 === nodeHTML.indexOf( '<' ) ) {
		for ( i = 0; i < element._domElement.children.length; i++ ) {
			if ( element._domElement.children[ i ].outerHTML === nodeHTML ) {
				nodeToCheck = element._domElement.children[ i ];
				foundNode = true;
				break;
			}
		}
	}

	// If the node cannot be found, this means multiple nodes are selected,
	// use the first node's styles
	if ( ! foundNode && 0 === nodeHTML.indexOf( '<' ) ) {

		// Check using style attribute first because this is faster.
		if ( 1 === nodeToCheck.firstChild.nodeType ) {
			style = nodeToCheck.firstChild.style[ dashedStyleName ];
			if ( '' !== style ) {
				return style;
			}
		}

		// Var styleRegex = new RegExp( '(<\\w+[^>]+style=[^>]*[^-]' + dashedStyleName + ':\\s*)([\\w.]+)' );
		styleRegex = new RegExp( '(<\\w+[^>]+style=[^>]*[^-]' + dashedStyleName + ':\\s*)([^;"]+)' );
		match = nodeHTML.match( styleRegex );
		if ( match ) {
			return match[2];
		}
	}

	if ( nodeToCheck.style[ styleName ] ) {
		return nodeToCheck.style[ styleName ];
	}

	return window.pbsGetComputedStyle( nodeToCheck )[ styleName ];
};

/**
 * Fixed: Edge bug where PBS did not start at all and was stuck in "Please Wait".
 * HACK: IE Edge sometimes sends an array containing an empty array to this method.
 *
 * @see https://github.com/GetmeUK/ContentTools/issues/258
 */
HTMLString.Character.prototype.addTags = function() {
	var tag, tags, _i, _len, _results;
	tags = 1 <= arguments.length ? __slice.call( arguments, 0 ) : [];
	_results = [];
	for ( _i = 0, _len = tags.length; _i < _len; _i++ ) {
		tag = tags[_i];

        // HACK: IE Edge sometimes sends an array containing an empty array to this method.
        if ( Array.isArray( tag ) ) {
			continue;
        }

		if ( tag.selfClosing() ) {
			if ( ! this.isTag() ) {
				this._tags.unshift( tag.copy() );
			}
			continue;
		}

		_results.push( this._tags.push( tag.copy() ) );
	}
	return _results;
};

// Remove all contenteditable attributes in the contents.
( function() {
	var proxy = HTMLString.String.prototype.html;
	HTMLString.String.prototype.html = function() {
		var ret = proxy.call( this );
		return ret.replace( /(<[^>]+)\scontenteditable(=['"](.*?)['"])?([^>]*>)/g, '$1$4' );
	};
} )();

/* globals PBSEditor, pbsParams */

/**
 * Usage:

	PBSEditor.openMediaManager( function( attachment ) {
		element.style( 'background-image', 'url(' + attachment.attributes.url + ')' );
		element.attr( 'data-bg-image-id', attachment.id );
	}, imageID );
 */

( function() {
	var ready = function() {
		wp.media.frames.pbsSelectImage = wp.media( {
			title: pbsParams.labels.select_image,
			multiple: false,
			library: {
				type: 'image'
			},
			button: {
				text: pbsParams.labels.use_selected_image
			}
		} );

		PBSEditor.openMediaManager = function( callback, selectedImageID ) {
			wp.media.frames.pbsSelectImage.callback = function( ) {
				var selection, ret;

				// Remove event listeners.
				wp.media.frames.pbsSelectImage.off( 'close', wp.media.frames.pbsSelectImage.callback );
				wp.media.frames.pbsSelectImage.off( 'select', wp.media.frames.pbsSelectImage.callback );

				// Get selected image.
			    selection = wp.media.frames.pbsSelectImage.state().get( 'selection' );

			    // Nothing selected, do nothing.
			    if ( ! selection ) {
			        return;
			    }

				// Iterate through selected elements
				ret = null;
		        selection.each( function( attachment ) {
					ret = attachment;
		        } );
				if ( ret ) {
					callback( ret );
				}
			};

			// Add new event handlers;
			wp.media.frames.pbsSelectImage.on( 'close', wp.media.frames.pbsSelectImage.callback );
			wp.media.frames.pbsSelectImage.on( 'select', wp.media.frames.pbsSelectImage.callback );

			wp.media.frames.pbsSelectImage._onOpen = function() {
				var selection, attachment;

				wp.media.frames.pbsSelectImage.off( 'open', wp.media.frames.pbsSelectImage._onOpen );

				selection = wp.media.frames.pbsSelectImage.state().get( 'selection' );
				if ( ! selection ) {
					return;
				}

				while ( selection.length ) {
					selection.remove( selection.first() );
				}

				if ( selectedImageID ) {
					attachment = wp.media.attachment( selectedImageID );

					if ( attachment ) {
						selection.add( attachment );
					}
				}
			};
			wp.media.frames.pbsSelectImage.on( 'open', wp.media.frames.pbsSelectImage._onOpen );

			wp.media.frames.pbsSelectImage.open();
		};
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals pbsParams */

/**
 * Loads widget templates in the DOM, we need to do this using Ajax since
 * Doing it via PHP enqueues scripts that may cause errors.
 */
( function() {
	var ready = function() {

		var appendWidgetTemplates, storedWidgetHash, storedWidgets, payload, xhr;

		// Only do this if the editor is present.
		if ( ! document.querySelector( '[data-name="main-content"]' ) ) {
			return;
		}

		/**
		 * Appends all the widget templates into the page.
		 */
		appendWidgetTemplates = function( ajaxResponse ) {

			var dummy = document.createElement( 'DIV' );

			// Store it so we won't have to do this next time.
			localStorage.setItem( 'pbs_get_widget_templates_hash', pbsParams.widget_list_hash );
			localStorage.setItem( 'pbs_get_widget_templates', ajaxResponse );

			// Append the templates into the body.
			dummy.innerHTML = ajaxResponse;

			while ( dummy.firstChild ) {
				document.body.appendChild( dummy.firstChild );
			}
		};

		/**
		 * Check if we have a stored set of widget templates from a previous page load,
		 * use those to make things faster.
		 */
		storedWidgetHash = localStorage.getItem( 'pbs_get_widget_templates_hash' );
		storedWidgets = localStorage.getItem( 'pbs_get_widget_templates' );

		if ( storedWidgetHash === pbsParams.widget_list_hash && storedWidgets ) {
			appendWidgetTemplates( storedWidgets );
			return;
		}

		/**
		 * Perform an ajax call to get all the widget templates.
		 */
		payload = new FormData();
		payload.append( 'action', 'pbs_get_widget_templates' );
		payload.append( 'nonce', pbsParams.nonce );

		xhr = new XMLHttpRequest();

		xhr.onload = function() {
			if ( xhr.status >= 200 && xhr.status < 400 ) {
				appendWidgetTemplates( xhr.responseText );
			}
		};

		xhr.open( 'POST', pbsParams.ajax_url );
		xhr.send( payload );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentTools, ContentEdit, pbsParams */

window.PBSEditor.ToolboxFormatting = ( function() {

	function ToolboxFormatting( tools ) {
		this._tools = tools;
		this._toolUIs = {};
	}

	ToolboxFormatting.createDiv = function( classArray ) {
		var i, div = document.createElement( 'DIV' );
		for ( i = 0; i < classArray.length; i++ ) {
			div.classList.add( classArray[ i ] );
		}
		return div;
	};

	ToolboxFormatting.getInstance = function( tools ) {
		if ( ! this._toolbox ) {
			this.init( tools );
		}
		return this._toolbox;
	};

	ToolboxFormatting.init = function( tools ) {
		this._toolbox = new this( tools );
		return this._toolbox.mount();
	};

	ToolboxFormatting.destroy = function() {
		this._toolbox.unmount();
		this._toolbox = null;
	};

	ToolboxFormatting.prototype.getTool = function( name ) {
		if ( this._toolUIs[ name ] ) {
			return this._toolUIs[ name ];
		}
		return null;
	};

	ToolboxFormatting.prototype.isShown = function() {
		return this._domElement.classList.contains( 'ct-widget--active' );
	};

	ToolboxFormatting.prototype.toggle = function() {
		if ( this.isShown() ) {
			this.hide();
		} else {
			this.show();
		}
		return this;
	};

	ToolboxFormatting.prototype.show = function() {

		if ( this.isShown() ) {
			return this;
		}

		// TODO: Change ct-widget--active to a pbs one.
		this._domElement.classList.add( 'ct-widget--active' );
		this.updateTools();
		return this;
	};

	ToolboxFormatting.prototype.hide = function() {

		if ( ! this.isShown() ) {
			return this;
		}

		this._domElement.classList.remove( 'ct-widget--active' );
		return this;
	};

	ToolboxFormatting.prototype.mount = function() {
		var domToolGroup, i, tool, toolGroup, toolName, _i, _j, _len, _len1, _ref, premiumProp;

		// TODO: Remove ct-widget and ct-toolbox.
		this._domElement = this.constructor.createDiv( [ 'pbs-toolbox-bar', 'ct-widget', 'ct-toolbox' ] );
		document.body.appendChild( this._domElement );
		_ref = this._tools;
		for ( i = _i = 0, _len = _ref.length; _i < _len; i = ++_i ) {
			toolGroup = _ref[i];
			domToolGroup = this.constructor.createDiv( ['ct-tool-group'] );
			this._domElement.appendChild( domToolGroup );
			for ( _j = 0, _len1 = toolGroup.length; _j < _len1; _j++ ) {
				toolName = toolGroup[_j];

				if ( '|' === toolName ) {
					tool = this.constructor.createDiv( ['pbs-tool-sep'] );
					domToolGroup.appendChild( tool );
					continue;
				}

				// Add placeholder premium elements in the lite version.
				if ( pbsParams.is_lite && window.PBSEditor.premiumTools ) {
					premiumProp = window.PBSEditor.premiumTools[ toolName ];
					if ( premiumProp ) {
						tool = ContentTools.ToolShelf.fetch( 'premium-formatting' );
						tool.icon = toolName;

						if ( 'object' === typeof premiumProp ) {
							if ( premiumProp.label ) {
								tool.label = premiumProp.label;
							}
						} else {
							tool.label = premiumProp;
						}

						this._toolUIs[ toolName ] = new ContentTools.ToolUI( tool );
						this._toolUIs[ toolName ].mount( domToolGroup );
						this._toolUIs[ toolName ]._domElement.classList.add( 'pbs-premium-flag' );

						if ( 'object' === typeof premiumProp ) {
							if ( premiumProp.callback ) {
								premiumProp.callback( this._toolUIs[ toolName ] );
							}
						}

						continue;
					}
				}

				tool = ContentTools.ToolShelf.fetch( toolName );
				this._toolUIs[toolName] = new ContentTools.ToolUI( tool );
				this._toolUIs[toolName].mount( domToolGroup );
				this._toolUIs[toolName].disabled( true );

				// TODO: Remove this or something.
				// this._toolUIs[toolName].bind( 'apply', ( function( _this ) {
				// 	return function() {
				// 		return _this.updateTools();
				// 	};
				// } )( this ) );
			}
		}
		return this._addDOMEventListeners();
	};

	ToolboxFormatting.prototype.unmount = function() {
		return this._removeDOMEventListeners();
	};

	ToolboxFormatting.prototype.updateTools = function() {
		if ( this._updateTimeout ) {
			return this;
		}
		this._updateTimeout = setTimeout( function() {
			var element, name, selection;
			element = ContentEdit.Root.get().focused();
			selection = element && element.selection ? element.selection() : false;
			for ( name in this._toolUIs ) {
				this._toolUIs[ name ].update( element, selection );
			}
			this._updateTimeout = null;
		}.bind( this ), 50 );
		return this;
	};

	ToolboxFormatting.prototype.keyUp = function( ev ) {
		if ( ev.metaKey || ev.ctrlKey ) {
			this.updateTools();
		}
		if ( [ 40, 37, 39, 38, 9, 8, 46, 13, 16, 91, 18 ].indexOf( ev.keyCode ) !== -1 ) {
			this.updateTools();
		}
	};

	ToolboxFormatting.prototype._addDOMEventListeners = function() {
		if ( ! this._updateToolsBound ) {
			this._updateToolsBound = this.updateTools.bind( this );
		}
		if ( ! this._keyupBound ) {
			this._keyupBound = this.keyUp.bind( this );
		}
		wp.hooks.addAction( 'pbs.shortcut.keyup', 'pbs', this._updateToolsBound );
		document.addEventListener( 'keyup', this._keyupBound );
		document.addEventListener( 'mouseup', this._updateToolsBound );
		ContentEdit.Root.get().bind( 'attach', this._updateToolsBound );
		ContentEdit.Root.get().bind( 'focus', this._updateToolsBound );
		ContentEdit.Root.get().bind( 'blur', this._updateToolsBound );
		ContentEdit.Root.get().bind( 'detach', this._updateToolsBound );
		return this;
	};

	ToolboxFormatting.prototype._removeDOMEventListeners = function() {
		wp.hooks.removeAction( 'pbs.shortcut.keyup', 'pbs', this._updateToolsBound );
		document.addEventListener( 'keyup', this._keyupBound );
		document.addEventListener( 'mouseup', this._updateToolsBound );
		ContentEdit.Root.get().bind( 'attach', this._updateToolsBound );
		ContentEdit.Root.get().bind( 'focus', this._updateToolsBound );
		ContentEdit.Root.get().bind( 'blur', this._updateToolsBound );
		ContentEdit.Root.get().bind( 'detach', this._updateToolsBound );

		this._updateToolsBound = null;
		this._keyupBound = null;
		return this;
	};

	return ToolboxFormatting;

} )();

( function() {

	wp.hooks.addAction( 'pbs.init', 'pbs', function() {
		window.PBSEditor.ToolboxFormatting.getInstance( window.PBSEditor.formattingTools );
	} );

	wp.hooks.addAction( 'pbs.start', 'pbs', function() {
		window.PBSEditor.ToolboxFormatting.getInstance().show().updateTools();
	} );

	wp.hooks.addAction( 'pbs.stop', 'pbs', function() {
		window.PBSEditor.ToolboxFormatting.getInstance().hide();
	} );

} )();

/**
 * Make labels translatable.
 */
ContentTools.Tools.Bold.label = pbsParams.labels.bold;
ContentTools.Tools.Italic.label = pbsParams.labels.italic;
ContentTools.Tools.Link.label = pbsParams.labels.link;
ContentTools.Tools.AlignLeft.label = pbsParams.labels.align_left;
ContentTools.Tools.AlignCenter.label = pbsParams.labels.align_center;
ContentTools.Tools.AlignRight.label = pbsParams.labels.align_right;
ContentTools.Tools.OrderedList.label = pbsParams.labels.numbered_list;
ContentTools.Tools.UnorderedList.label = pbsParams.labels.bullet_list;
ContentTools.Tools.Indent.label = pbsParams.labels.indent;
ContentTools.Tools.Unindent.label = pbsParams.labels.unindent;
ContentTools.Tools.Undo.label = pbsParams.labels.undo;
ContentTools.Tools.Redo.label = pbsParams.labels.redo;

/* globals ContentTools, __extends, pbsParams */

window.PBSEditor.ToolboxElements = ( function( _super ) {
	__extends( ToolboxElements, _super );

	function ToolboxElements( tools ) {
		ToolboxElements.__super__.constructor.call( this );
		this._tools = tools;
		this._toolUIs = {};
	}

	ToolboxElements.prototype.show = function() {
		if ( this.isShown() ) {
			return this;
		}
		ToolboxElements.__super__.show.call( this );
		this._domElement.scrollTop = 0;
		wp.hooks.doAction( 'pbs.tool.popup.open', this );
		return this;
	};

	ToolboxElements.prototype.updateTools = function() {

		// Do nothing.
	};

	ToolboxElements.prototype.mount = function() {
		var domToolGroup, i, tool, toolGroup, toolName, _i, _j, _len, _len1;
		var _ref, note, label;

		this._domElement = this.constructor.createDiv( [ 'pbs-interactive-elements-group', 'pbs-toolbox-elements', 'ct-widget', 'ct-toolbox' ] );
		document.body.appendChild( this._domElement );

		note = this.constructor.createDiv( [ 'pbs-toolbox-elements-note' ] );
		note.innerHTML = pbsParams.labels.drag_an_element;
		this._domElement.appendChild( note );

		_ref = this._tools;
		for ( i = _i = 0, _len = _ref.length; _i < _len; i = ++_i ) {
			toolGroup = _ref[i];
			domToolGroup = this.constructor.createDiv( ['ct-tool-group'] );
			this._domElement.appendChild( domToolGroup );
			for ( _j = 0, _len1 = toolGroup.length; _j < _len1; _j++ ) {
				toolName = toolGroup[_j];

				// Add placeholder premium elements in the lite version.
				/*if ( pbsParams.is_lite && window.PBSEditor.premiumElements ) {
					console.log("if 1 - "+toolName);
					if ( window.PBSEditor.premiumElements[ toolName ] ) {
						console.log("if 2 - "+toolName);
						tool = ContentTools.ToolShelf.fetch( 'premium-formatting' );
						tool.icon = toolName;
						tool.buttonName = window.PBSEditor.premiumElements[ toolName ];
						tool.label = '';
						this._toolUIs[ toolName ] = new ContentTools.ToolUI( tool );
						this._toolUIs[ toolName ].mount( domToolGroup );
						this._toolUIs[ toolName ]._domElement.setAttribute( 'title', 'Premium Element' );
						this._toolUIs[ toolName ]._domElement.classList.add( 'pbs-premium-flag' );
						// continue;
					}
				}*/

				try {
					tool = ContentTools.ToolShelf.fetch( toolName );
				} catch ( err ) {
			        label = this.constructor.createDiv( ['ct-tool', 'pbs-element-label'] );
					label.innerHTML = toolName;
					domToolGroup.appendChild( label );
					continue;
				}

				this._toolUIs[toolName] = new ContentTools.ToolUI( tool );
				this._toolUIs[toolName].mount( domToolGroup );

				if ( pbsParams.is_lite && window.PBSEditor.premiumElements ) {
					//console.log("if 1 premiumElements");
					if ( window.PBSEditor.premiumElements[ toolName ] ) {
						//console.log("if 2 - "+toolName);
						this._toolUIs[ toolName ]._domElement.classList.add( 'pbs-premium-flag' );
					}
				}

			}
		}
		return this._addDOMEventListeners();
	};

	ToolboxElements.prototype.closeWhenLeaving = function() {
		if ( PBS.isEditing ) {
			this.hide();
		}
	};

	ToolboxElements.prototype.closeWhenClickingOutside = function( ev ) {
		if ( ! PBS.isEditing ) {
			return;
		}

		if ( this._domElement !== ev.target && ! this._domElement.contains( ev.target ) ) {
			this.hide();
		}
	};

	ToolboxElements.prototype.openWhenHoverOnSide = function( ev ) {
		if ( ! PBS.isEditing ) {
			return;
		}

		if ( ev.screenX <= 5 && ev.screenY > 70 ) {
			this.show();
		}
	};

	ToolboxElements.prototype._addDOMEventListeners = function() {
		if ( ! this._closeWhenLeavingBound ) {
			this._closeWhenLeavingBound = this.closeWhenLeaving.bind( this );
		}
		if ( ! this._closeWhenClickingOutsideBound ) {
			this._closeWhenClickingOutsideBound = this.closeWhenClickingOutside.bind( this );
		}
		if ( ! this._openWhenHoverOnSideBound ) {
			this._openWhenHoverOnSideBound = this.openWhenHoverOnSide.bind( this );
		}

		// When leaving the toolbar, hide it.
		this._domElement.addEventListener( 'mouseleave', this._closeWhenLeavingBound );

		// Close when clicking outside the toolbox.
		document.body.addEventListener( 'mousedown', this._closeWhenClickingOutsideBound );
		document.body.addEventListener( 'mouseup', this._closeWhenClickingOutsideBound );
		document.body.addEventListener( 'keydown', this._closeWhenClickingOutsideBound );

		// Open when hovering over the side of the window.
		document.body.addEventListener( 'mousemove', this._openWhenHoverOnSideBound );

		return this;
	};

	ToolboxElements.prototype._removeDOMEventListeners = function() {

		this._domElement.removeEventListener( 'mouseleave', this._closeWhenLeavingBound );
		document.body.removeEventListener( 'mousedown', this._closeWhenClickingOutsideBound );
		document.body.removeEventListener( 'mouseup', this._closeWhenClickingOutsideBound );
		document.body.removeEventListener( 'keydown', this._closeWhenClickingOutsideBound );
		document.body.removeEventListener( 'mousemove', this._openWhenHoverOnSideBound );

		return this;
	};

	return ToolboxElements;

} )( window.PBSEditor.ToolboxFormatting );

( function() {

	wp.hooks.addAction( 'pbs.init', 'pbs', function() {
		window.PBSEditor.ToolboxElements.getInstance( window.PBSEditor.insertElements );
	} );

	wp.hooks.addAction( 'pbs.stop', 'pbs', function() {
		window.PBSEditor.ToolboxElements.getInstance().hide();
	} );

} )();

/* globals ContentTools, ContentEdit, __extends, PBSEditor, pbsParams */

( function() {
	var proxied = ContentTools.ToolUI.prototype._onMouseLeave;
	ContentTools.ToolUI.prototype._onMouseLeave = function( ev ) {
		var element;

		if ( this._mouseDown && this._domElement.classList.contains( 'pbs-tool-large' ) ) {

			// Premium elements do nothing.
			if ( pbsParams.is_lite && window.PBSEditor.premiumElements ) {
				if ( window.PBSEditor.premiumElements[ this.tool.tagName ] || window.PBSEditor.premiumElements[ this.tool.icon.toLowerCase() ] ) {
					ev.stopPropagation();
					ev.preventDefault();
					return proxied.call( this, ev );
				}
			}

			if ( ContentEdit.Root.get().focused() ) {
				ContentEdit.Root.get().focused().blur();
			}

			element = new ContentEdit.NewElementDragHelper( this.tool );
			ContentTools.EditorApp.get().regions()['main-content'].attach( element );
			element.drag( ev.screenX, ev.screenY + window.pbsScrollY() );
			ev.stopPropagation();
			ev.preventDefault();
		}
		return proxied.call( this, ev );
	};
} )();

ContentEdit.NewElementDragHelper = ( function( _super ) {
	__extends( NewElementDragHelper, _super );

	function NewElementDragHelper( tool, attributes ) {
		NewElementDragHelper.__super__.constructor.call( this, 'div', attributes );
		this._content = '';
		this.tool = tool;
	}

    NewElementDragHelper.droppers = PBSEditor.allDroppers;

	NewElementDragHelper.prototype.typeName = function() {
		return this.tool.label;
	};

	NewElementDragHelper.prototype.drop = function( element, placement ) {

		var index;

		// If dragged into nothing, cancel the drag.
		if ( ! element ) {
			ContentEdit.Root.get().cancelDragging();
			this.parent().detach( this );
			return;
		}

		index = element.parent().children.indexOf( element );
		index += 'above' === placement[0] ? 0 : 1;

		this.tool.createNew( element.parent(), index );

		// Remove the drag helper element.
		this.parent().detach( this );
	};

	return NewElementDragHelper;

} )( ContentEdit.Static );

ContentEdit.TagNames.get().register( ContentEdit.NewElementDragHelper, 'NewElementDragHelper' );

/* globals ContentTools, __extends, __bind, PBSInspectorOptions, pbsParams, fastdom */

ContentTools.ToolboxPropertiesUI = ( function( _super ) {
	__extends( ToolboxPropertiesUI, _super );

	function ToolboxPropertiesUI( tools ) {
		this._onClose = __bind( this._onClose, this );
		ToolboxPropertiesUI.__super__.constructor.call( this, tools );
	}

    ToolboxPropertiesUI.prototype.isDragging = function() {
		return ToolboxPropertiesUI.__super__.isDragging.call( this );
    };

	ToolboxPropertiesUI.prototype.show = function() {
		if ( ! this.isMounted() ) {
			this.mount();
		}
		if ( ! this.hasContents ) {
			return;
		}
		return this.addCSSClass( 'ct-widget--active' );
	};

    ToolboxPropertiesUI.prototype.isOpen = function() {
		return this._domElement.classList.contains( 'ct-widget--active' );
    };

    ToolboxPropertiesUI.prototype.hide = function() {
		if ( this.isMounted() ) {
			this.removeCSSClass( 'ct-widget--active' );
			this._domElement.classList.remove( 'pbs-scroll-move' );
			this._element = null;
		}

		// Remove scroll handler on close.
		window.removeEventListener( 'scroll', this._scrollLocationUpdateBound );
		clearInterval( this._scrollUpdateTimeout );
		this._scrollUpdateTimeout = null;
    };

    ToolboxPropertiesUI.prototype.tools = function( tools ) {
		return ToolboxPropertiesUI.__super__.tools.call( this, tools );
    };

    ToolboxPropertiesUI.prototype.mount = function() {
		var domToolGroup, i, tool, toolGroup, toolName, _i, _j, _len, _len1, _ref;
		this._domElement = this.constructor.createDiv( ['pbs-toolbox-properties', 'ct-widget', 'ct-toolbox'] );
		this.parent().domElement().appendChild( this._domElement );
		this._domGrip = document.createElement( 'DIV' );
		this._domTabs = this.constructor.createDiv( [ 'pbs-toolbox-tabs' ] );
		this._domElement.appendChild( this._domTabs );
		this._domSections = this.constructor.createDiv( [ 'pbs-toolbox-sections' ] );
		this._domElement.appendChild( this._domSections );
		this._domResize = this.constructor.createDiv( [ 'pbs-toolbox-resizer' ] );
		this._domElement.appendChild( this._domResize );

		// Listen to when options are changed for action button visibility.
		this._applyActionButtonVisibility = this.applyActionButtonVisibility.bind( this );
		wp.hooks.addAction( 'pbs.option.changed', 'pbs.option', this._applyActionButtonVisibility );

		_ref = this._tools;
		for ( i = _i = 0, _len = _ref.length; _i < _len; i = ++_i ) {
			toolGroup = _ref[i];
			domToolGroup = this.constructor.createDiv( ['ct-tool-group'] );
			this._domElement.appendChild( domToolGroup );
			for ( _j = 0, _len1 = toolGroup.length; _j < _len1; _j++ ) {
				toolName = toolGroup[_j];
				tool = ContentTools.ToolShelf.fetch( toolName );
				this._toolUIs[ toolName ] = new ContentTools.ToolUI( tool );
				this._toolUIs[ toolName ].mount( domToolGroup );
				this._toolUIs[ toolName ].bind( 'apply', ( function( _this ) {
					return function() {
						return _this.updateTools();
					};
				} )( this ) );
			}
		}
		return this._addDOMEventListeners();
    };

    ToolboxPropertiesUI.prototype.updateTools = function() {
		return ToolboxPropertiesUI.__super__.updateTools.call( this );
    };

    ToolboxPropertiesUI.prototype.unmount = function() {
		wp.hooks.removeAction( 'pbs.option.changed', 'pbs.option', this._applyActionButtonVisibility );
		return ToolboxPropertiesUI.__super__.unmount.call( this );
    };

    ToolboxPropertiesUI.prototype._addDOMEventListeners = function() {
		this._onResizeBound = this._onResize.bind( this );
		this._onResizeMoveBound = this._onResizeMove.bind( this );
		this._onResizeStopBound = this._onResizeStop.bind( this );
		this._domResize.addEventListener( 'mousedown', this._onResizeBound );
		ToolboxPropertiesUI.__super__._addDOMEventListeners.call( this );
    };

	ToolboxPropertiesUI.prototype._onResize = function( ev ) {
		ev.preventDefault();
		ev.stopPropagation();
		document.body.addEventListener( 'mousemove', this._onResizeMoveBound );
		document.body.addEventListener( 'mouseup', this._onResizeStopBound );
		this._resizeStart = ev.screenY;
		this._resizeOrigHeight = this._domElement.getBoundingClientRect().height;
	};

	ToolboxPropertiesUI.prototype._onResizeMove = function( ev ) {
		ev.preventDefault();
		ev.stopPropagation();
		this._domElement.style.transition = 'none';
		this._domElement.style.height = ( this._resizeOrigHeight + ( ev.screenY - this._resizeStart ) ) + 'px';
	};

	ToolboxPropertiesUI.prototype._onResizeStop = function( ev ) {
		ev.preventDefault();
		ev.stopPropagation();
		document.body.removeEventListener( 'mousemove', this._onResizeMoveBound );
		document.body.removeEventListener( 'mouseup', this._onResizeStopBound );
		this._domElement.style.transition = '';
	};

	/**
	 * Position the bubble's position on the element.
	 */
	ToolboxPropertiesUI.prototype._repositionOn = function( element ) {
		var elemRect, inspectorRect;

		if ( ! this.isMounted() ) {
			return;
		}
		if ( window.innerWidth <= 800 ) {
			return;
		}
		if ( ! element._domElement || ! this._domElement ) {
			return;
		}

		elemRect = window.pbsGetBoundingClientRect( element._domElement );
		inspectorRect = window.pbsGetBoundingClientRect( this._domElement );

		fastdom.measure( function() {
			var windowHeight = window.innerHeight;
			var windowWidth = window.innerWidth;
			var elemLeft = elemRect.left;
			var elemRight = elemRect.right;
			var elemTop = elemRect.top;
			var elemWidth = elemRect.width;
			var elemHeight = elemRect.height;
			var inspectorWidth = inspectorRect.width;
			var spaceAbove = elemTop - 77;
			var spaceBelow = windowHeight - elemTop - elemHeight / 3;
			var spaceLeft = elemLeft;
			var spaceRight = windowWidth - elemRight;

			// This is tied to min-height & height in editor-toolbox-properties.scss.
			var inspectorHeight = windowHeight * 0.4 - 77 < 350 ? 350 : windowHeight * 0.4 - 77;
			var inspectorFullHeight = windowHeight - 40 - 77;

			fastdom.mutate( function() {

				var newInspectorLeft, newInspectorTop, newInspectorHeight;
				var percentage = 50;
				var arrowLocation = 'center';

				/**
				 * Horizontal alignment.
				 */

				// Unless there is huge space on the left/right.
				if ( spaceRight - 40 > inspectorWidth ) {

					// Right. Full-height.
					this._domElement.style.left = ( elemRight + 20 ) + 'px';
					this._domElement.style.height = inspectorFullHeight + 'px';

					arrowLocation = 'left';
					newInspectorTop = 97;
					newInspectorHeight = inspectorFullHeight;

				} else if ( spaceLeft - 40 > inspectorWidth ) {

					// Left. Full-height.
					this._domElement.style.left = ( elemLeft - inspectorWidth - 20 ) + 'px';

					arrowLocation = 'right';
					newInspectorTop = 97;
					newInspectorHeight = inspectorFullHeight;

				} else {

					// Center. Height is small.
					newInspectorLeft = elemLeft + elemWidth / 2 - inspectorWidth / 2;
					this._domElement.style.left = newInspectorLeft + 'px';

					arrowLocation = 'down';
					newInspectorTop = null;
					newInspectorHeight = inspectorHeight;

					// Check the sides if we're going past the window.
					if ( newInspectorLeft < 20 ) {

						// Check if too far left.
						this._domElement.style.left = '20px';

					} else if ( newInspectorLeft + inspectorWidth > windowWidth - 20 ) {

						// Check if too far right.
						this._domElement.style.left = ( windowWidth - inspectorWidth - 20 ) + 'px';

					}
				}

				if ( 'right' === arrowLocation || 'left' === arrowLocation ) {

					// Left and right.
					percentage = ( elemTop + elemHeight / 2 - newInspectorTop ) / newInspectorHeight;
					percentage = Math.round( percentage * 10 ) * 10;
					if ( percentage < 0 ) {
						percentage = 0;
					} else if ( percentage > 90 ) {
						percentage = 90;
					}

				}

				/**
				 * Vertical alignment.
				 */

				if ( 'right' !== arrowLocation && 'left' !== arrowLocation ) { // Center.

					if ( elemTop > windowHeight ) {

						// If the element is way below the viewport.
						newInspectorTop = windowHeight - inspectorHeight - 20;
						arrowLocation = 'down';

					} else if ( elemTop + elemHeight < 75 ) {

						// If the element is way above the viewport.
						newInspectorTop = 97;
						arrowLocation = 'up';

					} else if ( spaceAbove > inspectorHeight ) {

						// Inspector can be placed on top.
						// newInspectorTop = elemTop - inspectorHeight - 30;
						newInspectorTop = 40;
						arrowLocation = 'down';
						newInspectorHeight = spaceAbove;

					} else if ( windowHeight - elemTop - elemHeight > inspectorHeight ) {

						// Inspector is below the element.
						newInspectorTop = elemTop + elemHeight + 20;
						arrowLocation = 'up';
						newInspectorHeight = windowHeight - elemTop - elemHeight - 30;

					} else if ( spaceBelow > inspectorHeight ) {

						// Inspector is in the middle-bottom of the element.
						newInspectorTop = windowHeight - inspectorHeight - 10;
						arrowLocation = 'up';

					} else {

						// Defaults to the top.
						newInspectorTop = 40;
						arrowLocation = 'down';

					}
				}

				this._domElement.setAttribute( 'data-arrow-location', arrowLocation );
				this._domElement.setAttribute( 'data-location-percentage', percentage );
				this._domElement.style.height = newInspectorHeight + 'px';
				if ( null !== newInspectorTop ) {
					this._domElement.style.top = newInspectorTop + 'px';
				}

			}.bind( this ) );
		}.bind( this ) );
	};

    ToolboxPropertiesUI.prototype._contain = function() {
		return;
    };

    ToolboxPropertiesUI.prototype._removeDOMEventListeners = function() {
		ToolboxPropertiesUI.__super__._removeDOMEventListeners.call( this );
    };

    ToolboxPropertiesUI.prototype._onClose = function() {
		if ( this.isMounted() ) {
			return this.hide();
		}
    };

    ToolboxPropertiesUI.prototype._onDrag = function( ev ) {
		return ToolboxPropertiesUI.__super__._onDrag.call( this, ev );
    };

    ToolboxPropertiesUI.prototype._onStartDragging = function( ev ) {
		return ToolboxPropertiesUI.__super__._onStartDragging.call( this, ev );
    };

    ToolboxPropertiesUI.prototype._onStopDragging = function( ev ) {
		return ToolboxPropertiesUI.__super__._onStopDragging.call( this, ev );
    };

	// Open the toolbox and inspect an element.
	ToolboxPropertiesUI.prototype.inspect = function( element ) {
		this._inspectElement( element );
		this._repositionOn( element );
		this.show();
		this._element = element;

		setTimeout( function() {
			if ( this._domElement.classList.contains( 'ct-widget--active' ) ) {
				this._repositionOn( this._element );
			}
		}.bind( this ), 1000 );

		// Reposition the bubble when scrolling.
		this._scrollLocationUpdateBound = this.scrollLocationUpdate.bind( this );
		window.addEventListener( 'scroll', this._scrollLocationUpdateBound );
	};

	/**
	 * Updates the bubble position. To be called when scrolling.
	 */
	ToolboxPropertiesUI.prototype.scrollLocationUpdate = function() {
		if ( this._scrollUpdateTimeout ) {
			return;
		}
		this._domElement.classList.add( 'pbs-scroll-move' );
		this._scrollUpdateTimeout = setTimeout( function() {
			if ( this._element ) {
				this._repositionOn( this._element );
				this._scrollUpdateTimeout = null;
			}
		}.bind( this ), 400 );
	};

	// Adds a tab. Used internally by addSection().
	ToolboxPropertiesUI.prototype._addTab = function( label, element ) {
		var tab = document.createElement( 'DIV' );
		tab.classList.add( 'pbs-toolbox-tab' );
		tab.innerHTML = label;
		tab.setAttribute( 'data-name', element.constructor.name );
		this._domTabs.appendChild( tab );
		tab._targetElement = element;
		tab._toolbox = this;

		// If this is the only tab, make it visible.
		if ( 1 === this._domTabs.children.length ) {
			tab.classList.add( 'pbs-toolbox-tab-shown' );
		}

		// Add event handlers.
		tab.addEventListener( 'click', function() {
			var visibleSection;
			var visibleTab = this.parentNode.querySelector( '.pbs-toolbox-tab-shown' );
			if ( visibleTab ) {
				visibleTab.classList.remove( 'pbs-toolbox-tab-shown' );
			}
			this.classList.add( 'pbs-toolbox-tab-shown' );

			visibleSection = this.parentNode.parentNode.querySelector( '.pbs-toolbox-section-shown' );
			if ( visibleSection ) {
				visibleSection.classList.remove( 'pbs-toolbox-section-shown' );
			}
			this.parentNode.parentNode.querySelector( '.pbs-toolbox-section[data-name="' + this.getAttribute( 'data-name' ) + '"]' ).classList.add( 'pbs-toolbox-section-shown' );

			this._toolbox._element = this._targetElement;
			this._toolbox._repositionOn( this._targetElement );

		}.bind( tab ) );

		tab.addEventListener( 'mouseenter', function( tab, element ) {
			this.highlightElement( element, tab );
		}.bind( this, tab, element ) );

		tab.addEventListener( 'mouseleave', function( tab, element ) {
			this.unhighlightElement( element, tab );
		}.bind( this, tab, element ) );
	};

	// Removes a tab. Used internally by removeSection().
	ToolboxPropertiesUI.prototype._removeTab = function( name ) {
		var removeMe = this._domTabs.querySelector( '[data-name="' + name + '"]' );
		if ( removeMe ) {
			this._domTabs.removeChild( removeMe );
		}
	};

	ToolboxPropertiesUI.prototype.clickActionButton = function( ev ) {
		ev.preventDefault();
		this.onClick( this.element, ev.target );
	};

	ToolboxPropertiesUI.prototype.addActionButtons = function( container, element ) {

		var i, actionButtons, button;

		if ( ! window.pbsElementActionButtons[ element.constructor.name ] ) {
			return;
		}

		actionButtons = window.pbsElementActionButtons[ element.constructor.name ];

		// Sort by priority.
		actionButtons.sort( function( a, b ) {
		    return a.priority - b.priority;
		} );

		for ( i = 0; i < actionButtons.length; i++ ) {
			button = document.createElement( 'BUTTON' );
			button.setAttribute( 'data-tooltip', actionButtons[ i ].name );
			container.appendChild( button );

			button.action = actionButtons[ i ];
			button.element = element;
			button.container = container;
			actionButtons[ i ].element = element;

			if ( actionButtons[ i ].id ) {
				button.classList.add( 'pbs-action-' + actionButtons[ i ].id );
			}

			if ( actionButtons[ i ].onClick ) {
				button.addEventListener( 'click', this.clickActionButton.bind( actionButtons[ i ] ) );
			}

			if ( 'function' === typeof actionButtons[ i ].visible ) {
				if ( ! actionButtons[ i ].visible( element, button ) ) {
					button.classList.add( 'pbs-action-button-hide' );
				}
			}
		}

	};

	// Adds a section of options for the given element.
	ToolboxPropertiesUI.prototype.addSection = function( label, element, optionIndex ) {

		var section, elemType, numWithGroups, numNoGroup, k, note;
		var shortcodeBase, shortcodeProperties, heading, shortcodeNote;
		var currElemModel, actionPanel, sectionInner;

		this.hasContents = true;

		// Add the tab.
		this._addTab( label, element );

		// Add the section.
		section = document.createElement( 'DIV' );
		section.classList.add( 'pbs-toolbox-section' );
		section.setAttribute( 'data-name', element.constructor.name );
		this._domSections.appendChild( section );

		if ( 1 === this._domSections.children.length ) {
			section.classList.add( 'pbs-toolbox-section-shown' );
		}

		// Add the action buttons.
		sectionInner = document.createElement( 'DIV' );
		sectionInner.classList.add( 'pbs-toolbox-section-inner' );
		section.appendChild( sectionInner );

		actionPanel = document.createElement( 'DIV' );
		actionPanel.classList.add( 'pbs-toolbox-actions' );
		section.appendChild( actionPanel );

		section = sectionInner;
		this.addActionButtons( actionPanel, element );

		if ( 'Shortcode' === element.constructor.name ) {

			// If there is an existing shortcode mapping, use that.
			if ( 'undefined' === typeof PBSInspectorOptions.Shortcode[ element.sc_base ] ) {
				if ( 'undefined' !== typeof pbsParams.shortcode_mappings && 'undefined' !== typeof pbsParams.shortcode_mappings[ element.sc_base ] ) {
					if ( this.createShortcodeMappingOptions ) {
						this.createShortcodeMappingOptions( element.sc_base );
					}
				}
			}
		}

		// Add options for the element.
		elemType = element.constructor.name;

		if ( 'Shortcode' === elemType ) {

			shortcodeBase = element.sc_base;
			shortcodeProperties = PBSInspectorOptions.Shortcode[ shortcodeBase ];

			if ( 'undefined' !== typeof shortcodeProperties && 'undefined' !== typeof shortcodeProperties.hidden ) {
				if ( shortcodeProperties.hidden ) {
					return;
				}
			}

			if ( 'undefined' !== typeof shortcodeProperties && 'undefined' !== typeof shortcodeProperties.options ) {

				// If there's a group, add a general group for those without a group.
				numWithGroups = 0;
				numNoGroup = 0;
				for ( k = 0; k < shortcodeProperties.options.length; k++ ) {
					if ( shortcodeProperties.options[ k ].group ) {
						numWithGroups++;
					} else {
						numNoGroup++;
					}
				}
				if ( numWithGroups && numNoGroup ) {
					for ( k = 0; k < shortcodeProperties.options.length; k++ ) {
						if ( ! shortcodeProperties.options[ k ].group ) {
							shortcodeProperties.options[ k ].group = pbsParams.labels.general;
						}
					}
				}

				for ( k = 0; k < shortcodeProperties.options.length; k++ ) {
					this.addSectionOptions( section, shortcodeProperties.options[ k ], element );
				}

				// Add a note if the shortcode doesn't have attributes.
				if ( ! shortcodeProperties.options.length ) {
					note = document.createElement( 'DIV' );
					note.innerHTML = pbsParams.labels.no_attributes_available;
					note.classList.add( 'pbs-shortcode-no-options' );
					section.appendChild( note );
				}

			} else {

				heading = document.createElement( 'DIV' );
				heading.innerHTML = pbsParams.labels.note_options_are_detected;
				section.appendChild( heading );

				this.addGenericShortcodeOptions( section, element );
			}

			// Add note.
			shortcodeNote = document.createElement( 'DIV' );
			shortcodeNote.classList.add( 'pbs-inspector-shortcode-note' );
			shortcodeNote.innerHTML = pbsParams.labels.note_shortcode_not_appearing;
			section.appendChild( shortcodeNote );

		} else if ( 'undefined' !== typeof PBSInspectorOptions[ optionIndex ] ) {

			if ( ! element.model ) {
				currElemModel = new Backbone.Model( {
					element: element
				} );
			} else {
				currElemModel = element.model;
				currElemModel.set( 'element', element );
			}

			// If there's a group, add a general group for those without a group.
			numWithGroups = 0;
			numNoGroup = 0;
			for ( k = 0; k < PBSInspectorOptions[ optionIndex ].options.length; k++ ) {
				if ( PBSInspectorOptions[ optionIndex ].options[ k ].group ) {
					numWithGroups++;
				} else {
					numNoGroup++;
				}
			}
			if ( numWithGroups && numNoGroup ) {
				for ( k = 0; k < PBSInspectorOptions[ optionIndex ].options.length; k++ ) {
					if ( ! PBSInspectorOptions[ optionIndex ].options[ k ].group ) {
						PBSInspectorOptions[ optionIndex ].options[ k ].group = pbsParams.labels.general;
					}
				}
			}

			for ( k = 0; k < PBSInspectorOptions[ optionIndex ].options.length; k++ ) {
				this.addSectionOptions( section, PBSInspectorOptions[ optionIndex ].options[ k ], element, currElemModel );
			}

			// Add hover events if there are any.
			if ( PBSInspectorOptions[ optionIndex ].onMouseEnter ) {
				section.addEventListener( 'mouseenter', function( e ) {
					PBSInspectorOptions[ optionIndex ].onMouseEnter( this, e );
				}.bind( element ) );
			}
			if ( PBSInspectorOptions[ optionIndex ].onMouseLeave ) {
				section.addEventListener( 'mouseleave', function( e ) {
					PBSInspectorOptions[ optionIndex ].onMouseLeave( this, e );
				}.bind( element ) );
			}

			// Footer notice for the inspector.
			if ( 'undefined' !== typeof PBSInspectorOptions[ optionIndex ].footer ) {
				if ( Math.random() > 0.5 ) { // Do this only half of the time.
					note = document.createElement( 'DIV' );
					note.innerHTML = PBSInspectorOptions[ optionIndex ].footer;
					note.classList.add( 'pbs-group-footer' );
					section.appendChild( note );
				}
			}
		}
	};

	// Remove a section.
	ToolboxPropertiesUI.prototype.removeSection = function( name ) {

		var removeMe;

		// Remove the tab.
		this._removeTab( name );

		// Remove the section.
		removeMe = this._domSections.querySelector( '[data-name="' + name + '"]' );
		if ( removeMe ) {
			this._domSections.removeChild( removeMe );
		}
	};

	ToolboxPropertiesUI.prototype.removeAllSections = function() {

		this.clearSections();

		// Remove all tabs.
		while ( this._domTabs.firstChild ) {
			this._domTabs.removeChild( this._domTabs.firstChild );
		}

		// Remove all sections.
		while ( this._domSections.firstChild ) {
			this._domSections.removeChild( this._domSections.firstChild );
		}
	};

	ToolboxPropertiesUI.prototype._inspectElement = function( element ) {

		var closeButton, groups, options, inspectedElementNames = [];

		if ( this._element === element ) {
			return;
		}

		this.hasContents = false;

		this.removeAllSections();

		// Add the options for the DOM element if there is one.
		while ( element.nodeType && ! element._ceElement && 'BODY' !== element.tagName ) {

			this.addOptions( element );

			element = element.parentNode;
		}

		if ( element._ceElement ) {
			element = element._ceElement;
		}

		// Add the options for the CT elements.
		while ( element && element.type ) {
			if ( inspectedElementNames.indexOf( element.constructor.name ) === -1 ) {
				this.addOptions( element );

				// Don't add options of those already added.
				inspectedElementNames.push( element.constructor.name );

				// If we already added row options, don't show another column.
				if ( 'DivRow' === element.constructor.name ) {
					inspectedElementNames.push( 'DivCol' );
				}
			}
			element = element.parent();
		}

		// If all options are premium, display a premium flag on the title.
		if ( pbsParams.is_lite ) {
			groups = this._domElement.querySelectorAll( '[data-collapse-group]' );
			Array.prototype.forEach.call( groups, function( group ) {
				var numOptions = group.querySelectorAll( '.pbs-tool-option:not(.pbs-collapsable-title)' ).length;
				var numPremiumOptions = group.querySelectorAll( '.pbs-tool-option.pbs-premium-flag' ).length;
				var title = group.firstChild;
				if ( numOptions > 0 && numOptions === numPremiumOptions ) {
					title.classList.add( 'pbs-premium-flag' );
					title.parentNode.classList.add( 'pbs-premium-flag-container' );
				}
			} );
		}

		// Hide group if all options are hidden.
		groups = this._domElement.querySelectorAll( '[data-collapse-group]' );
		Array.prototype.forEach.call( groups, function( group ) {
			var allHidden = true;

			options = group.querySelectorAll( '.pbs-tool-option:not(.pbs-collapsable-title)' );
			Array.prototype.forEach.call( options, function( option ) {
				if ( 'none' !== option.style.display ) {
					allHidden = false;
				}
			} );

			if ( allHidden ) {
				group.style.display = 'none';
			}
		} );

		// Add close button on the tabs.
		closeButton = document.createElement( 'BUTTON' );
		closeButton.classList.add( 'pbs-toolbox-close' );
		this._domTabs.appendChild( closeButton );
		closeButton.addEventListener( 'click', function() {
			this.hide();
		}.bind( this ) );
	};

	ToolboxPropertiesUI.prototype.addOptions = function( element ) {
		var optionIndex = element.constructor.name;
		var index, matched = false, label = optionIndex;

		if ( ! window.PBSInspectorOptions[ element.constructor.name ] && element.nodeType ) {

			// Check if the element matches any of the selectors.
			for ( index in window.PBSInspectorOptions ) {
				if ( window.PBSInspectorOptions.hasOwnProperty( index ) ) {
					if ( window.pbsSelectorMatches( element, index ) ) {
						optionIndex = index;
						matched = true;
						break;
					}
				}
			}
			if ( ! matched ) {
				return;
			}
		}

		if ( ! window.PBSInspectorOptions[ optionIndex ] ) {
			return;
		}

		label = window.PBSInspectorOptions[ optionIndex ].label;

		// Shortcodes are just labeled 'Shortcode'.
		if ( 'Shortcode' === element.constructor.name ) {
			label = element.constructor.name;

			if ( 'pbs_widget' === element.sc_base ) {
				label = 'Widget';
			} else if ( 'pbs_sidebar' === element.sc_base ) {
				label = 'Sidebar';
			}
		}

		this.addSection( label, element, optionIndex );
	};

	ToolboxPropertiesUI.prototype.addOption = function() {

		// We override it to nothing.
	};

	ToolboxPropertiesUI.prototype.highlightElement = function( element ) {
		var rect;

		if ( ! element._domElement ) {
			return;
		}
		rect = window.pbsGetBoundingClientRect( element._domElement );

		if ( this._highlighter ) {
			this._highlighter.parentNode.removeChild( this._highlighter );
			this._highlighter = null;
		}
		this._highlighter = document.createElement( 'DIV' );
		this._highlighter.classList.add( 'pbs-inspector-element-highlighter' );
		this._highlighter.style.top = ( rect.top - 77 + window.pbsScrollY() ) + 'px';
		this._highlighter.style.left = rect.left + 'px';
		this._highlighter.style.width = rect.width + 'px';
		this._highlighter.style.height = rect.height + 'px';

		setTimeout( function() {
			if ( this._highlighter ) {
				this._highlighter.classList.add( 'pbs-show' );
			}
		}.bind( this ), 10 );

		document.body.appendChild( this._highlighter );
	};

	ToolboxPropertiesUI.prototype.unhighlightElement = function() {
		if ( this._highlighter ) {
			this._highlighter.parentNode.removeChild( this._highlighter );
			this._highlighter = null;
		}
	};

	ToolboxPropertiesUI.prototype.applyActionButtonVisibility = function() {
		var buttons = this._domElement.querySelectorAll( '.pbs-toolbox-actions > *' );
		Array.prototype.forEach.call( buttons, function( button ) {
			if ( button.action ) {
				if ( 'function' === typeof button.action.visible ) {
					if ( button.action.visible( button.element, button ) ) {
						button.classList.remove( 'pbs-action-button-hide' );
					} else {
						button.classList.add( 'pbs-action-button-hide' );
					}
				}
			}
		} );
	};

    return ToolboxPropertiesUI;

  } )( ContentTools.ToolboxUI );

( function() {

	var _EditorApp = ContentTools.EditorApp.getCls();
	var unmountProxy, startProxy, stopProxy;
	var proxied = _EditorApp.prototype.init;
	_EditorApp.prototype.init = function( queryOrDOMElements, namingProp ) {
		proxied.call( this, queryOrDOMElements, namingProp );

		this._toolboxProperties = new ContentTools.ToolboxPropertiesUI( [] );
		this.attach( this._toolboxProperties );
	};

	unmountProxy = _EditorApp.prototype.unmount;
	_EditorApp.prototype.unmount = function() {
		unmountProxy.call( this );
		if ( ! this.isMounted() ) {
			return;
		}
		this._toolboxProperties = null;
	};

	startProxy = _EditorApp.prototype.start;
	_EditorApp.prototype.start = function() {
		startProxy.call( this );
		if ( ! this._toolboxProperties.isMounted() ) {
			this._toolboxProperties.mount();
		}
	};

	stopProxy = _EditorApp.prototype.stop;
	_EditorApp.prototype.stop = function() {
		stopProxy.call( this );
		this._toolboxProperties.hide();
	};

} )();

/**
 * Open the inspector when clicking on an element.
 * Also close it when clicking on anything outside the inspector when it's open.
 */
( function() {
	var openInspectorHandler = function( ev ) {
		var domElement = ev.target;

		if ( ! domElement._ceElement ) {
			while ( 'BODY' !== domElement.tagName && ! domElement._ceElement ) {

				// If the toolbar for settings was clicked, don't do anything
				if ( domElement.classList && ContentTools.EditorApp.get()._toolboxProperties.isOpen() ) {
					if ( domElement.classList.contains( 'pbs-toolbar-tool' ) && domElement.classList.contains( 'pbs-toolbar-tool-settings' ) ) {
						return;
					}
				}

				domElement = domElement.parentNode;
				if ( ! domElement ) {
					return;
				}
			}
		}
		if ( ! domElement || 'BODY' === domElement.tagName || ! domElement._ceElement ) {
			if ( ContentTools.EditorApp.get()._toolboxProperties.isOpen() ) {
				if ( ! ContentTools.EditorApp.get()._toolboxProperties._domElement.contains( ev.target ) && ! window.pbsSelectorMatches( ev.target, '.media-modal, .media-modal *, .media-modal-backdrop, #wp-link-backdrop, #wp-link-wrap, #wp-link-wrap *' ) ) {
					ContentTools.EditorApp.get()._toolboxProperties.hide();
				}
			}
			return;
		}

		if ( domElement._ceElement && ! ContentTools.EditorApp.get()._toolboxProperties.isOpen() ) {

			// If ( 'Text' === domElement._ceElement.constructor.name ) {
			// 	return;
			// }
			// currElement = domElement._ceElement;
			// ContentTools.EditorApp.get()._toolboxProperties.inspect( domElement._ceElement );
			return;
		}

		if ( ContentTools.EditorApp.get()._toolboxProperties.isOpen() ) {
			if ( ev.target === ContentTools.EditorApp.get()._toolboxProperties._domElement ) {
				return;
			}
			if ( ! ContentTools.EditorApp.get()._toolboxProperties._domElement.contains( ev.target ) ) {
				if ( ContentTools.EditorApp.get()._toolboxProperties._element !== domElement._ceElement ) {
					ContentTools.EditorApp.get()._toolboxProperties.hide();
				}
			}
		}
	};

	var editor = ContentTools.EditorApp.get();
	var hideInspectorBound;
	editor.bind( 'start', function() {
		document.body.addEventListener( 'mousedown', openInspectorHandler );
		hideInspectorBound = ContentTools.EditorApp.get()._toolboxProperties.hide.bind( ContentTools.EditorApp.get()._toolboxProperties );
		wp.hooks.addAction( 'pbs.tool.popup.open', 'pbs.tool', hideInspectorBound );
	} );

	editor.bind( 'stop', function() {
		document.body.removeEventListener( 'mousedown', openInspectorHandler );
		wp.hooks.removeAction( 'pbs.tool.popup.open', 'pbs.tool', hideInspectorBound );
	} );

} )();

/* globals ContentTools, PBSEditor, pbsParams */

var ready;

function isBlankPage() {
	return PBS.controller.contentProvider.content.match( /^\s*<p>\s*<\/p>\s*$/ );
}

function openPageTemplates( ev ) {
	ev.preventDefault();

	PBSEditor.pageTemplateFrame.open( {
		title: pbsParams.labels.page_templates,
		button: isBlankPage() ? pbsParams.labels.use_page_template : pbsParams.labels.replace_contents_with_template,
		successCallback: function( view ) {

			// STANDARD-PRO-ONLY-START

			var templateHTML, guids, newGuid, newElems, editor, parent, index, images;
			var i, templateID = view.selected.getAttribute( 'data-template' );
			templateID = templateID.replace( /^tmpl-/, '' );

			templateHTML = wp.template( templateID )();

			// Replace all the wp-image-* found since if the ID isn't from a valid image,
			// the Media Manager will not show the replace button.
			images = templateHTML.match( /wp-image-\d+/g );
			if ( images ) {
				for ( i = 0; i < images.length; i++ ) {
					templateHTML = templateHTML.replace( new RegExp( images[ i ], 'g' ), 'wp-image-' + pbsParams.dummy_image_id );
				}
			}

			// Remove the "size-full" class in images because the Media Manager
			// will throw an error during first open.
			templateHTML = templateHTML.replace( new RegExp( /(<img[^>]+['"\s])size-full(['"\s](.*?)>)/, 'g' ), '$1$2' );

			// Change all the pbsguid-* found, since these should be unique.
			// pbsguid-* classes are used by elements that use styles for their pseudo elements.
			guids = templateHTML.match( /pbsguid-\w+/g );
			if ( guids ) {
				for ( i = 0; i < guids.length; i++ ) {
					newGuid = window.PBSEditor.generateUniqueClassName();
					templateHTML = templateHTML.replace( new RegExp( guids[ i ], 'g' ), newGuid );
				}
			}

			// Get the new elements.
			newElems = ContentTools.Tools.Predesigned.convertTemplateToElement( templateHTML );

			// We need to add the elements to the root.
			editor = ContentTools.EditorApp.get();
			parent = editor.regions()['main-content'];
			index = 0;

			// Remove all the contents first.
			parent.setContent( '' );

			// Add the new elements.
			for ( i = 0; i < newElems.length; i++ ) {
				parent.attach( newElems[ i ], index++ );
			}
			if ( newElems[ 0 ] ) {
				if ( newElems[ 0 ].focus ) {
					newElems[ 0 ].focus();
				}
			}

			// Add the styles found in the template.
			ContentTools.Tools.Predesigned.addFoundStyles( templateHTML );

			// STANDARD-PRO-ONLY-END

		}.bind( this )
	} );
}

ready = function() {
	var editor = ContentTools.EditorApp.get();
	if ( ! editor ) {
		return;
	}

	// Start bindings.
	editor.bind( 'start', function() {
		document.querySelector( '#wp-admin-bar-pbs_page_templates' ).addEventListener( 'click', openPageTemplates );

		// If the page is blank, then open the page templates to suggest usage.
		if ( isBlankPage() ) {
			document.querySelector( '#wp-admin-bar-pbs_page_templates' ).dispatchEvent( new CustomEvent( 'click' ) );
		}
	} );

	// End bindings.
	editor.bind( 'end', function() {
		document.querySelector( '#wp-admin-bar-pbs_page_templates' ).removeEventListener( 'click', openPageTemplates );
	} );

};

( function() {
	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals ContentEdit, ContentTools, PBSOption, pbsParams */

var _pbsCreatedViews, elemName;
var PBSInspectorOptions = {
	'Shortcode': {}
};

/***********************************************************************************************
 * Override the Toolbox to allow it to be docked on the left or right side of the screen.
 ***********************************************************************************************/

( function() {
	var ready = function() {
		return;
		var editor, stopBodyScroll;

		if ( ! document.querySelector( '[data-name="main-content"]' ) ) {
			return;
		}

		editor = ContentTools.EditorApp.get();

		/*******************************************************************************************
		 * When scrolling inside the inspector, prevent the page from scrolling.
		 *******************************************************************************************/
		stopBodyScroll = function( ev ) {
			var $ = jQuery;
			var $this = $( this ),
				scrollTop = this.scrollTop,
				scrollHeight = this.scrollHeight,
				height = $this.height(),
				delta = ( 'DOMMouseScroll' === ev.type ?
					ev.originalEvent.detail * -40 :
					ev.originalEvent.wheelDelta ),
				up = delta > 0;

			var prevent = function() {
				ev.stopPropagation();
				try {
					ev.preventDefault();
				} catch ( err ) {
					// Do nothing.
				}
				ev.returnValue = false;
				return false;
			};

			if ( ! up && -delta > scrollHeight - height - scrollTop ) {

				// Scrolling down, but this will take us past the bottom.
				$this.scrollTop( scrollHeight );
				return prevent();
			} else if ( up && delta > scrollTop ) {

				// Scrolling up, but this will take us past the top.
				$this.scrollTop( 0 );
				return prevent();
			}
		};

		editor.bind( 'start', function() {

			// Won't work if this isn't jQuery...
			jQuery( 'body' ).on( 'DOMMouseScroll mousewheel', '.pbs-toolbox-elements, .pbs-toolbox-section-inner', stopBodyScroll );
		} );
		editor.bind( 'stop', function() {
			jQuery( 'body' ).off( 'DOMMouseScroll mousewheel', '.pbs-toolbox-elements, .pbs-toolbox-section-inner', stopBodyScroll );
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/***********************************************************************************************
 * Override the Toolbox to allow it to be docked on the left or right side of the screen.
 ***********************************************************************************************/

( function() {
	var ready = function() {

		// When the cursor has moved, hide the properties panel.
		document.addEventListener( 'keyup', function( ev ) {
			if ( ! PBS.isEditing ) {
				return;
			}

			// Only entertain keyups on the editor area.
			if ( window.pbsSelectorMatches( ev.target, '[data-name="main-content"] *' ) ) {
				ContentTools.EditorApp.get()._toolboxProperties.hide();
			}
		} );

		// When something's focused hide the properties panel.
		// ContentEdit.Root.get().bind( 'focus', function () {
		// 	ContentTools.EditorApp.get()._toolboxProperties.hide();
		// } );

		// When something's blurred hide the properties panel.
		ContentEdit.Root.get().bind( 'blur', function() {

			// ContentTools.EditorApp.get()._toolboxProperties.hide();
		} );

		// When something's dragged, hide the properties panel.
		ContentEdit.Root.get().bind( 'drag', function() {

			// ContentTools.EditorApp.get()._toolboxProperties.hide();
			wp.hooks.doAction( 'pbs.tool.popup.open' );
		} );

		// When something's dropped, hide the properties panel.
		ContentEdit.Root.get().bind( 'drop', function() {

			// ContentTools.EditorApp.get()._toolboxProperties.hide();
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/*
ContentTools.ToolboxUI.prototype._pbsAddDesignMount = ContentTools.ToolboxUI.prototype.mount;
ContentTools.ToolboxUI.prototype.mount = function() {
	var ret = this._pbsAddDesignMount();

	for ( var i = 0; i < window.PBSEditor.toolHeadings.length; i++ ) {
		var toolHeader = window.PBSEditor.toolHeadings[ i ];
		var label = toolHeader.label;
		var cls = 'pbs-' + toolHeader['class'];

		if ( ! document.querySelectorAll('.ct-toolbox .ct-tool-group')[ i ] ) {
			continue;
		}

		var group = document.querySelectorAll('.ct-toolbox .ct-tool-group')[ i ];
		group.classList.add( cls + '-group' );

		var heading = document.createElement('div');
		heading.innerHTML = label;
		heading.classList.add( 'pbs-group-title' );
		heading.classList.add( 'pbs-collapsable-title' );
		heading.classList.add( cls + '-title' );
		group.insertBefore( heading, group.firstChild );
		wp.hooks.doAction( 'inspector.group_title.create', group );

		if ( toolHeader.tip ) {
			heading.appendChild( window.PBSEditor.createGroupTip( toolHeader.tip ) );
		}
	}

	return ret;
};
*/

window.PBSEditor.createGroupTip = function( text ) {
	var tipText;
	var tip = document.createElement( 'span' );
	tip.classList.add( 'pbs-group-tip' );
	tip.innerHTML = '?';
	tipText = document.createElement( 'span' );
	tipText.classList.add( 'pbs-group-tip-details' );
	tipText.innerHTML = text;
	tip.appendChild( tipText );
	return tip;
};

_pbsCreatedViews = [];
ContentTools.ToolboxPropertiesUI.prototype.addSectionOptions = function( divGroup, option, element, model ) {
	var matchesAnOptionType, type, optionName, id, optionWrapper, subGroupName;
	var subGroup, firstSubGroup, o;

	if ( 'undefined' === typeof model ) {
		model = element.model;
	}

	// If an option type doesn't match any of the supported types, default back to 'Text'.
	matchesAnOptionType = null;
	if ( 'undefined' !== typeof option.type ) {
		matchesAnOptionType = Object.keys( PBSOption ).some( function( name ) {
			return name.toLowerCase() === option.type.toLowerCase().replace( /_/g, '' );
		} );
	}
	if ( ! matchesAnOptionType ) {
		option.type = 'Text';
	}

	type = option.type.toLowerCase().replace( /_/g, '' );
	for ( optionName in PBSOption ) {
		if ( PBSOption.hasOwnProperty( optionName ) && type === optionName.toLowerCase() ) {

			id = optionName.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase();
			if ( element.constructor.name ) {
				id = element.constructor.name.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase() + '-' + option.id;
			}
			optionWrapper = document.createElement( 'DIV' );
			optionWrapper.classList.add( 'ct-tool' );
			if ( 'button' !== type ) {
				optionWrapper.classList.add( 'pbs-tool-option' );
			}
			if ( option['class'] ) {
				optionWrapper.setAttribute( 'class', optionWrapper.getAttribute( 'class' ) + ' ' + option['class'] );
			}
			if ( optionName ) {
				optionWrapper.classList.add( 'pbs-' + optionName.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase() );
			}
			if ( option.id ) {
				optionWrapper.setAttribute( 'id', id );
			}

			// Add in group if there is a group specified.
			if ( option.group ) {
				subGroupName = option.group.toLowerCase().trim().replace( /\"/g, '' );
				subGroup = divGroup.querySelector( '[data-subgroup="' + subGroupName + '"]' );

				divGroup.classList.add( 'pbs-has-group' );
				if ( ! subGroup ) {
					subGroup = document.createElement( 'DIV' );
					subGroup.setAttribute( 'data-subgroup', subGroupName );
					divGroup.appendChild( subGroup );

					// Create the group title (subtitle)
					if ( 'default' !== option.group ) {
						subGroup.innerHTML = '<div class="pbs-option-subtitle pbs-tool-option">' + option.group + '</div>';

						// For shortcodes, groupings are accordions. Make it collapsable.
						subGroup.firstChild.classList.add( 'pbs-collapsable-title' );

						// Grouping is applied to shortcodes to make them into an accordion,
						// Opening one, closes all the other settings.
						subGroup.setAttribute( 'data-collapse-group', element.constructor.name.toLowerCase() );
						if ( divGroup.querySelectorAll( '[data-subgroup]' ).length > 1 ) {
							window.pbsCollapseSection( subGroup );
						}
					}
				}
				subGroup.appendChild( optionWrapper );

				if ( option['group-tip'] ) {
					if ( subGroup.querySelector( '.pbs-group-tip-details' ) ) {
						subGroup.querySelector( '.pbs-group-tip-details' ).innerHTML = option['group-tip'];
					} else {
						subGroup.querySelector( '.pbs-option-subtitle' ).appendChild( window.PBSEditor.createGroupTip( option['group-tip'] ) );
					}
				}

			} else {

				firstSubGroup = divGroup.querySelector( '[data-subgroup]' );
				if ( firstSubGroup ) {
					divGroup.insertBefore( optionWrapper, firstSubGroup );
				} else {
					divGroup.appendChild( optionWrapper );
				}

			}

			if ( ! wp.hooks.applyFilters( 'pbs.inspector.do_add_section_options', true, optionName, model, divGroup, element, this ) ) {
				return;
			}

			// This._domInspector.insertBefore( optionWrapper, this._domInspector.firstChild );
			o = new PBSOption[ optionName ]( {
				optionSettings: option,
				model: model,
				el: optionWrapper
			} );

			// Add the premium flag.
			if ( pbsParams.is_lite && o.dummy ) {
				o.el.classList.add( 'pbs-premium-flag' );
			}

			_pbsCreatedViews.push( o.render() );

			// Apply visibility.
			if ( o.optionSettings && 'function' === typeof o.optionSettings.visible ) {
				if ( o.optionSettings.visible( o.model.get( 'element' ) ) ) {
					o.$el.show();
				} else {
					o.$el.hide();
				}
			}

			divGroup.view = o;

			// Dependency.
			this.applyOptionDependencies( o );

			return;
		}
	}
};

/**
 * Option dependency. This adds the 'visible' function.
 */
( function() {
	var ready = function() {
		wp.hooks.addAction( 'pbs.option.changed', 'pbs.option', function() {
			var i, option;
			for ( i = 0; i < _pbsCreatedViews.length; i++ ) {
				option = _pbsCreatedViews[ i ];
				if ( option.optionSettings && 'function' === typeof option.optionSettings.visible ) {
					if ( option.optionSettings.visible( option.model.get( 'element' ) ) ) {
						option.$el.fadeIn();
					} else {
						option.$el.hide();
					}

					// Hide the entire group if necessary.
					if ( option.$el.parent().is( ':visible' ) ) {
						if ( option.$el.parent().find( '.pbs-tool-option:not(.pbs-collapsable-title):visible' ).length ) {
							option.$el.parent().fadeIn();
						} else {
							option.$el.parent().hide();
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

ContentTools.ToolboxPropertiesUI.prototype.applyOptionDependencies = function( view ) {

	var depends;
	if ( ! view.optionSettings.depends ) {
		return;
	}

	// We need an array for the input.
	depends = view.optionSettings.depends;
	if ( 'number' !== typeof depends.length ) {
		depends = [ depends ];
	}

	// Listen to changes on attributes we are dependent on.
	view.listenTo( view.model, 'change', function() {
		var i, id, value, currentValue, makeVisible, allConditions = [];
		var k, brokenByUnmatch, onceMatched, allNegatives, text;
		var matches, operator, num, allTrue;

		for ( i = 0; i < depends.length; i++ ) {
			if ( ! depends[ i ].id || ! depends[ i ].value ) {
				continue;
			}

			id = depends[ i ].id;
			value = depends[ i ].value;
			currentValue = this.model.get( id );
			makeVisible = false;

			// Put all normal strings into an array to combine the checking process later on for strings..
			// Turn all value: 'string' into value: [ 'string' ]
			if ( 'string' === typeof value ) {
				if ( '__not_empty' !== value.toLowerCase().trim() && '__empty' !== value.toLowerCase().trim() && ! value.match( /^(>=?|<=?|==|!=)(.*)/ ) ) {
					value = [ value ];
				}
			}

			/**
			 * Checkers.
			 */

			// Value: false
			if ( false === value || ( 'string' === typeof value && 'false' === value.toLowerCase().trim() ) ) {
				if ( 'undefined' === typeof currentValue ) {
					makeVisible = true;
				} else if ( 'string' === typeof currentValue && 'false' === currentValue.toLowerCase().trim() ) {
					makeVisible = true;
				} else if ( 'string' === typeof currentValue && '' === currentValue.toLowerCase().trim() ) {
					makeVisible = true;
				} else if ( 'boolean' === typeof currentValue && ! currentValue ) {
					makeVisible = true;
				} else if ( ! currentValue ) {
					makeVisible = true;
				}

			// Value: true
			} else if ( true === value || ( 'string' === typeof value && 'true' === value.toLowerCase().trim() ) ) {
				if ( 'string' === typeof currentValue && 'true' === currentValue.toLowerCase().trim() ) {
					makeVisible = true;
				} else if ( 'boolean' === typeof currentValue && currentValue ) {
					makeVisible = true;
				} else if ( currentValue ) {
					makeVisible = true;
				}

			// Value: [ string, ... ]
			} else if ( 'object' === typeof value && 'number' === typeof value.length ) {
				brokenByUnmatch = false;
				onceMatched = false;
				allNegatives = true;
				for ( k = 0; k < value.length; k++ ) {
					if ( ! value[ k ].match( /^!(.*)/ ) ) {
						allNegatives = false;
						break;
					}
				}
				for ( k = 0; k < value.length; k++ ) {
					if ( value[ k ].match( /^!(.*)/ ) ) {
						text = value[ k ].match( /^!(.*)/ );
						text = text[1];
						if ( text === currentValue ) {
							brokenByUnmatch = true;
							break;
						}
					} else {
						if ( value[ k ] === currentValue ) {
							onceMatched = true;
							break;
						}
					}
				}

				if ( allNegatives && ! brokenByUnmatch ) {
					makeVisible = true;
				} else if ( ! brokenByUnmatch && onceMatched ) {
					makeVisible = true;
				}

			// Value: '__not_empty'
			} else if ( '__not_empty' === value.toLowerCase().trim() ) {
				if ( 'string' === typeof currentValue && '' !== currentValue.trim() ) {
					makeVisible = true;
				} else if ( 'boolean' === typeof currentValue && currentValue ) {
					makeVisible = true;
				}

			// Value: '__empty'
			} else if ( '__empty' === value.toLowerCase().trim() ) {
				if ( 'undefined' === typeof currentValue ) {
					makeVisible = true;
				} else if ( '' === currentValue.trim() ) {
					makeVisible = true;
				}

			// Value: '<num', '<=num', '>num', '>=num', '==num', '!=num'
			} else if ( value.match( /^(>=?|<=?|==|!=)(.*)/ ) ) {
				matches = value.match( /^(>=?|<=?|==|!=)(.*)/ );
				operator = matches[1];
				num = matches[2];

				if ( num.match( /\./ ) ) {
					num = parseFloat( num );
				} else {
					num = parseInt( num, 10 );
				}

				if ( 'undefined' === typeof currentValue ) {
					currentValue = 0;
				} else if ( currentValue.match( /\./ ) ) {
					currentValue = parseFloat( currentValue );
				} else {
					currentValue = parseInt( currentValue, 10 );
				}

				if ( '<' === operator ) {
					makeVisible = currentValue < num;
				} else if ( '<=' === operator ) {
					makeVisible = currentValue <= num;
				} else if ( '>' === operator ) {
					makeVisible = currentValue > num;
				} else if ( '>=' === operator ) {
					makeVisible = currentValue >= num;
				} else if ( '!=' === operator ) {
					makeVisible = currentValue !== num;
				} else {
					makeVisible = currentValue === num;
				}

			}

			allConditions.push( makeVisible );
		}

		// Check if all the dependencies are met.
		allTrue = true;
		for ( i = 0; i < allConditions.length; i++ ) {
			if ( ! allConditions[ i ] ) {
				allTrue = false;
			}
		}

		// Hide or show the option.
		if ( allTrue ) {
			this.$el.fadeIn();
		} else {
			this.$el.fadeOut();
		}

	} );

	view.model.trigger( 'change', view.model );
};

ContentTools.ToolboxPropertiesUI.prototype.addGenericShortcodeOptions = function( divGroup, element ) {

	var view, keys, i, attributeName, note, hasOptions = false;

	divGroup.classList.add( 'pbs-shortcode-generic' );

	// Do matches
	keys = element.model.keys();
	for ( i = 0; i < keys.length; i++ ) {
		attributeName = keys[ i ];
		if ( 'content' !== attributeName ) {

			view = new PBSOption.GenericOption( {
				attribute: attributeName,
				model: element.model
			} );
			_pbsCreatedViews.push( view.render() );
			divGroup.appendChild( view.el );

			hasOptions = true;
		}
	}

	// Do content
	if ( element.model.get( 'content' ) ) {

		view = new PBSOption.GenericOption( {
			attribute: 'content',
			model: element.model
		} );
		_pbsCreatedViews.push( view.render() );
		divGroup.appendChild( view.el );

		hasOptions = true;
	}

	if ( ! hasOptions ) {
		note = document.createElement( 'DIV' );
		note.innerHTML = pbsParams.labels.shortcodes_not_attributes_detected;
		note.classList.add( 'pbs-shortcode-no-options' );
		divGroup.appendChild( note );
	}

};

ContentTools.ToolboxPropertiesUI.prototype._addSection = function( domElement ) {
	var currElem, i, k, group, heading, label, editor, currDomElement;
	var matchedPattern, pattern, doneTypes = [];
	var root, element, hierarchy, finishedClasses, elem, note;
	var finishedElemTypes, currElemModel, elemType, groupClasses, shortcodeProperties;
	var shortcodeBase;

	// Remember previous selected element.
	// Don't add the sections again for the same element.
	if ( this._previouslySelectedElement === domElement ) {
		return;
	}

	this._newGroups = [];
	this._currentGroupIndex = 0;
	if ( 'undefined' === typeof this._oldGroups ) {
		this._oldGroups = [];

		// Make sure the oldGroups don't carry over to the next editing session.
		editor = ContentTools.EditorApp.get();
		editor.bind( 'start', function() {
			this._oldGroups = [];
		}.bind( this ) );
	}

	// This.clearSections();
	this._previouslySelectedElement = domElement;

	if ( 'undefined' === typeof this._domInspectorGroups ) {
		this._domInspectorGroups = [];
	}

	/**
	 * Create the inspector for the first DOM element selected if possible.
	 */
	if ( domElement ) {
		currDomElement = null;
		while ( domElement ) {
			if ( domElement.tagName && 'DIV' !== domElement.tagName ) {
				if ( window.pbsSelectorMatches( domElement, '[data-name="main-content"] *' ) ) {
					currDomElement = domElement;
					break;
				}
			}
			domElement = domElement.parentNode;
		}

		matchedPattern = '';
		label = '';
		if ( currDomElement ) {
			for ( pattern in PBSInspectorOptions ) {
				if ( PBSInspectorOptions.hasOwnProperty( pattern ) ) {
					try {
						if ( window.pbsSelectorMatches( domElement, pattern ) ) {
							matchedPattern = pattern;
						}
					} catch ( err ) {
					}
				}
			}
		}

		if ( matchedPattern ) {
			if ( PBSInspectorOptions[ matchedPattern ].label ) {
				label = PBSInspectorOptions[ matchedPattern ].label;
			}
			if ( ! label ) {
				label = matchedPattern;
			}

			// Create the group.
			group = this.constructor.createDiv( ['ct-tool-group', 'pbs-inspector-group', 'pbs-dom-group'] );
			group.groupType = matchedPattern;

			// Create the title.
			heading = document.createElement( 'DIV' );
			heading.classList.add( 'pbs-group-title' );
			heading.classList.add( 'pbs-collapsable-title' );
			heading.classList.add( 'pbs-dom-title' );
			heading.innerHTML = pbsParams.labels.inspector_title.replace( '%s', label );
			group.insertBefore( heading, group.firstChild );

			wp.hooks.doAction( 'inspector.group_title.create', group );
			this.placeGroup( group );

			currElemModel = new Backbone.Model( {
				element: currDomElement
			} );

			for ( i = 0; i < PBSInspectorOptions[ matchedPattern ].options.length; i++ ) {
				this.addSectionOptions( group, PBSInspectorOptions[ matchedPattern ].options[i], currDomElement, currElemModel );
			}
		}
	}

	/**
	 * Build the CT Element hierarchy.
	 */
	root = ContentEdit.Root.get();
	element = root.focused();
	if ( ! element ) {
		return;
	}
	currElem = element;
	hierarchy = [];

	finishedClasses = [];
	while ( currElem && 'Region' !== currElem.constructor.name ) {
		if ( finishedClasses.indexOf( currElem.constructor.name ) === -1 ) {
			hierarchy.push( currElem );
			finishedClasses.push( currElem.constructor.name );
		}
		currElem = currElem.parent();
	}

	// Adjust the order of the inspector. Make sure the row & column are last.
	for ( i = 0; i < hierarchy.length; i++ ) {
		if ( 'DivRow' === hierarchy[ i ].constructor.name ) {
			elem = hierarchy[ i ];
			hierarchy.splice( i, 1 );
			hierarchy.push( elem );
			break;
		}
	}
	for ( i = 0; i < hierarchy.length; i++ ) {
		if ( 'DivCol' === hierarchy[ i ].constructor.name ) {
			elem = hierarchy[ i ];
			hierarchy.splice( i, 1 );
			hierarchy.push( elem );
			break;
		}
	}

	finishedElemTypes = [];
	for ( i = 0; i < hierarchy.length; i++ ) {
		currElem = hierarchy[ i ];

		elemType = currElem.constructor.name;
		elemType = wp.hooks.applyFilters( 'pbs.inspector.elemtype', elemType, currElem );

		if ( finishedElemTypes.indexOf( elemType ) !== -1 ) {
			continue;
		}
		finishedElemTypes.push( elemType );

		// Get the title label.
		if ( 'Shortcode' === elemType ) {

			label = currElem._domElement.getAttribute( 'data-base' );
			label = label.replace( /[-_]/g, ' ' ).replace( /\b[a-z]/g, function( letter ) {
				return letter.toUpperCase();
			} );

			// If there is an existing shortcode mapping, use that.
			if ( 'undefined' === typeof PBSInspectorOptions.Shortcode[ currElem.sc_base ] ) {
				if ( 'undefined' !== typeof pbsParams.shortcode_mappings && 'undefined' !== typeof pbsParams.shortcode_mappings[ currElem.sc_base ] ) {
					if ( this.createShortcodeMappingOptions ) {
						this.createShortcodeMappingOptions( currElem.sc_base );
					}
				}
			}

			if ( 'undefined' !== typeof PBSInspectorOptions.Shortcode[ currElem.sc_base ] && 'undefined' !== typeof PBSInspectorOptions.Shortcode[ currElem.sc_base ].label ) {
				label = PBSInspectorOptions.Shortcode[ currElem.sc_base ].label;
			}

		} else if ( 'undefined' !== typeof PBSInspectorOptions[ elemType ] && -1 === doneTypes.indexOf( elemType ) ) {

			label = currElem.typeName();
			if ( PBSInspectorOptions[ elemType ].label ) {
				label = PBSInspectorOptions[ elemType ].label;
			}

		} else {
			continue;
		}

		// Create the group.
		groupClasses = ['ct-tool-group', 'pbs-inspector-group', 'pbs-' + currElem.cssTypeName() + '-group'];
		if ( 'Shortcode' === elemType ) {
			groupClasses.push( 'pbs-shortcode-' + currElem.sc_base + '-group' );
		}
		group = this.constructor.createDiv( groupClasses );
		group.groupType = elemType;

		// Create the title.
		heading = document.createElement( 'DIV' );
		heading.classList.add( 'pbs-group-title' );
		heading.classList.add( 'pbs-collapsable-title' );
		heading.classList.add( 'pbs-' + currElem.cssTypeName() + '-title' );
		heading.innerHTML = pbsParams.labels.inspector_title.replace( '%s', label );
		group.insertBefore( heading, group.firstChild );

		wp.hooks.doAction( 'inspector.group_title.create', group );
		this.placeGroup( group );

		// Create the options.
		if ( 'Shortcode' === elemType ) {

			shortcodeBase = currElem.sc_base;
			shortcodeProperties = PBSInspectorOptions.Shortcode[ shortcodeBase ];

			if ( 'undefined' !== typeof shortcodeProperties && typeof 'undefined' !== shortcodeProperties.hidden ) {
				if ( shortcodeProperties.hidden ) {
					continue;
				}
			}

			if ( 'undefined' !== typeof shortcodeProperties && 'undefined' !== typeof shortcodeProperties.options ) {
				for ( k = 0; k < shortcodeProperties.options.length; k++ ) {
					this.addSectionOptions( group, shortcodeProperties.options[ k ], currElem );
				}
				if ( shortcodeProperties.desc ) {
					heading.innerHTML += '<span>' + shortcodeProperties.desc + '</span>';
				}

				// Add a note if the shortcode doesn't have attributes.
				if ( ! shortcodeProperties.options.length ) {
					note = document.createElement( 'DIV' );
					note.innerHTML = pbsParams.labels.no_attributes_available;
					note.classList.add( 'pbs-shortcode-no-options' );
					group.appendChild( note );
				}

			} else {
				this.addGenericShortcodeOptions( group, currElem );
				heading.innerHTML += '<span>' + pbsParams.labels.note_options_are_detected + '</span>';
			}

			// Add note.
			note = document.createElement( 'DIV' );
			note.classList.add( 'pbs-inspector-shortcode-note' );
			note.innerHTML = pbsParams.labels.note_shortcode_not_appearing;
			group.appendChild( note );

		} else if ( 'undefined' !== typeof PBSInspectorOptions[ elemType ] && -1 === doneTypes.indexOf( elemType ) ) {

			if ( ! currElem.model ) {
				currElemModel = new Backbone.Model( {
					element: currElem
				} );
			} else {
				currElemModel = currElem.model;
				currElemModel.set( 'element', currElem );
			}

			for ( k = 0; k < PBSInspectorOptions[ elemType ].options.length; k++ ) {
				this.addSectionOptions( group, PBSInspectorOptions[ elemType ].options[ k ], currElem, currElemModel );
			}

			// Footer notice for the inspector.
			if ( 'undefined' !== typeof PBSInspectorOptions[ elemType ].footer ) {
				if ( Math.random() > 0.5 ) { // Do this only half of the time.
					note = document.createElement( 'DIV' );
					note.innerHTML = PBSInspectorOptions[ elemType ].footer;
					note.classList.add( 'pbs-group-footer' );
					group.appendChild( note );
				}
			}

			wp.hooks.doAction( 'pbs.inspector.add_section', group, label );

		} else {
			continue;
		}
	}

	this.clearOldGroups();

	while ( this._newGroups.length ) {
		this._oldGroups.push( this._newGroups.pop() );
	}

};

ContentTools.ToolboxPropertiesUI.prototype.clearOldGroups = function() {
	var i, oldGroup;

	for ( i = 0; i < this._oldGroups.length; i++ ) {
		oldGroup = this._oldGroups[ i ];
		if ( 'undefined' !== typeof oldGroup.view ) {

			// OldGroup.view.remove();
		}

		oldGroup.style.height = window.getComputedStyle( oldGroup ).height;
		oldGroup.style.webkitTransition = 'height .3s ease-in-out';
		oldGroup.style.mozTransition = 'height .3s ease-in-out';
		oldGroup.style.msTransition = 'height .3s ease-in-out';
		oldGroup.style.transition = 'height .3s ease-in-out';
		oldGroup.style.overflow = 'hidden';
		oldGroup.offsetHeight; // Force repaint
		oldGroup.style.height = 0;

		// Remove from dom after transition.
		oldGroup.addEventListener( 'transitionend', function transitionEnd( event ) {
			if ( 'height' === event.propertyName ) {
				this.removeEventListener( 'transitionend', transitionEnd, false );
				if ( 'undefined' !== typeof this.view ) {
					this.view.remove();
				}
				this.parentNode.removeChild( this );
			}
		}.bind( oldGroup ), false );

		// Fallback, when fast switching, transitionend sometimes does not fire.
		setTimeout( function() {
			if ( 'undefined' !== typeof this.view ) {
				this.view.remove();
			}
			if ( this.parentNode ) {
				this.parentNode.removeChild( this );
			}
		}.bind( oldGroup ), 350 );
	}
	this._oldGroups = [];
};

ContentTools.ToolboxPropertiesUI.prototype.clearSections = function() {

	var o, elemToRemove;

	while ( _pbsCreatedViews.length > 0 ) {
		o = _pbsCreatedViews.pop();
		if ( o ) {
			o.remove();
		}
	}

	if ( this._domInspectorGroups ) {
		while ( this._domInspectorGroups.length ) {
			elemToRemove = this._domInspectorGroups.shift();
			elemToRemove.parentNode.removeChild( elemToRemove );
		}
	}

	this._previouslySelectedElement = null;
};

/**
 * Places the section/group in the inspector.
 * If a similar group already exists (same type), then replace it's contents & resize it
 * If it's a new group, add it and animate it.
 */
ContentTools.ToolboxPropertiesUI.prototype.placeGroup = function( group ) {

	var i, oldGroup, startHeight;

	this._newGroups.push( group );

	// Check the existing groups and replace if it already exists.
	for ( i = 0; i < this._oldGroups.length; i++ ) {
		oldGroup = this._oldGroups[ i ];
		if ( oldGroup.groupType === group.groupType ) {
			startHeight = getComputedStyle( oldGroup ).height;
			group.style.overflow = 'hidden';
			group.style.height = startHeight;

			if ( 'undefined' !== typeof oldGroup.view ) {
				oldGroup.view.remove();
			}
			this._domElement.replaceChild( group, oldGroup );
			this._currentGroupIndex = i + 1;
			this._oldGroups.splice( i, 1 );

			setTimeout( function() { // jshint ignore:line
				var endHeight, didTransition;

				this.style.height = 'auto';
				endHeight = getComputedStyle( this ).height;
				if ( this.classList.contains( 'pbs-collapse' ) ) {
					endHeight = getComputedStyle( this.querySelector( '.pbs-group-title' ) ).height;
				}
				this.style.height = startHeight;
				this.offsetHeight; // Force repaint
				this.style.webkitTransition = 'height .3s ease-in-out';
				this.style.mozTransition = 'height .3s ease-in-out';
				this.style.msTransition = 'height .3s ease-in-out';
				this.style.transition = 'height .3s ease-in-out';
				this.style.overflow = 'hidden';
				this.style.height = endHeight;

				didTransition = false;
				this.addEventListener( 'transitionend', function transitionEnd( event ) {
					if ( 'height' === event.propertyName ) {
						this.style.webkitTransition = '';
						this.style.mozTransition = '';
						this.style.msTransition = '';
						this.style.transition = '';
						if ( ! this.classList.contains( 'pbs-collapse' ) ) {
							this.style.height = 'auto';
							this.style.overflow = 'visible'; // Allow tooltips to overflow.
						}
						didTransition = true;
						this.removeEventListener( 'transitionend', transitionEnd, false );
					}
				}, false );

				// If another same element was previously selected, the transition above will not
				// trigger. Make sure the container can overflow or else our colorpickers and
				// tooltips will not display.
				setTimeout( function() {
					if ( ! didTransition && this ) {
						if ( ! this.classList.contains( 'pbs-collapse' ) ) {
							this.style.height = 'auto';
							this.style.overflow = 'visible';
						}
					}
				}.bind( this ), 350 );

			}.bind( group ), 1 );

			return;
		}
	}

	// Add the new group.
	group.style.height = 0;
	group.style.overflow = 'hidden';
	this._domElement.insertBefore( group, this._domElement.querySelectorAll( '.ct-tool-group' )[ this._currentGroupIndex + 1 ] );
	this._currentGroupIndex++;

	setTimeout( function() {
		var endHeight;

		this.style.height = 'auto';
		endHeight = getComputedStyle( this ).height;
		if ( this.classList.contains( 'pbs-collapse' ) ) {
			endHeight = getComputedStyle( this.querySelector( '.pbs-group-title' ) ).height;
		}
		this.style.height = 0;
		this.offsetHeight; // Force repaint
		this.style.webkitTransition = 'height .3s ease-in-out';
		this.style.mozTransition = 'height .3s ease-in-out';
		this.style.msTransition = 'height .3s ease-in-out';
		this.style.transition = 'height .3s ease-in-out';
		this.style.overflow = 'hidden';
		this.style.height = endHeight;
		this.addEventListener( 'transitionend', function transitionEnd( event ) {
			if ( 'height' === event.propertyName ) {
				this.style.webkitTransition = '';
				this.style.mozTransition = '';
				this.style.msTransition = '';
				this.style.transition = '';
				if ( ! this.classList.contains( 'pbs-collapse' ) ) {
					this.style.height = 'auto';
					this.style.overflow = 'visible'; // Allow tooltips to overflow.
				}
				this.removeEventListener( 'transitionend', transitionEnd, false );
			}
		}, false );
	}.bind( group ), 1 );
};

/***********************************************************************************************
 * These are the inspector elements that we are supporting.
 ***********************************************************************************************/
window.pbsElementsWithInspector = [];
window.pbsAddInspector = function( elemName, args ) {// Options ) {
	var i, argName, options, container = PBSInspectorOptions;

	if ( 'object' !== typeof args ) {
		return;
	}

	// Support multiple element names given.
	if ( 'object' === typeof elemName ) {
		for ( i = 0; i < elemName.length; i++ ) {
			window.pbsAddInspector( elemName[ i ], args );
		}
		return;
	}

	if ( 'undefined' !== typeof args.is_shortcode ) {
		if ( args.is_shortcode ) {
			container = PBSInspectorOptions.Shortcode;
		} else {
			if ( window.pbsElementsWithInspector.indexOf( elemName ) === -1 ) {
				window.pbsElementsWithInspector.push( elemName );
			}
		}
	} else {
		if ( window.pbsElementsWithInspector.indexOf( elemName ) === -1 ) {
			window.pbsElementsWithInspector.push( elemName );
		}
	}

	if ( 'undefined' === typeof container[ elemName ] ) {
		container[ elemName ] = args;
		return;
	}

	for ( argName in args ) {
		if ( args.hasOwnProperty( argName ) ) {
			if ( 'options' !== argName ) {
				container[ elemName ][ argName ] = args[ argName ];
			} else {
				options = args[ argName ];
				for ( i = 0; i < options.length; i++ ) {
					container[ elemName ].options.push( options[ i ] );
				}
			}
		}
	}
};
window.pbsRemoveInspector = function( elemName ) {
	var i, container = PBSInspectorOptions;

	// Support multiple element names given.
	if ( 'object' === typeof elemName ) {
		for ( i = 0; i < elemName.length; i++ ) {
			window.pbsRemoveInspector( elemName[ i ] );
		}
		return;
	}

	if ( 'undefined' !== typeof PBSInspectorOptions.Shortcode[ elemName ] ) {
		container = PBSInspectorOptions.Shortcode;
	}

	if ( 'undefined' !== typeof container[ elemName ] ) {
		delete container[ elemName ];
	}
};

/**
 * Action buttons.
 */
window.pbsElementActionButtons = [];
window.pbsAddActionButtons = function( elemName, args ) {

	var i = 0;

	if ( 'object' !== typeof args ) {
		return;
	}

	if ( ! window.pbsElementActionButtons[ elemName ] ) {
		window.pbsElementActionButtons[ elemName ] = [];
	}

	if ( Array.isArray( args ) ) {
		for ( i = 0; i < args.length; i++ ) {
			if ( 'undefined' === typeof args[ i ].priority ) {
				args[ i ].priority = 10;
			}
			window.pbsElementActionButtons[ elemName ].push( args[ i ] );
		}
	} else {
		if ( 'undefined' === typeof args.priority ) {
			args.priority = 10;
		}
		window.pbsElementActionButtons[ elemName ].push( args );
	}
};
window.pbsRemoveActionButtons = function( elemName, actionName ) {
	var i;

	if ( window.pbsElementActionButtons[ elemName ] ) {
		for ( i = 0; i < window.pbsElementActionButtons[ elemName ].length; i++ ) {
			if ( window.pbsElementActionButtons[ elemName ].name ) {
				if ( window.pbsElementActionButtons[ elemName ].name === actionName ) {
					window.pbsElementActionButtons[ elemName ].splice( i, 1 );
					break;
				}
			}
		}
	}
};

/*********************************************************************
 * Allow localize in PHP to add new shortcode options.
 *********************************************************************/
if ( pbsParams.additional_shortcodes ) {
	for ( elemName in pbsParams.additional_shortcodes ) {
		if ( pbsParams.additional_shortcodes.hasOwnProperty( elemName ) ) {
			PBSInspectorOptions.Shortcode[ elemName ] = pbsParams.additional_shortcodes[ elemName ];
		}
	}
}

/**
 * Collapse transition.
 * @see http://n12v.com/css-transition-to-from-auto/ for animating the height from auto to 0.
 */
window.pbsCollapseSection = function( section ) {
	var classes, openSections, prevHeight, endHeight;

	// Do collapse animation.
	if ( section.classList.contains( 'pbs-collapse' ) ) {

		// If data-collapse-group is present, then this means that the collapsable area
		// should act like an accordion.
		if ( section.getAttribute( 'data-collapse-group' ) ) {
			openSections = document.querySelectorAll( '[data-collapse-group="' + section.getAttribute( 'data-collapse-group' ) + '"]:not(.pbs-collapse)' );
			Array.prototype.forEach.call( openSections, function( el ) {
				window.pbsCollapseSection( el );
			} );
		}

		prevHeight = section.style.height;
		section.style.height = 'auto';
		endHeight = getComputedStyle( section ).height;
		section.style.height = prevHeight;
		section.offsetHeight; // Force repaint
		section.style.webkitTransition = 'height .3s ease-in-out';
		section.style.mozTransition = 'height .3s ease-in-out';
		section.style.msTransition = 'height .3s ease-in-out';
		section.style.transition = 'height .3s ease-in-out';
		section.style.overflow = 'hidden';
		section.style.height = endHeight;
		section.addEventListener( 'transitionend', function transitionEnd( event ) {
			if ( 'height' === event.propertyName ) {
				section.style.webkitTransition = '';
				section.style.mozTransition = '';
				section.style.msTransition = '';
				section.style.transition = '';
				section.style.height = 'auto';
				section.style.overflow = 'visible'; // Allow tooltips to overflow.
				section.removeEventListener( 'transitionend', transitionEnd, false );
			}
		}, false );

		section.classList.remove( 'pbs-collapse' );

		classes = section.getAttribute( 'class' );
		classes = classes.replace( /\s*(ct-tool-group|pbs-collapse|pbs-inspector-group)\s*/g, '' );

	} else {

		// Do collapse animation.
		section.style.height = window.getComputedStyle( section ).height;
		section.style.webkitTransition = 'height .3s ease-in-out';
		section.style.mozTransition = 'height .3s ease-in-out';
		section.style.msTransition = 'height .3s ease-in-out';
		section.style.transition = 'height .3s ease-in-out';
		section.style.overflow = 'hidden';
		section.offsetHeight; // Force repaint;

		section.style.height = '38px';
		section.addEventListener( 'transitionend', function transitionEnd( event ) {
			if ( 'height' === event.propertyName ) {
				section.removeEventListener( 'transitionend', transitionEnd, false );
			}
		}, false );

		section.classList.add( 'pbs-collapse' );

		classes = section.getAttribute( 'class' );
		classes = classes.replace( /\s*(ct-tool-group|pbs-collapse|pbs-inspector-group)\s*/g, '' );
	}
};
window.pbsOpenAllSections = function() {
	var sections = document.querySelectorAll( '.ct-tool-group' );
	Array.prototype.forEach.call( sections, function( el ) {
		if ( el.classList.contains( 'pbs-collapse' ) ) {
			window.pbsCollapseSection( el );
		}
	} );
};
window.pbsOnlyOpenSection = function( sectionClass ) {
	var sections = document.querySelectorAll( '.ct-tool-group' );
	Array.prototype.forEach.call( sections, function( el ) {

		// Open the section we need.
		if ( sectionClass && el.classList.contains( sectionClass ) ) {
			if ( el.classList.contains( 'pbs-collapse' ) ) {
				window.pbsCollapseSection( el );
			}
		} else {

			// Close the rest.
			if ( ! el.classList.contains( 'pbs-collapse' ) ) {
				window.pbsCollapseSection( el );
			}
		}
	} );
};

( function() {
	var ready = function() {
		if ( ! document.querySelector( '[data-name="main-content"]' ) ) {
			return;
		}

		// Handler for collapsing / uncollapsing.
		document.addEventListener( 'click', function( ev ) {
			var section = ev.target;
			if ( ev.target.classList && ! ev.target.classList.contains( 'pbs-collapsable-title' ) ) {
				if ( ! ev.target.parentNode ) {
					return;
				}
				if ( ! ev.target.parentNode.classList ) {
					return;
				}
				if ( ! ev.target.parentNode.classList.contains( 'pbs-collapsable-title' ) ) {
					return;
				}
				section = ev.target.parentNode.parentNode;
			} else {
				section = ev.target.parentNode;
			}

			window.pbsCollapseSection( section );
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * Prevent pressing the delete button while editing stuff in the inspector
 * from deleting elements.
 */
( function() {
   var proxied = ContentTools.Tools.Remove.apply;
   ContentTools.Tools.Remove.apply = function( element, selection, callback ) {
	   if ( document.activeElement ) {
		   if ( ['INPUT', 'TEXTAREA'].indexOf( document.activeElement.tagName ) !== -1 ) {
			   return;
		   }
	   }
	   proxied.call( element, selection, callback );
   };
} )();

/* globals ContentEdit, ContentTools, pbsParams */

var PBSOption = {};

var PBSBaseView = Backbone.View.extend( {

	initialize: function( options ) {

		this.optionSettings = _.clone( options.optionSettings );

		if ( this.optionSettings.initialize ) {
			this.optionSettings.initialize( this.model.get( 'element' ), this );
		}

		if ( this.optionSettings.visible ) {
			this._visibleBound = this._visible.bind( this );
			wp.hooks.addAction( 'pbs.option.changed', 'pbs.option', this._visibleBound );
			this._visible();
		}

		Backbone.View.prototype.initialize.call( this, options );
	},

	_visible: function() {
		if ( this.optionSettings.visible( this.model.get( 'element' ) ) ) {
			this.$el.show();
		} else {
			this.$el.hide();
		}
	},

	render: function() {
		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		data.value = '';

		if ( this.optionSettings.value ) {
			data.value = this.optionSettings.value( this.model.get( 'element' ) );
		} else if ( this.optionSettings.id ) {
			data.value = this.model.get( this.optionSettings.id );
		}

		// Add the template if it doesn't exist yet.
		if ( ! this.$el.html() ) {
			this.$el.html( this.template( data ) );

		} else if ( this.$el.find( 'input[type="text"]' ).val() !== data.value ) {

			// If it exists, only update the value so that we don't lose focus on the field.
			this.$el.find( 'input[type="text"]' ).val( data.value );
		}
		return this;
	},

	remove: function() {
		if ( this.optionSettings.visible ) {
			wp.hooks.removeAction( 'pbs.option.changed', 'pbs.option', this._visibleBound );
		}

		Backbone.View.prototype.remove.apply( this );
	}
} );

PBSOption.widgetSettings = Backbone.View.extend( {

	className: 'pbs-tool-option',

	events: {
		'change input': 'attributeChanged',
		'keyup input': 'attributeChanged',
		'change textarea': 'attributeChanged',
		'keyup textarea': 'attributeChanged',
		'click input[type="radio"]': 'attributeChanged',
		'click input[type="checkbox"]': 'attributeChanged',
		'change select': 'attributeChanged',
		'keyup select': 'attributeChanged'
	},

	initialize: function( options ) {
		this.optionSettings = _.clone( options.optionSettings );
		this.attribute = _.clone( options.attribute );

		if ( 'undefined' === typeof this.model.attributes.widget ) {
			this.model.attributes.widget = 'WP_Widget_Text';
		}
		this.template = wp.template( 'pbs-widget-' + this.model.attributes.widget );
	},

	render: function() {
		var attributeName, widgetInfo, option, fields;

		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		this.$el.html( this.template( data ) );

		// Adjust the inspector title.
		widgetInfo = pbsParams.widget_list[ this.model.attributes.widget ];

		// Assign the current settings of the widget.
		for ( attributeName in this.model.attributes ) {
			if ( ! this.model.attributes.hasOwnProperty( attributeName ) ) {
				continue;
			}

			option = this.el.querySelector( '#widget-' + widgetInfo.id_base + '--' + attributeName );
			if ( option ) {
				if ( 'TEXTAREA' === option.tagName ) {
					option.value = this.model.attributes[  attributeName ].replace( /<br>/g, '\n' );
				} else if ( 'INPUT' === option.tagName && 'checkbox' === option.getAttribute( 'type' ) ) {
					if ( this.model.attributes[ attributeName ] ) {
						option.checked = true;
					}
				} else {
					option.value = this.model.attributes[  attributeName ];
				}
			}
		}

		// The only way to get the default values of widgets is using the form.
		// At the start trigger the form fields to save so we can get the default values.
		fields = this.el.querySelectorAll( '[id^=widget-' + widgetInfo.id_base + '--]' );
		Array.prototype.forEach.call( fields, function( el ) {
			this.attributeChanged( { target: el } );
		}.bind( this ) );

		return this;
	},

	attributeChanged: function( e ) {

		var widgetInfo = pbsParams.widget_list[ this.model.attributes.widget ];
		var attribute = e.target.getAttribute( 'id' ).replace( 'widget-' + widgetInfo.id_base + '--', '' );

		if ( 'INPUT' === e.target.tagName && 'checkbox' === e.target.getAttribute( 'type' ) ) {
			this.model.set( attribute, e.target.checked ? e.target.value : '' );
		} else {
			this.model.set( attribute, e.target.value );
		}
	}
} );

PBSOption.Button = PBSBaseView.extend( {

	events: {
		'click': 'click',
		'mouseenter': 'mouseenter',
		'mouseleave': 'mouseleave',
		'mousedown': 'mousedown',
		'mouseup': 'mouseup'
	},

	initialize: function( options ) {
		PBSBaseView.prototype.initialize.call( this, options );

		this.attribute = _.clone( options.attribute );

		this._canApplyUpdater();
	},

	render: function() {
		if ( this.optionSettings.name ) {
			this.el.setAttribute( 'data-tooltip', this.optionSettings.name );
		}
		if ( this.optionSettings.render ) {
			this.optionSettings.render( this.model.get( 'element' ), this );
		}
		this._tooltipUpdater();
		this._isAppliedUpdater();
		this._canApplyUpdater();
		return this;
	},

	click: function() {
		if ( this.el.classList.contains( 'ct-tool--disabled' ) ) {
			return;
		}
		if ( this.optionSettings.click ) {
			this.optionSettings.click( this.model.get( 'element' ), this );
		}
		this._tooltipUpdater();
		this._isAppliedUpdater();
		this._canApplyUpdater();

		// Restore the caret position.
		if ( this._selectedElement && this._selectedElement.restoreState ) {
			this._selectedElement.restoreState();
		}
	},

	updateTooltip: function( value ) {
		if ( ! value ) {
			value = '';
		}
		if ( window.PBSEditor.isCtrlDown && window.PBSEditor.isShiftDown ) {
			if ( this.optionSettings['tooltip-reset'] ) {
				this.el.setAttribute( 'data-tooltip', this.optionSettings['tooltip-reset'].replace( '{0}', value ) );
				return;
			}
		} else if ( window.PBSEditor.isCtrlDown ) {
			if ( this.optionSettings['tooltip-down'] ) {
				this.el.setAttribute( 'data-tooltip', this.optionSettings['tooltip-down'].replace( '{0}', value ) );
				return;
			}
		} else {
			if ( this.optionSettings.tooltip ) {
				this.el.setAttribute( 'data-tooltip', this.optionSettings.tooltip.replace( '{0}', value ) );
				return;
			}
		}
		if ( this.optionSettings.tooltip ) {
			this.el.setAttribute( 'data-tooltip', this.optionSettings.tooltip );
		} else if ( this.optionSettings.name ) {
			this.el.setAttribute( 'data-tooltip', this.optionSettings.name );
		}
	},

	_tooltipUpdater: function() {
		if ( this.optionSettings.tooltipValue && this.model.get( 'element' ) ) {
			this.updateTooltip( this.optionSettings.tooltipValue( this.model.get( 'element' ), this ) );
		} else {
			this.updateTooltip();
		}
	},

	updateIsApplied: function( value ) {
		this.el.classList.remove( 'ct-tool--applied' );

		if ( value ) {
			this.el.classList.add( 'ct-tool--applied' );
		}
	},

	_canApplyUpdater: function() {
		this.el.classList.remove( 'ct-tool--disabled' );
		if ( this.optionSettings.canApply && this.model.get( 'element' ) && this.model.get( 'element' )._domElement ) {
			if ( ! this.optionSettings.canApply( this.model.get( 'element' ), this ) ) {
				this.el.classList.add( 'ct-tool--disabled' );
			}
		}
	},

	_isAppliedUpdater: function() {
		if ( this.optionSettings.isApplied && this.model.get( 'element' ) && this.model.get( 'element' )._domElement ) {
			this.updateIsApplied( this.optionSettings.isApplied( this.model.get( 'element' ), this ) );
		}
	},

	mouseenter: function() {
		if ( this.optionSettings.mouseenter && this.model.get( 'element' ) && this.model.get( 'element' )._domElement ) {
			this.optionSettings.mouseenter( this.model.get( 'element' ), this );
		}
		if ( this.optionSettings.hold ) {
			clearTimeout( this._holdTimeout );
			clearInterval( this._holdInterval );
		}
		if ( this.model.get( 'element' ) && this.model.get( 'element' )._domElement ) {
			this.model.get( 'element' )._domElement.classList.add( 'ce-element--over' );
		}
		this._tooltipUpdaterInterval = setInterval( this._tooltipUpdater.bind( this ), 100 );
	},

	mouseleave: function() {
		if ( this.optionSettings.mouseleave && this.model.get( 'element' ) && this.model.get( 'element' )._domElement ) {
			this.optionSettings.mouseleave( this.model.get( 'element' ), this );
		}
		if ( this.optionSettings.hold ) {
			clearTimeout( this._holdTimeout );
			clearInterval( this._holdInterval );
		}
		if ( this.model.get( 'element' ) ) {
			if ( this.model.get( 'element' )._domElement ) {
				this.model.get( 'element' )._domElement.classList.remove( 'ce-element--over' );
			}
		}
		clearInterval( this._tooltipUpdaterInterval );
	},

	mousedown: function() {

		// Store the cursor state.
		var root = ContentEdit.Root.get();
		var selectedElement = root.focused();
		if ( selectedElement && selectedElement.storeState ) {
			selectedElement.storeState();
		}
		if ( selectedElement ) {
			this._selectedElement = selectedElement;
		}

		if ( this.optionSettings.hold ) {
			clearTimeout( this._holdTimeout );
			clearInterval( this._holdInterval );

			this._holdTimeout = setTimeout( function() {
				this._holdInterval = setInterval( function() {
					this.optionSettings.hold( this.model.get( 'element' ), this );
					this._tooltipUpdater();
					this._isAppliedUpdater();
				}.bind( this ), 30 );
			}.bind( this ), 500 );
		}
	},

	mouseup: function() {
		if ( this.optionSettings.hold ) {
			clearTimeout( this._holdTimeout );
			clearInterval( this._holdInterval );
		}
	}
} );

PBSOption.GenericOption = Backbone.View.extend( {
	template: wp.template( 'pbs-shortcode-generic-option' ),

	className: 'pbs-tool-option',

	events: {
		'change input': 'attributeChanged',
		'keyup input': 'attributeChanged',
		'change textarea': 'attributeChanged',
		'keyup textarea': 'attributeChanged'
	},

	initialize: function( options ) {
		this.optionSettings = _.clone( options.optionSettings );
		this.attribute = _.clone( options.attribute );

		if ( 'content' === this.attribute ) {
			this.template = wp.template( 'pbs-shortcode-generic-content' );
		}
	},

	render: function() {
		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		data.value = this.model.get( this.attribute );
		data.attr = this.attribute;

		this.$el.html( this.template( data ) );

		return this;
	},

	attributeChanged: function( e ) {
		this.model.set( this.attribute, e.target.value );
	}
} );

PBSOption.Border = Backbone.View.extend( {
	template: wp.template( 'pbs-option-border' ),

	events: {
		'change select': 'styleChanged',
		'change .width': 'widthChanged',
		'keyup .width': 'widthChanged',
		'change .radius': 'radiusChanged',
		'keyup .radius': 'radiusChanged',
		'click .pbs-color-preview': 'togglePicker',
		'change .pbs-color-popup input': 'colorChanged',
		'keyup .pbs-color-popup input': 'colorChanged'
	},

	initialize: function( options ) {
		this.optionSettings = _.clone( options.optionSettings );
		this.randomID = this.optionSettings.id + '-' + _.random( 0, 10000 );

		this._hidePickerBound = this.hidePicker.bind( this );
		document.querySelector( '.ct-toolbox' ).addEventListener( 'mouseleave', this._hidePickerBound );
	},

	render: function() {
		var _this, i, styles, stylesToAdd;
		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		data.id = this.randomID;

		styles = window.getComputedStyle( this.model.get( 'element' )._domElement );
		stylesToAdd = [ 'border-color', 'border-style', 'border-width', 'border-radius' ];

		for ( i = 0; i < stylesToAdd.length; i++ ) {
			this.model.set( stylesToAdd[ i ], styles[ stylesToAdd[ i ] ], { silent: true } );
		}

		this.$el.html( this.template( data ) );

		_this = this;
		jQuery( '#' + this.randomID ).iris( {

			// Or in the data-default-color attribute on the input
			defaultColor: true,

			// A callback to fire whenever the color changes to a valid color
			change: function() {
				_this.colorChanged();
			},

			// A callback to fire when the input is emptied or an invalid color
			clear: function() {},

			// Hide the color picker controls on load
			hide: false,

			// Add our own pretty colors
			palettes: [
				'#282425', '#3d3a3b', '#555152', '#6b6969', '#838181', '#9b999a', '#b4b1b2', '#cccbcb', '#e5e4e4', '#ffffff',
				'#fd3d3f', '#f70363', '#eb389a', '#a812a9', '#7330b0', '#4b4bae', '#1490ec', '#00a4ed', '#00bacf', '#009586',
				'#e1d6b8', '#5b7b88', '#7c554a', '#fe5234', '#fe9631', '#fec03b', '#fbec57', '#c2dd52', '#75c457', '#12b059'
			]
		} );
		return this;

	},

	remove: function() {
		jQuery( '#' + this.randomID ).iris( 'destroy' );
		document.querySelector( '.ct-toolbox' ).removeEventListener( 'mouseleave', this._hidePickerBound );
		Backbone.View.prototype.remove.call( this );
	},

	colorChanged: function() {
		var inputColor = this.el.querySelector( '.pbs-color-popup input' ).value;
		var color = jQuery( this.el.querySelector( '#' + this.randomID ) ).iris( 'color' );

		if ( 'transparent' === inputColor || '' === inputColor ) {
			color = inputColor;
		}

		this.model.get( 'element' ).style( 'border-color', color );
		if ( 'transparent' === color ) {
			color = '';
		}
		this.el.querySelector( '.pbs-color-preview .pbs-color-preview-color' ).style.background = color;
	},

	styleChanged: function( e ) {

		var newBorder, allBordersZero;

		this.model.get( 'element' ).style( 'border-style', e.target.value );

		// If all borders are 0px, then make them into 1px if !== none
		// If none, turn all borders to 0px.

		newBorder = '0px';
		if ( 'none' !== e.target.value ) {
			newBorder = '1px';
		}

		allBordersZero = true;
		if ( parseInt( this.model.get( 'border-top-width' ), 10 ) ) {
			allBordersZero = false;
		}
		if ( parseInt( this.model.get( 'border-right-width' ), 10 ) ) {
			allBordersZero = false;
		}
		if ( parseInt( this.model.get( 'border-bottom-width' ), 10 ) ) {
			allBordersZero = false;
		}
		if ( parseInt( this.model.get( 'border-left-width' ), 10 ) ) {
			allBordersZero = false;
		}

		// Apply the border widths.
		if ( ( allBordersZero && 'none' !== e.target.value ) || 'none' === e.target.value ) {
			this.model.set( 'border-top-width', newBorder );
			this.model.set( 'border-right-width', newBorder );
			this.model.set( 'border-bottom-width', newBorder );
			this.model.set( 'border-left-width', newBorder );
			this.model.get( 'element' ).style( 'border-width', newBorder );
			this.model.trigger( 'change', this.model );
		}
	},

	widthChanged: function( e ) {
		var value = e.target.value;
		if ( ! isNaN( value ) && '' !== value.trim() ) {
			value = value + 'px';
		}
		this.model.get( 'element' ).style( 'border-width', value );
	},

	radiusChanged: function( e ) {
		var value = e.target.value;
		if ( ! isNaN( value ) && '' !== value.trim() ) {
			value = value + 'px';
		}
		this.model.get( 'element' ).style( 'border-radius', value );
	},

	togglePicker: function() {
		if ( 'block' === this.el.querySelector( '.pbs-color-popup' ).style.display ) {
			this.el.querySelector( '.pbs-color-popup' ).style.display = '';
		} else {
			this.el.querySelector( '.pbs-color-popup' ).style.display = 'block';
		}
	},

	hidePicker: function() {
		this.el.querySelector( '.pbs-color-popup' ).style.display = '';
	}
} );

PBSOption.Color = PBSBaseView.extend( {
	template: wp.template( 'pbs-option-color' ),

	events: {
		'mouseenter': 'mouseenter',
		'mouseleave': 'mouseleave',
		'change input': 'selectChanged',
		'keyup input': 'selectChanged',
		'click .pbs-color-preview': 'togglePicker',
		'mousedown .iris-square-handle': 'mousedownPicker',
		'mouseup .iris-square-handle': 'mouseupPicker',
		'click .iris-square-handle': 'irisHandleClick'
	},

	initialize: function( options ) {
		PBSBaseView.prototype.initialize.call( this, options );
		this.randomID = this.optionSettings.id + '-' + _.random( 0, 10000 );

		if ( this.optionSettings.value ) {
			this.model.set( this.optionSettings.id, this.optionSettings.value( this.model.get( 'element' ) ) );
		}

		this._hidePickerBound = this.hidePicker.bind( this );
		document.querySelector( '.ct-toolbox' ).addEventListener( 'mouseleave', this._hidePickerBound );

		this._canApplyUpdater();
	},

	_canApplyUpdater: function() {
		this.el.classList.remove( 'ct-tool--disabled' );
		if ( this.optionSettings.canApply ) {
			if ( ! this.optionSettings.canApply( this.model.get( 'element' ), this ) ) {
				this.el.classList.add( 'ct-tool--disabled' );
			}
		}
	},

	updateColor: function( color ) {
		if ( this.el.querySelector( '.pbs-color-preview-color' ).style.background !== color ) {
			this.el.querySelector( '.pbs-color-preview-color' ).style.background = color;
			this.el.querySelector( 'input' ).value = color;
			jQuery( '#' + this.randomID ).iris( 'color', color );
		}
	},

	// Prevent the screen from jumping up when clicking on the handle.
	irisHandleClick: function( ev ) {
		ev.preventDefault();
	},

	render: function() {
		var _this;

		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		data.id = this.randomID;

		if ( this.optionSettings.value ) {
			data.value = this.optionSettings.value( this.model.get( 'element' ) );
		} else if ( this.optionSettings.id ) {
			data.value = this.model.get( this.optionSettings.id );
		}

		this.$el.html( this.template( data ) );

		_this = this;
		jQuery( '#' + this.randomID ).iris( {

			// Or in the data-default-color attribute on the input
			defaultColor: true,

			// A callback to fire whenever the color changes to a valid color
			change: function() {

				// Change fires when Iris initializes, prevent change calls.
				if ( ! _this._justInit ) {
					_this._justInit = true;
					return;
				}
				_this.selectChanged();
			},

			// A callback to fire when the input is emptied or an invalid color
			clear: function() {},

			// Hide the color picker controls on load
			hide: false,

			// Add our own pretty colors
			palettes: [
				'#282425', '#3d3a3b', '#555152', '#6b6969', '#838181', '#9b999a', '#b4b1b2', '#cccbcb', '#e5e4e4', '#ffffff',
				'#fd3d3f', '#f70363', '#eb389a', '#a812a9', '#7330b0', '#4b4bae', '#1490ec', '#00a4ed', '#00bacf', '#009586',
				'#e1d6b8', '#5b7b88', '#7c554a', '#fe5234', '#fe9631', '#fec03b', '#fbec57', '#c2dd52', '#75c457', '#12b059'
			]
		} );

		this._canApplyUpdater();

		return this;
	},

	remove: function() {
		jQuery( '#' + this.randomID ).iris( 'destroy' );
		document.querySelector( '.ct-toolbox' ).removeEventListener( 'mouseleave', this._hidePickerBound );

		PBSBaseView.prototype.remove.call( this );
	},

	selectChanged: function( forceColor ) {
		var input = this.el.querySelector( 'input' );
		var color = jQuery( input ).iris( 'color' );

		if ( forceColor ) {
			color = input.value;
		}

		if ( '' === input.value || 'transparent' === input.value ) {
			color = input.value;
		}

		if ( this.optionSettings.change ) {
			this.optionSettings.change( this.model.get( 'element' ), color, this );
		}
		if ( this.optionSettings.id ) {
			this.model.set( this.optionSettings.id, color );
		}

		if ( 'transparent' === color ) {
			color = '';
		}
		this.el.querySelector( '.pbs-color-preview-color' ).style.background = color;

		wp.hooks.doAction( 'pbs.option.changed' );
	},

	togglePicker: function() {

		var input, popup, otherPopups;

		// Remove the current image with shift+ctrl+click
		if ( window.PBSEditor.isCtrlDown && window.PBSEditor.isShiftDown ) {
			input = this.el.querySelector( 'input' );
			input.value = '';
			this.selectChanged();

			jQuery( '#' + this.randomID ).iris( 'color', 'transparent' );
			return;
		}

		popup = this.el.querySelector( '.pbs-color-popup' );
		otherPopups = document.querySelectorAll( '.pbs-color-popup' );
		Array.prototype.forEach.call( otherPopups, function( el ) {
			if ( el !== popup ) {
				el.style.display = '';
			}
		} );

		if ( 'block' === popup.style.display ) {
			popup.style.display = '';
		} else {
			popup.style.display = 'block';

			this.$el.find( 'input[type="text"]' ).select();
		}
	},

	hidePicker: function() {
		this.el.querySelector( '.pbs-color-popup' ).style.display = '';
	},

	mouseenter: function() {
		if ( this.optionSettings.mouseenter ) {
			this.optionSettings.mouseenter( this.model.get( 'element' ), this );
		}
	},

	mouseleave: function() {
		if ( this.optionSettings.mouseleave ) {
			this.optionSettings.mouseleave( this.model.get( 'element' ), this );
		}
	},

	mousedownPicker: function() {
		ContentTools.EditorApp.get().history.stopWatching();
	},

	mouseupPicker: function() {
		ContentTools.EditorApp.get().history.watch();
	}
} );

PBSOption.ColorButton = PBSOption.Color.extend( {} );

PBSOption.Select = PBSBaseView.extend( {
	template: wp.template( 'pbs-option-select' ),

	events: {
		'change select': 'selectChanged'
	},

	initialize: function( options ) {
		var value;

		PBSBaseView.prototype.initialize.call( this, options );

		this.listenTo( this.model, 'change', this.render );
		if ( this.optionSettings.value ) {
			this.model.set( this.optionSettings.id, this.optionSettings.value( this.model.get( 'element' ) ) );
		} else {
			value = this.model.element.model.attributes[ this.optionSettings.id ] || '';
			this.model.set( this.optionSettings.id, value );
		}
	},

	render: function() {
		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		if ( this.optionSettings.value ) {
			data.value = this.optionSettings.value( this.model.get( 'element' ), this );
		} else {
			data.value = this.model.element.model.attributes[ this.optionSettings.id ] || '';
		}
		this.$el.html( this.template( data ) );
		return this;
	},

	selectChanged: function( e ) {
		if ( this.optionSettings.change ) {
			this.optionSettings.change( this.model.get( 'element' ), e.target.value, this );
		}
		this.model.set( this.optionSettings.id, e.target.value );
		wp.hooks.doAction( 'pbs.option.changed' );
	}
} );

// STANDARD-PRO-ONLY-START
if ( ! pbsParams.is_lite ) {
	PBSOption.SelectPost = PBSOption.Select.extend( {

		initialize: function( options ) {

			var request, postType = 'post';
			if ( options.optionSettings.post_type ) {
				postType = options.optionSettings.post_type;
			}

			if ( ! PBSOption.SelectPost.postTypes ) {
				PBSOption.SelectPost.postTypes = {};
			}
			if ( 'undefined' === typeof PBSOption.SelectPost.postTypes[ postType ] ) {

				this.justLoadedOptions = true;

				request = new XMLHttpRequest();
				request.open( 'POST', pbsParams.ajax_url, true );
				request.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8' );
				request.onload = function() {
					var response;

					if ( request.status >= 200 && request.status < 400 ) {
						if ( request.responseText ) {
							response = JSON.parse( request.responseText );

							if ( 'undefined' !== typeof response.length || 0 === response.length ) {
								return;
							}

							PBSOption.SelectPost.postTypes[ this.optionSettings.post_type ] = response;
							this.optionSettings.options = response;
							this.render();
						}
					}
				}.bind( this );
				request.send( 'action=pbs_inspector_dropdown_post&nonce=' + pbsParams.nonce + '&post_type=' + postType );

			} else {
				options.optionSettings.options = PBSOption.SelectPost.postTypes[ postType ];
			}

			PBSOption.SelectPost.__super__.initialize.call( this, options );

		}
	} );
}

// STANDARD-PRO-ONLY-END

// STANDARD-PRO-ONLY-START
if ( ! pbsParams.is_lite ) {
	PBSOption.SelectDb = PBSOption.Select.extend( {

		initialize: function( options ) {

			var request, hash = '', queryString = '';

			if ( options.optionSettings.db_table ) {
				hash += options.optionSettings.db_table;
				queryString += '&db_table=' + options.optionSettings.db_table;
			}
			if ( options.optionSettings.db_field_id ) {
				hash += '-' + options.optionSettings.db_field_id;
				queryString += '&db_value=' + options.optionSettings.db_field_id;
			}
			if ( options.optionSettings.db_field_label ) {
				hash += '-' + options.optionSettings.db_field_label;
				queryString += '&db_label=' + options.optionSettings.db_field_label;
			}
			if ( options.optionSettings.db_where_column ) {
				hash += '-' + options.optionSettings.db_where_column;
				queryString += '&db_where_field=' + options.optionSettings.db_where_column;
			}
			if ( options.optionSettings.db_where_value ) {
				hash += '-' + options.optionSettings.db_where_value;
				queryString += '&db_where_value=' + options.optionSettings.db_where_value;
			}

			if ( ! PBSOption.SelectPost.dbValues ) {
				PBSOption.SelectPost.dbValues = {};
			}

			options.optionSettings.options = { '': '— ' + pbsParams.labels.loading_options + ' —' };

			if ( 'undefined' === typeof PBSOption.SelectPost.dbValues[ hash ] ) {

				this.justLoadedOptions = true;

				request = new XMLHttpRequest();
				request.open( 'POST', pbsParams.ajax_url, true );
				request.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8' );
				request.onload = function() {

					var response, errored = true;

					if ( request.status >= 200 && request.status < 400 ) {
						if ( request.responseText ) {
							response = JSON.parse( request.responseText );

							if ( 'undefined' !== typeof response.length || 0 === response.length ) {
								return;
							}

							PBSOption.SelectPost.dbValues[ hash ] = response;
							this.optionSettings.options = response;
							this.render();

							errored = false;
						}
					}

					if ( errored ) {
						this.$el.find( 'select option' ).html( '— ' + pbsParams.labels.loading_options_errored + ' —' );
					}

				}.bind( this );
				request.send( 'action=pbs_inspector_dropdown_db&nonce=' + pbsParams.nonce + queryString );

			} else {
				options.optionSettings.options = PBSOption.SelectPost.dbValues[ hash ];
			}

			PBSOption.SelectPost.__super__.initialize.call( this, options );

		}
	} );
}

// STANDARD-PRO-ONLY-END

PBSOption.Checkbox = PBSBaseView.extend( {
	template: wp.template( 'pbs-option-checkbox' ),

	events: {
		'change input': 'selectChanged'
	},

	initialize: function( options ) {
		PBSBaseView.prototype.initialize.call( this, options );

		if ( 'undefined' === typeof this.optionSettings.checked ) {
			this.optionSettings.checked = true;
		}

		this.listenTo( this.model, 'change', this.render );
		if ( this.optionSettings.value ) {
			this.model.set( this.optionSettings.id, this.optionSettings.value( this.model.get( 'element' ) ) );
		}
	},

	render: function() {
		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		data.value = '';

		if ( this.optionSettings.value ) {
			data.value = this.optionSettings.value( this.model.get( 'element' ) );
		} else if ( this.optionSettings.id ) {
			data.value = this.model.get( this.optionSettings.id );
		}

		// Add the template if it doesn't exist yet.
		if ( ! this.$el.html() ) {
			this.$el.html( this.template( data ) );
		} else {
			this.$el.find( 'input[type="checkbox"]' )[0].checked = data.value === this.optionSettings.checked;
		}
		return this;
	},

	selectChanged: function( e ) {
		var value = false;
		if ( this.optionSettings.unchecked ) {
			value = this.optionSettings.unchecked;
		}
		if ( e.target.checked ) {
			value = true;
			if ( this.optionSettings.checked ) {
				value = this.optionSettings.checked;
			}
		}
		if ( this.optionSettings.change ) {
			this.optionSettings.change( this.model.get( 'element' ), value, this );
		}

		this.model.set( this.optionSettings.id, value );
		wp.hooks.doAction( 'pbs.option.changed' );
	},

	click: function( e ) {
		if ( this.optionSettings.click ) {
			this.optionSettings.click( this.model.get( 'element' ), e.target.value );
		}
	}
} );

// STANDARD-PRO-ONLY-START
if ( ! pbsParams.is_lite ) {
	PBSOption.Multicheck = PBSOption.Checkbox.extend( {
		template: wp.template( 'pbs-option-multicheck' ),

		render: function() {
			var i, valuesChecked;
			var data = _.extend( {}, this.model.attributes, this.optionSettings );
			data.value = '';

			if ( this.optionSettings.value ) {
				data.value = this.optionSettings.value( this.model.get( 'element' ) );
			} else if ( this.optionSettings.id ) {
				data.value = this.model.get( this.optionSettings.id );
			}

			// Add the template if it doesn't exist yet.
			if ( ! this.$el.html() ) {
				this.$el.html( this.template( data ) );
			} else {
				valuesChecked = data.value || '';
				valuesChecked = valuesChecked.split( ',' );

				this.$el.find( 'input[type="checkbox"]' ).checked = false;

				for ( i = 0; i < valuesChecked.length; i++ ) {
					this.$el.find( 'input[type="checkbox"][value="' + valuesChecked[ i ] + '"]' ).checked = true;
				}
			}
			return this;
		},

		selectChanged: function( e ) {
			var value = '';
			e.preventDefault();
			this.$el.find( 'input:checked' ).each( function() {
				value += value ? ',' : '';
				value += this.getAttribute( 'value' );
			} );

			if ( this.optionSettings.change ) {
				this.optionSettings.change( this.model.get( 'element' ), value );
			}
			this.model.set( this.optionSettings.id, value );
			wp.hooks.doAction( 'pbs.option.changed' );
		}
	} );
}

// STANDARD-PRO-ONLY-END

PBSOption.Text = PBSBaseView.extend( {
	template: wp.template( 'pbs-option-text' ),

	events: {
		'change input': 'selectChanged',
		'keyup input': 'selectChanged',
		'click input': 'click'
	},

	initialize: function( options ) {
		PBSBaseView.prototype.initialize.call( this, options );

		this.listenTo( this.model, 'change', this.render );
		if ( this.optionSettings.value ) {
			this.model.set( this.optionSettings.id, this.optionSettings.value( this.model.get( 'element' ) ) );
		}
	},

	render: function() {
		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		data.value = '';

		if ( this.optionSettings.value ) {
			data.value = this.optionSettings.value( this.model.get( 'element' ) );
		} else if ( this.optionSettings.id ) {
			data.value = this.model.get( this.optionSettings.id );
		}

		// Add the template if it doesn't exist yet.
		if ( ! this.$el.html() ) {
			this.$el.html( this.template( data ) );
		} else if ( this.$el.find( 'input[type="text"]' ).val() !== data.value ) {

			// If it exists, only update the value so that we don't lose focus on the field.
			this.$el.find( 'input[type="text"]' ).val( data.value );
		}
		return this;
	},

	selectChanged: function( e ) {
		if ( this.optionSettings.change ) {
			this.optionSettings.change( this.model.get( 'element' ), e.target.value, this );
		}
		this.model.set( this.optionSettings.id, e.target.value );
		wp.hooks.doAction( 'pbs.option.changed' );
	},

	click: function( e ) {
		if ( this.optionSettings.click ) {
			this.optionSettings.click( this.model.get( 'element' ), e.target.value );
		}
	}
} );

PBSOption.Textarea = PBSOption.Text.extend( {
	template: wp.template( 'pbs-option-textarea' ),

	events: {
		'change textarea': 'selectChanged',
		'keyup textarea': 'selectChanged',
		'click textarea': 'click'
	}
} );

PBSOption.Link = PBSOption.Text.extend( {
	template: wp.template( 'pbs-option-link' ),

	events: {
		'click input[type="button"]': 'click',
		'change input': 'selectChanged',
		'keyup input': 'selectChanged'
	},

	render: function() {
		var value;
		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		data.value = '';

		if ( this.optionSettings.value ) {
			data.value = this.optionSettings.value( this.model.get( 'element' ) );
		} else if ( this.optionSettings.id ) {
			data.value = this.model.get( this.optionSettings.id );
		}

		if ( 'object' === typeof data.value ) {
			value = data.value.url;
		} else {
			value = data.value;
		}

		// Add the template if it doesn't exist yet.
		if ( ! this.$el.html() ) {
			this.$el.html( this.template( data ) );

		} else if ( this.$el.find( 'input[type="text"]' ).val() !== value ) {

			// If it exists, only update the value so that we don't lose focus on the field.
			this.$el.find( 'input[type="text"]' ).val( value );
		}
		return this;
	},

	click: function() {
		var value, target = null, url = '';

		if ( this.optionSettings.value ) {
			value = this.optionSettings.value( this.model.get( 'element' ) );
		} else if ( this.optionSettings.id ) {
			value = this.model.get( this.optionSettings.id );
		}

		if ( 'object' === typeof value ) {
			url = value.url;
			if ( 'undefined' !== value.target ) {
				target = value.target;
			}
		} else {
			url = value;
		}

		window.pbsLinkFrame.open( {
			url: url,
			text: '',
			target: target,
			hasText: false,
			hasNewWindow: 'object' === typeof value && 'undefined' !== value.target
		}, function( url, text, target ) {
			if ( this.optionSettings.change ) {
				this.optionSettings.change( this.model.get( 'element' ), url, target );
			}
			this.$el.find( 'input[type="text"]' ).val( url );
		}.bind( this ) );
	}
} );

PBSOption.Number = PBSOption.Text.extend( {
	template: wp.template( 'pbs-option-number' ),

	initialize: function( options ) {

		PBSOption.Text.prototype.initialize.call( this, options );

		if ( this.optionSettings.maxFunction ) {
			this._boundMaxUpdate = this.maxUpdate.bind( this );
			wp.hooks.addAction( 'pbs.option.changed', 'pbs.option', this._boundMaxUpdate );
		}
	},

	maxUpdate: function() {

		var slider, input, left, min, value, newMax;

		if ( this.optionSettings.maxFunction ) {

			newMax = this.optionSettings.maxFunction( this.model.get( 'element' ) );
			if ( this.optionSettings.max !== newMax ) {

				// Get the new max.
				this.optionSettings.max = newMax;

				// If the slider is already rendered, update the max value.
				if ( this.$el.html() ) {
					slider = this.$el.find( '.pbs-option-number-slider' );
					input = this.$el.find( 'input' );

					// Change the necessary attributes.
					input.attr( 'max', this.optionSettings.max );
					slider.slider( 'option', 'max', this.optionSettings.max );

					// Force the slider refresh.
					value = parseFloat( input.val() );
					min = parseFloat( input.attr( 'min' ) );
					left = ( value - min ) / ( this.optionSettings.max - min ) * 100;
					if ( left > 100 ) {
						left = 100;
					}

					// Manually update the slider handle position.
					this.$el.find( '.ui-slider-handle' ).css( 'left', left + '%' );
				}
			}
		}
	},

	render: function() {

		var slider, value, input;

		this.maxUpdate();

		if ( this.$el.html() ) {

			if ( this.optionSettings.value ) {
				value = this.optionSettings.value( this.model.get( 'element' ) );
				slider = this.$el.find( '.pbs-option-number-slider' );
				input = this.$el.find( 'input' );

				if ( slider.slider( 'value' ).toString() !== value.toString() ) {
					slider.slider( 'value', value );
				}
				input.val( value );
			}

			return this;
		} else {
			if ( this.optionSettings.value ) {
				input = this.$el.find( 'input' );
				value = this.optionSettings.value( this.model.get( 'element' ) );
				input.val( value );
			}
		}

		PBSOption.Number.__super__.render.call( this );

		input = this.$el.find( 'input' );
		this.$el.find( '.pbs-option-number-slider' ).slider( {
			range: 'min',
			max: parseFloat( input.attr( 'max' ) ),
			min: parseFloat( input.attr( 'min' ) ),
			step: parseFloat( input.attr( 'step' ) ),
			value: input.val(),
			animate: 'fast',
			change: function( event, ui ) {

				clearTimeout( this._changeTimeout );
				this._changeTimeout = setTimeout( function( ui ) {
					var input = this.$el.find( 'input' );
					if ( ui.value !== parseFloat( input.val() ) ) {
						input.val( ui.value ).trigger( 'change' );
					}
				}.bind( this, ui ), 60 );
			}.bind( this ),
			slide: function( event, ui ) {

				clearTimeout( this._changeTimeout );
				this._changeTimeout = setTimeout( function( ui ) {
					var input = this.$el.find( 'input' );
					if ( ui.value !== parseFloat( input.val() ) ) {
						input.val( ui.value ).trigger( 'change' );
					}
				}.bind( this, ui ), 60 );
			}.bind( this )
		} ).disableSelection();

		return this;
	},

	selectChanged: function( e ) {

		var slider, input, inputVal;

		PBSOption.Number.__super__.selectChanged.call( this, e );

		slider = this.$el.find( '.pbs-option-number-slider' );
		input = this.$el.find( 'input' );
		inputVal = input.val();

		if ( 'keyup' === e.type && '' !== inputVal ) {
			if ( slider.slider( 'value' ).toString() !== input.val().toString() ) {
				slider.slider( 'value', input.val() );
			}
		}

		if ( '' === inputVal ) {
			input.val( '' );
		}

		if ( this.optionSettings.change ) {
			this.optionSettings.change( this.model.get( 'element' ), inputVal, this );
		}
		wp.hooks.doAction( 'pbs.option.changed' );
	},

	remove: function() {
		if ( this.optionSettings.maxFunction ) {
			wp.hooks.removeAction( 'pbs.option.changed', 'pbs.option', this._boundMaxUpdate );
		}

		PBSOption.Number.__super__.remove.call( this );
	}
} );

PBSOption.File = PBSOption.Text.extend( {
	template: wp.template( 'pbs-option-file' ),

	multiple: false,

	events: {
		'change input': 'selectChanged',
		'click button': 'openImagePicker'
	},

	openImagePicker: function() {
		var frame = wp.media( {
			title: pbsParams.labels.s_attribute.replace( '%s', this.optionSettings.name ),
			multiple: this.multiple,
			button: { text: pbsParams.labels.select_file }
		} );

		frame.on( 'open', function() {
		}.bind( this ) );

		// Get the url when done
		frame.on( 'select', function() {
			var selection = frame.state().get( 'selection' );
			var value = '';

			selection.each( function( attachment ) {
				if ( 'undefined' === typeof attachment.attributes.url ) {
					return;
				}

				value = attachment.attributes.url;

			}.bind( this ) );

			this.$el.find( 'input[type="text"]' ).val( value );

			// Set the new image value.
			this.model.set( this.optionSettings.id, value );

			if ( this.optionSettings.change ) {
				this.optionSettings.change( this.model.get( 'element' ), value, this );
			}

			wp.hooks.doAction( 'pbs.option.changed' );

			frame.off( 'select' );
		}.bind( this ) );

		// Open the uploader
		frame.open();
		return false;
	}
} );

PBSOption.Image = PBSOption.Text.extend( {
	template: wp.template( 'pbs-option-image' ),

	multiple: false,

	events: {
		'change input': 'selectChanged',
		'click .pbs-image-preview': 'openImagePicker',
		'click .pbs-image-preview-remove': 'removeImage'
	},

	render: function() {
		var ret, imageIDsToAjaxLoad;
		var ajaxToGetImageURL = false;
		if ( ! this.$el.html() ) {
			ajaxToGetImageURL = true;
		}

		ret = PBSOption.Image.__super__.render.call( this );

		// First load of the attribute.
		if ( ajaxToGetImageURL ) {

			// This will hold the imageIDs that we don't have URLs to.
			imageIDsToAjaxLoad = '';

			// The attribute is an attachment ID, so we don't have the actual
			// URL of the image. Check if we have one already in memory.
			this.$el.find( '.pbs-image-preview:not([data-id=""])' ).each( function() {
				var imageID = this.getAttribute( 'data-id' );
				if ( ! imageID.match( /^[\d,]+$/ ) ) {
					this.style.backgroundImage = imageID.match( /url\(/ ) ? imageID : 'url(' + imageID + ')';
					return;
				}
				if ( PBSOption.Image._imageURLs.hasOwnProperty( imageID ) ) {
					this.style.backgroundImage = 'url(' + PBSOption.Image._imageURLs[ imageID ] + ')';
				} else {
					imageIDsToAjaxLoad += imageIDsToAjaxLoad ? ',' : '';
					imageIDsToAjaxLoad += imageID;
				}
			} );

			// Use Ajax to get the image URLs of the attachment IDs that we
			// don't have the URLs of yet.
			if ( imageIDsToAjaxLoad ) {
				PBSOption.Image.doAjaxToGetImageURLs( imageIDsToAjaxLoad );
			}

		}

		return ret;
	},

	openImagePicker: function() {
		var frame = wp.media( {
			title: pbsParams.labels.s_attribute.replace( '%s', this.optionSettings.name ),
			multiple: this.multiple,
			library: { type: 'image' },
			button: { text: pbsParams.labels.select_image }
		} );

		frame.on( 'open', function() {
			var i, selection, attachment;
			var imageIDs = this.model.get( this.optionSettings.id ) || '';
			imageIDs = imageIDs.split( ',' );
			selection = frame.state().get( 'selection' );
			for ( i = 0; i < imageIDs.length; i++ ) {
				attachment = wp.media.attachment( imageIDs[ i ] );
				selection.add( attachment ? [ attachment ] : [] );
			}
		}.bind( this ) );

		// Get the url when done
		frame.on( 'select', function() {
			var selection = frame.state().get( 'selection' );
			var value = '';
			var attachmentURLs = [];
			var attachmentIDs = [];
			var useURLs = false;

			// Remove all preview images.
			this.$el.find( '.pbs-image-preview' ).remove();

			if ( 'undefined' !== typeof this.optionSettings.urls ) {
				if ( this.optionSettings.urls ) {
					useURLs = true;
				}
			}

			selection.each( function( attachment ) {
				var image;

				if ( 'undefined' === typeof attachment.attributes.sizes ) {
					return;
				}

				image = attachment.attributes.sizes.full;
				if ( 'undefined' !== typeof attachment.attributes.sizes.medium ) {
					image = attachment.attributes.sizes.medium;
				}

				// Add preview images for each selected image.
				jQuery( '<div></div>' )
					.addClass( 'pbs-image-preview' )
					.css( 'backgroundImage', 'url(' + image.url + ')' )
					.attr( 'data-id', attachment.id )
					.attr( 'data-url', attachment.attributes.sizes.full.url )
					.append( jQuery( '<div></div>' ).addClass( 'pbs-image-preview-remove' ) )
					.appendTo( this.$el );

				attachmentURLs.push( attachment.attributes.sizes.full.url );
				attachmentIDs.push( attachment.id );

				// Value += value ? ',' : '';
				// value += attachment.id;
				value += value ? ',' : '';
				value += useURLs ? attachment.attributes.sizes.full.url : attachment.id;

				// Keep the image preview URL in memory for future renders.
				PBSOption.Image._imageURLs[ attachment.id ] = image.url;

			}.bind( this ) );

			// Set the new image value.
			this.model.set( this.optionSettings.id, value );

			if ( this.optionSettings.change ) {
				this.optionSettings.change( this.model.get( 'element' ), ! useURLs ? attachmentIDs : attachmentURLs, ! useURLs ? attachmentURLs : attachmentIDs, this );
			}

			wp.hooks.doAction( 'pbs.option.changed' );

			frame.off( 'select' );
		}.bind( this ) );

		// Open the uploader
		frame.open();
		return false;
	},

	removeImage: function( e ) {

		var value = '', removeMe = e.target.parentNode.getAttribute( 'data-id' );
		var useURLs = false;
		var attachmentIDs = [];
		var attachmentURLs = [];

		if ( 'undefined' !== typeof this.optionSettings.urls ) {
			if ( this.optionSettings.urls ) {
				useURLs = true;
			}
		}

		if ( this.multiple ) {
			this.$el.find( '.pbs-image-preview' ).each( function() {
				if ( this.getAttribute( 'data-id' ) !== removeMe ) {
					value += value ? ',' : '';
					value += this.getAttribute( 'data-id' );
					attachmentIDs.push( this.getAttribute( 'data-id' ) );
					attachmentURLs.push( this.getAttribute( 'data-url' ) ? this.getAttribute( 'data-url' ) : this.getAttribute( 'data-id' ) );
				}
			} );
		}
		e.target.parentNode.parentNode.removeChild( e.target.parentNode );

		if ( ! this.multiple || ( this.multiple && ! this.$el.find( '.pbs-image-preview' ).length ) ) {
			jQuery( '<div></div>' )
				.addClass( 'pbs-image-preview' )
				.attr( 'data-id', '' )
				.appendTo( this.$el );
		}

		this.model.set( this.optionSettings.id, value );

		if ( this.optionSettings.remove ) {
			this.optionSettings.remove( this.model.get( 'element' ), useURLs ? attachmentURLs : attachmentIDs, this );
		}

		wp.hooks.doAction( 'pbs.option.changed' );

		return false;
	}
} );

// This contains imageURLs per attachment ID that we have gotten through
// the course of editing, remember them so as not to re-get them during
// the entire editing session.
PBSOption.Image._imageURLs = {};

// This is called to get the image URLs from a given set of
// comma separated attachment IDs.
PBSOption.Image.doAjaxToGetImageURLs = function( imageIDs ) {
	if ( 'undefined' === typeof PBSOption.Image._imageIDsToAjax ) {
		PBSOption.Image._imageIDsToAjax = '';
	}

	if ( ! imageIDs.match( /^[\d,]+$/ ) ) {
		return;
	}

	PBSOption.Image._imageIDsToAjax += PBSOption.Image._imageIDsToAjax ? ',' : '';
	PBSOption.Image._imageIDsToAjax += imageIDs;

	// Do this in a timeout to only do one ajax at a time for faster querying.
	clearTimeout( PBSOption.Image._doAjaxToGetImageURLsTimeout );
	PBSOption.Image._doAjaxToGetImageURLsTimeout = setTimeout( function() {
		PBSOption.Image._doAjaxToGetImageURLs();
	}, 50 );
};
PBSOption.Image._doAjaxToGetImageURLs = function() {

	var i, payload, request;
	var imageIDs = PBSOption.Image._imageIDsToAjax || '';
	imageIDs = imageIDs.split( ',' );
	for ( i = 0; i < imageIDs.length; i++ ) {
		jQuery( '.pbs-tool-option .pbs-image-preview[data-id=' + imageIDs[ i ] + ']' ).addClass( 'pbs-loading' );
	}

	payload = new FormData();
	payload.append( 'action', 'pbs_get_attachment_urls' );
	payload.append( 'image_ids', PBSOption.Image._imageIDsToAjax );
	payload.append( 'nonce', pbsParams.nonce );

	request = new XMLHttpRequest();
	request.open( 'POST', pbsParams.ajax_url );

	request.onload = function() {
		var i, response;
		if ( request.status >= 200 && request.status < 400 ) {
			try {
				response = JSON.parse( request.responseText );

				// The response is an object of IDs => URLs.
				for ( i = 0; i < imageIDs.length; i++ ) {
					if ( 'undefined' !== typeof response[ imageIDs[ i ] ] ) {

						// Add the background image.
						jQuery( '.pbs-tool-option .pbs-image-preview[data-id=' + imageIDs[ i ] + ']' ).css( 'backgroundImage', 'url(' + response[ imageIDs[ i ] ] + ')' );

						// Keep the image for future use.
						PBSOption.Image._imageURLs[ imageIDs[ i ] ] = response[ imageIDs[ i ] ];

					} else {

						// We didn't have an image for this image ID.
						jQuery( '.pbs-tool-option .pbs-image-preview[data-id=' + imageIDs[ i ] + ']' ).addClass( 'pbs-ajax-error' );
					}
				}

			} catch ( e ) {

				// Add error class.
				for ( i = 0; i < imageIDs.length; i++ ) {
					jQuery( '.pbs-tool-option .pbs-image-preview[data-id=' + imageIDs[ i ] + ']' ).addClass( 'pbs-ajax-error' );
				}
			}
		}

		// Remove the loading class.
		for ( i = 0; i < imageIDs.length; i++ ) {
			jQuery( '.pbs-tool-option .pbs-image-preview[data-id=' + imageIDs[ i ] + ']' ).removeClass( 'pbs-loading' );
		}

		// When we're done, make the image IDs blank for future requests.
		PBSOption.Image._imageIDsToAjax = '';
	};

	// There was a connection error of some sort.
	request.onerror = function() {
		var i;

		// Remove the loading class.
		for ( i = 0; i < imageIDs.length; i++ ) {
			jQuery( '.pbs-tool-option .pbs-image-preview[data-id=' + imageIDs[ i ] + ']' ).removeClass( 'pbs-loading' );
		}

		// When we're done, make the image IDs blank for future requests.
		PBSOption.Image._imageIDsToAjax = '';
	};
	request.send( payload );
};

PBSOption.Images = PBSOption.Image.extend( {
	multiple: 'toggle'
} );

PBSOption.MarginsAndPaddings = Backbone.View.extend( {
	template: wp.template( 'pbs-option-margins-and-paddings' ),

	events: {
		'keyup input': 'inputChanged',
		'change input': 'inputChanged',
		'blur input': 'fixBlankValue',
		'keydown input': 'incrementDecrementValue'
	},

	initialize: function( options ) {
		this.optionSettings = _.clone( options.optionSettings );
		this.listenTo( this.model, 'change', this.render );
	},

	render: function() {

		var i, data;
		var element = this.model.get( 'element' )._domElement;
		var styles = window.getComputedStyle( element );
		var stylesToAdd = [
			'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
			'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
			'padding-top', 'padding-right', 'padding-bottom', 'padding-left'
		];

		for ( i = 0; i < stylesToAdd.length; i++ ) {

			// Use the inline style if set, else use the computed style.
			if ( element.style[ stylesToAdd[ i ] ] ) {
				this.model.set( stylesToAdd[ i ], element.style[ stylesToAdd[ i ] ], { silent: true } );
			} else {
				this.model.set( stylesToAdd[ i ], styles[ stylesToAdd[ i ] ], { silent: true } );
			}
		}

		// Only disable stuff for the currently selected row, the width data comes from the main/parent row.
		if ( 'full-width-retain-content' === element.getAttribute( 'data-width' ) || 'full-width' === element.getAttribute( 'data-width' ) ) {
			if ( 'full-width-retain-content' === this.model.get( 'width' ) ) {
				this.model.set( 'disableHorizontalPaddings', true );
			} else {
				this.model.unset( 'disableHorizontalPaddings' );
			}
			if ( 'full-width-retain-content' === this.model.get( 'width' ) || 'full-width' === this.model.get( 'width' ) ) {
				this.model.set( 'disableHorizontalMargins', true );
			} else {
				this.model.unset( 'disableHorizontalMargins' );
			}
		} else {
			this.model.unset( 'disableHorizontalPaddings' );
			this.model.unset( 'disableHorizontalMargins' );
		}

		data = _.extend( {}, this.model.attributes, this.optionSettings );
		this.$el.html( this.template( data ) );
		return this;
	},

	inputChanged: function( e ) {
		var value = e.target.value;
		var styleName = e.target.getAttribute( 'data-style' );
		if ( ! isNaN( value ) && '' !== value.trim() ) {
			value = value + 'px';
		}
		this.model.get( 'element' ).style( styleName, value );
		this.model.set( styleName, value, { silent: true } );
	},

	incrementDecrementValue: function( e ) {
		var regex = /^(\-?\d+)([^\d]*)$/;
		var match = regex.exec( e.target.value );
		if ( match && ( 38 === e.which || 40 === e.which ) ) {
			if ( 38 === e.which ) {
				match[1]++;
				if ( e.ctrlKey || e.metaKey || e.shiftKey ) {
					match[1]++;
					match[1]++;
					match[1]++;
					match[1]++;
				}
			} else {
				match[1]--;
				if ( e.ctrlKey || e.metaKey || e.shiftKey ) {
					match[1]--;
					match[1]--;
					match[1]--;
					match[1]--;
				}
			}
			e.target.value = match[1] + match[2];

			// Fire the change.
			e.target.dispatchEvent( new CustomEvent( 'change' ) );
		}
	},

	fixBlankValue: function( e ) {

		// Update the text input.
		var values;
		var style = e.target.getAttribute( 'data-style' );
		var styleCamel = style.replace( /-([a-z])/g, function( m, w ) {
			return w.toUpperCase();
		} );

		// Get the inline style.
		var cssValue = this.model.get( 'element' )._domElement.style[ styleCamel ];

		// If inline style isn't available, get the computed style.
		if ( ! cssValue ) {
			values = window.getComputedStyle( this.model.get( 'element' )._domElement );
			cssValue = values[ style ];
		}

		e.target.value = cssValue;
		this.model.set( style, cssValue, { silent: true } );
	}

} );

PBSOption.CustomClass = Backbone.View.extend( {
	template: wp.template( 'pbs-option-text' ),

	events: {
		'change input': 'selectChanged',
		'keyup input': 'selectChanged'
	},

	getClasses: function() {
		var i, classes, currentClasses, staticClassRegex;
		var element = this.model.get( 'element' );
		if ( 'undefined' === typeof element.attr( 'class' ) ) {
			return '';
		}

		classes = element.attr( 'class' );

		// Allow regex matched classes from being edited.
		if ( this.optionSettings.ignoredClasses ) {
			currentClasses = classes.trim().split( ' ' );
			classes = '';
			this.staticClasses = [];

			staticClassRegex = new RegExp( this.optionSettings.ignoredClasses, 'i' );
			for ( i = 0; i < currentClasses.length; i++ ) {
				if ( staticClassRegex.test( currentClasses[ i ] ) ) {
					this.staticClasses.push( currentClasses[ i ] );
				} else {
					classes += 0 === classes.length ? '' : ' ';
					classes += currentClasses[ i ];
				}
			}
		}

		return classes;
	},

	change: function( element, value ) {
		var i, currentClasses, newClasses;
		value = value.toLowerCase();

		// Remove all class names.
		if ( 'undefined' !== typeof element.attr( 'class' ) ) {
			currentClasses = element.attr( 'class' ).split( ' ' );
			for ( i = 0; i < currentClasses.length; i++ ) {
				element.removeCSSClass( currentClasses[ i ] );
			}
		}

		// Add the new class names.
		if ( '' !== value.trim() ) {
			newClasses = value.trim().split( ' ' );
			for ( i = 0; i < newClasses.length; i++ ) {
				element.addCSSClass( newClasses[ i ] );
			}
		}

		// If there are regex matched class names, add them again.
		if ( this.staticClasses.length ) {
			for ( i = 0; i < this.staticClasses.length; i++ ) {
				element.addCSSClass( this.staticClasses[ i ] );
			}
		}

		element.taint();
	},

	initialize: function( options ) {
		this.optionSettings = _.clone( options.optionSettings );
		this.staticClasses = [];

		if ( this.optionSettings.initialize ) {
			this.optionSettings.initialize( this.model.get( 'element' ), this );
		}

		this.listenTo( this.model, 'change', this.render );
		this.model.set( this.optionSettings.id, this.getClasses( this.model.get( 'element' ) ) );
	},

	render: function() {
		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		data.value = this.getClasses( this.model.get( 'element' ) );
		this.$el.html( this.template( data ) );
		return this;
	},

	selectChanged: function( e ) {
		this.change( this.model.get( 'element' ), e.target.value );
		this.model.set( this.optionSettings.id, e.target.value );
	}
} );

PBSOption.CustomID = Backbone.View.extend( {
	template: wp.template( 'pbs-option-text' ),

	events: {
		'change input': 'selectChanged',
		'keyup input': 'selectChanged'
	},

	getID: function() {
		var element = this.model.get( 'element' );
		if ( 'undefined' === typeof element.attr( 'id' ) ) {
			return '';
		}

		return element.attr( 'id' );
	},

	change: function( element, value ) {
		element.attr( 'id', value );
		element.taint();
	},

	initialize: function( options ) {
		this.optionSettings = _.clone( options.optionSettings );
		this.staticClasses = [];

		if ( this.optionSettings.initialize ) {
			this.optionSettings.initialize( this.model.get( 'element' ), this );
		}

		this.listenTo( this.model, 'change', this.render );
		this.model.set( this.optionSettings.id, this.getID( this.model.get( 'element' ) ) );
	},

	render: function() {
		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		data.value = this.getID( this.model.get( 'element' ) );
		this.$el.html( this.template( data ) );
		return this;
	},

	selectChanged: function( e ) {
		this.change( this.model.get( 'element' ), e.target.value );
		this.model.set( this.optionSettings.id, e.target.value );
	}
} );

// STANDARD-PRO-ONLY-START
if ( ! pbsParams.is_lite ) {
	PBSOption.Iframe = PBSBaseView.extend( {
		template: wp.template( 'pbs-option-iframe' ),

		events: {
			'click input[type="button"]': 'click'
		},

		initialize: function( options ) {

			PBSBaseView.prototype.initialize.call( this, options );

			this.listenTo( this.model, 'change', this.render );
			if ( this.optionSettings.value ) {
				this.model.set( this.optionSettings.id, this.optionSettings.value( this.model.get( 'element' ) ) );
			}
		},

		render: function() {
			var i, activateButton, attributesToListenTo, value, attr;
			var data = _.extend( {}, this.model.attributes, this.optionSettings );
			data.value = '';

			if ( this.optionSettings.value ) {
				data.value = this.optionSettings.value( this.model.get( 'element' ) );
			} else if ( this.optionSettings.id ) {
				data.value = this.model.get( this.optionSettings.id );
			}

			// Add the template if it doesn't exist yet.
			if ( ! this.$el.html() ) {
				this.$el.html( this.template( data ) );
			}

			// Get the attributes which are included in the url.
			attributesToListenTo = this.optionSettings.url.match( /\{([^\}]+)\}/g );

			// Check each attribute that exists in the url. If there's a blank one, then
			// our button should be disabled.
			activateButton = true;
			if ( null !== attributesToListenTo ) {
				for ( i = 0; i < attributesToListenTo.length; i++ ) {
					value = '';
					attr = attributesToListenTo[ i ].replace( /[\{\}]/g, '' );
					if ( 'admin_url' === attr ) {
						continue;
					}
					if ( 'undefined' !== typeof this.model.attributes[ attr ] ) {
						value = this.model.attributes[ attr ];
					}
					if ( ! value ) {
						activateButton = false;
						break;
					}
				}
			}

			// Enabled / disable the button. It should be disabled if there is
			// a blank attribute from the required ones in the url.
			if ( this.el.querySelector( 'input[type="button"]' ) ) {
				if ( activateButton ) {
					this.el.querySelector( 'input[type="button"]' ).disabled = false;
				} else {
					this.el.querySelector( 'input[type="button"]' ).disabled = true;
				}
			}

			return this;
		},

		click: function( e ) {

			var i, r, url, attributes, attr;

			if ( this.optionSettings.click ) {
				this.optionSettings.click( this.model.get( 'element' ), e.target.value );
			}

			if ( 'undefined' !== typeof window.PBSEditor.adminFrame ) {

				// Generate the URL based on the formatted string.
				// This may include attributes which are used in the shortcode.
				url = this.optionSettings.url;
				attributes = this.optionSettings.url.match( /\{([^\}]+)\}/g );
				if ( attributes ) {
					for ( i = 0; i < attributes.length; i++ ) {
						attr = attributes[ i ].replace( /[\{\}]/g, '' );
						if ( 'admin_url' === attr ) {
							url = url.replace( /\{admin_url\}/g, pbsParams.admin_url );
						} else if ( 'undefined' !== typeof this.model.attributes[ attr ] ) {
							r = new RegExp( '\\{' + attr + '\\}', 'g' );
							url = url.replace( r, this.model.attributes[ attr ] );
						}
					}
				}

				// Open the iframe modal.
				window.PBSEditor.adminFrame.open( {
					url: url,
					title: this.optionSettings.name,
					openCallback: 'undefined' !== typeof this.optionSettings.openCallback ? this.optionSettings.openCallback : function() {},

					// Upon closing, update the shortcode.
					closeCallback: function() {
						if ( this.model.element ) {
							if ( 'Shortcode' === this.model.element.constructor.name ) {
								this.model.element.ajaxUpdate( true );
							}
						}
					}.bind( this )
				} );

			}

		}
	} );
}

// STANDARD-PRO-ONLY-END

PBSOption.Button2 = PBSBaseView.extend( {
	template: wp.template( 'pbs-option-button2' ),

	events: {
		'click input[type="button"]': 'click'
	},

	render: function() {

		var data;

		// Add the template if it doesn't exist yet.
		if ( ! this.$el.html() ) {
			data = _.extend( {}, this.model.attributes, this.optionSettings );
			this.$el.html( this.template( data ) );
		}

		if ( this.optionSettings.disabled ) {
			if ( ! this.optionSettings.disabled( this.model.get( 'element' ), this ) ) {
				this.$el.find( '[type="button"]' ).attr( 'disabled', 'disabled' );
			} else {
				this.$el.find( '[type="button"]' ).removeAttr( 'disabled' );
			}
		}

		return this;
	},

	click: function( e ) {
		if ( this.optionSettings.click ) {
			this.optionSettings.click( this.model.get( 'element' ), e.target.value, this );
		}
	}
} );

PBSOption.Note = PBSBaseView.extend( {
	template: wp.template( 'pbs-option-note' ),

	render: function() {

		var data;

		// Add the template if it doesn't exist yet.
		if ( ! this.$el.html() ) {
			data = _.extend( {}, this.model.attributes, this.optionSettings );
			this.$el.html( this.template( data ) );
		}

		return this;
	}
} );

/* globals PBSOption, PBSBaseView */

PBSOption.Dummy = PBSBaseView.extend( {
	dummy: true,
	template: wp.template( 'pbs-dummy-option-text' ),
	render: function() {
		var data = _.extend( {}, this.model.attributes, this.optionSettings );
		if ( ! this.$el.html() ) {
			this.$el.html( this.template( data ) );
		}
		return this;
	}
} );
PBSOption.TextDummy = PBSOption.Dummy.extend( {
	template: wp.template( 'pbs-dummy-option-text' )
} );
PBSOption.NumberDummy = PBSOption.Dummy.extend( {
	template: wp.template( 'pbs-dummy-option-number' )
} );
PBSOption.ColorDummy = PBSOption.Dummy.extend( {
	template: wp.template( 'pbs-dummy-option-color' )
} );
PBSOption.SelectDummy = PBSOption.Dummy.extend( {
	template: wp.template( 'pbs-dummy-option-select' )
} );
PBSOption.CheckboxDummy = PBSOption.Dummy.extend( {
	template: wp.template( 'pbs-dummy-option-checkbox' )
} );
PBSOption.Button2Dummy = PBSOption.Dummy.extend( {
	template: wp.template( 'pbs-dummy-option-button2' )
} );
PBSOption.ImageDummy = PBSOption.Dummy.extend( {
	template: wp.template( 'pbs-dummy-option-image' )
} );
PBSOption.TextareaDummy = PBSOption.Dummy.extend( {
	template: wp.template( 'pbs-dummy-option-textarea' )
} );
PBSOption.FileDummy = PBSOption.Dummy.extend( {
	template: wp.template( 'pbs-dummy-option-file' )
} );

/* globals pbsParams */

var options = [];

options.push(
	{
		'name': pbsParams.labels.edit_image,
		'button': pbsParams.labels.open_media_manager,
		'type': 'button2',
		'class': 'primary',
		'group': pbsParams.labels.general,
		'click': function( element ) {
			element.openMediaManager( function() {
				wp.hooks.doAction( 'pbs.option.changed' );
			} );
		}
	},
	{
		'value': function( element ) {
			return {
				url: element.a ? ( element.a.href || '' ) : '',
				target: element.a ? ( element.a.target || '' ) : ''
			};
		},
		'change': function( element, url, target ) {
			if ( ! element.a ) {
				element.a = {};
			}
			element.a.href = url;
			element.a.target = target ? '_blank' : '';
		},
		'name': pbsParams.labels.link,
		'type': 'link',
		'placeholder': 'http://',
		'group': pbsParams.labels.general
	},
	{
		'options': {
			'alignleft': pbsParams.labels.left,
			'aligncenter': pbsParams.labels.none_centered,
			'alignright': pbsParams.labels.right
		},
		'value': function( element ) {
			if ( element._domElement.classList.contains( 'alignleft' ) ) {
				return 'alignleft';
			} else if ( element._domElement.classList.contains( 'alignright' ) ) {
				return 'alignright';
			}
			return 'aligncenter';
		},
		'change': function( element, value ) {
			element.removeCSSClass( 'alignleft' );
			element.removeCSSClass( 'alignright' );
			element.removeCSSClass( 'aligncenter' );
			element.removeCSSClass( 'alignnone' );
			element.addCSSClass( value );
		},
		'name': pbsParams.labels.float, // jshint ignore:line
		'type': 'select'
	},
	{
		'name': pbsParams.labels.border_radius,
		'type': 'number',
		'step': '1',
		'min': '0',
		'max': '1000',
		'maxFunction': function( element ) {
			return parseInt( parseInt( element._domElement.getBoundingClientRect().height, 10 ) / 2 + 1, 10 );
		},
		'value': function( element ) {
			var size = parseInt( element._domElement.style['border-radius'], 10 );
			if ( isNaN( size ) ) {
				return 0;
			}
			return size;
		},
		'change': function( element, value ) {
			element.style( 'border-radius', value + 'px' );
		}
	},
	{

		// STANDARD-PRO-ONLY-START
		'options': {
			'': pbsParams.labels.none,
			'pbs-shadow-simple-1': pbsParams.labels.simple_shadow_small,
			'pbs-shadow-simple-2': pbsParams.labels.simple_shadow_normal,
			'pbs-shadow-simple-3': pbsParams.labels.simple_shadow_medium,
			'pbs-shadow-simple-4': pbsParams.labels.simple_shadow_large,
			'pbs-shadow-simple-5': pbsParams.labels.simple_shadow_huge
		},
		'value': function( element ) {
			var match;
			var classes = element._domElement.getAttribute( 'class' );
			if ( ! classes ) {
				return '';
			}
			match = classes.match( /pbs-shadow-[-\w\d]+/ );
			if ( ! match ) {
				return '';
			}
			match = match[0];
			match = match.match( /(^.*)-(\d+$)/ );
			if ( ! match ) {
				return '';
			}
			return match[1];
		},
		'change': function( element, value ) {
			var classes = element._domElement.getAttribute( 'class' );
			var match, strength = 3;
			if ( classes ) {
				match = classes.match( /pbs-shadow-[-\w\d]+/ );
				if ( match ) {
					match = match[0];
					element.removeCSSClass( match );

					match = match.match( /(^.*)-(\d+$)/ );
					if ( match ) {
						strength = match[2];
					}
				}
			}

			if ( value ) {
				element.addCSSClass( value + '-' + strength );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.shadows,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
		'group': pbsParams.labels.shadows
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': 1,
		'min': 1,
		'max': 3,
		'value': function( element ) {
			var match;
			var classes = element._domElement.getAttribute( 'class' );
			if ( ! classes ) {
				return 3;
			}
			match = classes.match( /pbs-shadow-[-\w\d]+/ );
			if ( ! match ) {
				return 3;
			}
			match = match[0];
			match = match.match( /(^.*)-(\d+$)/ );
			if ( ! match ) {
				return 3;
			}
			return match[2];
		},
		'change': function( element, value ) {
			var match;
			var classes = element._domElement.getAttribute( 'class' );
			if ( classes ) {
				match = classes.match( /pbs-shadow-[-\w\d]+/ );
				if ( match ) {
					match = match[0];
					element.removeCSSClass( match );

					match = match.match( /(^.*)-(\d+$)/ );
					if ( match ) {
						element.addCSSClass( match[1] + '-' + value );
					}
				}
			}
		},
		'visible': function( element ) {
			return -1 !== element._domElement.getAttribute( 'class' ).indexOf( 'pbs-shadow-' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.shadow_strength,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.shadows
	}
);

window.pbsAddInspector( 'Image', {
	'label': pbsParams.labels.image,
	'options': options
} );

/* globals pbsParams, PBSEditor */

/**
 * Inspector options for rows & columns.
 */

window.pbsAddInspector( 'input:not([type=button]):not([type=reset]):not([type=submit]),textarea', {
	'label': pbsParams.labels.input_field,
	'options': [
		{
			'name': pbsParams.labels.padding,
			'type': 'number',
			'desc': pbsParams.labels.desc_input_field_padding,
			'group': pbsParams.labels.general,
			'step': '0.01',
			'min': '0.0',
			'max': '3.0',
			'value': function( element ) {
				var val;
				var styles = window.getComputedStyle( element );
				if ( element.style.paddingTop.indexOf( 'em' ) === -1 && styles.paddingTop.indexOf( 'px' ) !== -1 ) {
					val = parseInt( styles.paddingTop, 10 ) / parseInt( styles.fontSize, 10 );
					return val.toFixed( 2 );
				}
				if ( isNaN( parseFloat( element.style.paddingTop ) ) ) {
					return '0.0';
				}
				return parseFloat( element.style.paddingTop ).toFixed( 2 ) || '0.0';
			},
			'change': function( element, value ) {
				element.style.paddingTop = value + 'em';
				element.style.paddingBottom = value + 'em';
				element.style.paddingLeft = ( value * 1.6 ).toFixed( 2 ) + 'em';
				element.style.paddingRight = ( value * 1.6 ).toFixed( 2 ) + 'em';

			}
		},
		{
			'name': pbsParams.labels.text_alignment,
			'type': 'select',
			'group': pbsParams.labels.general,
			'options': {
				'left': pbsParams.labels.left,
				'center': pbsParams.labels.center,
				'right': pbsParams.labels.right
			},
			'value': function( element ) {
				return element.style['text-align'] || 'left';
			},
			'change': function( element, value ) {
				element.style['text-align'] = value;
				element.parentNode._ceElement._syncContent();
				element.parentNode._ceElement.taint();
			}
		},

		{
			'name': pbsParams.labels.background_color,
			'type': 'color',
			'group': pbsParams.labels.colors,
			'value': function( element ) {
				return element.style.backgroundColor;
			},
			'change': function( element, value ) {
				element.style.backgroundColor = value;
			}
		},
		{
			'name': pbsParams.labels.text_color,
			'type': 'color',
			'group': pbsParams.labels.colors,
			'value': function( element ) {
				return element.style.color;
			},
			'change': function( element, value ) {
				element.style.color = value;
			}
		},
		{
			'name': pbsParams.labels.placeholder_color,
			'type': 'color',
			'group': pbsParams.labels.colors,
			'value': function( element ) {
				var guid = PBSEditor.getUniqueClassName( element );
				if ( ! guid ) {
					return false;
				}

				return window.PBSEditor.getPseudoElementStyles( '.' + guid + '::-webkit-input-placeholder', 'color' );
			},
			'change': function( element, value ) {
				var guid = PBSEditor.getUniqueClassName( element );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					element.classList.add( guid );
				}

				window.PBSEditor.addPseudoElementStyles( '.' + guid + '::-webkit-input-placeholder', { 'color': value } );
				window.PBSEditor.addPseudoElementStyles( '.' + guid + ':-moz-placeholder', { 'color': value } );
				window.PBSEditor.addPseudoElementStyles( '.' + guid + '::-moz-placeholder', { 'color': value } );
				return window.PBSEditor.addPseudoElementStyles( '.' + guid + ':-ms-input-placeholder', { 'color': value } );
			}
		},
		{
			'name': pbsParams.labels.background_color_focused,
			'type': 'color',
			'group': pbsParams.labels.colors,
			'value': function( element ) {
				var value;
				var guid = PBSEditor.getUniqueClassName( element );
				if ( ! guid ) {
					return false;
				}

				value = window.PBSEditor.getPseudoElementStyles( '.' + guid + ':hover', 'background-color' );
				if ( value ) {
					value = value.replace( /\s*\!important\s*$/, '' );
				}
				return value;
			},
			'change': function( element, value ) {
				var guid = PBSEditor.getUniqueClassName( element );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					element.classList.add( guid );
				}

				if ( value ) {
					value += ' !important';
				}

				window.PBSEditor.addPseudoElementStyles( '.' + guid + ':hover', { 'background-color': value } );
				return window.PBSEditor.addPseudoElementStyles( '.' + guid + ':focus', { 'background-color': value } );
			}
		},
		{
			'name': pbsParams.labels.text_color_focused,
			'type': 'color',
			'group': pbsParams.labels.colors,
			'value': function( element ) {
				var value;
				var guid = PBSEditor.getUniqueClassName( element );
				if ( ! guid ) {
					return false;
				}

				value = window.PBSEditor.getPseudoElementStyles( '.' + guid + ':focus', 'color' );
				if ( value ) {
					value = value.replace( /\s*\!important\s*$/, '' );
				}
				return value;
			},
			'change': function( element, value ) {
				var guid = PBSEditor.getUniqueClassName( element );
				if ( ! guid ) {
					return false;
				}

				if ( value ) {
					value += ' !important';
				}

				window.PBSEditor.addPseudoElementStyles( '.' + guid + ':hover', { 'color': value } );
				return window.PBSEditor.addPseudoElementStyles( '.' + guid + ':focus', { 'color': value } );
			}
		},
		{
			'name': pbsParams.labels.placeholder_color_focused,
			'type': 'color',
			'group': pbsParams.labels.colors,
			'value': function( element ) {
				var guid = PBSEditor.getUniqueClassName( element );
				if ( ! guid ) {
					return false;
				}

				return window.PBSEditor.getPseudoElementStyles( '.' + guid + ':focus::-webkit-input-placeholder', 'color' );
			},
			'change': function( element, value ) {
				var guid = PBSEditor.getUniqueClassName( element );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					element.classList.add( guid );
				}

				window.PBSEditor.addPseudoElementStyles( '.' + guid + ':hover::-webkit-input-placeholder', { 'color': value } );
				window.PBSEditor.addPseudoElementStyles( '.' + guid + ':hover:-moz-placeholder', { 'color': value } );
				window.PBSEditor.addPseudoElementStyles( '.' + guid + ':hover::-moz-placeholder', { 'color': value } );
				window.PBSEditor.addPseudoElementStyles( '.' + guid + ':hover:-ms-input-placeholder', { 'color': value } );

				window.PBSEditor.addPseudoElementStyles( '.' + guid + ':focus::-webkit-input-placeholder', { 'color': value } );
				window.PBSEditor.addPseudoElementStyles( '.' + guid + ':focus:-moz-placeholder', { 'color': value } );
				window.PBSEditor.addPseudoElementStyles( '.' + guid + ':focus::-moz-placeholder', { 'color': value } );
				return window.PBSEditor.addPseudoElementStyles( '.' + guid + ':focus:-ms-input-placeholder', { 'color': value } );
			}
		},

		{
			'name': pbsParams.labels.border,
			'type': 'select',
			'group': pbsParams.labels.borders,
			'options': {
				'all': pbsParams.labels.all,
				'none': pbsParams.labels.none,
				'top': pbsParams.labels.top,
				'bottom': pbsParams.labels.bottom,
				'left': pbsParams.labels.left,
				'right': pbsParams.labels.right,
				'top-bottom': pbsParams.labels.top_and_bottom,
				'left-right': pbsParams.labels.left_and_right
			},
			'value': function( element ) {
				var values = this.getBorderValues( element );
				var top = values.top, right = values.right, bottom = values.bottom, left = values.left;
				if ( 'solid' === top && 'solid' === right && 'solid' === bottom && 'solid' === left ) {
					return 'all';
				} else if ( 'solid' === top && 'solid' === bottom ) {
					return 'top-bottom';
				} else if ( 'solid' === left && 'solid' === right ) {
					return 'left-right';
				} else if ( 'solid' === top ) {
					return 'top';
				} else if ( 'solid' === right ) {
					return 'right';
				} else if ( 'solid' === bottom ) {
					return 'bottom';
				} else if ( 'solid' === left ) {
					return 'left';
				} else {
					return 'none';
				}
			},
			'change': function( element, value ) {
				element.style['border-top-style'] = [ 'all', 'top', 'top-bottom' ].indexOf( value ) !== -1 ? 'solid' : 'none';
				element.style['border-right-style'] = [ 'all', 'right', 'left-right' ].indexOf( value ) !== -1 ? 'solid' : 'none';
				element.style['border-bottom-style'] = [ 'all', 'bottom', 'top-bottom' ].indexOf( value ) !== -1 ? 'solid' : 'none';
				element.style['border-left-style'] = [ 'all', 'left', 'left-right' ].indexOf( value ) !== -1 ? 'solid' : 'none';
				element.parentNode._ceElement._syncContent();
				element.parentNode._ceElement.taint();
			},
			'getBorderValues': function( element ) {
				var top = element.style['border-top-style'];
				var right = element.style['border-right-style'];
				var bottom = element.style['border-bottom-style'];
				var left = element.style['border-left-style'];

				var currentValues;
				if ( 'undefined' === typeof top || 'undefined' === typeof right || 'undefined' === typeof bottom || 'undefined' === typeof left || ! top || ! right || ! bottom || ! left ) {
					currentValues = window.getComputedStyle( element );
				}

				if ( 'undefined' === typeof top || ! top ) {
					top = currentValues['border-top-style'];
				}
				if ( 'undefined' === typeof right || ! right ) {
					right = currentValues['border-right-style'];
				}
				if ( 'undefined' === typeof bottom || ! bottom ) {
					bottom = currentValues['border-bottom-style'];
				}
				if ( 'undefined' === typeof left || ! left ) {
					left = currentValues['border-left-style'];
				}
				return {
					top: top,
					right: right,
					bottom: bottom,
					left: left
				};
			}
		},
		{
			'name': pbsParams.labels.border_color,
			'type': 'color',
			'group': pbsParams.labels.borders,
			'value': function( element ) {
				return element.style.borderColor || '';
			},
			'change': function( element, value ) {
				element.style.borderColor = value;
			}
		},
		{
			'name': pbsParams.labels.border_thickness,
			'type': 'number',
			'group': pbsParams.labels.borders,
			'step': '1',
			'min': '0',
			'max': '20',
			'value': function( element ) {
				var size = parseInt( element.style['border-width'], 10 );
				if ( isNaN( size ) ) {
					return '1';
				}
				return size;
			},
			'change': function( element, value ) {
				element.style['border-width'] = value ? value + 'px' : '';
			}
		},
		{
			'name': pbsParams.labels.border_radius,
			'type': 'number',
			'group': pbsParams.labels.borders,
			'step': '1',
			'min': '0',
			'max': '1000',
			'maxFunction': function( element ) {
				return parseInt( parseInt( element.getBoundingClientRect().height, 10 ) / 2 + 1, 10 );
			},
			'value': function( element ) {
				var size = parseInt( element.style['border-radius'], 10 );
				if ( isNaN( size ) ) {
					return 0;
				}
				return size;
			},
			'change': function( element, value ) {
				element.style['border-radius'] = value ? value + 'px' : '';
			}
		}
	]
} );

/* globals PBSEditor, pbsParams */

var options = [];

options.push(
	{
		'name': pbsParams.labels.icon_frame_change_title,
		'button': pbsParams.labels.pick_an_icon,
		'type': 'button2',
		'class': 'primary',
		'group': pbsParams.labels.general,
		'click': function( element ) {
			PBSEditor.iconFrame.open( {
				title: pbsParams.labels.choose_icon,
				button: pbsParams.labels.choose_icon,
				successCallback: function( frameView ) {
					element.change( frameView.selected.firstChild );
				}
			} );
		}
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return element.getLink();
		},
		'change': function( element, url, target ) {
			element.setLink( url, target );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.link,
		'type': ! pbsParams.is_lite ? 'link' : 'textDummy',
		'placeholder': 'http://',
		'desc': pbsParams.labels.desc_icon_url,
		'group': pbsParams.labels.general
	},
	{
		'name': pbsParams.labels.icon_color,
		'type': 'color',
		'group': pbsParams.labels.general,
		'value': function( element ) {
			return element._domElement.style.fill;
		},
		'change': function( element, value ) {
			element.removeFills();
			element.setFill( value );
		}
	}
);

options.push(
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return element._domElement.style.backgroundColor;
		},
		'change': function( element, value ) {
			element.style( 'background-color', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.background_color,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': '1',
		'min': '0',
		'max': '300',
		'maxFunction': function( element ) {
			return parseInt( parseInt( element._domElement.getBoundingClientRect().height, 10 ) / 2 + 1, 10 );
		},
		'value': function( element ) {
			return parseInt( element._domElement.style.paddingTop, 10 ) || '0';
		},
		'change': function( element, value ) {
			element.style( 'padding', value + 'px' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.padding,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.general,
		'unit': pbsParams.labels.px
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': '1',
		'min': '0',
		'max': '1000',
		'maxFunction': function( element ) {
			return parseInt( parseInt( element._domElement.getBoundingClientRect().height, 10 ) / 2 + 1, 10 );
		},
		'value': function( element ) {
			var size = parseInt( element._domElement.style['border-radius'], 10 );
			if ( isNaN( size ) ) {
				return 0;
			}
			return size;
		},
		'change': function( element, value ) {
			element.style( 'border-radius', value + 'px' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.border_radius,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.general,
		'unit': pbsParams.labels.px
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return element.attr( 'data-tooltip' );
		},
		'change': function( element, value ) {
			element.attr( 'data-tooltip', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.tooltip_text,
		'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
		'desc': pbsParams.labels.desc_icon_tooltip,
		'group': pbsParams.labels.tooltip
	},
	{

		// STANDARD-PRO-ONLY-START
		'options': {
			'right': pbsParams.labels.right,
			'left': pbsParams.labels.left,
			'top': pbsParams.labels.top,
			'bottom': pbsParams.labels.bottom
		},
		'value': function( element ) {
			var match;
			if ( ! element.attr( 'class' ) ) {
				return 'right';
			}
			match = element.attr( 'class' ).match( /pbs-icon-tooltip-(\w+)/ );
			if ( match ) {
				return match[1];
			}
			return 'right';
		},
		'change': function( element, value ) {
			element.removeCSSClass( 'pbs-icon-tooltip-top' );
			element.removeCSSClass( 'pbs-icon-tooltip-right' );
			element.removeCSSClass( 'pbs-icon-tooltip-bottom' );
			element.removeCSSClass( 'pbs-icon-tooltip-left' );
			element.addCSSClass( 'pbs-icon-tooltip-' + value );
		},
		'visible': function( element ) {
			return !! element._domElement.getAttribute( 'data-tooltip' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.tooltip_location,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
		'group': pbsParams.labels.tooltip
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			var selector;
			var guid = PBSEditor.getUniqueClassName( element._domElement );
			if ( ! guid ) {
				return '#222222';
			}

			selector = '.' + guid + ':after';
			return window.PBSEditor.getPseudoElementStyles( selector, 'background-color' );
		},
		'change': function( element, value ) {
			var selector, arrowSelector, styles;
			var guid = PBSEditor.getUniqueClassName( element._domElement );
			if ( ! guid ) {
				guid = PBSEditor.generateUniqueClassName();
				element.addCSSClass( guid );
			}

			selector = '.' + guid + ':after';
			value += ' !important';

			window.PBSEditor.addPseudoElementStyles( selector, { 'background-color': value } );

			if ( value ) {
				arrowSelector = '.' + guid + ':before';
				styles = {
					'border-right-color': value,
					'border-top-color': 'transparent !important',
					'border-bottom-color': 'transparent !important',
					'border-left-color': 'transparent !important'
				};
				window.PBSEditor.addPseudoElementStyles( arrowSelector, styles );

				arrowSelector = '.' + guid + '.pbs-icon-tooltip-left:before';
				styles = {
					'border-left-color': value,
					'border-top-color': 'transparent !important',
					'border-right-color': 'transparent !important',
					'border-bottom-color': 'transparent !important'
				};
				window.PBSEditor.addPseudoElementStyles( arrowSelector, styles );

				arrowSelector = '.' + guid + '.pbs-icon-tooltip-top:before';
				styles = {
					'border-top-color': value,
					'border-right-color': 'transparent !important',
					'border-bottom-color': 'transparent !important',
					'border-left-color': 'transparent !important'
				};
				window.PBSEditor.addPseudoElementStyles( arrowSelector, styles );

				arrowSelector = '.' + guid + '.pbs-icon-tooltip-bottom:before';
				styles = {
					'border-bottom-color': value,
					'border-top-color': 'transparent !important',
					'border-right-color': 'transparent !important',
					'border-left-color': 'transparent !important'
				};
				window.PBSEditor.addPseudoElementStyles( arrowSelector, styles );
			} else {

				styles = {
					'border-top-color': '',
					'border-right-color': '',
					'border-bottom-color': '',
					'border-left-color': ''
				};
				arrowSelector = '.' + guid + ':before';
				window.PBSEditor.addPseudoElementStyles( arrowSelector, styles );
				arrowSelector = '.' + guid + '.pbs-icon-tooltip-left:before';
				window.PBSEditor.addPseudoElementStyles( arrowSelector, styles );
				arrowSelector = '.' + guid + '.pbs-icon-tooltip-top:before';
				window.PBSEditor.addPseudoElementStyles( arrowSelector, styles );
				arrowSelector = '.' + guid + '.pbs-icon-tooltip-bottom:before';
				window.PBSEditor.addPseudoElementStyles( arrowSelector, styles );
			}

			element.taint();
		},
		'visible': function( element ) {
			return !! element._domElement.getAttribute( 'data-tooltip' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.background_color,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.tooltip
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			var selector;
			var guid = PBSEditor.getUniqueClassName( element._domElement );
			if ( ! guid ) {
				return '#ffffff';
			}

			selector = '.' + guid + ':after';
			return window.PBSEditor.getPseudoElementStyles( selector, 'color' );
		},
		'change': function( element, value ) {
			var selector;
			var guid = PBSEditor.getUniqueClassName( element._domElement );
			if ( ! guid ) {
				guid = PBSEditor.generateUniqueClassName();
				element.addCSSClass( guid );
			}

			selector = '.' + guid + ':after';
			value += ' !important';

			window.PBSEditor.addPseudoElementStyles( selector, { 'color': value } );
			element.taint();
		},
		'visible': function( element ) {
			return !! element._domElement.getAttribute( 'data-tooltip' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.text_color,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.tooltip
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			if ( ! element.attr( 'class' ) ) {
				return false;
			}
			return !! element.attr( 'class' ).match( /pbs-has-tooltip-shadow/ );
		},
		'change': function( element, value ) {
			if ( value ) {
				element.addCSSClass( 'pbs-has-tooltip-shadow' );
			} else {
				element.removeCSSClass( 'pbs-has-tooltip-shadow' );
			}
		},
		'visible': function( element ) {
			return !! element._domElement.getAttribute( 'data-tooltip' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.toggle_shadow,
		'type': ! pbsParams.is_lite ? 'checkbox' : 'checkboxDummy',
		'group': pbsParams.labels.tooltip
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': '1',
		'min': '50',
		'max': '500',
		'value': function( element ) {
			var selector;
			var guid = PBSEditor.getUniqueClassName( element._domElement );
			if ( ! guid ) {
				return '150px';
			}

			selector = '.' + guid + ':after';
			return window.PBSEditor.getPseudoElementStyles( selector, 'width' ) || '150';
		},
		'change': function( element, value ) {
			var selector;
			var guid = PBSEditor.getUniqueClassName( element._domElement );
			if ( ! guid ) {
				guid = PBSEditor.generateUniqueClassName();
				element.addCSSClass( guid );
			}

			selector = '.' + guid + ':after';
			if ( '' !== value ) {
				value += 'px !important';
			}

			window.PBSEditor.addPseudoElementStyles( selector, { 'width': value } );

			element.taint();
		},
		'visible': function( element ) {
			return !! element._domElement.getAttribute( 'data-tooltip' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.width,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.tooltip,
		'unit': pbsParams.labels.px
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': '1',
		'min': '0',
		'max': '100',
		'value': function( element ) {
			var selector;
			var guid = PBSEditor.getUniqueClassName( element._domElement );
			if ( ! guid ) {
				return '15px';
			}

			selector = '.' + guid + ':after';
			return window.PBSEditor.getPseudoElementStyles( selector, 'padding' ) || '15';
		},
		'change': function( element, value ) {
			var selector;
			var guid = PBSEditor.getUniqueClassName( element._domElement );
			if ( ! guid ) {
				guid = PBSEditor.generateUniqueClassName();
				element.addCSSClass( guid );
			}

			selector = '.' + guid + ':after';
			if ( '' !== value ) {
				value += 'px !important';
			}

			window.PBSEditor.addPseudoElementStyles( selector, { 'padding': value } );

			element.taint();
		},
		'visible': function( element ) {
			return !! element._domElement.getAttribute( 'data-tooltip' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.padding,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.tooltip,
		'unit': pbsParams.labels.px
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': '1',
		'min': '0',
		'max': '50',
		'value': function( element ) {
			var selector;
			var guid = PBSEditor.getUniqueClassName( element._domElement );
			if ( ! guid ) {
				return '0';
			}

			selector = '.' + guid + ':after';
			return window.PBSEditor.getPseudoElementStyles( selector, 'border-radius' ) || '0';
		},
		'change': function( element, value ) {
			var selector;
			var guid = PBSEditor.getUniqueClassName( element._domElement );
			if ( ! guid ) {
				guid = PBSEditor.generateUniqueClassName();
				element.addCSSClass( guid );
			}

			selector = '.' + guid + ':after';
			if ( '' !== value ) {
				value += 'px !important';
			}

			window.PBSEditor.addPseudoElementStyles( selector, { 'border-radius': value } );

			element.taint();
		},
		'visible': function( element ) {
			return !! element._domElement.getAttribute( 'data-tooltip' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.border_radius,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.tooltip,
		'unit': pbsParams.labels.px
	}
);

window.pbsAddInspector( 'Icon', {
	'label': pbsParams.labels.icon,
	'onMouseEnter': function( element ) {
		element._addCSSClass( 'ce-element--over' );
	},
	'onMouseLeave': function( element ) {
		element._removeCSSClass( 'ce-element--over' );
	},
	'options': options
} );

/* globals pbsParams */

window.pbsAddInspector( 'pbs_widget', {
	'is_shortcode': true,
	'label': pbsParams.labels.widget,
	'desc': pbsParams.labels.widget_inspector_desc,
	'options': [
		{
			'type': 'widgetSettings'
		}
	]
} );

/* globals pbsParams */

window.pbsAddInspector( 'pbs_sidebar', {
	'is_shortcode': true,
	'label': pbsParams.labels.sidebar,
	'desc': pbsParams.labels.sidebar_inspector_desc,
	'options': [
		{
			'type': 'select',
			'name': pbsParams.labels.select_a_sidebar,
			'id': 'id',
			'options': pbsParams.sidebar_list,
			'desc': pbsParams.sidebar_label_id
		}
	]
} );

/* globals pbsParams */

var options = [];
options.push(
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-date' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-date', value );
			window.pbsInitCountdown( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'placeholder': 'YYYY/MM/DD HH:MM:SS',
		'name': pbsParams.labels.countdown_to_date,
		'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
		'desc': pbsParams.labels.desc_countdown_to_date,
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-size' ) || '3';
		},
		'change': function( element, value ) {
			element.attr( 'data-size', value );
		},

		// STANDARD-PRO-ONLY-END
		'min': 1,
		'max': 4,
		'step': 1,
		'name': pbsParams.labels.display_size,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-date-display' ) || 'DAYS,HOURS,MINUTES,SECONDS';
		},
		'change': function( element, value ) {
			element.attr( 'data-date-display', value );
			window.pbsInitCountdown( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'options': {
			'YEARS': pbsParams.labels.years,
			'MONTHS': pbsParams.labels.months,
			'WEEKS': pbsParams.labels.weeks,
			'DAYS': pbsParams.labels.days,
			'HOURS': pbsParams.labels.hours,
			'MINUTES': pbsParams.labels.minutes,
			'SECONDS': pbsParams.labels.seconds
		},
		'name': pbsParams.labels.display_these_dates,
		'type': ! pbsParams.is_lite ? 'multicheck' : 'checkboxDummy',
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			var value = element._domElement.getAttribute( 'data-date-display' ) || 'DAYS,HOURS,MINUTES,SECONDS';
			return value.indexOf( 'YEARS' ) !== -1;
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-label-years' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-label-years', value );
			window.pbsInitCountdown( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'placeholder': pbsParams.labels.years,
		'name': pbsParams.labels.years_label,
		'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			var value = element._domElement.getAttribute( 'data-date-display' ) || 'DAYS,HOURS,MINUTES,SECONDS';
			return value.indexOf( 'MONTHS' ) !== -1;
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-label-months' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-label-months', value );
			window.pbsInitCountdown( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'placeholder': pbsParams.labels.months,
		'name': pbsParams.labels.months_label,
		'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			var value = element._domElement.getAttribute( 'data-date-display' ) || 'DAYS,HOURS,MINUTES,SECONDS';
			return value.indexOf( 'WEEKS' ) !== -1;
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-label-weeks' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-label-weeks', value );
			window.pbsInitCountdown( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'placeholder': pbsParams.labels.weeks,
		'name': pbsParams.labels.weeks_label,
		'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			var value = element._domElement.getAttribute( 'data-date-display' ) || 'DAYS,HOURS,MINUTES,SECONDS';
			return value.indexOf( 'DAYS' ) !== -1;
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-label-days' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-label-days', value );
			window.pbsInitCountdown( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'placeholder': pbsParams.labels.days,
		'name': pbsParams.labels.days_label,
		'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			var value = element._domElement.getAttribute( 'data-date-display' ) || 'DAYS,HOURS,MINUTES,SECONDS';
			return value.indexOf( 'HOURS' ) !== -1;
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-label-hours' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-label-hours', value );
			window.pbsInitCountdown( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'placeholder': pbsParams.labels.hours,
		'name': pbsParams.labels.hours_label,
		'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			var value = element._domElement.getAttribute( 'data-date-display' ) || 'DAYS,HOURS,MINUTES,SECONDS';
			return value.indexOf( 'MINUTES' ) !== -1;
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-label-minutes' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-label-minutes', value );
			window.pbsInitCountdown( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'placeholder': pbsParams.labels.minutes,
		'name': pbsParams.labels.minutes_label,
		'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			var value = element._domElement.getAttribute( 'data-date-display' ) || 'DAYS,HOURS,MINUTES,SECONDS';
			return value.indexOf( 'SECONDS' ) !== -1;
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-label-seconds' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-label-seconds', value );
			window.pbsInitCountdown( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'placeholder': pbsParams.labels.seconds,
		'name': pbsParams.labels.seconds_label,
		'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
		'group': pbsParams.labels.general
	}
);

window.pbsAddInspector( 'Countdown', {
	'label': pbsParams.labels.countdown,
	'options': options
} );

/* globals pbsParams, PBSEditor */

window.pbsAddInspector( 'Button', {
	'label': pbsParams.labels.button,
	'options': [
		{
			'value': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return {
					url: button.getAttribute( 'href' ) || '',
					target: button.getAttribute( 'target' )
				};
			},
			'change': function( element, url, target ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				button.setAttribute( 'href', url );
				if ( target ) {
					button.setAttribute( 'target', '_blank' );
				} else {
					button.removeAttribute( 'target' );
				}
				element._syncContent();
				element.taint();
			},
			'name': pbsParams.labels.link,
			'class': 'primary button-link',
			'type': 'link',
			'placeholder': 'http://',
			'group': pbsParams.labels.general_and_style
		},
		{
			'name': pbsParams.labels.ghost_button_style,
			'id': 'ghost_button',
			'type': 'checkbox',
			'group': pbsParams.labels.general_and_style,
			'value': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return button.classList.contains( 'pbs-button-ghost' );
			},
			'change': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				button.classList.toggle( 'pbs-button-ghost' );
				element._syncContent();
				element.taint();
			}
		},
		{
			'name': pbsParams.labels.full_width,
			'type': 'checkbox',
			'group': pbsParams.labels.general_and_style,
			'value': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return 'block' === button.style.display;
			},
			'change': function( element, value ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				button.style.display = value ? 'block' : '';
				element._syncContent();
				element.taint();
			}
		},
		{
			'name': pbsParams.labels.button_padding,
			'id': 'button_padding',
			'type': 'number',
			'group': pbsParams.labels.general_and_style,
			'step': '0.01',
			'min': '0.0',
			'max': '3.0',
			'unit': pbsParams.labels.px,
			'value': function( element ) {
				var val;
				var button = element._domElement.querySelector( '.pbs-button' );
				var styles = window.pbsGetComputedStyle( button );
				if ( button.style.paddingTop.indexOf( 'em' ) === -1 && button.style.paddingTop.indexOf( 'px' ) !== -1 ) {
					val = parseInt( styles.paddingTop, 10 ) / parseInt( styles.fontSize, 10 );
					return val.toFixed( 2 );
				}
				if ( isNaN( parseFloat( button.style.paddingTop ) ) ) {
					return '0.0';
				}
				return parseFloat( button.style.paddingTop ).toFixed( 2 ) || '0.0';
			},
			'change': function( element, value, view ) {
				var button = element._domElement.querySelector( '.pbs-button' );

				if ( 0.0 === parseFloat( value ) ) {
					button.style.paddingTop = '';
					button.style.paddingBottom = '';
					button.style.paddingLeft = '';
					button.style.paddingRight = '';
				} else {
					button.style.paddingTop = value + 'em';
					button.style.paddingBottom = value + 'em';
					button.style.paddingLeft = ( value * 1.6 ).toFixed( 2 ) + 'em';
					button.style.paddingRight = ( value * 1.6 ).toFixed( 2 ) + 'em';
				}

				// Make the changes stick.
				element._syncContent();
				element.taint();

				// Adjust the border radius max value because it's dependent on the size of the button.
				setTimeout( function() {
					var button = element._domElement.querySelector( '.pbs-button' );
					var styles = button.getBoundingClientRect();
					var max = parseInt( parseInt( styles.height, 10 ) / 2 + 1, 10 );

					view.$el.parent().find( '.pbs-button-border-radius-slider .pbs-option-number-slider' ).slider( 'option', 'max', max );
				}, 350 );
			}
		},
		{
			'name': pbsParams.labels.border_radius,
			'type': 'number',
			'class': 'pbs-button-border-radius-slider',
			'group': pbsParams.labels.general_and_style,
			'step': '1',
			'min': '0',
			'max': '20',
			'unit': pbsParams.labels.px,
			'maxFunction': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				var styles = window.pbsGetBoundingClientRect( button );
				return parseInt( parseInt( styles.height, 10 ) / 2 + 1, 10 );
			},
			'value': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				if ( isNaN( parseInt( button.style.borderRadius, 10 ) ) ) {
					return '0';
				}
				return parseInt( button.style.borderRadius, 10 ) || '0';
			},
			'change': function( element, value ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				button.style.borderRadius = value + 'px';

				element._syncContent();
				element.taint();
			}
		},
		{
			'name': pbsParams.labels.button_color,
			'type': 'color',
			'group': pbsParams.labels.general_and_style,
			'value': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return button.style.backgroundColor || '';
			},
			'change': function( element, value ) {
				var button = element._domElement.querySelector( '.pbs-button' );

				button.style.backgroundColor = value;
				button.style.borderColor = value;

				element._syncContent();
				element.taint();
			}
		},
		{
			'name': pbsParams.labels.button_text_color,
			'type': 'color',
			'group': pbsParams.labels.general_and_style,
			'value': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return button.style.color || '';
			},
			'change': function( element, value ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				button.style.color = value;

				element._syncContent();
				element.taint();
			}
		},
		{
			'name': pbsParams.labels.icon,
			'id': 'button_icon',
			'button': pbsParams.labels.pick_an_icon,
			'type': 'button2',
			'group': pbsParams.labels.icon,
			'click': function( element, value, view ) {
				var selector;
				var button = element._domElement.querySelector( '.pbs-button' );
				var guid = PBSEditor.getUniqueClassName( button );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					button.classList.add( guid );
				}
				selector = '.' + guid + ':before';

				if ( window.PBSEditor.isCtrlDown && window.PBSEditor.isShiftDown ) {
					button.classList.remove( 'pbs-button-icon' );
					button.classList.remove( guid );

					window.PBSEditor.addPseudoElementStyles( selector, { 'width': '' } );
					window.PBSEditor.addPseudoElementStyles( selector, { 'height': '' } );

					view.model.set( 'pseudo', '' );
					button.parentNode._ceElement._syncContent();
					button.parentNode._ceElement.taint();
					return;
				}

				PBSEditor.iconFrame.open( {
					title: pbsParams.labels.choose_button_icon,
					button: pbsParams.labels.use_icon,
					successCallback: function( frameView ) {

						var defaultColor, currentSvg, currentFill;
						var backgroundImage = window.PBSEditor.convertSVGToBackgroundImage( frameView.selected.firstChild );

						button.classList.add( 'pbs-button-icon' );

						defaultColor = button.style.color || '#ffffff';
						defaultColor = defaultColor.replace( /#/g, '%23' );
						backgroundImage = backgroundImage.replace( /(%3Csvg|<svg)\s+(fill='[^']*'\s*)?/g, '$1 fill=\'' + defaultColor + '\' ' );

						currentSvg = window.PBSEditor.getPseudoElementStyles( selector, 'background-image' );
						if ( currentSvg ) {
							currentFill = currentSvg.match( /fill='([^']*)'/m );
							if ( currentFill ) {
								if ( currentFill[1] ) {
									backgroundImage = backgroundImage.replace( /(%3Csvg|<svg)\s+(fill='[^']*'\s*)?/g, '$1 fill=\'' + currentFill[1].replace( /#/g, '%23' ) + '\' ' );
								}
							}
						}
						window.PBSEditor.addPseudoElementStyles( selector, { 'background-image': backgroundImage } );

						view.model.set( 'pseudo', backgroundImage );
						element._syncContent();
						element.taint();

						wp.hooks.doAction( 'pbs.option.changed' );
					}
				} );
			}
		},
		{
			'name': pbsParams.labels.remove_icon,
			'id': 'remove_button_icon',
			'button': pbsParams.labels.remove_icon,
			'type': 'button2',
			'group': pbsParams.labels.icon,
			'click': function( element, value, view ) {
				var selector;
				var button = element._domElement.querySelector( '.pbs-button' );
				var guid = PBSEditor.getUniqueClassName( button );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					button.classList.add( guid );
				}
				selector = '.' + guid + ':before';

				button.classList.remove( 'pbs-button-icon' );
				button.classList.remove( guid );

				window.PBSEditor.addPseudoElementStyles( selector, { 'width': '' } );
				window.PBSEditor.addPseudoElementStyles( selector, { 'height': '' } );

				view.model.set( 'pseudo', '' );
				button.parentNode._ceElement._syncContent();
				button.parentNode._ceElement.taint();

				wp.hooks.doAction( 'pbs.option.changed' );
			},
			'visible': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return button.classList.contains( 'pbs-button-icon' );
			}
		},
		{
			'name': pbsParams.labels.icon_color,
			'type': 'color',
			'group': pbsParams.labels.icon,
			'value': function( element ) {
				var selector, currentSvg, matches;
				var button = element._domElement.querySelector( '.pbs-button' );
				var guid = PBSEditor.getUniqueClassName( button );
				if ( ! guid ) {
					return '';
				}
				selector = '.' + guid + ':before';

				currentSvg = window.PBSEditor.getPseudoElementStyles( selector, 'background-image' );
				if ( ! currentSvg ) {
					return '';
				}

				matches = currentSvg.match( /(%3Csvg|<svg)[^>]+?(fill='([^']*)'\s*)?/m );
				if ( ! matches ) {
					return '';
				}
				if ( ! matches[3] ) {
					return '';
				}
				return matches[3].replace( /%23/g, '#' );
			},
			'change': function( element, value ) {
				var selector, currentSvg;
				var button = element._domElement.querySelector( '.pbs-button' );
				var guid = PBSEditor.getUniqueClassName( button );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					button.classList.add( guid );
				}

				selector = '.' + guid + ':before';

				currentSvg = window.PBSEditor.getPseudoElementStyles( selector, 'background-image' );

				if ( ! currentSvg ) {
					return;
				}
				if ( value ) {
					value = value.replace( /#/g, '%23' );
					currentSvg = currentSvg.replace( /(%3Csvg|<svg)\s+(fill='[^']*'\s*)?/g, '$1 fill=\'' + value + '\' ' );
				} else {
					currentSvg = currentSvg.replace( /(%3Csvg|<svg)\s+(fill='[^']*'\s*)?/g, '$1 ' );
				}

				window.PBSEditor.addPseudoElementStyles( selector, { 'background-image': currentSvg } );
				element._syncContent();
				element.taint();
			},
			'visible': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return button.classList.contains( 'pbs-button-icon' );
			}
		},

		{
			'name': pbsParams.labels.icon_size,
			'type': 'number',
			'group': pbsParams.labels.icon,
			'step': '0.1',
			'min': '0.1',
			'max': '3',
			'unit': pbsParams.labels.em,
			'value': function( element ) {
				var selector, value;
				var button = element._domElement.querySelector( '.pbs-button' );

				var guid = PBSEditor.getUniqueClassName( button );
				if ( ! guid ) {
					return '1';
				}

				selector = '.' + guid + ':before';
				value = window.PBSEditor.getPseudoElementStyles( selector, 'width' );
				if ( isNaN( parseFloat( value ) ) ) {
					return '1.0';
				}
				return parseFloat( value ).toFixed( 1 ) || '1';
			},
			'change': function( element, value ) {
				var selector;
				var button = element._domElement.querySelector( '.pbs-button' );
				var guid = PBSEditor.getUniqueClassName( button );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					button.classList.add( guid );
				}

				selector = '.' + guid + ':before';

				window.PBSEditor.addPseudoElementStyles( selector, { 'width': value + 'em !important' } );
				window.PBSEditor.addPseudoElementStyles( selector, { 'height': value + 'em !important' } );

				element._syncContent();
				element.taint();
			},
			'visible': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return button.classList.contains( 'pbs-button-icon' );
			}
		},

		{

			// STANDARD-PRO-ONLY-START
			'options': {
				'': pbsParams.labels.none,
				'pbs-shadow-simple-1': pbsParams.labels.simple_shadow_small,
				'pbs-shadow-simple-2': pbsParams.labels.simple_shadow_normal,
				'pbs-shadow-simple-3': pbsParams.labels.simple_shadow_medium,
				'pbs-shadow-simple-4': pbsParams.labels.simple_shadow_large,
				'pbs-shadow-simple-5': pbsParams.labels.simple_shadow_huge
			},
			'value': function( element ) {
				var match;
				var button = element._domElement.querySelector( '.pbs-button' );
				var classes = button.getAttribute( 'class' );
				if ( ! classes ) {
					return '';
				}
				match = classes.match( /pbs-shadow-[-\w\d]+/ );
				if ( ! match ) {
					return '';
				}
				match = match[0];
				match = match.match( /(^.*)-(\d+$)/ );
				if ( ! match ) {
					return '';
				}
				return match[1];
			},
			'change': function( element, value ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				var classes = button.getAttribute( 'class' );
				var match, strength = 3;
				if ( classes ) {
					match = classes.match( /pbs-shadow-[-\w\d]+/ );
					if ( match ) {
						match = match[0];
						button.classList.remove( match );

						match = match.match( /(^.*)-(\d+$)/ );
						if ( match ) {
							strength = match[2];
						}
					}
				}

				if ( value ) {
					button.classList.add( value + '-' + strength );
				}

				element._syncContent();
				element.taint();
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.shadows,
			'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
			'group': pbsParams.labels.shadows
		},
		{

			// STANDARD-PRO-ONLY-START
			'step': 1,
			'min': 1,
			'max': 3,
			'value': function( element ) {
				var match;
				var button = element._domElement.querySelector( '.pbs-button' );
				var classes = button.getAttribute( 'class' );
				if ( ! classes ) {
					return 3;
				}
				match = classes.match( /pbs-shadow-[-\w\d]+/ );
				if ( ! match ) {
					return 3;
				}
				match = match[0];
				match = match.match( /(^.*)-(\d+$)/ );
				if ( ! match ) {
					return 3;
				}
				return match[2];
			},
			'change': function( element, value ) {
				var match;
				var button = element._domElement.querySelector( '.pbs-button' );
				var classes = button.getAttribute( 'class' );
				if ( classes ) {
					match = classes.match( /pbs-shadow-[-\w\d]+/ );
					if ( match ) {
						match = match[0];
						button.classList.remove( match );

						match = match.match( /(^.*)-(\d+$)/ );
						if ( match ) {
							button.classList.add( match[1] + '-' + value );
						}
					}
				}

				element._syncContent();
				element.taint();
			},
			'visible': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return -1 !== button.getAttribute( 'class' ).indexOf( 'pbs-shadow-' );
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.shadow_strength,
			'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
			'group': pbsParams.labels.shadows
		},
		{
			'name': pbsParams.labels.shadow_hover_effect,
			'id': 'shadow_hover',
			'type': 'checkbox',
			'group': pbsParams.labels.shadows,
			'value': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return button.classList.contains( 'pbs-hover-shadow' );
			},
			'change': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				button.classList.toggle( 'pbs-hover-shadow' );
				element._syncContent();
				element.taint();
			},
			'visible': function( element ) {
				var button = element._domElement.querySelector( '.pbs-button' );
				return -1 !== button.getAttribute( 'class' ).indexOf( 'pbs-shadow-' );
			}
		}
	]
} );

/* globals pbsParams */

window.pbsAddInspector( 'Carousel', {
	'label': pbsParams.labels.carousel,
	'options': [
		{
			'name': pbsParams.labels.fade_animation,
			'type': 'checkbox',
			'desc': pbsParams.labels.desc_fade_animation,
			'value': function( element ) {
				return 'slideshow' === element.attr( 'data-type' );
			},
			'change': function( element, value ) {
				var index = element._domElement.siema.currentSlide;
				window.pbsDestroyCarousel( element._domElement );
				element.attr( 'data-type', value ? 'slideshow' : 'slider' );
				element.initBackendCarousel();
				element._domElement.siema.goTo( index );
			}
		},

		{
			'name': pbsParams.labels.slide_delay,
			'type': 'number',
			'step': '100',
			'min': '1000',
			'max': '10000',
			'unit': pbsParams.labels.ms,
			'value': function( element ) {
				return element._domElement.getAttribute( 'data-delay' ) || '4000';
			},
			'change': function( element, value ) {
				element.attr( 'data-delay', value );
			}
		},
		{
			'name': pbsParams.labels.animation_speed,
			'type': 'number',
			'step': '100',
			'min': '100',
			'max': '1500',
			'unit': pbsParams.labels.ms,
			'value': function( element ) {
				return element._domElement.getAttribute( 'data-anim-duration' ) || '400';
			},
			'change': function( element, value ) {
				var index = element._domElement.siema.currentSlide;
				window.pbsDestroyCarousel( element._domElement );
				element.attr( 'data-anim-duration', value );
				element.initBackendCarousel();
				element._domElement.siema.goTo( index );
			}
		},
		{
			'name': pbsParams.labels.full_width,
			'type': 'checkbox',
			'value': function( element ) {
				return !! element._domElement.getAttribute( 'data-full-width' );
			},
			'change': function( element, value ) {
				element.attr( 'data-full-width', value ? 'true' : '' );
				window.pbsRefreshCarousel( element._domElement );
				wp.hooks.doAction( 'pbs.dom.reposition' );
			}
		},
		{
			'name': pbsParams.labels.full_height,
			'type': 'checkbox',
			'value': function( element ) {
				return !! element.children[0].children[0]._domElement.style['min-height'];
			},
			'change': function( element, value ) {
				element.attr( 'data-full-height', value ? '100vh' : '' );
				element.children[0].children[0].style( 'display', 'block' );
				element.children[0].children[0].style( 'min-height', value ? '100vh' : '' );
				setTimeout( function() {
					element.children[0].children[0].style( 'display', '' );
				}, 1 );
			}
		},

		{
			'name': pbsParams.labels.bullet_color,
			'type': 'color',
			'group': pbsParams.labels.bullets,
			'value': function( element ) {
				var bullet = element._domElement.querySelector( '.pbs-carousel-bullet' );
				var styles = window.getComputedStyle( bullet );
				return styles.backgroundColor;
			},
			'change': function( element, value ) {
				var buttons = element._domElement.querySelectorAll( '.pbs-carousel-bullet' );
				element.attr( 'data-bullet-color', value );
				Array.prototype.forEach.call( buttons, function( el ) {
					el.style[ 'background-color' ] = value;
				} );
			}
		},
		{
			'name': pbsParams.labels.bullet_location,
			'type': 'select',
			'group': pbsParams.labels.bullets,
			'options': {
				'': pbsParams.labels['default'],
				'left': pbsParams.labels.inside_left,
				'middle': pbsParams.labels.inside_center,
				'right': pbsParams.labels.inside_right
			},
			'value': function( element ) {
				return element._domElement.getAttribute( 'data-bullet-location' );
			},
			'change': function( element, value ) {
				element.attr( 'data-bullet-location', value );
			}
		}
	]
} );

window.pbsAddActionButtons( 'Carousel', [
{
	'id': 'left',
	'name': pbsParams.labels.move_slide_left,
	'onClick': function( element ) {
		element.moveSlideLeft();
	}
},
{
	'id': 'right',
	'name': pbsParams.labels.move_slide_left,
	'onClick': function( element ) {
		element.moveSlideRight();
	}
} ] );

/* globals pbsParams, ContentEdit, Color */

var options = [];
options.push(
	{
		'name': pbsParams.labels.row_width,
		'desc': pbsParams.labels.desc_row_width,
		'type': 'select',
		'group': pbsParams.labels.general_and_style,
		'options': {
			'': pbsParams.labels.normal_width,
			'full-width-retain-content': pbsParams.labels.full_width_retained_content_width,
			'full-width': pbsParams.labels.full_width
		},
		'getRootRow': function( element ) {
			var rootRow = element;

			// Get the root row element, we can only set the root row as full width
			var currElem = element._domElement;
			while ( currElem && currElem._ceElement ) {
				if ( currElem.classList.contains( 'pbs-row' ) ) {
					rootRow = currElem._ceElement;
				}
				currElem = currElem.parentNode;
			}

			return rootRow;
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-width' ) || '';
		},
		'render': function( element, view ) {

			// Get the root row element, we can only set the root row as full width.
			var rootRow = view.optionSettings.getRootRow( element );

			var val = rootRow._domElement.getAttribute( 'data-width' );
			if ( ! val ) {
				val = '';
			}

			view.el.classList.remove( 'full' );
			view.el.classList.remove( 'full-retain' );
			if ( 'full-width' === val ) {
				view.el.classList.add( 'full' );
			} else if ( 'full-width-retain-content' === val ) {
				view.el.classList.add( 'full-retain' );
			}

			// Set the model width so other views can detect the value.
			view.model.set( view.optionSettings.id, val );
		},
		'change': function( element, value, view ) {

			// Get the root row element, we can only set the root row as full width.
			var rootRow = view.optionSettings.getRootRow( element );

			rootRow.style( 'margin-left', '' );
			rootRow.style( 'margin-right', '' );
			rootRow.style( 'padding-left', '' );
			rootRow.style( 'padding-right', '' );

			view.el.classList.remove( 'full' );
			view.el.classList.remove( 'full-retain' );

			if ( 'full-width' === value ) {
				view.el.classList.add( 'full' );
			} else if ( 'full-width-retain-content' === value ) {
				view.el.classList.add( 'full-retain' );
			}

			rootRow.attr( 'data-width', value );
			window._pbsFixRowWidth( rootRow._domElement );
			rootRow.taint();

			view.model.set( view.optionSettings.id, value );
		},
		'visible': function( element ) {
			return 'Region' === element.parent().type();
		}
	},
	{
		'name': pbsParams.labels.background_color,
		'type': 'color',
		'group': pbsParams.labels.general_and_style,
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:background-color', view.render );
		},
		'value': function( element ) {
			return element._domElement.style.backgroundColor || '';
		},
		'change': function( element, value ) {

			var bgImage = element._domElement.style['background-image'];
			var url = bgImage.match( /url\([^\)]+\)/i ) || '';

			element.style( 'background-color', value );

			// If there's a gradient, change that also.
			if ( bgImage.indexOf( 'gradient' ) !== -1 ) {
				element.style( 'background-image', 'linear-gradient(' + value + ', ' + value + '), ' + url );
			}
		}
	},
	{
		'name': pbsParams.labels.background_image,
		'type': 'image',
		'group': pbsParams.labels.general_and_style,
		'value': function( element ) {
			var matches;
			if ( element._domElement.style.backgroundImage ) {
				matches = element._domElement.style.backgroundImage.match( /url\([^,$]+/ );
				if ( matches ) {
					return matches[0];
				}
			}
			return '';
		},
		'change': function( element, attachmentIDs, attachmentURLs ) {
			var i, background, backgrounds = '';
			for ( i = 0; i < attachmentURLs.length; i++ ) {
				backgrounds += backgrounds ? ',' : '';
				backgrounds += 'url(' + attachmentURLs[ i ] + ')';
			}
			background = element.style( 'background-image' );
			if ( background.match( /url\(/ ) ) {
				background = background.replace( /url\([^\)]+\)/, backgrounds );
				element.style( 'background-image', background );
			} else {
				element.style( 'background-image', backgrounds );
			}
		},
		'remove': function( element, attachmentIDs, view ) {
			element.style( 'background-image', '' );
			view.model.set( 'background-image', '' );
		}
	}
);

options.push(
	{

		// STANDARD-PRO-ONLY-START
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:background-image', view.render );
		},
		'value': function( element ) {
			var value = element._domElement.style['background-image'];
			if ( value ) {
				return value.indexOf( 'gradient' ) !== -1;
			}
			return false;
		},
		'change': function( element, value, view ) {
			var bgImage = element._domElement.style['background-image'];
			var bgColor = element._domElement.style['background-color'];
			var url = bgImage.match( /url\([^\)]+\)/i ) || '';
			var c, newBackgroundImage;

			if ( ! value ) {
				element.style( 'background-image', url ? url : '' );
			} else {
				if ( ! bgColor ) {
					bgColor = 'rgba(0,0,0,.5)';
				}
				c = new Color( bgColor );
				if ( 1 === c._alpha ) {
					c._alpha = 0.5;
				}
				newBackgroundImage = 'linear-gradient(' + c + ', ' + c + ')';
				newBackgroundImage += url ? ', ' + url : '';
				element.style( 'background-image', newBackgroundImage );
				element.style( 'background-color', c );
				view.model.set( 'background-color', c.toString() );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.toggle_background_image_tint,
		'desc': pbsParams.labels.desc_background_tint,
		'type': ! pbsParams.is_lite ? 'checkbox' : 'checkboxDummy',
		'group': pbsParams.labels.general_and_style
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': '1',
		'min': '0',
		'max': '2000',
		'value': function( element ) {
			var size = parseInt( element._domElement.style['background-size'], 10 );
			if ( isNaN( size ) ) {
				return '';
			}
			return size;
		},
		'change': function( element, value ) {
			element.style( 'background-size', value && '0' !== value ? value + 'px' : 'cover' );
		},
		'visible': function( element ) {
			return -1 !== ( element._domElement.style['background-image'] || '' ).indexOf( 'url(' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.background_size,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'desc': pbsParams.labels.desc_background_size,
		'group': pbsParams.labels.general_and_style
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			if ( 'fixed' === element._domElement.style['background-attachment'] ) {
				return 'fixed';
			} else if ( null !== element._domElement.getAttribute( 'data-pbs-parallax' ) ) {
				return 'parallax';
			} else if ( null !== element._domElement.getAttribute( 'data-pbs-video-url' ) ) {
				return 'video';
			} else if ( null !== element._domElement.getAttribute( 'data-pbs-video-webm' ) ) {
				return 'video-html5';
			} else if ( null !== element._domElement.getAttribute( 'data-pbs-kenburns-1' ) ) {
				return 'kenburns';
			}
			return '';
		},
		'change': function( element, value, view ) {
			var currValue;

			element.style( 'background-attachment', '' );
			element.removeAttr( 'data-pbs-parallax' );
			element.removeAttr( 'data-pbs-video-url' );
			element.removeAttr( 'data-pbs-video-webm' );
			element.removeAttr( 'data-pbs-video-mp4' );
			element.removeAttr( 'data-pbs-kenburns-1' );
			element.removeAttr( 'data-pbs-kenburns-2' );
			element.removeAttr( 'data-pbs-kenburns-3' );
			element.removeAttr( 'data-pbs-kenburns-4' );

			if ( 'fixed' === value ) {
				element.style( 'background-attachment', 'fixed' );
			} else if ( 'parallax' === value ) {
				element.attr( 'data-pbs-parallax', '0.3' );
			} else if ( 'video' === value ) {
				element.attr( 'data-pbs-video-url', '', true );

				currValue = view.$el.parent().find( '.field-pbs-video-url input' ).val();
				if ( currValue ) {
					element.attr( 'data-pbs-video-url', currValue, true );
				}
			} else if ( 'video-html5' === value ) {
				element.attr( 'data-pbs-video-webm', '', true );
				element.attr( 'data-pbs-video-mp4', '', true );

				currValue = view.$el.parent().find( '.field-pbs-video-webm input' ).val();
				if ( currValue ) {
					element.attr( 'data-pbs-video-webm', currValue, true );
				}
				currValue = view.$el.parent().find( '.field-pbs-video-mp4 input' ).val();
				if ( currValue ) {
					element.attr( 'data-pbs-video-mp4', currValue, true );
				}
			} else if ( 'kenburns' === value ) {
				element.attr( 'data-pbs-kenburns-1', '', true );
				element.attr( 'data-pbs-kenburns-2', '', true );
				element.attr( 'data-pbs-kenburns-3', '', true );
				element.attr( 'data-pbs-kenburns-4', '', true );
			}
			if ( 'parallax' !== value ) {
				window.pbsDestroyParallax( element._domElement );
			}
			if ( 'video-html5' !== value ) {
				window.pbsDestroyVideoBG( element._domElement );
			}
			if ( 'kenburns' !== value ) {
				window.pbsDestroyKenBurns( element._domElement );
			}
			if ( 'video-html5' === value || 'video' === value ) {
				window.pbsInitVideoBG( element._domElement );
			}
		},

		'visible': function( element ) {

			// Can't add background effect in initial row inside carousels.
			if ( 'Carousel' === element.parent().constructor.name ) {
				return false;
			}

			return true;
		},

		// STANDARD-PRO-ONLY-END
		'options': {
			'': pbsParams.labels.normal_background_image,
			'fixed': pbsParams.labels.fixed_background_image,
			'parallax': pbsParams.labels.parallax_image,
			'kenburns': 'Ken Burns Slider',
			'video': pbsParams.labels.video_background_youtube_vimeo,
			'video-html5': pbsParams.labels.video_background_uploaded
		},
		'name': pbsParams.labels.background_image_type,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
		'group': pbsParams.labels.general_and_style
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': '0.01',
		'min': '-1',
		'max': '1',
		'visible': function( element ) {
			return null !== element._domElement.getAttribute( 'data-pbs-parallax' );
		},
		'value': function( element ) {
			if ( element._domElement.getAttribute( 'data-pbs-parallax' ) ) {
				return parseFloat( element._domElement.getAttribute( 'data-pbs-parallax' ) );
			}
			return '0';
		},
		'change': function( element, value ) {
			if ( ! value ) {
				value = 0;
			}
			element.attr( 'data-pbs-parallax', value );
			window.pbsInitParallax( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.parallax,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'desc': pbsParams.labels.desc_parallax,
		'group': pbsParams.labels.general_and_style
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			return null !== element._domElement.getAttribute( 'data-pbs-video-url' );
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-pbs-video-url' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-pbs-video-url', value );
			window.pbsInitVideoBG( element._domElement );
		},

		// STANDARD-PRO-ONLY-END
		'placeholder': 'http://',
		'name': pbsParams.labels.video_background,
		'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
		'desc': pbsParams.labels.desc_video_background,
		'group': pbsParams.labels.general_and_style,
		'class': 'field-pbs-video-url'
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			return null !== element._domElement.getAttribute( 'data-pbs-video-webm' );
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-pbs-video-webm' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-pbs-video-webm', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.webm_video,
		'type': ! pbsParams.is_lite ? 'file' : 'fileDummy',
		'desc': pbsParams.labels.desc_webm_video,
		'group': pbsParams.labels.general_and_style,
		'class': 'field-pbs-video-webm'
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			return null !== element._domElement.getAttribute( 'data-pbs-video-mp4' );
		},
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-pbs-video-mp4' ) || '';
		},
		'change': function( element, value ) {
			element.attr( 'data-pbs-video-mp4', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.mp4_video,
		'type': ! pbsParams.is_lite ? 'file' : 'fileDummy',
		'desc': pbsParams.labels.desc_mp4_video,
		'group': pbsParams.labels.general_and_style,
		'class': 'field-pbs-video-mp4'
	},
	{

		// STANDARD-PRO-ONLY-START
		'visible': function( element ) {
			return null !== element._domElement.getAttribute( 'data-pbs-kenburns-1' );
		},
		'value': function( element ) {
			var i, value = '';
			for ( i = 1; i <= 4; i++ ) {
				if ( element._domElement.getAttribute( 'data-pbs-kenburns-' + i ) ) {
					value += value ? ',' : '';
					value += element._domElement.getAttribute( 'data-pbs-kenburns-' + i );
				}
			}
			return value;
		},
		'change': function( element, value ) {
			var i;
			for ( i = 4; i > value.length; i-- ) {
				element.attr( 'data-pbs-kenburns-' + i, '', true );
			}
			for ( i = 0; i < value.length; i++ ) {
				if ( i >= 4 ) {
					break;
				}
				element.attr( 'data-pbs-kenburns-' + ( i + 1 ), value[ i ] );
			}
		},
		'remove': function( element, value ) {
			var i;
			for ( i = 4; i > value.length; i-- ) {
				element.attr( 'data-pbs-kenburns-' + i, '', true );
			}
			for ( i = 0; i < value.length; i++ ) {
				if ( i >= 4 ) {
					break;
				}
				element.attr( 'data-pbs-kenburns-' + ( i + 1 ), value[ i ] );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.kenburns_images,
		'type': ! pbsParams.is_lite ? 'images' : 'imageDummy',
		'desc': pbsParams.labels.desc_kenburns_images,
		'group': pbsParams.labels.general_and_style,
		'urls': true
	},
	{
		'name': pbsParams.labels.full_height,
		'type': 'checkbox',
		'group': pbsParams.labels.general_and_style,
		'value': function( element ) {
			return '100vh' === element._domElement.style['min-height'];
		},
		'change': function( element, value ) {
			element.style( 'min-height', value ? '100vh' : '' );
		},
		'visible': function( element ) {
			return 'Region' === element.parent().type();
		}
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return element._domElement.style.color || '';
		},
		'change': function( element, value ) {
			element.style( 'color', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.text_color,
		'desc': pbsParams.labels.note_overridden_by_elements,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.general_and_style
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': '1',
		'min': '0',
		'max': '300',
		'value': function( element ) {
			var margin = element.hasColumnGap();

			if ( 1 === element.children.length ) {
				return '0';
			}

			return parseInt( margin, 10 ) || '0';
		},
		'change': function( element, value ) {
			var i;

			if ( 1 === element.children.length ) {
				return;
			}

			for ( i = 0; i < element.children.length; i++ ) {
				if ( i < element.children.length - 1 ) {
					element.children[ i ].style( 'margin-right', value + 'px' );
				} else {
					element.children[ i ].style( 'margin-right', '' );
				}
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.column_gap,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.general_and_style,
		'unit': pbsParams.labels.px
	}
);

options.push(
	{
		'name': pbsParams.labels.border_radius,
		'type': 'number',
		'group': pbsParams.labels.borders,
		'step': '1',
		'min': '0',
		'max': '1000',
		'unit': pbsParams.labels.px,
		'maxFunction': function( element ) {
			return parseInt( parseInt( element._domElement.getBoundingClientRect().height, 10 ) / 2 + 1, 10 );
		},
		'value': function( element ) {
			var size = parseInt( element._domElement.style['border-radius'], 10 );
			if ( isNaN( size ) ) {
				return 0;
			}
			return size;
		},
		'change': function( element, value ) {
			element.style( 'border-radius', value + 'px' );
		}
	},
	{
		'name': pbsParams.labels.border_style,
		'type': 'select',
		'group': pbsParams.labels.borders,
		'options': {
			'': pbsParams.labels.none,
			'solid': pbsParams.labels.solid,
			'dashed': pbsParams.labels.dashed,
			'dotted': pbsParams.labels.dotted
		},
		'value': function( element ) {
			return element._domElement.style['border-style'];
		},
		'change': function( element, value, view ) {
			element.style( 'border-style', value );
			if ( value ) {
				if ( '' === element._domElement.style['border-width'] || 'transparent' === element._domElement.style['border-width'] ) {
					element.style( 'border-width', '1px' );
					view.model.set( 'border-width', '1' );
				}
				if ( '' === element._domElement.style['border-color'] || '0px' === element._domElement.style['border-color'] ) {
					element.style( 'border-color', '#000000' );
					view.model.set( 'border-color', '#000000' );
				}
			} else {
				element.style( 'border-width', '' );
				element.style( 'border-color', '' );
				view.model.set( 'border-width', '' );
				view.model.set( 'border-color', '' );
			}
		}
	},
	{
		'name': pbsParams.labels.border_color,
		'type': 'color',
		'group': pbsParams.labels.borders,
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:border-color', view.render );
		},
		'value': function( element ) {
			return element._domElement.style.borderColor || '';
		},
		'change': function( element, value ) {
			element.style( 'border-color', value );
		},
		'visible': function( element ) {
			return !! element._domElement.style['border-style'];
		}
	},
	{
		'name': pbsParams.labels.border_thickness,
		'type': 'number',
		'group': pbsParams.labels.borders,
		'step': '1',
		'min': '0',
		'max': '20',
		'unit': pbsParams.labels.px,
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:border-width', view.render );
		},
		'value': function( element ) {
			var size = parseInt( element._domElement.style['border-width'], 10 );
			if ( isNaN( size ) ) {
				return 0;
			}
			return size;
		},
		'change': function( element, value ) {
			element.style( 'border-width', value + 'px' );
		},
		'visible': function( element ) {
			return !! element._domElement.style['border-style'];
		}
	}
);

options.push(
	{
		'visible': function( element ) {

			// Remove shadow option effects when there's a carousel inside row because they get cut.
			if ( 'Carousel' === element.parent().constructor.name ) {
				return false;
			}

			return true;
		},

		// STANDARD-PRO-ONLY-START
		'options': {
			'': pbsParams.labels.none,
			'pbs-shadow-simple-1': pbsParams.labels.simple_shadow_small,
			'pbs-shadow-simple-2': pbsParams.labels.simple_shadow_normal,
			'pbs-shadow-simple-3': pbsParams.labels.simple_shadow_medium,
			'pbs-shadow-simple-4': pbsParams.labels.simple_shadow_large,
			'pbs-shadow-simple-5': pbsParams.labels.simple_shadow_huge,
			'pbs-shadow-fancy-1': pbsParams.labels.shadow_fancy_bottom_tilted,
			'pbs-shadow-fancy-2': pbsParams.labels.shadow_fancy_vertical,
			'pbs-shadow-fancy-3': pbsParams.labels.shadow_fancy_horizontal,
			'pbs-shadow-fancy-4': pbsParams.labels.shadow_fancy_center_bottom
		},
		'value': function( element ) {
			var match;
			var classes = element._domElement.getAttribute( 'class' );
			if ( ! classes ) {
				return '';
			}
			match = classes.match( /pbs-shadow-[-\w\d]+/ );
			if ( ! match ) {
				return '';
			}
			match = match[0];
			match = match.match( /(^.*)-(\d+$)/ );
			if ( ! match ) {
				return '';
			}
			return match[1];
		},
		'change': function( element, value ) {
			var classes = element._domElement.getAttribute( 'class' );
			var match, strength = 3;
			if ( classes ) {
				match = classes.match( /pbs-shadow-[-\w\d]+/ );
				if ( match ) {
					match = match[0];
					element.removeCSSClass( match );

					match = match.match( /(^.*)-(\d+$)/ );
					if ( match ) {
						strength = match[2];
					}
				}
			}

			if ( value ) {
				element.addCSSClass( value + '-' + strength );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.shadows,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
		'group': pbsParams.labels.shadows
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': 1,
		'min': 1,
		'max': 3,
		'value': function( element ) {
			var match;
			var classes = element._domElement.getAttribute( 'class' );
			if ( ! classes ) {
				return 3;
			}
			match = classes.match( /pbs-shadow-[-\w\d]+/ );
			if ( ! match ) {
				return 3;
			}
			match = match[0];
			match = match.match( /(^.*)-(\d+$)/ );
			if ( ! match ) {
				return 3;
			}
			return match[2];
		},
		'change': function( element, value ) {
			var match;
			var classes = element._domElement.getAttribute( 'class' );
			if ( classes ) {
				match = classes.match( /pbs-shadow-[-\w\d]+/ );
				if ( match ) {
					match = match[0];
					element.removeCSSClass( match );

					match = match.match( /(^.*)-(\d+$)/ );
					if ( match ) {
						element.addCSSClass( match[1] + '-' + value );
					}
				}
			}
		},
		'visible': function( element ) {
			return -1 !== element._domElement.getAttribute( 'class' ).indexOf( 'pbs-shadow-' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.shadow_strength,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.shadows
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return 'hidden' === element._domElement.style.overflow;
		},
		'change': function( element, value ) {
			element.style( 'overflow', value ? 'hidden' : 'visible' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.overflow_hidden,
		'type': ! pbsParams.is_lite ? 'checkbox' : 'checkboxDummy',
		'group': pbsParams.labels.advanced,
		'desc': pbsParams.labels.desc_overflow_hidden
	}
);

window.pbsAddInspector( 'DivRow', {
	'label': pbsParams.labels.row,
	'options': options
} );

window.pbsAddActionButtons( 'DivRow', [
{
	'id': 'add',
	'name': pbsParams.labels.add_column,
	'visible': function( element ) {

		// Hide when the row is inside a toggle.
		if ( 'Toggle' === element.parent().constructor.name ) {
			return false;
		}

		return true;
	},
	'onClick': function( element ) {
		var root = ContentEdit.Root.get();
		if ( root.focused() ) {
			if ( root.focused().blur ) {
				root.focused().blur();
			}
		}
		element.addNewColumn( 1 );
	}
},
{
	'id': 'clone',
	'name': pbsParams.labels.clone_row,
	'visible': function( element ) {

		// Can't clone initial row inside carousels.
		if ( element.parent()._domElement.classList.contains( 'glide__slide' ) ) {
			return false;
		}

		// Hide when the row is inside tabs.
		if ( 'TabPanelContainer' === element.parent().constructor.name ) {
			return false;
		}

		// Hide when the row is inside a toggle.
		if ( 'Toggle' === element.parent().constructor.name ) {
			return false;
		}

		return true;
	},
	'onClick': function( element ) {
		var newRow = element.clone();
		window._pbsFixRowWidth( newRow._domElement );
	}
} ] );

/* globals pbsParams, ContentEdit, Color */

var options = [];
options.push(
	{
		'name': pbsParams.labels.background_color,
		'type': 'color',
		'group': pbsParams.labels.general,
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:background-color', view.render );
		},
		'value': function( element ) {
			return element._domElement.style.backgroundColor || '';
		},
		'change': function( element, value ) {

			var bgImage = element._domElement.style['background-image'];
			var url = bgImage.match( /url\([^\)]+\)/i ) || '';

			element.style( 'background-color', value );

			// If there's a gradient, change that also.
			if ( bgImage.indexOf( 'gradient' ) !== -1 ) {
				element.style( 'background-image', 'linear-gradient(' + value + ', ' + value + '), ' + url );
			}
		}
	},
	{
		'name': pbsParams.labels.background_image,
		'type': 'image',
		'group': pbsParams.labels.general,
		'value': function( element ) {
			var matches;
			if ( element._domElement.style.backgroundImage ) {
				matches = element._domElement.style.backgroundImage.match( /url\([^,$]+/ );
				if ( matches ) {
					return matches[0];
				}
				return element._domElement.style.backgroundImage;
			}
			return '';
		},
		'change': function( element, attachmentIDs, attachmentURLs ) {
			var i, background, backgrounds = '';
			for ( i = 0; i < attachmentURLs.length; i++ ) {
				backgrounds += backgrounds ? ',' : '';
				backgrounds += 'url(' + attachmentURLs[ i ] + ')';
			}
			background = element.style( 'background-image' );
			if ( background.match( /url\(/ ) ) {
				background = background.replace( /url\([^\)]+\)/, backgrounds );
				element.style( 'background-image', background );
			} else {
				element.style( 'background-image', backgrounds );
			}
		},
		'remove': function( element, attachmentIDs, view ) {
			element.style( 'background-image', '' );
			view.model.set( 'background-image', '' );
		}
	}
);

options.push(
	{

		// STANDARD-PRO-ONLY-START
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:background-image', view.render );
		},
		'value': function( element ) {
			var value = element._domElement.style['background-image'];
			if ( value ) {
				return value.indexOf( 'gradient' ) !== -1;
			}
			return false;
		},
		'change': function( element, value, view ) {
			var bgImage = element._domElement.style['background-image'];
			var bgColor = element._domElement.style['background-color'];
			var url = bgImage.match( /url\([^\)]+\)/i ) || '';
			var c;

			// Reset back to only an image.
			if ( ! url ) {
				element.style( 'background-image', '' );
			} else if ( ! value ) {
				element.style( 'background-image', url );
			} else {
				c = new Color( bgColor );
				if ( 1 === c._alpha ) {
					c._alpha = 0.5;
				}
				element.style( 'background-image', 'linear-gradient(' + c + ', ' + c + '), ' + url );
				element.style( 'background-color', c );
				view.model.set( 'background-color', c.toString() );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.toggle_background_image_tint,
		'desc': pbsParams.labels.desc_background_tint,
		'type': ! pbsParams.is_lite ? 'checkbox' : 'checkboxDummy',
		'group': pbsParams.labels.general
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': '1',
		'min': '0',
		'max': '2000',
		'value': function( element ) {
			var size = parseInt( element._domElement.style['background-size'], 10 );
			if ( isNaN( size ) ) {
				return '';
			}
			return size;
		},
		'visible': function( element ) {
			return -1 !== ( element._domElement.style['background-image'] || '' ).indexOf( 'url(' );
		},
		'change': function( element, value ) {
			element.style( 'background-size', value && '0' !== value ? value + 'px' : 'cover' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.background_size,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'desc': pbsParams.labels.desc_background_size,
		'group': pbsParams.labels.general,
		'unit': pbsParams.labels.px
	},
	{

		// STANDARD-PRO-ONLY-START
		'options': {
			'': pbsParams.labels.vertical,
			'horizontal': pbsParams.labels.horizontal
		},
		'value': function( element ) {
			return 'horizontal' === element._domElement.getAttribute( 'data-orientation' ) ? 'horizontal' : '';
		},
		'change': function( element, value ) {
			if ( ! value ) {
				element.removeAttr( 'data-orientation' );
			} else {
				element.attr( 'data-orientation', 'horizontal' );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.content_orientation,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
		'desc': pbsParams.labels.desc_content_orientation,
		'group': pbsParams.labels.alignment
	},
	{

		// STANDARD-PRO-ONLY-START
		'options': {
			'': pbsParams.labels.occupy_entire_space,
			'flex-start': pbsParams.labels.top,
			'center': pbsParams.labels.center,
			'flex-end': pbsParams.labels.bottom
		},
		'value': function( element ) {
			return element._domElement.style['align-self'] || '';
		},
		'change': function( element, value ) {
			element.style( 'align-self', value );
			element.style( '-ms-align-self', value );
			element.style( '-webkit-align-self', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.vertical_column_alignment,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
		'desc': pbsParams.labels.desc_vertical_column_alignment,
		'group': pbsParams.labels.alignment
	},
	{

		// STANDARD-PRO-ONLY-START
		'options': {
			'flex-start': pbsParams.labels.top,
			'center': pbsParams.labels.center,
			'flex-end': pbsParams.labels.bottom,
			'space-between': pbsParams.labels.spread_evenly_top_to_bottom,
			'space-around': pbsParams.labels.equally_spaced
		},
		'value': function( element ) {
			return element._domElement.style['justify-content'] || 'flex-start';
		},
		'change': function( element, value ) {
			element.style( 'justify-content', value );
			element.style( '-ms-justify-content', value );
			element.style( '-webkit-justify-content', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.vertical_content_alignment,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
		'desc': pbsParams.labels.desc_vertical_content_alignment,
		'group': pbsParams.labels.alignment
	},
	{

		// STANDARD-PRO-ONLY-START
		'options': {
			'stretch': pbsParams.labels.stretch,
			'flex-start': pbsParams.labels.left,
			'center': pbsParams.labels.center,
			'flex-end': pbsParams.labels.right
		},
		'value': function( element ) {
			return element._domElement.style['align-items'] || 'stretch';
		},
		'change': function( element, value ) {
			element.style( 'align-items', value );
			element.style( '-ms-align-items', value );
			element.style( '-webkit-align-items', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.horizontal_content_alignment,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
		'desc': pbsParams.labels.desc_horizontal_content_alignment,
		'group': pbsParams.labels.alignment
	},
	{
		'name': pbsParams.labels.border_radius,
		'type': 'number',
		'group': pbsParams.labels.borders,
		'step': '1',
		'min': '0',
		'max': '1000',
		'unit': pbsParams.labels.px,
		'maxFunction': function( element ) {
			return parseInt( parseInt( element._domElement.getBoundingClientRect().height, 10 ) / 2 + 1, 10 );
		},
		'value': function( element ) {
			var size = parseInt( element._domElement.style['border-radius'], 10 );
			if ( isNaN( size ) ) {
				return 0;
			}
			return size;
		},
		'change': function( element, value ) {
			element.style( 'border-radius', value + 'px' );
		}
	},
	{
		'name': pbsParams.labels.border_style,
		'type': 'select',
		'group': pbsParams.labels.borders,
		'options': {
			'': pbsParams.labels.none,
			'solid': pbsParams.labels.solid,
			'dashed': pbsParams.labels.dashed,
			'dotted': pbsParams.labels.dotted
		},
		'value': function( element ) {
			return element._domElement.style['border-style'];
		},
		'change': function( element, value, view ) {
			element.style( 'border-style', value );
			if ( value ) {
				if ( '' === element._domElement.style['border-width'] || 'transparent' === element._domElement.style['border-width'] ) {
					element.style( 'border-width', '1px' );
					view.model.set( 'border-width', '1' );
				}
				if ( '' === element._domElement.style['border-color'] || '0px' === element._domElement.style['border-color'] ) {
					element.style( 'border-color', '#000000' );
					view.model.set( 'border-color', '#000000' );
				}
			} else {
				element.style( 'border-width', '' );
				element.style( 'border-color', '' );
				view.model.set( 'border-width', '' );
				view.model.set( 'border-color', '' );
			}
		}
	},
	{
		'name': pbsParams.labels.border_color,
		'type': 'color',
		'group': pbsParams.labels.borders,
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:border-color', view.render );
		},
		'value': function( element ) {
			return element._domElement.style.borderColor || '';
		},
		'change': function( element, value ) {
			element.style( 'border-color', value );
		},
		'visible': function( element ) {
			return !! element._domElement.style['border-style'];
		}
	},
	{
		'name': pbsParams.labels.border_thickness,
		'type': 'number',
		'group': pbsParams.labels.borders,
		'step': '1',
		'min': '0',
		'max': '20',
		'unit': pbsParams.labels.px,
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:border-width', view.render );
		},
		'value': function( element ) {
			var size = parseInt( element._domElement.style['border-width'], 10 );
			if ( isNaN( size ) ) {
				return 0;
			}
			return size;
		},
		'change': function( element, value ) {
			element.style( 'border-width', value + 'px' );
		},
		'visible': function( element ) {
			return !! element._domElement.style['border-style'];
		}
	}
);

options.push(
	{
		'visible': function( element ) {

			// Remove shadow option effects when there's a carousel inside column because they get cut.
			if ( element.parent().parent() ) {
				if ( element.parent().parent().constructor.name ) {
					if ( 'Carousel' === element.parent().parent().constructor.name ) {
						return false;
					}
				}
			}

			return true;
		},

		// STANDARD-PRO-ONLY-START
		'options': {
			'': pbsParams.labels.none,
			'pbs-shadow-simple-1': pbsParams.labels.simple_shadow_small,
			'pbs-shadow-simple-2': pbsParams.labels.simple_shadow_normal,
			'pbs-shadow-simple-3': pbsParams.labels.simple_shadow_medium,
			'pbs-shadow-simple-4': pbsParams.labels.simple_shadow_large,
			'pbs-shadow-simple-5': pbsParams.labels.simple_shadow_huge,
			'pbs-shadow-fancy-1': pbsParams.labels.shadow_fancy_bottom_tilted,
			'pbs-shadow-fancy-2': pbsParams.labels.shadow_fancy_vertical,
			'pbs-shadow-fancy-3': pbsParams.labels.shadow_fancy_horizontal,
			'pbs-shadow-fancy-4': pbsParams.labels.shadow_fancy_center_bottom
		},
		'value': function( element ) {
			var match;
			var classes = element._domElement.getAttribute( 'class' );
			if ( ! classes ) {
				return '';
			}
			match = classes.match( /pbs-shadow-[-\w\d]+/ );
			if ( ! match ) {
				return '';
			}
			match = match[0];
			match = match.match( /(^.*)-(\d+$)/ );
			if ( ! match ) {
				return '';
			}
			return match[1];
		},
		'change': function( element, value ) {
			var match;
			var classes = element._domElement.getAttribute( 'class' );
			var strength = 3;
			if ( classes ) {
				match = classes.match( /pbs-shadow-[-\w\d]+/ );
				if ( match ) {
					match = match[0];
					element.removeCSSClass( match );

					match = match.match( /(^.*)-(\d+$)/ );
					if ( match ) {
						strength = match[2];
					}
				}
			}

			if ( value ) {
				element.addCSSClass( value + '-' + strength );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.shadows,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
		'group': pbsParams.labels.shadows
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': 1,
		'min': 1,
		'max': 3,
		'value': function( element ) {
			var match;
			var classes = element._domElement.getAttribute( 'class' );
			if ( ! classes ) {
				return 3;
			}
			match = classes.match( /pbs-shadow-[-\w\d]+/ );
			if ( ! match ) {
				return 3;
			}
			match = match[0];
			match = match.match( /(^.*)-(\d+$)/ );
			if ( ! match ) {
				return 3;
			}
			return match[2];
		},
		'change': function( element, value ) {
			var match;
			var classes = element._domElement.getAttribute( 'class' );
			if ( classes ) {
				match = classes.match( /pbs-shadow-[-\w\d]+/ );
				if ( match ) {
					match = match[0];
					element.removeCSSClass( match );

					match = match.match( /(^.*)-(\d+$)/ );
					if ( match ) {
						element.addCSSClass( match[1] + '-' + value );
					}
				}
			}
		},
		'visible': function( element ) {
			return -1 !== element._domElement.getAttribute( 'class' ).indexOf( 'pbs-shadow-' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.shadow_strength,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.shadows
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return 'hidden' === element._domElement.style.overflow;
		},
		'change': function( element, value ) {
			element.style( 'overflow', value ? 'hidden' : 'visible' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.overflow_hidden,
		'type': ! pbsParams.is_lite ? 'checkbox' : 'checkboxDummy',
		'group': pbsParams.labels.advanced,
		'desc': pbsParams.labels.desc_overflow_hidden
	}
);

window.pbsAddInspector( 'DivCol', {
	'label': pbsParams.labels.column,
	'options': options
} );

window.pbsAddActionButtons( 'DivCol', [
{
	'id': 'add',
	'name': pbsParams.labels.add_column,
	'visible': function( element ) {

		// Hide when the column is inside tabs.
		if ( 'TabPanelContainer' === element.parent().constructor.name ) {
			return false;
		}

		// Hide when the column is inside a toggle.
		if ( 'Toggle' === element.parent().constructor.name ) {
			return false;
		}

		return true;
	},
	'onClick': function( element ) {
		var root, index, col;
		root = ContentEdit.Root.get();
		if ( root.focused() ) {
			if ( root.focused().blur ) {
				root.focused().blur();
			}
		}
		index = element.parent().children.indexOf( element ) + 1;
		col = element.parent().addNewColumn( index );
	}
},
{
	'id': 'clone',
	'name': pbsParams.labels.clone_column,
	'visible': function( element ) {

		// Hide when the column is inside a toggle.
		if ( 'Toggle' === element.parent().constructor.name ) {
			return false;
		}

		return true;
	},
	'onClick': function( element ) {
		element.clone();
	}
} ] );

/* globals pbsParams, PBSEditor */

var services = {
	'mailchimp': 'MailChimp',
	'aweber': 'AWeber'
};
if ( pbsParams.newsletter_mailpoet_list ) {
	services.mailpoet = 'MailPoet';
} else {
	services[ '!mailpoet' ] = 'MailPoet';
	pbsParams.newsletter_mailpoet_list = {};
}

window.pbsAddInspector( 'Newsletter', {
	'label': pbsParams.labels.newsletter,
	'options': [

		{
			'name': pbsParams.labels.newsletter_service,
			'type': 'select',
			'options': services,
			'group': pbsParams.labels.newsletter_settings,
			'value': function( element, view ) {
				setTimeout( function() {
					this.changeVisibility( element.attr( 'data-service' ), view );
				}.bind( this ), 1 );
				return element.attr( 'data-service' );
			},
			'change': function( element, value, view ) {
				setTimeout( function() {
					this.changeVisibility( value, view );
				}.bind( this ), 1 );
				element.attr( 'data-service', value );
			},
			'changeVisibility': function( value, view ) {
				var elements;

				if ( ! view ) {
					return;
				}
				if ( ! value ) {
					value = 'mailchimp';
				}
				if ( view.el.parentNode ) {
					elements = view.el.parentNode.querySelectorAll( '.pbs-newsletter-option' );
					Array.prototype.forEach.call( elements, function( el ) {
						el.style.display = 'none';
					} );

					elements = view.el.parentNode.querySelectorAll( '.pbs-newsletter-' + value );
					Array.prototype.forEach.call( elements, function( el ) {
						el.style.display = '';
					} );
				}
			}
		},
		{
			'name': pbsParams.labels.mailchimp_api_key,
			'type': 'text',
			'desc': '<a href="http://kb.mailchimp.com/accounts/management/about-api-keys#Finding-or-generating-your-API-key" target="_blank">' + pbsParams.labels.get_mailchimp_api_key + '</a>',
			'class': 'pbs-newsletter-option pbs-newsletter-mailchimp',
			'group': pbsParams.labels.newsletter_settings,
			'value': function( element ) {
				return element.attr( 'data-mailchimp-api-key' );
			},
			'change': function( element, value ) {
				element.attr( 'data-mailchimp-api-key', value );
			}
		},
		{
			'name': pbsParams.labels.mailchimp_list_key,
			'type': 'text',
			'desc': '<a href="http://kb.mailchimp.com/lists/managing-subscribers/find-your-list-id" target="_blank">' + pbsParams.labels.get_mailchimp_list_key + '</a>',
			'class': 'pbs-newsletter-option pbs-newsletter-mailchimp',
			'group': pbsParams.labels.newsletter_settings,
			'value': function( element ) {
				return element.attr( 'data-mailchimp-list' );
			},
			'change': function( element, value ) {
				element.attr( 'data-mailchimp-list', value );
			}
		},
		{
			'name': pbsParams.labels.aweber_list_id,
			'type': 'text',
			'desc': '<a href="https://help.aweber.com/hc/en-us/articles/204028426-What-Is-The-Unique-List-ID-" target="_blank">' + pbsParams.labels.get_aweber_list_id + '</a>',
			'class': 'pbs-newsletter-option pbs-newsletter-aweber',
			'group': pbsParams.labels.newsletter_settings,
			'value': function( element ) {
				return element.attr( 'data-aweber-list' );
			},
			'change': function( element, value ) {
				element.attr( 'data-aweber-list', value );
			}
		},
		{
			'name': pbsParams.labels.mailpoet_list,
			'type': 'select',
			'options': pbsParams.newsletter_mailpoet_list,
			'class': 'pbs-newsletter-option pbs-newsletter-mailpoet',
			'group': pbsParams.labels.newsletter_settings,
			'initialize': function( element ) {
				var listID;

				if ( ! element.attr( 'data-mailpoet-list' ) ) {
					for ( listID in this.options ) {
						if ( this.options.hasOwnProperty( listID ) ) {
							element.attr( 'data-mailpoet-list', listID );
							break;
						}
					}
				}
			},
			'value': function( element ) {
				return element.attr( 'data-mailpoet-list' );
			},
			'change': function( element, value ) {
				element.attr( 'data-mailpoet-list', value );
			}
		},

		{
			'name': pbsParams.labels.show_button_when_typed_on,
			'type': 'checkbox',
			'group': pbsParams.labels.general,
			'value': function( element ) {
				return element._domElement.classList.contains( 'pbs-show-on-typed' );
			},
			'change': function( element, value ) {
				if ( value ) {
					element.addCSSClass( 'pbs-show-on-typed' );
				} else {
					element.removeCSSClass( 'pbs-show-on-typed' );
				}
			}
		},
		{
			'name': pbsParams.labels.success_message,
			'type': 'text',
			'group': pbsParams.labels.general,
			'initialize': function( element ) {
				if ( ! element.attr( 'data-success-message' ) ) {
					element.attr( 'data-success-message', pbsParams.labels.thank_you_for_subscribing );
				}
			},
			'value': function( element ) {
				return element.attr( 'data-success-message' );
			},
			'change': function( element, value ) {
				element.attr( 'data-success-message', value );
			}
		},
		{
			'name': pbsParams.labels.success_message_color,
			'type': 'color',
			'group': pbsParams.labels.general,
			'value': function( element ) {
				var color;
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					return '#00B16A';
				}

				color = window.PBSEditor.getPseudoElementStyles( '.' + guid + '.pbs-notice-success .pbs-newsletter-notice', 'color' );
				if ( ! color ) {
					color = '#00B16A';
				}
				return color;
			},
			'change': function( element, value ) {
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					element.addCSSClass( guid );
				}

				return window.PBSEditor.addPseudoElementStyles( '.' + guid + '.pbs-notice-success .pbs-newsletter-notice', { 'color': value } );
			}
		},
		{
			'name': pbsParams.labels.error_message_color,
			'type': 'color',
			'group': pbsParams.labels.general,
			'value': function( element ) {
				var color;
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					return '#F64747';
				}

				color = window.PBSEditor.getPseudoElementStyles( '.' + guid + '.pbs-has-notice .pbs-newsletter-notice', 'color' );
				if ( ! color ) {
					color = '#F64747';
				}
				return color;
			},
			'change': function( element, value ) {
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					element.addCSSClass( guid );
				}

				return window.PBSEditor.addPseudoElementStyles( '.' + guid + '.pbs-has-notice .pbs-newsletter-notice', { 'color': value } );
			}
		}
	]
} );

/* globals pbsParams, PBSEditor, ContentTools */

window.pbsAddInspector( 'List', {
	'label': pbsParams.labels.list,
	'options': [
		{

			// STANDARD-PRO-ONLY-START
			'step': '1',
			'min': '1',
			'max': '150',
			'value': function( element ) {
				var to = element.children[0].children[0].content.length();
				return parseInt( element.children[0].children[0].content.substring( 0, to ).getStyle( 'font-size', element.children[0].children[0] ), 10 );
			},
			'change': function( element, value ) {

				var i;

				// Remove all font-size styles.
				var newStyle = { 'font-size': '' }, from = 0, to;
				for ( i = 0; i < element.children.length; i++ ) {
					to = element.children[ i ].children[0].content.length();
					element.children[ i ].children[0].content = element.children[ i ].children[0].content.style( from, to, element.children[ i ].children[0]._tagName, newStyle );
					element.children[ i ].children[0].updateInnerHTML();
					element.children[ i ].children[0].taint();
					element.children[ i ].children[0].restoreState();
				}
				for ( i = 0; i < element.children.length; i++ ) {
					element.children[ i ].style( 'font-size', '' );
					element.children[ i ].children[0].style( 'font-size', '' );
				}

				// Apply list-wide style.
				element.style( 'font-size', value ? value + 'px' : '' );
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.font_size,
			'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
			'group': pbsParams.labels.general,
			'unit': pbsParams.labels.px
		},
		{

			// STANDARD-PRO-ONLY-START
			'step': '0.01',
			'min': '0',
			'max': '4',
			'value': function( element ) {
				return ContentTools.Tools.LineHeight.getCurrentLineHeight( element.children[0] );
			},
			'change': function( element, value ) {

				var i, selector, guid;

				// Remove all font-size styles.
				var newStyle = { 'line-height': '' }, from = 0, to;
				for ( i = 0; i < element.children.length; i++ ) {
					to = element.children[ i ].children[0].content.length();
					element.children[ i ].children[0].content = element.children[ i ].children[0].content.style( from, to, element.children[ i ].children[0]._tagName, newStyle );
					element.children[ i ].children[0].updateInnerHTML();
					element.children[ i ].children[0].taint();
					element.children[ i ].children[0].restoreState();
				}
				for ( i = 0; i < element.children.length; i++ ) {
					element.children[ i ].style( 'line-height', '' );
					element.children[ i ].children[0].style( 'line-height', '' );
				}

				// Apply list-wide style.
				element.style( 'line-height', value ? value + 'em' : '' );

				// The line-height affects the alignment of the SVG icons, refresh them.
				if ( element.hasCSSClass( 'pbs-list-icon' ) ) {
					guid = PBSEditor.getUniqueClassName( element._domElement );
					if ( ! guid ) {
						guid = PBSEditor.generateUniqueClassName();
						element.addCSSClass( guid );
					}
					selector = '.' + guid + ' > li:before';

					window.PBSEditor.addPseudoElementStyles( selector, { 'transform': value ? 'translateY(' + value / 2 + 'em) translateY(-50%) !important' : '' } );
					window.PBSEditor.addPseudoElementStyles( selector, { 'top': value ? '0 !important' : '' } );
				}
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.line_height,
			'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
			'group': pbsParams.labels.general,
			'unit': pbsParams.labels.em
		},
		{

			// STANDARD-PRO-ONLY-START
			'click': function( element ) {
				var selector;
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					element.addCSSClass( guid );
				}
				selector = '.' + guid + ' > li:before';

				PBSEditor.iconFrame.open( {
					title: pbsParams.labels.choose_bullet_icon,
					button: pbsParams.labels.use_as_bullet,
					successCallback: function( frameView ) {
						var backgroundImage, currentSvg, currentFill, lineHeight;

						element.addCSSClass( 'pbs-list-icon' );

						backgroundImage = window.PBSEditor.convertSVGToBackgroundImage( frameView.selected.firstChild );

						currentSvg = window.PBSEditor.getPseudoElementStyles( selector, 'background-image' );
						if ( currentSvg ) {
							currentFill = currentSvg.match( /fill='([^']*)'/m );
							if ( currentFill ) {
								if ( currentFill[1] ) {

									// Change the icon color.
									backgroundImage = backgroundImage.replace( /(%3Csvg|<svg)\s+(fill='[^']*'\s*)?/g, '$1 fill=\'' + currentFill[1].replace( /#/g, '%23' ) + '\' ' );

									// Also change the inner fills.
									backgroundImage = backgroundImage.replace( /(fill='[^']*'\s*)/g, 'fill=\'' + currentFill[1].replace( /#/g, '%23' ) + '\' ' );
								}
							}
						}
						window.PBSEditor.addPseudoElementStyles( selector, { 'background-image': backgroundImage } );

						// Update the vertical position of the icon.
						lineHeight = ContentTools.Tools.LineHeight.getCurrentLineHeight( element.children[0] );
						window.PBSEditor.addPseudoElementStyles( selector, { 'transform': 'translateY(' + lineHeight / 2 + 'em) translateY(-50%) !important' } );
						window.PBSEditor.addPseudoElementStyles( selector, { 'top': '0 !important' } );

						element.taint();
					}
				} );
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.bullet_icon,
			'button': pbsParams.labels.pick_an_icon,
			'type': ! pbsParams.is_lite ? 'button2' : 'button2Dummy',
			'group': pbsParams.labels.bullet
		},
		{

			// STANDARD-PRO-ONLY-START
			'click': function( element ) {
				var selector;
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					element.addCSSClass( guid );
				}
				selector = '.' + guid + ' > li:before';

				element.removeCSSClass( 'pbs-list-icon' );
				if ( ! window.PBSEditor.removePseudoElementStyles( selector, 'background-image' ) ) {
					element.removeCSSClass( guid );
				}

				window.PBSEditor.addPseudoElementStyles( selector, { 'width': '' } );
				window.PBSEditor.addPseudoElementStyles( selector, { 'height': '' } );
				window.PBSEditor.addPseudoElementStyles( selector, { 'transform': '' } );
				window.PBSEditor.addPseudoElementStyles( selector, { 'top': '' } );
				window.PBSEditor.addPseudoElementStyles( selector, { 'margin-right': '' } );
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.reset_bullet_icon,
			'button': pbsParams.labels.remove_icon,
			'type': ! pbsParams.is_lite ? 'button2' : 'button2Dummy',
			'group': pbsParams.labels.bullet
		},
		{

			// STANDARD-PRO-ONLY-START
			'value': function( element ) {
				var selector, currentSvg, matches;
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					return '';
				}
				selector = '.' + guid + ' > li:before';

				currentSvg = window.PBSEditor.getPseudoElementStyles( selector, 'background-image' );
				if ( ! currentSvg ) {
					return '';
				}

				matches = currentSvg.match( /(%3Csvg|<svg)[^>]+?(fill='([^']*)'\s*)?/m );
				if ( ! matches ) {
					return '';
				}
				if ( ! matches[3] ) {
					return '';
				}
				return matches[3].replace( /%23/g, '#' );
			},
			'change': function( element, value ) {
				var selector, currentSvg;
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					element.addCSSClass( guid );
				}

				selector = '.' + guid + ' > li:before';

				currentSvg = window.PBSEditor.getPseudoElementStyles( selector, 'background-image' );

				if ( ! currentSvg ) {
					return;
				}
				if ( value ) {
					value = value.replace( /#/g, '%23' );

					// Change the main color.
					currentSvg = currentSvg.replace( /(%3Csvg|<svg)\s+(fill='[^']*'\s*)?/g, '$1 fill=\'' + value + '\' ' );

					// Also change the inner fills.
					currentSvg = currentSvg.replace( /(fill='[^']*'\s*)/g, 'fill=\'' + value + '\' ' );
				} else {

					// Reset the main color.
					currentSvg = currentSvg.replace( /(%3Csvg|<svg)\s+(fill='[^']*'\s*)?/g, '$1 ' );

					// Also reset the inner fills.
					currentSvg = currentSvg.replace( /(fill='[^']*'\s*)/g, '' );
				}

				window.PBSEditor.addPseudoElementStyles( selector, { 'background-image': currentSvg } );
				element.taint();
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.icon_color,
			'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
			'group': pbsParams.labels.bullet
		},
		{

			// STANDARD-PRO-ONLY-START
			'step': '0.01',
			'min': '0.1',
			'max': '4',
			'value': function( element ) {
				var selector, size;
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					return false;
				}

				selector = '.' + guid + ' > li:before';
				size = window.PBSEditor.getPseudoElementStyles( selector, 'width' );

				if ( isNaN( parseFloat( size ) ) ) {
					return '1';
				}
				return parseFloat( size ) || '1';
			},
			'change': function( element, value ) {
				var selector, lineHeight;
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					element.addCSSClass( guid );
				}

				selector = '.' + guid + ' > li:before';

				window.PBSEditor.addPseudoElementStyles( selector, { 'width': value ? value + 'em !important' : '' } );
				window.PBSEditor.addPseudoElementStyles( selector, { 'height': value ? value + 'em !important' : '' } );

				// Vertical location of the icon.
				lineHeight = ContentTools.Tools.LineHeight.getCurrentLineHeight( element.children[0] );

				window.PBSEditor.addPseudoElementStyles( selector, { 'transform': value ? 'translateY(' + lineHeight / 2 + 'em) translateY(-50%) !important' : '' } );
				window.PBSEditor.addPseudoElementStyles( selector, { 'top': value ? '0 !important' : '' } );

				element.taint();
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.icon_size,
			'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
			'group': pbsParams.labels.bullet,
			'unit': pbsParams.labels.em
		},
		{

			// STANDARD-PRO-ONLY-START
			'step': '1',
			'min': '-30',
			'max': '30',
			'value': function( element ) {
				var selector, size;
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					return false;
				}

				selector = '.' + guid + ' > li:before';
				size = window.PBSEditor.getPseudoElementStyles( selector, 'margin-right' );

				if ( isNaN( parseFloat( size ) ) ) {
					return '0';
				}
				return parseFloat( size ) || '0';
			},
			'change': function( element, value ) {
				var selector, lineHeight;
				var guid = PBSEditor.getUniqueClassName( element._domElement );
				if ( ! guid ) {
					guid = PBSEditor.generateUniqueClassName();
					element.addCSSClass( guid );
				}

				selector = '.' + guid + ' > li:before';

				window.PBSEditor.addPseudoElementStyles( selector, { 'margin-right': value ? value + 'px !important' : '' } );
				element.taint();
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.horizontal_offset,
			'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
			'group': pbsParams.labels.bullet,
			'unit': pbsParams.labels.px
		}
	]
} );

/* globals pbsParams, ContentTools */

ContentTools.ToolboxUI.prototype.createShortcodeMappingOptions = function( shortcodeTag ) {

	var i, opts, options, value, label, attribute, attributes = [], typesDone = [];
	var map = pbsParams.shortcode_mappings[ shortcodeTag ];

	var name = map.name;
	if ( ! name ) {
		name = shortcodeTag;
	}
	name = name.replace( /[-_]/g, ' ' ).replace( /\b[a-z]/g, function( letter ) {
		return letter.toUpperCase();
	} );

	// Create the attribute objects.
	for ( attribute in map.attributes ) {
		options = map.attributes[ attribute ];
		options.desc = options.description || '';
		options.id = options.attribute;

		// This is used to display get-the-premium version messages in sc map options.
		options.type_orig = options.type;
		options.first_of_type = typesDone.indexOf( options.type ) === -1;
		typesDone.push( options.type );

		// Iframes don't have attributes.
		if ( 'iframe' === options.type ) {
			options.attribute = '';
		}

		// Base the name of the attribute on the attribute itself if not available.
		if ( 'undefined' === typeof options.name || ! options.name ) {
			options.name = options.attribute;
			options.name = options.name.replace( /[-_]/g, ' ' ).replace( /\b[a-z]/g, function( letter ) {
				return letter.toUpperCase();
			} );
		}

		// Lite version doesn't have a color option, but has one defined, force it.
		if ( pbsParams.is_lite ) {
			if ( 'color' === options.type ) {
				options.type = 'text';
			} else if ( 'dropdown_post' === options.type ) {
				options.type = 'text';
			} else if ( 'dropdown_post_type' === options.type ) {
				options.type = 'text';
			} else if ( 'boolean' === options.type ) {
				options.type = 'text';
			} else if ( 'number' === options.type ) {
				options.type = 'text';
			} else if ( 'dropdown' === options.type ) {
				options.type = 'text';
			} else if ( 'select' === options.type ) {
				options.type = 'text';
			} else if ( 'iframe' === options.type ) {

				// Don't support the iframe in lite versions.
				continue;
			}
		}

		if ( 'boolean' === options.type ) {
			options.type = 'checkbox';
			options.checked = options.extra_boolean_checked || 'true';
			options.unchecked = options.extra_boolean_unchecked || 'false';
		} else if ( 'number' === options.type ) {
			options.min = options.extra_num_min || 0;
			options.max = options.extra_num_max || 1000;
			options.step = options.extra_num_step || 1;
		} else if ( 'multicheck' === options.type ) {
			options.options = {};
			opts = options.extra_dropdown.split( /\n/ ) || {};
			for ( i = 0; i < opts.length; i++ ) {
				value = opts[ i ].substr( 0, opts[ i ].indexOf( ',' ) );
				label = opts[ i ].substr( opts[ i ].indexOf( ',' ) + 1 );
				options.options[ value ] = label;
			}
		} else if ( 'multicheck_post_type' === options.type ) {
			options.type = 'multicheck';
			options.options = pbsParams.post_types;
		} else if ( 'dropdown' === options.type ) {
			options.type = 'select';
			options.options = {
				'': '— ' + pbsParams.labels.select_one + ' —'
			};
			opts = options.extra_dropdown.split( /\n/ ) || {};
			for ( i = 0; i < opts.length; i++ ) {
				value = opts[ i ].substr( 0, opts[ i ].indexOf( ',' ) );
				label = opts[ i ].substr( opts[ i ].indexOf( ',' ) + 1 );
				options.options[ value ] = label;
			}
		} else if ( 'dropdown_post_type' === options.type ) {
			options.type = 'select';
			options.options = {
				'': '— ' + pbsParams.labels.select_a_post_type + ' —'
			};
			for ( i in pbsParams.post_types ) {
				options.options[ i ] = pbsParams.post_types[ i ];
			}
		} else if ( 'dropdown_post' === options.type ) {
			options.type = 'select_post';
			options.post_type = options.extra || 'post';
		} else if ( 'dropdown_db' === options.type ) {
			options.type = 'select_db';
			options.db_table = options.extra_db_table || 'posts';
			options.db_field_id = options.extra_db_value || 'ID';
			options.db_field_label = options.extra_db_label || 'post_title';
			options.db_where_column = options.extra_db_where_field;
			options.db_where_value = options.extra_db_where_value;
		} else if ( 'iframe' === options.type ) {
			options.url = options.extra_url;
			if ( ! options.url ) {
				continue;
			}
			options.button = options.extra_button || pbsParams.labels.open;
		} else if ( 'content' === options.type ) {
			options.type = 'textarea';
		}

		attributes.push( options );
	}

	// Add it in the inspector
	window.pbsAddInspector( shortcodeTag, {
		'is_shortcode': true,
		'label': name,
		'desc': map.description || '',
		'options': attributes
	} );

};

window.pbsAddActionButtons( 'Shortcode', {
	'id': 'sc_edit_raw',
	'name': pbsParams.labels.edit_shortcode,
	'onClick': function( element ) {
		ContentTools.EditorApp.get()._toolboxProperties.hide();
		element.convertToText();
	},
	'priority': 3
} );

/* globals google, pbsParams, PBSEditor */

var options = [];

options.push(
	{
		'name': pbsParams.labels.map_api_key,
		'type': 'note',
		'desc': pbsParams.labels.map_api_key_note
	},
	{
		'name': pbsParams.labels.latitude_longitude_and_address,
		'type': 'text',
		'desc': pbsParams.labels.latitude_longitude_desc,
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:data-center', view.render );
		},
		'value': function( element ) {
			return element.attr( 'data-center' );
		},
		'change': _.debounce( function( element, value, view ) {
			var center, latLonMatch, geocoder;

			if ( element.attr( 'data-center' ) === value ) {
				return;
			}
			element.attr( 'data-center', value );

			view.$el.find( 'input' ).removeClass( 'pbs-option-error' );

			center = value.trim() || '37.09024, -95.712891';

			// Remove all existing markers.
			if ( element._domElement.map && element._domElement.map.marker ) {
				element._domElement.map.marker.setMap( null );
				delete( element._domElement.map.marker );
			}

			latLonMatch = center.match( /^([-+]?\d{1,2}([.]\d+)?)\s*,?\s*([-+]?\d{1,3}([.]\d+)?)$/ );
			if ( latLonMatch ) {
				element.attr( 'data-lat', latLonMatch[1] );
				element.attr( 'data-lng', latLonMatch[3] );
				center = { lat: parseFloat( latLonMatch[1] ), lng: parseFloat( latLonMatch[3] ) };

				if ( element._domElement.map ) {
					element._domElement.map.setCenter( center );

					// Put back the map marker.
					if ( element.attr( 'data-marker-image' ) ) {
						element._domElement.map.marker = new google.maps.Marker( {
							position: element._domElement.map.getCenter(),
							map: element._domElement.map,
							icon: element.attr( 'data-marker-image' )
						} );
					} else if ( element.attr( 'data-marker' ) ) {
						element._domElement.map.marker = new google.maps.Marker( {
							position: element._domElement.map.getCenter(),
							map: element._domElement.map
						} );
					}
				}

			} else if ( 'undefined' !== typeof google ) {
				geocoder = new google.maps.Geocoder();
				geocoder.geocode( { 'address': center }, function( results, status ) {
					if ( status === google.maps.GeocoderStatus.OK ) {
						element.attr( 'data-lat', results[0].geometry.location.lat() );
						element.attr( 'data-lng', results[0].geometry.location.lng() );
						center = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };

						if ( element._domElement.map ) {
							element._domElement.map.setCenter( center );

							// Put back the map marker.
							if ( element.attr( 'data-marker-image' ) ) {
								element._domElement.map.marker = new google.maps.Marker( {
									position: element._domElement.map.getCenter(),
									map: element._domElement.map,
									icon: element.attr( 'data-marker-image' )
								} );
							} else if ( element.attr( 'data-marker' ) ) {
								element._domElement.map.marker = new google.maps.Marker( {
									position: element._domElement.map.getCenter(),
									map: element._domElement.map
								} );
							}
						}
					} else {
						view.$el.find( 'input' ).addClass( 'pbs-option-error' );
					}
				} );
			}
		}, 300 )
	},
	{
		'name': pbsParams.labels.map_controls,
		'type': 'checkbox',
		'value': function( element ) {
			return ! element._domElement.getAttribute( 'data-disable-ui' );
		},
		'change': function( element, value ) {
			element.attr( 'data-disable-ui', value ? '1' : '' );

			// If map didn't load.
			if ( element._domElement.map ) {
				element._domElement.map.setOptions( { disableDefaultUI: ! value } );
			}
		}
	},
	{
		'name': pbsParams.labels.map_marker,
		'type': 'checkbox',
		'value': function( element ) {
			return !! element._domElement.getAttribute( 'data-marker' );
		},
		'change': function( element, value ) {

			// Remove any existing map markers.
			if ( element._domElement.map && element._domElement.map.marker ) {
				element._domElement.map.marker.setMap( null );
				delete( element._domElement.map.marker );
			}

			if ( ! value ) {
				element.attr( 'data-marker', '' );
				element.attr( 'data-marker-image', '' );
			} else {
				element.attr( 'data-marker', '1' );

				// Add the marker.
				if ( element._domElement.map ) {
					element._domElement.map.marker = new google.maps.Marker( {
						position: element._domElement.map.getCenter(),
						map: element._domElement.map
					} );
				}
			}
		}
	}
);

options.push(
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return element.attr( 'data-marker-image' ) || '';
		},
		'change': function( element, attachmentIDs, attachmentURLs ) {

			if ( 1 !== attachmentURLs.length ) {
				return;
			}

			element.attr( 'data-marker-image', attachmentURLs[0] );

			// Delete any existing markers.
			if ( element._domElement.map && element._domElement.map.marker ) {
				element._domElement.map.marker.setMap( null );
				delete( element._domElement.map.marker );
			}

			element.attr( 'data-marker', '1' );

			// Add the new marker.
			if ( element._domElement.map ) {
				element._domElement.map.marker = new google.maps.Marker( {
					position: element._domElement.map.getCenter(),
					map: element._domElement.map,
					icon: attachmentURLs[0]
				} );
			}
		},
		'remove': function( element ) {
			element.attr( 'data-marker-image', '' );

			// Remove any existing map markers.
			if ( element._domElement.map && element._domElement.map.marker ) {
				element._domElement.map.marker.setMap( null );
				delete( element._domElement.map.marker );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.custom_map_marker,
		'type': ! pbsParams.is_lite ? 'image' : 'imageDummy'
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return element.attr( 'data-color' );
		},
		'change': function( element, value ) {
			var rgb, hsl, customMapType;

			element.attr( 'data-color', value );
			if ( element.attr( 'data-custom' ) ) {
				return;
			}
			if ( ! value.trim() ) {
				if ( element._domElement.map ) {
					element._domElement.map.setMapTypeId( google.maps.MapTypeId.ROADMAP );
				}
				return;
			}
			rgb = PBSEditor.hexToRgb( value );
			value = PBSEditor.rgbToHex( rgb.r, rgb.g, rgb.b );
			hsl = PBSEditor.rgbToHsl( rgb.r, rgb.g, rgb.b );
			customMapType = new google.maps.StyledMapType( [
				{
					stylers: [
						{ hue: value },
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
					stylers: [ { color: value } ]
				}
			],
			{
				name: 'Styled'
			} );
			if ( element._domElement.map ) {
				element._domElement.map.mapTypes.set( 'styled', customMapType );
				element._domElement.map.setMapTypeId( 'styled' );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.tint_map,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy'
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			var value = element.attr( 'data-custom' );
			return value ? atob( value ) : '';
		},
		'change': _.debounce( function( element, value, view ) {
			var customMapType;

			element.attr( 'data-custom', btoa( value ) );

			view.$el.find( 'textarea' ).removeClass( 'pbs-option-error' );

			try {
				customMapType = new google.maps.StyledMapType( JSON.parse( value ) );
				if ( element._domElement.map ) {
					element._domElement.map.mapTypes.set( 'styled', customMapType );
					element._domElement.map.setMapTypeId( 'styled' );
				}
			} catch ( err ) {
				if ( element._domElement.map ) {
					element._domElement.map.setMapTypeId( google.maps.MapTypeId.ROADMAP );
				}
				if ( value.trim() ) {
					view.$el.find( 'textarea' ).addClass( 'pbs-option-error' );
				}
				view.model.trigger( 'change', view.model );
			}
		}, 300 ),

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.custom_map_styles,
		'type': ! pbsParams.is_lite ? 'textarea' : 'textareaDummy',
		'desc': pbsParams.labels.custom_map_styles_desc
	}
);

window.pbsAddInspector( 'Map', {
	'label': pbsParams.labels.map,
	'options': options
} );

/* globals pbsParams */

var options = [];

options.push(
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			if ( element && element._domElement ) {
				return element._domElement.classList.contains( 'pbs-tabs-vertical' );
			}
			return false;
		},
		'change': function( element, value ) {
			if ( value ) {
				element.addCSSClass( 'pbs-tabs-vertical' );
			} else {
				element.removeCSSClass( 'pbs-tabs-vertical' );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.vertical_tabs,
		'type': ! pbsParams.is_lite ? 'checkbox' : 'checkboxDummy'
	},
	{

		// STANDARD-PRO-ONLY-START
		'options': {
			'': pbsParams.labels.left + ' / ' + pbsParams.labels.top,
			'center': pbsParams.labels.center,
			'right': pbsParams.labels.right + ' / ' + pbsParams.labels.bottom,
			'stretch': pbsParams.labels.stretch
		},
		'value': function( element ) {
			if ( element && element._domElement ) {
				if ( element._domElement.classList.contains( 'pbs-tabs-align-center' ) ) {
					return 'center';
				} else if ( element._domElement.classList.contains( 'pbs-tabs-align-right' ) ) {
					return 'right';
				} else if ( element._domElement.classList.contains( 'pbs-tabs-align-stretch' ) ) {
					return 'stretch';
				}
			}
			return '';
		},
		'change': function( element, value ) {
			element.removeCSSClass( 'pbs-tabs-align-center' );
			element.removeCSSClass( 'pbs-tabs-align-right' );
			element.removeCSSClass( 'pbs-tabs-align-stretch' );

			if ( value ) {
				element.addCSSClass( 'pbs-tabs-align-' + value );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.tab_alignment,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy'
	},
	{

		// STANDARD-PRO-ONLY-START
		'options': {
			'': pbsParams.labels.classic,
			'pbs-tab-style-simple-classic': 'Simple Classic',
			'pbs-tab-style-clean': pbsParams.labels.clean
		},
		'value': function( element ) {
			var classes = element._domElement.getAttribute( 'class' );
			classes = classes.match( /pbs-tab-style-[-\w]+/ );

			if ( classes ) {
				return classes[0];
			}
			return '';
		},
		'change': function( element, value, view ) {
			var i, tabContainer;
			var classes = element._domElement.getAttribute( 'class' );
			classes = classes.match( /pbs-tab-style-[-\w]+/ );

			if ( classes ) {
				element.removeCSSClass( classes[0] );
			}

			tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );

			if ( value ) {
				element.addCSSClass( value );
			} else {
				tabContainer._ceElement.style( 'border-width', '' );
				tabContainer._ceElement.style( 'border-color', '' );
				view.model.set( 'border-width', '#eee' );
				view.model.set( 'border-color', '#eee' );
			}

			if ( 'pbs-tab-style-clean' === value ) {
				for ( i in tabContainer._ceElement.children ) {
					tabContainer._ceElement.children[ i ].style( 'border-color', '' );
				}
				view.model.set( 'border-color', '' );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.tab_style,
		'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
		'group': pbsParams.labels.tab_styles
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': 1,
		'min': 0,
		'max': 20,
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:border-width', view.render );
		},
		'visible': function( element ) {
			return element._domElement.classList.contains( 'pbs-tab-style-clean' );
		},
		'value': function( element ) {
			var tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );
			var size = parseInt( tabContainer.style['border-width'], 10 );
			if ( isNaN( size ) ) {
				return 0;
			}
			return size;
		},
		'change': function( element, value, view ) {
			var tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );
			if ( value ) {
				tabContainer._ceElement.style( 'border-width', value + 'px' );
				if ( ! tabContainer.style.borderColor ) {
					tabContainer._ceElement.style( 'border-color', '#eee' );
					view.model.set( 'border-color', '#eee' );
				}
			} else {
				tabContainer._ceElement.style( 'border-width', '' );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.border_thickness,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'group': pbsParams.labels.tab_styles,
		'unit': pbsParams.labels.px
	},
	{

		// STANDARD-PRO-ONLY-START
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:border-color', view.render );
		},
		'visible': function( element ) {
			return element._domElement.classList.contains( 'pbs-tab-style-clean' );
		},
		'value': function( element ) {
			var tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );
			return tabContainer.style.borderColor || '';
		},
		'change': function( element, value ) {
			var tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );
			tabContainer._ceElement.style( 'border-color', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.border_color,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.tab_styles
	},

	// This is for classic & simple classic
	{

		// STANDARD-PRO-ONLY-START
		'initialize': function( element, view ) {
			view.listenTo( view.model, 'change:border-color', view.render );
		},
		'visible': function( element ) {
			return ! element._domElement.classList.contains( 'pbs-tab-style-clean' );
		},
		'value': function( element ) {
			var tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );
			return tabContainer.style.borderColor || '';
		},
		'change': function( element, value ) {
			var i;
			var tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );
			tabContainer._ceElement.style( 'border-color', value );
			for ( i in tabContainer._ceElement.children ) {
				tabContainer._ceElement.children[ i ].style( 'border-color', value );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.border_color,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.tab_styles
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			var tab = element._domElement.querySelector( '[data-ce-tag="tab"]' );
			return tab.style.backgroundColor || '';
		},
		'change': function( element, value ) {
			var i;
			var tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );

			for ( i in tabContainer._ceElement.children ) {
				tabContainer._ceElement.children[ i ].style( 'background-color', value );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.active_tab_background_color,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.tab_styles
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			var tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );
			return tabContainer.style.color || '';
		},
		'change': function( element, value ) {
			var tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );

			tabContainer._ceElement.style( 'color', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.active_tab_text_color,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.tab_styles
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			var tab = element._domElement.querySelector( '[data-ce-tag="tab"]' );
			return tab.style.color || '';
		},
		'change': function( element, value ) {
			var i;
			var tabContainer = element._domElement.querySelector( '.ce-element--type-tabcontainer' );

			for ( i in tabContainer._ceElement.children ) {
				tabContainer._ceElement.children[ i ].style( 'color', value );
			}
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.inactive_tab_text_color,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.tab_styles
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			var panel = element._domElement.querySelector( '.ce-element--type-tabpanelcontainer' );
			return panel.style.backgroundColor || '';
		},
		'change': function( element, value ) {
			var panel = element._domElement.querySelector( '.ce-element--type-tabpanelcontainer' );
			return panel._ceElement.style( 'backgroundColor', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.tab_content_background_color,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.tab_styles
	},
	{

		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			var panel = element._domElement.querySelector( '.ce-element--type-tabpanelcontainer' );
			return panel.style.color || '';
		},
		'change': function( element, value ) {
			var panel = element._domElement.querySelector( '.ce-element--type-tabpanelcontainer' );
			return panel._ceElement.style( 'color', value );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.tab_content_text_color,
		'type': ! pbsParams.is_lite ? 'color' : 'colorDummy',
		'group': pbsParams.labels.tab_styles
	}
);

window.pbsAddInspector( 'Tabs', {
	'label': pbsParams.labels.tabs,
	'options': options
} );

/* globals pbsParams */

var options = [];
options.push(
	/*
	{
		// STANDARD-PRO-ONLY-START
		'value': function( element ) {
			return '1' === element._domElement.getAttribute( 'data-pbs-count-up' );
		},
		'change': function( element, value ) {
			if ( value ) {
				element.attr( 'data-pbs-count-up', '1' );
				element.attr( 'data-aos-js', '1' );
				if ( ! element._domElement.getAttribute( 'data-cu-time' ) ) {
					element.attr( 'data-cu-time', '2000' );
				}
				if ( ! element._domElement.getAttribute( 'data-cu-delay' ) ) {
					element.attr( 'data-cu-delay', '10' );
				}
				window.pbsInitCountUp( element._domElement );
			} else {
				element.removeAttr( 'data-aos-js' );
				element.removeAttr( 'data-pbs-count-up' );
				window.pbsStopCountUp( element._domElement );
			}
		},
		'visible': function( element ) {
			return !! element.attr( 'data-pbs-count-up' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.count_up_numbers,
		'type': ! pbsParams.is_lite ? 'checkbox' : 'checkboxDummy',
		'group': pbsParams.labels.count_up
	},
	*/
	{

		// STANDARD-PRO-ONLY-START
		'step': '100',
		'min': '1',
		'max': '10000',
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-cu-time' ) || '2000';
		},
		'change': function( element, value ) {
			element.attr( 'data-cu-time', value );
			window.pbsInitCountUp( element._domElement );
		},
		'visible': function( element ) {
			return !! element.attr( 'data-pbs-count-up' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.count_up_time,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'unit': pbsParams.labels.ms,
		'group': pbsParams.labels.count_up
	},
	{

		// STANDARD-PRO-ONLY-START
		'step': '10',
		'min': '5',
		'max': '100',
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-cu-delay' ) || '10';
		},
		'change': function( element, value ) {
			element.attr( 'data-cu-delay', value );
			window.pbsInitCountUp( element._domElement );
		},
		'visible': function( element ) {
			return !! element.attr( 'data-pbs-count-up' );
		},

		// STANDARD-PRO-ONLY-END
		'name': pbsParams.labels.count_up_delay,
		'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
		'unit': pbsParams.labels.ms,
		'group': pbsParams.labels.count_up
	}
);

window.pbsAddInspector( 'Text', {
	'label': pbsParams.labels.text,
	'options': options
} );

/* globals pbsParams */

var options = [];

options.push(
	{
		'name': pbsParams.labels.edit_html,
		'button': pbsParams.labels.edit,
		'type': 'button2',
		'class': 'primary',
		'group': pbsParams.labels.general,
		'click': function( element ) {
			element.openEditor();
		}
	}
);

window.pbsAddInspector( 'Html', {
	'label': pbsParams.labels.icon,
	'options': options
} );

/* globals pbsParams */

var options = [];

options.push(
	{
		'name': pbsParams.labels.color,
		'type': 'color',
		'group': pbsParams.labels.general,
		'value': function( element ) {
			var color = getComputedStyle( element._domElement ).background;
			var match = color.match( /linear-gradient\((.*?)(rgba?\([^\)]+\)|#\w+)/i );
			if ( ! match ) {
				return '';
			}

			color = match[2];

			// Make sure rgba() opacity don't have more than 2 decimals.
			while ( color.match( /(rgba\(\s*\d+,\s*\d+,\s*\d+,\s*\d+.\d{2})\d+/i ) ) {
				color = color.replace( /(rgba\(\s*\d+,\s*\d+,\s*\d+,\s*\d+.\d{2})\d+/i, '$1' );
			}

			return color;
		},
		'change': function( element, value ) {

			// If we have an old HR, the background size will be "auto 1px".
			// Update it to the new one.
			var size = getComputedStyle( element._domElement ).backgroundSize;
			size = size.match( /(\d+)/ )[1];
			if ( '1' === size ) {
				element.style( 'background-size', 'auto 10px' );
			}

			element.style( 'background-image', 'linear-gradient(0deg, transparent 45%, ' + value + ' 45%, ' + value + ' 55%, transparent 55%)' );
		}
	},
	{
		'step': '1',
		'min': '5',
		'max': '100',
		'value': function( element ) {
			return parseInt( element._domElement.style.width, 10 ) || '100';
		},
		'change': function( element, value ) {
			element.style( 'width', value + '%' );
		},
		'name': pbsParams.labels.width,
		'type': 'number',
		'unit': '%'
	},
	{
		'step': '1',
		'min': '1',
		'max': '10',
		'value': function( element ) {
			var size = getComputedStyle( element._domElement ).backgroundSize;
			size = size.match( /(\d+)/ )[1];
			return size / 5 - 1;
		},
		'change': function( element, value ) {

			// For old HRs the linear-gradient is still the old one without 45% & 55%,
			// make those compatible.
			var color = getComputedStyle( element._domElement ).backgroundImage;
			color = color.match( /linear-gradient\((.*?)(rgba?\([^\)]+\)|#\w+)/i )[2];

			element.style( 'background-image', 'linear-gradient(0deg, transparent 45%, ' + color + ' 45%, ' + color + ' 55%, transparent 55%)' );

			element.style( 'background-size', 'auto ' + ( ( parseInt( value, 10 ) + 1 ) * 5 ) + 'px' );
		},
		'name': pbsParams.labels.thickness,
		'type': 'number'
	},
	{
		'options': {
			'left': pbsParams.labels.left,
			'center': pbsParams.labels.center,
			'right': pbsParams.labels.right
		},
		'value': function( element ) {
			var styles = getComputedStyle( element._domElement );
			var marginLeft = styles.marginLeft;
			var marginRight = styles.marginRight;
			if ( '0px' === marginLeft && '0px' !== marginRight ) {
				return 'left';
			} else if ( '0px' !== marginLeft && '0px' === marginRight ) {
				return 'right';
			} else {
				return 'center';
			}
		},
		'change': function( element, value ) {
			if ( 'left' === value ) {
				element.style( 'marginRight', 'auto' );
				element.style( 'marginLeft', '0px' );
			} else if ( 'right' === value ) {
				element.style( 'marginRight', '0px' );
				element.style( 'marginLeft', 'auto' );
			} else {
				element.style( 'marginRight', 'auto' );
				element.style( 'marginLeft', 'auto' );
			}
		},
		'name': pbsParams.labels.alignment,
		'type': 'select'
	}
);

window.pbsAddInspector( 'Hr', {
	'label': pbsParams.labels.horizontal_rule,
	'options': options
} );

/* globals pbsParams */

var options = [];
options.push(
	{
		'value': function( element ) {
			return element._domElement.getAttribute( 'data-url' ) || '';
		},
		'change': function( element, value ) {
			if ( value !== element.attr( 'data-url' ) ) {
				element.attr( 'data-url', value );
				element.updateEmbedContent( value );
			}
		},
		'placeholder': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		'name': pbsParams.labels.embedded_url,
		'type': 'text',
		'desc': pbsParams.labels.desc_embedded_url,
		'group': pbsParams.labels.general
	}
);

window.pbsAddInspector( 'Embed', {
	'label': pbsParams.labels.embed,
	'options': options
} );

/* globals ContentEdit, pbsParams */

var i;

// These elements won't have the common inspector properties.
var exceptElements = [
   'Embed'
];

// STANDARD-PRO-ONLY-START
/**
 * Gets all the classes of a given element, with all the essential classes
 * removed: e.g. ct-element--*, row classes, carousel classes, animation classes, etc.
 */
var getCustomClasses = function( element ) {
	var customClass = element._domElement.getAttribute( 'class' );

	// Remove CT classes.
	customClass = customClass.replace( /ce-element[-\d\w]*/g, '' );

	// Remove element-specific classes.
	if ( 'DivRow' === element.constructor.name ) {
		customClass = customClass.replace( 'pbs-row', '' );
	} else if ( 'DivCol' === element.constructor.name ) {
		customClass = customClass.replace( 'pbs-col', '' );
	} else if ( 'Carousel' === element.constructor.name ) {
		customClass = customClass.replace( /glide--[-\d\w]*/g, '' );
	} else if ( 'Image' === element.constructor.name ) {
		customClass = customClass.replace( /(aligncenter|alignnone|alignleft|alignright)/, '' );
		customClass = customClass.replace( /wp-image-\d+/, '' );
		customClass = customClass.replace( /size-\w+/, '' );
	}

	// Animations classes, AOS.
	if ( element._domElement.getAttribute( 'data-aos' ) ) {
		customClass = customClass.replace( /aos-[-\d\w]*/g, '' );
	}

	customClass = customClass.replace( /\s+/g, ' ' ).trim();

	return customClass;
};

// STANDARD-PRO-ONLY-END

( function() {

	// STANDARD-PRO-ONLY-START
	var replayAnimation = function( element ) {
		element._domElement.classList.remove( 'aos-animate' );
		element._domElement.style.transition = 'none';
		element._domElement.style.opacity = '0';
		setTimeout( function() {
			element._domElement.style.opacity = '';
			element._domElement.style.transition = '';
			this._domElement.classList.add( 'aos-animate' );
		}.bind( element ), 500 );
	};

	// STANDARD-PRO-ONLY-END

	/**
	 * These are all the common options.
	 */
	var options = [];

	options.push(
		{

			// STANDARD-PRO-ONLY-START
			'options': {
				'': pbsParams.labels.none,
				'fade': pbsParams.labels.fade,
				'fade-up': pbsParams.labels.fade_up,
				'fade-down': pbsParams.labels.fade_down,
				'fade-left': pbsParams.labels.fade_left,
				'fade-right': pbsParams.labels.fade_right,
				'fade-up-right': pbsParams.labels.fade_up_right,
				'fade-up-left': pbsParams.labels.fade_up_left,
				'fade-down-right': pbsParams.labels.fade_down_right,
				'fade-down-left': pbsParams.labels.fade_down_left,
				'flip-up': pbsParams.labels.flip_up,
				'flip-down': pbsParams.labels.flip_down,
				'flip-left': pbsParams.labels.flip_left,
				'flip-right': pbsParams.labels.flip_right,
				'roll-3d-bottom-top': pbsParams.labels.roll_3d_bottom_to_top,
				'roll-3d-left-right': pbsParams.labels.roll_3d_left_to_right,
				'roll-3d-right-left': pbsParams.labels.roll_3d_right_to_left,
				'spin': pbsParams.labels.spin,
				'spin-reverse': pbsParams.labels.spin_reverse,
				'spin-3d': pbsParams.labels.spin_3d,
				'spin-3d-reverse': pbsParams.labels.spin_3d_reverse,
				'slide-up': pbsParams.labels.slide_up,
				'slide-down': pbsParams.labels.slide_down,
				'slide-left': pbsParams.labels.slide_left,
				'slide-right': pbsParams.labels.slide_right,
				'rotate-top-left': pbsParams.labels.rotate_top_left,
				'rotate-top-right': pbsParams.labels.rotate_top_right,
				'rotate-bottom-left': pbsParams.labels.rotate_bottom_left,
				'rotate-bottom-right': pbsParams.labels.rotate_bottom_right,
				'zoom-in': pbsParams.labels.zoom_in,
				'zoom-in-up': pbsParams.labels.zoom_in_up,
				'zoom-in-down': pbsParams.labels.zoom_in_down,
				'zoom-in-left': pbsParams.labels.zoom_in_left,
				'zoom-in-right': pbsParams.labels.zoom_in_right,
				'zoom-out': pbsParams.labels.zoom_out,
				'zoom-out-up': pbsParams.labels.zoom_out_up,
				'zoom-out-down': pbsParams.labels.zoom_out_down,
				'zoom-out-left': pbsParams.labels.zoom_out_left,
				'zoom-out-right': pbsParams.labels.zoom_out_right,
				'loop-pulsate': pbsParams.labels.loop_pulsate,
				'loop-pulsate-fade': pbsParams.labels.loop_pulsate_fade,
				'loop-hover': pbsParams.labels.loop_hover,
				'loop-hover-float': pbsParams.labels.loop_hover_float,
				'loop-wobble': pbsParams.labels.loop_wobble,
				'loop-wobble-3d': pbsParams.labels.loop_wobble_3d,
				'loop-dangle': pbsParams.labels.loop_dangle
			},
			'value': function( element ) {
				return element.attr( 'data-aos' );
			},
			'change': function( element, value ) {
				if ( value ) {
	                element.attr( 'data-aos', value );

					// Update the animation so we can preview it.
	                replayAnimation( element );
	            } else {
	                element.removeAttr( 'data-aos' );
	            }

				// Remove classes that we don't need to save.
				element.removeCSSClass( 'aos-animate' );
				element._domElement.classList.remove( 'aos-animate' );
				element.removeCSSClass( 'aos-init' );
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.animation,
			'type': ! pbsParams.is_lite ? 'select' : 'selectDummy',
			'group': pbsParams.labels.entrance_animation
		},
		{

			// STANDARD-PRO-ONLY-START
			'min': 50,
			'max': 3000,
			'step': 50,
			'value': function( element ) {
				return element._domElement.getAttribute( 'data-aos-duration' ) || 400;
			},
			'change': function( element, value ) {
				if ( ! value ) {
					value = '';
				}
				element.attr( 'data-aos-duration', value );

				// Update the animation so we can preview it.
				replayAnimation( element );
			},
			'visible': function( element ) {
				return !! element.attr( 'data-aos' );
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.animation_speed,
			'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
			'group': pbsParams.labels.entrance_animation,
			'unit': pbsParams.labels.ms
		},
		{

			// STANDARD-PRO-ONLY-START
			'min': 0,
			'max': 3000,
			'step': 50,
			'value': function( element ) {
				return element._domElement.getAttribute( 'data-aos-delay' ) || 0;
			},
			'change': function( element, value ) {
				if ( ! value ) {
					value = '';
				}
				element.attr( 'data-aos-delay', value );

				// Update the animation so we can preview it.
				replayAnimation( element );
			},
			'visible': function( element ) {
				return !! element.attr( 'data-aos' );
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.animation_start_delay,
			'type': ! pbsParams.is_lite ? 'number' : 'numberDummy',
			'group': pbsParams.labels.entrance_animation,
			'unit': pbsParams.labels.ms,
			'desc': pbsParams.labels.desc_animation_start_delay
		},
		{

			// STANDARD-PRO-ONLY-START
			'value': function( element ) {
				return !! element._domElement.getAttribute( 'data-pbs-aos-bezier' );
			},
			'change': function( element, value ) {
				if ( ! value ) {
					value = '';
				}
				element.attr( 'data-pbs-aos-bezier', value );

				// Update the animation so we can preview it.
				replayAnimation( element );
			},
			'visible': function( element ) {
				return !! element.attr( 'data-aos' );
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.option_elastic_animation_name,
			'type': ! pbsParams.is_lite ? 'checkbox' : 'checkboxDummy',
			'group': pbsParams.labels.entrance_animation
		},
		{

			// STANDARD-PRO-ONLY-START
			'value': function( element ) {
				return !! element._domElement.getAttribute( 'data-aos-once' );
			},
			'change': function( element, value ) {
				if ( ! value ) {
					value = '';
				}
				element.attr( 'data-aos-once', value );
			},
			'visible': function( element ) {
				return !! element.attr( 'data-aos' );
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.option_play_animation_once_name,
			'type': ! pbsParams.is_lite ? 'checkbox' : 'checkboxDummy',
			'group': pbsParams.labels.entrance_animation
		},
		{

			// STANDARD-PRO-ONLY-START
			'value': function( element ) {
				return getCustomClasses( element );
			},
			'change': function( element, value ) {

				// Remove all old classes first (only the non-essential).
				var i, newClasses;
				var customClasses = getCustomClasses( element ).split( ' ' );
				for ( i = 0; i < customClasses.length; i++ ) {
					element.removeCSSClass( customClasses[ i ] );
				}

				// Add the new classes.
				newClasses = value.trim().split( ' ' );
				for ( i = 0; i < newClasses.length; i++ ) {
					element.addCSSClass( newClasses[ i ] );
				}
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.custom_class,
			'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
			'group': pbsParams.labels.advanced,
			'desc': pbsParams.labels.desc_custom_class,
			'placeholder': '.my-custom-class'
		},
		{

			// STANDARD-PRO-ONLY-START
			'value': function( element ) {
				return element._domElement.getAttribute( 'id' ) || '';
			},
			'change': function( element, value ) {
				element.attr( 'id', value );
			},

			// STANDARD-PRO-ONLY-END
			'name': pbsParams.labels.custom_id,
			'type': ! pbsParams.is_lite ? 'text' : 'textDummy',
			'group': pbsParams.labels.advanced,
			'desc': pbsParams.labels.desc_custom_id,
			'placeholder': '#my-custom-id'
		}
	);

	/**
	 * Add all the options above to all the proper elements (not buttons, input fields, etc).
	 */
	for ( i = 0; i < window.pbsElementsWithInspector.length; i++ ) {
		if ( ContentEdit[ window.pbsElementsWithInspector[ i ] ] ) {
			if ( -1 === exceptElements.indexOf( window.pbsElementsWithInspector[ i ] ) ) {
				window.pbsAddInspector( window.pbsElementsWithInspector[ i ], {
					'options': options
				} );
			}
		}
	}

	// Common action buttons.
	/*
	// var elementsWithActionButtons = window.pbsElementsWithInspector.slice( 0 );
	// elementsWithActionButtons.push( 'Shortcode' );
	//
	// for ( i = 0; i < elementsWithActionButtons.length; i++ ) {
	// 	if ( ContentEdit[ elementsWithActionButtons[ i ] ] ) {
	// 		window.pbsAddActionButtons( elementsWithActionButtons[ i ], {
	// 			'id': 'clone',
	// 			'name': pbsParams.labels.clone,
	// 			'onClick': function( element ) {
	// 				element.clone();
	// 			}
	// 		} );
	// 	}
	// }
	*/

} )();

/* globals ContentTools, __extends */

/**
 * This serves as the base for all big element buttons
 */
ContentTools.Tools.ElementButton = ( function( _super ) {
	__extends( ElementButton, _super );

	function ElementButton() {
		return ElementButton.__super__.constructor.apply( this, arguments );
	}

	ElementButton.canApply = function() {
		return true;
    };

    ElementButton.isApplied = function() {
		return false;
    };

	return ElementButton;

} )( ContentTools.Tool );

// Stop add element buttons from being disabled.
( function() {
	var proxied = ContentTools.ToolUI.prototype.disabled;
	var proxied2;
	ContentTools.ToolUI.prototype.disabled = function( disabledState ) {
		if ( this._domElement.classList.contains( 'pbs-tool-large' ) ) {
			return;
		}
		return proxied.call( this, disabledState );
    };

	proxied2 = ContentTools.ToolUI.prototype._onMouseUp;
	ContentTools.ToolUI.prototype._onMouseUp = function( ev ) {
		if ( this._domElement.classList.contains( 'pbs-tool-large' ) ) {
			this._mouseDown = false;
	        return this.removeCSSClass( 'ct-tool--down' );
		}
		return proxied2.call( this, ev );
    };
} )();

/**
 * Display element buttons as large buttons.
 */
( function() {
   var proxied = ContentTools.ToolUI.prototype.mount;
   ContentTools.ToolUI.prototype.mount = function( domParent, before ) {
	   var label;
	   var ret = proxied.call( this, domParent, before );

	   if ( this.tool.buttonName ) {
		   this._domElement.classList.add( 'pbs-tool-large' );
		   label = document.createElement( 'div' );
		   label.classList.add( 'pbs-tool-title' );
		   label.textContent = this.tool.buttonName;
		   this._domElement.appendChild( label );
	   }

	   return ret;
   };
} )();

/* globals ContentTools, ContentEdit, HTMLString, pbsParams */

/***************************************************************************
 * Allow headings inside divs
 ***************************************************************************/
ContentTools.Tools.Heading._canApply = ContentTools.Tools.Heading.canApply;
ContentTools.Tools.Heading.canApply = function( element, selection ) {
	var origReturn = ContentTools.Tools.Heading._canApply( element, selection );
	if ( 'ListItemText' === element.constructor.name ) {
		return false;
	}
	if ( element.content !== void 0 && element.parent().tagName ) {
		return origReturn || 'div' === element.parent().tagName();
	}
	return origReturn;
};

/***************************************************************************
 * Applied state for the paragraph tool.
 ***************************************************************************/
ContentTools.Tools.Paragraph.isApplied = function( element ) {
	return element.tagName() === this.tagName;
};

/***************************************************************************
 * Allow lists to be placed inside divs.
 ***************************************************************************/
ContentTools.Tools.UnorderedList.canApply = function( element, selection ) {
	var ret = ContentTools.Tools.Bold.canApply( element, selection );
	if ( element.parent() ) {
		if ( element.parent().tagName ) {
			if ( 'li' === element.parent().tagName() ) {
				return true;
			}
		}
	}
	return ret;
};
ContentTools.Tools.OrderedList.canApply = ContentTools.Tools.UnorderedList.canApply;

/***************************************************************************
 * Applied state for the list tools.
 ***************************************************************************/
ContentTools.Tools.UnorderedList.isApplied = function( element ) {
	if ( element.parent() ) {
		if ( element.parent().parent() ) {
			if ( element.parent().parent().tagName ) {
				if ( element.parent().parent().tagName() === this.listTag ) {
					return true;
				}
			}
		}
	}
	return false;
};
ContentTools.Tools.OrderedList.isApplied = ContentTools.Tools.UnorderedList.isApplied;

/***************************************************************************
 * Allow lists to be removed when clicking the list tool again.
 ***************************************************************************/

( function() {
	var proxied = ContentTools.Tools.UnorderedList.apply;
	ContentTools.Tools.UnorderedList.apply = function( element, selection, callback ) {

		var listItemText, listItem, list, ret, prevFontFamily, prevFontName;

		// Get the existing font family if there is one.
		if ( element._domElement ) {
			prevFontFamily = element._domElement.style.fontFamily;
			prevFontName = element._domElement.getAttribute( 'data-font-family' );
		}

		if ( this.isApplied( element ) ) {
			element.parent().unindent();

		} else if ( 'ListItem' !== element.parent().type() && ! element.content ) {

			// If the element has no content, then add the new element after it.
			listItemText = new ContentEdit.ListItemText( '' );
			listItem = new ContentEdit.ListItem();
			listItem.attach( listItemText );
			list = new ContentEdit.List( this.listTag, {} );
			list.attach( listItem );
			element.parent().attach( list, element.parent().children.indexOf( element ) + 1 );
			listItemText.focus();

			ret = callback( true );

		} else {

			ret = proxied.call( this, element, selection, callback );

			// Switching between numbered & bullet list does not refresh the inspector.
			// Trigger a focus on the element to refresh it.
			if ( element.parent() && 'ListItem' === element.parent().type() ) {
				ContentEdit.Root.get().trigger( 'focus', element );
			}

		}

		// If there previously was a font family, re-apply it.
		if ( prevFontFamily && ContentTools.Tools.FontPicker ) {
			ContentTools.Tools.FontPicker.selectFont( prevFontName, prevFontFamily );
		}

		return ret;
	};
} )();

( function() {
	var proxied = ContentTools.Tools.OrderedList.apply;
	ContentTools.Tools.OrderedList.apply = function( element, selection, callback ) {

		var listItemText, listItem, list, ret, prevFontFamily, prevFontName;

		// Get the existing font family if there is one.
		if ( element._domElement ) {
			prevFontFamily = element._domElement.style.fontFamily;
			prevFontName = element._domElement.getAttribute( 'data-font-family' );
		}

		if ( this.isApplied( element ) ) {
			element.parent().unindent();

		} else if ( 'ListItem' !== element.parent().type() && ! element.content ) {

			// If the element has no content, then add the new element after it.
			listItemText = new ContentEdit.ListItemText( '' );
			listItem = new ContentEdit.ListItem();
			listItem.attach( listItemText );
			list = new ContentEdit.List( this.listTag, {} );
			list.attach( listItem );
			element.parent().attach( list, element.parent().children.indexOf( element ) + 1 );
			listItemText.focus();

			ret = callback( true );

		} else {
			ret = proxied.call( this, element, selection, callback );

			// Switching between numbered & bullet list does not refresh the inspector.
			// Trigger a focus on the element to refresh it.
			if ( element.parent() && 'ListItem' === element.parent().type() ) {
				ContentEdit.Root.get().trigger( 'focus', element );
			}

		}

		// If there previously was a font family, re-apply it.
		if ( prevFontFamily && ContentTools.Tools.FontPicker ) {
			ContentTools.Tools.FontPicker.selectFont( prevFontName, prevFontFamily );
		}
	};
} )();

/***************************************************************************
 * Adjust the behavior of preformatted text to be able to be toggled.
 ***************************************************************************/
ContentTools.Tools.Preformatted.canApply = function( element, selection ) {
	return ContentTools.Tools.Heading1.canApply( element, selection );
};

( function() {
	var proxied = ContentTools.Tools.Preformatted.apply;
	ContentTools.Tools.Preformatted.apply = function( element, selection, callback ) {

		var heading;

		if ( this.isApplied( element ) ) {
			return;
		}

		// If the element has no content, then add the new element after it.
		if ( ! element.content ) {
			heading = new ContentEdit.Text( this.tagName );
			element.parent().attach( heading, element.parent().children.indexOf( element ) + 1 );
			heading.focus();
			return callback( true );
		}

		return proxied.call( this, element, selection, callback );
	};
} )();

ContentTools.Tools.Preformatted.isApplied = function( element ) {
	return element.tagName() === this.tagName;
};

/***************************************************************************
 * Change Bold tool. Instead of just adding a `<b>` tag,
 * use font-weight styles.
 ***************************************************************************/
ContentTools.Tools.Bold.canApply = function( element, selection ) {
	if ( ! element.content ) {
	  return false;
	}
	return selection;
};

ContentTools.Tools.Bold.isApplied = function( element, selection ) {
	var from = 0, to = 0, _ref;
	var styledString, fontWeight, fontWeightNum;

	if ( element.content === void 0 || ! element.content.length() ) {
		return false;
	}
	if ( selection ) {
		_ref = selection.get(), from = _ref[0], to = _ref[1];
	}

	// If nothing is selected, adjust the whole element
	if ( from === to ) {
		from = 0;
		to = element.content.length();
	}

	styledString = element.content.substring( from, to );
	fontWeight = styledString.getStyle( 'font-weight', element );

	// Support if formatted using `strong` & `b` tags.
	if ( styledString.hasTags( 'strong', true ) || styledString.hasTags( 'b', true ) ) {
		return true;
	}

	// Support numbered font-weights.
	fontWeightNum = parseInt( fontWeight, 10 );
	if ( ! isNaN( fontWeightNum ) ) {
		return fontWeightNum > 400;
	}

	return 'bold' === fontWeight;
};

ContentTools.Tools.Bold.apply = function( element, selection, callback ) {
	var from = 0, to = 0, _ref, styledString, fontWeight, defaultFontWeight;
	var newStyle;

	this.tagName = 'span';

	element.storeState();
	if ( selection ) {
		_ref = selection.get(), from = _ref[0], to = _ref[1];
	}

	// If nothing is selected, adjust the whole element
	if ( from === to ) {
		from = 0;
		to = element.content.length();
	}

	// Get the current styles and add a font-weight
	styledString = element.content.substring( from, to );

	// Also support if stuff are bolded using `strong` & `b` tags.
	if ( styledString.hasTags( 'strong', true ) ) {
		element.content = element.content.unformat( from, to, new HTMLString.Tag( 'strong' ) );

	} else if ( styledString.hasTags( 'b', true ) ) {
		element.content = element.content.unformat( from, to, new HTMLString.Tag( 'b' ) );

	} else {

		fontWeight = styledString.getStyle( 'font-weight', element );
		if ( ! fontWeight || 'normal' === fontWeight ) {
			fontWeight = 'bold';

		// If the font-weight is a number.
		} else if ( ! isNaN( parseInt( fontWeight, 10 ) ) ) {
			if ( parseInt( fontWeight, 10 ) <= 400 ) {
				fontWeight = 'bold';
			} else {
				fontWeight = 'normal';
			}
		} else {
			fontWeight = 'normal';
		}

		// For normal weights, use the original weight value if it's below 0-300.
		if ( 'normal' === fontWeight ) {
			defaultFontWeight = element.defaultStyle( 'font-weight' );
			if ( ! isNaN( parseInt( defaultFontWeight, 10 ) ) ) {
				if ( parseInt( defaultFontWeight, 10 ) < 400 ) {
					fontWeight = defaultFontWeight;
				}
			}
		}

		newStyle = { 'font-weight': fontWeight };

		element.content = element.content.style( from, to, element._tagName, newStyle );

	}

	element.updateInnerHTML();
	element.taint();
	element.restoreState();
	return callback( true );
};

/***************************************************************************
 * Change Italic tool. Instead of just adding an `<i>` tag,
 * use font-style styles.
 ***************************************************************************/
ContentTools.Tools.Italic.canApply = function( element, selection ) {
	return ContentTools.Tools.Bold.canApply( element, selection );
};

ContentTools.Tools.Italic.isApplied = function( element, selection ) {
	var from = 0, to = 0, _ref, styledString, fontStyle;
	if ( element.content === void 0 || ! element.content.length() ) {
		return false;
	}
	if ( selection ) {
		_ref = selection.get(), from = _ref[0], to = _ref[1];
	}

	// If nothing is selected, adjust the whole element
	if ( from === to ) {
		from = 0;
		to = element.content.length();
	}

	styledString = element.content.substring( from, to );
	fontStyle = styledString.getStyle( 'font-style', element );

	// Support if formatted using `em` & `i` tags.
	if ( styledString.hasTags( 'em', true ) || styledString.hasTags( 'i', true ) ) {
		return true;
	}

	return 'italic' === fontStyle;
};

ContentTools.Tools.Italic.apply = function( element, selection, callback ) {

	var from = 0, to = 0, _ref, styledString, fontStyle, newStyle;

	this.tagName = 'span';

	element.storeState();
	if ( selection ) {
		_ref = selection.get(), from = _ref[0], to = _ref[1];
	}

	// If nothing is selected, adjust the whole element
	if ( from === to ) {
		from = 0;
		to = element.content.length();
	}

	// Get the current styles and add a font-weight
	styledString = element.content.substring( from, to );

	// Also support if stuff are bolded using `em` & `i` tags.
	if ( styledString.hasTags( 'em', true ) ) {
		element.content = element.content.unformat( from, to, new HTMLString.Tag( 'em' ) );

	} else if ( styledString.hasTags( 'i', true ) ) {
		element.content = element.content.unformat( from, to, new HTMLString.Tag( 'i' ) );

	} else {

		fontStyle = styledString.getStyle( 'font-style', element );
		if ( ! fontStyle || 'normal' === fontStyle ) {
			fontStyle = 'italic';
		} else {
			fontStyle = 'normal';
		}
		newStyle = { 'font-style': fontStyle };

		element.content = element.content.style( from, to, element._tagName, newStyle );
	}

	element.updateInnerHTML();
	element.taint();
	element.restoreState();
	return callback( true );
};

/***************************************************************************
 * Fix Link tool.
 * Because we changed the Bold tool above, the link tool gets changed too.
 * Bring it back to the original behavior.
 ***************************************************************************/
ContentTools.Tools.Link.isApplied = function( element, selection ) {

	var from, to, _ref;

	// From Link.isApplied
	if ( 'Image' === element.constructor.name ) {
		return element.a;
	} else if ( selection ) {

		// From the original Bold.isApplied
		if ( element.content === void 0 || ! element.content.length() ) {
			return false;
		}
		_ref = selection.get(), from = _ref[0], to = _ref[1];
		if ( from === to ) {
			to += 1;
		}
		return element.content.slice( from, to ).hasTags( this.tagName, true );
	}
};

/***************************************************************************
 * Clicking the paragraph tool when an image is focused adds a paragraph
 * in the Region only, this makes it support divs.
 * @see ContentTools.Tools.Paragraph.apply
 ***************************************************************************/
 ( function() {
	var proxied = ContentTools.Tools.Paragraph.apply;
	ContentTools.Tools.Paragraph.apply = function( element, selection, callback ) {
		var app, forceAdd, paragraph, region;
		app = ContentTools.EditorApp.get();
		forceAdd = app.ctrlDown();
		if ( ContentTools.Tools.Heading.canApply( element ) && ! forceAdd ) {
		} else {
			if ( 'DivCol' === element.parent().constructor.name || 'Div' === element.parent().constructor.name ) {
				region = element.parent();
				paragraph = new ContentEdit.Text( 'p' );
				region.attach( paragraph, region.children.indexOf( element ) + 1 );
				paragraph.focus();
				return callback( true );
			}
		}
		return proxied.call( this, element, selection, callback );
	};
} )();

/***************************************************************************
 * Add a down hold (click and hold down the button) action for all tools.
 * To use this, you'll need to add a `doHold` function on the tool class.
 * @see line-height tool & margin tools
 ***************************************************************************/
 ( function() {
	var proxied = ContentTools.ToolUI.prototype._onMouseDown;
	ContentTools.ToolUI.prototype._onMouseDown = function( ev ) {

		var interval, element, selection;
		var ret = proxied.call( this, ev );

		if ( ! this.tool.doHold ) {
			return ret;
		}

		clearTimeout( this._holdTimeout );
		clearInterval( this._holdInterval );

		interval = 30;
		if ( this.tool.holdInterval ) {
			interval = this.tool.holdInterval;
		}

		if ( this._mouseDown ) {
			element = ContentEdit.Root.get().focused();
			if ( ! ( element && element.isMounted() ) ) {
				return;
			}
			selection = null;
			if ( element.selection ) {
				selection = element.selection();
			}

			this._holdTimeout = setTimeout( function() {
				this._holdInterval = setInterval( function() {
					this.tool.doHold( element, selection );
				}.bind( this ), interval );
			}.bind( this ), 500 );

		}

		return ret;
	};
} )();

( function() {
	var proxied = ContentTools.ToolUI.prototype._onMouseUp;
	ContentTools.ToolUI.prototype._onMouseUp = function( ev ) {

		clearTimeout( this._holdTimeout );
		clearInterval( this._holdInterval );

		return proxied.call( this, ev );
	};
} )();

ContentTools.Tool.refreshTooltip = function( value ) {

	var tooltip;
	var buttonElement = window.PBSEditor.getToolUI( this.icon )._domElement;

	if ( ! value ) {
		value = '';
	}

	if ( window.PBSEditor.isCtrlDown && window.PBSEditor.isShiftDown ) {
		tooltip = this.labelReset.replace( '{0}', value );
	} else if ( window.PBSEditor.isCtrlDown ) {
		tooltip = this.labelDown.replace( '{0}', value );
	} else {
		tooltip = this.label.replace( '{0}', value );
	}

	if ( buttonElement.getAttribute( 'data-tooltip' ) !== tooltip ) {
		buttonElement.setAttribute( 'data-tooltip', tooltip );
	}

};

/**
 * Hide the table element in lite.
 */
( function() {
	var proxied = ContentTools.Tools.Table.apply;
	ContentTools.Tools.Table.apply = function( element, selection, callback ) {

		// STANDARD-PRO-ONLY-START
		if ( ! pbsParams.is_lite ) {
			return proxied.call( this, element, selection, callback );
		}

		// STANDARD-PRO-ONLY-END
	};
	ContentTools.Tools.Table.premium = true;
	ContentTools.Tools.Table.buttonName = pbsParams.labels.table;
	ContentTools.Tools.Table.label = pbsParams.labels.table;

} )();

( function() {
	var proxied = ContentEdit.Element.prototype.mount;
	ContentEdit.Element.prototype.mount = function() {

		var ret;

		// Ensure we have something in the DOM.
		// Do this here because we need to hide it in the start.
		if ( ! this._domElement ) {
		  this._domElement = document.createElement( this.tagName() );
		}

		// Hide the element at the start.
		this._domElement.classList.add( 'pbs-will-mount' );

		// Mount it!
		ret = proxied.call( this );

		// Animate the new element!
		setTimeout( function() {
			if ( this._domElement ) {
				this._domElement.classList.add( 'pbs-will-mount' );
				this._domElement.classList.add( 'pbs-is-mounting' );
			}
		}.bind( this ), 10 );
		setTimeout( function() {
			if ( this._domElement ) {
				this._domElement.classList.remove( 'pbs-will-mount' );
				this._domElement.classList.remove( 'pbs-is-mounting' );
			}
		}.bind( this ), 450 );

		return ret;
	};
} )();

/**
 * This is the base class for all tools in the formatting bar that has
 * a popup that opens upon clicking it.
 */

/* globals ContentTools, __extends */

ContentTools.Tools.BasePopup = ( function( _super ) {
	__extends( BasePopup, _super );

	function BasePopup() {
		return BasePopup.__super__.constructor.apply( this, arguments );
	}

	BasePopup.displayRule = 'block';

	BasePopup.mountPopup = function() {

		// Assume that the overrider will add stuff in this.popup.
		this.popup = document.createElement( 'DIV' );
		this._ceElement._domElement.classList.add( 'pbs-md-modal' );

		// Add the popup.
		this._ceElement._domElement.appendChild( this.popup );

		// Hide the popup when clicking outside the tool.
		document.body.addEventListener( 'mousedown', function( e ) {
			if ( this.isOpen() ) {
				if ( 'INPUT' === e.target.tagName ) {
					return;
				}
				if ( ! this._ceElement._domElement.contains( e.target ) ) {
					this.hidePopup();
				}
				if ( e.target.classList ) {
					if ( e.target.classList.contains( 'ct-tool' ) ) {
						this.hidePopup();
						return;
					}
				}
			}
		}.bind( this ) );

		// Close popup if other popups open.
		wp.hooks.addAction( 'pbs.tool.popup.open', 'pbs.tool', function( toolOpened ) {
			if ( this !== toolOpened ) {
				this.hidePopup();
			}
		}.bind( this ) );
	};

	BasePopup.hidePopup = function() {

		setTimeout( function() {
			if ( this && this._ceElement ) {
				this._ceElement._domElement.querySelector( 'div' ).style.display = '';
			}
		}.bind( this ), 150 );

		this._ceElement._domElement.classList.remove( 'pbs-md-modal-show' );
	};

	BasePopup.isOpen = function() {
		return this._ceElement._domElement.querySelector( 'div' ).style.display === this.displayRule;
	};

	BasePopup.showPopup = function() {

		this._ceElement._domElement.querySelector( 'div' ).style.display = this.displayRule;

		setTimeout( function() {
			if ( this && this._ceElement ) {
				this._ceElement._domElement.classList.add( 'pbs-md-modal-show' );
			}
		}.bind( this ), 10 );

		wp.hooks.doAction( 'pbs.tool.popup.open', this );
	};

	return BasePopup;

} )( ContentTools.Tool );

// Implement our own mount event handler.
( function() {
	var proxied = ContentTools.ToolUI.prototype.mount;
	ContentTools.ToolUI.prototype.mount = function( domParent, before ) {
		var ret = proxied.call( this, domParent, before );
		this.tool._ceElement = this;
		if ( 'undefined' !== typeof this.tool.mountPopup ) {
			this.tool.mountPopup();
		}
		return ret;
	};
} )();

// Show the popup on click.
( function() {
	var proxied = ContentTools.ToolUI.prototype._addDOMEventListeners;
	ContentTools.ToolUI.prototype._addDOMEventListeners = function() {
		if ( 'undefined' !== typeof this.tool.mountPopup ) {

			// Cancel the mouse down event to prevent focusing
			this._domElement.addEventListener( 'mousedown', function( e ) {
				if ( e.target.classList.contains( 'ct-tool' ) ) {
					e.preventDefault();
				}
			} );

			// Show the popup on click
			this._domElement.addEventListener( 'click', function( e ) {

				if ( ! this._ceElement._domElement.classList.contains( 'ct-tool--disabled' ) ) {

					if ( ! this._ceElement.tool.popup.contains( e.target ) ) {

						// Let others know that we're going to open a popup.
						if ( '' === this._ceElement._domElement.querySelector( 'div' ).style.display ) {
							this.showPopup();
						}
					}
				}
			}.bind( this.tool ) );

		// Normal process
		} else {
			return proxied.call( this );
		}
	};
} )();

/* globals ContentTools, ContentEdit, PBSInspectorOptions, __extends, PBSEditor, pbsParams */

ContentTools.Tools.Shortcode = ( function( _super ) {
	__extends( Shortcode, _super );

	function Shortcode() {
		return Shortcode.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Shortcode, 'shortcode' );

	Shortcode.label = pbsParams.labels.shortcode;

	Shortcode.icon = 'shortcode';

	Shortcode.tagName = 'shortcode';

	Shortcode.buttonName = pbsParams.labels.shortcode;

	Shortcode.apply = function( element, selection, callback ) {

		var parent = null;
		var index = 0;
		var mainRegion;

		var root = ContentEdit.Root.get();
		if ( root.focused() ) {
			parent = root.focused().parent();
			index = parent.children.indexOf( root.focused() ) + 1;
		} else {
			mainRegion = ContentTools.EditorApp.get().regions()['main-content'];
			if ( mainRegion.children ) {
				parent = mainRegion.children[0].parent();
			}
		}

		this.createNew( parent, index );

		return callback( true );
	};

	Shortcode.createNew = function( parent, index ) {

		PBSEditor.shortcodeFrame.open( {
			title: pbsParams.labels.insert_shortcode,
			button: pbsParams.labels.insert_shortcode,
			successCallback: function( view ) {

				var base = view.selected.getAttribute( 'data-shortcode-tag' );
				var shortcodeRaw = this.createInsertedShortcode( base );
				var shortcode = wp.shortcode.next( base, shortcodeRaw, 0 );
				var isMapped = pbsParams.shortcode_mappings[ base ];
				var elem;

				// Insert the RAW shortcode, insert & render the shortcode if it's mapped.
				if ( isMapped ) {
					elem = ContentEdit.Shortcode.createShortcode( shortcode );
				} else {
					elem = new ContentEdit.Text( 'p', {}, shortcode.shortcode.string() );
				}
				parent.attach( elem, index );

				if ( isMapped ) {
					elem.ajaxUpdate( true );
				} else {
					elem.origShortcode = '';
					elem.origInnerHTML = '';
					elem.isShortcodeEditing = true;
				}

				elem.focus();

			}.bind( this )
		} );
	};

	Shortcode.createInsertedShortcode = function( base ) {

		// Default data
		var scData = {
			tag: base,
			type: 'closed',
			content: '',
			attrs: {}
		};

		var editor, i, option;

		// If there is an existing shortcode mapping, use that.
		if ( 'undefined' === typeof PBSInspectorOptions.Shortcode[ base ] ) {
			if ( 'undefined' !== typeof pbsParams.shortcode_mappings && 'undefined' !== typeof pbsParams.shortcode_mappings[ base ] ) {
				editor = ContentTools.EditorApp.get();
				if ( editor._toolbox.createShortcodeMappingOptions ) {
					editor._toolbox.createShortcodeMappingOptions( base );
				}
			}
		}

		// Include shortcode API data if it exists
		if ( PBSInspectorOptions.Shortcode[ base ] && PBSInspectorOptions.Shortcode[ base ].options ) {
			for ( i = 0; i < PBSInspectorOptions.Shortcode[ base ].options.length; i++ ) {
				option = PBSInspectorOptions.Shortcode[ base ].options[ i ];
				if ( option.id ) {
					if ( 'content' === option.id ) {
						scData.content = option['default'] || '';
					} else {
						scData.attrs[ option.id ] = option['default'] || '';
					}
				}
			}
		}

		// Generate the shortcode
		return new wp.shortcode( scData ).string();
	};

	return Shortcode;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams, PBSEditor */

ContentTools.Tools.Predesigned = ( function( _super ) {
	__extends( Predesigned, _super );

	function Predesigned() {
		return Predesigned.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Predesigned, 'predesigned' );

	Predesigned.label = pbsParams.labels.pre_designed_sections;

	Predesigned.icon = 'predesigned';

	Predesigned.tagName = 'predesigned';

	Predesigned.buttonName = pbsParams.labels.pre_designed_sections;

	Predesigned.apply = function( element, selection, callback ) {
		this.createNew( element.parent(), element.parent().children.indexOf( element ) );
		return callback( true );
	};

	Predesigned.createNew = function( parent, index ) {

		PBSEditor.predesignedFrame.open( {
			title: pbsParams.labels.pre_designed_sections,
			button: pbsParams.labels.insert_design,
			successCallback: function( view ) {
				var templateHTML, guids, newGuid, newElems, images;
				var i, templateID = view.selected.getAttribute( 'data-template' );
				templateID = templateID.replace( /^tmpl-/, '' );

				templateHTML = wp.template( templateID )();

				// Replace all the wp-image-* found since if the ID isn't from a valid image,
				// the Media Manager will not show the replace button.
				images = templateHTML.match( /wp-image-\d+/g );
				if ( images ) {
					for ( i = 0; i < images.length; i++ ) {
						templateHTML = templateHTML.replace( new RegExp( images[ i ], 'g' ), 'wp-image-' + pbsParams.dummy_image_id );
					}
				}

				// Remove the "size-full" class in images because the Media Manager
				// will throw an error during first open.
				templateHTML = templateHTML.replace( new RegExp( /(<img[^>]+['"\s])size-full(['"\s](.*?)>)/, 'g' ), '$1$2' );

				// Change all the pbsguid-* found, since these should be unique.
				// pbsguid-* classes are used by elements that use styles for their pseudo elements.
				guids = templateHTML.match( /pbsguid-\w+/g );
				if ( guids ) {
					for ( i = 0; i < guids.length; i++ ) {
						newGuid = window.PBSEditor.generateUniqueClassName();
						templateHTML = templateHTML.replace( new RegExp( guids[ i ], 'g' ), newGuid );
					}
				}

				// Get the new elements.
				newElems = this.convertTemplateToElement( templateHTML );

				// Find the location where we should add the element/s.
				// element._dontCloseThisTool = this;
				// var parent = element.parent();
				// var index = parent.children.indexOf( element );

				if ( view.selected.getAttribute( 'data-root-only' ) && 'false' !== view.selected.getAttribute( 'data-root-only' ) ) {
					while ( parent && 'Region' !== parent.constructor.name ) {
						index = parent.parent().children.indexOf( parent );
						parent = parent.parent();
					}
				}

				// Add the new elements.
				for ( i = 0; i < newElems.length; i++ ) {
					parent.attach( newElems[ i ], ++index );
				}
				if ( newElems[ 0 ] ) {
					if ( newElems[ 0 ].focus ) {
						newElems[ 0 ].focus();
					}
				}

				// Add the styles found in the template.
				this.addFoundStyles( templateHTML );

			}.bind( this )
		} );
	};

	/**
	 * Adds any contents of style tags in a pre-designed element template into
	 * the current styles in the page.
	 */
	Predesigned.addFoundStyles = function( templateHTML ) {
		var styleTags;
		var domElement = document.createElement( 'DIV' );
		domElement.innerHTML = templateHTML;

		styleTags = domElement.querySelectorAll( 'style' );
		Array.prototype.forEach.call( styleTags, function( el ) {
			window.PBSEditor.addPseudoElementStylesRaw( el.innerHTML );
			el.style.display = '';
		} );
	};

	/**
	 * The process for creating CT elements from a string comes from the Region
	 * constructor of CT.
	 */
	Predesigned.convertTemplateToElement = function( templateHTML ) {

		var createdElements = [];
		var _domElement, elements;
		var c, childNode, childNodes, cls, element, tagNames, _i, _len;

		var domElement = document.createElement( 'DIV' );
		domElement.innerHTML = templateHTML;

		_domElement = domElement;
		tagNames = ContentEdit.TagNames.get();

		childNodes = ( function() {
			var _i, _len, _ref, _results;
			_ref = _domElement.childNodes;
			_results = [];
			for ( _i = 0, _len = _ref.length; _i < _len; _i++ ) {
				c = _ref[_i];
				_results.push( c );
			}
			return _results;
		} ).call();

		// We need to do some processes after adding a pre-designed section. Set a global.
		PBSEditor._justAddedDesignElement = true;

		for ( _i = 0, _len = childNodes.length; _i < _len; _i++ ) {
			childNode = childNodes[_i];
			if ( 1 !== childNode.nodeType ) {
				continue;
			}
			if ( 'STYLE' === childNode.tagName ) {
				continue;
			}
			if ( childNode.getAttribute( 'data-ce-tag' ) ) {
				cls = tagNames.match( childNode.getAttribute( 'data-ce-tag' ) );
			} else {
				cls = tagNames.match( childNode.tagName );
			}

			// Assign a dummy image ID to force the replace/edit button to appear.
			if ( pbsParams.dummy_image_id ) {
				elements = childNode.querySelectorAll( 'img' );
				/* jshint loopfunc:true */
				Array.prototype.forEach.call( elements, function( el ) {
					el.classList.add( 'wp-image-' + pbsParams.dummy_image_id );
				} );
			}

			element = cls.fromDOMElement( childNode );

			if ( element ) {
				createdElements.push( element );
			}
		}

		// Reset our special global.
		PBSEditor._justAddedDesignElement = null;

		return createdElements;
	};

	return Predesigned;

} )( ContentTools.Tools.ElementButton );

/* globals ContentTools, __extends, ContentEdit, pbsParams */

ContentTools.Tools.Heading1 = ( function( _super ) {
	__extends( Heading1, _super );

	function Heading1() {
		return Heading1.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Heading1, 'h1' );

	Heading1.label = pbsParams.labels.heading_label.replace( '%d', '1' );

	Heading1.icon = 'h1';

	Heading1.tagName = 'h1';

	Heading1.canApply = function( element, selection ) {
		if ( 'ListItemText' === element.constructor.name ) {
			return false;
		}
		if ( 'TableCellText' === element.constructor.name ) {
			return false;
		}
		return ContentTools.Tools.Paragraph.canApply( element, selection );
	};

	Heading1.apply = function( element, selection, callback ) {

		var heading;
		if ( this.isApplied( element ) ) {
			return;
		}

		// If the element has no content, then add the new element after it.
		if ( ! element.content ) {
			heading = new ContentEdit.Text( this.tagName );
			element.parent().attach( heading, element.parent().children.indexOf( element ) + 1 );
			heading.focus();
			return callback( true );
		}
		return Heading1.__super__.constructor.apply.call( this, element, selection, callback );
	};

	Heading1.isApplied = function( element ) {
		return element.tagName() === this.tagName;
	};

	  return Heading1;

} )( ContentTools.Tools.Heading );

ContentTools.Tools.Heading2 = ( function( _super ) {
	__extends( Heading2, _super );

	function Heading2() {
		return Heading2.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Heading2, 'h2' );

	Heading2.label = pbsParams.labels.heading_label.replace( '%d', '2' );

	Heading2.icon = 'h2';

	Heading2.tagName = 'h2';

	return Heading2;

} )( ContentTools.Tools.Heading1 );

ContentTools.Tools.Heading3 = ( function( _super ) {
	__extends( Heading3, _super );

	function Heading3() {
		return Heading3.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Heading3, 'h3' );

	Heading3.label = pbsParams.labels.heading_label.replace( '%d', '3' );

	Heading3.icon = 'h3';

	Heading3.tagName = 'h3';

	return Heading3;

} )( ContentTools.Tools.Heading1 );

ContentTools.Tools.Heading4 = ( function( _super ) {
	__extends( Heading4, _super );

	function Heading4() {
		return Heading4.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Heading4, 'h4' );

	Heading4.label = pbsParams.labels.heading_label.replace( '%d', '4' );

	Heading4.icon = 'h4';

	Heading4.tagName = 'h4';

	return Heading4;

} )( ContentTools.Tools.Heading1 );

ContentTools.Tools.Heading5 = ( function( _super ) {
	__extends( Heading5, _super );

	function Heading5() {
		return Heading5.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Heading5, 'h5' );

	Heading5.label = pbsParams.labels.heading_label.replace( '%d', '5' );

	Heading5.icon = 'h5';

	Heading5.tagName = 'h5';

	return Heading5;

} )( ContentTools.Tools.Heading1 );

ContentTools.Tools.Heading6 = ( function( _super ) {
	__extends( Heading6, _super );

	function Heading6() {
		return Heading6.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Heading6, 'h6' );

	Heading6.label = pbsParams.labels.heading_label.replace( '%d', '6' );

	Heading6.icon = 'h6';

	Heading6.tagName = 'h6';

	return Heading6;

} )( ContentTools.Tools.Heading1 );

/* globals ContentTools, __extends, pbsParams */

ContentTools.Tools.Blockquote = ( function( _super ) {
  __extends( Blockquote, _super );

  function Blockquote() {
	return Blockquote.__super__.constructor.apply( this, arguments );
  }

  ContentTools.ToolShelf.stow( Blockquote, 'blockquote' );

  Blockquote.label = pbsParams.labels.blockquote;

  Blockquote.icon = 'blockquote';

  Blockquote.tagName = 'blockquote';

  return Blockquote;

} )( ContentTools.Tools.Heading1 );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Carousel = ( function( _super ) {
	__extends( Carousel, _super );

	function Carousel() {
		return Carousel.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Carousel, 'carousel' );

	Carousel.label = pbsParams.labels.carousel;

	Carousel.icon = 'carousel';

	Carousel.tagName = 'carousel';

	Carousel.buttonName = pbsParams.labels.carousel;

	Carousel.premium = true;

	Carousel.apply = function( element, selection, callback ) {

		var index;

		// Don't allow carousels to be created inside carousels, create it after the current carousel.
		if ( window.pbsSelectorMatches( element._domElement, '[data-ce-tag="carousel"] *' ) ) {
			while ( element && 'Carousel' !== element.constructor.name ) {
				element = element.parent();
			}
		}

		index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Carousel.createNew = function( parent, index ) {
		var newElem;
		var elem = document.createElement( 'div' );
		elem.setAttribute( 'data-ce-tag', 'carousel' );

		/* jshint multistr: true */
		elem.innerHTML =
			'<div class="pbs-row" style="min-height: 200px;"><div class="pbs-col" style="justify-content: center;"><p>Slide 1</p></div></div>' +
			'<div class="pbs-row" style="min-height: 200px;"><div class="pbs-col" style="justify-content: center;"><p>Slide 2</p></div></div>' +
			'<div class="pbs-row" style="min-height: 200px;"><div class="pbs-col" style="justify-content: center;"><p>Slide 3</p></div></div>';

		newElem = ContentEdit.Carousel.fromDOMElement( elem );

		parent.attach( newElem, index );

		newElem.focus();
	};

	return Carousel;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Newsletter = ( function( _super ) {
	__extends( Newsletter, _super );

	function Newsletter() {
		return Newsletter.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Newsletter, 'newsletter' );

	Newsletter.label = pbsParams.labels.newsletter_signup_form;

	Newsletter.icon = 'newsletter';

	Newsletter.tagName = 'newsletter';

	Newsletter.buttonName = pbsParams.labels.newsletter;

	Newsletter.premium = true;

	Newsletter.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Newsletter.createNew = function( parent, index ) {

		var newElem;
		var elem = document.createElement( 'p' );
		elem.setAttribute( 'data-ce-tag', 'newsletter' );

		/* jshint multistr: true */
		elem.innerHTML = '<input placeholder="' + pbsParams.labels.your_email_address + '" type="text"><a class="pbs-button" href="#">' + pbsParams.labels.newsletter_default_button + '</a>';

		newElem = ContentEdit.Newsletter.fromDOMElement( elem );

		parent.attach( newElem, index );

		newElem.focus();
	};

	return Newsletter;

} )( ContentTools.Tools.ElementButton );

/* globals ContentTools, __extends, pbsParams */

ContentTools.Tools.ClearFormatting = ( function( _super ) {
	__extends( ClearFormatting, _super );

	function ClearFormatting() {
		return ClearFormatting.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( ClearFormatting, 'clear-formatting' );

	ClearFormatting.label = pbsParams.labels.clear_formatting;

	ClearFormatting.icon = 'clear-formatting';

	ClearFormatting.tagName = 'span';

	/**
	 * Disable the button if there's NO styling applied in the content.
	 */
	ClearFormatting.canApply = function( element, selection ) {
		var from = 0, to = 0, _ref;

		if ( ! ContentTools.Tools.Bold.canApply( element, selection ) ) {
			return false;
		}

		if ( element.content === void 0 || ! element.content.length() ) {
			return false;
		}

		if ( selection ) {
			_ref = selection.get(), from = _ref[0], to = _ref[1];
		}

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		if ( element.content.hasStyle( from, to ) ) {
			return true;
		}

		if ( element._domElement ) {
			if ( element._domElement.getAttribute( 'style' ) ) {
				return true;
			}
		}

		if ( ContentTools.Tools.Align.isApplied( element, selection ) ) {
			return true;
		}

		if ( 'undefined' !== typeof ContentTools.Tools.LineHeight ) {
			if ( ContentTools.Tools.LineHeight.isApplied( element ) ) {
				return true;
			}
		}

		return false;
	};

	ClearFormatting.apply = function( element, selection, callback ) {
		var from, to, _ref;
		element.storeState();

		if ( selection ) {
			_ref = selection.get(), from = _ref[0], to = _ref[1];
		}

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		element.content = element.content.removeStyles( from, to );
		if ( 'undefined' !== typeof ContentTools.Tools.LineHeight ) {
			ContentTools.Tools.LineHeight.apply( element, selection, function() {}, 'reset' );
		}
		if ( 'undefined' !== typeof ContentTools.Tools.FontPicker ) {
			ContentTools.Tools.FontPicker.apply( element, selection, function() {}, 'reset' );
		}
		ContentTools.Tools.Align._apply( 'reset' );

		element.removeAttr( 'style' );

		element.updateInnerHTML();
		element.taint();
		element.restoreState();
		return callback( true );
	};

  return ClearFormatting;

} )( ContentTools.Tool );

/* globals ContentTools, HTMLString, __extends, pbsParams */

ContentTools.Tools.Code = ( function( _super ) {
	__extends( Code, _super );

	function Code() {
		return Code.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Code, 'code' );

	Code.label = pbsParams.labels.code;

	Code.icon = 'code';

	Code.tagName = 'code';

	Code.canApply = function( element, selection ) {
		var _ref, from, to;
		if ( ! selection ) {
			return false;
		}
		_ref = selection.get();
		from = _ref[0];
		to = _ref[1];
		return from !== to;
	};

	// This is the original apply function of Bold that ONLY uses tags.
	Code.apply = function( element, selection, callback ) {
		var from, to, _ref;
		element.storeState();
		_ref = selection.get(), from = _ref[0], to = _ref[1];
		if ( this.isApplied( element, selection ) ) {
			element.content = element.content.unformat( from, to, new HTMLString.Tag( this.tagName ) );
		} else {
			element.content = element.content.format( from, to, new HTMLString.Tag( this.tagName ) );
		}
		element.updateInnerHTML();
		element.taint();
		element.restoreState();
		return callback( true );
	};

	Code.isApplied = function( element, selection ) {
		var from, to, _ref;

		if ( selection ) {

			// From the original Bold.isApplied
			if ( element.content === void 0 || ! element.content.length() ) {
				return false;
			}
			_ref = selection.get(), from = _ref[0], to = _ref[1];
			if ( from === to ) {
				to += 1;
			}
			return element.content.slice( from, to ).hasTags( this.tagName, true );
		}

		return false;
	};

  return Code;

} )( ContentTools.Tools.Bold );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Embed = ( function( _super ) {
	__extends( Embed, _super );

	function Embed() {
		return Embed.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Embed, 'embed' );

	Embed.label = pbsParams.labels.embed;

	Embed.icon = 'embed';

	Embed.tagName = 'div';

	Embed.buttonName = pbsParams.labels.embed;

	Embed.canApply = function() {
		return true;
	};

	Embed.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Embed.createNew = function( parent, index ) {
		var embed = ContentEdit.Embed.create( 'https://wordpress.org/plugins/page-builder-sandwich/' );
		parent.attach( embed, index );
		embed.updateEmbedContent();
	};

	return Embed;

} )( ContentTools.Tool );

/* globals ContentTools, ContentEdit, __extends, pbsParams */

ContentTools.Tools.Color = ( function( _super ) {
	__extends( Color, _super );

	function Color() {
		return Color.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Color, 'color' );

	Color.label = pbsParams.labels.color;

	Color.icon = 'color';

	Color.tagName = 'span';

	Color.canApply = function( element, selection ) {

		var from, to, _ref, selectedContent, matches, s;
		var apply = selection && ! selection.isCollapsed();
		var color = '';

		// Don't do anything when there's no text
		if ( ! element.content ) {
			return false;
		}

		apply = selection && ! selection.isCollapsed();

		// Find the selected text, if nothing's selected, make the whole area selected.
		if ( apply ) {
			_ref = selection.get();
			from = _ref[0];
			to = _ref[1];
			if ( from === to ) {
				to += 1;
			}
		} else {
			from = 0;
			to = element.content.length();
		}

		// Find the color from the span
		selectedContent = element.content.slice( from, to ).html();
		matches = selectedContent.match( /^<span[^>]style[^>]+['"\s;]color:\s?([#().,\w]+)/ );
		if ( matches ) {
			color = matches[1];
		} else {
		}

		// Change the tool's color to the color found
		if ( ! color ) {
			if ( 'undefined' === typeof this._defaultBodyTextColor ) {
				s = getComputedStyle( document.body );
				this._defaultBodyTextColor = s.color;
			}
			color = this._defaultBodyTextColor;
		}

		if ( this._ceElement._domElement.style.backgroundColor !== color ) {
			this._ceElement._domElement.style.backgroundColor = color;
		}

		if ( color ) {
			window.PBSEditor.getToolUI( this.icon )._domElement.setAttribute( 'data-tooltip', this.label + ': ' + color );
		} else {
			window.PBSEditor.getToolUI( this.icon )._domElement.setAttribute( 'data-tooltip', this.label );
		}

		return color;
	};

	Color.isApplied = function() {
		return false;
	};

	Color.applyColor = function( color, element, selection ) {
		var _ref, from, to;

		if ( ! element.isMounted() ) {
			return;
		}

		if ( selection ) {
			_ref = selection.get(), from = _ref[0], to = _ref[1];
		}

		// If nothing is selected, color the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		element.content = element.content.style( from, to, element._tagName, { 'color': color } );

		element.updateInnerHTML();
		element.taint();
		element.restoreState();
	};

	Color.apply = function( element, selection, callback ) {
		var currColor;

		// When text has been selected before, change that (the text loses focus when manually entering a color, the text is stored here).
		if ( this.rememberedSelection ) {
			selection = this.rememberedSelection;
		}

		// Get the iris color
		currColor = jQuery( this._ceElement._domElement.querySelector( 'input' ) ).iris( 'color' );
		if ( '' === this._ceElement._domElement.querySelector( 'input' ).value ) {
			currColor = '';
		}

		// Apply the new color
		this.applyColor( currColor, element, selection );

		wp.hooks.doAction( 'pbs.tool.color.applied', element );

		return callback( true );
	};

	Color.mountPopup = function() {
		var _this = this;
		var o = document.createElement( 'INPUT' );

		Color.__super__.constructor.mountPopup.call( this );

		// When the input field is clicked, remember if we had text selected before since we lose the focus on that one.
		o.addEventListener( 'mousedown', function() {
			var _ref, from, to, element = ContentEdit.Root.get().focused();
	        var selection = null;
	        if ( element.selection ) {
	          selection = element.selection();
	        }
			_ref = selection.get(), from = _ref[0], to = _ref[1];
			if ( ! ( 0 === from && 0 === to ) ) {
				_this.rememberedSelection = selection;
			}
		} );

		// When typing in the input field, trigger the color to be cleared when empty.
		o.addEventListener( 'keyup', function( e ) {
			if ( '' === e.target.value ) {
				_this.selectedColor = e.target.value;
				_this._ceElement._mouseDown = true; // Stop other tool behavior.
				_this._ceElement._onMouseUp();
				jQuery( _this._ceElement._domElement.querySelector( 'input' ) ).iris( 'color', _this.selectedColor );
				e.target.focus();
			}
		} );

		o.classList.add( 'color-picker' );
		o.setAttribute( 'data-alpha', 'true' );
		this.popup.appendChild( o );

		// Initialize the color picker
		jQuery( o ).iris( {
			defaultColor: this._ceElement._domElement.style.backgroundColor,
			change: function( event ) {
				if ( ! _this._ceElement._justShowedPicker ) {
					_this.selectedColor = event.target.value;
					_this._ceElement._mouseDown = true;
					_this._ceElement._onMouseUp( event );
				}
				_this._ceElement._justShowedPicker = undefined;
			},

			// A callback to fire when the input is emptied or an invalid color (doesn't work).
			clear: function() {},

			// Hide the color picker controls on load.
			hide: false,

			// Add our own pretty colors
			palettes: [
				'#282425', '#3d3a3b', '#555152', '#6b6969', '#838181', '#9b999a', '#b4b1b2', '#cccbcb', '#e5e4e4', '#ffffff',
				'#fd3d3f', '#f70363', '#eb389a', '#a812a9', '#7330b0', '#4b4bae', '#1490ec', '#00a4ed', '#00bacf', '#009586',
				'#e1d6b8', '#5b7b88', '#7c554a', '#fe5234', '#fe9631', '#fec03b', '#fbec57', '#c2dd52', '#75c457', '#12b059'
			]
		} );

	};

	Color.hidePopup = function() {

		Color.__super__.constructor.hidePopup.call( this );

		// Forget the previously selected text.
		this.rememberedSelection = null;
	};

	Color.showPopup = function() {

		var element, elements;

		Color.__super__.constructor.showPopup.call( this );

		// Set the input field's value
		this._ceElement._domElement.querySelector( 'input' ).value = this._ceElement._domElement.style.backgroundColor;

		// Set the color
		this._ceElement._justShowedPicker = true; // Do not implement the selected color when just showing the picker
		jQuery( this._ceElement._domElement.querySelector( 'input' ) ).iris( 'color', this._ceElement._domElement.style.backgroundColor );

		// Show the color picker
		element = ContentEdit.Root.get().focused();
		if ( element.selection ) {
			this._ceElement.tool.rememberedSelection = element.selection();
		}
		this._ceElement._domElement.querySelector( 'input' ).focus();
		this._ceElement._domElement.querySelector( 'input' ).select();

		// Don't lose the focus when a palette color is clicked
		elements = this._ceElement._domElement.querySelectorAll( '.iris-palette' );
		Array.prototype.forEach.call( elements, function( el ) {
			if ( 'undefined' === typeof el._pbsInitDone ) {
				el._pbsInitDone = true;
				el.addEventListener( 'mousedown', function( e ) {
					e.preventDefault();
				} );
			}
		} );
	};

	return Color;

} )( ContentTools.Tools.BasePopup );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.TwoColumn = ( function( _super ) {
	__extends( OneColumn, _super );

	function OneColumn() {
		return OneColumn.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( OneColumn, 'onecolumn' );

	OneColumn.label = pbsParams.labels.one_column;

	OneColumn.icon = 'onecolumn';

	OneColumn.tagName = 'onecolumn';

	OneColumn.buttonName = pbsParams.labels.one_column;

	OneColumn.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		element.blur();
		this.createNew( element.parent(), index );
		return callback( true );
	};

	OneColumn.createNew = function( parent, index ) {
		var row = new ContentEdit.DivRow( 'div' );
		var col = new ContentEdit.DivCol( 'div' );
		var p = new ContentEdit.Text( 'p', {}, '' );
		parent.attach( row, index );

		row.attach( col );
		col.attach( p );

		p.focus();

		col.style( 'justify-content', 'center' );
		row.style( 'min-height', '200px' );

		wp.hooks.doAction( 'pbs.tool.row.applied', row );
	};

	return OneColumn;

} )( ContentTools.Tools.ElementButton );

ContentTools.Tools.TwoColumn = ( function( _super ) {
	__extends( TwoColumn, _super );

	function TwoColumn() {
		return TwoColumn.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( TwoColumn, 'twocolumn' );

	TwoColumn.label = pbsParams.labels.two_column;

	TwoColumn.icon = 'twocolumn';

	TwoColumn.tagName = 'twocolumn';

	TwoColumn.buttonName = pbsParams.labels.two_column;

	TwoColumn.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		element.blur();
		this.createNew( element.parent(), index );
		return callback( true );
	};

	TwoColumn.createNew = function( parent, index ) {
		var row = new ContentEdit.DivRow( 'div' );
		var col = new ContentEdit.DivCol( 'div' );
		var p = new ContentEdit.Text( 'p', {}, '' );
		parent.attach( row, index );
		row.attach( col );
		col.attach( p );
		p.focus();
		col.style( 'flex-basis', '50%' );
		col.style( 'justify-content', 'center' );
		col = new ContentEdit.DivCol( 'div' );
		p = new ContentEdit.Text( 'p', {}, '' );
		row.attach( col );
		col.attach( p );
		col.style( 'flex-basis', '50%' );
		col.style( 'justify-content', 'center' );
		row.style( 'min-height', '200px' );
	};

	return TwoColumn;

} )( ContentTools.Tools.ElementButton );

ContentTools.Tools.ThreeColumn = ( function( _super ) {
	__extends( ThreeColumn, _super );

	function ThreeColumn() {
		return ThreeColumn.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( ThreeColumn, 'threecolumn' );

	ThreeColumn.label = pbsParams.labels.three_column;

	ThreeColumn.icon = 'threecolumn';

	ThreeColumn.tagName = 'threecolumn';

	ThreeColumn.buttonName = pbsParams.labels.three_column;

	ThreeColumn.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		element.blur();
		this.createNew( element.parent(), index );
		return callback( true );
	};

	ThreeColumn.createNew = function( parent, index ) {
		var row = new ContentEdit.DivRow( 'div' );
		var col = new ContentEdit.DivCol( 'div' );
		var p = new ContentEdit.Text( 'p', {}, '' );
		parent.attach( row, index );
		row.attach( col );
		col.attach( p );
		p.focus();
		col.style( 'flex-basis', '33.33%' );
		col.style( 'justify-content', 'center' );
		col = new ContentEdit.DivCol( 'div' );
		p = new ContentEdit.Text( 'p', {}, '' );
		row.attach( col );
		col.attach( p );
		col.style( 'flex-basis', '33.33%' );
		col.style( 'justify-content', 'center' );
		col = new ContentEdit.DivCol( 'div' );
		p = new ContentEdit.Text( 'p', {}, '' );
		row.attach( col );
		col.attach( p );
		col.style( 'flex-basis', '33.33%' );
		col.style( 'justify-content', 'center' );
		row.style( 'min-height', '200px' );
	};

	return ThreeColumn;

} )( ContentTools.Tools.ElementButton );

ContentTools.Tools.FourColumn = ( function( _super ) {
	__extends( FourColumn, _super );

	function FourColumn() {
		return FourColumn.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( FourColumn, 'fourcolumn' );

	FourColumn.label = pbsParams.labels.four_column;

	FourColumn.icon = 'fourcolumn';

	FourColumn.tagName = 'fourcolumn';

	FourColumn.buttonName = pbsParams.labels.four_column;

	FourColumn.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		element.blur();
		this.createNew( element.parent(), index );
		return callback( true );
	};

	FourColumn.createNew = function( parent, index ) {
		var row = new ContentEdit.DivRow( 'div' );
		var col = new ContentEdit.DivCol( 'div' );
		var p = new ContentEdit.Text( 'p', {}, '' );
		parent.attach( row, index );
		row.attach( col );
		col.attach( p );
		p.focus();
		col.style( 'flex-basis', '25%' );
		col.style( 'justify-content', 'center' );
		col = new ContentEdit.DivCol( 'div' );
		p = new ContentEdit.Text( 'p', {}, '' );
		row.attach( col );
		col.attach( p );
		col.style( 'flex-basis', '25%' );
		col.style( 'justify-content', 'center' );
		col = new ContentEdit.DivCol( 'div' );
		p = new ContentEdit.Text( 'p', {}, '' );
		row.attach( col );
		col.attach( p );
		col.style( 'flex-basis', '25%' );
		col.style( 'justify-content', 'center' );
		col = new ContentEdit.DivCol( 'div' );
		p = new ContentEdit.Text( 'p', {}, '' );
		row.attach( col );
		col.attach( p );
		col.style( 'flex-basis', '25%' );
		col.style( 'justify-content', 'center' );
		row.style( 'min-height', '200px' );
	};

	return FourColumn;

} )( ContentTools.Tools.ElementButton );

/* globals ContentTools, __extends, pbsParams */

ContentTools.Tools.InsertElement = ( function( _super ) {
	__extends( InsertElement, _super );

	function InsertElement() {
		return InsertElement.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( InsertElement, 'insertElement' );

	InsertElement.label = '';

	InsertElement.icon = 'insert-element';

	InsertElement.className = '';

	InsertElement.apply = function( element, selection, callback ) {
		if ( window.PBSEditor.ToolboxElements ) {
			window.PBSEditor.ToolboxElements.getInstance().toggle();
		}
		return callback( true );
	};

	InsertElement.canApply = function() {
		return true;
	};

	return InsertElement;

} )( ContentTools.Tool );

/**
 * Add a label in the add element tool.
 */
( function() {
	var proxied = ContentTools.ToolUI.prototype.mount;
	ContentTools.ToolUI.prototype.mount = function( domParent, before ) {
		var ret = proxied.call( this, domParent, before );
		if ( this._domElement.classList.contains( 'ct-tool--insert-element' ) ) {

			// Add the button label.
			this._domElement.innerHTML = '<span here123>' + pbsParams.labels.add_element + '</span>';

			// Show the toolbar when hovering over the add element button.
			this._toolboxElementsHoverShow = function() {
				if ( window.PBSEditor.ToolboxElements ) {
					window.PBSEditor.ToolboxElements.getInstance().show();
				}
			};
			this._domElement.addEventListener( 'mouseenter', this._toolboxElementsHoverShow );

			// Hide the toolbar when leaving the button.
			this._toolboxElementsLeaveHide = function( ev ) {

				var toolbox = window.PBSEditor.ToolboxElements;

				if ( ! toolbox ) {
					return;
				}

				toolbox = toolbox.getInstance();

				// Only hide the button if it didn't mouse over the add elements panel.
				if ( ev.relatedTarget ) {
					if ( ! toolbox._domElement.contains( ev.relatedTarget ) && toolbox._domElement !== ev.relatedTarget ) {
						toolbox.hide();
					}
				} else {
					toolbox.hide();
				}
			};
			this._domElement.addEventListener( 'mouseleave', this._toolboxElementsLeaveHide );
		}
		return ret;
	};
} )();

( function() {
   var proxied = ContentTools.ToolUI.prototype.unmount;
   ContentTools.ToolUI.prototype.unmount = function( t, e ) {
	   if ( this._domElement.classList.contains( 'ct-tool--insert-element' ) ) {

		   // Remove all events we added during mount.
		   this._domElement.removeEventListener( 'mouseenter', this._toolboxElementsHoverShow );
		   this._domElement.removeEventListener( 'mouseleave', this._toolboxElementsLeaveHide );

	   }
	   return proxied.call( this, t, e );
   };
} )();

/* globals ContentTools, __extends, pbsParams, ContentEdit */

var defaultAlign;

( function() {
	var ready = function() {
		defaultAlign = getComputedStyle( document.querySelector( 'html' ) ).textAlign;
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

ContentTools.Tools.Align = ( function( _super ) {
	__extends( Align, _super );

	function Align() {
		return Align.__super__.constructor.apply( this, arguments );
	}

	Align.displayRule = 'flex';

	ContentTools.ToolShelf.stow( Align, 'align' );

	Align.label = pbsParams.labels.alignment;
	Align.labelDown = pbsParams.labels.alignment;
	Align.labelReset = pbsParams.labels.reset_alignment;

	Align.labelLeft = pbsParams.labels.align_left;
	Align.labelCenter = pbsParams.labels.align_center;
	Align.labelRight = pbsParams.labels.align_right;
	Align.labelJustify = pbsParams.labels.justify;

	Align.icon = 'align';

	Align.tagName = 'span';

	Align.canApply = function( element, selection ) {
		if ( 'Icon' === element.constructor.name ) {
			return true;
		}
		return ContentTools.Tools.Bold.canApply( element, selection );
	};

	Align.isApplied = function( element ) {
		var align;
		if ( 'Icon' === element.constructor.name ) {
			return element.hasCSSClass( 'alignleft' ) || element.hasCSSClass( 'alignright' ) || element.hasCSSClass( 'aligncenter' );
		} else {
			align = element.style( 'textAlign' );
			if ( ! window.pbsIsRTL() && ( 'start' === align || 'left' === align ) && ( 'start' === defaultAlign || 'left' === defaultAlign ) ) {
				return false;
			}
			if ( window.pbsIsRTL() && ( 'start' === align || 'right' === align ) && ( 'start' === defaultAlign || 'right' === defaultAlign ) ) {
				return false;
			}
			return true;
		}
	};

	Align.apply = function( element, selection, callback ) {
		return callback( true );
	};

	Align._apply = function( alignment, button ) {
		var element = ContentEdit.Root.get().focused();
		if ( button ) {
			if ( button.classList.contains( '.ct-tool--disabled' ) || button.classList.contains( 'ct-tool--applied' ) ) {
				return;
			}
		}

		if ( 'Icon' === element.constructor.name ) {
			element.removeCSSClass( 'alignleft' );
			element.removeCSSClass( 'alignright' );
			element.removeCSSClass( 'aligncenter' );
			element.removeCSSClass( 'alignnone' );
			if ( 'reset' !== alignment ) {
				element.addCSSClass( 'align' + alignment );
			}
		} else {
			if ( 'reset' !== alignment ) {
				element.style( 'textAlign', alignment );
			} else {
				element.style( 'textAlign', '' );
			}
		}

		if ( button ) {
			button.parentNode.querySelector( '.ct-tool--applied' ).classList.remove( 'ct-tool--applied' );
			button.classList.add( 'ct-tool--applied' );
		}
	};

	Align.mountPopup = function() {

		var alignLeft = document.createElement( 'DIV' );
		var alignCenter = document.createElement( 'DIV' );
		var alignRight = document.createElement( 'DIV' );
		var alignJustify = document.createElement( 'DIV' );

		Align.__super__.constructor.mountPopup.call( this );

		alignLeft.classList.add( 'ct-tool' );
		alignCenter.classList.add( 'ct-tool' );
		alignRight.classList.add( 'ct-tool' );
		alignJustify.classList.add( 'ct-tool' );
		alignLeft.classList.add( 'ct-tool--align-left' );
		alignCenter.classList.add( 'ct-tool--align-center' );
		alignRight.classList.add( 'ct-tool--align-right' );
		alignJustify.classList.add( 'ct-tool--align-justify' );

		alignLeft.setAttribute( 'data-tooltip', this.labelLeft );
		alignCenter.setAttribute( 'data-tooltip', this.labelCenter );
		alignRight.setAttribute( 'data-tooltip', this.labelRight );
		alignJustify.setAttribute( 'data-tooltip', this.labelJustify );

		this.popup.appendChild( alignLeft );
		this.popup.appendChild( alignCenter );
		this.popup.appendChild( alignRight );
		this.popup.appendChild( alignJustify );

		this.alignLeft = alignLeft;
		this.alignCenter = alignCenter;
		this.alignRight = alignRight;
		this.alignJustify = alignJustify;

		alignLeft.addEventListener( 'click', function( e ) {
			this._apply( 'left', e.target );
		}.bind( this ) );
		alignCenter.addEventListener( 'click', function( e ) {
			this._apply( 'center', e.target );
		}.bind( this ) );
		alignRight.addEventListener( 'click', function( e ) {
			this._apply( 'right', e.target );
		}.bind( this ) );
		alignJustify.addEventListener( 'click', function( e ) {
			this._apply( 'justify', e.target );
		}.bind( this ) );
	};

	Align.showPopup = function() {
		var _ref, element = ContentEdit.Root.get().focused();

		Align.__super__.constructor.showPopup.call( this );

		if ( 'ListItemText' === ( _ref = element.type() ) || 'TableCellText' === _ref ) {
			element = element.parent();
		}

		this.alignLeft.classList.remove( 'ct-tool--applied' );
		this.alignCenter.classList.remove( 'ct-tool--applied' );
		this.alignRight.classList.remove( 'ct-tool--applied' );
		this.alignJustify.classList.remove( 'ct-tool--applied' );

		if ( 'Icon' === element.constructor.name ) {
			if ( element.hasCSSClass( 'alignleft' ) ) {
				this.alignLeft.classList.add( 'ct-tool--applied' );
			} else if ( element.hasCSSClass( 'alignright' ) ) {
				this.alignRight.classList.add( 'ct-tool--applied' );
			} else {
				this.alignCenter.classList.add( 'ct-tool--applied' );
			}
			this.alignJustify.classList.add( 'ct-tool--disabled' );

		} else {

			if ( 'left' === element.style( 'textAlign' ) || 'start' === element.style( 'textAlign' ) ) {
				this.alignLeft.classList.add( 'ct-tool--applied' );
			} else if ( 'right' === element.style( 'textAlign' ) || 'end' === element.style( 'textAlign' ) ) {
				this.alignRight.classList.add( 'ct-tool--applied' );
			} else if ( 'center' === element.style( 'textAlign' ) ) {
				this.alignCenter.classList.add( 'ct-tool--applied' );
			} else if ( 'justify' === element.style( 'textAlign' ) ) {
				this.alignJustify.classList.add( 'ct-tool--applied' );
			}
			this.alignJustify.classList.remove( 'ct-tool--disabled' );
		}
	};

	return Align;

} )( ContentTools.Tools.BasePopup );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Spacer = ( function( _super ) {
	__extends( Spacer, _super );

	function Spacer() {
		return Spacer.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Spacer, 'spacer' );

	Spacer.label = pbsParams.labels.spacer;

	Spacer.icon = 'spacer';

	Spacer.tagName = 'div';

	Spacer.buttonName = pbsParams.labels.spacer;

	Spacer.canApply = function() {
		return true;
	};

	Spacer.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Spacer.createNew = function( parent, index ) {
		var spacer = new ContentEdit.Spacer( 'div' );

		parent.attach( spacer, index );
	};

	return Spacer;

} )( ContentTools.Tool );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Sidebar = ( function( _super ) {
	__extends( Sidebar, _super );

	function Sidebar() {
		return Sidebar.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Sidebar, 'sidebar' );

	Sidebar.label = pbsParams.labels.sidebar_or_widget_area;

	Sidebar.icon = 'sidebar';

	Sidebar.tagName = 'sidebar';

	Sidebar.buttonName = pbsParams.labels.sidebar;

	Sidebar.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Sidebar.createNew = function( parent, index ) {
		var sidebarID, shortcode, newElem;
		var defaultSidebar = '';
		for ( sidebarID in pbsParams.sidebar_list ) {
			if ( sidebarID ) {
				if ( pbsParams.sidebar_list.hasOwnProperty( sidebarID ) ) {
					defaultSidebar = sidebarID;
					break;
				}
			}
		}

		shortcode = wp.shortcode.next( 'pbs_sidebar', '[pbs_sidebar id="' + defaultSidebar + '"][/pbs_sidebar]', 0 );
		newElem = ContentEdit.Shortcode.createShortcode( shortcode );

		parent.attach( newElem, index );

		newElem.ajaxUpdate( true );
		newElem.focus();
	};

	return Sidebar;

} )( ContentTools.Tools.ElementButton );

/* globals ContentTools, __extends, pbsParams */

/**
 * Font Sizes are responsive and are of the form:
 * calc( 1rem + 1vw );
 *
 * The 1vw above changes when using the font-size tool.
 */

var oneRem;

( function() {
	var ready = function() {
		oneRem = parseInt( getComputedStyle( document.querySelector( 'html' ) ).fontSize, 10 );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

ContentTools.Tools.FontSizeUp = ( function( _super ) {
	__extends( FontSizeUp, _super );

	function FontSizeUp() {
		return FontSizeUp.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( FontSizeUp, 'font-size-up' );

	FontSizeUp.label = pbsParams.labels.increase_font_size + ' {0}';
	FontSizeUp.labelDown = pbsParams.labels.increase_font_size + ' {0}';
	FontSizeUp.labelReset = pbsParams.labels.reset_font_size;

	FontSizeUp.icon = 'font-size-up';

	FontSizeUp.tagName = 'span';

	FontSizeUp.canApply = function( element, selection ) {
		return ContentTools.Tools.Bold.canApply( element, selection );
	};

	FontSizeUp.isApplied = function( element, selection ) {
		var from = 0, to = 0, _ref, fontSize;
		if ( element.content === void 0 || ! element.content.length() ) {
			return false;
		}
		if ( selection ) {
			_ref = selection.get(), from = _ref[0], to = _ref[1];
		}

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		// Update the label with the current size.
		fontSize = element.content.substring( from, to ).getStyle( 'font-size', element );
		if ( fontSize.indexOf( 'vw' ) !== -1 ) {
			fontSize = /(-?\s?[\d\.]+)vw/gi.exec( fontSize )[1].replace( / /, '' );
			this.refreshTooltip( ( oneRem + window.innerWidth * fontSize / 100 ).toFixed( 1 ) + 'px' );
		} else if ( fontSize.indexOf( 'px' ) !== -1 ) {
			this.refreshTooltip( fontSize.replace( /px/i, '' ) + 'px' );
		}

		return element.content.hasStyle( from, to, 'font-size' );
	};

	FontSizeUp.doHold = function( element, selection ) {
		return this.apply( element, selection, function() {} );
	};

	FontSizeUp.apply = function( element, selection, callback, force ) {

		var _ref, from, to, fontSize, newStyle;
		element.storeState();

		if ( selection ) {
			_ref = selection.get(), from = _ref[0], to = _ref[1];
		}

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		// Get the current styles and add a font-size
		fontSize = element.content.substring( from, to ).getStyle( 'font-size', element );
		if ( fontSize.indexOf( 'vw' ) !== -1 ) {
			fontSize = /(-?\s?[\d\.]+)vw/gi.exec( fontSize )[1].replace( / /, '' );
			fontSize = parseFloat( fontSize );
		} else {
			fontSize = ( ( parseFloat( fontSize ) / oneRem - 1 ) * oneRem ) / ( window.innerWidth / 100 );
		}

		if ( 'reset' === force || ( window.PBSEditor.isShiftDown && window.PBSEditor.isCtrlDown ) ) {
			fontSize = 0;
		} else {
			fontSize += 0.05;
		}

		fontSize = parseFloat( fontSize.toFixed( 2 ) );

		newStyle = { 'font-size': 'calc(1rem + ' + fontSize + 'vw)' };
		element.content = element.content.style( from, to, element._tagName, newStyle );

		element.updateInnerHTML();
		element.taint();
		element.restoreState();
		return callback( true );
	};

	return FontSizeUp;

 } )( ContentTools.Tool );

 ContentTools.Tools.FontSizeDown = ( function( _super ) {
	__extends( FontSizeDown, _super );

	function FontSizeDown() {
		return FontSizeDown.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( FontSizeDown, 'font-size-down' );

	FontSizeDown.label = pbsParams.labels.decrease_font_size + ' {0}';
	FontSizeDown.labelDown = pbsParams.labels.decrease_font_size + ' {0}';
	FontSizeDown.labelReset = pbsParams.labels.reset_font_size;

	FontSizeDown.icon = 'font-size-down';

	FontSizeDown.tagName = 'span';

	FontSizeDown.canApply = function( element, selection ) {
		return ContentTools.Tools.Bold.canApply( element, selection );
	};

	FontSizeDown.isApplied = function( element, selection ) {
		var from = 0, to = 0, _ref, fontSize;
		if ( element.content === void 0 || ! element.content.length() ) {
			return false;
		}
		if ( selection ) {
			_ref = selection.get(), from = _ref[0], to = _ref[1];
		}

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		// Update the label with the current size.
		fontSize = element.content.substring( from, to ).getStyle( 'font-size', element );
		if ( fontSize.indexOf( 'vw' ) !== -1 ) {
			fontSize = /(-?\s?[\d\.]+)vw/gi.exec( fontSize )[1].replace( / /, '' );
			this.refreshTooltip( ( oneRem + window.innerWidth * fontSize / 100 ).toFixed( 1 ) + 'px' );
		} else if ( fontSize.indexOf( 'px' ) !== -1 ) {
			this.refreshTooltip( fontSize.replace( /px/i, '' ) + 'px' );
		}

		return element.content.hasStyle( from, to, 'font-size' );
	};

	FontSizeDown.doHold = function( element, selection ) {
		return this.apply( element, selection, function() {} );
	};

	FontSizeDown.apply = function( element, selection, callback, force ) {

		var _ref, from, to, fontSize, newStyle, sign = '+';
		element.storeState();

		if ( selection ) {
			_ref = selection.get(), from = _ref[0], to = _ref[1];
		}

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		// Get the current styles and add a font-size
		fontSize = element.content.substring( from, to ).getStyle( 'font-size', element );
		if ( fontSize.indexOf( 'vw' ) !== -1 ) {
			fontSize = /(-?\s?[\d\.]+)vw/gi.exec( fontSize )[1].replace( / /, '' );
			fontSize = parseFloat( fontSize );
		} else {
			fontSize = ( ( parseFloat( fontSize ) / oneRem - 1 ) * oneRem ) / ( window.innerWidth / 100 );
		}

		if ( 'reset' === force || ( window.PBSEditor.isShiftDown && window.PBSEditor.isCtrlDown ) ) {
			fontSize = 0;
		} else if ( fontSize > -0.5 ) {
			fontSize -= 0.05;
		}

		fontSize = parseFloat( fontSize.toFixed( 2 ) );

		if ( fontSize ) {
			if ( fontSize < 0 ) {
				sign = '-';
				fontSize *= -1;
			}
			newStyle = { 'font-size': 'calc(1rem ' + sign + ' ' + fontSize + 'vw)' };
			element.content = element.content.style( from, to, element._tagName, newStyle );
		} else {
			element.content = element.content.removeStyle( from, to, 'font-size' );
		}

		element.updateInnerHTML();
		element.taint();
		element.restoreState();
		return callback( true );
	};

	return FontSizeDown;

  } )( ContentTools.Tool );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Hr = ( function( _super ) {
	__extends( Hr, _super );

	function Hr() {
		return Hr.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Hr, 'hr' );

	Hr.label = pbsParams.labels.horizontal_rule;

	Hr.icon = 'hr';

	Hr.tagName = 'hr';

	Hr.buttonName = pbsParams.labels.horizontal_rule;

	Hr.canApply = function() {
		return true;
	};

	Hr.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Hr.createNew = function( parent, index ) {
		var hr = new ContentEdit.Hr( 'hr' );

		parent.attach( hr, index );
	};

	return Hr;

} )( ContentTools.Tool );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Icon = ( function( _super ) {
	__extends( Icon, _super );

	function Icon() {
		return Icon.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Icon, 'icon' );

	Icon.label = pbsParams.labels.icon;

	Icon.icon = 'icon';

	Icon.tagName = 'icon';

	Icon.buttonName = pbsParams.labels.icon;

	Icon.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Icon.createNew = function( parent, index ) {
		var newElem = new ContentEdit.Icon(
			'div',
			{
				'style': 'fill: #5b7b88'
			},
			'<svg viewBox="0 0 24 28"><path d="M16 14q0-1.656-1.172-2.828T12 10t-2.828 1.172T8 14t1.172 2.828T12 18t2.828-1.172T16 14zm8-1.703v3.469q0 .187-.125.359t-.313.203l-2.891.438q-.297.844-.609 1.422.547.781 1.672 2.156.156.187.156.391t-.141.359q-.422.578-1.547 1.687t-1.469 1.109q-.187 0-.406-.141l-2.156-1.687q-.688.359-1.422.594-.25 2.125-.453 2.906-.109.438-.562.438h-3.469q-.219 0-.383-.133t-.18-.336l-.438-2.875q-.766-.25-1.406-.578L5.655 23.75q-.156.141-.391.141-.219 0-.391-.172-1.969-1.781-2.578-2.625-.109-.156-.109-.359 0-.187.125-.359.234-.328.797-1.039t.844-1.102q-.422-.781-.641-1.547l-2.859-.422q-.203-.031-.328-.195t-.125-.367v-3.469q0-.187.125-.359t.297-.203l2.906-.438q.219-.719.609-1.437-.625-.891-1.672-2.156-.156-.187-.156-.375 0-.156.141-.359.406-.562 1.539-1.68t1.477-1.117q.203 0 .406.156l2.156 1.672q.688-.359 1.422-.594.25-2.125.453-2.906.109-.437.562-.437h3.469q.219 0 .383.133t.18.336l.438 2.875q.766.25 1.406.578l2.219-1.672q.141-.141.375-.141.203 0 .391.156 2.016 1.859 2.578 2.656.109.125.109.344 0 .187-.125.359-.234.328-.797 1.039t-.844 1.102q.406.781.641 1.531l2.859.438q.203.031.328.195t.125.367z"></path></svg>' );

		parent.attach( newElem, index );
	};

	return Icon;

} )( ContentTools.Tools.ElementButton );

/* globals ContentTools, HTMLString, ContentSelect */

/**
 * Allow links to be placed when nothin is selected for link insertion.
 */
( function() {
	var proxied = ContentTools.Tools.Link.canApply;
	ContentTools.Tools.Link.canApply = function( element, selection ) {
		var _ref, from, to;
		var ret = proxied.call( this, element, selection );
		if ( ! ret ) {
			if ( element.content && selection ) {
				_ref = selection.get();
				from = _ref[0];
				to = _ref[1];
				if ( from === to ) {
					return true;
				}
			}
		}
		return ret;
	};
} )();

ContentTools.Tools.Link.getSelectedLink = function( element, from, to ) {

	// The start should be the start of the link block if possible.
	if ( from < element.content.characters.length && from >= 0 ) {
		if ( element.content.characters[ from ].hasTags( 'a' ) ) {
			while ( from > 0 ) {
				from--;
				if ( ! element.content.characters[ from ].hasTags( 'a' ) ) {
					from++;
					break;
				}
			}
		}
	}

	// The end should be the end of the link block is possible.
	if ( to < element.content.characters.length && to >= 0 ) {
		if ( element.content.characters[ to ].hasTags( 'a' ) ) {
			while ( to < element.content.characters.length ) {
				if ( ! element.content.characters[ to ].hasTags( 'a' ) ) {
					break;
				}
				to++;
			}
		}
	}

	return { from: from, to: to };
};

/**
 * Open the link dialog when clicking the link tool.
 */
ContentTools.Tools.Link.apply = function( element, selection, callback ) {

	var url = '', target = '', text = '', existingClass = '', existingStyles = '';
	var hasText, _ref, from, to, selected, tag;

	if ( 'Image' === element.constructor.name ) {

		if ( element.a ) {
			url = element.a.href;
			target = element.a.target || '';
		} else {

		}

	} else {

		// Get the selected text.
		_ref = selection.get();
		from = _ref[0];
		to = _ref[1];

		selected = this.getSelectedLink( element, from, to );
		from = selected.from;
		to = selected.to;

		// Adjust the selection since for links we are selecting whole blocks of links.
		selection = new ContentSelect.Range( from, to );

		// Get the details of the link.
		tag = this.getTag( element, selection );

		if ( tag ) {

			// Editing an existing link
			if ( tag.attr( 'href' ) ) {
				url = tag.attr( 'href' );
			}
			if ( tag.attr( 'target' ) ) {
				target = tag.attr( 'target' );
			}
			if ( tag.attr( 'class' ) ) {
				existingClass = tag.attr( 'class' );
			}
			if ( tag.attr( 'style' ) ) {
				existingStyles = tag.attr( 'style' );
			}
		}

		text = element.content.unformat( from, to, 'a' );
		text = text.slice( from, to );
	}

	// Remember the cursor position.
	if ( element.storeState ) {
		element.storeState();
	}

	// If the selected text is plain (without formatting), display the text.
	hasText = false;
	if ( 'Image' !== element.constructor.name && text.html().trim() === text.text().trim() ) {
		hasText = true;
		text = text.text();
	} else {
		text = '';
	}

	this.element = element;
	this.selection = selection;
	this.existingClass = existingClass;
	this.existingStyles = existingStyles;
	this.type = this.name;

	// Open the link dialog box.
	window.pbsLinkFrame.open( {
		text: text,
		url: url,
		target: '' !== target,
		hasText: hasText
	}, ContentTools.Tools.Link._apply.bind( this ) );

	return callback( true );
};

/**
 * Save the link when the link modal save button is clicked.
 */
ContentTools.Tools.Link._apply = function( url, text, target ) {
	var element = this.element;
	var selection = this.selection;
	var existingClass = this.existingClass;
	var existingStyles = this.existingStyles;
	var linkType = this.name;
	var _ref, from, to, args, content, tip, tail;

	if ( 'Image' === element.constructor.name ) {

		if ( ! element.a ) {
			element.a = {};
		}
		element.a.href = url;
		element.a.target = target ? '_blank' : '';

	} else {

		// Remove any old links.
		_ref = selection.get();
		from = _ref[0];
		to = _ref[1];

		element.content = element.content.unformat( from, to, 'a' );

		if ( url ) {
			args = {
				href: url
			};
			if ( target ) {
				args.target = '_blank';
			}
			if ( existingClass ) {
				args['class'] = existingClass;
			}
			if ( existingStyles ) {
				args.style = existingStyles;
			}

			args = wp.hooks.applyFilters( 'pbs.tool.' + linkType.toLowerCase() + '.args', args );

			// If we CAN edit the text (meaning the text doesn't have fancy formatting),
			// and it's blank, use the URL as the text instead. This is WP's behavior.
			if ( document.querySelector( '#wp-link-wrap' ).classList.contains( 'has-text-field' ) && '' === text.trim() ) {
				text = url;
			}

			if ( text ) {

				// Create the new content.
				content = new HTMLString.String( text, 'PreText' === element.constructor.name );
				content = content.format( 0, content.characters.length, new HTMLString.Tag( 'a', args ) );

				// Replace the old content with the new one.
				tip = element.content.substring( 0, selection.get()[0] );
				tail = element.content.substring( selection.get()[1] );
				element.content = tip.concat( content );
				element.content = element.content.concat( tail, false );

				if ( from === to ) {
					to += content.length();
				}

			} else {

				// Just format it.
				element.content = element.content.format( from, to, new HTMLString.Tag( 'a', args ) );
			}

		} else {
			element.content = element.content.unformat( from, to, 'a' );
		}
	}

	wp.hooks.doAction( 'pbs.tool.' + linkType.toLowerCase() + '.applied', element, from, to );

	if ( 'Image' !== element.constructor.name ) {
		element.updateInnerHTML();
		element.taint();

		// Restore the caret position.
		if ( element.restoreState ) {
			element.restoreState();
		}
	}
};

/**
 * Originally from Link.getHref, modified to get the Tag object only.
 */
ContentTools.Tools.Link.getTag = function( element, selection ) {
  var c, from, selectedContent, tag, to, _i, _j, _len, _len1, _ref, _ref1, _ref2;
  if ( 'Image' === element.constructor.name ) {
	if ( element.a ) {
	  return element.a;
	}
  } else {
	_ref = selection.get(), from = _ref[0], to = _ref[1];
	selectedContent = element.content.slice( from, to );
	_ref1 = selectedContent.characters;
	for ( _i = 0, _len = _ref1.length; _i < _len; _i++ ) {
	  c = _ref1[_i];
	  if ( ! c.hasTags( 'a' ) ) {
		continue;
	  }
	  _ref2 = c.tags();
	  for ( _j = 0, _len1 = _ref2.length; _j < _len1; _j++ ) {
		tag = _ref2[_j];
		if ( 'a' === tag.name() ) {
			return tag;
		}
	  }
	}
  }
  return null;
};

/* globals ContentEdit, ContentTools, __extends, PBSEditor, pbsParams */

ContentTools.Tools.Widget = ( function( _super ) {
	__extends( Widget, _super );

	function Widget() {
		return Widget.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Widget, 'widget' );

	Widget.label = pbsParams.labels.widget;

	Widget.icon = 'widget';

	Widget.tagName = 'widget';

	Widget.buttonName = pbsParams.labels.widget;

	Widget.apply = function( element, selection, callback ) {
		var mainRegion, index;
		var root = ContentEdit.Root.get();
		var elemFocused = null;
	    if ( root.focused() ) {
			elemFocused = root.focused();
		} else {
			mainRegion = ContentTools.EditorApp.get().regions()['main-content'];
			if ( mainRegion.children ) {
				elemFocused = mainRegion.children[0];
			}
		}

		index = elemFocused.parent().children.indexOf( elemFocused ) + 1;
		this.createNew( elemFocused.parent(), index );
		return callback( true );
	};

	Widget.createNew = function( parent, index ) {
		PBSEditor.widgetFrame.open( {
			title: pbsParams.labels.insert_widget,
			button: pbsParams.labels.insert_widget,
			successCallback: function( view ) {
				var base = 'pbs_widget';
				var widgetSlug = view.selected.getAttribute( 'data-widget-slug' );
				var shortcodeRaw = '[pbs_widget widget="' + widgetSlug + '" ]';
				var shortcode = wp.shortcode.next( base, shortcodeRaw, 0 );
				var elem = ContentEdit.Shortcode.createShortcode( shortcode );

				parent.attach( elem, index );

				elem.focus();

				setTimeout( function() {
					elem.ajaxUpdate( true );
				}, 20 );
			}
		} );
	};

	return Widget;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams, ContentSelect */

ContentTools.Tools.Text = ( function( _super ) {
	__extends( Text, _super );

	function Text() {
		return Text.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Text, 'text' );

	Text.label = pbsParams.labels.text;

	Text.icon = 'text';

	Text.tagName = 'p';

	Text.shortcut = '';

	Text.buttonName = pbsParams.labels.text;

	Text.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Text.createNew = function( parent, index ) {
		var newElem = new ContentEdit.Text( 'p', {}, pbsParams.labels.your_text_here );
		parent.attach( newElem, index );

		newElem.focus();
		newElem.selection( new ContentSelect.Range( 0, newElem.content.length() ) );
	};

	return Text;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.CountUp = ( function( _super ) {
	__extends( CountUp, _super );

	function CountUp() {
		return CountUp.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( CountUp, 'countup' );

	CountUp.label = pbsParams.labels.count_up;

	CountUp.icon = 'countup';

	CountUp.tagName = 'p';

	CountUp.shortcut = '';

	CountUp.buttonName = pbsParams.labels.count_up;

	CountUp.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	CountUp.createNew = function( parent, index ) {
		var newElem = new ContentEdit.Text( 'p', {}, '<span style="font-size: 40px;">100%</span>' );
		newElem.attr( 'style', 'text-align: center' );
		newElem.attr( 'data-aos-js', '1' );
		newElem.attr( 'data-pbs-count-up', '1' );
		newElem.attr( 'data-cu-time', '1000' );
		newElem.attr( 'data-cu-delay', '10' );
		parent.attach( newElem, index );
		newElem.focus();
		window.pbsInitCountUp( newElem._domElement );
	};

	return CountUp;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Countdown = ( function( _super ) {
	__extends( Countdown, _super );

	function Countdown() {
		return Countdown.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Countdown, 'countdown' );

	Countdown.label = pbsParams.labels.countdown;

	Countdown.icon = 'countdown';

	Countdown.tagName = 'div';

	Countdown.shortcut = '';

	Countdown.buttonName = pbsParams.labels.countdown;

	Countdown.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Countdown.createNew = function( parent, index ) {
		var newElem = ContentEdit.Countdown.create();
		parent.attach( newElem, index );
		newElem.focus();
	};

	return Countdown;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Html = ( function( _super ) {
	__extends( Html, _super );

	function Html() {
		return Html.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Html, 'html' );

	Html.label = pbsParams.labels.html;

	Html.icon = 'html';

	Html.tagName = 'html';

	Html.buttonName = pbsParams.labels.html;

	Html.apply = function( element, selection, callback ) {

		var root = ContentEdit.Root.get();
		var elemFocused = null;
		var mainRegion, dummy, elem, index;

        if ( root.focused() ) {
			elemFocused = root.focused();
		} else {
			mainRegion = ContentTools.EditorApp.get().regions()['main-content'];
			if ( mainRegion.children ) {
				elemFocused = mainRegion.children[0];
			}
		}

		dummy = document.createElement( 'DIV' );
		dummy.setAttribute( 'data-ce-tag', 'html' );
		elem = ContentEdit.Html.fromDOMElement( dummy );
		index = elemFocused.parent().children.indexOf( elemFocused );
		elemFocused.parent().attach( elem, index + 1 );

		elem.focus();
		elem.openEditor();

		return callback( true );
	};

	Html.createNew = function( parent, index ) {
		var elem;
		var dummy = document.createElement( 'DIV' );
		dummy.setAttribute( 'data-ce-tag', 'html' );
		elem = ContentEdit.Html.fromDOMElement( dummy );
		parent.attach( elem, index );

		elem.focus();
		elem.openEditor();
	};

	return Html;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Map = ( function( _super ) {
	__extends( Map, _super );

	function Map() {
		return Map.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Map, 'map' );

	Map.label = pbsParams.labels.map;

	Map.icon = 'map';

	Map.tagName = 'div';

	Map.shortcut = '';

	Map.buttonName = pbsParams.labels.google_map;

	Map.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Map.createNew = function( parent, index ) {
		var newElem = ContentEdit.Map.create();
		parent.attach( newElem, index );
		newElem.focus();
	};

	return Map;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Tabs = ( function( _super ) {
	__extends( Tabs, _super );

	function Tabs() {
		return Tabs.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Tabs, 'tabs' );

	Tabs.label = pbsParams.labels.tabs;

	Tabs.icon = 'tabs';

	Tabs.tagName = 'tabs';

	Tabs.buttonName = pbsParams.labels.tabs;

	Tabs.apply = function( element, selection, callback ) {

		var index;

		// Don't allow tabs to be created inside tabs, create it after the current tabs.
		if ( window.pbsSelectorMatches( element._domElement, '[data-ce-tag="tabs"] *' ) ) {
			while ( element && 'Tabs' !== element.constructor.name ) {
				element = element.parent();
			}
		}

		index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Tabs.createNew = function( parent, index ) {

		var newElem, elem, hash, hashes = [];
		while ( hashes.length < 4 ) {
			hash = window.PBSEditor.generateHash();
			if ( document.querySelector( '.pbs-tabs-' + hash ) ) {
				continue;
			}
			if ( document.querySelector( '[id="pbs-tabs-' + hash + '"]' ) ) {
				continue;
			}
			if ( hashes.indexOf( hash ) !== -1 ) {
				continue;
			}
			hashes.push( hash );
		}

		elem = document.createElement( 'div' );
		elem.classList.add( 'pbs-tabs-' + hashes[0] );
		elem.setAttribute( 'data-ce-tag', 'tabs' );

		/* jshint multistr: true */
		elem.innerHTML =
			'<input class="pbs-tab-state" type="radio" name="pbs-tabs-' + hashes[0] + '" id="pbs-tab-' + hashes[1] + '" data-tab="1" data-ce-tag="tabradio" checked />' +
			'<input class="pbs-tab-state" type="radio" name="pbs-tabs-' + hashes[0] + '" id="pbs-tab-' + hashes[2] + '" data-tab="2" data-ce-tag="tabradio" />' +
			'<input class="pbs-tab-state" type="radio" name="pbs-tabs-' + hashes[0] + '" id="pbs-tab-' + hashes[3] + '" data-tab="3" data-ce-tag="tabradio" />' +
			'<div class="pbs-tab-tabs" data-ce-tag="tabcontainer">' +
		        '<label for="pbs-tab-' + hashes[1] + '" data-ce-tag="tab" class="pbs-tab-active"><span style="font-weight: bold;">Tab 1</span></label>' +
		        '<label for="pbs-tab-' + hashes[2] + '" data-ce-tag="tab"><span style="font-weight: bold;">Tab 2</span></label>' +
		        '<label for="pbs-tab-' + hashes[3] + '" data-ce-tag="tab"><span style="font-weight: bold;">Tab 3</span></label>' +
		    '</div>' +
			'<div class="pbs-tab-panels" data-ce-tag="tabpanelcontainer">' +
				'<div class="pbs-row" data-panel="1"><div class="pbs-col"><p>Tab 1 content</p></div></div>' +
				'<div class="pbs-row" data-panel="2"><div class="pbs-col"><p>Tab 2 content</p></div></div>' +
				'<div class="pbs-row" data-panel="3"><div class="pbs-col"><p>Tab 3 content</p></div></div>' +
			'</div>';

		newElem = ContentEdit.Tabs.fromDOMElement( elem );
		parent.attach( newElem, index );
		newElem.focus();
	};

	return Tabs;

} )( ContentTools.Tools.ElementButton );

/* globals ContentTools, __extends, pbsParams, ContentEdit */

ContentTools.Tools.LineHeight = ( function( _super ) {
	__extends( LineHeight, _super );

	function LineHeight() {
		return LineHeight.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( LineHeight, 'line-height' );

	LineHeight.label = pbsParams.labels.increase_line_height + ' {0}';
	LineHeight.labelDown = pbsParams.labels.decrease_line_height + ' {0}';
	LineHeight.labelReset = pbsParams.labels.reset_line_height;

	LineHeight.icon = 'line-height';

	LineHeight.tagName = 'span';

	LineHeight.displayRule = 'flex';

	LineHeight.canApply = function( element, selection ) {
		return ContentTools.Tools.Bold.canApply( element, selection );
	};

	LineHeight.isApplied = function( element ) {
		this.refreshTooltip( element._domElement.style.lineHeight );

		return !! element._domElement.style.lineHeight;
	};

	LineHeight.getDefaultLineHeight = function( element ) {
		var baseStyles, defaultLineHeight = element.defaultStyle( 'line-height' );
		if ( defaultLineHeight ) {
			baseStyles = window.getComputedStyle( element._domElement );

			if ( defaultLineHeight.indexOf( 'px' ) !== -1 ) {
				defaultLineHeight = parseInt( defaultLineHeight, 10 ) / parseInt( baseStyles['font-size'], 10 );
			} else {
				defaultLineHeight = parseFloat( defaultLineHeight );
			}
			defaultLineHeight = Math.round( defaultLineHeight * 10 ) / 10;
		}
		return defaultLineHeight;
	};

	LineHeight.getCurrentLineHeight = function( element ) {
		var baseStyles, style = element.style( 'line-height' ); //Element.content.substring(from, to).getStyle('line-height', element );
		if ( style.indexOf( 'em' ) !== -1 ) {
			style = parseFloat( style );
		} else {
			baseStyles = window.getComputedStyle( element._domElement );
			style = parseInt( style, 10 ) / parseInt( baseStyles['font-size'], 10 );
		}

		return Math.round( style * 10 ) / 10;
	};

	LineHeight.apply = function( element, selection, callback, force ) {

		var style, defaultStyle;

		element.storeState();
		style = this.getCurrentLineHeight( element );
		defaultStyle = this.getDefaultLineHeight( element );

		style = Math.round( style * 10 );

		if ( 'up' === force ) {
			style++;
			style = style / 10;
		} else if ( 'reset' === force || ( window.PBSEditor.isShiftDown && window.PBSEditor.isCtrlDown ) ) {
			style = defaultStyle;
		} else if ( 'down' === force || window.PBSEditor.isCtrlDown ) {
			style--;
			style = style / 10;
		} else {
			style++;
			style = style / 10;
		}

		if ( defaultStyle === style ) {
			style = '';
		} else {
			style += 'em';
		}

		element.style( 'line-height', style );
		return callback( true );
	};

	LineHeight.doHold = function( element, selection ) {
		return this.apply( element, selection, function() {} );
	};

	LineHeight.mountPopup = function() {
		var change;
		var label = document.createElement( 'SPAN' );
		var slider = document.createElement( 'DIV' );
		var input = document.createElement( 'INPUT' );

		LineHeight.__super__.constructor.mountPopup.call( this );

		label.innerHTML = 'em';
		this.popup.appendChild( slider );
		this.popup.appendChild( input );
		this.popup.appendChild( label );

		jQuery( slider ).slider( {
			range: 'min',
			max: 4,
			min: 0,
			step: 0.1,
			animate: 'fast',
			change: function( event, ui ) {
				var input = this._ceElement._domElement.querySelector( 'input' );
				var value = parseFloat( ui.value );
				if ( 0.0 === value || isNaN( value ) ) {
					value = '';
				}
				if ( value !== input.value ) {
					input.value = value;
					input.dispatchEvent( new CustomEvent( 'change' ) );
				}
			}.bind( this ),
			slide: function( event, ui ) {
				var input = this._ceElement._domElement.querySelector( 'input' );
				var value = parseFloat( ui.value );
				if ( 0.0 === value || isNaN( value ) ) {
					value = '';
				}
				if ( value !== input.value ) {
					input.value = value;
					input.dispatchEvent( new CustomEvent( 'change' ) );
				}
			}.bind( this )
		} );

		change = function( ev ) {

			var element = ContentEdit.Root.get().focused();
			var value = ev.target.value;
			if ( '0' === value ) {
				value = '';
			}
			if ( value ) {
				element.style( 'line-height', value + 'em' );
			} else {
				element.style( 'line-height', '' );
			}
		};
		input.addEventListener( 'change', change );
		input.addEventListener( 'keyup', change );
	};

	LineHeight.showPopup = function() {

		var element, value;

		LineHeight.__super__.constructor.showPopup.call( this );

		element = ContentEdit.Root.get().focused();

		// Update the value of the slider.
		value = this.getCurrentLineHeight( element );
		jQuery( this._ceElement._domElement ).find( 'div div:eq(0)' ).slider( 'value', value );
		this._ceElement._domElement.querySelector( 'input' ).value = value;

		this._ceElement._domElement.querySelector( 'input' ).focus();
		this._ceElement._domElement.querySelector( 'input' ).select();

	};

	return LineHeight;

} )( ContentTools.Tools.BasePopup );

/* globals ContentTools, ContentEdit, ContentSelect, __extends, pbsParams */

var toolMediaFrame;
var imageInserted;
var boundInsertHandler;

// The Media Manager window needs to know our post ID so that Insert from URL will work.
if ( wp.media.view.settings.post ) {
	wp.media.view.settings.post.id = pbsParams.post_id;
}

ContentTools.Tools.pbsMedia = ( function( _super ) {
	__extends( pbsMedia, _super );

	function pbsMedia() {
		return pbsMedia.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( pbsMedia, 'pbs-media' );

	pbsMedia.label = pbsParams.labels.media;

	pbsMedia.icon = 'image';

	pbsMedia.buttonName = pbsParams.labels.media;

	pbsMedia.apply = function( element, selection ) {

		var root, elem;
		if ( this._isOpen() ) {
			return;
		}

		root = ContentEdit.Root.get();
		elem = root.focused();

		ContentSelect.Range.query( elem._domElement );
		selection = ContentSelect.Range.query( elem._domElement );
		window._tempSelection = selection;

		this.createNew( element.parent(), elem.parent().children.indexOf( elem ) + 1 );
	};

	pbsMedia.createNew = function( parent, index ) {
		this._attachToParent = parent;
		this._attachIndex = index;

		// We override the insert function to make this insert in CT.
		window._pbsAddMediaOrigInsert = wp.media.editor.insert;
		wp.media.editor.insert = this.pbsAddMediaOverrideInsert.bind( this );

		toolMediaFrame = wp.media.editor.open();

		// Inserting media uses ajax, put a placeholder first while the image loads.
		if ( ! boundInsertHandler ) {
			boundInsertHandler = pbsMedia.insertHandler.bind( this );
		}
		toolMediaFrame.on( 'insert', boundInsertHandler );
	};

	pbsMedia.insertHandler = function( g ) {
		var size = g.single().attributes.sizes[ toolMediaFrame.$el.find( '[name="size"]' ).val() ];

		var img = document.createElement( 'IMG' );
		img.setAttribute( 'height', size.height );
		img.setAttribute( 'width', size.width );
		img.classList.add( 'aligncenter' );
		img.classList.add( 'ce-element' );
		img.classList.add( 'ce-element--type-image' );
		img.classList.add( 'wp-image-' + pbsParams.dummy_image_id );
		img.setAttribute( 'data-ce-size', 'w ' + size.width + ' x h 1' );
		img.setAttribute( 'alt', '' );
		imageInserted = ContentEdit.Image.fromDOMElement( img );
		this._attachToParent.attach( imageInserted, this._attachIndex );

		toolMediaFrame.off( 'insert', boundInsertHandler );
	};

	pbsMedia._isOpen = function() {

		var el;

		// The editor is not present at the start.
		if ( ! wp.media.editor.get() ) {
			return false;
		}

		// Check if the media manager window is visible.
		el = wp.media.editor.get().el;
		return ! ( 0 === el.offsetWidth && 0 === el.offsetHeight );
	};

	pbsMedia.pbsAddMediaOverrideInsert = function( html ) {

		var base, shortcode, dummy, newElem;

		// If adding an image, add an Image Element.
		var addedImage = false;
		if ( ! html.match( /^\[/ ) ) {
			dummy = document.createElement( 'p' );
			dummy.innerHTML = html;
			newElem = ContentEdit.Image.fromDOMElement( dummy.firstChild );
			if ( imageInserted ) {
				this._attachToParent.detach( imageInserted );
				imageInserted = null;
			}
			if ( newElem ) {
				this._attachToParent.attach( newElem, this._attachIndex );
				addedImage = true;
			}

		} else {

			base = html.match( /^\[(\w+)/ );
			base = base[1];
			shortcode = wp.shortcode.next( base, html, 0 );
			newElem = ContentEdit.Shortcode.createShortcode( shortcode );

			if ( imageInserted ) {
				this._attachToParent.detach( imageInserted );
				imageInserted = null;
			}
			this._attachToParent.attach( newElem, this._attachIndex );

			newElem.ajaxUpdate( true );

		}

		// Revert to the original insert function.
		wp.media.editor.insert = window._pbsAddMediaOrigInsert;
		delete window._pbsAddMediaOrigInsert;
	};

	return pbsMedia;

} )( ContentTools.Tools.ElementButton );

/**
 * Open the media tool when an image gets dragged into the screen.
 */
( function() {
	var dragEnterHandler = function( ev ) {

		var i, root, elem, mediaModals, allModalsHidden, isFile;

		// If the thing being dragged into the window isn't a file,
		// don't open the media manager. If the browser doesn't support this,
		// then just open it regardless of whatever is dragged.
		// @see http://stackoverflow.com/questions/25016442/how-to-distinguish-if-a-file-or-folder-is-being-dragged-prior-to-it-being-droppe
		isFile = true;
		if ( ev.dataTransfer ) {
			if ( ev.dataTransfer.types ) {
				isFile = false;
				for ( i = 0; i < ev.dataTransfer.types.length; i++ ) {
					if ( 'Files' === ev.dataTransfer.types[ i ] ) {
						isFile = true;
					}
				}
			}
		}
		if ( ! isFile ) {
			return;
		}

		// Don't open ANOTHER media manager when there's one open already.
		mediaModals = document.querySelectorAll( '[tabindex="0"] .media-modal' );
		allModalsHidden = true;
		Array.prototype.forEach.call( mediaModals, function( el ) {
			if ( 0 !== el.offsetHeight ) {
				allModalsHidden = false;
			}
		} );
		if ( ! allModalsHidden ) {
			return;
		}

		// Open the media manager.
		root = ContentEdit.Root.get();
		elem = root.focused();
		if ( elem ) {
			window.PBSEditor.getToolUI( 'pbs-media' ).apply( elem, null );
		}
	};

	var ready = function() {
		var editor = ContentTools.EditorApp.get();
		editor.bind( 'start', function() {
			document.addEventListener( 'dragenter', dragEnterHandler );
		} );
		editor.bind( 'stop', function() {
			document.removeEventListener( 'dragenter', dragEnterHandler );
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}

} )();

/* globals ContentTools */

( function() {
	ContentTools.Tools.Table.canApply = function() {
		return true;
	};
} )();

( function() {
	ContentTools.Tools.Table.createNew = function( parent, index ) {
		var app, dialog, modal, table;
		app = ContentTools.EditorApp.get();
		modal = new ContentTools.ModalUI();
		table = null;
		dialog = new ContentTools.TableDialog( table );
		dialog.bind( 'cancel', ( function() {
		  return function() {
			dialog.unbind( 'cancel' );
			modal.hide();
			dialog.hide();
			return;
		  };
		} )( this ) );
		dialog.bind( 'save', ( function( _this ) {
		  return function( tableCfg ) {
			dialog.unbind( 'save' );
			  table = _this._createTable( tableCfg );
			  parent.attach( table, index );
			  table.firstSection().children[0].children[0].children[0].focus();
			modal.hide();
			dialog.hide();
			return;
		  };
		} )( this ) );
		app.attach( modal );
		app.attach( dialog );
		modal.show();
		return dialog.show();
	};
} )();

/* globals ContentTools, __extends, pbsParams */

ContentTools.Tools.Underline = ( function( _super ) {
	__extends( Underline, _super );

	function Underline() {
	return Underline.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Underline, 'underline' );

	Underline.label = pbsParams.labels.underline;

	Underline.icon = 'underline';

	Underline.tagName = 'span';

	Underline.shortcut = 'ctrl+u';

	Underline.canApply = function( element, selection ) {
		return ContentTools.Tools.Bold.canApply( element, selection );
	};

	Underline.isApplied = function( element, selection ) {
		var from = 0, to = 0, _ref;
		if ( element.content === void 0 || ! element.content.length() ) {
			return false;
		}
		if ( selection ) {
			_ref = selection.get(), from = _ref[0], to = _ref[1];
		}

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		return 'underline' === element.content.substring( from, to ).getStyle( 'text-decoration', element );
	};

  Underline.apply = function( element, selection, callback ) {
	  var from, to, _ref, style, newStyle;
	  element.storeState();

	  _ref = selection.get(), from = _ref[0], to = _ref[1];

	  // If nothing is selected, adjust the whole element
	  if ( from === to ) {
		  from = 0;
		  to = element.content.length();
	  }

	  style = element.content.substring( from, to ).getStyle( 'text-decoration', element );
	  if ( ! style || 'none' === style || 'line-through' === style ) {
		  style = 'underline';
	  } else {
		  style = 'none';
	  }
	  newStyle = { 'text-decoration': style };

	  element.content = element.content.style( from, to, element._tagName, newStyle );

	  element.updateInnerHTML();
	  element.taint();
	  element.restoreState();
	  return callback( true );
  };

  return Underline;

} )( ContentTools.Tool );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.ContactForm7 = ( function( _super ) {
	__extends( ContactForm7, _super );

	function ContactForm7() {
		return ContactForm7.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( ContactForm7, 'contact-form7' );

	ContactForm7.label = pbsParams.labels.contact_form7;

	ContactForm7.icon = 'cf7';

	ContactForm7.buttonName = pbsParams.labels.contact_form7;

	ContactForm7.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	ContactForm7.createNew = function( parent, index ) {
		var shortcode, newElem;
		var sc = '[contact-form-7]';
		if ( pbsParams.contact_form7 ) {
			sc = '[contact-form-7 id=' + pbsParams.contact_form7 + ']';
		}
		shortcode = wp.shortcode.next( 'contact-form-7', sc, 0 );
		newElem = ContentEdit.Shortcode.createShortcode( shortcode );
		parent.attach( newElem, index );

		newElem.ajaxUpdate( true );
		newElem.focus();
	};

	return ContactForm7;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.WooCommerce = ( function( _super ) {
	__extends( WooCommerce, _super );

	function WooCommerce() {
		return WooCommerce.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( WooCommerce, 'woocommerce' );

	WooCommerce.label = pbsParams.labels.woocommerce;

	WooCommerce.icon = 'woocommerce';

	WooCommerce.buttonName = pbsParams.labels.woocommerce;

	WooCommerce.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );

		return callback( true );
	};

	WooCommerce.createNew = function( parent, index ) {
		var shortcode = wp.shortcode.next( 'best_selling_products', '[best_selling_products per_page="12" columns="3"]', 0 );
		var newElem = ContentEdit.Shortcode.createShortcode( shortcode );
		parent.attach( newElem, index );

		newElem.ajaxUpdate( true );
		newElem.focus();
	};

	return WooCommerce;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.AdvancedCustomFields = ( function( _super ) {
	__extends( AdvancedCustomFields, _super );

	function AdvancedCustomFields() {
		return AdvancedCustomFields.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( AdvancedCustomFields, 'acf' );

	AdvancedCustomFields.label = pbsParams.labels.advanced_custom_fields;

	AdvancedCustomFields.icon = 'acf';

	AdvancedCustomFields.buttonName = pbsParams.labels.advanced_custom_fields;

	AdvancedCustomFields.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	AdvancedCustomFields.createNew = function( parent, index ) {
		var shortcode, newElem;
		var sc = '[acf]';
		if ( pbsParams.acf_field_name ) {
			sc = '[acf field="' + pbsParams.acf_field_name + '"]';
		}
		shortcode = wp.shortcode.next( 'acf', sc, 0 );
		newElem = ContentEdit.Shortcode.createShortcode( shortcode );
		parent.attach( newElem, index );

		newElem.ajaxUpdate( true );
		newElem.focus();
	};

	return AdvancedCustomFields;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.NextGenGallery = ( function( _super ) {
	__extends( NextGenGallery, _super );

	function NextGenGallery() {
		return NextGenGallery.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( NextGenGallery, 'nextgen' );

	NextGenGallery.label = pbsParams.labels.nextgen;

	NextGenGallery.icon = 'nextgen';

	NextGenGallery.buttonName = pbsParams.labels.nextgen;

	NextGenGallery.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	NextGenGallery.createNew = function( parent, index ) {
		var shortcode = wp.shortcode.next( 'ngg_images', '[ngg_images gallery_ids=' + pbsParams.nextgen_gallery + ' source="galleries" display_type="photocrati-nextgen_basic_slideshow" width="300" override_thumbnail_settings="1" thumbnail_crop="1" show_slideshow_link="1" images_per_page="0" ngg_triggers_display="always" order_direction="DESC" tagcloud="no" disable_pagination="1" show_all_in_lightbox="0" aspect_ratio="1.5" width_unit="px"][/ngg_images]', 0 );
		var newElem = ContentEdit.Shortcode.createShortcode( shortcode );
		parent.attach( newElem, index );

		newElem.ajaxUpdate( true );
		newElem.focus();
	};

	return NextGenGallery;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.InstagramFeed = ( function( _super ) {
	__extends( InstagramFeed, _super );

	function InstagramFeed() {
		return InstagramFeed.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( InstagramFeed, 'instagram-feed' );

	InstagramFeed.label = pbsParams.labels.instagram_feed;

	InstagramFeed.icon = 'instagram-feed';

	InstagramFeed.buttonName = pbsParams.labels.instagram_feed;

	InstagramFeed.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	InstagramFeed.createNew = function( parent, index ) {
		var shortcode = wp.shortcode.next( 'instagram-feed', '[instagram-feed]', 0 );
		var newElem = ContentEdit.Shortcode.createShortcode( shortcode );
		parent.attach( newElem, index );

		newElem.ajaxUpdate( true );
		newElem.focus();
	};

	return InstagramFeed;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.EventsCalendar = ( function( _super ) {
	__extends( EventsCalendar, _super );

	function EventsCalendar() {
		return EventsCalendar.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( EventsCalendar, 'events-calendar' );

	EventsCalendar.label = pbsParams.labels.events_calendar;

	EventsCalendar.icon = 'events-calendar';

	EventsCalendar.buttonName = pbsParams.labels.events_calendar;

	EventsCalendar.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	EventsCalendar.createNew = function( parent, index ) {
		var shortcode, newElem;
		var sc = '[tribe:event-details align="center"][/tribe:event-details]';
		if ( pbsParams.events_calendar ) {
			sc = '[tribe:event-details id="' + pbsParams.events_calendar + '" align="center"][/tribe:event-details]';
		}
		shortcode = wp.shortcode.next( 'tribe:event-details', sc, 0 );
		newElem = ContentEdit.Shortcode.createShortcode( shortcode );
		parent.attach( newElem, index );

		newElem.ajaxUpdate( true );
		newElem.focus();
	};

	return EventsCalendar;

} )( ContentTools.Tools.ElementButton );

/* globals ContentTools, ContentEdit, __extends, pbsParams */

ContentTools.Tools.paragraphPicker = ( function( _super ) {
	__extends( paragraphPicker, _super );

	function paragraphPicker() {
		return paragraphPicker.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( paragraphPicker, 'paragraphPicker' );

	paragraphPicker.label = pbsParams.labels.text_style;

	paragraphPicker.icon = 'paragraph-picker';

	paragraphPicker.tagName = 'p';

	paragraphPicker.types = {
		p: { className: 'Paragraph', label: pbsParams.labels.paragraph },
		h1: { className: 'Heading1', label: pbsParams.labels.heading_1 },
		h2: { className: 'Heading2', label: pbsParams.labels.heading_2 },
		h3: { className: 'Heading3', label: pbsParams.labels.heading_3 },
		h4: { className: 'Heading4', label: pbsParams.labels.heading_4 },
		h5: { className: 'Heading5', label: pbsParams.labels.heading_5 },
		h6: { className: 'Heading6', label: pbsParams.labels.heading_6 },
		blockquote: { className: 'Blockquote', label: '"' + pbsParams.labels.blockquote + '"' },
		pre: { className: 'Preformatted', label: pbsParams.labels.preformatted }
	};

	paragraphPicker.canApply = function( element ) {
		var tag;
		if ( this.types.hasOwnProperty( element.tagName() ) ) {
			for ( tag in this.types ) {
				if ( ! this.types.hasOwnProperty( tag ) ) {
					continue;
				}
				if ( element.tagName() === tag ) {
					continue;
				}
				if ( this._ceElement._domElement.classList.contains( 'pbs-paragraph-picker-type-' + tag ) ) {
					this._ceElement._domElement.classList.remove( 'pbs-paragraph-picker-type-' + tag );
				}
			}
			if ( ! this._ceElement._domElement.classList.contains( 'pbs-paragraph-picker-type-' + element.tagName() ) ) {
				this._ceElement._domElement.classList.add( 'pbs-paragraph-picker-type-' + element.tagName() );
				this._ceElement._domElement.firstChild.textContent = this.types[ element.tagName() ].label;
			}
		}
		if ( 'LABEL' === element._domElement.tagName ) {
			return false;
		}
		return element !== void 0;
	};

	paragraphPicker.isApplied = function() {
		return ! this._ceElement._domElement.classList.contains( 'pbs-paragraph-picker-type-p' );
	};

	paragraphPicker.apply = function( element, selection, callback ) {
		return this.applyTag( element, this._selectedType, selection, callback );
	};

	paragraphPicker.applyTag = function( element, tag, selection, callback ) {
		var app, forceAdd, paragraph, region, prevColor, prevFontFamily, prevFontName;
		app = ContentTools.EditorApp.get();
		app._ctrlDown = false;
		forceAdd = app.ctrlDown();

		if ( element.storeState ) {
			element.storeState();
		}

		// Reset some styles.

		if ( ! pbsParams.is_lite && selection ) {
			ContentTools.Tools.LineHeight.apply( element, selection, function() {}, 'reset' );
		}

		// Keep the color if we have one.
		prevColor = ContentTools.Tools.Color.canApply( element, selection );

		// Keep the font family if we have one.
		prevFontFamily = element._domElement.style.fontFamily;
		prevFontName = element._domElement.getAttribute( 'data-font-family' );

		// Clear all the styles.
		ContentTools.Tools.ClearFormatting.apply( element, selection, function() {} );

		if ( ContentTools.Tools.Heading.canApply( element ) && ! forceAdd ) {
			ContentTools.Tools[ paragraphPicker.types[ tag ].className ].apply( element, selection, callback );
		} else {
			if ( 'Region' !== element.parent().type() ) {
				element = element.closest( function( node ) {
					return 'Region' === node.parent().type();
				} );
			}
			region = element.parent();
			paragraph = new ContentEdit.Text( tag );
			region.attach( paragraph, region.children.indexOf( element ) + 1 );
			paragraph.focus();
			callback( true );
		}

		// If there previously was a color (not the default color), re-apply it.
		if ( prevColor !== element.defaultStyle( 'color' ) ) {
			ContentTools.Tools.Color.applyColor( prevColor, element, selection );
		}

		// If there previously was a font family, re-apply it.
		if ( prevFontFamily && ContentTools.Tools.FontPicker ) {
			ContentTools.Tools.FontPicker.selectFont( prevFontName, prevFontFamily );
		}

		if ( element.restoreState ) {
			element.restoreState();
		}
	};

	paragraphPicker.mountPopup = function() {
		var tag, label;

		this._ceElement._domElement.innerHTML = pbsParams.labels.paragraph;

		paragraphPicker.__super__.constructor.mountPopup.call( this );

		for ( tag in this.types ) {
			if ( ! this.types.hasOwnProperty( tag ) ) {
				continue;
			}

			label = document.createElement( tag );
			label.innerHTML = this.types[ tag ].label;
			label.setAttribute( 'data-tag', tag );
			label.setAttribute( 'data-class', this.types[ tag ].className );
			this.popup.appendChild( label );

			label.addEventListener( 'mousedown', function( ev ) {
				ev.preventDefault();
				this._selectedType = ev.target.getAttribute( 'data-tag' );
				this._selectedClass = ev.target.getAttribute( 'data-class' );
				this._ceElement._mouseDown = true;
				this._ceElement._onMouseUp();

				this.hidePopup();
			}.bind( this ) );

		}
	};

	return paragraphPicker;

} )( ContentTools.Tools.BasePopup );

/* globals ContentTools, __extends, pbsParams */

ContentTools.Tools.Strikethrough = ( function( _super ) {
	__extends( Strikethrough, _super );

	function Strikethrough() {
		return Strikethrough.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Strikethrough, 'strikethrough' );

	Strikethrough.label = pbsParams.labels.strikethrough;

	Strikethrough.icon = 'strikethrough';

	Strikethrough.tagName = 'span';

	Strikethrough.canApply = function( element, selection ) {
		return ContentTools.Tools.Bold.canApply( element, selection );
	};

	Strikethrough.isApplied = function( element, selection ) {
		var from = 0, to = 0, _ref;
		if ( element.content === void 0 || ! element.content.length() ) {
			return false;
		}
		if ( selection ) {
			_ref = selection.get(), from = _ref[0], to = _ref[1];
		}

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		return 'line-through' === element.content.substring( from, to ).getStyle( 'text-decoration', element );
	};

	Strikethrough.apply = function( element, selection, callback ) {
		var from, to, _ref, style, newStyle;
		element.storeState();

		_ref = selection.get(), from = _ref[0], to = _ref[1];

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		style = element.content.substring( from, to ).getStyle( 'text-decoration', element );
		if ( ! style || 'none' === style || 'underline' === style ) {
			style = 'line-through';
		} else {
			style = 'none';
		}
		newStyle = { 'text-decoration': style };

		element.content = element.content.style( from, to, element._tagName, newStyle );

		element.updateInnerHTML();
		element.taint();
		element.restoreState();
		return callback( true );
	};

	return Strikethrough;

} )( ContentTools.Tool );

/* globals ContentTools, ContentEdit, __extends, pbsParams */

ContentTools.Tools.FontPicker = ( function( _super ) {
	__extends( FontPicker, _super );

	function FontPicker() {
		return FontPicker.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( FontPicker, 'font-picker' );

	FontPicker.label = pbsParams.labels.font;

	FontPicker.icon = 'font-picker';

	FontPicker.tagName = 'span';

	FontPicker.canApply = function( element, selection ) {
		var styles, fontFamily;

		if ( this._prevElement !== element._domElement ) {
			styles = window.pbsGetComputedStyle( element._domElement );
			fontFamily = styles.fontFamily.replace( /\s*,.*$/, '' ).replace( /(^["'\s]|["'\s]$)/g, '' );
			this.input.value = fontFamily;
			this.input.setAttribute( 'placeholder', fontFamily );
		}
		this._prevElement = element._domElement;

		return ContentTools.Tools.Bold.canApply( element, selection );
    };

	FontPicker.isApplied = function( element ) {
		return !! element._domElement.style.fontFamily;
	};

	FontPicker.apply = function( element, selection, callback, reset ) {

		if ( reset ) {
			element.removeAttr( 'data-font-family' );
			return;
		}

		this.input.value = this._selectedFontName;
		element.storeState();

		// Remove the font family if it's the default.
		if ( 'P' === element._domElement.tagName && this.defaultPFont === this._selectedFontFamily ) {
			element.style( 'font-family', '' );
			element.removeAttr( 'data-font-family' );
		} else {
			element.style( 'font-family', this._selectedFontFamily );
			element.attr( 'data-font-family', this._selectedFontName );
		}

		element.restoreState();

		return callback( true );
	};

	FontPicker._searchFontName = function() {
		var h, t, th, currOver, input = this._ceElement._domElement.querySelector( 'input' );
		var fontName = input.value.trim().toLowerCase();
		var noResultsDiv = this._ceElement._domElement.querySelector( '[data-no-results]' );
		var elements = this._ceElement._domElement.querySelectorAll( '[data-font*="' + fontName + '"]' );
		var elementsToHide = this._ceElement._domElement.querySelectorAll( '[data-font]:not([data-font*="' + fontName + '"])' );
		var labels = this._ceElement._domElement.querySelectorAll( 'label' );

		if ( ! fontName ) {
			elements = this._ceElement._domElement.querySelectorAll( '[data-font]' );
			elementsToHide = [];
		}

		Array.prototype.forEach.call( elements, function( el, i ) {
			el.classList.remove( 'pbs-pick-over' );
			if ( 0 === i ) {
				el.classList.add( 'pbs-pick-over' );
			}
			el.style.display = '';
		} );

		// No results.
		noResultsDiv.style.display = ! elements.length ? '' : 'none';
		Array.prototype.forEach.call( labels, function( el ) {
			el.style.display = elements.length ? '' : 'none';
		} );

		Array.prototype.forEach.call( elementsToHide, function( el ) {
			el.classList.remove( 'pbs-pick-over' );
			el.style.display = 'none';
		} );

		// Fix the scrolling.
		currOver = this._ceElement._domElement.querySelector( '.pbs-pick-over' );
		if ( currOver ) {
			currOver.parentNode.scrollTop = currOver.offsetTop;
		}

		// Adjust the scrolling to the top if the font is near the top.
		if ( currOver ) {
			h = currOver.parentNode.clientHeight;
			t = currOver.offsetTop;
			th = currOver.clientHeight;
			if ( t + th < h ) {
				currOver.parentNode.scrollTop = 0;
			}
		}
	};

	FontPicker.addFontInRecentlyUsed = function( fontName ) {
		var elements, fontIndex, fontOption, beforeElem, fontNames = [];

		fontName = fontName.trim().toLowerCase();
		fontOption = this._ceElement._domElement.querySelector( '[data-font="' + fontName + '"]' );

		if ( ! fontOption ) {
			return;
		}

		// Only entertain fonts from the "all fonts" list.
		if ( fontOption.getAttribute( 'data-is-recent-font' ) || fontOption.getAttribute( 'data-is-site-font' ) ) {
			return;
		}

		this._ceElement._domElement.querySelector( '.pbs-font-option-recent' ).style.display = '';

		// Get all the recent fonts.
		elements = this._ceElement._domElement.querySelectorAll( '[data-is-recent-font]' );
		fontNames.push( fontName );
		Array.prototype.forEach.call( elements, function( el ) {
			fontNames.push( el.getAttribute( 'data-font' ) );
		} );

		// Find which index we should move fontOption after.
		fontNames.sort();
		fontIndex = fontNames.indexOf( fontName );

		// Move the fontOption to the recent list.
		fontOption.setAttribute( 'data-is-recent-font', '1' );
		if ( fontIndex === elements.length ) {
			beforeElem = this._ceElement._domElement.querySelector( '.pbs-font-option-all' );
		} else {
			beforeElem = elements[ fontIndex ];
		}
		beforeElem.parentNode.insertBefore( fontOption, beforeElem );
	};

	FontPicker.loadFont = function( fontName ) {

		// Load only fonts from our options, this means they're a google font.
		var fontOption = this._ceElement._domElement.querySelector( '[data-font="' + fontName.trim().toLowerCase() + '"]' );

		if ( fontOption && 'undefined' !== typeof window.pbsLoadFonts ) {
			window.pbsLoadFonts( [ fontName ] );
		}
	};

	FontPicker.selectFont = function( fontName, fontFamily ) {

		this._selectedFontName = fontName;
		this._selectedFontFamily = fontFamily;
		this.addFontInRecentlyUsed( fontName );
		this.loadFont( fontName );

		this.apply( ContentEdit.Root.get().focused(), null, function() {} );
	};

	FontPicker.findNextOption = function( currSelection ) {
		var origSelection = currSelection;

		if ( ! currSelection ) {
			currSelection = this._ceElement._domElement.querySelector( '[data-font]' );
		} else {
			currSelection = currSelection.nextSibling;
		}

		if ( currSelection ) {
			while ( currSelection && ( 'none' === currSelection.style.display || 'LABEL' === currSelection.tagName ) ) {
				if ( currSelection === currSelection.parentNode.firstChild ) {
					return origSelection;
				}
				currSelection = currSelection.nextSibling;
			}
		}

		return currSelection ? currSelection : origSelection;
	};

	FontPicker.findPrevOption = function( currSelection ) {
		var origSelection = currSelection;

		if ( ! currSelection ) {
			currSelection = this._ceElement._domElement.querySelector( '[data-font]:last-child' );
		} else {
			currSelection = currSelection.previousSibling;
		}

		if ( currSelection ) {
			while ( currSelection && ( 'none' === currSelection.style.display || 'LABEL' === currSelection.tagName ) ) {
				if ( currSelection === currSelection.parentNode.lastChild ) {
					return origSelection;
				}
				currSelection = currSelection.previousSibling;
			}
		}

		return currSelection ? currSelection : origSelection;
	};

	FontPicker.clearOver = function() {
		var elements = this._ceElement._domElement.querySelectorAll( '.pbs-pick-over' );
		Array.prototype.forEach.call( elements, function( el ) {
			el.classList.remove( 'pbs-pick-over' );
		} );
	};

	FontPicker.highlightNextOption = function() {
		var h, t, th, scroll, currOver = this._ceElement._domElement.querySelector( '.pbs-pick-over' );
		this.clearOver();
		currOver = this.findNextOption( currOver );
		if ( currOver ) {
			currOver.classList.add( 'pbs-pick-over' );
		}

		if ( currOver ) {
			h = currOver.parentNode.clientHeight;
			t = currOver.offsetTop;
			th = currOver.clientHeight;
			scroll = currOver.parentNode.scrollTop;
			if ( t + th > h + scroll ) {
				currOver.parentNode.scrollTop = t - h + th;
			}
		}
	};

	FontPicker.highlightPrevOption = function() {
		var t, scroll, currOver = this._ceElement._domElement.querySelector( '.pbs-pick-over' );

		this.clearOver();
		currOver = this.findPrevOption( currOver );
		if ( currOver ) {
			currOver.classList.add( 'pbs-pick-over' );
		}

		if ( currOver ) {
			t = currOver.offsetTop;
			scroll = currOver.parentNode.scrollTop;
			if ( t < scroll ) {
				currOver.parentNode.scrollTop = t;
			}
		}
	};

	FontPicker.inputKeyupHandler = function( ev ) {

		if ( this._keyDownValue !== ev.target.value ) {
			clearTimeout( this.searchTimeout );
			this.searchTimeout = setTimeout( this._searchFontName.bind( this ), 50 );
		}
	};

	FontPicker.inputKeydownHandler = function( ev ) {
		this._keyDownValue = ev.target.value;

		if ( 40 === ev.keyCode ) {

			// Down.
			this.highlightNextOption();

		} else if ( 38 === ev.keyCode ) {

			// Up.
			this.highlightPrevOption();

		} else if ( 13 === ev.keyCode ) {

			// Enter.
			ev.preventDefault();
			if ( this._ceElement._domElement.querySelector( '.pbs-pick-over' ) ) {
				this.selectFont(
					this._ceElement._domElement.querySelector( '.pbs-pick-over' ).textContent,
					this._ceElement._domElement.querySelector( '.pbs-pick-over' ).getAttribute( 'data-font-family' ) );
			} else {
				this.selectFont( ev.target.value, ev.target.value );
			}
			this.hidePopup();
		}
	};

	/**
	 * Possible formats:
	 * https://fonts.googleapis.com/css?family=Baloo+Bhaina
	 * https://fonts.googleapis.com/css?family=Baloo+Bhaina|Diplomata+SC
	 * https://fonts.googleapis.com/css?family=Baloo+Bhaina|Roboto:400,400i,500
	 * https://fonts.googleapis.com/css?family=Roboto:400,400i,500
	 * https://fonts.googleapis.com/css?family=Roboto&subset=latin,laten-ext
	 */
	FontPicker.getLoadedFonts = function() {
		var styles = document.querySelectorAll( 'link[href*="fonts.googleapis"]' );
		var loadedFonts = [];
		Array.prototype.forEach.call( styles, function( el ) {
			var i, names, name, href = el.getAttribute( 'href' );

			// The URL may be URL encoded, decoded it.
			href = decodeURIComponent( href );

			// Google Font URLs always have the "family=" component
			if ( ! href.match( /^.*family=/i ) ) {
				return;
			}

			// Remove the non-font parts and split up per font.
			names = href.replace( /^.*family=/i, '' );
			names = names.split( '|' );

			// Go through each font.
			for ( i = 0; i < names.length; i++ ) {

				// Clean up the font name.
				name = names[ i ].replace( /[:&].*?$/, '' ).replace( '+', ' ' );

				// Add the font if it's not yet added.
				if ( -1 === loadedFonts.indexOf( name ) ) {
					loadedFonts.push( name );
				}
			}
		} );

		loadedFonts.sort();

		return loadedFonts;
	};

	FontPicker.getDefaultFonts = function() {
		var font, style, o, i, tags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
		var fontFamilies = {};

		// Go through each HTML tag.
		for ( i = 0; i < tags.length; i++ ) {

			// Create the dummy tag.
			o = document.createElement( tags[ i ] );
			o.style.height = '0px';
			o.style.display = 'none';
			document.body.appendChild( o );

			// Get the font name.
			style = getComputedStyle( o );

			// Cleanup the font name, remove the rest of the font stack and quotes.
			font = style.fontFamily.replace( /\s*,.*$/, '' ).replace( /['"]/g, '' );

			// Add the font if it's not yet there.
			if ( ! fontFamilies[ font ] ) {
				fontFamilies[ font ] = style.fontFamily;
			}

			if ( 'p' === tags[ i ] ) {
				this.defaultPFont = style.fontFamily;
			}

			// Remove the dummy tag.
			document.body.removeChild( o );
		}

		return fontFamilies;
	};

	FontPicker.getRecentlyUsedFonts = function() {
		var elements = document.querySelectorAll( '.pbs-main-wrapper [style*="font-family:"]' );
		var fontFamilies = {};
		Array.prototype.forEach.call( elements, function( el ) {

			var style = getComputedStyle( el );

			// Cleanup the font name, remove the rest of the font stack and quotes.
			var font = style.fontFamily.replace( /\s*,.*$/, '' ).replace( /['"]/g, '' );

			if ( ! font ) {
				return;
			}

			if ( ! fontFamilies[ font ] ) {
				fontFamilies[ font ] = style.fontFamily;
			}
		} );

		return fontFamilies;
	};

	FontPicker._addFontOptionEvents = function( option ) {
		option.addEventListener( 'mouseover', function( ev ) {
			this.clearOver();
			ev.target.classList.add( 'pbs-pick-over' );
		}.bind( this ) );

		option.addEventListener( 'mousedown', function( ev ) {
			ev.preventDefault();
			this.selectFont( ev.target.textContent, ev.target.getAttribute( 'data-font-family' ) );
			this.hidePopup();
		}.bind( this ) );
	};

	FontPicker.mountPopup = function() {
		var e, i, fontKeys, input, fontName, label, option, defaultFonts, loadedFonts, recentlyUsedFonts;

		FontPicker.__super__.constructor.mountPopup.call( this );

		/**
		 * Add the search field.
		 */
		input = document.createElement( 'INPUT' );
		input.setAttribute( 'type', 'text' );
		this._ceElement._domElement.insertBefore( input, this.popup );
		this.input = input;

		input.addEventListener( 'keyup', this.inputKeyupHandler.bind( this ) );
		input.addEventListener( 'keydown', this.inputKeydownHandler.bind( this ) );

		/**
		 * Create the font list.
		 */
		e = document.createElement( 'DIV' );

		loadedFonts = this.getLoadedFonts();
		defaultFonts = this.getDefaultFonts();
		recentlyUsedFonts = this.getRecentlyUsedFonts();

		// Merge default & loaded.
		for ( i = 0; i < loadedFonts.length; i++ ) {
			if ( ! defaultFonts.hasOwnProperty( loadedFonts[ i ] ) ) {
				defaultFonts[ loadedFonts[ i ] ] = loadedFonts[ i ];
			}
		}

		/**
		 * Add the fonts used by the site.
		 */
		label = document.createElement( 'LABEL' );
		label.innerHTML = pbsParams.labels.fonts_used_in_this_page;
		label.classList.add( 'pbs-font-option-site' );
		label.style.display = 'none';
		e.appendChild( label );

		fontKeys = Object.keys( defaultFonts );
		fontKeys.sort();

		for ( i = 0; i < fontKeys.length; i++ ) {
			fontName = fontKeys[ i ];
			label.style.display = '';
			option = document.createElement( 'DIV' );
			option.innerHTML = fontName;
			option.setAttribute( 'data-font', fontName.toLowerCase() );
			option.setAttribute( 'data-font-name', fontName );
			option.setAttribute( 'data-font-family', defaultFonts[ fontName ] );
			option.setAttribute( 'data-is-site-font', '1' );
			e.appendChild( option );

			this._addFontOptionEvents( option );
		}

		/**
		 * Recently used fonts.
		 */
		label = document.createElement( 'LABEL' );
		label.innerHTML = pbsParams.labels.fonts_recently_used;
		label.classList.add( 'pbs-font-option-recent' );
		label.style.display = 'none';
		e.appendChild( label );

		fontKeys = Object.keys( recentlyUsedFonts );
		fontKeys.sort();

		for ( i = 0; i < fontKeys.length; i++ ) {
			fontName = fontKeys[ i ];
			if ( defaultFonts.hasOwnProperty( fontName ) ) {
				continue;
			}

			label.style.display = '';

			option = document.createElement( 'DIV' );
			option.innerHTML = fontName;
			option.setAttribute( 'data-font', fontName.toLowerCase() );
			option.setAttribute( 'data-font-name', fontName );
			option.setAttribute( 'data-font-family', recentlyUsedFonts[ fontName ] );
			option.setAttribute( 'data-is-recent-font', '1' );
			e.appendChild( option );

			this._addFontOptionEvents( option );
		}

		/**
		 * Add the rest of the available fonts.
		 */
		label = document.createElement( 'LABEL' );
		label.innerHTML = pbsParams.labels.fonts_all;
		label.classList.add( 'pbs-font-option-all' );
		e.appendChild( label );

		for ( fontName in pbsParams.google_fonts ) {
			if ( ! pbsParams.google_fonts.hasOwnProperty( fontName ) ) {
				continue;
			}

			if ( defaultFonts.hasOwnProperty( fontName ) ) {
				continue;
			}
			if ( recentlyUsedFonts.hasOwnProperty( fontName ) ) {
				continue;
			}

			option = document.createElement( 'DIV' );
			option.innerHTML = fontName;
			option.setAttribute( 'data-font', fontName.toLowerCase() );
			option.setAttribute( 'data-font-name', fontName );
			option.setAttribute( 'data-font-family', fontName );
			e.appendChild( option );

			this._addFontOptionEvents( option );

		}

		label = document.createElement( 'DIV' );
		label.innerHTML = pbsParams.labels.no_results;
		label.setAttribute( 'data-no-results', '1' );
		label.style.display = 'none';
		e.appendChild( label );

		this.popup.appendChild( e );
	};

	FontPicker.hidePopup = function() {

		FontPicker.__super__.constructor.hidePopup.call( this );

		// Forget the previously selected text.
		this.rememberedSelection = null;

		// Unselect the input on blur.
		this._ceElement._domElement.querySelector( 'input' ).blur();
	};

	FontPicker.showPopup = function() {

		var elements, fontName, fontOption, h, t, th;

		FontPicker.__super__.constructor.showPopup.call( this );

		this._ceElement._domElement.querySelector( 'input' ).select();

		elements = this._ceElement._domElement.querySelectorAll( '[data-font]' );
		Array.prototype.forEach.call( elements, function( el, i ) {
			el.classList.remove( 'pbs-pick-over' );
			if ( 0 === i ) {
				el.classList.add( 'pbs-pick-over' );
			}
			el.style.display = '';
		} );

		fontName = this.input.value.trim().toLowerCase();
		fontOption = this._ceElement._domElement.querySelector( '[data-font="' + fontName + '"]' );
		if ( fontOption ) {
			this.clearOver();
			fontOption.classList.add( 'pbs-pick-over' );
			fontOption.parentNode.scrollTop = fontOption.offsetTop;

			// Adjust the scrolling to the top if the font is near the top.
			h = fontOption.parentNode.clientHeight;
			t = fontOption.offsetTop;
			th = fontOption.clientHeight;
			if ( t + th < h ) {
				fontOption.parentNode.scrollTop = 0;
			}
		}
	};

	return FontPicker;

} )( ContentTools.Tools.BasePopup );

/* globals ContentTools, __extends, pbsParams */

ContentTools.Tools.Uppercase = ( function( _super ) {
	__extends( Uppercase, _super );

	function Uppercase() {
		return Uppercase.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Uppercase, 'uppercase' );

	Uppercase.label = pbsParams.labels.uppercase;
	Uppercase.labelReset = pbsParams.labels.reset_case;

	Uppercase.icon = 'uppercase';

	Uppercase.tagName = 'span';

	Uppercase.canApply = function( element, selection ) {
		return ContentTools.Tools.Bold.canApply( element, selection );
	};

	Uppercase.isApplied = function( element, selection ) {
		var from = 0, to = 0, _ref;
		if ( element.content === void 0 || ! element.content.length() ) {
			return false;
		}
		if ( selection ) {
			_ref = selection.get(), from = _ref[0], to = _ref[1];
		}

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		return element.content.hasStyle( from, to, 'text-transform' );
	};

	Uppercase.apply = function( element, selection, callback ) {
		var from, to, _ref, style, newStyle;
		element.storeState();

		_ref = selection.get(), from = _ref[0], to = _ref[1];

		// If nothing is selected, adjust the whole element
		if ( from === to ) {
			from = 0;
			to = element.content.length();
		}

		style = element.content.substring( from, to ).getStyle( 'text-transform', element );
		if ( ! style || 'none' === style || 'lowercase' === style ) {
			style = 'uppercase';
		} else {
			style = 'none';
		}
		newStyle = { 'text-transform': style };

		element.content = element.content.style( from, to, element._tagName, newStyle );

		element.updateInnerHTML();
		element.taint();
		element.restoreState();
		return callback( true );
	};

	return Uppercase;

} )( ContentTools.Tool );

/* globals ContentTools, __extends, ContentEdit, pbsParams */

ContentTools.Tools.Button = ( function( _super ) {
	__extends( Button, _super );

	function Button() {
		return Button.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Button, 'button' );

	Button.label = pbsParams.labels.button;

	Button.icon = 'button';

	Button.buttonName = pbsParams.labels.button;

	Button.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Button.createNew = function( parent, index ) {
		var newElem = new ContentEdit.Button( 'p', {
			'data-ce-tag': 'button',
			'style': 'text-align: center'
		}, '<a class="pbs-button" href="">Button</a>' );
		parent.attach( newElem, index );
		newElem.focus();
	};

	return Button;

} )( ContentTools.Tools.ElementButton );

/* globals PBSEditor, ContentTools, ContentEdit */

var redoKey, code, matches, key, sc;

/**
 * All shortcut keys are defined here.
 */
PBSEditor.shortcuts = {
	'ctrl+r': function( element, selection ) {
		if ( ContentTools.Tools.Align.canApply( element, selection ) ) {
			ContentTools.Tools.Align._apply( 'right' );
		}
	},
	'ctrl+u': function( element, selection, callback ) {
		if ( ContentTools.Tools.Underline.canApply( element, selection ) ) {
			ContentTools.Tools.Underline.apply( element, selection, callback );
		}
	},
	'ctrl+e': function( element, selection ) {
		if ( ContentTools.Tools.Align.canApply( element, selection ) ) {
			ContentTools.Tools.Align._apply( 'center' );
		}
	},
	'ctrl+l': function( element, selection ) {
		if ( ContentTools.Tools.Align.canApply( element, selection ) ) {
			ContentTools.Tools.Align._apply( 'left' );
		}
	},
	'ctrl+j': function( element, selection ) {
		if ( ContentTools.Tools.Align.canApply( element, selection ) ) {
			ContentTools.Tools.Align._apply( 'justify' );
		}
	},
	'ctrl+i': function( element, selection, callback ) {
		if ( ContentTools.Tools.Italic.canApply( element, selection ) ) {
			ContentTools.Tools.Italic.apply( element, selection, callback );
		}
	},
	'ctrl+b': function( element, selection, callback ) {
		if ( ContentTools.Tools.Bold.canApply( element, selection ) ) {
			ContentTools.Tools.Bold.apply( element, selection, callback );
		}
	},
	'ctrl+k': function( element, selection, callback ) {
		if ( ContentTools.Tools.Link.canApply( element, selection ) ) {
			ContentTools.Tools.Link.apply( element, selection, callback );
		}
	},
	'ctrl+shift+k': function( element, selection, callback ) {
		if ( ContentTools.Tools.Button.canApply( element, selection ) ) {
			ContentTools.Tools.Button.apply( element, selection, callback );
		}
	},
	'ctrl+p': function( element, selection, callback ) {
		ContentTools.Tools.paragraphPicker.applyTag( element, 'p', selection, callback );
	},
	'ctrl+1': function( element, selection, callback ) {
		ContentTools.Tools.paragraphPicker.applyTag( element, 'h1', selection, callback );
	},
	'ctrl+2': function( element, selection, callback ) {
		ContentTools.Tools.paragraphPicker.applyTag( element, 'h2', selection, callback );
	},
	'ctrl+3': function( element, selection, callback ) {
		ContentTools.Tools.paragraphPicker.applyTag( element, 'h3', selection, callback );
	},
	'ctrl+4': function( element, selection, callback ) {
		ContentTools.Tools.paragraphPicker.applyTag( element, 'h4', selection, callback );
	},
	'ctrl+.': function( element, selection, callback ) {
		if ( ContentTools.Tools.UnorderedList.canApply( element, selection ) ) {
			ContentTools.Tools.UnorderedList.apply( element, selection, callback );
		}
	},
	'ctrl+/': function( element, selection, callback ) {
		if ( ContentTools.Tools.OrderedList.canApply( element, selection ) ) {
			ContentTools.Tools.OrderedList.apply( element, selection, callback );
		}
	},
	'ctrl+=': function( element, selection, callback ) {
		if ( ContentTools.Tools.FontSizeUp.canApply( element, selection ) ) {
			ContentTools.Tools.FontSizeUp.apply( element, selection, callback, 'up' );
		}
	},
	'ctrl+-': function( element, selection, callback ) {
		if ( ContentTools.Tools.FontSizeDown.canApply( element, selection ) ) {
			ContentTools.Tools.FontSizeDown.apply( element, selection, callback, 'down' );
		}
	},
	'ctrl+o': function( element, selection, callback ) {
		if ( ContentTools.Tools.Code.canApply( element, selection ) ) {
			ContentTools.Tools.Code.apply( element, selection, callback );
		}
	},
	'ctrl+z': function() {
		ContentTools.Tools.Undo.apply( null, null, function() {} );
	},
	'ctrl+m': function( element, selection, callback ) {
		ContentTools.Tools.pbsMedia.apply( element, selection, callback );
	}
};

redoKey = navigator.appVersion.indexOf( 'Mac' ) !== -1 ? 'ctrl+shift+z' : 'ctrl+y';
PBSEditor.shortcuts[ redoKey ] = function() {
	ContentTools.Tools.Redo.apply( null, null, function() {} );
};

/**
 * Adjust the toolbar labels from here.
 */
ContentTools.Tools.paragraphPicker.label += ' (ctrl+p/1/2/3)';
ContentTools.Tools.Bold.label += ' (ctrl+b)';
ContentTools.Tools.Italic.label += ' (ctrl+i)';
ContentTools.Tools.Underline.label += ' (ctrl+u)';
ContentTools.Tools.Link.label += ' (ctrl+k)';
ContentTools.Tools.Align.labelLeft += ' (ctrl+l)';
ContentTools.Tools.Align.labelCenter += ' (ctrl+e)';
ContentTools.Tools.Align.labelRight += ' (ctrl+r)';
ContentTools.Tools.Align.labelJustify += ' (ctrl+j)';


ContentTools.Tools.Code.label += ' (ctrl+o)';
ContentTools.Tools.UnorderedList.label += ' (ctrl+.)';
ContentTools.Tools.OrderedList.label += ' (ctrl+/)';
ContentTools.Tools.Undo.label += ' (ctrl+z)';
ContentTools.Tools.Redo.label += ' (' + redoKey + ')';

/**
 * Fix the shortcuts so that we can get the keycode combination.
 */
PBSEditor._shortcuts = {};
for ( code in PBSEditor.shortcuts ) {
	if ( PBSEditor.shortcuts.hasOwnProperty( code ) ) {

		// Split into modifier + key.
		matches = code.match( /(^.*\+)([^+]*)$/ );
		if ( ! matches.length ) {
			continue;
		}

		// "Ctrl+" or "ctrl+shift".
		key = matches[1];

		// The key.
		sc = matches[2];
		switch ( sc ) {
			case 'space':
				sc = 32;
				break;
			case 'up':
				sc = 38;
				break;
			case 'right':
				sc = 39;
				break;
			case 'down':
				sc = 40;
				break;
			case 'left':
				sc = 37;
				break;
			case 'tab':
				sc = 9;
				break;
			case 'enter':
				sc = 13;
				break;
			case '.':
				sc = 190;
				break;
			case '/':
				sc = 191;
				break;
			case '=':
				sc = 187;
				break;
			case '-':
				sc = 189;
				break;
			case 'delete':
				sc = 8;
				break;
		}

		if ( 'number' === typeof sc ) {
			key += sc;
		} else {
			sc = sc.match( /[a-z]/ ) ? sc.toUpperCase() : sc;
			key += sc.charCodeAt( 0 );
		}

		PBSEditor._shortcuts[ key ] = PBSEditor.shortcuts[ code ];
	}
}
PBSEditor.shortcuts = PBSEditor._shortcuts;
PBSEditor._shortcuts = null;

( function() {

	var getShortcutKey = function( ev ) {
		var key = '';
		if ( ev.metaKey || ev.ctrlKey ) {
			key += 'ctrl';
		}
		if ( ev.shiftKey ) {
			key += key ? '+' : '';
			key += 'shift';
		}
		if ( ! key ) {
			return;
		}
		key += '+' + ev.keyCode;

		return key;
	};

	var shortcutListener = function( ev ) {

		var key, element, selection = null;

		if ( ! PBS.isEditing ) {
			return;
		}

		key = getShortcutKey( ev );
		element = ContentEdit.Root.get().focused();

		if ( wp.hooks.applyFilters( 'pbs.shortcuts', false, key, element ) ) {
			ev.preventDefault();
			return;
		}

		if ( ! element ) {
			return;
		}

		if ( PBSEditor.shortcuts[ key ] ) {

			if ( element.selection ) {
				selection = element.selection();
			}

			ev.preventDefault();

			PBSEditor.shortcuts[ key ]( element, selection, function() {} );

			wp.hooks.doAction( 'pbs.shortcut.keyup' );

			ev.preventDefault();
			ev.stopPropagation();
			return;
		}
	};

	// Because we're listening on the document keydown event, some shortcuts will might
	// not trigger correctly and might continue with their default behavior (e.g. navigating columns),
	// this fixes this by handling the call from the Text Element level.
	// var elementKeyDownProxy = ContentEdit.Text.prototype._onKeyDown;
	// ContentEdit.Text.prototype._onKeyDown = function( ev ) {
	// 	shortcutListener( ev );
	//
	// 	ElementKeyDownProxy.call( this, ev );
	// };

	var ready = function() {
		document.addEventListener( 'keydown', shortcutListener );
	};
	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * Adminbar shortcuts.
 */
( function() {
	var ready = function() {
		document.addEventListener( 'keydown', function( ev ) {

			var editor = ContentTools.EditorApp.get();
			var element;

			// Don't allow saving when editing in smaller screens.
			if ( window.innerWidth <= 800 ) {
				return;
			}

			if ( ! PBS.isEditing ) {

				// Edit.
				if ( ( ev.metaKey || ev.ctrlKey ) && 69 === ev.keyCode ) {
					PBS.edit();
					ev.preventDefault();
				}

			} else {

				if ( ( ev.metaKey || ev.ctrlKey ) && ( 83 === ev.keyCode || 27 === ev.keyCode ) ) {
					ev.preventDefault();

					element = ContentEdit.Root.get().focused();
					if ( element ) {
						element.blur();
					}

					// Save.
					if ( 83 === ev.keyCode ) {
						PBS.save();

					// Cancel.
					} else {
						PBS.cancel();
					}

				} else if ( ( ev.metaKey || ev.ctrlKey ) && ev.shiftKey && 82 === ev.keyCode ) {

					// New reload shortcut.
					ev.preventDefault();
					location.reload();

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

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Toggle = ( function( _super ) {
	__extends( Toggle, _super );

	function Toggle() {
		return Toggle.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Toggle, 'toggle' );

	Toggle.label = pbsParams.labels.toggle;

	Toggle.icon = 'toggle';

	Toggle.tagName = 'toggle';

	Toggle.buttonName = pbsParams.labels.toggle;

	Toggle.apply = function( element, selection, callback ) {

		var index;

		// Don't allow toggle to be created inside toggle, create it after the current toggle.
		if ( window.pbsSelectorMatches( element._domElement, '[data-ce-tag="toggle"] *' ) ) {
			while ( element && 'Toggle' !== element.constructor.name ) {
				element = element.parent();
			}
		}

		index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Toggle.createNew = function( parent, index ) {

		var newElem;
		var elem = document.createElement( 'div' );
		elem.setAttribute( 'data-ce-tag', 'toggle' );

		/* jshint multistr: true */
		elem.innerHTML =
			'<input type="checkbox" data-ce-tag="toggleradio"/>' +
			'<label data-ce-tag="toggletab">Toggle</label>' +
			'<div class="pbs-row"><div class="pbs-col"><p>Toggle content</p></div></div>';

		newElem = ContentEdit.Toggle.fromDOMElement( elem );
		parent.attach( newElem, index );
		newElem.focus();
	};

	return Toggle;

} )( ContentTools.Tools.ElementButton );

/* globals ContentTools, __extends */

/**
 * This is a dummy tool that does nothing, and is meant to be placed in the
 * formatting toolbar as placeholders for premium buttons when built as a lite
 * version. The label and icon properties are meant to be overridden.
 */

ContentTools.Tools.PremiumFormatting = ( function( _super ) {
  __extends( PremiumFormatting, _super );

  function PremiumFormatting() {
	return PremiumFormatting.__super__.constructor.apply( this, arguments );
  }

  ContentTools.ToolShelf.stow( PremiumFormatting, 'premium-formatting' );

  PremiumFormatting.label = '';
  PremiumFormatting.labelReset = '';

  PremiumFormatting.icon = '';

  PremiumFormatting.canApply = function( element, selection ) {
	return ContentTools.Tools.Bold.canApply( element, selection );
  };

  PremiumFormatting.isApplied = function() {
	  return false;
  };

  PremiumFormatting.apply = function( element, selection, callback ) {
	  return callback( true );
  };

  return PremiumFormatting;

} )( ContentTools.Tool );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.PageHeading = ( function( _super ) {
	__extends( PageHeading, _super );

	function PageHeading() {
		return PageHeading.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( PageHeading, 'page-heading' );

	PageHeading.label = pbsParams.labels.page_heading;

	PageHeading.icon = 'page-heading';

	PageHeading.buttonName = pbsParams.labels.page_heading;

	PageHeading.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	PageHeading.createNew = function( parent, index ) {
		var row = new ContentEdit.DivRow( 'div' );
		var col = new ContentEdit.DivCol( 'div' );
		var phTitle = new ContentEdit.Text( 'h1', {}, 'This Is Your Page Heading' );
		var phContent = new ContentEdit.Text( 'p', {}, 'Some additional description to accompany the page heading.' );
		var phButton = new ContentEdit.Button( 'p', {
			'data-ce-tag': 'button',
			'style': 'text-align: center'
		}, '<a class="pbs-button pbs-button-ghost" href="" style="background-color: rgb(117, 196, 87); border-color: rgb(117, 196, 87); color: rgb(117, 196, 87);">Learn More</a>' );

		parent.attach( row, index );
		row.attach( col );
		col.attach( phTitle );
		col.attach( phContent );
		col.attach( phButton );

		row.attr( 'data-width', 'full-width' );
		row.attr( 'style', 'min-height: 500px; background-image: linear-gradient(rgba(15, 15, 15, 0.5), rgba(15, 15, 15, 0.5)), url("https://source.unsplash.com/category/nature/1400x800"); background-color: rgba(15, 15, 15, 0.5); background-size: cover; color: rgb(255, 255, 255);' );
		col.attr( 'style', 'justify-content: center;' );
		phTitle.attr( 'style', 'margin-bottom: 0px; text-align: center;' );
		phContent.attr( 'style', 'text-align: center;' );

		window._pbsFixRowWidth( row._domElement );
	};

	return PageHeading;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Featurette = ( function( _super ) {
	__extends( Featurette, _super );

	function Featurette() {
		return Featurette.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Featurette, 'featurette' );

	Featurette.label = pbsParams.labels.featurette;

	Featurette.icon = 'featurette';

	Featurette.buttonName = pbsParams.labels.featurette;

	Featurette.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Featurette.createNew = function( parent, index ) {

		var row = new ContentEdit.DivRow( 'div' );
		var col = new ContentEdit.DivCol( 'div' );
		var h2Title = new ContentEdit.Text( 'h2', {}, 'Our Services' );
		var p1 = new ContentEdit.Text( 'p', {}, 'Consectetur adipiscing elit. Nullam ex velit, laoreet sit amet sollicitudin sit amet, commodo eu justo. Proin dolor augue, imperdiet id mi a, suscipit lacinia risus. Mauris tortor ex, rhoncus vitae libero sed.' );
		var p2 = new ContentEdit.Button( 'p', {
			'data-ce-tag': 'button',
			'style': 'text-align: left'
		}, '<a class="pbs-button" href="' + pbsParams.site_url + '" style="background-color: rgb(253, 61, 63); border-color: rgb(253, 61, 63);">Learn More</a>' );

		row.attach( col );
		row.attr( 'data-width', 'full-width' );
		row.attr( 'style', 'min-height: 450px;' );
		col.attr( 'style', 'background-image: url("https://source.unsplash.com/800x450?office")' );

		col.style( 'flex-basis', '50%' );

		col = new ContentEdit.DivCol( 'div' );

		row.attach( col );
		col.attach( h2Title );
		col.attach( p1 );
		col.attach( p2 );
		col.attr( 'style', 'padding-left: 50px; padding-right: 50px; justify-content: center;' );
		h2Title.attr( 'style', 'margin-bottom: 30px;' );
		col.style( 'flex-basis', '50%' );

		parent.attach( row, index );
	};

	return Featurette;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.TeamMembers = ( function( _super ) {
	__extends( TeamMembers, _super );

	function TeamMembers() {
		return TeamMembers.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( TeamMembers, 'team-members' );

	TeamMembers.label = pbsParams.labels.team_members;

	TeamMembers.icon = 'team-members';

	TeamMembers.buttonName = pbsParams.labels.team_members;

	TeamMembers.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	TeamMembers.createNew = function( parent, index ) {
		var newRow, row = document.createElement( 'DIV' );
		row.setAttribute( 'style', 'min-height: 350px; background-size: cover; margin-top: 20px;' );

		row.innerHTML = '<div class="pbs-col" style="flex-basis: 25%;">' +
			'<img alt="" class="aligncenter size-full wp-image-7117" height="150" src="https://source.unsplash.com/150x150?person" style="border-radius: 141px; margin-bottom: 20px; height: auto; width: 150px;" width="150" srcset="//pagebuildersandwich.com/wp-content/uploads/2017/01/pbs-portfolio-template-05.jpg 300w, //pagebuildersandwich.com/wp-content/uploads/2017/01/pbs-portfolio-template-05-150x150.jpg 150w" sizes="(max-width: 150px) 100vw, 150px">' +
			'<p style="text-align: center; margin-bottom: 0px;">Ben Ingridson</p>' +
			'<p style="text-align: center; margin-bottom: 0px;"><span style="text-transform:uppercase;">President</span></p>' +
			'<div class="pbs-row" style="">' +
			'<div class="pbs-col" data-orientation="horizontal" style="justify-content: center;">' +
			'<div data-ce-tag="icon" role="presentation" style="height: 40px; width: 40px;"><a href="http://facebook.com/WP_PBSandwich"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M13 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5.655V9.443H6.668V7.417h1.987v-1.85c0-1.36.88-2.61 2.907-2.61.82 0 1.426.08 1.426.08l-.046 1.892s-.62-.006-1.297-.006c-.73 0-.848.337-.848.894v1.599H13l-.097 2.027h-2.105V15H13a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2z" fill="#3c5a96"></path></svg></a></div>' +
			'<div data-ce-tag="icon" role="presentation" style="height: 40px; width: 40px;"><a href="http://twitter.com/WP_PBSandwich"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M15 3.627a5.705 5.705 0 0 1-1.65.452 2.88 2.88 0 0 0 1.263-1.59 5.75 5.75 0 0 1-1.822.697 2.872 2.872 0 0 0-4.895 2.62 8.157 8.157 0 0 1-5.92-3.002 2.87 2.87 0 0 0 .888 3.835 2.87 2.87 0 0 1-1.3-.36v.038c0 1.392.988 2.552 2.303 2.816a2.897 2.897 0 0 1-1.297.05 2.872 2.872 0 0 0 2.682 1.992A5.758 5.758 0 0 1 1 12.366a8.118 8.118 0 0 0 4.402 1.29c5.284 0 8.174-4.377 8.174-8.172 0-.124-.004-.248-.01-.37A5.84 5.84 0 0 0 15 3.626z" fill="#2aa9e0"></path></svg></a></div>' +
			'</div>' +
			'</div>' +
			'</div>' +
			'<div class="pbs-col" style="flex-basis: 25%;">' +
			'<img alt="" class="aligncenter size-full wp-image-7117" height="150" src="https://source.unsplash.com/150x150?face" style="border-radius: 141px; margin-bottom: 20px; height: auto; width: 150px;" width="150" srcset="//pagebuildersandwich.com/wp-content/uploads/2017/01/pbs-portfolio-template-05.jpg 300w, //pagebuildersandwich.com/wp-content/uploads/2017/01/pbs-portfolio-template-05-150x150.jpg 150w" sizes="(max-width: 150px) 100vw, 150px">' +
			'<p style="text-align: center; margin-bottom: 0px;">Diane Kelsey</p>' +
			'<p style="text-align: center; margin-bottom: 0px;"><span style="text-transform:uppercase;">Vice President</span></p>' +
			'<div class="pbs-row" style="">' +
			'<div class="pbs-col" data-orientation="horizontal" style="justify-content: center;">' +
			'<div data-ce-tag="icon" role="presentation" style="height: 40px; width: 40px;"><a href="http://facebook.com/WP_PBSandwich"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M13 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5.655V9.443H6.668V7.417h1.987v-1.85c0-1.36.88-2.61 2.907-2.61.82 0 1.426.08 1.426.08l-.046 1.892s-.62-.006-1.297-.006c-.73 0-.848.337-.848.894v1.599H13l-.097 2.027h-2.105V15H13a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2z" fill="#3c5a96"></path></svg></a></div>' +
			'<div data-ce-tag="icon" role="presentation" style="height: 40px; width: 40px;"><a href="http://twitter.com/WP_PBSandwich"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M15 3.627a5.705 5.705 0 0 1-1.65.452 2.88 2.88 0 0 0 1.263-1.59 5.75 5.75 0 0 1-1.822.697 2.872 2.872 0 0 0-4.895 2.62 8.157 8.157 0 0 1-5.92-3.002 2.87 2.87 0 0 0 .888 3.835 2.87 2.87 0 0 1-1.3-.36v.038c0 1.392.988 2.552 2.303 2.816a2.897 2.897 0 0 1-1.297.05 2.872 2.872 0 0 0 2.682 1.992A5.758 5.758 0 0 1 1 12.366a8.118 8.118 0 0 0 4.402 1.29c5.284 0 8.174-4.377 8.174-8.172 0-.124-.004-.248-.01-.37A5.84 5.84 0 0 0 15 3.626z" fill="#2aa9e0"></path></svg></a></div>' +
			'</div>' +
			'</div>' +
			'</div>' +
			'<div class="pbs-col" style="flex-basis: 25%;">' +
			'<img alt="" class="aligncenter size-full wp-image-7117" height="150" src="https://source.unsplash.com/150x150?guy" style="border-radius: 141px; margin-bottom: 20px; height: auto; width: 150px;" width="150" srcset="//pagebuildersandwich.com/wp-content/uploads/2017/01/pbs-portfolio-template-05.jpg 300w, //pagebuildersandwich.com/wp-content/uploads/2017/01/pbs-portfolio-template-05-150x150.jpg 150w" sizes="(max-width: 150px) 100vw, 150px">' +
			'<p style="text-align: center; margin-bottom: 0px;">Reginald Duncan</p>' +
			'<p style="text-align: center; margin-bottom: 0px;"><span style="font-weight:300;text-transform:uppercase;">Writer</span></p>' +
			'<div class="pbs-row" style="">' +
			'<div class="pbs-col" data-orientation="horizontal" style="justify-content: center;">' +
			'<div data-ce-tag="icon" role="presentation" style="height: 40px; width: 40px;"><a href="http://facebook.com/WP_PBSandwich"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M13 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5.655V9.443H6.668V7.417h1.987v-1.85c0-1.36.88-2.61 2.907-2.61.82 0 1.426.08 1.426.08l-.046 1.892s-.62-.006-1.297-.006c-.73 0-.848.337-.848.894v1.599H13l-.097 2.027h-2.105V15H13a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2z" fill="#3c5a96"></path></svg></a></div>' +
			'<div data-ce-tag="icon" role="presentation" style="height: 40px; width: 40px;"><a href="http://twitter.com/WP_PBSandwich"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M15 3.627a5.705 5.705 0 0 1-1.65.452 2.88 2.88 0 0 0 1.263-1.59 5.75 5.75 0 0 1-1.822.697 2.872 2.872 0 0 0-4.895 2.62 8.157 8.157 0 0 1-5.92-3.002 2.87 2.87 0 0 0 .888 3.835 2.87 2.87 0 0 1-1.3-.36v.038c0 1.392.988 2.552 2.303 2.816a2.897 2.897 0 0 1-1.297.05 2.872 2.872 0 0 0 2.682 1.992A5.758 5.758 0 0 1 1 12.366a8.118 8.118 0 0 0 4.402 1.29c5.284 0 8.174-4.377 8.174-8.172 0-.124-.004-.248-.01-.37A5.84 5.84 0 0 0 15 3.626z" fill="#2aa9e0"></path></svg></a></div>' +
			'</div>' +
			'</div>' +
			'</div>';

		newRow = ContentEdit.DivRow.fromDOMElement( row );
		parent.attach( newRow, index );
	};

	return TeamMembers;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Gallery = ( function( _super ) {
	__extends( Gallery, _super );

	function Gallery() {
		return Gallery.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Gallery, 'gallery' );

	Gallery.label = pbsParams.labels.gallery;

	Gallery.icon = 'gallery';

	Gallery.buttonName = pbsParams.labels.gallery;

	Gallery.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Gallery.createNew = function( parent, index ) {
		var newRow;
		var row = document.createElement( 'DIV' );
		row.setAttribute( 'style', 'background-color: rgb(248, 248, 248);' );
		row.setAttribute( 'data-width', 'full-width-retain-content' );

		row.innerHTML =
		'<div class="pbs-col">' +
		'<h2 style="text-align: center;"> <span style="color: #ff6863;">Our Recent Work</span></h2>' +
		'<p style="text-align: center;"><span style="color: #999999;">Consectetur adipiscing elit. Nullam ex velit, laoreet sit amet sollicitudin sit amet, commodo eu justo. Proin dolor augue,</span><br> <span style="color: #999999;">imperdiet id mi a, suscipit lacinia risus. Mauris tortor ex, rhoncus vitae libero sed.</span></p>' +
		'<div class="glide--carousel glide--horizontal glide--slider pbs-carousel-done" data-ce-tag="carousel" data-full-height="">' +
		'<div class="glide__wrapper">' +
		'<div class="glide__track" style="width: 3346px; transition: all 400ms cubic-bezier(0.165, 0.84, 0.44, 1); transform: translate3d(0px, 0px, 0px);">' +
		'<div class="glide__slide active" style="width: 1673px;">' +
		'<div class="pbs-row">' +
		'<div class="pbs-col" style="border: 1px solid rgb(232, 232, 232); margin-right: 15px; background-color: rgb(255, 255, 255);">' +
		'<img class="size-medium size-full aligncenter wp-image-2010" height="400" src="https://source.unsplash.com/400x400?building" style="margin-bottom: 30px;" width="400">' +
		'<h4 style="margin-top: 0px; margin-bottom: 10px;"> Building </h4>' +
		'<p>Consectetur adipiscing elit. Nullam ex velit, laoreet sit amet sollicitudin sit amet, commodo eu justo.</p>' +
		'</div>' +
		'<div class="pbs-col" style="border: 1px solid rgb(232, 232, 232); margin-right: 15px; background-color: rgb(255, 255, 255);">' +
		'<img class="size-thumbnail aligncenter size-full wp-image-2010" height="400" src="https://source.unsplash.com/400x400?nature" style="margin-bottom: 30px;" width="400">' +
		'<h4 style="margin-top: 0px; margin-bottom: 10px;"> Nature </h4>' +
		'<p>Consectetur adipiscing elit. Nullam ex velit, laoreet sit amet sollicitudin sit amet, commodo eu justo.</p>' +
		'</div>' +
		'<div class="pbs-col" style="border: 1px solid rgb(232, 232, 232); background-color: rgb(255, 255, 255);">' +
		'<img class="aligncenter size-full wp-image-2010" height="400" src="https://source.unsplash.com/400x400?mountain" width="400">' +
		'<h4 style="margin-top: 0px; margin-bottom: 10px;"> Mountain </h4>' +
		'<p>Consectetur adipiscing elit. Nullam ex velit, laoreet sit amet sollicitudin sit amet, commodo eu justo.</p>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'<div class="glide__slide" style="width: 1673px;">' +
		'<div class="pbs-row">' +
		'<div class="pbs-col" style="border: 1px solid rgb(232, 232, 232); margin-right: 15px; background-color: rgb(255, 255, 255);">' +
		'<img class="size-medium size-full aligncenter wp-image-2010" height="400" src="https://source.unsplash.com/400x400?lake" style="margin-bottom: 30px;" width="400">' +
		'<h4 style="margin-top: 0px; margin-bottom: 10px;"> Lake </h4>' +
		'<p>Consectetur adipiscing elit. Nullam ex velit, laoreet sit amet sollicitudin sit amet, commodo eu justo.</p>' +
		'</div>' +
		'<div class="pbs-col" style="border: 1px solid rgb(232, 232, 232); margin-right: 15px; background-color: rgb(255, 255, 255);">' +
		'<img class="size-thumbnail aligncenter size-full wp-image-2010" height="400" src="https://source.unsplash.com/400x400?sky" style="margin-bottom: 30px;" width="400">' +
		'<h4 style="margin-top: 0px; margin-bottom: 10px;"> Sky </h4>' +
		'<p>Consectetur adipiscing elit. Nullam ex velit, laoreet sit amet sollicitudin sit amet, commodo eu justo.</p>' +
		'</div>' +
		'<div class="pbs-col" style="border: 1px solid rgb(232, 232, 232); background-color: rgb(255, 255, 255);">' +
		'<img class="aligncenter size-full wp-image-2010" height="400" src="https://source.unsplash.com/400x400?road" width="400">' +
		'<h4 style="margin-top: 0px; margin-bottom: 10px;"> Road </h4>' +
		'<p>Consectetur adipiscing elit. Nullam ex velit, laoreet sit amet sollicitudin sit amet, commodo eu justo.</p>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'<div class="glide__bullets" data-ce-tag="static"><button class="glide__bullet active" data-glide-dir="=1"></button><button class="glide__bullet" data-glide-dir="=2"></button></div>' +
		'</div>' +
		'</div>' +
		'</div>';

		newRow = ContentEdit.DivRow.fromDOMElement( row );
		parent.attach( newRow, index );
	};

	return Gallery;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.CallToAction = ( function( _super ) {
	__extends( CallToAction, _super );

	function CallToAction() {
		return CallToAction.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( CallToAction, 'call-to-action' );

	CallToAction.label = pbsParams.labels.call_to_action;

	CallToAction.icon = 'call-to-action';

	CallToAction.buttonName = pbsParams.labels.call_to_action;

	CallToAction.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	CallToAction.createNew = function( parent, index ) {
		var row = new ContentEdit.DivRow( 'div' );
		var col = new ContentEdit.DivCol( 'div' );
		var p = new ContentEdit.Text( 'h3', {}, 'This Is Your Call to Action' );

		parent.attach( row, index );
		row.attach( col );
		col.attach( p );

		row.attr( 'data-width', 'full-width-retain-content' );
		row.attr( 'style', 'min-height: 120px; background-color: rgb(237, 237, 237);' );
		col.attr( 'style', 'justify-content: center; flex-basis: 70%;' );
		p.focus();

		col = new ContentEdit.DivCol( 'div' );
		p = new ContentEdit.Button( 'p', {
			'data-ce-tag': 'button',
			'style': 'text-align: right'
		}, '<a class="pbs-button" href="" style="background-color: rgb(117, 196, 87); border-color: rgb(117, 196, 87);">Learn More</a>' );

		row.attach( col );
		col.attach( p );

		col.attr( 'style', 'justify-content: center; flex-basis: 30%;' );

		window._pbsFixRowWidth( row._domElement );
	};

	return CallToAction;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.Testimonial = ( function( _super ) {
	__extends( Testimonial, _super );

	function Testimonial() {
		return Testimonial.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( Testimonial, 'testimonial' );

	Testimonial.label = pbsParams.labels.testimonial;

	Testimonial.icon = 'testimonial';

	Testimonial.buttonName = pbsParams.labels.testimonial;

	Testimonial.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	Testimonial.createNew = function( parent, index ) {

		var img, TestimonialAvatar;

		var TestimonialName = new ContentEdit.Text( 'p', {}, '<span style="font-weight:bold;">Charlie Smith</span>' );

		var TestimonialContent = new ContentEdit.Text( 'p', {}, '“I am really satisfied with my website. Needless to say we are extremely satisfied with the results.”' );
		TestimonialContent.attr( 'style', 'text-align: center; margin-bottom: 15px;' );

		img = document.createElement( 'IMG' );
		img.setAttribute( 'height', '100' );
		img.setAttribute( 'width', '100' );
		img.classList.add( 'aligncenter' );
		img.classList.add( 'ce-element' );
		img.classList.add( 'ce-element--type-image' );
		img.classList.add( 'wp-image-' + pbsParams.dummy_image_id );
		img.setAttribute( 'data-ce-size', 'w 100 x h 1' );
		img.setAttribute( 'alt', 'Charlie Smith' );
		img.setAttribute( 'src', 'https://source.unsplash.com/category/people/300x300?face,head' );
		img.setAttribute( 'style', 'margin-bottom: 15px; border-radius: 150px;' );

		TestimonialAvatar = ContentEdit.Image.fromDOMElement( img );

		parent.attach( TestimonialName, index );
		parent.attach( TestimonialAvatar, index );
		parent.attach( TestimonialContent, index );

		TestimonialName.style( 'text-align', 'center' );
		TestimonialName.focus();
	};

	return Testimonial;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.ContactDetails = ( function( _super ) {
	__extends( ContactDetails, _super );

	function ContactDetails() {
		return ContactDetails.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( ContactDetails, 'contact-details' );

	ContactDetails.label = pbsParams.labels.contact_details;

	ContactDetails.icon = 'contact-details';

	ContactDetails.buttonName = pbsParams.labels.contact_details;

	ContactDetails.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	ContactDetails.createNew = function( parent, index ) {
		var address, telephone, email, phone;
		var div = document.createElement( 'DIV' );
		div.innerHTML = '<div data-ce-size="w 60 × h 60" data-ce-tag="icon" role="presentation" style="height: 40px; width: 40px;"><svg viewbox="0 0 20 20"><path d="M10 2q-1.63 0-3.01.805T4.805 4.99 4 8q0 1.42.7 2.665t1.83 2.225q.04.03.235.195t.295.255.3.275.345.33.33.355.345.42q1.33 1.74 1.62 2.71.29-.97 1.62-2.71.16-.21.345-.42t.33-.355.345-.33.3-.275.295-.255.235-.195q1.13-.98 1.83-2.225T16 8q0-1.63-.805-3.01T13.01 2.805 10 2zm0 2.56q1.42 0 2.43 1.01T13.44 8t-1.01 2.43T10 11.44t-2.43-1.01T6.56 8t1.01-2.43T10 4.56z"></path></svg></div><p>1405 Bastin Drive, Philadelphia, Pennsylvania 19108</p>';
		div.setAttribute( 'data-ce-tag', 'iconlabel' );
		div.setAttribute( 'style', 'margin-bottom: 10px;' );
		address = ContentEdit.IconLabel.fromDOMElement( div );

		div = document.createElement( 'DIV' );
		div.innerHTML = '<div data-ce-size="w 60 × h 60" data-ce-tag="icon" role="presentation" style="height: 40px; width: 40px;"><svg viewBox="0 0 22 28" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M22 19.375q0 .422-.156 1.102t-.328 1.07q-.328.78-1.906 1.656-1.47.797-2.906.797-.422 0-.82-.055t-.898-.195-.742-.227-.867-.32-.766-.28q-1.53-.548-2.733-1.298-2-1.234-4.133-3.367t-3.367-4.133q-.75-1.203-1.297-2.734-.047-.14-.28-.765t-.32-.867-.228-.742-.195-.898-.055-.82q0-1.437.797-2.906.874-1.578 1.655-1.906.39-.172 1.07-.328t1.102-.156q.22 0 .328.047.28.093.828 1.187.172.297.47.844t.546.993.483.836q.047.062.273.39t.336.555.11.445q0 .313-.446.78t-.97.86-.968.828-.445.72q0 .14.078.35t.134.32.22.376.18.297Q6.97 13.973 8.5 15.504t3.672 2.72q.03.015.297.18t.376.218.32.134.352.078q.28 0 .72-.445t.827-.97.86-.968.78-.446q.22 0 .445.11t.555.335.39.272q.392.234.837.484t.992.547.844.47q1.094.546 1.188.827.047.11.047.328z">icon</path></svg></div><p>484-779-5262 / 484-386-7827</p>';
		div.setAttribute( 'data-ce-tag', 'iconlabel' );
		div.setAttribute( 'style', 'margin-bottom: 10px;' );
		telephone = ContentEdit.IconLabel.fromDOMElement( div );

		div = document.createElement( 'DIV' );
		div.innerHTML = '<div data-ce-size="w 60 × h 60" data-ce-tag="icon" role="presentation" style="height: 40px; width: 40px;"><svg viewBox="0 0 20 20"><path d="M6 2h8q.41 0 .705.295T15 3v14q0 .41-.295.705T14 18H6q-.41 0-.705-.295T5 17V3q0-.41.295-.705T6 2zm7 12V4H7v10h6zM8 5h4l-4 5V5z"></path></svg></div><p>484-296-1982</p>';
		div.setAttribute( 'data-ce-tag', 'iconlabel' );
		div.setAttribute( 'style', 'margin-bottom: 10px;' );
		phone = ContentEdit.IconLabel.fromDOMElement( div );

		div = document.createElement( 'DIV' );
		div.innerHTML = '<div data-ce-size="w 60 × h 60" data-ce-tag="icon" role="presentation" style="height: 40px; width: 40px;"><svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M19 14.5v-9q0-.62-.44-1.06T17.5 4H3.49q-.62 0-1.06.44T1.99 5.5v9q0 .62.44 1.06t1.06.44H17.5q.62 0 1.06-.44T19 14.5zm-1.31-9.11q.15.15.175.325t-.04.295-.165.22L13.6 9.95l3.9 4.06q.26.3.06.51-.09.11-.28.12t-.28-.07l-4.37-3.73-2.14 1.95-2.13-1.95-4.37 3.73q-.09.08-.28.07t-.28-.12q-.2-.21.06-.51l3.9-4.06-4.06-3.72q-.1-.1-.165-.22t-.04-.295.175-.325q.4-.4.95.07l6.24 5.04 6.25-5.04q.55-.47.95-.07z">icon</path></svg></div><p><a href="mailto:company@gmail.com">company@gmail.com</a></p>';
		div.setAttribute( 'data-ce-tag', 'iconlabel' );
		div.setAttribute( 'style', 'margin-bottom: 10px;' );
		email = ContentEdit.IconLabel.fromDOMElement( div );

		parent.attach( address, index );
		parent.attach( telephone, index + 1 );
		parent.attach( phone, index + 2 );
		parent.attach( email, index + 3 );

		address.focus();
	};

	return ContactDetails;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.IconLabel = ( function( _super ) {
	__extends( IconLabel, _super );

	function IconLabel() {
		return IconLabel.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( IconLabel, 'icon-label' );

	IconLabel.label = pbsParams.labels.icon_label;

	IconLabel.icon = 'icon-label';

	IconLabel.tagName = 'div';

	IconLabel.buttonName = pbsParams.labels.icon_label;

	IconLabel.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	IconLabel.createNew = function( parent, index ) {

		var newElem;
		var elem = document.createElement( 'DIV' );
		elem.setAttribute( 'data-ce-tag', 'iconlabel' );

		elem.innerHTML = '<div data-ce-tag="icon" role="presentation" style="height: 60px; width: 60px;" data-ce-size="w 60 × h 60"><svg viewBox="0 0 20 20"><path d="M15.45 6.25q.89.46 1.275 1.3t.225 1.81-.8 1.87q-.59.83-1.595 1.345t-1.865.435L10.05 18H9l-2.65-4.99q-.85.12-1.895-.4T2.8 11.22q-.64-.9-.8-1.87t.23-1.81 1.28-1.29q.68-.34 1.43-.31-.02.62.07 1.21.2 1.29.995 2.52t1.865 1.85q-.3.86-.88 1.25L9 16.58v-5.66q-1.02-.28-1.915-1.44T6 7q-.2-1.32.16-2.46T7.4 2.7 9.5 2t2.1.7 1.24 1.84T13 7q-.19 1.32-1.085 2.48T10 10.92v5.77l2.07-3.84q-.63-.33-.99-1.3 1.09-.61 1.9-1.855t1.01-2.545q.09-.59.07-1.22.73-.02 1.39.32z"></path></svg></div><p>This is your icon label</p>';

		newElem = ContentEdit.IconLabel.fromDOMElement( elem );

		parent.attach( newElem, index );

		newElem.focus();
	};

	return IconLabel;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.PricingTable = ( function( _super ) {
	__extends( PricingTable, _super );

	function PricingTable() {
		return PricingTable.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( PricingTable, 'pricing-table' );

	PricingTable.label = pbsParams.labels.pricing_table;

	PricingTable.icon = 'pricing-table';

	PricingTable.buttonName = pbsParams.labels.pricing_table;

	PricingTable.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	PricingTable.createNew = function( parent, index ) {
		var newRow;
		var row = document.createElement( 'DIV' );
		row.setAttribute( 'style', 'margin-bottom: 80px;' );

		row.innerHTML =
		'<div class="pbs-col" style="flex-basis: 25%; border-style: solid; border-width: 1px; border-color: rgb(229, 228, 228); background-size: cover; align-self: flex-end; padding-top: 40px; padding-bottom: 40px; margin-right: 50px;">' +
		'<h3 style="margin-bottom: 40px; text-align: center;">  <span style="color:rgb(51, 51, 51);">Lite</span></h3>' +
		'<p style="text-align: center; margin-bottom: 10px;"><span style="font-size:calc(1rem + 1.8vw);color:#41d5c2;">$9.99</span></p>' +
		'<p style="text-align: center; margin-bottom: 10px;">per year</p>' +
		'<hr style="background-image: linear-gradient(0deg, transparent, rgb(229, 228, 228), transparent); margin-bottom: 10px; margin-top: 10px;">' +
		'<p style="text-align: center;">10GB Storage</p>' +
		'<p style="text-align: center;">10 Emails</p>' +
		'<p style="text-align: center;">10 Domains</p>' +
		'<p style="text-align: center;">1GB Bandwidth</p>' +
		'<p style="text-align: center;"><span style="color:#e5e4e4;">Page Builder</span></p>' +
		'<p data-ce-tag="button" style="text-align: center; margin-top: 10px; margin-bottom: 0px;"><a class="pbs-button" href="" style="background-color: rgb(0, 164, 237); border-color: rgb(0, 164, 237);">Buy Now</a></p>' +
		'</div>' +
		'<div class="pbs-col pbs-shadow-simple-4-2" style="flex-basis: 25%; border-style: solid; border-width: 1px; border-color: rgb(229, 228, 228); background-size: cover; align-self: flex-end; padding-top: 40px; padding-bottom: 40px; margin-right: 50px;">' +
		'<h3 style="margin-bottom: 0px; text-align: center;">  <span style="color:rgb(51, 51, 51);">Pro</span></h3>' +
		'<p style="text-align: center; margin-bottom: 30px;"><span style="color:#00a4ed;">Best Seller</span></p>' +
		'<p style="text-align: center; margin-bottom: 10px;"><span style="font-size:calc(1rem + 1.8vw);color:#41d5c2;">$24.99</span></p>' +
		'<p style="text-align: center; margin-bottom: 10px;">per year</p>' +
		'<hr style="background-image: linear-gradient(0deg, transparent, rgb(229, 228, 228), transparent); margin-bottom: 10px; margin-top: 10px;">' +
		'<p style="text-align: center;">25GB Storage</p>' +
		'<p style="text-align: center;">25 Emails</p>' +
		'<p style="text-align: center;">25 Domains</p>' +
		'<p style="text-align: center;">25GB Bandwidth</p>' +
		'<p style="text-align: center;">Page Builder</p>' +
		'<p data-ce-tag="button" style="text-align: center; margin-top: 10px; margin-bottom: 0px;"><a class="pbs-button" href="" style="background-color: rgb(0, 164, 237); border-color: rgb(0, 164, 237);">Buy Now</a></p>' +
		'</div>' +
		'<div class="pbs-col" style="flex-basis: 25%; border-style: solid; border-width: 1px; border-color: rgb(229, 228, 228); background-size: cover; align-self: flex-end; padding-top: 40px; padding-bottom: 40px; margin-right: 50px;">' +
		'<h3 style="margin-bottom: 40px; text-align: center;">  <span style="color:rgb(51, 51, 51);">Agency</span></h3>' +
		'<p style="text-align: center; margin-bottom: 10px;"><span style="font-size:calc(1rem + 1.8vw);color:#41d5c2;">$49.99</span></p>' +
		'<p style="text-align: center; margin-bottom: 10px;">per year</p>' +
		'<hr style="background-image: linear-gradient(0deg, transparent, rgb(229, 228, 228), transparent); margin-bottom: 10px; margin-top: 10px;">' +
		'<p style="text-align: center;">50GB Storage</p>' +
		'<p style="text-align: center;">50 Emails</p>' +
		'<p style="text-align: center;">50 Domains</p>' +
		'<p style="text-align: center;">50GB Bandwidth</p>' +
		'<p style="text-align: center;">Page Builder</p>' +
		'<p data-ce-tag="button" style="text-align: center; margin-top: 10px; margin-bottom: 0px;"><a class="pbs-button" href="" style="background-color: rgb(0, 164, 237); border-color: rgb(0, 164, 237);">Buy Now</a></p>' +
		'</div>' +
		'</div>';

		newRow = ContentEdit.DivRow.fromDOMElement( row );
		parent.attach( newRow, index );
	};

	return PricingTable;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.ImageBox = ( function( _super ) {
	__extends( ImageBox, _super );

	function ImageBox() {
		return ImageBox.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( ImageBox, 'image-box' );

	ImageBox.label = pbsParams.labels.image_box;

	ImageBox.icon = 'image-box';

	ImageBox.buttonName = pbsParams.labels.image_box;

	ImageBox.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	ImageBox.createNew = function( parent, index ) {
		var img;
		var imageBoxTitle = new ContentEdit.Text( 'h4', {}, 'Your Image Heading' );
		var imageBoxContent = new ContentEdit.Text( 'p', {}, 'Some description to accompany your image heading.' );

		imageBoxContent.attr( 'style', 'text-align: center; margin-bottom: 25px;' );
		imageBoxTitle.attr( 'style', 'text-align: center; margin-top: 0px;' );

		img = document.createElement( 'IMG' );
		img.setAttribute( 'height', '320' );
		img.setAttribute( 'width', '600' );
		img.classList.add( 'aligncenter' );
		img.classList.add( 'wp-image-' + pbsParams.dummy_image_id );
		img.setAttribute( 'data-ce-size', 'w 600 x h 1' );
		img.setAttribute( 'src', 'https://source.unsplash.com/category/people/1500x800?fashion' );
		img.setAttribute( 'style', 'margin-bottom: 25px;' );

		parent.attach( imageBoxContent, index );
		parent.attach( imageBoxTitle, index );
		parent.attach( ContentEdit.Image.fromDOMElement( img ), index );

	};

	return ImageBox;

} )( ContentTools.Tools.ElementButton );

/* globals ContentEdit, ContentTools, __extends, pbsParams */

ContentTools.Tools.SocialIcons = ( function( _super ) {
	__extends( SocialIcons, _super );

	function SocialIcons() {
		return SocialIcons.__super__.constructor.apply( this, arguments );
	}

	ContentTools.ToolShelf.stow( SocialIcons, 'social-icons' );

	SocialIcons.label = pbsParams.labels.social_icons;

	SocialIcons.icon = 'social-icons';

	SocialIcons.buttonName = pbsParams.labels.social_icons;

	SocialIcons.apply = function( element, selection, callback ) {
		var index = element.parent().children.indexOf( element ) + 1;
		this.createNew( element.parent(), index );
		return callback( true );
	};

	SocialIcons.createNew = function( parent, index ) {

		var newRow;
		var row = document.createElement( 'DIV' );

		row.innerHTML = '<div class="pbs-col" data-orientation="horizontal" style="justify-content: center;"><div data-ce-tag="icon" role="presentation" style="height: 50px; width: 50px;"><a href="http://facebook.com/WP_PBSandwich"><svg viewbox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M13 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5.655V9.443H6.668V7.417h1.987v-1.85c0-1.36.88-2.61 2.907-2.61.82 0 1.426.08 1.426.08l-.046 1.892s-.62-.006-1.297-.006c-.73 0-.848.337-.848.894v1.599H13l-.097 2.027h-2.105V15H13a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2z" fill="#3c5a96"></path> </svg></a></div>' +

		'<div data-ce-tag="icon" role="presentation" style="height: 50px; width: 50px;"><a href="http://twitter.com/WP_PBSandwich"><svg viewbox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M15 3.627a5.705 5.705 0 0 1-1.65.452 2.88 2.88 0 0 0 1.263-1.59 5.75 5.75 0 0 1-1.822.697 2.872 2.872 0 0 0-4.895 2.62 8.157 8.157 0 0 1-5.92-3.002 2.87 2.87 0 0 0 .888 3.835 2.87 2.87 0 0 1-1.3-.36v.038c0 1.392.988 2.552 2.303 2.816a2.897 2.897 0 0 1-1.297.05 2.872 2.872 0 0 0 2.682 1.992A5.758 5.758 0 0 1 1 12.366a8.118 8.118 0 0 0 4.402 1.29c5.284 0 8.174-4.377 8.174-8.172 0-.124-.004-.248-.01-.37A5.84 5.84 0 0 0 15 3.626z" fill="#2aa9e0"></path> </svg></a></div>' +

		'<div data-ce-tag="icon" role="presentation" style="height: 50px; width: 50px;"><a href="http://pinterest.com/"><svg viewbox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M8 0a8 8 0 0 0-3.21 15.328c-.023-.56-.005-1.23.14-1.837l1.028-4.358s-.256-.51-.256-1.266c0-1.186.688-2.07 1.543-2.07.728 0 1.08.545 1.08 1.2 0 .73-.468 1.826-.708 2.84-.2.847.426 1.54 1.263 1.54 1.517 0 2.536-1.947 2.536-4.254 0-1.753-1.18-3.066-3.33-3.066-2.425 0-3.937 1.81-3.937 3.832 0 .697.205 1.188.526 1.568.148.176.17.246.116.447-.04.146-.127.5-.164.642-.053.203-.217.274-.4.2-1.118-.456-1.638-1.68-1.638-3.057 0-2.273 1.917-4.998 5.718-4.998 3.054 0 5.064 2.21 5.064 4.583 0 3.138-1.745 5.483-4.316 5.483-.864 0-1.676-.467-1.955-.998 0 0-.463 1.844-.562 2.2-.17.617-.502 1.233-.805 1.713A8 8 0 0 0 16 8a8 8 0 0 0-8-8z" fill="#c9232d"></path> </svg></a></div>' +

		'<div data-ce-tag="icon" role="presentation" style="height: 50px; width: 50px;"><a href="http://instagram.com/"><svg viewbox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M13 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zM8 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm6 8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7h2.142C4.058 7.32 4 7.652 4 8a4 4 0 0 0 8 0c0-.348-.06-.68-.142-1H14v6zm0-9a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1z" fill="#96b7ea"></path> </svg></a></div></div></div>';

		newRow = ContentEdit.DivRow.fromDOMElement( row );
		parent.attach( newRow, index );
	};

	return SocialIcons;

} )( ContentTools.Tools.ElementButton );

/* globals Color */

// TODO CLEAN UP

/**
 * wp-color-picker-alpha
 *
 * Overwrite Automattic Iris for enabled Alpha Channel in wpColorPicker
 * Only run in input and is defined data alpha in true
 *
 * Version: 1.2.1
 * https://github.com/23r9i0/wp-color-picker-alpha
 * Copyright (c) 2015 Sergio P.A. (23r9i0).
 * Licensed under the GPLv2 license.
 */
( function( $, undef ) {

	// Variable for some backgrounds ( grid )
	var image   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAAHnlligAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHJJREFUeNpi+P///4EDBxiAGMgCCCAGFB5AADGCRBgYDh48CCRZIJS9vT2QBAggFBkmBiSAogxFBiCAoHogAKIKAlBUYTELAiAmEtABEECk20G6BOmuIl0CIMBQ/IEMkO0myiSSraaaBhZcbkUOs0HuBwDplz5uFJ3Z4gAAAABJRU5ErkJggg==';

	// Html stuff for wpColorPicker copy of the original color-picker.js
		// _before = '<a tabindex="0" class="wp-color-result" />',
		// _after  = '<div class="wp-picker-holder" />',
		// _wrap   = '<div class="wp-picker-container" />',
		// _button = '<input type="button" class="button button-small hidden" />';

	/**
	 * Overwrite Color
	 * for enable support rbga
	 */
	Color.fn.toString = function() {

		var hex;

		if ( this._alpha < 1 ) {
			return this.toCSS( 'rgba', this._alpha ).replace( /\s+/g, '' );
		}

		hex = parseInt( this._color, 10 ).toString( 16 );

		if ( this.error ) {
			return '';
		}

		if ( hex.length < 6 ) {
			hex = ( '00000' + hex ).substr( -6 );
		}

		return '#' + hex;
	};

	/**
	 * Overwrite wpColorPicker
	 */

	// $.widget( 'wp.wpColorPicker', $.wp.wpColorPicker, {
	// 	_create: function() {
	// 		// bail early for unsupported Iris.
	// 		if ( ! $.support.iris )
	// 			return;
	//
	// 		Var self = this,
	// 			el   = self.element;
	//
	// 		$.extend( self.options, el.data() );
	//
	// 		// keep close bound so it can be attached to a body listener
	// 		self.close = $.proxy( self.close, self );
	//
	// 		Self.initialValue = el.val();
	//
	// 		// Set up HTML structure, hide things
	// 		el.addClass( 'wp-color-picker' ).hide().wrap( _wrap );
	// 		self.wrap            = el.parent();
	// 		self.toggler         = $( _before ).insertBefore( el ).css( { backgroundColor : self.initialValue } ).attr( 'title', wpColorPickerL10n.pick ).data( 'current', wpColorPickerL10n.current );
	// 		self.pickerContainer = $( _after ).insertAfter( el );
	// 		self.button          = $( _button );
	//
	// 		If ( self.options.defaultColor ) {
	// 			self.button.addClass( 'wp-picker-default' ).val( wpColorPickerL10n.defaultString );
	// 		} else {
	// 			self.button.addClass( 'wp-picker-clear' ).val( wpColorPickerL10n.clear );
	// 		}
	//
	// 		El.wrap( '<span class="wp-picker-input-wrap" />' ).after( self.button );
	//
	// 		El.iris( {
	// 			target   : self.pickerContainer,
	// 			hide     : self.options.hide,
	// 			width    : self.options.width,
	// 			mode     : self.options.mode,
	// 			palettes : self.options.palettes,
	// 			change   : function( event, ui ) {
	// 				if ( self.options.alpha ) {
	// 					self.toggler.css( { 'background-image' : 'url(' + image + ')' } ).html( '<span />' );
	// 					self.toggler.find( 'span' ).css( {
	// 						'width'                     : '100%',
	// 						'height'                    : '100%',
	// 						'position'                  : 'absolute',
	// 						'top'                       : 0,
	// 						'left'                      : 0,
	// 						'border-top-left-radius'    : '3px',
	// 						'border-bottom-left-radius' : '3px',
	// 						'background'                : ui.color.toString()
	// 					} );
	// 				} else {
	// 					self.toggler.css( { backgroundColor : ui.color.toString() } );
	// 				}
	//
	// 				// Check for a custom cb
	// 				if ( $.isFunction( self.options.change ) )
	// 					self.options.change.call( this, event, ui );
	// 			}
	// 		} );
	//
	// 		El.val( self.initialValue );
	// 		self._addListeners();
	//
	// 		If ( ! self.options.hide )
	// 			self.toggler.click();
	// 	},
	// 	_addListeners: function() {
	// 		var self = this;
	//
	// 		// prevent any clicks inside this widget from leaking to the top and closing it
	// 		self.wrap.on( 'click.wpcolorpicker', function( event ) {
	// 			event.stopPropagation();
	// 		} );
	//
	// 		Self.toggler.on( 'click', function() {
	// 			if ( self.toggler.hasClass( 'wp-picker-open' ) ) {
	// 				self.close();
	// 			} else {
	// 				self.open();
	// 			}
	// 		});
	//
	// 		Self.element.on( 'change', function( event ) {
	// 			// Empty or Error = clear
	// 			if ( $( this ).val() === '' || self.element.hasClass( 'iris-error' ) ) {
	// 				if ( self.options.alpha ) {
	// 					self.toggler.removeAttr( 'style' );
	// 					self.toggler.find( 'span' ).css( 'backgroundColor', '' );
	// 				} else {
	// 					self.toggler.css( 'backgroundColor', '' );
	// 				}
	//
	// 				// fire clear callback if we have one
	// 				if ( $.isFunction( self.options.clear ) )
	// 					self.options.clear.call( this, event );
	// 			}
	// 		} );
	//
	// 		// open a keyboard-focused closed picker with space or enter
	// 		self.toggler.on( 'keyup', function( event ) {
	// 			if ( event.keyCode === 13 || event.keyCode === 32 ) {
	// 				event.preventDefault();
	// 				self.toggler.trigger( 'click' ).next().focus();
	// 			}
	// 		});
	//
	// 		Self.button.on( 'click', function( event ) {
	// 			if ( $( this ).hasClass( 'wp-picker-clear' ) ) {
	// 				self.element.val( '' );
	// 				if ( self.options.alpha ) {
	// 					self.toggler.removeAttr( 'style' );
	// 					self.toggler.find( 'span' ).css( 'backgroundColor', '' );
	// 				} else {
	// 					self.toggler.css( 'backgroundColor', '' );
	// 				}
	//
	// 				If ( $.isFunction( self.options.clear ) )
	// 					self.options.clear.call( this, event );
	//
	// 			} else if ( $( this ).hasClass( 'wp-picker-default' ) ) {
	// 				self.element.val( self.options.defaultColor ).change();
	// 			}
	// 		});
	// 	}
	// });

	/**
	 * Overwrite iris
	 */
	$.widget( 'a8c.iris', $.a8c.iris, {
		_create: function() {

			var self, el, _html, aContainer, aSlider, controls;
			var emptyWidth, stripsMargin, stripsWidth;

			this._super();

			// Global option for check is mode rbga is enabled
			this.options.alpha = this.element.data( 'alpha' ) || false;
			this.options.alpha = true;

			// Is not input disabled
			if ( ! this.element.is( ':input' ) ) {
				this.options.alpha = false;
			}

			if ( 'undefined' !== typeof this.options.alpha && this.options.alpha ) {
				self = this;
				el = self.element;
				_html = '<div class="iris-strip iris-slider iris-alpha-slider"><div class="iris-slider-offset iris-slider-offset-alpha"></div></div>';
				aContainer = $( _html ).appendTo( self.picker.find( '.iris-picker-inner' ) );
				aSlider = aContainer.find( '.iris-slider-offset-alpha' );
				controls = {
					aContainer: aContainer,
					aSlider: aSlider
				};

				if ( 'undefined' !== typeof el.data( 'custom-width' ) ) {
					self.options.customWidth = parseInt( el.data( 'custom-width' ), 10 ) || 0;
				} else {
					self.options.customWidth = 100;
				}

				// Set default width for input reset
				self.options.defaultWidth = el.width();

				// Update width for input
				if ( self._color._alpha < 1 || self._color.toString().indexOf( 'rgb' ) !== -1 ) {
					el.width( parseInt( self.options.defaultWidth + self.options.customWidth, 10 ) );
				}

				// Push new controls
				$.each( controls, function( k, v ) {
					self.controls[k] = v;
				} );

				// Change size strip and add margin for sliders
				self.controls.square.css( { 'margin-right': '0' } );
				emptyWidth   = ( self.picker.width() - self.controls.square.width() - 20 );
				stripsMargin = ( emptyWidth / 6 );
				stripsWidth  = ( ( emptyWidth / 2 ) - stripsMargin );

				$.each( [ 'aContainer', 'strip' ], function( k, v ) {
					self.controls[v].width( stripsWidth ).css( { 'margin-left': stripsMargin + 'px' } );
				} );

				// Add new slider
				self._initControls();

				// For updated widget
				self._change();
			}
		},
		_initControls: function() {

			var self, controls;

			this._super();

			if ( this.options.alpha ) {
				self = this,
				controls = self.controls;

				controls.aSlider.slider( {
					orientation: 'vertical',
					min: 0,
					max: 100,
					step: 1,
					value: parseInt( self._color._alpha * 100, 10 ),
					slide: function( event, ui ) {

						// Update alpha value
						self._color._alpha = parseFloat( ui.value / 100 );
						self._change.apply( self, arguments );
					}
				} );
			}
		},
		_change: function() {

			var self = this,
				el = self.element;
			var controls, alpha, color, gradient, defaultWidth, customWidth, reset;

			this._super();

			if ( this.options.alpha ) {

				// The alpha parameter gets a lot of decimal places, this limits it to two decimal places.
				// self._color._alpha = parseInt( self._color._alpha * 100, 10 ) / 100;

				controls     = self.controls,
				alpha        = parseInt( self._color._alpha * 100, 10 ),
				color        = self._color.toRgb(),
				gradient     = [
					'rgb(' + color.r + ',' + color.g + ',' + color.b + ') 0%',
					'rgba(' + color.r + ',' + color.g + ',' + color.b + ', 0) 100%'
				],
				defaultWidth = self.options.defaultWidth,
				customWidth  = self.options.customWidth;

				// Target       = self.picker.closest( '.wp-picker-container' ).find( '.wp-color-result' );

				// Generate background slider alpha, only for CSS3 old browser fuck!! :)
				controls.aContainer.css( { 'background': 'linear-gradient(to bottom, ' + gradient.join( ', ' ) + '), url(' + image + ')' } );

				// If ( target.hasClass( 'wp-picker-open' ) ) {
					// Update alpha value
					controls.aSlider.slider( 'value', alpha );

					/**
					 * Disabled change opacity in default slider Saturation ( only is alpha enabled )
					 * and change input width for view all value
					 */
					if ( self._color._alpha < 1 ) {
						controls.strip.attr( 'style', controls.strip.attr( 'style' ).replace( /rgba\(([0-9]+,)(\s+)?([0-9]+,)(\s+)?([0-9]+)(,(\s+)?[0-9\.]+)\)/g, 'rgb($1$3$5)' ) );
						el.width( parseInt( defaultWidth + customWidth, 10 ) );
					} else {
						el.width( defaultWidth );
					}

				// }
			}

			reset = el.data( 'reset-alpha' ) || false;

			if ( reset ) {
				self.picker.find( '.iris-palette-container' ).on( 'click.palette', '.iris-palette', function() {
					self._color._alpha = 1;
					self.active        = 'external';
					self._change();
				} );
			}
		},
		_addInputListeners: function( input ) {
			var self            = this,
				debounceTimeout = 100,
				callback        = function( event ) {
					var color = new Color( input.val() ),
						val   = input.val();

					input.removeClass( 'iris-error' );

					// We gave a bad color
					if ( color.error ) {

						// Don't error on an empty input
						if ( '' !== val ) {
							input.addClass( 'iris-error' );
						}
					} else {
						if ( color.toString() !== self._color.toString() ) {

							// Let's not do this on keyup for hex shortcodes
							if ( ! ( 'keyup' === event.type && val.match( /^[0-9a-fA-F]{3}$/ ) ) ) {
								self._setOption( 'color', color.toString() );
							}
						}
					}
				};

			input.on( 'change', callback ).on( 'keyup', self._debounce( callback, debounceTimeout ) );

			// If we initialized hidden, show on first focus. The rest is up to you.
			if ( self.options.hide ) {
				input.on( 'focus', function() {
					self.show();
				} );
			}
		},
		color: function( newColor ) {
			var c;

			if ( true === newColor ) {
				return this._color.clone();
			} else if ( newColor === undef ) {
				return this._color.toString();
			}

			c = new Color( newColor );
			if ( c._alpha < 1 ) {
				c._alpha = parseInt( c._alpha * 100, 10 ) / 100;
			}
			this.option( 'color', c );
		}

	} );
}( jQuery ) );

// Auto Call plugin is class is color-picker
// jQuery( document ).ready( function( $ ) {
	// $( '.color-picker' ).wpColorPicker();
// } );

/* globals pbsParams */

PBSModal.PremiumFeaturesModal = class extends PBSModal.Modal {
	constructor() {
		super( 'pbs-learn-premium-elements' );
	}

	init() {
		super.init();

		// Show/hide flags.
		this.element.querySelector( '.pbs-flags-button' ).addEventListener( 'click', function() {

			var payload = new FormData();
			var request = new XMLHttpRequest();

			document.body.classList.toggle( 'pbs-hide-premium-flags' );

			payload.append( 'hide', document.body.classList.contains( 'pbs-hide-premium-flags' ) ? '1' : '' );
			payload.append( 'action', 'premium_flag_toggle' );
			payload.append( 'nonce', pbsParams.nonce );

			request.open( 'POST', pbsParams.ajax_url );
			request.send( payload );
		} );
	}
}

PBSModal.LearnPremiumModal = class extends PBSModal.Modal {
	constructor() {
		super( 'pbs-learn-premium' );
		this.carousel = null;
		this.indicators = [];
		this.slides = [];
		this.switcher = null;
	}

	init() {
		var i;

		super.init();

		this.carousel = this.element.querySelector( '.pbs-learn-carousel' );

		if ( this.carousel ) {
			this.slides = this.carousel.querySelectorAll( '.pbs-learn-slide' );
			this.indicators = this.carousel.querySelectorAll( '.pbs-learn-indicators label' );

			for ( i = 0; i < this.indicators.length; i++ ) {
				this.indicators[ i ].querySelector( 'input' ).addEventListener( 'change', this.thumbClickHandler.bind( this ) );
			}
		}

		this.setSlide( 0 );
	}

	carouselHide( num ) {
		this.indicators[ num ].setAttribute( 'data-state', '' );
		this.slides[ num ].setAttribute( 'data-state', '' );

		this.slides[ num ].style.opacity = 0;
	}

	carouselShow( num ) {
		this.indicators[ num ].checked = true;
		this.indicators[ num ].setAttribute( 'data-state', 'active' );
		this.slides[ num ].setAttribute( 'data-state', 'active' );

		this.slides[ num ].style.opacity = 1;
	}

	thumbClickHandler( ev ) {
		var slide = parseInt( ev.target.getAttribute( 'data-slide' ), 10 ) - 1;
		this.setSlide( slide );
	}

	setSlide( slide ) {
		var i;

		// Reset all slides
		for ( i = 0; i < this.indicators.length; i++ ) {
			this.indicators[ i ].setAttribute( 'data-state', '' );
			this.slides[ i ].setAttribute( 'data-state', '' );

			this.carouselHide( i );
		}

		// Set defined slide as active
		this.indicators[ slide ].setAttribute( 'data-state', 'active' );
		this.slides[ slide ].setAttribute( 'data-state', 'active' );
		this.carouselShow( slide );

		// Stop the auto-switcher
		clearInterval( this.switcher );
		this.switcher = null;
	}

	switchSlide() {
		var i, nextSlide = 0;

		// Reset all slides
		for ( i = 0; i < this.indicators.length; i++ ) {

			// If current slide is active & NOT equal to last slide then increment nextSlide
			if ( ( 'active' === this.indicators[ i ].getAttribute( 'data-state' ) ) && ( i !== ( this.indicators.length - 1 ) ) ) {
				nextSlide = i + 1;
			}

			// Remove all active states & hide
			this.carouselHide( i );
		}

		// Set next slide as active & show the next slide
		this.carouselShow( nextSlide );
	}

	show() {
		super.show();

		this.setSlide( 0 );

		if ( this.switcher ) {
			clearInterval( this.switcher );
		}
		this.switcher = setInterval( function() {
			this.switchSlide();
		}.bind( this ), 7000 );
	}

	hide() {
		super.hide();

		if ( this.switcher ) {
			clearInterval( this.switcher );
		}
		this.switcher = null;
	}
}

/**
 * Click handler for the "Get Premium" Admin bar button.
 */
new ( function() {
	var ready = function() {

		var premiumModal, premiumFlagModal, goPremiumButton;

		if ( ! pbsParams.show_premium_flags && pbsParams.is_lite ) {
			document.body.classList.add( 'pbs-hide-premium-flags' );
		}

		if ( pbsParams.is_lite ) {

			// Learn more about premium button.
			premiumModal = new PBSModal.LearnPremiumModal();
			premiumModal.init();

			goPremiumButton = document.querySelector( '#wp-admin-bar-pbs_go_premium' );
			if ( goPremiumButton ) {
				goPremiumButton.addEventListener( 'click', function() {
					premiumModal.show();
				} );
			}

			// Premium flags modal buttons.
			premiumFlagModal = new PBSModal.PremiumFeaturesModal();
			premiumFlagModal.init();

			document.addEventListener( 'click', function( ev ) {
				if ( window.pbsSelectorMatches( ev.target, '.pbs-premium-flag:not(.pbs-collapsable-title), .pbs-premium-flag:not(.pbs-collapsable-title) *' ) ) {
					premiumFlagModal.show();
				}
			} );
		}

	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/* globals pbsParams, ContentTools */

PBSModal.IntroTourModal = class extends PBSModal.Modal {
	constructor() {
		super( 'pbs-intro-tour' );
	}

	init() {
		// Don't do anything.
	}

	show() {
		super.init();
		super.show();
	}

	hide() {
		super.hide();
		super.destroy();
	}
}

/**
 * Start the tour if it's the first time playing.
 */
new ( function() {
	var ready = function() {
		if ( pbsParams.do_intro ) {

			var modal = new PBSModal.IntroTourModal();
			modal.init();

			wp.hooks.addAction( 'pbs.start', 'pbs', function() {

				// If the tour has started before, possible from another page, don't show it again.
				// Helpful for the PBS demo site.
				if ( localStorage ) {
					if ( localStorage.getItem( 'pbs_did_intro_v4' ) ) {
						return;
					}
					localStorage.setItem( 'pbs_did_intro_v4', 1 );
				}

				modal.show();

				// Tell the backend that we played the tour.
				payload = new FormData();
				payload.append( 'action', 'pbs_did_tour' );
				payload.append( 'nonce', pbsParams.nonce );

				xhr = new XMLHttpRequest();
				xhr.open( 'POST', pbsParams.ajax_url );
				xhr.send( payload );
			} );
		}
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * Sends a heartbeat on the amount of editing time.
 */

( function() {
	var ready = function() {

		// Send out heartbeat stuff.
		jQuery( document ).on( 'heartbeat-send', function( e, data ) {

			// Only do this when editing.
			if ( ! PBS.isEditing ) {
				return;
			}

			data.tracking_interval = wp.heartbeat.interval();
		} );

	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

/**
 * Fix for scenario:
 * Some themes, such as "eighties" don't open the Media Manager (or any modal view),
 * in the frontend. This can be tested by running the command: `wp.media.editor.open()`
 * in the browser console.
 *
 * Cause:
 * The cause of this is in the Modal open function in media-views.js. The line that
 * checks for visibility: `if ( $el.is(':visible') )` returns TRUE, even though the element
 * isn't visible yet - a false positive.
 *
 * Fix:
 * An unobtrusive & least conflicting fix is to override jQuery's `is` method ONLY
 * when checking the visibility of a Modal, and replace it with a working visibility check:
 * http://stackoverflow.com/a/33456469/174172
 *
 * It seems that the modal is always `<div tabindex="0"></div>`.
 */
( function() {
	var proxied = jQuery.fn.is;
	jQuery.fn.is = function( selector ) {
		var elem;
		var ret = proxied.call( this, selector );
		if ( ret ) {
			elem = this[0];
			if ( '<div tabindex="0"></div>' === elem.outerHTML ) {
				return !! ( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
			}
		}
		return ret;
	};
} )();

/* globals ContentTools, pbsParams */

( function() {
	var ready = function() {

		var lastAutosave, loginListenerInterval, loginListener, startLoginListener;
		var modalIsOpen, doRemovePostLock;

		if ( ! wp.heartbeat ) {
			return;
		}

		// Set heartbeat to the slowest at the beginning because we cannot disable it.
		wp.heartbeat.interval( 120 );

		// Listen in to when the modal login form closes.
		lastAutosave = +new Date();
		loginListenerInterval = null;
		loginListener = function() {
			var authCheckWrapper = document.querySelector( '#wp-auth-check-wrap' );
			if ( ! authCheckWrapper ) {
				clearInterval( loginListenerInterval );
				modalIsOpen = false;
			} else if ( authCheckWrapper.classList.contains( 'hidden' ) ) {
				clearInterval( loginListenerInterval );
				modalIsOpen = false;
				wp.heartbeat.connectNow();
			}
		};
		startLoginListener = function() {
			clearInterval( loginListenerInterval );
			loginListenerInterval = setInterval( loginListener, 500 );
		};

		// When a modal is open, this should be true. When a modal is open,
		// don't show takeover or post lock modals.
		modalIsOpen = false;

		// Send out heartbeat stuff.
		jQuery( document ).on( 'heartbeat-send', function( e, data ) {

			var autosaveDiff, autosaveInterval;

			// Only do this when editing.
			if ( ! PBS.isEditing ) {
				return;
			}

			// Refresh nonces when possible.
			data['wp-refresh-post-nonces'] = {
				post_id: pbsParams.post_id
			};

			// Refresh our own nonce regularly.
			data.pbs_nonce = pbsParams.nonce;

			// Refresh our media manager nonce (this is difference from our pbs nonce).
			data.media_manager_editor_nonce = wp.media.view.settings.nonce.sendToEditor;

			// Needed for nonces and post locking.
			data.post_id = pbsParams.post_id;

			if ( modalIsOpen ) {
				return;
			}

			// Autosave from time to time.
			autosaveDiff = ( ( +new Date() ) - lastAutosave ) / 1000;
			autosaveInterval = 15;
			if ( pbsParams.autosave_interval ) {
				autosaveInterval = parseInt( pbsParams.autosave_interval, 10 ) * 60;
			}
			if ( autosaveDiff > autosaveInterval ) {
				lastAutosave = +new Date();

				// Get the content & do the normal filters.
				data.content = PBS.controller.contentProvider.content;
				data.content = wp.hooks.applyFilters( 'pbs.save', data.content );
			}
		} );

		// Handle heartbeat responses.
		jQuery( document ).on( 'heartbeat-tick', function( e, data ) {

			var nonces, templateData, div;

			// Only do this when editing.
			if ( ! PBS.isEditing ) {
				return;
			}

			// If logged out, the modal form will automatically appear, start
			// listening when the modal disappears, it means we logged in or closed it.
			if ( false === data['wp-auth-check'] ) {
				modalIsOpen = true;
				startLoginListener();
				return;
			}

			// Update our nonces if invalid already.
			if ( data['wp-refresh-post-nonces'] ) {
				nonces = data['wp-refresh-post-nonces'];

				// Update the Heartbeat API nonce.
				if ( nonces.heartbeatNonce ) {
					window.heartbeatSettings.nonce = nonces.heartbeatNonce;
				}

				// Update the PBS nonce if invalid already.
				if ( nonces.pbs_nonce_new ) {
					pbsParams.nonce = nonces.pbs_nonce_new;
				}

				// Refresh our media manager nonce (this is difference from our pbs nonce).
				if ( data.media_manager_editor_nonce_new ) {
					wp.media.view.settings.nonce.sendToEditor = data.media_manager_editor_nonce_new;
				}
			}

			// Update the PBS nonce if invalid already.
			if ( data.pbs_nonce_new ) {
				pbsParams.nonce = data.pbs_nonce_new;
			}

			// Refresh our media manager nonce (this is difference from our pbs nonce).
			if ( data.media_manager_editor_nonce_new ) {
				wp.media.view.settings.nonce.sendToEditor = data.media_manager_editor_nonce_new;
			}

			if ( modalIsOpen ) {
				return;
			}

			// There is a post lock, do an autosave and show the modal.
			if ( data.has_post_lock ) {

				// Display a post lock modal & autosave.
				if ( ! document.querySelector( '#pbs-post-locked-dialog' ) ) {

					// Autosave.
					doAutosave();

					// Display the "post was locked" modal.
					templateData = {
						avatar: data.post_lock_avatar,
						avatar2x: data.post_lock_avatar2x,
						author_name: data.post_lock_author_name
					};
					div = document.createElement( 'DIV' );
					div.innerHTML = wp.template( 'pbs-heartbeat-takeover' )( templateData );
					div.setAttribute( 'id', 'pbs-post-locked-dialog' );
					document.body.appendChild( div );
					modalIsOpen = true;

					// If main button was clicked, reload the page.
					document.querySelector( '.pbs-post-takeover-refresh' ).addEventListener( 'click', function( ev ) {
						ev.preventDefault();
						modalIsOpen = false;
						doRemovePostLock = false;
						ContentTools.EditorApp.get().stop();
						window.location.reload();
						div.parentNode.removeChild( div );
					} );
				}
			}
		} );

		// When this is true, the post lock is removed when the editor is stopped.
		doRemovePostLock = true;

		// When the editor starts...
		ContentTools.EditorApp.get().bind( 'start', function() {

			// Start the heartbeat API.
			wp.heartbeat.interval( 15 );

			// Check post lock & check nonce.
			checkHeartbeat();
			doRemovePostLock = true;
		} );

		// When the editor stops...
		ContentTools.EditorApp.get().bind( 'stop', function() {

			// Stop the heartbeat API.
			wp.heartbeat.interval( 120 );

			// Remove the post lock if needed (only when we are the one who locked it).
			if ( doRemovePostLock ) {
				removePostLock();
			}
		} );

		/**
		 * Triggers a post lock check & PBS nonce check.
		 */
		function checkHeartbeat() {

			var xhr;
			var payload = new FormData();

			payload.append( 'action', 'pbs_heartbeat_check' );
			payload.append( 'post_id', pbsParams.post_id );
			payload.append( 'nonce', pbsParams.nonce );
			payload.append( 'media_manager_editor_nonce', wp.media.view.settings.nonce.sendToEditor );

			xhr = new XMLHttpRequest();

			xhr.onload = function() {
				var response, data, div;

				if ( xhr.status >= 200 && xhr.status < 400 ) {
					response = JSON.parse( xhr.responseText );
					if ( response ) {

						// There is an existing post lock, display the takeover modal.
						if ( response.post_lock ) {

							data = {
								avatar: response.post_lock_avatar,
								avatar2x: response.post_lock_avatar2x,
								author_name: response.post_lock_author_name
							};
							div = document.createElement( 'DIV' );
							div.innerHTML = wp.template( 'pbs-heartbeat-locked' )( data );
							div.setAttribute( 'id', 'pbs-post-locked-dialog' );
							document.body.appendChild( div );
							modalIsOpen = true;

							// Cancel / back handler.
							document.querySelector( '.pbs-post-locked-back' ).addEventListener( 'click', function( ev ) {
								ev.preventDefault();
								modalIsOpen = false;
								doRemovePostLock = false;
								PBS.cancel();
								div.parentNode.removeChild( div );
							} );

							// Takeover handler.
							document.querySelector( '.pbs-post-locked-takeover' ).addEventListener( 'click', function( ev ) {
								ev.preventDefault();
								modalIsOpen = false;
								overridePostLock();
								div.parentNode.removeChild( div );
							} );
						}

						// Update the PBS nonce if given.
						if ( response.nonce ) {
							pbsParams.nonce = response.nonce;
						}

						// Update the Media Manager nonce if given.
						if ( response.media_manager_editor_nonce ) {
							wp.media.view.settings.nonce.sendToEditor = response.media_manager_editor_nonce;
						}
					}
				}
			}.bind( this );

			xhr.onerror = function() {
			};

			xhr.open( 'POST', pbsParams.ajax_url );
			xhr.send( payload );
		}

		/**
		 * Trigger a removal of the post lock.
		 */
		function removePostLock() {
			var xhr;
			var payload = new FormData();
			payload.append( 'action', 'pbs_remove_post_lock' );
			payload.append( 'post_id', pbsParams.post_id );
			payload.append( 'nonce', pbsParams.nonce );

			xhr = new XMLHttpRequest();
			xhr.open( 'POST', pbsParams.ajax_url );
			xhr.send( payload );
		}

		/**
		 * Trigger a take over of an existing post lock.
		 */
		function overridePostLock() {
			var xhr;
			var payload = new FormData();
			payload.append( 'action', 'pbs_override_post_lock' );
			payload.append( 'post_id', pbsParams.post_id );
			payload.append( 'nonce', pbsParams.nonce );

			xhr = new XMLHttpRequest();
			xhr.open( 'POST', pbsParams.ajax_url );
			xhr.send( payload );
		}

		/**
		 * Manually trigger an autosave.
		 */
		function doAutosave() {
			var content, xhr;

			var payload = new FormData();
			payload.append( 'action', 'pbs_autosave' );
			payload.append( 'post_id', pbsParams.post_id );
			payload.append( 'nonce', pbsParams.nonce );

			// Get the content & do the normal filters.
			content = PBS.controller.contentProvider.content;
			content = wp.hooks.applyFilters( 'pbs.save', content );
			payload.append( 'content', content );

			xhr = new XMLHttpRequest();
			xhr.open( 'POST', pbsParams.ajax_url );
			xhr.send( payload );
		}
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

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

/* globals ContentTools, pbsParams, ContentEdit */



// When the editor is started, and we're not in an iframe, then open the
// page with the iframed link and start the editor.
( function() {

	var refreshPageWithIframe = function() {
		var search = window.location.search;
		if ( search.indexOf( 'pbs_iframe' ) === -1 ) {
			search += ! search ? '?' : '&';
			search += 'pbs_iframe=1';
			window.location.search = search;
		}
	};

	// Before starting the editor, if we're not inside the responsive
	// iframe, refresh the page with the iframe.
	wp.hooks.addFilter( 'pbs.edit.continue', 'pbs', function( doContinue ) {
		if ( ! window.parent.pbsGoResponsive ) {

			if ( localStorage ) {
				localStorage.setItem( 'pbs-open-' + pbsParams.post_id, '1' );
			}

			refreshPageWithIframe();
			return false;
		}

		return doContinue;
	} );
} )();

/**
 * Bind the responsive buttons.
 */
( function() {
	var ready = function() {
		var editor;

		// Responsive buttons.
		if ( document.querySelector( '#wp-admin-bar-pbs_responsive_phone' ) ) {
			document.querySelector( '#wp-admin-bar-pbs_responsive_phone' ).addEventListener( 'click', function( ev ) {
				ev.preventDefault();
				if ( window.parent ) {
					window.parent.pbsGoResponsive( 'phone' );
				}
			} );
		}
		if ( document.querySelector( '#wp-admin-bar-pbs_responsive_tablet' ) ) {
			document.querySelector( '#wp-admin-bar-pbs_responsive_tablet' ).addEventListener( 'click', function( ev ) {
				ev.preventDefault();
				if ( window.parent ) {
					window.parent.pbsGoResponsive( 'tablet' );
				}
			} );
		}
		if ( document.querySelector( '#wp-admin-bar-pbs_responsive_desktop' ) ) {
			document.querySelector( '#wp-admin-bar-pbs_responsive_desktop' ).addEventListener( 'click', function( ev ) {
				ev.preventDefault();
				if ( window.parent ) {
					window.parent.pbsGoResponsive( 'desktop' );
				}
			} );
		}

		// When the editor stops, make sure we're in desktop view.
		editor = ContentTools.EditorApp.get();
		editor.bind( 'stop', function() {
			if ( window.parent ) {
				window.parent.pbsGoResponsive( 'desktop' );
			}
		} );
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}
} )();

// If we are in a responsive iframe, post a message when our URL has changed.
// (When the user has clicked on a link after editing)
if ( window.parent.pbsGoResponsive ) {
	window.onunload = function() {
	    window.top.postMessage( 'pbs_iframe_change', '*' );
	};
}

// Disable dragging for small screens.
( function() {
	var _Root = ContentEdit.Root.get();
	var proxiedStartDragging = _Root.startDragging;
	_Root.startDragging = function( element, x, y ) {
		if ( window.innerWidth <= 800 ) {
			return;
		}
		return proxiedStartDragging.call( this, element, x, y );
	};
} )();

// Disable the media manager (when images are clicked) for small screens.
( function() {
	var proxy = ContentEdit.Image.prototype.openMediaManager;
	ContentEdit.Image.prototype.openMediaManager = function( closeCallback ) {
		if ( window.innerWidth <= 800 ) {
			return;
		}
		proxy.call( this, closeCallback );
	};
} )();

// Switch styles when switching between views
// This is called by iframe.js (the parent iframe window) when switching between
// different responsive views.
window.pbsSwitchResponsiveStyles = function( screenSize, oldScreenSize ) {

	var styles, sizes, style, selector, elements, i;

	// Don't do anything if we're still in the same screen size.
	if ( screenSize === oldScreenSize ) {
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
		Array.prototype.forEach.call( elements, function( el ) { // jshint ignore:line
			var element = el._ceElement;
			if ( element ) {
				if ( element.style( style ) ) {
					element.attr( 'data-pbs-' + oldScreenSize + '-' + style, element.style( style ) );
				}
				if ( element.attr( 'data-pbs-' + screenSize + '-' + style ) ) {
					element.style( style, element.attr( 'data-pbs-' + screenSize + '-' + style ) );
				} else if ( 'phone' === screenSize && element.attr( 'data-pbs-tablet-' + style ) ) {
					element.style( style, element.attr( 'data-pbs-tablet-' + style ) );
				} else if ( element.attr( 'data-pbs-desktop-' + style ) ) {
					element.style( style, element.attr( 'data-pbs-desktop-' + style ) );
				} else {
					element.style( style, '' );
				}

				if ( element.attr( 'data-pbs-phone-' + style ) === element.attr( 'data-pbs-tablet-' + style ) ) {
					element.removeAttr( 'data-pbs-phone-' + style );
				}
				if ( element.attr( 'data-pbs-tablet-' + style ) === element.attr( 'data-pbs-desktop-' + style ) ) {
					element.removeAttr( 'data-pbs-tablet-' + style );
				}
			}
		} );

		// After switching and we end up in the desktop view, remove the desktop attribute
		// because we don't need to keep it.
		if ( 'desktop' === screenSize ) {
			elements = document.querySelectorAll( '[data-pbs-' + screenSize + '-' + style + ']' );
			Array.prototype.forEach.call( elements, function( el ) { // jshint ignore:line
				var element = el._ceElement;
				if ( element ) {
					element.removeAttr( 'data-pbs-' + screenSize + '-' + style );
				}
			} );
		}
	}

	// Let other scripts perform changes when the resize animation stops.
	setTimeout( function() {
		wp.hooks.doAction( 'pbs.iframe.resized' );
	}, 850 );
};

/**
 * Returns true if currently editing.
 *
 * @deprecated since version 4.4, use the property PBS.isEditing instead.
 */
window.PBSEditor.isEditing = function() {
	console.log( 'window.PBSEditor.isEditing() is deprecated, use the property PBS.isEditing instead.' );
	return PBS.isEditing;
};


/***************************************************************************
 * These are the tools in the inspector, overriding the defaults of CT.
 ***************************************************************************/
window.PBSEditor.formattingTools = [[]];
window.PBSEditor.formattingTools[0].push(
	'insertElement',
	'paragraphPicker',
	'|',
	'font-picker',
	'|',
	'color',
	'bold',
	'italic',
	'underline',
	'strikethrough',
	'link',
	'align',
	'|',
	'uppercase',
	'font-size-down',
	'font-size-up',
	'line-height'
);

window.PBSEditor.premiumTools = {
	'font-picker': {
		label: pbsParams.labels.font + ' ' + ' (' + pbsParams.labels.premium + ')',
		callback: function( elem ) {
			elem._domElement.innerHTML = pbsParams.labels.select_font;
		}
	}
};
window.PBSEditor.formattingTools[0].push(
	'code',
	'|',
	'unordered-list',
	'ordered-list',
	'indent',
	'unindent',
	'|',
	'clear-formatting',
	'undo', 'redo' // These are automatically moved into the admin bar.
);
window.PBSEditor.insertElements = [[]];

// Button arrangement.
if ( ! pbsParams.is_lite ) {
	window.PBSEditor.insertElements[0].push(
		'onecolumn',
		'twocolumn',
		'threecolumn',
		'fourcolumn',
		'text',
		'pbs-media',
		'button',
		'icon',
		'hr',
		'spacer',
		'shortcode',
		'widget',
		'sidebar',
		'embed',
		'html',
		'map',
		'icon-label',
		'carousel',
		'tabs',
		'table',
		'toggle',

		pbsParams.labels.special_elements,

		'woocommerce',
		'acf',
		'nextgen',
		'contact-form7',
		'events-calendar',
		'instagram-feed',

		'predesigned',
		'countup',
		'countdown',
		'page-heading',
		'social-icons',
		'call-to-action',
		'contact-details',
		'pricing-table',
		'image-box',
		'newsletter',
		'testimonial',
		'featurette',
		'team-members',
		'gallery'
	);
} else {

	// Lite version button arrangement.
	window.PBSEditor.insertElements[0].push(
		'onecolumn',
		'twocolumn',
		'threecolumn',
		'fourcolumn',
		'text',
		'pbs-media',
		'icon',
		'hr',
		'spacer',
		'shortcode',
		'widget',
		'sidebar',
		'embed',
		'html',
		'map',
		'tabs',
		'icon-label',
		'button',
		'carousel',
		'table',
		'toggle',

		pbsParams.labels.special_elements,

		'woocommerce',
		'acf',
		'nextgen',
		'contact-form7',
		'events-calendar',
		'instagram-feed',

		'predesigned',
		'countup',
		'countdown',
		'page-heading',
		'social-icons',
		'call-to-action',
		'contact-details',
		'pricing-table',
		'image-box',
		'newsletter',
		'testimonial',
		'featurette',
		'team-members',
		'gallery'
	);
}

/**
 * Remove plugin buttons if the associated plugin isn't activated.
 */
if ( ! pbsParams.has_woocommerce ) {
	window.PBSEditor.insertElements[0].splice( window.PBSEditor.insertElements[0].indexOf( 'woocommerce' ), 1 );
}
if ( ! pbsParams.has_nextgen_gallery ) {
	window.PBSEditor.insertElements[0].splice( window.PBSEditor.insertElements[0].indexOf( 'nextgen' ), 1 );
}
if ( ! pbsParams.has_events_calendar ) {
	window.PBSEditor.insertElements[0].splice( window.PBSEditor.insertElements[0].indexOf( 'events-calendar' ), 1 );
}
if ( ! pbsParams.has_acf ) {
	window.PBSEditor.insertElements[0].splice( window.PBSEditor.insertElements[0].indexOf( 'acf' ), 1 );
}
if ( ! pbsParams.has_wpcf7 ) {
	window.PBSEditor.insertElements[0].splice( window.PBSEditor.insertElements[0].indexOf( 'contact-form7' ), 1 );
}
if ( ! pbsParams.has_instagram_feed ) {
	window.PBSEditor.insertElements[0].splice( window.PBSEditor.insertElements[0].indexOf( 'instagram-feed' ), 1 );
}

window.PBSEditor.premiumElements = {
	'button': pbsParams.labels.button,
	'carousel': pbsParams.labels.carousel,
	'newsletter': pbsParams.labels.newsletter,
	'table': pbsParams.labels.table,
	'predesigned': pbsParams.labels.pre_designed_sections,
	'toggle': pbsParams.labels.toggle,
	'countdown': pbsParams.labels.countdown,
	'countup': pbsParams.labels.count_up,
	'icon-label': pbsParams.labels.icon_label,

	'woocommerce': pbsParams.labels.woocommerce,
	'acf': pbsParams.labels.advanced_custom_fields,
	'nextgen': pbsParams.labels.nextgen,
	'contact-form7': pbsParams.labels.contact_form7,
	'events-calendar': pbsParams.labels.events_calendar,
	'instagram-feed': pbsParams.labels.instagram_feed,

	'page-heading': pbsParams.labels.page_heading,
	'call-to-action': pbsParams.labels.call_to_action,
	'testimonial': pbsParams.labels.testimonial,
	'contact-details': pbsParams.labels.contact_details,
	'pricing-table': pbsParams.labels.pricing_table,
	'image-box': pbsParams.labels.image_box,
	'social-icons': pbsParams.labels.social_icons,
	'featurette': pbsParams.labels.featurette,
	'team-members': pbsParams.labels.team_members,
	'gallery': pbsParams.labels.gallery
};

// We're not using CT's default tools.
ContentTools.DEFAULT_TOOLS = [[]];

// No longer needed.
window.PBSEditor.toolHeadings = [];

( function() {

	var done = false;

	var ready = function() {

		if ( done ) {
			return;
		}
		done = true;

		initPBS();

		// New PBSEditor.MarginBottom();
		// new PBSEditor.MarginTop();
		// new PBSEditor.MarginBottomContainer();
		// new PBSEditor.MarginTopContainer();
		// new PBSEditor.OverlayColumnWidth();
		// new PBSEditor.OverlayColumnWidthRight();
		// new PBSEditor.OverlayColumnWidthLabels();
		new PBSEditor.OverlayColumn();
		new PBSEditor.OverlayRow();
		new PBSEditor.OverlayElement();
		new PBSEditor.ToolbarElement();
		new PBSEditor.ToolbarImage();
		new PBSEditor.ToolbarHtml();
		new PBSEditor.ToolbarIframe();
		new PBSEditor.ToolbarEmbed();
		new PBSEditor.ToolbarMap();
		new PBSEditor.ToolbarIcon();
		new PBSEditor.ToolbarShortcode();
		new PBSEditor.ToolbarRow();
		new PBSEditor.ToolbarColumn();
		new PBSEditor.ToolbarNewsletter();
		new PBSEditor.ToolbarList();
		new PBSEditor.ToolbarTabContainer();
		new PBSEditor.ToolbarTable();
		new PBSEditor.ToolbarTitle();
		new PBSEditor.ToolbarHr();
		new PBSEditor.ToolbarSpacer();
		new PBSEditor.ToolbarButton();
		if ( ! pbsParams.is_lite ) {
			new PBSEditor.ToolbarToggle(); // STANDARD-PRO-ONLY
			new PBSEditor.ToolbarCountdown(); // STANDARD-PRO-ONLY
		}

		new PBSEditor.TooltipLink();
		new PBSEditor.TooltipInput();
		new PBSEditor.TooltipTab();
	};

	if ( 'loading' !== document.readyState ) {
		ready();
	} else {
		document.addEventListener( 'DOMContentLoaded', ready );
	}

} )();
