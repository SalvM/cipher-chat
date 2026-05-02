import crypto from 'crypto';

const hash256 = (s) => {
  return crypto.createHash('sha256').update(s).digest('hex');
};

const hashRecoveryPhrase = (phrase) => {
  return hash256(phrase.toLowerCase())
};

const encryptMessage = (content, _key) => {
  const key = Buffer.from(_key, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

const decryptMessage = (encryptedContent, _key) => {
  try {
    const key = Buffer.from(_key);
    const data = Buffer.from(encryptedContent, 'base64');
    const iv = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const ciphertext = data.subarray(28);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final('utf8');
  } catch (err) {
    console.error('Decryption error:', err);
    return encryptedContent;
  }
};

export {
  hash256,
  hashRecoveryPhrase,
  encryptMessage,
  decryptMessage
}