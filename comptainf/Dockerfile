FROM node:22-bookworm

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    graphicsmagick \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
