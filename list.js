// Global variables
let currentDate = new Date();
let events = {};
let currentUsername = null;
let currentUserFullName = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
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
            window.location.href = 'login.html?redirect=list.html';
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
        window.location.href = 'login.html?redirect=list.html';
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
    // Navigation buttons
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
    
    // Calendar view button
    document.getElementById('calendarBtn').addEventListener('click', function() {
        window.location.href = 'index.html';
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

// Render the event list
function renderList() {
    const container = document.getElementById('eventListContent');
    const allEntries = events.entries || [];
    
    // Filter entries that overlap with current month
    const monthEntries = allEntries.filter(entry => entryOverlapsMonth(entry));
    
    // Sort by start date
    monthEntries.sort((a, b) => a.startDate.localeCompare(b.startDate));
    
    if (monthEntries.length === 0) {
        container.innerHTML = '<div class="no-events">No events this month</div>';
        return;
    }
    
    let html = '<div class="event-list">';
    
    monthEntries.forEach(entry => {
        const isMultiDay = entry.startDate !== entry.endDate;
        
        html += `
            <div class="event-list-item">
                <div class="event-list-title">${escapeHtml(entry.title)}</div>
                <div class="event-list-dates">
                    <span class="date-label">Start:</span> ${formatDateDisplay(entry.startDate)}
                    ${isMultiDay ? `<br><span class="date-label">End:</span> ${formatDateDisplay(entry.endDate)}` : ''}
                </div>
                ${entry.description ? `<div class="event-list-description">${escapeHtml(entry.description)}</div>` : ''}
                <div class="event-list-author">Added by: ${escapeHtml(entry.author || 'Unknown')}</div>
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
                console.log('📡 Server data changed, updating list...');
                events = serverEvents;
                renderList();
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 30000); // Poll every 30 seconds
}
