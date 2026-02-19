import type { SpotData } from "../components/spot/SpotCard";
import type { OnchainEventSummary } from "../util/backend";

const STORAGE_KEY = "spot_claimed_collection_v1";

export interface StoredClaimedSpot {
  eventId: number;
  name: string;
  date: string;
  image: string;
  color?: string;
  metadataUri?: string;
  location?: string;
  claimedAt: string;
  description?: string;
}

type WalletSpotsMap = Record<string, StoredClaimedSpot[]>;

const readStorage = (): WalletSpotsMap => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as WalletSpotsMap;
  } catch (error) {
    console.error("Error leyendo claimed spots:", error);
    return {};
  }
};

const writeStorage = (data: WalletSpotsMap) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event("claimedSpotsUpdated"));
  } catch (error) {
    console.error("Error guardando claimed spots:", error);
  }
};

export const getClaimedSpots = (wallet?: string): StoredClaimedSpot[] => {
  if (!wallet) {
    return [];
  }
  const normalized = wallet.toLowerCase();
  const storage = readStorage();
  return storage[normalized] ?? [];
};

export const upsertClaimedSpot = (
  wallet: string,
  spot: Omit<StoredClaimedSpot, "claimedAt"> & { claimedAt?: string },
) => {
  if (!wallet) {
    return;
  }

  const normalized = wallet.toLowerCase();
  const storage = readStorage();
  const claimedAt = spot.claimedAt ?? new Date().toISOString();
  const nextSpot: StoredClaimedSpot = {
    ...spot,
    claimedAt,
  };

  const walletSpots = storage[normalized] ?? [];
  const nextWalletSpots = [
    ...walletSpots.filter((entry) => entry.eventId !== spot.eventId),
    nextSpot,
  ];

  storage[normalized] = nextWalletSpots.sort(
    (a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime(),
  );
  writeStorage(storage);
};

export const mapEventToClaimedSpot = (
  event: OnchainEventSummary,
): Omit<StoredClaimedSpot, "claimedAt"> => {
  return {
    eventId: event.eventId,
    name: event.name,
    date: new Date(event.date * 1000).toISOString(),
    image:
      event.imageUrl ||
      "/images/events/stellarpalooza.jpg",
    color: "from-stellar-teal/20 to-stellar-lilac/40",
    metadataUri: event.metadataUri,
    location: event.location,
    description: event.description,
  };
};

export const mapStoredSpotToSpotData = (spot: StoredClaimedSpot): SpotData => ({
  id: `claimed-${spot.eventId}`,
  name: spot.name,
  date: spot.date,
  image: spot.image || "🎯",
  color: spot.color || "from-stellar-teal/20 to-stellar-teal/40",
});


