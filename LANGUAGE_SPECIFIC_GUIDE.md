# Language-Specific Security & Best Practices

This appendix provides language and framework-specific guidance to complement the main [AI Coding Assistant Guide](./AI_CODING_ASSISTANT_GUIDE.md).

## Table of Contents

- [TypeScript / Node.js](#typescript--nodejs)
- [Python](#python)
- [PHP](#php)
- [Rust](#rust)
- [Go](#go)
- [Java](#java)
- [Ruby](#ruby)
- [C#/.NET](#cnet)

---

## TypeScript / Node.js

### Common Vulnerabilities

#### 1. **Prototype Pollution**
```typescript
// ❌ BAD - Vulnerable to prototype pollution
function merge(target, source) {
  for (let key in source) {
    target[key] = source[key];
  }
}

// ✅ GOOD - Safe merge
function merge(target, source) {
  for (let key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key) && 
        key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
      target[key] = source[key];
    }
  }
}

// ✅ BETTER - Use safe library
import merge from 'lodash/merge'; // or use structuredClone()
```

#### 2. **ReDoS (Regular Expression Denial of Service)**
```typescript
// ❌ BAD - Exponential backtracking
const emailRegex = /^([a-zA-Z0-9])+@[a-zA-Z0-9]+\.[a-z]+$/;

// ✅ GOOD - No catastrophic backtracking
const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-z]+$/;

// ✅ BETTER - Use validation library
import validator from 'validator';
validator.isEmail(email);
```

#### 3. **Path Traversal**
```typescript
// ❌ BAD - Path traversal vulnerability
app.get('/file/:name', (req, res) => {
  res.sendFile(`./uploads/${req.params.name}`);
});

// ✅ GOOD - Validate and normalize path
import path from 'path';
app.get('/file/:name', (req, res) => {
  const filename = path.basename(req.params.name);
  const filepath = path.join(__dirname, 'uploads', filename);
  
  if (!filepath.startsWith(path.join(__dirname, 'uploads'))) {
    return res.status(403).send('Forbidden');
  }
  res.sendFile(filepath);
});
```

#### 4. **Command Injection**
```typescript
// ❌ BAD - Command injection
const { exec } = require('child_process');
exec(`ping ${userInput}`, (error, stdout) => { ... });

// ✅ GOOD - Use safe APIs
const { execFile } = require('child_process');
execFile('ping', [userInput], (error, stdout) => { ... });

// ✅ BETTER - Validate input
const validHosts = ['example.com', 'localhost'];
if (!validHosts.includes(userInput)) {
  throw new Error('Invalid host');
}
```

### Framework-Specific: Express.js

```typescript
// Security middleware configuration
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

const app = express();

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// NoSQL injection prevention
app.use(mongoSanitize());

// Body parser with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

### Framework-Specific: NestJS

```typescript
// Global validation pipe
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw error if extra properties
    transform: true, // Transform to DTO types
    transformOptions: {
      enableImplicitConversion: false, // Explicit type conversion only
    },
  }));
  
  await app.listen(3000);
}

// DTO with validation
import { IsString, IsInt, Min, Max, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsInt()
  @Min(18)
  @Max(120)
  age: number;
}
```

### TypeScript Best Practices

```typescript
// ✅ Enable strict mode in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}

// ✅ Use proper type definitions
type UserId = string & { readonly __brand: 'UserId' }; // Branded type
type Email = string & { readonly __brand: 'Email' };

function sendEmail(to: Email, subject: string): void { ... }

// ✅ Avoid 'any' type
// ❌ BAD
function process(data: any) { ... }

// ✅ GOOD
function process(data: unknown) {
  if (typeof data === 'string') {
    // data is string here
  }
}
```

---

## Python

### Common Vulnerabilities

#### 1. **SQL Injection**
```python
# ❌ BAD - SQL injection
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)

# ✅ GOOD - Parameterized query
query = "SELECT * FROM users WHERE username = %s"
cursor.execute(query, (username,))

# ✅ BETTER - Use ORM
from sqlalchemy.orm import Session
user = session.query(User).filter_by(username=username).first()
```

#### 2. **Command Injection**
```python
# ❌ BAD - Command injection
import os
os.system(f"ping {host}")

# ✅ GOOD - Use subprocess with list
import subprocess
subprocess.run(["ping", host], check=True)

# ✅ BETTER - Validate input
allowed_hosts = ['example.com', 'localhost']
if host not in allowed_hosts:
    raise ValueError("Invalid host")
subprocess.run(["ping", host], check=True)
```

#### 3. **Pickle Deserialization**
```python
# ❌ BAD - Unsafe deserialization
import pickle
data = pickle.loads(user_data)

# ✅ GOOD - Use safe formats
import json
data = json.loads(user_data)

# ✅ For trusted internal use only
import pickle
import hmac
import hashlib

def safe_pickle_loads(data, secret):
    signature, pickled_data = data.split(b':', 1)
    expected_sig = hmac.new(secret, pickled_data, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature.decode(), expected_sig):
        raise ValueError("Invalid signature")
    return pickle.loads(pickled_data)
```

#### 4. **Path Traversal**
```python
# ❌ BAD - Path traversal
def read_file(filename):
    with open(f"uploads/{filename}", 'r') as f:
        return f.read()

# ✅ GOOD - Validate and sanitize
import os
from pathlib import Path

def read_file(filename):
    base_dir = Path("uploads").resolve()
    file_path = (base_dir / filename).resolve()
    
    if not str(file_path).startswith(str(base_dir)):
        raise ValueError("Invalid file path")
    
    with open(file_path, 'r') as f:
        return f.read()
```

### Framework-Specific: Django

```python
# settings.py - Security configuration
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')  # Never hardcode

# Security middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    # ...
]

# Security settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Views with proper validation
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator

@method_decorator(csrf_protect, name='dispatch')
class CreateUserView(View):
    def post(self, request):
        # Django forms handle validation and sanitization
        form = UserForm(request.POST)
        if form.is_valid():
            user = form.save()
            return JsonResponse({'id': user.id})
        return JsonResponse({'errors': form.errors}, status=400)
```

### Framework-Specific: FastAPI

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, constr, validator
from typing import Optional
import re

app = FastAPI()

# Pydantic models with validation
class UserCreate(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=100)
    age: int
    
    @validator('age')
    def validate_age(cls, v):
        if v < 18 or v > 120:
            raise ValueError('Age must be between 18 and 120')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain digit')
        return v

# Dependency injection for auth
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

# Secure endpoint
@app.post("/users/")
async def create_user(
    user: UserCreate,
    current_user = Depends(get_current_user)
):
    # Input is already validated by Pydantic
    hashed_password = hash_password(user.password)
    # ... create user
```

### Python Best Practices

```python
# ✅ Use type hints
def process_user(user_id: int, email: str) -> Optional[dict]:
    pass

# ✅ Use secrets module for cryptographic randomness
import secrets
token = secrets.token_urlsafe(32)

# ✅ Use context managers
with open('file.txt', 'r') as f:
    data = f.read()

# ✅ Use proper exception handling
try:
    result = risky_operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    raise  # or handle appropriately

# ✅ Use dataclasses for data structures
from dataclasses import dataclass

@dataclass
class User:
    id: int
    email: str
    is_active: bool = True
```

---

## PHP

### Common Vulnerabilities

#### 1. **SQL Injection**
```php
// ❌ BAD - SQL injection
$query = "SELECT * FROM users WHERE id = " . $_GET['id'];
$result = mysqli_query($conn, $query);

// ✅ GOOD - Prepared statements
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->bind_param("i", $_GET['id']);
$stmt->execute();
$result = $stmt->get_result();
```

#### 2. **XSS (Cross-Site Scripting)**
```php
// ❌ BAD - XSS vulnerability
echo "<div>" . $_GET['name'] . "</div>";

// ✅ GOOD - Escape output
echo "<div>" . htmlspecialchars($_GET['name'], ENT_QUOTES, 'UTF-8') . "</div>";

// ✅ In templates
<?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?>
```

#### 3. **File Inclusion**
```php
// ❌ BAD - Local file inclusion
include($_GET['page'] . '.php');

// ✅ GOOD - Whitelist approach
$allowed_pages = ['home', 'about', 'contact'];
$page = $_GET['page'] ?? 'home';

if (in_array($page, $allowed_pages, true)) {
    include($page . '.php');
} else {
    http_response_code(404);
}
```

#### 4. **Command Injection**
```php
// ❌ BAD - Command injection
exec("ping " . $_GET['host']);

// ✅ GOOD - Use escapeshellarg
exec("ping " . escapeshellarg($_GET['host']));

// ✅ BETTER - Validate input
$allowed_hosts = ['example.com', 'localhost'];
if (in_array($_GET['host'], $allowed_hosts, true)) {
    exec("ping " . escapeshellarg($_GET['host']));
}
```

### Framework-Specific: Laravel

```php
// .env - Never commit this file
APP_KEY=base64:...
DB_PASSWORD=...

// Config - Use environment variables
'key' => env('APP_KEY'),
'password' => env('DB_PASSWORD'),

// Routes with CSRF protection (automatic with web middleware)
Route::post('/users', [UserController::class, 'store'])
    ->middleware(['auth', 'throttle:60,1']);

// Controller with validation
class UserController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8|confirmed',
            'age' => 'required|integer|min:18|max:120',
        ]);
        
        // Validation passed, safe to use
        User::create([
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'age' => $validated['age'],
        ]);
    }
}

// Eloquent ORM (prevents SQL injection)
$user = User::where('email', $email)->first();

// Mass assignment protection
class User extends Model
{
    protected $fillable = ['email', 'name'];  // Allowed
    protected $guarded = ['is_admin'];        // Protected
}
```

### PHP Best Practices

```php
// ✅ Use strict types
declare(strict_types=1);

// ✅ Use type declarations
function processUser(int $userId, string $email): ?array
{
    // ...
}

// ✅ Use password_hash and password_verify
$hash = password_hash($password, PASSWORD_ARGON2ID);
if (password_verify($password, $hash)) {
    // Valid
}

// ✅ Use prepared statements with PDO
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
$stmt->execute(['email' => $email]);

// ✅ Validate and sanitize
$email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
if ($email === false) {
    throw new InvalidArgumentException('Invalid email');
}
```

---

## Rust

### Common Issues

#### 1. **Unsafe Code**
```rust
// ❌ Avoid unsafe unless absolutely necessary
unsafe {
    *ptr = value;
}

// ✅ Use safe abstractions
let mut vec = Vec::new();
vec.push(value);
```

#### 2. **Integer Overflow**
```rust
// ❌ May panic in debug, wrap in release
let result = a + b;

// ✅ Explicit overflow handling
let result = a.checked_add(b).ok_or(Error::Overflow)?;

// ✅ Saturating arithmetic
let result = a.saturating_add(b);
```

#### 3. **Unwrap in Production**
```rust
// ❌ BAD - May panic
let value = some_option.unwrap();

// ✅ GOOD - Proper error handling
let value = some_option.ok_or(Error::NotFound)?;

// ✅ GOOD - With default
let value = some_option.unwrap_or_default();
```

### Framework-Specific: Actix-Web

```rust
use actix_web::{web, App, HttpResponse, HttpServer};
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
struct CreateUser {
    #[validate(email)]
    email: String,
    
    #[validate(length(min = 8, max = 100))]
    password: String,
    
    #[validate(range(min = 18, max = 120))]
    age: u8,
}

async fn create_user(
    user: web::Json<CreateUser>,
) -> actix_web::Result<HttpResponse> {
    // Validate input
    user.validate()
        .map_err(|e| actix_web::error::ErrorBadRequest(e))?;
    
    // Hash password
    let hash = bcrypt::hash(&user.password, bcrypt::DEFAULT_COST)?;
    
    // ... create user
    
    Ok(HttpResponse::Created().finish())
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            // Add security middleware
            .wrap(actix_web::middleware::Logger::default())
            .route("/users", web::post().to(create_user))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

### Rust Best Practices

```rust
// ✅ Use Result for error handling
fn read_config(path: &Path) -> Result<Config, ConfigError> {
    let contents = fs::read_to_string(path)?;
    let config = toml::from_str(&contents)?;
    Ok(config)
}

// ✅ Use Option for nullable values
fn find_user(id: UserId) -> Option<User> {
    database.get(&id)
}

// ✅ Use strong types
struct UserId(u64);
struct Email(String);

// ✅ Implement From/TryFrom for conversions
impl TryFrom<String> for Email {
    type Error = ValidationError;
    
    fn try_from(s: String) -> Result<Self, Self::Error> {
        if validator::validate_email(&s) {
            Ok(Email(s))
        } else {
            Err(ValidationError::InvalidEmail)
        }
    }
}
```

---

## Go

### Common Vulnerabilities

#### 1. **SQL Injection**
```go
// ❌ BAD - SQL injection
query := fmt.Sprintf("SELECT * FROM users WHERE id = %s", id)
db.Query(query)

// ✅ GOOD - Use placeholders
db.Query("SELECT * FROM users WHERE id = $1", id)
```

#### 2. **Command Injection**
```go
// ❌ BAD - Command injection
cmd := exec.Command("sh", "-c", "ping "+host)

// ✅ GOOD - Use direct command
cmd := exec.Command("ping", host)

// ✅ BETTER - Validate input
allowedHosts := map[string]bool{"example.com": true}
if !allowedHosts[host] {
    return errors.New("invalid host")
}
```

#### 3. **Race Conditions**
```go
// ❌ BAD - Race condition
if counter < 100 {
    counter++
}

// ✅ GOOD - Use mutex
mu.Lock()
if counter < 100 {
    counter++
}
mu.Unlock()

// ✅ BETTER - Use atomic operations
atomic.AddInt64(&counter, 1)
```

### Framework-Specific: Gin

```go
package main

import (
    "github.com/gin-gonic/gin"
    "github.com/gin-gonic/gin/binding"
    "github.com/go-playground/validator/v10"
)

type CreateUserRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=8,max=100"`
    Age      int    `json:"age" binding:"required,gte=18,lte=120"`
}

func createUser(c *gin.Context) {
    var req CreateUserRequest
    
    // Validate request
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword(
        []byte(req.Password), 
        bcrypt.DefaultCost,
    )
    if err != nil {
        c.JSON(500, gin.H{"error": "Internal error"})
        return
    }
    
    // ... create user
    
    c.JSON(201, gin.H{"status": "created"})
}

func main() {
    r := gin.Default()
    
    // Add security middleware
    r.Use(func(c *gin.Context) {
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Next()
    })
    
    r.POST("/users", createUser)
    r.Run(":8080")
}
```

### Go Best Practices

```go
// ✅ Always check errors
file, err := os.Open("config.json")
if err != nil {
    return fmt.Errorf("failed to open config: %w", err)
}
defer file.Close()

// ✅ Use context for timeouts
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

req, err := http.NewRequestWithContext(ctx, "GET", url, nil)

// ✅ Use defer for cleanup
func processFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()
    
    // Process file
    return nil
}

