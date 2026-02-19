import React from "react";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import ConnectAccount from "../components/ConnectAccount";
import TldrCard from "../components/layout/TldrCard";
import { Lock, Copy, Zap, Plus, LogOut } from "lucide-react";

const Profile: React.FC = () => {
  const { address, balances, disconnect } = useWallet();
  const navigate = useNavigate();
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

  return (
    <div className="py-12 px-6">
      <div className="max-w-5xl 2xl:max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-stellar-lilac/10 border border-stellar-lilac/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-xs font-semibold font-body uppercase tracking-widest text-stellar-lilac">
              Cuenta
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-headline text-stellar-black mb-3">
            Mi Perfil
          </h1>
          <p className="text-stellar-black/60 font-body">
            Gestiona tu wallet y configuración
          </p>
          <div className="mt-6">
            <TldrCard
              label=""
              summary="Aquí ves tu wallet Stellar conectada, balances y accesos rápidos para crear eventos o reclamar tus comprobantes."
              bullets={[
                {
                  label: "Wallet",
                  detail: "Dirección visible, botón copiar y balance XLM.",
                },
                {
                  label: "Acciones",
                  detail:
                    "CTA claros para ver SPOTs, crear eventos y reclamar.",
                },
                {
                  label: "Confianza",
                  detail:
                    "Datos claros, estados legibles y opción para desconectar.",
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
              Conecta tu Wallet
            </h2>
            <p className="text-stellar-black/60 font-body max-w-sm mx-auto mb-8">
              Conecta tu wallet de Stellar para ver tu información y balance.
            </p>
            <ConnectAccount />
          </div>
        ) : (
          <div className="space-y-5 max-w-3xl mx-auto">
            {/* Wallet Info */}
            <div className="bg-stellar-white rounded-2xl shadow-sm p-6 md:p-8 border border-stellar-lilac/15">
              <h2 className="text-lg font-headline text-stellar-black mb-6">
                Información de Wallet
              </h2>

              {/* Address */}
              <div className="mb-6">
                <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/40 mb-2">
                  Dirección
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
                    Copiar
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div>
                <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/40 mb-2">
                  Balance
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
                Red
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-stellar-teal" />
                <p className="text-stellar-black font-body text-sm">
                  Stellar Testnet
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-stellar-white rounded-2xl shadow-sm p-6 md:p-8 border border-stellar-lilac/15">
              <h2 className="text-lg font-headline text-stellar-black mb-5">
                Acciones
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/")}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black px-8 py-3.5 rounded-full font-semibold font-body hover:bg-stellar-gold/90 transition-all shadow-md hover:shadow-lg"
                >
                  Ver Mis SPOTs
                </button>
                <button
                  onClick={() => navigate("/create-event")}
                  className="w-full inline-flex items-center justify-center gap-2 bg-stellar-lilac/20 text-stellar-black px-8 py-3.5 rounded-full font-semibold font-body hover:bg-stellar-lilac/30 transition-all"
                >
                  <Plus size={15} />
                  Crear Evento
                </button>
                <button
                  onClick={() => navigate("/mint")}
                  className="w-full inline-flex items-center justify-center gap-2 border border-stellar-teal/30 text-stellar-teal px-8 py-3.5 rounded-full font-semibold font-body hover:bg-stellar-teal/10 transition-all"
                >
                  <Zap size={15} />
                  Reclamar SPOT
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
                Desconectar Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
