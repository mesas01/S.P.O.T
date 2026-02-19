import { PrismaClient } from "@prisma/client";

const isMock =
  (process.env.MOCK_MODE || "false").toLowerCase() === "true";

/** @type {import('../generated/prisma/client.js').PrismaClient | null} */
let prisma = null;

if (!isMock) {
  prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["query", "error", "warn"],
  });
}

export default prisma;
