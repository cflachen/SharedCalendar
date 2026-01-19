// Global variables
let currentDate = new Date();
let selectedDate = null;
let events = {};
let syncStatus = 'synced'; // 'synced', 'syncing', 'offline', 'pending'
let pendingSync = false;
let currentUsername = null;
let currentUserFullName = null;
let editingEntryId = null; // For edit mode
let entryIdCounter = 0; // Counter to ensure unique IDs

// Initialize calendar on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load saved date from URL parameter if present
    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');
    const month = urlParams.get('month');
    
    if (year && month) {
        currentDate = new Date(parseInt(year), parseInt(month), 1);
    }
    
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
        await loadEvents();
        renderCalendar();
        
        // Handle edit parameter from URL (from list view)
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        if (editId) {
            const entryId = parseInt(editId);
            const entry = events.entries?.find(e => e.id === entryId);
            if (entry) {
                // Open the modal for the entry's start date
                const entryDate = new Date(entry.startDate + 'T00:00:00');
                openDayModal(entryDate);
                // Small delay to ensure modal is open, then trigger edit
                setTimeout(() => editEntry(entryId), 100);
            }
        }
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
    const prevYear = document.getElementById('prevYear');
    if (prevYear) {
        prevYear.addEventListener('click', () => {
            currentDate.setFullYear(currentDate.getFullYear() - 1);
            renderCalendar();
        });
    }

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

    const nextYear = document.getElementById('nextYear');
    if (nextYear) {
        nextYear.addEventListener('click', () => {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            renderCalendar();
        });
    }

    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            currentDate = new Date();
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

    // List View button
    const listViewBtn = document.getElementById('listViewBtn');
    if (listViewBtn) {
        listViewBtn.addEventListener('click', () => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            window.location.href = `list.html?year=${year}&month=${month}`;
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

// Global color map for entries - built once per render
let entryColorMap = new Map();

// Color palette for events - stronger colors with good contrast for white text
const EVENT_COLORS = ['#4da6ff', '#4dff4d', '#e6a800', '#ff6b9d', '#c77dff'];

// Build a color map ensuring no two overlapping entries share the same color
function buildEntryColorMap() {
    entryColorMap = new Map();
    const allEntries = events.entries || [];
    
    if (allEntries.length === 0) return;
    
    const currentYear = currentDate.getFullYear();
    
    // Sort entries by start date, then by ID for consistency
    const sortedEntries = [...allEntries].sort((a, b) => {
        // Convert annual dates to current year for comparison
        const aStart = isAnnualEvent(a.startDate) ? annualDateToYear(a.startDate, currentYear) : a.startDate;
        const bStart = isAnnualEvent(b.startDate) ? annualDateToYear(b.startDate, currentYear) : b.startDate;
        
        if (aStart !== bStart) {
            return aStart.localeCompare(bStart);
        }
        return a.id - b.id;
    });
    
    // For each entry, find overlapping entries and assign first available color
    sortedEntries.forEach(entry => {
        // Find all entries that overlap with this one
        const overlappingColors = new Set();
        
        // Convert annual dates to current year for comparison
        const entryStartCompare = isAnnualEvent(entry.startDate) ? annualDateToYear(entry.startDate, currentYear) : entry.startDate;
        const entryEndCompare = isAnnualEvent(entry.endDate) ? annualDateToYear(entry.endDate, currentYear) : entry.endDate;
        
        sortedEntries.forEach(other => {
            if (other.id !== entry.id && entryColorMap.has(other.id)) {
                // Convert annual dates to current year for comparison
                const otherStartCompare = isAnnualEvent(other.startDate) ? annualDateToYear(other.startDate, currentYear) : other.startDate;
                const otherEndCompare = isAnnualEvent(other.endDate) ? annualDateToYear(other.endDate, currentYear) : other.endDate;
                
                // Check if entries overlap (date ranges intersect)
                if (entryStartCompare <= otherEndCompare && entryEndCompare >= otherStartCompare) {
                    overlappingColors.add(entryColorMap.get(other.id));
                }
            }
        });
        
        // Assign first color not used by overlapping entries
        let colorIndex = 0;
        while (overlappingColors.has(colorIndex) && colorIndex < EVENT_COLORS.length) {
            colorIndex++;
        }
        
        // If all colors used, cycle back (shouldn't happen often with 5 colors)
        if (colorIndex >= EVENT_COLORS.length) {
            colorIndex = entry.id % EVENT_COLORS.length;
        }
        
        entryColorMap.set(entry.id, colorIndex);
    });
}

// Render the calendar
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    
    // Build color map for all entries
    buildEntryColorMap();

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
    
    // Get entries that overlap with this date
    const dateString = formatDate(date);
    const allEntries = events.entries || [];
    const dayEntries = allEntries.filter(entry => {
        return entryOverlapsDate(entry, dateString);
    });
    
    if (dayEntries.length > 0) {
        const entriesContainer = document.createElement('div');
        entriesContainer.className = 'day-entries';
        
        // Sort entries by ID for consistent ordering
        const sortedDayEntries = [...dayEntries].sort((a, b) => a.id - b.id);
        
        // Show first 4 entries with color coding
        sortedDayEntries.slice(0, 4).forEach((entry, index) => {
            const entryPreview = document.createElement('div');
            entryPreview.className = 'entry-preview';
            // Get color from global color map (ensures same event = same color, no duplicates per day)
            const colorIndex = entryColorMap.get(entry.id) || 0;
            entryPreview.style.backgroundColor = EVENT_COLORS[colorIndex];
            entryPreview.style.color = '#ffffff';
            entryPreview.style.whiteSpace = 'normal';
            entryPreview.style.wordWrap = 'break-word';
            entryPreview.style.overflowWrap = 'break-word';
            
            // Add annual icon for annual events
            if (isAnnualEvent(entry.startDate)) {
                const annualIcon = document.createElement('span');
                annualIcon.textContent = '🔁 ';
                annualIcon.style.fontSize = '0.85em';
                annualIcon.style.opacity = '0.9';
                entryPreview.appendChild(annualIcon);
            }
            
            const titleText = document.createTextNode(entry.title);
            entryPreview.appendChild(titleText);
            
            entryPreview.style.cursor = 'pointer';
            entryPreview.onclick = (e) => {
                e.stopPropagation();
                openDayModal(date);
            };
            entriesContainer.appendChild(entryPreview);
        });
        
        dayElement.appendChild(entriesContainer);
        
        // Show count if more than 4
        if (dayEntries.length > 4) {
            const entryCount = document.createElement('div');
            entryCount.className = 'entry-count';
            entryCount.textContent = dayEntries.length;
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

// Check if an entry overlaps with a given date, handling annual events
function entryOverlapsDate(entry, dateString) {
    let entryStart = entry.startDate;
    let entryEnd = entry.endDate;
    
    // Extract the year from the dateString being checked (YYYY-MM-DD format)
    const checkYear = dateString.substring(0, 4);
    
    // Convert annual dates to the year being checked for comparison
    if (isAnnualEvent(entryStart)) {
        entryStart = annualDateToYear(entryStart, parseInt(checkYear));
    }
    if (isAnnualEvent(entryEnd)) {
        entryEnd = annualDateToYear(entryEnd, parseInt(checkYear));
    }
    
    // Handle year-crossing dates (defensive check in case of manual JSON edits)
    // If end < start in the same year, this is invalid - skip it
    if (entryStart > entryEnd) {
        console.warn('Invalid event date range: ' + entry.startDate + ' to ' + entry.endDate);
        return false;
    }
    
    return entryStart <= dateString && entryEnd >= dateString;
}

// Open modal for a specific day
function openDayModal(date) {
    selectedDate = date;
    editingEntryId = null; // Clear edit mode
    const modal = document.getElementById('modal');
    const dateKey = formatDate(date);
    
    document.getElementById('modalTitle').textContent = 'Entries for ' + formatDateDisplay(date);
    document.getElementById('modalDate').textContent = '';
    
    // Reset submit button text
    const submitBtn = document.querySelector('#entryForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Add';
    }
    
    // Reset form and set default dates
    document.getElementById('entryForm').reset();
    const dateString = formatDate(date); // YYYY-MM-DD format
    document.getElementById('entryStartDate').value = dateString;
    document.getElementById('entryStartDate').readOnly = true;
    document.getElementById('entryEndDate').value = dateString;
    document.getElementById('entryEndDate').readOnly = false;
    
    modal.style.display = 'block';
    
    // Load fresh data from server for this date to ensure we're not showing stale entries
    loadFreshEntriesForDate(date);
    
    // Set focus to title field for quick data entry
    setTimeout(() => {
        document.getElementById('entryTitle').focus();
    }, 100);
}

// Display entries for a date
function displayEntries(dateKey) {
    // Legacy function - kept for compatibility
    // New function uses displayEntriesForDate instead
}

// Load fresh entries from server for a specific date
async function loadFreshEntriesForDate(date) {
    try {
        const response = await fetch('api.php?action=get', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            // Fall back to displaying local entries if server fails
            displayEntriesForDate(date);
            return;
        }
        
        const data = await response.json();
        const serverEvents = data.success ? (data.events || {}) : {};
        
        // Update global events object with fresh server data
        if (serverEvents.entries) {
            events = serverEvents;
            saveLocalEvents(events);
        }
        
        // Display entries from fresh server data
        displayEntriesForDate(date, serverEvents);
        
        // Refresh calendar to show any new entries immediately
        renderCalendar();
    } catch (error) {
        console.error('Error loading fresh entries:', error);
        // Fall back to displaying local entries
        displayEntriesForDate(date);
    }
}

// Display entries that overlap with a specific date
function displayEntriesForDate(date, eventsOverride) {
    // Use provided events data (from server) or fall back to local cache
    const entriesToUse = eventsOverride || events;
    const entriesList = document.getElementById('entriesList');
    const dateString = formatDate(date);
    
    // Get all entries that overlap with this date
    const allEntries = entriesToUse.entries || [];
    const dayEntries = allEntries.filter(entry => {
        return entryOverlapsDate(entry, dateString);
    });
    
    if (dayEntries.length === 0) {
        entriesList.innerHTML = '<p style="color: #999; text-align: center; margin-top: 20px;">No entries yet. Add one above!</p>';
        return;
    }
    
    entriesList.innerHTML = '<h3 style="margin-top: 20px; margin-bottom: 15px; color: #667eea;">Existing Entries:</h3>';
    
    dayEntries.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry-item';
        
        // Format dates, converting annual dates to the year being displayed
        const displayYear = date.getFullYear();
        const startDateStr = isAnnualEvent(entry.startDate) 
            ? annualDateToYear(entry.startDate, displayYear)
            : entry.startDate;
        const endDateStr = isAnnualEvent(entry.endDate)
            ? annualDateToYear(entry.endDate, displayYear)
            : entry.endDate;
        
        const dateRange = startDateStr === endDateStr 
            ? formatDateDisplay(new Date(startDateStr + 'T00:00:00'))
            : `${formatDateDisplay(new Date(startDateStr + 'T00:00:00'))} - ${formatDateDisplay(new Date(endDateStr + 'T00:00:00'))}`;
        
        // Add annual badge if it's an annual event
        const annualBadge = isAnnualEvent(entry.startDate) 
            ? ' <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; font-weight: bold;">Annual</span>'
            : '';
        
        entryDiv.innerHTML = `
            <h4 style="color: #000;">${escapeHtml(entry.title)}${annualBadge}</h4>
            <p style="font-size: 0.9em; color: #333; margin: 5px 0;"><strong>Dates:</strong> ${dateRange}</p>
            ${entry.description ? `<p style="color: #000;">${escapeHtml(entry.description)}</p>` : ''}
            <div class="entry-meta" style="color: #666;">
                Added by ${escapeHtml(entry.author)} on ${new Date(entry.timestamp).toLocaleString()}
            </div>
            <div class="entry-actions">
                <button class="btn btn-primary btn-sm" onclick="editEntry(${entry.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEntry(${entry.id})">Delete</button>
            </div>
        `;
        
        entriesList.appendChild(entryDiv);
    });
}

// Close modal
function closeModal() {
    document.getElementById('modal').style.display = 'none';
    selectedDate = null;
    editingEntryId = null;
    
    // Reset form and show entries list
    document.getElementById('entryForm').reset();
    document.getElementById('entriesList').style.display = 'block';
    
    // Reset submit button text
    const submitBtn = document.querySelector('#entryForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Add';
    }
    
    // Reset annual checkbox
    document.getElementById('entryAnnual').checked = false;
}

// Edit an entry
function editEntry(entryId) {
    editingEntryId = entryId;
    
    // Find the entry
    const allEntries = events.entries || [];
    const entry = allEntries.find(e => e.id === entryId);
    
    if (!entry) {
        alert('Entry not found');
        return;
    }
    
    // Populate form with entry data
    document.getElementById('entryTitle').value = entry.title;
    document.getElementById('entryDescription').value = entry.description || '';
    
    // Check if it's an annual event and convert to current year for display
    const isAnnual = isAnnualEvent(entry.startDate);
    let displayStartDate = entry.startDate;
    let displayEndDate = entry.endDate;
    
    if (isAnnual) {
        displayStartDate = annualDateToCurrentYear(entry.startDate);
        displayEndDate = annualDateToCurrentYear(entry.endDate);
    }
    
    document.getElementById('entryStartDate').value = displayStartDate;
    document.getElementById('entryStartDate').readOnly = false; // Allow editing start date
    document.getElementById('entryEndDate').value = displayEndDate;
    document.getElementById('entryEndDate').readOnly = false;
    document.getElementById('entryAnnual').checked = isAnnual;
    
    // Update modal title
    document.getElementById('modalTitle').textContent = 'Edit Entry';
    
    // Update submit button text
    const submitBtn = document.querySelector('#entryForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Update';
    }
    
    // Hide entries list while editing
    document.getElementById('entriesList').style.display = 'none';
    
    // Focus on title field
    document.getElementById('entryTitle').focus();
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!selectedDate && !editingEntryId) return;
    
    const title = document.getElementById('entryTitle').value;
    const description = document.getElementById('entryDescription').value;
    const startDateInput = document.getElementById('entryStartDate').value;
    const endDateInput = document.getElementById('entryEndDate').value;
    const isAnnual = document.getElementById('entryAnnual').checked;
    
    // Validate dates
    if (!startDateInput || !endDateInput) {
        alert('Please select both start and end dates');
        return;
    }
    
    const startDate = new Date(startDateInput);
    const endDate = new Date(endDateInput);
    
    if (startDate > endDate) {
        alert('End date must be after or equal to start date');
        return;
    }
    
    // Process dates - convert to 0000 year if annual
    let finalStartDate = startDateInput;
    let finalEndDate = endDateInput;
    
    if (isAnnual) {
        // Check if the event crosses the year boundary (e.g., Dec 25 to Jan 5)
        // This is not allowed for annual events since 0000-12-25 > 0000-01-05
        const monthDayStart = startDateInput.substring(5); // MM-DD
        const monthDayEnd = endDateInput.substring(5);     // MM-DD
        
        if (monthDayStart > monthDayEnd) {
            alert('Annual events cannot span across the year boundary (e.g., December to January). Please create two separate annual events instead.');
            return;
        }
        
        // Replace year with 0000 for annual events
        finalStartDate = startDateInput.replace(/^\d{4}/, '0000');
        finalEndDate = endDateInput.replace(/^\d{4}/, '0000');
    }
    
    // Store the changes to apply
    const changeToApply = {
        isEdit: !!editingEntryId,
        entryId: editingEntryId,
        newData: {
            title: title,
            description: description,
            startDate: finalStartDate,
            endDate: finalEndDate,
            timestamp: new Date().toISOString()
        }
    };
    
    // Save to server atomically - this will apply changes to fresh server data
    await saveEventsWithChange(changeToApply);
    
    // Close modal (which also resets form and shows entries list)
    closeModal();
    
    // Update display - renderCalendar is already called in atomicSaveToServer after merge
    // but call it here too in case save failed
    renderCalendar();
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
            saveLocalEvents(events);
            closeModal();
            renderCalendar();
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
            saveLocalEvents(events);
            closeModal();
            renderCalendar();
        } else {
            alert('Failed to delete entry: ' + (saveData.message || 'Unknown error'));
            await loadEvents();
            closeModal();
            renderCalendar();
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
        closeModal();
        renderCalendar();
    }
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
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Response text:', text.substring(0, 200));
            updateSyncStatus('offline');
            const localEvents = getLocalEvents();
            events = migrateEventStructure(localEvents);
            renderCalendar();
            return;
        }
        
        if (data.success) {
            const serverEvents = migrateEventStructure(data.events || {});
            
            // Trust server data as the source of truth
            // Only merge if we have local changes that are newer than server
            events = serverEvents;
            
            // Save server data to localStorage as the new baseline
            saveLocalEvents(events);
            
            updateSyncStatus('synced');
            renderCalendar();
        }
    } catch (error) {
        console.error('Error loading events:', error);
        updateSyncStatus('offline');
        
        // Load from local storage
        const localEvents = getLocalEvents();
        events = migrateEventStructure(localEvents);
        renderCalendar();
    }
}

