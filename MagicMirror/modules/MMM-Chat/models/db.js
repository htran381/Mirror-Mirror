const sessions = require("../../../db/queries/sessions");
const { getSetting } = require("../../../db/queries/settings");
const { getDefaultUser } = require("../../../db/queries/users");
const getActiveSession = sessions.getActiveSession;
const startSession = sessions.startSession;
const endSession = sessions.endSession;
const logMessage = sessions.logMessage;
const getSessionMessages = sessions.getSessionMessages;

// When the last message was saved; used for the inactivity timeout
let lastActivity = Date.now();

// Ends the active session, if there is one
function endCurrentSession() {
  const session = getActiveSession();
  if (session) {
    endSession(session.session_id);
  }
}

// Returns the active session's id, or null if none is active (never starts one)
function activeSessionId() {
  const session = getActiveSession();
  return session ? session.session_id : null;
}

// Returns the active session's id, starting a new session if none is active
function currentSessionId() {
  const session = getActiveSession();
  if (session === undefined) {
    return startSession(getDefaultUser());
  } else {
    return session.session_id;
  }
}

// On boot, any session still active is left over from a previous run (crash or power cut)
endCurrentSession();

// Save a message to the database
function saveMessage(role, content) {
  const speaker = role === "assistant" ? "mm" : "user";
  logMessage(currentSessionId(), speaker, content);
  lastActivity = Date.now();
}

// Retrieve the most recent messages in chronological order
function getRecentMessages(limit = 100) {
  return getSessionMessages(currentSessionId(), limit).map(row => ({
    role: row.speaker === "mm" ? "assistant" : "user",
    content: row.content
  }));
}

// Start a fresh conversation by ending the current session
function clearHistory() {
  endCurrentSession();
}

// Ends the session after inactivity_timeout_minutes with no messages. Returns true if it ended one.
function endIfInactive() {
  const timeoutMs = getSetting("inactivity_timeout_minutes") * 60 * 1000;
  if (Date.now() - lastActivity > timeoutMs && activeSessionId() !== null) {
    endCurrentSession();
    return true;
  }
  return false;
}

// Check for inactivity once a minute; unref() lets the mirror shut down without waiting for this timer
setInterval(endIfInactive, 60 * 1000).unref();

module.exports = {
  saveMessage,
  getRecentMessages,
  clearHistory,
  endCurrentSession,
  activeSessionId,
  endIfInactive
};
