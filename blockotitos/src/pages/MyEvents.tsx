import React, { useState, useEffect, useMemo } from "react";
import { Layout, Text, Button } from "@stellar/design-system";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { generateLinkQRCode } from "../utils/qrCode";
import { getLocalEventsByCreator, updateLocalEvent } from "../utils/localEvents";
import TldrCard from "../components/layout/TldrCard";
import { fetchMintedCount, fetchOnchainEvents } from "../util/backend";
import { useNotification } from "../hooks/useNotification";
import { buildErrorDetail } from "../utils/notificationHelpers";

interface EventData {
  id: string;
  name: string;
  date: string;
  location: string;
  maxSpots: number;
  claimedSpots: number;
  claimStart: string;
  claimEnd: string;
  imageUrl: string;
  distributionMethods: {
    qr: boolean;
    link: boolean;
    code: boolean;
    geolocation: boolean;
    nfc: boolean;
  };
  links: {
    uniqueLink?: string;
    qrCode?: string;
  };
  codes: {
    sharedCode?: string;
  };
  creator?: string;
  source?: "local" | "contract";
  contractEventId?: number;
}

const DEFAULT_DISTRIBUTION_METHODS = {
  qr: true,
  link: true,
  code: true,
  geolocation: false,
  nfc: false,
} as const;

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

const getClaimStatus = (event: EventData): {
  status: ClaimStatus;
  label: string;
  icon: string;
} => {
  const claimed = event.claimedSpots || 0;
  const max = event.maxSpots || 0;
  if (max > 0 && claimed >= max) {
    return { status: "soldout", label: "Agotado", icon: "⚠️" };
  }

  const now = Date.now();
  const start = new Date(event.claimStart).getTime();
  const end = new Date(event.claimEnd).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { status: "open", label: "Activo", icon: "🟢" };
  }

  if (now < start) {
    return { status: "upcoming", label: "Pendiente", icon: "⏳" };
  }

  if (now > end) {
    return { status: "closed", label: "Cerrado", icon: "🔒" };
  }

  return { status: "open", label: "Reclamable", icon: "🟢" };
};

const sortEventsByDate = (events: EventData[]) =>
  [...events].sort(
    (a, b) =>
      (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0),
  );


