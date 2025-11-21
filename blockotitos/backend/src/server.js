import express from "express";
import dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";
import { approveCreator, revokeCreatorApproval } from "./soroban.js";

dotenv.config({ path: process.env.ENV_PATH || undefined });

const {
  PORT = 4000,
  RPC_URL,
  NETWORK_PASSPHRASE,
  ADMIN_SECRET,
  POAP_CONTRACT_ID,
  MOCK_MODE = "false",
} = process.env;

const isMock = MOCK_MODE.toLowerCase() === "true";

if (!isMock) {
  if (!RPC_URL || !NETWORK_PASSPHRASE || !ADMIN_SECRET || !POAP_CONTRACT_ID) {
    throw new Error(
      "Missing env vars. Please copy backend/env.example → backend/.env and fill values."
    );
  }

  try {
    Keypair.fromSecret(ADMIN_SECRET);
  } catch (error) {
    throw new Error(`Invalid ADMIN_SECRET provided: ${error.message}`);
  }
} else {
  console.warn("[MOCK_MODE] Running backend without hitting Soroban RPC.");
}

const app = express();
app.use(express.json());

app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    console.error("Invalid JSON payload", err.message);
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  next(err);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/creators/approve", async (req, res) => {
  const { creator, paymentReference } = req.body || {};
  if (!creator || !paymentReference) {
    return res
      .status(400)
      .json({ error: "creator and paymentReference are required" });
  }

  if (isMock) {
    return res.json({ txHash: `MOCK-APPROVE-${Date.now()}` });
  }

  try {
    const txHash = await approveCreator({
      creator,
      paymentReference,
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      adminSecret: ADMIN_SECRET,
      contractId: POAP_CONTRACT_ID,
    });
    res.json({ txHash });
  } catch (error) {
    console.error("approve_creator failed", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/creators/revoke", async (req, res) => {
  const { creator } = req.body || {};
  if (!creator) {
    return res.status(400).json({ error: "creator is required" });
  }

  if (isMock) {
    return res.json({ txHash: `MOCK-REVOKE-${Date.now()}` });
  }

  try {
    const txHash = await revokeCreatorApproval({
      creator,
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      adminSecret: ADMIN_SECRET,
      contractId: POAP_CONTRACT_ID,
    });
    res.json({ txHash });
  } catch (error) {
    console.error("revoke_creator_approval failed", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`POAP admin backend listening on http://localhost:${PORT}`);
});

