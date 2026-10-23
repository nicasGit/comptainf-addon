
FROM ghcr.io/home-assistant/base:latest

ENV NODE_ENV=production
ENV DATA_DIR=/config

RUN echo "***** BUILD ComptaInf 23.10.2026 *****" > /app/build_comptainf.txt

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


WORKDIR /app

RUN echo "Clone Git" >> /app/build_comptainf.txt

RUN git clone --depth 1 \
    https://github.com/nicasGit/comptaInf.git /app

RUN git rev-parse --short HEAD >> /app/build_comptainf.txt

RUN npm ci

EXPOSE 3000

CMD ["sh", "-c", "export DATA_DIR=/config && cat /app/build_comptainf.txt && echo DATA_DIR=$DATA_DIR && node server.js"]
