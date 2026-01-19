// Global variables
let currentDate = new Date();
let events = {};
let currentUsername = null;
let currentUserFullName = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load saved date from URL parameter if present
    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');
    const month = urlParams.get('month');
    if (year && month) {
        currentDate = new Date(parseInt(year), parseInt(month), 1);
    }
    
    checkAuthentication();
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
            window.location.href = 'login.html?redirect=list.php';
            return;
        }
        
        // Display user info
        document.getElementById('userDisplay').textContent = `👤 ${data.user.full_name}`;
        currentUsername = data.user.username;
        currentUserFullName = data.user.full_name;
        
        // Load calendar title
        await loadCalendarTitle();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load events and render list
        await loadEvents();
        renderList();
        
        // Start auto-refresh polling
        setupAutoRefresh();
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html?redirect=list.php';
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
        if (data.calendar_title) {
            document.getElementById('calendarTitle').textContent = data.calendar_title;
            document.title = `Event List - ${data.calendar_title}`;
        }
    } catch (error) {
        console.error('Failed to load calendar title:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Year navigation buttons
    document.getElementById('prevYear').addEventListener('click', function() {
        currentDate.setFullYear(currentDate.getFullYear() - 1);
        updateMonthDisplay();
        renderList();
    });
    
    document.getElementById('nextYear').addEventListener('click', function() {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        updateMonthDisplay();
        renderList();
    });
    
    // Month navigation buttons
    document.getElementById('prevMonth').addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateMonthDisplay();
        renderList();
    });
    
    document.getElementById('nextMonth').addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateMonthDisplay();
        renderList();
    });
    
    // Today button
    document.getElementById('todayBtn').addEventListener('click', function() {
        currentDate = new Date();
        updateMonthDisplay();
        renderList();
    });
    
    // Calendar view button
    document.getElementById('calendarBtn').addEventListener('click', function() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        window.location.href = `index.php?year=${year}&month=${month}`;
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async function() {
        try {
            await fetch('auth.php?action=logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        window.location.href = 'login.html';
    });
    
    // Initial month display
    updateMonthDisplay();
}

// Update month display
function updateMonthDisplay() {
    const options = { year: 'numeric', month: 'long' };
    document.getElementById('currentMonth').textContent = currentDate.toLocaleDateString('en-US', options);
}

// Load events from server
async function loadEvents() {
    try {
        const response = await fetch('api.php?action=get', {
            credentials: 'include'
        });
        const text = await response.text();
        
        // Handle empty response
        if (!text || text.trim() === '') {
            events = { entries: [] };
            return;
        }
        
        const data = JSON.parse(text);
        
        if (data.success && data.events) {
            events = data.events;
        } else {
            events = { entries: [] };
        }
        
        // Ensure entries array exists
        if (!events.entries) {
            events.entries = [];
        }
    } catch (error) {
        console.error('Error loading events:', error);
        events = { entries: [] };
    }
}

// Format date for display
function formatDateDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Check if an entry overlaps with the current month
function entryOverlapsMonth(entry) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month
    const monthStart = new Date(year, month, 1);
    const monthStartStr = formatDate(monthStart);
    
    // Last day of month
    const monthEnd = new Date(year, month + 1, 0);
    const monthEndStr = formatDate(monthEnd);
    
    // Check if entry overlaps with month
    return entry.startDate <= monthEndStr && entry.endDate >= monthStartStr;
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Check if a date string represents an annual event (year is 0000)
function isAnnualEvent(dateString) {
    return dateString && dateString.startsWith('0000-');
}

// Convert annual date (0000-MM-DD) to a specific year (YYYY-MM-DD)
// If no year provided, uses current year
function annualDateToYear(dateString, year) {
    if (!isAnnualEvent(dateString)) {
        return dateString;
    }
    const targetYear = year || new Date().getFullYear();
    return dateString.replace(/^0000/, targetYear.toString());
}

// Convert annual date (0000-MM-DD) to current year date (YYYY-MM-DD)
function annualDateToCurrentYear(dateString) {
    return annualDateToYear(dateString, new Date().getFullYear());
}

// Check if an entry overlaps with the current month (handles annual events)
function entryOverlapsMonthWithAnnual(entry) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month
    const monthStart = new Date(year, month, 1);
    const monthStartStr = formatDate(monthStart);
    
    // Last day of month
    const monthEnd = new Date(year, month + 1, 0);
    const monthEndStr = formatDate(monthEnd);
    
    // Convert annual dates to the current viewing year for comparison
    let entryStart = entry.startDate;
    let entryEnd = entry.endDate;
    
    if (isAnnualEvent(entryStart)) {
        entryStart = annualDateToYear(entryStart, year);
    }
    if (isAnnualEvent(entryEnd)) {
        entryEnd = annualDateToYear(entryEnd, year);
    }
    
    // Handle year-crossing dates (defensive check in case of manual JSON edits)
    // If end < start in the same year, this is invalid - skip it
    if (entryStart > entryEnd) {
        console.warn('Invalid event date range: ' + entry.startDate + ' to ' + entry.endDate);
        return false;
    }
    
    // Check if entry overlaps with month
    return entryStart <= monthEndStr && entryEnd >= monthStartStr;
}

