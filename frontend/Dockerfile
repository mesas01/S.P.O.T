FROM node:22-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/index.html frontend/vite.config.ts frontend/tailwind.config.js frontend/postcss.config.js ./
COPY frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json ./

ARG VITE_BACKEND_URL
ARG VITE_SPOT_CONTRACT_ID
ARG PUBLIC_STELLAR_NETWORK
ARG PUBLIC_STELLAR_RPC_URL
ARG PUBLIC_STELLAR_HORIZON_URL

RUN npx tsc -b && npx vite build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
