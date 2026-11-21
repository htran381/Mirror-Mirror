const db = require("../index.js");

// Returns the session that is running right now (status 'active') as a row, 
// or undefined if nobody is using the mirror.
function getActiveSession() {
    const row = db.prepare(
        `
        SELECT * FROM sessions WHERE status = 'active'
        `
    ).get();
    return row;
}

// Ends any active session, then starts a new one for the user with their 
// next session_number. Returns the new session_id.
function startSession(userId) {
    const session = getActiveSession();
    if (session) { endSession(session.session_id); }
    const new_session_number = db.prepare(
        `
        SELECT COALESCE(MAX(session_number),0)+1 AS next_number FROM sessions 
            WHERE user_id = ?
        `
    ).get(userId);

    const result = db.prepare(
        `
        INSERT INTO sessions (user_id,session_number,status) 
            VALUES (?,?,'active')
        `
    ).run(userId, new_session_number.next_number);
    return result.lastInsertRowid;
}

// Marks a session as ended and records ended_at. Returns 1 if a session was ended, 0 if the id wasn't found.
function endSession(sessionId) {
    const end = db.prepare(
        `
        UPDATE sessions SET status = 'ended',ended_at = datetime('now','localtime')
            WHERE session_id = ?
        `
    ).run(sessionId);
    return end.changes;
}

// Saves one chat message to session_buffer. speaker is 'user' or 'mm'. Returns the new buffer_id.
function logMessage(sessionId, speaker, content) {
    const result = db.prepare(
        `
        INSERT INTO session_buffer (session_id,speaker,content)
            VALUES (?,?,?)
        `
    ).run(sessionId, speaker, content);

    return result.lastInsertRowid;
}

// Returns the last `limit` messages of a session as [{ speaker, content, created_at }], oldest first.
function getSessionMessages(sessionId, limit) {
    const result = db.prepare(
        `
        SELECT speaker, content, created_at FROM session_buffer 
        WHERE session_id = ?
        ORDER BY buffer_id DESC
        LIMIT ?
        `
    ).all(sessionId, limit);
    return result.reverse();
}

module.exports = { getActiveSession, startSession, endSession, logMessage, getSessionMessages };

