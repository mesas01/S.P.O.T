import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { generateLinkQRCode } from "../utils/qrCode";
import { getLocalEventsByCreator, updateLocalEvent } from "../utils/localEvents";
import TldrCard from "../components/layout/TldrCard";
import { fetchMintedCount, fetchOnchainEvents } from "../util/backend";
import { useNotification } from "../hooks/useNotification";
import { buildErrorDetail } from "../utils/notificationHelpers";
import ruedaGif from "../images/rueda.gif";
import {
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarDays,
  MapPin,
  Ticket,
  QrCode,
  Link2,
  Hash,
  Nfc,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";

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

const CLAIM_STATUS_ICONS: Record<ClaimStatus, React.ReactNode> = {
  open: <CheckCircle2 size={11} />,
  upcoming: <Clock size={11} />,
  closed: <Lock size={11} />,
  soldout: <AlertTriangle size={11} />,
};

const getAppOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

const buildMintLink = (eventId: string | number) =>
  `${getAppOrigin()}/mint?event=${eventId}`;

const getClaimStatus = (
  event: EventData,
): {
  status: ClaimStatus;
  label: string;
} => {
  const claimed = event.claimedSpots || 0;
  const max = event.maxSpots || 0;
  if (max > 0 && claimed >= max) {
    return { status: "soldout", label: "Agotado" };
  }

  const now = Date.now();
  const start = new Date(event.claimStart).getTime();
  const end = new Date(event.claimEnd).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { status: "open", label: "Activo" };
  }

  if (now < start) {
    return { status: "upcoming", label: "Pendiente" };
  }

  if (now > end) {
    return { status: "closed", label: "Cerrado" };
  }

  return { status: "open", label: "Reclamable" };
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
        address ? { creator: address, signal } : { signal },
      ),
    enabled: !!address,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * attempt, 4000),
    refetchInterval: 15000,
    staleTime: 15000,
  });

  const contractEvents = useMemo(() => {
    if (!onchainEvents || onchainEvents.length === 0) return [];
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
        links: { uniqueLink: buildMintLink(event.eventId) },
        codes: { sharedCode: `SPOT-${event.eventId.toString().padStart(4, "0")}` },
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
    sortedLocalEvents.forEach((event) => eventsById.set(event.id, event));
    sortedContractEvents.forEach((event) => eventsById.set(event.id, event));
    return sortEventsByDate(Array.from(eventsById.values()));
  }, [sortedContractEvents, sortedLocalEvents]);

  const isLoadingEvents =
    isLoadingLocalEvents || (isConnected && isLoadingOnchainEvents);

  const eventsError = useMemo(() => {
    if (!onchainError) return null;
    const error = onchainError as Error;
    if (error.name === "AbortError" || /aborted/i.test(error.message || ""))
      return null;
    return error;
  }, [onchainError]);

  const eventsErrorMessage = useMemo(() => {
    if (!eventsError) return "";
    if (/Failed to fetch|NetworkError/i.test(eventsError.message || ""))
      return "No pudimos conectar con el backend. Verifica que esté encendido e inténtalo nuevamente.";
    if (/timeout/i.test(eventsError.message || ""))
      return "El backend tardó demasiado en responder. Reintenta en unos segundos.";
    return eventsError.message || "Ocurrió un error inesperado.";
  }, [eventsError]);

  const totalEvents = eventsToDisplay.length;
  const eventsSummaryLabel = isLoadingEvents
    ? "Cargando..."
    : totalEvents === 0
    ? "0 eventos creados"
    : `${totalEvents} ${totalEvents === 1 ? "evento creado" : "eventos creados"}`;
  const isSyncingOnchain = !isLoadingOnchainEvents && isFetchingOnchainEvents;

  const handleRetry = () => {
    loadLocalEvents();
    if (address) void refetchOnchainEvents();
  };

  const refreshMintedCounts = async () => {
    if (isRefreshingOnchain) return;
    setIsRefreshingOnchain(true);
    let hadErrors = false;

    try {
      for (const event of localEvents) {
        const eventIdNumber =
          event.contractEventId ?? Number.parseInt(event.id, 10);
        if (!eventIdNumber || Number.isNaN(eventIdNumber)) continue;

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
        title: hadErrors ? "Actualización parcial" : "Datos on-chain sincronizados",
        message: hadErrors
          ? "Algunos eventos no pudieron sincronizarse. Intenta nuevamente."
          : "Métricas de reclamos actualizadas.",
        copyText: hadErrors
          ? buildErrorDetail(new Error("No se pudieron sincronizar todos los eventos."))
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

  const generateQRForEvent = async (
    eventId: string,
    uniqueLink: string,
  ) => {
    if (qrCodes[eventId] || loadingQR[eventId]) return;

    setLoadingQR((prev) => ({ ...prev, [eventId]: true }));
    try {
      const qrCode = await generateLinkQRCode(uniqueLink);
      setQrCodes((prev) => ({ ...prev, [eventId]: qrCode }));
    } catch (error) {
      console.error(`Error generando QR para evento ${eventId}:`, error);
    } finally {
      setLoadingQR((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const toggleEventDetails = async (event: EventData) => {
    const eventId = event.id;
    const isExpanding = expandedEvent !== eventId;
    setExpandedEvent(isExpanding ? eventId : null);

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

    if (typeof document === "undefined") return false;

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

  const copyToClipboard = async (
    text: string,
    type: "link" | "code",
    id: string,
  ) => {
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
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadLocalEvents = () => {
    if (address) {
      setIsLoadingLocalEvents(true);
      try {
        const events = getLocalEventsByCreator(address);
        const formattedEvents: EventData[] = events.map((event) => ({
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location,
          maxSpots: event.maxSpots,
          claimedSpots: event.claimedSpots,
          claimStart: event.claimStart,
          claimEnd: event.claimEnd,
          imageUrl: event.imageUrl,
          distributionMethods:
            event.distributionMethods || { ...DEFAULT_DISTRIBUTION_METHODS },
          links: { uniqueLink: buildMintLink(event.id) },
          codes: { sharedCode: `SPOT-${event.id.slice(-8).toUpperCase()}` },
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

  useEffect(() => {
    loadLocalEvents();
  }, [address]);

  useEffect(() => {
    const handleStorageChange = () => loadLocalEvents();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageUpdated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageUpdated", handleStorageChange);
    };
  }, [address]);

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-20">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-stellar-lilac/10 border border-stellar-lilac/20 flex items-center justify-center">
              <Lock size={28} className="text-stellar-lilac" />
            </div>
          </div>
          <h2 className="text-2xl font-headline text-stellar-black mb-3">
            Conecta tu Wallet
          </h2>
          <p className="text-stellar-black/60 font-body mb-8">
            Necesitas conectar tu wallet para ver tus eventos.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black px-8 py-3 rounded-full font-semibold font-body hover:bg-stellar-gold/90 transition-all shadow-md"
          >
            Ir a Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-6">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-stellar-lilac/10 border border-stellar-lilac/20 rounded-full px-4 py-1.5 mb-3">
                <span className="text-xs font-semibold font-body uppercase tracking-widest text-stellar-lilac">
                  Gestión
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-headline text-stellar-black mb-2">
                Mis Eventos
              </h1>
              <p className="text-stellar-black/60 font-body flex items-center gap-2">
                {eventsSummaryLabel}
                {isSyncingOnchain && (
                  <span className="text-xs text-stellar-black/40 animate-pulse">
                    Sincronizando...
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => navigate("/create-event")}
                className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black px-5 py-2.5 rounded-full font-semibold font-body text-sm hover:bg-stellar-gold/90 transition-all shadow-md"
              >
                <Plus size={14} />
                Crear Evento
              </button>
              <button
                onClick={refreshMintedCounts}
                disabled={isRefreshingOnchain}
                className="inline-flex items-center gap-2 border border-stellar-black/15 text-stellar-black/60 hover:text-stellar-black hover:border-stellar-black/25 px-5 py-2.5 rounded-full font-body text-sm font-semibold transition-all disabled:opacity-50"
              >
                {isRefreshingOnchain ? "Actualizando..." : "Actualizar on-chain"}
              </button>
            </div>
          </div>

          <TldrCard
            label=""
            summary="Esta vista resume el estado de tus SPOTs."
            bullets={[
              {
                label: "Visibilidad",
                detail: "Cards con highlights y métricas claras.",
              },
              {
                label: "Distribución",
                detail: "QR, links y códigos al alcance.",
              },
              {
                label: "Narrativa",
                detail: "Copy directo para sponsors y equipo.",
              },
            ]}
          />
        </div>

        {/* Events List */}
        {isLoadingEvents ? (
          <div className="bg-stellar-white rounded-3xl shadow-sm p-12 text-center border border-stellar-lilac/15">
            <div className="mb-6 flex justify-center">
              <img
                src={ruedaGif}
                alt="Cargando..."
                className="w-24 h-24 object-contain"
              />
            </div>
            <h2 className="text-2xl font-headline text-stellar-black mb-3">
              Cargando eventos...
            </h2>
            <p className="text-stellar-black/60 font-body max-w-md mx-auto">
              Obteniendo tus eventos...
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
              No pudimos cargar tus eventos
            </h2>
            <p className="text-stellar-black/60 font-body max-w-xl mx-auto mb-8">
              {eventsErrorMessage || "Intenta nuevamente en unos segundos."}
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black px-8 py-3 rounded-full font-semibold font-body hover:bg-stellar-gold/90 transition-all shadow-md"
            >
              Reintentar
            </button>
          </div>
        ) : eventsToDisplay.length === 0 ? (
          <div className="bg-stellar-white rounded-3xl shadow-sm p-12 text-center border border-stellar-lilac/15">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-stellar-lilac/10 border border-stellar-lilac/20 flex items-center justify-center">
                <CalendarDays size={28} className="text-stellar-lilac" />
              </div>
            </div>
            <h2 className="text-2xl font-headline text-stellar-black mb-3">
              Aún no has creado eventos
            </h2>
            <p className="text-stellar-black/60 font-body max-w-md mx-auto mb-8">
              Crea tu primer evento para comenzar a distribuir SPOTs a los
              asistentes.
            </p>
            <button
              onClick={() => navigate("/create-event")}
              className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black px-8 py-3 rounded-full font-semibold font-body hover:bg-stellar-gold/90 transition-all shadow-md"
            >
              <Plus size={14} />
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
                      Math.round((event.claimedSpots / event.maxSpots) * 100),
                    )
                  : 0;
              return (
                <div
                  key={event.id}
                  className="bg-stellar-white rounded-2xl shadow-sm border border-stellar-black/10 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  {/* Card Header — always visible */}
                  <div
                    className="p-5 md:p-6 cursor-pointer"
                    onClick={() => toggleEventDetails(event)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Event image */}
                      {event.imageUrl && (
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-stellar-lilac/20 flex-shrink-0 bg-stellar-warm-grey/20">
                          {event.imageUrl.startsWith("http") ||
                          event.imageUrl.startsWith("/images/") ||
                          event.imageUrl.startsWith("data:") ? (
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
                      )}

                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-xl md:text-2xl font-headline text-stellar-black">
                                {event.name}
                              </h2>
                              {event.source === "contract" && (
                                <span className="text-[11px] uppercase tracking-wide bg-stellar-teal/15 text-stellar-teal font-semibold px-2 py-0.5 rounded-full">
                                  On-chain
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-stellar-black/50 font-body mt-2">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays size={13} />
                                {new Date(event.date).toLocaleDateString(
                                  "es-ES",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
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

                        {/* Stats bar */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 bg-stellar-lilac/10 rounded-full px-3 py-1.5">
                            <Ticket size={13} className="text-stellar-lilac" />
                            <span className="text-sm font-semibold text-stellar-black">
                              {event.claimedSpots}/{event.maxSpots}
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
                            {CLAIM_STATUS_ICONS[claimStatus.status]}
                            {claimStatus.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable details */}
                  {expandedEvent === event.id && (
                    <div className="border-t border-stellar-black/8 p-5 md:p-6 bg-stellar-warm-grey/15 space-y-6">
                      {/* Claim period */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/15">
                          <p className="text-xs text-stellar-black/40 font-body mb-1 uppercase tracking-widest">
                            Inicio
                          </p>
                          <p className="text-stellar-black font-body text-sm">
                            {formatDate(event.claimStart)}
                          </p>
                        </div>
                        <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/15">
                          <p className="text-xs text-stellar-black/40 font-body mb-1 uppercase tracking-widest">
                            Fin
                          </p>
                          <p className="text-stellar-black font-body text-sm">
                            {formatDate(event.claimEnd)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-stellar-black/50 font-body">
                        Estado del claim:{" "}
                        <span className="font-semibold">
                          {claimStatus.label}
                        </span>
                        .
                      </p>

                      {/* Distribution methods */}
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-stellar-black/50 font-body mb-3">
                          Métodos Activos
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {event.distributionMethods.qr && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stellar-gold/15 text-stellar-black rounded-full text-xs font-semibold font-body border border-stellar-gold/25">
                              <QrCode size={11} />
                              QR
                            </span>
                          )}
                          {event.distributionMethods.link && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stellar-lilac/15 text-stellar-black rounded-full text-xs font-semibold font-body border border-stellar-lilac/25">
                              <Link2 size={11} />
                              Link
                            </span>
                          )}
                          {event.distributionMethods.code && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stellar-teal/15 text-stellar-black rounded-full text-xs font-semibold font-body border border-stellar-teal/25">
                              <Hash size={11} />
                              Código
                            </span>
                          )}
                          {event.distributionMethods.geolocation && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stellar-warm-grey/50 text-stellar-black rounded-full text-xs font-semibold font-body border border-stellar-black/10">
                              <MapPin size={11} />
                              Geo
                            </span>
                          )}
                          {event.distributionMethods.nfc && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stellar-black/8 text-stellar-black rounded-full text-xs font-semibold font-body border border-stellar-black/15">
                              <Nfc size={11} />
                              NFC
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Links and codes */}
                      <div className="space-y-4">
                        {/* Unique link */}
                        {event.links.uniqueLink && (
                          <div className="bg-stellar-white rounded-xl p-5 border border-stellar-lilac/15">
                            <div className="flex items-center gap-2 mb-3">
                              <Link2
                                size={16}
                                className="text-stellar-lilac flex-shrink-0"
                              />
                              <h3 className="font-headline text-stellar-black text-base">
                                Link Único
                              </h3>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                              <div className="flex-1 bg-stellar-warm-grey/20 rounded-lg p-3 border border-stellar-lilac/15 min-w-0">
                                <p className="font-mono text-stellar-black break-all font-body text-xs">
                                  {event.links.uniqueLink}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    event.links.uniqueLink!,
                                    "link",
                                    event.id,
                                  )
                                }
                                className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold font-body text-sm transition-all ${
                                  copiedLink === event.id
                                    ? "bg-stellar-teal text-white"
                                    : "bg-stellar-lilac/20 text-stellar-black hover:bg-stellar-lilac/30"
                                }`}
                              >
                                {copiedLink === event.id ? (
                                  <>
                                    <Check size={13} />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} />
                                    Copiar
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Shared code */}
                        {event.codes.sharedCode && (
                          <div className="bg-stellar-white rounded-xl p-5 border border-stellar-gold/25">
                            <div className="flex items-center gap-2 mb-3">
                              <Hash
                                size={16}
                                className="text-stellar-gold flex-shrink-0"
                              />
                              <h3 className="font-headline text-stellar-black text-base">
                                Código Compartido
                              </h3>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                              <div className="flex-1 bg-stellar-gold/10 rounded-lg p-4 border border-stellar-gold/25 text-center">
                                <p className="font-headline text-stellar-black font-mono tracking-widest text-xl">
                                  {event.codes.sharedCode}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    event.codes.sharedCode!,
                                    "code",
                                    event.id,
                                  )
                                }
                                className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold font-body text-sm transition-all ${
                                  copiedCode === event.id
                                    ? "bg-stellar-teal text-white"
                                    : "bg-stellar-gold text-stellar-black hover:bg-stellar-gold/80"
                                }`}
                              >
                                {copiedCode === event.id ? (
                                  <>
                                    <Check size={13} />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} />
                                    Copiar
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-stellar-black/40 mt-3 text-center font-body italic">
                              Comparte este código con los asistentes
                            </p>
                          </div>
                        )}

                        {/* QR Code */}
                        {event.distributionMethods.qr && (
                          <div className="bg-stellar-white rounded-xl p-5 border border-stellar-teal/15 text-center">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <QrCode
                                size={16}
                                className="text-stellar-teal"
                              />
                              <h3 className="font-headline text-stellar-black text-base">
                                Código QR
                              </h3>
                            </div>
                            {loadingQR[event.id] ? (
                              <div className="flex justify-center items-center py-8 gap-3">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-stellar-teal" />
                                <p className="text-stellar-black/50 font-body text-sm">
                                  Generando QR...
                                </p>
                              </div>
                            ) : qrCodes[event.id] ? (
                              <>
                                <div className="flex justify-center mb-3">
                                  <div className="bg-white p-4 rounded-xl border border-stellar-teal/20 shadow-sm">
                                    <img
                                      src={qrCodes[event.id]}
                                      alt="QR Code del evento"
                                      className="w-40 h-40"
                                      onError={(e) => {
                                        console.error(
                                          "Error cargando QR:",
                                          e,
                                        );
                                        e.currentTarget.src = "";
                                      }}
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-stellar-black/40 font-body italic mb-2">
                                  Escanea para reclamar tu SPOT
                                </p>
                                {event.links.uniqueLink && (
                                  <p className="text-xs text-stellar-black/30 font-body font-mono break-all px-4">
                                    {event.links.uniqueLink}
                                  </p>
                                )}
                              </>
                            ) : (
                              <div className="py-8">
                                <p className="text-stellar-black/40 font-body text-sm">
                                  No se pudo generar el código QR. Por favor,
                                  intenta nuevamente.
                                </p>
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
  );
};

export default MyEvents;
