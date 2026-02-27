import React, { useMemo } from "react";
import { Button } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useQuery } from "@tanstack/react-query";
import MonthSection from "../components/spot/MonthSection";
import { SpotData } from "../components/spot/SpotCard";
import { groupSpotsByMonth, getTotalSpots } from "../utils/spotGrouping";
import { fetchClaimedEventsByClaimer } from "../util/backend";
import { connectWallet } from "../util/wallet";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
    name: "Hackathon Stellar 2024 - Segundo día",
    date: "2025-10-10",
    image: "/images/events/hack+2.jpg",
    color: "from-stellar-teal/30 to-stellar-lilac/50",
  },
];

const Spots: React.FC = () => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { t } = useTranslation('spots');
  const isConnected = !!address;

  const { data: claimedEvents = [] } = useQuery({
    queryKey: ["claimed-spots", address],
    queryFn: ({ signal }) => fetchClaimedEventsByClaimer(address!, signal),
    enabled: !!address,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const claimedSpots = useMemo<SpotData[]>(() => {
    return claimedEvents
      .map((event) => ({
        id: `claimed-${event.eventId}`,
        name: event.name,
        date: new Date(event.date * 1000).toISOString(),
        image: event.imageUrl || "/images/events/stellarpalooza.jpg",
        color: "from-stellar-teal/20 to-stellar-lilac/40",
      }))
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }, [claimedEvents]);

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
              {t('collectionTitle')}{" "}
              <span className="text-stellar-gold">
                {t('collectionHighlight')}
              </span>
            </h1>
            <p className="text-stellar-black/60 italic text-lg font-subhead">
              {t('spotsCount', { count: totalSpots })}
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
                  {t('totalSpots')}
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
                  {t('activeMonths')}
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
                  {t('currentYear')}
                </div>
              </div>
            </div>
          </div>

          <div>
            {Object.keys(groupedSpots).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stellar-black/50 font-body">
                  {t('noSpots')}
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
                {t('connectTitle')}
              </h2>
              <p className="text-stellar-black/60 max-w-lg mx-auto mb-8 text-lg font-body">
                {t('connectSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => void connectWallet()}
                  className="inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-10 py-4 shadow-lg hover:shadow-xl transition-all font-body"
                >
                  {t('connectWallet')}
                </button>
                <Button
                  onClick={() => navigate("/mint")}
                  variant="secondary"
                  size="lg"
                  className="rounded-full px-8 py-4"
                >
                  {t('goToClaim')}
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
