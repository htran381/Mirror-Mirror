const axios = require("axios");

// Track availability of both AI models
const availability = {
  LOCAL: false,
  CLAUDE: false
};

let healthInterval = null;


// Check availability of both AI models
async function checkModels() {

  // Check Ollama server and installed model
  const checkLocal = async () => {

    try {

      const response = await axios.get(
        "http://localhost:11434/api/tags",
        { timeout: 2000 }
      );

      availability.LOCAL = response.data.models.some(
        model => model.name === "qwen2.5:1.5b"
      );

    } catch (error) {

      availability.LOCAL = false;

    }

  };

  // Check whether Claude is configured
  const checkClaude = () => {

    availability.CLAUDE = Boolean(process.env.API_KEY?.trim());

  };

  // Check both services
  await Promise.all([checkLocal(), checkClaude()]);

}


// Start model health monitoring
function startHealthChecks() {

  // Prevent multiple monitoring intervals
  if (healthInterval) {
    return;
  }

  // Check availability immediately
  checkModels();

  // Periodically check whether models have come online
  healthInterval = setInterval(checkModels, 5000);

}


// Return the latest model availability
function getAvailability() {
  return { ...availability };
}


module.exports = {
  startHealthChecks,
  getAvailability
};