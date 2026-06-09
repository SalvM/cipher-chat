import crypto from 'crypto';

const hash256 = (s) => {
  return crypto.createHash('sha256').update(s).digest('hex');
};

const hashRecoveryPhrase = (phrase) => {
  return hash256(phrase.toLowerCase())
};

/**
 * Encrypts plaintext with AES-256-GCM.
 * Output format (base64): iv(12 bytes) + authTag(16 bytes) + ciphertext
 * IV is random per call — reusing an IV with the same key breaks GCM security.
 * @param {string} content - Plaintext to encrypt
 * @param {string} _key - 32-byte key as hex string
 * @returns {string} Base64-encoded encrypted payload
 */
const encryptMessage = (content, _key) => {
  const key = Buffer.from(_key, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

/**
 * Decrypts an AES-256-GCM payload produced by encryptMessage.
 * Returns null on auth tag mismatch or any decryption error.
 * @param {string} encryptedContent - Base64-encoded payload
 * @param {string} _key - 32-byte key as hex string
 * @returns {string|null} Decrypted plaintext or null on failure
 */
const decryptMessage = (encryptedContent, _key) => {
  try {
    const key = Buffer.from(_key, 'hex');
    const data = Buffer.from(encryptedContent, 'base64');
    const iv = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const ciphertext = data.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final('utf8');
  } catch (err) {
    console.error('Decryption error:', err);
    return null;
  }
};

export {
  hash256,
  hashRecoveryPhrase,
  encryptMessage,
  decryptMessage
}