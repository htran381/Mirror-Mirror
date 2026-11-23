const NodeHelper = require("node_helper");
const { getTodoListWithLinks, completeTask, reopenTask } = require("../../db/queries/tasks");
const { getActiveSession } = require("../../db/queries/sessions");
const { getDefaultUser } = require("../../db/queries/users");

// MMM-Todo (back end)
// Reads the To-Do list from the database and handles taps from the mirror:
//   GET_TASKS      -> sends the open tasks (TASKS)
//   COMPLETE_TASK  -> checkbox tapped: mark the task done
//   REOPEN_TASK    -> Undo tapped: put the task back on the list
module.exports = NodeHelper.create({

  start() {
    console.log("MMM-Todo helper started");
  },

  // Send the open tasks (with their linked choice/option) to the front end
  sendTasks() {
    try {
      const tasks = getTodoListWithLinks(getDefaultUser());
      this.sendSocketNotification("TASKS", tasks);
    }
    catch (error) {
      console.error("MMM-Todo: could not load tasks", error);
      this.sendSocketNotification("TASKS_ERROR", error.message);
    }
  },

  socketNotificationReceived(notification, payload) {

    if (notification === "GET_TASKS") {
      this.sendTasks();
    }

    // User tapped a task's checkbox (S6: the user marks tasks done)
    if (notification === "COMPLETE_TASK") {
      try {
        const session = getActiveSession();
        completeTask(payload, session ? session.session_id : null);
      }
      catch (error) {
        console.error("MMM-Todo: could not complete task", payload, error);
      }
      this.sendTasks();
    }

    // User tapped Undo
    if (notification === "REOPEN_TASK") {
      try {
        reopenTask(payload);
      }
      catch (error) {
        console.error("MMM-Todo: could not reopen task", payload, error);
      }
      this.sendTasks();
    }

  }

});
