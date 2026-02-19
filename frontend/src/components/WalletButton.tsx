import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { connectWallet } from "../util/wallet";
import { LogOut, X, Loader2 } from "lucide-react";

export const WalletButton = () => {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const { address, isPending, disconnect } = useWallet();

  if (!address) {
    return (
      <button
        onClick={() => void connectWallet()}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-6 py-2.5 shadow-md transition-all font-body text-sm disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Cargando...
          </>
        ) : (
          "Conectar"
        )}
      </button>
    );
  }

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <>
      <button
        onClick={() => setShowDisconnectModal(true)}
        className="inline-flex items-center gap-2 bg-stellar-lilac/10 border border-stellar-lilac/30 text-stellar-black hover:bg-stellar-lilac/20 rounded-full px-4 py-2 font-body text-sm transition-all"
        style={{ opacity: isPending ? 0.6 : 1 }}
      >
        <span className="w-2 h-2 rounded-full bg-stellar-teal" />
        <span className="font-mono text-xs">{shortAddress}</span>
      </button>

      {/* Disconnect modal */}
      {showDisconnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setShowDisconnectModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-stellar-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl border border-stellar-lilac/20 shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowDisconnectModal(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-stellar-black/40 hover:text-stellar-black hover:bg-stellar-black/5 transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-headline text-stellar-black uppercase mb-4">
              Wallet conectada
            </h3>

            <div className="mb-6">
              <p className="text-xs font-body uppercase tracking-widest text-stellar-black/50 mb-2">
                Dirección
              </p>
              <code
                className="block bg-stellar-warm-grey/20 px-4 py-3 rounded-xl text-stellar-black font-mono text-xs border border-stellar-lilac/10"
                style={{ lineBreak: "anywhere" }}
              >
                {address}
              </code>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  void disconnect().finally(() =>
                    setShowDisconnectModal(false),
                  );
                }}
                className="w-full inline-flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-semibold rounded-full py-3 px-6 transition-all font-body text-sm"
              >
                <LogOut size={14} />
                Desconectar
              </button>
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="w-full inline-flex items-center justify-center gap-2 bg-stellar-lilac/10 border border-stellar-lilac/20 text-stellar-black hover:bg-stellar-lilac/20 rounded-full py-3 px-6 transition-all font-body text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
