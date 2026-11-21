import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionToken,
  verifySessionToken,
  getAuthCookieOptions,
  getClearCookieOptions,
  isHttpsConnection,
  REMEMBER_ME_MAX_AGE,
} from './sessionCookie';

describe('Authentication Persistence & Session Cookie Engine', () => {
  describe('Case 1: rememberMe = true (Persistent 30-Day Session)', () => {
    it('sets cookie maxAge to exactly 30 days (2,592,000s) and generates matching token expiration', () => {
      const headers = new Headers();
      const options = getAuthCookieOptions(headers, 'http://localhost:3000', true);

      // Verify maxAge is exactly 30 days
      assert.equal(options.maxAge, REMEMBER_ME_MAX_AGE);
      assert.equal(options.maxAge, 30 * 24 * 60 * 60);
      assert.equal(options.httpOnly, true);
      assert.equal(options.sameSite, 'lax');
      assert.equal(options.path, '/');

      // Verify generated token expiration matches 30 days
      const token = createSessionToken('TCH-001', 'teacher', true);
      const verification = verifySessionToken(token);

      assert.equal(verification.valid, true);
      assert.ok(verification.payload);
      assert.equal(verification.payload?.uid, 'TCH-001');
      assert.equal(verification.payload?.role, 'teacher');
      assert.equal(verification.payload?.rem, true);

      const tokenDurationMs = verification.payload.exp - verification.payload.iat;
      assert.equal(tokenDurationMs, REMEMBER_ME_MAX_AGE * 1000);
    });
  });

  describe('Case 2: rememberMe = false (Session Cookie)', () => {
    it('leaves cookie maxAge undefined for clean session cookie discarded on browser close', () => {
      const headers = new Headers();
      const options = getAuthCookieOptions(headers, 'http://localhost:3000', false);

      // Verify maxAge is undefined (session cookie)
      assert.equal(options.maxAge, undefined);
      assert.equal(options.httpOnly, true);
      assert.equal(options.sameSite, 'lax');
      assert.equal(options.path, '/');

      // Verify token generated with rem = false
      const token = createSessionToken('TCH-002', 'teacher', false);
      const verification = verifySessionToken(token);

      assert.equal(verification.valid, true);
      assert.ok(verification.payload);
      assert.equal(verification.payload?.rem, false);
    });
  });

  describe('Case 3: Protocol-Aware Secure Flag (HTTP vs HTTPS)', () => {
    it('disables secure flag on HTTP (localhost / LAN IP) so browser does not drop cookies', () => {
      const httpHeaders = new Headers();
      assert.equal(isHttpsConnection(httpHeaders, 'http://localhost:3000'), false);
      assert.equal(isHttpsConnection(httpHeaders, 'http://192.168.1.100:3000'), false);

      const options = getAuthCookieOptions(httpHeaders, 'http://localhost:3000', true);
      assert.equal(options.secure, false);
    });

    it('enables secure flag when connected via HTTPS (URL or x-forwarded-proto)', () => {
      const httpsHeaders = new Headers({ 'x-forwarded-proto': 'https' });
      assert.equal(isHttpsConnection(httpsHeaders, 'http://localhost:3000'), true);

      const optionsWithProxy = getAuthCookieOptions(httpsHeaders, 'http://localhost:3000', true);
      assert.equal(optionsWithProxy.secure, true);

      const directHttpsHeaders = new Headers();
      assert.equal(isHttpsConnection(directHttpsHeaders, 'https://manstat.obec.local'), true);

      const optionsDirectHttps = getAuthCookieOptions(directHttpsHeaders, 'https://manstat.obec.local', true);
      assert.equal(optionsDirectHttps.secure, true);
    });
  });

  describe('Case 4: Clear Cookie Options (Immediate Expiration on Logout)', () => {
    it('sets maxAge: 0 to clean cookies immediately on logout', () => {
      const headers = new Headers();
      const clearOptions = getClearCookieOptions(headers, 'http://localhost:3000');

      assert.equal(clearOptions.maxAge, 0);
      assert.equal(clearOptions.httpOnly, true);
      assert.equal(clearOptions.path, '/');
    });
  });

  describe('Case 5: Backward Compatibility & Expired Token Rejection', () => {
    it('gracefully validates legacy tokens formatted as mst_<rand>_<timestamp>', () => {
      const recentTimestamp = Date.now() - 1000 * 60; // 1 min ago
      const legacyToken = `mst_randomstring_${recentTimestamp}`;
      const verification = verifySessionToken(legacyToken);
      assert.equal(verification.valid, true);
    });

    it('rejects tokens that have expired', () => {
      const pastExp = Date.now() - 1000; // 1s in the past
      // Construct expired payload
      const expiredPayload = {
        v: 1,
        uid: 'TCH-EXPIRED',
        role: 'teacher',
        rem: true,
        iat: pastExp - 10000,
        exp: pastExp,
      };
      const base64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
      const expiredToken = `mst.${base64}`;

      const verification = verifySessionToken(expiredToken);
      assert.equal(verification.valid, false);
      assert.equal(verification.error, 'Session token has expired');
    });
  });
});
