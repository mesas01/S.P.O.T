# 🔐 Configurar Credenciales en Stellar CLI

## Método Correcto (Versión Actual de Stellar CLI v23.1.4)

### Opción 1: Usar Secret Key (Interactivo)

El comando `stellar keys add` con `--secret-key` **pide la clave interactivamente**:

```bash
cd blockotitos

# Ejecutar y cuando pida "Enter secret (S) key:", pegar la clave
stellar keys add deployer --secret-key
# Cuando pida la clave, pega: SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W
```

### Opción 2: Usar Secret Key (Una Línea con Echo)

```bash
cd blockotitos

echo "SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W" | stellar keys add deployer --secret-key
```

### Opción 3: Usar Seed Phrase (Interactivo)

```bash
cd blockotitos

stellar keys add deployer --seed-phrase
# Cuando pida la frase, pega: food cereal gasp worth hawk army club silent fold insect glimpse danger weasel fever bar permit pledge act label upon gift alley private transfer
```

### Opción 4: Usar Seed Phrase (Una Línea)

```bash
cd blockotitos

echo "food cereal gasp worth hawk army club silent fold insect glimpse danger weasel fever bar permit pledge act label upon gift alley private transfer" | stellar keys add deployer --seed-phrase
```

---

## Verificar que se Guardó Correctamente

```bash
# Listar todas las identidades
stellar keys ls

# Ver la clave pública de la identidad
stellar keys public-key deployer

# Debe mostrar: GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

---

## Fundear la Cuenta en Testnet

```bash
stellar keys fund deployer --network testnet
```

Este comando:
- Verifica que la cuenta existe
- Si no tiene fondos, los solicita del friendbot de testnet
- Muestra el balance actual

---

## Establecer como Identidad por Defecto (Opcional)

```bash
stellar keys use deployer
```

Esto permite omitir `--source deployer` en comandos futuros.

---

## Comandos Actualizados para la Guía

### Comando Correcto para Guardar Credenciales:

```bash
# Método más simple (usa echo para pasar la clave)
echo "SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W" | stellar keys add deployer --secret-key
```

### Verificar:

```bash
stellar keys public-key deployer
# Debe mostrar: GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

### Fundear:

```bash
stellar keys fund deployer --network testnet
```

---

## Notas Importantes

1. **No hay flag `--network`** en `stellar keys add` - las identidades son globales
2. **`--secret-key` y `--seed-phrase` están deprecated** pero aún funcionan (piden la clave interactivamente)
3. **Las identidades se guardan en**: `~/.config/stellar/` o `$XDG_CONFIG_HOME/stellar`
4. **Puedes usar `--secure-store`** para guardar en el almacén seguro del OS (recomendado para producción)

---

## Solución de Problemas

### Error: "Failed to find config identity for deployer"

La identidad no existe. Ejecuta `stellar keys add deployer` primero.

### Error: "identity already exists"

La identidad ya está guardada. Puedes:
- Verificar: `stellar keys public-key deployer`
- Eliminar y volver a crear: `stellar keys rm deployer`
- O simplemente usar la existente

### No puede fundear la cuenta

Asegúrate de:
1. Que la identidad esté guardada: `stellar keys ls`
2. Usar el flag `--network testnet`: `stellar keys fund deployer --network testnet`
3. Verificar que estés conectado a internet

---

**Comando completo listo para usar:**

```bash
cd blockotitos && echo "SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W" | stellar keys add deployer --secret-key && stellar keys public-key deployer && stellar keys fund deployer --network testnet
```

