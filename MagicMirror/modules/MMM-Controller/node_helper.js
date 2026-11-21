const NodeHelper = require("node_helper");
const { spawn } = require("child_process");
const path = require("path");

module.exports = NodeHelper.create({
  // Runs when the NodeHelper starts
  start: function () {
    console.log("Offline speech helper started");
  },

  // Receives messages from the front-end module
  socketNotificationReceived: function (notification) {
    if (notification === "START") {
      this.listen(); // Begin listening for audio
    }
  },

  // Checks if the spoken text contains the wake phrase
  isWakePhrase: function (text) {
    return (
      text.includes("mirror mirror") ||
      text.includes("mira mira") ||
      text.includes("mirra mirra") ||
      text.includes("mirror mira") ||
      text.includes("mera mira")
    );
  },

  // Main function to record audio and process speech
  listen: function () {
    const audioFile = path.resolve(__dirname, "audio.wav");

    // Record audio using SoX (microphone input)
    const rec = spawn("sox", [
      "-d",          // input device (default mic)
      "-r", "16000", // sample rate
      "-c", "1",     // mono audio
      audioFile,
      "silence",     // auto-stop on silence
      "1", "0.1", "1%",
      "1", "1.0", "1%",
      "trim", "0", "6" // max 6 seconds
    ]);

    // After recording finishes
    rec.on("close", () => {
      // Path to whisper executable
      const whisperPath = path.resolve(
        __dirname,
        "../../../whisper.cpp/build/bin/whisper-cli"
      );

      // Path to the speech model
      const modelPath = path.resolve(
        __dirname,
        "../../../whisper.cpp/models/ggml-base.en.bin"
      );

      // Run Whisper to transcribe audio
      const whisper = spawn(whisperPath, [
        "-m",
        modelPath,
        "-f",
        audioFile,
        "-nt" // no timestamps
      ]);

      let output = "";

      // Collect transcription output
      whisper.stdout.on("data", (data) => {
        output += data.toString();
      });

      // When transcription is done
      whisper.on("close", () => {
        let text = output.trim().toLowerCase();

        // If nothing was heard, restart listening
        if (!text) {
          setTimeout(() => this.listen(), 500);
          return;
        }

        console.log("Heard:", text);

        // Normalize text (remove punctuation)
        const normalized = text
          .replace(/[.,!?]/g, "")
          .trim();

        // Ignore if wake phrase not detected
        if (!this.isWakePhrase(normalized)) {
          setTimeout(() => this.listen(), 500);
          return;
        }

        // Remove wake phrase to get actual command
        let command = normalized
          .replace("mirror mirror", "")
          .replace("mira mira", "")
          .replace("mirra mirra", "")
          .replace("mirror mira", "")
          .replace("mera mira", "")
          .trim();

        // If only wake phrase was spoken, keep listening
        if (!command) {
          console.log("Wake phrase only");
          setTimeout(() => this.listen(), 500);
          return;
        }

        const finalCommand = command;

        // Send recognized text to front-end
        this.sendSocketNotification("TEXT", finalCommand);

        // Handle specific commands and trigger actions
        if (finalCommand.includes("show all")) {
          console.log("showing all");
          this.sendSocketNotification("ACTION", "SHOW_ALL");
        }

        if (finalCommand.includes("show weather")) {
          console.log("showing weather");
          this.sendSocketNotification("ACTION", "SHOW_WEATHER");
        }

        if (finalCommand.includes("show news")) {
          console.log("showing news");
          this.sendSocketNotification("ACTION", "SHOW_NEWS");
        }

        if (finalCommand.includes("show calendar")) {
          console.log("showing calendar");
          this.sendSocketNotification("ACTION", "SHOW_CALENDAR");
        }

        // Restart listening loop
        setTimeout(() => this.listen(), 500);
      });
    });
  }
});