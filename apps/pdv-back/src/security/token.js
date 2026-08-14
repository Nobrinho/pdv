const crypto = require("crypto");
const { config } = require("../config");

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function sign(value) {
  return base64url(crypto.createHmac("sha256", config.tokenSecret).update(value).digest());
}

function createToken(payload, expiresInSeconds = 60 * 60 * 12) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const encoded = base64url(JSON.stringify(body));
  return `${encoded}.${sign(encoded)}`;
}

function verifyToken(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature || sign(encoded) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64url(encoded));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

module.exports = { createToken, verifyToken };
