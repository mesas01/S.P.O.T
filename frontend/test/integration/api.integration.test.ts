import { describe, it, expect, beforeAll } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { generateEventImage } from "../helpers/generateImage.js";
import {
  createEventRequest,
  claimEventRequest,
  fetchOnchainEvents,
  fetchMintedCount,
  fetchClaimedEventsByClaimer,
  type CreateEventPayload,
} from "../../src/util/backend.js";

const integrationEnabled = process.env.RUN_INTEGRATION_TESTS === "true";

describe.skipIf(!integrationEnabled)(
  "Frontend → Backend integration tests",
  () => {
    let creatorAddress: string;
    let claimerAddress: string;
    let payerSecret: string;
    let createdEventId: number;
    let imageFile: File;

    beforeAll(async () => {
      const adminSecret = process.env.ADMIN_SECRET!;
      creatorAddress = Keypair.fromSecret(adminSecret).publicKey();
      claimerAddress = process.env.INTEGRATION_CLAIMER_ADDRESS!;
      payerSecret = process.env.CLAIM_PAYER_SECRET!;

      imageFile = await generateEventImage("Integration Test Event");
    });

    it("createEventRequest() creates an event on-chain", async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: CreateEventPayload = {
        creator: creatorAddress,
        eventName: `FE-Integration-${Date.now()}`,
        eventDate: now + 3600,
        location: "Test Location",
        description: "Frontend integration test event",
        maxPoaps: 100,
        claimStart: now,
        claimEnd: now + 86400,
        metadataUri: "https://example.com/metadata.json",
        imageFile,
      };

      const response = await createEventRequest(payload);

      expect(response.txHash).toMatch(/^[0-9a-f]{64}$/);
      expect(response.eventId).toBeDefined();
      expect(typeof response.eventId).toBe("number");
      expect(response.imageUrl).toBeTruthy();

      createdEventId = response.eventId!;
      console.log(
        `    Created event #${createdEventId} (tx: ${response.txHash.slice(0, 12)}...)`,
      );
    });

    it("fetchOnchainEvents(creator) returns the created event", async () => {
      const events = await fetchOnchainEvents(creatorAddress);

      expect(Array.isArray(events)).toBe(true);
      const found = events.find((e) => e.eventId === createdEventId);
      expect(found).toBeDefined();
      expect(found!.name).toContain("FE-Integration-");
      expect(found!.creator).toBe(creatorAddress);
    });

    it("fetchMintedCount() returns 0 before any claims", async () => {
      const { mintedCount } = await fetchMintedCount(createdEventId);

      expect(mintedCount).toBe(0);
    });

    it("claimEventRequest() claims the event on-chain", async () => {
      const response = await claimEventRequest({
        claimer: claimerAddress,
        eventId: createdEventId,
        payerSecret,
      });

      expect(response.txHash).toMatch(/^[0-9a-f]{64}$/);
      console.log(
        `    Claimed event #${createdEventId} (tx: ${response.txHash.slice(0, 12)}...)`,
      );
    });

    it("fetchMintedCount() returns 1 after claiming", async () => {
      const { mintedCount } = await fetchMintedCount(createdEventId);

      expect(mintedCount).toBe(1);
    });

    it("fetchClaimedEventsByClaimer() includes the claimed event", async () => {
      const events = await fetchClaimedEventsByClaimer(claimerAddress);

      expect(Array.isArray(events)).toBe(true);
      const found = events.find((e) => e.eventId === createdEventId);
      expect(found).toBeDefined();
      expect(found!.creator).toBe(creatorAddress);
    });
  },
);
