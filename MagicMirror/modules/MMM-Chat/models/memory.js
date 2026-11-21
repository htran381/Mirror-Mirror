const db = require("./db");

// Maximum number of conversation turns to keep in memory
const MAX_TURNS = 10;

// Load recent conversation history from the database
let history = db.getRecentMessages(MAX_TURNS);

// The session this history belongs to; when it changes, the history starts fresh
let lastSessionId = db.activeSessionId();

// Keep only the most recent messages in memory
function trim() {
  if (history.length > MAX_TURNS) {
    history = history.slice(history.length - MAX_TURNS);
  }
}

// Add a user message to memory and persist it
function addUserMessage(message) {

  // A new session started (for example after the inactivity timeout), so start a fresh history
  if (db.activeSessionId() !== lastSessionId) {
    history = [];
  }

  history.push({
    role: "user",
    content: message
  });

  // Save the user message to the database
  db.saveMessage("user", message);
  lastSessionId = db.activeSessionId();

  // Remove old messages if the history exceeds the limit
  trim();

}

// Add an assistant message to memory and persist it
function addAssistantMessage(message) {

  history.push({
    role: "assistant",
    content: message
  });

  // Save the assistant message to the database
  db.saveMessage("assistant", message);

  // Remove old messages if the history exceeds the limit
  trim();

}

function buildPrompt(userMessage) {

  let prompt = `
    You are Mirror Mirror, a smart-mirror assistant.

    CONVERSATION HISTORY:
    The following is conversation history between the user and you.

    Use this history to understand context, references, and previous topics.
    You may use information from the history when it helps answer the current message.

    However:
    - Do NOT answer old questions again.
    - Do NOT continue an old response unless the current message asks you to.
    - Only produce ONE response to the CURRENT USER MESSAGE.

    --- BEGIN CONVERSATION HISTORY ---
  `;

  history.forEach(msg => {

    if (msg.role === "user") {
      prompt += `USER: ${msg.content}\n`;
    } else {
      prompt += `ASSISTANT: ${msg.content}\n`;
    }

  });

  prompt += `
    --- END CONVERSATION HISTORY ---

    RESPONSE STYLE:
    - Answer the CURRENT USER MESSAGE directly.
    - Use the conversation history when relevant.
    - Respond in 2 to 3 sentences.
    - Don't use any markdown formatting.

    --- CURRENT USER MESSAGE ---
    USER: ${userMessage}
  `;

  return prompt;
}

module.exports = {
  addUserMessage,
  addAssistantMessage,
  buildPrompt
};