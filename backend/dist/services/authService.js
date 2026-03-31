"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthToken = createAuthToken;
exports.verifyAuthToken = verifyAuthToken;
const node_crypto_1 = require("node:crypto");
const env_1 = require("../config/env");
function toBase64Url(value) {
    return Buffer.from(value, "utf8").toString("base64url");
}
function fromBase64Url(value) {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}
function signValue(value) {
    return (0, node_crypto_1.createHmac)("sha256", env_1.env.AUTH_SECRET).update(value).digest("base64url");
}
function createAuthToken(payload) {
    const now = Math.floor(Date.now() / 1000);
    const completePayload = {
        ...payload,
        iat: now,
        exp: now + env_1.env.AUTH_TOKEN_TTL_HOURS * 60 * 60
    };
    const encodedPayload = toBase64Url(JSON.stringify(completePayload));
    const signature = signValue(encodedPayload);
    return {
        token: `${encodedPayload}.${signature}`,
        expiresAt: new Date(completePayload.exp * 1000).toISOString()
    };
}
function verifyAuthToken(token) {
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
    if (!(0, node_crypto_1.timingSafeEqual)(providedBuffer, expectedBuffer)) {
        return null;
    }
    try {
        const payload = fromBase64Url(encodedPayload);
        if (payload.exp <= Math.floor(Date.now() / 1000)) {
            return null;
        }
        return payload;
    }
    catch {
        return null;
    }
}