// ✅ Use proper synchronization
type Counter struct {
    mu    sync.RWMutex
    value int64
}

func (c *Counter) Inc() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value++
}

func (c *Counter) Value() int64 {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.value
}
```

---

## Java

### Common Vulnerabilities

#### 1. **SQL Injection**
```java
// ❌ BAD - SQL injection
String query = "SELECT * FROM users WHERE id = " + userId;
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery(query);

// ✅ GOOD - PreparedStatement
String query = "SELECT * FROM users WHERE id = ?";
PreparedStatement stmt = conn.prepareStatement(query);
stmt.setInt(1, userId);
ResultSet rs = stmt.executeQuery();
```

#### 2. **Deserialization**
```java
// ❌ BAD - Unsafe deserialization
ObjectInputStream ois = new ObjectInputStream(input);
Object obj = ois.readObject();

// ✅ GOOD - Use safe alternatives
// Use JSON instead
ObjectMapper mapper = new ObjectMapper();
User user = mapper.readValue(json, User.class);

// Or validate class before deserializing
ObjectInputStream ois = new ObjectInputStream(input) {
    @Override
    protected Class<?> resolveClass(ObjectStreamClass desc)
            throws IOException, ClassNotFoundException {
        if (!desc.getName().equals("com.example.User")) {
            throw new InvalidClassException("Unauthorized deserialization");
        }
        return super.resolveClass(desc);
    }
};
```

### Framework-Specific: Spring Boot

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @PostMapping
    public ResponseEntity<User> createUser(
            @Valid @RequestBody CreateUserDto dto) {
        
        // Validation automatic via @Valid
        // dto is already validated
        
        String hashedPassword = passwordEncoder.encode(dto.getPassword());
        User user = userService.create(dto.getEmail(), hashedPassword);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }
}

// DTO with validation
import javax.validation.constraints.*;

public class CreateUserDto {
    @NotBlank
    @Email
    private String email;
    
    @NotBlank
    @Size(min = 8, max = 100)
    @Pattern(regexp = "^(?=.*[A-Z])(?=.*[0-9]).*$")
    private String password;
    
    @Min(18)
    @Max(120)
    private Integer age;
    
    // getters and setters
}

// Security configuration
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .and()
            .headers()
                .contentSecurityPolicy("default-src 'self'")
                .and()
                .frameOptions().deny()
                .and()
            .authorizeHttpRequests()
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated();
        
        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
```

