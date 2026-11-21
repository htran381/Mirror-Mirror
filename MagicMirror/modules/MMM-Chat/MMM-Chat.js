Module.register("MMM-Chat", {

  // Runs when the module starts
  start: function () {

    console.log("MMM-Chat started");

    // Stores messages shown on screen
    this.messages = [];

    // Current system status
    this.status = "Listening...";

    // Tell the backend (NodeHelper) to start listening
    this.sendSocketNotification("START");

    // Update the UI immediately
    this.updateDom(0);

  },

  // Runs when MagicMirror finishes loading all modules
  notificationReceived: function (notification) {

    if (notification === "DOM_OBJECTS_CREATED") {

      console.log("MMM-Chat loaded");

    }

  },

  // Function to show selected modules
  // For mockup implementation using local model
  showModules: function (names) {

    console.log("Showing modules:", names);

    MM.getModules().enumerate(module => {

      console.log("Checking:", module.name);

      if (names.includes(module.name)) {
        module.show(1000);
      }

    });

  },

  // Function to hide selected modules
  // For mockup implementation using local model
  hideModules: function (names) {

    console.log("Hiding modules:", names);

    MM.getModules().enumerate(module => {

      console.log("Checking:", module.name);

      if (names.includes(module.name)) {
        module.hide(1000);
      }

    });

  },

  // Receives messages from NodeHelper
  socketNotificationReceived: function (notification, payload) {

    console.log("SOCKET RECEIVED:", notification, payload);

    // Add user message when speech/text is received
    if (notification === "TEXT") {

      this.addMessage("user", payload);

      this.status = "Thinking...";

      this.updateDom(0);

    }

    // Add assistant response
    if (notification === "AI_RESPONSE") {

      this.addMessage("assistant", payload);

      this.status = "Listening...";

      this.updateDom(0);

    }

    // Handle module actions
    if (notification === "ACTION") {

      console.log("Handling ACTION:", payload);

      // Show all main modules except MMM-Chat
      if (payload === "SHOW_ALL") {
        this.showModules([
          "clock",
          "weather",
          "newsfeed",
          "MMM-Jast",
        ]);
      }

      // Show only weather
      if (payload === "SHOW_WEATHER") {
        this.showModules(["weather"]);
      }

      // Show only news
      if (payload === "SHOW_NEWS") {
        this.showModules(["newsfeed"]);
      }

      // Show stocks
      if (payload === "SHOW_STOCKS") {
        this.showModules(["MMM-Jast"]);
      }

      // Hide all main modules except MMM-Chat
      if (payload === "SHOW_ALL") {
        this.hideModules([
          "clock",
          "weather",
          "newsfeed",
          "MMM-Jast"
        ]);
      }

      // Hide weather
      if (payload === "HIDE_CLOCK") {
        this.hideModules(["clock"]);
      }

      // Hide weather
      if (payload === "HIDE_WEATHER") {
        this.hideModules(["weather"]);
      }

      // Hide news
      if (payload === "HIDE_NEWS") {
        this.hideModules(["newsfeed"]);
      }

      // Show only calendar
      if (payload === "HIDE_STOCKS") {
        this.hideModules(["MMM-Jast"]);
      }

    }

  },

  // Adds a message to the history.
  // The chat area scrolls, so old messages are kept instead of being
  // deleted when the screen fills up. Only the oldest are dropped past the cap.
  maxMessages: 40,

  addMessage: function (role, content) {

    this.messages.push({ role, content });

    if (this.messages.length > this.maxMessages) {
      this.messages.splice(0, this.messages.length - this.maxMessages);
    }

  },

  // Creates the UI displayed on the mirror
  getDom: function () {

    const wrapper = document.createElement("div");
    wrapper.className = "chat-wrapper";

    // Scrollable area that holds the message history
    const scrollArea = document.createElement("div");
    scrollArea.className = "chat-scroll";

    const messagesContainer = document.createElement("div");
    messagesContainer.className = "chat-messages";

    // Create each message
    this.messages.forEach(message => {

      const messageDiv = document.createElement("div");

      const roleDiv = document.createElement("div");
      roleDiv.className = "chat-role";

      const textDiv = document.createElement("div");
      textDiv.className = "chat-text";
      textDiv.textContent = message.content;

      // User message
      if (message.role === "user") {

        messageDiv.className = "chat-message user-message";
        roleDiv.textContent = "You";

      }

      // Assistant message
      if (message.role === "assistant") {

        messageDiv.className = "chat-message assistant-message";
        roleDiv.textContent = "Mirror";

      }

      messageDiv.appendChild(roleDiv);
      messageDiv.appendChild(textDiv);

      messagesContainer.appendChild(messageDiv);

    });

    scrollArea.appendChild(messagesContainer);
    wrapper.appendChild(scrollArea);

    // Show listening/thinking status (stays fixed below the scroll area)
    const statusDiv = document.createElement("div");
    statusDiv.className = "chat-status";
    if (this.status === "Thinking...") {
      statusDiv.classList.add("thinking");
    }
    statusDiv.textContent = "🎤 " + this.status;

    wrapper.appendChild(statusDiv);

    return wrapper;

  },

  // Load module CSS
  getStyles: function () {
    return ["MMM-Chat.css"];
  }

});
