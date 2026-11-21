const axios = require("axios");

// Send a prompt to the local Ollama model and return its response
async function askLocal(prompt) {

  try {

    // Make a request to the Ollama generate API
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "qwen2.5:1.5b", // Local model name
        prompt: prompt, // Prompt with conversation history
        stream: false // Return full response
      }
    );

    return response.data.response.trim();

  } catch (err) {

    return "Sorry, I couldn't process that.";

  }

}

module.exports = askLocal;