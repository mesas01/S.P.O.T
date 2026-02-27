import React, { useEffect } from "react";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TldrCard from "../components/layout/TldrCard";
import ConnectAccount from "../components/ConnectAccount";
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

const Home: React.FC = () => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { t } = useTranslation('home');

  // ─── Static data ────────────────────────────────────────────────────────────

  const features = [
    {
      icon: QrCode,
      title: t('features.multipleMethods'),
      description: t('features.multipleMethodsDesc'),
      color: "text-stellar-gold",
      border: "border-stellar-gold/20",
      bg: "bg-stellar-gold/5",
    },
    {
      icon: Link2,
      title: t('features.blockchain'),
      description: t('features.blockchainDesc'),
      color: "text-stellar-teal",
      border: "border-stellar-teal/20",
      bg: "bg-stellar-teal/5",
    },
    {
      icon: Palette,
      title: t('features.customizable'),
      description: t('features.customizableDesc'),
      color: "text-stellar-lilac",
      border: "border-stellar-lilac/20",
      bg: "bg-stellar-lilac/5",
    },
    {
      icon: KeyRound,
      title: t('features.selfService'),
      description: t('features.selfServiceDesc'),
      color: "text-stellar-gold",
      border: "border-stellar-gold/20",
      bg: "bg-stellar-gold/5",
    },
    {
      icon: MapPin,
      title: t('features.geolocation'),
      description: t('features.geolocationDesc'),
      color: "text-stellar-teal",
      border: "border-stellar-teal/20",
      bg: "bg-stellar-teal/5",
    },
    {
      icon: Nfc,
      title: t('features.sorobanIntegrations'),
      description: t('features.sorobanIntegrationsDesc'),
      color: "text-stellar-lilac",
      border: "border-stellar-lilac/20",
      bg: "bg-stellar-lilac/5",
    },
  ];

  const steps = [
    {
      icon: Wallet,
      step: "01",
      title: t('howItWorks.step1Title'),
      description: t('howItWorks.step1Desc'),
      color: "text-stellar-gold",
      bg: "bg-stellar-gold/10",
      border: "border-stellar-gold/30",
    },
    {
      icon: CalendarPlus,
      step: "02",
      title: t('howItWorks.step2Title'),
      description: t('howItWorks.step2Desc'),
      color: "text-stellar-lilac",
      bg: "bg-stellar-lilac/10",
      border: "border-stellar-lilac/30",
    },
    {
      icon: QrCode,
      step: "03",
      title: t('howItWorks.step3Title'),
      description: t('howItWorks.step3Desc'),
      color: "text-stellar-teal",
      bg: "bg-stellar-teal/10",
      border: "border-stellar-teal/30",
    },
    {
      icon: Award,
      step: "04",
      title: t('howItWorks.step4Title'),
      description: t('howItWorks.step4Desc'),
      color: "text-stellar-gold",
      bg: "bg-stellar-gold/10",
      border: "border-stellar-gold/30",
    },
  ];

  const { ref: featuresRef, isVisible: featuresVisible } = useScrollReveal();
  const { ref: audiencesRef, isVisible: audiencesVisible } = useScrollReveal();
  const { ref: howItWorksRef, isVisible: howItWorksVisible } =
    useScrollReveal();
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollReveal();

  useEffect(() => {
    if (address) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [address]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-stellar-white min-h-screen overflow-hidden">
      {/* Background decorative glow elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-stellar-gold/10 blur-[120px] animate-pulse-glow" />
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
                    {t('eyebrow')}
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
                    {t('heroDescription1')}
                  </span>
                </p>
                <p className="text-base md:text-lg text-stellar-black/60 max-w-xl mb-10 leading-relaxed font-body">
                  {t('heroDescription2')}
                </p>

                {/* Wallet + CTAs */}
                <div className="flex flex-col gap-4 items-start">
                  <ConnectAccount />
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      onClick={() => navigate("/mint")}
                      className="inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-8 py-3 shadow-lg hover:shadow-xl transition-all text-base font-body"
                    >
                      {t('claimSpot')} <ArrowRight size={18} />
                    </button>
                    <button
                      onClick={() => navigate("/create-event")}
                      className="inline-flex items-center justify-center gap-2 border-2 border-stellar-lilac/40 text-stellar-black hover:bg-stellar-lilac/10 font-semibold rounded-full px-8 py-3 transition-all text-base font-body"
                    >
                      {t('createEvent')}
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
                    alt={t('heroImgAlt')}
                    className="rounded-2xl shadow-2xl shadow-stellar-gold/10 w-full"
                  />

                  {/* Floating stat card 1 - Total SPOTs */}
                  <div className="absolute -top-4 -left-8 bg-stellar-white/90 backdrop-blur-md border border-stellar-black/10 rounded-xl px-4 py-3 animate-float shadow-lg">
                    <p className="text-xs text-stellar-black/60 font-body uppercase tracking-wide">
                      {t('totalSpots')}
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
                      {t('activeEvents')}
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
                      {t('network')}
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
                  {t('features.eyebrow')}
                </span>
                <h2 className="text-3xl md:text-5xl font-headline text-stellar-black mb-4 uppercase">
                  {t('features.title')}
                </h2>
                <p className="text-stellar-black/60 text-lg max-w-2xl mx-auto font-body">
                  {t('features.subtitle')}
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
                  {t('audiences.eyebrow')}
                </span>
                <h2 className="text-3xl md:text-5xl font-headline text-stellar-black mb-4 uppercase">
                  {t('audiences.title')}
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
                    {t('audiences.organizers')}
                  </h3>
                  <p className="text-stellar-black/60 mb-6 leading-relaxed font-body">
                    {t('audiences.organizersDesc')}
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-gold shrink-0" />
                      <span className="text-sm text-stellar-black/70 font-body">
                        {t('audiences.organizersBullet1')}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-gold shrink-0" />
                      <span className="text-sm text-stellar-black/70 font-body">
                        {t('audiences.organizersBullet2')}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-gold shrink-0" />
                      <span className="text-sm text-stellar-black/70 font-body">
                        {t('audiences.organizersBullet3')}
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
                    {t('audiences.sponsors')}
                  </h3>
                  <p className="text-stellar-black/60 mb-6 leading-relaxed font-body">
                    {t('audiences.sponsorsDesc')}
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-lilac shrink-0" />
                      <span className="text-sm text-stellar-black/70 font-body">
                        {t('audiences.sponsorsBullet1')}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-lilac shrink-0" />
                      <span className="text-sm text-stellar-black/70 font-body">
                        {t('audiences.sponsorsBullet2')}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-stellar-lilac shrink-0" />
                      <span className="text-sm text-stellar-black/70 font-body">
                        {t('audiences.sponsorsBullet3')}
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
                  {t('howItWorks.eyebrow')}
                </span>
                <h2 className="text-3xl md:text-5xl font-headline text-stellar-black mb-4 uppercase">
                  {t('howItWorks.title')}
                </h2>
                <p className="text-stellar-black/60 text-lg max-w-2xl mx-auto font-body">
                  {t('howItWorks.subtitle')}
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
                    {t('cta.eyebrow')}
                  </span>
                  <h2 className="text-3xl md:text-5xl font-headline text-stellar-black mb-6 uppercase">
                    {t('cta.title')}
                  </h2>
                  <p className="text-lg text-stellar-black/60 max-w-2xl mx-auto mb-10 leading-relaxed font-body">
                    {t('cta.subtitle')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => navigate("/mint")}
                      className="inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-10 py-3 shadow-lg hover:shadow-xl transition-all text-base font-body"
                    >
                      {t('claimSpot')} <ArrowRight size={18} />
                    </button>
                    <button
                      onClick={() => navigate("/create-event")}
                      className="inline-flex items-center justify-center gap-2 border-2 border-stellar-lilac/40 text-stellar-black hover:bg-stellar-lilac/10 font-semibold rounded-full px-10 py-3 transition-all text-base font-body"
                    >
                      {t('createEvent')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Quick link to SPOTs */}
          <div className="mx-auto max-w-5xl px-6 pb-12">
            <div className="relative rounded-3xl overflow-hidden border border-stellar-gold/20 bg-stellar-gold/5 p-8 md:p-10 text-center">
              <p className="text-sm font-body uppercase tracking-widest text-stellar-gold mb-3">
                {t('collection.eyebrow')}
              </p>
              <h3 className="text-2xl md:text-3xl font-headline text-stellar-black mb-4 uppercase">
                {t('collection.title')}
              </h3>
              <p className="text-stellar-black/60 font-body mb-6">
                {t('collection.subtitle')}
              </p>
              <button
                onClick={() => navigate("/spots")}
                className="inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-10 py-3 shadow-lg hover:shadow-xl transition-all text-base font-body"
              >
                {t('collection.goToSpots')}
              </button>
            </div>
          </div>
        </>

        <div className="mx-auto max-w-5xl px-6 pb-24">
          <TldrCard
            label=""
            summary={t('tldr.summary')}
            bullets={[
              {
                label: t('tldr.bullet1Label'),
                detail: t('tldr.bullet1Detail'),
              },
              {
                label: t('tldr.bullet2Label'),
                detail: t('tldr.bullet2Detail'),
              },
              {
                label: t('tldr.bullet3Label'),
                detail: t('tldr.bullet3Detail'),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
