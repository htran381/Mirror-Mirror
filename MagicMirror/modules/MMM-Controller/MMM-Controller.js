Module.register("MMM-Controller", {
  // Runs when the module starts
  start: function () {
    console.log("MMM-Controller started");

    // Default text shown on screen
    this.text = "Listening...";

    // Tell the backend (NodeHelper) to start listening
    this.sendSocketNotification("START");

    // Update the UI immediately
    this.updateDom(0);
  },

  // Receives messages from NodeHelper
  socketNotificationReceived: function (notification, payload) {
    console.log("SOCKET RECEIVED:", notification, payload);

    // Update displayed text when speech/text is received
    if (notification === "TEXT") {
      this.text = payload;
      this.updateDom(0);
    }

    // Handle actions (like showing modules)
    if (notification === "ACTION") {
      console.log("Handling ACTION:", payload);

      // Show all main modules
      if (payload === "SHOW_ALL") {
        this.showModules(["weather", "newsfeed", "calendar"]);
      }

      // Show only weather
      if (payload === "SHOW_WEATHER") {
        this.showModules(["weather"]);
      }

      // Show only news
      if (payload === "SHOW_NEWS") {
        this.showModules(["newsfeed"]);
      }

      // Show only calendar
      if (payload === "SHOW_CALENDAR") {
        this.showModules(["calendar"]);
      }
    }
  },

  // Runs when MagicMirror finishes loading all modules
  notificationReceived: function (notification) {
    if (notification === "DOM_OBJECTS_CREATED") {
      console.log("Hiding modules at startup");

      // Modules that should always stay visible
      const alwaysVisible = ["clock", "MMM-Controller", "MMM-Chat"];

      // Hide all other modules
      MM.getModules().enumerate(module => {
        if (!alwaysVisible.includes(module.name)) {
          module.hide(0);
        }
      });
    }
  },

  // Function to show selected modules
  showModules: function (names) {
    console.log("Showing modules:", names);

    MM.getModules().enumerate(module => {
      console.log("Checking:", module.name);

      if (names.includes(module.name)) {
        module.show(1000); // fade in
      }
    });
  },

  // Creates the UI displayed on the mirror
  getDom: function () {
    const wrapper = document.createElement("div");

    wrapper.innerHTML = `
      <div>🎤 Heard:</div>
      <div>${this.text}</div>
    `;

    return wrapper;
  }
});