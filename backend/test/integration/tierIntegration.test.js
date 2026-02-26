import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";
import { generateEventImage } from "../helpers/generateImage.js";

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

const REQUIRED_ENV = ["INTEGRATION_CLAIMER_ADDRESS", "DATABASE_URL"];

if (!skipReason) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    skipReason = `Missing integration env vars: ${missing.join(", ")}`;
  }
}

let expectedAdminAddress;

if (!skipReason) {
  try {
    expectedAdminAddress = Keypair.fromSecret(
      process.env.ADMIN_SECRET,
    ).publicKey();
  } catch (error) {
    skipReason = `Invalid ADMIN_SECRET: ${error.message}`;
  }
}

let server;
let baseUrl;
let eventImage;
let approvedCreatorAddress;
let createdEventId;

test.before(async () => {
  if (skipReason) return;

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

  eventImage = await generateEventImage("SPOT Tier Integration Test");
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

// --- Tier limits endpoint (read-only, no on-chain call) ---

test(
  "GET /tier-limits returns all tiers with correct structure from real backend",
  { skip: skipReason, timeout: 60_000 },
  async () => {
    const response = await request(baseUrl)
      .get("/tier-limits")
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(response.statusCode, 200);
    assert.ok(response.body.limits);

    for (const tier of ["FREE", "BASIC", "PREMIUM"]) {
      const t = response.body.limits[tier];
      assert.ok(t, `Missing tier config for ${tier}`);
      assert.equal(typeof t.maxSpotsPerEvent, "number");
      assert.ok(t.maxSpotsPerEvent > 0, `maxSpotsPerEvent should be positive for ${tier}`);
      assert.equal(typeof t.maxActiveEvents, "number");
      assert.ok(t.maxActiveEvents > 0, `maxActiveEvents should be positive for ${tier}`);
      assert.ok(Array.isArray(t.allowedMethods));
      assert.ok(t.allowedMethods.length > 0, `allowedMethods should not be empty for ${tier}`);
    }

    // Tiers should scale: FREE < BASIC < PREMIUM
    const { FREE, BASIC, PREMIUM } = response.body.limits;
    assert.ok(
      FREE.maxSpotsPerEvent <= BASIC.maxSpotsPerEvent,
      "BASIC maxSpotsPerEvent should be >= FREE",
    );
    assert.ok(
      BASIC.maxSpotsPerEvent <= PREMIUM.maxSpotsPerEvent,
      "PREMIUM maxSpotsPerEvent should be >= BASIC",
    );
  },
);

// --- Creator profile endpoint (DB-backed) ---

test(
  "GET /creators/:address returns FREE profile for unknown address",
  { skip: skipReason, timeout: 60_000 },
  async () => {
    // Use a random address that won't exist in DB
    const randomAddress = Keypair.random().publicKey();
    const response = await request(baseUrl)
      .get(`/creators/${randomAddress}`)
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(response.statusCode, 200);
    assert.ok(response.body.creator);
    assert.equal(response.body.creator.address, randomAddress);
    assert.equal(response.body.creator.tier, "FREE");
    assert.equal(response.body.creator.status, null);
    assert.ok(response.body.creator.limits);
    assert.equal(typeof response.body.creator.limits.maxSpotsPerEvent, "number");
  },
);

// --- Approve creator with tier assignment ---

test(
  "approve_creator with tier=BASIC stores tier in DB",
  { skip: skipReason, timeout: 180_000 },
  async () => {
    approvedCreatorAddress = Keypair.random().publicKey();
    const paymentReference = `tier-integration-${Date.now()}`;

    const approveRes = await request(baseUrl)
      .post("/creators/approve")
      .send({
        creator: approvedCreatorAddress,
        paymentReference,
        tier: "BASIC",
      })
      .timeout({ deadline: 180_000, response: 180_000 });

    assert.equal(approveRes.statusCode, 200);
    assert.ok(approveRes.body.txHash);

    // Verify creator profile now shows BASIC tier
    const profileRes = await request(baseUrl)
      .get(`/creators/${approvedCreatorAddress}`)
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(profileRes.statusCode, 200);
    assert.equal(profileRes.body.creator.tier, "BASIC");
    assert.equal(profileRes.body.creator.status, "APPROVED");
    assert.ok(profileRes.body.creator.limits);
    // BASIC limits should be greater than FREE
    assert.ok(profileRes.body.creator.limits.maxSpotsPerEvent > 100);
  },
);

// --- Tier enforcement: maxSpotsPerEvent ---

test(
  "create_event respects creator tier limits (maxSpotsPerEvent enforcement)",
  { skip: skipReason, timeout: 180_000 },
  async (t) => {
    if (!approvedCreatorAddress) {
      t.skip("approve_creator with tier test must run first");
      return;
    }

    const now = Math.floor(Date.now() / 1000);

    // BASIC tier allows 500 SPOTs — requesting 501 should fail
    const rejectRes = await request(baseUrl)
      .post("/events/create")
      .field("creator", approvedCreatorAddress)
      .field("eventName", `Tier Limit Reject ${Date.now()}`)
      .field("eventDate", String(now))
      .field("location", "Bogotá")
      .field("description", "Should be rejected — exceeds tier limit")
      .field("maxPoaps", "501")
      .field("claimStart", String(now - 60))
      .field("claimEnd", String(now + 86_400))
      .field(
        "metadataUri",
        process.env.INTEGRATION_METADATA_URI ||
          "https://example.com/metadata.json",
      )
      .attach("image", eventImage, "tier-reject.png")
      .timeout({ deadline: 180_000, response: 180_000 });

    assert.equal(rejectRes.statusCode, 403);
    assert.match(rejectRes.body.error, /allows max/);

    // BASIC tier allows 500 SPOTs — requesting 10 should succeed
    const acceptRes = await request(baseUrl)
      .post("/events/create")
      .field("creator", approvedCreatorAddress)
      .field("eventName", `Tier Limit Accept ${Date.now()}`)
      .field("eventDate", String(now))
      .field("location", "Bogotá")
      .field("description", "Should succeed — within tier limit")
      .field("maxPoaps", "10")
      .field("claimStart", String(now - 60))
      .field("claimEnd", String(now + 86_400))
      .field(
        "metadataUri",
        process.env.INTEGRATION_METADATA_URI ||
          "https://example.com/metadata.json",
      )
      .attach("image", eventImage, "tier-accept.png")
      .timeout({ deadline: 180_000, response: 180_000 });

    assert.equal(acceptRes.statusCode, 200);
    assert.ok(acceptRes.body.txHash);
    // Event should inherit creator's BASIC tier
    assert.equal(acceptRes.body.tier, "BASIC");
    createdEventId = acceptRes.body.eventId;
  },
);

// --- Created event persists tier in DB ---

test(
  "created event has tier persisted in DB via /events/:eventId",
  { skip: skipReason, timeout: 60_000 },
  async (t) => {
    if (!createdEventId) {
      t.skip("create_event tier test must run first");
      return;
    }

    const response = await request(baseUrl)
      .get(`/events/${createdEventId}`)
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(response.statusCode, 200);
    assert.ok(response.body.event);
    assert.equal(response.body.event.tier, "BASIC");
    assert.equal(response.body.event.creator, approvedCreatorAddress);
  },
);

// --- Approve with invalid tier is rejected ---

test(
  "approve_creator rejects invalid tier value",
  { skip: skipReason, timeout: 60_000 },
  async () => {
    const response = await request(baseUrl)
      .post("/creators/approve")
      .send({
        creator: Keypair.random().publicKey(),
        paymentReference: `invalid-tier-${Date.now()}`,
        tier: "DIAMOND",
      })
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(response.statusCode, 400);
    assert.match(response.body.error, /Invalid tier/);
  },
);
