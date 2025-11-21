# 🧪 Comandos para Probar el Contrato - Guía Rápida

## 📋 Configuración Inicial (Una sola vez)

### 1. Guardar credenciales en Stellar CLI

```bash
cd blockotitos

# Opción A: Usar clave privada (más rápido)
stellar keys add deployer \
  --secret-key SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W

# Opción B: Usar seed phrase
stellar keys add deployer \
  --seed-phrase "food cereal gasp worth hawk army club silent fold insect glimpse danger weasel fever bar permit pledge act label upon gift alley private transfer"

# Verificar que se guardó
stellar keys public-key deployer
# Debe mostrar: GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

### 2. Fundear cuenta (si no tiene fondos)

```bash
stellar keys fund deployer --network testnet
```

### 3. Compilar contrato (si no está compilado)

```bash
cargo build --target wasm32v1-none --release --package poap
```

### 4. Desplegar contrato

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/poap.wasm \
  --source deployer \
  --network testnet \
  -- --admin GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

**⚠️ IMPORTANTE**: Guarda el **Contract ID** que devuelve (empieza con `C...`). Ejemplo:
```bash
export CONTRACT_ID="CABC123..."
```

O crea un alias:
```bash
stellar contract create-alias \
  --id TU_CONTRACT_ID \
  --network testnet \
  spot-contract
```

---

## 🎯 Comandos para Probar Cada Función

### Configuración Rápida (ejecutar primero)

```bash
# Variables (ajusta CONTRACT_ID)
export CONTRACT_ID="TU_CONTRACT_ID_AQUI"
export ADMIN="GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2"
export USER="CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF"
export NETWORK="testnet"

# Timestamps (ajustar si es necesario)
export CURRENT_TIME=$(date +%s)
export EVENT_DATE=$((CURRENT_TIME + 86400))  # +1 día
export CLAIM_START=$CURRENT_TIME              # Ahora
export CLAIM_END=$((CURRENT_TIME + 604800))   # +7 días
```

---

## ✅ Lista de Comandos por Función

### 1. `admin()` - Obtener admin

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- admin
```

**Resultado esperado**: `GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2`

---

### 2. `event_count()` - Contar eventos

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- event_count
```

**Resultado esperado**: Un número (ej: `0` si no hay eventos)

---

### 3. `get_all_events()` - Listar todos los eventos

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- get_all_events
```

**Resultado esperado**: Vector de IDs (ej: `[]` si no hay eventos)

---

### 4. `approve_creator()` - Aprobar creador ⚠️ NECESARIO ANTES DE CREAR EVENTOS

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- approve_creator \
    --operator $ADMIN \
    --creator $ADMIN \
    --payment_reference "PAY-REF-001"
```

**Resultado esperado**: Vacío (éxito) o error

---

### 5. `get_creator_approval()` - Ver aprobación

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- get_creator_approval \
    --creator $ADMIN
```

**Resultado esperado**: Objeto con `payment_reference`, `approved_at`, `approved_by`

---

### 6. `create_event()` - Crear evento ⭐ FUNCIÓN PRINCIPAL

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- create_event \
    --creator $ADMIN \
    --event_name "Hackathon Stellar 2024" \
    --event_date $EVENT_DATE \
    --location "Bogotá, Colombia" \
    --description "Annual Stellar Hackathon" \
    --max_poaps 100 \
    --claim_start $CLAIM_START \
    --claim_end $CLAIM_END \
    --metadata_uri "https://example.com/metadata.json" \
    --image_url "https://example.com/image.png"
```

**Resultado esperado**: Un número (event_id), ej: `1`

**Guarda el event_id**:
```bash
export EVENT_ID=1
```

---

### 7. `get_event()` - Obtener información del evento

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- get_event \
    --event_id $EVENT_ID
```

**Resultado esperado**: Objeto `EventData` con toda la información

---

### 8. `minted_count()` - Contar SPOTs minteados

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- minted_count \
    --event_id $EVENT_ID
```

**Resultado esperado**: Número (ej: `0` si no se ha minteado ninguno)

---

### 9. `claim()` - Reclamar SPOT ⭐ FUNCIÓN PRINCIPAL

**Primero fundea la cuenta de usuario**:
```bash
stellar account fund $USER --network testnet
```

**Luego reclama**:
```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source $USER \
  --network testnet \
  -- claim \
    --event_id $EVENT_ID \
    --to $USER
```

**Resultado esperado**: Un número (token_id), ej: `0`

**Guarda el token_id**:
```bash
export TOKEN_ID=0
```

---

### 10. `has_claimed()` - Verificar si ya reclamó

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- has_claimed \
    --event_id $EVENT_ID \
    --address $USER
```

**Resultado esperado**: `true` o `false`

---

### 11. `get_user_poap_for_event()` - Obtener token_id del usuario

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- get_user_poap_for_event \
    --event_id $EVENT_ID \
    --address $USER
```

**Resultado esperado**: Token ID del SPOT (ej: `0`)

---

### 12. `get_event_poaps()` - Listar todos los token_ids del evento

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- get_event_poaps \
    --event_id $EVENT_ID
```

**Resultado esperado**: Vector de token_ids (ej: `[0]`)

---

### 13. `get_token_id_for_event()` - Obtener token_id por índice

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- get_token_id_for_event \
    --event_id $EVENT_ID \
    --token_index 0
