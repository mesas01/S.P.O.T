#!/bin/bash

# =============================================================================
# Script para Probar el Contrato SPOT/POAP
# =============================================================================

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuración
ADMIN="GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2"
USER="CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF"
SECRET_KEY="SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W"
NETWORK="testnet"
SEED_PHRASE="food cereal gasp worth hawk army club silent fold insect glimpse danger weasel fever bar permit pledge act label upon gift alley private transfer"

# Variables que se llenarán durante la ejecución
CONTRACT_ID=""
EVENT_ID=""
TOKEN_ID=""

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Pruebas del Contrato SPOT/POAP${NC}"
echo -e "${BLUE}================================================${NC}\n"

# Función para mostrar sección
print_section() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Función para mostrar comando antes de ejecutar
print_command() {
    echo -e "${GREEN}Ejecutando:${NC} $1\n"
}

# =============================================================================
# PASO 1: Configurar Credenciales
# =============================================================================
print_section "PASO 1: Configurar Credenciales"

echo "Configurando identidad 'deployer' en Stellar CLI..."

# Verificar si la identidad ya existe
if stellar keys list --network $NETWORK 2>/dev/null | grep -q "deployer"; then
    echo "✓ Identidad 'deployer' ya existe"
else
    # Guardar identidad usando seed phrase
    stellar keys save \
        --network $NETWORK \
        --seed-phrase "$SEED_PHRASE" \
        deployer
    
    if [ $? -eq 0 ]; then
        echo "✓ Identidad configurada exitosamente"
    else
        echo -e "${RED}✗ Error al configurar identidad${NC}"
        exit 1
    fi
fi

# Verificar balance
print_command "Verificando balance de la cuenta..."
stellar account fund deployer --network $NETWORK 2>&1 | head -5
echo ""

# =============================================================================
# PASO 2: Compilar Contrato
# =============================================================================
print_section "PASO 2: Compilar Contrato"

cd blockotitos

print_command "Compilando contrato POAP..."
cargo build --target wasm32v1-none --release --package poap

if [ ! -f "target/wasm32v1-none/release/poap.wasm" ]; then
    echo -e "${RED}✗ Error: No se encontró el archivo WASM${NC}"
    exit 1
fi

WASM_SIZE=$(ls -lh target/wasm32v1-none/release/poap.wasm | awk '{print $5}')
echo -e "${GREEN}✓ Contrato compilado: poap.wasm (${WASM_SIZE})${NC}\n"

# =============================================================================
# PASO 3: Desplegar Contrato
# =============================================================================
print_section "PASO 3: Desplegar Contrato en Testnet"

print_command "Desplegando contrato..."
DEPLOY_OUTPUT=$(stellar contract deploy \
    --wasm target/wasm32v1-none/release/poap.wasm \
    --source deployer \
    --network $NETWORK \
    -- --admin $ADMIN 2>&1)

echo "$DEPLOY_OUTPUT"

# Extraer Contract ID de la salida
CONTRACT_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE "C[A-Z0-9]{55}" | head -1)

if [ -z "$CONTRACT_ID" ]; then
    echo -e "${RED}✗ Error: No se pudo obtener el Contract ID${NC}"
    echo "Por favor, copia manualmente el Contract ID de la salida anterior"
    read -p "Contract ID: " CONTRACT_ID
fi

echo -e "\n${GREEN}✓ Contrato desplegado${NC}"
echo -e "${BLUE}Contract ID: ${CONTRACT_ID}${NC}\n"

# Guardar en variable de entorno
export CONTRACT_ID=$CONTRACT_ID

# Crear alias para facilitar comandos futuros
stellar contract create-alias \
    --id $CONTRACT_ID \
    --network $NETWORK \
    spot-contract 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Alias 'spot-contract' creado"
fi

# =============================================================================
# PASO 4: Probar Funciones Básicas
# =============================================================================
print_section "PASO 4: Funciones Básicas"