// Migrate old event structure (by date) to new structure (entries array)
function migrateEventStructure(eventData) {
    // If already in new format, return as-is
    if (eventData.entries && Array.isArray(eventData.entries)) {
        return eventData;
    }
    
    // If empty, return new format
    if (!eventData || Object.keys(eventData).length === 0) {
        return { entries: [] };
    }
    
    // Migrate old format (object with date keys) to new format (entries array)
    const entries = [];
    for (const dateKey in eventData) {
        if (Array.isArray(eventData[dateKey])) {
            // Old format: each date key contains an array of entries
            eventData[dateKey].forEach(entry => {
                entries.push({
                    id: entry.id || Date.now() + Math.random(),
                    title: entry.title,
                    description: entry.description,
                    author: entry.author,
                    startDate: dateKey,
                    endDate: dateKey,
                    timestamp: entry.timestamp
                });
            });
        }
    }
    
    return { entries };
}

// Get events from localStorage
function getLocalEvents() {
    try {
        const stored = localStorage.getItem('calendarEvents');
        const data = stored ? JSON.parse(stored) : { entries: [] };
        // Ensure it's in new format
        return migrateEventStructure(data);
    } catch (error) {
        console.error('Error reading local storage:', error);
        return { entries: [] };
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
    // Both should be in new format { entries: [] } at this point
    const serverEntries = serverEvents.entries || [];
    const localEntries = localEvents.entries || [];
    
    // Merge by ID, keeping newer timestamps
    const entriesMap = new Map();
    
    // Add server entries
    serverEntries.forEach(entry => {
        entriesMap.set(entry.id, entry);
    });
    
    // Add/override with local entries (local changes take precedence)
    localEntries.forEach(entry => {
        if (entriesMap.has(entry.id)) {
            // Keep the one with newer timestamp
            const existing = entriesMap.get(entry.id);
            if (new Date(entry.timestamp) > new Date(existing.timestamp)) {
                entriesMap.set(entry.id, entry);
            }
        } else {
            entriesMap.set(entry.id, entry);
        }
    });
    
    return { entries: Array.from(entriesMap.values()) };
}

// Check if two event objects are equal
function isEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// Generate a unique ID for new entries
// Combines timestamp, random number, and counter to prevent collisions
function generateUniqueId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const counter = entryIdCounter++;
    // Format: timestamp + random (4 digits) + counter (padded to 3 digits)
    return timestamp * 10000000 + random * 1000 + (counter % 1000);
}

