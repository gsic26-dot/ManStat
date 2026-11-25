/**
 * ============================================================================
 * ManStat: Session Cookie & Token Engine (sessionCookie.ts)
 * ============================================================================
 * - Standards-compliant "Remember Me" session persistence (30 days vs session)
 * - Safe HttpOnly, Lax, Path=/ cookies with dynamic protocol-aware Secure flag
 * - Structured session token generation and verification
 * - Universal runtime support (Node.js, Edge Middleware, Client)
 * - Multi-device independent sessions without cross-invalidation
 * ============================================================================
 */

export const REMEMBER_ME_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds (2,592,000s)
export const SESSION_MAX_AGE_FALLBACK = 24 * 60 * 60; // 1 day in seconds for non-remember sessions

export interface SessionTokenPayload {
  v: 1;
  uid: string;
  role: string;
  rem: boolean;
  iat: number;
  exp: number;
}

export interface AuthCookieOptions {
  httpOnly: boolean;
  sameSite: 'lax';
  path: string;
  secure: boolean;
  maxAge?: number;
}

/**
 * Universal base64url encoder supporting Node.js Buffer, Edge Runtime, and browser.
 */
function toBase64Url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Universal base64url decoder supporting Node.js Buffer, Edge Runtime, and browser.
 */
function fromBase64Url(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
  return decodeURIComponent(escape(atob(base64)));
}

/**
 * Determines whether the current request is over HTTPS.
 * Inspects reverse-proxy headers (x-forwarded-proto, front-end-https) and URL protocol.
 */
export function isHttpsConnection(headers?: Headers | null, urlString?: string): boolean {
  if (headers) {
    const forwardedProto = headers.get('x-forwarded-proto');
    if (forwardedProto) {
      return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
    }

    const frontEndHttps = headers.get('front-end-https');
    if (frontEndHttps && frontEndHttps.toLowerCase() === 'on') {
      return true;
    }
  }

  if (urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol === 'https:';
    } catch {
      // ignore parsing error
    }
  }

  return false;
}

/**
 * Returns the HMAC secret key for signing and verifying session tokens.
 */
function getSessionSecret(): string {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.SESSION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      'manstat-obec-hmac-secret-key-30030099'
    );
  }
  return 'manstat-obec-hmac-secret-key-30030099';
}

// Pure universal SHA-256 & HMAC-SHA256 (works in Node.js, Edge Runtime, and Web)
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(msg: Uint8Array): Uint8Array {
  const len = msg.length;
  const bitLenHi = Math.floor((len * 8) / 0x100000000);
  const bitLenLo = (len * 8) >>> 0;
  const padLen = ((len + 9 + 63) & ~63);
  const buf = new Uint8Array(padLen);
  buf.set(msg);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(padLen - 8, bitLenHi, false);
  view.setUint32(padLen - 4, bitLenLo, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false); outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false); outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false); outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false); outView.setUint32(28, h7, false);
  return out;
}

export function computeHmacSha256(data: string, secret: string = getSessionSecret()): string {
  const encoder = new TextEncoder();
  let keyBytes: Uint8Array = encoder.encode(secret);
  if (keyBytes.length > 64) {
    keyBytes = sha256Bytes(keyBytes);
  }
  const paddedKey = new Uint8Array(64);
  paddedKey.set(keyBytes);

  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  const dataBytes = encoder.encode(data);
  const innerBuf = new Uint8Array(64 + dataBytes.length);
  innerBuf.set(ipad);
  innerBuf.set(dataBytes, 64);
  const innerHash = sha256Bytes(innerBuf);

  const outerBuf = new Uint8Array(64 + 32);
  outerBuf.set(opad);
  outerBuf.set(innerHash, 64);
  const digest = sha256Bytes(outerBuf);

  let binary = '';
  for (let i = 0; i < digest.length; i++) {
    binary += String.fromCharCode(digest[i]);
  }
  return toBase64Url(binary);
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Creates a cryptographically signed session token (mst.<payload>.<hmac_sha256>).
 */
export function createSessionToken(userId: string, role: string, rememberMe: boolean): string {
  const iat = Date.now();
  const maxAgeSeconds = rememberMe ? REMEMBER_ME_MAX_AGE : SESSION_MAX_AGE_FALLBACK;
  const exp = iat + maxAgeSeconds * 1000;

  const payload: SessionTokenPayload = {
    v: 1,
    uid: userId || '',
    role: role || 'teacher',
    rem: rememberMe,
    iat,
    exp,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = computeHmacSha256(encodedPayload);
  return `mst.${encodedPayload}.${signature}`;
}

/**
 * Verifies and parses a session token. Enforces HMAC-SHA256 signature on mst.<payload>.<sig>.
 */
export function verifySessionToken(token?: string | null): {
  valid: boolean;
  payload: SessionTokenPayload | null;
  error?: string;
} {
  if (!token) {
    return { valid: false, payload: null, error: 'No token provided' };
  }

  // 1. Modern Structured Token (mst.<base64url>.<signature>)
  if (token.startsWith('mst.')) {
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const encodedPayload = parts[1];
        const jsonStr = fromBase64Url(encodedPayload);
        const payload: SessionTokenPayload = JSON.parse(jsonStr);

        const now = Date.now();
        if (payload.exp && now > payload.exp) {
          return { valid: false, payload, error: 'Session token has expired' };
        }

        // Enforce cryptographic HMAC-SHA256 signature verification
        if (parts.length !== 3 || !parts[2]) {
          return { valid: false, payload: null, error: 'Missing session token signature' };
        }

        const expectedSignature = computeHmacSha256(encodedPayload);
        if (!timingSafeEqualStr(parts[2], expectedSignature)) {
          return { valid: false, payload: null, error: 'Invalid session token signature' };
        }

        return { valid: true, payload };
      }
    } catch (err: any) {
      return { valid: false, payload: null, error: err.message };
    }
  }

  // 2. Backward Compatibility with legacy token (mst_<rand>_<timestamp>)
  if (token.startsWith('mst_')) {
    const parts = token.split('_');
    if (parts.length >= 3) {
      const timestamp = Number(parts[2]);
      if (!isNaN(timestamp)) {
        const isExpired = Date.now() - timestamp > REMEMBER_ME_MAX_AGE * 1000;
        return {
          valid: !isExpired,
          payload: {
            v: 1,
            uid: '',
            role: 'teacher',
            rem: true,
            iat: timestamp,
            exp: timestamp + REMEMBER_ME_MAX_AGE * 1000,
          },
          error: isExpired ? 'Legacy session token expired' : undefined,
        };
      }
    }

    // Default legacy token valid
    return {
      valid: true,
      payload: {
        v: 1,
        uid: '',
        role: 'teacher',
        rem: true,
        iat: Date.now(),
        exp: Date.now() + REMEMBER_ME_MAX_AGE * 1000,
      },
    };
  }

  return { valid: false, payload: null, error: 'Unrecognized token format' };
}

/**
 * Returns standards-compliant cookie options for setting authentication cookies.
 */
export function getAuthCookieOptions(
  headers?: Headers | null,
  urlString?: string,
  rememberMe: boolean = false
): AuthCookieOptions {
  const secure = isHttpsConnection(headers, urlString);

  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE } : {}),
  };
}

/**
 * Returns options for expiring/clearing authentication cookies immediately.
 */
export function getClearCookieOptions(
  headers?: Headers | null,
  urlString?: string
): AuthCookieOptions {
  const secure = isHttpsConnection(headers, urlString);

  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: 0,
  };
}
