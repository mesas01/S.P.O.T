import { PrismaClient } from "@prisma/client";

const isMock =
  (process.env.MOCK_MODE || "false").toLowerCase() === "true";

/** @type {import('../generated/prisma/client.js').PrismaClient | null} */
let prisma = null;

if (!isMock) {
  try {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "production"
          ? ["error"]
          : ["query", "error", "warn"],
    });
  } catch (err) {
    console.warn("Prisma client init failed (DB features disabled):", err.message);
  }
}

export default prisma;
