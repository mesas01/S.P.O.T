import { useMutation, useQuery } from "@tanstack/react-query";
import { Address, xdr } from "@stellar/stellar-sdk";
import { useWallet } from "./useWallet";
import { useSpotContract } from "./useSpotContract";
import { useRpcPrepareTx } from "../debug/hooks/useRpcPrepareTx";
import { useSubmitRpcTx } from "../debug/hooks/useSubmitRpcTx";
import { network } from "../contracts/util";
import { getNetworkHeaders } from "../debug/util/getNetworkHeaders";
import { getSorobanTxData } from "../debug/util/sorobanUtils";
import { TransactionBuilder } from "@stellar/stellar-sdk";

/**
 * Hook para crear un nuevo evento SPOT
 */
export const useCreateEvent = () => {
  const { address, signTransaction } = useWallet();
  const contract = useSpotContract();
  const { mutateAsync: prepareTx } = useRpcPrepareTx();
  const { mutateAsync: submitTx } = useSubmitRpcTx();

  return useMutation({
    mutationFn: async (params: {
      eventName: string;
      eventDate: number; // Unix timestamp
      location: string;
      description: string;
      maxSpots: number;
      claimStart: number; // Unix timestamp
      claimEnd: number; // Unix timestamp
      metadataUri: string;
      imageUrl: string;
    }) => {
      if (!address || !contract) {
        throw new Error("Wallet not connected or contract not initialized");
      }

      try {
        // Convertir dirección a Address
        const creatorAddress = Address.fromString(address);

        // Construir los argumentos para la función create_event
        // Según el contrato: create_event(creator, event_name, event_date, location, description, max_poaps, claim_start, claim_end, metadata_uri, image_url)
        const args = [
          creatorAddress.toScVal(), // creator
          xdr.ScVal.scvString(params.eventName), // event_name
          xdr.ScVal.scvU64(new xdr.UInt64(xdr.Int64.fromString(params.eventDate.toString()))), // event_date
          xdr.ScVal.scvString(params.location), // location
          xdr.ScVal.scvString(params.description), // description
          xdr.ScVal.scvU32(params.maxSpots), // max_poaps
          xdr.ScVal.scvU64(new xdr.UInt64(xdr.Int64.fromString(params.claimStart.toString()))), // claim_start
          xdr.ScVal.scvU64(new xdr.UInt64(xdr.Int64.fromString(params.claimEnd.toString()))), // claim_end
          xdr.ScVal.scvString(params.metadataUri), // metadata_uri
          xdr.ScVal.scvString(params.imageUrl), // image_url
        ];

        // Construir la transacción
        const txData = getSorobanTxData({
          contractAddress: contract.options.contractId,
          functionName: "create_event",
          args,
          sourceAccount: address,
          rpcUrl: network.rpcUrl,
          networkPassphrase: network.passphrase,
        });

        if (!txData.transactionXdr) {
          throw new Error("Failed to build transaction");
        }

        // Preparar la transacción
        const preparedTx = await prepareTx({
          rpcUrl: network.rpcUrl,
          transactionXdr: txData.transactionXdr,
          networkPassphrase: network.passphrase,
          headers: getNetworkHeaders(network, "rpc"),
        });

        // Firmar la transacción
        const signedTx = await signTransaction(preparedTx.transactionXdr);
        if (!signedTx) {
          throw new Error("Transaction signing failed");
        }

        // Enviar la transacción
        const result = await submitTx({
          rpcUrl: network.rpcUrl,
          transactionXdr: signedTx,
          networkPassphrase: network.passphrase,
          headers: getNetworkHeaders(network, "rpc"),
        });

        return result;
      } catch (error) {
        console.error("Error creating event:", error);
        throw error;
      }
    },
  });
};

/**
 * Hook para reclamar un SPOT (claim)
 */
export const useClaimSpot = () => {
  const { address, signTransaction } = useWallet();
  const contract = useSpotContract();
  const { mutateAsync: prepareTx } = useRpcPrepareTx();
  const { mutateAsync: submitTx } = useSubmitRpcTx();

  return useMutation({
    mutationFn: async (eventId: number) => {
      if (!address || !contract) {
        throw new Error("Wallet not connected or contract not initialized");
      }

      try {
        const toAddress = Address.fromString(address);

        // Construir los argumentos para la función claim
        // Según el contrato: claim(event_id, to)
        const args = [
          xdr.ScVal.scvU32(eventId), // event_id
          toAddress.toScVal(), // to
        ];

        // Construir la transacción
        const txData = getSorobanTxData({
          contractAddress: contract.options.contractId,
          functionName: "claim",
          args,
          sourceAccount: address,
          rpcUrl: network.rpcUrl,
          networkPassphrase: network.passphrase,
        });

        if (!txData.transactionXdr) {
          throw new Error("Failed to build transaction");
        }

        // Preparar la transacción
        const preparedTx = await prepareTx({
          rpcUrl: network.rpcUrl,
          transactionXdr: txData.transactionXdr,
          networkPassphrase: network.passphrase,
          headers: getNetworkHeaders(network, "rpc"),
        });

        // Firmar la transacción
        const signedTx = await signTransaction(preparedTx.transactionXdr);
        if (!signedTx) {
          throw new Error("Transaction signing failed");
        }

        // Enviar la transacción
        const result = await submitTx({
          rpcUrl: network.rpcUrl,
          transactionXdr: signedTx,
          networkPassphrase: network.passphrase,
          headers: getNetworkHeaders(network, "rpc"),
        });

        return result;
      } catch (error) {
        console.error("Error claiming SPOT:", error);
        throw error;
      }
    },
  });
};

