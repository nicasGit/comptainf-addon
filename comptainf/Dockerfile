ARG BUILD_FROM
FROM ${BUILD_FROM}

# Installer Node.js, npm et git
RUN apk add --no-cache \
    nodejs \
    npm \
    git

# Récupérer l'application ComptaInf
WORKDIR /app

RUN git clone --depth 1 https://github.com/nicasGit/comptaInf.git .

# Installer exactement les dépendances du package-lock
RUN npm ci

# Port utilisé par ComptaInf
EXPOSE 3000

# Lancer l'application
CMD ["node", "server.js"]