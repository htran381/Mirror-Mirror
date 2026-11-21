Module.register("MMM-Chat", {

  // Runs when the module starts
  start: function () {

    console.log("MMM-Chat started");

    // Stores messages shown on screen
    this.messages = [];

    // Current system status
    this.status = "Listening...";

    // UI state for the control buttons
    this.minimized = false;
    this.muted = false;
    this.unread = 0; // replies that arrived while minimized

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

    // Backend confirms the microphone state
    if (notification === "MUTE_STATE") {
      this.muted = Boolean(payload);
      this.updateDom(0);
    }

    // Add user message when speech/text is received
    if (notification === "TEXT") {

      this.addMessage("user", payload);

      this.status = "Thinking...";

      this.updateDom(0);

    }

    // Add assistant response
    if (notification === "AI_RESPONSE") {

      this.addMessage("assistant", payload);

      if (this.minimized) {
        this.unread++;
      }

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

  // Button handlers
  toggleMinimized: function () {
    this.minimized = !this.minimized;
    if (!this.minimized) {
      this.unread = 0;
    }
    this.updateDom(0);
  },

  toggleMuted: function () {
    // Update right away so the button feels responsive,
    // then the backend confirms with MUTE_STATE
    this.muted = !this.muted;
    this.sendSocketNotification("SET_MUTE", this.muted);
    this.updateDom(0);
  },

  clearChat: function () {
    this.messages = [];
    this.unread = 0;
    this.updateDom(0);
  },

  // Inline SVG icons (no icon font needed)
  icons: {
    mic: '<path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/>',
    micOff: '<path d="M15 9.3V6a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 4.9 2.3"/><path d="M19 11a7 7 0 0 1-1.2 3.9M5 11a7 7 0 0 0 11.1 5.7M12 18v3M3 3l18 18"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    minimize: '<path d="M6 9l6 6 6-6"/>',
    expand: '<path d="M6 15l6-6 6 6"/>'
  },

  makeButton: function (icon, label, onClick, extraClass) {
    const button = document.createElement("button");
    button.className = "chat-button" + (extraClass ? " " + extraClass : "");
    button.setAttribute("aria-label", label);
    button.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + this.icons[icon] + "</svg>";
    button.addEventListener("click", event => {
      event.stopPropagation();
      onClick.call(this);
    });
    return button;
  },

  // Creates the UI displayed on the mirror
  getDom: function () {

    const wrapper = document.createElement("div");
    wrapper.className = "chat-wrapper" + (this.minimized ? " minimized" : "");

    // Message history (hidden while minimized)
    if (!this.minimized) {

      // Scrollable area that holds the message history
      const scrollArea = document.createElement("div");
      scrollArea.className = "chat-scroll";

      const messagesContainer = document.createElement("div");
      messagesContainer.className = "chat-messages";

      this.messages.forEach(message => {

        const messageDiv = document.createElement("div");

        const roleDiv = document.createElement("div");
        roleDiv.className = "chat-role";

        const textDiv = document.createElement("div");
        textDiv.className = "chat-text";
        textDiv.textContent = message.content;

        if (message.role === "user") {
          messageDiv.className = "chat-message user-message";
          roleDiv.textContent = "You";
        }

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

    }

    // Control bar: [mute]  status  [clear] [minimize]
    const controls = document.createElement("div");
    controls.className = "chat-controls";

    controls.appendChild(this.makeButton(
      this.muted ? "micOff" : "mic",
      this.muted ? "Unmute microphone" : "Mute microphone",
      this.toggleMuted,
      this.muted ? "active" : ""
    ));

    const statusDiv = document.createElement("div");
    statusDiv.className = "chat-status";

    if (this.muted) {
      statusDiv.textContent = "Mic muted";
      statusDiv.classList.add("muted");
    }
    else {
      statusDiv.textContent = this.status;
      if (this.status === "Thinking...") {
        statusDiv.classList.add("thinking");
      }
    }

    controls.appendChild(statusDiv);

    const rightButtons = document.createElement("div");
    rightButtons.className = "chat-controls-right";

    if (!this.minimized && this.messages.length > 0) {
      rightButtons.appendChild(this.makeButton("trash", "Clear chat", this.clearChat));
    }

    const minimizeButton = this.makeButton(
      this.minimized ? "expand" : "minimize",
      this.minimized ? "Show chat" : "Minimize chat",
      this.toggleMinimized
    );

    // Badge for replies that arrived while minimized
    if (this.minimized && this.unread > 0) {
      const badge = document.createElement("span");
      badge.className = "chat-badge";
      badge.textContent = this.unread;
      minimizeButton.appendChild(badge);
    }

    rightButtons.appendChild(minimizeButton);
    controls.appendChild(rightButtons);

    wrapper.appendChild(controls);

    return wrapper;

  },

  // Load module CSS
  getStyles: function () {
    return ["MMM-Chat.css"];
  }

});