# 4.1 Admin
print_command "admin() - Obtener dirección del admin"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- admin
echo ""

# 4.2 Event Count
print_command "event_count() - Obtener número de eventos"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- event_count
echo ""

# 4.3 Get All Events
print_command "get_all_events() - Obtener todos los eventos"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- get_all_events
echo ""

# =============================================================================
# PASO 5: Aprobar Creador
# =============================================================================
print_section "PASO 5: Aprobar Creador"

print_command "approve_creator() - Aprobar creador para crear eventos"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- approve_creator \
        --operator $ADMIN \
        --creator $ADMIN \
        --payment_reference "TEST-PAYMENT-001"
echo ""

# Verificar aprobación
print_command "get_creator_approval() - Verificar aprobación"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- get_creator_approval \
        --creator $ADMIN
echo ""

# =============================================================================
# PASO 6: Crear Evento
# =============================================================================
print_section "PASO 6: Crear Evento"

# Calcular timestamps
CURRENT_TIME=$(date +%s)
EVENT_DATE=$((CURRENT_TIME + 86400))  # +1 día
CLAIM_START=$CURRENT_TIME              # Ahora
CLAIM_END=$((CURRENT_TIME + 604800))   # +7 días

echo "Timestamps calculados:"
echo "  Event Date: $EVENT_DATE ($(date -d @$EVENT_DATE 2>/dev/null || echo 'mañana'))"
echo "  Claim Start: $CLAIM_START (ahora)"
echo "  Claim End: $CLAIM_END (en 7 días)"
echo ""

print_command "create_event() - Crear nuevo evento"
CREATE_OUTPUT=$(stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- create_event \
        --creator $ADMIN \
        --event_name "Hackathon Stellar 2024" \
        --event_date $EVENT_DATE \
        --location "Bogotá, Colombia" \
        --description "Annual Stellar Hackathon - Prueba de Contrato" \
        --max_poaps 100 \
        --claim_start $CLAIM_START \
        --claim_end $CLAIM_END \
        --metadata_uri "https://example.com/metadata.json" \
        --image_url "https://example.com/image.png" 2>&1)

echo "$CREATE_OUTPUT"

# Extraer Event ID
EVENT_ID=$(echo "$CREATE_OUTPUT" | grep -oE '[0-9]+' | head -1)

if [ -z "$EVENT_ID" ]; then
    echo -e "${YELLOW}⚠ No se pudo extraer Event ID automáticamente${NC}"
    read -p "Ingresa el Event ID manualmente: " EVENT_ID
fi

echo -e "\n${GREEN}✓ Evento creado${NC}"
echo -e "${BLUE}Event ID: ${EVENT_ID}${NC}\n"
export EVENT_ID=$EVENT_ID

# =============================================================================
# PASO 7: Obtener Información del Evento
# =============================================================================
print_section "PASO 7: Obtener Información del Evento"

print_command "get_event() - Obtener información completa del evento"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- get_event \
        --event_id $EVENT_ID
echo ""

print_command "minted_count() - Obtener número de SPOTs minteados"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- minted_count \
        --event_id $EVENT_ID
echo ""

print_command "event_count() - Número total de eventos"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- event_count
echo ""

# =============================================================================
# PASO 8: Reclamar SPOT (Claim)
# =============================================================================
print_section "PASO 8: Reclamar SPOT"

# Fundear cuenta de usuario si es necesario
echo "Fundando cuenta de usuario si es necesario..."
stellar account fund $USER --network $NETWORK 2>&1 | head -3
echo ""

print_command "claim() - Reclamar SPOT para el usuario"
CLAIM_OUTPUT=$(stellar contract invoke \
    --id $CONTRACT_ID \
    --source $USER \
    --network $NETWORK \
    -- claim \
        --event_id $EVENT_ID \
        --to $USER 2>&1)

