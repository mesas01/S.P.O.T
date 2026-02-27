import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWallet } from "../hooks/useWallet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import {
  claimEventRequest,
  fetchEventById,
  type OnchainEventSummary,
} from "../util/backend";
import { connectWallet } from "../util/wallet";
import TldrCard from "../components/layout/TldrCard";
import QRScanner from "../components/QRScanner";
import { buildErrorDetail, buildTxDetail } from "../utils/notificationHelpers";
import { getDateLocale } from "../utils/dateFormat";
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

// ─── Component ───────────────────────────────────────────────────────────────

const Mint: React.FC = () => {
  const { t } = useTranslation('mint');
  const { address } = useWallet();
  const isConnected = !!address;
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // ─── Claim methods config (inside component to use t()) ──────────────────
  const claimMethods = [
    {
      id: "qr",
      Icon: QrCode,
      title: t('methods.qr'),
      description: t('methods.qrDesc'),
      color: "text-stellar-gold",
      bg: "bg-stellar-gold/10",
      border: "border-stellar-gold/20",
      activeBorder: "border-stellar-gold",
      activeBg: "bg-stellar-gold/10",
    },
    {
      id: "link",
      Icon: Link2,
      title: t('methods.link'),
      description: t('methods.linkDesc'),
      color: "text-stellar-lilac",
      bg: "bg-stellar-lilac/10",
      border: "border-stellar-lilac/20",
      activeBorder: "border-stellar-lilac",
      activeBg: "bg-stellar-lilac/10",
    },
    {
      id: "code",
      Icon: Hash,
      title: t('methods.code'),
      description: t('methods.codeDesc'),
      color: "text-stellar-teal",
      bg: "bg-stellar-teal/10",
      border: "border-stellar-teal/20",
      activeBorder: "border-stellar-teal",
      activeBg: "bg-stellar-teal/10",
    },
    {
      id: "geolocation",
      Icon: MapPin,
      title: t('methods.geolocation'),
      description: t('methods.geolocationDesc'),
      color: "text-stellar-gold",
      bg: "bg-stellar-gold/10",
      border: "border-stellar-gold/20",
      activeBorder: "border-stellar-gold",
      activeBg: "bg-stellar-gold/10",
    },
    {
      id: "nfc",
      Icon: Nfc,
      title: t('methods.nfc'),
      description: t('methods.nfcDesc'),
      color: "text-stellar-lilac",
      bg: "bg-stellar-lilac/10",
      border: "border-stellar-lilac/20",
      activeBorder: "border-stellar-lilac",
      activeBg: "bg-stellar-lilac/10",
    },
  ];

  const [searchParams] = useSearchParams();
  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [codeValue, setCodeValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [eventInfo, setEventInfo] = useState<OnchainEventSummary | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
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

  // Fetch event info when arriving via direct link (uses /events/:id for direct access, works for private events)
  useEffect(() => {
    if (!hasDirectEvent) return;
    let cancelled = false;
    setEventLoading(true);
    fetchEventById(parsedEventId!)
      .then((event) => {
        if (cancelled) return;
        if (event) setEventInfo(event);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEventLoading(false);
      });
    return () => { cancelled = true; };
  }, [hasDirectEvent, parsedEventId]);

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
      showNotification({ type: "error", title: t('notifications.walletRequired'), message: t('notifications.walletRequiredMsg') });
      return;
    }
    setIsProcessing(true);
    try {
      const event = await fetchEventById(eventId);
      if (!event) {
        showNotification({
          type: "error",
          title: t('notifications.eventNotFound'),
          message: t('notifications.eventNotFoundMsg'),
        });
        return;
      }
      const response = await claimEventRequest({ claimer: address, eventId });
      showNotification({
        type: "success",
        title: t('notifications.claimSent'),
        message: t('notifications.claimSentMsg'),
        copyText: buildTxDetail(response.txHash, { eventId, claimer: address }),
      });
      navigate("/");
    } catch (error: any) {
      const msg = error?.message ?? "";
      const isEventNotFound =
        /Error\(Contract,\s*#7\)|EventNotFound|NO_EVENT|event not found/i.test(msg);
      const title = isEventNotFound ? t('notifications.eventNotFound') : t('notifications.claimError');
      const message = isEventNotFound
        ? t('notifications.eventNotFoundMsg')
        : t('notifications.claimErrorMsg');
      showNotification({ type: "error", title, message, copyText: buildErrorDetail(error) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRScan = () => {
    setShowQRScanner(true);
  };

  const handleQRResult = async (decodedText: string) => {
    setShowQRScanner(false);
    const eventId = extractEventIdFromLink(decodedText);
    if (eventId === null) {
      showNotification({ type: "error", title: t('notifications.invalidQR'), message: t('notifications.invalidQRMsg') });
      return;
    }
    await executeClaim(eventId);
  };

  const handleLinkClaim = async () => {
    if (!linkValue.trim()) { alert(t('alerts.enterValidLink')); return; }
    setIsProcessing(true);
    try {
      const eventId = extractEventIdFromLink(linkValue.trim());
      if (eventId === null) {
        showNotification({ type: "error", title: t('notifications.invalidLink'), message: t('notifications.invalidLinkMsg') });
        return;
      }
      await executeClaim(eventId);
    } catch (error) {
      showNotification({ type: "error", title: t('notifications.claimError'), message: t('notifications.linkProcessError'), copyText: buildErrorDetail(error) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCodeClaim = async () => {
    if (!codeValue.trim()) { alert(t('alerts.enterValidCode')); return; }
    setIsProcessing(true);
    try {
      const eventId = extractEventIdFromCode(codeValue.trim());
      if (eventId === null) {
        showNotification({ type: "error", title: t('notifications.invalidCode'), message: t('notifications.invalidCodeMsg') });
        return;
      }
      await executeClaim(eventId);
    } catch (error) {
      showNotification({ type: "error", title: t('notifications.claimError'), message: t('notifications.codeProcessError'), copyText: buildErrorDetail(error) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeolocation = async () => {
    setIsProcessing(true);
    try {
      if (!navigator.geolocation) {
        showNotification({ type: "error", title: t('notifications.noGeolocation'), message: t('notifications.noGeolocationMsg') });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async () => {
          showNotification({ type: "info", title: t('notifications.validationPending'), message: t('notifications.validationPendingMsg') });
        },
        (error) => {
          showNotification({ type: "error", title: t('notifications.locationError'), message: t('notifications.locationErrorMsg'), copyText: buildErrorDetail(error) });
        },
      );
    } catch (error) {
      showNotification({ type: "error", title: t('notifications.claimError'), message: t('notifications.geolocationError'), copyText: buildErrorDetail(error) });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Direct link: confirmation view ────────────────────────────────────────
  if (hasDirectEvent) {
    const formatDate = (ts: number) =>
      new Date(ts * 1000).toLocaleDateString(getDateLocale(), {
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
            {t('common:actions.back')}
          </button>

          <div className="rounded-2xl border-2 border-stellar-lilac/20 bg-white p-8 shadow-lg">
            <span className="text-xs font-body uppercase tracking-widest text-stellar-teal mb-3 block">
              {t('confirmEyebrow')}
            </span>
            <h1 className="text-2xl md:text-3xl font-headline text-stellar-black mb-6 uppercase">
              {t('confirmTitle')}
            </h1>

            {/* Event info */}
            {eventLoading ? (
              <div className="flex items-center gap-3 mb-6 text-stellar-black/50">
                <Loader2 size={16} className="animate-spin" />
                <span className="font-body text-sm">{t('loadingEventInfo')}</span>
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
                    {eventInfo.mintedCount} / {eventInfo.maxSpots} {t('common:claimed')}
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
                  {t('event')} <span className="font-semibold">#{parsedEventId}</span>
                </p>
              </div>
            )}

            {/* Action */}
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 size={32} className="animate-spin text-stellar-lilac" />
                <p className="text-sm font-body text-stellar-black/60">
                  {t('processing')}
                </p>
              </div>
            ) : !isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-stellar-gold/10 border border-stellar-gold/20 p-4">
                  <Lock size={18} className="text-stellar-gold flex-shrink-0" />
                  <p className="text-sm font-body text-stellar-black/70">
                    {t('connectRequired')}
                  </p>
                </div>
                <button
                  onClick={() => void connectWallet()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3.5 px-8 shadow-md transition-all font-body text-base"
                >
                  {t('common:wallet.connectWallet')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => executeClaim(parsedEventId!)}
                className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3.5 px-8 shadow-md transition-all font-body text-base"
              >
                {t('confirmClaim')}
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
            {t('connectTitle')}
          </h2>
          <p className="text-stellar-black/60 mb-8 font-body">
            {t('connectSubtitle')}
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-8 py-3 shadow-lg transition-all font-body"
          >
            <ArrowLeft size={16} />
            {t('common:actions.goHome')}
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
          {t('common:actions.back')}
        </button>

        <span className="text-xs font-body uppercase tracking-widest text-stellar-teal mb-3 block">
          {t('eyebrow')}
        </span>
        <h1 className="text-3xl md:text-4xl font-headline text-stellar-black mb-3 uppercase">
          {t('title')}
        </h1>
        <p className="text-stellar-black/60 font-body max-w-xl">
          {t('subtitle')}
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-6 pb-16">
        {/* TL;DR */}
        <div className="mb-8">
          <TldrCard
            label=""
            summary={t('tldr.summary')}
            bullets={[
              { label: t('tldr.qrLabel'), detail: t('tldr.qrDetail') },
              { label: t('tldr.linkLabel'), detail: t('tldr.linkDetail') },
              { label: t('tldr.geoLabel'), detail: t('tldr.geoDetail') },
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
                        {t('methods.nfcUnavailable')}
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
                  {t('actions.scanQR')}
                </h3>
                <button
                  onClick={handleQRScan}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 px-8 shadow-md transition-all font-body disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 size={16} className="animate-spin" /> {t('actions.processing')}</> : t('actions.openCamera')}
                </button>
                {showQRScanner && <QRScanner onScan={handleQRResult} onClose={() => setShowQRScanner(false)} />}
              </div>
            )}

            {activeMethod === "link" && (
              <div className="space-y-4">
                <h3 className="text-lg font-headline text-stellar-black uppercase">
                  {t('actions.enterLink')}
                </h3>
                <input
                  type="url"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder={t('placeholders.linkInput')}
                  className="w-full px-5 py-3 border-2 border-stellar-lilac/40 rounded-xl bg-stellar-white text-stellar-black placeholder-stellar-black/30 focus:border-stellar-lilac focus:outline-none focus:ring-2 focus:ring-stellar-lilac/20 font-body text-sm transition-colors"
                />
                <button
                  onClick={handleLinkClaim}
                  disabled={isProcessing || !linkValue.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 px-8 shadow-md transition-all font-body disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 size={16} className="animate-spin" /> {t('actions.processing')}</> : t('actions.claimSpot')}
                </button>
              </div>
            )}

            {activeMethod === "code" && (
              <div className="space-y-4">
                <h3 className="text-lg font-headline text-stellar-black uppercase">
                  {t('actions.enterCode')}
                </h3>
                <input
                  type="text"
                  value={codeValue}
                  onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
                  placeholder={t('placeholders.codeInput')}
                  className="w-full px-5 py-3 border-2 border-stellar-teal/40 rounded-xl bg-stellar-white text-stellar-black placeholder-stellar-black/30 focus:border-stellar-teal focus:outline-none focus:ring-2 focus:ring-stellar-teal/20 font-body text-sm uppercase tracking-widest transition-colors"
                />
                <button
                  onClick={handleCodeClaim}
                  disabled={isProcessing || !codeValue.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 px-8 shadow-md transition-all font-body disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 size={16} className="animate-spin" /> {t('actions.processing')}</> : t('actions.claimSpot')}
                </button>
              </div>
            )}

            {activeMethod === "geolocation" && (
              <div className="space-y-4">
                <h3 className="text-lg font-headline text-stellar-black uppercase">
                  {t('actions.verifyLocation')}
                </h3>
                <p className="text-stellar-black/60 font-body text-sm">
                  {t('actions.verifyLocationDesc')}
                </p>
                <button
                  onClick={handleGeolocation}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 px-8 shadow-md transition-all font-body disabled:opacity-50"
                >
                  {isProcessing ? <><Loader2 size={16} className="animate-spin" /> {t('actions.verifying')}</> : t('actions.verifyBtn')}
                </button>
              </div>
            )}

            {activeMethod === "nfc" && (
              <div className="space-y-4">
                <h3 className="text-lg font-headline text-stellar-black uppercase">
                  {t('actions.nfcAction')}
                </h3>
                <p className="text-stellar-black/60 font-body text-sm">
                  {t('actions.nfcActionDesc')}
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
