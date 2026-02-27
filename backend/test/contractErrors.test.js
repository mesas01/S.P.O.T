import test from "node:test";
import assert from "node:assert/strict";
import { parseContractError } from "../src/contractErrors.js";

test("parseContractError — code 1 (Unauthorized) → 403", () => {
  const result = parseContractError("Error(Contract, #1)");
  assert.deepStrictEqual(result, { code: 1, name: "Unauthorized", httpStatus: 403 });
});

test("parseContractError — code 2 (AlreadyClaimed) → 409", () => {
  const result = parseContractError("Error(Contract, #2)");
  assert.deepStrictEqual(result, { code: 2, name: "AlreadyClaimed", httpStatus: 409 });
});

test("parseContractError — code 3 (LimitExceeded) → 409", () => {
  const result = parseContractError("Error(Contract, #3)");
  assert.deepStrictEqual(result, { code: 3, name: "LimitExceeded", httpStatus: 409 });
});

test("parseContractError — code 4 (ClaimPeriodEnded) → 422", () => {
  const result = parseContractError("Error(Contract, #4)");
  assert.deepStrictEqual(result, { code: 4, name: "ClaimPeriodEnded", httpStatus: 422 });
});

test("parseContractError — code 5 (ClaimPeriodNotStarted) → 422", () => {
  const result = parseContractError("Error(Contract, #5)");
  assert.deepStrictEqual(result, { code: 5, name: "ClaimPeriodNotStarted", httpStatus: 422 });
});

test("parseContractError — code 6 (InvalidParameters) → 400", () => {
  const result = parseContractError("Error(Contract, #6)");
  assert.deepStrictEqual(result, { code: 6, name: "InvalidParameters", httpStatus: 400 });
});

test("parseContractError — code 7 (EventNotFound) → 404", () => {
  const result = parseContractError("Error(Contract, #7)");
  assert.deepStrictEqual(result, { code: 7, name: "EventNotFound", httpStatus: 404 });
});

test("parseContractError — code 8 (EventAlreadyExists) → 409", () => {
  const result = parseContractError("Error(Contract, #8)");
  assert.deepStrictEqual(result, { code: 8, name: "EventAlreadyExists", httpStatus: 409 });
});

test("parseContractError — code 9 (CreatorNotApproved) → 403", () => {
  const result = parseContractError("Error(Contract, #9)");
  assert.deepStrictEqual(result, { code: 9, name: "CreatorNotApproved", httpStatus: 403 });
});

test("parseContractError — unknown code → 500 with UnknownContractError", () => {
  const result = parseContractError("Error(Contract, #42)");
  assert.deepStrictEqual(result, { code: 42, name: "UnknownContractError", httpStatus: 500 });
});

test("parseContractError — null input → null", () => {
  assert.strictEqual(parseContractError(null), null);
});

test("parseContractError — undefined input → null", () => {
  assert.strictEqual(parseContractError(undefined), null);
});

test("parseContractError — non-contract error → null", () => {
  assert.strictEqual(parseContractError("Network timeout"), null);
});

test("parseContractError — embedded in longer message", () => {
  const result = parseContractError("Transaction failed: Error(Contract, #5) at line 42");
  assert.deepStrictEqual(result, { code: 5, name: "ClaimPeriodNotStarted", httpStatus: 422 });
});
