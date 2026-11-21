#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ "$1" = "install" ]; then

    # Install system dependencies
    echo "Installing system dependencies..."

    if [ "$(uname)" = "Darwin" ]; then
        brew install sox cmake git

        if ! command -v ollama >/dev/null 2>&1; then
            brew install ollama || echo "Warning: Ollama installation failed; cloud AI and mock mode can still be used."
        fi
    else
        sudo apt-get update
        sudo apt-get install -y sox cmake build-essential curl git

        if ! command -v ollama >/dev/null 2>&1; then
            curl -fsSL https://ollama.com/install.sh | sh || echo "Warning: Ollama installation failed; cloud AI and mock mode can still be used."
        fi
    fi

    # Install MagicMirror dependencies
    echo "Installing MagicMirror dependencies..."
    (cd MagicMirror && npm ci)

    # Install MMM-Remote-Control dependencies
    echo "Installing MMM-Remote-Control dependencies..."
    (cd MagicMirror/modules/MMM-Remote-Control && npm install)

    # Install MCP server dependencies and build
    echo "Installing MCP server dependencies..."
    (cd magicmirror-mcp && npm install)

    echo "Building MCP server..."
    (cd magicmirror-mcp && npm run build)

    # Install MMM-Chat dependencies
    echo "Installing MMM-Chat dependencies..."
    (cd MagicMirror/modules/MMM-Chat && npm install)

    # Install MMM-Jast dependencies
    echo "Installing MMM-Jast dependencies..."
    (cd MagicMirror/modules/MMM-Jast && npm ci)

    # Download Whisper.cpp if it is not already present
    if [ ! -d whisper.cpp ]; then
        echo "Cloning Whisper.cpp..."
        git clone https://github.com/ggml-org/whisper.cpp.git
    fi

    # Build Whisper and download its model
    echo "Building Whisper.cpp..."
    cmake -S whisper.cpp -B whisper.cpp/build
    cmake --build whisper.cpp/build -j 2

    echo "Checking Whisper speech recognition model..."
    if [ ! -f whisper.cpp/models/ggml-base.en.bin ]; then
        (cd whisper.cpp && bash models/download-ggml-model.sh base.en)
    fi

    # Download the local AI model (optional)
    if command -v ollama >/dev/null 2>&1; then
        echo "Starting Ollama if needed..."

        if ! curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1; then
            ollama serve > ollama.log 2>&1 &
            sleep 5
        fi

        echo "Downloading Qwen model..."
        ollama pull qwen2.5:1.5b || echo "Warning: Qwen download failed; local AI will be unavailable."
    else
        echo "Warning: Ollama is not installed; skipping Qwen download."
    fi

    echo "Installation complete!"

elif [ "$1" = "start" ]; then

    # Start Ollama if it isn't already running (optional in mock mode)
    echo "Preparing to start MagicMirror..."

    if [ "$2" != "--mock" ] && command -v ollama >/dev/null 2>&1; then
        if ! curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1; then
            ollama serve > ollama.log 2>&1 &
            sleep 5
        fi
    fi

    # Start MagicMirror with the selected mode
    echo "Starting MagicMirror..."
    cd MagicMirror

    if [ "$2" = "--mock" ]; then
        if [ "$3" = "--mic-test" ]; then
            MOCK_MODE=true MIC_TEST=true npm start
        else
            MOCK_MODE=true npm start
        fi
    else
        npm start
    fi

else
    echo "Usage: bash mirror.sh install | start [--mock [--mic-test]]"
    exit 1
fi