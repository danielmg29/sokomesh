# Next.js standalone image. The build reads the committed contract and tokens; no Python.
# Build context: repo root.
FROM node:24-slim AS deps
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app/web
RUN corepack enable
COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm pnpm install --frozen-lockfile

FROM node:24-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/web
RUN corepack enable
COPY --from=deps /app/web/node_modules ./node_modules
COPY web/ ./
COPY contract/ /app/contract/
COPY design/ /app/design/
ARG NEXT_PUBLIC_SITE_URL
RUN pnpm build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN useradd --create-home app
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static ./.next/static
COPY --from=build /app/web/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
