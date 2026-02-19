# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

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

# Stage 2: Install backend deps
FROM node:22-alpine AS backend-builder
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Stage 3: Final image with nginx + node
FROM node:22-alpine

RUN apk add --no-cache nginx supervisor

# Copy frontend build
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy nginx config (proxy to localhost instead of backend service)
COPY frontend/nginx.conf /etc/nginx/http.d/default.conf
RUN sed -i 's|http://backend:8080|http://127.0.0.1:8080|g' /etc/nginx/http.d/default.conf

# Copy backend
WORKDIR /app
COPY --from=backend-builder /app/node_modules ./node_modules
COPY backend/src ./src
COPY backend/package.json ./

# Supervisor config to run both nginx and backend
RUN mkdir -p /etc/supervisor.d
RUN printf '[supervisord]\nnodaemon=true\nlogfile=/dev/stdout\nlogfile_maxbytes=0\n\n[program:nginx]\ncommand=nginx -g "daemon off;"\nautostart=true\nautorestart=true\nstdout_logfile=/dev/stdout\nstdout_logfile_maxbytes=0\nstderr_logfile=/dev/stderr\nstderr_logfile_maxbytes=0\n\n[program:backend]\ncommand=node /app/src/server.js\nautostart=true\nautorestart=true\ndirectory=/app\nstdout_logfile=/dev/stdout\nstdout_logfile_maxbytes=0\nstderr_logfile=/dev/stderr\nstderr_logfile_maxbytes=0\n' > /etc/supervisord.conf

EXPOSE 80

ENV PORT=8080 NODE_ENV=production

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