// Render the event list
function renderList() {
    const container = document.getElementById('eventListContent');
    const allEntries = events.entries || [];
    
    // Filter entries that overlap with current month
    const monthEntries = allEntries.filter(entry => entryOverlapsMonthWithAnnual(entry));
    
    // Sort by start date (using the current viewing year for annual events)
    const year = currentDate.getFullYear();
    monthEntries.sort((a, b) => {
        const aStart = isAnnualEvent(a.startDate) ? annualDateToYear(a.startDate, year) : a.startDate;
        const bStart = isAnnualEvent(b.startDate) ? annualDateToYear(b.startDate, year) : b.startDate;
        return aStart.localeCompare(bStart);
    });
    
    if (monthEntries.length === 0) {
        container.innerHTML = '<div class="no-events">No events this month</div>';
        return;
    }
    
    let html = '<div class="event-list">';
    
    monthEntries.forEach(entry => {
        // Convert annual dates to the current viewing year for display
        const year = currentDate.getFullYear();
        const displayStartDate = isAnnualEvent(entry.startDate) 
            ? annualDateToYear(entry.startDate, year)
            : entry.startDate;
        const displayEndDate = isAnnualEvent(entry.endDate)
            ? annualDateToYear(entry.endDate, year)
            : entry.endDate;
        
        const isMultiDay = displayStartDate !== displayEndDate;
        const addedDate = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown';
        
        // Add annual badge if applicable
        const annualBadge = isAnnualEvent(entry.startDate)
            ? ' <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; font-weight: bold; margin-left: 8px;">Annual</span>'
            : '';
        
        html += `
            <div class="event-list-item">
                <div class="event-list-title">${escapeHtml(entry.title)}${annualBadge}</div>
                <div class="event-list-dates">
                    <span class="date-label">Start:</span> ${formatDateDisplay(displayStartDate)}
                    ${isMultiDay ? `<br><span class="date-label">End:</span> ${formatDateDisplay(displayEndDate)}` : ''}
                </div>
                ${entry.description ? `<div class="event-list-description">${escapeHtml(entry.description)}</div>` : ''}
                <div class="event-list-author">Added by ${escapeHtml(entry.author || 'Unknown')} on ${addedDate}</div>
                <div class="entry-actions" style="margin-top: 10px;">
                    <button class="btn btn-primary btn-sm" onclick="editEntry(${entry.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteEntry(${entry.id})">Delete</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Edit an entry - redirect to calendar view with edit mode
function editEntry(entryId) {
    // Store the entry ID and current date in URL parameters
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Find the entry to get its start date
    const entry = events.entries.find(e => e.id === entryId);
    if (entry) {
        // For annual events, use the current year's date; otherwise use the entry's date
        let entryDate;
        if (isAnnualEvent(entry.startDate)) {
            const currentYear = new Date().getFullYear();
            const dateStr = annualDateToCurrentYear(entry.startDate);
            entryDate = new Date(dateStr + 'T00:00:00');
        } else {
            entryDate = new Date(entry.startDate + 'T00:00:00');
        }
        
        // Navigate to calendar view on the entry's start date with edit mode
        window.location.href = `index.php?year=${entryDate.getFullYear()}&month=${entryDate.getMonth()}&edit=${entryId}`;
    }
}

// Delete an entry
async function deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry?')) {
        return;
    }
    
    try {
        // Step 1: Acquire lock
        const lockResponse = await fetch('api.php?action=acquireLock', {
            method: 'GET',
            credentials: 'include'
        });
        
        const lockResult = await lockResponse.json();
        
        if (!lockResult.success) {
            alert('Unable to acquire lock. Please try again.');
            return;
        }
        
        // Step 2: Load latest data from server
        const getResponse = await fetch('api.php?action=get', {
            credentials: 'include'
        });
        
        const getData = await getResponse.json();
        
        if (!getData.success) {
            await releaseLock();
            alert('Failed to load latest data.');
            return;
        }
        
        const latestEvents = getData.events || { entries: [] };
        
        if (!latestEvents.entries) {
            latestEvents.entries = [];
        }
        
        // Step 3: Delete the entry from latest data
        const entryIndex = latestEvents.entries.findIndex(e => e.id === entryId);
        
        if (entryIndex === -1) {
            await releaseLock();
            // Entry already deleted by another user
            // Update local cache to match server (without merging, which could resurrect it)
            events = latestEvents;
            try {
                localStorage.setItem('calendarEvents', JSON.stringify(events));
            } catch (e) {
                console.error('Error saving to localStorage:', e);
            }
            renderList();
            // No alert needed - the entry is gone which is what the user wanted
            return;
        }
        
        latestEvents.entries.splice(entryIndex, 1);
        
        // Step 4: Save back to server
        const saveResponse = await fetch('api.php?action=save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ events: latestEvents })
        });
        
        const saveData = await saveResponse.json();
        
        // Step 5: Release lock
        await releaseLock();
        
        if (saveData.success) {
            // Update local data and refresh display
            events = latestEvents;
            // Save to localStorage to keep in sync
            try {
                localStorage.setItem('calendarEvents', JSON.stringify(events));
            } catch (e) {
                console.error('Error saving to localStorage:', e);
            }
            renderList();
        } else {
            alert('Failed to delete entry: ' + (saveData.message || 'Unknown error'));
            await loadEvents();
            renderList();
        }
    } catch (error) {
        console.error('Error deleting entry:', error);
        
        // Try to release lock
        try {
            await releaseLock();
        } catch (releaseError) {
            console.error('Error releasing lock:', releaseError);
        }
        
        alert('Failed to delete entry. Please try again.');
        await loadEvents();
        renderList();
    }
}

// Release lock helper
async function releaseLock() {
    try {
        await fetch('api.php?action=releaseLock', {
            method: 'GET',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error releasing lock:', error);
    }
}

// Global polling interval ID
let pollInterval = null;

// Auto-refresh list data from server every 30 seconds
function setupAutoRefresh() {
    // Clear any existing interval to prevent duplicates
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
        // Skip polling if offline
        if (!navigator.onLine) {
            return;
        }
        
        try {
            const response = await fetch('api.php?action=get', {
                credentials: 'include'
            });
            
            if (!response.ok) {
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
            
            // Get server events
            const serverEvents = serverData.events || {};
            
            // Ensure entries array exists
            if (!serverEvents.entries) {
                serverEvents.entries = [];
            }
            
            // Check if data changed
            const hasChanges = JSON.stringify(events) !== JSON.stringify(serverEvents);
            
            if (hasChanges) {
                events = serverEvents;
                renderList();
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 30000); // Poll every 30 seconds
}
