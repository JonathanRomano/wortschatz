# syntax=docker/dockerfile:1
#
# Multi-stage image for @wortschatz/api. Build context is the REPO ROOT
# (see docker-compose: build.context = ".", dockerfile = apps/api/Dockerfile)
# because the api is a pnpm-workspace member that needs the root manifests
# and the shared packages/.
#
# Runtime note: the @wortschatz/* packages ship source-only (package main is
# ./src/index.ts, no compiled dist), so the API runs via `tsx` (= `pnpm
# start`), which transpiles the TS source + workspace packages on the fly.
# The `pnpm --filter @wortschatz/api build` step below is a compile/validation
# gate; the running process uses the source, not apps/api/dist.

# ----------------------------------------------------------------------------
# Stage 1 — builder: install deps, generate the Prisma client, compile-check.
# ----------------------------------------------------------------------------
FROM node:22-alpine AS builder

# git: some toolchains expect it present during install.
# openssl + libc6-compat: required by the Prisma engine on alpine (musl).
RUN apk add --no-cache git openssl libc6-compat

# corepack ships with Node; pin pnpm to match `packageManager` in package.json.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy ONLY the manifests first so `pnpm install` is cached until a
# package.json or the lockfile changes. Every workspace member's package.json
# must be present for `--frozen-lockfile` to resolve the workspace.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY packages/exercises/package.json ./packages/exercises/

RUN pnpm install --frozen-lockfile

# Now the rest of the source. node_modules / dist / .env* are excluded by
# .dockerignore, so the installed deps above are preserved.
COPY . .

# Generate the Prisma client. The alpine (musl) query engine is produced here
# and reused by the runner since both stages are node:22-alpine.
RUN pnpm --filter @wortschatz/database generate

# Compile-check the API (validates the build; runtime uses tsx on the source).
RUN pnpm --filter @wortschatz/api build

# ----------------------------------------------------------------------------
# Stage 2 — runner: just the deps + source the API needs to run + migrate.
# ----------------------------------------------------------------------------
FROM node:22-alpine AS runner

# openssl + libc6-compat: Prisma engine at runtime (migrate deploy + queries).
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Installed deps (incl. the generated Prisma client + tsx + prisma CLI) and the
# workspace manifests. The pnpm symlink graph stays valid because the layout
# under /app is identical to the builder.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Shared packages (Prisma schema + migrations live in packages/database/prisma)
# and the API source.
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

EXPOSE 4000

# Apply pending migrations (schema only — no data) then boot the API. `&&`
# means a failed migration stops the container; `restart: unless-stopped`
# (compose) retries, and `depends_on: postgres healthy` ensures the DB is up.
CMD ["sh", "-c", "pnpm --filter @wortschatz/database exec prisma migrate deploy && cd apps/api && pnpm start"]
