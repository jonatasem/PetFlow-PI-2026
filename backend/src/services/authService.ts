import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";

export interface AuthTokenPayload {
  email: string;
  name: string;
  role: "admin";
  iat: number;
  exp: number;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url<T>(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function signValue(value: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
}

export function createAuthToken(payload: Omit<AuthTokenPayload, "iat" | "exp">) {
  const now = Math.floor(Date.now() / 1000);
  const completePayload: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + env.AUTH_TOKEN_TTL_HOURS * 60 * 60
  };
  const encodedPayload = toBase64Url(JSON.stringify(completePayload));
  const signature = signValue(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(completePayload.exp * 1000).toISOString()
  };
}

export function verifyAuthToken(token: string) {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = fromBase64Url<AuthTokenPayload>(encodedPayload);

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}