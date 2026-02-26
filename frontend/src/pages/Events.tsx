import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import TldrCard from "../components/layout/TldrCard";
import {
  fetchCommunities,
  fetchOnchainEvents,
  type Community,
  type OnchainEventSummary,
  type EventTier,
  type EventVisibility,
} from "../util/backend";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Link2,
  Loader2,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";

interface EventView {
  id: string;
  eventId: number;
  name: string;
  date: number;
  location: string;
  description: string;
  maxSpots: number;
  mintedCount: number;
  claimStart: number;
  claimEnd: number;
  metadataUri?: string;
  imageUrl?: string;
  creator: string;
  communityId?: number;
  tier?: EventTier;
  visibility?: EventVisibility;
}

type ClaimStatus = "open" | "upcoming" | "closed" | "soldout";

const CLAIM_STATUS_STYLES: Record<ClaimStatus, string> = {
  open: "bg-stellar-teal/15 text-stellar-teal",
  upcoming: "bg-stellar-gold/20 text-stellar-black",
  closed: "bg-stellar-black/10 text-stellar-black/70",
  soldout: "bg-stellar-lilac/20 text-stellar-black",
};

const getAppOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

const buildMintLink = (eventId: string | number) =>
  `${getAppOrigin()}/mint?event=${eventId}`;

const getClaimStatus = (event: EventView) => {
  if (event.maxSpots > 0 && event.mintedCount >= event.maxSpots) {
    return { status: "soldout" as const, label: "Agotado" };
  }

  const now = Date.now();
  const start = event.claimStart * 1000;
  const end = event.claimEnd * 1000;

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { status: "open" as const, label: "Activo" };
  }

  if (now < start) return { status: "upcoming" as const, label: "Pendiente" };
  if (now > end) return { status: "closed" as const, label: "Cerrado" };
  return { status: "open" as const, label: "Reclamable" };
};

const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const mapEventToView = (event: OnchainEventSummary): EventView => ({
  id: event.eventId.toString(),
  eventId: event.eventId,
  name: event.name,
  date: event.date,
  location: event.location || "Sin ubicación",
  description: event.description || "",
  maxSpots: event.maxSpots,
  mintedCount: event.mintedCount,
  claimStart: event.claimStart,
  claimEnd: event.claimEnd,
  metadataUri: event.metadataUri,
  imageUrl: event.imageUrl,
  creator: event.creator,
  communityId: event.communityId,
  tier: event.tier,
  visibility: event.visibility,
});