### Java Best Practices

```java
// ✅ Use try-with-resources
try (Connection conn = dataSource.getConnection();
     PreparedStatement stmt = conn.prepareStatement(query)) {
    // Use resources
} // Automatically closed

// ✅ Use Optional
public Optional<User> findUser(Long id) {
    return userRepository.findById(id);
}

// ✅ Use streams safely
List<String> emails = users.stream()
    .filter(User::isActive)
    .map(User::getEmail)
    .collect(Collectors.toList());

// ✅ Immutable objects
public final class User {
    private final Long id;
    private final String email;
    
    public User(Long id, String email) {
        this.id = Objects.requireNonNull(id);
        this.email = Objects.requireNonNull(email);
    }
    
    // Only getters, no setters
}
```

---

## Ruby

### Common Vulnerabilities

#### 1. **SQL Injection**
```ruby
# ❌ BAD - SQL injection
User.where("email = '#{params[:email]}'")

# ✅ GOOD - Parameterized query
User.where("email = ?", params[:email])

# ✅ BETTER - Hash conditions
User.where(email: params[:email])
```

#### 2. **Command Injection**
```ruby
# ❌ BAD - Command injection
`ping #{host}`

# ✅ GOOD - Use array syntax
system("ping", host)

# ✅ BETTER - Validate input
allowed_hosts = ['example.com', 'localhost']
raise "Invalid host" unless allowed_hosts.include?(host)
system("ping", host)
```

### Framework-Specific: Rails

```ruby
# Strong parameters
class UsersController < ApplicationController
  def create
    @user = User.new(user_params)
    
    if @user.save
      render json: @user, status: :created
    else
      render json: @user.errors, status: :unprocessable_entity
    end
  end
  
  private
  
  def user_params
    params.require(:user).permit(:email, :password, :age)
  end
