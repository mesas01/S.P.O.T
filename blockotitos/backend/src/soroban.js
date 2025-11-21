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

  const sendResult = await server.sendTransaction(tx);
  if (sendResult.errorResult) {
    throw new Error(`sendTransaction error: ${JSON.stringify(sendResult.errorResult)}`);
  }

  if (sendResult.status === "ERROR") {
    throw new Error(`Soroban rejected tx: ${sendResult.resultXdr}`);
  }

  const txHash = await pollForCompletion(server, sendResult.hash);
  return { txHash, rpcResponse: sendResult };
}

async function simulateContractCall({
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
  return scValToNative(simulation.result.retval);
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
  creatorSecret,
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
    signerSecret: creatorSecret,
    contractId,
    method: "create_event",
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

