
FROM ghcr.io/home-assistant/base:latest

RUN apk add --no-cache \
    nodejs \
    npm \
    git \
    python3 \
    make \
    g++ \
    pkgconf \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev

WORKDIR /app

RUN git clone --depth 1 \
    https://github.com/nicasGit/comptaInf.git /app

RUN npm ci

ENV NODE_ENV=production
ENV DATA_DIR=/config

EXPOSE 3000

CMD ["sh", "-c", "export DATA_DIR=/config && echo DATA_DIR=$DATA_DIR && node server.js"]
