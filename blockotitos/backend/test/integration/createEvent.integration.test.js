import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";

dotenv.config({ path: process.env.ENV_PATH || undefined });

const integrationEnabled = process.env.RUN_INTEGRATION_TESTS === "true";

let serverModule;
let skipReason = integrationEnabled
  ? undefined
  : "Set RUN_INTEGRATION_TESTS=true to enable integration tests.";

if (!skipReason) {
  try {
    serverModule = await import("../../src/server.js");
  } catch (error) {
    skipReason = `Failed to load backend server: ${error.message}`;
  }
}

const REQUIRED_INTEGRATION_ENV = ["INTEGRATION_CLAIMER_ADDRESS"];

if (!skipReason) {
  const missing = REQUIRED_INTEGRATION_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    skipReason = `Missing integration env vars: ${missing.join(", ")}`;
  }
}

let expectedAdminAddress;
let claimPayerSecret;
if (!skipReason) {
  try {
    expectedAdminAddress = Keypair.fromSecret(process.env.ADMIN_SECRET).publicKey();
  } catch (error) {
    skipReason = `Invalid ADMIN_SECRET: ${error.message}`;
  }
}

if (!skipReason) {
  claimPayerSecret =
    process.env.INTEGRATION_CLAIM_PAYER_SECRET ||
    process.env.CLAIM_PAYER_SECRET ||
    process.env.ADMIN_SECRET;
  if (!claimPayerSecret) {
    skipReason =
      "Missing claim payer secret. Set INTEGRATION_CLAIM_PAYER_SECRET, CLAIM_PAYER_SECRET, or ADMIN_SECRET.";
  }
}

let server;
let baseUrl;
let creatorReadyForRevocation;
let lastCreatedEventId;

const HEX_HASH_REGEX = /^[0-9a-f]{64}$/i;
const BASE64_REGEX = /^[A-Za-z0-9+/=]+$/;

test.before(async () => {
  if (skipReason) {
    return;
  }

  const { startServer } = serverModule;
  await new Promise((resolve, reject) => {
    server = startServer(0);
    server.once("listening", () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
    server.once("error", reject);
  });
});

test.after(async () => {
  if (!server) {
    return;
  }
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

async function fetchEventCount() {
  if (!baseUrl) {
    throw new Error("Server not started");
  }
  const response = await request(baseUrl)
    .get("/contract/event-count")
    .timeout({ deadline: 60_000, response: 60_000 });
  assert.equal(response.statusCode, 200);
  assert.equal(typeof response.body.eventCount, "number");
  return response.body.eventCount;
}

test(
  "create_event endpoint submits a real Soroban transaction",
  { skip: skipReason, timeout: 180_000 },
  async () => {
    const now = Math.floor(Date.now() / 1000);
    const eventDate = now;
    const claimStart = now - 60;
    const claimEnd = now + 86_400;

    const eventCountBefore = await fetchEventCount();

    const payload = {
      creator: process.env.INTEGRATION_CREATOR_ADDRESS || expectedAdminAddress,
      eventName: `Integration Event ${new Date().toISOString()}`,
      eventDate,
      location: "Bogotá",
      description: "Integration test event",
      maxPoaps: 10,
      claimStart,
      claimEnd,
      metadataUri:
        process.env.INTEGRATION_METADATA_URI || "https://example.com/metadata.json",
      imageUrl: process.env.INTEGRATION_IMAGE_URL || "https://example.com/image.png",
    };

    const response = await request(baseUrl)
      .post("/events/create")
      .send(payload)
      .timeout({ deadline: 180_000, response: 180_000 });

    assert.equal(response.statusCode, 200);
    assert.match(response.body.txHash, HEX_HASH_REGEX);
    assert.equal(response.body.rpcResponse.status, "PENDING");
    assert.ok(response.body.signedEnvelope);
    assert.match(response.body.signedEnvelope, BASE64_REGEX);

    const eventCountAfter = await fetchEventCount();
    assert.equal(eventCountAfter, eventCountBefore + 1);
    lastCreatedEventId = eventCountAfter;
  }
);

test(
  "approve_creator endpoint grants creator role",
  { skip: skipReason, timeout: 180_000 },
  async () => {
    const creatorToApprove = Keypair.random().publicKey();
    const paymentReference = `integration-payment-${Date.now()}`;

    const response = await request(baseUrl)
      .post("/creators/approve")
      .send({ creator: creatorToApprove, paymentReference })
      .timeout({ deadline: 180_000, response: 180_000 });

    assert.equal(response.statusCode, 200);
    assert.match(response.body.txHash, HEX_HASH_REGEX);
    assert.equal(response.body.rpcResponse.status, "PENDING");
    assert.match(response.body.signedEnvelope, BASE64_REGEX);

    creatorReadyForRevocation = creatorToApprove;
  }
);

test(
  "revoke_creator endpoint removes creator role",
  { skip: skipReason, timeout: 180_000 },
  async (t) => {
    if (!creatorReadyForRevocation) {
      t.skip("approve_creator test must run before revoke");
    }

    const response = await request(baseUrl)
      .post("/creators/revoke")
      .send({ creator: creatorReadyForRevocation })
      .timeout({ deadline: 180_000, response: 180_000 });

    assert.equal(response.statusCode, 200);
    assert.match(response.body.txHash, HEX_HASH_REGEX);
    assert.equal(response.body.rpcResponse.status, "PENDING");
    assert.match(response.body.signedEnvelope, BASE64_REGEX);
  }
);

test(
  "claim endpoint mints the attendance collectible",
  { skip: skipReason, timeout: 180_000 },
  async (t) => {
    if (!lastCreatedEventId) {
      t.skip("create_event test must run before claim");
    }

    const response = await request(baseUrl)
      .post("/events/claim")
      .send({
        claimer: process.env.INTEGRATION_CLAIMER_ADDRESS,
        eventId: lastCreatedEventId,
        payerSecret: claimPayerSecret,
      })
      .timeout({ deadline: 180_000, response: 180_000 });

    assert.equal(response.statusCode, 200);
    assert.match(response.body.txHash, HEX_HASH_REGEX);
    assert.equal(response.body.rpcResponse.status, "PENDING");
    assert.match(response.body.signedEnvelope, BASE64_REGEX);
  }
);

test(
  "GET /contract/admin returns the configured admin",
  { skip: skipReason, timeout: 60_000 },
  async () => {
    const response = await request(baseUrl)
      .get("/contract/admin")
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.admin, expectedAdminAddress);
  }
);

