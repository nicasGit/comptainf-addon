
# syntax=docker/dockerfile:1

FROM ghcr.io/home-assistant/base:latest AS base

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

# =========================================
# 1. Dépendances : cache indépendant
# =========================================
FROM base AS dependencies

# Seuls ces deux fichiers déclenchent
# l'invalidation du cache npm.
ADD https://raw.githubusercontent.com/nicasGit/comptaInf/main/package.json /app/package.json
ADD https://raw.githubusercontent.com/nicasGit/comptaInf/main/package-lock.json /app/package-lock.json

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# =========================================
# 2. Code : mise à jour indépendante
# =========================================
FROM base AS runtime

COPY --from=dependencies /app/node_modules /app/node_modules

# Détecte le dernier commit GitHub.
ADD https://api.github.com/repos/nicasGit/comptaInf/commits/main /tmp/comptainf-version.json

RUN git clone --depth 1 \
    https://github.com/nicasGit/comptaInf.git \
    /tmp/comptainf-src \
    && cp -a /tmp/comptainf-src/. /app/ \
    && rm -rf /tmp/comptainf-src \
    && rm -rf /app/.git

# =========================================
# 3. Configuration Home Assistant
# =========================================
ENV NODE_ENV=production
ENV DATA_DIR=/config

EXPOSE 3000

CMD ["node", "server.js"]
