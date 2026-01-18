<?php
/**
 * Calendar Setup Helper
 * Allows you to create/reset the admin account
 * 
 * IMPORTANT: Delete this file after use for security!
 */

$usersFile = __DIR__ . '/data/users.json';
$dataDir = __DIR__ . '/data';

// Ensure data directory exists
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$message = '';
$success = false;

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? 'admin');
    $password = $_POST['password'] ?? '';
    $fullName = trim($_POST['fullName'] ?? 'Administrator');
    
    if (empty($password) || strlen($password) < 6) {
        $message = 'Password must be at least 6 characters!';
    } else {
        // Create/reset admin user
        $users = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : [];
        
        $users[$username] = [
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'full_name' => $fullName,
            'is_admin' => true,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => 'setup'
        ];
        
        if (file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT))) {
            $success = true;
            $message = "✓ Admin user created successfully!<br>
                       <strong>Username:</strong> $username<br>
                       <strong>Password:</strong> $password<br>
                       <strong>IMPORTANT:</strong> Go to <a href='login.html'>login.html</a> to login, then <strong>delete this setup.php file</strong> for security!";
        } else {
            $message = 'Error writing to users.json - check file permissions!';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendar Setup</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .setup-container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 40px;
            width: 100%;
            max-width: 400px;
        }
        h1 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 1.8em;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 12px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 0.9em;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 1em;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 14px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1.1em;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s;
        }
        button:hover {
            background: #5568d3;
        }
        .message {
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 0.95em;
            line-height: 1.6;
        }
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="setup-container">
        <h1>📅 Calendar Setup</h1>
        
        <div class="warning">
            <strong>⚠️ IMPORTANT:</strong> Delete this setup.php file after using it! It's a security risk to leave it on your server.
        </div>
        
        <?php if ($message): ?>
            <div class="message <?php echo $success ? 'success' : 'error'; ?>">
                <?php echo $message; ?>
            </div>
        <?php endif; ?>
        
        <?php if (!$success): ?>
            <form method="POST">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" value="admin" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Password *</label>
                    <input type="password" id="password" name="password" placeholder="Enter password (min 6 chars)" required minlength="6">
                </div>
                
                <div class="form-group">
                    <label for="fullName">Full Name</label>
                    <input type="text" id="fullName" name="fullName" value="Administrator">
                </div>
                
                <button type="submit">Create Admin Account</button>
            </form>
        <?php else: ?>
            <p style="margin-top: 20px; color: #666; text-align: center;">
                Setup complete! You can now <a href="login.html">login here</a>.
            </p>
        <?php endif; ?>
    </div>
</body>
</html>
