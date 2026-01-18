<?php
session_start();
header('Content-Type: application/json');
ob_start();

require_once 'auth.php';

$action = $_GET['action'] ?? '';

if ($action === 'getTitle') {
    // Anyone can get the title
    $settingsFile = 'data/settings.json';
    
    if (file_exists($settingsFile)) {
        $content = file_get_contents($settingsFile);
        ob_end_clean();
        echo $content;
    } else {
        ob_end_clean();
        echo json_encode(['calendar_title' => 'Shared Calendar']);
    }
    exit;
}

if ($action === 'setTitle') {
    // Only admins can set the title
    requireAdmin();
    
    $title = $_POST['title'] ?? '';
    
    if (empty($title)) {
        http_response_code(400);
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Title cannot be empty']);
        exit;
    }
    
    $settingsFile = 'data/settings.json';
    
    // Get current settings
    $settings = [];
    if (file_exists($settingsFile)) {
        $content = file_get_contents($settingsFile);
        $settings = json_decode($content, true) ?? [];
    }
    
    // Update title
    $settings['calendar_title'] = $title;
    
    // Write back to file
    $handle = fopen($settingsFile, 'w');
    if ($handle) {
        flock($handle, LOCK_EX);
        fwrite($handle, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        flock($handle, LOCK_UN);
        fclose($handle);
        chmod($settingsFile, 0666);
    }
    
    ob_end_clean();
    echo json_encode(['success' => true, 'message' => 'Calendar title updated']);
    exit;
}

http_response_code(400);
ob_end_clean();
echo json_encode(['success' => false, 'message' => 'Invalid action']);
?>
