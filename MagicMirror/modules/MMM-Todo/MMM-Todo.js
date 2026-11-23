/* MMM-Todo
 * Shows the user's open tasks from the Mirror Mirror database, priority first
 * (urgent and important, urgent, other), with due dates, MM-owned tasks and
 * links to Choice Support. Tap a task's circle to mark it done.
 */
Module.register("MMM-Todo", {

  defaults: {
    maxItems: 7,              // tasks shown before "+N more"
    updateInterval: 60,       // seconds between refreshes from the database
    undoSeconds: 5,           // how long a completed task stays with an Undo button
    selectSeconds: 60,        // how long a tapped task stays selected for "edit"
    showKind: true            // show "Assignment", "Exam", ... under the title
  },

  PRIORITIES: [
    { key: "urgent_important", label: "Urgent & important" },
    { key: "urgent", label: "Urgent" },
    { key: "other", label: "Other" }
  ],

  KINDS: {
    exam: "Exam",
    assignment: "Assignment",
    presentation: "Presentation",
    meeting: "Meeting",
    application: "Application"
  },

  start: function () {
    this.tasks = [];
    this.loaded = false;
    this.error = null;
    this.justDone = new Map(); // task_id -> { task, index, timer } for Undo
    this.selectedId = null;    // task tapped for editing ("tap an item and say EDIT")

    this.sendSocketNotification("GET_TASKS");

    setInterval(() => {
      this.sendSocketNotification("GET_TASKS");
    }, this.config.updateInterval * 1000);
  },

  // Other modules (e.g. the chat after adding a task) can ask for a refresh
  notificationReceived: function (notification) {
    if (notification === "TASKS_CHANGED") {
      this.sendSocketNotification("GET_TASKS");
    }
  },

  socketNotificationReceived: function (notification, payload) {

    if (notification === "TASKS") {
      this.loaded = true;
      this.error = null;
      this.tasks = this.withJustDone(payload);

      // Keep the selection in sync with the edited list
      const selected = this.tasks.find(task => task.task_id === this.selectedId);
      if (this.selectedId !== null && !selected) {
        this.selectTask(null);
      }
      else if (selected) {
        this.sendNotification("TODO_SELECTED", { task_id: selected.task_id, title: selected.title });
      }

      this.updateDom(0);
    }

    if (notification === "TASKS_ERROR") {
      this.loaded = true;
      this.error = payload;
      this.updateDom(0);
    }

  },

  // Keep just-completed tasks on screen (struck through) until Undo expires
  withJustDone: function (openTasks) {
    const list = openTasks.slice();

    this.justDone.forEach((entry, id) => {
      if (!list.some(task => task.task_id === id)) {
        list.splice(Math.min(entry.index, list.length), 0, entry.task);
      }
    });

    return list;
  },

  completeTask: function (task) {
    if (this.selectedId === task.task_id) {
      this.selectTask(null);
    }

    const index = this.tasks.findIndex(t => t.task_id === task.task_id);

    const timer = setTimeout(() => {
      this.justDone.delete(task.task_id);
      this.tasks = this.tasks.filter(t => t.task_id !== task.task_id);
      this.updateDom(300);
    }, this.config.undoSeconds * 1000);

    this.justDone.set(task.task_id, { task, index, timer });
    this.sendSocketNotification("COMPLETE_TASK", task.task_id);
    this.updateDom(0);
  },

  // Tap a task to select it for editing. Tap again (or wait) to deselect
  selectTask: function (task) {
    clearTimeout(this.selectTimer);
    this.selectedId = task ? task.task_id : null;

    this.sendNotification("TODO_SELECTED", task ? { task_id: task.task_id, title: task.title } : null);

    if (task) {
      this.selectTimer = setTimeout(() => this.selectTask(null), this.config.selectSeconds * 1000);
    }

    this.updateDom(0);
  },

  undoTask: function (task) {
    const entry = this.justDone.get(task.task_id);
    if (entry) {
      clearTimeout(entry.timer);
    }
    this.justDone.delete(task.task_id);
    this.sendSocketNotification("REOPEN_TASK", task.task_id);
    this.updateDom(0);
  },

  getHeader: function () {
    const base = this.data.header || "To-Do";
    const open = this.tasks.filter(task => !this.justDone.has(task.task_id)).length;
    return this.loaded && open > 0 ? `${base} · ${open}` : base;
  },

  // "Overdue", "Due today", "Due tomorrow", "Due Fri", "Due Dec 3"
  dueLabel: function (dueAt) {
    if (!dueAt) {
      return null;
    }

    const due = new Date(dueAt.replace(" ", "T"));
    if (isNaN(due)) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(due);
    dueDay.setHours(0, 0, 0, 0);
    const days = Math.round((dueDay - today) / 86400000);

    if (days < 0) return { text: "Overdue", level: "overdue" };
    if (days === 0) return { text: "Due today", level: "soon" };
    if (days === 1) return { text: "Due tomorrow", level: "soon" };
    if (days < 7) return { text: "Due " + due.toLocaleDateString(undefined, { weekday: "short" }), level: "" };
    return { text: "Due " + due.toLocaleDateString(undefined, { month: "short", day: "numeric" }), level: "" };
  },

  makeTaskRow: function (task) {
    const done = this.justDone.has(task.task_id);
    const mmOwned = task.owner === "mm";

    const row = document.createElement("div");
    const selected = !done && this.selectedId === task.task_id;
    row.className = "todo-task" + (done ? " done" : "") + (mmOwned ? " mm-owned" : "") +
      (selected ? " selected" : "");

    // Checkbox (user tasks only: MM marks its own tasks done when it delivers them)
    if (mmOwned) {
      const badge = document.createElement("div");
      badge.className = "todo-mm-badge";
      badge.textContent = "MM";
      row.appendChild(badge);
    }
    else {
      const check = document.createElement("button");
      check.className = "todo-check";
      check.setAttribute("aria-label", done ? "Done" : "Mark done: " + task.title);
      check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
      if (!done) {
        check.addEventListener("click", event => {
          event.stopPropagation();
          this.completeTask(task);
        });
      }
      row.appendChild(check);
    }

    const body = document.createElement("div");
    body.className = "todo-body";

    const title = document.createElement("div");
    title.className = "todo-title";
    title.textContent = task.title;
    body.appendChild(title);

    // Meta line: due date, kind, plan step, linked choice
    const meta = document.createElement("div");
    meta.className = "todo-meta";

    const due = this.dueLabel(task.due_at);
    if (due) {
      const dueSpan = document.createElement("span");
      dueSpan.className = "todo-due " + due.level;
      dueSpan.textContent = due.text;
      meta.appendChild(dueSpan);
    }

    if (this.config.showKind && this.KINDS[task.kind]) {
      const kind = document.createElement("span");
      kind.textContent = this.KINDS[task.kind];
      meta.appendChild(kind);
    }

    if (task.choice_id) {
      const link = document.createElement("span");
      link.className = "todo-choice";
      const step = task.position ? "Step " + task.position + " · " : "";
      const option = task.option_name && task.option_name !== "Do nothing" ? " · " + task.option_name : "";
      link.textContent = "↳ " + step + (task.choice_name || "Choice") + option;
      if (task.choice_status === "dropped") {
        link.classList.add("dropped");
        link.textContent += " (dropped)";
      }
      meta.appendChild(link);
    }

    if (meta.childNodes.length > 0) {
      body.appendChild(meta);
    }

    // Tapping the text selects the task, so the user can say "Mirror, edit…"
    if (!done) {
      body.addEventListener("click", event => {
        event.stopPropagation();
        this.selectTask(selected ? null : task);
      });
    }

    if (selected) {
      const hint = document.createElement("div");
      hint.className = "todo-hint";
      hint.textContent = "Say \u201CMirror, edit\u201D and the change";
      body.appendChild(hint);
    }

    row.appendChild(body);

    if (done) {
      const undo = document.createElement("button");
      undo.className = "todo-undo";
      undo.textContent = "Undo";
      undo.addEventListener("click", event => {
        event.stopPropagation();
        this.undoTask(task);
      });
      row.appendChild(undo);
    }

    return row;
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "todo";

    if (!this.loaded) {
      wrapper.innerHTML = '<div class="todo-empty dimmed">Loading…</div>';
      return wrapper;
    }

    if (this.error) {
      wrapper.innerHTML = '<div class="todo-empty dimmed">Couldn\'t load your to-do list</div>';
      return wrapper;
    }

    if (this.tasks.length === 0) {
      wrapper.innerHTML = '<div class="todo-empty">All caught up ✓</div>';
      return wrapper;
    }

    let shown = 0;

    this.PRIORITIES.forEach(priority => {
      const tasks = this.tasks.filter(task => task.priority === priority.key);
      if (tasks.length === 0 || shown >= this.config.maxItems) {
        return;
      }

      const section = document.createElement("div");
      section.className = "todo-section " + priority.key;

      const label = document.createElement("div");
      label.className = "todo-section-label";
      label.textContent = priority.label;
      section.appendChild(label);

      tasks.forEach(task => {
        if (shown < this.config.maxItems) {
          section.appendChild(this.makeTaskRow(task));
          shown++;
        }
      });

      wrapper.appendChild(section);
    });

    const hidden = this.tasks.length - shown;
    if (hidden > 0) {
      const more = document.createElement("div");
      more.className = "todo-more";
      more.textContent = "+" + hidden + " more";
      wrapper.appendChild(more);
    }

    return wrapper;
  },

  getStyles: function () {
    return ["MMM-Todo.css"];
  }

});
