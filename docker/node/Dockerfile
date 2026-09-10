ARG NODE_VERSION=26.8.2-trixie
FROM node:${NODE_VERSION}

WORKDIR /usr/src/app

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENTRYPOINT ["/start.sh"]