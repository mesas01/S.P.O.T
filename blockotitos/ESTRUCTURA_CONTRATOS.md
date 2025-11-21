# 📂 Estructura de Contratos - SPOT

## 🔍 Diferencia entre carpetas

### `/blockotitos/contracts/` - Contratos Rust (Fuente)
**Ubicación**: `/home/sistemas/Escritorio/Stellar/commitsPre/blockotitos/contracts/`

Esta es la carpeta **principal** donde están los contratos inteligentes escritos en **Rust**:

```
contracts/
├── poap/              # Contrato POAP/SPOT principal
│   ├── Cargo.toml
│   └── src/
│       ├── contract.rs
│       ├── error.rs
│       └── lib.rs
├── spot-event/        # Contrato de eventos SPOT
├── spot-factory/      # Contrato factory para crear eventos
└── nft-enumerable/    # Contrato NFT enumerable
```

**Estos son los contratos reales** que se compilan a WebAssembly (WASM) y se despliegan en la blockchain de Stellar.

---

### `/blockotitos/src/contracts/` - Bindings TypeScript (Cliente)
**Ubicación**: `/home/sistemas/Escritorio/Stellar/commitsPre/blockotitos/src/contracts/`

Esta carpeta contiene los **bindings/clients TypeScript** generados automáticamente para interactuar con los contratos desde el frontend:

```
src/contracts/
├── util.ts           # Utilidades (red, RPC, etc.)
└── (otros archivos generados automáticamente)
```

**Estos archivos se generan automáticamente** cuando:
- Compilas los contratos Rust
- El scaffold de Stellar detecta contratos desplegados
- Ejecutas comandos de build

---

## 🔄 Flujo de trabajo

1. **Escribes el contrato** en `/contracts/poap/src/contract.rs` (Rust)
2. **Compilas** el contrato: `stellar contract build`
3. **Despliegas** el contrato: `stellar contract deploy`
4. **Se generan automáticamente** los bindings TypeScript en `/src/contracts/`
5. **Usas los bindings** en tu frontend para interactuar con el contrato

---

## ✅ Lo que debes saber

- **`/contracts/`** = Contratos Rust (fuente) ✅ **AQUÍ trabajas**
- **`/src/contracts/`** = Bindings TypeScript (generados) ⚠️ **No edites manualmente**

Si borraste algo en `/src/contracts/`, no te preocupes:
- Se regenerarán automáticamente cuando compiles/despliegues los contratos
- Solo necesitas tener los contratos en `/contracts/` correctamente

---

## 📝 Contratos de SPOT

Los contratos principales que estás usando son:

1. **`poap/`** - Contrato principal de SPOT (NFT de asistencia)
2. **`spot-event/`** - Contrato de eventos individuales
3. **`spot-factory/`** - Factory para crear múltiples eventos

Todos están en `/blockotitos/contracts/` ✅

