import type {
  RequestFn,
  ProxyHost,
  CreateProxyHostPayload,
  UpdateProxyHostPayload,
} from './types.js';
import { validateAdvancedConfig, validateDomainNames } from './validation.js';

export class ProxyHosts {
  constructor(private request: RequestFn) {}

  /**
   * List all proxy hosts.
   * Pass `expand` to include related objects (owner, certificate, access_list).
   */
  async list(options?: {
    expand?: ('owner' | 'certificate' | 'access_list')[];
    query?: string;
  }): Promise<ProxyHost[]> {
    const params: Record<string, string> = {};

    if (options?.expand?.length) {
      params.expand = options.expand.join(',');
    }
    if (options?.query) {
      params.query = options.query;
    }

    return this.request<ProxyHost[]>('GET', '/api/nginx/proxy-hosts', { params });
  }

  /**
   * Get a single proxy host by ID.
   */
  async get(
    id: number,
    options?: { expand?: ('owner' | 'certificate' | 'access_list')[] },
  ): Promise<ProxyHost> {
    const params: Record<string, string> = {};

    if (options?.expand?.length) {
      params.expand = options.expand.join(',');
    }

    return this.request<ProxyHost>('GET', `/api/nginx/proxy-hosts/${id}`, { params });
  }

  /**
   * Create a new proxy host.
   *
   * Set `certificate_id` to `"new"` to auto-provision a Let's Encrypt certificate.
   * Set it to `0` or omit for no SSL.
   */
  async create(payload: CreateProxyHostPayload): Promise<ProxyHost> {
    // Validate domain names
    validateDomainNames(payload.domain_names);
    
    // Validate advanced config for security
    validateAdvancedConfig(payload.advanced_config);
    
    // Validate location advanced configs
    if (payload.locations) {
      for (const location of payload.locations) {
        validateAdvancedConfig(location.advanced_config);
      }
    }

    return this.request<ProxyHost>('POST', '/api/nginx/proxy-hosts', {
      body: payload,
    });
  }

  /**
   * Update an existing proxy host. Only include the fields you want to change.
   */
  async update(id: number, payload: UpdateProxyHostPayload): Promise<ProxyHost> {
    // Validate domain names if provided
    validateDomainNames(payload.domain_names);
    
    // Validate advanced config for security
    validateAdvancedConfig(payload.advanced_config);
    
    // Validate location advanced configs
    if (payload.locations) {
      for (const location of payload.locations) {
        validateAdvancedConfig(location.advanced_config);
      }
    }

    return this.request<ProxyHost>('PUT', `/api/nginx/proxy-hosts/${id}`, {
      body: payload,
    });
  }

  /**
   * Delete a proxy host.
   */
  async delete(id: number): Promise<boolean> {
    return this.request<boolean>('DELETE', `/api/nginx/proxy-hosts/${id}`);
  }

  /**
   * Enable a proxy host.
   */
  async enable(id: number): Promise<boolean> {
    return this.request<boolean>('POST', `/api/nginx/proxy-hosts/${id}/enable`);
  }

  /**
   * Disable a proxy host.
   */
  async disable(id: number): Promise<boolean> {
    return this.request<boolean>('POST', `/api/nginx/proxy-hosts/${id}/disable`);
  }
}
