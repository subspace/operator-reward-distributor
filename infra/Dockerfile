# syntax=docker/dockerfile:1.7

# Build arguments for metadata
ARG VERSION=latest
ARG BUILD_DATE
ARG GIT_REF
ARG GIT_SHA

FROM node:20-alpine AS builder
WORKDIR /app

# Use Yarn 4 with node_modules linker (PnP disabled)
ENV YARN_ENABLE_IMMUTABLE_INSTALLS=true \
    YARN_NODE_LINKER=node-modules \
    NODE_ENV=production

RUN corepack enable

RUN apk add --no-cache python3 make g++

COPY package.json yarn.lock ./
RUN yarn install --immutable

COPY tsconfig.json vitest.config.ts ./
COPY src ./src
COPY migrations ./migrations

RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /app

# Build metadata labels
ARG VERSION=latest
ARG BUILD_DATE
ARG GIT_REF
ARG GIT_SHA

LABEL org.opencontainers.image.title="operator-reward-distributor" \
      org.opencontainers.image.description="Operator Reward Distributor for Autonomys Network" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.source="https://github.com/autonomys/operator-reward-distributor"

ENV NODE_ENV=production

# Healthchecks rely on curl inside the container
RUN apk add --no-cache curl

# Copy production deps and built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

# Non-root user
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D appuser
USER appuser

# Default command is provided by docker-compose per service
CMD ["node", "-v"]


