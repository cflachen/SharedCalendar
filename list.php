<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event List - Shared Calendar</title>
    <link rel="stylesheet" href="styles.css?v=<?php echo filemtime(__DIR__.'/styles.css'); ?>">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-top">
                <h1 id="calendarTitle">Shared Calendar</h1>
                <div class="user-actions">
                    <span id="userDisplay" class="user-display"></span>
                    <button id="calendarBtn" class="btn-admin">Calendar View</button>
                    <button id="logoutBtn" class="btn-logout">Logout</button>
                </div>
            </div>
            <div class="controls">
                <button id="prevYear">&lt;&lt;</button>
                <button id="prevMonth">&lt;</button>
                <h2 id="currentMonth"></h2>
                <button id="nextMonth">&gt;</button>
                <button id="nextYear">&gt;&gt;</button>
                <button id="todayBtn" class="btn-today">Today</button>
            </div>
        </header>

        <div class="list-container" id="eventList">
            <div class="list-header">
                <h3>Events this Month</h3>
            </div>
            <div id="eventListContent"></div>
        </div>
    </div>

    <script src="list.js?v=<?php echo filemtime(__DIR__.'/list.js'); ?>"></script>
</body>
</html>
