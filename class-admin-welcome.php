<?php
/**
 * Display a welcome admin page.
 *
 * @since 3.2
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSAdminWelcome' ) ) {

	/**
	 * This is where all the admin page creation happens.
	 */
	class PBSAdminWelcome {

		/**
		 * Hook into WordPress.
		 */
		function __construct() {
			add_action( 'admin_menu', array( $this, 'create_admin_menu' ) );
			add_action( 'activated_plugin', array( $this, 'redirect_to_welcome_page' ) );
		}


		/**
		 * Creates the PBS admin menu item.
		 *
		 * @since 3.2
		 */
		public function create_admin_menu() {
			add_menu_page(
				esc_html__( 'Page Builder Sandwich', 'page-builder-sandwich' ), // Page title.
				esc_html__( 'PBSandwich', 'page-builder-sandwich' ), // Menu title.
				'manage_options', // Permissions.
				'page-builder-sandwich', // Slug.
				array( $this, 'create_admin_page' ) // Page creation function.
			);

			add_submenu_page(
				'page-builder-sandwich', // Parent slug.
				esc_html__( 'Page Builder Sandwich', 'page-builder-sandwich' ), // Page title.
				esc_html__( 'Home', 'page-builder-sandwich' ), // Menu title.
				'manage_options', // Permissions.
				'page-builder-sandwich', // Slug.
				array( $this, 'create_admin_page' ) // Page creation function.
			);
		}


		/**
		 * Creates the contents of the welcome admin page.
		 *
		 * @since 3.2
		 */
		public function create_admin_page() {
			?>
			<div class="wrap about-wrap">
				<img class="pbs-logo" src="<?php echo esc_url( plugins_url( 'page_builder_sandwich/images/pbs-logo.png', __FILE__ ) ) ?>"/>
				<h1><?php esc_html_e( 'Welcome to Page Builder Sandwich', 'page-builder-sandwich' ) ?> v<?php esc_html_e( VERSION_PAGE_BUILDER_SANDWICH ) ?></h1>
				<p class="pbs-subheading"><?php esc_html_e( 'Creating Stunning Webpages Is Now as Easy as Making a Sandwich', 'page-builder-sandwich' ) ?></p>
				<div class="pbs-welcome-panel">
					<div class="pbs-welcome-panel-column">
						<div class="pbs-welcome-column-wrapper">
							<h3><?php esc_html_e( "Let's Get Started", 'page-builder-sandwich' ) ?></h3>
							<a class="button button-primary button-hero" href="<?php echo esc_url( admin_url( 'post-new.php?post_type=page' ) ) ?>"><?php esc_html_e( 'Create New Page', 'page-builder-sandwich' ) ?></a>
							<p><?php esc_html_e( 'To start, create a new page then click on the awesome "Edit with Page Builder Sandwich" button.', 'page-builder-sandwich' ) ?></p>
						</div>
					</div>
					<div class="pbs-welcome-panel-column">
						<div class="pbs-welcome-column-wrapper">
							<h3><?php esc_html_e( 'Join The Community', 'page-builder-sandwich' ) ?></h3>
							<p><?php esc_html_e( 'Join fellow PBSandwich aficionados in our community, ask questions, give feedback, suggest features, and discuss your projects!', 'page-builder-sandwich' ) ?></p>
							<ul>
								<li><a href="https://twitter.com/PageSandwich" class="twitter-follow-button" data-show-count="true"><?php esc_html_e( 'Follow @PageSandwich', 'page-builder-sandwich' ) ?></a>
									<?php // @codingStandardsIgnoreStart ?>
									<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>
									<?php // @codingStandardsIgnoreEnd ?>
								</li>
								<li><a href="https://www.facebook.com/pagebuildersandwich" target="_pbsadmin">
									<span class="dashicons dashicons-facebook"></span>
									<?php esc_html_e( 'Join us on Facebook', 'page-builder-sandwich' ) ?></a>
								</li>
							</ul>
						</div>
					</div>
					<div class="pbs-welcome-panel-column pbs-welcome-panel-last">
						<div class="pbs-welcome-column-wrapper">
							<h3><?php esc_html_e( 'Need Help?', 'page-builder-sandwich' ) ?></h3>
							<p>
								<ul>
									<li><a href="http://docs.pagebuildersandwich.com/" target="_pbsadmin"><span class="dashicons dashicons-book"></span> <?php esc_html_e( 'Documentation and guides', 'page-builder-sandwich' ) ?></a></li>
									<li><a href="<?php echo esc_url( admin_url( 'admin.php?page=page-builder-sandwich-contact' ) ) ?>"><span class="dashicons dashicons-email"></span> <?php esc_html_e( 'Contact email support', 'page-builder-sandwich' ) ?></a></li>
								</ul>
							</p>
							<?php
							if ( PBS_IS_LITE ) {
								?>
								<p>
									<ul>
										<li><a href="https://wordpress.org/support/plugin/page-builder-sandwich#new-post" target="_blank"><span class="dashicons dashicons-sos"></span> <?php esc_html_e( 'Ask in the Plugin Support Forum', 'page-builder-sandwich' ) ?></a></li>
										<li><a href="<?php echo esc_url( admin_url( 'admin.php?page=page-builder-sandwich-pricing' ) ) ?>"><span class="dashicons dashicons-email"></span> <?php esc_html_e( 'Go premium for 1-on-1 email support!', 'page-builder-sandwich' ) ?></a></li>
									</ul>
								</p>
								<?php
							}
							?>
						</div>
					</div>
				</div>
				<div class="pbs-welcome-panel">
					<div class="pbs-welcome-panel-column" style="width: 50%;">
						<div class="pbs-welcome-column-wrapper">
							<h3><?php esc_html_e( "What's New", 'page-builder-sandwich' ) ?></h3>
							<div class="pbs-whats-new">
								<div>
									<p><strong>Google Fonts</strong><br>
										Now you can change fonts! Pick from all available Google Fonts. (Premium)
								</div>
								<div>
									<p><strong>Blank Page Template</strong><br>
										Use the new Blank Page Template to build pages on a blank canvas.</p>
								</div>
								<div>
									<p><strong>CloudFlare Rocket Loader</strong><br>
										Now compatible with CloudFlare's Rocket Loader. More speed!</p>
								</div>
								<div>
									<p><strong>More Free Formatting Tools</strong><br>
										Uppercase, font-size up/down, line height tools are now available in the lite version.</p>
								</div>
								<div>
									<p><strong>Better User Experience</strong><br>
										We've revamped how the inspector works to make it so much easier to use.
								</div>
								<div>
									<p><strong>Same Page Links</strong><br>
										Use the ".class" or "#ID" of an element in a link and the page will smoothly scroll to it. (Premium)</p>
								</div>
								<div>
									<p><strong>Page Templates</strong><br>
										We have 10 page templates that you can use as a starting point for your designs. (Premium)</p>
								</div>
								<div>
									<p><strong>Responsive Views</strong><br>
										Switch between desktop, tablet and mobile phone views while editing.</p>
								</div>
							</div>
						</div>
					</div>
					<div class="pbs-welcome-panel-column pbs-welcome-panel-last" style="width: 50%;">
						<div class="pbs-welcome-column-wrapper">
							<h3><?php esc_html_e( 'Watch the Tour', 'page-builder-sandwich' ) ?></h3>
							<div class="pbs-tour">
								<iframe src="https://www.youtube.com/embed/UrHN-9TT02s?rel=0&showinfo=0&autohide=1&controls=0" width="800" height="450" frameborder="0" allowfullscreen="1"></iframe>
							</div>
						</div>
					</div>
				</div>
				<div class="pbs-welcome-panel pbs-welcome-changelog">
					<h3><?php esc_html_e( "A Stickler for details? Here's everything's that changed in this version", 'page-builder-sandwich' ) ?></h3>
					<ul>
<li style="color: #e74c3c"><code>Fixed</code> Updated Freemius </li>
<li style="color: #f39c12"><code>Change</code> Map Element will now not display anything unless an API Key is provided</li>
<li style="color: #f39c12"><code>Enhanced</code> Updated Freemius SDK to v2.4.0.1</li>
<li style="color: #e74c3c"><code>Fixed</code> Google Map API key error</li>
<li style="color: #e74c3c"><code>Fixed</code> Google Map API Key setting PHP notice</li>
<li style="color: #e74c3c"><code>Fixed</code> Javascript prevent default error when scrolling on the element list</li>
<li style="color: #e74c3c"><code>Fixed</code> Some code cleanup</li>
					</ul>
				</div>
			</div>
			<?php
		}


		/**
		 * Redirect to our welcome page after activation.
		 *
		 * @since 3.2
		 *
		 * @param string $plugin The path to the plugin that was activated.
		 */
		public function redirect_to_welcome_page( $plugin ) {
			if ( plugin_basename( PBS_FILE ) === $plugin ) {
				wp_redirect( esc_url( admin_url( 'admin.php?page=page-builder-sandwich' ) ) );
				die();
			}
		}
	}
}

new PBSAdminWelcome();