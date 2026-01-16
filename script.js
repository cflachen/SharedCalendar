// Global variables
let currentDate = new Date();
let selectedDate = null;
let events = {};
let syncStatus = 'synced'; // 'synced', 'syncing', 'offline', 'pending'
let pendingSync = false;
let currentUsername = null;
let currentUserFullName = null;

// Initialize calendar on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    setupOfflineDetection();
});

// Check authentication
async function checkAuthentication() {
    try {
        const response = await fetch('auth.php?action=current', {
            credentials: 'include'
        });
        const text = await response.text();
        const data = JSON.parse(text);
        
        if (!data.success) {
            window.location.href = 'login.html?redirect=index.html';
            return;
        }
        
        // Display user info
        document.getElementById('userDisplay').textContent = `👤 ${data.user.full_name}`;
        currentUsername = data.user.username;
        currentUserFullName = data.user.full_name;
        
        // Show admin button if user is admin
        if (data.user.is_admin) {
            document.getElementById('adminBtn').style.display = 'inline-block';
        }
        
        // Load calendar title
        await loadCalendarTitle();
        
        // Now that DOM is ready, setup listeners
        setupEventListeners();
        
        // Load calendar
        loadEvents();
        renderCalendar();
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'login.html';
    }
}

// Load calendar title from settings
async function loadCalendarTitle() {
    try {
        const response = await fetch('settings.php?action=getTitle', {
            credentials: 'include'
        });
        const text = await response.text();
        const data = JSON.parse(text);
        const titleElement = document.getElementById('calendarTitle');
        if (titleElement && data.calendar_title) {
            titleElement.textContent = data.calendar_title;
        }
    } catch (error) {
        console.error('Error loading calendar title:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Only set up calendar listeners if we're on the calendar page
    const prevMonth = document.getElementById('prevMonth');
    if (prevMonth) {
        prevMonth.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }

    const nextMonth = document.getElementById('nextMonth');
    if (nextMonth) {
        nextMonth.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('auth.php?action=logout', {
                    credentials: 'include'
                });
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = 'login.html';
            }
        });
    }
    
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            window.location.href = 'admin.html';
        });
    }

    // Sync status click handler
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.addEventListener('click', () => {
            if (syncStatus === 'pending' || syncStatus === 'offline') {
                loadEvents();
            }
        });
    }

    // Modal controls
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    const entryForm = document.getElementById('entryForm');
    if (entryForm) {
        entryForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        if (modal && e.target === modal) {
            closeModal();
        }
    });
}

