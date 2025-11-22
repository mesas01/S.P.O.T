import { useState } from "react";
import { Button, Modal, Profile } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { connectWallet } from "../util/wallet";

export const WalletButton = () => {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const { address, isPending, balances, disconnect } = useWallet();
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
          <Modal.Heading>
            Connected as{" "}
            <code style={{ lineBreak: "anywhere" }}>{address}</code>. Do you
            want to disconnect?
          </Modal.Heading>
          <Modal.Footer itemAlignment="stack">
            <Button
              size="md"
              variant="primary"
              onClick={() => {
                void disconnect().finally(() =>
                  setShowDisconnectModal(false),
                );
              }}
            >
              Disconnect
            </Button>
            <Button
              size="md"
              variant="tertiary"
              onClick={() => {
                setShowDisconnectModal(false);
              }}
            >
              Cancel
            </Button>
          </Modal.Footer>
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
