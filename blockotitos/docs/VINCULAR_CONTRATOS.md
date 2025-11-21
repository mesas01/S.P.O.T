# Guía: Vincular Frontend con Contratos SPOT

Este documento explica cómo vincular el frontend con los contratos smart contracts para hacer un MVP funcional.

## Estructura de Contratos

### Contratos Disponibles

1. **`poap` (SPOT principal)**: Contrato principal que maneja todos los eventos en una sola instancia
   - Archivo: `contracts/poap/src/contract.rs`
   - Funciones principales:
     - `create_event()`: Crear un nuevo evento
     - `claim()`: Reclamar un SPOT para un evento
     - `get_event()`: Obtener información de un evento
     - `get_all_events()`: Obtener todos los IDs de eventos
     - `has_claimed()`: Verificar si un usuario ya reclamó
     - `minted_count()`: Obtener cantidad de SPOTs minteados

2. **`spot-factory`**: Factory para desplegar instancias de eventos (pendiente de completar)
   - Archivo: `contracts/spot-factory/src/contract.rs`

3. **`spot-event`**: Contrato individual por evento (alternativa al poap)
   - Archivo: `contracts/spot-event/src/contract.rs`

## Hooks Creados

### `useSpotContract()`
Hook para obtener un cliente del contrato SPOT (POAP).

```typescript
import { useSpotContract } from "../hooks/useSpotContract";

const contract = useSpotContract();
```

**Configuración requerida:**
- Variable de entorno: `VITE_SPOT_CONTRACT_ID` en `.env`
- O pasar `contractId` como parámetro

### `useCreateEvent()`
Hook para crear un nuevo evento SPOT.

```typescript
import { useCreateEvent } from "../hooks/useSpotActions";

const { mutate: createEvent, isLoading, error } = useCreateEvent();

// Crear evento
createEvent({
  eventName: "Hackathon Stellar 2024",
  eventDate: Math.floor(Date.now() / 1000), // Unix timestamp
  location: "Bogotá, Colombia",
  description: "Descripción del evento",
  maxSpots: 100,
  claimStart: Math.floor(Date.now() / 1000),
  claimEnd: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // +7 días
  metadataUri: "https://example.com/metadata.json",
  imageUrl: "https://example.com/image.jpg",
});
```

**Flujo:**
1. Construye la transacción con los parámetros
2. Prepara la transacción (simula y ensambla)
3. Solicita firma al usuario (wallet)
4. Envía la transacción a la red
5. Espera confirmación

### `useClaimSpot()`
Hook para reclamar un SPOT de un evento.

```typescript
import { useClaimSpot } from "../hooks/useSpotActions";

const { mutate: claimSpot, isLoading, error } = useClaimSpot();

// Reclamar SPOT para evento con ID 1
claimSpot(1);
```

**Validaciones en el contrato:**
- El periodo de claim debe estar activo
- El usuario no debe haber reclamado previamente
- No se debe haber excedido el límite máximo

### `useEventInfo(eventId)`
Hook para obtener información de un evento (solo lectura).

```typescript
import { useEventInfo } from "../hooks/useSpotActions";

const { data: eventInfo, isLoading, error } = useEventInfo(1);

// eventInfo contiene:
// {
//   event_id: number,
//   creator: string,
//   event_name: string,
//   event_date: string,
//   location: string,
//   description: string,
//   max_poaps: number,
//   claim_start: string,
//   claim_end: string,
//   metadata_uri: string,
//   image_url: string,
// }
```

### `useAllEvents()`
Hook para obtener todos los IDs de eventos.

```typescript
import { useAllEvents } from "../hooks/useSpotActions";

const { data: eventIds, isLoading } = useAllEvents();

// eventIds es un array de números: [1, 2, 3, ...]
```

### `useHasClaimed(eventId, userAddress?)`
Hook para verificar si un usuario ya reclamó un SPOT.

```typescript
import { useHasClaimed } from "../hooks/useSpotActions";

const { data: hasClaimed, isLoading } = useHasClaimed(1);

// hasClaimed es un boolean
```

### `useMintedCount(eventId)`
Hook para obtener la cantidad de SPOTs minteados de un evento.

```typescript
import { useMintedCount } from "../hooks/useSpotActions";

const { data: mintedCount, isLoading } = useMintedCount(1);

// mintedCount es un número
```

## Configuración

### Variables de Entorno

Crear/actualizar `.env` en `blockotitos/`:

```env
# Network
PUBLIC_STELLAR_NETWORK=TESTNET
PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Contract IDs (obtener después de desplegar contratos)
VITE_SPOT_CONTRACT_ID=CA7Y...  # ID del contrato poap desplegado
VITE_FACTORY_CONTRACT_ID=CB8Z...  # ID del contrato factory (opcional)
```

### Obtener Contract ID

Después de desplegar un contrato, obtienes un `contract_id`. Este debe configurarse en las variables de entorno.

Ejemplo de despliegue:
```bash
cd blockotitos/contracts/poap
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/poap.wasm --network testnet
```

El output incluye el `contract_id` que debes copiar a `.env`.

## Integración en Páginas

### Integrar `CreateEvent` con el Contrato

**Archivo:** `src/pages/CreateEvent.tsx`