```

**Resultado esperado**: Token ID (ej: `0`)

---

### 14. `update_event()` - Actualizar información del evento

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- update_event \
    --operator $ADMIN \
    --event_id $EVENT_ID \
    --event_name "Hackathon Stellar 2024 - Actualizado" \
    --location "Medellín, Colombia"
```

**Nota**: Solo incluye los campos que quieres actualizar

---

### 15. `grant_admin_role()` - Otorgar rol de admin

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- grant_admin_role \
    --admin $USER \
    --operator $ADMIN
```

---

### 16. `revoke_creator_approval()` - Revocar aprobación

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- revoke_creator_approval \
    --operator $ADMIN \
    --creator $ADMIN
```

---

## 🎨 Funciones NFT Estándar (SEP-41)

### 17. `balance()` - Balance de NFTs

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- balance \
    --id $USER
```

**Resultado esperado**: Número de NFTs que tiene la cuenta

---

### 18. `owner_of()` - Dueño del token

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- owner_of \
    --token_id $TOKEN_ID
```

**Resultado esperado**: Dirección del dueño

---

### 19. `token_uri()` - URI del token

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- token_uri \
    --token_id $TOKEN_ID
```

**Resultado esperado**: URI de metadata

---

### 20. `name()` - Nombre del contrato

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- name
```

**Resultado esperado**: "POAP" (actualmente, debería ser "SPOT")

---

### 21. `symbol()` - Símbolo

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- symbol
```

**Resultado esperado**: "POAP" (actualmente, debería ser "SPOT")

---

## 📝 Flujo Completo de Prueba (En Orden)

```bash
# 1. Configurar variables
export CONTRACT_ID="TU_CONTRACT_ID"
export ADMIN="GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2"
export USER="CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF"
export CURRENT_TIME=$(date +%s)
export EVENT_DATE=$((CURRENT_TIME + 86400))
export CLAIM_START=$CURRENT_TIME
export CLAIM_END=$((CURRENT_TIME + 604800))

# 2. Ver admin
stellar contract invoke --id $CONTRACT_ID --source deployer --network testnet -- admin

# 3. Aprobar creador
stellar contract invoke --id $CONTRACT_ID --source deployer --network testnet -- approve_creator --operator $ADMIN --creator $ADMIN --payment_reference "TEST-001"

# 4. Crear evento
EVENT_ID=$(stellar contract invoke --id $CONTRACT_ID --source deployer --network testnet -- create_event --creator $ADMIN --event_name "Mi Evento" --event_date $EVENT_DATE --location "Bogotá" --description "Test" --max_poaps 50 --claim_start $CLAIM_START --claim_end $CLAIM_END --metadata_uri "https://example.com/meta.json" --image_url "https://example.com/img.png" | grep -oE '[0-9]+' | head -1)
export EVENT_ID=$EVENT_ID

# 5. Ver evento creado
stellar contract invoke --id $CONTRACT_ID --source deployer --network testnet -- get_event --event_id $EVENT_ID

# 6. Fundear cuenta de usuario
stellar account fund $USER --network testnet

# 7. Reclamar SPOT
TOKEN_ID=$(stellar contract invoke --id $CONTRACT_ID --source $USER --network testnet -- claim --event_id $EVENT_ID --to $USER | grep -oE '[0-9]+' | head -1)
export TOKEN_ID=$TOKEN_ID

# 8. Verificar balance
stellar contract invoke --id $CONTRACT_ID --source deployer --network testnet -- balance --id $USER

# 9. Verificar dueño del token
stellar contract invoke --id $CONTRACT_ID --source deployer --network testnet -- owner_of --token_id $TOKEN_ID

# 10. Ver minted_count
stellar contract invoke --id $CONTRACT_ID --source deployer --network testnet -- minted_count --event_id $EVENT_ID
```

---

## 🚀 Ejecutar Script Automatizado

Si prefieres ejecutar todo automáticamente:

```bash
cd /home/sistemas/Escritorio/Stellar/commitsPre
./PRUEBAS_CONTRATO.sh
```

Este script:
- ✅ Configura credenciales
- ✅ Compila el contrato
- ✅ Lo despliega
- ✅ Prueba todas las funciones
- ✅ Muestra los resultados

---

## ⚠️ Notas Importantes

1. **Orden de ejecución**: Debes aprobar al creador ANTES de crear eventos
2. **Timestamps**: `claim_start` debe ser <= tiempo actual para poder reclamar
3. **Fondos**: Asegúrate de que las cuentas tengan XLM para pagar transacciones
4. **Contract ID**: Guárdalo después del deploy, lo necesitarás siempre

---

## 🐛 Errores Comunes

### `CreatorNotApproved`
**Solución**: Ejecuta `approve_creator()` primero

### `ClaimPeriodNotStarted`
**Solución**: Asegúrate que `claim_start <= tiempo_actual`

### `ClaimPeriodEnded`
**Solución**: Asegúrate que `claim_end > tiempo_actual`

### `AlreadyClaimed`
**Solución**: La wallet ya tiene un SPOT de ese evento (normal, prueba con otra wallet)

---

## 📊 Ver Resultados en Exploradores

- **Stellar Expert**: https://stellar.expert/explorer/testnet
- Busca tu Contract ID o dirección admin: `GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2`

---

**¿Listo?** Empieza con el Paso 1 y sigue en orden. Si algún comando falla, revisa los errores en la salida.

