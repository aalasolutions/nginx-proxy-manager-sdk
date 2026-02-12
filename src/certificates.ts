import type {
  RequestFn,
  Certificate,
  CreateCertificatePayload,
  TestHttpResult,
} from './types.js';

const CERT_TIMEOUT = 900_000; // 15 minutes, matching NPM backend

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

export class Certificates {
  constructor(private request: RequestFn) {}

  /**
   * List all certificates.
   */
  async list(options?: {
    expand?: ('owner' | 'proxy_hosts' | 'redirection_hosts' | 'dead_hosts' | 'streams')[];
    query?: string;
  }): Promise<Certificate[]> {
    const params: Record<string, string> = {};

    if (options?.expand?.length) {
      params.expand = options.expand.join(',');
    }
    if (options?.query) {
      params.query = options.query;
    }

    return this.request<Certificate[]>('GET', '/api/nginx/certificates', { params });
  }

  /**
   * Get a single certificate by ID.
   */
  async get(
    id: number,
    options?: {
      expand?: ('owner' | 'proxy_hosts' | 'redirection_hosts' | 'dead_hosts' | 'streams')[];
    },
  ): Promise<Certificate> {
    const params: Record<string, string> = {};

    if (options?.expand?.length) {
      params.expand = options.expand.join(',');
    }

    return this.request<Certificate>('GET', `/api/nginx/certificates/${id}`, { params });
  }

  /**
   * Create a new certificate.
   *
   * For Let's Encrypt HTTP-01:
   *   { provider: 'letsencrypt', domain_names: ['example.com'], meta: { key_type: 'ecdsa' } }
   *
   * For custom certificates, use createCustom() instead.
   *
   * Note: This can take up to 15 minutes for Let's Encrypt provisioning.
   */
  async create(payload: CreateCertificatePayload): Promise<Certificate> {
    // Validate domain names for Let's Encrypt certificates
    if (payload.provider === 'letsencrypt' && 'domain_names' in payload) {
      validateDomainNames(payload.domain_names);
    }

    return this.request<Certificate>('POST', '/api/nginx/certificates', {
      body: payload,
      timeout: CERT_TIMEOUT,
    });
  }

  /**
   * Delete a certificate.
   */
  async delete(id: number): Promise<boolean> {
    return this.request<boolean>('DELETE', `/api/nginx/certificates/${id}`);
  }

  /**
   * Force-renew a Let's Encrypt certificate.
   * Can take up to 15 minutes.
   */
  async renew(id: number): Promise<Certificate> {
    return this.request<Certificate>('POST', `/api/nginx/certificates/${id}/renew`, {
      timeout: CERT_TIMEOUT,
    });
  }

  /**
   * Test HTTP reachability for domains before requesting a certificate.
   * Returns a map of domain -> status ('ok', 'no-host', 'failed', '404', 'wrong-data').
   *
   * Use this as a pre-flight check before creating a Let's Encrypt cert.
   */
  async testHttp(domains: string[]): Promise<TestHttpResult> {
    // Validate domains before testing
    validateDomainNames(domains);

    return this.request<TestHttpResult>('POST', '/api/nginx/certificates/test-http', {
      body: { domains },
    });
  }
}
