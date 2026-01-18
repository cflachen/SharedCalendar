# Shared Web Calendar

A simple, collaborative web calendar where multiple users can add and edit entries for each day. Includes user authentication and admin panel for user management.

## Features

- 📅 Clean, interactive monthly calendar view with year/month navigation
- 📋 List view of entries for the current month
- ✏️ Edit and delete entries from both calendar and list views
- 👥 Multi-user support with authentication and real-time synchronization
- 🔐 Secure login system with password hashing
- 🔧 Admin panel for user management (admins now land on calendar like regular users)
- 📱 Fully responsive design with horizontal scrolling support on mobile
- 💾 Simple JSON file storage with atomic operations and file locking
- 🚀 Easy to deploy on any Apache server with PHP
- 🔄 Auto-refresh every 30 seconds to show changes from other users
- << >> Year navigation buttons to jump years quickly
- 🎯 "Today" button to jump to current month in both views
- 🔒 Advanced conflict detection and data integrity protection
- ✨ Automatic focus on title field when creating entries

## Requirements

- Web server with PHP 7.0 or higher (Apache, Nginx, etc.)
- Write permissions for the `data` directory

## Installation

### Option 1: Self-Hosted Apache Server

1. **Upload files to your Apache server:**
   ```
   /var/www/html/calendar/
   ├── index.html
   ├── list.html
   ├── login.html
   ├── admin.html
   ├── styles.css
   ├── script.js
   ├── list.js
   ├── api.php
   ├── auth.php
   ├── users.php
   ├── settings.php
   ├── setup.php                 # ⚠️ TEMPORARY - Delete after first login!
   ├── fixfiles.php              # Optional utility script
   └── data/
       ├── events.json
       ├── users.json
       ├── settings.json
       └── .htaccess
   ```

2. **Set proper permissions:**
   ```bash
   chmod 755 /var/www/html/calendar
   chmod 755 /var/www/html/calendar/data
   chmod 666 /var/www/html/calendar/data/events.json
   chmod 666 /var/www/html/calendar/data/users.json
   chmod 666 /var/www/html/calendar/data/settings.json
   ```

3. **Initialize the application:**
   - Open `http://your-domain.com/calendar/setup.php` in your browser
   - Follow the setup wizard to create the admin account
   - **CRITICAL:** After successful setup, delete `setup.php` from your server immediately for security

4. **First login:**
   - Open `http://your-domain.com/calendar/login.html`
   - Login with the admin credentials you created in setup
   - Change the admin password if desired

### Option 2: Free Hosting Platforms

#### InfinityFree (Recommended - 100% Free)
1. Sign up at https://infinityfree.net
2. Create a new account
3. Upload all files via File Manager or FTP
4. Make sure the `data` directory has write permissions
5. Access via your free subdomain (e.g., `yourname.infinityfreeapp.com`)

#### 000webhost
1. Sign up at https://www.000webhost.com
2. Create a new website
3. Upload files to `public_html` directory
4. Set permissions for `data` directory
5. Access via your free subdomain

#### Awardspace
1. Sign up at https://www.awardspace.com
2. Upload files via File Manager
3. Ensure `data` directory is writable
4. Access via your free domain

## Configuration

### Critical Security: setup.php and fixfiles.php

**setup.php** - ⚠️ MUST BE DELETED AFTER SETUP
- Used only for initial application setup (creating first admin account)
- Allows anyone to access it if left on the server
- **DELETE IMMEDIATELY after first successful login**
- If accidentally left on server, anyone can reset admin credentials
- If deleted and you need to recover, see recovery procedure below

**fixfiles.php** - Optional Recovery Utility
- Can repair file permissions if needed
- Can reset admin credentials if setup.php was already deleted
- Should also be removed after troubleshooting

**Recovery Procedure:**
If you've lost access and deleted setup.php, upload fixfiles.php and access it at `http://your-domain.com/calendar/fixfiles.php` to reset admin credentials. Then delete fixfiles.php.

### Security Considerations

For production use, consider adding:

1. **HTTPS** - Use SSL/TLS encryption for production deployment
2. **Regular backups** - Regularly backup both `events.json` and `users.json` files
3. **File permissions** - Ensure data directory is not publicly accessible (use .htaccess)
4. **Update PHP** - Ensure your server runs the latest PHP version
5. **Strong passwords** - Use the password generator when creating accounts

## User Management

### Admin Account Setup

The initial admin account is created during setup.php. After setup:
- Delete `setup.php` from your server immediately
- Store the admin password securely
- If needed later, use `fixfiles.php` to reset credentials

### Managing Users (Admin Only)

1. **Login as admin** and navigate to the Admin Panel
2. **Add User:**
   - Enter username (3-20 characters, letters/numbers/underscore)
   - Enter full name
   - Either type a password or click "Generate" for a secure random password
   - Check "Administrator privileges" to make them an admin
   - Click "Add User"
   - **Save the generated password** - it won't be shown again!

