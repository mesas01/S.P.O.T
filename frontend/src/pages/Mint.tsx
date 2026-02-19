import React, { useEffect, useRef, useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import {
  claimEventRequest,
  fetchOnchainEvents,
  type OnchainEventSummary,
} from "../util/backend";
import { connectWallet } from "../util/wallet";
import TldrCard from "../components/layout/TldrCard";
import {
  mapEventToClaimedSpot,
  upsertClaimedSpot,
} from "../utils/claimedSpots";
import { buildErrorDetail, buildTxDetail } from "../utils/notificationHelpers";
import {
  QrCode,
  Link2,
  Hash,
  MapPin,
  Nfc,
  Lock,
  ArrowLeft,
  Loader2,
  Calendar,
  MapPinIcon,
  Users,
} from "lucide-react";

// ─── Claim methods config ────────────────────────────────────────────────────

const claimMethods = [
  {
    id: "qr",
    Icon: QrCode,
    title: "Escanear QR",
    description: "Escanea el código QR del evento para reclamar tu SPOT al instante.",
    color: "text-stellar-gold",
    bg: "bg-stellar-gold/10",
    border: "border-stellar-gold/20",
    activeBorder: "border-stellar-gold",
    activeBg: "bg-stellar-gold/10",
  },
  {
    id: "link",
    Icon: Link2,
    title: "Usar Link",
    description: "Ingresa el link único del evento para reclamar de forma remota.",
    color: "text-stellar-lilac",
    bg: "bg-stellar-lilac/10",
    border: "border-stellar-lilac/20",
    activeBorder: "border-stellar-lilac",
    activeBg: "bg-stellar-lilac/10",
  },
  {
    id: "code",
    Icon: Hash,
    title: "Código Compartido",
    description: "Ingresa el código compartido por el organizador del evento.",
    color: "text-stellar-teal",
    bg: "bg-stellar-teal/10",
    border: "border-stellar-teal/20",
    activeBorder: "border-stellar-teal",
    activeBg: "bg-stellar-teal/10",
  },
  {
    id: "geolocation",
    Icon: MapPin,
    title: "Geolocalización",
    description: "Verifica tu ubicación cerca del evento para validar asistencia.",
    color: "text-stellar-gold",
    bg: "bg-stellar-gold/10",
    border: "border-stellar-gold/20",
    activeBorder: "border-stellar-gold",
    activeBg: "bg-stellar-gold/10",
  },
  {
    id: "nfc",
    Icon: Nfc,
    title: "NFC",
    description: "Acerca tu dispositivo al tag NFC para una experiencia táctil.",
    color: "text-stellar-lilac",
    bg: "bg-stellar-lilac/10",
    border: "border-stellar-lilac/20",
    activeBorder: "border-stellar-lilac",
    activeBg: "bg-stellar-lilac/10",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const Mint: React.FC = () => {
  const { address } = useWallet();
  const isConnected = !!address;
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [searchParams] = useSearchParams();
  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [codeValue, setCodeValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [eventInfo, setEventInfo] = useState<OnchainEventSummary | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const claimPersistControllerRef = useRef<AbortController | null>(null);
  const actionPanelRef = useRef<HTMLDivElement | null>(null);

  const urlEventId = searchParams.get("event");
  const parsedEventId = urlEventId ? Number(urlEventId) : null;
  const hasDirectEvent = parsedEventId !== null && !Number.isNaN(parsedEventId);

  const handleMethodSelect = (method: string) => {
    setActiveMethod(method);
    setTimeout(() => {
      actionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  useEffect(() => {
    return () => {
      claimPersistControllerRef.current?.abort();
    };
  }, []);

  // Fetch event info when arriving via direct link
  useEffect(() => {
    if (!hasDirectEvent) return;
    let cancelled = false;
    setEventLoading(true);
    fetchOnchainEvents()
      .then((events) => {
        if (cancelled) return;
        const match = events.find((e) => e.eventId === parsedEventId);
        if (match) setEventInfo(match);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEventLoading(false);
      });
    return () => { cancelled = true; };
  }, [hasDirectEvent, parsedEventId]);

  const persistClaimedSpotLocally = async (eventId: number) => {
    if (!address) return;
    claimPersistControllerRef.current?.abort();
    const controller = new AbortController();
    claimPersistControllerRef.current = controller;

    try {
      const events = await fetchOnchainEvents({ signal: controller.signal });
      const match = events.find((event) => event.eventId === eventId);
      if (match) {
        upsertClaimedSpot(address, mapEventToClaimedSpot(match));
        return;
      }
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || /aborted/i.test(error.message))) {
        return;
      }
      console.warn("No se pudo obtener metadata del evento:", error);
    } finally {
      if (claimPersistControllerRef.current === controller) {
        claimPersistControllerRef.current = null;
      }
    }
  };

  const extractEventIdFromLink = (link: string): number | null => {
    try {
      const maybeUrl = new URL(link);
      const queryEvent = maybeUrl.searchParams.get("event");
      if (queryEvent) {
        const parsed = Number(queryEvent);
        if (!Number.isNaN(parsed)) return parsed;
      }
    } catch { /* not a valid URL */ }

    const match = link.match(/(\d+)/g);
    if (match) {
      const parsed = Number(match[match.length - 1]);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
  };

  const extractEventIdFromCode = (code: string): number | null => {
    const digits = code.match(/(\d+)/);
    if (!digits) return null;
    const parsed = Number(digits[0]);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const executeClaim = async (eventId: number) => {
    if (!address) {
      showNotification({ type: "error", title: "Wallet requerida", message: "Conecta tu wallet antes de reclamar el coleccionable" });
      return;
    }
    setIsProcessing(true);
    try {
      const response = await claimEventRequest({ claimer: address, eventId });
      showNotification({
        type: "success",
        title: "Reclamo enviado",
        message: "Tx enviada. Copia el detalle si necesitas compartirla.",
        copyText: buildTxDetail(response.txHash, { eventId, claimer: address }),
      });
      await persistClaimedSpotLocally(eventId);
      navigate("/");
    } catch (error: any) {
      showNotification({ type: "error", title: "Error al reclamar", message: "No se pudo completar el reclamo.", copyText: buildErrorDetail(error) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRScan = async () => {
    showNotification({ type: "info", title: "Próximamente", message: "El escaneo QR enviará el reclamo automático al backend." });
  };

  const handleLinkClaim = async () => {
    if (!linkValue.trim()) { alert("Por favor, ingresa un link válido"); return; }
    setIsProcessing(true);
    try {
      const eventId = extractEventIdFromLink(linkValue.trim());
      if (eventId === null) {
        showNotification({ type: "error", title: "Link no válido", message: "No pudimos encontrar un ID de evento en el link" });
        return;
      }
      await executeClaim(eventId);
    } catch (error) {
      showNotification({ type: "error", title: "Error al reclamar", message: "No pudimos procesar el link.", copyText: buildErrorDetail(error) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCodeClaim = async () => {
    if (!codeValue.trim()) { alert("Por favor, ingresa un código válido"); return; }
    setIsProcessing(true);
    try {
      const eventId = extractEventIdFromCode(codeValue.trim());
      if (eventId === null) {
        showNotification({ type: "error", title: "Código inválido", message: "Incluye el ID numérico del evento en el código compartido" });
        return;
      }
      await executeClaim(eventId);
    } catch (error) {
      showNotification({ type: "error", title: "Error al reclamar", message: "No pudimos procesar el código.", copyText: buildErrorDetail(error) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeolocation = async () => {
    setIsProcessing(true);
    try {
      if (!navigator.geolocation) {
        showNotification({ type: "error", title: "Sin geolocalización", message: "Tu navegador no soporta geolocalización" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async () => {
          showNotification({ type: "info", title: "Validación pendiente", message: "La validación por geolocalización aún no está implementada." });
        },
        (error) => {
          showNotification({ type: "error", title: "Error de ubicación", message: "No pudimos obtener tu posición.", copyText: buildErrorDetail(error) });
        },
      );
    } catch (error) {
      showNotification({ type: "error", title: "Error al reclamar", message: "No pudimos completar la validación por geolocalización.", copyText: buildErrorDetail(error) });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Direct link: confirmation view ────────────────────────────────────────
  if (hasDirectEvent) {
    const formatDate = (ts: number) =>
      new Date(ts * 1000).toLocaleDateString("es", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    return (
      <div className="min-h-screen bg-stellar-white flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm text-stellar-black/50 hover:text-stellar-black transition-colors font-body mb-8"
          >
            <ArrowLeft size={15} />
            Volver
          </button>

          <div className="rounded-2xl border-2 border-stellar-lilac/20 bg-white p-8 shadow-lg">
            <span className="text-xs font-body uppercase tracking-widest text-stellar-teal mb-3 block">
              Confirmar reclamo
            </span>
            <h1 className="text-2xl md:text-3xl font-headline text-stellar-black mb-6 uppercase">
              Reclamar SPOT
            </h1>

            {/* Event info */}
            {eventLoading ? (
              <div className="flex items-center gap-3 mb-6 text-stellar-black/50">
                <Loader2 size={16} className="animate-spin" />
                <span className="font-body text-sm">Cargando info del evento...</span>
              </div>
            ) : eventInfo ? (
              <div className="rounded-xl border border-stellar-lilac/15 bg-stellar-lilac/5 p-5 mb-6 space-y-3">
                {eventInfo.imageUrl && (
                  <img
                    src={eventInfo.imageUrl}
                    alt={eventInfo.name}
                    className="w-full h-40 object-cover rounded-lg border border-stellar-lilac/10"
                  />
                )}
                <h3 className="text-lg font-headline text-stellar-black uppercase">
                  {eventInfo.name}
                </h3>
                <div className="space-y-2 text-sm font-body text-stellar-black/70">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-stellar-lilac" />
                    {formatDate(eventInfo.date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPinIcon size={14} className="text-stellar-lilac" />
                    {eventInfo.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-stellar-lilac" />
                    {eventInfo.mintedCount} / {eventInfo.maxSpots} reclamados
                  </div>
                </div>
                {eventInfo.description && (
                  <p className="text-xs text-stellar-black/50 font-body pt-1">
                    {eventInfo.description}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-stellar-lilac/15 bg-stellar-lilac/5 p-5 mb-6">
                <p className="text-sm font-body text-stellar-black/70">
                  Evento <span className="font-semibold">#{parsedEventId}</span>
                </p>
              </div>
            )}

            {/* Action */}
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 size={32} className="animate-spin text-stellar-lilac" />
                <p className="text-sm font-body text-stellar-black/60">
                  Procesando tu reclamo...
                </p>
              </div>
            ) : !isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-stellar-gold/10 border border-stellar-gold/20 p-4">
                  <Lock size={18} className="text-stellar-gold flex-shrink-0" />
                  <p className="text-sm font-body text-stellar-black/70">
                    Para reclamar tu SPOT necesitas conectar tu wallet primero.
                  </p>
                </div>
                <button
                  onClick={() => void connectWallet()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3.5 px-8 shadow-md transition-all font-body text-base"
                >
                  Conectar Wallet
                </button>
              </div>
            ) : (
              <button
                onClick={() => executeClaim(parsedEventId!)}
                className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3.5 px-8 shadow-md transition-all font-body text-base"
              >
                Confirmar Reclamo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Not connected guard (manual methods) ────────────────────────────────
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-stellar-white flex items-center justify-center px-6 py-24">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stellar-lilac/10 border border-stellar-lilac/20 mb-6 mx-auto">
            <Lock size={28} className="text-stellar-lilac" />
          </div>
          <h2 className="text-2xl font-headline text-stellar-black mb-3 uppercase">
            Conecta tu Wallet
          </h2>
          <p className="text-stellar-black/60 mb-8 font-body">
            Necesitas conectar tu wallet para reclamar un SPOT.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-8 py-3 shadow-lg transition-all font-body"
          >
            <ArrowLeft size={16} />
            Ir a Home
          </button>
        </div>
      </div>
    );
  }

  // ── Main view (manual methods) ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stellar-white">
      {/* Page header */}
      <div className="mx-auto max-w-4xl px-6 pt-10 pb-8">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-sm text-stellar-black/50 hover:text-stellar-black transition-colors font-body mb-6"
        >
          <ArrowLeft size={15} />
          Volver
        </button>

        <span className="text-xs font-body uppercase tracking-widest text-stellar-teal mb-3 block">
          Métodos de reclamo
        </span>
        <h1 className="text-3xl md:text-4xl font-headline text-stellar-black mb-3 uppercase">
          Reclamar SPOT
        </h1>
        <p className="text-stellar-black/60 font-body max-w-xl">
          Decide cómo reclamar tu comprobante: QR, link, código, geolocalización
          o NFC según el contexto del evento.
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-6 pb-16">
        {/* TL;DR */}
        <div className="mb-8">
          <TldrCard
            label=""
            summary="Decide cómo reclamar tu comprobante: QR, link, código, geolocalización o NFC según el contexto del evento."
            bullets={[
              { label: "QR primero", detail: "Experiencia más rápida en eventos físicos." },
              { label: "Link único", detail: "Ideal para claims remotos con copy pragmático." },
              { label: "Geo & NFC", detail: "Visibilidad de métodos futuros con transparencia." },
            ]}
          />
        </div>

        {/* Method cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {claimMethods.map((method) => {
            const isActive = activeMethod === method.id;
            const isNfcDisabled = method.id === "nfc" && !("NDEFReader" in window);
            return (
              <button
                key={method.id}
                onClick={() => !isNfcDisabled && handleMethodSelect(method.id)}
                disabled={isNfcDisabled}
                className={`group relative rounded-2xl border-2 p-6 text-left transition-all duration-300 ${
                  isNfcDisabled
                    ? "opacity-40 cursor-not-allowed border-stellar-black/10 bg-stellar-warm-grey/20"
                    : isActive
                    ? `${method.activeBorder} ${method.activeBg} shadow-lg scale-[1.02]`
                    : `${method.border} ${method.bg} hover:scale-[1.02] hover:shadow-md`
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${method.bg} border ${method.border} flex items-center justify-center`}>
                    <method.Icon size={20} className={method.color} />
                  </div>
                  <div>
                    <h3 className="text-sm font-headline text-stellar-black mb-1 uppercase">
                      {method.title}
                    </h3>
                    <p className="text-xs text-stellar-black/60 leading-relaxed font-body">
                      {method.description}
                    </p>
                    {isNfcDisabled && (
                      <p className="text-xs text-stellar-black/40 mt-1 font-body">
                        No disponible en este dispositivo
                      </p>
                    )}
                  </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${method.color.replace("text-", "bg-")}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Action panel */}
        {activeMethod && (
          <div
            ref={actionPanelRef}
            className="rounded-2xl border border-stellar-lilac/20 bg-stellar-lilac/5 p-8"
          >
            {activeMethod === "qr" && (
              <div className="space-y-4">
                <h3 className="text-lg font-headline text-stellar-black uppercase">
                  Escanear código QR
                </h3>
                <button
                  onClick={handleQRScan}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 px-8 shadow-md transition-all font-body disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Procesando...</> : "Abrir Cámara"}
                </button>
              </div>
            )}

            {activeMethod === "link" && (
              <div className="space-y-4">
                <h3 className="text-lg font-headline text-stellar-black uppercase">
                  Ingresa el link del evento
                </h3>
                <input
                  type="url"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="https://spot.example.com/event/..."
                  className="w-full px-5 py-3 border-2 border-stellar-lilac/40 rounded-xl bg-stellar-white text-stellar-black placeholder-stellar-black/30 focus:border-stellar-lilac focus:outline-none focus:ring-2 focus:ring-stellar-lilac/20 font-body text-sm transition-colors"
                />
                <button
                  onClick={handleLinkClaim}
                  disabled={isProcessing || !linkValue.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 px-8 shadow-md transition-all font-body disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Procesando...</> : "Reclamar SPOT"}
                </button>
              </div>
            )}

            {activeMethod === "code" && (
              <div className="space-y-4">
                <h3 className="text-lg font-headline text-stellar-black uppercase">
                  Ingresa el código del evento
                </h3>
                <input
                  type="text"
                  value={codeValue}
                  onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
                  placeholder="Ej: HACKATHON2024"
                  className="w-full px-5 py-3 border-2 border-stellar-teal/40 rounded-xl bg-stellar-white text-stellar-black placeholder-stellar-black/30 focus:border-stellar-teal focus:outline-none focus:ring-2 focus:ring-stellar-teal/20 font-body text-sm uppercase tracking-widest transition-colors"
                />
                <button
                  onClick={handleCodeClaim}
                  disabled={isProcessing || !codeValue.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 px-8 shadow-md transition-all font-body disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Procesando...</> : "Reclamar SPOT"}
                </button>
              </div>
            )}

            {activeMethod === "geolocation" && (
              <div className="space-y-4">
                <h3 className="text-lg font-headline text-stellar-black uppercase">
                  Verificar ubicación
                </h3>
                <p className="text-stellar-black/60 font-body text-sm">
                  Asegúrate de estar en el lugar del evento. Usaremos tu ubicación para validar la asistencia.
                </p>
                <button
                  onClick={handleGeolocation}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 px-8 shadow-md transition-all font-body disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : "Verificar Ubicación"}
                </button>
              </div>
            )}

            {activeMethod === "nfc" && (
              <div className="space-y-4">
                <h3 className="text-lg font-headline text-stellar-black uppercase">
                  Acerca tu dispositivo al tag NFC
                </h3>
                <p className="text-stellar-black/60 font-body text-sm">
                  Asegúrate de que NFC esté activado en tu dispositivo y acércalo al punto de reclamo.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Mint;
