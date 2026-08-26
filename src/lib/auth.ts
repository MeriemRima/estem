import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { Role } from "@prisma/client";

const COOKIE = "estem_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET manquant");
  return new TextEncoder().encode(value);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    isSuperAdmin: user.isSuperAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string") {
      return null;
    }
    // Rafraîchir isSuperAdmin depuis la DB (cookie ancien possible)
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isSuperAdmin: true },
    });
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      isSuperAdmin: dbUser?.isSuperAdmin ?? Boolean(payload.isSuperAdmin),
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSession();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!user.isSuperAdmin) throw new Error("FORBIDDEN");
  return user;
}

export async function getMembership(userId: string, organizationId: string) {
  return prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
    },
  });
}

export async function requireOrgAccess(
  organizationId: string,
  roles: Role[] = ["OWNER", "ADMIN", "MEMBER"],
) {
  const user = await requireUser();
  if (user.isSuperAdmin) {
    return {
      user,
      membership: {
        id: "super",
        role: "OWNER" as Role,
        userId: user.id,
        organizationId,
      },
    };
  }
  const membership = await getMembership(user.id, organizationId);
  if (!membership || !roles.includes(membership.role)) {
    throw new Error("FORBIDDEN");
  }
  return { user, membership };
}

export async function getUserOrganizations(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { organization: { name: "asc" } },
  });
}

/** Gérant & Responsable gèrent le resto ; Équipe voit la cuisine. */
export function canManageRestaurant(role: Role | string) {
  return role === "OWNER" || role === "ADMIN";
}

export function canReceiveOrders(role: Role | string) {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}
