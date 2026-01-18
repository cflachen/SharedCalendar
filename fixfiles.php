<?php
/**
 * File Permissions Fixer
 * Fixes file permissions for events.json and data directory
 * 
 * IMPORTANT: Delete this file after use!
 */

$dataDir = __DIR__ . '/data';
$eventsFile = $dataDir . '/events.json';
$usersFile = $dataDir . '/users.json';

$messages = [];
$success = true;

// Ensure data directory exists
if (!file_exists($dataDir)) {
    if (mkdir($dataDir, 0777, true)) {
        $messages[] = '✓ Data directory created';
    } else {
        $messages[] = '✗ Failed to create data directory';
        $success = false;
    }
} else {
    $messages[] = '✓ Data directory exists';
}

// Fix data directory permissions
if (@chmod($dataDir, 0777)) {
    $messages[] = '✓ Data directory permissions set to 777';
} else {
    $messages[] = '⚠ Could not change data directory permissions (may not be needed)';
}

// Create/fix events.json
if (!file_exists($eventsFile)) {
    if (file_put_contents($eventsFile, json_encode([], JSON_PRETTY_PRINT))) {
        $messages[] = '✓ events.json created';
    } else {
        $messages[] = '✗ Failed to create events.json';
        $success = false;
    }
} else {
    $messages[] = '✓ events.json exists';
}

// Fix events.json permissions
if (file_exists($eventsFile)) {
    if (@chmod($eventsFile, 0666)) {
        $messages[] = '✓ events.json permissions set to 666';
    } else {
        $messages[] = '⚠ Could not change events.json permissions (may not be needed)';
    }
}

// Fix users.json permissions if it exists
if (file_exists($usersFile)) {
    if (@chmod($usersFile, 0666)) {
        $messages[] = '✓ users.json permissions set to 666';
    }
}

// Test write capability
if (file_exists($eventsFile)) {
    $testData = ['test' => 'value'];
    if (file_put_contents($eventsFile, json_encode($testData, JSON_PRETTY_PRINT))) {
        // Restore empty file
        file_put_contents($eventsFile, json_encode([], JSON_PRETTY_PRINT));
        $messages[] = '✓ Write test successful - events.json is writable!';
    } else {
        $messages[] = '✗ Write test failed - events.json is not writable';
        $success = false;
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendar - File Fixer</title>
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
        .fixer-container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 40px;
            width: 100%;
            max-width: 500px;
        }
        h1 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 1.8em;
        }
        .subtitle {
            color: #666;
            margin-bottom: 20px;
            font-size: 0.9em;
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
        .messages {
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            font-family: monospace;
            font-size: 0.95em;
            line-height: 1.8;
        }
        .message {
            color: #333;
            margin-bottom: 8px;
        }
        .message:last-child {
            margin-bottom: 0;
        }
        .status {
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-weight: bold;
            text-align: center;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .actions {
            display: flex;
            gap: 10px;
        }
        button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 5px;
            font-size: 1em;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5568d3;
        }
        .btn-secondary {
            background: #ddd;
            color: #333;
        }
        .btn-secondary:hover {
            background: #ccc;
        }
    </style>
</head>
<body>
    <div class="fixer-container">
        <h1>🔧 File Permissions Fixer</h1>
        <p class="subtitle">Configures file permissions for the calendar</p>
        
        <div class="warning">
            <strong>⚠️ IMPORTANT:</strong> Delete this file (fixfiles.php) after fixing the permissions!
        </div>
        
        <div class="status <?php echo $success ? 'success' : 'error'; ?>">
            <?php echo $success ? '✓ All checks passed!' : '✗ Some issues found'; ?>
        </div>
        
        <div class="messages">
            <?php foreach ($messages as $msg): ?>
                <div class="message"><?php echo htmlspecialchars($msg); ?></div>
            <?php endforeach; ?>
        </div>
        
        <?php if ($success): ?>
            <p style="margin-bottom: 20px; color: #155724; background: #e8f5e9; padding: 12px; border-radius: 5px;">
                All files and permissions are set correctly! You can now:
                <br><strong>1.</strong> Go to <a href="login.html" style="color: #0066cc;">login.html</a>
                <br><strong>2.</strong> Add calendar entries - they should now save!
                <br><strong>3.</strong> <strong>Delete this file (fixfiles.php)</strong>
            </p>
        <?php else: ?>
            <p style="margin-bottom: 20px; color: #721c24; background: #ffe0e0; padding: 12px; border-radius: 5px;">
                Some issues were found. Please:
                <br><strong>1.</strong> Contact your hosting provider about file permissions
                <br><strong>2.</strong> Ask them to make the /data directory writable (chmod 777)
                <br><strong>3.</strong> Or try uploading events.json manually with proper permissions
            </p>
        <?php endif; ?>
        
        <div class="actions">
            <button class="btn-primary" onclick="location.href='login.html'">Go to Calendar</button>
            <button class="btn-secondary" onclick="location.reload()">Refresh Test</button>
        </div>
    </div>
</body>
</html>
