/* MMM-Chat (front end)
 * The chat panel on the mirror: shows the conversation with the AI and the
 * controls to use it by touch.
 *
 *  - Messages: your words and the mirror's replies as bubbles; the history
 *    scrolls and stays pinned to the newest message
 *  - Status: listening (sound bars), processing speech, thinking (typing
 *    bubble), or muted, as reported by node_helper.js
 *  - Buttons: mute the mic, clear the chat, minimize/expand the panel
 *  - Minimizes itself after a minute idle and reopens when you talk to it
 *  - Hides modules that would overlap it (hideWhileOpen) while it's open
 *  - Tells MMM-Todo to reload after replies, and passes along a task the
 *    user tapped so "edit this" knows which task is meant
 *
 * Talks to: node_helper.js (socket notifications), MMM-Todo (notifications)
 */
Module.register("MMM-Chat", {

  defaults: {
    // "compact": small panel sized like other modules (put it in a corner region)
    // "full": wide chat across the bottom_bar
    layout: "compact",

    // Modules that would overlap the open chat. They hide while the chat is
    // showing messages and come back when it is minimized or cleared.
    // Set to [] in config.js to turn this off.
    hideWhileOpen: ["MMM-Jast", "newsfeed"],

    // Minimize the chat after this many seconds with no conversation or touch.
    // It opens again by itself the next time you talk to the mirror.
    // Set to 0 to turn this off.
    idleMinimizeSeconds: 60
  },

  // Runs when the module starts
  start: function () {

    console.log("MMM-Chat started");

    // Stores messages shown on screen
    this.messages = [];

    // Current system status
    this.micState = "listening"; // "listening" or "processing", from the backend
    this.thinking = false;       // waiting for the AI's reply

    // UI state for the control buttons
    this.minimized = false;
    this.muted = false;
    this.unread = 0; // replies that arrived while minimized
    this.companionsHidden = false;
    this.autoMinimized = false;  // minimized by the idle timer, not by a tap
    this.idleTimer = null;

    // Tell the backend (NodeHelper) to start listening
    this.sendSocketNotification("START");

    // Update the UI immediately
    this.updateDom(0);

  },

  // Runs when MagicMirror finishes loading all modules
  notificationReceived: function (notification, payload) {

    if (notification === "DOM_OBJECTS_CREATED") {

      console.log("MMM-Chat loaded");

    }

    // MMM-Todo tells us which task the user tapped, for "edit this"
    if (notification === "TODO_SELECTED") {
      this.sendSocketNotification("SELECTED_TASK", payload || null);
    }

  },

  // Function to show selected modules
  // For mockup implementation using local model
  showModules: function (names) {

    console.log("Showing modules:", names);

    MM.getModules().enumerate(module => {

      console.log("Checking:", module.name);

      if (names.includes(module.name)) {
        // Also releases the chat's auto-hide lock, so voice commands like
        // "show stocks" still work while the chat is open
        module.show(1000, { lockString: this.identifier });
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

    // Backend reports whether it is waiting for speech or transcribing
    if (notification === "MIC_STATE") {
      this.micState = payload;
      this.refresh();
    }

    // Backend confirms the microphone state
    if (notification === "MUTE_STATE") {
      this.muted = Boolean(payload);
      this.refresh();
    }

    // Add user message when speech/text is received
    if (notification === "TEXT") {

      this.addMessage("user", payload);

      this.thinking = true;

      // Re-open the chat if it was tucked away for being idle
      if (this.minimized && this.autoMinimized) {
        this.minimized = false;
        this.autoMinimized = false;
        this.unread = 0;
      }

      this.refresh();
      this.resetIdleTimer();

    }

    // Add assistant response
    if (notification === "AI_RESPONSE") {

      this.addMessage("assistant", payload);

      if (this.minimized) {
        this.unread++;
      }

      this.thinking = false;

      this.refresh();
      this.resetIdleTimer();

      // The reply may have changed tasks (to-do tools): let MMM-Todo reload now
      this.sendNotification("TASKS_CHANGED");

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

  // Hide modules that overlap the chat while it is open, show them otherwise
  updateCompanionModules: function () {

    const shouldHide = !this.minimized && this.messages.length > 0;

    if (shouldHide === this.companionsHidden) {
      return;
    }

    this.companionsHidden = shouldHide;
    const names = this.config.hideWhileOpen || [];

    MM.getModules().enumerate(module => {
      if (!names.includes(module.name)) {
        return;
      }

      // lockString keeps them hidden until the chat releases them
      if (shouldHide) {
        module.hide(500, { lockString: this.identifier });
      }
      else {
        module.show(500, { lockString: this.identifier });
      }
    });

  },

  // Re-render and keep the other modules in sync with the chat state
  refresh: function () {
    this.updateDom(0);
    this.updateCompanionModules();
  },

  // (Re)start the countdown to auto-minimize
  resetIdleTimer: function () {

    clearTimeout(this.idleTimer);

    const seconds = this.config.idleMinimizeSeconds;

    if (!seconds || this.minimized || this.messages.length === 0) {
      return;
    }

    this.idleTimer = setTimeout(() => {

      // Don't hide the chat while a reply is on its way
      if (this.thinking) {
        this.resetIdleTimer();
        return;
      }

      this.minimized = true;
      this.autoMinimized = true;
      this.refresh();

    }, seconds * 1000);

  },

  // Button handlers
  toggleMinimized: function () {
    this.minimized = !this.minimized;
    this.autoMinimized = false;
    this.resetIdleTimer();
    if (!this.minimized) {
      this.unread = 0;
    }
    this.refresh();
  },

  toggleMuted: function () {
    // Update right away so the button feels responsive,
    // then the backend confirms with MUTE_STATE
    this.muted = !this.muted;
    this.sendSocketNotification("SET_MUTE", this.muted);
    this.refresh();
  },

  clearChat: function () {
    this.messages = [];
    this.unread = 0;
    clearTimeout(this.idleTimer);
    this.refresh();
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
    wrapper.className = "chat-wrapper" +
      (this.config.layout === "compact" ? " compact" : "") +
      (this.minimized ? " minimized" : "");

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

      // Typing bubble while the mirror works on a reply
      if (this.thinking) {
        const typingDiv = document.createElement("div");
        typingDiv.className = "chat-message assistant-message chat-typing";
        typingDiv.setAttribute("aria-label", "Mirror is typing");
        typingDiv.innerHTML = "<span></span><span></span><span></span>";
        messagesContainer.appendChild(typingDiv);
      }

      scrollArea.appendChild(messagesContainer);
      wrapper.appendChild(scrollArea);

      // Scrolling the history counts as activity
      scrollArea.addEventListener("scroll", () => this.resetIdleTimer(), { passive: true });

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
    else if (this.thinking) {
      statusDiv.textContent = "Thinking…";
      statusDiv.classList.add("thinking");
    }
    else if (this.micState === "processing") {
      statusDiv.textContent = "Processing…";
      statusDiv.classList.add("processing");
    }
    else {
      // Animated sound bars show the mirror is listening
      statusDiv.classList.add("listening");
      statusDiv.innerHTML =
        '<span class="chat-wave"><span></span><span></span><span></span><span></span></span>' +
        "<span>Listening</span>";
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

    // Touching the chat counts as activity
    wrapper.addEventListener("pointerdown", () => this.resetIdleTimer());

    return wrapper;

  },

  // Load module CSS
  getStyles: function () {
    return ["MMM-Chat.css"];
  }

});
