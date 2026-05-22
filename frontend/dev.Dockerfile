FROM node:20-alpine

WORKDIR /usr/src/fe/app

COPY package*.json ./
RUN npm install

EXPOSE 5000
