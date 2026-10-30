FROM ghcr.io/home-assistant/base:latest AS source

RUN apk add --no-cache git

ARG CACHE_BUST=latest

WORKDIR /source
RUN echo "SOURCE_VERSION=${CACHE_BUST}" \
    && git clone --depth 1 --branch main --single-branch \
    https://github.com/nicasGit/comptaInf.git .


FROM ghcr.io/home-assistant/base:latest AS dependencies

ENV NODE_ENV=production
ENV DATA_DIR=/config

RUN apk add --no-cache \
    nodejs \
    npm \
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

COPY --from=source /source/package.json ./
COPY --from=source /source/package-lock.json* ./

RUN npm ci --omit=dev


FROM ghcr.io/home-assistant/base:latest

ENV NODE_ENV=production
ENV DATA_DIR=/config

RUN apk add --no-cache \
    nodejs \
    npm \
    cairo \
    pango \
    jpeg \
    giflib \
    poppler \
    poppler-utils

WORKDIR /app

COPY --from=source /source /app/
COPY --from=dependencies /app/node_modules /app/node_modules

EXPOSE 3000

CMD ["sh", "-c", "export DATA_DIR=/config && node server.js"]