```typescript
import { useCreateEvent } from "../hooks/useSpotActions";
import { useNotification } from "../hooks/useNotification";

const CreateEvent: React.FC = () => {
  const { mutate: createEvent, isLoading } = useCreateEvent();
  const { showNotification } = useNotification();

  const handleSubmit = async (formData) => {
    try {
      // Convertir fechas a timestamps Unix
      const eventDate = new Date(formData.eventDate).getTime() / 1000;
      const claimStart = new Date(formData.claimStart).getTime() / 1000;
      const claimEnd = new Date(formData.claimEnd).getTime() / 1000;

      // TODO: Subir imagen a IPFS/Firebase y obtener URL
      const imageUrl = formData.imagePreview || formData.imageUrl;
      const metadataUri = formData.metadataUri || "https://example.com/metadata.json";

      await createEvent({
        eventName: formData.eventName,
        eventDate,
        location: formData.location,
        description: formData.description,
        maxSpots: parseInt(formData.maxSpots),
        claimStart,
        claimEnd,
        metadataUri,
        imageUrl,
      });

      showNotification({
        type: "success",
        title: "Evento creado",
        message: "Tu evento SPOT ha sido creado exitosamente",
      });

      navigate("/my-events");
    } catch (error) {
      showNotification({
        type: "error",
        title: "Error",
        message: error.message || "Error al crear evento",
      });
    }
  };
};
```

### Integrar `Mint` con el Contrato

**Archivo:** `src/pages/Mint.tsx`

```typescript
import { useClaimSpot } from "../hooks/useSpotActions";
import { useEventInfo } from "../hooks/useSpotActions";
import { useHasClaimed } from "../hooks/useSpotActions";

const Mint: React.FC = () => {
  const [eventId, setEventId] = useState<number | null>(null);
  const { data: eventInfo } = useEventInfo(eventId || 0);
  const { data: hasClaimed } = useHasClaimed(eventId || 0);
  const { mutate: claimSpot, isLoading } = useClaimSpot();

  const handleClaim = () => {
    if (!eventId) return;
    
    claimSpot(eventId, {
      onSuccess: () => {
        showNotification({
          type: "success",
          title: "SPOT reclamado",
          message: "Has reclamado exitosamente tu SPOT",
        });
      },
      onError: (error) => {
        showNotification({
          type: "error",
          title: "Error",
          message: error.message || "Error al reclamar SPOT",
        });
      },
    });
  };
};
```

### Integrar `MyEvents` con el Contrato

**Archivo:** `src/pages/MyEvents.tsx`

```typescript
import { useAllEvents } from "../hooks/useSpotActions";
import { useEventInfo } from "../hooks/useSpotActions";
import { useMintedCount } from "../hooks/useSpotActions";
import { useWallet } from "../hooks/useWallet";

const MyEvents: React.FC = () => {
  const { address } = useWallet();
  const { data: allEventIds } = useAllEvents();

  // Para cada evento, obtener su información
  const eventsData = allEventIds?.map(eventId => {
    const { data: eventInfo } = useEventInfo(eventId);
    const { data: mintedCount } = useMintedCount(eventId);
    
    return {
      id: eventId,
      ...eventInfo,
      claimedSpots: mintedCount || 0,
    };
  });

  // Filtrar solo los eventos creados por el usuario conectado
  const myEvents = eventsData?.filter(
    event => event.creator === address
  ) || [];
};
```

## Notas Importantes

### 1. **Timestamps**
- Todas las fechas deben estar en formato Unix timestamp (segundos desde epoch)
- Usar `Math.floor(Date.now() / 1000)` para convertir fecha actual a timestamp

### 2. **Error Handling**
- Los errores del contrato se capturan y muestran al usuario
- Códigos de error comunes:
  - `CreatorNotApproved`: El creador no ha sido aprobado
  - `ClaimPeriodNotStarted`: El periodo de claim aún no ha comenzado
  - `ClaimPeriodEnded`: El periodo de claim ha terminado
  - `AlreadyClaimed`: El usuario ya reclamó este SPOT
  - `LimitExceeded`: Se alcanzó el límite máximo de SPOTs

### 3. **Autenticación**
- El usuario debe tener la wallet conectada para crear eventos o reclamar SPOTs
- `create_event` requiere que el `creator` tenga aprobación (role `creator` o ser admin)
- `claim` puede ser llamado por cualquier usuario dentro del periodo de claim

### 4. **Optimización**
- Usar `enabled` en queries para evitar llamadas innecesarias
- Implementar cache con `staleTime` para reducir llamadas repetidas
- Considerar usar `refetchOnWindowFocus: false` para mejorar UX

## Próximos Pasos

1. **Desplegar contratos** en testnet/futurenet
2. **Configurar contract IDs** en `.env`
3. **Integrar hooks** en las páginas `CreateEvent`, `Mint`, y `MyEvents`
4. **Probar flujos completos** de creación y reclamo
5. **Manejar errores** y mostrar mensajes claros al usuario
6. **Implementar loading states** durante transacciones
7. **Actualizar UI** después de transacciones exitosas

## Referencias

- [Stellar SDK Documentation](https://developers.stellar.org/docs/build/advanced/soroban/soroban-js)
- [Soroban Contracts](https://soroban.stellar.org/docs/learn/interacting-with-contracts)
- Contrato principal: `blockotitos/contracts/poap/src/contract.rs`
