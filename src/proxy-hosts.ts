import type {
  RequestFn,
  ProxyHost,
  CreateProxyHostPayload,
  UpdateProxyHostPayload,
} from './types.js';

/**
 * Validates advanced_config to prevent common nginx injection attacks.
 * Throws an error if the config contains potentially dangerous patterns.
 */
function validateAdvancedConfig(config: string | undefined): void {
  if (!config || config.trim() === '') {
    return;
  }

  // Check for dangerous patterns that could break out of nginx config blocks
  const dangerousPatterns = [
    /}\s*server\s*{/i,  // Attempting to close and open new server block
    /}\s*http\s*{/i,    // Attempting to close and open http block
    /include\s+/i,      // Include directive could load arbitrary files
    /lua_/i,            // Lua directives could execute arbitrary code
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(config)) {
      throw new Error(
        'Invalid advanced_config: contains potentially dangerous nginx directive. ' +
        'Avoid closing server blocks, include directives, or Lua code.',
      );
    }
  }
}

/**
 * Validates domain names to ensure they follow RFC standards and prevent injection.
 */
function validateDomainNames(domains: string[] | undefined): void {
  if (!domains || domains.length === 0) {
    return;
  }

  // RFC-compliant domain regex (simplified for common cases)
  const domainPattern = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  for (const domain of domains) {
    if (!domain || domain.trim() === '') {
      throw new Error('Domain name cannot be empty');
    }

    // Check for control characters or special characters that could cause issues
    if (/[\s\n\r\t;{}\\]/.test(domain)) {
      throw new Error(`Invalid domain name: "${domain}" contains illegal characters`);
    }

    // Validate domain format (allowing wildcards for SSL certificates)
    if (!domainPattern.test(domain)) {
      throw new Error(`Invalid domain name format: "${domain}"`);
    }

    // Check length constraints
    if (domain.length > 253) {
      throw new Error(`Domain name too long: "${domain}" (max 253 characters)`);
    }
  }
}

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
