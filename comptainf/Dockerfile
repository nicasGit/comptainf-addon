FROM ghcr.io/home-assistant/base:latest

RUN apk add --no-cache \
    nodejs \
    npm \
    git

WORKDIR /app

ADD "https://api.github.com/repos/nicasGit/comptaInf/commits/main" /tmp/comptainf-version.json

RUN git clone --depth 1 \
    https://github.com/nicasGit/comptaInf.git .

RUN npm ci

EXPOSE 3000

CMD ["sh", "-c", "export DATA_DIR=/config && echo DATA_DIR=$DATA_DIR && node server.js"]