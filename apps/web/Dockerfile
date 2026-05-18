FROM node:20-alpine

# Install dependencies required by Prisma engines.
RUN apk add --no-cache openssl libc6-compat

ENV PNPM_HOME="/usr/local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /workspace

# Copy workspace manifests for dependency installation caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma apps/api/prisma
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --filter @taskforge/web... --frozen-lockfile

# Copy source after installing deps to leverage cache
COPY packages ./packages
COPY apps/web ./apps/web

WORKDIR /workspace/apps/web

ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskforge?schema=public"
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm run prisma:generate

EXPOSE 3000

CMD ["pnpm", "dev"]