// Save events locally first, then sync to server atomically
async function saveEvents() {
    // Always save locally first
    saveLocalEvents(events);
    
    // Try atomic save to server
    await atomicSaveToServer(null);
}

// Save with a specific change applied to fresh server data
async function saveEventsWithChange(change) {
    await atomicSaveToServer(change);
}

// Atomic save to server with locking
// If change is provided, it will be applied to fresh server data (prevents conflicts)
async function atomicSaveToServer(change) {
    const maxRetries = 15; // Up to 15 retries (could take ~10 seconds with delays)
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            updateSyncStatus('syncing');
            
            // Step 1: Try to acquire lock
            const lockResponse = await fetch('api.php?action=acquireLock', {
                method: 'GET',
                credentials: 'include'
            });
            
            const lockResult = await lockResponse.json();
            
            if (!lockResult.success) {
                // Lock is held by another client
                if (lockResult.retryAfter && lockResult.retryAfter > 0) {
                    // Wait and retry
                    const waitTime = Math.min(lockResult.retryAfter * 1000, 1000); // Max 1 second wait
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    retryCount++;
                    continue;
                } else {
                    throw new Error('Failed to acquire lock: ' + lockResult.message);
                }
            }
            
            // Step 2: Load latest data from server
            const getResponse = await fetch('api.php?action=get', {
                credentials: 'include'
            });
            
            if (!getResponse.ok) {
                // Release lock before throwing
                await releaseLock();
                throw new Error(`HTTP ${getResponse.status}`);
            }
            
            const getData = await getResponse.json();
            let serverEvents = getData.success ? (getData.events || {}) : {};
            
            // Ensure proper structure
            if (!serverEvents.entries) {
                serverEvents.entries = [];
            }
            
            // Step 3: Apply specific change to fresh server data OR merge
            let mergedEvents;
            
            if (change) {
                // Apply the specific change to fresh server data
                if (change.isEdit) {
                    // EDIT: Check if entry still exists on server
                    const entryIndex = serverEvents.entries.findIndex(e => e.id === change.entryId);
                    
                    if (entryIndex === -1) {
                        // Entry was deleted by another user - restore it with the edits
                        // We need to get the original author info, but since it was deleted,
                        // we'll use the current user as the author
                        const restoredEntry = {
                            id: change.entryId,
                            author: currentUserFullName,
                            ...change.newData
                        };
                        serverEvents.entries.push(restoredEntry);
                    } else {
                        // Update the existing entry on server data
                        serverEvents.entries[entryIndex] = {
                            ...serverEvents.entries[entryIndex],
                            ...change.newData,
                            author: serverEvents.entries[entryIndex].author // Keep original author
                        };
                    }
                    mergedEvents = serverEvents;
                } else {
                    // ADD: Just add to server data
                    const newEntry = {
                        id: generateUniqueId(),
                        author: currentUserFullName,
                        ...change.newData
                    };
                    serverEvents.entries.push(newEntry);
                    mergedEvents = serverEvents;
                }
            } else {
                // No specific change, just merge local with server
                mergedEvents = mergeEvents(serverEvents, events);
            }
            
            // Step 4: Save merged data
            const saveResponse = await fetch('api.php?action=save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ events: mergedEvents })
            });
            
            const saveResult = await saveResponse.json();
            
            // Step 5: Release lock
            await releaseLock();
            
            if (saveResult.success) {
                // Update local events with merged data
                events = mergedEvents;
                saveLocalEvents(events);
                updateSyncStatus('synced');
                pendingSync = false;
                
                // Refresh display to show any merged changes
                renderCalendar();
                return;
            } else {
                throw new Error('Save failed: ' + saveResult.message);
            }
            
        } catch (error) {
            console.error('Error in atomic save (attempt ' + (retryCount + 1) + '):', error);
            
            // Try to release lock in case of error
            try {
                await releaseLock();
            } catch (releaseError) {
                console.error('Error releasing lock:', releaseError);
            }
            
            retryCount++;
            
            if (retryCount >= maxRetries) {
                updateSyncStatus('pending');
                pendingSync = true;
                return;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
        }
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

// Sync events to server
async function syncToServer(data) {
    try {
        updateSyncStatus('syncing');
        
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
        updateSyncStatus('syncing');
        loadEvents();
    });
    
    window.addEventListener('offline', () => {
        updateSyncStatus('offline');
    });
    
    // Check if currently offline
    if (!navigator.onLine) {
        updateSyncStatus('offline');
    }
    
    // Setup auto-refresh polling - check for updates every 30 seconds
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
            
            // Migrate to new format and compare
            const migratedServer = migrateEventStructure(serverData.events || {});
            const hasChanges = !isDeepEqual(events, migratedServer);
            
            if (hasChanges) {
                events = migratedServer;
                updateSyncStatus('synced');
                renderCalendar();
                if (selectedDate) {
                    displayEntriesForDate(selectedDate);
                }
            }
        } catch (error) {
            console.error('Poll error:', error);
        }
    }, 30000); // Poll every 30 seconds
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
