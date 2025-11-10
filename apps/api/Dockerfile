FROM node:20-alpine

# Install dependencies required for Prisma engine and native modules
RUN apk add --no-cache openssl libc6-compat

ENV PNPM_HOME="/usr/local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /workspace

# Copy workspace manifests first to leverage Docker layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install only the dependencies needed for the API workspace
RUN pnpm install --filter @taskforge/api... --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/api ./apps/api

WORKDIR /workspace/apps/api

# Provide a default DATABASE_URL for prisma generate; overridden at runtime
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskforge?schema=public"
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm exec prisma generate

EXPOSE 4000

CMD ["pnpm", "dev"]
