// ===========================================
// NextAuth.js Configuration
// ===========================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

// Custom user type for our application
interface CustomUser {
  id: number; // Using auto-increment integer ID
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
    id: string; // NextAuth requires string, we convert in callbacks
    numericId: number; // Our actual integer ID
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
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        subdomain: { label: "Subdomain", type: "text" },
      },
      async authorize(credentials) {
        // Validate input
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const subdomain = (credentials.subdomain as string) || "";

        // Find tenant by subdomain
        const tenant = await prisma.tenant.findUnique({
          where: { subdomain },
        });

        if (!tenant) {
          throw new Error("Invalid company");
        }

        if (tenant.status !== "ACTIVE" && tenant.status !== "TRIAL") {
          throw new Error("Company account is not active");
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
          throw new Error("Invalid email or password");
        }

        if (user.status !== "ACTIVE") {
          throw new Error("Your account is not active");
        }

        // Verify password
        const isValidPassword = await compare(password, user.passwordHash);
        if (!isValidPassword) {
          throw new Error("Invalid email or password");
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Return user data (NextAuth requires id as string, we store numericId separately)
        return {
          id: user.id.toString(), // NextAuth requires string
          numericId: user.id, // Our actual integer ID
          email: user.email,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          tenantId: user.tenantId,
          roleId: user.roleId,
          roleName: user.role.name,
          permissions: user.role.permissions as string[],
        };
      },
    }),
  ],

  callbacks: {
    // Add user data to JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.numericId; // Store numeric ID in token
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.tenantId = user.tenantId;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.permissions = user.permissions;
      }
      return token;
    },

    // Add user data to session
    async session({ session, token }) {
      if (token) {
        // Override the session user with our custom fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).user = {
          id: token.id as number, // Use numeric ID directly
          email: token.email as string,
          firstName: token.firstName as string,
          lastName: token.lastName as string,
          tenantId: token.tenantId as number,
          roleId: token.roleId as number,
          roleName: token.roleName as string,
          permissions: token.permissions as string[],
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
