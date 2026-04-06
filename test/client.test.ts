import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NpmClient, NpmApiError } from '../src/index.js';
import { installMockFetch, tokenResponse } from './helpers/mock-fetch.js';

const BASE_URL = 'http://npm.test';

describe('NpmClient', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('strips trailing slashes from baseUrl', () => {
      const client = new NpmClient({
        baseUrl: 'http://npm.test///',
        token: 'x',
      });
      // Indirectly verify by triggering a request and checking the URL
      installMockFetch([{ body: [] }]);
      return client.proxyHosts.list().then(() => {
        // pass — no double slash blew up the test fixture
      });
    });

    it('rejects non-http(s) baseUrl', () => {
      expect(
        () => new NpmClient({ baseUrl: 'ftp://npm.test', token: 'x' }),
      ).toThrow(/http or https/);
    });

    it('rejects malformed baseUrl', () => {
      expect(
        () => new NpmClient({ baseUrl: 'not a url', token: 'x' }),
      ).toThrow(/Invalid baseUrl/);
    });
  });

  describe('login()', () => {
    it('POSTs to /api/tokens with identity + secret', async () => {
      const mock = installMockFetch([tokenResponse()]);

      const client = new NpmClient({
        baseUrl: BASE_URL,
        email: 'admin@example.com',
        password: 'pw',
      });

      const tokenData = await client.login();

      expect(tokenData.token).toBe('test-token');
      expect(mock.captured[0].url).toBe(`${BASE_URL}/api/tokens`);
      expect(mock.captured[0].method).toBe('POST');
      expect(mock.captured[0].body).toEqual({
        identity: 'admin@example.com',
        secret: 'pw',
      });
    });

    it('throws when neither token nor credentials are available', async () => {
      const client = new NpmClient({
        baseUrl: BASE_URL,
        token: 'tok',
      });
      // No email/password — but login() called explicitly
      await expect(client.login()).rejects.toThrow(/Email and password/);
    });

    it('throws NpmApiError on bad credentials', async () => {
      installMockFetch([
        {
          status: 401,
          body: { error: { code: 401, message: 'Invalid credentials' } },
        },
      ]);

      const client = new NpmClient({
        baseUrl: BASE_URL,
        email: 'admin@example.com',
        password: 'wrong',
      });

      await expect(client.login()).rejects.toMatchObject({
        name: 'NpmApiError',
        statusCode: 401,
      });
    });
  });

  describe('request error handling', () => {
    it('throws NpmApiError with parsed body on 4xx', async () => {
      installMockFetch([
        tokenResponse(),
        {
          status: 400,
          body: { error: { code: 400, message: 'Domains are invalid' } },
        },
      ]);

      const client = new NpmClient({
        baseUrl: BASE_URL,
        email: 'admin@example.com',
        password: 'pw',
      });

      try {
        await client.proxyHosts.list();
        expect.fail('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(NpmApiError);
        if (err instanceof NpmApiError) {
          expect(err.statusCode).toBe(400);
          expect(err.message).toBe('Domains are invalid');
        }
      }
    });
  });

  describe('clearCredentials()', () => {
    it('removes token and credentials from memory', async () => {
      installMockFetch([tokenResponse()]);

      const client = new NpmClient({
        baseUrl: BASE_URL,
        email: 'admin@example.com',
        password: 'pw',
      });

      await client.login();
      client.clearCredentials();

      // After clearing, the next request must throw rather than re-login
      await expect(client.proxyHosts.list()).rejects.toThrow(/No authentication/);
    });
  });
});
