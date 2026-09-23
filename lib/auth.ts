/**
 * Authentication utilities.
 * - bcrypt for passcode hashing/verification
 * - jose for JWT session tokens in HTTP-only cookies
 */

import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config";

const SALT_ROUNDS = 10;

// Encode JWT secret as Uint8Array for jose
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(config.jwtSecret);
}

// --- Passcode ---

export async function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, SALT_ROUNDS);
}

export async function verifyPasscode(
  passcode: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(passcode, hash);
}

// --- JWT Session ---

export interface RoomSessionPayload {
  roomId: string;
  slug: string;
  sessionId: string;
}

export async function createRoomSession(
  roomId: string,
  slug: string
): Promise<{ token: string; sessionId: string }> {
  const sessionId = uuidv4();

  const token = await new SignJWT({
    roomId,
    slug,
    sessionId,
  } satisfies RoomSessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${config.cookieMaxAge}s`)
    .sign(getSecretKey());

  return { token, sessionId };
}

export async function verifyRoomSession(
  token: string
): Promise<RoomSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const { roomId, slug, sessionId } = payload as unknown as RoomSessionPayload;

    if (!roomId || !slug || !sessionId) {
      return null;
    }

    return { roomId, slug, sessionId };
  } catch {
    return null;
  }
}

// --- Cookie Helpers ---

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(config.cookieName, token, {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: "strict",
    maxAge: config.cookieMaxAge,
    path: "/",
  });
}

export async function getSessionFromCookie(): Promise<RoomSessionPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(config.cookieName);

  if (!cookie?.value) {
    return null;
  }

  return verifyRoomSession(cookie.value);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(config.cookieName);
}

/**
 * Verify that the current session matches a specific room slug.
 * Returns the session payload or null if unauthorized.
 */
export async function requireRoomAuth(
  slug: string
): Promise<RoomSessionPayload | null> {
  const session = await getSessionFromCookie();
  if (!session) return null;
  if (session.slug !== slug) return null;
  return session;
}
