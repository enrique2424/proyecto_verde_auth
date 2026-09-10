# Install dependencies
FROM node:20-slim AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN yarn install --production=false

# Build
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./
RUN yarn build

# Production
FROM node:20-slim AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
