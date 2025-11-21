import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import dotenv from "dotenv";

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

const REQUIRED_INTEGRATION_ENV = [
  "INTEGRATION_CREATOR_SECRET",
  "INTEGRATION_CREATOR_ADDRESS",
];

if (!skipReason) {
  const missing = REQUIRED_INTEGRATION_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    skipReason = `Missing integration env vars: ${missing.join(", ")}`;
  }
}

let server;
let baseUrl;

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

test(
  "create_event endpoint submits a real Soroban transaction",
  { skip: skipReason, timeout: 180_000 },
  async () => {
    const now = Math.floor(Date.now() / 1000);
    const eventDate = now + 3_600; // +1h
    const claimStart = eventDate;
    const claimEnd = claimStart + 86_400; // +1d

    const payload = {
      creatorSecret: process.env.INTEGRATION_CREATOR_SECRET,
      creator: process.env.INTEGRATION_CREATOR_ADDRESS,
      eventName: `Integration Event ${new Date().toISOString()}`,
      eventDate,
      location: "Bogotá",
      description: "Integration test event",
      maxPoaps: 10,
      claimStart,
      claimEnd,
      metadataUri: process.env.INTEGRATION_METADATA_URI || "https://example.com/metadata.json",
      imageUrl: process.env.INTEGRATION_IMAGE_URL || "https://example.com/image.png",
    };

    const response = await request(baseUrl)
      .post("/events/create")
      .send(payload)
      .timeout({ deadline: 180_000, response: 180_000 });

    assert.equal(response.statusCode, 200);
    assert.match(response.body.txHash, /^[0-9a-f]{64}$/i);
    assert.equal(response.body.rpcResponse.status, "PENDING");
    assert.ok(response.body.signedEnvelope);
    assert.match(response.body.signedEnvelope, /^[A-Za-z0-9+/=]+$/);
  }
);

