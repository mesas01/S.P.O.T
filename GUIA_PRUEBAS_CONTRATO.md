# 🧪 Guía Paso a Paso para Probar el Contrato SPOT

Esta guía te mostrará cómo desplegar y probar todas las funciones del contrato SPOT en testnet.

## 📋 Prerrequisitos

1. ✅ Stellar CLI instalado
2. ✅ Contrato compilado
3. ✅ Cuenta en testnet con fondos
4. ✅ Credenciales guardadas de forma segura

---

## 🔐 Paso 1: Configurar Credenciales

### Opción A: Usar la frase secreta directamente

```bash
# Configurar la identidad en Stellar CLI
cd blockotitos

stellar keys add deployer \
  --seed-phrase "food cereal gasp worth hawk army club silent fold insect glimpse danger weasel fever bar permit pledge act label upon gift alley private transfer"
```

### Opción B: Usar la clave privada (Recomendado - Interactivo)

```bash
cd blockotitos

# Ejecutar este comando y cuando pida la clave, pegarla
stellar keys add deployer --secret-key

# Cuando pida "Enter secret (S) key:", pega:
# SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W
```

**Nota**: En las versiones recientes de Stellar CLI, el comando `keys add` pide la clave **interactivamente**. Simplemente ejecuta el comando y cuando pida la clave, pégala.

### Opción C: Usar directamente sin guardar (Alternativa)

Si prefieres no guardar la identidad, puedes usar directamente la clave privada en cada comando con `--source-account`:

```bash
# No necesitas guardar nada, solo usa --source-account en cada comando
stellar contract deploy \
  --wasm target/wasm32v1-none/release/poap.wasm \
  --source-account SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W \
  --network testnet \
  -- --admin GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

### Verificar que la cuenta tenga fondos

```bash
# Verificar que la identidad se guardó correctamente
stellar keys public-key deployer

# Fundear la cuenta en testnet
stellar keys fund deployer --network testnet

# O verificar balance existente usando stellar CLI directamente
# (No hay comando 'account get' en Stellar CLI, usa un explorador web)
```

**Nota**: La dirección pública es: `GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2`

---

## 🔨 Paso 2: Compilar el Contrato

```bash
cd blockotitos

# Compilar el contrato POAP/SPOT
cargo build --target wasm32v1-none --release --package poap

# Verificar que el WASM se generó
ls -lh target/wasm32v1-none/release/poap.wasm
```

**Ruta del WASM**: `target/wasm32v1-none/release/poap.wasm`

---

## 🚀 Paso 3: Desplegar el Contrato

```bash
cd blockotitos

# Desplegar el contrato en testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/poap.wasm \
  --source deployer \
  --network testnet \
  -- --admin GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

**⚠️ IMPORTANTE**: Guarda el Contract ID que te devuelve. Lo necesitarás para todas las invocaciones.

**Ejemplo de salida**:
```
Contract deployed: CABC123...
```

Guarda este ID, por ejemplo:
```bash
export CONTRACT_ID="CABC123..."
```

O crea un alias:
```bash
stellar contract create-alias \
  --id CABC123... \
  --network testnet \
  spot-contract
```

---

## 📝 Paso 4: Probar las Funciones del Contrato

### Función 1: `__constructor` (ya se ejecutó en el deploy)

✅ Ya completado durante el deploy.

---

### Función 2: `admin()` - Obtener el admin

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- admin
```

**Resultado esperado**: Debería devolver tu dirección admin:
```
GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

---

### Función 3: `approve_creator()` - Aprobar un creador

Antes de crear un evento, necesitas aprobar al creador:

```bash
# Aprobar el creador (puede ser la misma cuenta o diferente)
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- approve_creator \
    --operator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 \
    --creator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 \
    --payment_reference "PAY-REF-001"
```

**Nota**: `operator` es quien ejecuta la función (debe ser admin), `creator` es quien podrá crear eventos.

---

### Función 4: `get_creator_approval()` - Ver aprobación de creador

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- get_creator_approval \
    --creator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

**Resultado esperado**: Objeto con `payment_reference`, `approved_at`, `approved_by`

---

### Función 5: `create_event()` - Crear un evento

**Primero necesitas aprobar al creador** (paso 3), luego:

```bash
# Calcular timestamps (ejemplo: evento mañana, claim por 7 días)
CURRENT_TIME=$(date +%s)
EVENT_DATE=$((CURRENT_TIME + 86400))  # +1 día
CLAIM_START=$CURRENT_TIME
CLAIM_END=$((CURRENT_TIME + 604800))  # +7 días

stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- create_event \
    --creator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 \
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

**Resultado esperado**: Un número (event_id), por ejemplo: `1`

**Guarda el event_id**:
```bash
export EVENT_ID=1
```

---

### Función 6: `get_event()` - Obtener información del evento

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- get_event \
    --event_id $EVENT_ID
```

