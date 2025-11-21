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
- `POST /creators/approve`
- `POST /creators/revoke`
- `POST /events/create`

Los resultados de cada transacción (éxito/error) se registran en consola y en `backend/logs/backend.log`.

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

### Crear evento (firma el organizador)

```bash
curl -X POST http://localhost:4000/events/create \
  -H "Content-Type: application/json" \
  -d '{
    "creatorSecret": "S...",
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

### Consultar admin

```bash
curl http://localhost:4000/contract/admin
```

## Flujo recomendado

1. El servidor cobra off-chain y registra la referencia del pago.
2. Invoca `POST /creators/approve` con la cuenta del organizador y la referencia.
3. El organizador llama `create_event` desde el frontend usando su propia clave.
4. Si hay reembolso o fraude, `POST /creators/revoke` para bloquear nuevos eventos.

