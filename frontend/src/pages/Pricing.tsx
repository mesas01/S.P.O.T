import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  fetchTierLimits,
  fetchCreatorProfile,
  type EventTier,
  type TierLimits,
} from "../util/backend";
import { useWallet } from "../hooks/useWallet";
import TldrCard from "../components/layout/TldrCard";
import { Check, Crown, Sparkles, Star, Loader2 } from "lucide-react";

const tierLabels: Record<EventTier, string> = {
  FREE: "Gratis",
  BASIC: "Basico",
  PREMIUM: "Premium",
};

const tierConfig: Record<
  EventTier,
  {
    price: string;
    description: string;
    Icon: typeof Star;
    accentColor: string;
    badgeBg: string;
    borderColor: string;
    ctaLabel: string;
    ctaStyle: string;
  }
> = {
  FREE: {
    price: "Gratis",
    description: "Perfecto para probar la plataforma y eventos pequenos.",
    Icon: Star,
    accentColor: "text-stellar-teal",
    badgeBg: "bg-stellar-teal/15 text-stellar-teal",
    borderColor: "border-stellar-teal/20",
    ctaLabel: "Empezar Gratis",
    ctaStyle:
      "bg-stellar-teal/10 text-stellar-teal hover:bg-stellar-teal/20 border border-stellar-teal/30",
  },
  BASIC: {
    price: "Proximamente",
    description: "Para creadores que necesitan mas capacidad y flexibilidad.",
    Icon: Crown,
    accentColor: "text-stellar-lilac",
    badgeBg: "bg-stellar-lilac/15 text-stellar-lilac",
    borderColor: "border-stellar-lilac/30",
    ctaLabel: "Proximamente",
    ctaStyle:
      "bg-stellar-lilac/10 text-stellar-lilac hover:bg-stellar-lilac/20 border border-stellar-lilac/30",
  },
  PREMIUM: {
    price: "Proximamente",
    description:
      "Para organizaciones y eventos a gran escala con todas las funciones.",
    Icon: Sparkles,
    accentColor: "text-stellar-gold",
    badgeBg: "bg-stellar-gold/15 text-stellar-black",
    borderColor: "border-stellar-gold/30",
    ctaLabel: "Proximamente",
    ctaStyle:
      "bg-stellar-gold/10 text-stellar-black hover:bg-stellar-gold/20 border border-stellar-gold/30",
  },
};

const methodLabels: Record<string, string> = {
  code: "Codigo",
  qr: "QR",
  link: "Link",
};

function formatMethods(methods: string[]): string[] {
  return methods.map((m) => methodLabels[m] || m);
}

function TierCard({
  tier,
  limits,
  isCurrent,
}: {
  tier: EventTier;
  limits: TierLimits;
  isCurrent: boolean;
}) {
  const config = tierConfig[tier];
  const { Icon } = config;

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-200 ${
        isCurrent
          ? `${config.borderColor} ring-2 ring-offset-2 ring-stellar-lilac/30 bg-white shadow-lg`
          : `border-stellar-black/10 bg-white hover:shadow-md hover:border-stellar-black/20`
      }`}
    >
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold font-body uppercase tracking-widest bg-stellar-lilac text-white">
          Tu Plan
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.badgeBg}`}
        >
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-lg font-headline text-stellar-black">
            {tierLabels[tier]}
          </h3>
          <p className={`text-sm font-semibold font-body ${config.accentColor}`}>
            {config.price}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-stellar-black/60 font-body mb-6">
        {config.description}
      </p>

      {/* Features */}
      <ul className="space-y-3 mb-6 flex-1">
        <li className="flex items-start gap-2.5">
          <Check
            size={16}
            className={`mt-0.5 flex-shrink-0 ${config.accentColor}`}
          />
          <span className="text-sm font-body text-stellar-black">
            <span className="font-semibold">
              {limits.maxSpotsPerEvent.toLocaleString()}
            </span>{" "}
            SPOTs por evento
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Check
            size={16}
            className={`mt-0.5 flex-shrink-0 ${config.accentColor}`}
          />
          <span className="text-sm font-body text-stellar-black">
            <span className="font-semibold">{limits.maxActiveEvents}</span>{" "}
            eventos activos
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Check
            size={16}
            className={`mt-0.5 flex-shrink-0 ${config.accentColor}`}
          />
          <span className="text-sm font-body text-stellar-black">
            Distribucion por{" "}
            <span className="font-semibold">
              {formatMethods(limits.allowedMethods).join(", ")}
            </span>
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Check
            size={16}
            className={`mt-0.5 flex-shrink-0 ${config.accentColor}`}
          />
          <span className="text-sm font-body text-stellar-black">
            NFTs verificables en Stellar
          </span>
        </li>
      </ul>

      {/* CTA */}
      {tier === "FREE" ? (
        <Link
          to="/create-event"
          className={`no-underline block text-center py-2.5 px-4 rounded-xl text-sm font-semibold font-body transition-colors ${config.ctaStyle}`}
        >
          {config.ctaLabel}
        </Link>
      ) : (
        <button
          disabled
          className="py-2.5 px-4 rounded-xl text-sm font-semibold font-body bg-stellar-black/5 text-stellar-black/40 cursor-not-allowed"
        >
          {config.ctaLabel}
        </button>
      )}
    </div>
  );
}

export default function Pricing() {
  const { address } = useWallet();

  const {
    data: tierLimits,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tierLimits"],
    queryFn: fetchTierLimits,
    staleTime: 60_000,
  });

  const { data: creatorProfile } = useQuery({
    queryKey: ["creatorProfile", address],
    queryFn: () => fetchCreatorProfile(address!),
    enabled: !!address,
    staleTime: 30_000,
  });

  const tiers: EventTier[] = ["FREE", "BASIC", "PREMIUM"];

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-headline text-stellar-black mb-3">
          Planes y Precios
        </h1>
        <p className="text-base text-stellar-black/60 font-body max-w-xl mx-auto">
          Elige el plan que mejor se adapte a tus necesidades. Todos los planes
          incluyen NFTs verificables en la red Stellar.
        </p>
      </div>

      {/* TL;DR */}
      <TldrCard
        title="Resumen Rapido"
        summary="Todos los planes te permiten crear eventos y distribuir SPOTs (NFTs de asistencia) en la red Stellar."
        bullets={[
          {
            label: "Gratis para empezar",
            detail:
              "Crea eventos con limites generosos sin necesidad de pago.",
          },
          {
            label: "Escala cuando lo necesites",
            detail:
              "Planes de pago con mas capacidad y metodos de distribucion.",
          },
        ]}
        className="mb-12"
      />

      {/* Tier Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2
            size={28}
            className="animate-spin text-stellar-lilac/60"
          />
        </div>
      ) : isError || !tierLimits ? (
        <div className="text-center py-20">
          <p className="text-sm text-stellar-black/50 font-body">
            No se pudieron cargar los planes. Intenta de nuevo mas tarde.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              limits={tierLimits[tier]}
              isCurrent={creatorProfile?.tier === tier}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-xs text-stellar-black/40 font-body mt-10">
        Los planes de pago estaran disponibles proximamente. Los limites pueden
        cambiar.
      </p>
    </section>
  );
}
