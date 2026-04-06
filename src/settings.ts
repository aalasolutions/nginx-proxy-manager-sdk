import type { RequestFn, Setting, UpdateSettingPayload } from './types.js';

export class Settings {
  constructor(private request: RequestFn) {}

  /**
   * List all settings.
   *
   * NPM exposes a small fixed set of settings (e.g. `default-site`).
   * The endpoint returns the full list with no pagination.
   */
  async list(): Promise<Setting[]> {
    return this.request<Setting[]>('GET', '/api/settings');
  }

  /**
   * Get a single setting by id.
   *
   * @param id The setting id, e.g. `'default-site'`.
   */
  async get(id: string): Promise<Setting> {
    return this.request<Setting>(
      'GET',
      `/api/settings/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Update a setting by id.
   *
   * Only `value` and `meta` are mutable; `id`, `name` and `description`
   * are fixed by NPM.
   *
   * For the `default-site` setting:
   * - `value: 'congratulations'` — show NPM's built-in welcome page
   * - `value: '404'` — return a 404
   * - `value: '444'` — drop the connection (nginx 444)
   * - `value: 'redirect'` — redirect to `meta.redirect`
   * - `value: 'html'` — serve `meta.html` as the response body
   *
   * @example
   * ```ts
   * await client.settings.update('default-site', {
   *   value: 'html',
   *   meta: { html: '<!DOCTYPE html><h1>Nothing here</h1>' },
   * });
   * ```
   */
  async update(
    id: string,
    payload: UpdateSettingPayload,
  ): Promise<Setting> {
    return this.request<Setting>(
      'PUT',
      `/api/settings/${encodeURIComponent(id)}`,
      { body: payload },
    );
  }
}
