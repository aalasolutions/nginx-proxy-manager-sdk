import { vi, type Mock } from 'vitest';

/**
 * A captured request observed by the mock fetch.
 * Useful for asserting on what the SDK actually sent.
 */
export interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * A scripted response for the mock fetch to return.
 *
 * - `status` defaults to 200
 * - `body` is JSON-stringified before being returned
 */
export interface MockResponse {
  status?: number;
  body?: unknown;
}

/**
 * Install a mocked global `fetch` that returns scripted responses in order
 * and captures every outgoing request for assertions.
 *
 * Each call to the mocked fetch consumes the next response in the queue.
 * If the queue is exhausted the mock throws.
 */
export function installMockFetch(responses: MockResponse[]) {
  const captured: CapturedRequest[] = [];
  const queue = [...responses];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {};

    if (init?.headers) {
      const h = new Headers(init.headers);
      h.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
    }

    let body: unknown = undefined;
    if (init?.body && typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }

    captured.push({ url, method, headers, body });

    const next = queue.shift();
    if (!next) {
      throw new Error(
        `mock fetch exhausted: unexpected ${method} ${url}`,
      );
    }

    const status = next.status ?? 200;
    const responseBody = JSON.stringify(next.body ?? null);

    return new Response(responseBody, {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as Mock;

  globalThis.fetch = fetchMock as unknown as typeof fetch;

  return {
    captured,
    fetchMock,
    /** True when every scripted response has been consumed. */
    drained: () => queue.length === 0,
    /** Number of responses still queued. */
    remaining: () => queue.length,
  };
}

/**
 * A scripted token response NPM returns from `POST /api/tokens`.
 * Expires 1 hour in the future by default.
 */
export function tokenResponse(opts?: { expiresInMs?: number }): MockResponse {
  return {
    status: 200,
    body: {
      token: 'test-token',
      expires: new Date(Date.now() + (opts?.expiresInMs ?? 60 * 60 * 1000)).toISOString(),
    },
  };
}
