import { useMutation, useQuery } from "@tanstack/react-query";
import { useWallet } from "./useWallet";
import { fetchMintedCount, fetchOnchainEvents } from "../util/backend";

/**
 * Hook para crear un nuevo evento SPOT
 * Nota: Este hook usa el backend para crear eventos
 */
export const useCreateEvent = () => {
  return useMutation({
    mutationFn: async (params: {
      eventName: string;
      eventDate: number;
      location: string;
      description: string;
      maxSpots: number;
      claimStart: number;
      claimEnd: number;
      metadataUri: string;
      imageUrl: string;
      imageFile?: File | null;
    }) => {
      // Este hook debería usar el backend directamente
      // Por ahora, lanzamos un error indicando que se debe usar el backend
      throw new Error("useCreateEvent should use backend API. Use createEventRequest from util/backend.ts instead.");
    },
  });
};

/**
 * Hook para reclamar un SPOT (claim)
 * Nota: Este hook usa el backend para reclamar SPOTs
 */
export const useClaimSpot = () => {
  return useMutation({
    mutationFn: async (eventId: number) => {
      // Este hook debería usar el backend directamente
      // Por ahora, lanzamos un error indicando que se debe usar el backend
      throw new Error("useClaimSpot should use backend API. Use claimEventRequest from util/backend.ts instead.");
    },
  });
};

/**
 * Hook para obtener información de un evento usando el backend
 */
export const useEventInfo = (eventId: number) => {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      try {
        // Obtener todos los eventos y filtrar por eventId
        const events = await fetchOnchainEvents();
        const event = events.find((e) => e.eventId === eventId);
        
        if (!event) {
          throw new Error(`Event ${eventId} not found`);
        }

        return {
          event_id: event.eventId,
          creator: event.creator,
          event_name: event.name,
          event_date: event.date.toString(),
          location: event.location,
          description: event.description,
          max_poaps: event.maxSpots,
          claim_start: event.claimStart.toString(),
          claim_end: event.claimEnd.toString(),
          metadata_uri: event.metadataUri || "",
          image_url: event.imageUrl,
        };
      } catch (error) {
        console.error("Error fetching event info:", error);
        throw error;
      }
    },
    enabled: !!eventId,
  });
};

/**
 * Hook para obtener todos los eventos usando el backend
 */
export const useAllEvents = () => {
  return useQuery({
    queryKey: ["allEvents"],
    queryFn: async () => {
      try {
        const events = await fetchOnchainEvents();
        return events.map((e) => e.eventId);
      } catch (error) {
        console.error("Error fetching all events:", error);
        throw error;
      }
    },
  });
};

/**
 * Hook para verificar si un usuario ya reclamó un SPOT de un evento
 * Nota: Esta funcionalidad requiere acceso directo al contrato, 
 * por ahora retornamos false y se puede implementar usando el backend
 */
export const useHasClaimed = (eventId: number, userAddress?: string) => {
  const { address } = useWallet();
  const addressToCheck = userAddress || address;

  return useQuery({
    queryKey: ["hasClaimed", eventId, addressToCheck],
    queryFn: async () => {
      if (!addressToCheck) {
        return false;
      }

      // Por ahora, esta funcionalidad requiere acceso directo al contrato
      // Se puede implementar agregando un endpoint en el backend
      // Por ahora retornamos false
      return false;
    },
    enabled: !!addressToCheck && !!eventId,
  });
};

/**
 * Hook para obtener el número de SPOTs minteados de un evento usando el backend
 */
export const useMintedCount = (eventId: number) => {
  return useQuery({
    queryKey: ["mintedCount", eventId],
    queryFn: async () => {
      try {
        const result = await fetchMintedCount(eventId);
        return result.mintedCount;
      } catch (error) {
        console.error("Error fetching minted count:", error);
        throw error;
      }
    },
    enabled: !!eventId,
  });
};
