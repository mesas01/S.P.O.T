/**
 * Sync script: populates the local DB from on-chain data.
 *
 * Usage:
 *   node src/scripts/sync-from-chain.js
 *
 * Requires env vars: RPC_URL, NETWORK_PASSPHRASE, ADMIN_SECRET, SPOT_CONTRACT_ID, DATABASE_URL
 */

import dotenv from "dotenv";
dotenv.config();

// Ensure MOCK_MODE is off for sync
process.env.MOCK_MODE = "false";

import prisma from "../lib/prisma.js";
import { upsertEventRecord } from "../services/db.js";
import {
  getAllEventIds,
  getEventDetails,
  getMintedCount,
} from "../soroban.js";

const {
  RPC_URL,
  NETWORK_PASSPHRASE,
  ADMIN_SECRET,
  SPOT_CONTRACT_ID,
} = process.env;

// BigInt JSON serialization
BigInt.prototype.toJSON = function () {
  return Number(this);
};

async function main() {
  if (!RPC_URL || !NETWORK_PASSPHRASE || !ADMIN_SECRET || !SPOT_CONTRACT_ID) {
    console.error("Missing required env vars: RPC_URL, NETWORK_PASSPHRASE, ADMIN_SECRET, SPOT_CONTRACT_ID");
    process.exit(1);
  }

  if (!prisma) {
    console.error("Prisma client not available. Make sure MOCK_MODE is not true and DATABASE_URL is set.");
    process.exit(1);
  }

  const rpcConfig = {
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    contractId: SPOT_CONTRACT_ID,
    adminSecret: ADMIN_SECRET,
  };

  console.log("Fetching all event IDs from chain...");
  const eventIds = await getAllEventIds(rpcConfig);
  console.log(`Found ${eventIds.length} events on-chain.`);

  let synced = 0;
  let errors = 0;

  for (const eventId of eventIds) {
    try {
      const [details, mintedCount] = await Promise.all([
        getEventDetails({ ...rpcConfig, eventId }),
        getMintedCount({ ...rpcConfig, eventId }),
      ]);

      await upsertEventRecord({
        eventId: details.eventId,
        creator: details.creator,
        eventName: details.eventName,
        eventDate: details.eventDate,
        location: details.location,
        description: details.description,
        maxPoaps: details.maxPoaps,
        claimStart: details.claimStart,
        claimEnd: details.claimEnd,
        metadataUri: details.metadataUri,
        imageUrl: details.imageUrl,
        mintedCount,
      });

      synced++;
      console.log(`  Synced event #${eventId}: ${details.eventName}`);
    } catch (err) {
      errors++;
      console.error(`  Failed to sync event #${eventId}:`, err.message);
    }
  }

  console.log(`\nSync complete: ${synced} synced, ${errors} errors out of ${eventIds.length} total.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
