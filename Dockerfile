# ── Stage 1: build the GA4 React app (pnpm monorepo) ─────────────────────────
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

# Install deps first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/apps/ga4/package.json frontend/apps/ga4/
COPY frontend/apps/gtm/package.json frontend/apps/gtm/
COPY frontend/packages/shared/package.json frontend/packages/shared/
RUN pnpm install --frozen-lockfile --filter "@brighthorizon/ga4..."

COPY frontend ./frontend

# Public URL of the backend Cloud Run service (baked in at build time by Vite).
# Leave empty if you reverse-proxy /api to the backend on the same origin.
ARG VITE_WORKER_URL=""
ENV VITE_WORKER_URL=${VITE_WORKER_URL}
RUN pnpm build:ga4

# ── Stage 2: serve static files with nginx on Cloud Run's port ───────────────
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/apps/ga4/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

