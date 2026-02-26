const TIERS = ["FREE", "BASIC", "PREMIUM"];

function readRequired(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function buildTierConfig(tier) {
  const prefix = `TIER_${tier}`;
  return {
    maxSpotsPerEvent: Number(readRequired(`${prefix}_MAX_SPOTS_PER_EVENT`)),
    maxActiveEvents: Number(readRequired(`${prefix}_MAX_ACTIVE_EVENTS`)),
    allowedMethods: readRequired(`${prefix}_ALLOWED_METHODS`).split(","),
  };
}

const tierLimits = Object.fromEntries(
  TIERS.map((tier) => [tier, buildTierConfig(tier)]),
);

export function getTierLimits() {
  return tierLimits;
}

export function getLimitsForTier(tier) {
  return tierLimits[tier] || tierLimits.FREE;
}
