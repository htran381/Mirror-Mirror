import { createRequire } from "node:module"
import { z } from "zod"
import type { MCPPlugin } from "./plugin.js"

const require = createRequire(import.meta.url)

const choicePlugin: MCPPlugin = {
  name: "choice",

  async register(server) {
    // List choice summaries without loading their options.
    server.tool(
      "mirror.choice.list",
      "List saved choice summaries for one status. Use when the user asks to list their choices. Defaults to active choices.",
      { status: z.enum(["active", "decided", "implemented", "dropped"]).optional() },
      async ({ status }) => {
        try {
          const { listChoices } = require("../../../MagicMirror/db/queries/choices.js")
          const choices = listChoices(status)
          return { content: [{ type: "text", text: JSON.stringify(choices) }] }
        } catch (error) {
          console.error("Choice list failed:", error)
          return {
            content: [{ type: "text", text: "Could not list saved choices." }],
            isError: true
          }
        }
      }
    )

    // Find saved choices that mention a word or phrase.
    server.tool(
      "mirror.choice.search",
      "Find up to five saved choice summaries across all statuses when the current request may relate to a past choice. Open a relevant match by ID if more detail is needed.",
      {
        query: z.string().trim().min(1)
          .describe("A word or short phrase related to the current request")
      },
      async ({ query }) => {
        try {
          const { searchChoices } = require("../../../MagicMirror/db/queries/choices.js")
          const choices = searchChoices(query)
          return { content: [{ type: "text", text: JSON.stringify(choices) }] }
        } catch (error) {
          console.error("Choice search failed:", error)
          return {
            content: [{ type: "text", text: "Could not search saved choices." }],
            isError: true
          }
        }
      }
    )

    // Load one saved choice and its options.
    server.tool(
      "mirror.choice.get",
      "Open a saved choice by ID in any status. Show dropped options only when the user asks for them.",
      { choiceId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) },
      async ({ choiceId }) => {
        try {
          const { getChoiceDetails } = require("../../../MagicMirror/db/queries/choices.js")
          const choice = getChoiceDetails(choiceId)
          return { content: [{ type: "text", text: JSON.stringify(choice) }] }
        } catch (error) {
          console.error("Choice lookup failed:", error)
          return {
            content: [{ type: "text", text: "Could not open the saved choice for that ID." }],
            isError: true
          }
        }
      }
    )

    // Save a new choice and return its ID.
    server.tool(
      "mirror.choice.create",
      "Create a saved choice after the user explicitly asks to create one or confirms a suggestion to create one.",
      {
        name: z.string().trim().min(1).describe("A short name based on the user's description"),
        context: z.string().optional().describe("Context or constraints provided by the user")
      },
      async ({ name, context }) => {
        try {
          const { createChoice } = require("../../../MagicMirror/db/queries/choices.js")
          const choiceId = createChoice({ name, context })
          return {
            content: [{ type: "text", text: JSON.stringify({ choice_id: choiceId }) }]
          }
        } catch (error) {
          console.error("Choice creation failed:", error)
          return {
            content: [{ type: "text", text: "Could not create the choice." }],
            isError: true
          }
        }
      }
    )

    // Save changes to an active choice.
    server.tool(
      "mirror.choice.update",
      "Update an active choice after the user requests the edit or confirms a suggested change. Omit fields to keep them unchanged.",
      {
        choiceId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        name: z.string().trim().min(1).optional(),
        context: z.string().nullable().optional()
          .describe("Replacement context, including any constraints. Pass null to clear it."),
        helpfulInfo: z.string().nullable().optional()
          .describe("Replacement helpful information. Pass null to clear it.")
      },
      async ({ choiceId, name, context, helpfulInfo }) => {
        if (name === undefined && context === undefined && helpfulInfo === undefined) {
          return {
            content: [{ type: "text", text: "Provide a name, context, or helpful information to update." }],
            isError: true
          }
        }

        try {
          const { updateChoice } = require("../../../MagicMirror/db/queries/choices.js")
          const choice = updateChoice(choiceId, { name, context, helpfulInfo })
          return { content: [{ type: "text", text: JSON.stringify(choice) }] }
        } catch (error) {
          console.error("Choice update failed:", error)
          return {
            content: [{ type: "text", text: "Could not update the active choice for that ID." }],
            isError: true
          }
        }
      }
    )
    // Drop a choice and keep it for later.
    server.tool(
      "mirror.choice.drop",
      "Drop an active or decided choice when the user asks to discontinue it. Keep the choice and its options for later.",
      { choiceId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) },
      async ({ choiceId }) => {
        try {
          const { dropChoice } = require("../../../MagicMirror/db/queries/choices.js")
          const choice = dropChoice(choiceId)
          return { content: [{ type: "text", text: JSON.stringify(choice) }] }
        } catch (error) {
          console.error("Choice drop failed:", error)
          return {
            content: [{ type: "text", text: "Could not drop the choice. Only active or decided choices can be dropped." }],
            isError: true
          }
        }
      }
    )

    // Reopen a choice so the user can work on it again.
    server.tool(
      "mirror.choice.reopen",
      "Reopen a decided or dropped choice when the user asks to resume it.",
      { choiceId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) },
      async ({ choiceId }) => {
        try {
          const { reopenChoice } = require("../../../MagicMirror/db/queries/choices.js")
          const choice = reopenChoice(choiceId)
          return { content: [{ type: "text", text: JSON.stringify(choice) }] }
        } catch (error) {
          console.error("Choice reopen failed:", error)
          return {
            content: [{ type: "text", text: "Could not reopen the choice. Only decided or dropped choices can be reopened." }],
            isError: true
          }
        }
      }
    )
    // Delete a saved choice after the user confirms.
    server.tool(
      "mirror.choice.delete",
      "Permanently delete a choice and its options. Call only after the user explicitly requests deletion and confirms which choice to delete.",
      {
        choiceId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        confirmed: z.literal(true).describe("The user explicitly confirmed permanent deletion of this choice")
      },
      async ({ choiceId, confirmed }) => {
        try {
          const { deleteChoice } = require("../../../MagicMirror/db/queries/choices.js")
          const result = deleteChoice(choiceId, { confirmed })
          return { content: [{ type: "text", text: JSON.stringify(result) }] }
        } catch (error) {
          console.error("Choice deletion failed:", error)
          return {
            content: [{ type: "text", text: "Could not delete the saved choice for that ID." }],
            isError: true
          }
        }
      }
    )
    // Save an option and return its ID.
    server.tool(
      "mirror.choice.option.create",
      "Add an option to an active choice when the user asks to save it. If Claude suggested the option, ask the user to confirm before calling this tool.",
      {
        choiceId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        description: z.string().trim().min(1).describe("The option description the user wants to save")
      },
      async ({ choiceId, description }) => {
        try {
          const { createOption } = require("../../../MagicMirror/db/queries/choices.js")
          const optionId = createOption(choiceId, { description })
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ choice_id: choiceId, option_id: optionId })
            }]
          }
        } catch (error) {
          console.error("Option creation failed:", error)
          return {
            content: [{ type: "text", text: "Could not add the option to the active choice for that ID." }],
            isError: true
          }
        }
      }
    )
    // Save a new description for an existing option.
    server.tool(
      "mirror.choice.option.update",
      "Update an option's description after the user requests the edit or confirms a suggested change. If it has saved outcomes, pros, or cons, encourage the user to revisit them after the edit succeeds.",
      {
        optionId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        description: z.string().trim().min(1).describe("The replacement description")
      },
      async ({ optionId, description }) => {
        try {
          const { updateOptionDescription } = require("../../../MagicMirror/db/queries/choices.js")
          const option = updateOptionDescription(optionId, { description })
          return { content: [{ type: "text", text: JSON.stringify(option) }] }
        } catch (error) {
          console.error("Option description update failed:", error)
          return {
            content: [{ type: "text", text: "Could not update the option description for that ID." }],
            isError: true
          }
        }
      }
    )

    // Drop an option and keep its saved details.
    server.tool(
      "mirror.choice.option.drop",
      "Drop an option from an active choice when the user asks to stop considering it. Keep its saved details.",
      { optionId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) },
      async ({ optionId }) => {
        try {
          const { dropOption } = require("../../../MagicMirror/db/queries/choices.js")
          const option = dropOption(optionId)
          return { content: [{ type: "text", text: JSON.stringify(option) }] }
        } catch (error) {
          console.error("Option drop failed:", error)
          return {
            content: [{ type: "text", text: "Could not drop the option for that ID." }],
            isError: true
          }
        }
      }
    )

    // Put a dropped option back into consideration.
    server.tool(
      "mirror.choice.option.restore",
      "Restore a dropped option on an active choice when the user asks to consider it again.",
      { optionId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) },
      async ({ optionId }) => {
        try {
          const { restoreOption } = require("../../../MagicMirror/db/queries/choices.js")
          const option = restoreOption(optionId)
          return { content: [{ type: "text", text: JSON.stringify(option) }] }
        } catch (error) {
          console.error("Option restore failed:", error)
          return {
            content: [{ type: "text", text: "Could not restore the option for that ID." }],
            isError: true
          }
        }
      }
    )
    // Delete an option after the user confirms.
    server.tool(
      "mirror.choice.option.delete",
      "Permanently delete an option from an active choice. Call only after the user explicitly requests permanent deletion and confirms which option to delete.",
      {
        optionId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        confirmed: z.literal(true).describe("The user explicitly confirmed permanent deletion of this option")
      },
      async ({ optionId, confirmed }) => {
        try {
          const { deleteOption } = require("../../../MagicMirror/db/queries/choices.js")
          const result = deleteOption(optionId, { confirmed })
          return { content: [{ type: "text", text: JSON.stringify(result) }] }
        } catch (error) {
          console.error("Option deletion failed:", error)
          return {
            content: [{ type: "text", text: "Could not delete the saved option for that ID." }],
            isError: true
          }
        }
      }
    )

    // Save or clear an option's evaluation.
    server.tool(
      "mirror.choice.option.evaluate",
      "Save possible outcomes, pros, or cons the user provides. Ask for confirmation before saving anything Claude suggests or infers. Omit fields to keep their saved text.",
      {
        optionId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        outcomes: z.string().nullable().optional()
          .describe("Replacement text for possible outcomes. Pass null to clear it."),
        pros: z.string().nullable().optional()
          .describe("Replacement text for advantages. Pass null to clear it."),
        cons: z.string().nullable().optional()
          .describe("Replacement text for disadvantages. Pass null to clear it.")
      },
      async ({ optionId, outcomes, pros, cons }) => {
        if (outcomes === undefined && pros === undefined && cons === undefined) {
          return {
            content: [{ type: "text", text: "Provide outcomes, pros, or cons to update." }],
            isError: true
          }
        }

        try {
          const { updateOptionEvaluation } = require("../../../MagicMirror/db/queries/choices.js")
          const option = updateOptionEvaluation(optionId, { outcomes, pros, cons })
          return { content: [{ type: "text", text: JSON.stringify(option) }] }
        } catch (error) {
          console.error("Option evaluation update failed:", error)
          return {
            content: [{ type: "text", text: "Could not update the evaluation for that option." }],
            isError: true
          }
        }
      }
    )

    // Record the option the user selected.
    server.tool(
      "mirror.choice.decision.record",
      "Record the user's decision after they explicitly select an option or confirm an inferred selection. Never choose an option for the user.",
      {
        choiceId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        optionId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        confirmed: z.literal(true)
          .describe("The user explicitly selected or confirmed this option")
      },
      async ({ choiceId, optionId, confirmed }) => {
        try {
          const { recordDecision } = require("../../../MagicMirror/db/queries/choices.js")
          const decision = recordDecision(choiceId, optionId, { confirmed })
          return { content: [{ type: "text", text: JSON.stringify(decision) }] }
        } catch (error) {
          console.error("Decision recording failed:", error)
          return {
            content: [{ type: "text", text: "Could not record the decision for that choice and option." }],
            isError: true
          }
        }
      }
    )

    // Mark a decision implemented after the user confirms they acted on it.
    server.tool(
      "mirror.choice.decision.implement",
      "Mark a decided choice implemented after the user says they acted on it. If the action is inferred, ask the user to confirm before calling this tool.",
      {
        choiceId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        confirmed: z.literal(true)
          .describe("The user confirmed they acted on this decision")
      },
      async ({ choiceId, confirmed }) => {
        try {
          const { markDecisionImplemented } = require("../../../MagicMirror/db/queries/choices.js")
          const decision = markDecisionImplemented(choiceId, { confirmed })
          return { content: [{ type: "text", text: JSON.stringify(decision) }] }
        } catch (error) {
          console.error("Decision implementation update failed:", error)
          return {
            content: [{ type: "text", text: "Could not mark the decision implemented for that choice." }],
            isError: true
          }
        }
      }
    )
  }
}

export default choicePlugin
