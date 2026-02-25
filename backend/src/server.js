import express from "express";
import dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";
import fs from "fs";
import os from "os";
import path from "path";
import cors from "cors";
import multer from "multer";
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
  hasClaimedEvent,
  getUserPoapTokenId,
} from "./soroban.js";
import { ensureBucket } from "./lib/minio.js";
import {
  createEventRecord,
  createClaimRecord,
  incrementMintedCount,
  upsertCreatorApproval,
  revokeCreator as revokeCreatorDb,
  logTransaction,
  getAllEvents,
  getClaimerEvents,
  getCachedMintedCount,
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  joinCommunity as joinCommunityDb,
  leaveCommunity as leaveCommunityDb,
  getEventsByCommunity,
} from "./services/db.js";
import { uploadImage } from "./services/storage.js";

// Cargar variables de entorno
dotenv.config();

// BigInt JSON serialization support
BigInt.prototype.toJSON = function () {
  return Number(this);
};

// Definición de variables globales
const {
  PORT,
  RPC_URL,
  NETWORK_PASSPHRASE,
  ADMIN_SECRET,
  CLAIM_PAYER_SECRET,
  SPOT_CONTRACT_ID,
  MOCK_MODE = "false",
} = process.env;

const isTestEnv = process.env.NODE_ENV === "test";
const isMock = MOCK_MODE.toLowerCase() === "true";
const CONTRACT_ID = SPOT_CONTRACT_ID;
const CLAIM_SIGNER_SECRET = CLAIM_PAYER_SECRET;
let ADMIN_PUBLIC_KEY;

// Multer temp directory for uploads (files go to MinIO, temp is just a staging area)
const uploadsDir = path.join(os.tmpdir(), "spot-uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn("Failed to create temp uploads directory:", e);
}

const uploadSizeLimit = Number(process.env.UPLOAD_MAX_BYTES) || 5 * 1024 * 1024;

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: uploadSizeLimit },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image"));
    } else {
      cb(null, true);
    }
  },
});

