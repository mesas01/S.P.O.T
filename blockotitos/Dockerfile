# ---- Stage 1: Build frontend ----
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias del root (frontend)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copiar el resto del frontend
COPY tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src/ src/
COPY packages/ packages/

# Build args para variables de entorno del frontend (VITE_*)
ARG VITE_BACKEND_URL
ARG VITE_SPOT_CONTRACT_ID
ARG PUBLIC_STELLAR_NETWORK
ARG PUBLIC_STELLAR_RPC_URL
ARG PUBLIC_STELLAR_HORIZON_URL

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_SPOT_CONTRACT_ID=$VITE_SPOT_CONTRACT_ID
ENV PUBLIC_STELLAR_NETWORK=$PUBLIC_STELLAR_NETWORK
ENV PUBLIC_STELLAR_RPC_URL=$PUBLIC_STELLAR_RPC_URL
ENV PUBLIC_STELLAR_HORIZON_URL=$PUBLIC_STELLAR_HORIZON_URL

# Instalar workspaces y build
RUN npm run install:contracts 2>/dev/null || true
RUN npx tsc -b && npx vite build

# ---- Stage 2: Production backend ----
FROM node:18-alpine

WORKDIR /app

# Copiar backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src/ src/

# Copiar frontend build desde stage anterior
COPY --from=builder /app/dist /app/dist

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production
ENV DIST_DIR=/app/dist

CMD ["node", "src/server.js"]
