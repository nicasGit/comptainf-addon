FROM ghcr.io/home-assistant/base:latest

# Installer Node.js, npm et git
RUN apk add --no-cache \
    nodejs \
    npm \
    git

WORKDIR /app

# Récupérer le code source de ComptaInf
RUN git clone --depth 1 https://github.com/nicasGit/comptaInf.git .

# Installer les dépendances
RUN npm ci

EXPOSE 3000

CMD ["node", "server.js"]