import React from "react";
import { stellarNetwork } from "../contracts/util";
import { WalletButton } from "./WalletButton";
import NetworkPill from "./NetworkPill";

const ConnectAccount: React.FC = () => {
  return (
    <div className="flex flex-row items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap">
      <WalletButton />
      {stellarNetwork !== "PUBLIC" && (
        <div className="hidden min-[475px]:block md:block">
        </div>
      )}
      <NetworkPill />
    </div>
  );
};

export default ConnectAccount;
