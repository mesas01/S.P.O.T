# SPOT Global Contract

Contrato Soroban que gestiona múltiples eventos SPOT (Stellar Proof of Attendance Token) dentro de un único deployment.
El flujo está optimizado para un **backend administrador** que valida pagos
operativos fuera de cadena antes de habilitar a cada organizador.

## Flujo operativo recomendado

1. **Cobro off-chain**  
   - El backend recibe el pago (fiat, USDC, etc.) por los costos operativos.
   - Devuelve un identificador (`payment_reference`) único para esa orden.

2. **Aprobación on-chain**  
   - El backend (cuenta admin) invoca `approve_creator` pasando la cuenta del
     organizador y el `payment_reference`.  
   - El contrato:
     - Otorga el rol `creator`.
     - Persiste la metadata de aprobación (`CreatorApproval`) con el hash/ID del pago,
       la marca de tiempo y el admin responsable.

3. **Creación de evento por el organizador**  
   - El organizador llama `create_event` firmando la transacción desde su cuenta.  
   - El contrato exige:
     - Que mantenga el rol `creator`.
     - Que exista una aprobación vigente (`CreatorNotApproved` en caso contrario).
     - Que la cuenta firmante sea la misma que se registra como `creator`, por lo que
       **esa cuenta asume las tarifas de ejecución y almacenamiento**.

4. **Recaudos/Reversiones**  
   - Si se reembolsa al organizador, el backend llama `revoke_creator_approval`.
   - Esto elimina el registro de pago y retira el rol `creator`, bloqueando futuras
     creaciones hasta que vuelva a pagar.

## Endpoints expuestos

| Función | Descripción |
|---------|-------------|
| `approve_creator(operator, creator, payment_reference)` | Admin registra el pago off-chain y otorga rol `creator`. |
| `revoke_creator_approval(operator, creator)` | Revoca rol y borra la aprobación (útil para reembolsos o fraudes). |
| `get_creator_approval(creator)` | Devuelve metadata (`payment_reference`, `approved_at`, `approved_by`). |
| `create_event(creator, ...)` | Sólo creators aprobados (o admins) pueden ejecutar y deben firmar. |
| `claim(event_id, to)` | Los asistentes reclaman su SPOT dentro de la ventana definida. |

> Nota: `grant_creator_role`/`revoke_creator_role` fueron sustituidos por los nuevos
> métodos que registran explícitamente el pago.

## Reglas claves

- El contrato **no maneja fondos** ni cobra automáticamente; depende de la evidencia
  off-chain que registre el backend como `payment_reference`.
- Los organizadores son quienes **firmarán y pagarán** las transacciones de
  `create_event`, alineando las tarifas con quien realmente organiza.
- Los asistentes pueden reclamar (`claim`) siempre que el evento esté dentro de su
  ventana y aún haya cupos (`max_poaps`).

## Cómo ejecutar pruebas

```bash
cargo test -p poap
```

Las pruebas cubren:
- Requisito de aprobación antes de crear un evento.
- Revocación de aprobación impidiendo eventos futuros.

## Integración sugerida para el backend

1. Recibe la solicitud de un organizador.
2. Cobra el fee y genera un `payment_reference`.
3. Ejecuta `approve_creator` con la cuenta del organizador.
4. Devuelve el `payment_reference` y la dirección del contrato al organizador.
5. El organizador crea y gestiona su evento directamente contra la blockchain.

Este diseño mantiene la UX simple para el hackathon, documenta claramente el
enlace entre pagos off-chain y permisos on-chain, y permite auditar quién autorizó
cada organizador.

> **Backend de referencia:** en `backend/` encontrarás un servidor Express listo
> para correr (`npm install && npm run dev`). Consulta `backend/README.md` para
> pasos detallados y cómo probar los endpoints con Postman/curl.
