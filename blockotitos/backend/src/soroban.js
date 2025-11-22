import {
  Address,
  Contract,
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

const BASE_FEE = "100";
const POLL_INTERVAL_MS = 1000;
const POLL_RETRIES = 60;

function isUnionSwitchError(error) {
  return (
    error instanceof Error &&
    typeof error.message === "string" &&
    error.message.includes("Bad union switch")
  );
}

function formatResultXdr(result) {
  if (!result) {
    return "unknown result";
  }
  if (typeof result === "string") {
    return result;
  }
  if (typeof result.toXDR === "function") {
    try {
      return result.toXDR("base64");
    } catch (_) {
      // fall through to JSON serialization below
    }
  }
  try {
    return JSON.stringify(result);
  } catch (_) {
    return String(result);
  }
}

function decodeEventData(scVal) {
  const mapEntries = scVal.map();
  const data = {};
  mapEntries.forEach((entry) => {
    const key = entry.key().sym().toString();
    data[key] = entry.val();
  });

  const toStringVal = (val) => (val ? val.str().toString() : "");
  const toU32 = (val) => (val ? Number(val.u32()) : 0);
  const toU64Number = (val) =>
    val ? Number(val.u64().toString()) : 0;
  const toAddress = (val) =>
    val ? val.address().toString() : "";

  return {
    eventId: toU32(data.event_id),
    creator: toAddress(data.creator),
    eventName: toStringVal(data.event_name),
    eventDate: toU64Number(data.event_date),
    location: toStringVal(data.location),
    description: toStringVal(data.description),
    maxPoaps: toU32(data.max_poaps),
    claimStart: toU64Number(data.claim_start),
    claimEnd: toU64Number(data.claim_end),
    metadataUri: toStringVal(data.metadata_uri),
    imageUrl: toStringVal(data.image_url),
  };
}

function getServer(rpcUrl) {
  return new SorobanRpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
}

async function pollForCompletion(server, hash) {
  const canUseRawGetTransaction = typeof server._getTransaction === "function";
  let useRawGetTransaction = false;

  for (let i = 0; i < POLL_RETRIES; i++) {
    let tx;
    try {
      if (useRawGetTransaction && canUseRawGetTransaction) {
        tx = await server._getTransaction(hash);
      } else {
        tx = await server.getTransaction(hash);
      }
    } catch (error) {
      if (!useRawGetTransaction && canUseRawGetTransaction && isUnionSwitchError(error)) {
        useRawGetTransaction = true;
        console.warn(
          "Falling back to raw getTransaction due to RPC decode error:",
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }
      throw error;
    }

    if (tx.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return hash;
    }
    if (tx.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${formatResultXdr(tx.resultXdr)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Timed out waiting for Soroban transaction confirmation");
}

async function sendContractInvocation({
  rpcUrl,
  networkPassphrase,
  signerSecret,
  contractId,
  method,
  args,
}) {
  const server = getServer(rpcUrl);
  const signerKeypair = Keypair.fromSecret(signerSecret);
  const account = await server.getAccount(signerKeypair.publicKey());
  const contract = new Contract(contractId);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  tx = await server.prepareTransaction(tx);
  tx.sign(signerKeypair);

  const envelopeXdr = tx.toEnvelope().toXDR("base64");

  const sendResult = await server.sendTransaction(tx);
  if (sendResult.errorResult) {
    throw new Error(`sendTransaction error: ${JSON.stringify(sendResult.errorResult)}`);
  }

  if (sendResult.status === "ERROR") {
    throw new Error(`Soroban rejected tx: ${sendResult.resultXdr}`);
  }

  const txHash = await pollForCompletion(server, sendResult.hash);
  return { txHash, rpcResponse: sendResult, envelopeXdr };
}

async function simulateContractCall({
  rpcUrl,
  networkPassphrase,
  signerSecret,
  contractId,
  method,
  args,
  decode = true,
}) {
  const server = getServer(rpcUrl);
  const signerKeypair = Keypair.fromSecret(signerSecret);
  const account = await server.getAccount(signerKeypair.publicKey());
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  const simulation = await server.simulateTransaction(prepared);
  if (!simulation.result?.retval) {
    throw new Error("No retval returned from simulation");
  }
  return decode ? scValToNative(simulation.result.retval) : simulation.result.retval;
}

export async function approveCreator({
  rpcUrl,
  networkPassphrase,
  contractId,
  creator,
  paymentReference,
  adminSecret,
}) {
  const adminPublic = Keypair.fromSecret(adminSecret).publicKey();
  const args = [
    Address.fromString(adminPublic).toScVal(),
    Address.fromString(creator).toScVal(),
    nativeToScVal(paymentReference, { type: "string" }),
  ];

  return sendContractInvocation({
    rpcUrl,
    networkPassphrase,
    signerSecret: adminSecret,
    contractId,
    method: "approve_creator",
    args,
  });
}

export async function revokeCreatorApproval({
  rpcUrl,
  networkPassphrase,
  contractId,
  creator,
  adminSecret,
}) {
  const adminPublic = Keypair.fromSecret(adminSecret).publicKey();
  const args = [
    Address.fromString(adminPublic).toScVal(),
    Address.fromString(creator).toScVal(),
  ];

  return sendContractInvocation({
    rpcUrl,
    networkPassphrase,
    signerSecret: adminSecret,
    contractId,
    method: "revoke_creator_approval",
    args,
  });
}

export async function createEvent({
  rpcUrl,
  networkPassphrase,
  contractId,
  signerSecret,
  creator,
  eventName,
  eventDate,
  location,
  description,
  maxPoaps,
  claimStart,
  claimEnd,
  metadataUri,
  imageUrl,
}) {
  const u64 = (value) =>
    xdr.ScVal.scvU64(xdr.Uint64.fromString(value.toString()));

  const args = [
    Address.fromString(creator).toScVal(),
    nativeToScVal(eventName, { type: "string" }),
    u64(eventDate),
    nativeToScVal(location, { type: "string" }),
    nativeToScVal(description, { type: "string" }),
    nativeToScVal(maxPoaps, { type: "u32" }),
    u64(claimStart),
    u64(claimEnd),
    nativeToScVal(metadataUri, { type: "string" }),
    nativeToScVal(imageUrl, { type: "string" }),
  ];

  return sendContractInvocation({
    rpcUrl,
    networkPassphrase,
    signerSecret,
    contractId,
    method: "create_event",
    args,
  });
}

export async function claimPoap({
  rpcUrl,
  networkPassphrase,
  contractId,
  payerSecret,
  claimer,
  eventId,
}) {
  const args = [
    nativeToScVal(eventId, { type: "u32" }),
    Address.fromString(claimer).toScVal(),
  ];

  return sendContractInvocation({
    rpcUrl,
    networkPassphrase,
    signerSecret: payerSecret,
    contractId,
    method: "claim",
    args,
  });
}

export async function getAdminAddress({
  rpcUrl,
  networkPassphrase,
  contractId,
  adminSecret,
}) {
  const value = await simulateContractCall({
    rpcUrl,
    networkPassphrase,
    signerSecret: adminSecret,
    contractId,
    method: "admin",
    args: [],
  });
  return value;
}

export async function getEventCount({
  rpcUrl,
  networkPassphrase,
  contractId,
  adminSecret,
}) {
  const count = await simulateContractCall({
    rpcUrl,
    networkPassphrase,
    signerSecret: adminSecret,
    contractId,
    method: "event_count",
    args: [],
  });
  return Number(count);
}

export async function getAllEventIds({
  rpcUrl,
  networkPassphrase,
  contractId,
  adminSecret,
}) {
  const raw = await simulateContractCall({
    rpcUrl,
    networkPassphrase,
    signerSecret: adminSecret,
    contractId,
    method: "get_all_events",
    args: [],
    decode: false,
  });

  const vec = raw?.vec() || [];
  return vec.map((entry) => Number(entry.u32()));
}

export async function getEventDetails({
  rpcUrl,
  networkPassphrase,
  contractId,
  adminSecret,
  eventId,
}) {
  const scVal = await simulateContractCall({
    rpcUrl,
    networkPassphrase,
    signerSecret: adminSecret,
    contractId,
    method: "get_event",
    args: [nativeToScVal(eventId, { type: "u32" })],
    decode: false,
  });

  if (!scVal || typeof scVal.map !== "function") {
    throw new Error("Invalid response for get_event");
  }

  return decodeEventData(scVal);
}

export async function getMintedCount({
  rpcUrl,
  networkPassphrase,
  contractId,
  adminSecret,
  eventId,
}) {
  const scVal = await simulateContractCall({
    rpcUrl,
    networkPassphrase,
    signerSecret: adminSecret,
    contractId,
    method: "minted_count",
    args: [nativeToScVal(eventId, { type: "u32" })],
    decode: false,
  });

  return scVal?.u32 ? Number(scVal.u32()) : 0;
}

