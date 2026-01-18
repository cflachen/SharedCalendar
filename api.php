<?php
/**
 * Simple Calendar API
 * Handles reading and writing calendar events to a JSON file
 */

// Start output buffering to prevent any extra output before JSON
ob_start();

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

// Clear any buffered output and start fresh
ob_end_clean();
ob_start();

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
        exit;
    
    case 'save':
        saveEvents($dataFile);
        exit;
    
    case 'acquireLock':
        acquireLock($dataDir);
        exit;
    
    case 'releaseLock':
        releaseLock($dataDir);
        exit;
    
    case 'checkLock':
        checkLock($dataDir);
        exit;
    
    default:
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action'
        ]);
        exit;
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
                    ob_end_clean();
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to write to file'
                    ]);
                } else {
                    chmod($dataFile, 0666);
                    ob_end_clean();
                    echo json_encode([
                        'success' => true,
                        'message' => 'Events saved successfully'
                    ]);
                }
            } else {
                fclose($fp);
                ob_end_clean();
                echo json_encode([
                    'success' => false,
                    'message' => 'Could not lock file for writing'
                ]);
            }
        } else {
            ob_end_clean();
            echo json_encode([
                'success' => false,
                'message' => 'Could not open file for writing'
            ]);
        }
    } catch (Exception $e) {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Error saving events: ' . $e->getMessage()
        ]);
    }
    exit;
}

/**
 * Acquire a lock for atomic operations
 */
function acquireLock($dataDir) {
    $lockFile = $dataDir . '/calendar.lock';
    $maxLockAge = 10; // seconds - max age before lock can be taken over
    
    try {
        // Check if lock exists
        if (file_exists($lockFile)) {
            $lockData = json_decode(file_get_contents($lockFile), true);
            $lockTime = $lockData['timestamp'] ?? 0;
            $currentTime = time();
            
            // If lock is older than max age, we can take it over
            if (($currentTime - $lockTime) < $maxLockAge) {
                ob_end_clean();
                echo json_encode([
                    'success' => false,
                    'locked' => true,
                    'message' => 'Resource is locked',
                    'lockAge' => $currentTime - $lockTime,
                    'retryAfter' => $maxLockAge - ($currentTime - $lockTime)
                ]);
                return;
            }
            // Lock is stale, we'll take it over
        }
        
        // Create/update lock file
        $lockData = [
            'timestamp' => time(),
            'user' => $_SESSION['username'] ?? 'unknown',
            'sessionId' => session_id()
        ];
        
        file_put_contents($lockFile, json_encode($lockData, JSON_PRETTY_PRINT));
        chmod($lockFile, 0666);
        
        ob_end_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Lock acquired',
            'lockData' => $lockData
        ]);
    } catch (Exception $e) {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Error acquiring lock: ' . $e->getMessage()
        ]);
    }
}

/**
 * Release a lock
 */
function releaseLock($dataDir) {
    $lockFile = $dataDir . '/calendar.lock';
    
    try {
        if (file_exists($lockFile)) {
            unlink($lockFile);
        }
        
        ob_end_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Lock released'
        ]);
    } catch (Exception $e) {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Error releasing lock: ' . $e->getMessage()
        ]);
    }
}

/**
 * Check lock status
 */
function checkLock($dataDir) {
    $lockFile = $dataDir . '/calendar.lock';
    
    try {
        if (file_exists($lockFile)) {
            $lockData = json_decode(file_get_contents($lockFile), true);
            $currentTime = time();
            $lockAge = $currentTime - ($lockData['timestamp'] ?? 0);
            
            ob_end_clean();
            echo json_encode([
                'success' => true,
                'locked' => true,
                'lockAge' => $lockAge,
                'lockData' => $lockData
            ]);
        } else {
            ob_end_clean();
            echo json_encode([
                'success' => true,
                'locked' => false
            ]);
        }
    } catch (Exception $e) {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Error checking lock: ' . $e->getMessage()
        ]);
    }
}
?>
