<?php
/**
 * Template file for the post lock takeover modal. This is shown when you are
 * editing with PBS, but the post is currently locked by another user. This is
 * used to take over the editing privileges.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

?>
<script type="text/html" id="tmpl-pbs-heartbeat-locked">
	<div class="pbs-notification-dialog-background"></div>
	<div class="pbs-notification-dialog">
		<div class="post-locked-message">
			<div class="post-locked-avatar">
				<img alt="" src="{{ data.avatar }}" srcset="{{ data.avatar2x }} 2x" class="avatar avatar-64 photo" height="64" width="64">
			</div>
			<p class="currently-editing wp-tab-first" tabindex="0">
				<?php printf( esc_html__( 'This content is currently locked. If you take over, %s will be blocked from continuing to edit.', 'page-builder-sandwich' ), '{{ data.author_name }}' ); ?>
			</p>
			<p>
				<a class="button pbs-post-locked-back" href="#"><?php esc_html_e( 'Go back', 'page-builder-sandwich' ) ?></a>
				<a class="button button-primary wp-tab-last pbs-post-locked-takeover" href="#"><?php esc_html_e( 'Take over', 'page-builder-sandwich' ) ?></a>
			</p>
		</div>
	</div>
</script>
