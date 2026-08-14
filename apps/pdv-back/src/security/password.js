const crypto = require("crypto");

const ITERATIONS = 600000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  const hash = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}

module.exports = { hashPassword, verifyPassword, ITERATIONS };
