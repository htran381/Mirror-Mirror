const db = require("../index.js");

// Creates a scheduled calendar event. title, startAt and endAt are required (end must be after start). Returns the new event_id.
function addEvent(userId, sessionId, event) {
    const {
        binId = null,
        taskId = null,
        choiceId = null,
        optionId = null,
        title,
        startAt,
        endAt,
        remindAt = null,
        source = "stated",
    } = event;

    const added_event = db.prepare(
        `
        INSERT INTO calendar_events (user_id, bin_id, task_id, choice_id, option_id, title, start_at, end_at, remind_at, status, source, created_session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
        `
    ).run(userId, binId, taskId, choiceId, optionId, title, startAt, endAt, remindAt, source, sessionId);
    return added_event.lastInsertRowid;
}

// Returns the user's events that overlap a time range (any part of the event falls inside it), excluding cancelled, earliest first.
function getEvents(userId, from, to) {
    const events_array = db.prepare(
        `
        SELECT * FROM calendar_events 
        WHERE user_id = ? 
            AND status <> 'cancelled'
            AND start_at < ? 
            AND end_at > ?
        ORDER BY start_at
        `
    ).all(userId, to, from);
    return events_array;
}

// Returns scheduled events that clash with a new event's time (rule S3). Back-to-back events don't count. Empty array = no clash.
function getOverlaps(userId, startAt, endAt) {
    const overlaps_array = db.prepare(
        `
        SELECT * FROM calendar_events
        WHERE user_id = ?
            AND status = 'scheduled'
            AND start_at < ?
            AND end_at > ?
        ORDER BY start_at
        `
    ).all(userId, endAt, startAt);
    return overlaps_array;
}

// Marks an event completed and records which session. Returns 1 if updated, 0 if the id wasn't found.
function completeEvent(eventId, sessionId) {
    const changes = db.prepare(
        `
        UPDATE calendar_events SET status = 'completed', completed_session_id = ?, updated_at = datetime('now','localtime')
        WHERE event_id = ?
        `
    ).run(sessionId, eventId);
    return changes.changes;
}

// Marks an event cancelled (the row is kept). Returns 1 if updated, 0 if the id wasn't found.
function cancelEvent(eventId) {
    const changes = db.prepare(
        `
        UPDATE calendar_events SET status = 'cancelled', updated_at = datetime('now','localtime')
        WHERE event_id = ?
        `
    ).run(eventId);
    return changes.changes;
}


module.exports = { addEvent, getEvents, getOverlaps, completeEvent, cancelEvent };