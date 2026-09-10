#!/bin/sh
set -e

ollama serve &
SERVER_PID=$!

until ollama list >/dev/null 2>&1; do
  sleep 1
done

ollama pull "${OLLAMA_EMBEDD_MODEL:-nomic-embed-text}"
ollama pull "${OLLAMA_CHAT_MODEL:-qwen2.5:3b}"
ollama pull "${OLLAMA_VISION_MODEL:-moondream}"

wait $SERVER_PID