end

# Model validation
class User < ApplicationRecord
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 8, maximum: 100 }
  validates :age, numericality: { greater_than_or_equal_to: 18, less_than_or_equal_to: 120 }
  
  has_secure_password
end

# Security configuration in config/application.rb
config.force_ssl = true
config.action_controller.default_protect_from_forgery = true
```

### Ruby Best Practices

```ruby
# ✅ Use safe navigation operator
user&.email

# ✅ Use fetch with default
config.fetch(:timeout, 30)

# ✅ Use symbols for hash keys
user = { id: 1, email: 'user@example.com' }

# ✅ Handle exceptions properly
begin
  risky_operation
rescue SpecificError => e
  logger.error "Operation failed: #{e.message}"
  raise
end
```

---

## C#/.NET

### Common Vulnerabilities

#### 1. **SQL Injection**
```csharp
// ❌ BAD - SQL injection
string query = $"SELECT * FROM Users WHERE Id = {userId}";
SqlCommand cmd = new SqlCommand(query, connection);

// ✅ GOOD - Parameterized query
string query = "SELECT * FROM Users WHERE Id = @UserId";
SqlCommand cmd = new SqlCommand(query, connection);
cmd.Parameters.AddWithValue("@UserId", userId);

// ✅ BETTER - Use Entity Framework
var user = context.Users.FirstOrDefault(u => u.Id == userId);
```

#### 2. **Deserialization**
```csharp
// ❌ BAD - Insecure deserialization
BinaryFormatter formatter = new BinaryFormatter();
object obj = formatter.Deserialize(stream);

