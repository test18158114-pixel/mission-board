# ==========================================
# STAGE 1: BUILDER
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src ./src

RUN npm run build

# ==========================================
# STAGE 2: RUNNER
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled Javascript from builder
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