async function logTx(entry) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${entry.action}`;
  
  if (entry.status === "success") {
    console.log(`${prefix} success${entry.txHash ? ` tx=${entry.txHash}` : ""}`);
    if(entry.payload) {
        // Imprimir payload de forma segura
        try {
            console.log(JSON.stringify(entry.payload));
        } catch (e) { /* ignorar error de circular json */ }
    }
  } else {
    console.error(`${prefix} error: ${entry.error}`);
  }
}

// Validación de credenciales
if (!isMock) {
  if (!RPC_URL || !NETWORK_PASSPHRASE || !ADMIN_SECRET || !CONTRACT_ID) {
    console.error("ADVERTENCIA CRÍTICA: Faltan variables de entorno. El servidor podría fallar.");
  }

  try {
    if (ADMIN_SECRET) {
        ADMIN_PUBLIC_KEY = Keypair.fromSecret(ADMIN_SECRET).publicKey();
    }
  } catch (error) {
    console.error(`Invalid ADMIN_SECRET provided: ${error.message}`);
  }

  try {
    if (CLAIM_SIGNER_SECRET) {
        Keypair.fromSecret(CLAIM_SIGNER_SECRET);
    }
  } catch (error) {
    console.error(`Invalid CLAIM_PAYER_SECRET provided: ${error.message}`);
  }
} else {
  console.warn("[MOCK_MODE] Running backend without hitting Soroban RPC.");
}

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",  // default to allow all if not set
  }),
);

// Manejo de errores de Multer y JSON
app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Image upload exceeded size limit" });
    }
    console.error("Multer error", err.message);
    return res.status(400).json({ error: `Image upload failed: ${err.message}` });
  }
  if (err instanceof SyntaxError && "body" in err) {
    console.error("Invalid JSON payload", err.message);
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  next(err);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- ENDPOINTS ---

// Communities
app.get("/communities", async (_req, res) => {
  if (isMock) return res.json({ communities: [] });
  try {
    const communities = await getAllCommunities();
    res.json({ communities: communities ?? [] });
  } catch (error) {
    console.error("Error fetching communities:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/communities/:id", async (req, res) => {
  if (isMock) return res.json({ community: null });
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid community id" });
  }
  try {
    const community = await getCommunityById(id);
    if (!community) return res.status(404).json({ error: "Community not found" });
    res.json({ community });
  } catch (error) {
    console.error("Error fetching community:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/communities", async (req, res) => {
  if (isMock) return res.json({ community: null });
  const { name, country, description, imageUrl, creatorAddress } = req.body || {};
  if (!name || !country || !description || !imageUrl || !creatorAddress) {
    return res.status(400).json({ error: "name, country, description, imageUrl, creatorAddress are required" });
  }
  try {
    const community = await createCommunity({
      name,
      country,
      description,
      imageUrl,
      creatorAddress,
    });
    res.json({ community });
  } catch (error) {
    console.error("Error creating community:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/communities/:id/join", async (req, res) => {
  if (isMock) return res.json({ ok: true });
  const id = Number(req.params.id);
  const { address } = req.body || {};
  if (Number.isNaN(id) || !address) {
    return res.status(400).json({ error: "community id and address are required" });
  }
  try {
    await joinCommunityDb({ communityId: id, address });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error joining community:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/communities/:id/leave", async (req, res) => {
  if (isMock) return res.json({ ok: true });
  const id = Number(req.params.id);
  const { address } = req.body || {};
  if (Number.isNaN(id) || !address) {
    return res.status(400).json({ error: "community id and address are required" });
  }
  try {
    await leaveCommunityDb({ communityId: id, address });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error leaving community:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.patch("/communities/:id", async (req, res) => {
  if (isMock) return res.json({ community: null });
  const id = Number(req.params.id);
  const { creatorAddress, name, country, description, imageUrl } = req.body || {};
  if (Number.isNaN(id) || !creatorAddress) {
    return res.status(400).json({ error: "community id and creatorAddress are required" });
  }
  try {
    const updated = await updateCommunity({
      id,
      creatorAddress,
      data: {
        ...(name ? { name } : {}),
        ...(country ? { country } : {}),
        ...(description ? { description } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      },
    });
    if (!updated) {
      return res.status(403).json({ error: "Not authorized to edit this community" });
    }
    res.json({ community: updated });
  } catch (error) {
    console.error("Error updating community:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/communities/:id/events", async (req, res) => {
  if (isMock) return res.json({ events: [] });
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid community id" });
  }
  try {
    const events = await getEventsByCommunity(id);
    const normalized = (events ?? []).map((e) => ({
      eventId: e.eventId,
      name: e.eventName,
      date: e.eventDate,
      location: e.location,
      description: e.description,
      maxSpots: e.maxPoaps,
      claimStart: e.claimStart,
      claimEnd: e.claimEnd,
      metadataUri: e.metadataUri,
      imageUrl: e.imageUrl,
      creator: e.creator,
      communityId: e.communityId ?? undefined,
      mintedCount: e.mintedCount,
    }));
    res.json({ events: normalized });
  } catch (error) {
    console.error("Error fetching community events:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/creators/approve", async (req, res) => {
  const { creator, paymentReference } = req.body || {};
  const payload = { creator, paymentReference };
  
  if (!creator || !paymentReference) {
    return res.status(400).json({ error: "creator and paymentReference are required" });
  }

  if (isMock) {
    const txHash = `MOCK-APPROVE-${Date.now()}`;
    const signedEnvelope = Buffer.from(`MOCK-APPROVE-ENVELOPE-${Date.now()}`).toString("base64");
    await logTx({ action: "approve_creator", status: "success", txHash, payload, signedEnvelope });
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
    await logTx({ action: "approve_creator", status: "success", txHash: result.txHash, payload, rpcResponse: result.rpcResponse, signedEnvelope: result.envelopeXdr });

    try {
      await upsertCreatorApproval({ address: creator, paymentReference, txHash: result.txHash });
      await logTransaction({ action: "approve_creator", status: "success", txHash: result.txHash, payload });
    } catch (dbErr) {
      console.warn("DB write failed (approve_creator), data will reconcile:", dbErr.message);
    }

    res.json({ txHash: result.txHash, rpcResponse: result.rpcResponse, signedEnvelope: result.envelopeXdr });
  } catch (error) {
    await logTx({ action: "approve_creator", status: "error", error: error.message || String(error), payload });
    try { await logTransaction({ action: "approve_creator", status: "error", error: error.message || String(error), payload }); } catch (_) {}
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
    await logTx({ action: "revoke_creator", status: "success", txHash, payload, signedEnvelope });
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
    await logTx({ action: "revoke_creator", status: "success", txHash: result.txHash, payload, rpcResponse: result.rpcResponse, signedEnvelope: result.envelopeXdr });

    try {
      await revokeCreatorDb({ address: creator, txHash: result.txHash });
      await logTransaction({ action: "revoke_creator", status: "success", txHash: result.txHash, payload });
    } catch (dbErr) {
      console.warn("DB write failed (revoke_creator), data will reconcile:", dbErr.message);
    }

    res.json({ txHash: result.txHash, rpcResponse: result.rpcResponse, signedEnvelope: result.envelopeXdr });
  } catch (error) {
    await logTx({ action: "revoke_creator", status: "error", error: error.message || String(error), payload });
    try { await logTransaction({ action: "revoke_creator", status: "error", error: error.message || String(error), payload }); } catch (_) {}
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/events/create", upload.single("image"), async (req, res) => {
  const {
    creator,
    communityId,
    eventName,
    eventDate,
    location,
    description,
    maxPoaps,
    claimStart,
    claimEnd,
    metadataUri,
    imageUrl: imageUrlField,
  } = req.body || {};

  const numericFields = {
    eventDate: Number(eventDate),
    maxPoaps: Number(maxPoaps),
    claimStart: Number(claimStart),
    claimEnd: Number(claimEnd),
  };
  const parsedCommunityId =
    communityId !== undefined && communityId !== null && communityId !== ""
      ? Number(communityId)
      : undefined;
  if (parsedCommunityId !== undefined && Number.isNaN(parsedCommunityId)) {
    return res.status(400).json({ error: "Invalid communityId" });
  }

  const payload = {
    creator,
    communityId: parsedCommunityId,
    eventName,
    eventDate: numericFields.eventDate,
    location,
    description,
    maxPoaps: numericFields.maxPoaps,
    claimStart: numericFields.claimStart,
    claimEnd: numericFields.claimEnd,
    metadataUri,
    imageUrl: undefined,
    operator: isMock ? "mock-admin" : ADMIN_PUBLIC_KEY,
  };

  let finalImageUrl = (imageUrlField || "").toString().trim();
  let imageId = null;

  // Upload to MinIO if file provided
  if (req.file) {
    try {
      const minioResult = await uploadImage(req.file);
      if (minioResult) {
        finalImageUrl = minioResult.publicUrl;
        imageId = minioResult.imageId;
      }
    } catch (uploadErr) {
      console.error("MinIO upload failed:", uploadErr.message);
      return res.status(500).json({ error: "Image upload failed" });
    }
  }

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
    !finalImageUrl
  ) {
    return res.status(400).json({ error: "All event fields are required (image file or URL must be provided)" });
  }

  payload.imageUrl = finalImageUrl;

  if (isMock) {
    const txHash = `MOCK-EVENT-${Date.now()}`;
    const signedEnvelope = Buffer.from(`MOCK-EVENT-ENVELOPE-${Date.now()}`).toString("base64");
    await logTx({ action: "create_event", status: "success", txHash, payload, signedEnvelope });
    return res.json({ txHash, signedEnvelope, rpcResponse: { status: "MOCK" }, imageUrl: finalImageUrl });
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
      imageUrl: finalImageUrl,
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

    await logTx({ action: "create_event", status: "success", txHash: result.txHash, payload: { ...payload, eventId }, rpcResponse: result.rpcResponse, signedEnvelope: result.envelopeXdr });

    // Write to DB after successful on-chain tx
    if (eventId != null) {
      try {
        await createEventRecord({
          eventId,
          creator,
          communityId: parsedCommunityId,
          eventName,
          eventDate: numericFields.eventDate,
          location,
          description,
          maxPoaps: numericFields.maxPoaps,
          claimStart: numericFields.claimStart,
          claimEnd: numericFields.claimEnd,
          metadataUri,
          imageUrl: finalImageUrl,
          txHash: result.txHash,
          imageId,
        });
        await logTransaction({ action: "create_event", status: "success", txHash: result.txHash, payload: { ...payload, eventId } });
      } catch (dbErr) {
        console.warn("DB write failed (create_event), data will reconcile:", dbErr.message);
      }
    }

    res.json({ txHash: result.txHash, rpcResponse: result.rpcResponse, signedEnvelope: result.envelopeXdr, eventId, imageUrl: finalImageUrl });
  } catch (error) {
    await logTx({ action: "create_event", status: "error", error: error.message || String(error), payload });
    try { await logTransaction({ action: "create_event", status: "error", error: error.message || String(error), payload }); } catch (_) {}
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/events/:eventId/minted-count", async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (Number.isNaN(eventId)) {
    return res.status(400).json({ error: "Invalid eventId" });
  }

  if (isMock) return res.json({ mintedCount: 0 });

  // Try DB cache first
  try {
    const cached = await getCachedMintedCount(eventId);
    if (cached != null) {
      return res.json({ mintedCount: cached });
    }
  } catch (dbErr) {
    console.warn("DB read failed (minted-count), falling back to RPC:", dbErr.message);
  }

  if (!ADMIN_SECRET) return res.status(500).json({ error: "Admin credentials not configured" });

  try {
    const mintedCount = await getMintedCount({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contractId: CONTRACT_ID,
      adminSecret: ADMIN_SECRET,
      eventId,
    });
    res.json({ mintedCount });
  } catch (error) {
    console.error("Error fetching minted count:", error);
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
    await logTx({ action: "claim_poap", status: "success", txHash, payload, signedEnvelope });
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
    await logTx({ action: "claim_poap", status: "success", txHash: result.txHash, payload, rpcResponse: result.rpcResponse, signedEnvelope: result.envelopeXdr });

    try {
      await createClaimRecord({ eventId: numericEventId, claimer, txHash: result.txHash });
      await incrementMintedCount(numericEventId);
      await logTransaction({ action: "claim_poap", status: "success", txHash: result.txHash, payload });
    } catch (dbErr) {
      console.warn("DB write failed (claim_poap), data will reconcile:", dbErr.message);
    }

    res.json({ txHash: result.txHash, rpcResponse: result.rpcResponse, signedEnvelope: result.envelopeXdr });
  } catch (error) {
    await logTx({ action: "claim_poap", status: "error", error: error.message || String(error), payload });
    try { await logTransaction({ action: "claim_poap", status: "error", error: error.message || String(error), payload }); } catch (_) {}
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/contract/admin", async (_req, res) => {
  if (isMock) return res.json({ admin: "MOCK-ADMIN" });

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
    await logTx({ action: "get_admin", status: "error", error: error.message || String(error) });
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/contract/event-count", async (_req, res) => {
  if (isMock) return res.json({ eventCount: 0 });

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
    await logTx({ action: "get_event_count", status: "error", error: error.message || String(error) });
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/events/onchain", async (req, res) => {
  if (isMock) return res.json({ events: [] });

  const creatorFilter = (req.query.creator || "").toString().trim();
  const forceRpcRaw =
    req.query.forceRpc ??
    req.query.forceRPC ??
    req.query.source ??
    req.query.refresh;
  const forceRpc = ["true", "1", "rpc", "chain"].includes(
    (forceRpcRaw || "").toString().toLowerCase(),
  );

  // Try DB first
  if (!forceRpc) {
    try {
      const dbEvents = await getAllEvents({
        creator: creatorFilter || undefined,
      });
      if (dbEvents && dbEvents.length > 0) {
        const events = dbEvents.map((e) => ({
          eventId: e.eventId,
          name: e.eventName,
          date: e.eventDate,
          location: e.location,
          description: e.description,
          maxSpots: e.maxPoaps,
          claimStart: e.claimStart,
          claimEnd: e.claimEnd,
          metadataUri: e.metadataUri,
          imageUrl: e.imageUrl,
          creator: e.creator,
          communityId: e.communityId ?? undefined,
          mintedCount: e.mintedCount,
        }));
        return res.json({ events });
      }
    } catch (dbErr) {
      console.warn("DB read failed (events/onchain), falling back to RPC:", dbErr.message);
    }
  }

  // Fallback to RPC
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

        if (creatorFilter && details.creator.toLowerCase() !== creatorFilter.toLowerCase()) {
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
        console.error(`Failed to fetch on-chain data for event ${eventId}:`, innerError);
      }
    }
    res.json({ events });
  } catch (error) {
    console.error("Error fetching on-chain events:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/claimers/:claimer/events", async (req, res) => {
  const claimer = (req.params.claimer || "").toString().trim();
  if (!claimer) return res.status(400).json({ error: "claimer is required" });
  if (isMock) return res.json({ events: [] });

  // Try DB first
  try {
    const dbEvents = await getClaimerEvents(claimer);
    if (dbEvents && dbEvents.length > 0) {
      const events = dbEvents.map((e) => ({
        eventId: e.eventId,
        name: e.eventName,
        date: e.eventDate,
        location: e.location,
        description: e.description,
        maxSpots: e.maxPoaps,
        claimStart: e.claimStart,
        claimEnd: e.claimEnd,
        metadataUri: e.metadataUri,
        imageUrl: e.imageUrl,
        creator: e.creator,
        communityId: e.communityId ?? undefined,
        mintedCount: e.mintedCount,
        tokenId: e.tokenId,
      }));
      return res.json({ events });
    }
  } catch (dbErr) {
    console.warn("DB read failed (claimer events), falling back to RPC:", dbErr.message);
  }

  // Fallback to RPC
  if (!ADMIN_SECRET) return res.status(500).json({ error: "Admin credentials not configured" });

  try {
    const eventIds = await getAllEventIds({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contractId: CONTRACT_ID,
      adminSecret: ADMIN_SECRET,
    });

    const claimedEvents = [];
    for (const eventId of eventIds) {
      try {
        const hasClaimed = await hasClaimedEvent({
          rpcUrl: RPC_URL,
          networkPassphrase: NETWORK_PASSPHRASE,
          contractId: CONTRACT_ID,
          adminSecret: ADMIN_SECRET,
          claimer,
          eventId,
        });

        if (!hasClaimed) continue;

        const [details, mintedCount, tokenId] = await Promise.all([
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
          getUserPoapTokenId({
            rpcUrl: RPC_URL,
            networkPassphrase: NETWORK_PASSPHRASE,
            contractId: CONTRACT_ID,
            adminSecret: ADMIN_SECRET,
            claimer,
            eventId,
          }).catch((tokenError) => {
            console.warn(`Unable to fetch tokenId for event ${eventId} and claimer ${claimer}:`, tokenError.message || tokenError);
            return undefined;
          }),
        ]);

        claimedEvents.push({
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
          communityId: undefined,
          mintedCount,
          tokenId,
        });
      } catch (eventError) {
        console.error(`Failed to resolve claimed event ${eventId} for claimer ${claimer}:`, eventError);
      }
    }
    res.json({ events: claimedEvents });
  } catch (error) {
    console.error("Error fetching claimed events:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

function normalizePort(value) {
  const portNumber = Number(value);
  if (!portNumber || Number.isNaN(portNumber)) {
    throw new Error("PORT env var is required and must be a number");
  }
  return portNumber;
}

export function startServer(customPort) {
  const port = normalizePort(typeof customPort !== "undefined" ? customPort : PORT);

  // Initialize MinIO bucket (non-blocking)
  ensureBucket().catch((err) => {
    console.warn("MinIO bucket init failed (will retry on first upload):", err.message);
  });

  // Escuchar en 0.0.0.0 es vital para Docker/Cloud Run
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`SPOT admin backend listening on port ${port} 🚀`);
  });
  return server;
}

// Arranca el server si no es test
if (!isTestEnv) {
  startServer();
}

export { app };
