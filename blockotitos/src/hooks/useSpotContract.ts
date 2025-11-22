import { useMemo } from "react";
import { Client } from "@stellar/stellar-sdk/contract";
import { network } from "../contracts/util";

const DEFAULT_SPOT_CONTRACT_ID =
  "CC3XATHZKTV7WGEBR337JAH3UTAMQTK7VPPSDSAKHA4KGVOCJPF6P3VF";

/**
 * Hook para obtener un cliente del contrato SPOT (coleccionable de asistencia)
 * 
 * @param contractId - ID del contrato (opcional, usa variable de entorno si no se proporciona)
 * @returns Cliente del contrato configurado
 */
export const useSpotContract = (contractId?: string) => {
  const envContractId = (import.meta.env.VITE_SPOT_CONTRACT_ID || "").trim();
  const id = contractId || envContractId || DEFAULT_SPOT_CONTRACT_ID;
  const isUsingFallback = !contractId && !envContractId;
  
  return useMemo(() => {
    if (!id) {
      console.warn("SPOT contract ID not configured. Set VITE_SPOT_CONTRACT_ID in .env");
      return null;
    }

    if (isUsingFallback && import.meta.env.DEV) {
      console.warn(
        "VITE_SPOT_CONTRACT_ID no está configurado; usando ID por defecto del entorno de ejemplo.",
      );
    }

    try {
      const client = new Client({
        contractId: id,
        networkPassphrase: network.passphrase,
        rpcUrl: network.rpcUrl,
        allowHttp: new URL(network.rpcUrl).hostname === "localhost",
      });
      
      return client;
    } catch (error) {
      console.error("Error creating SPOT contract client:", error);
      return null;
    }
  }, [id, isUsingFallback]);
};

/**
 * Hook para obtener un cliente del contrato Factory
 */
export const useFactoryContract = (contractId?: string) => {
  const id = contractId || import.meta.env.VITE_FACTORY_CONTRACT_ID;
  
  return useMemo(() => {
    if (!id) {
      console.warn("Factory contract ID not configured. Set VITE_FACTORY_CONTRACT_ID in .env");
      return null;
    }

    try {
      const client = new Client({
        contractId: id,
        networkPassphrase: network.passphrase,
        rpcUrl: network.rpcUrl,
        allowHttp: new URL(network.rpcUrl).hostname === "localhost",
      });
      
      return client;
    } catch (error) {
      console.error("Error creating Factory contract client:", error);
      return null;
    }
  }, [id]);
};

/**
 * Hook para obtener un cliente de un contrato Event específico
 */
export const useEventContract = (contractId: string) => {
  return useMemo(() => {
    if (!contractId) {
      return null;
    }

    try {
      const client = new Client({
        contractId: contractId,
        networkPassphrase: network.passphrase,
        rpcUrl: network.rpcUrl,
      });
      
      return client;
    } catch (error) {
      console.error("Error creating Event contract client:", error);
      return null;
    }
  }, [contractId]);
};

/**
 * Utilidad para crear un cliente de contrato desde un contractId
 */
export const createContractClient = (contractId: string): Client | null => {
  if (!contractId) {
    return null;
  }

  try {
    return new Client({
      contractId: contractId,
      networkPassphrase: network.passphrase,
      rpcUrl: network.rpcUrl,
    });
  } catch (error) {
    console.error("Error creating contract client:", error);
    return null;
  }
};
