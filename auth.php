<?php
/**
 * Authentication System
 * Handles login, logout, and session management
 */

session_start();

header('Content-Type: application/json');

$usersFile = __DIR__ . '/data/users.json';

// Get action from query parameter
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'login':
        login($usersFile);
        break;
    
    case 'logout':
        logout();
        break;
    
    case 'check':
        checkAuth();
        break;
    
    case 'current':
        getCurrentUser();
        break;
    
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action'
        ]);
        break;
}

/**
 * Handle user login
 */
function login($usersFile) {
    try {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!isset($data['username']) || !isset($data['password'])) {
            echo json_encode([
                'success' => false,
                'message' => 'Username and password required'
            ]);
            return;
        }
        
        $username = trim($data['username']);
        $password = $data['password'];
        
        // Load users
        if (!file_exists($usersFile)) {
            echo json_encode([
                'success' => false,
                'message' => 'User system not initialized'
            ]);
            return;
        }
        
        $users = json_decode(file_get_contents($usersFile), true);
        
        // Find user
        if (!isset($users[$username])) {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid username or password'
            ]);
            return;
        }
        
        $user = $users[$username];
        
        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid username or password'
            ]);
            return;
        }
        
        // Set session
        $_SESSION['username'] = $username;
        $_SESSION['is_admin'] = $user['is_admin'];
        $_SESSION['full_name'] = $user['full_name'];
        
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'username' => $username,
                'full_name' => $user['full_name'],
                'is_admin' => $user['is_admin']
            ]
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Login error: ' . $e->getMessage()
        ]);
    }
}

/**
 * Handle user logout
 */
function logout() {
    session_destroy();
    echo json_encode([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
}

/**
 * Check if user is authenticated
 */
function checkAuth() {
    if (isset($_SESSION['username'])) {
        echo json_encode([
            'success' => true,
            'authenticated' => true
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'authenticated' => false
        ]);
    }
}

/**
 * Get current user info
 */
function getCurrentUser() {
    if (!isset($_SESSION['username'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Not authenticated'
        ]);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'user' => [
            'username' => $_SESSION['username'],
            'full_name' => $_SESSION['full_name'],
            'is_admin' => $_SESSION['is_admin']
        ]
    ]);
}

/**
 * Check if current user is authenticated (for including in other files)
 */
function requireAuth() {
    if (!isset($_SESSION['username'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Authentication required'
        ]);
        exit;
    }
}

/**
 * Check if current user is admin (for including in other files)
 */
function requireAdmin() {
    requireAuth();
    if (!$_SESSION['is_admin']) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Admin access required'
        ]);
        exit;
    }
}
?>
