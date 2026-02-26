import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import request from "supertest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

process.env.NODE_ENV = "test";
process.env.MOCK_MODE = process.env.MOCK_MODE || "true";
process.env.PORT = process.env.PORT || "0";

// Tier limit env vars required by tier.js
process.env.TIER_FREE_MAX_SPOTS_PER_EVENT = process.env.TIER_FREE_MAX_SPOTS_PER_EVENT || "100";
process.env.TIER_FREE_MAX_ACTIVE_EVENTS = process.env.TIER_FREE_MAX_ACTIVE_EVENTS || "3";
process.env.TIER_FREE_ALLOWED_METHODS = process.env.TIER_FREE_ALLOWED_METHODS || "qr,link,code";
process.env.TIER_BASIC_MAX_SPOTS_PER_EVENT = process.env.TIER_BASIC_MAX_SPOTS_PER_EVENT || "500";
process.env.TIER_BASIC_MAX_ACTIVE_EVENTS = process.env.TIER_BASIC_MAX_ACTIVE_EVENTS || "10";
process.env.TIER_BASIC_ALLOWED_METHODS = process.env.TIER_BASIC_ALLOWED_METHODS || "qr,link,code,geolocation";
process.env.TIER_PREMIUM_MAX_SPOTS_PER_EVENT = process.env.TIER_PREMIUM_MAX_SPOTS_PER_EVENT || "10000";
process.env.TIER_PREMIUM_MAX_ACTIVE_EVENTS = process.env.TIER_PREMIUM_MAX_ACTIVE_EVENTS || "100";
process.env.TIER_PREMIUM_ALLOWED_METHODS = process.env.TIER_PREMIUM_ALLOWED_METHODS || "qr,link,code,geolocation,nfc";

const { app } = await import("../src/server.js");

const validPayload = {
  creator: "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2",
  eventName: "SuperDuper Test",
  eventDate: 1735689600,
  location: "Bogotá",
  description: "SPOT Demo",
  maxPoaps: 100,
  claimStart: 1735689600,
  claimEnd: 1736294400,
  metadataUri: "https://example.com/metadata.json",
  imageUrl: "https://example.com/image.png",
};

const claimPayload = {
  claimer: "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2",
  eventId: 1,
  payerSecret: "SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W",
};

test("GET /health returns ok", async () => {
  const response = await request(app).get("/health");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { status: "ok" });
});

test("POST /events/create succeeds with valid payload (mock mode)", async () => {
  const response = await request(app).post("/events/create").send(validPayload);

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.txHash);
  assert.match(response.body.txHash, /^MOCK-EVENT-/);
  assert.ok(response.body.signedEnvelope);
  assert.match(response.body.signedEnvelope, /^[A-Za-z0-9+/=]+$/);
  assert.equal(response.body.imageUrl, validPayload.imageUrl);

  assert.ok(response.body.rpcResponse);
  assert.equal(response.body.rpcResponse.status, "MOCK");
});

test("POST /events/create validates missing fields", async () => {
  const { imageUrl, ...partialPayload } = validPayload;
  const response = await request(app).post("/events/create").send(partialPayload);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: "All event fields are required (image file or URL must be provided)",
  });
});

test("POST /events/create accepts multipart upload (mock mode)", async () => {
  const response = await request(app)
    .post("/events/create")
    .field("creator", validPayload.creator)
    .field("eventName", validPayload.eventName)
    .field("eventDate", String(validPayload.eventDate))
    .field("location", validPayload.location)
    .field("description", validPayload.description)
    .field("maxPoaps", String(validPayload.maxPoaps))
    .field("claimStart", String(validPayload.claimStart))
    .field("claimEnd", String(validPayload.claimEnd))
    .field("metadataUri", validPayload.metadataUri)
    .attach("image", Buffer.from("fake-image"), "poster.png");

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.imageUrl);
  // In mock mode MinIO is disabled — server returns a placeholder URL
  assert.match(response.body.imageUrl, /mock-uploads\/poster\.png/);
  assert.ok(response.body.txHash);
  assert.match(response.body.txHash, /^MOCK-EVENT-/);
});

test("POST /events/create rejects invalid JSON", async () => {
  const response = await request(app)
    .post("/events/create")
    .set("Content-Type", "application/json")
    .send('{"eventName":');

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "Invalid JSON payload" });
});

test("POST /events/claim succeeds with valid payload (mock mode)", async () => {
  const response = await request(app).post("/events/claim").send(claimPayload);

  assert.equal(response.statusCode, 200);
  assert.match(response.body.txHash, /^MOCK-CLAIM-/);
  assert.match(response.body.signedEnvelope, /^[A-Za-z0-9+/=]+$/);

  assert.ok(response.body.rpcResponse);
  assert.equal(response.body.rpcResponse.status, "MOCK");
});

