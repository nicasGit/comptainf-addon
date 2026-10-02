FROM node:22-alpine

RUN apk add --no-cache git

WORKDIR /app

RUN git clone https://github.com/nicasGit/ComptaInf.git .

RUN npm install

EXPOSE 3000

CMD ["/run.sh"]
