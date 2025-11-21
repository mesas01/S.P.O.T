import {
  Address,
  Contract,
  Keypair,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";

const BASE_FEE = "100";
const POLL_INTERVAL_MS = 1000;
const POLL_RETRIES = 60;

function getServer(rpcUrl) {
  return new SorobanRpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
}

async function pollForCompletion(server, hash) {
  for (let i = 0; i < POLL_RETRIES; i++) {
    const tx = await server.getTransaction(hash);
    if (tx.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return hash;
    }
    if (tx.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${tx.resultXdr}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error("Timed out waiting for Soroban transaction confirmation");
}

async function sendContractInvocation({
  rpcUrl,
  networkPassphrase,
  adminSecret,
  contractId,
  method,
  args,
}) {
  const server = getServer(rpcUrl);
  const adminKeypair = Keypair.fromSecret(adminSecret);
  const account = await server.getAccount(adminKeypair.publicKey());
  const contract = new Contract(contractId);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  tx = await server.prepareTransaction(tx);
  tx.sign(adminKeypair);

  const sendResult = await server.sendTransaction(tx);
  if (sendResult.errorResult) {
    throw new Error(`sendTransaction error: ${sendResult.errorResult}`);
  }

  if (sendResult.status === SorobanRpc.Api.SendTransactionStatus.ERROR) {
    throw new Error(`Soroban rejected tx: ${sendResult.resultXdr}`);
  }

  return pollForCompletion(server, sendResult.hash);
}

export async function approveCreator({
  rpcUrl,
  networkPassphrase,
  adminSecret,
  contractId,
  creator,
  paymentReference,
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
    adminSecret,
    contractId,
    method: "approve_creator",
    args,
  });
}

export async function revokeCreatorApproval({
  rpcUrl,
  networkPassphrase,
  adminSecret,
  contractId,
  creator,
}) {
  const adminPublic = Keypair.fromSecret(adminSecret).publicKey();
  const args = [
    Address.fromString(adminPublic).toScVal(),
    Address.fromString(creator).toScVal(),
  ];

  return sendContractInvocation({
    rpcUrl,
    networkPassphrase,
    adminSecret,
    contractId,
    method: "revoke_creator_approval",
    args,
  });
}

