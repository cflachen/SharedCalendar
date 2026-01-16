<?php
/**
 * Simple Calendar API
 * Handles reading and writing calendar events to a JSON file
 */

session_start();
require_once 'auth.php';

// Set proper CORS headers for credentials
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Require authentication for all API calls
requireAuth();

// Path to the data file
$dataFile = __DIR__ . '/data/events.json';
$dataDir = __DIR__ . '/data';

// Ensure data directory exists
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Ensure data file exists
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([], JSON_PRETTY_PRINT));
    chmod($dataFile, 0666);
}

// Get action from query parameter
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'get':
        getEvents($dataFile);
        break;
    
    case 'save':
        saveEvents($dataFile);
        break;
    
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action'
        ]);
        break;
}

/**
 * Get all events from the JSON file
 */
function getEvents($dataFile) {
    try {
        $contents = file_get_contents($dataFile);
        $events = json_decode($contents, true);
        
        if ($events === null) {
            $events = [];
        }
        
        echo json_encode([
            'success' => true,
            'events' => $events
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error reading events: ' . $e->getMessage()
        ]);
    }
}

/**
 * Save events to the JSON file
 */
function saveEvents($dataFile) {
    try {
        // Get POST data
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!isset($data['events'])) {
            echo json_encode([
                'success' => false,
                'message' => 'No events data provided'
            ]);
            return;
        }
        
        // Validate and sanitize data
        $events = $data['events'];
        
        // Ensure events is an array
        if (!is_array($events)) {
            echo json_encode([
                'success' => false,
                'message' => 'Events must be an object/array'
            ]);
            return;
        }
        
        // Write to file with file locking to prevent concurrent write issues
        $fp = fopen($dataFile, 'w');
        if ($fp) {
            if (flock($fp, LOCK_EX)) {
                $jsonContent = json_encode($events, JSON_PRETTY_PRINT);
                $bytesWritten = fwrite($fp, $jsonContent);
                flock($fp, LOCK_UN);
                fclose($fp);
                
                if ($bytesWritten === false) {
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to write to file'
                    ]);
                } else {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Events saved successfully'
                    ]);
                }
            } else {
                fclose($fp);
                echo json_encode([
                    'success' => false,
                    'message' => 'Could not lock file for writing'
                ]);
            }
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Could not open file for writing'
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error saving events: ' . $e->getMessage()
        ]);
    }
}
?>
