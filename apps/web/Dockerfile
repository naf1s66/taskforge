FROM node:20-alpine

ENV PNPM_HOME="/usr/local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /workspace

# Copy workspace manifests for dependency installation caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json 2>/dev/null || true

RUN pnpm install --filter @taskforge/web... --frozen-lockfile

# Copy source after installing deps to leverage cache
COPY packages ./packages
COPY apps/web ./apps/web

WORKDIR /workspace/apps/web

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["pnpm", "dev"]
