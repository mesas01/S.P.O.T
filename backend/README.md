# SPOT Admin Backend

Servicio Express que actúa como **operador administrador** del contrato `spot`.
Su objetivo es exponer endpoints REST para aprobar o revocar organizadores una vez
que hayan pagado off-chain.

## Requisitos

- Node.js 18+
- Acceso a un RPC de Soroban (`RPC_URL`)
- Clave secreta del admin del contrato

## Instalación

```bash
cd backend
npm install
cp env.example .env            # edita valores reales
```

Variables necesarias (`.env`):

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto HTTP (default `4000`) |
| `RPC_URL` | Endpoint Soroban RPC (ej. `https://soroban-testnet.stellar.org`) |
| `NETWORK_PASSPHRASE` | Frase del network correspondiente |
| `ADMIN_SECRET` | Clave secreta **válida** (comienza con `S...`) que posee rol admin del contrato |
| `SPOT_CONTRACT_ID` | ID del contrato desplegado |
| `MOCK_MODE` | Si es `true`, no se hace ninguna llamada a Soroban y se devuelven hashes simulados |
| `LOG_FILE` | (Opcional) Ruta del archivo de logs. Default: `backend/logs/backend.log` |
| `ASSET_BASE_URL` | (Opcional) URL base para exponer `/uploads`. Por defecto se usa `http(s)://<host>` de cada request. |
| `UPLOAD_MAX_BYTES` | (Opcional) Límite en bytes por imagen (default `5MB`). |

> Para hacer pruebas sin contrato desplegado, establece `MOCK_MODE=true` en tu `.env`.
> En este modo puedes usar cualquier valor para las demás variables y el backend
> devolverá `MOCK-APPROVE-*` / `MOCK-REVOKE-*` sin contactar la red.

## Ejecutar

```bash
npm run dev     # hot reload con --watch
# o
npm start       # modo producción
```

El backend expone:

- `GET /health`
- `GET /contract/admin`
- `GET /contract/event-count`
- `POST /creators/approve`
- `POST /creators/revoke`
- `POST /events/create`
- `POST /events/claim`

Los resultados de cada transacción (éxito/error) se registran en consola y en `backend/logs/backend.log`.
Las respuestas de éxito también incluyen `signedEnvelope` (XDR base64) para que puedas inspeccionar la firma en Stellar Expert → Tools → XDR Viewer.

### Quién paga las fees de `claim`

Configura `CLAIM_PAYER_SECRET` (por defecto cae en `ADMIN_SECRET`). Todas las llamadas a  
`POST /events/claim` se firman con esa clave salvo que el request incluya un `payerSecret`
específico. Así, el asistente sólo provee su dirección `G...` y no asume costos de red.  
Si quieres que cada organizador cubra las fees, pídele que envíe su `payerSecret` (o que
despliegue su propio backend con su clave).

## Tests

- **Unitarios (mock):**

  ```bash
  npm run test:unit
  ```

  Ejecutan la misma lógica que `scripts/create_event.py`, pero con `MOCK_MODE=true` y escribiendo en `logs/backend.test.log`.

- **Integración (red real):**

  Requieren todas las variables del `.env` +:

  - `INTEGRATION_CLAIMER_ADDRESS`: cuenta pública que recibirá el coleccionable de asistencia.
  - Opcional: `INTEGRATION_CLAIM_PAYER_SECRET` (si no se usa `CLAIM_PAYER_SECRET`/`ADMIN_SECRET`).
  - (Opcional) `INTEGRATION_METADATA_URI` e `INTEGRATION_IMAGE_URL`.

  ```bash
  RUN_INTEGRATION_TESTS=true \
  INTEGRATION_CLAIMER_ADDRESS=G... \
  CLAIM_PAYER_SECRET=S... \
  npm run test:integration
  ```

  Este comando levanta el backend con tus credenciales, envía un `POST /events/create`
  real, registra el nuevo `event_count`, aprueba/revoca un creador y ejecuta un `POST /events/claim`
  para mintiar el coleccionable con la cuenta indicada. Los resultados y `signedEnvelope`s se guardan
  en `logs/backend.integration.log`.

## Probar con Postman / curl

### Aprobar organizador

```bash
curl -X POST http://localhost:4000/creators/approve \
  -H "Content-Type: application/json" \
  -d '{
    "creator": "GCF...CREATOR",
    "paymentReference": "invoice-001"
  }'
```

Respuesta esperada:

```json
{ "txHash": "9c6b...abcd" }
```

### Revocar organizador

```bash
curl -X POST http://localhost:4000/creators/revoke \
  -H "Content-Type: application/json" \
  -d '{ "creator": "GCF...CREATOR" }'
```

### Crear evento (firma el backend con ADMIN_SECRET)

Puedes seguir enviando JSON si ya cuentas con una URL de imagen accesible públicamente:

```bash
curl -X POST http://localhost:4000/events/create \
  -H "Content-Type: application/json" \
  -d '{
    "creator": "GCF...CREATOR",
    "eventName": "Hackathon",
    "eventDate": 1735689600,
    "location": "Bogotá",
    "description": "SPOT Demo",
    "maxPoaps": 100,
    "claimStart": 1735689600,
    "claimEnd": 1736294400,
    "metadataUri": "https://example.com/metadata.json",
    "imageUrl": "https://example.com/image.png"
  }'
```

Si necesitas que el backend aloje la imagen de forma local, envía `multipart/form-data` con el campo `image`:

```bash
curl -X POST http://localhost:4000/events/create \
  -F "creator=GCF...CREATOR" \
  -F "eventName=Hackathon" \
  -F "eventDate=1735689600" \
  -F "location=Bogotá" \
  -F "description=SPOT Demo" \
  -F "maxPoaps=100" \
  -F "claimStart=1735689600" \
  -F "claimEnd=1736294400" \
  -F "metadataUri=https://example.com/metadata.json" \
  -F "image=@./poster.png"
```

Cada archivo se guarda en `backend/uploads` y queda accesible en `http://localhost:4000/uploads/<nombre>`.  
Si despliegas detrás de un proxy/CDN, define `ASSET_BASE_URL` para forzar el host público utilizado en la URL devuelta.

### Consultar admin

```bash
curl http://localhost:4000/contract/admin
```

## Flujo recomendado

1. El servidor cobra off-chain y registra la referencia del pago.
2. Invoca `POST /creators/approve` con la cuenta del organizador y la referencia.
3. (Temporal) El backend firma `create_event` con `ADMIN_SECRET` por ti. Cuando se restaure la
   verificación on-chain del creador, este paso volverá al frontend.
4. Si hay reembolso o fraude, `POST /creators/revoke` para bloquear nuevos eventos.