**Resultado esperado**: Objeto `EventData` con toda la información del evento

---

### Función 7: `event_count()` - Obtener número total de eventos

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- event_count
```

**Resultado esperado**: Un número (ejemplo: `1`)

---

### Función 8: `get_all_events()` - Obtener todos los eventos

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- get_all_events
```

**Resultado esperado**: Vector con IDs de eventos (ejemplo: `[1]`)

---

### Función 9: `claim()` - Reclamar un SPOT

Para que un usuario reclame un SPOT, necesita:
1. Un wallet diferente al creador (opcional, pero recomendado para pruebas)
2. El event_id del evento

```bash
# Crear/fundear una cuenta de prueba para el usuario
stellar account fund USER_ACCOUNT --network testnet

# Reclamar SPOT
stellar contract invoke \
  --id spot-contract \
  --source USER_ACCOUNT \
  --network testnet \
  -- claim \
    --event_id $EVENT_ID \
    --to CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF
```

**Resultado esperado**: Un token_id (ejemplo: `0`)

**Guarda el token_id**:
```bash
export TOKEN_ID=0
```

---

### Función 10: `has_claimed()` - Verificar si ya reclamó

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- has_claimed \
    --event_id $EVENT_ID \
    --address CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF
```

**Resultado esperado**: `true` o `false`

---

### Función 11: `minted_count()` - Obtener número de SPOTs minteados

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- minted_count \
    --event_id $EVENT_ID
```

**Resultado esperado**: Un número (ejemplo: `1`)

---

### Función 12: `get_user_poap_for_event()` - Obtener token_id del usuario

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- get_user_poap_for_event \
    --event_id $EVENT_ID \
    --address CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF
```

**Resultado esperado**: El token_id del SPOT (ejemplo: `0`)

---

### Función 13: `get_event_poaps()` - Obtener todos los token_ids del evento

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- get_event_poaps \
    --event_id $EVENT_ID
```

**Resultado esperado**: Vector con token_ids (ejemplo: `[0]`)

---

### Función 14: `get_token_id_for_event()` - Obtener token_id por índice

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- get_token_id_for_event \
    --event_id $EVENT_ID \
    --token_index 0
```

**Resultado esperado**: El token_id (ejemplo: `0`)

---

### Función 15: `update_event()` - Actualizar información del evento

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- update_event \
    --operator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 \
    --event_id $EVENT_ID \
    --event_name "Hackathon Stellar 2024 - Actualizado" \
    --location "Medellín, Colombia"
```

**Nota**: Solo puedes actualizar campos opcionales. Si no quieres actualizar un campo, no lo incluyas.

---

### Función 16: `grant_admin_role()` - Otorgar rol de admin

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- grant_admin_role \
    --admin CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF \
    --operator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

---

### Función 17: `revoke_creator_approval()` - Revocar aprobación de creador

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- revoke_creator_approval \
    --operator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 \
    --creator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

---

## 🎯 Funciones NFT Estándar (SEP-41)

### `balance()` - Balance de NFTs de una cuenta

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- balance \
    --id CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF
```

**Resultado esperado**: Número de NFTs que tiene la cuenta

---

### `owner_of()` - Obtener dueño de un token

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- owner_of \
    --token_id $TOKEN_ID
```

**Resultado esperado**: Dirección del dueño

---

### `token_uri()` - Obtener URI del token

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- token_uri \
    --token_id $TOKEN_ID
```

**Resultado esperado**: URI de metadata del token

---

### `name()` - Nombre del contrato

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- name
```

**Resultado esperado**: "SPOT" (o el nombre configurado)

---

### `symbol()` - Símbolo del contrato

```bash
stellar contract invoke \
  --id spot-contract \
  --source deployer \
  --network testnet \
  -- symbol
```

**Resultado esperado**: "SPOT"

---

## 📋 Script Completo de Pruebas

Aquí tienes un script bash completo que puedes ejecutar:

