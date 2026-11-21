/**
 * ============================================================================
 * ManStat-Modern: Session Cookie & Token Engine (sessionCookie.ts)
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
 * Creates a structured session token containing user ID, role, and expiration timestamp.
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
  return `mst.${encodedPayload}`;
}

/**
 * Verifies and parses a session token. Supports both structured mst.<payload> and legacy mst_<rand>_<iat>.
 */
export function verifySessionToken(token?: string | null): {
  valid: boolean;
  payload: SessionTokenPayload | null;
  error?: string;
} {
  if (!token) {
    return { valid: false, payload: null, error: 'No token provided' };
  }

  // 1. Modern Structured Token (mst.<base64url>)
  if (token.startsWith('mst.')) {
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const jsonStr = fromBase64Url(parts[1]);
        const payload: SessionTokenPayload = JSON.parse(jsonStr);

        const now = Date.now();
        if (payload.exp && now > payload.exp) {
          return { valid: false, payload, error: 'Session token has expired' };
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
