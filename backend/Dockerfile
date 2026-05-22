# syntax=docker/dockerfile:1.6

# ---- base ----
FROM node:22-alpine AS base
WORKDIR /usr/src/app
RUN apk add --no-cache tini
ENV NODE_ENV=development

# ---- dev (used by docker-compose service `backend`) ----
FROM base AS dev
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["npm","run","start:dev"]

# ---- build ----
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- prod ----
FROM node:22-alpine AS prod
WORKDIR /usr/src/app
ENV NODE_ENV=production
RUN apk add --no-cache tini
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","dist/main.js"]