```bash
#!/bin/bash

# Configuración
CONTRACT_ID="TU_CONTRACT_ID_AQUI"  # Reemplaza después del deploy
ADMIN="GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2"
USER="CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF"
NETWORK="testnet"

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Probando Contrato SPOT ===${NC}\n"

# 1. Admin
echo -e "${GREEN}1. Obteniendo admin...${NC}"
stellar contract invoke --id $CONTRACT_ID --source deployer --network $NETWORK -- admin
echo ""

# 2. Aprobar creador
echo -e "${GREEN}2. Aprobando creador...${NC}"
stellar contract invoke --id $CONTRACT_ID --source deployer --network $NETWORK -- approve_creator \
  --operator $ADMIN \
  --creator $ADMIN \
  --payment_reference "PAY-REF-001"
echo ""

# 3. Crear evento
CURRENT_TIME=$(date +%s)
EVENT_DATE=$((CURRENT_TIME + 86400))
CLAIM_START=$CURRENT_TIME
CLAIM_END=$((CURRENT_TIME + 604800))

echo -e "${GREEN}3. Creando evento...${NC}"
EVENT_ID=$(stellar contract invoke --id $CONTRACT_ID --source deployer --network $NETWORK -- create_event \
  --creator $ADMIN \
  --event_name "Test Event" \
  --event_date $EVENT_DATE \
  --location "Test Location" \
  --description "Test Description" \
  --max_poaps 100 \
  --claim_start $CLAIM_START \
  --claim_end $CLAIM_END \
  --metadata_uri "https://example.com/metadata.json" \
  --image_url "https://example.com/image.png" | grep -o '[0-9]*' | head -1)

echo "Event ID: $EVENT_ID"
echo ""

# 4. Obtener evento
echo -e "${GREEN}4. Obteniendo información del evento...${NC}"
stellar contract invoke --id $CONTRACT_ID --source deployer --network $NETWORK -- get_event --event_id $EVENT_ID
echo ""

# 5. Claim SPOT
echo -e "${GREEN}5. Reclamando SPOT...${NC}"
TOKEN_ID=$(stellar contract invoke --id $CONTRACT_ID --source $USER --network $NETWORK -- claim \
  --event_id $EVENT_ID \
  --to $USER | grep -o '[0-9]*' | head -1)

echo "Token ID: $TOKEN_ID"
echo ""

# 6. Verificar balance
echo -e "${GREEN}6. Verificando balance de NFTs...${NC}"
stellar contract invoke --id $CONTRACT_ID --source deployer --network $NETWORK -- balance --id $USER
echo ""

# 7. Obtener dueño del token
echo -e "${GREEN}7. Obteniendo dueño del token...${NC}"
stellar contract invoke --id $CONTRACT_ID --source deployer --network $NETWORK -- owner_of --token_id $TOKEN_ID
echo ""

echo -e "${BLUE}=== Pruebas completadas ===${NC}"
```

---

## 🔍 Verificar Resultados

### Ver transacciones del contrato

Puedes ver todas las transacciones en:
- **Stellar Expert**: https://stellar.expert/explorer/testnet/account/GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
- **Soroban Explorer**: (buscar el contract_id en testnet)

---

## ⚠️ Notas Importantes

1. **Timestamps**: Los timestamps deben estar en segundos Unix. Usa `date +%s` para obtener el actual.

2. **Claim Period**: 
   - `claim_start` debe ser <= tiempo actual para poder reclamar
   - `claim_end` debe ser > `claim_start`

3. **Aprobación de Creador**: 
   - Debes aprobar al creador ANTES de crear eventos
   - Solo el admin puede aprobar creadores

4. **Fondos**: 
   - Asegúrate de que las cuentas tengan fondos para pagar las transacciones
   - En testnet puedes usar friendbot: `stellar account fund ACCOUNT --network testnet`

5. **Errores Comunes**:
   - `CreatorNotApproved`: Aprobar al creador primero
   - `ClaimPeriodNotStarted`: Ajustar `claim_start` al pasado
   - `ClaimPeriodEnded`: Ajustar `claim_end` al futuro
   - `AlreadyClaimed`: La wallet ya tiene un SPOT de ese evento

---

## 📝 Ejemplo Completo Paso a Paso

### 1. Configurar identidad
```bash
cd blockotitos
stellar keys save --network testnet --seed-phrase "food cereal gasp worth hawk army club silent fold insect glimpse danger weasel fever bar permit pledge act label upon gift alley private transfer" deployer
```

### 2. Fundear cuenta (si es necesario)
```bash
stellar account fund deployer --network testnet
```

### 3. Compilar
```bash
cargo build --target wasm32v1-none --release --package poap
```

### 4. Desplegar
```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/poap.wasm \
  --source deployer \
  --network testnet \
  -- --admin GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2

# Guarda el Contract ID
export CONTRACT_ID="C..."
```

### 5. Aprobar creador
```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- approve_creator \
    --operator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 \
    --creator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 \
    --payment_reference "TEST-001"
```

### 6. Crear evento
```bash
CURRENT=$(date +%s)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- create_event \
    --creator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 \
    --event_name "Mi Primer Evento" \
    --event_date $((CURRENT + 86400)) \
    --location "Bogotá" \
    --description "Evento de prueba" \
    --max_poaps 50 \
    --claim_start $CURRENT \
    --claim_end $((CURRENT + 604800)) \
    --metadata_uri "https://example.com/meta.json" \
    --image_url "https://example.com/img.png"
```

### 7. Reclamar SPOT
```bash
# Guardar event_id de la respuesta anterior
export EVENT_ID=1

stellar contract invoke \
  --id $CONTRACT_ID \
  --source CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF \
  --network testnet \
  -- claim \
    --event_id $EVENT_ID \
    --to CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF
```

---

**¿Listo para probar?** Sigue los pasos en orden y guarda los resultados de cada comando.

