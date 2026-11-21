const askLocal = require("./local");
const db = require("./db");

// Analyze a completed session for useful long-term information
async function analyzePreferences(sessionId) {

  try {

    // Retrieve all messages from the completed session
    const messages = db.getSessionMessages(sessionId);

    // Do not analyze an empty session
    if (messages.length === 0) {
      return true;
    }

    // Convert the conversation into text
    const conversation = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n");

    // Build the preference analysis prompt
    const prompt = `
      Analyze this conversation for durable information about the user
      that would be useful in future conversations.

      Preferred categories:
      - personal
      - preferences
      - relationships
      - work_education
      - goals
      - interests

      Use one of the preferred categories when appropriate.
      Create a new concise category only when none fit.

      Remember:
      - Long-term preferences
      - Recurring habits
      - Long-term goals
      - Interests
      - Useful personal information

      Ignore:
      - Temporary information
      - One-time requests
      - Casual statements
      - Information unlikely to matter later

      Return each memory on a separate line using:
      category | key | value | memory_text

      If there is nothing worth remembering, return:
      NONE

      CONVERSATION:
      ${conversation}
    `;

    // Ask the local model to extract memories
    const response = await askLocal(prompt);

    // Analysis failed
    if (!response) {
      return false;
    }

    // No useful information was found
    if (response.trim().toUpperCase() === "NONE") {
      return true;
    }

    // Separate each returned memory
    const memories = response
      .trim()
      .split("\n");

    // Save each valid memory
    memories.forEach(memory => {

      const parts = memory
        .split("|")
        .map(part => part.trim());

      if (parts.length === 4) {

        const [
          category,
          key,
          value,
          memoryText
        ] = parts;

        db.saveMemory(
          category,
          key,
          value,
          memoryText
        );

      }

    });

    return true;

  } catch (error) {

    console.error(
      "Preference analysis error:",
      error.message
    );

    return false;
  }

}

module.exports = analyzePreferences;