<?php
/**
 * Inspector class. The inspector performs some ajax calls, those are
 * handled in this class.
 *
 * @package Page Builder Sandwich
 */

if ( ! defined( 'ABSPATH' ) ) { exit; // Exit if accessed directly.
}

if ( ! class_exists( 'PBSInspector' ) ) {

	/**
	 * This is where all the inspector ajax functionality happens.
	 */
	class PBSInspector {


		/**
		 * Hook into WordPress.
		 */
		function __construct() {
			add_action( 'wp_ajax_pbs_inspector_dropdown_post', array( $this, 'dropdown_post' ) );
			add_action( 'wp_ajax_pbs_inspector_dropdown_db', array( $this, 'dropdown_db' ) );
		}


		/**
		 * Handle dropdown post values.
		 *
		 * @since 2.18
		 *
		 * @return void
		 */
		public function dropdown_post() {
			if ( empty( $_POST['nonce'] ) ) { // Input var: okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var: okay.
			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}
			if ( empty( $_POST['post_type'] ) ) { // Input var: okay.
				die();
			}
			$post_type = trim( sanitize_text_field( wp_unslash( $_POST['post_type'] ) ) ); // Input var: okay.

			$args = array(
				'post_type' => $post_type,
				// @codingStandardsIgnoreLine
				'posts_per_page' => -1,
				'post_status' => 'publish',
				'orderby' => 'title',
				'order' => 'asc',
				'suppress_filters' => false,
			);

			// @codingStandardsIgnoreLine
			$posts = get_posts( $args );

			$ret = array(
				'' => '— ' . esc_html__( 'Select one', 'page-builder-sandwich' ) . ' —',
			);
			foreach ( $posts as $post ) {
				$title = $post->post_title;
				if ( empty( $title ) ) {
					$title = sprintf( __( 'Untitled %s', TF_I18NDOMAIN ), '(ID #' . $post->ID . ')' );
				}

				$ret[ $post->ID ] = $title;
			}

			if ( 1 === count( $ret ) ) {
				$ret[''] = '— ' . sprintf( esc_html__( 'Create a %s first', 'page-builder-sandwich' ), ucwords( preg_replace( '/[_-]/', ' ', $post_type ) ) ) . ' —';
			}

			echo wp_json_encode( $ret );
			die();
		}


		/**
		 * Handle dropdown database values.
		 *
		 * @since 2.19
		 *
		 * @return void
		 */
		public function dropdown_db() {
			if ( empty( $_POST['nonce'] ) ) { // Input var: okay.
				die();
			}
			$nonce = sanitize_key( $_POST['nonce'] ); // Input var: okay.
			if ( ! wp_verify_nonce( $nonce, 'pbs' ) ) {
				die();
			}

			if ( empty( $_POST['db_table'] ) || empty( $_POST['db_value'] ) || empty( $_POST['db_label'] ) ) { // Input var: okay.
				die();
			}
			$table = trim( sanitize_text_field( wp_unslash( $_POST['db_table'] ) ) ); // Input var: okay.
			$value_field = trim( sanitize_text_field( wp_unslash( $_POST['db_value'] ) ) ); // Input var: okay.
			$label_field = trim( sanitize_text_field( wp_unslash( $_POST['db_label'] ) ) ); // Input var: okay.

			$where_field = '';
			if ( ! empty( $_POST['db_where_field'] ) ) { // Input var: okay.
				$where_field = trim( sanitize_text_field( wp_unslash( $_POST['db_where_field'] ) ) ); // Input var: okay.
			}
			$where_value = '';
			if ( ! empty( $_POST['db_where_value'] ) ) { // Input var: okay.
				$where_value = trim( sanitize_text_field( wp_unslash( $_POST['db_where_value'] ) ) ); // Input var: okay.
			}

			global $wpdb;

			// For security, check if the table exists.
			$tables = $wpdb->get_col( 'SHOW TABLES', 0 ); // Db call ok; no-cache ok.
			if ( ! in_array( $wpdb->base_prefix . $table, $tables, true ) ) {
				die();
			}

			// For security, check if the columns exist.
			$columns = $wpdb->get_col( 'DESC ' . $wpdb->base_prefix . $table, 0 ); // Db call ok; no-cache ok; WPCS: unprepared SQL ok.
			if ( ! in_array( $value_field, $columns, true ) ) {
				die();
			}
			if ( ! in_array( $label_field, $columns, true ) ) {
				die();
			}
			if ( ! empty( $where_field ) && ! in_array( $where_field, $columns, true ) ) {
				die();
			}

			// All okay, perform query.
			$sql = 'SELECT ' . $value_field . ', ' . $label_field . ' FROM ' . $wpdb->base_prefix . $table;
			if ( ! empty( $where_field ) && ! empty( $where_value ) ) {
				$sql .= ' ' . $wpdb->prepare( 'WHERE ' . $where_field . ' = %s', $where_value ); // WPCS: unprepared SQL ok.
			}

			$results = $wpdb->get_results( $sql, ARRAY_N ); // Db call ok; no-cache ok; WPCS: unprepared SQL ok.

			// Prepare the results.
			$ret = array(
				'' => '— ' . esc_html__( 'Select one', 'page-builder-sandwich' ) . ' —',
			);

			if ( $results ) {
				foreach ( $results as $result ) {
					$label = $result[1];
					if ( empty( $label ) ) {
						$label = sprintf( __( 'Untitled %s', TF_I18NDOMAIN ), '(ID #' . $result[0] . ')' );
					}
					$ret[ $result[0] ] = $label;
				}
			}

			echo wp_json_encode( $ret );
			die();
		}
	}
}

new PBSInspector();
