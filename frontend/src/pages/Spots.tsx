import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import MonthSection from "../components/spot/MonthSection";
import { SpotData } from "../components/spot/SpotCard";
import { groupSpotsByMonth, getTotalSpots } from "../utils/spotGrouping";
import {
  getClaimedSpots,
  mapEventToClaimedSpot,
  mapStoredSpotToSpotData,
  upsertClaimedSpot,
} from "../utils/claimedSpots";
import { fetchClaimedEventsByClaimer } from "../util/backend";
import { connectWallet } from "../util/wallet";
import { useNavigate } from "react-router-dom";

const mockSpots: SpotData[] = [
  {
    id: 1,
    name: "Stellar Palooza",
    date: "2025-11-15",
    image: "/images/events/stellarpalooza.jpg",
    color: "from-stellar-lilac/30 to-stellar-lilac/50",
    isPlaceholder: true,
  },
  {
    id: 2,
    name: "Hackathon Stellar 2024",
    date: "2025-11-20",
    image: "/images/events/hack+.jpg",
    color: "from-stellar-gold/30 to-stellar-lilac/50",
    isPlaceholder: true,
  },
  {
    id: 3,
    name: "Hackathon Stellar 2024 - Segundo dÃ­a",
    date: "2025-10-10",
    image: "/images/events/hack+2.jpg",
    color: "from-stellar-teal/30 to-stellar-lilac/50",
  },
];

const Spots: React.FC = () => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const isConnected = !!address;
  const [claimedSpots, setClaimedSpots] = useState<SpotData[]>([]);

  useEffect(() => {
    if (!address) {
      setClaimedSpots([]);
      return;
    }

    let disposed = false;
    const controller = new AbortController();

    const loadClaimedSpotsFromStorage = () => {
      const stored = getClaimedSpots(address).map(mapStoredSpotToSpotData);
      const sorted = [...stored].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      if (!disposed) {
        setClaimedSpots(sorted);
      }
    };

    const syncSpotsFromBackend = async () => {
      try {
        const claimedEvents = await fetchClaimedEventsByClaimer(
          address,
          controller.signal,
        );
        if (!claimedEvents?.length) {
          return;
        }

        const existing = getClaimedSpots(address);
        const claimedAtByEventId = new Map(
          existing.map((spot) => [spot.eventId, spot.claimedAt]),
        );

        claimedEvents.forEach((event) => {
          const claimedAt = claimedAtByEventId.get(event.eventId);
          upsertClaimedSpot(address, {
            ...mapEventToClaimedSpot(event),
            claimedAt,
          });
        });
      } catch (error) {
        if (!disposed) {
          console.warn("No se pudieron sincronizar tus SPOTs on-chain:", error);
        }
      }
    };

    loadClaimedSpotsFromStorage();
    void syncSpotsFromBackend();

    const handleUpdate = () => loadClaimedSpotsFromStorage();
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("claimedSpotsUpdated", handleUpdate);

    return () => {
      disposed = true;
      controller.abort();
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("claimedSpotsUpdated", handleUpdate);
    };
  }, [address]);

  const spotsToDisplay = useMemo(() => {
    if (claimedSpots.length === 0) {
      return mockSpots;
    }
    return [...claimedSpots, ...mockSpots];
  }, [claimedSpots]);

  const groupedSpots = useMemo(
    () => groupSpotsByMonth(spotsToDisplay),
    [spotsToDisplay],
  );
  const totalSpots = getTotalSpots(spotsToDisplay);

  return (
    <div className="bg-stellar-white min-h-screen">
      {isConnected && (
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-headline text-stellar-black mb-3 uppercase">
              Tu <span className="text-stellar-gold">ColecciÃ³n</span>
            </h1>
            <p className="text-stellar-black/60 italic text-lg font-subhead">
              {totalSpots} {totalSpots === 1 ? "SPOT" : "SPOTs"} en tu
              colecciÃ³n
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <div className="relative rounded-2xl border border-stellar-lilac/20 bg-stellar-lilac/5 p-6 group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-stellar-lilac/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="text-4xl font-headline text-stellar-lilac mb-2">
                  {totalSpots}
                </div>
                <div className="text-base text-stellar-black/60 font-body">
                  Total SPOTs
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl border border-stellar-gold/30 bg-stellar-gold/5 p-6 group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-stellar-gold/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="text-4xl font-headline text-stellar-gold mb-2">
                  {Object.keys(groupedSpots).length}
                </div>
                <div className="text-base text-stellar-black/60 font-body">
                  Meses activos
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl border border-stellar-teal/20 bg-stellar-teal/5 p-6 group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-stellar-teal/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="text-4xl font-headline text-stellar-teal mb-2">
                  {new Date().getFullYear()}
                </div>
                <div className="text-base text-stellar-black/60 font-body">
                  AÃ±o actual
                </div>
              </div>
            </div>
          </div>

          <div>
            {Object.keys(groupedSpots).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stellar-black/50 font-body">
                  No hay SPOTs para mostrar
                </p>
              </div>
            ) : (
              Object.values(groupedSpots).map(
                (group: { year: number; month: string; spots: SpotData[] }) => (
                  <MonthSection
                    key={`${group.year}-${group.month}`}
                    month={group.month}
                    year={group.year}
                    spots={group.spots}
                    onSpotClick={(spot) => {
                      console.log("SPOT clicked:", spot);
                    }}
                  />
                ),
              )
            )}
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="relative rounded-3xl overflow-hidden border border-stellar-lilac/20 bg-stellar-lilac/5 p-12 text-center">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-stellar-lilac/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-stellar-gold/10 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <div className="mb-8">
                <img
                  src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/b26bdb6d8de9b8eb4f933b56f2366c0b80433c1c-4790x3693.png?w=506&auto=format&dpr=2"
                  alt="Conecta Wallet"
                  className="w-48 h-48 md:w-56 md:h-56 mx-auto object-contain drop-shadow-2xl"
                />
              </div>
              <h2 className="text-3xl font-headline text-stellar-black mb-4 uppercase">
                Conecta tu Wallet
              </h2>
              <p className="text-stellar-black/60 max-w-lg mx-auto mb-8 text-lg font-body">
                Conecta tu wallet de Stellar para ver tu colecciÃ³n de SPOTs y
                reclamar nuevos.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => void connectWallet()}
                  className="inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-10 py-4 shadow-lg hover:shadow-xl transition-all font-body"
                >
                  Conectar Wallet
                </button>
                <Button
                  onClick={() => navigate("/mint")}
                  variant="secondary"
                  size="lg"
                  className="rounded-full px-8 py-4"
                >
                  Ir a Reclamar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Spots;