3. **Change Password:**
   - Select user from dropdown
   - Enter new password or generate one
   - Click "Change Password"

4. **Delete User:**
   - Find user in the user list
   - Click "Delete" button
   - Confirm deletion
   - Note: You cannot delete your own account

### Password Requirements

- Minimum 6 characters
- Mix of letters, numbers, and special characters recommended
- Use the password generator for strong passwords

### User Roles

- **Admin:** Can manage users, access admin panel, and use calendar
- **User:** Can only use calendar (add/edit/delete entries)

### Customize Appearance

Edit [styles.css](styles.css) to change colors, fonts, and layout:
- Main colors are defined with gradient: `#667eea` and `#764ba2`
- Change calendar grid size by adjusting `.calendar-day min-height`

## File Structure

```
calendar/
├── index.html          # Main calendar interface (requires login)
├── list.html           # List view of entries (requires login)
├── login.html          # User login page
├── admin.html          # Admin panel for user management
├── styles.css          # All styling and responsive design
├── script.js           # Calendar frontend (calendar logic, UI, atomic saves)
├── list.js             # List view frontend (list logic, delete operations)
├── api.php             # Backend API (calendar data, locking mechanism)
├── auth.php            # Authentication system (login/logout/sessions)
├── users.php           # User management API (add/delete/change passwords)
├── settings.php        # Settings API (calendar title)
├── setup.php           # ⚠️ TEMPORARY - Initial setup wizard (DELETE after first login!)
├── fixfiles.php        # Optional recovery utility (delete after use)
├── data/               # Data storage directory
│   ├── events.json     # JSON file storing all calendar entries
│   ├── users.json      # JSON file storing user accounts
│   ├── settings.json   # JSON file storing app settings
│   ├── calendar.lock   # Temporary lock file for atomic operations
│   └── .htaccess       # Security configuration for data directory
└── README.md           # This file
```

## Usage

### Logging In

1. Navigate to `login.html`
2. Enter your username and password
3. Click "Login"
4. You'll be redirected to the calendar view (both admins and regular users)

### Calendar Navigation

1. **Month Navigation:** Click `<` and `>` buttons to move between months
2. **Year Navigation:** Click `<<` and `>>` buttons to move between years
3. **Jump to Today:** Click the "Today" button to return to the current month
4. **Switch Views:** Click "List View" to see all entries for the current month, or "Calendar View" to see the calendar
   - When switching views, the current month/year is preserved

### Adding an Entry

1. Click on any day in the calendar
2. The "Title" field will automatically receive focus
3. Fill out the form:
   - **Title**: Brief description of the event (required)
   - **Start Date**: First day of the event (default is selected day)
   - **End Date**: Last day of the event (can be multi-day)
   - **Description**: Optional detailed information
4. Click "Add" to save
5. The calendar updates immediately

### Editing an Entry

**From Calendar View:**
1. Click on the day with the entry
2. Click the "Edit" button on the entry
3. Modify the details
4. Click "Update" to save

**From List View:**
1. Find the entry in the list
2. Click the "Edit" button
3. You'll be taken to the calendar view with the entry open for editing
4. Make changes and click "Update"

### Viewing Entries

**Calendar View:**
- Days with entries show colored preview badges
- Number badge shows total entries if more than 4
- Click on a day to see all entries for that day and any overlapping entries

**List View:**
- Shows all entries for the current month
- Displays entry dates, description, author, and timestamp
- Includes Edit and Delete buttons for each entry

### Deleting an Entry

**From Calendar View:**
1. Click on the day with the entry
2. Find the entry in the list
3. Click the "Delete" button
4. Confirm the deletion

**From List View:**
1. Find the entry in the list
2. Click the "Delete" button
3. Confirm the deletion

### Multi-User Collaboration

- Changes from other users appear automatically every 30 seconds
- Open the add/edit modal to see the latest entries immediately
- When editing a deleted entry, your changes will restore it
- Edit/delete operations use atomic locking to prevent data corruption

## Troubleshooting

### Entries not saving

1. Check that the `data` directory exists and is writable:
   ```bash
   chmod 755 data
   chmod 666 data/events.json
   chmod 666 data/users.json
   ```

2. Verify PHP is working by accessing `api.php?action=get` directly

3. Check browser console for JavaScript errors

### Cannot login / Authentication errors

1. Verify `users.json` file exists and contains the admin account
2. Check PHP session support is enabled
3. Clear browser cookies and try again
4. Check file permissions on `data/users.json`

### Permission denied errors

Run these commands on your server:
```bash
chown -R www-data:www-data /path/to/calendar/data
chmod 755 /path/to/calendar/data
chmod 666 /path/to/calendar/data/events.json
chmod 666 /path/to/calendar/data/users.json
```

### Changes not visible to other users

