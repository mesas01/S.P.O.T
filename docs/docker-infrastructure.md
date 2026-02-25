# Infraestructura Docker - S.P.O.T.

## Resumen

El proyecto tiene **4 Dockerfiles** y **2 docker-compose** que se combinan en 3 modos de despliegue:

| Modo | Archivos usados | Plataforma | URL |
|------|-----------------|------------|-----|
| **Desarrollo local** | `docker-compose.dev.yml` + `scaffold.Dockerfile` | Docker local | `localhost:5173` (frontend), `localhost:4000` (backend) |
| **Produccion compose** | `docker-compose.yml` + `frontend/Dockerfile` + `backend/Dockerfile` | Coolify (dockercompose) | `http://207.246.114.85:3000` |
| **Produccion single-container** | `Dockerfile` (raiz) | Coolify (dockerfile) | `http://jwwcc4kcso0ckokc0o4cwk4g.207.246.114.85.sslip.io` |

---

## Dockerfiles

### 1. `Dockerfile` (raiz) — Single-container para Coolify dockerfile mode

Empaqueta **frontend + backend** en un solo contenedor usando supervisor para correr nginx y Node.js simultaneamente.

**Etapas de build:**

| Etapa | Base | Que hace |
|-------|------|----------|
| `frontend-builder` | `node:22-alpine` | `npm ci --ignore-scripts` + `tsc -b` + `vite build` |
| `backend-builder` | `node:22-alpine` | `npm ci --omit=dev` + `prisma generate` |
| Final | `node:22-alpine` | Instala nginx + supervisor, copia builds, configura proxy |

**Puertos internos:**
- **nginx**: escucha en `8080` (Traefik/Coolify redirige aqui)
- **backend (Node.js)**: escucha en `3000` (interno, no expuesto)

**Transformaciones de nginx.conf:**
El Dockerfile modifica `frontend/nginx.conf` con `sed` para adaptarlo al modo single-container:
```
listen 80        →  listen 8080
backend:8080     →  127.0.0.1:3000
minio:9000       →  127.0.0.1:3000/uploads/
```

**Build args requeridos (frontend):**
| ARG | Ejemplo | Descripcion |
|-----|---------|-------------|
| `VITE_BACKEND_URL` | _(vacio)_ | URL del backend. Vacio en single-container (nginx proxies) |
| `VITE_SPOT_CONTRACT_ID` | `CBL3NMY...` | Contract ID del poap en Soroban |
| `PUBLIC_STELLAR_NETWORK` | `TESTNET` | Red Stellar (`TESTNET`, `PUBLIC`, `LOCAL`) |
| `PUBLIC_STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | Passphrase de la red |
| `PUBLIC_STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` | URL del RPC Soroban |
| `PUBLIC_STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` | URL de Horizon |

**Limitaciones:**
- Sin PostgreSQL ni MinIO dentro del contenedor
- DB: cae a fallback RPC (mas lento, pero funcional)
- Imagenes: almacenamiento local en `/app/uploads/` (se pierde al reiniciar el contenedor)
- Prisma y MinIO clients fallan gracefully si no hay `DATABASE_URL` o MinIO disponible

---

### 2. `frontend/Dockerfile` — Frontend standalone (para docker-compose.yml)

Build multi-stage que genera una imagen nginx con el SPA compilado.

| Etapa | Base | Que hace |
|-------|------|----------|
| `builder` | `node:22-alpine` | `npm ci --ignore-scripts` + `tsc -b` + `vite build` |
| Final | `nginx:alpine` | Copia `/app/dist` y `nginx.conf` |

**Puerto:** `80` (nginx)

**Build args:** Los mismos 6 que el Dockerfile raiz.

**nginx.conf** se usa sin modificar — apunta a `backend:8080` y `minio:9000` (servicios del compose).

---

### 3. `backend/Dockerfile` — Backend standalone (para docker-compose.yml)

Build multi-stage del backend Node.js con Prisma.

| Etapa | Base | Que hace |
|-------|------|----------|
| `builder` | `node:22-alpine` | `npm ci` + `prisma generate` |
| Final | `node:22-alpine` | Copia node_modules, prisma, src |

**Puerto:** `8080`

**Comando de arranque:**
```sh
npx prisma migrate deploy && node src/server.js
```
Ejecuta migraciones de DB al iniciar, luego arranca el servidor.

**Variables de entorno requeridas:** Se configuran en el docker-compose, no en el Dockerfile (ver seccion compose).

---

### 4. `scaffold.Dockerfile` — Entorno Rust para contratos Soroban

Imagen con todo el toolchain para compilar y observar contratos inteligentes.

| Base | Herramientas instaladas |
|------|------------------------|
| `rust:1.89-slim` | `pkg-config`, `libssl-dev`, `nodejs`, `npm`, `make`, `wget` |

**Herramientas adicionales:**
- `rustup target add wasm32v1-none` (compilacion WASM)
- `cargo-binstall` + `stellar-scaffold-cli` (build + watch de contratos)
- `stellar-cli v25.1.0` (CLI de Stellar para deploy/interaccion)

**Uso:** Solo en desarrollo local (`docker-compose.dev.yml`). No se usa en produccion.

---

## Docker Compose

### `docker-compose.dev.yml` — Desarrollo local

**Comando:** `docker compose -f docker-compose.dev.yml up`

| Servicio | Imagen | Puerto host | Descripcion |
|----------|--------|-------------|-------------|
| `scaffold` | `scaffold.Dockerfile` | — | Watch de contratos Rust, genera TypeScript clients |
| `frontend` | `node:22-alpine` | `5173` | Vite dev server con HMR |
| `backend` | `node:22-alpine` | `4000` | Node.js con `--watch`, prisma generate + migrate |
| `postgres` | `postgres:16-alpine` | `5432` | Base de datos |
| `minio` | `minio/minio` | `9000` (API), `9001` (console) | Almacenamiento de imagenes |

**Caracteristicas:**
- Hot reload en frontend y backend (volumenes montados)
- Scaffold observa cambios en contratos y regenera clients TS
- Volumenes nombrados para `node_modules`, `cargo_registry`, `cargo_target` (persisten entre reinicios)
- Variables de entorno con valores fijos (no requiere `.env` externo)

**Variables de entorno del backend:**
```
PORT=4000
MOCK_MODE=false
RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
ADMIN_SECRET=SBK5VS...ER7W
CLAIM_PAYER_SECRET=SBK5VS...ER7W
SPOT_CONTRACT_ID=CBL3NM...V7JR
DATABASE_URL=postgresql://spot:spot_secret@postgres:5432/spot
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=spot_minio
MINIO_SECRET_KEY=spot_minio_secret
MINIO_BUCKET=spot-images
MINIO_PUBLIC_URL=http://localhost:9000
```

**Variables de entorno del frontend:**
```
PUBLIC_STELLAR_NETWORK=TESTNET
VITE_BACKEND_URL=http://localhost:4000
VITE_SPOT_CONTRACT_ID=CC3XAT...P3VF
```

**Dependencias entre servicios:**
```
scaffold  ←  frontend
postgres  ←  backend
minio     ←  backend
```

---

### `docker-compose.yml` — Produccion (Coolify dockercompose mode)

**Usado por:** Coolify app `spot-dev` (branch `develop`)
**URL:** `http://207.246.114.85:3000`
**Comando:** Coolify lo ejecuta automaticamente

