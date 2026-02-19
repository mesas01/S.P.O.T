FROM node:22-alpine AS builder
WORKDIR /app

# Copiar workspace raíz y frontend package.json
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY packages/ packages/

# Instalar dependencias
RUN npm ci --ignore-scripts

# Copiar código frontend
COPY frontend/ frontend/

# Build args para variables de entorno
ARG VITE_BACKEND_URL
ARG VITE_SPOT_CONTRACT_ID
ARG PUBLIC_STELLAR_NETWORK
ARG PUBLIC_STELLAR_RPC_URL
ARG PUBLIC_STELLAR_HORIZON_URL

WORKDIR /app/frontend
RUN npx tsc -b && npx vite build

# --- Producción con nginx ---
FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
