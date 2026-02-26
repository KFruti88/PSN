/**
 * Shortcode to fetch raw HTML from GitHub and display in Divi
 * Usage: [github_html url="https://raw.githubusercontent.com/KFruti88/PSN/main/theHunter/trophy-tracking.html"]
 */
function fetch_github_trophy_tracking($atts) {
    $a = shortcode_atts( array(
        'url' => '',
    ), $atts );

    if (empty($a['url'])) return 'No URL provided';

    // Fetch the content
    $response = wp_remote_get($a['url']);

    if (is_wp_error($response)) {
        return 'Error loading trophy data.';
    }

    $html = wp_remote_retrieve_body($response);

    // Ensure it wraps in your required Divi container for transparency
    return '<div id="wp-custom-wrapper" style="background:transparent;">' . $html . '</div>';
}
add_shortcode('github_html', 'fetch_github_trophy_tracking');
