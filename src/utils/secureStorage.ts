/**
 * AES-GCM encrypted localStorage wrapper for sensitive user data.
 * Key material stays on-device; ciphertext only in localStorage.
 */

const KEY_STORAGE = 'pgt_enc_key_v1';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_STORAGE);
  if (stored) {
    const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const exported = await crypto.subtle.exportKey('raw', key);
  localStorage.setItem(
    KEY_STORAGE,
    btoa(String.fromCharCode(...new Uint8Array(exported)))
  );
  return key;
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return 'enc:' + btoa(String.fromCharCode(...combined));
}

async function decrypt(stored: string): Promise<string | null> {
  if (!stored.startsWith('enc:')) return stored;
  try {
    const key = await getOrCreateKey();
    const combined = Uint8Array.from(atob(stored.slice(4)), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}

const SENSITIVE_KEYS = new Set([
  'pgt_user_config_v2',
  'pgt_goals_v2',
  'pgt_daily_logs_v2',
  'pgt_journals_v2',
  'pgt_digests_v2',
  'pgt_daily_intentions_v1',
]);

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
}

/** Sync read — returns raw string; decrypt happens in async loader */
export function secureGetItem(key: string): string | null {
  return localStorage.getItem(key);
}

export async function secureGetItemDecrypted(key: string): Promise<string | null> {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  if (!isSensitiveKey(key) || !raw.startsWith('enc:')) return raw;
  return decrypt(raw);
}

export async function secureSetItem(key: string, value: string): Promise<void> {
  if (isSensitiveKey(key)) {
    const encrypted = await encrypt(value);
    localStorage.setItem(key, encrypted);
  } else {
    localStorage.setItem(key, value);
  }
}

/** Migrate plain-text sensitive keys to encrypted form on first load */
export async function migrateToSecureStorage(): Promise<void> {
  for (const key of SENSITIVE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw && !raw.startsWith('enc:')) {
      await secureSetItem(key, raw);
    }
  }
}
