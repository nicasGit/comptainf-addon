ARG BUILD_VERSION=latest

FROM ghcr.io/home-assistant/base:latest AS source
ARG BUILD_VERSION

RUN apk add --no-cache git curl

WORKDIR /source

RUN echo "Building ComptaInf add-on ${BUILD_VERSION}" \
    && curl -fsSL \
       "https://api.github.com/repos/nicasGit/comptaInf/commits/main" \
       > /tmp/comptainf-main.json \
    && git clone --depth 1 --branch main --single-branch \
       https://github.com/nicasGit/comptaInf.git /source

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

RUN apk add --no-cache \
    nodejs npm cairo pango jpeg giflib \
    poppler poppler-utils

WORKDIR /app

COPY --from=source /source /app/
COPY --from=dependencies /app/node_modules /app/node_modules

EXPOSE 3000

CMD ["sh", "-c", "export DATA_DIR=/config && node server.js"]
