<?php
/**
 * Newsletter element.
 *
 * @since 2.10
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSElementNewsletter' ) ) {

	/**
	 * This is where all the newsletter functionality happens.
	 */
	class PBSElementNewsletter {

		/**
		 * Hook into the frontend.
		 */
		function __construct() {
			global $pbs_fs;
			if ( ! PBS_IS_LITE && $pbs_fs->can_use_premium_code() ) {
				add_action( 'pbs_enqueue_element_scripts_newsletter', array( $this, 'add_newsletter_script' ) );
			}
			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_editor' ) );
			add_action( 'wp_ajax_pbs_newsletter_subscribe', array( $this, 'subscribe' ) );
			add_action( 'wp_ajax_nopriv_pbs_newsletter_subscribe', array( $this, 'subscribe' ) );
			add_filter( 'pbs_localize_scripts', array( $this, 'localize_scripts' ) );
			add_filter( 'pbs_save_content', array( $this, 'convert_newsletter_settings_to_post_meta' ), 10, 2 );
			add_filter( 'the_content', array( $this, 'add_back_newsletter_settings' ) );
		}


		/**
		 * Add the scripts needed by the newsletter element.
		 *
		 * @since 2.10
		 *
		 * @return void
		 */
		public function add_newsletter_script() {
			$js_dir = defined( 'WP_DEBUG' ) && WP_DEBUG ? 'dev' : 'min';
			$js_suffix = defined( 'WP_DEBUG' ) && WP_DEBUG ? '' : '-min';

			wp_enqueue_script( 'pbs-element-newsletter', plugins_url( 'page_builder_sandwich/js/' . $js_dir . '/frontend-newsletter' . $js_suffix . '.js', __FILE__ ), array(), VERSION_PAGE_BUILDER_SANDWICH );

			wp_localize_script( 'pbs-element-newsletter', 'pbsNewsletterParams', array(
				'ajax_url' => admin_url( 'admin-ajax.php' ),
				'nonce' => wp_create_nonce( 'pbs' ),
				'post_id' => $GLOBALS['post']->ID,
			) );
		}


		/**
		 * Includes frontend scripts needed for editors.
		 *
		 * @since 2.10
		 *
		 * @return void
		 */
		public function enqueue_editor() {

			$js_dir = defined( 'WP_DEBUG' ) && WP_DEBUG ? 'dev' : 'min';
			$js_suffix = defined( 'WP_DEBUG' ) && WP_DEBUG ? '' : '-min';

			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return;
			}

			global $pbs_fs;
			if ( ! PBS_IS_LITE && $pbs_fs->can_use_premium_code() ) {
				$this->add_newsletter_script();
			}
		}


		/**
		 * Add MailPoet variables if MailPoet is activated.
		 *
		 * @param array $params Localization params.
		 *
		 * @return array Modified localization params.
		 */
		public function localize_scripts( $params ) {

			// Add MailPoet list if available.
			if ( class_exists( 'WYSIJA' ) ) {
				$model_list = WYSIJA::get( 'list', 'model' );
				$query = 'SELECT * FROM [wysija]' . $model_list->table_name;
				$lists = $model_list->query( 'get_res', $query );
				$params['newsletter_mailpoet_list'] = array();
				foreach ( $lists as $list ) {
					$params['newsletter_mailpoet_list'][ $list['list_id'] ] = $list['name'];
				}
			}

			return $params;
		}


		/**
		 * Adds newsletter settings into the post meta, for use during subscription.
		 * This is mainly done so that we don't show any setting strings in the rendered
		 * HTML (to visitors), but we can still get the settings when someone subscribes
		 * using the form.
		 *
		 * @param string $content The post content being saved.
		 * @param int    $post_id The post ID being saved.
		 *
		 * @return string The modified content to save.
		 */
		public function convert_newsletter_settings_to_post_meta( $content, $post_id ) {
			if ( ! class_exists( 'simple_html_dom' ) ) {
				require_once( 'page_builder_sandwich/inc/simple_html_dom.php' );
			}

			// Remove all data-shortcode and replace it with the decoded shortcode. Do this from last to first to preserve nesting.
			$html = new simple_html_dom();
			$html->load( $content, true, false );

			$elements = $html->find( '[data-ce-tag="newsletter"]' );
			$newsletter_settings = array();
			for ( $i = count( $elements ) - 1; $i >= 0; $i-- ) {
				$element = $elements[ $i ];

				foreach ( $element->attr as $attr => $value ) {
					if ( preg_match( '/^data-(?!ce-|success-message)/', $attr ) ) {

						if ( ! array_key_exists( $element->id, $newsletter_settings ) ) {
							$newsletter_settings[ $element->id ] = array();
						}
						$newsletter_settings[ $element->id ][ $attr ] = $value;

						$element->{$attr} = null;
					}
				}
			}

			if ( count( $newsletter_settings ) ) {
				$content = (string) $html;

				update_post_meta( $post_id, 'pbs_newsletter_settings', wp_json_encode( $newsletter_settings ) );
			} else {
				delete_post_meta( $post_id, 'pbs_newsletter_settings' );
			}

			return $content;
		}


		/**
		 * When editing the page, put back any newsletter settings FROM the meta
		 * data back into the content. But when logged out and not editing,
		 * just show the normal content (that doesn't have the newsletter settings).
		 *
		 * @param string $content The post content.
		 *
		 * @return string The modified content.
		 */
		public function add_back_newsletter_settings( $content ) {
			if ( ! PageBuilderSandwich::is_editable_by_user() ) {
				return $content;
			}
			global $post;
			if ( ! $post ) {
				return $content;
			}
			if ( get_post_meta( $post->ID, 'pbs_newsletter_settings', true ) ) {
				$newsletter_settings = get_post_meta( $post->ID, 'pbs_newsletter_settings', true );
				$newsletter_settings = json_decode( $newsletter_settings );
				foreach ( $newsletter_settings as $id => $settings ) {
					$attrib_string = '';
					foreach ( $settings as $attribute => $value ) {
						$attrib_string .= sprintf( '%s="%s"', $attribute, esc_attr( $value ) ) . ' ';
					}
					$attrib_string = trim( $attrib_string );

					$content = preg_replace( "/(\sid=['\"]" . $id . "['\"])/", "$1 $attrib_string", $content );
				}
			}
			return $content;
		}


		/**
		 * Ajax handler when a user clicks the subscribe button on the newsletter form.
		 * Subscribes a user.
		 *
		 * @return void
		 */
		public function subscribe() {
			if ( empty( $_POST['nonce'] ) || empty( $_POST['post_id'] ) || empty( $_POST['email'] ) || empty( $_POST['newsletter_id'] ) ) { // Input var okay.
				die( esc_html__( 'Missing parameters. Please contact the admin.', 'page-builder-sandwich' ) );
			}

			$nonce = sanitize_key( $_POST['nonce'] ); // Input var okay.
			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die( esc_html__( 'Security error, please refresh the page and try again.', 'page-builder-sandwich' ) );
			}

			$post_id = absint( $_POST['post_id'] ); // Input var okay.
			$email = trim( sanitize_text_field( wp_unslash( $_POST['email'] ) ) ); // Input var okay.
			$newsletter_id = trim( sanitize_text_field( wp_unslash( $_POST['newsletter_id'] ) ) ); // Input var okay.
			if ( ! get_post_meta( $post_id, 'pbs_newsletter_settings', true ) ) {
				die( esc_html__( 'Missing newsletter settings. Please contact the admin.', 'page-builder-sandwich' ) );
			}
			if ( ! is_email( $email ) ) {
				die( esc_html__( 'Invalid email address.', 'page-builder-sandwich' ) );
			}

			// Get the newsletter settings.
			$newsletter_settings = get_post_meta( $post_id, 'pbs_newsletter_settings', true );
			$newsletter_settings = json_decode( $newsletter_settings );
			if ( ! property_exists( $newsletter_settings, $newsletter_id ) ) {
				die( esc_html__( 'Invalid newsletter settings. Please contact the admin.', 'page-builder-sandwich' ) );
			}
			$newsletter_settings = (array) $newsletter_settings->{$newsletter_id};
			$service = $newsletter_settings['data-service'];

			if ( ! method_exists( $this, $service ) ) {
				die( esc_html__( 'Invalid newsletter settings. Please contact the admin.', 'page-builder-sandwich' ) );
			}

			// Subscribe.
			call_user_func( array( $this, $service ), $email, $newsletter_settings );
		}


		/**
		 * MailPoet subscription method.
		 *
		 * @param string $email The email that wants to subscribe.
		 * @param array  $settings The newsletter settings.
		 *
		 * @return void
		 */
		public function mailpoet( $email, $settings ) {
			if ( ! class_exists( 'WYSIJA' ) ) {
				die( esc_html__( 'MailPoet plugin not found. Please contact the admin.', 'page-builder-sandwich' ) );
			}
			if ( empty( $settings['data-mailpoet-list'] ) ) {
				die( esc_html__( 'Invalid newsletter settings. Please contact the admin.', 'page-builder-sandwich' ) );
			}
			$list_id = $settings['data-mailpoet-list'];

			$data_subscriber = array(
				'user' => array(
					'email' => $email,
				),
				'user_list' => array(
					'list_ids' => array( $list_id ),
				),
			);

			$user_id = WYSIJA::get( 'user', 'helper' )->addSubscriber( $data_subscriber );

			if ( ! is_bool( $user_id ) ) {
				die( 1 );
			}

			if ( $user_id ) {
				die( esc_html__( 'Email address is already subscribed.', 'page-builder-sandwich' ) );
			}

			die( esc_html__( 'Something went wrong. Please contact the admin.', 'page-builder-sandwich' ) );
		}


		/**
		 * Aweber subscription method.
		 *
		 * @param string $email The email that wants to subscribe.
		 * @param array  $settings The newsletter settings.
		 *
		 * @return void
		 */
		public function aweber( $email, $settings ) {
			if ( empty( $settings['data-aweber-list'] ) ) {
				die( esc_html__( 'Invalid newsletter settings. Please contact the admin.', 'page-builder-sandwich' ) );
			}
		    $list_id = $settings['data-aweber-list'];

			$url = 'http://www.aweber.com/scripts/addlead.pl';

			$args = array(
			    'method' => 'POST',
				'timeout' => 10,
				'sslverify' => false,
				'body' => array(
					'listname' => $list_id,
					'redirect' => get_site_url(),
					'email' => $email,
					'submit' => 'Subscribe',
				),
			);

			$response = wp_remote_request( $url, $args );

			if ( ! empty( $response['response']['code'] ) ) {
				if ( 200 === $response['response']['code'] ) {
					die( 1 );
				}
			}

			die( esc_html__( 'Something went wrong. Please contact the admin.', 'page-builder-sandwich' ) );
		}


		/**
		 * MailChimp subscription method.
		 *
		 * @param string $email The email that wants to subscribe.
		 * @param array  $settings The newsletter settings.
		 *
		 * @return void
		 */
		public function mailchimp( $email, $settings ) {
			if ( empty( $settings['data-mailchimp-api-key'] ) || empty( $settings['data-mailchimp-list'] ) ) {
				die( esc_html__( 'Invalid newsletter settings. Please contact the admin.', 'page-builder-sandwich' ) );
			}
			$api_key = $settings['data-mailchimp-api-key'];
		    $list_id = $settings['data-mailchimp-list'];

			if ( empty( $api_key ) || empty( $list_id ) || empty( $email ) ) {
				die();
			}
			if ( strpos( $api_key, '-' ) === false ) {
				die();
			}

			// Reference:
			// @see http://stackoverflow.com/questions/30481979/adding-subscribers-to-a-list-using-mailchimps-api-v3 .
		    $domain = substr( $api_key, strpos( $api_key, '-' ) + 1 );
		    $url = 'https://' . $domain . '.api.mailchimp.com/3.0/lists/' . $list_id . '/members/';

		    $json = wp_json_encode( array(
		        'email_address' => $email,
		        'status' => 'subscribed',
		    ) );

			$args = array(
			    'method' => 'POST',
				'timeout' => 10,
				'sslverify' => false,
				'headers' => array(
					'Content-Type' => 'application/json',
					'Authorization' => 'Basic ' . base64_encode( 'user:' . $api_key ),
				),
				'body' => $json,
			);

			$response = wp_remote_request( $url, $args );

			if ( ! empty( $response['response']['code'] ) ) {
				if ( 200 === $response['response']['code'] ) {
					die( 1 );
				}
			}

			// Friendlier error messages.
			$json_body = json_decode( $response['body'], true );
			if ( $json_body ) {
				$message = '';

				if ( ! empty( $json_body['title'] ) ) {

					// Already subscribed.
					if ( 'Member Exists' === $json_body['title'] ) {
						die( esc_html__( 'You\'re already subscribed to our newsletter', 'page-builder-sandwich' ) );
					}

					$message .= $json_body['title'];
				}

				if ( ! empty( $json_body['detail'] ) ) {
					if ( $message ) {
						$message .= ': ';
					}
					$message .= $json_body['detail'];
				}

				if ( $message ) {
					die( esc_html( $message ) );
				}
			}

			die( esc_html__( 'Something went wrong. Please contact the admin.', 'page-builder-sandwich' ) );
		}
	}
}

new PBSElementNewsletter();
