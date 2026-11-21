Module.register("MMM-Custom-Calendar", {
    // config defaults
    default: {
        maxEvents: 5,
        // updates calendar every 10 minutes
        updateInterval: 10 * 60 * 1000 
    },

    // runs when module starts
    start: function() {
        console.log("MMM-Custom-Calendar started"); // for debugging 
        this.events = [];
        this.loaded = false;

        // requests events
        this.fetchEvents();

        setInterval(() => {
            this.fetchEvents();
        }, this.config.updateInterval);
    },

    // notifies helper to get calendar events
    fetchEvents: function() {
        this.sendSocketNotification("GET_CALENDAR_EVENTS", {
            maxEvents: this.config.maxEvents
        });
    },

    // waits for reply notif from request
    socketNotificationReceived: function (notification, payload) {
        if (notification === "CALENDAR_EVENTS_RESULT") {
            // loads events into list
            this.events = payload.events || [];
            this.loaded = true;

            // refreshes screen
            this.updateDom();

        // if helper fails
        } else if (notification === "CALENDAR_EVENTS_ERROR") {
            console.error("Calendar error:", payload.error);
            // clears event list
            this.events = [];
            this.loaded = true;

            // refreshes screen
            this.updateDom();
        }
      },

      getDom: function() {
        const wrapper = document.createElement("div");

        if (!this.loaded) {
            wrapper.innerHTML = "Loading calendar...";
            return wrapper;
        }

        if (this.events.length === 0) {
            wrapper.innerHTML = "No upcoming events";
            return wrapper;
        }

        // for each existing event, styling is prepped
        this.events.forEach((event) => {
            const eventDiv = document.createElement("div");
            eventDiv.className = "calendar-event";

            const title = document.createElement("div");
            title.className = "event-title";
            title.innerHTML = event.title;

            const time = document.createElement("div");
            time.className = "event-time";
            time.innerHTML = event.start;

            eventDiv.appendChild(title);
            eventDiv.appendChild(time);
            wrapper.appendChild(eventDiv);
        });

        return wrapper;
      },
      
      // loads css file
      getStyles: function() {
        return ["MMM-Custom-Calendar.css"];
      }
});