- Make sure all users are accessing the same URL
- Clear browser cache
- Verify the `events.json` file is being updated

## Technical Details

### Data Format

Events are stored in `data/events.json` as a JSON object with entries array:
```json
{
  "entries": [
    {
      "id": 1705329234000123,
      "title": "Team Meeting",
      "description": "Discuss Q1 goals",
      "author": "John Doe",
      "startDate": "2026-01-15",
      "endDate": "2026-01-15",
      "timestamp": "2026-01-15T10:30:00.000Z"
    },
    {
      "id": 1705329234001234,
      "title": "Conference",
      "description": "Annual company conference",
      "author": "Jane Smith",
      "startDate": "2026-01-20",
      "endDate": "2026-01-22",
      "timestamp": "2026-01-18T14:22:15.000Z"
    }
  ]
}
```

**Entry Fields:**
- `id`: Unique identifier (timestamp + random + counter, prevents collisions)
- `title`: Event title (required)
- `description`: Optional detailed information
- `author`: User who created the entry (auto-filled)
- `startDate`: First day in YYYY-MM-DD format
- `endDate`: Last day in YYYY-MM-DD format (can be same as startDate)
- `timestamp`: ISO 8601 timestamp of when entry was created/modified

Users are stored in `data/users.json`:
```json
{
  "admin": {
    "password_hash": "$2y$10$...",
    "full_name": "Administrator",
    "is_admin": true,
    "created_at": "2026-01-15 00:00:00"
  }
}
```

### API Endpoints

**Authentication (auth.php)**
- `GET auth.php?action=login` - User login
- `GET auth.php?action=logout` - User logout
- `GET auth.php?action=current` - Get current user info
- `GET auth.php?action=check` - Check authentication status

**User Management (users.php)** - Admin only
- `GET users.php?action=list` - List all users
- `POST users.php?action=add` - Add new user
- `POST users.php?action=delete` - Delete user
- `POST users.php?action=change_password` - Change password
- `GET users.php?action=generate_password` - Generate random password

**Calendar (api.php)** - Requires authentication
- `GET api.php?action=get` - Returns all events as JSON
- `POST api.php?action=save` - Saves events (expects JSON body with `events` array)
- `GET api.php?action=acquireLock` - Acquire atomic operation lock
- `GET api.php?action=releaseLock` - Release atomic operation lock
- `GET api.php?action=checkLock` - Check current lock status

**Settings (settings.php)** - Requires authentication
- `GET settings.php?action=getTitle` - Get calendar title
- `POST settings.php?action=setTitle` - Set calendar title (admin only)

### Important Security Files

**setup.php** - ⚠️ CRITICAL SECURITY NOTICE
- Used only for initial application setup
- Allows creating the admin account without needing default credentials
- **MUST be deleted immediately after first successful login**
- If left on the server, anyone can reset the admin password
- To recover if accidentally deleted, use `fixfiles.php` to reset admin credentials

**fixfiles.php** - Optional Utility Script
- Used to repair file permissions if needed
- Can reset admin credentials if setup.php was deleted
- Also typically removed after troubleshooting



**Atomic Operations with File Locking:**
- Every save/delete operation acquires a lock before modifying data
- Stale locks (>10 seconds old) are automatically taken over
- Operations load fresh server data before applying changes to prevent conflicts

**Edit Behavior:**
- If editing an entry that was deleted by another user, the entry is restored with your edits
- Last-edit-wins: If two users edit the same entry, the most recent save wins

**Delete Behavior:**
- If deleting an entry already deleted by another user, the operation succeeds silently
- No alert shown - the desired outcome (entry deleted) is achieved

**Data Integrity:**
- Server is always the source of truth
- localStorage is used as cache but never resurrects deleted data
- All operations are atomic - no partial saves possible

**Auto-Refresh:**
- Client checks for updates every 30 seconds
- Opening the add/edit modal loads fresh data immediately
- Changes from other users appear automatically when modal is opened



Works on all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Free to use and modify for personal and commercial projects.

## Support

For issues or questions, check the troubleshooting section above or review the code comments in each file.

## Backup Recommendation

Set up a cron job to backup your data regularly:
```bash
# Add to crontab - backs up both events and users daily at 2 AM
0 2 * * * cp /var/www/html/calendar/data/events.json /var/backups/calendar-events-$(date +\%Y\%m\%d).json
0 2 * * * cp /var/www/html/calendar/data/users.json /var/backups/calendar-users-$(date +\%Y\%m\%d).json
```

## Security Best Practices

1. **Change default admin password immediately**
2. **Use HTTPS** in production (get free SSL from Let's Encrypt)
3. **Regular backups** of both events.json and users.json
4. **Strong passwords** - use the password generator
5. **Limit admin accounts** - only give admin access to trusted users
6. **Monitor access** - check server logs regularly
7. **Keep PHP updated** - ensure your server runs latest PHP version

Enjoy your collaborative calendar! 📅
