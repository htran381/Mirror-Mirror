import { createRequire } from "node:module"
import { z } from "zod"
import type { MCPPlugin } from "./plugin.js"

const require = createRequire(import.meta.url)

const DB = "../../../MagicMirror/db"
const id = () => z.number().int().min(1).max(Number.MAX_SAFE_INTEGER)

// Current default user and active session (tasks record which session created/completed them)
function currentUserAndSession() {
  const { getDefaultUser } = require(`${DB}/queries/users.js`)
  const { getActiveSession } = require(`${DB}/queries/sessions.js`)
  const session = getActiveSession()
  return { userId: getDefaultUser(), sessionId: session ? session.session_id : null }
}

// Tell the user-facing reply what happened, or report a failure
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] }
}

function fail(message: string, error: unknown) {
  console.error(message, error)
  return { content: [{ type: "text" as const, text: message }], isError: true }
}

const todoPlugin: MCPPlugin = {
  name: "todo",

  async register(server) {
    // List open tasks, priority first, with any linked choice and option.
    server.tool(
      "mirror.todo.list",
      "List the user's open to-do tasks in display order (urgent and important, urgent, other). Each task includes its ID, due date and any linked choice or option.",
      {},
      async () => {
        try {
          const { getTodoListWithLinks } = require(`${DB}/queries/tasks.js`)
          const { userId } = currentUserAndSession()
          return ok(getTodoListWithLinks(userId))
        } catch (error) {
          return fail("Could not load the to-do list.", error)
        }
      }
    )

    // Add a task, optionally linked to a saved choice (one-way choice -> task link).
    server.tool(
      "mirror.todo.add",
      "Add a task to the user's to-do list when they ask. Only the title is required. Use priority only when the user says it is urgent or important. Link a saved choice or option only when the task is for that choice.",
      {
        title: z.string().trim().min(1).max(200),
        priority: z.enum(["urgent_important", "urgent", "other"]).optional()
          .describe("urgent_important = urgent and important, urgent = urgent only, other = default"),
        kind: z.enum(["exam", "assignment", "presentation", "meeting", "application", "other"]).optional(),
        dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/).optional()
          .describe("Due date as YYYY-MM-DD or YYYY-MM-DD HH:MM, only if the user gave one"),
        choiceId: id().optional().describe("Saved choice this task is for"),
        optionId: id().optional().describe("Option of that choice this task is for")
      },
      async ({ title, priority, kind, dueAt, choiceId, optionId }) => {
        try {
          const { addTask } = require(`${DB}/queries/tasks.js`)
          const db = require(`${DB}/index.js`)

          // An option link must belong to the linked choice
          if (optionId !== undefined) {
            const option = db.prepare("SELECT choice_id FROM options WHERE option_id = ?").get(optionId)
            if (!option) {
              return fail("That option was not found.", optionId)
            }
            if (choiceId !== undefined && option.choice_id !== choiceId) {
              return fail("That option belongs to a different choice.", { choiceId, optionId })
            }
            choiceId = option.choice_id
          }

          const { userId, sessionId } = currentUserAndSession()
          const taskId = addTask(userId, sessionId, { title, priority, kind, dueAt, choiceId, optionId })
          return ok({ taskId, title })
        } catch (error) {
          return fail("Could not add the task.", error)
        }
      }
    )

    // Edit an open task: rename it or change its priority, kind or due date.
    server.tool(
      "mirror.todo.edit",
      "Edit an open task when the user asks: rename it, or change its priority, kind or due date. Pass only the fields to change. Set dueAt to null to remove the due date. List tasks first if the task ID is unknown.",
      {
        taskId: id(),
        title: z.string().trim().min(1).max(200).optional(),
        priority: z.enum(["urgent_important", "urgent", "other"]).optional(),
        kind: z.enum(["exam", "assignment", "presentation", "meeting", "application", "other"]).optional(),
        dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/).nullable().optional()
          .describe("New due date as YYYY-MM-DD or YYYY-MM-DD HH:MM, or null to remove it")
      },
      async ({ taskId, title, priority, kind, dueAt }) => {
        try {
          if ([title, priority, kind, dueAt].every(value => value === undefined)) {
            return fail("Nothing to change was given.", taskId)
          }
          const { updateTask } = require(`${DB}/queries/tasks.js`)
          const changed = updateTask(taskId, { title, priority, kind, dueAt })
          return changed
            ? ok({ taskId, updated: { title, priority, kind, dueAt } })
            : fail("That task is not open.", taskId)
        } catch (error) {
          return fail("Could not edit the task.", error)
        }
      }
    )

    // Mark a task done when the user says they finished it.
    server.tool(
      "mirror.todo.complete",
      "Mark an open task done after the user says they finished it. List tasks first if the task ID is unknown.",
      { taskId: id() },
      async ({ taskId }) => {
        try {
          const { completeTask } = require(`${DB}/queries/tasks.js`)
          const { sessionId } = currentUserAndSession()
          const changed = completeTask(taskId, sessionId)
          return changed ? ok({ taskId, status: "done" }) : fail("That task is not open.", taskId)
        } catch (error) {
          return fail("Could not mark the task done.", error)
        }
      }
    )

    // Remove a task the user no longer needs (kept in the database as cancelled).
    server.tool(
      "mirror.todo.remove",
      "Remove a task from the to-do list after the user explicitly asks or confirms. The task is kept as cancelled, not deleted.",
      {
        taskId: id(),
        confirmed: z.literal(true).describe("The user asked for or confirmed the removal")
      },
      async ({ taskId }) => {
        try {
          const { cancelTask } = require(`${DB}/queries/tasks.js`)
          const changed = cancelTask(taskId)
          return changed ? ok({ taskId, status: "cancelled" }) : fail("That task is not open.", taskId)
        } catch (error) {
          return fail("Could not remove the task.", error)
        }
      }
    )
  }
}

export default todoPlugin
