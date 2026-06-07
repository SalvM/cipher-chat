const PBKDF2_ITERATIONS = 600_000;
const SESSION_PK_KEY = 'cipher_pk';

export class CryptoService {
  static cacheSessionKey(pkcs8: ArrayBuffer): void {
    sessionStorage.setItem(
      SESSION_PK_KEY,
      btoa(String.fromCharCode(...new Uint8Array(pkcs8)))
    );
  }

  static getSessionKeyBytes(): ArrayBuffer | null {
    const b64 = sessionStorage.getItem(SESSION_PK_KEY);
    if (!b64) return null;
    const arr = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return arr.buffer.slice(0);
  }

  static clearSessionKey(): void {
    sessionStorage.removeItem(SESSION_PK_KEY);
  }

  static async importPrivateKeyFromSession(): Promise<CryptoKey | null> {
    const pkcs8 = CryptoService.getSessionKeyBytes();
    if (!pkcs8) return null;
    try {
      return await crypto.subtle.importKey(
        'pkcs8',
        pkcs8,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
      );
    } catch {
      return null;
    }
  }


  static async generateIdentityKeypair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async exportPublicKey(key: CryptoKey): Promise<string> {
    const spki = await crypto.subtle.exportKey('spki', key);
    return btoa(String.fromCharCode(...new Uint8Array(spki)));
  }

  static async importPublicKey(base64Spki: string): Promise<CryptoKey> {
    const bytes = Uint8Array.from(atob(base64Spki), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey(
      'spki',
      bytes,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );
  }

  static async encryptPrivateKey(
    privateKey: CryptoKey,
    password: string
  ): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrapKey = await CryptoService._deriveAesKey(password, salt);
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);
    CryptoService.cacheSessionKey(pkcs8);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      wrapKey,
      pkcs8
    );
    const bundle = new Uint8Array(16 + 12 + ciphertext.byteLength);
    bundle.set(salt, 0);
    bundle.set(iv, 16);
    bundle.set(new Uint8Array(ciphertext), 28);
    return btoa(String.fromCharCode(...bundle));
  }

  static async decryptPrivateKey(
    base64Bundle: string,
    password: string
  ): Promise<CryptoKey> {
    const bundle = Uint8Array.from(atob(base64Bundle), (c) => c.charCodeAt(0));
    const salt = bundle.slice(0, 16);
    const iv = bundle.slice(16, 28);
    const ciphertext = bundle.slice(28);
    const wrapKey = await CryptoService._deriveAesKey(password, salt);
    const pkcs8 = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      wrapKey,
      ciphertext
    );
    CryptoService.cacheSessionKey(pkcs8);
    return crypto.subtle.importKey(
      'pkcs8',
      pkcs8,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );
  }

  private static async _deriveAesKey(
    password: string,
    salt: Uint8Array<ArrayBuffer>
  ): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async rsaEncrypt(
    publicKey: CryptoKey,
    data: ArrayBuffer
  ): Promise<string> {
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      data
    );
    return btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  }

  static async rsaDecrypt(
    privateKey: CryptoKey,
    base64Ciphertext: string
  ): Promise<ArrayBuffer> {
    const bytes = Uint8Array.from(atob(base64Ciphertext), (c) =>
      c.charCodeAt(0)
    );
    return crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, bytes);
  }

  static async generateConversationKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async exportRawKey(key: CryptoKey): Promise<ArrayBuffer> {
    return crypto.subtle.exportKey('raw', key);
  }

  static async importConversationKey(rawBytes: ArrayBuffer): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      rawBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Returns base64(iv[12] || ciphertext)
  static async encryptMessage(key: CryptoKey, plaintext: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext)
    );
    const combined = new Uint8Array(12 + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), 12);
    return btoa(String.fromCharCode(...combined));
  }

  static async decryptMessage(
    key: CryptoKey,
    base64Ciphertext: string
  ): Promise<string> {
    const combined = Uint8Array.from(atob(base64Ciphertext), (c) =>
      c.charCodeAt(0)
    );
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(plaintext);
  }

  static async decryptMessageSafe(
    key: CryptoKey,
    base64Ciphertext: string
  ): Promise<string> {
    try {
      return await CryptoService.decryptMessage(key, base64Ciphertext);
    } catch {
      return '[Encrypted message]';
    }
  }
}
