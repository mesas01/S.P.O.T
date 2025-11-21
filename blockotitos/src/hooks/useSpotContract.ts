import { useMemo } from "react";
import { Client } from "@stellar/stellar-sdk/contract";
import { network } from "../contracts/util";
import { contract as stellarContract } from "@stellar/stellar-sdk";

/**
 * Hook para obtener un cliente del contrato SPOT (POAP)
 * 
 * @param contractId - ID del contrato (opcional, usa variable de entorno si no se proporciona)
 * @returns Cliente del contrato configurado
 */
export const useSpotContract = (contractId?: string) => {
  // TODO: Obtener contractId de variables de entorno o configuración
  // Por ahora, esperamos que se pase como parámetro o se configure en .env
  const id = contractId || import.meta.env.VITE_SPOT_CONTRACT_ID;
  
  return useMemo(() => {
    if (!id) {
      console.warn("SPOT contract ID not configured. Set VITE_SPOT_CONTRACT_ID in .env");
      return null;
    }

    try {
      const client = new Client({
        contractId: id,
        networkPassphrase: network.passphrase,
        rpcUrl: network.rpcUrl,
      });
      
      return client;
    } catch (error) {
      console.error("Error creating SPOT contract client:", error);
      return null;
    }
  }, [id]);
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
