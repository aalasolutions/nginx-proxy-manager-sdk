# AI Coding Assistant Prompt Engineering Guide

This guide helps you craft effective system prompts for AI coding assistants (like GitHub Copilot, Claude, GPT-4, etc.) to improve code quality, security, and development workflows.

## Quick Links

- **[Quick Start Template](./AI_PROMPT_TEMPLATE.md)** - Ready-to-use prompt template
- **[Language-Specific Guide](./LANGUAGE_SPECIFIC_GUIDE.md)** - Security patterns for TypeScript, Python, PHP, Rust, Go, Java, Ruby, C#
- **[Advanced Security & Edge Cases](./ADVANCED_SECURITY_EDGE_CASES.md)** - File uploads, WebSockets, GraphQL, containers, microservices, and more

## Table of Contents

- [Core Principles](#core-principles)
- [System Prompt Template](#system-prompt-template)
- [Code Review Guidelines](#code-review-guidelines)
- [Security Analysis](#security-analysis)
- [Development Workflow](#development-workflow)
- [Best Practices](#best-practices)
- [Example Prompts](#example-prompts)
- [Language-Specific Considerations](#language-specific-considerations)
- [Advanced Topics](#advanced-topics)

## Core Principles

Effective AI coding assistants should embody these principles:

### 1. **Precision Over Speed**
- Make minimal, surgical changes to accomplish goals
- Avoid unnecessary refactoring or "improvements" outside the scope
- Change only what's needed to fix the issue

### 2. **Safety First**
- Always validate changes don't break existing functionality
- Never delete working code without understanding its purpose
- Test changes before considering them complete

### 3. **Systematic Approach**
- Understand the codebase before making changes
- Explore, plan, execute, verify, iterate
- Document reasoning and decisions

### 4. **Security Awareness**
- Look for common vulnerabilities (injection, XSS, auth bypass, etc.)
- Validate all external inputs
- Follow secure coding practices for the language/framework

## System Prompt Template

Here's a comprehensive template you can customize for your needs:

```markdown
You are an expert software engineer specializing in [LANGUAGE/FRAMEWORK]. 
Your role is to assist with code development while maintaining the highest 
standards of quality, security, and maintainability.

## Your Responsibilities

1. **Code Analysis**: Thoroughly understand code before suggesting changes
2. **Minimal Changes**: Make only necessary modifications to solve the problem
3. **Security**: Identify and prevent security vulnerabilities
4. **Testing**: Validate all changes with appropriate tests
5. **Documentation**: Update relevant documentation when code changes

## Work Process

1. EXPLORE: Understand the codebase structure and context
2. PLAN: Create a clear plan before making changes
3. IMPLEMENT: Make focused, minimal changes
4. VALIDATE: Test changes thoroughly
5. REVIEW: Self-review for issues before finalizing

## Code Quality Standards

- Follow existing code style and conventions
- Write self-documenting code with clear variable/function names
- Add comments only when code complexity requires explanation
- Ensure backward compatibility unless explicitly changing APIs
- Handle edge cases and error conditions

## Security Checklist

Before finalizing changes, verify:
- [ ] All user inputs are validated and sanitized
- [ ] No SQL injection vulnerabilities (use parameterized queries)
- [ ] No XSS vulnerabilities (escape output, use CSP)
- [ ] Authentication and authorization properly implemented
- [ ] Sensitive data not logged or exposed
- [ ] Dependencies are secure and up-to-date
- [ ] No hardcoded secrets or credentials

## Communication Style

- Be concise and clear in explanations
- Explain WHY, not just WHAT when making changes
- Acknowledge uncertainty rather than guessing
- Ask for clarification when requirements are ambiguous
```

## Code Review Guidelines

### What to Look For

#### 1. **Correctness**
- Does the code do what it's supposed to do?
- Are there logical errors or edge cases not handled?
- Are error conditions properly handled?

#### 2. **Security**
```markdown
Check for:
- Input validation (all external data should be validated)
- Output encoding (prevent XSS)
- SQL injection (use parameterized queries)
- Path traversal (validate file paths)
- Authentication bypass (verify auth checks)
- Authorization issues (verify permission checks)
- Information disclosure (no sensitive data in errors/logs)
- CSRF protection (for state-changing operations)
- Rate limiting (for public APIs)
- Secure defaults (fail closed, not open)
```

#### 3. **Performance**
- Are there unnecessary loops or redundant operations?
- Are database queries optimized (N+1 queries)?
- Are resources properly cleaned up (connections, files, memory)?

#### 4. **Maintainability**
- Is the code readable and well-structured?
- Are functions/methods appropriately sized?
- Are naming conventions clear and consistent?
- Is there appropriate separation of concerns?

#### 5. **Testing**
- Are there tests for the new/changed functionality?
- Do tests cover edge cases and error conditions?
- Are tests clear and maintainable?

### Review Process Template

```markdown
When reviewing code, follow this checklist:

## Functionality Review
- [ ] Code accomplishes stated goal
- [ ] Edge cases are handled
- [ ] Error conditions are handled gracefully
- [ ] No regression of existing functionality

## Security Review
- [ ] All inputs validated
- [ ] No injection vulnerabilities
- [ ] Authentication/authorization correct
- [ ] No information disclosure
- [ ] Secure defaults used

## Code Quality Review
- [ ] Follows project conventions
- [ ] Well-named variables/functions
- [ ] Appropriate comments (not excessive)
- [ ] No code duplication
- [ ] Properly structured and organized

## Testing Review
- [ ] Tests exist for new functionality
- [ ] Tests cover edge cases
- [ ] Tests are clear and maintainable
- [ ] All tests pass
```

## Security Analysis

### Common Vulnerability Patterns

#### 1. **Injection Attacks**

**SQL Injection:**
```typescript
// ❌ BAD - Vulnerable to SQL injection
const query = `SELECT * FROM users WHERE username = '${username}'`;

// ✅ GOOD - Use parameterized queries
const query = 'SELECT * FROM users WHERE username = ?';
db.query(query, [username]);
```

**Command Injection:**
```typescript
// ❌ BAD - Vulnerable to command injection
exec(`ping ${userInput}`);

// ✅ GOOD - Validate and sanitize, or use safe alternatives
const allowedHosts = ['example.com', 'test.com'];
if (allowedHosts.includes(userInput)) {
  exec(`ping ${userInput}`);
}
```

**NoSQL Injection:**
```typescript
// ❌ BAD - Vulnerable to NoSQL injection
db.users.find({ username: req.body.username });

// ✅ GOOD - Validate input types
const username = String(req.body.username);
db.users.find({ username });
```

#### 2. **Cross-Site Scripting (XSS)**

```typescript
// ❌ BAD - Vulnerable to XSS
element.innerHTML = userInput;

// ✅ GOOD - Escape HTML or use safe methods
element.textContent = userInput;
// or use a sanitization library
element.innerHTML = DOMPurify.sanitize(userInput);
```

#### 3. **Authentication & Authorization**

```typescript
// ❌ BAD - Insecure authentication
if (req.body.password === user.password) { }

// ✅ GOOD - Use secure hashing
if (await bcrypt.compare(req.body.password, user.passwordHash)) { }

// ❌ BAD - Missing authorization check
app.delete('/api/posts/:id', async (req, res) => {
  await deletePost(req.params.id);
});

// ✅ GOOD - Verify user owns the resource
app.delete('/api/posts/:id', async (req, res) => {
  const post = await getPost(req.params.id);
  if (post.authorId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await deletePost(req.params.id);
});
```

#### 4. **Sensitive Data Exposure**

```typescript
// ❌ BAD - Logging sensitive data
console.log('User login:', username, password);

// ✅ GOOD - Don't log sensitive data
console.log('User login attempt:', username);

// ❌ BAD - Exposing internal errors
res.status(500).json({ error: err.stack });

// ✅ GOOD - Generic error messages
res.status(500).json({ error: 'Internal server error' });
// Log detailed error server-side only
logger.error('Database error:', err);
```

### Security Scanning Checklist

```markdown
For every code change, check:

## Input Validation
- [ ] All user inputs validated
- [ ] Type checking enforced
- [ ] Length limits applied
- [ ] Format validation (email, URL, etc.)
- [ ] Whitelist approach when possible

## Output Encoding
- [ ] HTML output encoded
- [ ] JSON output properly serialized
- [ ] SQL queries parameterized
- [ ] Command arguments escaped

## Authentication
- [ ] Passwords properly hashed (bcrypt, argon2)
- [ ] Session tokens securely generated
- [ ] Token expiration implemented
- [ ] Multi-factor authentication considered

## Authorization
- [ ] User permissions checked
- [ ] Resource ownership verified
- [ ] Principle of least privilege followed

## Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] TLS/SSL for data in transit
- [ ] No secrets in code or logs
- [ ] Secure key management

## Dependencies
- [ ] Dependencies up-to-date
- [ ] Known vulnerabilities checked
- [ ] Minimal dependencies used
```

## Development Workflow

### Phase 1: Exploration
```markdown
Before making changes:

1. Understand the problem completely
   - Read issue description carefully
   - Identify exact requirements
   - Note any constraints or edge cases

2. Explore the codebase
   - Find relevant files and functions
   - Understand current implementation
   - Identify dependencies and impacts
   - Check existing tests

3. Research best practices
   - Language/framework conventions
   - Security considerations
   - Performance implications
```

### Phase 2: Planning
```markdown
Create a clear plan:

1. List specific changes needed
2. Identify files to modify
3. Consider backward compatibility
4. Plan for testing
5. Estimate scope and complexity

Example checklist format:
- [ ] Update UserService.authenticate() to use bcrypt
- [ ] Add password hashing to UserService.create()
- [ ] Update existing tests
- [ ] Add security tests for password handling
- [ ] Update API documentation
```

### Phase 3: Implementation
```markdown
Make focused changes:

1. One logical change at a time
2. Test after each change
3. Commit frequently with clear messages
4. Keep changes minimal and focused

Avoid:
- Unrelated refactoring
- Style changes outside scope
- Feature creep
- Breaking existing functionality
```

### Phase 4: Validation
```markdown
Verify your changes:

1. Run existing tests
2. Add new tests for changes
3. Manual testing of new functionality
4. Security review
5. Performance check

Test levels:
- Unit tests (individual functions)
- Integration tests (component interaction)
- End-to-end tests (user workflows)
```

### Phase 5: Review
```markdown
Self-review before finalizing:

1. Re-read your changes
2. Check against requirements
3. Verify security best practices
4. Ensure proper error handling
5. Confirm tests are comprehensive
6. Update documentation

Ask yourself:
- Is this the minimal change needed?
- Did I break anything?
- Is this secure?
- Is this maintainable?
- Would I approve this in a PR review?
```

## Best Practices

### 1. Understand Before Changing
- Read and understand existing code first
- Use search tools to find all usages
- Check git history to understand why code exists
- Don't assume code is wrong without understanding it

### 2. Make Minimal Changes
- Fix only what's broken or requested
- Avoid "while I'm here" improvements
- Keep refactoring separate from features/fixes
- Change as few lines as possible

### 3. Test Thoroughly
- Write tests before or with changes
- Cover happy path and edge cases
- Test error conditions
- Run full test suite before finishing

### 4. Think About Edge Cases
```markdown
Common edge cases to consider:
- Empty input / null values
- Very large inputs
- Concurrent operations
- Network failures / timeouts
- Invalid data types
- Boundary values (0, -1, max int, etc.)
- Special characters in strings
- Race conditions
```

### 5. Handle Errors Gracefully
```typescript
// ❌ BAD - Swallowing errors
try {
  await riskyOperation();
} catch (e) {
  // Silent failure
}

// ✅ GOOD - Proper error handling
try {
  await riskyOperation();
} catch (e) {
  logger.error('Operation failed:', e);
  throw new AppError('Could not complete operation', 500);
}
```

### 6. Write Self-Documenting Code
```typescript
// ❌ BAD - Unclear code
function calc(a, b, c) {
  return a ? b : c;
}

// ✅ GOOD - Clear naming
function getDiscountedPrice(isVipCustomer, vipPrice, regularPrice) {
  return isVipCustomer ? vipPrice : regularPrice;
}
```

### 7. Follow Language/Framework Conventions
- Use standard naming conventions
- Follow idiomatic patterns
- Use framework features properly
- Don't reinvent the wheel

### 8. Consider Performance
- Avoid N+1 queries
- Use appropriate data structures
- Cache when beneficial
- Clean up resources (close connections, files)

### 9. Keep It Simple
- Favor readability over cleverness
- Avoid premature optimization
- Use clear logic over complex tricks
- Break down complex functions

### 10. Update Documentation
- Update README for user-facing changes
- Update code comments for complex logic
- Update API docs for interface changes
- Keep documentation accurate and current

## Example Prompts

### For Code Review
```markdown
Review this code change with focus on:

1. Security vulnerabilities (injection, XSS, auth bypass)
2. Logic errors and edge cases
3. Performance issues
4. Code quality and maintainability
5. Test coverage

For each issue found, explain:
- What the problem is
- Why it's a problem
- How to fix it
- Example of correct implementation

Format response as:
## Critical Issues
[Issues that must be fixed]

## Recommendations
[Improvements that should be considered]

## Minor Notes
[Optional improvements]
```

### For Feature Implementation
```markdown
Implement [FEATURE] with these requirements:

Requirements:
- [List specific requirements]

Constraints:
- Make minimal changes to existing code
- Follow existing code style
- Add tests for new functionality
- Update relevant documentation
- Ensure backward compatibility

Process:
1. Explore relevant code
2. Create implementation plan
3. Implement with tests
4. Validate changes
5. Security review
6. Self-review
```

### For Bug Fix
```markdown
Fix [BUG] with these steps:

1. Understand the bug:
   - Reproduce the issue
   - Identify root cause
   - Check for similar issues

2. Fix the bug:
   - Make minimal change to fix
   - Add test to prevent regression
   - Verify fix works

3. Validate:
   - Run all tests
   - Check for side effects
   - Ensure fix is complete

4. Document:
   - Explain root cause
   - Describe solution
   - Note any limitations
```

### For Security Audit
```markdown
Perform security audit focusing on:

1. Input Validation
   - Check all user inputs are validated
   - Verify type checking
   - Confirm length/format restrictions

2. Injection Vulnerabilities
   - SQL injection (parameterized queries?)
   - Command injection (sanitized commands?)
   - XSS (output encoding?)

3. Authentication & Authorization
   - Secure password handling?
   - Proper session management?
   - Authorization checks present?

4. Data Protection
   - Sensitive data encrypted?
   - Secrets management secure?
   - TLS for transmission?

5. Dependencies
   - Known vulnerabilities?
   - Up-to-date versions?

For each issue, provide:
- Severity (Critical/High/Medium/Low)
- Location (file and line)
- Description of vulnerability
- Recommended fix with code example
```

## Tools and Integrations

### Static Analysis Tools
- **ESLint** (JavaScript/TypeScript) - Code quality and patterns
- **Pylint/Flake8** (Python) - Code quality and style
- **RuboCop** (Ruby) - Style and best practices
- **SonarQube** - Multi-language security and quality

### Security Scanners
- **npm audit / pip audit** - Dependency vulnerabilities
- **Snyk** - Vulnerability scanning
- **CodeQL** - Semantic code analysis
- **Semgrep** - Custom security patterns
- **OWASP Dependency-Check** - Known vulnerabilities

### Testing Frameworks
Integrate with existing test frameworks:
- **Jest** (JavaScript/TypeScript)
- **pytest** (Python)
- **RSpec** (Ruby)
- **JUnit** (Java)

### Workflow Integration
```markdown
Integrate AI assistant into workflow:

1. Pre-commit: Lint and format code
2. During development: Code completion and review
3. Pre-PR: Security scan and self-review
4. PR review: Automated review comments
5. Post-merge: Monitor for issues
```

## Customization Tips

### For Your Language
Add language-specific guidance:
- Common pitfalls
- Security considerations
- Performance patterns
- Idiomatic code examples
- Framework-specific best practices

### For Your Team
Customize for your context:
- Team coding standards
- Specific security requirements
- Performance goals
- Testing requirements
- Documentation standards

### For Your Project
Add project-specific rules:
- Architecture patterns
- Naming conventions
- Module structure
- External dependencies policy
- Deployment considerations

## Measuring Effectiveness

Track metrics to improve your prompts:

### Code Quality Metrics
- Bug density (bugs per KLOC)
- Code review findings
- Test coverage
- Technical debt trends

### Security Metrics
- Vulnerabilities found in review
- Security issues in production
- Time to fix security issues
- Dependency vulnerabilities

### Development Velocity
- Time to implement features
- Time spent in review cycles
- Rework percentage
- Developer satisfaction

## Continuous Improvement

Refine your prompts based on:

1. **Feedback**: Learn from code review comments
2. **Incidents**: Update prompts after issues found
3. **Patterns**: Add checks for recurring problems
4. **Evolution**: Adapt to new frameworks/practices

## Conclusion

Effective AI coding assistants require well-crafted prompts that balance:
- **Automation** with human judgment
- **Speed** with thoroughness
- **Flexibility** with consistency
- **Guidance** with creativity

Start with this guide, customize for your needs, and iterate based on results. The goal is augmenting human capability, not replacing human judgment.

Remember: An AI assistant is a tool to help you write better code faster, but you remain responsible for the quality, security, and correctness of your code.

## Language-Specific Considerations

While the principles in this guide apply universally, each language and framework has specific patterns and vulnerabilities. For detailed guidance on:

- **TypeScript / Node.js** - Prototype pollution, ReDoS, async patterns, Express/NestJS
- **Python** - SQL injection, pickle, Django/FastAPI security
- **PHP** - XSS prevention, file inclusion, Laravel best practices
- **Rust** - Unsafe code, error handling, Actix-web patterns
- **Go** - Race conditions, context usage, Gin framework
- **Java** - Deserialization, Spring Boot security
- **Ruby** - Mass assignment, Rails conventions
- **C# / .NET** - ASP.NET Core security, async patterns

See the **[Language-Specific Guide](./LANGUAGE_SPECIFIC_GUIDE.md)** for detailed examples and framework-specific patterns.

### Customizing for Your Stack

When adapting this guide for a specific language:

1. **Add language-specific security patterns** from the Language-Specific Guide
2. **Include common framework vulnerabilities** for your stack
3. **Reference ecosystem tools** (linters, security scanners)
4. **Provide idiomatic code examples** in your language
5. **List dependency security tools** (npm audit, pip-audit, etc.)

Example customization:
```markdown
## TypeScript/Node.js Specific Security

Additional checks for Node.js projects:
- [ ] Run `npm audit` to check for known vulnerabilities
- [ ] Use helmet.js for security headers
- [ ] Validate with joi, zod, or class-validator
- [ ] Check for prototype pollution in object merging
- [ ] Use parameterized queries with pg, mysql2, etc.
- [ ] Avoid ReDoS in regex patterns
```

## Advanced Topics

For complex scenarios and extreme edge cases, see the **[Advanced Security & Edge Cases Guide](./ADVANCED_SECURITY_EDGE_CASES.md)**, which covers:

### Complex System Security
- **Multi-Language Projects** - Polyglot codebase security
- **Container & Cloud Security** - Docker, Kubernetes hardening
- **Microservices Security** - Distributed system challenges

### Specialized Features
- **File Upload Security** - Complete validation, scanning, and storage
- **Real-Time Features** - WebSocket, SSE, WebRTC security
- **API Security Deep Dive** - GraphQL, REST, gRPC specifics
- **Caching Security** - Cache poisoning prevention

### Advanced Scenarios
- **Third-Party Integrations** - OAuth, webhooks, external APIs
- **Session Management** - Advanced session security
- **Time-Based Attacks** - Timing attacks, race conditions
- **Supply Chain Security** - Dependency confusion, build security
- **Logging & Monitoring** - What to log vs what NOT to log

### Special Environments
- **Legacy Code Security** - Securing existing codebases
- **Mobile Security** - iOS, Android, React Native
- **Database Migrations** - Safe data transformation
- **Zero-Day Response** - Incident response procedures

## Contributing

Found this guide helpful? Have suggestions for improvement? Contributions welcome!

## License

MIT - Use this guide freely in your projects
