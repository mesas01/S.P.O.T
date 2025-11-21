# SPOT CLI Cheatsheet

Llaves y contrato de pruebas (testnet):

- **Admin (pública):** `GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2`
- **Admin (secreta):** `SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W`
- **Contrato:** `CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF`

> Todos los comandos usan `stellar contract invoke` en **testnet**. Cambia parámetros si necesitas otra red.

---

### 1. Constructor (`__constructor`)

```
stellar contract invoke `
  --id CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF `
  --source SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W `
  --network testnet `
  -- `
  __constructor `
  --admin GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2
```

### 2. Consultar admin

```
stellar contract invoke `
  --id CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF `
  --source SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W `
  --network testnet `
  -- `
  admin
```

### 3. Aprobar organizador

```
stellar contract invoke `
  --id CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF `
  --source SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W `
  --network testnet `
  -- `
  approve_creator `
  --operator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 `
  --creator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 `
  --payment_reference "invoice-001"
```

### 4. Crear evento (el creator firma)

```
stellar contract invoke `
  --id CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF `
  --source SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W `
  --network testnet `
  -- `
  create_event `
  --creator GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2 `
  --event_name "Hackathon" `
  --event_date 1735689600 `
  --location "Bogotá" `
  --description "SPOT Demo" `
  --max_poaps 100 `
  --claim_start 1735689600 `
  --claim_end 1736294400 `
  --metadata_uri "https://example.com/metadata.json" `
  --image_url "https://example.com/image.png"
```

### 5. Reclamar badge

```
stellar contract invoke `
  --id CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF `
  --source <SEED_DEL_ASISTENTE> `
  --network testnet `
  -- `
  claim `
  --event_id 1 `
  --to <CUENTA_DEL_ASISTENTE>
```

### 6. Lecturas varias

```
stellar contract invoke ... -- get_event --event_id 1
stellar contract invoke ... -- minted_count --event_id 1
stellar contract invoke ... -- has_claimed --event_id 1 --address <addr>
stellar contract invoke ... -- get_all_events
```

Reemplaza “...” por los parámetros base (`--id`, `--source`, `--network`, `--`). Guarda este archivo a mano para no tener que recordar cada flag. ***

