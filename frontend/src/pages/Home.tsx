import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import MonthSection from "../components/spot/MonthSection";
import { SpotData } from "../components/spot/SpotCard";
import { groupSpotsByMonth, getTotalSpots } from "../utils/spotGrouping";
import TldrCard from "../components/layout/TldrCard";
import ConnectAccount from "../components/ConnectAccount";
import {
  getClaimedSpots,
  mapEventToClaimedSpot,
  mapStoredSpotToSpotData,
  upsertClaimedSpot,
} from "../utils/claimedSpots";
import { fetchClaimedEventsByClaimer } from "../util/backend";
import { connectWallet } from "../util/wallet";
import {
  QrCode,
  Link2,
  Palette,
  KeyRound,
  MapPin,
  Nfc,
  Wallet,
  CalendarPlus,
  Award,
  Hammer,
  Building2,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";

// ─── Static data ────────────────────────────────────────────────────────────

const features = [
  {
    icon: QrCode,
    title: "Múltiples Métodos",
    description: "Reclama SPOTs con QR, Link, Código, Geolocalización o NFC",
    color: "text-stellar-gold",
    border: "border-stellar-gold/20",
    bg: "bg-stellar-gold/5",
  },
  {
    icon: Link2,
    title: "En la Blockchain",
    description: "Tus SPOTs están guardados permanentemente en la red Stellar",
    color: "text-stellar-teal",
    border: "border-stellar-teal/20",
    bg: "bg-stellar-teal/5",
  },
  {
    icon: Palette,
    title: "Personalizables",
    description: "Crea eventos únicos con imágenes y metadata personalizada",
    color: "text-stellar-lilac",
    border: "border-stellar-lilac/20",
    bg: "bg-stellar-lilac/5",
  },
  {
    icon: KeyRound,
    title: "Self-Service",
    description:
      "Herramientas para crear, editar y pausar eventos sin depender de desarrolladores",
    color: "text-stellar-gold",
    border: "border-stellar-gold/20",
    bg: "bg-stellar-gold/5",
  },
  {
    icon: MapPin,
    title: "Geolocalización",
    description:
      "Verifica asistencia real con validación por ubicación y proximidad al evento",
    color: "text-stellar-teal",
    border: "border-stellar-teal/20",
    bg: "bg-stellar-teal/5",
  },
  {
    icon: Nfc,
    title: "Integraciones Soroban",
    description:
      "Automatiza claims con contratos inteligentes listos para producción",
    color: "text-stellar-lilac",
    border: "border-stellar-lilac/20",
    bg: "bg-stellar-lilac/5",
  },
];

const steps = [
  {
    icon: Wallet,
    step: "01",
    title: "Conecta tu Wallet",
    description:
      "Conecta tu wallet de Stellar para acceder a la plataforma. Compatible con las principales wallets del ecosistema.",
    color: "text-stellar-gold",
    bg: "bg-stellar-gold/10",
    border: "border-stellar-gold/30",
  },
  {
    icon: CalendarPlus,
    step: "02",
    title: "Crea tu Evento",
    description:
      "Sube tu imagen, define cupos y programa fechas de reclamo para cada evento sin depender de desarrolladores.",
    color: "text-stellar-lilac",
    bg: "bg-stellar-lilac/10",
    border: "border-stellar-lilac/30",
  },
  {
    icon: QrCode,
    step: "03",
    title: "Distribuye SPOTs",
    description:
      "QR, link, código, geofence o NFC listos para usar en campo, con botones visibles que empujan la conversión.",
    color: "text-stellar-teal",
    bg: "bg-stellar-teal/10",
    border: "border-stellar-teal/30",
  },
  {
    icon: Award,
    step: "04",
    title: "Demuestra Valor",
    description:
      "Cada comprobante vive en Stellar: útil para reportes, patrocinios y transparencia con tu comunidad.",
    color: "text-stellar-gold",
    bg: "bg-stellar-gold/10",
    border: "border-stellar-gold/30",
  },
];

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
  {
    id: 4,
    name: "Summer Fridays",
    date: "2025-10-05",
    image: "/images/events/summer_fridays.jpg",
    color: "from-stellar-gold/30 to-stellar-teal/50",
  },
  {
    id: 5,
    name: "Autumn Fridays",
    date: "2025-09-28",
    image: "/images/events/autumfridays.jpg",
    color: "from-stellar-lilac/30 to-stellar-gold/50",
    isPlaceholder: true,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const Home: React.FC = () => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const isConnected = !!address;
  const [claimedSpots, setClaimedSpots] = useState<SpotData[]>([]);

  // Scroll reveal refs
  const { ref: featuresRef, isVisible: featuresVisible } = useScrollReveal();
  const { ref: audiencesRef, isVisible: audiencesVisible } = useScrollReveal();
  const { ref: howItWorksRef, isVisible: howItWorksVisible } =
    useScrollReveal();
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollReveal();
  const { ref: collectionRef, isVisible: collectionVisible } =
    useScrollReveal();

  // Scroll al inicio cuando se conecta la wallet
  useEffect(() => {
    if (address) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [address]);

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
  const hasDisplaySpots = spotsToDisplay.length > 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-stellar-white min-h-screen overflow-hidden">
      {/* Background decorative glow elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-stellar-gold/10 blur-[120px] animate-pulse-glow"
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-stellar-lilac/10 blur-[100px] animate-pulse-glow"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-stellar-teal/5 blur-[80px] animate-pulse-glow"
          style={{ animationDelay: "0.8s" }}
        />
      </div>

      <div className="relative z-10">
        {/* ═══════════════════════════════════════════
            HERO SECTION
            ═══════════════════════════════════════════ */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-8 pb-16">
          <div className="mx-auto max-w-7xl px-6 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* Left: Content */}
              <div className="animate-fade-up">
                {/* Eyebrow badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-stellar-gold/30 bg-stellar-gold/10 px-4 py-1.5 mb-8">
                  <Zap size={14} className="text-stellar-gold" />
                  <span className="text-xs font-body uppercase tracking-wider text-stellar-gold">
                    Proof of Attendance en Stellar
                  </span>
                </div>

                <h1 className="text-5xl md:text-6xl lg:text-7xl font-headline tracking-tight text-stellar-black mb-6 leading-[1.05]">
                  SPOT
                  <span className="block text-stellar-gold">Stellar Proof</span>
                  <span className="block text-stellar-black/50 text-3xl md:text-4xl font-body font-normal mt-2 normal-case">
                    of Togetherness
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-stellar-black/70 max-w-xl mb-4 leading-relaxed font-body">
                  <span className="text-stellar-black font-semibold">
                    Sabemos a quién hablamos: bancos, policymakers y builders.
                  </span>
                </p>
                <p className="text-base md:text-lg text-stellar-black/60 max-w-xl mb-10 leading-relaxed font-body">
                  SPOT es tu comprobante coleccionable en Stellar: diseña la
                  pieza, define la ventana de reclamo y entrega recuerdos
                  verificables que demuestran asistencia ante sponsors,
                  instituciones y comunidades.
                </p>

                {/* Wallet + CTAs */}
                <div className="flex flex-col gap-4 items-start">
                  <ConnectAccount />
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      onClick={() => navigate("/mint")}
                      className="inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-8 py-3 shadow-lg hover:shadow-xl transition-all text-base font-body"
                    >
                      Reclamar SPOT <ArrowRight size={18} />
                    </button>
                    <button
                      onClick={() => navigate("/create-event")}
                      className="inline-flex items-center justify-center gap-2 border-2 border-stellar-lilac/40 text-stellar-black hover:bg-stellar-lilac/10 font-semibold rounded-full px-8 py-3 transition-all text-base font-body"
                    >
                      Crear Evento
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Hero image with floating stat cards */}
              <div
                className="relative animate-fade-up hidden lg:block"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="relative">
                  <img
                    src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/cdd8e585244fe22db899e5c2e463bde2793355e2-4200x3508.png?rect=0,356,4200,2797&w=506&h=337&auto=format&dpr=2"
                    alt="Colección de badges SPOT"
                    className="rounded-2xl shadow-2xl shadow-stellar-gold/10 w-full"
                  />

                  {/* Floating stat card 1 - Total SPOTs */}
                  <div className="absolute -top-4 -left-8 bg-stellar-white/90 backdrop-blur-md border border-stellar-black/10 rounded-xl px-4 py-3 animate-float shadow-lg">
                    <p className="text-xs text-stellar-black/60 font-body uppercase tracking-wide">
                      Total SPOTs
                    </p>
                    <p className="text-2xl font-headline text-stellar-gold">
                      2,847
                    </p>
                  </div>

                  {/* Floating stat card 2 - Eventos activos */}
                  <div
                    className="absolute -bottom-4 -right-8 bg-stellar-white/90 backdrop-blur-md border border-stellar-black/10 rounded-xl px-4 py-3 animate-float shadow-lg"
                    style={{ animationDelay: "2s" }}
                  >
                    <p className="text-xs text-stellar-black/60 font-body uppercase tracking-wide">
                      Eventos activos
                    </p>
                    <p className="text-2xl font-headline text-stellar-lilac">
                      42
                    </p>
                  </div>

                  {/* Floating stat card 3 - Red */}
                  <div
                    className="absolute top-1/2 -right-6 bg-stellar-white/90 backdrop-blur-md border border-stellar-black/10 rounded-xl px-4 py-3 animate-float shadow-lg"
                    style={{ animationDelay: "3.5s" }}
                  >
                    <p className="text-xs text-stellar-black/60 font-body uppercase tracking-wide">
                      Red
                    </p>
                    <p className="text-sm font-headline text-stellar-teal">
                      Stellar Testnet
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            NOT CONNECTED — INFO SECTIONS
            ═══════════════════════════════════════════ */}
        {!isConnected && (
          <>
            {/* ── Features ─────────────────────────── */}
            <section
              id="features"
              ref={featuresRef as React.RefObject<HTMLElement>}
              className="py-24 md:py-32 relative"
            >
              {/* Section separator */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stellar-black/10 to-transparent" />

              <div className="mx-auto max-w-7xl px-6">
                <div
                  className={`text-center mb-16 ${featuresVisible ? "animate-fade-up" : "opacity-0"}`}
                >
                  <span className="text-xs font-body uppercase tracking-widest text-stellar-gold mb-4 block">
                    Funciones
                  </span>
                  <h2 className="text-3xl md:text-5xl font-headline text-stellar-black mb-4 uppercase">
                    Todo lo que necesitas
                  </h2>
                  <p className="text-stellar-black/60 text-lg max-w-2xl mx-auto font-body">
                    Configura certificados coleccionables en minutos, conecta
                    APIs si lo necesitas y maneja registros desde el móvil o el
                    escenario.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {features.map((feature, i) => (
                    <div
                      key={feature.title}
                      className={`group relative rounded-2xl border ${feature.border} ${feature.bg} p-8 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:shadow-stellar-gold/5 ${
                        featuresVisible ? "animate-fade-up" : "opacity-0"
                      }`}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div
                        className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.bg} border ${feature.border} mb-5`}
                      >
                        <feature.icon size={24} className={feature.color} />
                      </div>
                      <h3 className="text-xl font-headline text-stellar-black mb-3 uppercase">
                        {feature.title}
                      </h3>
                      <p className="text-stellar-black/60 leading-relaxed font-body">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Audiences ────────────────────────── */}
            <section
              id="audiences"
              ref={audiencesRef as React.RefObject<HTMLElement>}
              className="py-24 md:py-32 relative"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stellar-black/10 to-transparent" />

              <div className="mx-auto max-w-7xl px-6">
                <div
                  className={`text-center mb-16 ${audiencesVisible ? "animate-fade-up" : "opacity-0"}`}
                >
                  <span className="text-xs font-body uppercase tracking-widest text-stellar-lilac mb-4 block">
                    SPOT para cada equipo
                  </span>
                  <h2 className="text-3xl md:text-5xl font-headline text-stellar-black mb-4 uppercase">
                    Dos audiencias, un producto
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Organizadores & builders */}
                  <div
                    className={`relative rounded-2xl border border-stellar-gold/20 bg-stellar-gold/5 p-8 md:p-10 transition-all duration-500 hover:border-stellar-gold/40 ${
                      audiencesVisible ? "animate-slide-in-left" : "opacity-0"
                    }`}
                  >
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-stellar-gold/10 border border-stellar-gold/20 mb-6">
                      <Hammer size={28} className="text-stellar-gold" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-headline text-stellar-black mb-3 uppercase">
                      Organizadores & builders
                    </h3>
                    <p className="text-stellar-black/60 mb-6 leading-relaxed font-body">
                      Configura certificados coleccionables en minutos, conecta
                      APIs si lo necesitas y maneja registros desde el móvil o
                      el escenario.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-gold shrink-0" />
                        <span className="text-sm text-stellar-black/70 font-body">
                          Herramientas self-service para crear, editar y pausar
                          eventos.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-gold shrink-0" />
                        <span className="text-sm text-stellar-black/70 font-body">
                          Integraciones Soroban listas para automatizar claims.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-gold shrink-0" />
                        <span className="text-sm text-stellar-black/70 font-body">
                          Debugger disponible para equipos técnicos.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Sponsors & instituciones */}
                  <div
                    className={`relative rounded-2xl border border-stellar-lilac/20 bg-stellar-lilac/5 p-8 md:p-10 transition-all duration-500 hover:border-stellar-lilac/40 ${
                      audiencesVisible ? "animate-slide-in-right" : "opacity-0"
                    }`}
                  >
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-stellar-lilac/10 border border-stellar-lilac/20 mb-6">
                      <Building2 size={28} className="text-stellar-lilac" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-headline text-stellar-black mb-3 uppercase">
                      Sponsors & instituciones
                    </h3>
                    <p className="text-stellar-black/60 mb-6 leading-relaxed font-body">
                      Obtén reportes claros sobre asistencia verificada y
                      comparte pruebas on-chain con aliados o reguladores.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-lilac shrink-0" />
                        <span className="text-sm text-stellar-black/70 font-body">
                          Métricas visibles para patrocinadores y equipo
                          comercial.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-lilac shrink-0" />
                        <span className="text-sm text-stellar-black/70 font-body">
                          Evidencia inmutable hospedada en la red Stellar.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-lilac shrink-0" />
                        <span className="text-sm text-stellar-black/70 font-body">
                          Copys concisos para informes y aprobaciones rápidas.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* ── How It Works ─────────────────────── */}
            <section
              id="how-it-works"
              ref={howItWorksRef as React.RefObject<HTMLElement>}
              className="py-24 md:py-32 relative"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stellar-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stellar-black/10 to-transparent" />

              <div className="relative mx-auto max-w-7xl px-6">
                <div
                  className={`text-center mb-20 ${howItWorksVisible ? "animate-fade-up" : "opacity-0"}`}
                >
                  <span className="text-xs font-body uppercase tracking-widest text-stellar-teal mb-4 block">
                    Proceso
                  </span>
                  <h2 className="text-3xl md:text-5xl font-headline text-stellar-black mb-4 uppercase">
                    Cómo funciona
                  </h2>
                  <p className="text-stellar-black/60 text-lg max-w-2xl mx-auto font-body">
                    SPOT convierte tus eventos en coleccionables digitales
                    verificados. Configura arte, cupos y métricas desde un mismo
                    panel.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                  {/* Connecting line (desktop only) */}
                  <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-stellar-gold/30 via-stellar-lilac/30 to-stellar-teal/30" />

                  {steps.map((step, i) => (
                    <div
                      key={step.step}
                      className={`relative text-center ${howItWorksVisible ? "animate-fade-up" : "opacity-0"}`}
                      style={{ animationDelay: `${i * 0.15}s` }}
                    >
                      <div className="relative inline-flex flex-col items-center mb-6">
                        <div
                          className={`w-16 h-16 rounded-2xl ${step.bg} border ${step.border} flex items-center justify-center relative z-10`}
                        >
                          <step.icon size={28} className={step.color} />
                        </div>
                        <span
                          className={`mt-3 text-xs font-body font-bold ${step.color} tracking-widest`}
                        >
                          {step.step}
                        </span>
                      </div>
                      <h3 className="text-lg font-headline text-stellar-black mb-3 uppercase">
                        {step.title}
                      </h3>
                      <p className="text-sm text-stellar-black/60 leading-relaxed font-body">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── CTA Section ──────────────────────── */}
            <section
              ref={ctaRef as React.RefObject<HTMLElement>}
              className="py-24 md:py-32 relative"
            >
              <div className="mx-auto max-w-7xl px-6">
                <div
                  className={`relative rounded-3xl overflow-hidden ${ctaVisible ? "animate-fade-up" : "opacity-0"}`}
                >
                  {/* Gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-stellar-gold/15 via-stellar-lilac/10 to-stellar-teal/10" />
                  <div className="absolute inset-0 bg-stellar-white/80 backdrop-blur-sm" />
                  {/* Gold glow */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-stellar-gold/20 blur-[100px] rounded-full" />

                  <div className="relative px-8 py-16 md:px-16 md:py-24 text-center">
                    <span className="text-xs font-body uppercase tracking-widest text-stellar-gold mb-6 block">
                      Empieza ahora
                    </span>
                    <h2 className="text-3xl md:text-5xl font-headline text-stellar-black mb-6 uppercase">
                      Crea experiencias verificables
                    </h2>
                    <p className="text-lg text-stellar-black/60 max-w-2xl mx-auto mb-10 leading-relaxed font-body">
                      Sube tu imagen, define cupos y programa fechas de reclamo
                      para cada evento sin depender de desarrolladores. Cada
                      comprobante vive en Stellar.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => navigate("/mint")}
                        className="inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-10 py-3 shadow-lg hover:shadow-xl transition-all text-base font-body"
                      >
                        Reclamar SPOT <ArrowRight size={18} />
                      </button>
                      <button
                        onClick={() => navigate("/create-event")}
                        className="inline-flex items-center justify-center gap-2 border-2 border-stellar-lilac/40 text-stellar-black hover:bg-stellar-lilac/10 font-semibold rounded-full px-10 py-3 transition-all text-base font-body"
                      >
                        Crear Evento
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════════
            CONNECTED — SPOT COLLECTION
            ═══════════════════════════════════════════ */}
        {isConnected && hasDisplaySpots && (
          <div
            ref={collectionRef as React.RefObject<HTMLDivElement>}
            className="mx-auto max-w-7xl px-6 py-12"
          >
            <div
              className={`mb-10 ${collectionVisible ? "animate-fade-up" : "opacity-0"}`}
            >
              <h2 className="text-3xl md:text-4xl font-headline text-stellar-black mb-3 uppercase">
                Tu <span className="text-stellar-gold">Colección</span>
              </h2>
              <p className="text-stellar-black/60 italic text-lg font-subhead">
                {totalSpots} {totalSpots === 1 ? "SPOT" : "SPOTs"} en tu
                colección
              </p>
            </div>

            {/* Stats */}
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
                    Año actual
                  </div>
                </div>
              </div>
            </div>

            {/* SPOTs grouped by month */}
            <div>
              {Object.keys(groupedSpots).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-stellar-black/50 font-body">
                    No hay SPOTs para mostrar
                  </p>
                </div>
              ) : (
                Object.values(groupedSpots).map(
                  (group: {
                    year: number;
                    month: string;
                    spots: SpotData[];
                  }) => (
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

        {/* ── Empty state: connected but no SPOTs ── */}
        {isConnected && totalSpots === 0 && (
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="relative rounded-3xl overflow-hidden border border-stellar-lilac/20 bg-stellar-lilac/5 p-12 text-center">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-stellar-gold/10 rounded-full blur-3xl" />
              </div>
              <div className="relative">
                <div className="mb-6">
                  <img
                    src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/9bed752a12d4ffe6c6118c93f8ca36ad60a573d3-1072x1072.png?rect=0,108,1072,857&w=1224&h=979&auto=format&dpr=2"
                    alt="No SPOTs"
                    className="w-32 h-32 mx-auto object-contain drop-shadow-2xl opacity-50"
                  />
                </div>
                <h2 className="text-3xl font-headline text-stellar-black mb-4 uppercase">
                  Aún no tienes SPOTs
                </h2>
                <p className="text-stellar-black/60 max-w-md mx-auto mb-8 font-body">
                  Asiste a eventos y reclama tus SPOTs para comenzar tu
                  colección.
                </p>
                <Button
                  onClick={() => navigate("/mint")}
                  variant="primary"
                  size="lg"
                  className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-10 py-4 shadow-lg hover:shadow-xl transition-all"
                >
                  Reclamar mi Primer SPOT
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Not connected wallet prompt ─────────── */}
        {!isConnected && (
          <div className="mx-auto max-w-7xl px-6 pb-24">
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
                  Conecta tu wallet de Stellar para ver tu colección de SPOTs y
                  reclamar nuevos.
                </p>
                <button
                  onClick={() => void connectWallet()}
                  className="inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-10 py-4 shadow-lg hover:shadow-xl transition-all font-body"
                >
                  Conectar Wallet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TL;DR Summary ───────────────────────── */}
        <div className="mx-auto max-w-5xl px-6 pb-24">
          <TldrCard
            label=""
            summary="SPOT convierte tus eventos en coleccionables digitales verificados. Configura arte, cupos y métricas desde un mismo panel."
            bullets={[
              {
                label: "Crea experiencias",
                detail:
                  "Sube tu imagen, define cupos y programa fechas de reclamo para cada evento sin depender de desarrolladores.",
              },
              {
                label: "Reclama sin fricción",
                detail:
                  "QR, link, código, geofence o NFC listos para usar en campo, con botones visibles que empujan la conversión.",
              },
              {
                label: "Demuestra valor",
                detail:
                  "Cada comprobante vive en Stellar: útil para reportes, patrocinios y transparencia con tu comunidad.",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