// Render the calendar
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = 
        `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Add day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });

    // Get first day of month and number of days
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const prevLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    
    const firstDayIndex = firstDay.getDay();
    const numberOfDays = lastDay.getDate();
    const prevNumberOfDays = prevLastDay.getDate();

    // Add previous month's trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const day = prevNumberOfDays - i;
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, day);
        createDayElement(day, date, true);
    }

    // Add current month's days
    for (let day = 1; day <= numberOfDays; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        createDayElement(day, date, false);
    }

    // Add next month's leading days
    const totalCells = calendar.children.length - 7; // Subtract header cells
    const remainingCells = (Math.ceil(totalCells / 7) * 7) - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
        createDayElement(day, date, true);
    }
}

// Create a day element
function createDayElement(day, date, isOtherMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }
    
    // Check if it's today
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        dayElement.classList.add('today');
    }
    
    // Day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);
    
    // Entries for this day
    const dateKey = formatDate(date);
    const dayEvents = events[dateKey] || [];
    
    if (dayEvents.length > 0) {
        const entriesContainer = document.createElement('div');
        entriesContainer.className = 'day-entries';
        
        // Show first 2 entries
        dayEvents.slice(0, 2).forEach(event => {
            const entryPreview = document.createElement('div');
            entryPreview.className = 'entry-preview';
            entryPreview.textContent = event.title;
            entriesContainer.appendChild(entryPreview);
        });
        
        dayElement.appendChild(entriesContainer);
        
        // Show count if more than 2
        if (dayEvents.length > 2) {
            const entryCount = document.createElement('div');
            entryCount.className = 'entry-count';
            entryCount.textContent = dayEvents.length;
            dayElement.appendChild(entryCount);
        }
    }
    
    // Click handler
    dayElement.addEventListener('click', () => openDayModal(date));
    
    document.getElementById('calendar').appendChild(dayElement);
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display
function formatDateDisplay(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Open modal for a specific day
function openDayModal(date) {
    selectedDate = date;
    const modal = document.getElementById('modal');
    const dateKey = formatDate(date);
    
    document.getElementById('modalTitle').textContent = 'Entries for ' + formatDateDisplay(date);
    document.getElementById('modalDate').textContent = '';
    
    // Reset form
    document.getElementById('entryForm').reset();
    
    // Display existing entries
    displayEntries(dateKey);
    
    modal.style.display = 'block';
}

// Display entries for a date
function displayEntries(dateKey) {
    const entriesList = document.getElementById('entriesList');
    const dayEvents = events[dateKey] || [];
    
    if (dayEvents.length === 0) {
        entriesList.innerHTML = '<p style="color: #999; text-align: center; margin-top: 20px;">No entries yet. Add one above!</p>';
        return;
    }
    
    entriesList.innerHTML = '<h3 style="margin-top: 20px; margin-bottom: 15px; color: #667eea;">Existing Entries:</h3>';
    
    dayEvents.forEach((event, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry-item';
        
        entryDiv.innerHTML = `
            <h4>${escapeHtml(event.title)}</h4>
            ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
            <div class="entry-meta">
                Added by ${escapeHtml(event.author)} on ${new Date(event.timestamp).toLocaleString()}
            </div>
            <div class="entry-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteEntry('${dateKey}', ${index})">Delete</button>
            </div>
        `;
        
        entriesList.appendChild(entryDiv);
    });
}

// Close modal
function closeModal() {
    document.getElementById('modal').style.display = 'none';
    selectedDate = null;
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!selectedDate) return;
    
    const title = document.getElementById('entryTitle').value;
    const description = document.getElementById('entryDescription').value;
    
    const entry = {
        title: title,
        description: description,
        author: currentUserFullName,
        timestamp: new Date().toISOString()
    };
    
    const dateKey = formatDate(selectedDate);
    
    console.log('Adding entry:', { dateKey, entry });
    
    if (!events[dateKey]) {
        events[dateKey] = [];
    }
    
    events[dateKey].push(entry);
    
    console.log('Events after adding:', events);
    
    // Save to server
    saveEvents();
    
    // Reset form
    document.getElementById('entryForm').reset();
    
    // Update display
    displayEntries(dateKey);
    renderCalendar();
}

// Delete an entry
function deleteEntry(dateKey, index) {
    if (!confirm('Are you sure you want to delete this entry?')) {
        return;
    }
    
    if (!events[dateKey] || !events[dateKey][index]) {
        console.error('Entry not found to delete');
        alert('Entry not found');
        return;
    }
    
    console.log('Deleting entry:', { dateKey, index, entry: events[dateKey][index] });
    
    events[dateKey].splice(index, 1);
    
    if (events[dateKey].length === 0) {
        delete events[dateKey];
    }
    
    console.log('Events after deletion:', events);
    
    saveEvents();
    displayEntries(dateKey);
    renderCalendar();
}

// Load events from server and merge with offline data
async function loadEvents() {
    try {
        updateSyncStatus('syncing');
        
        const response = await fetch('api.php?action=get', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('Raw server response:', text);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Response text:', text.substring(0, 200));
            updateSyncStatus('offline');
            const localEvents = getLocalEvents();
            events = localEvents;
            renderCalendar();
            return;
        }
        
        if (data.success) {
            const serverEvents = data.events || {};
            const localEvents = getLocalEvents();
            
            // Merge events: combine all entries, avoiding duplicates by timestamp
            events = mergeEvents(serverEvents, localEvents);
            
            // Save merged events back locally
            saveLocalEvents(events);
            
            // Sync merged data back to server
            if (!isEqual(serverEvents, events)) {
                await syncToServer(events);
            }
            
            updateSyncStatus('synced');
            renderCalendar();
        }
    } catch (error) {
        console.error('Error loading events:', error);
        updateSyncStatus('offline');
        
        // Load from local storage
        const localEvents = getLocalEvents();
        events = localEvents;
        renderCalendar();
    }
}

// Get events from localStorage
function getLocalEvents() {
    try {
        const stored = localStorage.getItem('calendarEvents');
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Error reading local storage:', error);
        return {};
    }
}

// Save events to localStorage
function saveLocalEvents(data) {
    try {
        localStorage.setItem('calendarEvents', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

// Merge online and offline events - combine all entries
function mergeEvents(serverEvents, localEvents) {
    const merged = {};
    const allDates = new Set([...Object.keys(serverEvents), ...Object.keys(localEvents)]);
    
    for (const date of allDates) {
        const serverEntries = serverEvents[date] || [];
        const localEntries = localEvents[date] || [];
        
        // Combine entries, removing duplicates by timestamp
        const timestampMap = new Map();
        
        // Add server entries
        serverEntries.forEach(entry => {
            const key = entry.timestamp || JSON.stringify(entry);
            timestampMap.set(key, entry);
        });
        
        // Add local entries (overwrite if same timestamp, otherwise add)
        localEntries.forEach(entry => {
            const key = entry.timestamp || JSON.stringify(entry);
            timestampMap.set(key, entry);
        });
        
        merged[date] = Array.from(timestampMap.values());
    }
    
    return merged;
}

// Check if two event objects are equal
function isEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// Save events locally first, then sync to server
async function saveEvents() {
    // Always save locally first
    saveLocalEvents(events);
    
    // Try to sync to server
    await syncToServer(events);
}

// Sync events to server
async function syncToServer(data) {
    try {
        updateSyncStatus('syncing');
        console.log('Syncing data to server:', data);
        
        const response = await fetch('api.php?action=save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ events: data })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('Raw sync response:', text);
        
        let result;
        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Response text:', text.substring(0, 200));
            updateSyncStatus('pending');
            pendingSync = true;
            return;
        }
        
        console.log('Parsed sync response:', result);
        
        if (result.success) {
            updateSyncStatus('synced');
            pendingSync = false;
        } else {
            console.error('Error syncing events:', result.message);
            updateSyncStatus('pending');
            pendingSync = true;
        }
    } catch (error) {
        console.error('Error syncing events:', error);
        updateSyncStatus('pending');
        pendingSync = true;
    }
}

// Update sync status indicator
function updateSyncStatus(status) {
    syncStatus = status;
    const statusEl = document.getElementById('syncStatus');
    if (!statusEl) return;
    
    statusEl.className = `sync-status status-${status}`;
    
    switch(status) {
        case 'synced':
            statusEl.textContent = '✓ Synced';
            statusEl.title = 'All changes synced';
            break;
        case 'syncing':
            statusEl.textContent = '⟳ Syncing...';
            statusEl.title = 'Syncing with server';
            break;
        case 'offline':
            statusEl.textContent = '⊗ Offline';
            statusEl.title = 'Offline - changes saved locally';
            break;
        case 'pending':
            statusEl.textContent = '⏱ Pending';
            statusEl.title = 'Waiting to sync - click to retry';
            break;
    }
}

// Setup offline detection
function setupOfflineDetection() {
    window.addEventListener('online', () => {
        console.log('Back online - syncing...');
        updateSyncStatus('syncing');
        loadEvents();
    });
    
    window.addEventListener('offline', () => {
        console.log('Going offline');
        updateSyncStatus('offline');
    });
    
    // Check if currently offline
    if (!navigator.onLine) {
        updateSyncStatus('offline');
    }
    
    // Setup auto-refresh polling - check for updates every 10 seconds
    setupAutoRefresh();
}

// Global polling interval ID
let pollInterval = null;

// Auto-refresh calendar data from server
function setupAutoRefresh() {
    // Clear any existing interval to prevent duplicates
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
        // Skip polling if: offline, syncing, or pending sync
        if (!navigator.onLine || syncStatus === 'syncing' || pendingSync) {
            return;
        }
        
        try {
            const response = await fetch('api.php?action=get', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.error('Poll response not ok:', response.status);
                return;
            }
            
            const text = await response.text();
            let serverData;
            
            try {
                serverData = JSON.parse(text);
            } catch (parseError) {
                console.error('Poll parse error:', parseError);
                return;
            }
            
            // Deep comparison of objects
            const serverEvents = serverData.events || {};
            const hasChanges = !isDeepEqual(events, serverEvents);
            
            if (hasChanges) {
                console.log('📡 Server data changed detected, updating calendar...');
                console.log('Old local events count:', Object.keys(events).length);
                console.log('New server events count:', Object.keys(serverEvents).length);
                
                events = serverEvents;
                updateSyncStatus('synced');
                renderCalendar();
                if (selectedDate) {
                    displayEntries(formatDate(selectedDate));
                }
            }
        } catch (error) {
            console.error('Poll error:', error);
        }
    }, 5000); // Poll every 5 seconds
}

// Deep comparison of two objects
function isDeepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (let key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!isDeepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
