import prisma from "../lib/prisma.js";

/**
 * Create an event record in the DB after a successful on-chain tx.
 */
export async function createEventRecord({
  eventId,
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
  imageUrl,
  txHash,
  imageId,
}) {
  if (!prisma) return null;
  return prisma.event.create({
    data: {
      eventId,
      creator,
      communityId: communityId ?? undefined,
      eventName,
      eventDate: BigInt(eventDate),
      location,
      description,
      maxPoaps,
      claimStart: BigInt(claimStart),
      claimEnd: BigInt(claimEnd),
      metadataUri,
      imageUrl,
      txHash,
      imageId: imageId ?? undefined,
    },
  });
}

/**
 * Create a claim record after a successful on-chain claim tx.
 */
export async function createClaimRecord({ eventId, claimer, tokenId, txHash }) {
  if (!prisma) return null;
  return prisma.claim.upsert({
    where: { eventId_claimer: { eventId, claimer } },
    update: { tokenId, txHash },
    create: { eventId, claimer, tokenId, txHash },
  });
}

/**
 * Increment the cached mintedCount on an event.
 */
export async function incrementMintedCount(eventId) {
  if (!prisma) return null;
  return prisma.event.update({
    where: { eventId },
    data: { mintedCount: { increment: 1 } },
  });
}

/**
 * Upsert a creator approval record.
 */
export async function upsertCreatorApproval({
  address,
  paymentReference,
  txHash,
}) {
  if (!prisma) return null;
  return prisma.creator.upsert({
    where: { address },
    update: { status: "APPROVED", paymentReference, txHash },
    create: { address, status: "APPROVED", paymentReference, txHash },
  });
}

/**
 * Mark a creator as revoked.
 */
export async function revokeCreator({ address, txHash }) {
  if (!prisma) return null;
  return prisma.creator.upsert({
    where: { address },
    update: { status: "REVOKED", txHash },
    create: { address, status: "REVOKED", txHash },
  });
}

/**
 * Log a transaction (audit trail).
 */
export async function logTransaction({ action, status, txHash, payload, error }) {
  if (!prisma) return null;
  return prisma.transaction.create({
    data: { action, status, txHash, payload, error },
  });
}

/**
 * Get all events from DB, optionally filtered by creator.
 */
export async function getAllEvents({ creator } = {}) {
  if (!prisma) return null;
  const where = creator ? { creator } : {};
  return prisma.event.findMany({
    where,
    orderBy: { eventId: "asc" },
  });
}

/**
 * Get all claimed events for a specific claimer.
 */
export async function getClaimerEvents(claimer) {
  if (!prisma) return null;
  const claims = await prisma.claim.findMany({
    where: { claimer },
    include: { event: true },
  });
  return claims.map((claim) => ({
    ...claim.event,
    tokenId: claim.tokenId,
  }));
}

/**
 * Get the cached minted count for an event.
 */
export async function getCachedMintedCount(eventId) {
  if (!prisma) return null;
  const event = await prisma.event.findUnique({
    where: { eventId },
    select: { mintedCount: true },
  });
  return event?.mintedCount ?? null;
}

/**
 * Create an image record in the DB.
 */
export async function createImageRecord({
  bucket,
  key,
  originalName,
  mimeType,
  size,
  publicUrl,
}) {
  if (!prisma) return null;
  return prisma.image.create({
    data: { bucket, key, originalName, mimeType, size, publicUrl },
  });
}

/**
 * Upsert an event record (used by sync script).
 */
export async function upsertEventRecord({
  eventId,
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
  imageUrl,
  mintedCount,
}) {
  if (!prisma) return null;
  return prisma.event.upsert({
    where: { eventId },
    update: {
      creator,
      communityId: communityId ?? undefined,
      eventName,
      eventDate: BigInt(eventDate),
      location,
      description,
      maxPoaps,
      claimStart: BigInt(claimStart),
      claimEnd: BigInt(claimEnd),
      metadataUri,
      imageUrl,
      mintedCount,
    },
    create: {
      eventId,
      creator,
      communityId: communityId ?? undefined,
      eventName,
      eventDate: BigInt(eventDate),
      location,
      description,
      maxPoaps,
      claimStart: BigInt(claimStart),
      claimEnd: BigInt(claimEnd),
      metadataUri,
      imageUrl,
      mintedCount,
    },
  });
}

/**
 * Create a community record.
 */
export async function createCommunity({
  name,
  country,
  description,
  imageUrl,
  creatorAddress,
}) {
  if (!prisma) return null;
  return prisma.community.create({
    data: { name, country, description, imageUrl, creatorAddress },
  });
}

/**
 * Get all communities with members.
 */
export async function getAllCommunities() {
  if (!prisma) return null;
  return prisma.community.findMany({
    include: { members: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single community with members.
 */
export async function getCommunityById(id) {
  if (!prisma) return null;
  return prisma.community.findUnique({
    where: { id },
    include: { members: true },
  });
}

/**
 * Update a community (only by creator).
 */
export async function updateCommunity({ id, creatorAddress, data }) {
  if (!prisma) return null;
  const community = await prisma.community.findUnique({
    where: { id },
    select: { creatorAddress: true },
  });
  if (!community || community.creatorAddress !== creatorAddress) {
    return null;
  }
  return prisma.community.update({
    where: { id },
    data,
  });
}

/**
 * Join a community (idempotent).
 */
export async function joinCommunity({ communityId, address }) {
  if (!prisma) return null;
  return prisma.communityMember.upsert({
    where: { communityId_address: { communityId, address } },
    update: {},
    create: { communityId, address },
  });
}

/**
 * Leave a community.
 */
export async function leaveCommunity({ communityId, address }) {
  if (!prisma) return null;
  return prisma.communityMember.deleteMany({
    where: { communityId, address },
  });
}

/**
 * Get events by community.
 */
export async function getEventsByCommunity(communityId) {
  if (!prisma) return null;
  return prisma.event.findMany({
    where: { communityId },
    orderBy: { eventDate: "desc" },
  });
}
