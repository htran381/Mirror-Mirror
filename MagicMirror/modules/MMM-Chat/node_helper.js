
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

    // Microphone state
    this.muted = false;      // set from the mute button on the mirror
    this.micEnabled = false; // true once the real listening loop has been started
    this.listening = false;  // true while the listening loop is running
    this.recorder = null;    // current SoX recording process
    this.micState = null;    // last state sent to the front end

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
  async socketNotificationReceived(notification, payload) {

    // MMM-Todo: the user tapped a task to select it (null when deselected)
    if (notification === "SELECTED_TASK") {
      this.selectedTask = payload || null;
      console.log("Selected to-do task:", this.selectedTask ? this.selectedTask.title : "none");
      return;
    }

    if (notification === "SET_MUTE") {
      this.setMuted(Boolean(payload));
      return;
    }

    if (notification === "START") {

      // Sync the mute button if the front end was reloaded
      this.sendSocketNotification("MUTE_STATE", Boolean(this.muted));

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
        this.startListening();

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
          this.startListening();
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

  // Start the listening loop unless it is already running
  startListening() {
    this.micEnabled = true;

    if (!this.listening) {
      listen(this);
    }
  },

  // Send the mic state ("listening" / "processing") to the front end when it changes
  reportMicState(state) {
    if (state === this.micState) {
      return;
    }

    this.micState = state;
    this.sendSocketNotification("MIC_STATE", state);
  },

  // Mute or unmute the microphone
  setMuted(muted) {
    this.muted = muted;

    if (muted) {
      // Stop any recording in progress right away
      if (this.recorder) {
        this.recorder.kill();
      }
      console.log("Microphone muted");
    }
    else {
      console.log("Microphone unmuted");

      // Resume the loop if it stopped while muted
      if (this.micEnabled && !this.listening) {
        listen(this);
      }
    }

    this.sendSocketNotification("MUTE_STATE", muted);
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

    // A task tapped on the mirror gives "edit" / "this" something to refer to
    const routedCommand = this.selectedTask
      ? `${command}\n(Selected to-do task: #${this.selectedTask.task_id} "${this.selectedTask.title}")`
      : command;

    const response = await route(routedCommand, model => {
      // TODO keeps the window open too, so "edit" can be followed by the new content
      const isChoiceRelated = model === "CHOICE" || model === "HISTORY" || model === "TODO";
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