const MyEvents: React.FC = () => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const isConnected = !!address;
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [loadingQR, setLoadingQR] = useState<Record<string, boolean>>({});
  const [isRefreshingOnchain, setIsRefreshingOnchain] = useState(false);
  const { showNotification } = useNotification();

  // Obtener eventos locales (temporal hasta que el contrato esté configurado)
  const [localEvents, setLocalEvents] = useState<EventData[]>([]);
  const [isLoadingLocalEvents, setIsLoadingLocalEvents] = useState(false);
  const {
    data: onchainEvents = [],
    isLoading: isLoadingOnchainEvents,
    isFetching: isFetchingOnchainEvents,
    error: onchainError,
    refetch: refetchOnchainEvents,
  } = useQuery({
    queryKey: ["onchain-events", address],
    queryFn: ({ signal }) =>
      fetchOnchainEvents(
        address
          ? { creator: address, signal }
          : { signal },
      ),
    enabled: !!address,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * attempt, 4000),
    refetchInterval: 15000,
    staleTime: 15000,
  });
  const contractEvents = useMemo(() => {
    if (!onchainEvents || onchainEvents.length === 0) {
      return [];
    }
    return onchainEvents.map((event) => {
      const toIso = (seconds: number) =>
        Number.isFinite(seconds) && seconds > 0
          ? new Date(seconds * 1000).toISOString()
          : new Date().toISOString();

      return {
        id: event.eventId.toString(),
        contractEventId: event.eventId,
        name: event.name,
        date: toIso(event.date),
        location: event.location || "Sin ubicación",
        maxSpots: event.maxSpots,
        claimedSpots: event.mintedCount,
        claimStart: toIso(event.claimStart),
        claimEnd: toIso(event.claimEnd),
        imageUrl:
          event.imageUrl ||
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80",
        distributionMethods: { ...DEFAULT_DISTRIBUTION_METHODS },
        links: {
          uniqueLink: buildMintLink(event.eventId),
        },
        codes: {
          sharedCode: `SPOT-${event.eventId.toString().padStart(4, "0")}`,
        },
        creator: event.creator,
        source: "contract" as const,
      } satisfies EventData;
    });
  }, [onchainEvents]);
  const sortedContractEvents = useMemo(
    () => sortEventsByDate(contractEvents),
    [contractEvents],
  );
  const sortedLocalEvents = useMemo(
    () => sortEventsByDate(localEvents),
    [localEvents],
  );
  const eventsToDisplay = useMemo(() => {
    const eventsById = new Map<string, EventData>();
    sortedLocalEvents.forEach((event) => {
      eventsById.set(event.id, event);
    });
    sortedContractEvents.forEach((event) => {
      eventsById.set(event.id, event);
    });
    return sortEventsByDate(Array.from(eventsById.values()));
  }, [sortedContractEvents, sortedLocalEvents]);
  const isLoadingEvents =
    isLoadingLocalEvents || (isConnected && isLoadingOnchainEvents);
  const eventsError = useMemo(() => {
    if (!onchainError) {
      return null;
    }
    const error = onchainError as Error;
    if (
      error.name === "AbortError" ||
      /aborted/i.test(error.message || "")
    ) {
      return null;
    }
    return error;
  }, [onchainError]);
  const eventsErrorMessage = useMemo(() => {
    if (!eventsError) {
      return "";
    }
    if (/Failed to fetch|NetworkError/i.test(eventsError.message || "")) {
      return "No pudimos conectar con el backend. Verifica que esté encendido e inténtalo nuevamente.";
    }
    if (/timeout/i.test(eventsError.message || "")) {
      return "El backend tardó demasiado en responder. Reintenta en unos segundos.";
    }
    return eventsError.message || "Ocurrió un error inesperado.";
  }, [eventsError]);
  const totalEvents = eventsToDisplay.length;
  const eventsSummaryLabel = isLoadingEvents
    ? "Cargando..."
    : totalEvents === 0
    ? "0 eventos creados"
    : `${totalEvents} ${totalEvents === 1 ? "evento creado" : "eventos creados"}`;
  const isSyncingOnchain =
    !isLoadingOnchainEvents && isFetchingOnchainEvents;

  const handleRetry = () => {
    loadLocalEvents();
    if (address) {
      void refetchOnchainEvents();
    }
  };

  const refreshMintedCounts = async () => {
    if (isRefreshingOnchain) return;
    setIsRefreshingOnchain(true);
    let hadErrors = false;

    try {
      for (const event of localEvents) {
        const eventIdNumber =
          event.contractEventId ?? Number.parseInt(event.id, 10);
        if (!eventIdNumber || Number.isNaN(eventIdNumber)) {
          continue;
        }

        try {
          const { mintedCount } = await fetchMintedCount(eventIdNumber);
          setLocalEvents((prev) =>
            prev.map((item) =>
              item.id === event.id
                ? { ...item, claimedSpots: mintedCount }
                : item,
            ),
          );
          updateLocalEvent(event.id, { claimedSpots: mintedCount });
        } catch (error) {
          hadErrors = true;
          console.error(
            `Error refreshing minted count for event ${eventIdNumber}:`,
            error,
          );
        }
      }

      await refetchOnchainEvents();

      showNotification({
        type: hadErrors ? "warning" : "success",
        title: hadErrors
          ? "Actualización parcial"
          : "Datos on-chain sincronizados",
        message: hadErrors
          ? "Algunos eventos no pudieron sincronizarse. Intenta nuevamente."
          : "Métricas de reclamos actualizadas.",
        copyText: hadErrors
          ? buildErrorDetail(
              new Error("No se pudieron sincronizar todos los eventos."),
            )
          : undefined,
      });
    } catch (error) {
      console.error("Error refreshing on-chain stats:", error);
      showNotification({
        type: "error",
        title: "Error al actualizar",
        message: "No pudimos sincronizar los reclamos. Intenta nuevamente.",
        copyText: buildErrorDetail(error),
      });
    } finally {
      setIsRefreshingOnchain(false);
    }
  };

  // Función auxiliar para generar QR
  const generateQRForEvent = async (eventId: string, uniqueLink: string) => {
    if (qrCodes[eventId] || loadingQR[eventId]) return;
    
    setLoadingQR(prev => ({ ...prev, [eventId]: true }));
    try {
      const qrCode = await generateLinkQRCode(uniqueLink);
      setQrCodes(prev => ({ ...prev, [eventId]: qrCode }));
    } catch (error) {
      console.error(`Error generando QR para evento ${eventId}:`, error);
    } finally {
      setLoadingQR(prev => ({ ...prev, [eventId]: false }));
    }
  };

  // Generar QR cuando se expande un evento específico
  const toggleEventDetails = async (event: EventData) => {
    const eventId = event.id;
    const isExpanding = expandedEvent !== eventId;
    setExpandedEvent(isExpanding ? eventId : null);

    // Si estamos expandiendo y no tenemos el QR, generarlo
    if (isExpanding) {
      const uniqueLink =
        event.links.uniqueLink ??
        buildMintLink(event.contractEventId ?? event.id);
      await generateQRForEvent(eventId, uniqueLink);
    }
  };

  const copyTextWithFallback = async (text: string) => {
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn("Clipboard API falló, usando fallback", error);
      }
    }

    if (typeof document === "undefined") {
      return false;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let successful = false;
    try {
      successful = document.execCommand("copy");
    } catch (error) {
      console.error("Fallback de portapapeles falló:", error);
    } finally {
      document.body.removeChild(textarea);
    }
    return successful;
  };

  const copyToClipboard = async (text: string, type: "link" | "code", id: string) => {
    const success = await copyTextWithFallback(text);
    if (!success) {
      showNotification({
        type: "error",
        title: "No se pudo copiar",
        message: "Copia manualmente el texto seleccionado.",
      });
      return;
    }

    if (type === "link") {
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    } else {
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Función para cargar eventos locales
  const loadLocalEvents = () => {
    if (address) {
      setIsLoadingLocalEvents(true);
      try {
        const events = getLocalEventsByCreator(address);
        // Convertir eventos locales al formato EventData
        const formattedEvents: EventData[] = events.map(event => ({
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location,
          maxSpots: event.maxSpots,
          claimedSpots: event.claimedSpots,
          claimStart: event.claimStart,
          claimEnd: event.claimEnd,
          imageUrl: event.imageUrl,
          distributionMethods: event.distributionMethods || { ...DEFAULT_DISTRIBUTION_METHODS },
          links: {
            uniqueLink: buildMintLink(event.id),
          },
          codes: {
            sharedCode: `SPOT-${event.id.slice(-8).toUpperCase()}`,
          },
          creator: event.creator,
          source: "local",
        }));
        setLocalEvents(formattedEvents);
      } catch (error) {
        console.error("Error cargando eventos locales:", error);
      } finally {
        setIsLoadingLocalEvents(false);
      }
    } else {
      setLocalEvents([]);
    }
  };

  // Cargar eventos locales cuando cambia el address
  useEffect(() => {
    loadLocalEvents();
  }, [address]);

  // Escuchar cambios en localStorage para actualizar eventos en tiempo real
  useEffect(() => {
    const handleStorageChange = () => {
      loadLocalEvents();
    };

    window.addEventListener('storage', handleStorageChange);
    // También escuchar eventos personalizados para cambios en la misma pestaña
    window.addEventListener('localStorageUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdated', handleStorageChange);
    };
  }, [address]);

  if (!isConnected) {
    return (
      <Layout.Content>
        <Layout.Inset>
          <div className="min-h-screen bg-stellar-white py-12">
            <div className="max-w-2xl mx-auto text-center">
              <div className="text-6xl mb-6">🔐</div>
              <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                Conecta tu Wallet
              </Text>
              <Text as="p" size="md" className="text-stellar-black mb-6 font-body">
                Necesitas conectar tu wallet para ver tus eventos.
              </Text>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate("/")}
                className="bg-stellar-gold text-stellar-black rounded-full px-8 py-3 font-semibold"
              >
                Ir a Home
              </Button>
            </div>
          </div>
        </Layout.Inset>
      </Layout.Content>
    );
  }

  return (
    <Layout.Content>
      <Layout.Inset>
        <div className="min-h-screen bg-stellar-white py-6 md:py-12">
          <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-24 items-start">
                <div className="col-span-full xl:col-span-17">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <Text as="h1" size="xl" className="text-3xl md:text-4xl font-headline text-stellar-black mb-2">
                        Mis Eventos
                      </Text>
                      <Text as="p" size="md" className="text-stellar-black/70 font-body flex items-center gap-2">
                        <span>{eventsSummaryLabel}</span>
                        {isSyncingOnchain && (
                          <span className="text-xs text-stellar-black/50 animate-pulse">
                            Sincronizando...
                          </span>
                        )}
                      </Text>
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => navigate("/create-event")}
                      className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 rounded-full px-6 py-2.5 font-semibold shadow-md"
                    >
                      ➕ Crear Evento
                    </Button>
                    <Button
                      variant="tertiary"
                      size="md"
                      onClick={refreshMintedCounts}
                      disabled={isRefreshingOnchain}
                      className="border-2 border-stellar-black/10 text-stellar-black hover:bg-stellar-black/5 rounded-full px-6 py-2.5 font-semibold"
                    >
                      {isRefreshingOnchain ? "Actualizando..." : "Actualizar on-chain"}
                    </Button>
                  </div>
                </div>
                <div className="col-span-full xl:col-span-24 xl:row-start-2 xl:flex xl:justify-center">
                  <TldrCard
                    className="xl:mx-auto"
                    summary="Esta vista resume el estado de tus SPOTs."
                    bullets={[
                      { label: "Visibilidad", detail: "Cards con highlights y métricas claras." },
                      { label: "Distribución", detail: "QR, links y códigos al alcance." },
                      { label: "Narrativa", detail: "Copy directo para sponsors y equipo." },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Events List */}
            {isLoadingEvents ? (
              <div className="bg-stellar-white rounded-3xl shadow-lg p-12 text-center border border-stellar-lilac/20">
                <div className="text-6xl mb-6">⏳</div>
                <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                  Cargando eventos...
                </Text>
                <Text as="p" size="md" className="text-stellar-black/70 mb-8 font-body max-w-md mx-auto">
                  Obteniendo tus eventos...
                </Text>
              </div>
            ) : eventsError ? (
              <div className="bg-stellar-white rounded-3xl shadow-lg p-12 text-center border border-red-200">
                <div className="text-6xl mb-6">⚠️</div>
                <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                  No pudimos cargar tus eventos
                </Text>
                <Text as="p" size="md" className="text-stellar-black/70 mb-8 font-body max-w-xl mx-auto">
                  {eventsErrorMessage || "Intenta nuevamente en unos segundos."}
                </Text>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleRetry}
                  className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 rounded-full px-8 py-3 font-semibold shadow-md"
                >
                  Reintentar
                </Button>
              </div>
            ) : eventsToDisplay.length === 0 ? (
              <div className="bg-stellar-white rounded-3xl shadow-lg p-12 text-center border border-stellar-lilac/20">
                <div className="text-6xl mb-6">📅</div>
                <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                  Aún no has creado eventos
                </Text>
                <Text as="p" size="md" className="text-stellar-black/70 mb-8 font-body max-w-md mx-auto">
                  Crea tu primer evento para comenzar a distribuir SPOTs a los asistentes.
                </Text>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate("/create-event")}
                  className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 rounded-full px-8 py-3 font-semibold shadow-md"
                >
                  Crear mi Primer Evento
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {eventsToDisplay.map((event) => {
                  const claimStatus = getClaimStatus(event);
                  const mintedPercentage =
                    event.maxSpots > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (event.claimedSpots / event.maxSpots) * 100,
                          ),
                        )
                      : 0;
                  return (
                    <div
                      key={event.id}
                      className="bg-stellar-white rounded-2xl shadow-sm border border-stellar-black/10 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                    >
                      {/* Event Card Header - Always Visible */}
                      <div 
                        className="p-5 md:p-6 cursor-pointer"
                        onClick={() => toggleEventDetails(event)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Event Image */}
                          {event.imageUrl && (
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 border-stellar-lilac/20 flex-shrink-0 bg-stellar-warm-grey/20">
                              {event.imageUrl.startsWith('http') || event.imageUrl.startsWith('/images/') || event.imageUrl.startsWith('data:') ? (
                                <img 
                                  src={event.imageUrl} 
                                  alt={event.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl">
                                  🎯
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Event Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Text as="h2" size="lg" className="text-xl md:text-2xl font-headline text-stellar-black">
                                    {event.name}
                                  </Text>
                                  {event.source === "contract" && (
                                    <span className="text-[11px] uppercase tracking-wide bg-stellar-teal/15 text-stellar-teal font-semibold px-2 py-0.5 rounded-full">
                                      On-chain
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm text-stellar-black/60 font-body mt-2">
                                  <span>📅 {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  <span>📍 {event.location}</span>
                                </div>
                              </div>
                              <button className="flex-shrink-0 text-stellar-black/40 hover:text-stellar-black transition-colors">
                                {expandedEvent === event.id ? '▼' : '▶'}
                              </button>
                            </div>
                            
                            {/* Stats Bar */}
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2 bg-stellar-lilac/10 rounded-full px-4 py-1.5">
                                <span className="text-sm font-semibold text-stellar-black">🎫</span>
                                <span className="text-sm font-semibold text-stellar-black">{event.claimedSpots}/{event.maxSpots}</span>
                                <span className="text-xs text-stellar-black/60">reclamados</span>
                              </div>
                              <div className="text-xs text-stellar-black/50 font-body">
                                {mintedPercentage}% completado
                              </div>
                              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${CLAIM_STATUS_STYLES[claimStatus.status]}`}>
                                <span>{claimStatus.icon}</span>
                                <span>{claimStatus.label}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {expandedEvent === event.id && (
                        <div className="border-t border-stellar-black/10 p-5 md:p-6 bg-stellar-warm-grey/20 space-y-6">
                          {/* Claim Period */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/20">
                              <Text as="p" size="xs" className="text-stellar-black/50 font-body mb-1 uppercase tracking-wide">
                                Inicio
                              </Text>
                              <Text as="p" size="md" className="text-stellar-black font-body">
                                {formatDate(event.claimStart)}
                              </Text>
                            </div>
                            <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/20">
                              <Text as="p" size="xs" className="text-stellar-black/50 font-body mb-1 uppercase tracking-wide">
                                Fin
                              </Text>
                              <Text as="p" size="md" className="text-stellar-black font-body">
                                {formatDate(event.claimEnd)}
                              </Text>
                            </div>
                          </div>
                          <Text as="p" size="xs" className="text-stellar-black/60 font-body">
                            Estado del claim: <span className="font-semibold">{claimStatus.label}</span>.
                          </Text>

                          {/* Distribution Methods */}
                          <div>
                            <Text as="h3" size="sm" className="font-headline text-stellar-black mb-3 uppercase text-sm tracking-wide">
                              Métodos Activos
                            </Text>
                            <div className="flex flex-wrap gap-2">
                              {event.distributionMethods.qr && (
                                <span className="px-4 py-2 bg-stellar-gold/20 text-stellar-black rounded-full text-sm font-body border border-stellar-gold/30">
                                  📷 QR
                                </span>
                              )}
                              {event.distributionMethods.link && (
                                <span className="px-4 py-2 bg-stellar-lilac/20 text-stellar-black rounded-full text-sm font-body border border-stellar-lilac/30">
                                  🔗 Link
                                </span>
                              )}
                              {event.distributionMethods.code && (
                                <span className="px-4 py-2 bg-stellar-teal/20 text-stellar-black rounded-full text-sm font-body border border-stellar-teal/30">
                                  🔢 Código
                                </span>
                              )}
                              {event.distributionMethods.geolocation && (
                                <span className="px-4 py-2 bg-stellar-warm-grey/50 text-stellar-black rounded-full text-sm font-body border border-stellar-black/10">
                                  📍 Geo
                                </span>
                              )}
                              {event.distributionMethods.nfc && (
                                <span className="px-4 py-2 bg-stellar-navy/20 text-stellar-black rounded-full text-sm font-body border border-stellar-navy/30">
                                  💳 NFC
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Links and Codes */}
                          <div className="space-y-4">
                            {/* Unique Link */}
                            {event.links.uniqueLink && (
                              <div className="bg-stellar-white rounded-xl p-5 border border-stellar-lilac/20">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-xl">🔗</span>
                                  <Text as="h3" size="md" className="font-headline text-stellar-black">
                                    Link Único
                                  </Text>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                  <div className="flex-1 bg-stellar-warm-grey/30 rounded-lg p-3 border border-stellar-lilac/20 min-w-0">
                                    <Text as="p" size="sm" className="font-mono text-stellar-black break-all font-body text-xs">
                                      {event.links.uniqueLink}
                                    </Text>
                                  </div>
                                  <Button
                                    variant="primary"
                                    size="md"
                                    onClick={() => copyToClipboard(event.links.uniqueLink!, 'link', event.id)}
                                    className={`flex-shrink-0 rounded-full px-6 py-2.5 font-semibold ${
                                      copiedLink === event.id 
                                        ? 'bg-stellar-teal text-stellar-white' 
                                        : 'bg-stellar-lilac text-stellar-black hover:bg-stellar-lilac/80'
                                    }`}
                                  >
                                    {copiedLink === event.id ? "✓ Copiado" : "📋 Copiar"}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Shared Code */}
                            {event.codes.sharedCode && (
                              <div className="bg-stellar-white rounded-xl p-5 border border-stellar-gold/30">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-xl">🔢</span>
                                  <Text as="h3" size="md" className="font-headline text-stellar-black">
                                    Código Compartido
                                  </Text>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                  <div className="flex-1 bg-stellar-gold/10 rounded-lg p-4 border border-stellar-gold/30 text-center">
                                    <Text as="p" size="xl" className="font-headline text-stellar-black font-mono tracking-wider">
                                      {event.codes.sharedCode}
                                    </Text>
                                  </div>
                                  <Button
                                    variant="primary"
                                    size="md"
                                    onClick={() => copyToClipboard(event.codes.sharedCode!, 'code', event.id)}
                                    className={`flex-shrink-0 rounded-full px-6 py-2.5 font-semibold ${
                                      copiedCode === event.id 
                                        ? 'bg-stellar-teal text-stellar-white' 
                                        : 'bg-stellar-gold text-stellar-black hover:bg-yellow-400'
                                    }`}
                                  >
                                    {copiedCode === event.id ? "✓ Copiado" : "📋 Copiar"}
                                  </Button>
                                </div>
                                <Text as="p" size="xs" className="text-stellar-black/50 mt-3 text-center font-body italic">
                                  Comparte este código con los asistentes
                                </Text>
                              </div>
                            )}

                            {/* QR Code */}
                            {event.distributionMethods.qr && (
                              <div className="bg-stellar-white rounded-xl p-5 border border-stellar-teal/20 text-center">
                                <div className="flex items-center justify-center gap-2 mb-4">
                                  <span className="text-xl">📷</span>
                                  <Text as="h3" size="md" className="font-headline text-stellar-black">
                                    Código QR
                                  </Text>
                                </div>
                                {loadingQR[event.id] ? (
                                  <div className="flex justify-center items-center py-8">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stellar-teal"></div>
                                    <Text as="p" size="sm" className="text-stellar-black/50 ml-4 font-body">
                                      Generando QR...
                                    </Text>
                                  </div>
                                ) : qrCodes[event.id] ? (
                                  <>
                                    <div className="flex justify-center mb-3">
                                      <div className="bg-white p-4 rounded-xl border-2 border-stellar-teal/30 shadow-md">
                                        <img 
                                          src={qrCodes[event.id]} 
                                          alt="QR Code del evento"
                                          className="w-40 h-40"
                                          onError={(e) => {
                                            console.error('Error cargando QR:', e);
                                            e.currentTarget.src = '';
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <Text as="p" size="xs" className="text-stellar-black/50 font-body italic mb-2">
                                      Escanea para reclamar tu SPOT
                                    </Text>
                                    {event.links.uniqueLink && (
                                      <Text as="p" size="xs" className="text-stellar-black/40 font-body font-mono text-xs break-all px-4">
                                        {event.links.uniqueLink}
                                      </Text>
                                    )}
                                  </>
                                ) : (
                                  <div className="py-8">
                                    <Text as="p" size="sm" className="text-stellar-black/50 font-body">
                                      No se pudo generar el código QR. Por favor, intenta nuevamente.
                                    </Text>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Layout.Inset>
    </Layout.Content>
  );
};

export default MyEvents;
