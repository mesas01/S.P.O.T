import { useState } from "react";
import { Button, Modal, Profile } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { connectWallet } from "../util/wallet";

export const WalletButton = () => {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const { address, isPending, disconnect } = useWallet();
  const buttonLabel = isPending ? "Loading..." : "Connect";

  if (!address) {
    return (
      <Button variant="primary" size="md" onClick={() => void connectWallet()}>
        {buttonLabel}
      </Button>
    );
  }

  return (
    <div
      className="flex flex-row items-center gap-2 sm:gap-3 opacity-100"
      style={{
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <div id="modalContainer">
        <Modal
          visible={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          parentId="modalContainer"
        >
          <div className="bg-stellar-white rounded-2xl p-6 border-2 border-stellar-lilac/30 shadow-xl">
            <div className="mb-4">
              <h3 className="text-2xl font-headline text-stellar-black uppercase">
                ¿Desconectar Wallet?
              </h3>
            </div>
            <div className="mb-6">
              <p className="text-stellar-black/80 font-body mb-2">
                Conectado como:
              </p>
              <code 
                className="block bg-stellar-warm-grey/30 px-3 py-2 rounded-lg text-stellar-black font-mono text-sm break-all border border-stellar-lilac/20"
                style={{ lineBreak: "anywhere" }}
              >
                {address}
              </code>
            </div>
            <Modal.Footer itemAlignment="stack">
              <Button
                size="md"
                variant="primary"
                onClick={() => {
                  void disconnect().finally(() =>
                    setShowDisconnectModal(false),
                  );
                }}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Desconectar
              </Button>
              <Button
                size="md"
                variant="tertiary"
                onClick={() => {
                  setShowDisconnectModal(false);
                }}
                className="bg-stellar-lilac/20 hover:bg-stellar-lilac/30 text-stellar-black"
              >
                Cancelar
              </Button>
            </Modal.Footer>
          </div>
        </Modal>
      </div>

      {/* Profile - only shown on mobile, hidden on desktop since UserInfo shows the address */}
      <div className="md:hidden">
        <Profile
          publicAddress={address}
          size="md"
          isShort
          onClick={() => setShowDisconnectModal(true)}
        />
      </div>
      
      {/* Disconnect button for desktop - hidden on mobile */}
      <Button
        variant="tertiary"
        size="sm"
        onClick={() => setShowDisconnectModal(true)}
        className="hidden md:flex"
        title="Disconnect wallet"
      >
        Disconnect
      </Button>
    </div>
  );
};
