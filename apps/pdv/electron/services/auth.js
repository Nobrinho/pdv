const crypto = require("crypto");

const ITERATIONS_NEW = 600000;
const ITERATIONS_LEGACY = 1000;

/**
 * Gera hash seguro de senha com salt aleatório.
 * @param {string} password - Senha em texto puro
 * @returns {{ salt: string, hash: string }}
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS_NEW, 64, "sha512")
    .toString("hex");
  return { salt, hash };
}

/**
 * Verifica senha contra hash armazenado.
 * Suporta migração progressiva: testa iterações novas primeiro,
 * depois tenta legado (1000 iterações). Se match legado, sinaliza re-hash.
 *
 * @param {string} password - Senha em texto puro
 * @param {string} salt - Salt armazenado
 * @param {string} storedHash - Hash armazenado
 * @returns {{ valid: boolean, needsRehash: boolean }}
 */
function verifyPassword(password, salt, storedHash) {
  // Tenta com iterações novas
  const hashNew = crypto
    .pbkdf2Sync(password, salt, ITERATIONS_NEW, 64, "sha512")
    .toString("hex");
  if (hashNew === storedHash) return { valid: true, needsRehash: false };

  // Fallback para hash legado (migração progressiva)
  const hashOld = crypto
    .pbkdf2Sync(password, salt, ITERATIONS_LEGACY, 64, "sha512")
    .toString("hex");
  if (hashOld === storedHash) return { valid: true, needsRehash: true };

  return { valid: false, needsRehash: false };
}

module.exports = { hashPassword, verifyPassword, ITERATIONS_NEW, ITERATIONS_LEGACY };