test("POST /events/claim validates missing fields", async () => {
  const { claimer, ...partial } = claimPayload;
  const response = await request(app).post("/events/claim").send(partial);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: "claimer and eventId are required",
  });
});

test("GET /contract/event-count returns mock value", async () => {
  const response = await request(app).get("/contract/event-count");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { eventCount: 0 });
});

// --- New unit tests ---

test("POST /creators/approve succeeds with valid payload (mock mode)", async () => {
  const response = await request(app)
    .post("/creators/approve")
    .send({ creator: "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2", paymentReference: "pay-123" });

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.txHash);
  assert.match(response.body.txHash, /^MOCK-APPROVE-/);
  assert.ok(response.body.signedEnvelope);
  assert.match(response.body.signedEnvelope, /^[A-Za-z0-9+/=]+$/);
  assert.ok(response.body.rpcResponse);
  assert.equal(response.body.rpcResponse.status, "MOCK");
});

test("POST /creators/approve rejects missing creator", async () => {
  const response = await request(app)
    .post("/creators/approve")
    .send({ paymentReference: "pay-123" });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "creator and paymentReference are required" });
});

test("POST /creators/approve rejects missing paymentReference", async () => {
  const response = await request(app)
    .post("/creators/approve")
    .send({ creator: "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2" });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "creator and paymentReference are required" });
});

test("POST /creators/revoke succeeds with valid payload (mock mode)", async () => {
  const response = await request(app)
    .post("/creators/revoke")
    .send({ creator: "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2" });

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.txHash);
  assert.match(response.body.txHash, /^MOCK-REVOKE-/);
  assert.ok(response.body.signedEnvelope);
  assert.match(response.body.signedEnvelope, /^[A-Za-z0-9+/=]+$/);
  assert.ok(response.body.rpcResponse);
  assert.equal(response.body.rpcResponse.status, "MOCK");
});

test("POST /creators/revoke rejects missing creator", async () => {
  const response = await request(app)
    .post("/creators/revoke")
    .send({});

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "creator is required" });
});

test("GET /events/onchain returns empty array (mock mode)", async () => {
  const response = await request(app).get("/events/onchain");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { events: [] });
});

test("GET /events/onchain?creator=X returns empty array (mock mode)", async () => {
  const response = await request(app).get("/events/onchain?creator=GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { events: [] });
});

test("GET /claimers/:claimer/events returns empty array (mock mode)", async () => {
  const response = await request(app).get("/claimers/GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2/events");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { events: [] });
});

test("GET /events/:eventId/minted-count returns 0 (mock mode)", async () => {
  const response = await request(app).get("/events/1/minted-count");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { mintedCount: 0 });
});

test("GET /events/:eventId/minted-count rejects invalid eventId", async () => {
  const response = await request(app).get("/events/abc/minted-count");

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "Invalid eventId" });
});

test("GET /contract/admin returns mock admin (mock mode)", async () => {
  const response = await request(app).get("/contract/admin");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { admin: "MOCK-ADMIN" });
});

test("POST /events/create rejects empty body", async () => {
  const response = await request(app).post("/events/create").send({});

  assert.equal(response.statusCode, 400);
  assert.ok(response.body.error);
});

test("POST /events/claim rejects non-numeric eventId", async () => {
  const response = await request(app)
    .post("/events/claim")
    .send({ claimer: "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2", eventId: "abc" });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "claimer and eventId are required" });
});

// --- Tier & Visibility tests ---

test("POST /events/create defaults tier=FREE and visibility=PUBLIC (mock mode)", async () => {
  const response = await request(app).post("/events/create").send(validPayload);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.tier, "FREE");
  assert.equal(response.body.visibility, "PUBLIC");
});

test("POST /events/create ignores client-sent tier and defaults to FREE (mock mode)", async () => {
  const response = await request(app)
    .post("/events/create")
    .send({ ...validPayload, tier: "PREMIUM", visibility: "PRIVATE" });

  assert.equal(response.statusCode, 200);
  // In mock mode creator has no DB record → tier defaults to FREE
  assert.equal(response.body.tier, "FREE");
  assert.equal(response.body.visibility, "PRIVATE");
});

test("POST /events/create rejects invalid visibility", async () => {
  const response = await request(app)
    .post("/events/create")
    .send({ ...validPayload, visibility: "HIDDEN" });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /Invalid visibility/);
});

