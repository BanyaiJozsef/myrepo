# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/invoice-provider/package.json packages/invoice-provider/package.json
COPY packages/license/package.json packages/license/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @autoszerv/api...

FROM deps AS build
COPY turbo.json tsconfig.base.json ./
COPY packages/shared-types packages/shared-types
COPY packages/db packages/db
COPY packages/invoice-provider packages/invoice-provider
COPY packages/license packages/license
COPY apps/api apps/api
RUN pnpm --filter @autoszerv/api... build
RUN pnpm deploy --filter @autoszerv/api --prod /repo/out

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/out/dist ./dist
COPY --from=build /repo/out/node_modules ./node_modules
COPY --from=build /repo/out/package.json ./package.json
EXPOSE 3001
USER node
CMD ["node", "dist/server.js"]
