import { useState, useEffect } from "react";
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
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!id) {
      console.warn("SPOT contract ID not configured. Set VITE_SPOT_CONTRACT_ID in .env");
      setClient(null);
      return;
    }

    if (isUsingFallback && import.meta.env.DEV) {
      console.warn(
        "VITE_SPOT_CONTRACT_ID no está configurado; usando ID por defecto del entorno de ejemplo.",
      );
    }

    let cancelled = false;

    Client.from({
      contractId: id,
      networkPassphrase: network.passphrase,
      rpcUrl: network.rpcUrl,
      allowHttp: new URL(network.rpcUrl).hostname === "localhost",
    })
      .then((clientInstance) => {
        if (!cancelled) {
          setClient(clientInstance);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Error creating SPOT contract client:", error);
          setClient(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, isUsingFallback]);

  return client;
};

/**
 * Hook para obtener un cliente del contrato Factory
 */
export const useFactoryContract = (contractId?: string) => {
  const id = contractId || import.meta.env.VITE_FACTORY_CONTRACT_ID;
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!id) {
      console.warn("Factory contract ID not configured. Set VITE_FACTORY_CONTRACT_ID in .env");
      setClient(null);
      return;
    }

    let cancelled = false;

    Client.from({
      contractId: id,
      networkPassphrase: network.passphrase,
      rpcUrl: network.rpcUrl,
      allowHttp: new URL(network.rpcUrl).hostname === "localhost",
    })
      .then((clientInstance) => {
        if (!cancelled) {
          setClient(clientInstance);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Error creating Factory contract client:", error);
          setClient(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return client;
};

/**
 * Hook para obtener un cliente de un contrato Event específico
 */
export const useEventContract = (contractId: string) => {
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!contractId) {
      setClient(null);
      return;
    }

    let cancelled = false;

    Client.from({
      contractId: contractId,
      networkPassphrase: network.passphrase,
      rpcUrl: network.rpcUrl,
      allowHttp: new URL(network.rpcUrl).hostname === "localhost",
    })
      .then((clientInstance) => {
        if (!cancelled) {
          setClient(clientInstance);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Error creating Event contract client:", error);
          setClient(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contractId]);

  return client;
};

/**
 * Utilidad para crear un cliente de contrato desde un contractId
 * Nota: Esta función es asíncrona porque Client.from() requiere obtener el spec del contrato
 */
export const createContractClient = async (contractId: string): Promise<Client | null> => {
  if (!contractId) {
    return null;
  }

  try {
    return await Client.from({
      contractId: contractId,
      networkPassphrase: network.passphrase,
      rpcUrl: network.rpcUrl,
      allowHttp: new URL(network.rpcUrl).hostname === "localhost",
    });
  } catch (error) {
    console.error("Error creating contract client:", error);
    return null;
  }
};
