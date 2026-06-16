import { SignJWT, jwtVerify } from "jose";
import type { JwtPayload } from "./types";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";

function getSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  payload: JwtPayload,
  secret: string,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(getSecret(secret));
}

export async function signRefreshToken(userId: string, secret: string): Promise<string> {
  return new SignJWT({ type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(getSecret(secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(secret));
    return {
      sub: String(payload.sub),
      tid: String(payload.tid),
      email: String(payload.email),
      role: String(payload.role),
      branches: Array.isArray(payload.branches) ? payload.branches.map(String) : [],
    };
  } catch {
    return null;
  }
}

export function accessTokenExpiresInSeconds(): number {
  return 15 * 60;
}
