# nginx-proxy-manager-sdk

TypeScript SDK for [Nginx Proxy Manager](https://nginxproxymanager.com/) API. Programmatic proxy host management, SSL certificate provisioning, and domain verification.

Zero dependencies. Works with Node.js 18+.

## Installation

```bash
npm install nginx-proxy-manager-sdk
```

## Quick Start

```typescript
import { NpmClient } from 'nginx-proxy-manager-sdk';

const client = new NpmClient({
  baseUrl: 'http://127.0.0.1:81',
  email: 'admin@example.com',
  password: 'your-password',
});

// List all proxy hosts
const hosts = await client.proxyHosts.list();

// Create a proxy host with auto SSL
const host = await client.proxyHosts.create({
  domain_names: ['app.example.com'],
  forward_scheme: 'http',
  forward_host: '127.0.0.1',
  forward_port: 3000,
  certificate_id: 'new',
  ssl_forced: true,
  allow_websocket_upgrade: true,
});
```

## Authentication

The SDK supports two authentication methods. You can use either or both.

**Credentials (auto-managed):** The SDK logs in on the first request and refreshes the token automatically when it expires.

```typescript
const client = new NpmClient({
  baseUrl: 'http://127.0.0.1:81',
  email: 'admin@example.com',
  password: 'your-password',
});
```

**Token (manual):** Use a pre-obtained Bearer token directly.

```typescript
const client = new NpmClient({
  baseUrl: 'http://127.0.0.1:81',
  token: 'eyJhbGciOi...',
});
```

**Both:** If both are provided, the token is used first. Credentials are used as fallback when the token expires.

You can also call `login()` and `refreshToken()` manually:

```typescript
const tokenData = await client.login();
console.log(tokenData.token, tokenData.expires);

const refreshed = await client.refreshToken();
```

## API

### Proxy Hosts

```typescript
// List all proxy hosts
const hosts = await client.proxyHosts.list();

// List with expanded relations
const hosts = await client.proxyHosts.list({
  expand: ['owner', 'certificate', 'access_list'],
  query: 'example.com',
});

// Get a single proxy host
const host = await client.proxyHosts.get(1);

// Create a proxy host
const host = await client.proxyHosts.create({
  domain_names: ['app.example.com'],
  forward_scheme: 'http',
  forward_host: '127.0.0.1',
  forward_port: 3000,
  certificate_id: 'new',    // auto-provision Let's Encrypt SSL
  ssl_forced: true,
  http2_support: true,
  block_exploits: true,
  allow_websocket_upgrade: true,
  advanced_config: '',       // raw nginx config (optional)
  locations: [],             // custom location blocks (optional)
});

// Update a proxy host (partial update, only send changed fields)
const updated = await client.proxyHosts.update(1, {
  forward_port: 4000,
  ssl_forced: true,
});

// Delete a proxy host
await client.proxyHosts.delete(1);

// Enable / Disable
await client.proxyHosts.enable(1);
await client.proxyHosts.disable(1);
```

### Certificates

```typescript
// List all certificates
const certs = await client.certificates.list();

// Get a single certificate
const cert = await client.certificates.get(1);

// Create a Let's Encrypt certificate (HTTP-01 challenge)
const cert = await client.certificates.create({
  provider: 'letsencrypt',
  domain_names: ['app.example.com'],
  meta: { key_type: 'ecdsa' },
});

// Create a Let's Encrypt certificate (DNS challenge)
const cert = await client.certificates.create({
  provider: 'letsencrypt',
  domain_names: ['*.example.com'],
  meta: {
    dns_challenge: true,
    dns_provider: 'cloudflare',
    dns_provider_credentials: 'dns_cloudflare_api_token = xxxxx',
    propagation_seconds: 30,
    key_type: 'ecdsa',
  },
});

// Renew a certificate
const renewed = await client.certificates.renew(1);

// Delete a certificate
await client.certificates.delete(1);

// Test HTTP reachability before requesting a cert
const results = await client.certificates.testHttp(['app.example.com']);
// { 'app.example.com': 'ok' }
```

## SSL with Proxy Hosts

The `certificate_id` field on proxy hosts controls SSL:

| Value | Behavior |
|-------|----------|
| `'new'` | Auto-provision a Let's Encrypt certificate using the proxy host's domains |
| `0` (or omit) | No SSL |
| `<number>` | Use an existing certificate by ID |

When a certificate is assigned, SSL options cascade:
- No certificate = `ssl_forced`, `http2_support` forced to `false`
- No `ssl_forced` = `hsts_enabled` forced to `false`
- No `hsts_enabled` = `hsts_subdomains` forced to `false`

## Custom Location Blocks

Proxy hosts support custom location blocks for path-based routing:

```typescript
await client.proxyHosts.create({
  domain_names: ['app.example.com'],
  forward_scheme: 'http',
  forward_host: '127.0.0.1',
  forward_port: 3000,
  locations: [
    {
      path: '/api',
      forward_scheme: 'http',
      forward_host: '127.0.0.1',
      forward_port: 8080,
    },
    {
      path: '/ws',
      forward_scheme: 'http',
      forward_host: '127.0.0.1',
      forward_port: 8081,
      advanced_config: 'proxy_read_timeout 86400;',
    },
  ],
});
```

## Advanced Nginx Config

The `advanced_config` field injects raw nginx directives into the server block. Use with caution, as syntax errors will break the proxy host.

```typescript
await client.proxyHosts.create({
  domain_names: ['app.example.com'],
  forward_scheme: 'http',
  forward_host: '127.0.0.1',
  forward_port: 3000,
  advanced_config: `
    proxy_read_timeout 86400;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  `,
});
```

## Error Handling

All API errors throw `NpmApiError` with the status code and error body:

```typescript
import { NpmClient, NpmApiError } from 'nginx-proxy-manager-sdk';

try {
  await client.proxyHosts.create({ ... });
} catch (err) {
  if (err instanceof NpmApiError) {
    console.error(err.statusCode);  // 400, 401, 404, etc.
    console.error(err.message);     // "Domains are invalid"
    console.error(err.body);        // { error: { code: 400, message: '...' } }
  }
}
```

## Timeouts

Default timeout is 30 seconds for standard API calls. Certificate creation and renewal use a 15-minute timeout to accommodate Let's Encrypt provisioning delays.

## Security Best Practices

### Credential Management

- **Clear credentials when done**: Call `client.clearCredentials()` when you're finished with the client to remove sensitive data from memory.
  ```typescript
  try {
    await client.proxyHosts.list();
  } finally {
    client.clearCredentials();
  }
  ```

- **Use tokens when possible**: Prefer using Bearer tokens over email/password to minimize credential exposure.

- **Avoid logging credentials**: Never log the client configuration or credentials to files or console.

### Input Validation

The SDK provides **defensive validation** to help prevent breaking your nginx configuration. These validations are designed to catch common mistakes and protect against injection attacks when passing untrusted user input through the SDK.

The SDK validates:
- **Domain names**: Rejects characters that would break nginx `server_name` directive (spaces, semicolons, braces). Allows wildcards (*.example.com), single-label names (localhost), and flexible formats.
- **Advanced nginx configs**: Checks for patterns that would break out of the server block context (closing and reopening server/http blocks).
- **URLs**: BaseURL must use http:// or https:// protocol.

**Note**: These are basic validations to prevent configuration corruption. Since you control your own Nginx Proxy Manager instance, you have full authority over your configuration. The validations help prevent accidental mistakes but are not comprehensive security controls.

### Handling User Input

When accepting domain names or nginx config from end users (e.g., in a web application), **always sanitize and validate** the input before passing it to the SDK:

```typescript
// ✅ Good - controlled configuration
await client.proxyHosts.create({
  domain_names: ['app.example.com'],
  forward_host: '127.0.0.1',
  forward_port: 3000,
  advanced_config: 'proxy_read_timeout 86400;',
});

// ⚠️ Be careful with user input
function createProxyHost(userDomain: string, userConfig: string) {
  // Example: Implement your own validation layer for user input
  // The SDK provides basic checks, but you should add application-specific validation
  
  // Whitelist approach - only allow known safe patterns
  if (!/^[a-zA-Z0-9.-]+$/.test(userDomain)) {
    throw new Error('Invalid domain format');
  }
  
  // For advanced_config, consider:
  // - Whitelisting specific nginx directives
  // - Restricting to predefined config templates
  // - Not allowing user input at all in production
  
  await client.proxyHosts.create({
    domain_names: [userDomain],
    forward_host: '127.0.0.1',
    forward_port: 3000,
    advanced_config: userConfig, // SDK will validate for config-breaking patterns
  });
}
```

## TypeScript

Full type definitions are included. All payload interfaces are exported:

```typescript
import type {
  ProxyHost,
  CreateProxyHostPayload,
  UpdateProxyHostPayload,
  Certificate,
  CreateLetsEncryptCertPayload,
  CreateCustomCertPayload,
  ProxyHostLocation,
  TestHttpResult,
} from 'nginx-proxy-manager-sdk';
```

Payload properties use `snake_case` to match the NPM API wire format. Method names use `camelCase` following TypeScript conventions.

## Compatibility

- **Node.js:** 18+ (uses native `fetch`)
- **Nginx Proxy Manager:** v2.x (tested with v2.13.7)
- **Module formats:** ESM and CommonJS

## License

MIT
