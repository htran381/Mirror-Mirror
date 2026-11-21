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
        WHERE task_id = ?
        `

    ).run(sessionId, taskId);
    return changes.changes;
}

// Marks a task cancelled (the row is kept). Returns 1 if updated, 0 if the id wasn't found.
function cancelTask(taskId) {
    const changes = db.prepare(
        `
        UPDATE tasks SET status = 'cancelled', updated_at = datetime('now','localtime')
        WHERE task_id = ?
        `

    ).run(taskId);
    return changes.changes;
}



module.exports = { addTask, getTodoList, completeTask, cancelTask, };