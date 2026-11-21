# Mirror Mirror

## Team
- Danna Anore (GitHub: @Dannaanore)
- Dominic Dang (GitHub: @DomD495)
- Erickson Ng (GitHub: @EricksonNg)
- Hannah Tran (GitHub: @htran381)

## Project Description
Mirror Mirror is a smart mirror implementation to make a mirror more functional. The UI will contain different live-information modules based on user preference. It will include custom-made AI modules to implement chatbot functionality with the ability to configure the UI via voice commands.

## Prototype Scope
Included:
- A functional MagicMirror interface with live-information modules, including Time, Weather, and News
- A custom MMM-Chat module that processes voice commands using the "Mirror Mirror" wake phrase
- Offline speech recognition using SoX and Whisper.cpp
- AI model routing between local Qwen and cloud-based Claude depending on availability
- Conversation history stored using SQLite
- Voice commands to control the visibility of MagicMirror modules
- MCP integration using MMM-Remote-Control to allow Claude to interact with MagicMirror modules
- Mock mode for demonstrating predefined commands without microphone input
- Automated tests for command recognition, AI routing, and fallback behavior

## System Architecture

The system uses the MMM-Chat module to manage voice interaction, AI routing, and UI commands.

1. SoX records microphone input.
2. Whisper.cpp transcribes the recorded speech into text.
3. MMM-Chat processes the recognized command.
4. UI commands are handled directly by MCP+Claude.
5. Conversational requests are sent to the AI router, which selects Qwen or Claude based on availability.
6. Claude can use the MCP server and MMM-Remote-Control to interact with MagicMirror modules.
7. The response is displayed through the MMM-Chat interface.

## Prerequisites
- A macOS or Debian/Ubuntu-based Linux system
- Node.js 24 and npm installed
- Homebrew installed on macOS
- Git and an internet connection
- A microphone for voice interaction
- A graphical desktop environment to display MagicMirror
- An Anthropic API key (optional, for Claude functionality)

Verify that Node.js and npm are installed:

```bash
node --version
npm --version
```

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/SJSU-CMPE-195/group-project-mirror-mirror.git
   ```

   This can be skipped if the project directory is downloaded directly from GitHub through the ZIP.

2. Navigate to the project directory:

   ```bash
   cd group-project-mirror-mirror
   ```

   If downloaded as a ZIP, navigate to the extracted project directory instead.

3. Run the installation script:

   ```bash
   bash mirror.sh install
   ```

   The script automatically:
   - Installs required system dependencies, including SoX and CMake
   - Installs MagicMirror dependencies using npm
   - Installs dependencies for MMM-Chat, MMM-Jast, and MMM-Remote-Control
   - Installs and builds the MCP server
   - Downloads and compiles Whisper.cpp
   - Downloads the Whisper speech recognition model
   - Installs Ollama and downloads the Qwen 2.5 1.5B model

4. Optionally configure the Anthropic API key using an environment variable:

   ```bash
   export API_KEY='YOUR_ANTHROPIC_API_KEY'
   ```

   The API key is required for Cloud AI functionality through Anthropic/Claude. It should not be committed to GitHub.

## Running the Application

1. From the project directory, start MagicMirror:

   ```bash
   bash mirror.sh start
   ```

   To run the application in mock mode without microphone input:

   ```bash
   bash mirror.sh start --mock
   ```

   To run mock mode followed by microphone testing:

   ```bash
   bash mirror.sh start --mock --mic-test
   ```

2. Interact with the mirror using the configured wake phrase.

   Example commands:
   - "Mirror, show weather"
   - "Mirror, show all"
   - "Mirror, explain how a CPU works"

The application displays recognized speech and AI responses through MMM-Chat.

## Testing

The project includes automated JavaScript tests that can run without Whisper.cpp, Ollama, microphone hardware, or an Anthropic API key.

Verify the backend JavaScript syntax:

```bash
node --check MagicMirror/modules/MMM-Chat/node_helper.js
```

Run the automated tests:

```bash
node --test tests/tests.js
```

The automated tests cover:
- Recognition of UI commands
- Identification of conversational requests
- Routing requests to available AI models
- Mock responses when AI models are unavailable
- Error handling when no AI models are available
- Backend notifications for UI commands

The `impl.yaml` file defines the commands used by the automated grader.

## Demo
Prototype Demo Video: https://drive.google.com/file/d/1CIPcHPWDlY7C6_BmYHRwdRRaXWEU6krD/view

## Technical Stack
- Node.js
- JavaScript
- MagicMirror² Framework
- Electron
- SoX
- Whisper.cpp
- Ollama (Qwen 2.5:1.5b)
- Anthropic API (Claude)
- Model Context Protocol (MCP)
- MMM-Remote-Control
- SQLite

## What's Next
- Tune the AI model routing algorithm to balance response times and accuracy
- Improve inference from previous conversation context
- Expand personalized user interests and news interactions
- Test the application on a Raspberry Pi 5 with an external microphone
- Build the physical mirror enclosure