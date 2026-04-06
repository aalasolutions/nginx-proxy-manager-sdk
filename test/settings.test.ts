import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NpmClient } from '../src/index.js';
import { installMockFetch, tokenResponse } from './helpers/mock-fetch.js';

const BASE_URL = 'http://npm.test';
const SAMPLE_SETTING = {
  id: 'default-site',
  name: 'Default Site',
  description: 'What to show when Nginx is hit with an unknown Host',
  value: 'congratulations',
  meta: {},
};

describe('Settings', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('list()', () => {
    it('returns an array of settings', async () => {
      const mock = installMockFetch([
        tokenResponse(),
        { body: [SAMPLE_SETTING] },
      ]);

      const client = new NpmClient({
        baseUrl: BASE_URL,
        email: 'admin@example.com',
        password: 'pw',
      });

      const result = await client.settings.list();

      expect(result).toEqual([SAMPLE_SETTING]);
      expect(mock.drained()).toBe(true);
    });

    it('issues GET /api/settings with the bearer token', async () => {
      const mock = installMockFetch([
        tokenResponse(),
        { body: [SAMPLE_SETTING] },
      ]);

      const client = new NpmClient({
        baseUrl: BASE_URL,
        email: 'admin@example.com',
        password: 'pw',
      });

      await client.settings.list();

      // [0] is the login POST, [1] is the actual list call
      const call = mock.captured[1];
      expect(call.method).toBe('GET');
      expect(call.url).toBe(`${BASE_URL}/api/settings`);
      expect(call.headers['authorization']).toBe('Bearer test-token');
    });
  });

  describe('get()', () => {
    it('returns a single setting by id', async () => {
      const mock = installMockFetch([
        { body: SAMPLE_SETTING },
      ]);

      const client = new NpmClient({
        baseUrl: BASE_URL,
        token: 'pre-existing-token',
      });

      const result = await client.settings.get('default-site');

      expect(result).toEqual(SAMPLE_SETTING);
      // Only the GET — no login call because we passed a token directly
      expect(mock.captured.length).toBe(1);
      expect(mock.captured[0].url).toBe(`${BASE_URL}/api/settings/default-site`);
      expect(mock.captured[0].headers['authorization']).toBe('Bearer pre-existing-token');
    });

    it('url-encodes the setting id', async () => {
      const mock = installMockFetch([
        tokenResponse(),
        { body: SAMPLE_SETTING },
      ]);

      const client = new NpmClient({
        baseUrl: BASE_URL,
        email: 'admin@example.com',
        password: 'pw',
      });

      await client.settings.get('weird id/with stuff');

      const call = mock.captured[1];
      expect(call.url).toBe(
        `${BASE_URL}/api/settings/weird%20id%2Fwith%20stuff`,
      );
    });
  });

  describe('update()', () => {
    it('PUTs the value and meta payload', async () => {
      const updated = {
        ...SAMPLE_SETTING,
        value: 'html',
        meta: { html: '<h1>hi</h1>' },
      };

      const mock = installMockFetch([
        tokenResponse(),
        { body: updated },
      ]);

      const client = new NpmClient({
        baseUrl: BASE_URL,
        email: 'admin@example.com',
        password: 'pw',
      });

      const result = await client.settings.update('default-site', {
        value: 'html',
        meta: { html: '<h1>hi</h1>' },
      });

      expect(result).toEqual(updated);

      const call = mock.captured[1];
      expect(call.method).toBe('PUT');
      expect(call.url).toBe(`${BASE_URL}/api/settings/default-site`);
      expect(call.body).toEqual({
        value: 'html',
        meta: { html: '<h1>hi</h1>' },
      });
      expect(call.headers['content-type']).toBe('application/json');
    });

    it('accepts a value-only payload (omitted meta)', async () => {
      const mock = installMockFetch([
        tokenResponse(),
        { body: { ...SAMPLE_SETTING, value: '404' } },
      ]);

      const client = new NpmClient({
        baseUrl: BASE_URL,
        email: 'admin@example.com',
        password: 'pw',
      });

      const result = await client.settings.update('default-site', {
        value: '404',
      });

      expect(result.value).toBe('404');
      expect(mock.captured[1].body).toEqual({ value: '404' });
    });
  });
});
