// ===========================================
// Prisma Client - Database Connection
// ===========================================

import { PrismaClient } from "@prisma/client";

// Extend globalThis type for Prisma

// Create a global variable to store the Prisma client
// This prevents multiple instances during development hot reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create or reuse the Prisma client
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// Store the client in global variable during development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
