import React from "react";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import ConnectAccount from "../components/ConnectAccount";
import TldrCard from "../components/layout/TldrCard";
import { fetchCreatorProfile, type EventTier } from "../util/backend";
import { Lock, Copy, Zap, Plus, LogOut, Crown } from "lucide-react";

const Profile: React.FC = () => {
  const { address, balances, disconnect } = useWallet();
  const navigate = useNavigate();
  const { t } = useTranslation('profile');
  const isConnected = !!address;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const xlmBalance = balances?.xlm?.balance || "0";

  const formatBalance = (balance: string): string => {
    if (!balance || balance === "0") return "0";

    const cleanBalance = balance.replace(/,/g, "").trim();

    const decimalIndex = cleanBalance.indexOf(".");
    if (decimalIndex !== -1) {
      const integerPart = cleanBalance.substring(0, decimalIndex);
      const decimalPart = cleanBalance.substring(decimalIndex + 1);
      const preservedDecimals =
        decimalPart.length > 7
          ? decimalPart.substring(0, 7)
          : decimalPart;
      return `${integerPart}.${preservedDecimals}`;
    }

    const numBalance = parseFloat(cleanBalance);
    if (isNaN(numBalance)) return balance;
    return numBalance.toString();
  };

  const formattedBalance = formatBalance(xlmBalance);

  const { data: creatorProfile } = useQuery({
    queryKey: ["creatorProfile", address],
    queryFn: () => fetchCreatorProfile(address!),
    enabled: !!address,
    staleTime: 30000,
  });

  const tierLabels: Record<EventTier, string> = {
    FREE: t('tierLabels.FREE'),
    BASIC: t('tierLabels.BASIC'),
    PREMIUM: t('tierLabels.PREMIUM'),
  };

  const tierColors: Record<EventTier, string> = {
    FREE: "bg-stellar-warm-grey/20 text-stellar-black/70",
    BASIC: "bg-stellar-teal/15 text-stellar-teal",
    PREMIUM: "bg-stellar-gold/20 text-stellar-gold",
  };

  return (
    <div className="py-12 px-6">
      <div className="max-w-5xl 2xl:max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-stellar-lilac/10 border border-stellar-lilac/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-xs font-semibold font-body uppercase tracking-widest text-stellar-lilac">
              {t('badge')}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-headline text-stellar-black mb-3">
            {t('title')}
          </h1>
          <p className="text-stellar-black/60 font-body">
            {t('subtitle')}
          </p>
          <div className="mt-6">
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

        {!isConnected ? (
          <div className="bg-stellar-white rounded-2xl shadow-sm p-8 md:p-12 text-center border border-stellar-lilac/15 max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-stellar-lilac/10 border border-stellar-lilac/20 flex items-center justify-center">
                <Lock size={28} className="text-stellar-lilac" />
              </div>
            </div>
            <h2 className="text-2xl font-headline text-stellar-black mb-3">
              {t('connectTitle')}
            </h2>
            <p className="text-stellar-black/60 font-body max-w-sm mx-auto mb-8">
              {t('connectSubtitle')}
            </p>
            <ConnectAccount />
          </div>
        ) : (
          <div className="space-y-5 max-w-3xl mx-auto">
            {/* Wallet Info */}
            <div className="bg-stellar-white rounded-2xl shadow-sm p-6 md:p-8 border border-stellar-lilac/15">
              <h2 className="text-lg font-headline text-stellar-black mb-6">
                {t('walletInfo')}
              </h2>

              {/* Address */}
              <div className="mb-6">
                <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/40 mb-2">
                  {t('address')}
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-stellar-warm-grey/20 rounded-xl p-3 border border-stellar-lilac/15 min-w-0">
                    <p className="font-mono text-stellar-black break-all font-body text-sm">
                      {address}
                    </p>
                  </div>
                  <button
                    onClick={() => address && copyToClipboard(address)}
                    className="flex-shrink-0 inline-flex items-center gap-2 border border-stellar-black/15 text-stellar-black/60 hover:text-stellar-black hover:border-stellar-black/25 px-4 py-2.5 rounded-xl font-body text-sm font-semibold transition-all"
                  >
                    <Copy size={13} />
                    {t('common:actions.copy')}
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div>
                <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/40 mb-2">
                  {t('balance')}
                </label>
                <div className="bg-gradient-to-br from-stellar-gold/15 to-stellar-lilac/15 rounded-xl p-4 border border-stellar-gold/25">
                  <div className="flex items-center justify-between">
                    <span className="text-stellar-black/70 font-body text-sm font-semibold">
                      XLM
                    </span>
                    <span className="text-stellar-black font-headline text-2xl">
                      {formattedBalance} XLM
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Network */}
            <div className="bg-stellar-white rounded-2xl shadow-sm p-6 md:p-8 border border-stellar-teal/15">
              <h2 className="text-lg font-headline text-stellar-black mb-3">
                {t('network')}
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-stellar-teal" />
                <p className="text-stellar-black font-body text-sm">
                  Stellar Testnet
                </p>
              </div>
            </div>

            {/* Creator Plan */}
            {creatorProfile && (
              <div className="bg-stellar-white rounded-2xl shadow-sm p-6 md:p-8 border border-stellar-lilac/15">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-headline text-stellar-black">
                    {t('creatorPlan')}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-body ${tierColors[creatorProfile.tier]}`}
                  >
                    <Crown size={12} />
                    {tierLabels[creatorProfile.tier]}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-stellar-warm-grey/10 rounded-xl p-4 border border-stellar-black/5">
                    <p className="text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/40 mb-1">
                      {t('spotsPerEvent')}
                    </p>
                    <p className="text-xl font-headline text-stellar-black">
                      {creatorProfile.limits.maxSpotsPerEvent.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-stellar-warm-grey/10 rounded-xl p-4 border border-stellar-black/5">
                    <p className="text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/40 mb-1">
                      {t('activeEvents')}
                    </p>
                    <p className="text-xl font-headline text-stellar-black">
                      {creatorProfile.limits.maxActiveEvents}
                    </p>
                  </div>
                  <div className="bg-stellar-warm-grey/10 rounded-xl p-4 border border-stellar-black/5">
                    <p className="text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/40 mb-1">
                      {t('methods')}
                    </p>
                    <p className="text-sm font-body text-stellar-black capitalize">
                      {creatorProfile.limits.allowedMethods.join(", ")}
                    </p>
                  </div>
                </div>

                {creatorProfile.status && (
                  <div className="mt-4 flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${creatorProfile.status === "APPROVED" ? "bg-stellar-teal" : "bg-red-400"}`}
                    />
                    <p className="text-sm font-body text-stellar-black/60">
                      {creatorProfile.status === "APPROVED"
                        ? t('common:status.approved')
                        : t('common:status.revoked')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="bg-stellar-white rounded-2xl shadow-sm p-6 md:p-8 border border-stellar-lilac/15">
              <h2 className="text-lg font-headline text-stellar-black mb-5">
                {t('actions')}
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/")}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black px-8 py-3.5 rounded-full font-semibold font-body hover:bg-stellar-gold/90 transition-all shadow-md hover:shadow-lg"
                >
                  {t('viewSpots')}
                </button>
                <button
                  onClick={() => navigate("/create-event")}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-lilac/20 text-stellar-black px-8 py-3.5 rounded-full font-semibold font-body hover:bg-stellar-lilac/30 transition-all"
                >
                  <Plus size={15} />
                  {t('createEvent')}
                </button>
                <button
                  onClick={() => navigate("/mint")}
                  className="w-full inline-flex items-center justify-center gap-2 border border-stellar-teal/30 text-stellar-teal px-8 py-3.5 rounded-full font-semibold font-body hover:bg-stellar-teal/10 transition-all"
                >
                  <Zap size={15} />
                  {t('claimSpot')}
                </button>
              </div>
            </div>

            {/* Disconnect */}
            <div className="pt-2">
              <button
                onClick={() => {
                  void disconnect().then(() => navigate("/"));
                }}
                className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-body font-semibold transition-colors px-4 py-2 rounded-lg hover:bg-red-50"
              >
                <LogOut size={14} />
                {t('disconnectWallet')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
