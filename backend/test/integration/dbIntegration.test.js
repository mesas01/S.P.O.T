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
let createdEventId;
let creatorAddress;
let eventImage;

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

  eventImage = await generateEventImage("SPOT DB Integration Test");
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test(
  "create_event on-chain then GET /events/onchain returns event from DB",
  { skip: skipReason, timeout: 180_000 },
  async () => {
    const now = Math.floor(Date.now() / 1000);
    creatorAddress = process.env.INTEGRATION_CREATOR_ADDRESS || expectedAdminAddress;

    const createRes = await request(baseUrl)
      .post("/events/create")
      .field("creator", creatorAddress)
      .field("eventName", `DB Integration ${new Date().toISOString()}`)
      .field("eventDate", String(now))
      .field("location", "Bogotá DB Test")
      .field("description", "DB integration test event")
      .field("maxPoaps", "10")
      .field("claimStart", String(now - 60))
      .field("claimEnd", String(now + 86_400))
      .field("metadataUri", process.env.INTEGRATION_METADATA_URI || "https://example.com/metadata.json")
      .attach("image", eventImage, "db-test-poster.png")
      .timeout({ deadline: 180_000, response: 180_000 });

    assert.equal(createRes.statusCode, 200);
    assert.ok(createRes.body.txHash);
    createdEventId = createRes.body.eventId;
    assert.ok(createdEventId != null, "eventId should be returned after create");

    const listRes = await request(baseUrl)
      .get("/events/onchain")
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(listRes.statusCode, 200);
    assert.ok(Array.isArray(listRes.body.events));

    const found = listRes.body.events.find((e) => e.eventId === createdEventId);
    assert.ok(found, `Event ${createdEventId} should appear in /events/onchain`);
    assert.ok(found.name);
    assert.ok(found.location);
    assert.ok(found.description);
  },
);

test(
  "GET /events/onchain?creator=X filters by creator",
  { skip: skipReason, timeout: 60_000 },
  async (t) => {
    if (!createdEventId) {
      t.skip("create_event test must run first");
      return;
    }

    const response = await request(baseUrl)
      .get(`/events/onchain?creator=${creatorAddress}`)
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.body.events));

    for (const event of response.body.events) {
      assert.equal(
        event.creator.toLowerCase(),
        creatorAddress.toLowerCase(),
        "All returned events should belong to the filtered creator",
      );
    }

    const found = response.body.events.find((e) => e.eventId === createdEventId);
    assert.ok(found, `Created event ${createdEventId} should appear when filtering by its creator`);
  },
);

test(
  "GET /events/:eventId/minted-count is 0 before any claim",
  { skip: skipReason, timeout: 60_000 },
  async (t) => {
    if (!createdEventId) {
      t.skip("create_event test must run first");
      return;
    }

    const response = await request(baseUrl)
      .get(`/events/${createdEventId}/minted-count`)
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.mintedCount, 0);
  },
);

test(
  "claim on-chain then GET /events/:eventId/minted-count is 1",
  { skip: skipReason, timeout: 180_000 },
  async (t) => {
    if (!createdEventId) {
      t.skip("create_event test must run first");
      return;
    }

    const claimRes = await request(baseUrl)
      .post("/events/claim")
      .send({
        claimer: process.env.INTEGRATION_CLAIMER_ADDRESS,
        eventId: createdEventId,
        payerSecret: claimPayerSecret,
      })
      .timeout({ deadline: 180_000, response: 180_000 });

    assert.equal(claimRes.statusCode, 200);
    assert.ok(claimRes.body.txHash);

    const countRes = await request(baseUrl)
      .get(`/events/${createdEventId}/minted-count`)
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(countRes.statusCode, 200);
    assert.equal(countRes.body.mintedCount, 1);
  },
);

test(
  "GET /claimers/:claimer/events includes the claimed event",
  { skip: skipReason, timeout: 60_000 },
  async (t) => {
    if (!createdEventId) {
      t.skip("create_event and claim tests must run first");
      return;
    }

    const claimer = process.env.INTEGRATION_CLAIMER_ADDRESS;
    const response = await request(baseUrl)
      .get(`/claimers/${claimer}/events`)
      .timeout({ deadline: 60_000, response: 60_000 });

    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.body.events));

    const found = response.body.events.find((e) => e.eventId === createdEventId);
    assert.ok(found, `Claimer should see event ${createdEventId} in their claimed events`);
  },
);
