/* globals pbsParams, tinymce */

jQuery( document ).ready( function( $ ) {
	'use strict';

	var originalContent = '';
	var hasAutosave = false;
	var isDirty;

	if ( 'undefined' === typeof pbsParams ) {
		return;
	}
	if ( 'undefined' === typeof pbsParams.is_editing ) {
		return;
	}

	if ( 'undefined' !== typeof wp && 'undefined' !== typeof wp.autosave && 'undefined' !== typeof wp.autosave.getCompareString ) {
		originalContent = wp.autosave.getCompareString();
		hasAutosave = true;
	}

	isDirty = function() {
		if ( ! hasAutosave ) {
			return true;
		}
		if ( tinymce && tinymce.activeEditor ) {
			if ( tinymce.activeEditor.isDirty() ) {
				return true;
			} else if ( originalContent !== wp.autosave.getCompareString() ) {
				return true;
			} else if ( ! tinymce.activeEditor.isHidden() ) {
				return tinymce.activeEditor.isDirty();
			}
		}
		return originalContent !== wp.autosave.getCompareString();
	};

	$( 'body' ).on( 'click', '#pbs-admin-edit-with-pbs', function( ev ) {

		var title;

		ev.preventDefault();

		// Fill up title if it's blank.
		title = $( '#title' );
		if ( 'undefined' !== typeof title && '' === title.val() ) {
			title.val( 'Post #' + pbsParams.post_id );
		}

		// Prompt PBS to open when the page loads.
		if ( localStorage ) {
			localStorage.setItem( 'pbs-open-' + pbsParams.post_id, '1' );
		}

		$( window ).off( 'beforeunload' );

		// Redirect after saving.
		$( 'form#post' ).append( '<input type="hidden" name="pbs-save-redirect" value="' + pbsParams.meta_permalink + '" />' );
		$( 'form#post' ).submit();

		return false;
	} );

} );

/* globals pbsParams, tinymce */

jQuery( document ).ready( function( $ ) {
	'use strict';

	if ( 'undefined' === typeof pbsParams || 'undefined' === typeof pbsParams.is_editing ) {
		return;
	}
	if ( 'undefined' === typeof wp || 'undefined' === typeof wp.element ) {
		return;
	}

	// Add our edit button on the top bar.
	setTimeout( function() {
		var $editButton = $( $( '#pbs-gutenberg-edit-button' ).html() );
		$( '#editor' ).find( '.edit-post-header-toolbar' ).append( $editButton )
	}, 1 )

	// isDirty = wp.data.select( 'core/editor' ).isEditedPostDirty();
	if ( pbsParams.is_last_saved_with_pbs ) {
		$( 'body' ).addClass( 'last-saved-with-pbs' )
		setTimeout( function() {
			var $editorPanel = $( $( '#pbs-gutenberg-panel' ).html() )
			var $gutenbergBlockList = $( '#editor' ).find( '.editor-block-list__layout, .editor-post-text-editor' )
			$gutenbergBlockList.after( $editorPanel )
		}, 1 )
	}

	$( 'body' ).on( 'click', '#pbs-admin-edit-with-pbs', function( ev ) {

		// Add a title if there is none.
		var documentTitle = wp.data.select( 'core/editor' ).getEditedPostAttribute( 'title' );
		if ( ! documentTitle ) {
			wp.data.dispatch( 'core/editor' ).editPost( { title: 'Post #' + pbsParams.post_id } );
		}

		// Prompt PBS to open when the page loads.
		if ( localStorage ) {
			localStorage.setItem( 'pbs-open-' + pbsParams.post_id, '1' );
		}

		// Save then redirect to the frontend.
		wp.data.dispatch('core/editor').savePost();
		redirectWhenSave();
	} )

	$( 'body' ).on( 'click', '#pbs-back-to-block-editor', function() {
		$( 'body' ).removeClass( 'last-saved-with-pbs' )
		$( '#pbs-gutenberg-editor-overlay' ).remove()
	} )

	function redirectWhenSave() {

		setTimeout( function () {
			if ( wp.data.select( 'core/editor' ).isSavingPost() ) {
				redirectWhenSave();
			} else {
				location.href = pbsParams.meta_permalink;
			}
		}, 300 );
	}

} );

/* globals pbsParams */

jQuery( document ).ready( function( $ ) {
	'use strict';

	if ( 'undefined' === typeof pbsParams ) {
		return;
	}
	if ( 'undefined' === typeof pbsParams.nonce ) {
		return;
	}

	$( 'body' ).on( 'click', '.pbs-rate-notice a.pbs-rate-hide', function() {
		$.post( pbsParams.ajax_url,
			{
				'action': 'pbs_hide_rating',
				'nonce': pbsParams.nonce
			}
		);

		// Trigger the dismissal of the notice.
		$( this ).parents( '.pbs-rate-notice' ).fadeOut();
	} );

} );