const Events: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [communityFilter, setCommunityFilter] = useState<string>("all");

  const {
    data: events = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["all-events"],
    queryFn: ({ signal }) => fetchOnchainEvents({ signal, forceRpc: true }),
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * attempt, 4000),
    refetchInterval: 15000,
    staleTime: 15000,
  });

  const { data: communities = [] } = useQuery({
    queryKey: ["communities"],
    queryFn: fetchCommunities,
    retry: 2,
    staleTime: 15000,
  });

  const communityMap = useMemo(() => {
    const map = new Map<number, Community>();
    communities.forEach((community) => map.set(community.id, community));
    return map;
  }, [communities]);

  const eventsToDisplay = useMemo(
    () =>
      [...events]
        .map(mapEventToView)
        .filter((event) => {
          if (communityFilter === "all") return true;
          if (communityFilter === "none") return !event.communityId;
          return event.communityId?.toString() === communityFilter;
        })
        .sort((a, b) => b.date - a.date),
    [events, communityFilter],
  );

  const eventsError = error as Error | null;
  const eventsErrorMessage =
    eventsError?.message || "Ocurrió un error inesperado.";

  const toggleEventDetails = (eventId: string) => {
    setExpandedEvent((prev) => (prev === eventId ? null : eventId));
  };

  const refreshOnchain = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const freshEvents = await fetchOnchainEvents({ forceRpc: true });
      queryClient.setQueryData(["all-events"], freshEvents);
    } catch (err) {
      console.error("Error refreshing on-chain events:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="py-12 px-6">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-stellar-teal/10 border border-stellar-teal/20 rounded-full px-4 py-1.5 mb-3">
                <span className="text-xs font-semibold font-body uppercase tracking-widest text-stellar-teal">
                  Comunidad
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-headline text-stellar-black mb-2">
                Eventos
              </h1>
              <p className="text-stellar-black/60 font-body flex items-center gap-2">
                {isLoading
                  ? "Cargando..."
                  : `${eventsToDisplay.length} ${
                      eventsToDisplay.length === 1 ? "evento" : "eventos"
                    } disponibles`}
                {isFetching && (
                  <span className="text-xs text-stellar-black/40 animate-pulse">
                    Sincronizando...
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <select
                value={communityFilter}
                onChange={(e) => setCommunityFilter(e.target.value)}
                className="px-4 py-2.5 rounded-full border border-stellar-black/15 bg-white text-stellar-black/70 font-body text-sm"
              >
                <option value="all">Todas las comunidades</option>
                <option value="none">Sin comunidad</option>
                {communities.map((community) => (
                  <option key={community.id} value={community.id.toString()}>
                    {community.name} - {community.country}
                  </option>
                ))}
              </select>
              <button
                onClick={() => navigate("/create-event")}
                className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black px-5 py-2.5 rounded-full font-semibold font-body text-sm hover:bg-stellar-gold/90 transition-all shadow-md"
              >
                Crear Evento
              </button>
              <button
                onClick={refreshOnchain}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 border border-stellar-black/15 text-stellar-black/60 hover:text-stellar-black hover:border-stellar-black/25 px-5 py-2.5 rounded-full font-body text-sm font-semibold transition-all disabled:opacity-50"
              >
                {isRefreshing ? "Actualizando..." : "Actualizar on-chain"}
              </button>
            </div>
          </div>

          <TldrCard
            label=""
            summary="Explora eventos creados por la comunidad y abre cada uno para ver fechas, cupos y links de reclamo."
            bullets={[
              {
                label: "Global",
                detail: "Lista con todos los eventos on-chain disponibles.",
              },
              {
                label: "Detalles",
                detail: "Haz click en un evento para ver su ficha completa.",
              },
              {
                label: "Acción",
                detail: "Toma el link de reclamo y comparte con asistentes.",
              },
            ]}
          />
        </div>

        {isLoading ? (
          <div className="bg-stellar-white rounded-3xl shadow-sm p-12 text-center border border-stellar-lilac/15">
            <div className="mb-6 flex justify-center">
              <Loader2 size={36} className="animate-spin text-stellar-lilac" />
            </div>
            <h2 className="text-2xl font-headline text-stellar-black mb-3">
              Cargando eventos...
            </h2>
            <p className="text-stellar-black/60 font-body max-w-md mx-auto">
              Consultando los eventos registrados en la red.
            </p>
          </div>
        ) : eventsError ? (
          <div className="bg-stellar-white rounded-3xl shadow-sm p-12 text-center border border-red-200">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
            </div>
            <h2 className="text-2xl font-headline text-stellar-black mb-3">
              No pudimos cargar los eventos
            </h2>
            <p className="text-stellar-black/60 font-body max-w-xl mx-auto mb-8">
              {eventsErrorMessage}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black px-8 py-3 rounded-full font-semibold font-body hover:bg-stellar-gold/90 transition-all shadow-md"
            >
              Reintentar
            </button>
          </div>
        ) : eventsToDisplay.length === 0 ? (
          <div className="bg-stellar-white rounded-3xl shadow-sm p-12 text-center border border-stellar-lilac/15">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-stellar-teal/10 border border-stellar-teal/20 flex items-center justify-center">
                <CalendarDays size={28} className="text-stellar-teal" />
              </div>
            </div>
            <h2 className="text-2xl font-headline text-stellar-black mb-3">
              No hay eventos publicados
            </h2>
            <p className="text-stellar-black/60 font-body max-w-md mx-auto mb-8">
              Todavía no existen eventos en la plataforma. Sé el primero en
              crear uno.
            </p>
            <button
              onClick={() => navigate("/create-event")}
              className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black px-8 py-3 rounded-full font-semibold font-body hover:bg-stellar-gold/90 transition-all shadow-md"
            >
              Crear mi Primer Evento
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {eventsToDisplay.map((event) => {
              const claimStatus = getClaimStatus(event);
              const mintedPercentage =
                event.maxSpots > 0
                  ? Math.min(
                      100,
                      Math.round((event.mintedCount / event.maxSpots) * 100),
                    )
                  : 0;
              return (
                <div
                  key={event.id}
                  className="bg-stellar-white rounded-2xl shadow-sm border border-stellar-black/10 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  <div
                    className="p-5 md:p-6 cursor-pointer"
                    onClick={() => toggleEventDetails(event.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-stellar-lilac/20 flex-shrink-0 bg-stellar-warm-grey/20">
                        {event.imageUrl ? (
                          <img
                            src={event.imageUrl}
                            alt={event.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-stellar-lilac/10">
                            <Ticket
                              size={24}
                              className="text-stellar-lilac/40"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h2 className="text-xl md:text-2xl font-headline text-stellar-black">
                              {event.name}
                            </h2>
                            {event.communityId &&
                              communityMap.has(event.communityId) && (
                                <span className="text-[11px] uppercase tracking-wide bg-stellar-gold/15 text-stellar-black font-semibold px-2 py-0.5 rounded-full inline-flex items-center">
                                  {communityMap.get(event.communityId)?.name}
                                </span>
                              )}
                            {event.tier && event.tier !== "FREE" && (
                              <span className="text-[11px] uppercase tracking-wide bg-stellar-lilac/15 text-stellar-lilac font-semibold px-2 py-0.5 rounded-full inline-flex items-center">
                                {event.tier}
                              </span>
                            )}
                            <div className="flex flex-wrap gap-3 text-sm text-stellar-black/50 font-body mt-2">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays size={13} />
                                {formatDate(event.date)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={13} />
                                {event.location}
                              </span>
                            </div>
                          </div>
                          <button className="flex-shrink-0 text-stellar-black/30 hover:text-stellar-black transition-colors">
                            {expandedEvent === event.id ? (
                              <ChevronDown size={18} />
                            ) : (
                              <ChevronRight size={18} />
                            )}
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 bg-stellar-lilac/10 rounded-full px-3 py-1.5">
                            <Users size={13} className="text-stellar-lilac" />
                            <span className="text-sm font-semibold text-stellar-black">
                              {event.mintedCount}/{event.maxSpots}
                            </span>
                            <span className="text-xs text-stellar-black/50">
                              reclamados
                            </span>
                          </div>
                          <span className="text-xs text-stellar-black/40 font-body">
                            {mintedPercentage}% completado
                          </span>
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${CLAIM_STATUS_STYLES[claimStatus.status]}`}
                          >
                            {claimStatus.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedEvent === event.id && (
                    <div className="border-t border-stellar-black/8 p-5 md:p-6 bg-stellar-warm-grey/15 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/15">
                          <p className="text-xs text-stellar-black/40 font-body mb-1 uppercase tracking-widest">
                            Inicio reclamo
                          </p>
                          <p className="text-stellar-black font-body text-sm">
                            {formatDate(event.claimStart)}
                          </p>
                        </div>
                        <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/15">
                          <p className="text-xs text-stellar-black/40 font-body mb-1 uppercase tracking-widest">
                            Fin reclamo
                          </p>
                          <p className="text-stellar-black font-body text-sm">
                            {formatDate(event.claimEnd)}
                          </p>
                        </div>
                      </div>

                      {event.description && (
                        <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/15">
                          <p className="text-xs text-stellar-black/40 font-body mb-2 uppercase tracking-widest">
                            Descripción
                          </p>
                          <p className="text-sm text-stellar-black/70 font-body">
                            {event.description}
                          </p>
                        </div>
                      )}

                      {event.communityId &&
                        communityMap.has(event.communityId) && (
                          <div className="bg-stellar-white rounded-xl p-4 border border-stellar-gold/20">
                            <p className="text-xs text-stellar-black/40 font-body mb-1 uppercase tracking-widest">
                              Comunidad
                            </p>
                            <p className="text-sm text-stellar-black/70 font-body">
                              {communityMap.get(event.communityId)?.name}
                            </p>
                          </div>
                        )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/15">
                          <p className="text-xs text-stellar-black/40 font-body mb-1 uppercase tracking-widest">
                            Creador
                          </p>
                          <p className="text-sm text-stellar-black/70 font-body break-all">
                            {event.creator}
                          </p>
                        </div>
                        <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/15">
                          <p className="text-xs text-stellar-black/40 font-body mb-1 uppercase tracking-widest">
                            Event ID
                          </p>
                          <p className="text-sm text-stellar-black/70 font-body">
                            {event.eventId}
                          </p>
                        </div>
                      </div>

                      <div className="bg-stellar-white rounded-xl p-5 border border-stellar-lilac/15">
                        <div className="flex items-center gap-2 mb-3">
                          <Link2 size={16} className="text-stellar-lilac" />
                          <h3 className="font-headline text-stellar-black text-base">
                            Link de Reclamo
                          </h3>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="flex-1 bg-stellar-warm-grey/20 rounded-lg p-3 border border-stellar-lilac/15 min-w-0">
                            <p className="font-mono text-stellar-black break-all font-body text-xs">
                              {buildMintLink(event.eventId)}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              navigate(`/mint?event=${event.eventId}`)
                            }
                            className="flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-semibold font-body text-sm transition-all bg-stellar-gold text-stellar-black hover:bg-stellar-gold/80"
                          >
                            Ir a Reclamar
                          </button>
                        </div>
                      </div>

                      {event.metadataUri && (
                        <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/15">
                          <p className="text-xs text-stellar-black/40 font-body mb-1 uppercase tracking-widest">
                            Metadata URI
                          </p>
                          <p className="text-sm text-stellar-black/70 font-body break-all">
                            {event.metadataUri}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
