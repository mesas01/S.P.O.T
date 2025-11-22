import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import request from "supertest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, "..", "logs", "backend.test.log");

process.env.NODE_ENV = "test";
process.env.MOCK_MODE = process.env.MOCK_MODE || "true";
process.env.LOG_FILE = LOG_FILE;
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

async function readLogEntries() {
  try {
    const contents = await fs.readFile(LOG_FILE, "utf8");
    return contents
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

test.beforeEach(async () => {
  await fs.rm(LOG_FILE, { force: true });
});

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

  const entries = await readLogEntries();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].action, "create_event");
  assert.equal(entries[0].status, "success");
  assert.equal(entries[0].payload.eventName, validPayload.eventName);
  assert.equal(entries[0].signedEnvelope, response.body.signedEnvelope);
});

test("POST /events/create validates missing fields", async () => {
  const { imageUrl, ...partialPayload } = validPayload;
  const response = await request(app).post("/events/create").send(partialPayload);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "All event fields are required" });

  const entries = await readLogEntries();
  assert.equal(entries.length, 0);
});

test("POST /events/create rejects invalid JSON", async () => {
  const response = await request(app)
    .post("/events/create")
    .set("Content-Type", "application/json")
    .send('{"eventName":');

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "Invalid JSON payload" });

  const entries = await readLogEntries();
  assert.equal(entries.length, 0);
});

test("POST /events/claim succeeds with valid payload (mock mode)", async () => {
  const response = await request(app).post("/events/claim").send(claimPayload);

  assert.equal(response.statusCode, 200);
  assert.match(response.body.txHash, /^MOCK-CLAIM-/);
  assert.match(response.body.signedEnvelope, /^[A-Za-z0-9+/=]+$/);

  const entries = await readLogEntries();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].action, "claim_poap");
  assert.equal(entries[0].payload.eventId, claimPayload.eventId);
});

test("POST /events/claim validates missing fields", async () => {
  const { claimer, ...partial } = claimPayload;
  const response = await request(app).post("/events/claim").send(partial);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: "claimer and eventId are required",
  });

  const entries = await readLogEntries();
  assert.equal(entries.length, 0);
});

test("GET /contract/event-count returns mock value", async () => {
  const response = await request(app).get("/contract/event-count");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { eventCount: 0 });
});

