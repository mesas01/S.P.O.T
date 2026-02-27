import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  fetchTierLimits,
  fetchCreatorProfile,
  type EventTier,
  type TierLimits,
} from "../util/backend";
import { useWallet } from "../hooks/useWallet";
import TldrCard from "../components/layout/TldrCard";
import { Check, Crown, Sparkles, Star, Loader2 } from "lucide-react";

const tierStyleConfig: Record<
  EventTier,
  {
    Icon: typeof Star;
    accentColor: string;
    badgeBg: string;
    borderColor: string;
    ctaStyle: string;
  }
> = {
  FREE: {
    Icon: Star,
    accentColor: "text-stellar-teal",
    badgeBg: "bg-stellar-teal/15 text-stellar-teal",
    borderColor: "border-stellar-teal/20",
    ctaStyle:
      "bg-stellar-teal/10 text-stellar-teal hover:bg-stellar-teal/20 border border-stellar-teal/30",
  },
  BASIC: {
    Icon: Crown,
    accentColor: "text-stellar-lilac",
    badgeBg: "bg-stellar-lilac/15 text-stellar-lilac",
    borderColor: "border-stellar-lilac/30",
    ctaStyle:
      "bg-stellar-lilac/10 text-stellar-lilac hover:bg-stellar-lilac/20 border border-stellar-lilac/30",
  },
  PREMIUM: {
    Icon: Sparkles,
    accentColor: "text-stellar-gold",
    badgeBg: "bg-stellar-gold/15 text-stellar-black",
    borderColor: "border-stellar-gold/30",
    ctaStyle:
      "bg-stellar-gold/10 text-stellar-black hover:bg-stellar-gold/20 border border-stellar-gold/30",
  },
};

function TierCard({
  tier,
  limits,
  isCurrent,
}: {
  tier: EventTier;
  limits: TierLimits;
  isCurrent: boolean;
}) {
  const { t } = useTranslation("pricing");
  const config = tierStyleConfig[tier];
  const { Icon } = config;

  const methodLabels: Record<string, string> = {
    code: t("methodLabels.code"),
    qr: t("methodLabels.qr"),
    link: t("methodLabels.link"),
  };

  function formatMethods(methods: string[]): string[] {
    return methods.map((m) => methodLabels[m] || m);
  }

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
          {t("yourPlan")}
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
            {t(`tierLabels.${tier}`)}
          </h3>
          <p className={`text-sm font-semibold font-body ${config.accentColor}`}>
            {t(`tierConfig.${tier}.price`)}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-stellar-black/60 font-body mb-6">
        {t(`tierConfig.${tier}.description`)}
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
            {t("spotsPerEvent")}
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Check
            size={16}
            className={`mt-0.5 flex-shrink-0 ${config.accentColor}`}
          />
          <span className="text-sm font-body text-stellar-black">
            <span className="font-semibold">{limits.maxActiveEvents}</span>{" "}
            {t("activeEvents")}
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Check
            size={16}
            className={`mt-0.5 flex-shrink-0 ${config.accentColor}`}
          />
          <span className="text-sm font-body text-stellar-black">
            {t("distributionBy")}{" "}
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
            {t("verifiableNFTs")}
          </span>
        </li>
      </ul>

      {/* CTA */}
      {tier === "FREE" ? (
        <Link
          to="/create-event"
          className={`no-underline block text-center py-2.5 px-4 rounded-xl text-sm font-semibold font-body transition-colors ${config.ctaStyle}`}
        >
          {t(`tierConfig.${tier}.ctaLabel`)}
        </Link>
      ) : (
        <button
          disabled
          className="py-2.5 px-4 rounded-xl text-sm font-semibold font-body bg-stellar-black/5 text-stellar-black/40 cursor-not-allowed"
        >
          {t(`tierConfig.${tier}.ctaLabel`)}
        </button>
      )}
    </div>
  );
}

export default function Pricing() {
  const { t } = useTranslation("pricing");
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
          {t("title")}
        </h1>
        <p className="text-base text-stellar-black/60 font-body max-w-xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      {/* TL;DR */}
      <TldrCard
        title={t("tldr.title")}
        summary={t("tldr.summary")}
        bullets={[
          {
            label: t("tldr.bullet1Label"),
            detail: t("tldr.bullet1Detail"),
          },
          {
            label: t("tldr.bullet2Label"),
            detail: t("tldr.bullet2Detail"),
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
            {t("loadError")}
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
        {t("footerNote")}
      </p>
    </section>
  );
}
