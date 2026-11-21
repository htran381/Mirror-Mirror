
const NodeHelper = require("node_helper");
const listen = require("./speech/speechRecognition");
const handleCommand = require("./controllers/commandController");
const route = require("./models/router");
const { connectMcp } = require("./mcp/mcpClient");
const { initializeMCPToolUse } = require("./models/claude");
const health = require("./models/health");
const db = require("./models/db");

const CHOICE_FOLLOW_UP_MS = 90_000;

module.exports = NodeHelper.create({

  // Runs when the NodeHelper starts
  async start() {
    this.choiceFollowUpUntil = 0;
    console.log("Offline speech helper started");
    health.startHealthChecks();

    this.mockRunning = false;

    try {
      await connectMcp();
      console.log("MCP connected successfully.");
    } catch (error) {
      console.error("MCP connection failed.", error);
    }

  },

  // Runs when MagicMirror shuts down: end the current session
  stop() {
    db.endCurrentSession();
  },

  // Receives messages from the front-end module
  async socketNotificationReceived(notification) {

    if (notification === "START") {

      if (process.env.MOCK_MODE === "true") {

        // Prevent multiple mock sequences
        if (this.mockRunning) {
          return;
        }

        this.mockRunning = true;

        // Allow the initial health check to finish
        setTimeout(() => this.handleMock(), 3000);

      }
      else {

        await initializeMCPToolUse(); // initialize mcp tool for Claude use 
        listen(this);

      }

    }

  },

  // Simulate speech input using predetermined commands
  async handleMock() {

    // Commands to simulate as Whisper transcriptions
    const commands = [
      "hello world",
      "explain how a CPU works",
      "hide weather"
    ];

    try {

      // Process each simulated command sequentially
      for (const command of commands) {

        console.log("Mock command:", command);

        await this.handleSpeech(command);

        // Allow time for the UI to display each response
        await new Promise(resolve => setTimeout(resolve, 2000));

      }

      // Optionally activate microphone testing after mock mode
      if (process.env.MIC_TEST === "true") {

        console.log("Mock complete. Starting microphone testing.");

        // Disable mock responses before starting microphone testing
        process.env.MOCK_MODE = "false";

        try {
          await listen(this);
        } 
        catch (error) {
          console.error("Microphone unavailable:", error.message);
        }

      }

    } catch (error) {

      console.error("Mock mode error:", error.message);

    } finally {

      this.mockRunning = false;

    }

  },

  isChoiceFollowUpOpen() {
    return Date.now() < this.choiceFollowUpUntil;
  },

  // Differentiate between Action Command or Conversation
  async handleSpeech(command, wokeMirror = false) {

    console.log("User:", command);

    this.sendSocketNotification("TEXT", command);

    // Replaced "action" handling with MCP
    if (process.env.MOCK_MODE === "true") {

      const action = handleCommand(command);

      // Handle specific commands (if any) with the respective action
      if (action) {

        // Send command
        this.sendSocketNotification(
          "ACTION",
          action
        );

        // Assistant acknowledgement 
        this.sendSocketNotification(
          "AI_RESPONSE",
          "As you command"
        );

        return;

      }

    }

    // Send conversation to router if not a command
    // Check the window when the request arrives.
    const wasInFollowUp = this.isChoiceFollowUpOpen();
    const response = await route(command, model => {
      const isChoiceRelated = model === "CHOICE" || model === "HISTORY";
      if (isChoiceRelated && (wokeMirror || wasInFollowUp)) {
        this.choiceFollowUpUntil = Date.now() + CHOICE_FOLLOW_UP_MS;
      }
    });

    this.sendSocketNotification(
      "AI_RESPONSE",
      response
    );

  }

});
