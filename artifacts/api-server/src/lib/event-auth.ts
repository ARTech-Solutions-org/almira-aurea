import crypto from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { db, organizerUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const scrypt = promisify(crypto.scrypt);
const COOKIE_NAME = "event_checkin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type SessionPayload = {
  username: string;
  expiresAt: number;
};

const secret = () => process.env.SESSION_SECRET ?? "development-only-event-checkin-secret";

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload): string {
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${value}.${sign(value)}`;
}

function decodeSession(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload;
    if (!payload.username || !payload.expiresAt || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey);
}

export function setSession(res: Response, username: string): void {
  const maxAge = SESSION_TTL_MS;
  res.cookie(
    COOKIE_NAME,
    encodeSession({ username, expiresAt: Date.now() + maxAge }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge,
      path: "/",
    },
  );
}

export function clearSession(res: Response): void {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function getSessionUser(req: Request) {
  const payload = decodeSession(req.cookies?.[COOKIE_NAME] as string | undefined);
  if (!payload) return null;
  const [user] = await db
    .select({ username: organizerUsersTable.username, displayName: organizerUsersTable.displayName })
    .from(organizerUsersTable)
    .where(eq(organizerUsersTable.username, payload.username))
    .limit(1);
  return user ?? null;
}