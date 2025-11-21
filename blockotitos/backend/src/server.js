import express from "express";
import dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { approveCreator, revokeCreatorApproval, createEvent, getAdminAddress } from "./soroban.js";

dotenv.config({ path: process.env.ENV_PATH || undefined });

const {
  PORT = 4000,
  RPC_URL,
  NETWORK_PASSPHRASE,
  ADMIN_SECRET,
  SPOT_CONTRACT_ID,
  MOCK_MODE = "false",
  LOG_FILE,
} = process.env;

const isMock = MOCK_MODE.toLowerCase() === "true";
const CONTRACT_ID = SPOT_CONTRACT_ID;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_PATH = LOG_FILE || path.resolve(__dirname, "../logs/backend.log");
fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });

async function logTx(entry) {
  const timestamp = new Date().toISOString();
  const record = { timestamp, ...entry };
  const line = JSON.stringify(record) + "\n";
  try {
    await fs.promises.appendFile(LOG_PATH, line);
  } catch (err) {
    console.error("Failed to write log file", err);
  }

  const prefix = `[${timestamp}] ${entry.action}`;
  if (entry.status === "success") {
    console.log(`${prefix} success${entry.txHash ? ` tx=${entry.txHash}` : ""}`);
  } else {
    console.error(`${prefix} error: ${entry.error}`);
  }
}

if (!isMock) {
  if (!RPC_URL || !NETWORK_PASSPHRASE || !ADMIN_SECRET || !CONTRACT_ID) {
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
  const payload = { creator, paymentReference };
  if (!creator || !paymentReference) {
    return res
      .status(400)
      .json({ error: "creator and paymentReference are required" });
  }

  if (isMock) {
    const txHash = `MOCK-APPROVE-${Date.now()}`;
    await logTx({ action: "approve_creator", status: "success", txHash, payload });
    return res.json({ txHash: `MOCK-APPROVE-${Date.now()}` });
  }

  try {
    const result = await approveCreator({
      creator,
      paymentReference,
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      adminSecret: ADMIN_SECRET,
      contractId: CONTRACT_ID,
    });
    await logTx({
      action: "approve_creator",
      status: "success",
      txHash: result.txHash,
      payload,
      rpcResponse: result.rpcResponse,
    });
    res.json({ txHash: result.txHash, rpcResponse: result.rpcResponse });
  } catch (error) {
    await logTx({
      action: "approve_creator",
      status: "error",
      error: error.message || String(error),
      payload,
    });
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/creators/revoke", async (req, res) => {
  const { creator } = req.body || {};
  const payload = { creator };
  if (!creator) {
    return res.status(400).json({ error: "creator is required" });
  }

  if (isMock) {
    const txHash = `MOCK-REVOKE-${Date.now()}`;
    await logTx({ action: "revoke_creator", status: "success", txHash, payload });
    return res.json({ txHash });
  }

  try {
    const result = await revokeCreatorApproval({
      creator,
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      adminSecret: ADMIN_SECRET,
      contractId: CONTRACT_ID,
    });
    await logTx({
      action: "revoke_creator",
      status: "success",
      txHash: result.txHash,
      payload,
      rpcResponse: result.rpcResponse,
    });
    res.json({ txHash: result.txHash, rpcResponse: result.rpcResponse });
  } catch (error) {
    await logTx({
      action: "revoke_creator",
      status: "error",
      error: error.message || String(error),
      payload,
    });
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/events/create", async (req, res) => {
  const {
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
  } = req.body || {};

  const numericFields = {
    eventDate: Number(eventDate),
    maxPoaps: Number(maxPoaps),
    claimStart: Number(claimStart),
    claimEnd: Number(claimEnd),
  };

  const payload = {
    creator,
    eventName,
    eventDate: numericFields.eventDate,
    location,
    description,
    maxPoaps: numericFields.maxPoaps,
    claimStart: numericFields.claimStart,
    claimEnd: numericFields.claimEnd,
    metadataUri,
    imageUrl,
  };

  if (
    !creatorSecret ||
    !creator ||
    !eventName ||
    Number.isNaN(numericFields.eventDate) ||
    !location ||
    !description ||
    Number.isNaN(numericFields.maxPoaps) ||
    Number.isNaN(numericFields.claimStart) ||
    Number.isNaN(numericFields.claimEnd) ||
    !metadataUri ||
    !imageUrl
  ) {
    return res.status(400).json({ error: "All event fields are required" });
  }

  if (isMock) {
    const txHash = `MOCK-EVENT-${Date.now()}`;
    await logTx({ action: "create_event", status: "success", txHash, payload });
    return res.json({ txHash });
  }

  try {
    const result = await createEvent({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contractId: CONTRACT_ID,
      creatorSecret,
      creator,
      eventName,
      eventDate: numericFields.eventDate,
      location,
      description,
      maxPoaps: numericFields.maxPoaps,
      claimStart: numericFields.claimStart,
      claimEnd: numericFields.claimEnd,
      metadataUri,
      imageUrl,
    });
    await logTx({
      action: "create_event",
      status: "success",
      txHash: result.txHash,
      payload,
      rpcResponse: result.rpcResponse,
    });
    res.json({ txHash: result.txHash, rpcResponse: result.rpcResponse });
  } catch (error) {
    await logTx({
      action: "create_event",
      status: "error",
      error: error.message || String(error),
      payload,
    });
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/contract/admin", async (_req, res) => {
  if (isMock) {
    return res.json({ admin: "MOCK-ADMIN" });
  }

  try {
    const admin = await getAdminAddress({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contractId: CONTRACT_ID,
      adminSecret: ADMIN_SECRET,
    });
    await logTx({ action: "get_admin", status: "success", payload: { admin } });
    res.json({ admin });
  } catch (error) {
    await logTx({
      action: "get_admin",
      status: "error",
      error: error.message || String(error),
    });
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`SPOT admin backend listening on http://localhost:${PORT}`);
});

