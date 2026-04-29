FROM node:16

WORKDIR /usr/src/fe/app

COPY package*.json ./
RUN npm install

EXPOSE 5000
