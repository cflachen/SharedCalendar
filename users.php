<?php
/**
 * User Management API
 * Handles CRUD operations for users (admin only)
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

$usersFile = __DIR__ . '/data/users.json';

// Get action from query parameter
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'list':
        requireAdmin();
        listUsers($usersFile);
        break;
    
    case 'add':
        requireAdmin();
        addUser($usersFile);
        break;
    
    case 'delete':
        requireAdmin();
        deleteUser($usersFile);
        break;
    
    case 'change_password':
        requireAuth();
        changePassword($usersFile);
        break;
    
    case 'generate_password':
        requireAdmin();
        generatePassword();
        break;
    
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action'
        ]);
        break;
}

/**
 * List all users (excluding passwords)
 */
function listUsers($usersFile) {
    try {
        if (!file_exists($usersFile)) {
            echo json_encode([
                'success' => true,
                'users' => []
            ]);
            return;
        }
        
        $users = json_decode(file_get_contents($usersFile), true);
        
        // Remove password hashes from response
        $userList = [];
        foreach ($users as $username => $userData) {
            $userList[] = [
                'username' => $username,
                'full_name' => $userData['full_name'],
                'is_admin' => $userData['is_admin'],
                'created_at' => $userData['created_at']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'users' => $userList
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error listing users: ' . $e->getMessage()
        ]);
    }
}

/**
 * Add a new user
 */
function addUser($usersFile) {
    try {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!isset($data['username']) || !isset($data['password']) || !isset($data['full_name'])) {
            echo json_encode([
                'success' => false,
                'message' => 'Username, password, and full name required'
            ]);
            return;
        }
        
        $username = trim($data['username']);
        $password = $data['password'];
        $fullName = trim($data['full_name']);
        $isAdmin = isset($data['is_admin']) ? (bool)$data['is_admin'] : false;
        
        // Validate username
        if (empty($username) || !preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
            echo json_encode([
                'success' => false,
                'message' => 'Username must be 3-20 characters (letters, numbers, underscore only)'
            ]);
            return;
        }
        
        // Validate password
        if (strlen($password) < 6) {
            echo json_encode([
                'success' => false,
                'message' => 'Password must be at least 6 characters'
            ]);
            return;
        }
        
        // Load existing users
        $users = [];
        if (file_exists($usersFile)) {
            $users = json_decode(file_get_contents($usersFile), true);
        }
        
        // Check if user already exists
        if (isset($users[$username])) {
            echo json_encode([
                'success' => false,
                'message' => 'Username already exists'
            ]);
            return;
        }
        
        // Create user
        $users[$username] = [
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'full_name' => $fullName,
            'is_admin' => $isAdmin,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $_SESSION['username']
        ];
        
        // Save users
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
        
        echo json_encode([
            'success' => true,
            'message' => 'User created successfully'
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error creating user: ' . $e->getMessage()
        ]);
    }
}

/**
 * Delete a user
 */
function deleteUser($usersFile) {
    try {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!isset($data['username'])) {
            echo json_encode([
                'success' => false,
                'message' => 'Username required'
            ]);
            return;
        }
        
        $username = trim($data['username']);
        
        // Prevent deleting yourself
        if ($username === $_SESSION['username']) {
            echo json_encode([
                'success' => false,
                'message' => 'Cannot delete your own account'
            ]);
            return;
        }
        
        // Load users
        if (!file_exists($usersFile)) {
            echo json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
            return;
        }
        
        $users = json_decode(file_get_contents($usersFile), true);
        
        // Check if user exists
        if (!isset($users[$username])) {
            echo json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
            return;
        }
        
        // Delete user
        unset($users[$username]);
        
        // Save users
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
        
        echo json_encode([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error deleting user: ' . $e->getMessage()
        ]);
    }
}

/**
 * Change password (own or admin changing another)
 */
function changePassword($usersFile) {
    try {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        $targetUsername = isset($data['username']) ? trim($data['username']) : $_SESSION['username'];
        
        // Non-admins can only change their own password
        if (!$_SESSION['is_admin'] && $targetUsername !== $_SESSION['username']) {
            echo json_encode([
                'success' => false,
                'message' => 'You can only change your own password'
            ]);
            return;
        }
        
        if (!isset($data['new_password'])) {
            echo json_encode([
                'success' => false,
                'message' => 'New password required'
            ]);
            return;
        }
        
        $newPassword = $data['new_password'];
        
        // Validate new password
        if (strlen($newPassword) < 6) {
            echo json_encode([
                'success' => false,
                'message' => 'Password must be at least 6 characters'
            ]);
            return;
        }
        
        // For non-admins, require current password
        if (!$_SESSION['is_admin'] && $targetUsername === $_SESSION['username']) {
            if (!isset($data['current_password'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Current password required'
                ]);
                return;
            }
            
            // Verify current password
            $users = json_decode(file_get_contents($usersFile), true);
            if (!password_verify($data['current_password'], $users[$targetUsername]['password_hash'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Current password is incorrect'
                ]);
                return;
            }
        }
        
        // Load users
        $users = json_decode(file_get_contents($usersFile), true);
        
        if (!isset($users[$targetUsername])) {
            echo json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
            return;
        }
        
        // Update password
        $users[$targetUsername]['password_hash'] = password_hash($newPassword, PASSWORD_DEFAULT);
        $users[$targetUsername]['password_changed_at'] = date('Y-m-d H:i:s');
        $users[$targetUsername]['password_changed_by'] = $_SESSION['username'];
        
        // Save users
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
        
        echo json_encode([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error changing password: ' . $e->getMessage()
        ]);
    }
}

/**
 * Generate a random secure password
 */
function generatePassword() {
    $length = 12;
    $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    $password = '';
    
    for ($i = 0; $i < $length; $i++) {
        $password .= $characters[random_int(0, strlen($characters) - 1)];
    }
    
    echo json_encode([
        'success' => true,
        'password' => $password
    ]);
}
?>
