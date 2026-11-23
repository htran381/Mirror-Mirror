/* Router
 * Decides which model handles each request: the local model for quick
 * questions, or Claude with a tool mode (MCP, CHOICE, HISTORY, TODO).
 * The TODO label sends to-do list requests (add, list, edit, finish,
 * remove) to Claude with the to-do tools.
 */

const askLocal = require("./local");
const { askClaude } = require("./claude");

const memory = require("./memory");
const health = require("./health");


// Routes user conversation through the conversation pipeline
async function route(command, onRouteSelected) {

  // Store conversation in memory
  memory.addUserMessage(command);

  // Build a prompt with recent conversation history
  const prompt = memory.buildPrompt(command);
  const model = await chooseModel(command, prompt);

  console.log("Model selected:", model);

  let response;

  // Route module commands to Claude with MCP tools
  if (model === "MCP") {

    console.log("Routing to Claude with MCP");

    // Use only the current command to avoid outdated module states
    response = await askClaude(command, true);

  }

  // To-Do list requests use the to-do tools
  else if (model === "TODO") {
    response = await askClaude(prompt, true, "todo");
  }

  // Use read-only tools when the user is asking about a past choice.
  else if (model === "CHOICE" || model === "HISTORY") {
    const toolMode = model === "HISTORY" ? "history" : "choice";
    response = await askClaude(prompt, true, toolMode);
  }

  // Route to Claude
  else if (model === "CLAUDE") {

    console.log("Routing to Claude");

    response = await askClaude(prompt);

  }

  // Route to local model
  else if (model === "LOCAL") {

    console.log("Routing to local model");

    response = await askLocal(prompt);

    // Reroute to Claude if there is an issue with the local model
    if (response == "Sorry, I couldn't process that." && health.getAvailability().CLAUDE) {
      console.log("Error with local model, routing to Claude");
      response = await askClaude(prompt);
    }

  }

  // Neither model is available
  else {

    console.log("Neither AI model is available");

    if (process.env.MOCK_MODE === "true") {

      console.log("Using mock response");

      if (command.toLowerCase().includes("hello")) {
        response = "Hello! How can I help you?";
      }

      else if (command.toLowerCase().includes("cpu")) {
        response = "A CPU fetches, decodes, and executes instructions.";
      }

      else {
        response = "Notice: This is a simulated response because local and cloud-based models are not available right now";
      }

    }
    else {

      response = "Error: Sorry, neither AI model is currently available.";

    }

  }

  // Save the assistant reply to memory
  memory.addAssistantMessage(response);
  onRouteSelected?.(model);

  return response;

}


// Uses Claude to decide which model should handle the request
async function chooseModel(command, conversation) {

  // Check model availability before routing
  const availability = health.getAvailability();

  // Neither model is available
  if (!availability.CLAUDE && !availability.LOCAL) {
    return "UNAVAILABLE";
  }

  // Keep routing prompt small to reduce tokens and latency
  const routingPrompt = `
    Choose LOCAL for simple requests that do not require controlling MagicMirror modules.
    Choose CLAUDE for explanation questions, complex reasoning, coding, research, analysis, or calculations.
    Choose MCP if the user wants to control MagicMirror modules, such as showing, hiding, listing, or moving modules.
    These requests must use MCP even if they include simple greetings or questions.

    Choose CHOICE when the user wants help making a decision, managing a saved
    choice, or responding to a Choice Support question.
    Choose CHOICE when the user says they need to choose between options,
    even for a small everyday decision.
    Choose HISTORY when a question would benefit from recalling a relevant
    saved choice, option, evaluation, or decision and the user is not asking
    to change a record or work through a decision.
    Route questions about what the user previously picked or decided to HISTORY.
    Choose TODO when the user wants to add, list, edit, finish, or remove items
    on their to-do list, such as "add call the dentist to my to-do list",
    "make the lab report urgent", or "what's on my to-do list".
    If the request includes "Selected to-do task" and asks to edit or change
    it, or just says "edit", choose TODO. A to-do request about a saved choice that does
    not change the choice itself is still TODO.
    Moving, showing, or hiding the to-do list or the chat on the screen is
    MCP, not TODO, for example "move my to-do list to the top right".
    Use the recent conversation to resolve references and short confirmations.
    Classify only the current request. A past choice discussion alone does not
    make a new request a Choice Support request.

    Reply with exactly one label: LOCAL, CLAUDE, MCP, CHOICE, HISTORY, or TODO.
    Current request:
    ${command}

    Recent conversation for context:
    ${conversation}
  `;

  // Use local model if Claude is unavailable
  if (!availability.CLAUDE) {
    return "LOCAL";
  }

  try {

    // Ask for routing decision
    const decision = await askClaude(routingPrompt);

    const selectedModel = decision
      .trim()
      .toUpperCase();

    console.log("Claude routing response:", selectedModel);

    if (selectedModel === "CHOICE" || selectedModel === "HISTORY" || selectedModel === "TODO") {
      return selectedModel;
    }

    // Route to MCP if explicitly selected
    if (selectedModel.includes("MCP")) {
      return "MCP";
    }

    // Use Claude if local model is unavailable
    if (!availability.LOCAL) {
      return "CLAUDE";
    }

    // Route to Claude if explicitly selected
    if (selectedModel.includes("CLAUDE")) {
      return "CLAUDE";
    }

    // Otherwise use local model
    return "LOCAL";

  } catch (error) {

    console.error(
      "Claude routing error:",
      error.message
    );

    // Fall back to Claude if local model is unavailable
    return availability.LOCAL ? "LOCAL" : "CLAUDE";

  }

}


module.exports = route;