test("GET /events/:eventId returns event null (mock mode)", async () => {
  const response = await request(app).get("/events/1");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { event: null });
});

// --- Tier limits & Creator profile tests ---

test("GET /tier-limits returns all three tiers with correct structure", async () => {
  const response = await request(app).get("/tier-limits");

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.limits);
  for (const tier of ["FREE", "BASIC", "PREMIUM"]) {
    const t = response.body.limits[tier];
    assert.ok(t, `Missing tier ${tier}`);
    assert.equal(typeof t.maxSpotsPerEvent, "number");
    assert.equal(typeof t.maxActiveEvents, "number");
    assert.ok(Array.isArray(t.allowedMethods));
  }
  assert.equal(response.body.limits.FREE.maxSpotsPerEvent, 100);
  assert.equal(response.body.limits.BASIC.maxSpotsPerEvent, 500);
  assert.equal(response.body.limits.PREMIUM.maxSpotsPerEvent, 10000);
});

test("GET /creators/:address returns FREE profile for unknown address (mock mode)", async () => {
  const response = await request(app).get("/creators/GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2");

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.creator);
  assert.equal(response.body.creator.tier, "FREE");
  assert.equal(response.body.creator.status, null);
  assert.ok(response.body.creator.limits);
  assert.equal(response.body.creator.limits.maxSpotsPerEvent, 100);
});

test("POST /events/create rejects maxPoaps exceeding tier limit (mock mode)", async () => {
  const response = await request(app)
    .post("/events/create")
    .send({ ...validPayload, maxPoaps: 999 });

  assert.equal(response.statusCode, 403);
  assert.match(response.body.error, /allows max 100 SPOTs/);
});

test("POST /events/create succeeds at exact tier limit boundary (mock mode)", async () => {
  // FREE tier allows exactly 100 SPOTs — should pass
  const response = await request(app)
    .post("/events/create")
    .send({ ...validPayload, maxPoaps: 100 });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.tier, "FREE");
});

test("POST /events/create rejects maxPoaps just above tier limit (mock mode)", async () => {
  const response = await request(app)
    .post("/events/create")
    .send({ ...validPayload, maxPoaps: 101 });

  assert.equal(response.statusCode, 403);
  assert.match(response.body.error, /allows max 100 SPOTs/);
  assert.match(response.body.error, /Requested: 101/);
});

test("GET /tier-limits returns correct allowed methods per tier", async () => {
  const response = await request(app).get("/tier-limits");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.limits.FREE.allowedMethods, ["qr", "link", "code"]);
  assert.deepEqual(response.body.limits.BASIC.allowedMethods, ["qr", "link", "code", "geolocation"]);
  assert.deepEqual(response.body.limits.PREMIUM.allowedMethods, ["qr", "link", "code", "geolocation", "nfc"]);
});

test("GET /tier-limits returns correct maxActiveEvents per tier", async () => {
  const response = await request(app).get("/tier-limits");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.limits.FREE.maxActiveEvents, 3);
  assert.equal(response.body.limits.BASIC.maxActiveEvents, 10);
  assert.equal(response.body.limits.PREMIUM.maxActiveEvents, 100);
});

test("GET /creators/:address returns limits matching FREE tier config", async () => {
  const response = await request(app).get("/creators/GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2");

  assert.equal(response.statusCode, 200);
  const { limits } = response.body.creator;
  assert.equal(limits.maxSpotsPerEvent, 100);
  assert.equal(limits.maxActiveEvents, 3);
  assert.deepEqual(limits.allowedMethods, ["qr", "link", "code"]);
});

test("GET /creators/:address returns address in response", async () => {
  const addr = "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2";
  const response = await request(app).get(`/creators/${addr}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.creator.address, addr);
});

test("POST /creators/approve accepts optional tier param (mock mode)", async () => {
  const response = await request(app)
    .post("/creators/approve")
    .send({
      creator: "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2",
      paymentReference: "pay-456",
      tier: "PREMIUM",
    });

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.txHash);
  assert.match(response.body.txHash, /^MOCK-APPROVE-/);
});

test("POST /creators/approve rejects invalid tier param", async () => {
  const response = await request(app)
    .post("/creators/approve")
    .send({
      creator: "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2",
      paymentReference: "pay-789",
      tier: "GOLD",
    });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /Invalid tier/);
});

test("POST /events/create auto-assigns tier in response (mock mode)", async () => {
  const response = await request(app).post("/events/create").send(validPayload);

  assert.equal(response.statusCode, 200);
  // tier must be a valid tier string, auto-set from creator's account
  assert.ok(["FREE", "BASIC", "PREMIUM"].includes(response.body.tier));
});
