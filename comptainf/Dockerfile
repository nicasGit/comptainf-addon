ARG BUILD_VERSION=latest

FROM ghcr.io/home-assistant/base:latest AS source
ARG BUILD_VERSION

RUN apk add --no-cache git curl

WORKDIR /source

RUN echo "BUILD_VERSION=${BUILD_VERSION}" \
    && git clone --depth 1 --branch main --single-branch \
       https://github.com/nicasGit/comptaInf.git /source \
    && git rev-parse HEAD \
    && git log -1 --format="%cI" \
    && printf '{"commit":"%s","commitDate":"%s"}\n' \
       "$(git rev-parse HEAD)" \
       "$(git log -1 --format=%cI)" \
       > build-info.json


FROM ghcr.io/home-assistant/base:latest AS dependencies

ENV NODE_ENV=production
ENV DATA_DIR=/config

RUN apk add --no-cache \
    nodejs npm python3 make g++ pkgconf \
    cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev \
    poppler poppler-utils

WORKDIR /app

COPY --from=source /source/package.json ./
COPY --from=source /source/package-lock.json* ./

RUN npm ci --omit=dev

FROM ghcr.io/home-assistant/base:latest

ENV NODE_ENV=production
ENV DATA_DIR=/config

ARG BUILD_VERSION=latest
ENV APP_VERSION=$BUILD_VERSION

RUN apk add --no-cache \
    nodejs npm cairo pango jpeg giflib \
    poppler poppler-utils

WORKDIR /app

COPY --from=source /source /app/
COPY --from=dependencies /app/node_modules /app/node_modules

EXPOSE 3000

CMD ["sh", "-c", "export DATA_DIR=/config && node server.js"]
