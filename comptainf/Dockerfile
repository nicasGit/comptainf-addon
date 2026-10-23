
FROM ghcr.io/home-assistant/base:latest

ENV NODE_ENV=production
ENV DATA_DIR=/config

RUN echo "***** BUILD ComptaInf 23.10.2026 *****" > /tmp/build_comptainf.txt

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
    pixman-dev \
    poppler \
    poppler-utils

RUN npm ci

WORKDIR /app

ARG BUILD_VERSION

RUN echo "Clone Git" >> /tmp/build_comptainf.txt

RUN echo "$BUILD_VERSION" && git clone --depth 1 \
    https://github.com/nicasGit/comptaInf.git /app

EXPOSE 3000

RUN echo "******* end dockerfile ********" >> /tmp/build_comptainf.txt

CMD ["sh", "-c", "export DATA_DIR=/config && cat /tmp/build_comptainf.txt && echo DATA_DIR=$DATA_DIR && node server.js"]
