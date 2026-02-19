import React from "react";
import { Icon } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { stellarNetwork } from "../contracts/util";

// Format network name with first letter capitalized
const formatNetworkName = (name: string) =>
  // TODO: This is a workaround until @creit-tech/stellar-wallets-kit uses the new name for a local network.
  name === "STANDALONE"
    ? "Local"
    : name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

const appNetwork = formatNetworkName(stellarNetwork);

const bgColor = "#F0F2F5";
const textColor = "#4A5362";

const NetworkPill: React.FC = () => {
  const { network, address } = useWallet();

  // Check if there's a network mismatch
  const walletNetwork = formatNetworkName(network ?? "");
  const isNetworkMismatch = walletNetwork !== appNetwork;

  let title = "";
  let color = "#2ED06E";
  if (!address) {
    title = "Connect your wallet using this network.";
    color = "#C1C7D0";
  } else if (isNetworkMismatch) {
    title = `Wallet is on ${walletNetwork}, connect to ${appNetwork} instead.`;
    color = "#FF3B30";
  }

  return (
    <div
      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-2xl font-bold text-xs sm:text-xs cursor-default"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        cursor: isNetworkMismatch ? "help" : "default",
      }}
      title={title}
    >
      <Icon.Circle color={color} size="sm" />
      <span className="whitespace-nowrap">{appNetwork}</span>
    </div>
  );
};

export default NetworkPill;
