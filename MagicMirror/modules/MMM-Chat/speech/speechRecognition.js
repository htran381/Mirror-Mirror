const { spawn } = require("child_process");
const path = require("path");

const WAKE_VARIANTS = new Set([
  "mirror",
  "mira",
  "mirra",
  "mera",
  "mayor",
  "mir",
  "mere",
  "mare"
]);

// Find a single wake word variant
function findWakeWord(normalized) {
  const words = normalized.split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {

    if (WAKE_VARIANTS.has(words[i])) {
      return {
        start: i,
        end: i + 1,
        words
      };
    }

  }

  return null;
}

// Main function to record audio and process speech
async function listen(helper) {

  // Muted: stop the loop here. setMuted(false) in node_helper restarts it.
  if (helper.muted) {
    helper.listening = false;
    console.log("Mic muted - listening paused");
    return;
  }

  helper.listening = true;

  // Tell the mirror it is waiting for speech
  helper.reportMicState("listening");

  const audioFile = path.resolve(__dirname, "audio.wav");

  try {

    // Record audio using SoX (microphone input)
    await new Promise((resolve) => {

      const rec = spawn("sox", [
        "-d",          // input device (default mic)
        "-r", "16000", // sample rate
        "-c", "1",     // mono audio
        audioFile,
        "silence",     // auto-stop on silence
        "1", "0.1", "1%",
        "1", "1.0", "1%",
        "trim", "0", "10" // Allow up to 10 seconds for one request.
      ]);

      // Keep a handle so muting can stop the recording immediately
      helper.recorder = rec;

      // After recording finishes
      rec.on("close", () => {
        helper.recorder = null;
        resolve();
      });

    });

    // Muted mid-recording: throw the audio away
    if (helper.muted) {
      helper.listening = false;
      console.log("Mic muted - recording discarded");
      return;
    }

    // Audio captured; Whisper is turning it into text
    helper.reportMicState("processing");

    // Path to whisper executable
    const whisperPath = path.resolve(
      __dirname,
      "../../../../whisper.cpp/build/bin/whisper-cli"
    );

    // Path to the speech model
    const modelPath = path.resolve(
      __dirname,
      "../../../../whisper.cpp/models/ggml-base.en.bin"
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
    whisper.on("close", async () => {

      // Muted while transcribing: ignore what was heard
      if (helper.muted) {
        helper.listening = false;
        console.log("Mic muted - transcription discarded");
        return;
      }

      let text = output.trim().toLowerCase();

      // If nothing was heard, restart listening
      if (
        !text ||
        text.includes("-") ||
        text === "[blank audio]" ||
        text.includes("[blank audio]")
      ) {
        console.log("No valid speech detected");
        setTimeout(() => listen(helper), 500);
        return;
      }

      console.log("Heard:", text);

      // Normalize text (remove punctuation)
      const normalized = text
        .replace(/[.,!?]/g, "")
        .trim();

      // Wake word detection
      const match = findWakeWord(normalized);

      if (!match && !helper.isChoiceFollowUpOpen()) {
        console.log("Wake word not detected");
        setTimeout(() => listen(helper), 500);
        return;
      }

      if (match) {
        console.log("Wake word matched:", match.words[match.start]);
      }

      // Remove the wake word if the user said it.
      const command = match ? [
        ...match.words.slice(0, match.start),
        ...match.words.slice(match.end)
      ].join(" ").trim() : normalized;

      // If only the wake word was spoken, keep listening
      if (!command) {
        console.log("Wake word only");
        setTimeout(() => listen(helper), 500);
        return;
      }

      // Pass recognized text to node_helper
      await helper.handleSpeech(command, Boolean(match));

      // Restart listening loop
      setTimeout(() => listen(helper), 500);

    });

  } catch (err) {

    console.error("Speech recognition error:", err);

    // Restart listening loop after error
    setTimeout(() => listen(helper), 500);

  }
}

module.exports = listen;