| Servicio | Build/Imagen | Puerto host | Descripcion |
|----------|-------------|-------------|-------------|
| `frontend` | `frontend/Dockerfile` | `3000→80` | nginx SPA + proxy a backend |
| `backend` | `backend/Dockerfile` | `8080` (interno) | Express API + Prisma |
| `postgres` | `postgres:16-alpine` | interno | DB con healthcheck |
| `minio` | `minio/minio` | interno | Almacenamiento de imagenes |

**Diferencias clave vs dev:**
- Sin scaffold (contratos ya compilados)
- Sin hot reload (imagenes buildeadas)
- Puertos internos (solo frontend expone 3000)
- Backend ejecuta `prisma migrate deploy` al iniciar
- Variables de entorno usan `${VAR:-default}` (se configuran en Coolify)
- Healthchecks en frontend, backend y postgres

**Variables de entorno (configuradas en Coolify):**

Frontend build args:
```
VITE_BACKEND_URL=              (vacio, nginx hace proxy)
VITE_SPOT_CONTRACT_ID=CBL3NM...V7JR
PUBLIC_STELLAR_NETWORK=TESTNET
PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

Backend runtime:
```
PORT=8080
RPC_URL, NETWORK_PASSPHRASE, ADMIN_SECRET, CLAIM_PAYER_SECRET, SPOT_CONTRACT_ID
MOCK_MODE=false
DATABASE_URL=postgresql://spot:${POSTGRES_PASSWORD}@postgres:5432/spot
MINIO_ENDPOINT=minio, MINIO_PORT=9000, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
MINIO_PUBLIC_URL=/uploads
```

---

## Diagrama de arquitectura por entorno

### Desarrollo local (`docker-compose.dev.yml`)
```
                  Host (localhost)
                       |
          +------------+------------+
          |            |            |
     :5173         :4000      :9000/:9001
    frontend      backend       minio
    (vite dev)    (node)      (S3 storage)
          |            |
          |       +----+----+
          |       |         |
     scaffold   postgres   minio
     (rust)     :5432
```

### Produccion compose (`docker-compose.yml`)
```
              Coolify / Traefik
                     |
                   :3000
                  frontend
                (nginx SPA)
                     |
              proxy_pass :8080
                     |
                  backend
                (node + prisma)
                /           \
           postgres        minio
           (internal)    (internal)
```

### Produccion single-container (`Dockerfile`)
```
              Coolify / Traefik
                     |
                   :8080
            +--- nginx (SPA) ---+
            |                   |
        /assets/*         /(events|health|...)
        (static)                |
                          proxy_pass :3000
                                |
                         backend (node)
                         (sin DB, sin MinIO)
                         fallback a RPC + local files
```

---

## Resumen de puertos por entorno

| Servicio | Dev local | Prod compose | Prod single |
|----------|-----------|-------------|-------------|
| Frontend/nginx | 5173 | 3000→80 | 8080 |
| Backend | 4000 | 8080 (interno) | 3000 (interno) |
| PostgreSQL | 5432 | interno | N/A |
| MinIO API | 9000 | interno | N/A |
| MinIO Console | 9001 | N/A | N/A |

---

## Configuracion en Coolify

### App de produccion (`spot-app`, branch `main`)
- **UUID:** `jwwcc4kcso0ckokc0o4cwk4g`
- **Build pack:** `dockerfile` (usa `/Dockerfile`)
- **ports_exposes:** `8080`
- **URL:** `http://jwwcc4kcso0ckokc0o4cwk4g.207.246.114.85.sslip.io`

### App de desarrollo (`spot-dev`, branch `develop`)
- **UUID:** `qsosscck8gcos8gs08g80wwk`
- **Build pack:** `dockercompose` (usa `/docker-compose.yml`)
- **URL:** `http://207.246.114.85:3000`

### Variables de entorno en Coolify
Se configuran via API (`PATCH /applications/{uuid}/envs/bulk`) o UI (`http://207.246.114.85:8000`).

Las variables con `is_buildtime: true` se pasan como Docker build args.
Las variables con `is_runtime: true` se inyectan como env vars al contenedor.
