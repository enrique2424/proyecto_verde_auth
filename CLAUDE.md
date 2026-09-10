# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

## Proyecto: Banco Verde IAM

Servicio de autenticación NestJS para la aplicación móvil Banco Verde. Proporciona gestión de identidades y acceso (IAM) con JWT y refresh tokens.

## Comandos

```bash
# Instalar dependencias
yarn install

# Desarrollo
yarn start:dev        # Modo observador con recarga automática
yarn start:debug      # Modo depuración con observador

# Producción
yarn start:prod       # Ejecutar compilación de producción

# Pruebas
yarn test              # Pruebas unitarias
yarn test:watch        # Modo observador para pruebas
yarn test:cov          # Informe de cobertura
yarn test:e2e          # Pruebas extremo a extremo

# Calidad del código
yarn lint              # ESLint con corrección automática
yarn format            # Formato con Prettier
yarn build             # Compilar TypeScript a dist/

# Seed (crear usuario admin)
yarn ts-node src/database/seed/run-seed.ts
```

## Arquitectura

### Módulos

- **AuthModule** (`src/auth/`) - Autenticación
  - `AuthController` - Endpoints: login, refresh, logout, verify
  - `AuthService` - Lógica de autenticación
  - `JwtAuthService` - Generación y verificación de JWTs
  - `JwtStrategy` - Estrategia Passport JWT

- **UsersModule** (`src/users/`) - Gestión de usuarios
  - `UsersService` - CRUD, validación de contraseñas, lockout

- **SessionsModule** (`src/sessions/`) - Gestión de sesiones
  - `SessionsService` - Refresh tokens con hash bcrypt

- **AuditLogModule** (`src/audit-log/`) - Logging de auditoría
  - `AuditLogService` - Registra acciones de login/logout

### Flujo de Autenticación

```
POST /auth/login
  → Validar email → Verificar lockout → bcrypt compare
  → Si éxito: JWT access + refresh token (hashed en BD)
  → Registrar en audit_log

POST /auth/refresh
  → Verificar refresh token JWT → Validar hash en BD
  → Generar nuevos tokens → Revocar old, crear nuevo

POST /auth/logout
  → Revocar refresh token en BD

POST /auth/verify
  → Verificar access token JWT
```

### Modelo de Datos

```sql
users (id uuid PK, email unique, password_hash, is_active, failed_attempts, locked_until)
sessions (id uuid PK, user_id FK, refresh_token hashed, device_info, ip_address, expires_at, is_revoked)
audit_log (id uuid PK, user_id, action, ip, device, timestamp, success)
```

### Configuración

Variables de entorno (`.env`):
- `PORT` - Puerto del servidor
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` - PostgreSQL
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` - Secrets JWT
- `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES` - Expiración tokens
- `MAX_LOGIN_ATTEMPTS`, `LOCKOUT_DURATION_MINUTES` - Lockout de cuenta
- `TIME`, `LIMITING` - Rate limiting
- `CORS` - Orígenes permitidos

## Seguridad

| Funcionalidad | Implementación |
|--------------|----------------|
| Password hashing | bcrypt (10 rounds) |
| Access token | JWT, 15 min expiry |
| Refresh token | UUID, bcrypt hash en BD, 7 días |
| Account lockout | 5 intentos fallidos → 15 min bloqueo |
| Rate limiting | @nestjs/throttler (100 req/min) |
| Auditoría | audit_log para login/logout/refresh |

## Preparado para Extensiones

- MFA: Estructura de usuarios y sesiones lista
- E2E: TokenCryptService reutilizable
- Fraude: audit_log con IP, device, timestamps
- Logging centralizado: console.log → ELK/Datadog

## Desarrollo Local con Docker

```bash
# Iniciar PostgreSQL
docker-compose up -d postgres

# Ver logs de PostgreSQL
docker-compose logs postgres

# En otra terminal, correr seed
yarn ts-node src/database/seed/run-seed.ts

# Iniciar app
yarn start:dev

# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bancoverde.com","password":"Admin123!"}'
```

## Test Credentials

- Email: `admin@bancoverde.com`
- Password: `Admin123!`
