// ===========================================
// NextAuth.js Configuration (Auth.js v5)
// ===========================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

// Custom user type for our application
interface CustomUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: number;
  roleId: number;
  roleName: string;
  permissions: string[];
}

// Extend the default session types
declare module "next-auth" {
  interface Session {
    user: CustomUser;
  }

  interface User {
    id: string;
    numericId: number;
    email: string;
    firstName: string;
    lastName: string;
    tenantId: number;
    roleId: number;
    roleName: string;
    permissions: string[];
  }
}

// NextAuth configuration
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        subdomain: { label: "Subdomain", type: "text" },
      },
      async authorize(credentials) {
        try {
          // Validate input
          if (!credentials?.email || !credentials?.password) {
            console.log("Auth Error: Missing email or password");
            return null;
          }

          const email = credentials.email as string;
          const password = credentials.password as string;
          const subdomain = (credentials.subdomain as string) || "";

          console.log(`Auth: Attempting login for ${email} with subdomain ${subdomain}`);

          // Find tenant by subdomain
          const tenant = await prisma.tenant.findUnique({
            where: { subdomain },
          });

          if (!tenant) {
            console.log(`Auth Error: Tenant not found for subdomain ${subdomain}`);
            return null;
          }

          if (tenant.status !== "ACTIVE" && tenant.status !== "TRIAL") {
            console.log(`Auth Error: Tenant ${subdomain} is not active (status: ${tenant.status})`);
            return null;
          }

          // Find user in tenant
          const user = await prisma.user.findFirst({
            where: {
              email,
              tenantId: tenant.id,
            },
            include: {
              role: true,
            },
          });

          if (!user) {
            console.log(`Auth Error: User ${email} not found in tenant ${tenant.id}`);
            return null;
          }

          if (user.status !== "ACTIVE") {
            console.log(`Auth Error: User ${email} is not active (status: ${user.status})`);
            return null;
          }

          // Verify password
          const isValidPassword = await compare(password, user.passwordHash);
          if (!isValidPassword) {
            console.log(`Auth Error: Invalid password for ${email}`);
            return null;
          }

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          console.log(`Auth Success: User ${email} logged in (ID: ${user.id})`);

          // Return user data
          return {
            id: user.id.toString(),
            numericId: user.id,
            email: user.email,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            tenantId: user.tenantId,
            roleId: user.roleId,
            roleName: user.role.name,
            permissions: (user.role.permissions as string[]) || [],
          };
        } catch (error) {
          console.error("Auth Error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign in, populate token with user data
      if (user) {
        token.numericId = user.numericId;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.tenantId = user.tenantId;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.permissions = user.permissions;
        token.lastChecked = Date.now();
      }

      // Periodically verify user is still active (every 5 minutes)
      const REVALIDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
      const lastChecked = (token.lastChecked as number) || 0;
      const shouldRevalidate = Date.now() - lastChecked > REVALIDATE_INTERVAL;

      if (shouldRevalidate && token.numericId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.numericId as number },
            select: { status: true },
          });

          // If user is suspended/inactive, invalidate the session
          if (!dbUser || dbUser.status !== "ACTIVE") {
            console.log(`Auth: User ${token.email} is no longer active, invalidating session`);
            // Return empty token to force logout
            return { expired: true } as typeof token;
          }

          token.lastChecked = Date.now();
        } catch (error) {
          console.error("Error checking user status:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      // If token is expired (user suspended/deleted), return null session
      if ((token as { expired?: boolean }).expired) {
        return null as unknown as typeof session;
      }

      if (token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).user = {
          id: (token.numericId as number) || 0,
          email: (token.email as string) || "",
          firstName: (token.firstName as string) || "",
          lastName: (token.lastName as string) || "",
          tenantId: (token.tenantId as number) || 0,
          roleId: (token.roleId as number) || 0,
          roleName: (token.roleName as string) || "",
          permissions: (token.permissions as string[]) || [],
        };
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  debug: process.env.NODE_ENV === "development",
});

// Helper function to check if user has permission
export function hasPermission(
  permissions: string[],
  requiredPermission: string
): boolean {
  return permissions.includes(requiredPermission);
}

// Helper function to check if user has any of the permissions
export function hasAnyPermission(
  permissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some((p) => permissions.includes(p));
}

// Helper function to check if user has all permissions
export function hasAllPermissions(
  permissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every((p) => permissions.includes(p));
}
