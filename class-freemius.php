<?php

/**
 * Freemius class
 *
 * @since 3.2
 *
 * @package Page Builder Sandwich
 */

if ( !defined( 'ABSPATH' ) ) {
    exit;
    // Exit if accessed directly.
}

/**
 * Initializes Freemius.
 */
function pbs_fs()
{
    global  $pbs_fs ;
    
    if ( !isset( $pbs_fs ) ) {
        $module = array(
            'id'                  => '203',
            'slug'                => 'page-builder-sandwich',
            'type'                => 'plugin',
            'public_key'          => 'pk_24332b201c316345690967b25da99',
            'is_premium'          => !PBS_IS_LITE,
            'premium_suffix'      => '',
            'has_premium_version' => !PBS_IS_ENVATO && !PBS_IS_DEVELOPER,
            'has_addons'          => false,
            'has_paid_plans'      => !PBS_IS_ENVATO && !PBS_IS_DEVELOPER,
            'has_affiliation'     => false,
            'menu'                => array(
            'slug'       => 'page-builder-sandwich',
            'first-path' => 'admin.php?page=page-builder-sandwich',
            'pricing'    => !PBS_IS_ENVATO && !PBS_IS_DEVELOPER,
            'support'    => false,
            'account'    => !PBS_IS_ENVATO && !PBS_IS_DEVELOPER,
            'contact'    => false,
        ),
            'secret_key'          => 'sk_ViI7{.G-=aXJ{gvjG)yN7YtUQ9wIX',
        );
        // Include Freemius SDK.
        require_once dirname( __FILE__ ) . '/freemius/start.php';
        
        if ( !PBS_IS_ENVATO && !PBS_IS_DEVELOPER ) {
            $pbs_fs = fs_dynamic_init( $module );
        } else {
            
            if ( PBS_IS_ENVATO ) {
                // Mimic how fs_dynamic_init does it but use our special override class.
                require_once 'class-freemius-envato.php';
                $pbs_fs = FreemiusEnvato::instance( $module['id'], $module['slug'], true );
                $pbs_fs->dynamic_init( $module );
            } else {
                
                if ( PBS_IS_DEVELOPER ) {
                    // Mimic how fs_dynamic_init does it but use our special override class.
                    require_once 'class-freemius-developer.php';
                    $pbs_fs = FreemiusDeveloper::instance( $module['id'], $module['slug'], true );
                    $pbs_fs->dynamic_init( $module );
                }
            
            }
        
        }
    
    }
    
    return $pbs_fs;
}

// Init Freemius.
pbs_fs();
// Uninstall logic.
require_once 'function-uninstall.php';
pbs_fs()->add_action( 'after_uninstall', 'pbs_uninstall' );

// Signal that SDK was initiated.
do_action( 'pbs_fs_loaded' );