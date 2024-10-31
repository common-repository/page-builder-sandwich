<?php
/**
 * This class helps with keeping the user logged in, and post locking
 * during editing sessions.
 *
 * @since 3.1
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSHeartbeat' ) ) {

	/**
	 * This is where all the login checks happen.
	 */
	class PBSHeartbeat {

		/**
		 * Hook into WordPress.
		 *
		 * @since 3.1
		 */
		function __construct() {

			/**
			 * IMPORTANT: No need to worry about when the window/tab is closed, post lock becomes invalid after a while.
			 */

			// Checks if logged in,
			// Checks for nonce validity & refreshes the nonce,
			// Checks post locking & activates lock checking if possible.
			// This is called when the editor starts.
			add_action( 'wp_ajax_pbs_heartbeat_check', array( $this, 'heartbeat_check' ) );

			// Release a post lock.
			// This is called when cancelling the editor.
			add_action( 'wp_ajax_pbs_remove_post_lock', array( $this, 'remove_post_lock' ) );

			// When saving a post, release the post lock.
			add_action( 'pbs_saved_content', array( $this, 'remove_post_lock_on_save' ) );

			// Take over a post lock.
			// This is called when the takeover dialog is used.
			add_action( 'wp_ajax_pbs_override_post_lock', array( $this, 'override_post_lock' ) );

			// Autosave the post content.
			// This is called manually when a takeover was performed by another user.
			add_action( 'wp_ajax_pbs_autosave', array( $this, 'heartbeat_autosave' ) );

			// Adds the autosave interval value.
			add_filter( 'pbs_localize_scripts', array( $this, 'add_heartbeat_params' ) );

			// Includes the heartbeat API.
			add_action( 'pbs_enqueue_scripts', array( $this, 'enqueue_heartbeat_api' ) );

			// Heartbeat call to refresh the PBS nonce if invalid.
			// Called every heartbeat.
			add_filter( 'heartbeat_received', array( $this, 'refresh_pbs_nonce' ), 11, 2 );

			// Refreshes the PBS nonce along with the refresh of other nonces.
			// Called automatically by the heartbeat API.
			add_filter( 'wp_refresh_nonces', array( $this, 'auth_refresh_pbs_nonce' ), 11,  3 );

			// Heartbeat call to regularly lock the post.
			// We need to regularly do this because the post lock expires after a while.
			add_filter( 'heartbeat_received', array( $this, 'post_lock' ), 11, 2 );

			// Heartbeat call to autosave the post.
			// This is called every autosave interval by heartbeat.
			add_filter( 'heartbeat_received', array( $this, 'autosave' ), 11, 2 );

			// Add the takeover modal.
			add_action( 'wp_footer', array( $this, 'add_takeover_form' ) );

			// Add the WP login modal.
			add_action( 'wp_enqueue_scripts', array( $this, 'add_login_form' ) );

		}


		/**
		 * Add the JS params we need for the PBS heartbeat to work.
		 *
		 * @since 3.1
		 *
		 * @param array $params Localization parameters.
		 *
		 * @return array The modified parameters.
		 */
		public function add_heartbeat_params( $params ) {
			$params['autosave_interval'] = 15;

			// @codingStandardsIgnoreStart
			// if ( defined( 'AUTOSAVE_INTERVAL' ) && AUTOSAVE_INTERVAL ) {
			// 	$params['autosave_interval'] = AUTOSAVE_INTERVAL;
			// }
			// @codingStandardsIgnoreEnd

			return $params;
		}


		/**
		 * Enqueue the Heartbeat API.
		 *
		 * @since 3.1
		 */
		public function enqueue_heartbeat_api() {
			wp_enqueue_script( 'heartbeat' );
		}


		/**
		 * Heartbeat handler, check logged in, nonce validity, post locking.
		 *
		 * @since 3.1
		 */
		public function heartbeat_check() {

			// Check if still logged in.
			if ( ! is_user_logged_in() ) {
				echo 'logged_out';
				die();
			}

			$ret = array();

			/**
			 * Check nonce, if invalid already, generate a new one.
			 */

			if ( empty( $_POST['nonce'] ) ) { // Input var okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var okay.

			// If the nonce is old or invalid, create a new one.
			if ( wp_verify_nonce( $nonce, 'pbs' ) !== 1 ) {
				$ret['nonce'] = wp_create_nonce( 'pbs' );
			}

			/**
			 * Check Media Manager nonce, if invalid already, generate a new one.
			 */

			if ( empty( $_POST['media_manager_editor_nonce'] ) ) { // Input var okay.
				die();
			}
			$nonce = sanitize_key( $_POST['media_manager_editor_nonce'] ); // Input var okay.

			// If the nonce is old or invalid, create a new one.
			if ( wp_verify_nonce( $nonce, 'media-send-to-editor' ) !== 1 ) {
				$ret['media_manager_editor_nonce'] = wp_create_nonce( 'media-send-to-editor' );
			}

			/**
			 * Check if the post is locked to another user.
			 */

			if ( empty( $_POST['post_id'] ) ) { // Input var okay.
				die();
			}
			$post_id = absint( $_POST['post_id'] ); // Input var okay.

			// Check the post lock, if not locked, lock it. (Release on saving or cancel).
			// If locked, return the user who has locked it.
			$user_id_post_lock = wp_check_post_lock( $post_id );
			if ( ! $user_id_post_lock ) {
				wp_set_post_lock( $post_id );
			} else {
				$ret['post_lock'] = $user_id_post_lock;

				$ret['post_lock_avatar'] = get_avatar_url( $user_id_post_lock, array(
					'size' => 64,
				) );

				$ret['post_lock_avatar2x'] = get_avatar_url( $user_id_post_lock, array(
					'size' => 128,
				) );

				$ret['post_lock_author_name'] = get_the_author_meta( 'nicename', $user_id_post_lock );
			}

			echo wp_json_encode( $ret );
			die();
		}


		/**
		 * Triggered during normal heartbeat nonce checking.
		 *
		 * @since 3.1
		 *
		 * @param array $response The heartbeat response.
		 * @param array $data The heartbeat data sent to the server.
		 *
		 * @return array The heartbeat response
		 */
		public function refresh_pbs_nonce( $response, $data ) {

			// Nonce for the entire PBS.
			if ( ! empty( $data['pbs_nonce'] ) ) {

				$nonce = sanitize_key( $data['pbs_nonce'] );

				// If the nonce is old or invalid, create a new one.
				if ( wp_verify_nonce( $nonce, 'pbs' ) !== 1 ) {
					$response['pbs_nonce_new'] = wp_create_nonce( 'pbs' );
				}
			}

			// Nonce for the Media Manager because it uses another nonce.
			if ( ! empty( $data['media_manager_editor_nonce'] ) ) {

				$nonce = sanitize_key( $data['media_manager_editor_nonce'] );

				if ( wp_verify_nonce( $nonce, 'media_manager_editor_nonce' ) !== 1 ) {
					$response['media_manager_editor_nonce_new'] = wp_create_nonce( 'media-send-to-editor' );
				}
			}

			return $response;
		}


		/**
		 * Triggered when logged out and logging in via the auth-check modal.
		 *
		 * @since 3.1
		 *
		 * @param array $response The heartbeat response.
		 * @param array $data The heartbeat data sent to the server.
	 	 * @param int   $screen_id The current screen we are on.
		 *
		 * @return array The heartbeat response
		 */
		function auth_refresh_pbs_nonce( $response, $data, $screen_id ) {
			if ( array_key_exists( 'wp-refresh-post-nonces', $response ) ) {

				// Main PBS nonce.
				$response['wp-refresh-post-nonces']['pbs_nonce_new'] = wp_create_nonce( 'pbs' );

				// The Media Manager nonce.
				$response['wp-refresh-post-nonces']['media_manager_editor_nonce_new'] = wp_create_nonce( 'media-send-to-editor' );
			}

			return $response;
		}


		/**
		 * Triggered when editing to keep the post locked.
		 *
		 * @since 3.1
		 *
		 * @param array $response The heartbeat response.
		 * @param array $data The heartbeat data sent to the server.
		 *
		 * @return array The heartbeat response
		 */
		public function post_lock( $response, $data ) {
			if ( ! empty( $data['post_id'] ) ) {
				$post_id = absint( $data['post_id'] );

				// Check the post lock, if not locked, lock it. (Release on saving or cancel).
				// If locked, return the user who has locked it.
				$user_id_post_lock = wp_check_post_lock( $post_id );
				if ( ! $user_id_post_lock ) {
					wp_set_post_lock( $post_id );
				} else {
					$response['has_post_lock'] = $user_id_post_lock;
					$response['post_lock'] = $user_id_post_lock;
					$response['post_lock_avatar'] = get_avatar_url( $user_id_post_lock, array(
						'size' => 64,
					) );
					$response['post_lock_avatar2x'] = get_avatar_url( $user_id_post_lock, array(
						'size' => 128,
					) );
					$response['post_lock_author_name'] = get_the_author_meta( 'nicename', $user_id_post_lock );
				}
			}
			return $response;
		}


		/**
		 * Remove post lock on a post_id, ajax handler.
		 *
		 * @since 3.1
		 */
		public function remove_post_lock() {
			if ( empty( $_POST['nonce'] ) || empty( $_POST['post_id'] ) ) { // Input var okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var okay.
			$post_id = absint( $_POST['post_id'] ); // Input var okay.

			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}

			delete_post_meta( $post_id, '_edit_lock' );
			die();
		}


		/**
		 * Called when saving a post, remove the post lock.
		 *
		 * @since 3.1
		 *
		 * @param int $post_id The post ID saved.
		 */
		public function remove_post_lock_on_save( $post_id ) {
			delete_post_meta( $post_id, '_edit_lock' );
		}


		/**
		 * Override post lock on a post_id, ajax handler.
		 *
		 * @since 3.1
		 */
		public function override_post_lock() {
			if ( empty( $_POST['nonce'] ) || empty( $_POST['post_id'] ) ) { // Input var okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var okay.
			$post_id = absint( $_POST['post_id'] ); // Input var okay.

			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}

			echo wp_json_encode( wp_set_post_lock( $post_id ) );
			die();
		}


		/**
		 * Triggered to do an autosave.
		 *
		 * @since 3.1
		 *
		 * @param array $response The heartbeat response.
		 * @param array $data The heartbeat data sent to the server.
		 *
		 * @return array The heartbeat response
		 */
		public function autosave( $response, $data ) {
			if ( ! empty( $data['content'] ) && ! empty( $data['post_id'] ) ) {
				$post_id = absint( $data['post_id'] ); // Input var okay.
				$content = $data['content']; // Input var okay. WPCS: sanitization ok.

				// Clean up the content, this is the same cleaning we do during saving.
				define( 'PBS_DOING_AUTOSAVE', 'true' );
				$content = sanitize_post_field( 'post_content', $content, $post_id, 'db' );
				$content = apply_filters( 'pbs_save_content', $content, $post_id );

				// Form the dummy autosave data.
				$post = get_post( $post_id, ARRAY_A );

				// Fill u our autosave data.
				$data = array( 'wp_autosave' => $post );
				$data['wp_autosave']['post_id'] = $post_id;
				$data['wp_autosave']['content'] = $content;

				// Get_post doesn't give us the category list, create our own.
				$categories = get_the_category( $post_id );
				$catslist = '';
				foreach ( $categories as $category ) {
					$catslist .= $catslist ? ',' : '';
					$catslist .= $category->term_id;
				}
				$data['wp_autosave']['catslist'] = $catslist;

				// Form the nonce required to do this.
				$data['wp_autosave']['_wpnonce'] = wp_create_nonce( 'update-post_' . $post_id );

				// Autosave it!
				$response['autosave'] = heartbeat_autosave( array(), $data );
			}
			return $response;
		}


		/**
		 * Saves the given post & contents as autosave, ajax handler.
		 * Meant to be called every AUTOSAVE_INTERVAL seconds.
		 *
		 * @since 3.1
		 */
		public function heartbeat_autosave() {

			if ( empty( $_POST['nonce'] ) || empty( $_POST['post_id'] ) || empty( $_POST['content'] ) ) { // Input var okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var okay.

			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}

			$post_id = absint( $_POST['post_id'] ); // Input var okay.
			$content = wp_unslash( $_POST['content'] ); // Input var okay. WPCS: sanitization ok.

			// Clean up the content, this is the same cleaning we do during saving.
			define( 'PBS_DOING_AUTOSAVE', 'true' );
			$content = sanitize_post_field( 'post_content', $content, $post_id, 'db' );
			$content = apply_filters( 'pbs_save_content', $content, $post_id );

			// Form the dummy autosave data.
			$post = get_post( $post_id, ARRAY_A );

			// Fill u our autosave data.
			$data = array( 'wp_autosave' => $post );
			$data['wp_autosave']['post_id'] = $post_id;
			$data['wp_autosave']['content'] = $content;

			// Get_post doesn't give us the category list, create our own.
			$categories = get_the_category( $post_id );
			$catslist = '';
			foreach ( $categories as $category ) {
				$catslist .= $catslist ? ',' : '';
				$catslist .= $category->term_id;
			}
			$data['wp_autosave']['catslist'] = $catslist;

			// Form the nonce required to do this.
			$data['wp_autosave']['_wpnonce'] = wp_create_nonce( 'update-post_' . $post_id );

			// Autosave it!
			echo wp_json_encode( heartbeat_autosave( array(), $data ) );

			die();
		}


		/**
		 * Add the login form using wp-auth-check.
		 *
		 * @since 3.1
		 */
		public function add_login_form() {
			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return;
			}

			wp_enqueue_style( 'wp-auth-check' );
			wp_enqueue_script( 'wp-auth-check' );

			add_action( 'admin_print_footer_scripts', 'wp_auth_check_html', 5 );
			add_action( 'wp_print_footer_scripts', 'wp_auth_check_html', 5 );
		}


		/**
		 * Add the takeover modals.
		 *
		 * @since 3.1
		 */
		public function add_takeover_form() {
			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return;
			}

			global $pbs_url_for_templates;
			$pbs_url_for_templates = trailingslashit( plugins_url( 'page_builder_sandwich', __FILE__ ) );

			include 'page_builder_sandwich/templates/heartbeat-locked.php';
			include 'page_builder_sandwich/templates/heartbeat-takeover.php';
		}
	}
}

new PBSHeartbeat();
