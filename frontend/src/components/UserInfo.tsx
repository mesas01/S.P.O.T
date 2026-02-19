import React from "react";
import { Text } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";

const UserInfo: React.FC = () => {
  const { address } = useWallet();
  
  // Placeholder fijo para el nombre de usuario
  const username = "Usuario SPOT";

  // Función para formatear la dirección (mostrar primeros y últimos caracteres)
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "No conectado";
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-2 lg:p-3 border border-purple-200 flex items-center gap-2 lg:gap-3 min-w-0 w-full">
      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm lg:text-lg flex-shrink-0">
        {username.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <Text as="div" size="sm" className="font-semibold text-gray-800 truncate text-xs lg:text-sm">
          {username}
        </Text>
        <Text as="div" size="xs" className="text-gray-600 font-mono truncate text-[10px] lg:text-xs" title={address || "No conectado"}>
          {formatAddress(address)}
        </Text>
      </div>
    </div>
  );
};

export default UserInfo;

