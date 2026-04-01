import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { env } from "../config/env";

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

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

async function derivePasswordKey(password: string, passwordSalt: string) {
  return await scrypt(password, `${passwordSalt}:${env.AUTH_SECRET}`, PASSWORD_KEY_LENGTH) as Buffer;
}

export async function hashPassword(password: string) {
  const passwordSalt = randomBytes(16).toString("base64url");
  const derivedKey = await derivePasswordKey(password, passwordSalt);

  return {
    passwordHash: derivedKey.toString("base64url"),
    passwordSalt
  };
}

export async function verifyPassword(password: string, passwordHash: string, passwordSalt: string) {
  try {
    const derivedKey = await derivePasswordKey(password, passwordSalt);
    const storedKey = Buffer.from(passwordHash, "base64url");

    if (storedKey.length !== derivedKey.length) {
      return false;
    }

    return timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
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