/**
 * Hook para obtener información de un evento
 */
export const useEventInfo = (eventId: number) => {
  const contract = useSpotContract();

  return useQuery({
    queryKey: ["event", eventId, contract?.options.contractId],
    queryFn: async () => {
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      try {
        // Llamar a la función get_event del contrato
        // Esta es una llamada de solo lectura (read-only)
        const result = await contract.call({
          method: "get_event",
          args: [xdr.ScVal.scvU32(eventId)],
        });

        // Parsear el resultado según la estructura EventData del contrato
        // EventData: (event_id, creator, event_name, event_date, location, description, max_poaps, claim_start, claim_end, metadata_uri, image_url)
        if (result && result.result) {
          const vals = result.result.value();
          return {
            event_id: vals.event_id?.u32() || 0,
            creator: vals.creator?.address()?.toString() || "",
            event_name: vals.event_name?.str() || "",
            event_date: vals.event_date?.u64()?.toString() || "0",
            location: vals.location?.str() || "",
            description: vals.description?.str() || "",
            max_poaps: vals.max_poaps?.u32() || 0,
            claim_start: vals.claim_start?.u64()?.toString() || "0",
            claim_end: vals.claim_end?.u64()?.toString() || "0",
            metadata_uri: vals.metadata_uri?.str() || "",
            image_url: vals.image_url?.str() || "",
          };
        }

        throw new Error("Invalid response from contract");
      } catch (error) {
        console.error("Error fetching event info:", error);
        throw error;
      }
    },
    enabled: !!contract && !!eventId,
  });
};

/**
 * Hook para obtener todos los eventos
 */
export const useAllEvents = () => {
  const contract = useSpotContract();

  return useQuery({
    queryKey: ["allEvents", contract?.options.contractId],
    queryFn: async () => {
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      try {
        // Llamar a la función get_all_events del contrato
        const result = await contract.call({
          method: "get_all_events",
          args: [],
        });

        if (result && result.result) {
          const eventIds = result.result.value();
          // get_all_events retorna Vec<u32>
          return eventIds.map((id: any) => id.u32());
        }

        return [];
      } catch (error) {
        console.error("Error fetching all events:", error);
        throw error;
      }
    },
    enabled: !!contract,
  });
};

/**
 * Hook para verificar si un usuario ya reclamó un SPOT de un evento
 */
export const useHasClaimed = (eventId: number, userAddress?: string) => {
  const contract = useSpotContract();
  const { address } = useWallet();
  const addressToCheck = userAddress || address;

  return useQuery({
    queryKey: ["hasClaimed", eventId, addressToCheck, contract?.options.contractId],
    queryFn: async () => {
      if (!contract || !addressToCheck) {
        return false;
      }

      try {
        const userAddr = Address.fromString(addressToCheck);
        const result = await contract.call({
          method: "has_claimed",
          args: [
            xdr.ScVal.scvU32(eventId),
            userAddr.toScVal(),
          ],
        });

        if (result && result.result) {
          return result.result.value() === true;
        }

        return false;
      } catch (error) {
        console.error("Error checking if user has claimed:", error);
        return false;
      }
    },
    enabled: !!contract && !!addressToCheck && !!eventId,
  });
};

/**
 * Hook para obtener el número de SPOTs minteados de un evento
 */
export const useMintedCount = (eventId: number) => {
  const contract = useSpotContract();

  return useQuery({
    queryKey: ["mintedCount", eventId, contract?.options.contractId],
    queryFn: async () => {
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      try {
        const result = await contract.call({
          method: "minted_count",
          args: [xdr.ScVal.scvU32(eventId)],
        });

        if (result && result.result) {
          return result.result.value()?.u32() || 0;
        }

        return 0;
      } catch (error) {
        console.error("Error fetching minted count:", error);
        throw error;
      }
    },
    enabled: !!contract && !!eventId,
  });
};
