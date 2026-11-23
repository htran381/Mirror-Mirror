/* Task queries (To-Do list)
 * Read and change rows in the tasks table. Used by MMM-Todo (display, tap to
 * complete, undo) and by the MCP to-do tools (chat requests).
 *
 * Changing a task (complete, cancel, edit) only works while it is open, so
 * a finished or removed task can't be changed by mistake.
 */

const db = require("../index.js");

// Creates an open task. Only `title` is required; kind, priority, owner and source have defaults. Returns the new task_id.
function addTask(userId, sessionId, task) {
    //turning tasks into js objects + setting defaults
    const {
        title,
        kind = "other",
        priority = "other",
        owner = "user",
        source = "stated",
        dueAt = null,
        remindAt = null,
        binId = null,
        choiceId = null,
        optionId = null,
        position = null,
    } = task;

    const added_task = db.prepare(
        `
            INSERT INTO tasks (user_id, bin_id, choice_id, option_id, title, kind, priority, position, owner, due_at, remind_at, status, source, created_session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)

        `
    ).run(userId, binId, choiceId, optionId, title, kind, priority, position, owner, dueAt, remindAt, source, sessionId);

    return added_task.lastInsertRowid;
}

// Returns the user's open tasks in To-Do order: urgent_important, urgent, other; then by position; then oldest first.
function getTodoList(userId) {
    const todo_array = db.prepare(
        `
        SELECT * FROM tasks
        WHERE user_id = ? AND status = 'open'
        ORDER BY 
            CASE priority
                WHEN 'urgent_important' THEN 0
                WHEN 'urgent' THEN 1
                ELSE 2
            END,
        position IS NULL,
        position,
        created_at,
        task_id
        `

    ).all(userId);

    return todo_array;
}

// Marks a task done and records which session it was completed in. Returns 1 if updated, 0 if the id wasn't found.
function completeTask(taskId, sessionId) {
    const changes = db.prepare(
        `
        UPDATE tasks SET status = 'done', completed_session_id = ?, updated_at = datetime('now','localtime')
        WHERE task_id = ? AND status = 'open'
        `

    ).run(sessionId, taskId);
    return changes.changes;
}

// Marks a task cancelled (the row is kept). Returns 1 if updated, 0 if the id wasn't found.
function cancelTask(taskId) {
    const changes = db.prepare(
        `
        UPDATE tasks SET status = 'cancelled', updated_at = datetime('now','localtime')
        WHERE task_id = ? AND status = 'open'
        `

    ).run(taskId);
    return changes.changes;
}



// Edits an open task. Pass only the fields to change: title, priority, kind,
// dueAt (null clears the due date). Returns 1 if updated, 0 if not found or not open.
function updateTask(taskId, changes) {
    const columns = { title: "title", priority: "priority", kind: "kind", dueAt: "due_at" };
    const fields = Object.keys(columns).filter(key => changes[key] !== undefined);

    if (fields.length === 0) {
        return 0;
    }

    const assignments = fields.map(key => `${columns[key]} = ?`).join(", ");
    const values = fields.map(key => changes[key]);

    const updated = db.prepare(
        `
        UPDATE tasks SET ${assignments}, updated_at = datetime('now','localtime')
        WHERE task_id = ? AND status = 'open'
        `
    ).run(...values, taskId);
    return updated.changes;
}

// Puts a done or cancelled task back on the list (used by Undo on the mirror). Returns 1 if updated, 0 if not.
function reopenTask(taskId) {
    const changes = db.prepare(
        `
        UPDATE tasks SET status = 'open', completed_session_id = NULL, updated_at = datetime('now','localtime')
        WHERE task_id = ? AND status IN ('done', 'cancelled')
        `

    ).run(taskId);
    return changes.changes;
}

// Same order as getTodoList, plus the linked choice and option (if any) for display on the mirror.
function getTodoListWithLinks(userId) {
    return db.prepare(
        `
        SELECT tasks.task_id, tasks.title, tasks.kind, tasks.priority, tasks.position,
               tasks.owner, tasks.due_at, tasks.status,
               tasks.choice_id, choices.description AS choice_name, choices.status AS choice_status,
               tasks.option_id, options.description AS option_name
        FROM tasks
        LEFT JOIN choices ON choices.choice_id = tasks.choice_id
        LEFT JOIN options ON options.option_id = tasks.option_id
        WHERE tasks.user_id = ? AND tasks.status = 'open'
        ORDER BY
            CASE tasks.priority
                WHEN 'urgent_important' THEN 0
                WHEN 'urgent' THEN 1
                ELSE 2
            END,
        tasks.position IS NULL,
        tasks.position,
        tasks.created_at,
        tasks.task_id
        `
    ).all(userId);
}

module.exports = { addTask, getTodoList, completeTask, cancelTask, reopenTask, getTodoListWithLinks, updateTask, };