echo "$CLAIM_OUTPUT"

# Extraer Token ID
TOKEN_ID=$(echo "$CLAIM_OUTPUT" | grep -oE '[0-9]+' | head -1)

if [ -z "$TOKEN_ID" ]; then
    echo -e "${YELLOW}⚠ No se pudo extraer Token ID automáticamente${NC}"
    read -p "Ingresa el Token ID manualmente: " TOKEN_ID
fi

echo -e "\n${GREEN}✓ SPOT reclamado exitosamente${NC}"
echo -e "${BLUE}Token ID: ${TOKEN_ID}${NC}\n"
export TOKEN_ID=$TOKEN_ID

# =============================================================================
# PASO 9: Verificar Claim
# =============================================================================
print_section "PASO 9: Verificar Claim"

print_command "has_claimed() - Verificar si el usuario ya reclamó"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- has_claimed \
        --event_id $EVENT_ID \
        --address $USER
echo ""

print_command "minted_count() - Verificar cuántos SPOTs se han minteado"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- minted_count \
        --event_id $EVENT_ID
echo ""

print_command "get_user_poap_for_event() - Obtener token_id del usuario"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- get_user_poap_for_event \
        --event_id $EVENT_ID \
        --address $USER
echo ""

# =============================================================================
# PASO 10: Funciones NFT Estándar
# =============================================================================
print_section "PASO 10: Funciones NFT Estándar (SEP-41)"

print_command "balance() - Balance de NFTs del usuario"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- balance \
        --id $USER
echo ""

print_command "owner_of() - Obtener dueño del token"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- owner_of \
        --token_id $TOKEN_ID
echo ""

print_command "token_uri() - Obtener URI del token"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- token_uri \
        --token_id $TOKEN_ID
echo ""

print_command "name() - Nombre del contrato"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- name
echo ""

print_command "symbol() - Símbolo del contrato"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- symbol
echo ""

# =============================================================================
# PASO 11: Funciones Adicionales
# =============================================================================
print_section "PASO 11: Funciones Adicionales"

print_command "get_event_poaps() - Obtener todos los token_ids del evento"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- get_event_poaps \
        --event_id $EVENT_ID
echo ""

print_command "get_token_id_for_event() - Obtener token_id por índice"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- get_token_id_for_event \
        --event_id $EVENT_ID \
        --token_index 0
echo ""

print_command "get_all_events() - Obtener lista de todos los eventos"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- get_all_events
echo ""

# =============================================================================
# PASO 12: Actualizar Evento
# =============================================================================
print_section "PASO 12: Actualizar Evento"

print_command "update_event() - Actualizar información del evento"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- update_event \
        --operator $ADMIN \
        --event_id $EVENT_ID \
        --event_name "Hackathon Stellar 2024 - Actualizado" \
        --location "Medellín, Colombia"
echo ""

# Verificar actualización
print_command "get_event() - Verificar evento actualizado"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- get_event \
        --event_id $EVENT_ID
echo ""

# =============================================================================
# RESUMEN
# =============================================================================
print_section "RESUMEN DE PRUEBAS"

echo -e "${GREEN}✓ Todas las pruebas completadas${NC}\n"
echo "Información importante:"
echo -e "  ${BLUE}Contract ID:${NC} $CONTRACT_ID"
echo -e "  ${BLUE}Event ID:${NC} $EVENT_ID"
echo -e "  ${BLUE}Token ID:${NC} $TOKEN_ID"
echo -e "  ${BLUE}Admin:${NC} $ADMIN"
echo -e "  ${BLUE}User:${NC} $USER"
echo ""
echo "Para usar el contrato en comandos futuros:"
echo "  stellar contract invoke --id $CONTRACT_ID --source deployer --network testnet -- <funcion>"
echo ""
echo "O usando el alias:"
echo "  stellar contract invoke --id spot-contract --source deployer --network testnet -- <funcion>"

