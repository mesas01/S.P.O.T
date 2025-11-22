import express from "express";
import dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import {
  approveCreator,
  revokeCreatorApproval,
  createEvent,
  getAdminAddress,
  claimPoap,
  getEventCount,
  getAllEventIds,
  getEventDetails,
  getMintedCount,
} from "./soroban.js";

dotenv.config({ path: process.env.ENV_PATH || undefined });

const {
  PORT = 4000,
  RPC_URL,
  NETWORK_PASSPHRASE,
  ADMIN_SECRET,
  CLAIM_PAYER_SECRET,
  SPOT_CONTRACT_ID,
  MOCK_MODE = "false",
  LOG_FILE,
} = process.env;

const isTestEnv = process.env.NODE_ENV === "test";
const isMock = MOCK_MODE.toLowerCase() === "true";
const CONTRACT_ID = SPOT_CONTRACT_ID;
const CLAIM_SIGNER_SECRET = CLAIM_PAYER_SECRET || ADMIN_SECRET;
let ADMIN_PUBLIC_KEY;
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
    ADMIN_PUBLIC_KEY = Keypair.fromSecret(ADMIN_SECRET).publicKey();
  } catch (error) {
    throw new Error(`Invalid ADMIN_SECRET provided: ${error.message}`);
  }

  try {
    Keypair.fromSecret(CLAIM_SIGNER_SECRET);
  } catch (error) {
    throw new Error(`Invalid CLAIM_PAYER_SECRET provided: ${error.message}`);
  }
} else {
  console.warn("[MOCK_MODE] Running backend without hitting Soroban RPC.");
}

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  }),
);

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
    const signedEnvelope = Buffer.from(`MOCK-APPROVE-ENVELOPE-${Date.now()}`).toString("base64");
    await logTx({
      action: "approve_creator",
      status: "success",
      txHash,
      payload,
      signedEnvelope,
    });
    return res.json({ txHash, signedEnvelope, rpcResponse: { status: "MOCK" } });
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
      signedEnvelope: result.envelopeXdr,
    });
    res.json({
      txHash: result.txHash,
      rpcResponse: result.rpcResponse,
      signedEnvelope: result.envelopeXdr,
    });
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
    const signedEnvelope = Buffer.from(`MOCK-REVOKE-ENVELOPE-${Date.now()}`).toString("base64");
    await logTx({
      action: "revoke_creator",
      status: "success",
      txHash,
      payload,
      signedEnvelope,
    });
    return res.json({ txHash, signedEnvelope, rpcResponse: { status: "MOCK" } });
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
      signedEnvelope: result.envelopeXdr,
    });
    res.json({
      txHash: result.txHash,
      rpcResponse: result.rpcResponse,
      signedEnvelope: result.envelopeXdr,
    });
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
    operator: isMock ? "mock-admin" : ADMIN_PUBLIC_KEY,
  };

  if (
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
    const signedEnvelope = Buffer.from(`MOCK-EVENT-ENVELOPE-${Date.now()}`).toString("base64");
    await logTx({
      action: "create_event",
      status: "success",
      txHash,
      payload,
      signedEnvelope,
    });
    return res.json({ txHash, signedEnvelope, rpcResponse: { status: "MOCK" } });
  }

  try {
    if (!ADMIN_SECRET || !ADMIN_PUBLIC_KEY) {
      return res.status(500).json({ error: "Admin credentials not configured" });
    }

    const result = await createEvent({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contractId: CONTRACT_ID,
      signerSecret: ADMIN_SECRET,
      creator: ADMIN_PUBLIC_KEY,
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
    let eventId;
    try {
      eventId = await getEventCount({
        rpcUrl: RPC_URL,
        networkPassphrase: NETWORK_PASSPHRASE,
        contractId: CONTRACT_ID,
        adminSecret: ADMIN_SECRET,
      });
    } catch (countError) {
      console.warn("Unable to fetch event count after creation:", countError);
    }
    await logTx({
      action: "create_event",
      status: "success",
      txHash: result.txHash,
      payload: { ...payload, eventId },
      rpcResponse: result.rpcResponse,
      signedEnvelope: result.envelopeXdr,
    });
    res.json({
      txHash: result.txHash,
      rpcResponse: result.rpcResponse,
      signedEnvelope: result.envelopeXdr,
      eventId,
    });
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

app.post("/events/claim", async (req, res) => {
  const { claimer, eventId, payerSecret: overridePayerSecret } = req.body || {};
  const numericEventId = Number(eventId);
  const payload = { claimer, eventId: numericEventId };
  const payerSecret = overridePayerSecret || CLAIM_SIGNER_SECRET;

  if (!claimer || Number.isNaN(numericEventId)) {
    return res.status(400).json({ error: "claimer and eventId are required" });
  }

  if (isMock) {
    const txHash = `MOCK-CLAIM-${Date.now()}`;
    const signedEnvelope = Buffer.from(`MOCK-CLAIM-ENVELOPE-${Date.now()}`).toString("base64");
    await logTx({
      action: "claim_poap",
      status: "success",
      txHash,
      payload,
      signedEnvelope,
    });
    return res.json({ txHash, signedEnvelope, rpcResponse: { status: "MOCK" } });
  }

  if (!payerSecret) {
    return res.status(500).json({ error: "claim payer secret not configured" });
  }

  try {
    const result = await claimPoap({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contractId: CONTRACT_ID,
      payerSecret,
      claimer,
      eventId: numericEventId,
    });
    await logTx({
      action: "claim_poap",
      status: "success",
      txHash: result.txHash,
      payload,
      rpcResponse: result.rpcResponse,
      signedEnvelope: result.envelopeXdr,
    });
    res.json({
      txHash: result.txHash,
      rpcResponse: result.rpcResponse,
      signedEnvelope: result.envelopeXdr,
    });
  } catch (error) {
    await logTx({
      action: "claim_poap",
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

app.get("/contract/event-count", async (_req, res) => {
  if (isMock) {
    return res.json({ eventCount: 0 });
  }

  try {
    const eventCount = await getEventCount({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contractId: CONTRACT_ID,
      adminSecret: ADMIN_SECRET,
    });
    await logTx({ action: "get_event_count", status: "success", payload: { eventCount } });
    res.json({ eventCount });
  } catch (error) {
    await logTx({
      action: "get_event_count",
      status: "error",
      error: error.message || String(error),
    });
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/events/onchain", async (req, res) => {
  if (isMock) {
    return res.json({ events: [] });
  }

  const creatorFilter = (req.query.creator || "").toString().toLowerCase();

  try {
    const eventIds = await getAllEventIds({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contractId: CONTRACT_ID,
      adminSecret: ADMIN_SECRET,
    });

    const events = [];
    for (const eventId of eventIds) {
      try {
        const [details, mintedCount] = await Promise.all([
          getEventDetails({
            rpcUrl: RPC_URL,
            networkPassphrase: NETWORK_PASSPHRASE,
            contractId: CONTRACT_ID,
            adminSecret: ADMIN_SECRET,
            eventId,
          }),
          getMintedCount({
            rpcUrl: RPC_URL,
            networkPassphrase: NETWORK_PASSPHRASE,
            contractId: CONTRACT_ID,
            adminSecret: ADMIN_SECRET,
            eventId,
          }),
        ]);

        if (
          creatorFilter &&
          details.creator.toLowerCase() !== creatorFilter
        ) {
          continue;
        }

        events.push({
          eventId: details.eventId,
          name: details.eventName,
          date: details.eventDate,
          location: details.location,
          description: details.description,
          maxSpots: details.maxPoaps,
          claimStart: details.claimStart,
          claimEnd: details.claimEnd,
          metadataUri: details.metadataUri,
          imageUrl: details.imageUrl,
          creator: details.creator,
          mintedCount,
        });
      } catch (innerError) {
        console.error(
          `Failed to fetch on-chain data for event ${eventId}:`,
          innerError,
        );
      }
    }

    res.json({ events });
  } catch (error) {
    console.error("Error fetching on-chain events:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

function normalizePort(value) {
  const portNumber = Number(value);
  if (Number.isNaN(portNumber)) {
    return 4000;
  }
  return portNumber;
}

export function startServer(customPort) {
  const port = normalizePort(
    typeof customPort !== "undefined" ? customPort : PORT
  );
  const server = app.listen(port, () => {
    console.log(`SPOT admin backend listening on http://localhost:${server.address().port}`);
  });
  return server;
}

if (!isTestEnv) {
  startServer();
}

export { app };