// ✅ GOOD - Use JSON
string json = JsonSerializer.Serialize(user);
User user = JsonSerializer.Deserialize<User>(json);
```

### Framework-Specific: ASP.NET Core

```csharp
// Startup.cs / Program.cs
builder.Services.AddControllers();

// Add security headers
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Add("X-Frame-Options", "DENY");
    context.Response.Headers.Add("Content-Security-Policy", "default-src 'self'");
    await next();
});

// Controller with validation
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<User>> CreateUser(
        [FromBody] CreateUserDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        
        var hashedPassword = _passwordHasher.HashPassword(null, dto.Password);
        var user = await _userService.CreateAsync(dto.Email, hashedPassword);
        
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
    }
}

// DTO with validation
using System.ComponentModel.DataAnnotations;

public class CreateUserDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; }
    
    [Required]
    [StringLength(100, MinimumLength = 8)]
    [RegularExpression(@"^(?=.*[A-Z])(?=.*[0-9]).*$")]
    public string Password { get; set; }
    
    [Range(18, 120)]
    public int Age { get; set; }
}
```

### C# Best Practices

```csharp
// ✅ Use using statements
using (var connection = new SqlConnection(connectionString))
{
    // Use connection
} // Automatically disposed

// ✅ Use async/await
public async Task<User> GetUserAsync(int id)
{
    return await _context.Users.FindAsync(id);
}

// ✅ Use nullable reference types
#nullable enable
public string? GetUserEmail(int id)
{
    var user = FindUser(id);
    return user?.Email;
}

// ✅ Use pattern matching
if (obj is User user && user.IsActive)
{
    // user is strongly typed here
}
```

---

## Summary Table

| Language | Primary Concerns | Key Security Tools |
|----------|-----------------|-------------------|
| TypeScript/Node | Prototype pollution, ReDoS, async issues | helmet, express-rate-limit, validator |
| Python | SQL injection, pickle, command injection | SQLAlchemy, Django ORM, validators |
| PHP | SQL injection, XSS, file inclusion | PDO, Laravel validation, htmlspecialchars |
| Rust | Unsafe code, panics, integer overflow | cargo-audit, clippy, compiler checks |
| Go | Race conditions, injection, error handling | go vet, gosec, staticcheck |
| Java | Deserialization, SQL injection | OWASP Dependency Check, SpotBugs |
| Ruby | SQL injection, mass assignment, command injection | Brakeman, RuboCop, bundler-audit |
| C#/.NET | SQL injection, deserialization | Security Code Scan, Roslyn analyzers |

## Contributing

Found language-specific issues or patterns? Contribute to make this guide better!

## License

MIT
