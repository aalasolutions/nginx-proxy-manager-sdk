# Advanced Security & Edge Cases Guide

This supplement covers extreme edge cases, advanced security scenarios, and specialized topics not covered in the main guides.

**Use this when:** You're dealing with complex systems, high-security requirements, or unusual scenarios.

## Table of Contents

- [Multi-Language Projects](#multi-language-projects)
- [File Upload Security](#file-upload-security)
- [Real-Time Features](#real-time-features)
- [API Security Deep Dive](#api-security-deep-dive)
- [Container & Cloud Security](#container--cloud-security)
- [Microservices Security](#microservices-security)
- [Caching Security](#caching-security)
- [Third-Party Integrations](#third-party-integrations)
- [Logging & Monitoring](#logging--monitoring)
- [Session Management](#session-management)
- [Advanced Cryptography](#advanced-cryptography)
- [Time-Based Attacks](#time-based-attacks)
- [Supply Chain Security](#supply-chain-security)
- [Legacy Code Security](#legacy-code-security)
- [Mobile Security](#mobile-security)
- [Internationalization Security](#internationalization-security)
- [Database Migrations](#database-migrations)
- [Zero-Day Response](#zero-day-response)

---

## Multi-Language Projects

### Security in Polyglot Codebases

When mixing languages (e.g., TypeScript frontend + Python backend + Go microservices):

```markdown
## Multi-Language Security Checklist

### Boundary Validation
- [ ] Validate data at language boundaries (API contracts)
- [ ] Don't trust data from other services
- [ ] Use schema validation (JSON Schema, Protocol Buffers, OpenAPI)
- [ ] Type mismatches can cause vulnerabilities

### Serialization Safety
- [ ] JSON is safest cross-language format
- [ ] Avoid language-specific serialization (pickle, Java serialization)
- [ ] Be consistent with data types (dates, booleans, null vs undefined)
- [ ] Watch for encoding issues (UTF-8 everywhere)

### Authentication Consistency
- [ ] Use same auth mechanism across all services (JWT, OAuth)
- [ ] Verify tokens in every service
- [ ] Consistent user ID format across languages
- [ ] Clock sync for token expiration
```

**Example: TypeScript Frontend + Python Backend**

```typescript
// Frontend - TypeScript
interface User {
  id: number;           // JavaScript uses float64
  email: string;
  created_at: string;   // ISO 8601 string
}

// Validation at boundary
function validateUser(data: unknown): User {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid user data');
  }
  
  const user = data as Record<string, unknown>;
  
  if (typeof user.id !== 'number' || !Number.isInteger(user.id)) {
    throw new Error('User ID must be integer');
  }
  
  return user as User;
}
```

```python
# Backend - Python
from datetime import datetime
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    id: int  # Python int (arbitrary precision)
    email: EmailStr
    created_at: datetime
    
    class Config:
        # Ensure JSON serialization matches TypeScript expectations
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
```

**Common Issues:**
- Integer overflow when JS sends large numbers to other languages
- Date/time format inconsistencies
- Boolean vs 1/0/true/false/"true" confusion
- Null vs undefined vs None vs nil
- Empty string vs null differences

---

## File Upload Security

### Complete File Upload Checklist

```markdown
## File Upload Security

### 1. File Type Validation
- [ ] Check MIME type (Content-Type header) - but don't trust it alone
- [ ] Verify file extension - use whitelist, not blacklist
- [ ] Validate file magic bytes (file signature)
- [ ] Use library to detect actual file type (libmagic, python-magic)
- [ ] Reject executable file types (.exe, .sh, .bat, .cmd)

### 2. File Size Limits
- [ ] Enforce maximum file size (prevent DoS)
- [ ] Use streaming upload for large files
- [ ] Set request body size limits
- [ ] Monitor disk space usage

### 3. File Name Sanitization
- [ ] Never use user-provided filename directly
- [ ] Generate random filename (UUID)
- [ ] Remove path traversal attempts (../, ..\)
- [ ] Limit filename length
- [ ] Remove special characters

### 4. File Content Scanning
- [ ] Scan for malware (ClamAV, VirusTotal API)
- [ ] For images: Re-encode to strip metadata/malware
- [ ] For documents: Use sandboxed preview generation
- [ ] For archives: Limit extraction depth and file count (zip bombs)

### 5. Storage Security
- [ ] Store files outside web root
- [ ] Use separate domain for serving files (prevent cookie theft)
- [ ] Set proper Content-Type when serving
- [ ] Use Content-Disposition: attachment for downloads
- [ ] Don't execute uploaded files
- [ ] Encrypt sensitive files at rest

### 6. Access Control
- [ ] Verify user can access file before serving
- [ ] Use signed URLs with expiration (AWS S3, Azure Blob)
- [ ] Don't expose file paths or internal IDs
- [ ] Log file access for auditing
```

**Example: Secure File Upload**

```typescript
import crypto from 'crypto';
import path from 'path';
import fileType from 'file-type';
import { ReadStream } from 'fs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function handleFileUpload(
  fileStream: ReadStream,
  originalName: string,
  userId: string
): Promise<string> {
  // 1. Generate safe filename
  const fileId = crypto.randomUUID();
  const ext = path.extname(originalName).toLowerCase();
  
  // 2. Validate extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  if (!allowedExtensions.includes(ext)) {
    throw new Error('File type not allowed');
  }
  
  // 3. Read first chunk to detect actual file type
  const chunk = await readFirstChunk(fileStream);
  const detectedType = await fileType.fromBuffer(chunk);
  
  if (!detectedType || !ALLOWED_TYPES.includes(detectedType.mime)) {
    throw new Error('Invalid file type');
  }
  
  // 4. Generate safe path (outside web root)
  const safePath = path.join(
    '/var/uploads',
    userId,
    fileId + ext
  );
  
  // 5. Enforce size limit while streaming
  let uploadedSize = 0;
  fileStream.on('data', (chunk) => {
    uploadedSize += chunk.length;
    if (uploadedSize > MAX_SIZE) {
      fileStream.destroy();
      throw new Error('File too large');
    }
  });
  
  // 6. Save file
  await saveFile(fileStream, safePath);
  
  // 7. Optional: Scan for malware
  await scanFile(safePath);
  
  // 8. For images: Re-encode to strip metadata
  if (detectedType.mime.startsWith('image/')) {
    await reencodeImage(safePath);
  }
  
  return fileId;
}

// Serve file securely
app.get('/files/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const userId = req.user.id;
  
  // Verify ownership
  const file = await db.files.findOne({ fileId, userId });
  if (!file) {
    return res.status(404).send('Not found');
  }
  
  // Set secure headers
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.safeName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Serve from outside web root
  res.sendFile(file.path);
});
```

**Zip Bomb Protection:**

```typescript
import AdmZip from 'adm-zip';

function validateZipFile(zipPath: string): void {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  
  let totalUncompressed = 0;
  const MAX_UNCOMPRESSED = 100 * 1024 * 1024; // 100MB
  const MAX_FILES = 1000;
  const MAX_DEPTH = 5;
  
  if (entries.length > MAX_FILES) {
    throw new Error('Too many files in archive');
  }
  
  for (const entry of entries) {
    totalUncompressed += entry.header.size;
    
    if (totalUncompressed > MAX_UNCOMPRESSED) {
      throw new Error('Uncompressed size too large (zip bomb?)');
    }
    
    // Check for path traversal
    const normalizedPath = path.normalize(entry.entryName);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      throw new Error('Invalid file path in archive');
    }
    
    // Check depth
    const depth = normalizedPath.split(path.sep).length;
    if (depth > MAX_DEPTH) {
      throw new Error('Archive nesting too deep');
    }
  }
}
```

---

## Real-Time Features

### WebSocket Security

```markdown
## WebSocket Security Checklist

### Authentication
- [ ] Authenticate WebSocket connections
- [ ] Don't rely on cookies alone (CSRF in WebSocket)
- [ ] Use token in initial handshake
- [ ] Re-verify auth on long-lived connections

### Authorization
- [ ] Verify user can access requested channel/room
- [ ] Check permissions before sending messages
- [ ] Rate limit per user
- [ ] Validate all incoming messages

### Input Validation
- [ ] Validate message format (use schema)
- [ ] Sanitize message content
- [ ] Limit message size
- [ ] Prevent injection attacks

### DoS Protection
- [ ] Limit connections per IP
- [ ] Limit connections per user
- [ ] Set max message size
- [ ] Set max message rate
- [ ] Timeout idle connections
```

**Example: Secure WebSocket Server**

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  lastMessage?: number;
}

const wss = new WebSocketServer({ port: 8080 });

// Rate limiting
const MESSAGE_RATE_LIMIT = 10; // messages per second
const MESSAGE_MAX_SIZE = 64 * 1024; // 64KB
const CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
  let authenticated = false;
  
  // 1. Authenticate within 5 seconds or disconnect
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      ws.close(4001, 'Authentication required');
    }
  }, 5000);
  
  // 2. Set up idle timeout
  let idleTimeout = setTimeout(() => {
    ws.close(4000, 'Idle timeout');
  }, CONNECTION_TIMEOUT);
  
  ws.on('message', async (data: Buffer) => {
    // 3. Size check
    if (data.length > MESSAGE_MAX_SIZE) {
      ws.close(4002, 'Message too large');
      return;
    }
    
    // 4. Rate limiting
    const now = Date.now();
    if (ws.lastMessage && (now - ws.lastMessage) < 1000 / MESSAGE_RATE_LIMIT) {
      ws.close(4003, 'Rate limit exceeded');
      return;
    }
    ws.lastMessage = now;
    
    // Reset idle timeout
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => ws.close(4000, 'Idle timeout'), CONNECTION_TIMEOUT);
    
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (e) {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
    
    // 5. Handle authentication
    if (!authenticated) {
      if (message.type === 'auth' && message.token) {
        try {
          const decoded = jwt.verify(message.token, process.env.JWT_SECRET!) as { userId: string };
          ws.userId = decoded.userId;
          authenticated = true;
          clearTimeout(authTimeout);
          ws.send(JSON.stringify({ type: 'auth_success' }));
        } catch (e) {
          ws.close(4001, 'Invalid token');
        }
      } else {
        ws.close(4001, 'Authentication required');
      }
      return;
    }
    
    // 6. Validate message structure
    if (!message.type || typeof message.type !== 'string') {
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
      return;
    }
    
    // 7. Handle messages based on type
    switch (message.type) {
      case 'join_room':
        // Verify user can join room
        if (!await canUserJoinRoom(ws.userId!, message.roomId)) {
          ws.send(JSON.stringify({ error: 'Access denied' }));
          return;
        }
        // ... handle room join
        break;
        
      case 'send_message':
        // Sanitize message content
        const sanitized = sanitizeHtml(message.content);
        // Broadcast to room
        break;
        
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  });
  
  ws.on('close', () => {
    clearTimeout(authTimeout);
    clearTimeout(idleTimeout);
  });
});
```

### Server-Sent Events (SSE) Security

```typescript
app.get('/events', authenticateUser, async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Verify authorization
  const userId = req.user.id;
  
  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);
  
  // Subscribe to user's events
  const eventHandler = (event: any) => {
    // Verify user still has access
    if (event.userId !== userId) return;
    
    // Send event
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  
  eventEmitter.on('user_event', eventHandler);
  
  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    eventEmitter.off('user_event', eventHandler);
  });
});
```

---

## API Security Deep Dive

### GraphQL Security

```markdown
## GraphQL-Specific Security

### Query Complexity
- [ ] Limit query depth (prevent nested query attacks)
- [ ] Limit query complexity (cost analysis)
- [ ] Set timeout for query execution
- [ ] Disable introspection in production

### Authorization
- [ ] Check permissions at field level, not just query level
- [ ] Use @auth directives or middleware
- [ ] Verify user can access each returned object
- [ ] Prevent data leakage through relations

### Rate Limiting
- [ ] Rate limit by query complexity, not just request count
- [ ] Different limits for authenticated vs anonymous
- [ ] Consider depth and breadth of query

### Input Validation
- [ ] Validate all arguments
- [ ] Use input types with validation
- [ ] Sanitize string inputs
- [ ] Check for injection in custom scalars
```

**Example: GraphQL Security**

```typescript
import { makeExecutableSchema } from '@graphql-tools/schema';
import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Depth limiting
const MAX_DEPTH = 5;

// Complexity limiting
const MAX_COMPLEXITY = 1000;

const app = express();

app.use('/graphql', graphqlHTTP((req) => ({
  schema,
  context: { user: req.user },
  validationRules: [
    depthLimit(MAX_DEPTH),
    createComplexityLimitRule(MAX_COMPLEXITY, {
      onCost: (cost) => {
        console.log('Query cost:', cost);
      },
    }),
  ],
  // Disable introspection in production
  graphiql: process.env.NODE_ENV !== 'production',
  customFormatErrorFn: (error) => {
    // Don't leak internal errors
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Internal server error' };
    }
    return error;
  },
})));

// Resolver with field-level authorization
const resolvers = {
  User: {
    email: (parent, args, context) => {
      // Only return email if viewing own profile or admin
      if (context.user.id !== parent.id && !context.user.isAdmin) {
        throw new Error('Unauthorized');
      }
      return parent.email;
    },
    
    posts: async (parent, args, context) => {
      // Check if user can view this user's posts
      if (!await canViewPosts(context.user.id, parent.id)) {
        throw new Error('Unauthorized');
      }
      return getPostsByUser(parent.id);
    },
  },
};
```

### REST API Security

```markdown
## REST API Security Checklist

### Endpoint Security
- [ ] Use HTTPS only
- [ ] Validate Content-Type
- [ ] Set security headers (HSTS, CSP, X-Frame-Options)
- [ ] Implement CORS properly
- [ ] Use API versioning

### Authentication
- [ ] Use OAuth 2.0 or JWT
- [ ] Implement refresh tokens
- [ ] Short-lived access tokens (15 min)
- [ ] Secure token storage

### Rate Limiting
- [ ] By IP address
- [ ] By user/API key
- [ ] Different limits per endpoint
- [ ] Return 429 with Retry-After header

### Input Validation
- [ ] Validate all parameters
- [ ] Use JSON schema validation
- [ ] Sanitize inputs
- [ ] Validate content length

### Output
- [ ] Don't expose internal IDs
- [ ] Use pagination
- [ ] Filter sensitive fields
- [ ] Set proper Cache-Control headers
```

---

## Container & Cloud Security

### Docker Security

```dockerfile
# Secure Dockerfile example

# 1. Use specific version, not 'latest'
FROM node:18.16.0-alpine3.17

# 2. Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# 3. Set working directory
WORKDIR /app

# 4. Copy only necessary files
COPY package*.json ./

# 5. Install dependencies as root
RUN npm ci --only=production \
    && npm cache clean --force

# 6. Copy application code
COPY --chown=nodejs:nodejs . .

# 7. Switch to non-root user
USER nodejs

# 8. Expose port
EXPOSE 3000

# 9. Use exec form for CMD
CMD ["node", "server.js"]

# 10. Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js
```

```markdown
## Docker Security Checklist

### Image Security
- [ ] Use minimal base images (alpine, distroless)
- [ ] Scan images for vulnerabilities (Trivy, Snyk)
- [ ] Don't run as root
- [ ] Use specific versions, not tags like 'latest'
- [ ] Multi-stage builds to reduce attack surface
- [ ] Don't include secrets in image

### Runtime Security
- [ ] Set resource limits (CPU, memory)
- [ ] Use read-only filesystem when possible
- [ ] Drop unnecessary capabilities
- [ ] Use security profiles (AppArmor, SELinux)
- [ ] Don't mount host filesystem
- [ ] Use private networks

### Secrets Management
- [ ] Use Docker secrets or external vault
- [ ] Don't pass secrets via environment variables
- [ ] Rotate secrets regularly
- [ ] Don't log secrets
```

**Example: docker-compose with security**

```yaml
version: '3.8'

services:
  app:
    image: myapp:1.0.0
    user: "1001:1001"
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    environment:
      NODE_ENV: production
    secrets:
      - db_password
    networks:
      - app_network
    
secrets:
  db_password:
    external: true

networks:
  app_network:
    driver: bridge
    internal: true
```

### Kubernetes Security

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  # 1. Security Context
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault
  
  containers:
  - name: app
    image: myapp:1.0.0
    
    # 2. Container security context
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 1001
      capabilities:
        drop:
          - ALL
    
    # 3. Resource limits
    resources:
      requests:
        memory: "128Mi"
        cpu: "250m"
      limits:
        memory: "256Mi"
        cpu: "500m"
    
    # 4. Liveness and readiness probes
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
    
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
    
    # 5. Environment from secrets
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password
    
    # 6. Volume mounts
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /app/cache
  
  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}
  
  # 7. Network policy
  # Apply with separate NetworkPolicy resource
```

---

## Caching Security

### Cache Poisoning Prevention

```markdown
## Cache Security Checklist

### Cache Key Design
- [ ] Include user ID in cache key for user-specific data
- [ ] Include all relevant parameters in key
- [ ] Normalize input before creating key
- [ ] Don't cache based on untrusted headers

### Cache Control
- [ ] Set appropriate cache duration
- [ ] Use private cache for user data
- [ ] Use no-cache for sensitive data
- [ ] Implement cache invalidation

### Web Cache Poisoning
- [ ] Validate Host header
- [ ] Don't cache error responses
- [ ] Don't cache based on X-Forwarded-* headers without validation
- [ ] Use Vary header properly
```

**Example: Safe Caching**

```typescript
import { createHash } from 'crypto';

class SecureCache {
  private cache = new Map<string, { data: any; expires: number }>();
  
  // Generate safe cache key
  private generateKey(
    userId: string | null,
    endpoint: string,
    params: Record<string, any>
  ): string {
    // Sort params for consistency
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const keyString = `${userId || 'public'}:${endpoint}:${sortedParams}`;
    
    // Hash to prevent injection
    return createHash('sha256').update(keyString).digest('hex');
  }
  
  async get(
    userId: string | null,
    endpoint: string,
    params: Record<string, any>
  ): Promise<any | null> {
    const key = this.generateKey(userId, endpoint, params);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  async set(
    userId: string | null,
    endpoint: string,
    params: Record<string, any>,
    data: any,
    ttl: number
  ): Promise<void> {
    const key = this.generateKey(userId, endpoint, params);
    
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl * 1000,
    });
  }
}

// Usage in Express
app.get('/api/data', authenticateUser, async (req, res) => {
  const userId = req.user?.id || null;
  const params = req.query;
  
  // Try cache first
  const cached = await cache.get(userId, '/api/data', params);
  if (cached) {
    // Set appropriate cache headers
    res.setHeader('Cache-Control', userId ? 'private, max-age=300' : 'public, max-age=300');
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }
  
  // Fetch data
  const data = await fetchData(params);
  
  // Cache it
  await cache.set(userId, '/api/data', params, data, 300);
  
  res.setHeader('Cache-Control', userId ? 'private, max-age=300' : 'public, max-age=300');
  res.setHeader('X-Cache', 'MISS');
  res.json(data);
});
```

---

## Logging & Monitoring

### What to Log vs What NOT to Log

```markdown
## Logging Security Best Practices

### DO Log
- [ ] Authentication attempts (success and failure)
- [ ] Authorization failures
- [ ] Input validation failures
- [ ] Security events (password changes, permission changes)
- [ ] System events (startup, shutdown)
- [ ] Transaction IDs for tracing
- [ ] IP addresses
- [ ] User IDs (not usernames if PII)
- [ ] Timestamps (UTC)

### DON'T Log
- [ ] Passwords (ever!)
- [ ] Session tokens
- [ ] API keys
- [ ] Credit card numbers
- [ ] SSN or national IDs
- [ ] Full request/response bodies (may contain secrets)
- [ ] Stack traces to client (only server-side)
- [ ] Personal data without reason (GDPR)
```

**Example: Secure Logging**

```typescript
import winston from 'winston';

// Sanitize function
function sanitizeForLogging(obj: any): any {
  const sensitive = [
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'ssn',
    'creditCard',
  ];
  
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    
    if (sensitive.some(s => lowerKey.includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  
  return sanitized;
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('user-agent'),
      // Don't log full body - may contain secrets
      bodySize: req.get('content-length'),
    });
  });
  
  next();
});

// Log security events
function logSecurityEvent(event: string, details: any) {
  logger.warn('Security Event', {
    event,
    ...sanitizeForLogging(details),
    timestamp: new Date().toISOString(),
  });
}

// Usage
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await authenticateUser(email, password);
  
  if (!user) {
    logSecurityEvent('login_failed', {
      email, // OK to log email
      ip: req.ip,
      // Never log password
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  logSecurityEvent('login_success', {
    userId: user.id,
    ip: req.ip,
  });
  
  res.json({ token: generateToken(user) });
});
```

---

## Time-Based Attacks

### Timing Attack Prevention

```typescript
// ❌ BAD - Vulnerable to timing attack
function compareTokens(userToken: string, validToken: string): boolean {
  return userToken === validToken; // Stops at first mismatch
}

// ✅ GOOD - Constant-time comparison
import { timingSafeEqual } from 'crypto';

function compareTokens(userToken: string, validToken: string): boolean {
  if (userToken.length !== validToken.length) {
    // Still need to run comparison to avoid timing leak
    timingSafeEqual(Buffer.from(validToken), Buffer.from(validToken));
    return false;
  }
  
  const userBuf = Buffer.from(userToken);
  const validBuf = Buffer.from(validToken);
  
  return timingSafeEqual(userBuf, validBuf);
}

// ✅ GOOD - Constant-time string comparison
function constantTimeStringCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  
  if (bufA.length !== bufB.length) {
    // Force constant time by comparing against self
    timingSafeEqual(bufA, bufA);
    return false;
  }
  
  return timingSafeEqual(bufA, bufB);
}
```

### Race Condition Prevention

```typescript
// ❌ BAD - Race condition in balance check
async function transfer(fromUserId: string, toUserId: string, amount: number) {
  const fromUser = await db.users.findOne({ id: fromUserId });
  
  if (fromUser.balance < amount) {
    throw new Error('Insufficient funds');
  }
  
  // Race condition: balance could change here!
  
  await db.users.update({ id: fromUserId }, {
    balance: fromUser.balance - amount,
  });
  
  await db.users.update({ id: toUserId }, {
    $inc: { balance: amount },
  });
}

// ✅ GOOD - Use database transaction
async function transfer(fromUserId: string, toUserId: string, amount: number) {
  const session = await db.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Atomic update with condition
      const result = await db.users.updateOne(
        {
          id: fromUserId,
          balance: { $gte: amount }, // Condition in query
        },
        {
          $inc: { balance: -amount },
        },
        { session }
      );
      
      if (result.modifiedCount === 0) {
        throw new Error('Insufficient funds');
      }
      
      await db.users.updateOne(
        { id: toUserId },
        { $inc: { balance: amount } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}

// ✅ GOOD - Use optimistic locking
interface UserWithVersion {
  id: string;
  balance: number;
  version: number;
}

async function transferWithOptimisticLocking(
  fromUserId: string,
  toUserId: string,
  amount: number
) {
  let retries = 3;
  
  while (retries > 0) {
    const fromUser = await db.users.findOne({ id: fromUserId });
    
    if (fromUser.balance < amount) {
      throw new Error('Insufficient funds');
    }
    
    // Update with version check
    const result = await db.users.updateOne(
      {
        id: fromUserId,
        version: fromUser.version, // Must match current version
      },
      {
        $inc: {
          balance: -amount,
          version: 1,
        },
      }
    );
    
    if (result.modifiedCount === 1) {
      // Success - no concurrent modification
      await db.users.updateOne(
        { id: toUserId },
        { $inc: { balance: amount } }
      );
      return;
    }
    
    // Concurrent modification detected - retry
    retries--;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error('Transfer failed due to concurrent modifications');
}
```

---

## Supply Chain Security

```markdown
## Supply Chain Security Checklist

### Dependency Management
- [ ] Review dependencies before adding
- [ ] Use lock files (package-lock.json, Pipfile.lock)
- [ ] Run security audits regularly (npm audit, pip-audit)
- [ ] Keep dependencies up-to-date
- [ ] Remove unused dependencies
- [ ] Use dependency scanning tools (Snyk, Dependabot)

### Dependency Confusion Attacks
- [ ] Use private registry for internal packages
- [ ] Configure package manager to prefer private registry
- [ ] Use scoped packages (@company/package)
- [ ] Verify package authenticity

### Build Security
- [ ] Use CI/CD with security scanning
- [ ] Sign releases
- [ ] Use reproducible builds
- [ ] Lock build tool versions
- [ ] Scan Docker images

### Code Signing
- [ ] Sign commits (git)
- [ ] Sign releases
- [ ] Verify signatures before deployment
```

**Example: .npmrc for preventing dependency confusion**

```ini
# .npmrc
@company:registry=https://npm.company.com/
registry=https://registry.npmjs.org/
always-auth=true
```

**Example: GitHub Actions security scanning**

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Scan Docker image
        run: |
          docker build -t myapp:latest .
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy image myapp:latest
```

---

## Legacy Code Security

### Securing Existing Code

```markdown
## Legacy Code Security Strategy

### Assessment Phase
- [ ] Map attack surface
- [ ] Identify external inputs
- [ ] Find authentication/authorization points
- [ ] Locate sensitive data
- [ ] Check for known vulnerabilities

### Quick Wins (Do First)
- [ ] Add input validation at boundaries
- [ ] Add output encoding
- [ ] Enable security headers
- [ ] Update critical dependencies
- [ ] Add rate limiting
- [ ] Add logging

### Gradual Improvement
- [ ] Add tests for security-critical paths
- [ ] Refactor high-risk areas
- [ ] Add type safety
- [ ] Improve error handling
- [ ] Document security decisions

### Don't Break Things
- [ ] Add monitoring before changes
- [ ] Feature flags for risky changes
- [ ] Gradual rollout
- [ ] Keep rollback plan ready
```

**Example: Adding security to legacy Express app**

```typescript
// Wrap legacy app with security middleware
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { body, validationResult } from 'express-validator';

// Import legacy app
import legacyApp from './legacy-app';

const app = express();

// 1. Add security headers (doesn't break functionality)
app.use(helmet());

// 2. Add rate limiting (start with high limits)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Start high, reduce gradually
  message: 'Too many requests',
});
app.use(limiter);

// 3. Add input sanitization (catches injection attempts)
app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());

// 4. Add request logging (doesn't break functionality)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// 5. Add input validation to critical endpoints
app.post('/api/users',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  // Forward to legacy handler
  legacyApp
);

// 6. Mount legacy app (gradual migration)
app.use(legacyApp);

// 7. Add error handling (catch errors from legacy code)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});
```

---

## Mobile Security

### Mobile App Security Basics

```markdown
## Mobile Security Checklist

### Data Storage
- [ ] Encrypt sensitive data at rest
- [ ] Use platform secure storage (Keychain, KeyStore)
- [ ] Don't store secrets in code
- [ ] Clear sensitive data from memory
- [ ] Secure local database

### Network Security
- [ ] Use certificate pinning
- [ ] Validate TLS certificates
- [ ] Use HTTPS only
- [ ] Implement timeout handling
- [ ] Handle offline mode securely

### Authentication
- [ ] Use biometric authentication when available
- [ ] Implement secure token storage
- [ ] Auto-logout on inactivity
- [ ] Detect jailbreak/root
- [ ] Handle background transitions securely

### Code Protection
- [ ] Obfuscate code
- [ ] Detect tampering
- [ ] Use code signing
- [ ] Implement anti-debugging
- [ ] Protect against reverse engineering
```

---

## Database Migrations

### Safe Migration Practices

```typescript
// ✅ GOOD - Safe migration with rollback
module.exports = {
  async up(db) {
    const session = db.getMongo().startSession();
    
    try {
      await session.withTransaction(async () => {
        // 1. Add new column with default value
        await db.collection('users').updateMany(
          {},
          { $set: { email_verified: false } },
          { session }
        );
        
        // 2. Backfill data if needed
        await db.collection('users').updateMany(
          { verification_token: null },
          { $set: { email_verified: true } },
          { session }
        );
        
        // 3. Create index (if needed)
        await db.collection('users').createIndex(
          { email_verified: 1 },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
  },
  
  async down(db) {
    const session = db.getMongo().startSession();
    
    try {
      await session.withTransaction(async () => {
        // Rollback: remove field and index
        await db.collection('users').updateMany(
          {},
          { $unset: { email_verified: '' } },
          { session }
        );
        
        await db.collection('users').dropIndex('email_verified_1', { session });
      });
    } finally {
      await session.endSession();
    }
  },
};
```

---

## Zero-Day Response

### Incident Response Plan

```markdown
## Zero-Day Response Checklist

### Immediate Response (< 1 hour)
- [ ] Confirm vulnerability exists
- [ ] Assess impact and scope
- [ ] Check if exploit is active
- [ ] Alert security team
- [ ] Enable additional logging/monitoring

### Short-term Mitigation (< 24 hours)
- [ ] Apply WAF rules if applicable
- [ ] Block malicious IPs
- [ ] Disable affected feature if possible
- [ ] Rate limit affected endpoints
- [ ] Deploy temporary patch

### Long-term Fix (< 1 week)
- [ ] Develop proper fix
- [ ] Test thoroughly
- [ ] Deploy to staging
- [ ] Gradual production rollout
- [ ] Monitor for issues

### Post-Incident
- [ ] Document incident
- [ ] Review how it happened
- [ ] Update security practices
- [ ] Train team on lessons learned
- [ ] Consider public disclosure (responsible disclosure)
```

---

## Additional Resources

### Security Testing Tools

- **SAST** (Static Analysis): SonarQube, Semgrep, CodeQL
- **DAST** (Dynamic Analysis): OWASP ZAP, Burp Suite
- **Dependency Scanning**: Snyk, Dependabot, npm audit
- **Container Scanning**: Trivy, Clair, Anchore
- **Secret Scanning**: GitGuardian, TruffleHog

### Security Standards

- **OWASP Top 10**: Most critical web vulnerabilities
- **CWE Top 25**: Most dangerous software weaknesses
- **NIST**: Cybersecurity framework
- **PCI DSS**: Payment card industry standards
- **GDPR**: Data protection regulation

---

## Conclusion

Security is never "done" - it's an ongoing process. This guide covers edge cases that go beyond basic security, but remember:

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal necessary access
3. **Fail Securely**: Errors should deny access, not grant it
4. **Keep It Simple**: Complex systems have more vulnerabilities
5. **Stay Updated**: New vulnerabilities emerge constantly

Use this guide alongside the main AI Coding Assistant guides for comprehensive security coverage.

## Contributing

Found an edge case we missed? Please contribute!

## License

MIT
