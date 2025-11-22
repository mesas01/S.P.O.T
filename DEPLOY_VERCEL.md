# 🚀 Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar SPOT (frontend + backend) en Vercel.

## 📋 Requisitos Previos

1. Cuenta en [Vercel](https://vercel.com)
2. Proyecto conectado a un repositorio Git (GitHub, GitLab, Bitbucket)
3. Variables de entorno configuradas

## 🏗️ Estructura del Proyecto

El proyecto tiene dos partes principales:

- **Frontend**: React + Vite en `blockotitos/`
- **Backend**: Express.js en `blockotitos/backend/` (convertido a Serverless Functions en `api/`)

## ⚙️ Configuración

### 1. Variables de Entorno

Configura las siguientes variables de entorno en Vercel:

#### Backend (API)
```
RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
ADMIN_SECRET=tu_secret_key_aqui
CLAIM_PAYER_SECRET=tu_secret_key_aqui
SPOT_CONTRACT_ID=tu_contract_id_aqui
MOCK_MODE=false
CORS_ORIGIN=*
ASSET_BASE_URL=https://tu-dominio.vercel.app
```

#### Frontend
```
VITE_BACKEND_URL=https://tu-dominio.vercel.app
VITE_SPOT_CONTRACT_ID=tu_contract_id_aqui
```

### 2. Configuración de Vercel

El proyecto ya incluye `vercel.json` configurado. Asegúrate de que:

- **Root Directory**: `blockotitos`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install && cd backend && npm install`

## 📦 Pasos para Desplegar

### Opción 1: Despliegue desde Vercel Dashboard

1. **Conectar Repositorio**:
   - Ve a [Vercel Dashboard](https://vercel.com/dashboard)
   - Click en "Add New Project"
   - Conecta tu repositorio de Git

2. **Configurar Proyecto**:
   - **Root Directory**: Selecciona `blockotitos`
   - **Framework Preset**: Vite (o detecta automáticamente)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Variables de Entorno**:
   - Agrega todas las variables de entorno listadas arriba
   - Puedes hacerlo antes o después del primer deploy

4. **Desplegar**:
   - Click en "Deploy"
   - Espera a que termine el build

### Opción 2: Despliegue desde CLI

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Navegar al directorio del proyecto
cd commitsPre/blockotitos

# 3. Iniciar sesión en Vercel
vercel login

# 4. Desplegar (primera vez)
vercel

# 5. Desplegar a producción
vercel --prod
```

## 🔧 Configuración Detallada

### Estructura de Rutas

- **Frontend**: Todas las rutas excepto `/api/*` se sirven desde `dist/`
- **Backend API**: Todas las rutas `/api/*` se enrutan a `api/index.js` (Serverless Function)

### Endpoints del Backend

El backend expone los siguientes endpoints:

- `GET /api/health` - Health check
- `POST /api/creators/approve` - Aprobar creador
- `POST /api/creators/revoke` - Revocar aprobación
- `POST /api/events/create` - Crear evento (con upload de imagen)
- `GET /api/events/:eventId/minted-count` - Contar SPOTs minteados
- `POST /api/events/claim` - Reclamar SPOT
- `GET /api/contract/admin` - Obtener admin del contrato
- `GET /api/contract/event-count` - Contar eventos
- `GET /api/events/onchain` - Listar eventos on-chain

### Uploads de Archivos

⚠️ **Importante**: Vercel Serverless Functions tienen limitaciones para almacenamiento de archivos:

- **Opción 1**: Usar un servicio externo (recomendado)
  - Subir imágenes a Cloudinary, AWS S3, o similar
  - Actualizar el código para usar URLs externas

- **Opción 2**: Usar Vercel Blob Storage (si está disponible)
  - Requiere configuración adicional

- **Opción 3**: Limitar tamaño y usar memoria temporal
  - Solo para archivos pequeños (< 4.5MB)
  - Los archivos se pierden después de la ejecución

## 🔍 Verificación Post-Despliegue

1. **Frontend**:
   ```bash
   curl https://tu-dominio.vercel.app
   ```

2. **Backend Health Check**:
   ```bash
   curl https://tu-dominio.vercel.app/api/health
   ```

3. **Verificar Variables de Entorno**:
   - Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
   - Verifica que todas las variables estén configuradas

## 🐛 Troubleshooting

### Error: "Module not found"
- **Solución**: Asegúrate de que `installCommand` en `vercel.json` instale dependencias del backend

### Error: "Function timeout"
- **Solución**: Aumenta `maxDuration` en `vercel.json` (máximo 60s en plan Hobby)

### Error: "CORS"
- **Solución**: Verifica que `CORS_ORIGIN` esté configurado correctamente

### Backend no responde
- **Solución**: Verifica que las rutas en `api/index.js` estén correctamente exportadas

## 📝 Notas Importantes

1. **Archivos Estáticos**: Los archivos en `public/` se sirven automáticamente
2. **Build Time**: El build puede tardar varios minutos la primera vez
3. **Cold Start**: Las Serverless Functions pueden tener un "cold start" de 1-2 segundos
4. **Límites**: Plan Hobby tiene límites de tiempo de ejecución y ancho de banda

## 🔗 Recursos

- [Documentación de Vercel](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

---

**Última actualización**: Noviembre 2025

