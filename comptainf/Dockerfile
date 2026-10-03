FROM ghcr.io/home-assistant/base:latest

RUN apk add --no-cache \
    nodejs \
    npm \
    git

WORKDIR /app

ENV DATA_DIR=/config

RUN git clone --depth 1 https://github.com/nicasGit/comptaInf.git .

RUN npm ci

EXPOSE 3000

CMD ["node", "server.js"]