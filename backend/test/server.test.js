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

test("POST /events/create accepts multipart upload and stores image", async () => {
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
  assert.match(response.body.imageUrl, /\/uploads\//);

  const uploadedUrl = new URL(response.body.imageUrl);
  const filename = uploadedUrl.pathname.split("/").pop();
  assert.ok(filename);
  const storedFilePath = path.join(UPLOADS_DIR, filename);
  const fileExists = await fs
    .access(storedFilePath)
    .then(() => true)
    .catch(() => false);
  assert.equal(fileExists, true);
  await fs.rm(storedFilePath, { force: true });
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
