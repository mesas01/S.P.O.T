/**
 * Soroban contract error parser.
 * Maps `Error(Contract, #N)` codes from the poap contract (contracts/poap/src/error.rs)
 * to structured objects with name and HTTP status.
 */

const CONTRACT_ERROR_RE = /Error\(Contract,\s*#(\d+)\)/;

const ERROR_MAP = {
  1: { name: "Unauthorized", httpStatus: 403 },
  2: { name: "AlreadyClaimed", httpStatus: 409 },
  3: { name: "LimitExceeded", httpStatus: 409 },
  4: { name: "ClaimPeriodEnded", httpStatus: 422 },
  5: { name: "ClaimPeriodNotStarted", httpStatus: 422 },
  6: { name: "InvalidParameters", httpStatus: 400 },
  7: { name: "EventNotFound", httpStatus: 404 },
  8: { name: "EventAlreadyExists", httpStatus: 409 },
  9: { name: "CreatorNotApproved", httpStatus: 403 },
};

/**
 * Parse a Soroban contract error message.
 * @param {string|null|undefined} msg - Error message string
 * @returns {{ code: number, name: string, httpStatus: number } | null}
 */
export function parseContractError(msg) {
  if (!msg || typeof msg !== "string") return null;
  const match = msg.match(CONTRACT_ERROR_RE);
  if (!match) return null;
  const code = Number(match[1]);
  const known = ERROR_MAP[code];
  if (known) {
    return { code, ...known };
  }
  return { code, name: "UnknownContractError", httpStatus: 500 };
}
