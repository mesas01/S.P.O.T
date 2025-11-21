/**
 * Utilidad para almacenar eventos localmente en el navegador
 * Esto es una solución temporal hasta que el contrato esté configurado
 */

export interface LocalEventData {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  maxSpots: number;
  claimedSpots: number;
  claimStart: string;
  claimEnd: string;
  imageUrl: string;
  metadataUri?: string;
  creator: string;
  createdAt: string;
  distributionMethods: {
    qr: boolean;
    link: boolean;
    code: boolean;
    geolocation: boolean;
    nfc: boolean;
  };
}

const STORAGE_KEY = 'spot_local_events';

/**
 * Obtener todos los eventos guardados localmente
 */
export const getLocalEvents = (): LocalEventData[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as LocalEventData[];
  } catch (error) {
    console.error('Error obteniendo eventos locales:', error);
    return [];
  }
};

/**
 * Guardar un nuevo evento localmente
 */
export const saveLocalEvent = (event: Omit<LocalEventData, 'id' | 'createdAt' | 'claimedSpots'>): LocalEventData => {
  const events = getLocalEvents();
  const newEvent: LocalEventData = {
    ...event,
    id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    claimedSpots: 0,
  };
  
  events.push(newEvent);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  // Disparar evento personalizado para actualizar otras pestañas
  window.dispatchEvent(new Event('localStorageUpdated'));
  return newEvent;
};

/**
 * Obtener eventos de un usuario específico
 */
export const getLocalEventsByCreator = (creatorAddress: string): LocalEventData[] => {
  const allEvents = getLocalEvents();
  return allEvents.filter(event => event.creator.toLowerCase() === creatorAddress.toLowerCase());
};

/**
 * Actualizar un evento existente
 */
export const updateLocalEvent = (eventId: string, updates: Partial<LocalEventData>): LocalEventData | null => {
  const events = getLocalEvents();
  const index = events.findIndex(e => e.id === eventId);
  
  if (index === -1) return null;
  
  events[index] = { ...events[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  return events[index];
};

/**
 * Eliminar un evento
 */
export const deleteLocalEvent = (eventId: string): boolean => {
  const events = getLocalEvents();
  const filtered = events.filter(e => e.id !== eventId);
  
  if (filtered.length === events.length) return false; // No se encontró el evento
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
};

/**
 * Incrementar el contador de SPOTs reclamados
 */
export const incrementClaimedSpots = (eventId: string): boolean => {
  const event = getLocalEvents().find(e => e.id === eventId);
  if (!event) return false;
  
  if (event.claimedSpots >= event.maxSpots) return false;
  
  updateLocalEvent(eventId, { claimedSpots: event.claimedSpots + 1 });
  return true;
};

/**
 * Obtener un evento por ID
 */
export const getLocalEventById = (eventId: string): LocalEventData | null => {
  const events = getLocalEvents();
  return events.find(e => e.id === eventId) || null;
};
