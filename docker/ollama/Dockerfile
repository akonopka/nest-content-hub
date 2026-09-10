ARG OLLAMA_VERSION=0.34.0
FROM ollama/ollama:${OLLAMA_VERSION}

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENTRYPOINT ["/start.sh"]
