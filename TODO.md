# PROMTX - PostgreSQL Migration & Full-Stack Infrastructure TODO

> **Tarih:** 2026-04-25
> **Durum:** Sifirdan PostgreSQL + Prisma altyapisi kurulumu
> **Mevcut Sistem:** Rust (Tauri) + SQLite (sqlx + sea-orm) + React 19 + Vite + Bun
> **Hedef:** Docker uzerinde PostgreSQL 16+ / Prisma ORM / Redis Sentinel / Google OAuth / Vercel Deploy
> **Paket Yoneticisi:** Bun (npm KULLANILMAYACAK)
> **ORM:** Prisma (sea-orm ve sqlx kaldirilacak)
> **Kapsam:** Docker, PostgreSQL, Prisma, Auth (Google OAuth + Email), Redis Sentinel, Vercel, CI/CD, Seed Data, Monitoring

---

## BOLUM 0: ON KOSULLAR VE ORTAM HAZIRLIK

### 0.1 Docker Desktop Kurulumu (Windows)
- [ ] Docker Desktop for Windows indir ve kur
- [ ] WSL2 backend aktif et
- [ ] Docker Desktop basarili: `docker --version`
- [ ] Docker Compose yuklu: `docker compose version`
- [ ] `docker run hello-world` ile dogrula
- [ ] Docker Desktop memory limiti en az 4GB
- [ ] Windows Defender Firewall'da Docker icin istisna (gerekirse)

### 0.2 Bun Kurulumu ve Dogrulama
- [ ] Bun yuklu degilse kur: `powershell -c "irm bun.sh/install.ps1 | iex"`
- [ ] Bun versiyonunu dogrula: `bun --version` (1.1+ olmali)
- [ ] Mevcut `node_modules` sil: `rm -rf node_modules`
- [ ] Bun ile yeniden yukle: `bun install`
- [ ] `bun run dev` ile projenin calisitigini dogrula
- [ ] `package.json` script'lerinin bun ile uyumlu oldugunu dogrula
- [ ] `bun.lockb` dosyasinin olusturuldugunu dogrula
- [ ] Eski `package-lock.json` / `yarn.lock` dosyalarini sil (varsa)

### 0.3 Proje Dizin Yapisini Hazirla
- [ ] `promtx/docker/` dizini olustur
- [ ] `promtx/docker/postgres/` dizini olustur
- [ ] `promtx/docker/postgres/init/` dizini olustur (ilk calistirma SQL script'leri)
- [ ] `promtx/docker/postgres/conf/` dizini olustur (postgresql.conf, pg_hba.conf)
- [ ] `promtx/docker/postgres/backups/` dizini olustur
- [ ] `promtx/docker/postgres/ssl/` dizini olustur
- [ ] `promtx/docker/scripts/` dizini olustur
- [ ] `promtx/prisma/` dizini olustur (Prisma schema + migrations)
- [ ] `promtx/prisma/seed/` dizini olustur (seed data script'leri)
- [ ] `.gitignore` guncelle:
  - [ ] `docker/postgres/data/`
  - [ ] `docker/postgres/backups/*.sql`
  - [ ] `docker/postgres/ssl/*.key`
  - [ ] `.env.docker`
  - [ ] `.env.local`
  - [ ] `node_modules/`
  - [ ] `bun.lockb` (opsiyonel — takim karari)

### 0.4 Gelistirme Araclari
- [ ] pgAdmin 4 kur (GUI veritabani yonetimi)
- [ ] VS Code icin "Prisma" extension kur (syntax highlighting + format)
- [ ] VS Code icin "Docker" extension kur
- [ ] VS Code icin "PostgreSQL" extension kur
- [ ] Prisma CLI kur: `bun add -d prisma`
- [ ] Prisma Client kur: `bun add @prisma/client`
- [ ] `bunx prisma --version` ile dogrula

---

## BOLUM 1: PORT YONETIMI (CAKISMA ONLEME)

### 1.1 Port Haritasi (Tum Servisler)

> **KURAL:** Hicbir port cakismamali. Asagidaki tablo tum servislerin sabit port atamasini icerir.

| Servis | Port | Ortam | Aciklama |
|--------|------|-------|----------|
| Vite Dev Server | 1420 | Dev | Frontend dev (mevcut Tauri ayari) |
| Vite Preview | 4173 | Dev | `bun run preview` |
| PostgreSQL | 5432 | Dev/Prod | Veritabani |
| PostgreSQL Test | 5433 | Test | Test veritabani (cakisma onleme) |
| Redis | 6379 | Dev/Prod | Cache + Session |
| Redis Sentinel 1 | 26379 | Prod | Sentinel master izleme |
| Redis Sentinel 2 | 26380 | Prod | Sentinel replica 1 |
| Redis Sentinel 3 | 26381 | Prod | Sentinel replica 2 |
| pgAdmin | 5050 | Dev | DB yonetim araci |
| Prisma Studio | 5555 | Dev | `bunx prisma studio` |
| API Server (Axum) | 3001 | Dev/Prod | Rust backend REST API |
| Tauri Dev | 1421 | Dev | Tauri IPC |
| Prometheus | 9090 | Prod | Metrik toplama |
| Grafana | 3000 | Prod | Dashboard |
| postgres_exporter | 9187 | Prod | PG metrikleri |

- [ ] `scripts/kill-port.js` scriptini guncelle — tum portlari kontrol etsin
- [ ] `docker-compose.yml` icinde port mapping'leri yukaridaki tabloya gore ayarla
- [ ] `.env.local` icine `VITE_API_PORT=3001` ekle
- [ ] `.env.local` icine `DATABASE_PORT=5432` ekle
- [ ] `.env.local` icine `REDIS_PORT=6379` ekle
- [ ] Port cakisma kontrolu icin `docker/scripts/check-ports.sh` yaz

---

## BOLUM 2: DOCKER COMPOSE YAPISI

### 2.1 Ana docker-compose.yml
- [ ] `promtx/docker-compose.yml` dosyasi olustur
- [ ] PostgreSQL 16 servisi: `image: postgres:16-alpine`
  - [ ] Container: `promtx-postgres`
  - [ ] Port: `5432:5432`
  - [ ] Restart: `unless-stopped`
  - [ ] Volume: `pgdata:/var/lib/postgresql/data`
  - [ ] Volume: `./docker/postgres/init:/docker-entrypoint-initdb.d`
  - [ ] Volume: `./docker/postgres/conf/postgresql.conf:/etc/postgresql/postgresql.conf`
  - [ ] Environment: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB=promtx`
  - [ ] Healthcheck: `pg_isready -U $$POSTGRES_USER -d promtx` (interval 10s, timeout 5s, retries 5)
  - [ ] Memory limit: `2G`, CPU limit: `2.0`
  - [ ] `shm_size: 256mb`
  - [ ] Logging: `json-file` max-size 50m, max-file 5

### 2.2 Redis Servisi (Cache + Session + Rate Limiting)
- [ ] Redis servisi: `image: redis:7-alpine`
  - [ ] Container: `promtx-redis`
  - [ ] Port: `6379:6379`
  - [ ] `command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly yes`
  - [ ] Healthcheck: `redis-cli -a $$REDIS_PASSWORD ping`
  - [ ] Volume: `redis-data:/data`

### 2.3 Redis Sentinel Yapisi (Uretim Icin High Availability)
- [ ] `docker-compose.sentinel.yml` olustur
- [ ] Redis Master servisi:
  - [ ] Container: `promtx-redis-master`
  - [ ] Port: `6379:6379`
  - [ ] `command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes`
- [ ] Redis Slave servisi:
  - [ ] Container: `promtx-redis-slave`
  - [ ] `command: redis-server --slaveof promtx-redis-master 6379 --masterauth ${REDIS_PASSWORD} --requirepass ${REDIS_PASSWORD}`
- [ ] Sentinel 1:
  - [ ] Container: `promtx-sentinel-1`
  - [ ] Port: `26379:26379`
  - [ ] `sentinel.conf` dosyasi:
    ```
    sentinel monitor promtx-master promtx-redis-master 6379 2
    sentinel auth-pass promtx-master ${REDIS_PASSWORD}
    sentinel down-after-milliseconds promtx-master 5000
    sentinel failover-timeout promtx-master 10000
    sentinel parallel-syncs promtx-master 1
    ```
- [ ] Sentinel 2: Port `26380:26379`
- [ ] Sentinel 3: Port `26381:26379`
- [ ] Sentinel health check scripti yaz
- [ ] Failover testi proseduru belgele
- [ ] Rust tarafinda sentinel client entegrasyonu:
  - [ ] `redis` crate sentinel feature: `redis = { features = ["sentinel"] }`
  - [ ] Sentinel connection manager olustur
  - [ ] Otomatik failover handling

### 2.4 pgAdmin Servisi (Sadece Dev)
- [ ] pgAdmin: `image: dpage/pgadmin4:latest`
  - [ ] Container: `promtx-pgadmin`
  - [ ] Port: `5050:80`
  - [ ] `PGADMIN_DEFAULT_EMAIL=admin@promtx.ai`
  - [ ] `depends_on: postgres: condition: service_healthy`
  - [ ] Profile: `dev` (uretimde devre disi)

### 2.5 docker-compose.dev.yml (Override)
- [ ] Port'lari host'a ac (5432, 5050, 6379)
- [ ] PostgreSQL verbose log: `log_statement: 'all'`
- [ ] pgAdmin aktif
- [ ] Prisma Studio port: 5555

### 2.6 docker-compose.prod.yml (Override)
- [ ] Port'lari internal network'e kisitla
- [ ] SSL zorunlu
- [ ] pgAdmin devre disi
- [ ] Sentinel aktif
- [ ] Memory/CPU limitleri artir
- [ ] Log seviyesi: `WARNING`

### 2.7 docker-compose.test.yml (Override)
- [ ] Ayri PostgreSQL: `promtx-postgres-test` port `5433:5432`
- [ ] Database: `promtx_test`
- [ ] `tmpfs: /var/lib/postgresql/data` (hizli test)
- [ ] `POSTGRES_HOST_AUTH_METHOD=trust`

### 2.8 .env.docker Dosyasi
- [ ] `POSTGRES_USER=promtx_admin`
- [ ] `POSTGRES_PASSWORD=` (32+ karakter rastgele)
- [ ] `POSTGRES_DB=promtx`
- [ ] `POSTGRES_HOST=promtx-postgres`
- [ ] `POSTGRES_PORT=5432`
- [ ] `DATABASE_URL=postgresql://promtx_admin:PASSWORD@promtx-postgres:5432/promtx?sslmode=prefer`
- [ ] `REDIS_PASSWORD=` (32+ karakter rastgele)
- [ ] `REDIS_URL=redis://:PASSWORD@promtx-redis:6379/0`
- [ ] `REDIS_SENTINEL_URLS=promtx-sentinel-1:26379,promtx-sentinel-2:26380,promtx-sentinel-3:26381`
- [ ] `REDIS_SENTINEL_MASTER=promtx-master`
- [ ] `GOOGLE_CLIENT_ID=`
- [ ] `GOOGLE_CLIENT_SECRET=`
- [ ] `GOOGLE_REDIRECT_URI=http://localhost:1420/auth/google/callback`
- [ ] `JWT_SECRET=` (64+ karakter)
- [ ] `NEXTAUTH_SECRET=` (Vercel deploy icin)
- [ ] **Mevcut .env.example degiskenleri de dahil edilmeli:**
  - [ ] `VITE_VAULT_KEY=` (32+ karakter, client-side sifreleme)
  - [ ] `GEMINI_API_KEY=` (Google Gemini AI modeli)
  - [ ] `STRIPE_SECRET_KEY=` (backend only)
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY=` (frontend icin guvenli)
  - [ ] `STRIPE_WEBHOOK_SECRET=` (webhook dogrulama)
  - [ ] `RESEND_API_KEY=` (email servisi — hosgeldin email, password reset)
  - [ ] `VITE_API_URL=https://api.promtx.ai` (backend URL)
  - [ ] `VITE_SENTRY_DSN=` (hata takibi)
  - [ ] `VITE_POSTHOG_KEY=` (analytics)
  - [ ] `VITE_POSTHOG_HOST=https://eu.i.posthog.com`
  - [ ] `TAURI_SIGNING_PRIVATE_KEY=` (desktop app signing)
  - [ ] `TAURI_SIGNING_PASSWORD=`
- [ ] `.env.docker.example` olustur (hassas degerler bos)
- [ ] `.gitignore`'a `.env.docker` ekle

### 2.9 Docker Network
- [ ] `promtx-network` bridge network
- [ ] Subnet: `172.20.0.0/16`
- [ ] PostgreSQL: `172.20.0.10`
- [ ] Redis: `172.20.0.11`
- [ ] pgAdmin: `172.20.0.12`
- [ ] Sentinel 1/2/3: `172.20.0.20-22`

### 2.10 Docker Yardimci Script'ler
- [ ] `docker/scripts/start.sh` — Tum servisleri baslat
- [ ] `docker/scripts/stop.sh` — Durdur
- [ ] `docker/scripts/reset-db.sh` — DB sifirla
- [ ] `docker/scripts/backup.sh` — Yedek al
- [ ] `docker/scripts/restore.sh` — Geri yukle
- [ ] `docker/scripts/logs.sh` — Loglar
- [ ] `docker/scripts/shell.sh` — PG container shell
- [ ] `docker/scripts/psql.sh` — psql baglantisi
- [ ] `docker/scripts/health.sh` — Saglik kontrolu
- [ ] `docker/scripts/seed.sh` — `bunx prisma db seed` calistir
- [ ] `docker/scripts/migrate.sh` — `bunx prisma migrate deploy` calistir
- [ ] `docker/scripts/check-ports.sh` — Port cakisma kontrolu
- [ ] `docker/scripts/sentinel-status.sh` — Sentinel durumu
- [ ] Her script'te hata kontrolu (`set -e, trap ERR`) ve renk kodlu cikti

---

## BOLUM 3: PRISMA KURULUMU VE SCHEMA

### 3.1 Prisma Altyapisi
- [ ] `bun add -d prisma`
- [ ] `bun add @prisma/client`
- [ ] `bunx prisma init --datasource-provider postgresql`
- [ ] `prisma/schema.prisma` dosyasi olustur
- [ ] `.env` icinde `DATABASE_URL` ayarla
- [ ] `prisma/seed.ts` dosyasi olustur (bun ile calisacak)
- [ ] `package.json` icine prisma seed config ekle:
  ```json
  "prisma": {
    "seed": "bun prisma/seed.ts"
  }
  ```
- [ ] Mevcut `sqlx` ve `sea-orm` bagimliklarini Cargo.toml'dan kaldir (asama asama)
- [ ] Prisma Client'i Rust yerine Node/Bun API layer'da kullan
  - [ ] Veya `prisma-client-rust` crate kullan (Rust native Prisma client)

### 3.2 Prisma Schema — Enum Tanimlari

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// GERCEK Rust enum'dan (src-tauri/src/modules/auth.rs:12)
enum UserRole {
  free
  pro
  enterprise
  admin
  super_admin
}

enum SessionStatus {
  active
  expired
  revoked
  logged_out
}

enum StudioType {
  image
  video
  cinema
  audio
  character
  fashion
  marketing
  edit
}

enum AIProvider {
  google
  openai
  anthropic
  replicate
  stability
  midjourney
  local
}

enum PaymentStatus {
  pending
  processing
  completed
  failed
  refunded
  disputed
}

enum LedgerType {
  credit
  debit
  refund
  adjustment
  bonus
  referral
  subscription
  topup
}

enum IAPPlatform {
  stripe
  apple
  google
  paypal
}

enum ImageStatus {
  generating
  completed
  failed
  deleted
  flagged
}

enum LogLevel {
  debug
  info
  warn
  error
  critical
}

enum MemberRole {
  owner
  admin
  editor
  viewer
}

enum NotificationType {
  system
  billing
  security
  workspace
  generation
  referral
}

enum AuthProvider {
  email
  google
  apple
  github
}

// GERCEK Rust enum'dan (src-tauri/src/modules/ledger.rs:8)
enum TransactionReason {
  generation
  top_up
  refund
  subscription
}

// Mevcut Rust enum'dan (src-tauri/src/modules/models.rs:92)
// NOT: WorkspaceRole Rust'ta Owner/Admin/Member/Viewer seklinde
```

- [ ] Tum enum'lari schema.prisma'ya ekle
- [ ] `bunx prisma format` ile dogrula
- [ ] `UserRole` enum'u Rust'taki `Free, Pro, Enterprise, Admin, SuperAdmin` ile birebir eslesmeli
- [ ] `TransactionReason` enum'u Rust'taki `Generation, TopUp, Refund, Subscription` ile eslesmeli
- [ ] `WorkspaceRole` icin Rust'taki `Owner, Admin, Member, Viewer` kullanilmali (MemberRole degil)

### 3.3 Prisma Schema — Core Modelleri

```prisma
model User {
  id                String    @id @default(uuid())
  email             String    @unique @db.VarChar(255)
  displayName       String?   @map("display_name") @db.VarChar(255)
  passwordHash      String?   @map("password_hash")
  role              UserRole  @default(free)
  isFrozen          Boolean   @default(false) @map("is_frozen")
  isEmailVerified   Boolean   @default(false) @map("is_email_verified")
  avatarUrl         String?   @map("avatar_url") @db.VarChar(1024)
  locale            String    @default("tr") @db.VarChar(10)
  timezone          String    @default("Europe/Istanbul") @db.VarChar(50)
  lastLoginAt       DateTime? @map("last_login_at")
  loginCount        Int       @default(0) @map("login_count")
  failedLoginCount  Int       @default(0) @map("failed_login_count")
  lockedUntil       DateTime? @map("locked_until")
  totpSecret        String?   @map("totp_secret")
  totpEnabled       Boolean   @default(false) @map("totp_enabled")
  metadata          Json      @default("{}")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // Relations
  accounts          Account[]
  sessions          Session[]
  refreshTokens     RefreshToken[]
  apiKeys           ApiKey[]
  notifications     Notification[]
  conversations     Conversation[]
  promptHistory     PromptHistory[]
  imageGenerations  ImageGeneration[]
  dnaVault          DnaVault[]
  promptTemplates   PromptTemplate[]
  wallet            Wallet?
  ledgerEntries     LedgerEntry[]
  receipts          Receipt[]
  fileUploads       FileUpload[]
  tokenUsage        TokenUsage[]
  workspacesOwned   Workspace[]      @relation("WorkspaceOwner")
  workspaceMembers  WorkspaceMember[]
  folders           Folder[]
  referralsMade     Referral[]       @relation("Referrer")
  referralsReceived Referral[]       @relation("Referred")

  @@map("users")
}

model Account {
  id                String       @id @default(uuid())
  userId            String       @map("user_id")
  provider          AuthProvider
  providerAccountId String       @map("provider_account_id")
  accessToken       String?      @map("access_token")
  refreshToken      String?      @map("refresh_token")
  expiresAt         DateTime?    @map("expires_at")
  tokenType         String?      @map("token_type")
  scope             String?
  idToken           String?      @map("id_token")
  createdAt         DateTime     @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id               String        @id @default(uuid())
  userId           String        @map("user_id")
  tokenHash        String        @map("token_hash")
  status           SessionStatus @default(active)
  ipAddress        String?       @map("ip_address") @db.VarChar(45)
  userAgent        String?       @map("user_agent")
  deviceFingerprint String?      @map("device_fingerprint") @db.VarChar(255)
  expiresAt        DateTime      @map("expires_at")
  lastActivityAt   DateTime      @default(now()) @map("last_activity_at")
  createdAt        DateTime      @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@index([expiresAt])
  @@map("sessions")
}

model RefreshToken {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  tokenHash     String   @unique @map("token_hash")
  parentTokenId String?  @map("parent_token_id")
  sessionId     String?  @map("session_id")
  isRevoked     Boolean  @default(false) @map("is_revoked")
  revokedAt     DateTime? @map("revoked_at")
  revokedReason String?  @map("revoked_reason") @db.VarChar(255)
  expiresAt     DateTime @map("expires_at")
  createdAt     DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model ApiKey {
  id               String    @id @default(uuid())
  userId           String    @map("user_id")
  name             String    @db.VarChar(255)
  keyPrefix        String    @map("key_prefix") @db.VarChar(8)
  keyHash          String    @unique @map("key_hash")
  scopes           String[]  @default([])
  rateLimitPerMin  Int       @default(60) @map("rate_limit_per_minute")
  expiresAt        DateTime? @map("expires_at")
  lastUsedAt       DateTime? @map("last_used_at")
  lastUsedIp       String?   @map("last_used_ip") @db.VarChar(45)
  isActive         Boolean   @default(true) @map("is_active")
  createdAt        DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("api_keys")
}

model Notification {
  id        String           @id @default(uuid())
  userId    String           @map("user_id")
  type      NotificationType
  title     String           @db.VarChar(255)
  body      String?
  data      Json             @default("{}")
  isRead    Boolean          @default(false) @map("is_read")
  readAt    DateTime?        @map("read_at")
  createdAt DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("notifications")
}
```

- [ ] Core modelleri schema.prisma'ya ekle
- [ ] Account modeli Google OAuth icin ZORUNLU
- [ ] `passwordHash` nullable (Google ile kayit olanlarda sifre yok)
- [ ] `bunx prisma format` ile dogrula

#### Mevcut SQLite -> Prisma Eslestirme Notu (users tablosu)
> **Kaynak:** `src-tauri/migrations/20260424000000_init.sql`
> - SQLite `id TEXT` -> Prisma `@id @default(uuid())`
> - SQLite `role TEXT DEFAULT 'member'` -> Prisma `UserRole @default(free)` (Rust enum Free)
> - SQLite `is_frozen INTEGER DEFAULT 0` -> Prisma `Boolean @default(false)`
> - SQLite `password_hash TEXT NOT NULL` -> Prisma `String?` (Google OAuth icin nullable)
> - Prisma'ya **eklenen** alanlar: `isEmailVerified`, `locale`, `timezone`, `lastLoginAt`, `loginCount`, `failedLoginCount`, `lockedUntil`, `totpSecret`, `totpEnabled`, `metadata`
> - Bu alanlar Rust `auth.rs`'te zaten kullaniliyor (2FA/TOTP, account locking vb.)

### 3.4 Prisma Schema — AI Modelleri

```prisma
model Conversation {
  id           String      @id @default(uuid())
  userId       String      @map("user_id")
  workspaceId  String?     @map("workspace_id")
  folderId     String?     @map("folder_id")
  title        String      @db.VarChar(512)
  studioType   StudioType? @map("studio_type")
  isArchived   Boolean     @default(false) @map("is_archived")
  isPinned     Boolean     @default(false) @map("is_pinned")
  isFavorite   Boolean     @default(false) @map("is_favorite")
  messageCount Int         @default(0) @map("message_count")
  lastMessageAt DateTime?  @map("last_message_at")
  metadata     Json        @default("{}")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace Workspace? @relation(fields: [workspaceId], references: [id])
  folder    Folder?    @relation(fields: [folderId], references: [id])
  messages  Message[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([workspaceId])
  @@index([folderId])
  @@map("conversations")
}

model Message {
  id              String      @id @default(uuid())
  conversationId  String      @map("conversation_id")
  parentId        String?     @map("parent_id")
  role            String      @db.VarChar(20) // user, assistant, system, tool
  content         String
  modelId         String?     @map("model_id") @db.VarChar(100)
  provider        AIProvider?
  tokenCountInput Int         @default(0) @map("token_count_input")
  tokenCountOutput Int        @default(0) @map("token_count_output")
  durationMs      Int?        @map("duration_ms")
  isEdited        Boolean     @default(false) @map("is_edited")
  editHistory     Json        @default("[]") @map("edit_history")
  metadata        Json        @default("{}")
  createdAt       DateTime    @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  parent       Message?     @relation("MessageThread", fields: [parentId], references: [id])
  replies      Message[]    @relation("MessageThread")

  @@index([conversationId, createdAt])
  @@index([parentId])
  @@map("messages")
}

model PromptHistory {
  id              String     @id @default(uuid())
  userId          String     @map("user_id")
  studioType      StudioType @map("studio_type")
  promptText      String     @map("prompt_text")
  generatedOutput String?    @map("generated_output")
  modelId         String?    @map("model_id") @db.VarChar(100)
  provider        AIProvider?
  parameters      Json       @default("{}")
  qualityScore    Float?     @map("quality_score")
  isFavorite      Boolean    @default(false) @map("is_favorite")
  tags            String[]   @default([])
  createdAt       DateTime   @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, studioType, createdAt(sort: Desc)])
  @@map("prompt_history")
}

model ImageGeneration {
  id             String      @id @default(uuid())
  userId         String      @map("user_id")
  prompt         String
  negativePrompt String?     @map("negative_prompt")
  resultUrl      String      @map("result_url")
  thumbnailUrl   String?     @map("thumbnail_url")
  s3Key          String?     @map("s3_key") @db.VarChar(512)
  sizeBytes      BigInt      @default(0) @map("size_bytes")
  width          Int?
  height         Int?
  aspectRatio    String      @default("1:1") @map("aspect_ratio") @db.VarChar(10)
  modelId        String?     @map("model_id") @db.VarChar(100)
  provider       AIProvider?
  seed           BigInt?
  steps          Int?
  cfgScale       Float?      @map("cfg_scale")
  parentImageId  String?     @map("parent_image_id")
  status         ImageStatus @default(completed)
  isPublic       Boolean     @default(false) @map("is_public")
  isNsfw         Boolean     @default(false) @map("is_nsfw")
  nsfwScore      Float?      @map("nsfw_score")
  likesCount     Int         @default(0) @map("likes_count")
  metadata       Json        @default("{}")
  createdAt      DateTime    @default(now()) @map("created_at")

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentImage ImageGeneration? @relation("ImageVariation", fields: [parentImageId], references: [id])
  variations  ImageGeneration[] @relation("ImageVariation")

  @@index([userId, createdAt(sort: Desc)])
  @@map("image_generations")
}

model DnaVault {
  id          String      @id @default(uuid())
  userId      String      @map("user_id")
  name        String      @db.VarChar(255)
  description String?
  dnaJson     Json        @map("dna_json")
  studioType  StudioType? @map("studio_type")
  version     Int         @default(1)
  isDefault   Boolean     @default(false) @map("is_default")
  isShared    Boolean     @default(false) @map("is_shared")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@index([userId, createdAt(sort: Desc)])
  @@map("dna_vault")
}

model PromptTemplate {
  id           String     @id @default(uuid())
  userId       String?    @map("user_id")
  name         String     @db.VarChar(255)
  description  String?
  templateText String     @map("template_text")
  studioType   StudioType @map("studio_type")
  variables    Json       @default("[]")
  category     String?    @db.VarChar(100)
  isSystem     Boolean    @default(false) @map("is_system")
  isPublic     Boolean    @default(false) @map("is_public")
  usageCount   Int        @default(0) @map("usage_count")
  ratingAvg    Float      @default(0) @map("rating_avg")
  ratingCount  Int        @default(0) @map("rating_count")
  tags         String[]   @default([])
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("prompt_templates")
}
```

- [ ] AI modellerini schema.prisma'ya ekle
- [ ] `bunx prisma format` ile dogrula

### 3.5 Prisma Schema — Billing Modelleri

```prisma
model Wallet {
  userId          String   @id @map("user_id")
  credits         Decimal  @default(0) @db.Decimal(15, 4)
  lifetimeCredits Decimal  @default(0) @map("lifetime_credits") @db.Decimal(15, 4)
  currency        String   @default("USD") @db.VarChar(3)
  updatedAt       DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("wallets")
}

model LedgerEntry {
  id            String     @id @default(uuid())
  userId        String     @map("user_id")
  type          LedgerType
  amount        Decimal    @db.Decimal(15, 4)
  balanceAfter  Decimal    @map("balance_after") @db.Decimal(15, 4)
  description   String?
  referenceId   String?    @map("reference_id") @db.VarChar(255)
  referenceType String?    @map("reference_type") @db.VarChar(50)
  metadata      Json       @default("{}")
  createdAt     DateTime   @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([referenceId, referenceType])
  @@map("ledger_entries")
}

model StripeEvent {
  id           String        @id @db.VarChar(255)
  eventType    String        @map("event_type") @db.VarChar(100)
  userId       String?       @map("user_id")
  data         Json
  status       PaymentStatus @default(pending)
  processedAt  DateTime?     @map("processed_at")
  errorMessage String?       @map("error_message")
  retryCount   Int           @default(0) @map("retry_count")
  createdAt    DateTime      @default(now()) @map("created_at")

  @@index([eventType, createdAt(sort: Desc)])
  @@map("stripe_events")
}

model IapTransaction {
  id                    String        @id @default(uuid())
  userId                String        @map("user_id")
  platform              IAPPlatform
  transactionId         String        @map("transaction_id") @db.VarChar(255)
  originalTransactionId String        @map("original_transaction_id") @db.VarChar(255)
  productId             String        @map("product_id") @db.VarChar(255)
  amount                Decimal?      @db.Decimal(15, 4)
  currency              String?       @db.VarChar(3)
  status                PaymentStatus @default(pending)
  receiptData           String?       @map("receipt_data")
  purchasedAt           DateTime      @default(now()) @map("purchased_at")
  expiresAt             DateTime?     @map("expires_at")
  createdAt             DateTime      @default(now()) @map("created_at")

  @@unique([platform, transactionId])
  @@index([userId, purchasedAt(sort: Desc)])
  @@map("iap_transactions")
}

model Receipt {
  id            String        @id @default(uuid())
  userId        String        @map("user_id")
  orderId       String        @unique @map("order_id") @db.VarChar(255)
  amount        Decimal       @db.Decimal(15, 4)
  currency      String        @default("USD") @db.VarChar(3)
  taxAmount     Decimal       @default(0) @map("tax_amount") @db.Decimal(15, 4)
  status        PaymentStatus
  pdfUrl        String?       @map("pdf_url")
  s3Key         String?       @map("s3_key") @db.VarChar(512)
  invoiceNumber String?       @unique @map("invoice_number") @db.VarChar(50)
  billingAddress Json?        @map("billing_address")
  createdAt     DateTime      @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("receipts")
}

model RecurringAllowance {
  userId        String   @id @map("user_id")
  amount        Decimal  @db.Decimal(15, 4)
  intervalDays  Int      @default(30) @map("interval_days")
  lastGrantedAt DateTime @default(now()) @map("last_granted_at")
  nextGrantAt   DateTime? @map("next_grant_at")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("recurring_allowances")
}

model PromoCode {
  id              String    @id @default(uuid())
  code            String    @unique @db.VarChar(50)
  discountPercent Int?      @map("discount_percent")
  discountAmount  Decimal?  @map("discount_amount") @db.Decimal(15, 4)
  maxUses         Int?      @map("max_uses")
  currentUses     Int       @default(0) @map("current_uses")
  minPurchase     Decimal   @default(0) @map("min_purchase") @db.Decimal(15, 4)
  validFrom       DateTime  @default(now()) @map("valid_from")
  validUntil      DateTime? @map("valid_until")
  isActive        Boolean   @default(true) @map("is_active")
  createdBy       String?   @map("created_by")
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now()) @map("created_at")

  usages PromoCodeUsage[]

  @@map("promo_codes")
}

model PromoCodeUsage {
  id          String   @id @default(uuid())
  promoCodeId String   @map("promo_code_id")
  userId      String   @map("user_id")
  orderId     String?  @map("order_id") @db.VarChar(255)
  usedAt      DateTime @default(now()) @map("used_at")

  promoCode PromoCode @relation(fields: [promoCodeId], references: [id])

  @@unique([promoCodeId, userId])
  @@map("promo_code_usages")
}
```

- [ ] Billing modellerini schema.prisma'ya ekle

### 3.6 Prisma Schema — Workspace Modelleri

```prisma
model Workspace {
  id          String   @id @default(uuid())
  name        String   @db.VarChar(255)
  slug        String?  @unique @db.VarChar(255)
  ownerId     String   @map("owner_id")
  description String?
  avatarUrl   String?  @map("avatar_url") @db.VarChar(1024)
  settings    Json     @default("{}")
  maxMembers  Int      @default(10) @map("max_members")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  owner         User              @relation("WorkspaceOwner", fields: [ownerId], references: [id])
  members       WorkspaceMember[]
  invitations   WorkspaceInvitation[]
  conversations Conversation[]
  folders       Folder[]

  @@index([ownerId])
  @@map("workspaces")
}

model WorkspaceMember {
  workspaceId String     @map("workspace_id")
  userId      String     @map("user_id")
  role        MemberRole @default(member)
  permissions Json       @default("{}")
  invitedBy   String?    @map("invited_by")
  joinedAt    DateTime   @default(now()) @map("joined_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([workspaceId, userId])
  @@index([userId])
  @@map("workspace_members")
}

model WorkspaceInvitation {
  id          String     @id @default(uuid())
  workspaceId String     @map("workspace_id")
  email       String     @db.VarChar(255)
  role        MemberRole @default(member)
  invitedBy   String     @map("invited_by")
  tokenHash   String     @unique @map("token_hash")
  status      String     @default("pending") @db.VarChar(20) // pending, accepted, declined, expired
  expiresAt   DateTime   @map("expires_at")
  createdAt   DateTime   @default(now()) @map("created_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@map("workspace_invitations")
}

model Folder {
  id          String   @id @default(uuid())
  workspaceId String?  @map("workspace_id")
  userId      String   @map("user_id")
  name        String   @db.VarChar(255)
  parentId    String?  @map("parent_id")
  sortOrder   Int      @default(0) @map("sort_order")
  color       String?  @db.VarChar(7)
  icon        String?  @db.VarChar(50)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  workspace     Workspace?     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent        Folder?        @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children      Folder[]       @relation("FolderHierarchy")
  conversations Conversation[]

  @@index([userId])
  @@index([parentId])
  @@map("folders")
}
```

- [ ] Workspace modellerini schema.prisma'ya ekle

### 3.7 Prisma Schema — Audit & Analytics Modelleri

```prisma
model AuditLog {
  id           String   @id @default(uuid())
  userId       String?  @map("user_id")
  action       String   @db.VarChar(100)
  resourceType String?  @map("resource_type") @db.VarChar(50)
  resourceId   String?  @map("resource_id") @db.VarChar(255)
  oldValues    Json?    @map("old_values")
  newValues    Json?    @map("new_values")
  ipAddress    String?  @map("ip_address") @db.VarChar(45)
  userAgent    String?  @map("user_agent")
  sessionId    String?  @map("session_id")
  level        LogLevel @default(info)
  metadata     Json     @default("{}")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt(sort: Desc)])
  @@index([action, createdAt(sort: Desc)])
  @@index([resourceType, resourceId])
  @@map("audit_logs")
}

model SecurityEvent {
  id          String   @id @default(uuid())
  eventType   String   @map("event_type") @db.VarChar(50)
  severity    LogLevel @default(warn)
  userId      String?  @map("user_id")
  ipAddress   String   @map("ip_address") @db.VarChar(45)
  userAgent   String?  @map("user_agent")
  details     Json     @default("{}")
  isResolved  Boolean  @default(false) @map("is_resolved")
  resolvedBy  String?  @map("resolved_by")
  resolvedAt  DateTime? @map("resolved_at")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([ipAddress, createdAt(sort: Desc)])
  @@index([eventType, createdAt(sort: Desc)])
  @@map("security_events")
}

model AppLog {
  id        String   @id @default(uuid())
  level     LogLevel
  action    String   @db.VarChar(255)
  message   String?
  context   Json     @default("{}")
  source    String?  @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at")

  @@index([level, createdAt(sort: Desc)])
  @@map("app_logs")
}

model SecurePayload {
  key              String   @id @db.VarChar(255)
  payload          Bytes
  encryptionMethod String   @default("aes-256-gcm") @map("encryption_method") @db.VarChar(50)
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("secure_payloads")
}

model FileUpload {
  id               String   @id @default(uuid())
  userId           String   @map("user_id")
  filename         String   @db.VarChar(255)
  originalFilename String   @map("original_filename") @db.VarChar(255)
  mimeType         String   @map("mime_type") @db.VarChar(100)
  sizeBytes        BigInt   @map("size_bytes")
  s3Bucket         String?  @map("s3_bucket") @db.VarChar(100)
  s3Key            String   @map("s3_key") @db.VarChar(512)
  cdnUrl           String?  @map("cdn_url")
  checksumSha256   String?  @map("checksum_sha256") @db.VarChar(64)
  isPublic         Boolean  @default(false) @map("is_public")
  metadata         Json     @default("{}")
  createdAt        DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([s3Key])
  @@map("file_uploads")
}

model TokenUsage {
  id             String     @id @default(uuid())
  userId         String     @map("user_id")
  modelId        String     @map("model_id") @db.VarChar(100)
  provider       AIProvider
  studioType     StudioType? @map("studio_type")
  inputTokens    Int        @default(0) @map("input_tokens")
  outputTokens   Int        @default(0) @map("output_tokens")
  costUsd        Decimal    @default(0) @map("cost_usd") @db.Decimal(10, 6)
  conversationId String?    @map("conversation_id")
  promptId       String?    @map("prompt_id")
  latencyMs      Int?       @map("latency_ms")
  isCached       Boolean    @default(false) @map("is_cached")
  createdAt      DateTime   @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([modelId, createdAt(sort: Desc)])
  @@map("token_usage")
}

model Referral {
  id            String   @id @default(uuid())
  referrerId    String   @map("referrer_id")
  referredId    String   @map("referred_id")
  referralCode  String   @map("referral_code") @db.VarChar(20)
  rewardCredits Decimal  @default(0) @map("reward_credits") @db.Decimal(15, 4)
  status        String   @default("pending") @db.VarChar(20) // pending, completed, expired, rejected
  completedAt   DateTime? @map("completed_at")
  createdAt     DateTime @default(now()) @map("created_at")

  referrer User @relation("Referrer", fields: [referrerId], references: [id])
  referred User @relation("Referred", fields: [referredId], references: [id])

  @@unique([referrerId, referredId])
  @@index([referralCode])
  @@map("referrals")
}
```

- [ ] Audit & Analytics modellerini schema.prisma'ya ekle
- [ ] `bunx prisma format` ile tum schema'yi dogrula
- [ ] `bunx prisma validate` ile dogrula
- [ ] `bunx prisma generate` ile client olustur

### 3.8 Eksik Prisma Modelleri (Mevcut SQLite'ta var ama Prisma schema'da yok)

> **Kaynak:** `src-tauri/migrations/20260424000000_init.sql` — 21 tablo

#### 3.8.1 pricing_matrix Tablosu (Mevcut seed.sql'de var)
```prisma
model PricingMatrix {
  modelId      String  @id @map("model_id") @db.VarChar(100)
  provider     AIProvider?
  basePrice1m  Decimal @map("base_price_1m") @db.Decimal(15, 6)
  outputPrice1m Decimal? @map("output_price_1m") @db.Decimal(15, 6)
  isActive     Boolean @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("pricing_matrix")
}
```
- [ ] PricingMatrix modeli ekle (ModelRegistry'nin DB karsiligi)

#### 3.8.2 Feedback Tablosu (Mevcut FeedbackModal + submit_feedback komutu)

> **Kaynak:** `src/components/FeedbackModal.tsx` — tip: bug/feature/other, mesaj, debug_context
> **Kaynak:** `src-tauri/src/ipc/commands/auth.rs` — `submit_feedback` IPC komutu

```prisma
enum FeedbackType {
  bug
  feature
  other
}

enum FeedbackStatus {
  pending
  reviewing
  resolved
  dismissed
  archived
}

model Feedback {
  id            String         @id @default(uuid())
  userId        String?        @map("user_id")
  type          FeedbackType   @default(other)
  message       String         @db.VarChar(5000) // SADECE TEXT — dosya/PDF/resim KABUL EDILMEZ
  status        FeedbackStatus @default(pending)
  debugContext  Json           @default("{}") @map("debug_context") // studio, promptType, viewport vs.
  ipAddress     String?        @map("ip_address") @db.VarChar(45)
  userAgent     String?        @map("user_agent")
  adminNote     String?        @map("admin_note") @db.VarChar(2000)
  resolvedBy    String?        @map("resolved_by")
  resolvedAt    DateTime?      @map("resolved_at")
  createdAt     DateTime       @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt(sort: Desc)])
  @@index([type, status])
  @@map("feedbacks")
}
```

- [ ] Feedback modeli Prisma schema'ya ekle
- [ ] User modeline `feedbacks Feedback[]` relation ekle
- [ ] `bunx prisma migrate dev --name add_feedback`
- [ ] **KURAL:** `message` alani SADECE duz metin kabul eder — dosya, PDF, resim, link eklenemez
- [ ] Admin panelinde feedback listesi ve yonetimi

#### 3.8.3 logs Tablosu (Mevcut migration'da var)
```prisma
// NOT: Bu tablo AppLog'dan farkli — mevcut SQLite logs tablosu
// Mevcut yapi: id INTEGER AUTOINCREMENT, action TEXT, level TEXT, timestamp DATETIME
// Prisma'da AppLog modeli olarak zaten tanimlandi (3.7)
```
- [ ] Mevcut `logs` tablosu ile yeni `app_logs` Prisma modeli eslesmeli

#### 3.8.4 conversations_fts (FTS5 Virtual Table)
```sql
-- SQLite FTS5 virtual table — PostgreSQL'de kullanilmayacak
-- Yerine: tsvector + GIN index kullanilacak
-- Prisma schema'da conversation.searchVector alani ile
```
- [ ] SQLite FTS5 -> PostgreSQL tsvector gecisi icin migration notu

### 3.9 Mevcut SQLite <-> Prisma Tablo Eslestirme Tablosu

| SQLite Tablosu | Prisma Modeli | Durum |
|----------------|---------------|-------|
| `users` | `User` | Alanlar genisletildi (2FA, TOTP, metadata ekle) |
| `conversations` | `Conversation` | studioType, isPinned, isFavorite eklendi |
| `conversations_fts` | *(tsvector ile degistirildi)* | PostgreSQL native FTS |
| `messages` | `Message` | tokenCount, provider, modelId eklendi |
| `audit_logs` | `AuditLog` | Yeniden yapilandi |
| `workspaces` | `Workspace` | slug, maxMembers eklendi |
| `workspace_members` | `WorkspaceMember` | permissions JSON eklendi |
| `token_usage` | `TokenUsage` | latencyMs, isCached eklendi |
| `image_generations` | `ImageGeneration` | thumbnail, nsfw, likes eklendi |
| `dna_vault` | `DnaVault` | version, isShared eklendi |
| `prompt_history` | `PromptHistory` | tags, qualityScore eklendi |
| `wallets` | `Wallet` | lifetimeCredits, currency eklendi |
| `ledger_entries` | `LedgerEntry` | balanceAfter, referenceId eklendi |
| `sessions` | `Session` | status enum, deviceFingerprint eklendi |
| `refresh_tokens` | `RefreshToken` | revokedReason eklendi |
| `api_keys` | `ApiKey` | keyPrefix, rateLimitPerMin eklendi |
| `iap_transactions` | `IapTransaction` | amount, currency eklendi |
| `receipts` | `Receipt` | taxAmount, invoiceNumber eklendi |
| `recurring_allowances` | `RecurringAllowance` | nextGrantAt, isActive eklendi |
| `folders` | `Folder` | workspaceId, userId, color, icon eklendi |
| `logs` | `AppLog` | source eklendi |
| `secure_payloads` | `SecurePayload` | encryptionMethod eklendi |
| *(yeni)* | `Account` | Google OAuth icin |
| *(yeni)* | `Notification` | Bildirim sistemi |
| *(yeni)* | `StripeEvent` | Webhook event kaydi |
| *(yeni)* | `PromoCode` | Promosyon kodlari |
| *(yeni)* | `PromoCodeUsage` | Kod kullanim kaydi |
| *(yeni)* | `WorkspaceInvitation` | Davet sistemi |
| *(yeni)* | `SecurityEvent` | Guvenlik olaylari |
| *(yeni)* | `FileUpload` | Dosya yukleme |
| *(yeni)* | `PromptTemplate` | Prompt sablonlari |
| *(yeni)* | `Referral` | Referans sistemi |
| *(yeni)* | `PricingMatrix` | Model fiyatlandirmasi |
| *(yeni)* | `Feedback` | Geri bildirim sistemi (sadece metin) |
| *(yeni)* | `ImageLike` | Gorsel begeni sistemi |
| *(yeni)* | `ImageReport` | Icerik bildirimi/moderasyon |

### 3.10 Migration Olusturma ve Calistirma
- [ ] `bunx prisma migrate dev --name init` ile ilk migration olustur
- [ ] Migration dosyasini incele (`prisma/migrations/`)
- [ ] `bunx prisma migrate deploy` ile migration uygula
- [ ] `bunx prisma studio` ile tabloları kontrol et (port 5555)
- [ ] Migration rollback proseduru belgele
- [ ] Mevcut `src-tauri/migrations/20260424000000_init.sql` dosyasi referans olarak saklanmali

---

## BOLUM 4: GOOGLE OAUTH ENTEGRASYONU

### 4.1 Google Cloud Console Ayarlari
- [ ] Google Cloud Console'da proje olustur: "Promtx"
- [ ] OAuth 2.0 Client ID olustur (Web Application)
- [ ] Authorized JavaScript origins ekle:
  - [ ] `http://localhost:1420` (Vite dev)
  - [ ] `http://localhost:4173` (Vite preview)
  - [ ] `https://promtx.ai` (production)
  - [ ] `https://www.promtx.ai`
  - [ ] `https://promtx.vercel.app` (Vercel preview)
- [ ] Authorized redirect URIs ekle:
  - [ ] `http://localhost:1420/auth/google/callback`
  - [ ] `http://localhost:3001/api/auth/google/callback` (API server)
  - [ ] `https://promtx.ai/auth/google/callback`
  - [ ] `https://promtx.vercel.app/auth/google/callback`
- [ ] OAuth consent screen yapilandir:
  - [ ] App name: "Promtx"
  - [ ] User support email: support@promtx.ai
  - [ ] Scopes: `email`, `profile`, `openid`
  - [ ] Logo yukle
- [ ] Client ID ve Client Secret'i `.env.docker`'a ekle

### 4.2 Backend Google OAuth Implementasyonu

> **Mevcut sistem:** `src-tauri/src/ipc/commands/auth.rs` — `google_login()` komutu
> - Mevcut flow: Frontend Google access token aliyor, backend'e gonderiyor
> - Backend Google API'ye access token ile istek atiyor, kullanici bilgisi aliyor
> - Yoksa otomatik kayit (role: Free), varsa login
> - JWT token donduruyor
> **Gelistirilecek:** Account tablosu ile multi-provider auth destegi

- [ ] Mevcut `google_login()` komutunu Account tablosu ile entegre et
- [ ] Google OAuth flow endpoint'leri olustur (web deploy icin):
  - [ ] `GET /api/auth/google` — Google'a yonlendir (authorization code flow)
  - [ ] `GET /api/auth/google/callback` — Callback isle
- [ ] Authorization code'u access token'a cevir
- [ ] Google'dan kullanici bilgilerini al (`userinfo` endpoint)
- [ ] Kullanici varsa -> login, yoksa -> register (upsert) — `role: 'free'` default
- [ ] Account tablosuna Google hesap bilgilerini kaydet (`provider: 'google'`)
- [ ] JWT token olustur ve don (mevcut `AuthEngine` kullan)
- [ ] Session olustur (mevcut session tablosu kullan)
- [ ] Frontend'e redirect et (token ile)
- [ ] **Tauri (desktop) icin:** Mevcut `google_login()` IPC komutu korunacak
- [ ] **Web (Vercel) icin:** API route olarak yeni endpoint'ler

### 4.3 Frontend Google Login Butonu
- [ ] Google Sign-In butonu bilesenini olustur/guncelle
- [ ] `@react-oauth/google` paketi: `bun add @react-oauth/google`
- [ ] GoogleOAuthProvider wrapper ekle
- [ ] Login sayfasinda "Google ile Giris Yap" butonu
- [ ] Register sayfasinda "Google ile Kayit Ol" butonu
- [ ] OAuth callback sayfasi: `/auth/google/callback`
- [ ] Token alma ve store'a kaydetme
- [ ] Hata durumlarini handle et (iptal, hata, timeout)

### 4.4 Google OAuth Guvenlik
- [ ] CSRF korumasi: state parametresi kullan
- [ ] Nonce kullan (replay attack onleme)
- [ ] Token dogrulama: Google public key ile ID token dogrula
- [ ] Email dogrulanmis mi kontrol et (`email_verified` claim)
- [ ] Rate limiting: `/api/auth/google` endpoint'ine uygula
- [ ] Suspicious login detection: yeni cihaz/IP bildirim gonder

---

## BOLUM 5: SEED DATA (PROMTX'E OZEL)

### 5.1 Seed Script Altyapisi
- [ ] `prisma/seed.ts` dosyasi olustur (TypeScript, bun ile calisacak)
- [ ] `package.json`'a seed ayari ekle:
  ```json
  "prisma": { "seed": "bun prisma/seed.ts" }
  ```
- [ ] Seed script icinde Prisma Client kullan
- [ ] Idempotent seed: tekrar calisinca hata vermemeli (`upsert` kullan)
- [ ] `bunx prisma db seed` ile calistir

### 5.2 Admin Kullanici Seed

> **Mevcut seed referansi:** `src-tauri/tests/fixtures/seed.sql`
> - Mevcut admin: `id='system-admin-001'`, `email='admin@promtx.os'`, `role='admin'`
> - Mevcut workspace: `id='global-workspace-001'`, `name='Promtx Global'`
> - Mevcut pricing: `gemini-1.5-pro` ve `gpt-4o` ($0.00 test icin)

```typescript
// prisma/seed.ts
const adminUser = await prisma.user.upsert({
  where: { email: 'admin@promtx.os' },
  update: {},
  create: {
    id: 'system-admin-001', // Mevcut seed ile uyumlu
    email: 'admin@promtx.os',
    displayName: 'Promtx Admin',
    passwordHash: await hashPassword('admin123'), // Mevcut seed sifresi
    role: 'admin',
    isEmailVerified: true,
    locale: 'tr',
    timezone: 'Europe/Istanbul',
    wallet: {
      create: {
        credits: 10000,
        lifetimeCredits: 10000,
        currency: 'USD',
      },
    },
  },
});

// SuperAdmin kullanici (tam yetki)
const superAdmin = await prisma.user.upsert({
  where: { email: 'superadmin@promtx.os' },
  update: {},
  create: {
    email: 'superadmin@promtx.os',
    displayName: 'Promtx SuperAdmin',
    passwordHash: await hashPassword('ChangeMe!2026'),
    role: 'super_admin',
    isEmailVerified: true,
    locale: 'tr',
    timezone: 'Europe/Istanbul',
    wallet: { create: { credits: 99999, lifetimeCredits: 99999 } },
  },
});
```
- [ ] Admin kullanici seed'i yaz (`admin@promtx.os` — mevcut seed ile uyumlu)
- [ ] SuperAdmin kullanici seed'i yaz (`superadmin@promtx.os`)
- [ ] Admin icin wallet olustur (10000 kredi)
- [ ] Admin icin default workspace olustur: `id='global-workspace-001'`, `name='Promtx Global'` (mevcut seed ile uyumlu)
- [ ] SuperAdmin icin ayri workspace: "Promtx Operations"

### 5.3 Test Kullanicilari Seed

```typescript
const testUsers = [
  {
    email: 'free@promtx.os',
    displayName: 'Free Tier User',
    role: 'free' as UserRole,
    credits: 100,   // Free plan baslangic
  },
  {
    email: 'pro@promtx.os',
    displayName: 'Pro Creator',
    role: 'pro' as UserRole,
    credits: 2000,  // Pro plan
  },
  {
    email: 'enterprise@promtx.os',
    displayName: 'Enterprise Studio',
    role: 'enterprise' as UserRole,
    credits: 10000, // Enterprise plan
  },
  {
    email: 'designer@promtx.os',
    displayName: 'Fashion Designer',
    role: 'pro' as UserRole,
    credits: 1500,
  },
  {
    email: 'filmmaker@promtx.os',
    displayName: 'Indie Filmmaker',
    role: 'pro' as UserRole,
    credits: 3000,
  },
];
```
- [ ] 5 test kullanici seed'i yaz
- [ ] Her biri icin wallet olustur
- [ ] Her biri icin "Personal" workspace olustur

### 5.4 Prompt Template Seed'leri (Stüdyo Bazli)

#### 5.4.1 Image Studio Template'leri
```typescript
const imageTemplates = [
  {
    name: 'Cinematic Portrait',
    description: 'Film kalitesinde portre fotografi prompt sablonu',
    templateText: 'A cinematic portrait of {{subject}}, {{lighting}} lighting, {{mood}} mood, shot on {{camera}}, {{style}} style, 8k resolution, detailed skin texture',
    studioType: 'image',
    category: 'portrait',
    variables: [
      { name: 'subject', type: 'text', placeholder: 'a young woman with red hair' },
      { name: 'lighting', type: 'select', options: ['golden hour', 'studio', 'neon', 'natural'] },
      { name: 'mood', type: 'select', options: ['dramatic', 'ethereal', 'dark', 'warm'] },
      { name: 'camera', type: 'select', options: ['Sony A7III', 'Canon R5', 'Hasselblad'] },
      { name: 'style', type: 'select', options: ['photorealistic', 'artistic', 'fantasy'] },
    ],
    isSystem: true,
    isPublic: true,
    tags: ['portrait', 'cinematic', 'photography'],
  },
  {
    name: 'Fantasy Landscape',
    description: 'Fantastik manzara prompt sablonu',
    templateText: 'A breathtaking fantasy landscape of {{scene}}, {{time_of_day}}, {{weather}}, epic composition, volumetric lighting, matte painting style, 4k wallpaper quality',
    studioType: 'image',
    category: 'landscape',
    isSystem: true,
    isPublic: true,
    tags: ['landscape', 'fantasy', 'environment'],
  },
  {
    name: 'Product Photography',
    description: 'Urun fotografi prompt sablonu',
    templateText: '{{product}} product photography, {{background}} background, professional studio lighting, commercial quality, high-end advertising style, sharp focus, {{angle}} angle',
    studioType: 'image',
    category: 'product',
    isSystem: true,
    isPublic: true,
    tags: ['product', 'commercial', 'studio'],
  },
  {
    name: 'Anime Character',
    description: 'Anime karakter prompt sablonu',
    templateText: 'Anime style character, {{character_desc}}, {{art_style}} art style, {{background}}, vibrant colors, detailed eyes, by {{artist_reference}}',
    studioType: 'image',
    category: 'anime',
    isSystem: true,
    isPublic: true,
    tags: ['anime', 'character', 'illustration'],
  },
  {
    name: 'Architecture Visualization',
    description: 'Mimari gorselestirme prompt sablonu',
    templateText: 'Architectural visualization of {{building_type}}, {{style}} style, {{material}} facade, {{time}} lighting, photorealistic render, unreal engine quality',
    studioType: 'image',
    category: 'architecture',
    isSystem: true,
    isPublic: true,
    tags: ['architecture', 'render', '3d'],
  },
];
```

#### 5.4.2 Video Studio Template'leri
```typescript
const videoTemplates = [
  {
    name: 'Cinematic Scene',
    templateText: 'Cinematic scene: {{scene_description}}, camera {{camera_movement}}, {{mood}} atmosphere, film grain, anamorphic lens',
    studioType: 'video',
    isSystem: true,
    tags: ['cinematic', 'scene', 'film'],
  },
  {
    name: 'Social Media Clip',
    templateText: 'Trendy social media video: {{content}}, vertical format 9:16, vibrant colors, fast-paced editing, {{platform}} style',
    studioType: 'video',
    isSystem: true,
    tags: ['social', 'short-form', 'trendy'],
  },
  // ... 3 template daha
];
```

#### 5.4.3 Audio Studio Template'leri
```typescript
const audioTemplates = [
  {
    name: 'Podcast Intro',
    templateText: 'Create a {{duration}} second podcast intro: {{style}} music, {{mood}} tone, professional quality, with a subtle sound effect at the end',
    studioType: 'audio',
    isSystem: true,
    tags: ['podcast', 'intro', 'music'],
  },
  // ... 4 template daha
];
```

#### 5.4.4 Cinema Studio Template'leri
- [ ] 5 cinema template seed'i yaz (script yazimi, sahne yonetimi vb.)

#### 5.4.5 Character/Persona Studio Template'leri
- [ ] 5 karakter template seed'i yaz (OC, NPC, avatar vb.)

#### 5.4.6 Fashion Studio Template'leri
- [ ] 5 moda template seed'i yaz (outfit, lookbook, runway vb.)

#### 5.4.7 Marketing Studio Template'leri
- [ ] 5 pazarlama template seed'i yaz (reklam, sosyal medya, banner vb.)

#### 5.4.8 Edit Studio Template'leri
- [ ] 5 duzenleme template seed'i yaz (renk duzeltme, stil transferi vb.)

- [ ] Toplam en az 40 sistem template'i seed et
- [ ] Her template icin `isSystem: true`, `isPublic: true`
- [ ] Her template icin uygun `tags` ve `category`
- [ ] Her template icin `variables` JSON yapisini tanimla

### 5.4.9 Pricing Matrix / Model Registry Seed'leri

> **Kaynak:** `src-tauri/src/modules/llm/registry.rs` — gercek fiyatlar

```typescript
// Mevcut ModelRegistry'den (registry.rs:32-40)
const modelPricing = [
  // Text Models
  { modelId: 'gpt-4o',            provider: 'openai',    inputCost1m: 5.0,      outputCost1m: 15.0,     isActive: true },
  { modelId: 'gpt-3.5-turbo',     provider: 'openai',    inputCost1m: 0.5,      outputCost1m: 1.5,      isActive: true },
  { modelId: 'gemini-1.5-flash',  provider: 'google',    inputCost1m: 0.075,    outputCost1m: 0.3,      isActive: true },
  { modelId: 'gemini-1.5-pro',    provider: 'google',    inputCost1m: 3.5,      outputCost1m: 10.5,     isActive: true },
  { modelId: 'gemini-2.0-flash',  provider: 'google',    inputCost1m: 0.1,      outputCost1m: 0.4,      isActive: true },
  { modelId: 'deepseek-chat',     provider: 'local',     inputCost1m: 0.1,      outputCost1m: 0.2,      isActive: true },
  { modelId: 'grok-1',            provider: 'local',     inputCost1m: 0.5,      outputCost1m: 1.5,      isActive: true },
  // Visual Models
  { modelId: 'dall-e-3',          provider: 'openai',    inputCost1m: 40000.0,  outputCost1m: 80000.0,  isActive: true },
];

// Legacy model remapping (registry.rs:20-29)
const legacyMappings = [
  { oldId: 'text-davinci-003',  newId: 'gpt-3.5-turbo'    },
  { oldId: 'gpt-4',             newId: 'gpt-4o'           },
  { oldId: 'gpt-4-turbo',       newId: 'gpt-4o'           },
  { oldId: 'gemini-pro',        newId: 'gemini-1.5-pro'   },
  { oldId: 'gemini-ultra',      newId: 'gemini-1.5-pro'   },
  { oldId: 'gemini-3flash',     newId: 'gemini-1.5-flash' },
];
```
- [ ] Pricing matrix tablosu veya Prisma modeli olustur
- [ ] Tum model fiyatlarini seed et (registry.rs ile birebir uyumlu)
- [ ] Legacy model mapping tablosu seed et
- [ ] Test ortaminda fiyat: $0.00 (mevcut seed.sql uyumlu)

### 5.5 Promo Code Seed'leri

```typescript
const promoCodes = [
  {
    code: 'WELCOME2026',
    discountPercent: 20,
    maxUses: 1000,
    validUntil: new Date('2026-12-31'),
    isActive: true,
  },
  {
    code: 'PROMTXBETA',
    discountAmount: 5.00,
    maxUses: 500,
    validUntil: new Date('2026-06-30'),
    isActive: true,
  },
  {
    code: 'FREECREDITS50',
    discountAmount: 50.00,
    maxUses: 100,
    validUntil: new Date('2026-12-31'),
    isActive: true,
    metadata: { type: 'credit_bonus', note: 'Beta tester reward' },
  },
  {
    code: 'INFLUENCER100',
    discountPercent: 100,
    maxUses: 10,
    validUntil: new Date('2026-12-31'),
    isActive: true,
    metadata: { type: 'influencer', note: 'Influencer partnership' },
  },
  {
    code: 'STARTUP2026',
    discountPercent: 50,
    maxUses: 200,
    validUntil: new Date('2026-09-30'),
    isActive: true,
  },
];
```
- [ ] 5 promo code seed'i yaz

### 5.6 Ornek Conversation ve Message Seed'leri

> **Mevcut seed.sql uyumluluk:** `sample-conv-001` conversation ID'si korunmali.
> **PromtxRole enum (schema.rs:6):** System, User, Assistant

```typescript
// Mevcut seed.sql'deki konusma (KORUNMALI)
const existingConversation = {
  id: 'sample-conv-001',
  title: 'System Integration Test',
  workspaceId: 'global-workspace-001',
  messages: [
    { id: 'msg-001', role: 'system', content: 'You are a helpful AI assistant.' },
    { id: 'msg-002', role: 'user', content: 'Run the database verification checklist.' },
  ],
};

// Yeni ornek konusmalar (her studio type icin birer tane)
const sampleConversations = [
  {
    title: 'Cinematic Portrait Session',
    studioType: 'image',
    userId: 'pro@promtx.os', // Pro kullanici
    messages: [
      { role: 'user', content: 'Create a cinematic portrait: young woman, neon-lit Tokyo alley, rain reflections, 85mm lens, f/1.4' },
      { role: 'assistant', content: 'A cinematic portrait photograph of a young woman standing in a neon-lit Tokyo alleyway during rainfall. Shot on 85mm f/1.4 lens, shallow depth of field, rain droplets catching cyan and magenta neon reflections. Wet pavement reflecting light, volumetric mist, film grain texture, Blade Runner inspired color grading, 8K resolution.' },
    ],
  },
  {
    title: 'Product Launch Video Concept',
    studioType: 'video',
    userId: 'enterprise@promtx.os',
    messages: [
      { role: 'user', content: 'Create a 30-second product reveal video concept for a sleek AI device' },
      { role: 'assistant', content: 'Opening shot: extreme close-up of glossy black surface, camera slowly pulls back revealing...' },
    ],
  },
  {
    title: 'Sci-Fi Character Design',
    studioType: 'character',
    userId: 'pro@promtx.os',
    messages: [
      { role: 'user', content: 'Design a cyberpunk bounty hunter character, female, age 25-35, athletic build' },
      { role: 'assistant', content: 'Cyberpunk bounty hunter: athletic female, 28 years old, mixed ethnicity. Neon-violet cybernetic left eye, short asymmetric black hair with holographic streaks. Tactical matte-black bodysuit with orange accents...' },
    ],
  },
  {
    title: 'Summer Collection Lookbook',
    studioType: 'fashion',
    userId: 'designer@promtx.os',
    messages: [
      { role: 'user', content: 'Generate a fashion lookbook concept: minimalist summer streetwear, Mediterranean setting' },
      { role: 'assistant', content: 'Mediterranean Minimalist Summer Collection: Oversized linen shirt in sand beige, high-waisted wide-leg trousers in cream...' },
    ],
  },
  {
    title: 'Short Film Scene',
    studioType: 'cinema',
    userId: 'filmmaker@promtx.os',
    messages: [
      { role: 'user', content: 'Write a scene: detective enters abandoned warehouse, discovers a clue, cinematic noir style' },
      { role: 'assistant', content: 'INT. ABANDONED WAREHOUSE - NIGHT\n\nShafts of moonlight cut through broken skylights. DETECTIVE KARA (40s, weathered) pushes open the rusted door...' },
    ],
  },
];
```
- [ ] 5 ornek konusma + mesajlar seed et (farkli studio type'lar)
- [ ] Her konusmada en az 2 mesaj (user + assistant)

### 5.7 DNA Vault Seed'leri

> **Kaynak:** `src/constants/studio_data.ts` — DNA Vault gercek alan yapisi
> **Kaynak:** `src-tauri/src/modules/llm/visual.rs` — DNA save/load
> DNA Vault alanlar: age, gender, ethnicity, hairColor, hairStyle, eyeColor, bodyType,
> complexion, facialStructure, expression, tattoo, scars, piercing, makeup, nails, teeth,
> facialHair, skinDetails, glasses, personality, aura, archetype, celebrity, visualStyle,
> clothingStyle, fabric, footwear, bottoms, action, aesthetic

```typescript
const sampleDna = [
  {
    name: 'Photorealistic Portrait DNA',
    description: 'Yuksek kaliteli fotorealist portre ayarlari',
    studioType: 'image',
    dnaJson: {
      // Karakter ozellikleri (studio_data.ts field_* alanlari)
      gender: 'female',
      age: '25-35',
      ethnicity: 'Mediterranean',
      hairColor: 'Brown',
      hairStyle: 'Wavy',
      eyeColor: 'Green',
      bodyType: 'Athletic',
      complexion: 'Olive',
      expression: 'Confident',
      // Teknik ayarlar
      style: 'photorealistic',
      quality: 'ultra_high',
      lighting: 'studio',
      camera: { model: 'Canon EOS R5', lens: '85mm f/1.4', iso: 100 },
      negativePrompts: ['cartoon', 'anime', 'illustration', 'low quality'],
    },
    isDefault: true,
  },
  {
    name: 'Cyberpunk Character DNA',
    description: 'Cyberpunk tarz karakter DNA profili',
    studioType: 'character',
    dnaJson: {
      gender: 'female',
      age: '18-25',
      ethnicity: 'East Asian',
      hairColor: 'Neon',
      hairStyle: 'Short',
      eyeColor: 'Blue',
      bodyType: 'Athletic',
      complexion: 'Fair',
      tattoo: 'Circuit patterns on arms',
      piercing: 'Cybernetic ear implants',
      makeup: 'Holographic lip gloss, neon eyeliner',
      visualStyle: 'cyberpunk',
      aesthetic: 'neon-noir',
      personality: 'Rebellious',
      archetype: 'Hacker',
    },
  },
  {
    name: 'High Fashion Model DNA',
    description: 'Moda studiosu icin model profili',
    studioType: 'fashion',
    dnaJson: {
      gender: 'female',
      age: '18-25',
      ethnicity: 'Nordic',
      hairColor: 'Blonde',
      hairStyle: 'Straight',
      eyeColor: 'Blue',
      bodyType: 'Thin',
      complexion: 'Porcelain',
      expression: 'Stoic',
      clothingStyle: 'Avant-garde',
      fabric: 'Silk, Leather',
      footwear: 'Stiletto heels',
      nails: 'Minimalist French tips',
      makeup: 'Editorial bold lips',
    },
  },
  {
    name: 'Anime Art DNA',
    description: 'Anime tarz cizim ayarlari',
    studioType: 'image',
    dnaJson: {
      style: 'anime',
      quality: 'high',
      lineWeight: 'medium',
      colorPalette: 'vibrant',
      influence: ['Studio Ghibli', 'Makoto Shinkai'],
      eyeColor: 'Violet',
      hairColor: 'Pink',
      hairStyle: 'Long',
    },
  },
  {
    name: 'Cinematic Video DNA',
    description: 'Film kalitesinde video ayarlari',
    studioType: 'cinema',
    dnaJson: {
      aspectRatio: '2.39:1',
      colorGrading: 'teal_orange',
      frameRate: 24,
      grain: 'subtle',
      lens: 'anamorphic',
    },
  },
];
```
- [ ] 5 ornek DNA vault seed'i yaz

### 5.8 Notification Seed'leri

```typescript
const sampleNotifications = [
  {
    type: 'system',
    title: 'Promtx\'e Hosgeldiniz!',
    body: 'AI destekli prompt muhendisligi platformuna hosgeldiniz. Baslamak icin bir studio secin.',
    data: { action: 'navigate', target: '/studio' },
  },
  {
    type: 'billing',
    title: 'Hosgeldin Kredisi',
    body: 'Hesabiniza 500 kredi hosgeldin bonusu eklendi.',
    data: { credits: 500 },
  },
  {
    type: 'generation',
    title: 'Ilk Gorseli Olusturun',
    body: 'Image Studio ile ilk AI gorselinizi olusturmaya hazir misiniz?',
    data: { action: 'navigate', target: '/studio/image' },
  },
];
```
- [ ] Her test kullaniciya 3 bildirim seed et

### 5.9 Referral Seed'leri
- [ ] Test kullanicilar arasi 2-3 referral kaydı olustur
- [ ] Farkli status'lerde: pending, completed

### 5.10 Token Usage Seed'leri (Analytics)

> **Kaynak:** `src-tauri/src/modules/llm/registry.rs` — gercek model listesi
> **Kaynak:** `src-tauri/src/ipc/commands/llm.rs:196` — provider tespiti: `gemini` -> google, diger -> openai

```typescript
// Son 30 gun icin rastgele token usage kayitlari
// GERCEK model ID'leri kullan (registry.rs'den)
const realModels = [
  { modelId: 'gemini-1.5-flash', provider: 'google' },
  { modelId: 'gemini-1.5-pro',   provider: 'google' },
  { modelId: 'gpt-4o',           provider: 'openai' },
  { modelId: 'gpt-3.5-turbo',    provider: 'openai' },
  { modelId: 'deepseek-chat',    provider: 'local' },
  { modelId: 'grok-1',           provider: 'local' },
  { modelId: 'dall-e-3',         provider: 'openai' }, // gorsel model
];

for (let i = 0; i < 100; i++) {
  const model = randomFrom(realModels);
  await prisma.tokenUsage.create({
    data: {
      userId: randomUser.id,
      modelId: model.modelId,
      provider: model.provider,
      studioType: randomFrom(['image', 'video', 'cinema', 'audio', 'character', 'fashion', 'marketing', 'edit']),
      inputTokens: randomInt(100, 5000),
      outputTokens: randomInt(50, 3000),
      costUsd: randomDecimal(0.001, 0.5),
      latencyMs: randomInt(200, 5000),
      createdAt: randomDateInLast30Days(),
    },
  });
}
```
- [ ] 100 token usage kaydı seed et (analytics dashboard icin)
- [ ] Gercek model ID'leri kullan (registry.rs ile birebir uyumlu)
- [ ] 8 studio type'in tumu temsil edilmeli
- [ ] Son 30 gun icine yayilmis tarihler

### 5.10.1 IAP Product ID Seed'leri

> **Kaynak:** Billing modul — `com.promtx.pro.monthly`, `com.promtx.pro.yearly`, `com.promtx.ent.monthly`

```typescript
const iapProducts = [
  { productId: 'com.promtx.pro.monthly',   platform: 'stripe', amount: 9.99,  currency: 'USD' },
  { productId: 'com.promtx.pro.yearly',    platform: 'stripe', amount: 99.99, currency: 'USD' },
  { productId: 'com.promtx.ent.monthly',   platform: 'stripe', amount: 49.99, currency: 'USD' },
  { productId: 'com.promtx.credits.100',   platform: 'stripe', amount: 4.99,  currency: 'USD' },
  { productId: 'com.promtx.credits.500',   platform: 'stripe', amount: 19.99, currency: 'USD' },
  { productId: 'com.promtx.credits.1000',  platform: 'stripe', amount: 34.99, currency: 'USD' },
];
```
- [ ] IAP product ID'lerini seed et (Stripe, Apple, Google Play platformlari)

### 5.11 Seed Calistirma
- [ ] `bunx prisma db seed` ile tum seed'leri calistir
- [ ] Seed sonrasi kayit sayilarini dogrula
- [ ] `bunx prisma studio` ile verileri gorsel kontrol et
- [ ] Seed'in idempotent oldugunu dogrula (tekrar calisinca hata vermemeli)

---

## BOLUM 6: POSTGRESQL YAPILANDIRMA

### 6.1 postgresql.conf
- [ ] `docker/postgres/conf/postgresql.conf` olustur
- [ ] Baglanti: `max_connections = 200`, `password_encryption = scram-sha-256`
- [ ] Bellek: `shared_buffers = 512MB`, `effective_cache_size = 1536MB`, `work_mem = 16MB`
- [ ] WAL: `wal_level = replica`, `max_wal_size = 2GB`, `min_wal_size = 512MB`
- [ ] Sorgu: `random_page_cost = 1.1` (SSD), `effective_io_concurrency = 200`
- [ ] Log: `log_min_duration_statement = 500`, `log_connections = on`, `log_timezone = 'Europe/Istanbul'`
- [ ] Autovacuum: `autovacuum = on`, `autovacuum_max_workers = 4`
- [ ] Paralel: `max_parallel_workers = 8`, `max_parallel_workers_per_gather = 4`
- [ ] Locale: `timezone = 'Europe/Istanbul'`

### 6.2 pg_hba.conf
- [ ] `docker/postgres/conf/pg_hba.conf` olustur
- [ ] Dev: `host all all 0.0.0.0/0 scram-sha-256`
- [ ] Prod: sadece Docker network + SSL zorunlu

### 6.3 Extensions
- [ ] `docker/postgres/init/01_extensions.sql` olustur
- [ ] `uuid-ossp`, `pgcrypto`, `pg_trgm`, `pg_stat_statements`
- [ ] (Prisma kendi migration'larini yonetir, ama extension'lar init script'te olmali)

---

## BOLUM 7: VERCEL DEPLOY ENTEGRASYONU

### 7.1 Vercel Proje Ayarlari
- [ ] Vercel'de yeni proje olustur: "promtx"
- [ ] GitHub repo'yu bagla
- [ ] Framework preset: Vite
- [ ] Build command: `bun run build`
- [ ] Output directory: `dist`
- [ ] Install command: `bun install`
- [ ] Node.js version: 20.x (Bun fallback icin)

### 7.2 Vercel Environment Variables
- [ ] `DATABASE_URL` — Production PostgreSQL connection string
- [ ] `REDIS_URL` — Production Redis connection string
- [ ] `GOOGLE_CLIENT_ID` — Google OAuth Client ID
- [ ] `GOOGLE_CLIENT_SECRET` — Google OAuth Client Secret
- [ ] `GOOGLE_REDIRECT_URI` — `https://promtx.vercel.app/auth/google/callback`
- [ ] `JWT_SECRET` — JWT signing secret
- [ ] `NEXTAUTH_SECRET` — Auth secret
- [ ] `STRIPE_SECRET_KEY` — Stripe API key
- [ ] `STRIPE_WEBHOOK_SECRET` — Stripe webhook secret
- [ ] `SENTRY_DSN` — Sentry error tracking
- [ ] `POSTHOG_KEY` — PostHog analytics key
- [ ] `VITE_API_URL` — Backend API URL
- [ ] Environment'lara gore ayir: Production, Preview, Development

### 7.3 Vercel Serverless Functions (API Routes)
- [ ] `api/` dizini olustur (Vercel serverless functions)
- [ ] `api/auth/google.ts` — Google OAuth redirect
- [ ] `api/auth/google/callback.ts` — Google OAuth callback
- [ ] `api/auth/login.ts` — Email/password login
- [ ] `api/auth/register.ts` — Email/password register
- [ ] `api/auth/refresh.ts` — Token refresh
- [ ] `api/health.ts` — Health check endpoint
- [ ] Her function icinde Prisma Client kullan
- [ ] Edge runtime dusun (cold start azaltma)

### 7.4 Vercel + PostgreSQL Baglantisi
- [ ] Vercel Postgres (Neon) veya external Supabase/Railway PostgreSQL
- [ ] Connection pooling: Prisma Data Proxy veya PgBouncer
- [ ] `DATABASE_URL` icinde `?pgbouncer=true&connection_limit=10` parametresi
- [ ] Serverless icin connection pooling stratejisi belgele

### 7.5 Vercel Domain ve DNS
- [ ] Custom domain: `promtx.ai` -> Vercel
- [ ] `www.promtx.ai` redirect -> `promtx.ai`
- [ ] SSL otomatik (Vercel managed)
- [ ] Preview deployments: `*.promtx.vercel.app`

### 7.6 vercel.json Yapilandirmasi
```json
{
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "framework": "vite",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" }
      ]
    }
  ]
}
```
- [ ] `vercel.json` dosyasi olustur
- [ ] SPA routing icin rewrite kurali
- [ ] API CORS headers
- [ ] Cache headers (statik dosyalar icin)

---

## BOLUM 8: RUST BACKEND DEGISIKLIKLERI

### 8.1 Cargo.toml — Prisma Entegrasyonu
- [ ] `prisma-client-rust` crate ekle (opsiyonel — Rust native Prisma)
  - [ ] Veya Bun/Node API layer kullan ve Rust'i sadece Tauri IPC icin tut
- [ ] Eski `sqlx` ve `sea-orm` bagimliliklarini asama asama kaldir
- [ ] `redis` crate sentinel feature: `redis = { version = "0.28", features = ["tokio-comp", "connection-manager", "sentinel"] }`
- [ ] Google OAuth icin: `oauth2` crate veya Bun API layer'da isle

### 8.2 Mimari Karar: Hibrit Yaklasim
- [ ] **Tauri IPC (Rust):** Yerel dosya islemleri, sistem entegrasyonlari, biometric
- [ ] **Bun API Layer:** Veritabani islemleri (Prisma), Auth (Google OAuth), Stripe webhook'lari
- [ ] **Vercel Serverless:** Web deploy icin API routes
- [ ] Frontend -> Bun API (web) VEYA Tauri IPC (desktop) -> PostgreSQL
- [ ] Ortak is mantigi `src/lib/api.ts` icinde, ortama gore backend sec

### 8.3 SQL Sozdizimi Degisiklikleri (Kalan Rust Kodu Icin)
- [ ] `?` placeholder -> `$1, $2, $3`
- [ ] `datetime('now')` -> `NOW()`
- [ ] `LIKE` -> `ILIKE`
- [ ] `GROUP_CONCAT` -> `STRING_AGG`
- [ ] `IFNULL` -> `COALESCE`
- [ ] `last_insert_rowid()` -> `RETURNING id`
- [ ] `0/1` boolean -> `true/false`
- [ ] `INSERT OR IGNORE` -> `INSERT ... ON CONFLICT DO NOTHING`
- [ ] `INTEGER PRIMARY KEY AUTOINCREMENT` -> `SERIAL` / `BIGSERIAL`
- [ ] `TEXT` JSON -> `JSONB`
- [ ] `BLOB` -> `BYTEA`
- [ ] `REAL` -> `NUMERIC` (para birimleri icin)
- [ ] SQLite FTS5 -> PostgreSQL `tsvector` + GIN index
- [ ] `Pool<Sqlite>` -> `Pool<Postgres>` (tum dosyalarda)

### 8.5 Guncellenmesi Gereken Tum IPC Komutlari

> **Kaynak:** `src-tauri/src/lib.rs` — tauri::invoke_handler

#### LLM Komutlari (`src-tauri/src/ipc/commands/llm.rs`)
- [ ] `generate_prompt` — SQL sorgularini PostgreSQL'e uyarla
- [ ] `generate_parallel_prompt` — batch insert kullan
- [ ] `stream_generate_prompt` — token_usage kaydi PostgreSQL
- [ ] `abort_prompt`
- [ ] `get_token_usage_history` — pagination (LIMIT/OFFSET)
- [ ] `get_token_usage_summary` — aggregate sorgular

#### Auth Komutlari (`src-tauri/src/ipc/commands/auth.rs`)
- [ ] `register` — UUID, RETURNING, transaction (wallet + user atomik)
- [ ] `login` — UUID karsilastirma, TIMESTAMPTZ
- [ ] `google_login` — UPSERT (`INSERT ... ON CONFLICT`), Account tablosu eklenmeli
- [ ] `verify_mfa` — TOTP dogrulama
- [ ] `rotate_token` — refresh token rotation, RETURNING
- [ ] `setup_2fa` — totp_secret kaydetme
- [ ] `get_referral_code` — referral tablosu sorgusu
- [ ] `create_api_key_cmd` — `ptx_` prefix, key_hash
- [ ] `verify_token` — JWT dogrulama (SQL degisikligi yok)
- [ ] `logout` — session status guncelleme
- [ ] `upload_avatar` — avatar_url guncelleme
- [ ] `impersonate_user` — admin icin 30dk session, audit log
- [ ] `forgot_password` — Resend email ile reset token

#### Billing Komutlari (`src-tauri/src/ipc/commands/billing.rs`)
- [ ] `get_wallet_balance` — `Decimal` okuma
- [ ] `create_topup_session` — Stripe checkout session
- [ ] `create_payment_intent` — Stripe payment intent
- [ ] `handle_stripe_webhook` — idempotency, event id kontrol
- [ ] `get_ledger_history` — pagination, TIMESTAMPTZ
- [ ] `validate_promo_code` — promo_codes tablosu sorgusu
- [ ] `verify_iap_receipt` — Apple/Google receipt dogrulama
- [ ] `download_receipt` — PDF generation

#### Admin Komutlari
- [ ] `admin_get_users` — pagination, ILIKE arama
- [ ] `admin_freeze_user` — is_frozen guncelleme, audit log
- [ ] `admin_update_credits` — wallet + ledger transaction
- [ ] `admin_logs` — audit_logs pagination

#### DNA Vault Komutlari
- [ ] `save_dna` — JSONB kaydetme, upsert
- [ ] `get_dna_vault` — JSONB sorgulama

#### Prompt History Komutlari
- [ ] `save_prompt_history` — meta_json -> JSONB
- [ ] `get_prompt_history` — pagination, studio_type filtre

#### Template Komutlari
- [ ] `save_prompt_template` — JSONB variables
- [ ] `get_prompt_templates` — studio_type + tags filtre
- [ ] `delete_prompt_template` — soft delete
- [ ] `expand_prompt_template` — variable substitution (SQL degisikligi yok)

#### Gorsel/Image Komutlari (`src-tauri/src/modules/llm/visual.rs`)
- [ ] `generate_image` — s3_key, size_bytes BIGINT
- [ ] `generate_variation` — parent_image_id FK
- [ ] `outpaint_image` — gorsel isleme
- [ ] `get_image_gallery` — pagination, user_id filtre
- [ ] `get_public_gallery` — `WHERE is_public = true`, pagination
- [ ] `toggle_public_status` — boolean toggle
- [ ] `set_display_name` — display_name guncelleme
- [ ] `share_image_asset` — paylasim URL olusturma
- [ ] `upscale_image` — gorsel isleme
- [ ] `optimize_visual_prompt` — prompt iyilestirme

#### TTS Komutlari
- [ ] `generate_speech` — audio generation

#### Workspace Komutlari
- [ ] `create_workspace` — UUID, RETURNING
- [ ] `list_workspaces` — owner_id + member sorgusu (JOIN)
- [ ] `invite_member` — workspace_invitations tablosu, email gonderimi
- [ ] `remove_member` — CASCADE dikkat

#### Storage/System Komutlari
- [ ] `check_llm_health` — provider health check
- [ ] `get_db_stats` — pg_stat_user_tables sorgusu
- [ ] `vacuum_database` — PostgreSQL'de VACUUM (farkli davranis!)
- [ ] `get_health_status` — tum servislerin durumu
- [ ] `get_metrics` — pg_stat_statements + custom metrikler
- [ ] `create_backup_cmd` — `pg_dump` bazli (SQLite backup API yerine)
- [ ] `restore_backup_cmd` — `pg_restore` bazli

#### Network Komutlari
- [ ] `get_network_status` — SQL degisikligi yok (HTTP check)
- [ ] `force_recheck_network` — SQL degisikligi yok
- [ ] `ping_services` — PostgreSQL + Redis ping ekle

#### Native Komutlari (SQL degisikligi yok)
- [ ] `process_image`, `get_memory_usage`, `extract_doc_text`, `process_text`
- [ ] `transcribe_audio`, `tokenize_text`

#### Event Komutlari
- [ ] `log_event` — audit_logs INSERT, JSONB metadata
- [ ] `submit_feedback` — feedbacks tablosu INSERT (BOLUM 14'te detayli, sadece text — dosya/PDF kabul edilmez)

### 8.4 Redis + Sentinel Client
- [ ] Redis baglanti modulu olustur (sentinel destekli)
- [ ] Cache key stratejisi:
  - [ ] `user:{id}:profile`
  - [ ] `user:{id}:wallet`
  - [ ] `session:{token}`
  - [ ] `rate:{ip}:{endpoint}`
- [ ] Cache invalidation: write-through + TTL
- [ ] Sentinel failover handling

---

## BOLUM 9: FRONTEND DEGISIKLIKLERI

### 9.1 Bun Script'leri Dogrulama
- [ ] `bun run dev` — Vite dev server (port 1420)
- [ ] `bun run build` — Production build
- [ ] `bun run preview` — Preview (port 4173)
- [ ] `bun run test` — Vitest
- [ ] `bun run lint` — TypeScript check
- [ ] `bun run e2e` — Playwright
- [ ] Tum script'lerin `bun` ile sorunsuz calistigini dogrula

### 9.2 Mevcut Route'lar ve Guncellenmesi Gerekenler

> **Kaynak:** `src/App.tsx` — React Router 7 lazy-loaded pages

| Route | Sayfa | Guncelleme |
|-------|-------|------------|
| `/` | PromptBuilder (Ana studio) | UUID ID'ler |
| `/wizard` | Wizard (AI-assisted prompt) | UUID |
| `/logs` | Logs (aktivite loglari) | PostgreSQL audit_logs sorgusu |
| `/dev` | DevTools | pg_stat kontrolu ekle |
| `/pricing` | Pricing (abonelik) | Prisma ile plan sorgusu |
| `/checkout` | Checkout (Stripe) | PostgreSQL ledger |
| `/help` | Help | Degisiklik yok |
| `/settings` | Settings | UUID, TOTP ayarlari |
| `/admin` | AdminDashboard | pg metrikleri, user CRUD |
| `/gallery` | Gallery (public gorsel) | is_public sorgusu, pagination |
| `/legal/privacy-policy` | PrivacyPolicy | Degisiklik yok |
| `/legal/terms-of-service` | TermsOfService | Degisiklik yok |
| `/legal/cookie-policy` | CookiePolicy | Degisiklik yok |
| `/auth/google/callback` | **YENI** | OAuth callback handler |

### 9.3 API Katmani Guncellemesi
- [ ] UUID formatinda ID'ler (mevcut TEXT ID -> UUID)
- [ ] ISO 8601 with timezone tarihler (TIMESTAMPTZ)
- [ ] Pagination response tipleri (cursor-based veya offset)
- [ ] Full-text search endpoint'leri (PostgreSQL tsvector)
- [ ] Google OAuth API cagrilari

### 9.4 Auth Flow Bilesenler
- [ ] Login sayfasi: Email/Password + Google OAuth (mevcut `login` komutu)
- [ ] Register sayfasi: Email/Password + Google OAuth (mevcut `register` komutu)
- [ ] Forgot password sayfasi (mevcut `forgot_password` komutu)
- [ ] 2FA/TOTP setup sayfasi (mevcut `setup_2fa` komutu)
- [ ] 2FA dogrulama dialog (mevcut `verify_mfa` komutu)
- [ ] OAuth callback handler: `/auth/google/callback`
- [ ] Auth state management (Zustand store guncelle — `src/lib/store.ts`)
- [ ] Protected route wrapper
- [ ] Auto-refresh token logic (mevcut `rotate_token` komutu)
- [ ] Impersonate mode indicator (admin icin — mevcut `impersonate_user`)

### 9.5 Yeni Bilesenler
- [ ] Google login butonu (`@react-oauth/google` veya custom)
- [ ] Notification bilesenni (real-time, Sonner toast ile entegre)
- [ ] Pagination bilesenni (gallery, prompt history, admin listeler)
- [ ] Full-text search bilesen (conversations arama)
- [ ] API key yonetim sayfasi (mevcut `create_api_key_cmd`)
- [ ] Referral kod paylasim bilesenni (mevcut `get_referral_code`)

### 9.6 Zustand Store Guncellemesi (`src/lib/store.ts`)
- [ ] `PromptHistoryItem` tip guncelleme: `id: string` (UUID formatinda gelecek)
- [ ] `PromptPreset` tip guncelleme: `id: string` (UUID)
- [ ] Auth state: `user`, `accessToken`, `refreshToken`, `isAuthenticated`
- [ ] Wallet state: `credits: number` (Decimal -> number frontend'de)
- [ ] Notification state: `unreadCount`, `notifications[]`
- [ ] Studio state guncelleme: 8 studio type enum uyumu
- [ ] Persistence middleware: IndexedDB (idb) ile uyumlu olmaya devam

---

## BOLUM 9B: STRIPE ABONELIK SISTEMI (SUBSCRIPTION)

> **Mevcut durum:** `src-tauri/src/modules/billing.rs`
> - `create_payment_intent()` — tek seferlik PaymentIntent (calisiyor)
> - `create_checkout_session()` — tek seferlik Checkout Session, `mode: "payment"` (calisiyor)
> - `handle_webhook()` — sadece `checkout.session.completed` ve `invoice.paid` (stub)
> - `validate_promo_code()` — hardcoded 3 kod: PROMTX20, LAUNCH50, WELCOME10
> - `generate_receipt()` — PDF receipt olusturma (calisiyor)
> - `process_refund()` — ledger reversal + receipt status guncelleme (calisiyor)
> - `apply_referral_code()` — referrer + referred bonus (calisiyor)
> - `validate_store_receipt()` — Apple/Google IAP stub (calisiyor)
>
> **Mevcut pricing tiers:** (`src/pages/Pricing.tsx`)
> - STARTER: $0/ay, 100 kredi (Free role)
> - CREATOR: $29/ay, 5000 kredi (Pro role)
> - STUDIO PRO: $69/ay, 15000 kredi (Enterprise role)
>
> **Mevcut IAP product -> role mapping:** (`src-tauri/src/modules/iap.rs:99`)
> - `com.promtx.pro.monthly` / `com.promtx.pro.yearly` -> Pro
> - `com.promtx.ent.monthly` -> Enterprise
> - Diger -> Free

### 9B.1 Stripe Product ve Price Tanimlari

- [ ] Stripe Dashboard'da Product'lar olustur:

| Product | Stripe Product ID | Aciklama |
|---------|------------------|----------|
| Promtx Starter | `prod_starter` | Ucretsiz plan |
| Promtx Creator | `prod_creator` | Profesyonel icerik uretimi |
| Promtx Studio Pro | `prod_studio_pro` | Tam studio erisimi |

- [ ] Stripe Price'lar olustur (recurring):

| Price | Product | Tutar | Periyot | Stripe Price ID |
|-------|---------|-------|---------|-----------------|
| Creator Aylik | Promtx Creator | $29/ay | monthly | `price_creator_monthly` |
| Creator Yillik | Promtx Creator | $290/yil (%17 indirim) | yearly | `price_creator_yearly` |
| Studio Pro Aylik | Promtx Studio Pro | $69/ay | monthly | `price_studio_pro_monthly` |
| Studio Pro Yillik | Promtx Studio Pro | $690/yil (%17 indirim) | yearly | `price_studio_pro_yearly` |

- [ ] Stripe Price ID'leri `.env.docker`'a ekle:
  - [ ] `STRIPE_PRICE_CREATOR_MONTHLY=price_xxx`
  - [ ] `STRIPE_PRICE_CREATOR_YEARLY=price_xxx`
  - [ ] `STRIPE_PRICE_STUDIO_PRO_MONTHLY=price_xxx`
  - [ ] `STRIPE_PRICE_STUDIO_PRO_YEARLY=price_xxx`

### 9B.2 Prisma Subscription Modelleri

```prisma
model Subscription {
  id                    String             @id @default(uuid())
  userId                String             @unique @map("user_id")
  stripeCustomerId      String             @unique @map("stripe_customer_id") @db.VarChar(255)
  stripeSubscriptionId  String?            @unique @map("stripe_subscription_id") @db.VarChar(255)
  stripePriceId         String?            @map("stripe_price_id") @db.VarChar(255)
  plan                  SubscriptionPlan   @default(starter)
  billingCycle          BillingCycle?      @map("billing_cycle")
  status                SubscriptionStatus @default(active)
  currentPeriodStart    DateTime?          @map("current_period_start")
  currentPeriodEnd      DateTime?          @map("current_period_end")
  cancelAtPeriodEnd     Boolean            @default(false) @map("cancel_at_period_end")
  canceledAt            DateTime?          @map("canceled_at")
  trialStart            DateTime?          @map("trial_start")
  trialEnd              DateTime?          @map("trial_end")
  monthlyCredits        Int                @default(100) @map("monthly_credits")
  creditsUsedThisPeriod Int                @default(0) @map("credits_used_this_period")
  metadata              Json               @default("{}")
  createdAt             DateTime           @default(now()) @map("created_at")
  updatedAt             DateTime           @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([stripeCustomerId])
  @@index([status])
  @@map("subscriptions")
}

model SubscriptionHistory {
  id                   String             @id @default(uuid())
  userId               String             @map("user_id")
  fromPlan             SubscriptionPlan   @map("from_plan")
  toPlan               SubscriptionPlan   @map("to_plan")
  fromPrice            String?            @map("from_price") @db.VarChar(255)
  toPrice              String?            @map("to_price") @db.VarChar(255)
  reason               String?            @db.VarChar(255)
  stripeEventId        String?            @map("stripe_event_id") @db.VarChar(255)
  createdAt            DateTime           @default(now()) @map("created_at")

  @@index([userId, createdAt(sort: Desc)])
  @@map("subscription_history")
}

enum SubscriptionPlan {
  starter       // Free — $0, 100 kredi
  creator       // Pro — $29/ay, 5000 kredi
  studio_pro    // Enterprise — $69/ay, 15000 kredi
}

enum BillingCycle {
  monthly
  yearly
}

enum SubscriptionStatus {
  active
  past_due
  canceled
  incomplete
  incomplete_expired
  trialing
  unpaid
  paused
}
```

- [ ] Subscription modeli Prisma schema'ya ekle
- [ ] SubscriptionHistory modeli ekle (plan degisiklik gecmisi)
- [ ] User modeline `subscription Subscription?` relation ekle
- [ ] `bunx prisma migrate dev --name add_subscriptions`
- [ ] Enum'lari ekle: `SubscriptionPlan`, `BillingCycle`, `SubscriptionStatus`

### 9B.3 Stripe Customer Olusturma

```rust
// billing.rs'e eklenecek
pub async fn get_or_create_customer(&self, user_id: &str, email: &str) -> Result<String, AppError> {
    // 1. DB'de mevcut stripe_customer_id var mi kontrol et
    // 2. Yoksa Stripe API ile olustur:
    //    POST https://api.stripe.com/v1/customers
    //    params: email, metadata[user_id], metadata[promtx_plan]
    // 3. DB'ye kaydet (subscriptions tablosu)
    // 4. stripe_customer_id don
}
```

- [ ] `get_or_create_customer()` fonksiyonu yaz
- [ ] Register sirasinda otomatik Stripe customer olustur
- [ ] Google login sirasinda da Stripe customer kontrol et/olustur
- [ ] Customer metadata'ya `user_id` ve `plan` ekle

### 9B.4 Subscription Checkout (Abonelik Baslatma)

```rust
// billing.rs — mevcut create_checkout_session'i genislet
pub async fn create_subscription_checkout(
    &self,
    user_id: &str,
    price_id: &str,  // price_creator_monthly, price_studio_pro_yearly vs.
    trial_days: Option<u32>,
) -> Result<String, AppError> {
    // Mevcut create_checkout_session'dan farkli:
    // mode: "subscription" (mevcut: "payment")
    // line_items[0][price]: price_id (mevcut: price_data inline)
    // subscription_data[trial_period_days]: 7 (opsiyonel)
    // subscription_data[metadata][user_id]: user_id
    // success_url: "promtx://subscription/success"
    // cancel_url: "promtx://subscription/cancel"
    // customer: stripe_customer_id (mevcut: yok — her seferinde yeni)
    // allow_promotion_codes: true (mevcut: var)
}
```

- [ ] `create_subscription_checkout()` fonksiyonu yaz
- [ ] `mode: "subscription"` kullan (mevcut `"payment"` degil)
- [ ] Mevcut `create_checkout_session()` korut — tek seferlik kredi yuklemeleri icin
- [ ] Trial period destegi: ilk 7 gun ucretsiz (opsiyonel)
- [ ] Stripe Customer ile iliskilendir (mevcut checkout'ta customer yok)
- [ ] Success/cancel URL'leri Tauri + Web icin ayir:
  - [ ] Tauri: `promtx://subscription/success`
  - [ ] Web: `https://promtx.ai/subscription/success`
  - [ ] Vercel: `https://promtx.vercel.app/subscription/success`

### 9B.5 Stripe Webhook Handler Genisletme

> **Mevcut:** `handle_webhook()` sadece `checkout.session.completed` ve `invoice.paid` (stub) isliyor

```rust
pub async fn handle_webhook(&self, event_type: &str, payload: Value, signature: Option<&str>) -> Result<(), AppError> {
    // ... mevcut HMAC dogrulama korunacak ...
    
    match event_type {
        // MEVCUT (calisiyor)
        "checkout.session.completed" => { /* mevcut: tek seferlik topup */ }
        
        // YENI: Abonelik basarili olusturuldu
        "customer.subscription.created" => {
            // 1. subscription_id, customer_id, price_id al
            // 2. DB'de subscription olustur/guncelle
            // 3. UserRole guncelle (Free -> Pro / Enterprise)
            // 4. Aylik kredi haklarini wallet'a ekle
            // 5. Hosgeldin email gonder (Resend API)
        }
        
        // YENI: Abonelik periyot yenilendi (aylik fatura odendi)
        "invoice.paid" => {
            // 1. subscription_id bul
            // 2. credits_used_this_period sifirla
            // 3. Aylik kredi haklarini wallet'a ekle (Creator: 5000, Studio Pro: 15000)
            // 4. current_period_start/end guncelle
            // 5. Ledger entry olustur (TransactionReason::Subscription)
            // 6. Receipt olustur (mevcut generate_receipt kullan)
        }
        
        // YENI: Fatura odenemedi
        "invoice.payment_failed" => {
            // 1. Subscription status -> past_due
            // 2. Kullaniciya email gonder (odeme hatasi)
            // 3. 3 basarisiz denemeden sonra: cancel
            // 4. SecurityEvent olustur
        }
        
        // YENI: Abonelik guncellendi (upgrade/downgrade)
        "customer.subscription.updated" => {
            // 1. Yeni price_id'den plan belirle
            // 2. UserRole guncelle
            // 3. Kredi haklari guncelle (prorate veya yeni periyod)
            // 4. SubscriptionHistory kaydı olustur
            // 5. Audit log yaz
        }
        
        // YENI: Abonelik iptal edildi
        "customer.subscription.deleted" => {
            // 1. Subscription status -> canceled
            // 2. UserRole -> Free
            // 3. monthlyCredits -> 100 (Starter default)
            // 4. cancel_at_period_end ise: periyod sonunda etkili olacak
            // 5. SubscriptionHistory kaydı olustur
            // 6. Iptal nedeni email gonder
        }
        
        // YENI: Trial bitiyor (3 gun kala bildirim)
        "customer.subscription.trial_will_end" => {
            // 1. Kullaniciya email gonder (trial bitiyor)
            // 2. In-app notification olustur
        }
        
        // YENI: Odeme yontemi guncellendi
        "payment_method.attached" => {
            // 1. Log kaydi
        }
        
        // YENI: Musteri silindi
        "customer.deleted" => {
            // 1. Subscription temizle
            // 2. UserRole -> Free
        }
        
        _ => {
            tracing::warn!("Billing: Unhandled webhook event type: {}", event_type);
        }
    }
}
```

- [ ] Webhook handler'i genislet — 8 yeni event type
- [ ] Her event icin idempotency kontrol (StripeEvent tablosuna kaydet, tekrar isleme)
- [ ] Basarisiz webhook'lar icin retry mekanizmasi
- [ ] Webhook endpoint'i Vercel'de de calistir (`api/webhooks/stripe.ts`)

### 9B.6 Abonelik Yonetimi (Customer Portal)

```rust
// billing.rs'e eklenecek
pub async fn create_customer_portal_session(&self, user_id: &str) -> Result<String, AppError> {
    // Stripe Customer Portal URL olustur
    // POST https://api.stripe.com/v1/billing_portal/sessions
    // customer: stripe_customer_id
    // return_url: "promtx://settings" veya "https://promtx.ai/settings"
    // Kullanici buradan: kart degistirme, plan degistirme, iptal yapabilir
}
```

- [ ] `create_customer_portal_session()` fonksiyonu yaz
- [ ] Stripe Dashboard'da Customer Portal ayarla:
  - [ ] Plan degisikligi (upgrade/downgrade) izin ver
  - [ ] Iptal izin ver (periyod sonunda etkili)
  - [ ] Fatura gecmisi goruntuleme
  - [ ] Odeme yontemi guncelleme
  - [ ] Promo code kullanimi
- [ ] Settings sayfasinda "Aboneligi Yonet" butonu ekle
- [ ] IPC komutu ekle: `manage_subscription`

### 9B.7 Plan Degisikligi (Upgrade / Downgrade)

```rust
pub async fn change_subscription_plan(
    &self,
    user_id: &str,
    new_price_id: &str,
    prorate: bool, // true: aninda fark odeme, false: sonraki periyodda
) -> Result<(), AppError> {
    // 1. Mevcut subscription_id al
    // 2. Stripe API: PATCH /v1/subscriptions/{sub_id}
    //    items[0][id]: mevcut item id
    //    items[0][price]: new_price_id
    //    proration_behavior: "create_prorations" veya "none"
    // 3. DB guncelle (plan, price_id)
    // 4. UserRole guncelle
    // 5. SubscriptionHistory kaydi
    // 6. Audit log
}
```

- [ ] Upgrade: Creator -> Studio Pro (aninda, prorate)
- [ ] Downgrade: Studio Pro -> Creator (periyod sonunda etkili)
- [ ] Downgrade: Creator -> Starter (iptal + periyod sonunda Free)
- [ ] Upgrade sirasinda mevcut kredi hakki korunmali
- [ ] Downgrade sirasinda fazla kredi kesilmemeli (mevcut bakiye kalir)

### 9B.8 Kredi Yonetimi (Abonelik Bazli)

| Plan | Aylik Kredi | Tasima | Ek Kredi |
|------|------------|--------|----------|
| Starter (Free) | 100 | Yok | Tek seferlik satin alim |
| Creator ($29) | 5000 | Maks 2000 sonraki aya | Tek seferlik satin alim |
| Studio Pro ($69) | 15000 | Maks 5000 sonraki aya | Tek seferlik satin alim |

- [ ] Aylik kredi yenileme: `invoice.paid` webhook'unda
- [ ] Kredi tasima mantigi: `carry_over_credits()` fonksiyonu
  - [ ] Periyod sonunda kullanilmayan kredilerin bir kismini tasima
  - [ ] Tasima limiti: plan bazli (yukaridaki tablo)
- [ ] `credits_used_this_period` sayaci: her generation'da artir
- [ ] Kredi bittiyse:
  - [ ] Starter: "Aboneliginizi yukseltin" mesaji goster
  - [ ] Creator/Studio Pro: "Ek kredi satin alin" secenegi (mevcut tek seferlik checkout)
- [ ] Abonelik iptali sonrasi: mevcut kredi bakiyesi korunur, yeni kredi eklenmez

### 9B.9 Stripe Webhook Endpoint (Vercel + Tauri)

#### Vercel API Route (`api/webhooks/stripe.ts`)
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const prisma = new PrismaClient();

export const config = { api: { bodyParser: false } }; // Raw body gerekli

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers['stripe-signature'] as string;
  const buf = await buffer(req);
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Idempotency: daha once islenmis mi?
  const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing?.processedAt) return res.json({ received: true, duplicate: true });
  
  // Event kaydet
  await prisma.stripeEvent.upsert({
    where: { id: event.id },
    update: {},
    create: { id: event.id, eventType: event.type, data: event.data as any },
  });
  
  // Event isle...
  switch (event.type) {
    case 'customer.subscription.created': /* ... */ break;
    case 'customer.subscription.updated': /* ... */ break;
    case 'customer.subscription.deleted': /* ... */ break;
    case 'invoice.paid': /* ... */ break;
    case 'invoice.payment_failed': /* ... */ break;
    // ...
  }
  
  // Islendi olarak isaretle
  await prisma.stripeEvent.update({
    where: { id: event.id },
    data: { processedAt: new Date(), status: 'completed' },
  });
  
  res.json({ received: true });
}
```

- [ ] `api/webhooks/stripe.ts` Vercel serverless function olustur
- [ ] Raw body parsing (Stripe imza dogrulamasi icin gerekli)
- [ ] Idempotency: StripeEvent tablosunda tekrar kontrol
- [ ] Error handling: basarisiz event'leri `retryCount` ile takip et
- [ ] Stripe Dashboard'da webhook endpoint URL'leri ekle:
  - [ ] Dev (Tauri): `stripe listen --forward-to localhost:3001/api/webhooks/stripe` (Stripe CLI)
  - [ ] Prod (Vercel): `https://promtx.ai/api/webhooks/stripe`
  - [ ] Preview: `https://promtx.vercel.app/api/webhooks/stripe`

### 9B.10 Frontend Abonelik Bilesen'leri

#### Pricing Sayfasi Guncellemesi (`src/pages/Pricing.tsx`)
- [ ] Mevcut TIERS yapisini koru ama genislet:
  ```typescript
  const TIERS = [
    {
      name: 'STARTER',
      plan: 'starter' as SubscriptionPlan,
      price: { monthly: 0, yearly: 0 },
      credits: 100,
      // ... mevcut features
      stripePriceId: { monthly: null, yearly: null },
    },
    {
      name: 'CREATOR',
      plan: 'creator' as SubscriptionPlan,
      price: { monthly: 29, yearly: 290 },
      credits: 5000,
      stripePriceId: {
        monthly: 'price_creator_monthly',
        yearly: 'price_creator_yearly',
      },
    },
    {
      name: 'STUDIO PRO',
      plan: 'studio_pro' as SubscriptionPlan,
      price: { monthly: 69, yearly: 690 },
      credits: 15000,
      stripePriceId: {
        monthly: 'price_studio_pro_monthly',
        yearly: 'price_studio_pro_yearly',
      },
    },
  ];
  ```
- [ ] Aylik/Yillik toggle switch ekle (yillik %17 indirim goster)
- [ ] Mevcut plan highlight'i (kullanicinin aktif planini isaretle)
- [ ] "Mevcut Plan" badge'i
- [ ] Upgrade butonu -> `create_subscription_checkout` IPC komutu
- [ ] Downgrade butonu -> onay dialog -> `change_subscription_plan`
- [ ] Free tier icin "Basla" butonu (kayit sayfasina yonlendir)

#### Subscription Status Bilesen'i (Settings sayfasi)
```typescript
// src/components/SubscriptionStatus.tsx
interface SubscriptionStatusProps {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  monthlyCredits: number;
  creditsUsed: number;
}
```
- [ ] Settings sayfasinda abonelik durumu karti
- [ ] Mevcut plan, sonraki yenileme tarihi, kredi kullanimi
- [ ] "Aboneligi Yonet" butonu -> Stripe Customer Portal
- [ ] "Plani Degistir" butonu -> Pricing sayfasi
- [ ] `cancelAtPeriodEnd` ise: "Aboneliginiz X tarihinde sona erecek" uyarisi
- [ ] Kredi kullanim cubugu (5000/5000 gibi progress bar)

#### Kredi Yetersiz Dialog'u
- [ ] Prompt generation sirasinda kredi yetersizse goster
- [ ] "Ek Kredi Satin Al" butonu (mevcut tek seferlik checkout)
- [ ] "Planini Yukselt" butonu (Pricing sayfasina yonlendir)
- [ ] Kalan kredi miktarini goster

#### Checkout Bilesen'leri
- [ ] `/checkout/subscription/success` sayfasi — abonelik basarili
- [ ] `/checkout/subscription/cancel` sayfasi — iptal edildi
- [ ] Mevcut `/checkout` sayfasi korunacak (tek seferlik kredi yuklemeleri icin)

### 9B.11 Abonelik Seed Data

```typescript
// prisma/seed.ts icine eklenecek

// Admin: Studio Pro abonelik
await prisma.subscription.upsert({
  where: { userId: adminUser.id },
  update: {},
  create: {
    userId: adminUser.id,
    stripeCustomerId: 'cus_test_admin_001',
    stripeSubscriptionId: 'sub_test_admin_001',
    stripePriceId: 'price_studio_pro_monthly',
    plan: 'studio_pro',
    billingCycle: 'monthly',
    status: 'active',
    monthlyCredits: 15000,
    creditsUsedThisPeriod: 3200,
    currentPeriodStart: new Date('2026-04-01'),
    currentPeriodEnd: new Date('2026-05-01'),
  },
});

// Pro kullanici: Creator abonelik (yillik)
await prisma.subscription.upsert({
  where: { userId: proUser.id },
  update: {},
  create: {
    userId: proUser.id,
    stripeCustomerId: 'cus_test_pro_001',
    stripeSubscriptionId: 'sub_test_pro_001',
    stripePriceId: 'price_creator_yearly',
    plan: 'creator',
    billingCycle: 'yearly',
    status: 'active',
    monthlyCredits: 5000,
    creditsUsedThisPeriod: 1800,
    currentPeriodStart: new Date('2026-01-15'),
    currentPeriodEnd: new Date('2027-01-15'),
  },
});

// Free kullanici: Starter (abonelik yok, sadece Stripe customer)
await prisma.subscription.upsert({
  where: { userId: freeUser.id },
  update: {},
  create: {
    userId: freeUser.id,
    stripeCustomerId: 'cus_test_free_001',
    plan: 'starter',
    status: 'active',
    monthlyCredits: 100,
    creditsUsedThisPeriod: 45,
  },
});

// Iptal edilmis abonelik ornegi
await prisma.subscription.upsert({
  where: { userId: designerUser.id },
  update: {},
  create: {
    userId: designerUser.id,
    stripeCustomerId: 'cus_test_designer_001',
    stripeSubscriptionId: 'sub_test_designer_001',
    stripePriceId: 'price_creator_monthly',
    plan: 'creator',
    billingCycle: 'monthly',
    status: 'active',
    cancelAtPeriodEnd: true, // Periyod sonunda iptal edilecek
    canceledAt: new Date('2026-04-20'),
    monthlyCredits: 5000,
    creditsUsedThisPeriod: 4100,
    currentPeriodStart: new Date('2026-04-01'),
    currentPeriodEnd: new Date('2026-05-01'),
  },
});

// Subscription history seed
await prisma.subscriptionHistory.createMany({
  data: [
    {
      userId: adminUser.id,
      fromPlan: 'creator',
      toPlan: 'studio_pro',
      reason: 'Upgrade — daha fazla kredi gerekti',
      createdAt: new Date('2026-03-15'),
    },
    {
      userId: designerUser.id,
      fromPlan: 'studio_pro',
      toPlan: 'creator',
      reason: 'Downgrade — maliyet optimizasyonu',
      createdAt: new Date('2026-02-01'),
    },
  ],
});
```

- [ ] Her test kullanici icin subscription seed et
- [ ] Admin: Studio Pro (aktif)
- [ ] Pro user: Creator yillik (aktif)
- [ ] Free user: Starter (Stripe customer var, abonelik yok)
- [ ] Designer: Creator (cancel_at_period_end = true)
- [ ] SubscriptionHistory ornekleri (upgrade + downgrade)

### 9B.12 Stripe Test Modu Kontrol Listesi

- [ ] Stripe Dashboard'da Test mode aktif
- [ ] Test API key'leri `.env.docker`'da:
  - [ ] `STRIPE_SECRET_KEY=sk_test_...`
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`
  - [ ] `STRIPE_WEBHOOK_SECRET=whsec_test_...`
- [ ] Stripe CLI kur: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
- [ ] Test kartlari:
  - [ ] Basarili odeme: `4242 4242 4242 4242`
  - [ ] Yetersiz bakiye: `4000 0000 0000 9995`
  - [ ] 3D Secure gerektiren: `4000 0025 0000 3155`
  - [ ] Iptal edilen kart: `4000 0000 0000 0341`
- [ ] Test senaryolari:
  - [ ] Starter -> Creator upgrade (aylik)
  - [ ] Creator -> Studio Pro upgrade (yillik)
  - [ ] Studio Pro -> Creator downgrade
  - [ ] Creator -> Starter iptal
  - [ ] Basarisiz odeme -> past_due -> retry
  - [ ] Trial baslat -> trial bitti -> ilk odeme
  - [ ] Promo code ile indirimli abonelik
  - [ ] Fatura goruntuleme (Customer Portal)
  - [ ] Kart degistirme (Customer Portal)

### 9B.13 IPC Komutlari (Yeni)

- [ ] `create_subscription_checkout` — Stripe subscription checkout URL don
- [ ] `get_subscription_status` — mevcut abonelik durumu (plan, kredi, tarih)
- [ ] `manage_subscription` — Customer Portal URL don
- [ ] `change_plan` — upgrade/downgrade
- [ ] `cancel_subscription` — periyod sonunda iptal
- [ ] `resume_subscription` — iptal edilen aboneligi geri al
- [ ] `get_invoices` — fatura gecmisi (Stripe API'den)
- [ ] `get_credit_usage` — bu periyottaki kredi kullanimi
- [ ] Mevcut `create_topup_session` korunacak — ek kredi icin tek seferlik odeme

---

## BOLUM 10: GUVENLIK

### 10.1 Auth Guvenlik
- [ ] Password hashing: Argon2 (mevcut — degisiklik yok)
- [ ] JWT token: RS256 veya HS256 + kisa omur (15 dk)
- [ ] Refresh token: Secure, HttpOnly cookie
- [ ] CSRF protection: state param (Google OAuth)
- [ ] Rate limiting: login endpoint (5 deneme / 15 dk)
- [ ] Account lockout: 5 basarisiz giris -> 30 dk kilitle
- [ ] Brute force detection: IP bazli izleme

### 10.2 Veritabani Guvenlik
- [ ] Parameterized queries (Prisma otomatik yapar)
- [ ] SSL baglanti (uretimde zorunlu)
- [ ] Role bazli erisim: `promtx_app` (sinirli yetki)
- [ ] PII koruma: email maskeleme, IP anonimize
- [ ] KVKK/GDPR: veri silme + export fonksiyonu

### 10.3 Network Guvenlik
- [ ] Docker network izolasyonu
- [ ] PostgreSQL: dis dunya'ya kapali (sadece Docker network)
- [ ] Redis: dis dunya'ya kapali
- [ ] Vercel: HTTPS zorunlu
- [ ] CORS: sadece izin verilen origin'ler

---

## BOLUM 11: CI/CD

### 11.1 GitHub Actions — Test Pipeline
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: promtx_test
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: promtx_test
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bunx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://promtx_test:test_password@localhost:5432/promtx_test
      - run: bunx prisma db seed
      - run: bun run test
      - run: bun run lint
```
- [ ] Test pipeline'i olustur (bun + prisma + postgres service)
- [ ] Build pipeline'i olustur
- [ ] Vercel preview deploy (PR'larda otomatik)

### 11.2 GitHub Actions — Build & Deploy
- [ ] `bun run build` ile production build
- [ ] Vercel CLI ile deploy: `bunx vercel --prod`
- [ ] Deploy oncesi `bunx prisma migrate deploy`
- [ ] Deploy sonrasi healthcheck

---

## BOLUM 12: YEDEKLEME VE MONITORING

### 12.1 Yedekleme
- [ ] Gunluk `pg_dump` ile tam yedek
- [ ] WAL archiving ile PITR (Point-in-Time Recovery)
- [ ] S3'e yedek yukleme
- [ ] 30 gun saklama politikasi
- [ ] Haftalik geri yukleme testi

### 12.2 Monitoring
- [ ] `pg_stat_statements` ile yavas sorgu tespiti
- [ ] Connection pool metrikleri
- [ ] Redis hit/miss orani
- [ ] Sentry ile hata takibi (mevcut — `@sentry/react`)
- [ ] PostHog ile kullanici analitigi (mevcut — `posthog-js`)
- [ ] Vercel Analytics (web deploy)

---

## BOLUM 13: ILK CALISTIRMA KONTROL LISTESI

### Faz 1: Temel Altyapi (1-2 Gun)
- [ ] 1. Docker Desktop kur
- [ ] 2. Bun versiyonunu dogrula
- [ ] 3. `docker-compose.yml` yaz
- [ ] 4. PostgreSQL + Redis servislerini baslat
- [ ] 5. Baglanti testi yap (`psql`, `redis-cli`)

### Faz 2: Prisma + Schema (1-2 Gun)
- [ ] 6. Prisma kur: `bun add -d prisma && bun add @prisma/client`
- [ ] 7. `schema.prisma` yaz (tum modeller)
- [ ] 8. `bunx prisma migrate dev --name init`
- [ ] 9. `bunx prisma generate`
- [ ] 10. `bunx prisma studio` ile tabloları kontrol et

### Faz 3: Seed Data (1 Gun)
- [ ] 11. `prisma/seed.ts` yaz
- [ ] 12. `bunx prisma db seed` calistir
- [ ] 13. Verileri gorsel kontrol et

### Faz 4: Google OAuth (1-2 Gun)
- [ ] 14. Google Cloud Console'da OAuth ayarla
- [ ] 15. Backend OAuth endpoint'lerini yaz
- [ ] 16. Frontend login/register butonlarini ekle
- [ ] 17. OAuth flow'u uc-uca test et

### Faz 5: Vercel Deploy (1 Gun)
- [ ] 18. `vercel.json` olustur
- [ ] 19. Vercel'de proje olustur ve env vars ekle
- [ ] 20. Preview deploy test et
- [ ] 21. Production deploy

### Faz 6: Sentinel + Guvenlik (1-2 Gun)
- [ ] 22. Redis Sentinel yapilandir
- [ ] 23. Rate limiting aktif et
- [ ] 24. SSL sertifikalari ayarla
- [ ] 25. Guvenlik kontrol listesini tamamla

### Faz 7: Dogrulama (1 Gun)
- [ ] 26. Register testi (email + Google)
- [ ] 27. Login testi (email + Google)
- [ ] 28. 2FA/TOTP setup ve dogrulama testi (`setup_2fa` + `verify_mfa`)
- [ ] 29. Prompt olusturma testi — her 8 studio icin:
  - [ ] Image Studio: `generate_prompt` + `generate_image`
  - [ ] Video Studio: `generate_prompt` (video prompt)
  - [ ] Cinema Studio: `generate_prompt` (script)
  - [ ] Audio Studio: `generate_speech`
  - [ ] Character Studio: DNA vault kaydet/yukle (`save_dna` + `get_dna_vault`)
  - [ ] Fashion Studio: `generate_prompt` (fashion prompt)
  - [ ] Marketing Studio: `generate_prompt` (marketing copy)
  - [ ] Edit Studio: `outpaint_image` + `upscale_image`
- [ ] 30. Kredi yukleme/harcama testi:
  - [ ] `get_wallet_balance` — bakiye goruntuleme
  - [ ] `create_topup_session` — Stripe checkout (test mode)
  - [ ] `get_ledger_history` — islem gecmisi
  - [ ] `validate_promo_code` — WELCOME2026 kodu ile test
- [ ] 31. Admin panel testi:
  - [ ] `admin_get_users` — kullanici listesi + pagination
  - [ ] `admin_freeze_user` — kullanici dondurma/acimatesti
  - [ ] `admin_update_credits` — kredi guncelleme
  - [ ] `admin_logs` — audit log goruntuleme
  - [ ] `get_metrics` — sistem metrikleri
  - [ ] `impersonate_user` — kullanici gibi goruntuleme
- [ ] 32. Workspace testi:
  - [ ] `create_workspace` — yeni workspace olustur
  - [ ] `invite_member` — uye davet et
  - [ ] `list_workspaces` — workspace listesi
- [ ] 33. Gallery testi:
  - [ ] `get_image_gallery` — kisisel galeri
  - [ ] `get_public_gallery` — public galeri + pagination
  - [ ] `toggle_public_status` — gorseli public yap/geri al
- [ ] 34. Search testi: full-text arama (conversations, prompt_history)
- [ ] 35. API key testi: `create_api_key_cmd` — `ptx_` prefix ile key olustur
- [ ] 36. Referral testi: `get_referral_code` — kod al, baska kullaniciya uygula
- [ ] 37. Network health: `ping_services` — PostgreSQL + Redis ping
- [ ] 38. Backup testi: `create_backup_cmd` + `restore_backup_cmd`
- [ ] 39. Prompt History testi:
  - [ ] `save_prompt_history` — her studio tipi icin kayit
  - [ ] `get_prompt_history` — pagination + filtre
  - [ ] `toggle_favorite` — favori isaretleme
  - [ ] `delete_prompt_history` — silme
  - [ ] Arama: prompt text icinde full-text search
- [ ] 40. Billing tam akis testi:
  - [ ] `get_wallet_balance` — bakiye goruntuleme
  - [ ] `create_subscription_checkout` — abonelik baslatma (Stripe test mode)
  - [ ] `get_subscription_status` — aktif plan kontrolu
  - [ ] `get_ledger_history` — islem gecmisi pagination
  - [ ] `get_receipts` — fatura listesi
  - [ ] `download_receipt` — PDF indirme
  - [ ] Upgrade/Downgrade akisi
- [ ] 41. Account yonetimi testi:
  - [ ] `get_linked_accounts` — bagli hesaplar listesi
  - [ ] `change_password` — sifre degistirme
  - [ ] `setup_2fa` + `verify_mfa` — 2FA aktif etme
  - [ ] `create_api_key_cmd` — API key olusturma
  - [ ] `export_user_data` — GDPR data export
- [ ] 42. Activity loglari testi:
  - [ ] Security logs: pagination + filtre (action, level, tarih)
  - [ ] Token usage: summary (daily/monthly/all) + model bazli breakdown
  - [ ] Aktif session listesi + uzaktan session sonlandirma
  - [ ] PDF export (mevcut jsPDF)
- [ ] 43. REST API testi (Vercel Serverless):
  - [ ] `POST /api/auth/login` — basarili + yanlis sifre + rate limit
  - [ ] `POST /api/auth/register` — basarili + duplicate email
  - [ ] `GET /api/gallery/public` — pagination + filtre (auth gereksiz)
  - [ ] `GET /api/prompt/history` — auth zorunlu + filtre
  - [ ] `GET /api/health` — uptime kontrolu
  - [ ] `POST /api/webhooks/stripe` — imza dogrulama
  - [ ] Response formati: IpcResponse ile birebir ayni
- [ ] 44. Galeri sistemi testi:
  - [ ] `get_my_gallery` — kisisel galeri + pagination + filtre
  - [ ] `get_public_gallery` — topluluk galerisi + siralama
  - [ ] `like_image` — like toggle + like sayisi guncelleme
  - [ ] `toggle_public_status` — public/private gecisi
  - [ ] `create_folder` + `move_to_folder` — klasor yonetimi
  - [ ] `share_gallery_item` — paylasim URL olusturma
  - [ ] `download_gallery_item` — gorsel indirme
  - [ ] `report_image` — icerik bildirimi
  - [ ] Toplu secim + toplu silme/tasima
- [ ] 45. Vercel'de canli test (API + frontend)
- [ ] 46. Performans baseline olcumu

---

## BOLUM 14: GERI BILDIRIM SISTEMI (FEEDBACK)

> **Mevcut durum:** `src/components/FeedbackModal.tsx` — 3 tip (Hata/Oneri/Diger), textarea, Tauri IPC ile gonderim
> **Mevcut IPC:** `submit_feedback` — feedback request alir, suan sadece log yaziyor
> **Hedef:** PostgreSQL'de feedbacks tablosuna kayit, admin panelinde yonetim, sadece metin bazli geri bildirim

### 14.1 Geri Bildirim Validasyonu (KRITIK — Sadece Mesaj)

> **KURAL:** Geri bildirim alani SADECE duz metin (plain text) kabul eder.
> Hicbir dosya, resim, PDF, video, ses dosyasi veya eklenti KABUL EDILMEZ.
> Bu karar bilerek alinmistir — guvenlik, depolama ve moderasyon basitligi icin.

#### Backend Validasyonu (Rust)
- [ ] `submit_feedback` IPC komutunu guncelle — Prisma/PostgreSQL'e INSERT
- [ ] Mesaj validasyonu:
  - [ ] Minimum uzunluk: 10 karakter (cok kisa mesajlari reddet)
  - [ ] Maksimum uzunluk: 5000 karakter (DB limiti ile uyumlu)
  - [ ] Sadece UTF-8 text kabul et
  - [ ] HTML tag'leri strip et (XSS onleme — `ammonia` crate veya regex)
  - [ ] Base64 encoded icerik tespiti ve reddi (dosya gizleme onleme)
  - [ ] URL/link filtreleme: mesajda URL varsa kabul et ama tiklanabilir yapma (plain text olarak sakla)
  - [ ] Bos satir normalizasyonu: ardarda 3+ bos satiri 2'ye dusur
- [ ] Dosya ekleme YETENEGINI backend'de tamamen devre disi birak:
  - [ ] `submit_feedback` komutunda `file`, `attachment`, `binary` parametresi OLMAMALI
  - [ ] `Content-Type` kontrolu: sadece `application/json` kabul et
  - [ ] Multipart form data KABUL EDILMEZ
- [ ] Rate limiting: kullanici basina 5 feedback / saat (spam onleme)
- [ ] Anonim feedback: giris yapmamis kullanicilar da gonderebilir (userId nullable)
- [ ] IP adresi ve User-Agent kaydet (abuse takibi icin)
- [ ] Debug context'i otomatik ekle (studio, promptType, viewport — mevcut FeedbackModal'daki gibi)

#### Frontend Validasyonu (`src/components/FeedbackModal.tsx`)
- [ ] Textarea'ya dosya surukle-birak (drag & drop) DEVRE DISI:
  - [ ] `onDrop` event'ini `preventDefault` + `stopPropagation` ile engelle
  - [ ] `onDragOver` event'ini engelle
  - [ ] Kullaniciya "Dosya eklenemez, sadece mesaj yazabilirsiniz" toast goster
- [ ] Textarea'ya yapistirma (paste) kontrolu:
  - [ ] `onPaste` event'inde `clipboardData.types` kontrol et
  - [ ] `text/plain` DISINDA bir sey yapistirmaya calisilirsa engelle
  - [ ] Resim yapistirma (screenshot paste) engelle
  - [ ] Dosya yapistirma engelle
  - [ ] "Sadece metin yapistirabilirsiniz" toast goster
- [ ] Karakter sayaci goster: `${message.length}/5000`
  - [ ] 4500+ karakterde sari uyari rengi
  - [ ] 5000'e ulasinca kirmizi + input durdur
- [ ] Minimum 10 karakter kontrolu — submit butonu 10 karaktere kadar disabled
- [ ] Tip secimi zorunlu (bug/feature/other) — mevcut haliyle uyumlu
- [ ] Gonderim sonrasi basari mesaji + modal kapat (mevcut haliyle korunacak)
- [ ] `<input type="file">` KESINLIKLE EKLENMEYECEK — dosya yukleme UI'i yok
- [ ] Emoji destegi: emojiler text olarak kabul edilir (engellenmez)

### 14.2 Feedback Prisma Modeli

> Schema: BOLUM 3.8.2'de tanimli (Feedback model)

- [ ] Migration olustur: `bunx prisma migrate dev --name add_feedback_table`
- [ ] Seed data: ornek feedback kayitlari ekle (bug + feature + other)

### 14.3 Admin Feedback Yonetimi

- [ ] Admin Dashboard'a "Geri Bildirimler" sekme/sayfa ekle
- [ ] Feedback listesi: tarih, tip, kullanici, durum ile filtrelenebilir tablo
- [ ] Durum degistirme: pending -> reviewing -> resolved / dismissed
- [ ] Admin notu ekleme (adminNote alani)
- [ ] Toplu islem: secili feedback'leri arsivle / sil
- [ ] Istatistikler: bug vs feature vs other dagilimi, gunluk/haftalik grafik
- [ ] IPC komutlari:
  - [ ] `list_feedbacks` — admin: tum feedback'leri listele (pagination + filter)
  - [ ] `update_feedback_status` — admin: durum degistir
  - [ ] `add_feedback_note` — admin: not ekle
  - [ ] `delete_feedback` — super_admin: kalici silme
  - [ ] `get_feedback_stats` — admin: istatistikler

### 14.4 Feedback Seed Data

```typescript
// prisma/seed.ts icine eklenecek
await prisma.feedback.createMany({
  data: [
    {
      userId: freeUser.id,
      type: 'bug',
      message: 'Image Studio\'da 16:9 aspect ratio sectigimde cikan gorsel 1:1 oluyor. Chrome 124, Windows 11.',
      status: 'reviewing',
      debugContext: { studio: 'image', promptType: 'detailed', viewport: '1920x1080' },
      createdAt: new Date('2026-04-20T14:30:00Z'),
    },
    {
      userId: proUser.id,
      type: 'feature',
      message: 'Video Studio\'ya batch generation eklenebilir mi? 10 prompt birden gonderip sirayla uretim yapilsa cok iyi olur.',
      status: 'pending',
      debugContext: { studio: 'video', promptType: 'simple', viewport: '2560x1440' },
      createdAt: new Date('2026-04-22T09:15:00Z'),
    },
    {
      userId: adminUser.id,
      type: 'other',
      message: 'Dark mode\'da Marketing Studio\'daki bazi text\'ler cok acik renkte, okunmuyor. Kontrast artirilabilir.',
      status: 'resolved',
      adminNote: 'Tailwind class guncellendi, v2.4.1 ile fix yayinlandi.',
      resolvedBy: adminUser.id,
      resolvedAt: new Date('2026-04-23T11:00:00Z'),
      debugContext: { studio: 'marketing', viewport: '1440x900' },
      createdAt: new Date('2026-04-21T16:45:00Z'),
    },
    {
      // Anonim feedback (giris yapmamis kullanici)
      type: 'bug',
      message: 'Pricing sayfasindaki countdown timer bazen negatif sayi gosteriyor. Tarih gectiginde sifirda kalmali.',
      status: 'pending',
      debugContext: { viewport: '375x812' },
      ipAddress: '192.168.1.100',
      createdAt: new Date('2026-04-24T20:00:00Z'),
    },
  ],
});
```

- [ ] 4 ornek feedback seed et (bug, feature, other, anonim)
- [ ] Farkli durumlar: pending, reviewing, resolved
- [ ] Debug context ornekleri

---

## BOLUM 15: STRIPE ODEME ALTYAPISI (EK GEREKSINIMLER)

> **Mevcut Stripe entegrasyonu:** BOLUM 9B'de detayli abonelik sistemi tanimli
> **Bu bolum:** Promtx'e ozel ek Stripe gereksinimleri, mevcut Checkout/Pricing ile uyum

### 15.1 Stripe Urun Yapisi (Promtx Pricing ile Uyum)

> **Kaynak:** `src/pages/Pricing.tsx` — 3 tier: STARTER ($0), CREATOR ($29), STUDIO PRO ($69)
> **Kaynak:** `src/pages/Checkout.tsx` — TL/USD cift para birimi, KDV hesabi, promo code

- [ ] Stripe Dashboard Product ayarlari:
  - [ ] Product metadata'ya `promtx_plan` ekle (starter/creator/studio_pro)
  - [ ] Product metadata'ya `monthly_credits` ekle (100/5000/15000)
  - [ ] Product description Turkce ve Ingilizce
- [ ] Stripe Tax ayarlari:
  - [ ] Turkiye KDV (%20) otomatik hesaplama: `automatic_tax: { enabled: true }`
  - [ ] Tax ID toplama: `tax_id_collection: { enabled: true }` (kurumsal musteriler icin)
  - [ ] Mevcut `Checkout.tsx`'teki %20 KDV hesabini Stripe'a devret (cift hesaplama onleme)
- [ ] Stripe Currency ayarlari:
  - [ ] Primary currency: USD
  - [ ] Mevcut `Checkout.tsx`'teki TL gosterimi icin: Stripe `currency: 'usd'` + frontend'de exchange rate ile TL goster (mevcut haliyle korunacak)
  - [ ] Exchange rate API: `open.er-api.com/v6/latest/USD` (mevcut Checkout.tsx'te var)
- [ ] Stripe Checkout Session olusturma ayarlari:
  - [ ] `allow_promotion_codes: true` (mevcut — Stripe tarafli promo code)
  - [ ] `billing_address_collection: 'auto'`
  - [ ] `customer_email` prefill (mevcut store'daki email)
  - [ ] `payment_method_types: ['card']` (Turkiye icin sadece kart)
  - [ ] `locale: 'tr'` (Turkce checkout deneyimi)
- [ ] Stripe Checkout branding:
  - [ ] Logo yukle (Promtx logo)
  - [ ] Brand color ayarla
  - [ ] Stripe Dashboard -> Settings -> Branding

### 15.2 Tek Seferlik Kredi Yukleme (Top-Up) — Mevcut Sistem Korunacak

> **Mevcut:** `create_checkout_session()` tek seferlik PaymentIntent, `mode: "payment"`
> **Kural:** Abonelik + tek seferlik yukleme BIRLIKTE calisacak

- [ ] Kredi paketleri tanimla:

| Paket | Kredi | Fiyat (USD) | Stripe Price ID |
|-------|-------|-------------|-----------------|
| Kucuk | 500 | $9.99 | `price_topup_500` |
| Orta | 2000 | $29.99 | `price_topup_2000` |
| Buyuk | 5000 | $59.99 | `price_topup_5000` |
| Mega | 15000 | $149.99 | `price_topup_15000` |

- [ ] Stripe'da one-time Price'lar olustur (`type: 'one_time'`)
- [ ] `create_topup_session` IPC komutu: mevcut `create_checkout_session` uzerine kurulacak
- [ ] Top-up basarili olunca: wallet'a kredi ekle + ledger entry (TransactionReason::TopUp)
- [ ] Top-up receipt PDF olustur (mevcut `generate_receipt` fonksiyonu)
- [ ] Checkout sayfasinda top-up paket secimi bilesen'i:
  - [ ] `/checkout/topup` route ekle
  - [ ] Kredi paketi kartlari (miktar + fiyat + "en populer" badge)

### 15.3 Stripe Promo Code Entegrasyonu

> **Mevcut:** `validate_promo_code()` — hardcoded 3 kod: PROMTX20, LAUNCH50, WELCOME10
> **Hedef:** Stripe Coupon/Promotion Code + DB PromoCode tablosu senkronizasyonu

- [ ] Stripe Dashboard'da Coupon'lar olustur:
  - [ ] `PROMTX20` — %20 indirim (tum planlar)
  - [ ] `LAUNCH50` — %50 indirim (ilk 3 ay)
  - [ ] `WELCOME10` — %10 indirim (ilk ay)
  - [ ] Yeni: `ANNUAL25` — %25 indirim (sadece yillik planlar)
- [ ] Stripe Promotion Code'lari Coupon'lara bagla
- [ ] Mevcut `validate_promo_code()` fonksiyonunu guncelle:
  - [ ] Once DB'den kontrol et (PromoCode tablosu)
  - [ ] DB'de yoksa Stripe API'den kontrol et: `GET /v1/promotion_codes?code=XXX`
  - [ ] Gecerlilik kontrol: expiry, max_uses, min_purchase
- [ ] Checkout'ta promo code uygulamasi:
  - [ ] Abonelik: `subscription_data.discounts` ile Stripe tarafli indirim
  - [ ] Top-up: `discounts` ile Stripe tarafli indirim
  - [ ] Mevcut frontend promo code input'u korunacak (`Checkout.tsx` line 66-74)

### 15.4 Stripe Fatura ve Receipt Yonetimi

> **Mevcut:** `generate_receipt()` — jsPDF ile PDF olusturma (calisiyor)

- [ ] Stripe Invoice ayarlari:
  - [ ] Otomatik fatura olusturma: abonelik odemeleri icin
  - [ ] Fatura numarasi formati: `PROMTX-2026-XXXX`
  - [ ] Fatura PDF'i Stripe'dan indirilebilir (Customer Portal)
- [ ] Mevcut `generate_receipt()` ile Stripe Invoice senkronizasyonu:
  - [ ] Stripe invoice URL'ini Receipt tablosunda sakla
  - [ ] Hem Stripe faturasi hem Promtx receipt PDF'i olustur
- [ ] Receipt'lari Settings sayfasinda listele:
  - [ ] Tarih, tutar, durum, PDF indirme butonu
  - [ ] Stripe Customer Portal'dan da erisilebilir

### 15.5 Stripe Guvenlik

- [ ] Webhook imza dogrulamasi: `stripe.webhooks.constructEvent()` (mevcut HMAC var)
- [ ] Idempotency: StripeEvent tablosunda event.id ile tekrar kontrol (BOLUM 9B.9'da tanimli)
- [ ] Stripe API key rotasyonu proseduru belgele
- [ ] PCI DSS uyumluluk: kart bilgileri ASLA Promtx sunucularinda saklanmaz (Stripe Elements kullan)
- [ ] Stripe Radar (fraud detection) aktif et
- [ ] Test/Live mode gecis kontrol listesi:
  - [ ] Tum `sk_test_` -> `sk_live_` degisimi
  - [ ] Tum `pk_test_` -> `pk_live_` degisimi
  - [ ] Webhook secret guncelleme
  - [ ] Product/Price ID'lerin live ortamda yeniden olusturulmasi
  - [ ] Customer Portal live URL

### 15.6 Mevcut Checkout.tsx Uyumluluk Kontrol Listesi

> **Kaynak:** `src/pages/Checkout.tsx` — TL/USD, exchange rate, promo code, KDV

- [ ] Mevcut exchange rate API (`open.er-api.com`) korunacak — sadece gorsel amaçli TL gosterimi
- [ ] Mevcut promo code input'u korunacak — backend validation ile calisacak
- [ ] Mevcut KDV (%20) hesabi: Stripe Tax aktif edilince frontend'den kaldirilacak veya sadece preview olarak kalacak
- [ ] Mevcut `handlePayment` fonksiyonu: `create_checkout_session` IPC -> Stripe URL -> openUrl (Tauri)
- [ ] Web (Vercel) icin: `window.location.href` ile Stripe Checkout'a yonlendir (openUrl yerine)
- [ ] Success callback: `/checkout/success` route'u
- [ ] Cancel callback: `/checkout/cancel` route'u

---

## BOLUM 16: SAYFA BAZLI POSTGRESQL GECIS GEREKSINIMLERI

> **Kapsam:** Her kullaniciya dokunan sayfanin PostgreSQL + Prisma gecisinde
> yapilmasi gereken spesifik isler. Bu bolum diger bolumlerdeki genel gereksinimleri
> sayfa bazinda somutlastirir.

---

### 16.1 GIRIS / KAYIT (Login & Register — `src/components/LoginModal.tsx`)

> **Mevcut:** `LoginModal.tsx` — 3 tab (login/register/forgot), email+password, Google OAuth, SSO placeholder
> **Mevcut IPC:** `login`, `register`, `google_login`, `forgot_password`
> **Mevcut Store:** `useAppStore` — `isAuthenticated`, `userToken`, `email`, `role`, `id`

#### 16.1.1 Register Flow (Kayit) — PostgreSQL Gecisi
- [ ] `register` IPC komutu guncelle:
  - [ ] `User` + `Wallet` + `Subscription(starter)` atomik transaction (tek islemde 3 tablo INSERT)
  - [ ] UUID `id` donmeli (`@id @default(uuid())`)
  - [ ] `passwordHash` argon2 ile hash'lenmeli (mevcut — degisiklik yok)
  - [ ] `role: 'free'` default (mevcut — degisiklik yok)
  - [ ] `isEmailVerified: false` default (yeni alan)
  - [ ] `locale`, `timezone` otomatik algilanmali (frontend'den gonderilmeli)
  - [ ] `createdAt` TIMESTAMPTZ olarak kaydedilmeli
  - [ ] `RETURNING id, email, role` ile response donmeli
  - [ ] Duplicate email kontrolu: `@unique` constraint -> `P2002` Prisma error handle
- [ ] Email dogrulama flow'u ekle:
  - [ ] Kayit sonrasi dogrulama email'i gonder (Resend API)
  - [ ] Email dogrulama token'i olustur (24 saat gecerli)
  - [ ] `/auth/verify-email?token=xxx` endpoint'i
  - [ ] `isEmailVerified` true yap
  - [ ] Dogrulanmamis hesaplar icin kisitlama: generation limiti (ornegin 10 kredi)
- [ ] Kayit sonrasi otomatik islemler:
  - [ ] Wallet olustur: `credits: 100` (Starter default)
  - [ ] Subscription olustur: `plan: 'starter'`, `status: 'active'`, `monthlyCredits: 100`
  - [ ] Stripe Customer olustur: `get_or_create_customer()` (BOLUM 9B.3)
  - [ ] Hosgeldin notification olustur (Notification tablosu)
  - [ ] AuditLog kaydi: `action: 'user.register'`
  - [ ] Referral kodu varsa: Referral tablosuna kaydet, bonus kredi ekle
- [ ] Frontend register form validasyonu (mevcut — genisletilecek):
  - [ ] Mevcut: ad, email, sifre, sifre tekrar (korunacak)
  - [ ] Mevcut: sifre guc cubugu (korunacak)
  - [ ] Mevcut: yaygın sifre kontrolu (korunacak)
  - [ ] Yeni: email format validasyonu (RFC 5322)
  - [ ] Yeni: Terms of Service + Privacy Policy onay checkbox'u (zorunlu)
  - [ ] Yeni: Kayit basarili -> email dogrulama sayfasina yonlendir
- [ ] Register response'da UUID formatinda `userId` donmeli (mevcut TEXT -> UUID)

#### 16.1.2 Login Flow (Giris) — PostgreSQL Gecisi
- [ ] `login` IPC komutu guncelle:
  - [ ] `WHERE email = $1` sorgusu PostgreSQL uyumlu (mevcut — degisiklik yok)
  - [ ] Password verify: argon2 (mevcut — degisiklik yok)
  - [ ] `loginCount` increment: `UPDATE users SET login_count = login_count + 1`
  - [ ] `lastLoginAt` guncelle: `NOW()` (TIMESTAMPTZ)
  - [ ] `failedLoginCount` yonetimi:
    - [ ] Basarisiz giris: `failed_login_count + 1`
    - [ ] 5 basarisiz giris: hesabi 15dk kilitle (`locked_until = NOW() + INTERVAL '15 minutes'`)
    - [ ] 10 basarisiz giris: hesabi 1 saat kilitle
    - [ ] Basarili giris: `failed_login_count = 0, locked_until = NULL`
  - [ ] `locked_until` kontrolu: `WHERE locked_until IS NULL OR locked_until < NOW()`
  - [ ] `isFrozen` kontrolu: donmus hesaplar giris yapamaz
  - [ ] Session olustur: `INSERT INTO sessions` (tokenHash, ipAddress, userAgent, deviceFingerprint)
  - [ ] JWT token olustur: `{ sub: userId, role, email, iat, exp }`
  - [ ] Refresh token olustur: `INSERT INTO refresh_tokens`
  - [ ] AuditLog kaydi: `action: 'user.login'`, IP + user agent
  - [ ] SecurityEvent: yeni cihaz/IP'den giris -> bildirim
- [ ] Frontend login sonrasi:
  - [ ] `setUserToken(token)` — mevcut (korunacak)
  - [ ] `setSubscriptionTier(role)` — mevcut (korunacak)
  - [ ] Yeni: `setUserId(userId)` — UUID formatinda
  - [ ] Yeni: `setEmail(email)` — store'a kaydet
  - [ ] Yeni: Wallet bakiyesini cek ve store'a kaydet
  - [ ] Yeni: Subscription bilgisini cek (plan, kredi, periyod)
  - [ ] Yeni: Okunmamis bildirim sayisini cek

#### 16.1.3 Google OAuth Login — PostgreSQL Gecisi
- [ ] `google_login` IPC komutu guncelle:
  - [ ] `Account` tablosuna `UPSERT` (`INSERT ... ON CONFLICT (provider, providerAccountId) DO UPDATE`)
  - [ ] `User` tablosuna `UPSERT` (email bazli — yoksa olustur, varsa login)
  - [ ] `passwordHash` NULL (Google ile giris yapanlar icin sifre yok)
  - [ ] `isEmailVerified: true` (Google zaten dogrulamis)
  - [ ] `avatarUrl` Google profile photo URL'si ile set et
  - [ ] `displayName` Google display name ile set et (eger bos ise)
  - [ ] Ilk Google login ise: Wallet + Subscription + Stripe Customer olustur (register ile ayni)
  - [ ] Session + JWT + Refresh token (login ile ayni)
- [ ] Frontend Google login butonu (mevcut `handleGoogle` — korunacak):
  - [ ] Deep-link callback: `deep-link://oauth-callback` (mevcut)
  - [ ] Web icin: redirect-based OAuth flow (yeni)
  - [ ] Token alma ve store'a kaydetme (mevcut)

#### 16.1.4 Sifremi Unuttum — PostgreSQL Gecisi
- [ ] `forgot_password` IPC komutu guncelle:
  - [ ] Password reset token olustur: `INSERT INTO password_reset_tokens` (yeni tablo veya SecurePayload kullan)
  - [ ] Token hash'le (argon2 veya SHA-256) ve DB'ye kaydet
  - [ ] Token 1 saat gecerli (`expires_at`)
  - [ ] Resend API ile sifre sifirlama email'i gonder
  - [ ] Rate limiting: ayni email icin 3 istek / saat
- [ ] `reset_password` IPC komutu (yeni):
  - [ ] Token dogrula (hash kontrolu + expiry)
  - [ ] Yeni sifreyi argon2 ile hash'le
  - [ ] `UPDATE users SET password_hash = $1 WHERE id = $2`
  - [ ] Tum mevcut session'lari revoke et (`UPDATE sessions SET status = 'revoked'`)
  - [ ] Tum refresh token'lari revoke et
  - [ ] AuditLog: `action: 'user.password_reset'`
  - [ ] Basarili sifirlama email'i gonder

#### 16.1.5 Logout — PostgreSQL Gecisi
- [ ] `logout` IPC komutu guncelle:
  - [ ] Session status: `UPDATE sessions SET status = 'logged_out' WHERE id = $1`
  - [ ] Refresh token revoke: `UPDATE refresh_tokens SET is_revoked = true WHERE session_id = $1`
  - [ ] AuditLog: `action: 'user.logout'`
- [ ] Frontend: mevcut `logout()` store action korunacak + token temizleme

---

### 16.2 PROMPT GECMISI (Prompt History — `src/lib/store.ts` + `src-tauri/src/ipc/commands/`)

> **Mevcut Frontend:** `useAppStore` — `promptHistory: PromptHistoryItem[]`, `addPromptToHistory()`, `toggleFavorite()`, `deletePromptFromHistory()`, `clearPromptHistory()`
> **Mevcut DB:** `prompt_history` tablosu (SQLite) — `PromptHistory` Prisma modeli (BOLUM 3.4)
> **Mevcut IPC:** `save_prompt_history`, `get_prompt_history`

#### 16.2.1 Prompt History Backend — PostgreSQL Gecisi
- [ ] `save_prompt_history` IPC guncelle:
  - [ ] `INSERT INTO prompt_history` PostgreSQL syntax
  - [ ] UUID `id` (mevcut TEXT -> UUID)
  - [ ] `userId` FK — zorunlu (giris yapmis kullanici)
  - [ ] `studioType` enum (8 studio: image/video/cinema/audio/character/fashion/marketing/edit)
  - [ ] `promptText` — olusturulan prompt metni
  - [ ] `generatedOutput` — AI ciktisi (nullable, buyuk olabilir)
  - [ ] `modelId` — kullanilan AI model (gemini-2.0-flash vs.)
  - [ ] `provider` — AIProvider enum (google/openai/anthropic/replicate...)
  - [ ] `parameters` — JSONB (formData, aspect ratio, quality settings vs.)
  - [ ] `qualityScore` — kullanici puani (nullable, 1-5)
  - [ ] `isFavorite` — favori isaretleme (default false)
  - [ ] `tags` — String[] (PostgreSQL array, aranabilir)
  - [ ] `createdAt` — TIMESTAMPTZ
  - [ ] RETURNING id, createdAt
- [ ] `get_prompt_history` IPC guncelle:
  - [ ] Cursor-based pagination: `WHERE created_at < $cursor ORDER BY created_at DESC LIMIT 50`
  - [ ] Filtreler:
    - [ ] `studioType` filtresi (tek veya coklu)
    - [ ] `isFavorite = true` filtresi (sadece favoriler)
    - [ ] `tags @> ARRAY['tag1']` filtresi (tag bazli arama)
    - [ ] `provider` filtresi
    - [ ] Tarih araligi: `created_at BETWEEN $start AND $end`
  - [ ] Full-text search: `promptText` icinde arama (PostgreSQL `ILIKE` veya `tsvector`)
  - [ ] Response: `{ items: PromptHistoryItem[], nextCursor: string | null, totalCount: number }`
- [ ] `toggle_favorite` IPC (yeni veya mevcut guncelle):
  - [ ] `UPDATE prompt_history SET is_favorite = NOT is_favorite WHERE id = $1 AND user_id = $2`
  - [ ] Yetki kontrolu: sadece kendi prompt'larini favoriye alabilir
- [ ] `delete_prompt_history` IPC (yeni):
  - [ ] `DELETE FROM prompt_history WHERE id = $1 AND user_id = $2`
  - [ ] Soft delete yerine hard delete (kullanici verisi, GDPR uyumlu silme)
- [ ] `clear_prompt_history` IPC (yeni):
  - [ ] `DELETE FROM prompt_history WHERE user_id = $1`
  - [ ] Onay gerektir (tehlikeli islem — frontend'de onay dialog'u)
- [ ] `rate_prompt` IPC (yeni):
  - [ ] `UPDATE prompt_history SET quality_score = $1 WHERE id = $2 AND user_id = $3`
  - [ ] Score: 1-5 arasi (integer)
- [ ] `add_tags_to_prompt` IPC (yeni):
  - [ ] `UPDATE prompt_history SET tags = tags || $1 WHERE id = $2 AND user_id = $3`
  - [ ] Duplicate tag eklemeyi onle

#### 16.2.2 Prompt History Frontend — PostgreSQL Gecisi
- [ ] `PromptHistoryItem` tip guncelle:
  ```typescript
  interface PromptHistoryItem {
    id: string;           // UUID (mevcut: nanoid)
    studioType: StudioType;
    promptText: string;
    generatedOutput?: string;
    modelId?: string;
    provider?: string;
    parameters: Record<string, any>; // JSONB
    qualityScore?: number;  // 1-5 (yeni)
    isFavorite: boolean;
    tags: string[];         // (yeni)
    createdAt: string;      // ISO 8601 with timezone
  }
  ```
- [ ] Zustand store'dan Prompt History'yi PostgreSQL'e tasima:
  - [ ] Mevcut: `promptHistory` state + localStorage persist -> Kaldirilacak
  - [ ] Yeni: Her islem IPC uzerinden DB'ye gidecek
  - [ ] `addPromptToHistory()` -> `invoke('save_prompt_history', { ... })`
  - [ ] `toggleFavorite()` -> `invoke('toggle_favorite', { id })`
  - [ ] `deletePromptFromHistory()` -> `invoke('delete_prompt_history', { id })`
  - [ ] `clearPromptHistory()` -> `invoke('clear_prompt_history')` + onay dialog
- [ ] Prompt History UI bilesen'i (mevcut veya yeni):
  - [ ] Infinite scroll / pagination (50 item per page)
  - [ ] Studio tipi filtre butonlari (8 studio icon'u)
  - [ ] "Sadece Favoriler" toggle switch
  - [ ] Arama cubugu (prompt text icinde search)
  - [ ] Tag filtreleme (tag chip'leri)
  - [ ] Tarih araligi secici (date range picker)
  - [ ] Her prompt karti: studio icon, prompt preview, model, tarih, favori yildizi, puan
  - [ ] Prompt kartina tikla -> prompt detayi dialog (tam metin + output + parameters)
  - [ ] "Tekrar Kullan" butonu — prompt'u ilgili studio'ya yukle
  - [ ] "Sil" butonu — onay dialog ile
  - [ ] Bos durum: "Henuz prompt gecmisiniz yok" empty state

---

### 16.3 BILLING (Faturalama — `src/pages/Pricing.tsx` + `src/pages/Checkout.tsx`)

> **Mevcut:** Pricing.tsx (3 tier), Checkout.tsx (TL/USD, promo, KDV), billing.rs (PaymentIntent, Checkout Session, Webhook)
> **Prisma:** Wallet, LedgerEntry, Subscription, SubscriptionHistory, Receipt, StripeEvent, IapTransaction
> **Detayli Stripe abonelik:** BOLUM 9B (korunacak)
> **Ek Stripe detaylari:** BOLUM 15 (korunacak)

#### 16.3.1 Billing Sayfalari — PostgreSQL Gecisi
- [ ] **Pricing Sayfasi** (`src/pages/Pricing.tsx`):
  - [ ] Mevcut 3 tier yapisi korunacak (STARTER/CREATOR/STUDIO PRO)
  - [ ] Kullanicinin aktif plan'ini DB'den cek ve highlight et:
    - [ ] `invoke('get_subscription_status')` -> `{ plan, status, credits, periodEnd }`
    - [ ] Aktif plan'a "Mevcut Plan" badge goster
    - [ ] Daha dusuk planlara "Downgrade" butonu, yuksek planlara "Upgrade" butonu
  - [ ] Aylik/Yillik toggle switch (BOLUM 9B.10'da tanimli)
  - [ ] Fiyat gosterimi: mevcut CountdownTimer korunacak
  - [ ] "Basla" butonu davranisi:
    - [ ] Giris yapmamis: LoginModal ac (register tab)
    - [ ] Starter (mevcut): "Mevcut Plan" goster
    - [ ] Creator/Studio Pro: `invoke('create_subscription_checkout', { priceId })` -> Stripe URL
- [ ] **Checkout Sayfasi** (`src/pages/Checkout.tsx`):
  - [ ] Mevcut TL/USD exchange rate korunacak
  - [ ] Mevcut promo code input korunacak
  - [ ] Mevcut KDV (%20) hesabi: Stripe Tax ile senkronize
  - [ ] `handlePayment` fonksiyonu:
    - [ ] Tauri: `invoke('create_checkout_session')` veya `invoke('create_subscription_checkout')` -> openUrl
    - [ ] Web: ayni invoke -> `window.location.href = stripeUrl`
  - [ ] Checkout tamamlandiktan sonra:
    - [ ] Wallet bakiyesini yeniden cek
    - [ ] Subscription status yeniden cek
    - [ ] Store'u guncelle
- [ ] **Checkout Success sayfasi** (yeni: `/checkout/success`):
  - [ ] Stripe redirect sonrasi gosterilecek
  - [ ] "Odemeniz basariyla alindi" mesaji
  - [ ] Yeni kredi bakiyesi goster
  - [ ] "Studio'ya Don" butonu
- [ ] **Checkout Cancel sayfasi** (yeni: `/checkout/cancel`):
  - [ ] "Islem iptal edildi" mesaji
  - [ ] "Pricing'e Don" butonu

#### 16.3.2 Wallet & Ledger — PostgreSQL Gecisi
- [ ] `get_wallet_balance` IPC guncelle:
  - [ ] `SELECT credits, lifetime_credits, currency FROM wallets WHERE user_id = $1`
  - [ ] `Decimal` -> frontend'de `number` olarak donmeli
  - [ ] Response: `{ credits: number, lifetimeCredits: number, currency: string }`
- [ ] `get_ledger_history` IPC guncelle:
  - [ ] `SELECT * FROM ledger_entries WHERE user_id = $1 ORDER BY created_at DESC`
  - [ ] Cursor-based pagination
  - [ ] Filtreler: `type` (credit/debit/refund...), tarih araligi
  - [ ] Response: `{ items: LedgerEntry[], nextCursor, totalCount }`
- [ ] `create_topup_session` IPC guncelle (mevcut — PostgreSQL uyarla):
  - [ ] Stripe Checkout Session olustur (`mode: 'payment'`)
  - [ ] Basarili odeme sonrasi: `INSERT INTO ledger_entries` + `UPDATE wallets SET credits = credits + $amount`
  - [ ] Transaction: wallet + ledger atomik (tek transaction)
- [ ] Kredi harcama (her prompt generation'da):
  - [ ] `pricing_matrix` tablosundan model maliyetini cek
  - [ ] `UPDATE wallets SET credits = credits - $cost WHERE user_id = $1 AND credits >= $cost`
  - [ ] Yetersiz kredi: islem reddi + "Kredi yetersiz" dialog (BOLUM 9B.10'da tanimli)
  - [ ] `INSERT INTO ledger_entries` (type: 'debit', description: model + studio)

#### 16.3.3 Receipt & Fatura — PostgreSQL Gecisi
- [ ] `download_receipt` IPC guncelle:
  - [ ] `SELECT * FROM receipts WHERE id = $1 AND user_id = $2`
  - [ ] Mevcut jsPDF + autoTable PDF olusturma korunacak
  - [ ] `invoice_number` formati: `PROMTX-2026-XXXX`
  - [ ] `billing_address` JSONB'den oku
- [ ] Receipt listesi IPC (yeni: `get_receipts`):
  - [ ] `SELECT * FROM receipts WHERE user_id = $1 ORDER BY created_at DESC`
  - [ ] Pagination
  - [ ] Settings sayfasinda veya ayri bir `/billing/receipts` sayfasinda goster
- [ ] Her odeme sonrasi otomatik Receipt olustur:
  - [ ] `INSERT INTO receipts` (order_id, amount, currency, tax_amount, status)
  - [ ] PDF generate et ve S3'e yukle (veya lokal sakla)
  - [ ] `pdf_url` ve `s3_key` kaydet

---

### 16.4 ACCOUNTS (Hesap Yonetimi — `src/components/AccountCenter.tsx` + `src/pages/Settings.tsx`)

> **Mevcut AccountCenter:** Kredi bakiyesi, session suresi, harcama grafigi
> **Mevcut Settings:** Email, dil, tema, geri bildirim, data export, neural engine, referral
> **Prisma:** User, Account, Session, ApiKey, Notification

#### 16.4.1 Hesap Bilgileri — PostgreSQL Gecisi
- [ ] **Profil Bilgileri** (Settings sayfasinda):
  - [ ] Email gosterimi: DB'den cek (mevcut store'dan — degisiklik yok)
  - [ ] Display name gosterimi ve duzenleme:
    - [ ] `invoke('set_display_name', { displayName })` — mevcut IPC
    - [ ] `UPDATE users SET display_name = $1 WHERE id = $2`
  - [ ] Avatar yukleme ve gosterim:
    - [ ] `invoke('upload_avatar', { file })` — mevcut IPC
    - [ ] Avatar S3'e yukle veya base64 olarak sakla
    - [ ] `UPDATE users SET avatar_url = $1 WHERE id = $2`
  - [ ] Dil tercihi kaydetme:
    - [ ] `UPDATE users SET locale = $1 WHERE id = $2` (mevcut frontend'de localStorage — DB'ye tasima)
  - [ ] Timezone:
    - [ ] `UPDATE users SET timezone = $1 WHERE id = $2`
    - [ ] Otomatik algilansin (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- [ ] **Bagli Hesaplar** (Accounts tablosu):
  - [ ] Bagli OAuth provider'lari listele:
    - [ ] `invoke('get_linked_accounts')` (yeni IPC)
    - [ ] `SELECT provider, provider_account_id, created_at FROM accounts WHERE user_id = $1`
    - [ ] Google baglanmis ise: Google icon + email goster
  - [ ] Yeni provider bagla:
    - [ ] "Google Hesabi Bagla" butonu (eger henuz baglanmamissa)
    - [ ] OAuth flow -> Account tablosuna INSERT
  - [ ] Provider baglantisini kes:
    - [ ] "Baglantıyı Kes" butonu (en az 1 giris yontemi kalmali — email+password veya baska provider)
    - [ ] `DELETE FROM accounts WHERE user_id = $1 AND provider = $2`
    - [ ] Kontrol: son giris yontemini silmeye izin verme
- [ ] **Sifre Degistirme**:
  - [ ] `invoke('change_password', { currentPassword, newPassword })` (yeni IPC)
  - [ ] Mevcut sifreyi dogrula (argon2 verify)
  - [ ] Yeni sifreyi hash'le ve kaydet
  - [ ] Diger tum session'lari revoke et (opsiyonel — "Diger cihazlardan cikis yap" checkbox)
  - [ ] AuditLog: `action: 'user.password_change'`
- [ ] **2FA / TOTP Yonetimi**:
  - [ ] `invoke('setup_2fa')` — mevcut IPC
  - [ ] TOTP secret olustur, QR code goster
  - [ ] `invoke('verify_mfa', { code })` — mevcut IPC
  - [ ] Dogrulama sonrasi: `UPDATE users SET totp_enabled = true, totp_secret = $1`
  - [ ] 2FA devre disi birakma: sifre dogrulamasi + `UPDATE users SET totp_enabled = false, totp_secret = NULL`
  - [ ] Yedek kodlar (backup codes) — SecurePayload tablosunda saklama
- [ ] **API Key Yonetimi**:
  - [ ] `invoke('create_api_key_cmd')` — mevcut IPC
  - [ ] Key listesi: `SELECT key_prefix, name, scopes, last_used_at, is_active FROM api_keys WHERE user_id = $1`
  - [ ] Key olustur: `ptx_` prefix + rastgele 32 karakter, hash'le ve kaydet
  - [ ] Key sil: `UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2`
  - [ ] Key scope yonetimi: `['read', 'write', 'generate']`

#### 16.4.2 AccountCenter Bilesen'i — PostgreSQL Gecisi
- [ ] **Kredi Bakiyesi** (mevcut — DB'den cek):
  - [ ] Mevcut `userCredits` store value -> DB'den anlik cek
  - [ ] `invoke('get_wallet_balance')` -> `{ credits, lifetimeCredits }`
  - [ ] Progress bar: `creditsUsedThisPeriod / monthlyCredits` orani
  - [ ] "Kredi Yukle" butonu -> Checkout sayfasi
- [ ] **Abonelik Durumu** (yeni — AccountCenter'a ekle):
  - [ ] Aktif plan adi (Starter/Creator/Studio Pro)
  - [ ] Sonraki yenileme tarihi (`currentPeriodEnd`)
  - [ ] Iptal durumu varsa: "X tarihinde sona erecek" uyarisi
  - [ ] "Plani Degistir" butonu -> Pricing sayfasi
- [ ] **Session Suresi** (mevcut — degisiklik yok):
  - [ ] Mevcut elapsed time sayaci korunacak
- [ ] **Bildirimler** (yeni):
  - [ ] Okunmamis bildirim sayisi badge
  - [ ] `invoke('get_notifications', { unreadOnly: true })` -> `Notification[]`
  - [ ] Bildirim listesi dropdown/modal
  - [ ] Okundu isaretleme: `UPDATE notifications SET is_read = true, read_at = NOW()`

#### 16.4.3 Data Export — PostgreSQL Gecisi
- [ ] Mevcut `handleExportData` (Settings.tsx) guncelle:
  - [ ] Mevcut: local store'dan JSON export (email, tier, credits, usage)
  - [ ] Yeni: DB'den tum kullanici verisini cek ve export et:
    - [ ] `invoke('export_user_data')` (yeni IPC)
    - [ ] User profil bilgileri
    - [ ] Prompt history (tum kayitlar)
    - [ ] Wallet + ledger history
    - [ ] Image generations
    - [ ] DNA vault
    - [ ] Conversations + messages
  - [ ] GDPR uyumlu: kullanici tum verisini indirebilmeli
  - [ ] Format: JSON (mevcut) + opsiyonel CSV

#### 16.4.4 Hesap Silme (Account Deletion)
- [ ] `invoke('delete_account')` (yeni IPC):
  - [ ] Sifre dogrulamasi gerektir
  - [ ] Stripe aboneligi iptal et (aninda)
  - [ ] 30 gun soft delete suresi (geri alinabilir)
  - [ ] `UPDATE users SET deleted_at = NOW(), is_frozen = true`
  - [ ] 30 gun sonra hard delete: tum iliskili veriler CASCADE silinir
  - [ ] AuditLog: `action: 'user.delete_request'`
  - [ ] Iptal email'i gonder: "Hesabiniz 30 gun icinde silinecek"
  - [ ] Geri alma linki: "Hesabinizi geri almak icin tiklayin"

---

### 16.5 USERS (Kullanici Yonetimi — Admin — `src/pages/AdminDashboard.tsx`)

> **Mevcut:** AdminDashboard.tsx — kullanici listesi, audit log, metrikler, freeze/unfreeze
> **Mevcut IPC:** `admin_get_users`, `admin_freeze_user`, `admin_update_credits`, `admin_logs`, `impersonate_user`
> **Prisma:** User, Wallet, Subscription, AuditLog, Session

#### 16.5.1 Kullanici Listesi — PostgreSQL Gecisi
- [ ] `admin_get_users` IPC guncelle:
  - [ ] `SELECT u.*, w.credits, s.plan, s.status FROM users u LEFT JOIN wallets w ON w.user_id = u.id LEFT JOIN subscriptions s ON s.user_id = u.id`
  - [ ] Cursor-based veya offset pagination: `LIMIT 25 OFFSET $offset`
  - [ ] Arama: `WHERE email ILIKE '%$term%' OR display_name ILIKE '%$term%'`
  - [ ] Filtreler:
    - [ ] Role: `WHERE role = $role` (free/pro/enterprise/admin/super_admin)
    - [ ] Durum: `WHERE is_frozen = true/false`
    - [ ] Plan: `WHERE s.plan = $plan` (starter/creator/studio_pro)
    - [ ] Kayit tarihi: `WHERE created_at BETWEEN $start AND $end`
  - [ ] Siralama: `ORDER BY created_at DESC` (default), `email ASC`, `login_count DESC`
  - [ ] Response:
    ```typescript
    {
      users: {
        id: string;
        email: string;
        displayName: string | null;
        role: UserRole;
        isFrozen: boolean;
        isEmailVerified: boolean;
        loginCount: number;
        lastLoginAt: string | null;
        credits: number;
        plan: SubscriptionPlan;
        subscriptionStatus: SubscriptionStatus;
        createdAt: string;
      }[];
      totalCount: number;
      page: number;
      pageSize: number;
    }
    ```
- [ ] Frontend kullanici listesi tablosu:
  - [ ] Mevcut `UserRecord` interface guncelle (subscription, credits ekle)
  - [ ] Tablo sutunlari: Email, Ad, Rol, Plan, Kredi, Durum, Son Giris, Kayit Tarihi
  - [ ] Arama cubugu (mevcut `searchTerm` — korunacak)
  - [ ] Filtre dropdown'lari (role, plan, durum)
  - [ ] Pagination kontrolleri (onceki/sonraki/sayfa numarasi)

#### 16.5.2 Kullanici Detay & Islemleri — PostgreSQL Gecisi
- [ ] **Kullanici Detay Sayfasi** (yeni veya modal):
  - [ ] Profil bilgileri: email, displayName, avatarUrl, role, locale, timezone
  - [ ] Hesap durumu: isFrozen, isEmailVerified, loginCount, lastLoginAt, failedLoginCount
  - [ ] Bagli hesaplar: Account tablosundaki provider'lar
  - [ ] Abonelik: plan, status, currentPeriodEnd, creditsUsed/monthlyCredits
  - [ ] Wallet: credits, lifetimeCredits
  - [ ] Son aktivite: son 10 audit log kaydi
  - [ ] Session listesi: aktif session'lar (IP, cihaz, tarih)
- [ ] **Kullanici Dondurma/Acma**:
  - [ ] `admin_freeze_user` IPC guncelle:
    - [ ] `UPDATE users SET is_frozen = $1 WHERE id = $2`
    - [ ] Dondurulunca: tum aktif session'lari revoke et
    - [ ] AuditLog: `action: 'admin.freeze_user'` veya `'admin.unfreeze_user'`
    - [ ] Notification: kullaniciya "Hesabiniz donduruldu" bildirimi
- [ ] **Kredi Yonetimi**:
  - [ ] `admin_update_credits` IPC guncelle:
    - [ ] `UPDATE wallets SET credits = credits + $amount WHERE user_id = $1`
    - [ ] `INSERT INTO ledger_entries` (type: 'adjustment', description: 'Admin kredi ayarlamasi')
    - [ ] Negatif ayarlama: kredi dusurme (ama 0'in altina dusurme)
    - [ ] AuditLog: `action: 'admin.update_credits'`, eski/yeni bakiye
- [ ] **Rol Degistirme** (yeni):
  - [ ] `invoke('admin_change_role', { userId, newRole })` (yeni IPC)
  - [ ] `UPDATE users SET role = $1 WHERE id = $2`
  - [ ] Rol degisikligi Subscription ile senkronize edilmeli
  - [ ] AuditLog: `action: 'admin.change_role'`
  - [ ] Sadece super_admin rol degistirebilir
- [ ] **Impersonate (Kullanici Gibi Goruntule)**:
  - [ ] `impersonate_user` IPC (mevcut — korunacak):
    - [ ] 30dk gecerli gecici session olustur
    - [ ] `ImpersonationBanner` bilesen'i goster (mevcut — korunacak)
    - [ ] AuditLog: `action: 'admin.impersonate'`
    - [ ] Impersonate sirasinda: yazma/silme islemleri YASAK (read-only)

#### 16.5.3 Admin Metrikleri — PostgreSQL Gecisi
- [ ] `get_db_stats` IPC guncelle:
  - [ ] `SELECT relname, n_live_tup FROM pg_stat_user_tables` — tablo bazli kayit sayisi
  - [ ] Response: `{ users: N, conversations: N, promptHistory: N, images: N, ... }`
- [ ] `get_metrics` IPC guncelle:
  - [ ] Toplam kullanici sayisi (role bazli dagilim)
  - [ ] Aktif abonelik sayisi (plan bazli dagilim)
  - [ ] Gunluk/haftalik/aylik yeni kayit sayisi
  - [ ] Toplam gelir (sum of ledger_entries where type = 'credit')
  - [ ] En cok kullanilan studioType
  - [ ] En cok kullanilan AI model
  - [ ] Ortalama session suresi
- [ ] Admin Dashboard UI:
  - [ ] Mevcut metrik kartlari korunacak (activeUsers, systemLoad, apiCalls, dbStatus)
  - [ ] Yeni: Plan dagilimi pasta grafigi
  - [ ] Yeni: Gunluk kayit/giris trendi cizgi grafigi
  - [ ] Yeni: Gelir trendi grafigi

---

### 16.6 ACTIVITY (Aktivite Loglari — `src/pages/Logs.tsx`)

> **Mevcut:** Logs.tsx — 2 tab: security (audit logs) + tokens (token usage)
> **Mevcut IPC:** `admin_logs`, `get_token_usage_history`, `get_token_usage_summary`
> **Prisma:** AuditLog, SecurityEvent, AppLog, TokenUsage

#### 16.6.1 Security Logs (Guvenlik Loglari) — PostgreSQL Gecisi
- [ ] `admin_logs` IPC guncelle (kullanici kendi loglarini gorsun):
  - [ ] Kullanici: `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC`
  - [ ] Admin: `SELECT * FROM audit_logs ORDER BY created_at DESC` (tum kullanicilar)
  - [ ] Cursor-based pagination: `LIMIT 50`
  - [ ] Filtreler:
    - [ ] `action` filtresi: login, logout, register, password_change, generation, billing vs.
    - [ ] `level` filtresi: debug, info, warn, error, critical
    - [ ] Tarih araligi
    - [ ] IP adresi
  - [ ] Response:
    ```typescript
    {
      logs: {
        id: string;
        action: string;
        level: LogLevel;
        ipAddress: string | null;
        userAgent: string | null;
        metadata: Record<string, any>; // JSONB
        createdAt: string;
      }[];
      nextCursor: string | null;
      totalCount: number;
    }
    ```
- [ ] Frontend security log tablosu guncelle:
  - [ ] Mevcut `LogEntry` interface'i PostgreSQL response'a uyarla
  - [ ] Mevcut `fetchLogs` fonksiyonunu pagination destekli yap
  - [ ] Mevcut arama cubugu: `action ILIKE` ve `metadata` JSONB icinde arama
  - [ ] Log detay modal'i: tiklayinca metadata JSONB'yi goster
  - [ ] Cihaz/OS/browser bilgisi: `userAgent` parse (mevcut — korunacak)
  - [ ] CSV / PDF export (mevcut PDF export korunacak — jsPDF)

#### 16.6.2 Token Usage Logs — PostgreSQL Gecisi
- [ ] `get_token_usage_history` IPC guncelle:
  - [ ] `SELECT * FROM token_usage WHERE user_id = $1 ORDER BY created_at DESC`
  - [ ] Cursor-based pagination
  - [ ] Filtreler: `modelId`, `provider`, `studioType`, tarih araligi
  - [ ] `isCached` filtresi (cache hit'leri ayir)
  - [ ] Response: `{ items: TokenUsageRecord[], nextCursor, totalCount }`
- [ ] `get_token_usage_summary` IPC guncelle:
  - [ ] `SELECT SUM(input_tokens), SUM(output_tokens), SUM(cost_usd), COUNT(*) FROM token_usage WHERE user_id = $1 AND created_at BETWEEN $start AND $end`
  - [ ] Periyot bazli: daily, weekly, monthly, all
  - [ ] Model bazli breakdown: `GROUP BY model_id`
  - [ ] Studio bazli breakdown: `GROUP BY studio_type`
  - [ ] Response:
    ```typescript
    {
      totalInputTokens: number;
      totalOutputTokens: number;
      totalCostUsd: number;
      generationCount: number;
      periodStart: string;
      periodEnd: string;
      byModel: { modelId: string, tokens: number, cost: number }[];
      byStudio: { studioType: string, count: number, cost: number }[];
    }
    ```
- [ ] Frontend token usage tablosu guncelle:
  - [ ] Mevcut `TokenUsageRecord` ve `TokenUsageSummary` interface'lerini guncelle
  - [ ] Mevcut `tokenPeriod` (daily/monthly/all) secici korunacak
  - [ ] Yeni: model bazli dagilim grafigi (bar chart)
  - [ ] Yeni: studio bazli dagilim grafigi (pie chart)
  - [ ] Yeni: gunluk kullanim trendi (line chart)
  - [ ] Mevcut session-level token sayaci (`sessionInputTokens`, `sessionOutputTokens`) korunacak

#### 16.6.3 Aktivite Ozeti (Dashboard) — Yeni
- [ ] Logs sayfasina "Ozet" tab'i ekle (mevcut security + tokens'a ek):
  - [ ] Son 24 saat aktivite ozeti:
    - [ ] Toplam generation sayisi
    - [ ] Harcanan kredi
    - [ ] En cok kullanilan studio
    - [ ] En cok kullanilan model
  - [ ] Son 7 gun grafigi (gunluk generation sayisi + maliyet)
  - [ ] Son giris bilgileri: IP, cihaz, zaman (SecurityEvent'ten)
  - [ ] Aktif session'lar listesi: `SELECT * FROM sessions WHERE user_id = $1 AND status = 'active'`
    - [ ] "Bu cihaz" isaretleme
    - [ ] "Cikis Yap" butonu (uzaktan session sonlandirma)
    - [ ] `UPDATE sessions SET status = 'revoked' WHERE id = $1`

---

## BOLUM 17: REST API KATMANI (PROMTX BACKEND API)

> **Mevcut durum:** Promtx simdi sadece Tauri IPC ile calisiyor (desktop). Web (Vercel) icin HTTP REST API lazim.
> **Mevcut altyapi:** `src/lib/api.ts` — `apiInvoke()` fonksiyonu zaten hibrit calisiyor:
>   - Tauri ortaminda: `invoke(cmd, args)` (IPC)
>   - Web ortaminda: `fetch(WEB_API_BASE_URL/cmd, { body: args })` (HTTP)
> **Mevcut base URL:** `VITE_API_URL || 'https://api.promtx.app'`
> **Hedef:** Basit bir REST API olustur ki Vercel + web istemci promtx'e baglanabilsin.
> **Teknoloji:** Vercel Serverless Functions (TypeScript) + Prisma Client

### 17.1 API Mimarisi

> **Karar:** Iki katmanli mimari
> 1. **Tauri Desktop:** Rust IPC komutlari (mevcut — degisiklik yok)
> 2. **Web/Vercel:** TypeScript REST API (Vercel Serverless Functions + Prisma)
> Her iki katman da ayni PostgreSQL veritabanina baglaniyor.
> Frontend'deki `apiInvoke()` zaten ikisini otomatik ayiriyor.

```
┌─────────────────┐     ┌──────────────────────────┐
│  Tauri Desktop   │     │  Web Browser (Vercel)     │
│  (React + Rust)  │     │  (React + Fetch API)      │
└────────┬────────┘     └────────────┬───────────────┘
         │ IPC                       │ HTTPS
         ▼                           ▼
┌────────────────┐      ┌──────────────────────────┐
│  Rust Backend  │      │  Vercel Serverless API    │
│  (Tauri cmds)  │      │  (TypeScript + Prisma)    │
└────────┬───────┘      └────────────┬──────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────────────────────────────────┐
│          PostgreSQL 16 + Redis 7                 │
└─────────────────────────────────────────────────┘
```

- [ ] Mimari dokumani hazirla (yukaridaki diyagram)
- [ ] Frontend `apiInvoke()` zaten hazir — ek degisiklik gereksiz
- [ ] API route isimlendirme kurali: `POST /api/{command}` (IPC komut ismiyle ayni)

### 17.2 API Dizin Yapisi

```
promtx/
├── api/                          # Vercel Serverless Functions
│   ├── _lib/                     # Paylasilabilir yardimcilar
│   │   ├── prisma.ts             # Prisma Client singleton
│   │   ├── auth.ts               # JWT dogrulama middleware
│   │   ├── redis.ts              # Redis client
│   │   ├── errors.ts             # Standart hata response'lari
│   │   ├── validate.ts           # Request validasyonu (zod)
│   │   └── rateLimit.ts          # Rate limiting (Redis bazli)
│   │
│   ├── auth/
│   │   ├── login.ts              # POST /api/auth/login
│   │   ├── register.ts           # POST /api/auth/register
│   │   ├── google.ts             # GET  /api/auth/google (redirect)
│   │   ├── google/
│   │   │   └── callback.ts       # GET  /api/auth/google/callback
│   │   ├── refresh.ts            # POST /api/auth/refresh
│   │   ├── logout.ts             # POST /api/auth/logout
│   │   ├── forgot-password.ts    # POST /api/auth/forgot-password
│   │   ├── reset-password.ts     # POST /api/auth/reset-password
│   │   └── verify-email.ts       # GET  /api/auth/verify-email?token=xxx
│   │
│   ├── user/
│   │   ├── me.ts                 # GET  /api/user/me (profil)
│   │   ├── update.ts             # PATCH /api/user/update
│   │   ├── avatar.ts             # POST /api/user/avatar
│   │   ├── linked-accounts.ts    # GET  /api/user/linked-accounts
│   │   ├── change-password.ts    # POST /api/user/change-password
│   │   ├── export-data.ts        # GET  /api/user/export-data
│   │   ├── delete-account.ts     # DELETE /api/user/delete-account
│   │   └── notifications.ts      # GET  /api/user/notifications
│   │
│   ├── prompt/
│   │   ├── generate.ts           # POST /api/prompt/generate
│   │   ├── history.ts            # GET  /api/prompt/history
│   │   ├── [id]/
│   │   │   ├── favorite.ts       # PATCH /api/prompt/{id}/favorite
│   │   │   ├── rate.ts           # PATCH /api/prompt/{id}/rate
│   │   │   ├── tags.ts           # PATCH /api/prompt/{id}/tags
│   │   │   └── index.ts          # DELETE /api/prompt/{id}
│   │   └── templates.ts          # GET  /api/prompt/templates
│   │
│   ├── gallery/
│   │   ├── index.ts              # GET  /api/gallery (kisisel galeri)
│   │   ├── public.ts             # GET  /api/gallery/public (public galeri — auth gereksiz)
│   │   ├── [id]/
│   │   │   ├── index.ts          # GET  /api/gallery/{id} (tek gorsel detay)
│   │   │   ├── toggle-public.ts  # PATCH /api/gallery/{id}/toggle-public
│   │   │   ├── like.ts           # POST /api/gallery/{id}/like
│   │   │   ├── download.ts       # GET  /api/gallery/{id}/download
│   │   │   └── share.ts          # POST /api/gallery/{id}/share
│   │   ├── upload.ts             # POST /api/gallery/upload (dis kaynak gorsel)
│   │   ├── folders.ts            # GET/POST /api/gallery/folders
│   │   └── stats.ts              # GET  /api/gallery/stats
│   │
│   ├── billing/
│   │   ├── wallet.ts             # GET  /api/billing/wallet
│   │   ├── ledger.ts             # GET  /api/billing/ledger
│   │   ├── checkout.ts           # POST /api/billing/checkout
│   │   ├── subscription.ts       # GET  /api/billing/subscription
│   │   ├── receipts.ts           # GET  /api/billing/receipts
│   │   ├── promo.ts              # POST /api/billing/promo (validate)
│   │   └── topup.ts              # POST /api/billing/topup
│   │
│   ├── workspace/
│   │   ├── index.ts              # GET/POST /api/workspace
│   │   ├── [id]/
│   │   │   ├── members.ts        # GET/POST/DELETE /api/workspace/{id}/members
│   │   │   └── invite.ts         # POST /api/workspace/{id}/invite
│   │
│   ├── admin/
│   │   ├── users.ts              # GET  /api/admin/users
│   │   ├── users/[id].ts         # GET/PATCH /api/admin/users/{id}
│   │   ├── logs.ts               # GET  /api/admin/logs
│   │   ├── metrics.ts            # GET  /api/admin/metrics
│   │   └── feedbacks.ts          # GET  /api/admin/feedbacks
│   │
│   ├── feedback.ts               # POST /api/feedback
│   │
│   ├── webhooks/
│   │   └── stripe.ts             # POST /api/webhooks/stripe
│   │
│   └── health.ts                 # GET  /api/health (public — auth gereksiz)
```

- [ ] `api/` dizin yapisini olustur
- [ ] Her endpoint Vercel Serverless Function olarak calisacak
- [ ] Dosya isimlendirme: Vercel file-based routing kurali (`api/auth/login.ts` -> `POST /api/auth/login`)

### 17.3 Paylasilabilir API Yardimcilari (`api/_lib/`)

#### 17.3.1 Prisma Client Singleton
```typescript
// api/_lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] Prisma Client singleton olustur (serverless cold start optimizasyonu)
- [ ] Connection pooling: `DATABASE_URL` icinde `?connection_limit=5` (serverless icin dusuk)
- [ ] Prisma Data Proxy veya PgBouncer dusun (cok sayida concurrent function icin)

#### 17.3.2 JWT Auth Middleware
```typescript
// api/_lib/auth.ts
import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export async function authenticate(req: NextApiRequest): Promise<AuthUser> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new ApiError(401, 'Token gerekli');

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  
  // Session aktif mi kontrol et
  const session = await prisma.session.findFirst({
    where: { userId: decoded.sub, status: 'active' },
  });
  if (!session) throw new ApiError(401, 'Gecersiz session');

  return { userId: decoded.sub, email: decoded.email, role: decoded.role };
}

export function requireRole(...roles: string[]) {
  return (user: AuthUser) => {
    if (!roles.includes(user.role)) throw new ApiError(403, 'Yetersiz yetki');
  };
}
```

- [ ] JWT dogrulama middleware yaz
- [ ] `Authorization: Bearer <token>` header'dan token al
- [ ] Token'i dogrula (jsonwebtoken veya jose)
- [ ] Session aktiflik kontrolu (DB'den)
- [ ] Role-based access control: `requireRole('admin', 'super_admin')`
- [ ] Token expired ise: 401 + `{ code: 'TOKEN_EXPIRED' }` (frontend auto-refresh tetiklesin)

#### 17.3.3 Standart API Response Formati
```typescript
// api/_lib/errors.ts
export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) {
    super(message);
  }
}

// Tum endpoint'ler bu formati kullanacak:
// Basari:  { status: 'success', data: T }
// Hata:    { status: 'error', error: string, code?: string }
// Bu format mevcut IpcResponse<T> ile BIREBIR AYNI — frontend degisiklik gereksiz.

export function success<T>(data: T) {
  return { status: 'success' as const, data };
}

export function error(message: string, code?: string) {
  return { status: 'error' as const, error: message, code };
}
```

- [ ] Standart response formati: `{ status: 'success' | 'error', data?, error? }`
- [ ] **KRITIK:** Mevcut `IpcResponse<T>` ile birebir ayni format — frontend hicbir degisiklik gerektirmez
- [ ] `ApiError` class'i: HTTP status code + mesaj + opsiyonel code

#### 17.3.4 Request Validasyonu (Zod)
```typescript
// api/_lib/validate.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  role: z.enum(['Free']).default('Free'),
});

export const feedbackSchema = z.object({
  feedback_type: z.enum(['bug', 'feature', 'other']),
  message: z.string().min(10).max(5000),
  debug_context: z.record(z.any()).optional(),
});

// ... diger schema'lar
```

- [ ] `bun add zod` (runtime validation)
- [ ] Her endpoint icin zod schema tanimla
- [ ] Request body'yi validate et, gecersizse 400 don
- [ ] Zod hatalarini kullanici dostu mesajlara cevir

#### 17.3.5 Rate Limiting (Redis Bazli)
```typescript
// api/_lib/rateLimit.ts
import { redis } from './redis';

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const current = await redis.incr(`rl:${key}`);
  if (current === 1) await redis.expire(`rl:${key}`, windowSeconds);
  return current <= limit;
}
```

- [ ] Redis bazli rate limiting
- [ ] Endpoint bazli limitler:
  - [ ] Auth endpoints: 10 istek / 15dk / IP
  - [ ] Generation endpoints: 30 istek / dk / kullanici
  - [ ] Gallery public: 100 istek / dk / IP
  - [ ] Genel: 200 istek / dk / kullanici
- [ ] Rate limit asildiysa: `429 Too Many Requests` + `Retry-After` header

### 17.4 Ornek API Endpoint Implementasyonu

#### Auth Login Endpoint
```typescript
// api/auth/login.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { loginSchema } from '../_lib/validate';
import { success, error, ApiError } from '../_lib/errors';
import { rateLimit } from '../_lib/rateLimit';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json(error('Method not allowed'));

  try {
    // Rate limiting
    const ip = req.headers['x-forwarded-for'] as string || 'unknown';
    if (!await rateLimit(`login:${ip}`, 10, 900)) {
      return res.status(429).json(error('Cok fazla deneme. 15 dakika sonra tekrar deneyin.'));
    }

    // Validate
    const body = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return res.status(401).json(error('Gecersiz email veya sifre'));

    // Check frozen
    if (user.isFrozen) return res.status(403).json(error('Hesabiniz dondurulmustur'));

    // Check locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json(error('Hesabiniz gecici olarak kilitli'));
    }

    // Verify password
    if (!user.passwordHash || !await argon2.verify(user.passwordHash, body.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
      });
      return res.status(401).json(error('Gecersiz email veya sifre'));
    }

    // Create session + JWT
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Update login stats
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    return res.status(200).json(success({ token, role: user.role, userId: user.id }));
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.statusCode).json(error(err.message));
    console.error('Login error:', err);
    return res.status(500).json(error('Sunucu hatasi'));
  }
}
```

- [ ] Login endpoint'i yaz (yukaridaki ornek)
- [ ] Response formati: `{ status: 'success', data: { token, role, userId } }` — IPC ile ayni

#### Gallery Public Endpoint
```typescript
// api/gallery/public.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { success, error } from '../_lib/errors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json(error('Method not allowed'));

  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 24, 100);
  const model = req.query.model as string | undefined;
  const sort = (req.query.sort as string) || 'newest';

  const where: any = { isPublic: true, status: 'completed' };
  if (model) where.modelId = model;
  if (cursor) where.createdAt = { lt: new Date(cursor) };

  const items = await prisma.imageGeneration.findMany({
    where,
    orderBy: sort === 'popular' ? { likesCount: 'desc' } : { createdAt: 'desc' },
    take: limit + 1, // +1 to check if there are more
    select: {
      id: true, prompt: true, resultUrl: true, thumbnailUrl: true,
      modelId: true, provider: true, width: true, height: true,
      aspectRatio: true, likesCount: true, createdAt: true,
      user: { select: { displayName: true, avatarUrl: true } },
    },
  });

  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  return res.status(200).json(success({
    items,
    nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
  }));
}
```

- [ ] Gallery public endpoint'i yaz (auth gereksiz)
- [ ] Cursor-based pagination
- [ ] Model + sort filtre

### 17.5 API Bagimliliklari

- [ ] `bun add zod` — request validasyonu
- [ ] `bun add jsonwebtoken` veya `bun add jose` — JWT islemleri
- [ ] `bun add argon2` — sifre hash (Rust'taki ile uyumlu olmali!)
- [ ] `bun add ioredis` — Redis client (rate limiting + cache)
- [ ] `bun add @vercel/node` — Vercel types (dev dependency)
- [ ] `bun add stripe` — Stripe SDK (webhook + checkout)
- [ ] Prisma Client zaten kurulu (BOLUM 3)

### 17.6 API Guvenligi

- [ ] CORS: sadece `promtx.ai`, `promtx.vercel.app`, `localhost:1420` izin ver
- [ ] Tum endpoint'lerde `Content-Type: application/json` kontrolu
- [ ] SQL injection onleme: Prisma ORM zaten parameterized query kullaniyor
- [ ] XSS onleme: response'larda HTML encode
- [ ] CSRF: SameSite cookie + Origin header kontrolu
- [ ] Helmet headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`
- [ ] Request body size limiti: 1MB (gorsel yuklemeleri haric)
- [ ] Sensitive data log'lama: password, token ASLA loglanmaz

### 17.7 API Port Haritasi (BOLUM 1 Guncellemesi)

| Servis | Port | Ortam | Aciklama |
|--------|------|-------|----------|
| Vercel Serverless API | — | Prod | `https://promtx.ai/api/*` (serverless, port yok) |
| Vercel Dev (local) | 3000 | Dev | `vercel dev` ile lokal test |

- [ ] `vercel dev` komutu ile lokal API testi
- [ ] BOLUM 1 port tablosuna Vercel dev port ekle
- [ ] `.env.local` icine `VITE_API_URL=http://localhost:3000` (dev icin)

### 17.8 API Test Stratejisi

- [ ] Her endpoint icin Vitest unit test yaz (`api/__tests__/`)
- [ ] Supertest veya `fetch` ile integration test
- [ ] Test DB: `promtx_test` (BOLUM 2.7'deki test Docker compose)
- [ ] Mock veriler: Prisma seed'den gelen verilerle test
- [ ] CI/CD: GitHub Actions'da API testleri calistir (BOLUM 11 ile entegre)
- [ ] Endpoint test listesi:
  - [ ] `POST /api/auth/login` — basarili + yanlis sifre + kilitli hesap + frozen
  - [ ] `POST /api/auth/register` — basarili + duplicate email + zayif sifre
  - [ ] `GET /api/gallery/public` — pagination + filtre + bos sonuc
  - [ ] `GET /api/prompt/history` — auth zorunlu + filtre + pagination
  - [ ] `GET /api/billing/wallet` — auth zorunlu + dogru bakiye
  - [ ] `POST /api/feedback` — basarili + validasyon hatasi + rate limit
  - [ ] `GET /api/admin/users` — admin yetkisi zorunlu + pagination
  - [ ] `POST /api/webhooks/stripe` — imza dogrulama + idempotency

### 17.9 Frontend API Entegrasyonu

> **Mevcut:** `src/lib/api.ts` — `apiInvoke()` zaten hibrit (Tauri IPC / HTTP fetch)
> **KURAL:** Frontend'de HICBIR degisiklik gerekmez — `apiInvoke()` otomatik secim yapar

- [ ] `VITE_API_URL` env degiskeni dogru ayarlanmali:
  - [ ] Dev (Tauri): bos birak — IPC kullanilir
  - [ ] Dev (Web): `http://localhost:3000`
  - [ ] Prod (Vercel): `https://promtx.ai` (rewrites ile `/api/*`)
  - [ ] Preview: `https://promtx.vercel.app`
- [ ] Frontend'deki `apiInvoke()` response formati API ile birebir eslesmeli
- [ ] Token yonetimi: `Authorization: Bearer <token>` header'i fetch'e ekle
  - [ ] `apiInvoke` icine token ekleme:
    ```typescript
    if (!isTauri()) {
      const token = useAppStore.getState().userToken;
      headers['Authorization'] = `Bearer ${token}`;
    }
    ```
- [ ] Token expired (401) response'unda otomatik refresh + retry

---

## BOLUM 18: GALERI SISTEMI (MY GALLERY + PUBLIC GALLERY)

> **Mevcut:** Iki ayri galeri bilesen'i var:
> 1. `src/pages/Gallery.tsx` — "Production Archive": prompt history bazli, MOCK_HISTORY, sidebar (All/Favorites), grid/list, arama, storage bar
> 2. `src/components/Gallery.tsx` — Gorsel galeri: `GalleryItem` (url, prompt, seed, isPublic, model, type), MOCK veriler, CachedImage, model/type filtre, StatPill, ImageComparison, AnnotationCanvas
> **Mevcut IPC:** `get_image_gallery`, `get_public_gallery`, `toggle_public_status`, `generate_image`, `share_image_asset`
> **Prisma:** `ImageGeneration` modeli (BOLUM 3.4), `Folder` modeli (BOLUM 3.6)

### 18.1 Galeri Mimarisi

> **Karar:** Mevcut 2 galeri bilesen'i birlestirmek yerine netlestirilecek:
> - `pages/Gallery.tsx` -> **Galerim (My Gallery):** kullanicinin tum uretim arsivi (prompt + gorseller)
> - `components/Gallery.tsx` -> **Gorsel Galeri (Image Gallery):** PromptBuilder icinde gorsel onizleme/karsilastirma

```
┌─────────────────────────────────────────────┐
│              GALERI SISTEMI                   │
├──────────────────┬──────────────────────────┤
│  Galerim         │  Public Galeri            │
│  (My Gallery)    │  (Community Showcase)     │
│  /gallery        │  /gallery?tab=public      │
│                  │                            │
│  - Prompt arsiv  │  - Topluluk gorselleri     │
│  - Gorsel arsiv  │  - Like/begeni             │
│  - Klasorler     │  - Trend/populer           │
│  - Favoriler     │  - Model filtre            │
│  - Arama         │  - Kesfet                  │
│  - Download      │  - Remix/tekrar kullan     │
│  - Paylas        │                            │
│  - Sil           │                            │
└──────────────────┴──────────────────────────┘
```

- [ ] Galeri sayfasini 2 tab'li yap: "Galerim" + "Topluluk"
- [ ] URL: `/gallery` (default: Galerim), `/gallery?tab=public` (Topluluk)

### 18.2 Galerim (My Gallery) — PostgreSQL Gecisi

> **Kaynak:** `src/pages/Gallery.tsx` — mevcut Production Archive

#### 18.2.1 Backend (IPC + API)
- [ ] `get_my_gallery` IPC/API (yeni — mevcut `get_image_gallery` genisletmesi):
  - [ ] `SELECT ig.*, ph.prompt_text, ph.studio_type FROM image_generations ig LEFT JOIN prompt_history ph ON ph.id = ig.prompt_id WHERE ig.user_id = $1`
  - [ ] Gorsel + prompt bilgisi birlestir (eger gorsel varsa gorseli, yoksa prompt kartini goster)
  - [ ] Cursor-based pagination: `LIMIT 24`
  - [ ] Filtreler:
    - [ ] Studio tipi: `WHERE studio_type = $type`
    - [ ] Medya tipi: `WHERE type IN ('image', 'video')`
    - [ ] Favori: `WHERE is_favorite = true`
    - [ ] Klasor: `WHERE folder_id = $folderId`
    - [ ] Tarih araligi: `WHERE created_at BETWEEN $start AND $end`
    - [ ] Model: `WHERE model_id = $model`
    - [ ] Arama: `WHERE prompt ILIKE '%$term%'`
  - [ ] Siralama: tarih (yeni/eski), begeni, boyut
  - [ ] Response:
    ```typescript
    {
      items: {
        id: string;
        type: 'image' | 'video' | 'prompt'; // gorsel/video/prompt-only
        prompt: string;
        resultUrl?: string;
        thumbnailUrl?: string;
        studioType: StudioType;
        modelId?: string;
        provider?: string;
        width?: number;
        height?: number;
        aspectRatio: string;
        sizeBytes: number;
        likesCount: number;
        isFavorite: boolean;
        isPublic: boolean;
        folderId?: string;
        tags: string[];
        createdAt: string;
      }[];
      nextCursor: string | null;
      totalCount: number;
      storageUsed: number;   // bytes — toplam depolama kullanimi
      storageLimit: number;  // bytes — plan bazli limit
    }
    ```
- [ ] `create_folder` IPC/API (yeni):
  - [ ] `INSERT INTO folders (user_id, name, color, icon) VALUES ($1, $2, $3, $4)`
  - [ ] Nested klasor destegi: `parent_id` FK
  - [ ] Klasor renk + icon secimi
- [ ] `move_to_folder` IPC/API (yeni):
  - [ ] `UPDATE image_generations SET folder_id = $1 WHERE id = $2 AND user_id = $3`
  - [ ] Toplu tasima: birden fazla gorsel ayni anda
- [ ] `delete_gallery_item` IPC/API (yeni):
  - [ ] Gorsel: S3'ten sil + DB'den sil (hard delete)
  - [ ] Prompt-only: `DELETE FROM prompt_history WHERE id = $1 AND user_id = $2`
  - [ ] Toplu silme: birden fazla item secip tek seferde sil
- [ ] `download_gallery_item` IPC/API:
  - [ ] Orijinal boyutta gorsel indir (S3 URL veya CDN)
  - [ ] Metadata dahil indir (EXIF'e prompt, model, seed bilgisi yaz — opsiyonel)
  - [ ] Toplu indirme: ZIP arsivi olarak (5'ten fazla gorsel icin)
- [ ] `share_gallery_item` IPC/API (mevcut `share_image_asset` genisletmesi):
  - [ ] Paylasim URL'i olustur: `https://promtx.ai/g/{shareId}` (kisa URL)
  - [ ] Paylasim ayarlari: public/link-only/private
  - [ ] Paylasim suresi: 24 saat / 7 gun / suresiz
  - [ ] OG meta tag'leri: gorsel thumbnail + prompt preview (sosyal medya paylasimi icin)
- [ ] `bulk_action` IPC/API (yeni):
  - [ ] Toplu favori ekle/cikar
  - [ ] Toplu klasore tasi
  - [ ] Toplu public/private yap
  - [ ] Toplu sil (onay dialog gerektir)
  - [ ] Toplu indir (ZIP)

#### 18.2.2 Frontend — Galerim Sayfasi Guncellemesi
- [ ] **MOCK verileri kaldir:** `MOCK_HISTORY` dizisini sil, DB'den gelen veriyle degistir
- [ ] **Sidebar genislet** (mevcut All/Favorites + yeni):
  - [ ] "Tumu" — tum icerik (mevcut)
  - [ ] "Favoriler" — `is_favorite = true` (mevcut)
  - [ ] "Gorseller" — `type = 'image'` (yeni)
  - [ ] "Videolar" — `type = 'video'` (yeni)
  - [ ] "Sesler" — Audio Studio ciktilari (yeni)
  - [ ] "Klasorler" — kullanici klasorleri (yeni):
    - [ ] Klasor listesi (DB'den)
    - [ ] "Yeni Klasor" butonu + klasor olusturma dialog
    - [ ] Klasore surukle-birak (drag & drop)
    - [ ] Klasor silme (icindekiler "Tumu"ye tasinir)
  - [ ] Her kategori yaninda sayi badge'i
- [ ] **Storage bar guncelle** (mevcut — DB'den gercek veri):
  - [ ] `storageUsed / storageLimit` oranini goster
  - [ ] Plan bazli limit:
    - [ ] Starter: 1 GB
    - [ ] Creator: 10 GB
    - [ ] Studio Pro: 50 GB
  - [ ] Limit yaklasiyorsa uyari goster
- [ ] **Grid/List gorunum** (mevcut — iyilestir):
  - [ ] Grid: gorsel thumbnail + prompt preview (mevcut)
  - [ ] List: gorsel kucuk thumbnail + prompt + model + tarih + boyut (mevcut)
  - [ ] Yeni: Masonry layout (farkli boyutlardaki gorseller icin)
  - [ ] Lazy loading: `IntersectionObserver` ile gorunur olunca yukle
  - [ ] Skeleton loading state (mevcut `Skeleton` component kullan)
- [ ] **Gorsel karti iyilestir** (mevcut — genislet):
  - [ ] Thumbnail: gercek gorsel goster (mevcut placeholder yerine)
  - [ ] Hover aksiyonlari: favori, indir, paylas, sil (mevcut)
  - [ ] Yeni: "Public Yap" toggle (gorseli topluluk galerisine ac)
  - [ ] Yeni: "Klasore Tasi" butonu
  - [ ] Yeni: like sayisi goster (public ise)
  - [ ] Yeni: boyut bilgisi (1024x1024, 512KB)
  - [ ] Yeni: model badge (DALL-E 3, Midjourney, Flux vs.)
  - [ ] Yeni: aspect ratio badge (1:1, 16:9, 4:3)
- [ ] **Detay Modal'i** (yeni — gorsel kartina tiklaninca):
  - [ ] Tam boyut gorsel goruntuleme (lightbox)
  - [ ] Prompt metni (kopyalanabilir)
  - [ ] Negative prompt (varsa)
  - [ ] Uretim parametreleri: model, provider, seed, steps, cfg_scale
  - [ ] Boyut: width x height, dosya boyutu
  - [ ] Tarih: olusturulma tarihi
  - [ ] Aksiyonlar: indir, paylas, favori, public toggle, sil, "Remix" (ayni parametrelerle yeniden uret)
  - [ ] Variation'lar: parent/child gorsel iliskisi (outpaint, upscale vs.)
  - [ ] Mevcut `ImageComparison` bilesen'i ile karsilastirma (2 gorsel yan yana)
  - [ ] Mevcut `AnnotationCanvas` ile gorsel uzerine not ekleme
- [ ] **Toplu secim modu** (yeni):
  - [ ] Checkbox ile birden fazla gorsel sec
  - [ ] Secili gorseller icin bulk action bar goster (altta veya ustte)
  - [ ] "X gorsel secildi" sayaci
  - [ ] Aksiyonlar: toplu sil, toplu tasi, toplu indir, toplu public/private
- [ ] **Arama iyilestir** (mevcut — genislet):
  - [ ] Mevcut text arama korunacak
  - [ ] Yeni: studio tipi filtre chip'leri (Image, Video, Cinema, Audio...)
  - [ ] Yeni: model filtre dropdown
  - [ ] Yeni: tarih araligi secici
  - [ ] Yeni: boyut filtre (kucuk/orta/buyuk)
  - [ ] Yeni: aspect ratio filtre

### 18.3 Topluluk Galerisi (Public Gallery) — PostgreSQL Gecisi

> **Mevcut:** `get_public_gallery` IPC — `WHERE is_public = true`

#### 18.3.1 Backend (IPC + API)
- [ ] `get_public_gallery` IPC/API guncelle:
  - [ ] `SELECT ig.*, u.display_name, u.avatar_url FROM image_generations ig JOIN users u ON u.id = ig.user_id WHERE ig.is_public = true AND ig.status = 'completed' AND ig.is_nsfw = false`
  - [ ] NSFW filtreleme: `is_nsfw = false` (default) veya `is_nsfw` iceren (kullanici tercihi)
  - [ ] Cursor-based pagination
  - [ ] Siralama modlari:
    - [ ] "En Yeni" — `ORDER BY created_at DESC`
    - [ ] "Populer" — `ORDER BY likes_count DESC`
    - [ ] "Trend" — son 7 gunde en cok begeni alan
    - [ ] "Rastgele" — `ORDER BY RANDOM() LIMIT 24`
  - [ ] Model filtre: `WHERE model_id = $model`
  - [ ] Studio tipi filtre: `WHERE studio_type = $type`
  - [ ] Arama: `WHERE prompt ILIKE '%$term%'`
  - [ ] Auth gereksiz (public endpoint)
- [ ] `like_image` IPC/API (yeni):
  - [ ] Like sistemi: `image_likes` tablosu (yeni Prisma model):
    ```prisma
    model ImageLike {
      userId    String   @map("user_id")
      imageId   String   @map("image_id")
      createdAt DateTime @default(now()) @map("created_at")

      user  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
      image ImageGeneration @relation(fields: [imageId], references: [id], onDelete: Cascade)

      @@id([userId, imageId])
      @@map("image_likes")
    }
    ```
  - [ ] Like toggle: `INSERT ... ON CONFLICT DO DELETE` (PostgreSQL upsert trick)
  - [ ] `image_generations.likes_count` trigger ile veya uygulama seviyesinde guncelle
  - [ ] Auth zorunlu (giris yapmamis kullanicilar like atamazlar)
  - [ ] Rate limiting: kullanici basina 100 like / saat
- [ ] `toggle_public_status` IPC/API (mevcut — korunacak):
  - [ ] `UPDATE image_generations SET is_public = NOT is_public WHERE id = $1 AND user_id = $2`
  - [ ] Public yapilinca: NSFW kontrol (opsiyonel — moderasyon)
  - [ ] Public'ten cikarilinca: like'lar korunur ama gorsel gizlenir
- [ ] `report_image` IPC/API (yeni):
  - [ ] Uygunsuz icerik bildirimi
  - [ ] `INSERT INTO image_reports (image_id, reporter_id, reason, status)` (yeni tablo)
  - [ ] Admin panelinde bildirim listesi ve moderasyon
  - [ ] 3+ bildirim alan gorsel otomatik gizlensin

#### 18.3.2 Prisma Modeli Eklemeleri
```prisma
model ImageLike {
  userId    String   @map("user_id")
  imageId   String   @map("image_id")
  createdAt DateTime @default(now()) @map("created_at")

  user  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  image ImageGeneration @relation(fields: [imageId], references: [id], onDelete: Cascade)

  @@id([userId, imageId])
  @@map("image_likes")
}

model ImageReport {
  id        String   @id @default(uuid())
  imageId   String   @map("image_id")
  reporterId String  @map("reporter_id")
  reason    String   @db.VarChar(500) // spam, nsfw, copyright, other
  status    String   @default("pending") @db.VarChar(20) // pending, reviewed, dismissed
  adminNote String?  @map("admin_note")
  createdAt DateTime @default(now()) @map("created_at")

  image ImageGeneration @relation(fields: [imageId], references: [id], onDelete: Cascade)
  reporter User         @relation(fields: [reporterId], references: [id])

  @@unique([imageId, reporterId]) // ayni gorsel icin ayni kullanici tek bildirim
  @@map("image_reports")
}
```

- [ ] `ImageLike` modeli Prisma schema'ya ekle
- [ ] `ImageReport` modeli Prisma schema'ya ekle
- [ ] `User` modeline relation ekle: `imageLikes ImageLike[]`, `imageReports ImageReport[]`
- [ ] `ImageGeneration` modeline relation ekle: `likes ImageLike[]`, `reports ImageReport[]`
- [ ] `bunx prisma migrate dev --name add_gallery_models`

#### 18.3.3 Frontend — Topluluk Galerisi Tab'i
- [ ] Topluluk tab'i icerigi:
  - [ ] Siralama butonlari: "En Yeni" | "Populer" | "Trend" | "Rastgele"
  - [ ] Model filtre chip'leri (DALL-E 3, Midjourney, Flux, Stable Diffusion, Luma...)
  - [ ] Studio filtre chip'leri (Image, Video, Character, Fashion...)
  - [ ] Arama cubugu
  - [ ] Masonry grid layout (farkli boyutlarda gorseller)
  - [ ] Infinite scroll (IntersectionObserver)
- [ ] Topluluk gorsel karti:
  - [ ] Thumbnail (gercek gorsel)
  - [ ] Kullanici adi + avatar (ureticinin bilgisi)
  - [ ] Like butonu + like sayisi (kalp icon)
  - [ ] Prompt preview (hover'da tam goster)
  - [ ] Model badge
  - [ ] "Remix" butonu — prompt'u kendi studio'na kopyala
  - [ ] "Bildir" butonu (uygunsuz icerik)
- [ ] Topluluk gorsel detay modal'i:
  - [ ] Tam boyut gorsel
  - [ ] Prompt (kopyalanabilir)
  - [ ] Uretici profil karti (displayName, avatarUrl)
  - [ ] Like butonu
  - [ ] "Remix" butonu
  - [ ] Paylasim butonu (link kopyala, sosyal medya)
  - [ ] "Bildir" butonu
  - [ ] Benzer gorseller onerisi (ayni model/prompt keyword'leri ile)

### 18.4 Galeri Depolama ve CDN

- [ ] **S3 / Cloudflare R2 entegrasyonu:**
  - [ ] Gorsel upload: orijinal + thumbnail (300px wide) olustur
  - [ ] S3 bucket: `promtx-gallery` (veya R2)
  - [ ] Key format: `users/{userId}/images/{imageId}.{ext}`
  - [ ] Thumbnail key: `users/{userId}/thumbs/{imageId}.webp`
  - [ ] CDN: Cloudflare veya Vercel Edge Network uzerinden serve et
  - [ ] Signed URL: private gorseller icin gecici erisim linki (1 saat)
- [ ] **Gorsel optimizasyonu:**
  - [ ] Upload sirasinda WebP'ye cevir (boyut azaltma)
  - [ ] Thumbnail olustur: 300px, 600px, 1200px (responsive)
  - [ ] EXIF metadata strip et (privacy)
  - [ ] Maks dosya boyutu: 20MB (upload limiti)
- [ ] **Depolama limitleri (plan bazli):**

| Plan | Depolama | Gorsel Basi Maks | Toplu Indirme |
|------|---------|------------------|---------------|
| Starter | 1 GB | 5 MB | 10 gorsel/ZIP |
| Creator | 10 GB | 10 MB | 50 gorsel/ZIP |
| Studio Pro | 50 GB | 20 MB | 200 gorsel/ZIP |

- [ ] Limit asildiginda: "Depolama dolu" uyarisi + upgrade teklifi
- [ ] Eski gorselleri otomatik silme YAPMA — kullanici kontrolunde

### 18.5 Galeri Seed Data

```typescript
// prisma/seed.ts icine eklenecek

// Admin kullanicisi gorselleri
const adminImages = await prisma.imageGeneration.createMany({
  data: [
    {
      userId: adminUser.id,
      prompt: 'Cyberpunk city skyline at night, neon lights reflecting on wet streets, cinematic 8k',
      resultUrl: 'https://picsum.photos/seed/promtx1/1024/1024',
      thumbnailUrl: 'https://picsum.photos/seed/promtx1/300/300',
      modelId: 'dall-e-3',
      provider: 'openai',
      width: 1024, height: 1024,
      aspectRatio: '1:1',
      sizeBytes: 2048000,
      status: 'completed',
      isPublic: true,
      likesCount: 42,
      createdAt: new Date('2026-04-20'),
    },
    {
      userId: adminUser.id,
      prompt: 'Professional fashion model in Tokyo streets, golden hour, editorial photography',
      resultUrl: 'https://picsum.photos/seed/promtx2/1024/1536',
      thumbnailUrl: 'https://picsum.photos/seed/promtx2/300/450',
      modelId: 'midjourney',
      provider: 'replicate',
      width: 1024, height: 1536,
      aspectRatio: '2:3',
      sizeBytes: 3145000,
      status: 'completed',
      isPublic: true,
      likesCount: 128,
      createdAt: new Date('2026-04-22'),
    },
  ],
});

// Pro kullanici gorselleri (biri private)
const proImages = await prisma.imageGeneration.createMany({
  data: [
    {
      userId: proUser.id,
      prompt: 'Abstract liquid metal flowing in zero gravity, highly detailed render',
      resultUrl: 'https://picsum.photos/seed/promtx3/1920/1080',
      thumbnailUrl: 'https://picsum.photos/seed/promtx3/300/169',
      modelId: 'flux',
      provider: 'replicate',
      width: 1920, height: 1080,
      aspectRatio: '16:9',
      sizeBytes: 4200000,
      status: 'completed',
      isPublic: false, // private
      likesCount: 0,
      createdAt: new Date('2026-04-23'),
    },
  ],
});

// Klasor seed
await prisma.folder.createMany({
  data: [
    { userId: adminUser.id, name: 'Marketing Kampanyasi', color: '#b44afd', icon: 'folder' },
    { userId: adminUser.id, name: 'Kisisel Projeler', color: '#14b8a6', icon: 'folder' },
    { userId: proUser.id, name: 'Marka Gorselleri', color: '#f59e0b', icon: 'folder' },
  ],
});

// Like seed
await prisma.imageLike.createMany({
  data: [
    { userId: proUser.id, imageId: adminImages[0].id },
    { userId: freeUser.id, imageId: adminImages[0].id },
    { userId: freeUser.id, imageId: adminImages[1].id },
  ],
});
```

- [ ] Galeri seed verisi olustur (en az 6 gorsel)
- [ ] Farkli aspect ratio'lar, modeller, public/private
- [ ] Klasor seed
- [ ] Like seed
- [ ] MOCK verileri kaldir: `MOCK_GALLERY_ITEMS` ve `MOCK_HISTORY` -> seed'den gelen gercek veri

### 18.6 Mevcut SQLite -> Prisma Eslestirme Tablosu Guncellemesi

| SQLite / Mevcut | Prisma Modeli | Durum |
|-----------------|---------------|-------|
| *(yeni)* | `ImageLike` | Like sistemi |
| *(yeni)* | `ImageReport` | Icerik bildirimi |

- [ ] BOLUM 3.9 eslestirme tablosuna ekle

---

## SKOR TABLOSU

| Bolum | Madde Sayisi | Oncelik | Durum |
|-------|-------------|---------|-------|
| 0. On Kosullar (Docker + Bun) | ~25 | KRITIK | [ ] Baslanmadi |
| 1. Port Yonetimi | ~10 | KRITIK | [ ] Baslanmadi |
| 2. Docker Compose + Sentinel | ~60 | KRITIK | [ ] Baslanmadi |
| 3. Prisma Schema + Migration | ~50 | KRITIK | [ ] Baslanmadi |
| 4. Google OAuth | ~25 | KRITIK | [ ] Baslanmadi |
| 5. Seed Data (Promtx) | ~60 | YUKSEK | [ ] Baslanmadi |
| 6. PostgreSQL Konfigurasyon | ~20 | YUKSEK | [ ] Baslanmadi |
| 7. Vercel Deploy | ~25 | YUKSEK | [ ] Baslanmadi |
| 8. Rust Backend + IPC Komutlari | ~80 | KRITIK | [ ] Baslanmadi |
| 9. Frontend + Routes + Store | ~40 | YUKSEK | [ ] Baslanmadi |
| 10. Guvenlik | ~20 | KRITIK | [ ] Baslanmadi |
| 11. CI/CD (Bun + Prisma) | ~15 | ORTA | [ ] Baslanmadi |
| 12. Yedekleme + Monitoring | ~15 | ORTA | [ ] Baslanmadi |
| 13. Dogrulama (40 madde) | ~40 | KRITIK | [ ] Baslanmadi |
| 14. Geri Bildirim Sistemi | ~30 | YUKSEK | [ ] Baslanmadi |
| 15. Stripe Odeme Altyapisi (Ek) | ~35 | YUKSEK | [ ] Baslanmadi |
| 16. Sayfa Bazli Gecis (Auth/History/Billing/Accounts/Users/Activity) | ~180 | KRITIK | [ ] Baslanmadi |
| 17. REST API Katmani (Vercel Serverless) | ~65 | KRITIK | [ ] Baslanmadi |
| 18. Galeri Sistemi (My Gallery + Public) | ~85 | YUKSEK | [ ] Baslanmadi |
| **TOPLAM** | **~945+** | — | — |

---

## TEKNOLOJI OZETI

| Kategori | Eski | Yeni |
|----------|------|------|
| Paket Yoneticisi | npm | **Bun** |
| ORM | sqlx + sea-orm | **Prisma** |
| Veritabani | SQLite | **PostgreSQL 16** |
| Cache | Moka (in-memory) | **Redis 7 + Sentinel** |
| Auth | Manuel JWT | **Google OAuth + JWT** |
| Deploy (Web) | — | **Vercel** |
| Deploy (Desktop) | Tauri | **Tauri** (degisiklik yok) |
| Migration | sqlx migrate | **Prisma Migrate** |
| Seed | Manuel SQL | **Prisma Seed (bun)** |
| CI/CD | GitHub Actions | **GitHub Actions + Vercel** |

### Mevcut Proje Bagimliliklari (Korunacak)

| Kategori | Paket | Versiyon | Not |
|----------|-------|----------|-----|
| UI Framework | React | 19 | Degisiklik yok |
| Routing | react-router-dom | 7 | OAuth callback route eklenecek |
| State | Zustand | 5 | Auth + wallet state eklenecek |
| Desktop | Tauri | 2 | IPC komutlari guncellenecek |
| Styling | Tailwind CSS | 4 | Degisiklik yok |
| Build | Vite | 6 | Degisiklik yok |
| Payment | @stripe/stripe-js | 9 | Korunacak |
| AI | @google/genai | 1.29 | Gemini API, korunacak |
| Error Tracking | @sentry/react | 10 | Korunacak |
| Analytics | posthog-js | 1.371 | Korunacak |
| i18n | paraglide-js | - | TR/EN, korunacak |
| Animation | motion | 12 | Degisiklik yok |
| Toast | sonner | - | Notification ile entegre |
| Icons | lucide-react | 0.546 | Degisiklik yok |
| PDF | jspdf + jspdf-autotable | - | Receipt icin korunacak |
| Crypto | crypto-js | 4.2 | Client-side sifreleme, korunacak |
| IndexedDB | idb | 8 | Offline cache, korunacak |
| Test | vitest + playwright | 4 / 1.59 | PostgreSQL test eklentisi |
| **YENI** | @prisma/client | latest | ORM |
| **YENI** | @react-oauth/google | latest | Google login butonu |
| **YENI** | zod | latest | API request validasyonu |
| **YENI** | jose / jsonwebtoken | latest | JWT islemleri (API) |
| **YENI** | ioredis | latest | Redis client (rate limiting) |
| **YENI** | @vercel/node | latest | Vercel Serverless types |

### Mevcut Rust Crate'ler (Guncellenmesi Gerekenler)

| Crate | Degisiklik |
|-------|-----------|
| `sqlx` | `features = ["sqlite"]` -> `["postgres"]` (veya kaldirilacak, Prisma gecisi) |
| `sea-orm` | `features = ["sqlx-sqlite"]` -> `["sqlx-postgres"]` (veya kaldirilacak) |
| `argon2` | Korunacak (sifre hashing) |
| `jsonwebtoken` | Korunacak (JWT) |
| `rust_decimal` | Korunacak (para birimi hassasiyeti) |
| `totp-rs` | Korunacak (2FA) |
| `redis` | `features = ["sentinel"]` EKLEnecek |
| `serde_json` | Korunacak |
| `tokio` | Korunacak |
| `reqwest` | Korunacak (Google OAuth, Stripe API) |

---

> **NOT:** Bu dokuman Promtx'in SQLite'tan PostgreSQL'e tam gecisini,
> Prisma ORM'e gecisi, Bun paket yoneticisine gecisi, Google OAuth entegrasyonunu,
> Redis Sentinel ile HA cache yapisini, Vercel deploy'unu,
> Stripe odeme altyapisini, geri bildirim sistemini ve
> sayfa bazli gecis gereksinimlerini (Auth, Prompt History, Billing, Accounts, Users, Activity),
> REST API katmanini (Vercel Serverless) ve galeri sistemini (My Gallery + Public Gallery) planlar.
> Her onay kutucugu tek bir aksiyonu temsil eder. Tamamlanan maddeler `[x]` ile isaretlenir.
> Tum `npm` komutlari `bun` ile degistirilmistir.
> Port cakismasi onlenmis, tum portlar BOLUM 1'deki tabloda tanimlanmistir.
>
> **Promtx'e Ozel Referanslar:**
> - Mevcut SQLite migration: `src-tauri/migrations/20260424000000_init.sql` (21 tablo)
> - Mevcut seed: `src-tauri/tests/fixtures/seed.sql` (admin, workspace, pricing, conversation)
> - Mevcut IPC komutlari: `src-tauri/src/lib.rs` invoke_handler (60+ komut)
> - UserRole enum: `Free, Pro, Enterprise, Admin, SuperAdmin` (auth.rs:12)
> - TransactionReason enum: `Generation, TopUp, Refund, Subscription` (ledger.rs:8)
> - WorkspaceRole enum: `Owner, Admin, Member, Viewer` (models.rs:92)
> - Model pricing: `registry.rs` (gpt-4o, gemini-1.5-pro/flash, deepseek, grok, dall-e-3)
> - Studio types: image, video, cinema, audio, character, fashion, marketing, edit
> - Admin email: `admin@promtx.os` (seed.sql)
> - API key prefix: `ptx_` (auth.rs)
# PROMTX - PostgreSQL Migration & Full-Stack Infrastructure TODO

> **Tarih:** 2026-04-25
> **Durum:** Sifirdan PostgreSQL + Prisma altyapisi kurulumu
> **Mevcut Sistem:** Rust (Tauri) + SQLite (sqlx + sea-orm) + React 19 + Vite + Bun
> **Hedef:** Docker uzerinde PostgreSQL 16+ / Prisma ORM / Redis Sentinel / Google OAuth / Vercel Deploy
> **Paket Yoneticisi:** Bun (npm KULLANILMAYACAK)
> **ORM:** Prisma (sea-orm ve sqlx kaldirilacak)
> **Kapsam:** Docker, PostgreSQL, Prisma, Auth (Google OAuth + Email), Redis Sentinel, Vercel, CI/CD, Seed Data, Monitoring

---

## BOLUM 0: ON KOSULLAR VE ORTAM HAZIRLIK

### 0.1 Docker Desktop Kurulumu (Windows)
- [ ] Docker Desktop for Windows indir ve kur
- [ ] WSL2 backend aktif et
- [ ] Docker Desktop basarili: `docker --version`
- [ ] Docker Compose yuklu: `docker compose version`
- [ ] `docker run hello-world` ile dogrula
- [ ] Docker Desktop memory limiti en az 4GB
- [ ] Windows Defender Firewall'da Docker icin istisna (gerekirse)

### 0.2 Bun Kurulumu ve Dogrulama
- [ ] Bun yuklu degilse kur: `powershell -c "irm bun.sh/install.ps1 | iex"`
- [ ] Bun versiyonunu dogrula: `bun --version` (1.1+ olmali)
- [ ] Mevcut `node_modules` sil: `rm -rf node_modules`
- [ ] Bun ile yeniden yukle: `bun install`
- [ ] `bun run dev` ile projenin calisitigini dogrula
- [ ] `package.json` script'lerinin bun ile uyumlu oldugunu dogrula
- [ ] `bun.lockb` dosyasinin olusturuldugunu dogrula
- [ ] Eski `package-lock.json` / `yarn.lock` dosyalarini sil (varsa)

### 0.3 Proje Dizin Yapisini Hazirla
- [ ] `promtx/docker/` dizini olustur
- [ ] `promtx/docker/postgres/` dizini olustur
- [ ] `promtx/docker/postgres/init/` dizini olustur (ilk calistirma SQL script'leri)
- [ ] `promtx/docker/postgres/conf/` dizini olustur (postgresql.conf, pg_hba.conf)
- [ ] `promtx/docker/postgres/backups/` dizini olustur
- [ ] `promtx/docker/postgres/ssl/` dizini olustur
- [ ] `promtx/docker/scripts/` dizini olustur
- [ ] `promtx/prisma/` dizini olustur (Prisma schema + migrations)
- [ ] `promtx/prisma/seed/` dizini olustur (seed data script'leri)
- [ ] `.gitignore` guncelle:
  - [ ] `docker/postgres/data/`
  - [ ] `docker/postgres/backups/*.sql`
  - [ ] `docker/postgres/ssl/*.key`
  - [ ] `.env.docker`
  - [ ] `.env.local`
  - [ ] `node_modules/`
  - [ ] `bun.lockb` (opsiyonel — takim karari)

### 0.4 Gelistirme Araclari
- [ ] pgAdmin 4 kur (GUI veritabani yonetimi)
- [ ] VS Code icin "Prisma" extension kur (syntax highlighting + format)
- [ ] VS Code icin "Docker" extension kur
- [ ] VS Code icin "PostgreSQL" extension kur
- [ ] Prisma CLI kur: `bun add -d prisma`
- [ ] Prisma Client kur: `bun add @prisma/client`
- [ ] `bunx prisma --version` ile dogrula

---

## BOLUM 1: PORT YONETIMI (CAKISMA ONLEME)

### 1.1 Port Haritasi (Tum Servisler)

> **KURAL:** Hicbir port cakismamali. Asagidaki tablo tum servislerin sabit port atamasini icerir.

| Servis | Port | Ortam | Aciklama |
|--------|------|-------|----------|
| Vite Dev Server | 1420 | Dev | Frontend dev (mevcut Tauri ayari) |
| Vite Preview | 4173 | Dev | `bun run preview` |
| PostgreSQL | 5432 | Dev/Prod | Veritabani |
| PostgreSQL Test | 5433 | Test | Test veritabani (cakisma onleme) |
| Redis | 6379 | Dev/Prod | Cache + Session |
| Redis Sentinel 1 | 26379 | Prod | Sentinel master izleme |
| Redis Sentinel 2 | 26380 | Prod | Sentinel replica 1 |
| Redis Sentinel 3 | 26381 | Prod | Sentinel replica 2 |
| pgAdmin | 5050 | Dev | DB yonetim araci |
| Prisma Studio | 5555 | Dev | `bunx prisma studio` |
| API Server (Axum) | 3001 | Dev/Prod | Rust backend REST API |
| Tauri Dev | 1421 | Dev | Tauri IPC |
| Prometheus | 9090 | Prod | Metrik toplama |
| Grafana | 3000 | Prod | Dashboard |
| postgres_exporter | 9187 | Prod | PG metrikleri |

- [ ] `scripts/kill-port.js` scriptini guncelle — tum portlari kontrol etsin
- [ ] `docker-compose.yml` icinde port mapping'leri yukaridaki tabloya gore ayarla
- [ ] `.env.local` icine `VITE_API_PORT=3001` ekle
- [ ] `.env.local` icine `DATABASE_PORT=5432` ekle
- [ ] `.env.local` icine `REDIS_PORT=6379` ekle
- [ ] Port cakisma kontrolu icin `docker/scripts/check-ports.sh` yaz

---

## BOLUM 2: DOCKER COMPOSE YAPISI

### 2.1 Ana docker-compose.yml
- [ ] `promtx/docker-compose.yml` dosyasi olustur
- [ ] PostgreSQL 16 servisi: `image: postgres:16-alpine`
  - [ ] Container: `promtx-postgres`
  - [ ] Port: `5432:5432`
  - [ ] Restart: `unless-stopped`
  - [ ] Volume: `pgdata:/var/lib/postgresql/data`
  - [ ] Volume: `./docker/postgres/init:/docker-entrypoint-initdb.d`
  - [ ] Volume: `./docker/postgres/conf/postgresql.conf:/etc/postgresql/postgresql.conf`
  - [ ] Environment: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB=promtx`
  - [ ] Healthcheck: `pg_isready -U $$POSTGRES_USER -d promtx` (interval 10s, timeout 5s, retries 5)
  - [ ] Memory limit: `2G`, CPU limit: `2.0`
  - [ ] `shm_size: 256mb`
  - [ ] Logging: `json-file` max-size 50m, max-file 5

### 2.2 Redis Servisi (Cache + Session + Rate Limiting)
- [ ] Redis servisi: `image: redis:7-alpine`
  - [ ] Container: `promtx-redis`
  - [ ] Port: `6379:6379`
  - [ ] `command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly yes`
  - [ ] Healthcheck: `redis-cli -a $$REDIS_PASSWORD ping`
  - [ ] Volume: `redis-data:/data`

### 2.3 Redis Sentinel Yapisi (Uretim Icin High Availability)
- [ ] `docker-compose.sentinel.yml` olustur
- [ ] Redis Master servisi:
  - [ ] Container: `promtx-redis-master`
  - [ ] Port: `6379:6379`
  - [ ] `command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes`
- [ ] Redis Slave servisi:
  - [ ] Container: `promtx-redis-slave`
  - [ ] `command: redis-server --slaveof promtx-redis-master 6379 --masterauth ${REDIS_PASSWORD} --requirepass ${REDIS_PASSWORD}`
- [ ] Sentinel 1:
  - [ ] Container: `promtx-sentinel-1`
  - [ ] Port: `26379:26379`
  - [ ] `sentinel.conf` dosyasi:
    ```
    sentinel monitor promtx-master promtx-redis-master 6379 2
    sentinel auth-pass promtx-master ${REDIS_PASSWORD}
    sentinel down-after-milliseconds promtx-master 5000
    sentinel failover-timeout promtx-master 10000
    sentinel parallel-syncs promtx-master 1
    ```
- [ ] Sentinel 2: Port `26380:26379`
- [ ] Sentinel 3: Port `26381:26379`
- [ ] Sentinel health check scripti yaz
- [ ] Failover testi proseduru belgele
- [ ] Rust tarafinda sentinel client entegrasyonu:
  - [ ] `redis` crate sentinel feature: `redis = { features = ["sentinel"] }`
  - [ ] Sentinel connection manager olustur
  - [ ] Otomatik failover handling

### 2.4 pgAdmin Servisi (Sadece Dev)
- [ ] pgAdmin: `image: dpage/pgadmin4:latest`
  - [ ] Container: `promtx-pgadmin`
  - [ ] Port: `5050:80`
  - [ ] `PGADMIN_DEFAULT_EMAIL=admin@promtx.ai`
  - [ ] `depends_on: postgres: condition: service_healthy`
  - [ ] Profile: `dev` (uretimde devre disi)

### 2.5 docker-compose.dev.yml (Override)
- [ ] Port'lari host'a ac (5432, 5050, 6379)
- [ ] PostgreSQL verbose log: `log_statement: 'all'`
- [ ] pgAdmin aktif
- [ ] Prisma Studio port: 5555

### 2.6 docker-compose.prod.yml (Override)
- [ ] Port'lari internal network'e kisitla
- [ ] SSL zorunlu
- [ ] pgAdmin devre disi
- [ ] Sentinel aktif
- [ ] Memory/CPU limitleri artir
- [ ] Log seviyesi: `WARNING`

### 2.7 docker-compose.test.yml (Override)
- [ ] Ayri PostgreSQL: `promtx-postgres-test` port `5433:5432`
- [ ] Database: `promtx_test`
- [ ] `tmpfs: /var/lib/postgresql/data` (hizli test)
- [ ] `POSTGRES_HOST_AUTH_METHOD=trust`

### 2.8 .env.docker Dosyasi
- [ ] `POSTGRES_USER=promtx_admin`
- [ ] `POSTGRES_PASSWORD=` (32+ karakter rastgele)
- [ ] `POSTGRES_DB=promtx`
- [ ] `POSTGRES_HOST=promtx-postgres`
- [ ] `POSTGRES_PORT=5432`
- [ ] `DATABASE_URL=postgresql://promtx_admin:PASSWORD@promtx-postgres:5432/promtx?sslmode=prefer`
- [ ] `REDIS_PASSWORD=` (32+ karakter rastgele)
- [ ] `REDIS_URL=redis://:PASSWORD@promtx-redis:6379/0`
- [ ] `REDIS_SENTINEL_URLS=promtx-sentinel-1:26379,promtx-sentinel-2:26380,promtx-sentinel-3:26381`
- [ ] `REDIS_SENTINEL_MASTER=promtx-master`
- [ ] `GOOGLE_CLIENT_ID=`
- [ ] `GOOGLE_CLIENT_SECRET=`
- [ ] `GOOGLE_REDIRECT_URI=http://localhost:1420/auth/google/callback`
- [ ] `JWT_SECRET=` (64+ karakter)
- [ ] `NEXTAUTH_SECRET=` (Vercel deploy icin)
- [ ] **Mevcut .env.example degiskenleri de dahil edilmeli:**
  - [ ] `VITE_VAULT_KEY=` (32+ karakter, client-side sifreleme)
  - [ ] `GEMINI_API_KEY=` (Google Gemini AI modeli)
  - [ ] `STRIPE_SECRET_KEY=` (backend only)
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY=` (frontend icin guvenli)
  - [ ] `STRIPE_WEBHOOK_SECRET=` (webhook dogrulama)
  - [ ] `RESEND_API_KEY=` (email servisi — hosgeldin email, password reset)
  - [ ] `VITE_API_URL=https://api.promtx.ai` (backend URL)
  - [ ] `VITE_SENTRY_DSN=` (hata takibi)
  - [ ] `VITE_POSTHOG_KEY=` (analytics)
  - [ ] `VITE_POSTHOG_HOST=https://eu.i.posthog.com`
  - [ ] `TAURI_SIGNING_PRIVATE_KEY=` (desktop app signing)
  - [ ] `TAURI_SIGNING_PASSWORD=`
- [ ] `.env.docker.example` olustur (hassas degerler bos)
- [ ] `.gitignore`'a `.env.docker` ekle

### 2.9 Docker Network
- [ ] `promtx-network` bridge network
- [ ] Subnet: `172.20.0.0/16`
- [ ] PostgreSQL: `172.20.0.10`
- [ ] Redis: `172.20.0.11`
- [ ] pgAdmin: `172.20.0.12`
- [ ] Sentinel 1/2/3: `172.20.0.20-22`

### 2.10 Docker Yardimci Script'ler
- [ ] `docker/scripts/start.sh` — Tum servisleri baslat
- [ ] `docker/scripts/stop.sh` — Durdur
- [ ] `docker/scripts/reset-db.sh` — DB sifirla
- [ ] `docker/scripts/backup.sh` — Yedek al
- [ ] `docker/scripts/restore.sh` — Geri yukle
- [ ] `docker/scripts/logs.sh` — Loglar
- [ ] `docker/scripts/shell.sh` — PG container shell
- [ ] `docker/scripts/psql.sh` — psql baglantisi
- [ ] `docker/scripts/health.sh` — Saglik kontrolu
- [ ] `docker/scripts/seed.sh` — `bunx prisma db seed` calistir
- [ ] `docker/scripts/migrate.sh` — `bunx prisma migrate deploy` calistir
- [ ] `docker/scripts/check-ports.sh` — Port cakisma kontrolu
- [ ] `docker/scripts/sentinel-status.sh` — Sentinel durumu
- [ ] Her script'te hata kontrolu (`set -e, trap ERR`) ve renk kodlu cikti

---

## BOLUM 3: PRISMA KURULUMU VE SCHEMA

### 3.1 Prisma Altyapisi
- [ ] `bun add -d prisma`
- [ ] `bun add @prisma/client`
- [ ] `bunx prisma init --datasource-provider postgresql`
- [ ] `prisma/schema.prisma` dosyasi olustur
- [ ] `.env` icinde `DATABASE_URL` ayarla
- [ ] `prisma/seed.ts` dosyasi olustur (bun ile calisacak)
- [ ] `package.json` icine prisma seed config ekle:
  ```json
  "prisma": {
    "seed": "bun prisma/seed.ts"
  }
  ```
- [ ] Mevcut `sqlx` ve `sea-orm` bagimliklarini Cargo.toml'dan kaldir (asama asama)
- [ ] Prisma Client'i Rust yerine Node/Bun API layer'da kullan
  - [ ] Veya `prisma-client-rust` crate kullan (Rust native Prisma client)

### 3.2 Prisma Schema — Enum Tanimlari

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// GERCEK Rust enum'dan (src-tauri/src/modules/auth.rs:12)
enum UserRole {
  free
  pro
  enterprise
  admin
  super_admin
}

enum SessionStatus {
  active
  expired
  revoked
  logged_out
}

enum StudioType {
  image
  video
  cinema
  audio
  character
  fashion
  marketing
  edit
}

enum AIProvider {
  google
  openai
  anthropic
  replicate
  stability
  midjourney
  local
}

enum PaymentStatus {
  pending
  processing
  completed
  failed
  refunded
  disputed
}

enum LedgerType {
  credit
  debit
  refund
  adjustment
  bonus
  referral
  subscription
  topup
}

enum IAPPlatform {
  stripe
  apple
  google
  paypal
}

enum ImageStatus {
  generating
  completed
  failed
  deleted
  flagged
}

enum LogLevel {
  debug
  info
  warn
  error
  critical
}

enum MemberRole {
  owner
  admin
  editor
  viewer
}

enum NotificationType {
  system
  billing
  security
  workspace
  generation
  referral
}

enum AuthProvider {
  email
  google
  apple
  github
}

// GERCEK Rust enum'dan (src-tauri/src/modules/ledger.rs:8)
enum TransactionReason {
  generation
  top_up
  refund
  subscription
}

// Mevcut Rust enum'dan (src-tauri/src/modules/models.rs:92)
// NOT: WorkspaceRole Rust'ta Owner/Admin/Member/Viewer seklinde
```

- [ ] Tum enum'lari schema.prisma'ya ekle
- [ ] `bunx prisma format` ile dogrula
- [ ] `UserRole` enum'u Rust'taki `Free, Pro, Enterprise, Admin, SuperAdmin` ile birebir eslesmeli
- [ ] `TransactionReason` enum'u Rust'taki `Generation, TopUp, Refund, Subscription` ile eslesmeli
- [ ] `WorkspaceRole` icin Rust'taki `Owner, Admin, Member, Viewer` kullanilmali (MemberRole degil)

### 3.3 Prisma Schema — Core Modelleri

```prisma
model User {
  id                String    @id @default(uuid())
  email             String    @unique @db.VarChar(255)
  displayName       String?   @map("display_name") @db.VarChar(255)
  passwordHash      String?   @map("password_hash")
  role              UserRole  @default(free)
  isFrozen          Boolean   @default(false) @map("is_frozen")
  isEmailVerified   Boolean   @default(false) @map("is_email_verified")
  avatarUrl         String?   @map("avatar_url") @db.VarChar(1024)
  locale            String    @default("tr") @db.VarChar(10)
  timezone          String    @default("Europe/Istanbul") @db.VarChar(50)
  lastLoginAt       DateTime? @map("last_login_at")
  loginCount        Int       @default(0) @map("login_count")
  failedLoginCount  Int       @default(0) @map("failed_login_count")
  lockedUntil       DateTime? @map("locked_until")
  totpSecret        String?   @map("totp_secret")
  totpEnabled       Boolean   @default(false) @map("totp_enabled")
  metadata          Json      @default("{}")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // Relations
  accounts          Account[]
  sessions          Session[]
  refreshTokens     RefreshToken[]
  apiKeys           ApiKey[]
  notifications     Notification[]
  conversations     Conversation[]
  promptHistory     PromptHistory[]
  imageGenerations  ImageGeneration[]
  dnaVault          DnaVault[]
  promptTemplates   PromptTemplate[]
  wallet            Wallet?
  ledgerEntries     LedgerEntry[]
  receipts          Receipt[]
  fileUploads       FileUpload[]
  tokenUsage        TokenUsage[]
  workspacesOwned   Workspace[]      @relation("WorkspaceOwner")
  workspaceMembers  WorkspaceMember[]
  folders           Folder[]
  referralsMade     Referral[]       @relation("Referrer")
  referralsReceived Referral[]       @relation("Referred")

  @@map("users")
}

model Account {
  id                String       @id @default(uuid())
  userId            String       @map("user_id")
  provider          AuthProvider
  providerAccountId String       @map("provider_account_id")
  accessToken       String?      @map("access_token")
  refreshToken      String?      @map("refresh_token")
  expiresAt         DateTime?    @map("expires_at")
  tokenType         String?      @map("token_type")
  scope             String?
  idToken           String?      @map("id_token")
  createdAt         DateTime     @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id               String        @id @default(uuid())
  userId           String        @map("user_id")
  tokenHash        String        @map("token_hash")
  status           SessionStatus @default(active)
  ipAddress        String?       @map("ip_address") @db.VarChar(45)
  userAgent        String?       @map("user_agent")
  deviceFingerprint String?      @map("device_fingerprint") @db.VarChar(255)
  expiresAt        DateTime      @map("expires_at")
  lastActivityAt   DateTime      @default(now()) @map("last_activity_at")
  createdAt        DateTime      @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@index([expiresAt])
  @@map("sessions")
}

model RefreshToken {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  tokenHash     String   @unique @map("token_hash")
  parentTokenId String?  @map("parent_token_id")
  sessionId     String?  @map("session_id")
  isRevoked     Boolean  @default(false) @map("is_revoked")
  revokedAt     DateTime? @map("revoked_at")
  revokedReason String?  @map("revoked_reason") @db.VarChar(255)
  expiresAt     DateTime @map("expires_at")
  createdAt     DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model ApiKey {
  id               String    @id @default(uuid())
  userId           String    @map("user_id")
  name             String    @db.VarChar(255)
  keyPrefix        String    @map("key_prefix") @db.VarChar(8)
  keyHash          String    @unique @map("key_hash")
  scopes           String[]  @default([])
  rateLimitPerMin  Int       @default(60) @map("rate_limit_per_minute")
  expiresAt        DateTime? @map("expires_at")
  lastUsedAt       DateTime? @map("last_used_at")
  lastUsedIp       String?   @map("last_used_ip") @db.VarChar(45)
  isActive         Boolean   @default(true) @map("is_active")
  createdAt        DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("api_keys")
}

model Notification {
  id        String           @id @default(uuid())
  userId    String           @map("user_id")
  type      NotificationType
  title     String           @db.VarChar(255)
  body      String?
  data      Json             @default("{}")
  isRead    Boolean          @default(false) @map("is_read")
  readAt    DateTime?        @map("read_at")
  createdAt DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("notifications")
}
```

- [ ] Core modelleri schema.prisma'ya ekle
- [ ] Account modeli Google OAuth icin ZORUNLU
- [ ] `passwordHash` nullable (Google ile kayit olanlarda sifre yok)
- [ ] `bunx prisma format` ile dogrula

#### Mevcut SQLite -> Prisma Eslestirme Notu (users tablosu)
> **Kaynak:** `src-tauri/migrations/20260424000000_init.sql`
> - SQLite `id TEXT` -> Prisma `@id @default(uuid())`
> - SQLite `role TEXT DEFAULT 'member'` -> Prisma `UserRole @default(free)` (Rust enum Free)
> - SQLite `is_frozen INTEGER DEFAULT 0` -> Prisma `Boolean @default(false)`
> - SQLite `password_hash TEXT NOT NULL` -> Prisma `String?` (Google OAuth icin nullable)
> - Prisma'ya **eklenen** alanlar: `isEmailVerified`, `locale`, `timezone`, `lastLoginAt`, `loginCount`, `failedLoginCount`, `lockedUntil`, `totpSecret`, `totpEnabled`, `metadata`
> - Bu alanlar Rust `auth.rs`'te zaten kullaniliyor (2FA/TOTP, account locking vb.)

### 3.4 Prisma Schema — AI Modelleri

```prisma
model Conversation {
  id           String      @id @default(uuid())
  userId       String      @map("user_id")
  workspaceId  String?     @map("workspace_id")
  folderId     String?     @map("folder_id")
  title        String      @db.VarChar(512)
  studioType   StudioType? @map("studio_type")
  isArchived   Boolean     @default(false) @map("is_archived")
  isPinned     Boolean     @default(false) @map("is_pinned")
  isFavorite   Boolean     @default(false) @map("is_favorite")
  messageCount Int         @default(0) @map("message_count")
  lastMessageAt DateTime?  @map("last_message_at")
  metadata     Json        @default("{}")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace Workspace? @relation(fields: [workspaceId], references: [id])
  folder    Folder?    @relation(fields: [folderId], references: [id])
  messages  Message[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([workspaceId])
  @@index([folderId])
  @@map("conversations")
}

model Message {
  id              String      @id @default(uuid())
  conversationId  String      @map("conversation_id")
  parentId        String?     @map("parent_id")
  role            String      @db.VarChar(20) // user, assistant, system, tool
  content         String
  modelId         String?     @map("model_id") @db.VarChar(100)
  provider        AIProvider?
  tokenCountInput Int         @default(0) @map("token_count_input")
  tokenCountOutput Int        @default(0) @map("token_count_output")
  durationMs      Int?        @map("duration_ms")
  isEdited        Boolean     @default(false) @map("is_edited")
  editHistory     Json        @default("[]") @map("edit_history")
  metadata        Json        @default("{}")
  createdAt       DateTime    @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  parent       Message?     @relation("MessageThread", fields: [parentId], references: [id])
  replies      Message[]    @relation("MessageThread")

  @@index([conversationId, createdAt])
  @@index([parentId])
  @@map("messages")
}

model PromptHistory {
  id              String     @id @default(uuid())
  userId          String     @map("user_id")
  studioType      StudioType @map("studio_type")
  promptText      String     @map("prompt_text")
  generatedOutput String?    @map("generated_output")
  modelId         String?    @map("model_id") @db.VarChar(100)
  provider        AIProvider?
  parameters      Json       @default("{}")
  qualityScore    Float?     @map("quality_score")
  isFavorite      Boolean    @default(false) @map("is_favorite")
  tags            String[]   @default([])
  createdAt       DateTime   @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, studioType, createdAt(sort: Desc)])
  @@map("prompt_history")
}

model ImageGeneration {
  id             String      @id @default(uuid())
  userId         String      @map("user_id")
  prompt         String
  negativePrompt String?     @map("negative_prompt")
  resultUrl      String      @map("result_url")
  thumbnailUrl   String?     @map("thumbnail_url")
  s3Key          String?     @map("s3_key") @db.VarChar(512)
  sizeBytes      BigInt      @default(0) @map("size_bytes")
  width          Int?
  height         Int?
  aspectRatio    String      @default("1:1") @map("aspect_ratio") @db.VarChar(10)
  modelId        String?     @map("model_id") @db.VarChar(100)
  provider       AIProvider?
  seed           BigInt?
  steps          Int?
  cfgScale       Float?      @map("cfg_scale")
  parentImageId  String?     @map("parent_image_id")
  status         ImageStatus @default(completed)
  isPublic       Boolean     @default(false) @map("is_public")
  isNsfw         Boolean     @default(false) @map("is_nsfw")
  nsfwScore      Float?      @map("nsfw_score")
  likesCount     Int         @default(0) @map("likes_count")
  metadata       Json        @default("{}")
  createdAt      DateTime    @default(now()) @map("created_at")

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentImage ImageGeneration? @relation("ImageVariation", fields: [parentImageId], references: [id])
  variations  ImageGeneration[] @relation("ImageVariation")

  @@index([userId, createdAt(sort: Desc)])
  @@map("image_generations")
}

model DnaVault {
  id          String      @id @default(uuid())
  userId      String      @map("user_id")
  name        String      @db.VarChar(255)
  description String?
  dnaJson     Json        @map("dna_json")
  studioType  StudioType? @map("studio_type")
  version     Int         @default(1)
  isDefault   Boolean     @default(false) @map("is_default")
  isShared    Boolean     @default(false) @map("is_shared")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@index([userId, createdAt(sort: Desc)])
  @@map("dna_vault")
}

model PromptTemplate {
  id           String     @id @default(uuid())
  userId       String?    @map("user_id")
  name         String     @db.VarChar(255)
  description  String?
  templateText String     @map("template_text")
  studioType   StudioType @map("studio_type")
  variables    Json       @default("[]")
  category     String?    @db.VarChar(100)
  isSystem     Boolean    @default(false) @map("is_system")
  isPublic     Boolean    @default(false) @map("is_public")
  usageCount   Int        @default(0) @map("usage_count")
  ratingAvg    Float      @default(0) @map("rating_avg")
  ratingCount  Int        @default(0) @map("rating_count")
  tags         String[]   @default([])
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("prompt_templates")
}
```

- [ ] AI modellerini schema.prisma'ya ekle
- [ ] `bunx prisma format` ile dogrula

### 3.5 Prisma Schema — Billing Modelleri

```prisma
model Wallet {
  userId          String   @id @map("user_id")
  credits         Decimal  @default(0) @db.Decimal(15, 4)
  lifetimeCredits Decimal  @default(0) @map("lifetime_credits") @db.Decimal(15, 4)
  currency        String   @default("USD") @db.VarChar(3)
  updatedAt       DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("wallets")
}

model LedgerEntry {
  id            String     @id @default(uuid())
  userId        String     @map("user_id")
  type          LedgerType
  amount        Decimal    @db.Decimal(15, 4)
  balanceAfter  Decimal    @map("balance_after") @db.Decimal(15, 4)
  description   String?
  referenceId   String?    @map("reference_id") @db.VarChar(255)
  referenceType String?    @map("reference_type") @db.VarChar(50)
  metadata      Json       @default("{}")
  createdAt     DateTime   @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([referenceId, referenceType])
  @@map("ledger_entries")
}

model StripeEvent {
  id           String        @id @db.VarChar(255)
  eventType    String        @map("event_type") @db.VarChar(100)
  userId       String?       @map("user_id")
  data         Json
  status       PaymentStatus @default(pending)
  processedAt  DateTime?     @map("processed_at")
  errorMessage String?       @map("error_message")
  retryCount   Int           @default(0) @map("retry_count")
  createdAt    DateTime      @default(now()) @map("created_at")

  @@index([eventType, createdAt(sort: Desc)])
  @@map("stripe_events")
}

model IapTransaction {
  id                    String        @id @default(uuid())
  userId                String        @map("user_id")
  platform              IAPPlatform
  transactionId         String        @map("transaction_id") @db.VarChar(255)
  originalTransactionId String        @map("original_transaction_id") @db.VarChar(255)
  productId             String        @map("product_id") @db.VarChar(255)
  amount                Decimal?      @db.Decimal(15, 4)
  currency              String?       @db.VarChar(3)
  status                PaymentStatus @default(pending)
  receiptData           String?       @map("receipt_data")
  purchasedAt           DateTime      @default(now()) @map("purchased_at")
  expiresAt             DateTime?     @map("expires_at")
  createdAt             DateTime      @default(now()) @map("created_at")

  @@unique([platform, transactionId])
  @@index([userId, purchasedAt(sort: Desc)])
  @@map("iap_transactions")
}

model Receipt {
  id            String        @id @default(uuid())
  userId        String        @map("user_id")
  orderId       String        @unique @map("order_id") @db.VarChar(255)
  amount        Decimal       @db.Decimal(15, 4)
  currency      String        @default("USD") @db.VarChar(3)
  taxAmount     Decimal       @default(0) @map("tax_amount") @db.Decimal(15, 4)
  status        PaymentStatus
  pdfUrl        String?       @map("pdf_url")
  s3Key         String?       @map("s3_key") @db.VarChar(512)
  invoiceNumber String?       @unique @map("invoice_number") @db.VarChar(50)
  billingAddress Json?        @map("billing_address")
  createdAt     DateTime      @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("receipts")
}

model RecurringAllowance {
  userId        String   @id @map("user_id")
  amount        Decimal  @db.Decimal(15, 4)
  intervalDays  Int      @default(30) @map("interval_days")
  lastGrantedAt DateTime @default(now()) @map("last_granted_at")
  nextGrantAt   DateTime? @map("next_grant_at")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("recurring_allowances")
}

model PromoCode {
  id              String    @id @default(uuid())
  code            String    @unique @db.VarChar(50)
  discountPercent Int?      @map("discount_percent")
  discountAmount  Decimal?  @map("discount_amount") @db.Decimal(15, 4)
  maxUses         Int?      @map("max_uses")
  currentUses     Int       @default(0) @map("current_uses")
  minPurchase     Decimal   @default(0) @map("min_purchase") @db.Decimal(15, 4)
  validFrom       DateTime  @default(now()) @map("valid_from")
  validUntil      DateTime? @map("valid_until")
  isActive        Boolean   @default(true) @map("is_active")
  createdBy       String?   @map("created_by")
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now()) @map("created_at")

  usages PromoCodeUsage[]

  @@map("promo_codes")
}

model PromoCodeUsage {
  id          String   @id @default(uuid())
  promoCodeId String   @map("promo_code_id")
  userId      String   @map("user_id")
  orderId     String?  @map("order_id") @db.VarChar(255)
  usedAt      DateTime @default(now()) @map("used_at")

  promoCode PromoCode @relation(fields: [promoCodeId], references: [id])

  @@unique([promoCodeId, userId])
  @@map("promo_code_usages")
}
```

- [ ] Billing modellerini schema.prisma'ya ekle

### 3.6 Prisma Schema — Workspace Modelleri

```prisma
model Workspace {
  id          String   @id @default(uuid())
  name        String   @db.VarChar(255)
  slug        String?  @unique @db.VarChar(255)
  ownerId     String   @map("owner_id")
  description String?
  avatarUrl   String?  @map("avatar_url") @db.VarChar(1024)
  settings    Json     @default("{}")
  maxMembers  Int      @default(10) @map("max_members")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  owner         User              @relation("WorkspaceOwner", fields: [ownerId], references: [id])
  members       WorkspaceMember[]
  invitations   WorkspaceInvitation[]
  conversations Conversation[]
  folders       Folder[]

  @@index([ownerId])
  @@map("workspaces")
}

model WorkspaceMember {
  workspaceId String     @map("workspace_id")
  userId      String     @map("user_id")
  role        MemberRole @default(member)
  permissions Json       @default("{}")
  invitedBy   String?    @map("invited_by")
  joinedAt    DateTime   @default(now()) @map("joined_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([workspaceId, userId])
  @@index([userId])
  @@map("workspace_members")
}

model WorkspaceInvitation {
  id          String     @id @default(uuid())
  workspaceId String     @map("workspace_id")
  email       String     @db.VarChar(255)
  role        MemberRole @default(member)
  invitedBy   String     @map("invited_by")
  tokenHash   String     @unique @map("token_hash")
  status      String     @default("pending") @db.VarChar(20) // pending, accepted, declined, expired
  expiresAt   DateTime   @map("expires_at")
  createdAt   DateTime   @default(now()) @map("created_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@map("workspace_invitations")
}

model Folder {
  id          String   @id @default(uuid())
  workspaceId String?  @map("workspace_id")
  userId      String   @map("user_id")
  name        String   @db.VarChar(255)
  parentId    String?  @map("parent_id")
  sortOrder   Int      @default(0) @map("sort_order")
  color       String?  @db.VarChar(7)
  icon        String?  @db.VarChar(50)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  workspace     Workspace?     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent        Folder?        @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children      Folder[]       @relation("FolderHierarchy")
  conversations Conversation[]

  @@index([userId])
  @@index([parentId])
  @@map("folders")
}
```

- [ ] Workspace modellerini schema.prisma'ya ekle

### 3.7 Prisma Schema — Audit & Analytics Modelleri

```prisma
model AuditLog {
  id           String   @id @default(uuid())
  userId       String?  @map("user_id")
  action       String   @db.VarChar(100)
  resourceType String?  @map("resource_type") @db.VarChar(50)
  resourceId   String?  @map("resource_id") @db.VarChar(255)
  oldValues    Json?    @map("old_values")
  newValues    Json?    @map("new_values")
  ipAddress    String?  @map("ip_address") @db.VarChar(45)
  userAgent    String?  @map("user_agent")
  sessionId    String?  @map("session_id")
  level        LogLevel @default(info)
  metadata     Json     @default("{}")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt(sort: Desc)])
  @@index([action, createdAt(sort: Desc)])
  @@index([resourceType, resourceId])
  @@map("audit_logs")
}

model SecurityEvent {
  id          String   @id @default(uuid())
  eventType   String   @map("event_type") @db.VarChar(50)
  severity    LogLevel @default(warn)
  userId      String?  @map("user_id")
  ipAddress   String   @map("ip_address") @db.VarChar(45)
  userAgent   String?  @map("user_agent")
  details     Json     @default("{}")
  isResolved  Boolean  @default(false) @map("is_resolved")
  resolvedBy  String?  @map("resolved_by")
  resolvedAt  DateTime? @map("resolved_at")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([ipAddress, createdAt(sort: Desc)])
  @@index([eventType, createdAt(sort: Desc)])
  @@map("security_events")
}

model AppLog {
  id        String   @id @default(uuid())
  level     LogLevel
  action    String   @db.VarChar(255)
  message   String?
  context   Json     @default("{}")
  source    String?  @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at")

  @@index([level, createdAt(sort: Desc)])
  @@map("app_logs")
}

model SecurePayload {
  key              String   @id @db.VarChar(255)
  payload          Bytes
  encryptionMethod String   @default("aes-256-gcm") @map("encryption_method") @db.VarChar(50)
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("secure_payloads")
}

model FileUpload {
  id               String   @id @default(uuid())
  userId           String   @map("user_id")
  filename         String   @db.VarChar(255)
  originalFilename String   @map("original_filename") @db.VarChar(255)
  mimeType         String   @map("mime_type") @db.VarChar(100)
  sizeBytes        BigInt   @map("size_bytes")
  s3Bucket         String?  @map("s3_bucket") @db.VarChar(100)
  s3Key            String   @map("s3_key") @db.VarChar(512)
  cdnUrl           String?  @map("cdn_url")
  checksumSha256   String?  @map("checksum_sha256") @db.VarChar(64)
  isPublic         Boolean  @default(false) @map("is_public")
  metadata         Json     @default("{}")
  createdAt        DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([s3Key])
  @@map("file_uploads")
}

model TokenUsage {
  id             String     @id @default(uuid())
  userId         String     @map("user_id")
  modelId        String     @map("model_id") @db.VarChar(100)
  provider       AIProvider
  studioType     StudioType? @map("studio_type")
  inputTokens    Int        @default(0) @map("input_tokens")
  outputTokens   Int        @default(0) @map("output_tokens")
  costUsd        Decimal    @default(0) @map("cost_usd") @db.Decimal(10, 6)
  conversationId String?    @map("conversation_id")
  promptId       String?    @map("prompt_id")
  latencyMs      Int?       @map("latency_ms")
  isCached       Boolean    @default(false) @map("is_cached")
  createdAt      DateTime   @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([modelId, createdAt(sort: Desc)])
  @@map("token_usage")
}

model Referral {
  id            String   @id @default(uuid())
  referrerId    String   @map("referrer_id")
  referredId    String   @map("referred_id")
  referralCode  String   @map("referral_code") @db.VarChar(20)
  rewardCredits Decimal  @default(0) @map("reward_credits") @db.Decimal(15, 4)
  status        String   @default("pending") @db.VarChar(20) // pending, completed, expired, rejected
  completedAt   DateTime? @map("completed_at")
  createdAt     DateTime @default(now()) @map("created_at")

  referrer User @relation("Referrer", fields: [referrerId], references: [id])
  referred User @relation("Referred", fields: [referredId], references: [id])

  @@unique([referrerId, referredId])
  @@index([referralCode])
  @@map("referrals")
}
```

- [ ] Audit & Analytics modellerini schema.prisma'ya ekle
- [ ] `bunx prisma format` ile tum schema'yi dogrula
- [ ] `bunx prisma validate` ile dogrula
- [ ] `bunx prisma generate` ile client olustur

### 3.8 Eksik Prisma Modelleri (Mevcut SQLite'ta var ama Prisma schema'da yok)

> **Kaynak:** `src-tauri/migrations/20260424000000_init.sql` — 21 tablo

#### 3.8.1 pricing_matrix Tablosu (Mevcut seed.sql'de var)
```prisma
model PricingMatrix {
  modelId      String  @id @map("model_id") @db.VarChar(100)
  provider     AIProvider?
  basePrice1m  Decimal @map("base_price_1m") @db.Decimal(15, 6)
  outputPrice1m Decimal? @map("output_price_1m") @db.Decimal(15, 6)
  isActive     Boolean @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("pricing_matrix")
}
```
- [ ] PricingMatrix modeli ekle (ModelRegistry'nin DB karsiligi)

#### 3.8.2 Feedback Tablosu (Mevcut FeedbackModal + submit_feedback komutu)

> **Kaynak:** `src/components/FeedbackModal.tsx` — tip: bug/feature/other, mesaj, debug_context
> **Kaynak:** `src-tauri/src/ipc/commands/auth.rs` — `submit_feedback` IPC komutu

```prisma
enum FeedbackType {
  bug
  feature
  other
}

enum FeedbackStatus {
  pending
  reviewing
  resolved
  dismissed
  archived
}

model Feedback {
  id            String         @id @default(uuid())
  userId        String?        @map("user_id")
  type          FeedbackType   @default(other)
  message       String         @db.VarChar(5000) // SADECE TEXT — dosya/PDF/resim KABUL EDILMEZ
  status        FeedbackStatus @default(pending)
  debugContext  Json           @default("{}") @map("debug_context") // studio, promptType, viewport vs.
  ipAddress     String?        @map("ip_address") @db.VarChar(45)
  userAgent     String?        @map("user_agent")
  adminNote     String?        @map("admin_note") @db.VarChar(2000)
  resolvedBy    String?        @map("resolved_by")
  resolvedAt    DateTime?      @map("resolved_at")
  createdAt     DateTime       @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt(sort: Desc)])
  @@index([type, status])
  @@map("feedbacks")
}
```

- [ ] Feedback modeli Prisma schema'ya ekle
- [ ] User modeline `feedbacks Feedback[]` relation ekle
- [ ] `bunx prisma migrate dev --name add_feedback`
- [ ] **KURAL:** `message` alani SADECE duz metin kabul eder — dosya, PDF, resim, link eklenemez
- [ ] Admin panelinde feedback listesi ve yonetimi

#### 3.8.3 logs Tablosu (Mevcut migration'da var)
```prisma
// NOT: Bu tablo AppLog'dan farkli — mevcut SQLite logs tablosu
// Mevcut yapi: id INTEGER AUTOINCREMENT, action TEXT, level TEXT, timestamp DATETIME
// Prisma'da AppLog modeli olarak zaten tanimlandi (3.7)
```
- [ ] Mevcut `logs` tablosu ile yeni `app_logs` Prisma modeli eslesmeli

#### 3.8.4 conversations_fts (FTS5 Virtual Table)
```sql
-- SQLite FTS5 virtual table — PostgreSQL'de kullanilmayacak
-- Yerine: tsvector + GIN index kullanilacak
-- Prisma schema'da conversation.searchVector alani ile
```
- [ ] SQLite FTS5 -> PostgreSQL tsvector gecisi icin migration notu

### 3.9 Mevcut SQLite <-> Prisma Tablo Eslestirme Tablosu

| SQLite Tablosu | Prisma Modeli | Durum |
|----------------|---------------|-------|
| `users` | `User` | Alanlar genisletildi (2FA, TOTP, metadata ekle) |
| `conversations` | `Conversation` | studioType, isPinned, isFavorite eklendi |
| `conversations_fts` | *(tsvector ile degistirildi)* | PostgreSQL native FTS |
| `messages` | `Message` | tokenCount, provider, modelId eklendi |
| `audit_logs` | `AuditLog` | Yeniden yapilandi |
| `workspaces` | `Workspace` | slug, maxMembers eklendi |
| `workspace_members` | `WorkspaceMember` | permissions JSON eklendi |
| `token_usage` | `TokenUsage` | latencyMs, isCached eklendi |
| `image_generations` | `ImageGeneration` | thumbnail, nsfw, likes eklendi |
| `dna_vault` | `DnaVault` | version, isShared eklendi |
| `prompt_history` | `PromptHistory` | tags, qualityScore eklendi |
| `wallets` | `Wallet` | lifetimeCredits, currency eklendi |
| `ledger_entries` | `LedgerEntry` | balanceAfter, referenceId eklendi |
| `sessions` | `Session` | status enum, deviceFingerprint eklendi |
| `refresh_tokens` | `RefreshToken` | revokedReason eklendi |
| `api_keys` | `ApiKey` | keyPrefix, rateLimitPerMin eklendi |
| `iap_transactions` | `IapTransaction` | amount, currency eklendi |
| `receipts` | `Receipt` | taxAmount, invoiceNumber eklendi |
| `recurring_allowances` | `RecurringAllowance` | nextGrantAt, isActive eklendi |
| `folders` | `Folder` | workspaceId, userId, color, icon eklendi |
| `logs` | `AppLog` | source eklendi |
| `secure_payloads` | `SecurePayload` | encryptionMethod eklendi |
| *(yeni)* | `Account` | Google OAuth icin |
| *(yeni)* | `Notification` | Bildirim sistemi |
| *(yeni)* | `StripeEvent` | Webhook event kaydi |
| *(yeni)* | `PromoCode` | Promosyon kodlari |
| *(yeni)* | `PromoCodeUsage` | Kod kullanim kaydi |
| *(yeni)* | `WorkspaceInvitation` | Davet sistemi |
| *(yeni)* | `SecurityEvent` | Guvenlik olaylari |
| *(yeni)* | `FileUpload` | Dosya yukleme |
| *(yeni)* | `PromptTemplate` | Prompt sablonlari |
| *(yeni)* | `Referral` | Referans sistemi |
| *(yeni)* | `PricingMatrix` | Model fiyatlandirmasi |
| *(yeni)* | `Feedback` | Geri bildirim sistemi (sadece metin) |
| *(yeni)* | `ImageLike` | Gorsel begeni sistemi |
| *(yeni)* | `ImageReport` | Icerik bildirimi/moderasyon |

### 3.10 Migration Olusturma ve Calistirma
- [ ] `bunx prisma migrate dev --name init` ile ilk migration olustur
- [ ] Migration dosyasini incele (`prisma/migrations/`)
- [ ] `bunx prisma migrate deploy` ile migration uygula
- [ ] `bunx prisma studio` ile tabloları kontrol et (port 5555)
- [ ] Migration rollback proseduru belgele
- [ ] Mevcut `src-tauri/migrations/20260424000000_init.sql` dosyasi referans olarak saklanmali

---

## BOLUM 4: GOOGLE OAUTH ENTEGRASYONU

### 4.1 Google Cloud Console Ayarlari
- [ ] Google Cloud Console'da proje olustur: "Promtx"
- [ ] OAuth 2.0 Client ID olustur (Web Application)
- [ ] Authorized JavaScript origins ekle:
  - [ ] `http://localhost:1420` (Vite dev)
  - [ ] `http://localhost:4173` (Vite preview)
  - [ ] `https://promtx.ai` (production)
  - [ ] `https://www.promtx.ai`
  - [ ] `https://promtx.vercel.app` (Vercel preview)
- [ ] Authorized redirect URIs ekle:
  - [ ] `http://localhost:1420/auth/google/callback`
  - [ ] `http://localhost:3001/api/auth/google/callback` (API server)
  - [ ] `https://promtx.ai/auth/google/callback`
  - [ ] `https://promtx.vercel.app/auth/google/callback`
- [ ] OAuth consent screen yapilandir:
  - [ ] App name: "Promtx"
  - [ ] User support email: support@promtx.ai
  - [ ] Scopes: `email`, `profile`, `openid`
  - [ ] Logo yukle
- [ ] Client ID ve Client Secret'i `.env.docker`'a ekle

### 4.2 Backend Google OAuth Implementasyonu

> **Mevcut sistem:** `src-tauri/src/ipc/commands/auth.rs` — `google_login()` komutu
> - Mevcut flow: Frontend Google access token aliyor, backend'e gonderiyor
> - Backend Google API'ye access token ile istek atiyor, kullanici bilgisi aliyor
> - Yoksa otomatik kayit (role: Free), varsa login
> - JWT token donduruyor
> **Gelistirilecek:** Account tablosu ile multi-provider auth destegi

- [ ] Mevcut `google_login()` komutunu Account tablosu ile entegre et
- [ ] Google OAuth flow endpoint'leri olustur (web deploy icin):
  - [ ] `GET /api/auth/google` — Google'a yonlendir (authorization code flow)
  - [ ] `GET /api/auth/google/callback` — Callback isle
- [ ] Authorization code'u access token'a cevir
- [ ] Google'dan kullanici bilgilerini al (`userinfo` endpoint)
- [ ] Kullanici varsa -> login, yoksa -> register (upsert) — `role: 'free'` default
- [ ] Account tablosuna Google hesap bilgilerini kaydet (`provider: 'google'`)
- [ ] JWT token olustur ve don (mevcut `AuthEngine` kullan)
- [ ] Session olustur (mevcut session tablosu kullan)
- [ ] Frontend'e redirect et (token ile)
- [ ] **Tauri (desktop) icin:** Mevcut `google_login()` IPC komutu korunacak
- [ ] **Web (Vercel) icin:** API route olarak yeni endpoint'ler

### 4.3 Frontend Google Login Butonu
- [ ] Google Sign-In butonu bilesenini olustur/guncelle
- [ ] `@react-oauth/google` paketi: `bun add @react-oauth/google`
- [ ] GoogleOAuthProvider wrapper ekle
- [ ] Login sayfasinda "Google ile Giris Yap" butonu
- [ ] Register sayfasinda "Google ile Kayit Ol" butonu
- [ ] OAuth callback sayfasi: `/auth/google/callback`
- [ ] Token alma ve store'a kaydetme
- [ ] Hata durumlarini handle et (iptal, hata, timeout)

### 4.4 Google OAuth Guvenlik
- [ ] CSRF korumasi: state parametresi kullan
- [ ] Nonce kullan (replay attack onleme)
- [ ] Token dogrulama: Google public key ile ID token dogrula
- [ ] Email dogrulanmis mi kontrol et (`email_verified` claim)
- [ ] Rate limiting: `/api/auth/google` endpoint'ine uygula
- [ ] Suspicious login detection: yeni cihaz/IP bildirim gonder

---

## BOLUM 5: SEED DATA (PROMTX'E OZEL)

### 5.1 Seed Script Altyapisi
- [ ] `prisma/seed.ts` dosyasi olustur (TypeScript, bun ile calisacak)
- [ ] `package.json`'a seed ayari ekle:
  ```json
  "prisma": { "seed": "bun prisma/seed.ts" }
  ```
- [ ] Seed script icinde Prisma Client kullan
- [ ] Idempotent seed: tekrar calisinca hata vermemeli (`upsert` kullan)
- [ ] `bunx prisma db seed` ile calistir

### 5.2 Admin Kullanici Seed

> **Mevcut seed referansi:** `src-tauri/tests/fixtures/seed.sql`
> - Mevcut admin: `id='system-admin-001'`, `email='admin@promtx.os'`, `role='admin'`
> - Mevcut workspace: `id='global-workspace-001'`, `name='Promtx Global'`
> - Mevcut pricing: `gemini-1.5-pro` ve `gpt-4o` ($0.00 test icin)

```typescript
// prisma/seed.ts
const adminUser = await prisma.user.upsert({
  where: { email: 'admin@promtx.os' },
  update: {},
  create: {
    id: 'system-admin-001', // Mevcut seed ile uyumlu
    email: 'admin@promtx.os',
    displayName: 'Promtx Admin',
    passwordHash: await hashPassword('admin123'), // Mevcut seed sifresi
    role: 'admin',
    isEmailVerified: true,
    locale: 'tr',
    timezone: 'Europe/Istanbul',
    wallet: {
      create: {
        credits: 10000,
        lifetimeCredits: 10000,
        currency: 'USD',
      },
    },
  },
});

// SuperAdmin kullanici (tam yetki)
const superAdmin = await prisma.user.upsert({
  where: { email: 'superadmin@promtx.os' },
  update: {},
  create: {
    email: 'superadmin@promtx.os',
    displayName: 'Promtx SuperAdmin',
    passwordHash: await hashPassword('ChangeMe!2026'),
    role: 'super_admin',
    isEmailVerified: true,
    locale: 'tr',
    timezone: 'Europe/Istanbul',
    wallet: { create: { credits: 99999, lifetimeCredits: 99999 } },
  },
});
```
- [ ] Admin kullanici seed'i yaz (`admin@promtx.os` — mevcut seed ile uyumlu)
- [ ] SuperAdmin kullanici seed'i yaz (`superadmin@promtx.os`)
- [ ] Admin icin wallet olustur (10000 kredi)
- [ ] Admin icin default workspace olustur: `id='global-workspace-001'`, `name='Promtx Global'` (mevcut seed ile uyumlu)
- [ ] SuperAdmin icin ayri workspace: "Promtx Operations"

### 5.3 Test Kullanicilari Seed

```typescript
const testUsers = [
  {
    email: 'free@promtx.os',
    displayName: 'Free Tier User',
    role: 'free' as UserRole,
    credits: 100,   // Free plan baslangic
  },
  {
    email: 'pro@promtx.os',
    displayName: 'Pro Creator',
    role: 'pro' as UserRole,
    credits: 2000,  // Pro plan
  },
  {
    email: 'enterprise@promtx.os',
    displayName: 'Enterprise Studio',
    role: 'enterprise' as UserRole,
    credits: 10000, // Enterprise plan
  },
  {
    email: 'designer@promtx.os',
    displayName: 'Fashion Designer',
    role: 'pro' as UserRole,
    credits: 1500,
  },
  {
    email: 'filmmaker@promtx.os',
    displayName: 'Indie Filmmaker',
    role: 'pro' as UserRole,
    credits: 3000,
  },
];
```
- [ ] 5 test kullanici seed'i yaz
- [ ] Her biri icin wallet olustur
- [ ] Her biri icin "Personal" workspace olustur

### 5.4 Prompt Template Seed'leri (Stüdyo Bazli)

#### 5.4.1 Image Studio Template'leri
```typescript
const imageTemplates = [
  {
    name: 'Cinematic Portrait',
    description: 'Film kalitesinde portre fotografi prompt sablonu',
    templateText: 'A cinematic portrait of {{subject}}, {{lighting}} lighting, {{mood}} mood, shot on {{camera}}, {{style}} style, 8k resolution, detailed skin texture',
    studioType: 'image',
    category: 'portrait',
    variables: [
      { name: 'subject', type: 'text', placeholder: 'a young woman with red hair' },
      { name: 'lighting', type: 'select', options: ['golden hour', 'studio', 'neon', 'natural'] },
      { name: 'mood', type: 'select', options: ['dramatic', 'ethereal', 'dark', 'warm'] },
      { name: 'camera', type: 'select', options: ['Sony A7III', 'Canon R5', 'Hasselblad'] },
      { name: 'style', type: 'select', options: ['photorealistic', 'artistic', 'fantasy'] },
    ],
    isSystem: true,
    isPublic: true,
    tags: ['portrait', 'cinematic', 'photography'],
  },
  {
    name: 'Fantasy Landscape',
    description: 'Fantastik manzara prompt sablonu',
    templateText: 'A breathtaking fantasy landscape of {{scene}}, {{time_of_day}}, {{weather}}, epic composition, volumetric lighting, matte painting style, 4k wallpaper quality',
    studioType: 'image',
    category: 'landscape',
    isSystem: true,
    isPublic: true,
    tags: ['landscape', 'fantasy', 'environment'],
  },
  {
    name: 'Product Photography',
    description: 'Urun fotografi prompt sablonu',
    templateText: '{{product}} product photography, {{background}} background, professional studio lighting, commercial quality, high-end advertising style, sharp focus, {{angle}} angle',
    studioType: 'image',
    category: 'product',
    isSystem: true,
    isPublic: true,
    tags: ['product', 'commercial', 'studio'],
  },
  {
    name: 'Anime Character',
    description: 'Anime karakter prompt sablonu',
    templateText: 'Anime style character, {{character_desc}}, {{art_style}} art style, {{background}}, vibrant colors, detailed eyes, by {{artist_reference}}',
    studioType: 'image',
    category: 'anime',
    isSystem: true,
    isPublic: true,
    tags: ['anime', 'character', 'illustration'],
  },
  {
    name: 'Architecture Visualization',
    description: 'Mimari gorselestirme prompt sablonu',
    templateText: 'Architectural visualization of {{building_type}}, {{style}} style, {{material}} facade, {{time}} lighting, photorealistic render, unreal engine quality',
    studioType: 'image',
    category: 'architecture',
    isSystem: true,
    isPublic: true,
    tags: ['architecture', 'render', '3d'],
  },
];
```

#### 5.4.2 Video Studio Template'leri
```typescript
const videoTemplates = [
  {
    name: 'Cinematic Scene',
    templateText: 'Cinematic scene: {{scene_description}}, camera {{camera_movement}}, {{mood}} atmosphere, film grain, anamorphic lens',
    studioType: 'video',
    isSystem: true,
    tags: ['cinematic', 'scene', 'film'],
  },
  {
    name: 'Social Media Clip',
    templateText: 'Trendy social media video: {{content}}, vertical format 9:16, vibrant colors, fast-paced editing, {{platform}} style',
    studioType: 'video',
    isSystem: true,
    tags: ['social', 'short-form', 'trendy'],
  },
  // ... 3 template daha
];
```

#### 5.4.3 Audio Studio Template'leri
```typescript
const audioTemplates = [
  {
    name: 'Podcast Intro',
    templateText: 'Create a {{duration}} second podcast intro: {{style}} music, {{mood}} tone, professional quality, with a subtle sound effect at the end',
    studioType: 'audio',
    isSystem: true,
    tags: ['podcast', 'intro', 'music'],
  },
  // ... 4 template daha
];
```

#### 5.4.4 Cinema Studio Template'leri
- [ ] 5 cinema template seed'i yaz (script yazimi, sahne yonetimi vb.)

#### 5.4.5 Character/Persona Studio Template'leri
- [ ] 5 karakter template seed'i yaz (OC, NPC, avatar vb.)

#### 5.4.6 Fashion Studio Template'leri
- [ ] 5 moda template seed'i yaz (outfit, lookbook, runway vb.)

#### 5.4.7 Marketing Studio Template'leri
- [ ] 5 pazarlama template seed'i yaz (reklam, sosyal medya, banner vb.)

#### 5.4.8 Edit Studio Template'leri
- [ ] 5 duzenleme template seed'i yaz (renk duzeltme, stil transferi vb.)

- [ ] Toplam en az 40 sistem template'i seed et
- [ ] Her template icin `isSystem: true`, `isPublic: true`
- [ ] Her template icin uygun `tags` ve `category`
- [ ] Her template icin `variables` JSON yapisini tanimla

### 5.4.9 Pricing Matrix / Model Registry Seed'leri

> **Kaynak:** `src-tauri/src/modules/llm/registry.rs` — gercek fiyatlar

```typescript
// Mevcut ModelRegistry'den (registry.rs:32-40)
const modelPricing = [
  // Text Models
  { modelId: 'gpt-4o',            provider: 'openai',    inputCost1m: 5.0,      outputCost1m: 15.0,     isActive: true },
  { modelId: 'gpt-3.5-turbo',     provider: 'openai',    inputCost1m: 0.5,      outputCost1m: 1.5,      isActive: true },
  { modelId: 'gemini-1.5-flash',  provider: 'google',    inputCost1m: 0.075,    outputCost1m: 0.3,      isActive: true },
  { modelId: 'gemini-1.5-pro',    provider: 'google',    inputCost1m: 3.5,      outputCost1m: 10.5,     isActive: true },
  { modelId: 'gemini-2.0-flash',  provider: 'google',    inputCost1m: 0.1,      outputCost1m: 0.4,      isActive: true },
  { modelId: 'deepseek-chat',     provider: 'local',     inputCost1m: 0.1,      outputCost1m: 0.2,      isActive: true },
  { modelId: 'grok-1',            provider: 'local',     inputCost1m: 0.5,      outputCost1m: 1.5,      isActive: true },
  // Visual Models
  { modelId: 'dall-e-3',          provider: 'openai',    inputCost1m: 40000.0,  outputCost1m: 80000.0,  isActive: true },
];

// Legacy model remapping (registry.rs:20-29)
const legacyMappings = [
  { oldId: 'text-davinci-003',  newId: 'gpt-3.5-turbo'    },
  { oldId: 'gpt-4',             newId: 'gpt-4o'           },
  { oldId: 'gpt-4-turbo',       newId: 'gpt-4o'           },
  { oldId: 'gemini-pro',        newId: 'gemini-1.5-pro'   },
  { oldId: 'gemini-ultra',      newId: 'gemini-1.5-pro'   },
  { oldId: 'gemini-3flash',     newId: 'gemini-1.5-flash' },
];
```
- [ ] Pricing matrix tablosu veya Prisma modeli olustur
- [ ] Tum model fiyatlarini seed et (registry.rs ile birebir uyumlu)
- [ ] Legacy model mapping tablosu seed et
- [ ] Test ortaminda fiyat: $0.00 (mevcut seed.sql uyumlu)

### 5.5 Promo Code Seed'leri

```typescript
const promoCodes = [
  {
    code: 'WELCOME2026',
    discountPercent: 20,
    maxUses: 1000,
    validUntil: new Date('2026-12-31'),
    isActive: true,
  },
  {
    code: 'PROMTXBETA',
    discountAmount: 5.00,
    maxUses: 500,
    validUntil: new Date('2026-06-30'),
    isActive: true,
  },
  {
    code: 'FREECREDITS50',
    discountAmount: 50.00,
    maxUses: 100,
    validUntil: new Date('2026-12-31'),
    isActive: true,
    metadata: { type: 'credit_bonus', note: 'Beta tester reward' },
  },
  {
    code: 'INFLUENCER100',
    discountPercent: 100,
    maxUses: 10,
    validUntil: new Date('2026-12-31'),
    isActive: true,
    metadata: { type: 'influencer', note: 'Influencer partnership' },
  },
  {
    code: 'STARTUP2026',
    discountPercent: 50,
    maxUses: 200,
    validUntil: new Date('2026-09-30'),
    isActive: true,
  },
];
```
- [ ] 5 promo code seed'i yaz

### 5.6 Ornek Conversation ve Message Seed'leri

> **Mevcut seed.sql uyumluluk:** `sample-conv-001` conversation ID'si korunmali.
> **PromtxRole enum (schema.rs:6):** System, User, Assistant

```typescript
// Mevcut seed.sql'deki konusma (KORUNMALI)
const existingConversation = {
  id: 'sample-conv-001',
  title: 'System Integration Test',
  workspaceId: 'global-workspace-001',
  messages: [
    { id: 'msg-001', role: 'system', content: 'You are a helpful AI assistant.' },
    { id: 'msg-002', role: 'user', content: 'Run the database verification checklist.' },
  ],
};

// Yeni ornek konusmalar (her studio type icin birer tane)
const sampleConversations = [
  {
    title: 'Cinematic Portrait Session',
    studioType: 'image',
    userId: 'pro@promtx.os', // Pro kullanici
    messages: [
      { role: 'user', content: 'Create a cinematic portrait: young woman, neon-lit Tokyo alley, rain reflections, 85mm lens, f/1.4' },
      { role: 'assistant', content: 'A cinematic portrait photograph of a young woman standing in a neon-lit Tokyo alleyway during rainfall. Shot on 85mm f/1.4 lens, shallow depth of field, rain droplets catching cyan and magenta neon reflections. Wet pavement reflecting light, volumetric mist, film grain texture, Blade Runner inspired color grading, 8K resolution.' },
    ],
  },
  {
    title: 'Product Launch Video Concept',
    studioType: 'video',
    userId: 'enterprise@promtx.os',
    messages: [
      { role: 'user', content: 'Create a 30-second product reveal video concept for a sleek AI device' },
      { role: 'assistant', content: 'Opening shot: extreme close-up of glossy black surface, camera slowly pulls back revealing...' },
    ],
  },
  {
    title: 'Sci-Fi Character Design',
    studioType: 'character',
    userId: 'pro@promtx.os',
    messages: [
      { role: 'user', content: 'Design a cyberpunk bounty hunter character, female, age 25-35, athletic build' },
      { role: 'assistant', content: 'Cyberpunk bounty hunter: athletic female, 28 years old, mixed ethnicity. Neon-violet cybernetic left eye, short asymmetric black hair with holographic streaks. Tactical matte-black bodysuit with orange accents...' },
    ],
  },
  {
    title: 'Summer Collection Lookbook',
    studioType: 'fashion',
    userId: 'designer@promtx.os',
    messages: [
      { role: 'user', content: 'Generate a fashion lookbook concept: minimalist summer streetwear, Mediterranean setting' },
      { role: 'assistant', content: 'Mediterranean Minimalist Summer Collection: Oversized linen shirt in sand beige, high-waisted wide-leg trousers in cream...' },
    ],
  },
  {
    title: 'Short Film Scene',
    studioType: 'cinema',
    userId: 'filmmaker@promtx.os',
    messages: [
      { role: 'user', content: 'Write a scene: detective enters abandoned warehouse, discovers a clue, cinematic noir style' },
      { role: 'assistant', content: 'INT. ABANDONED WAREHOUSE - NIGHT\n\nShafts of moonlight cut through broken skylights. DETECTIVE KARA (40s, weathered) pushes open the rusted door...' },
    ],
  },
];
```
- [ ] 5 ornek konusma + mesajlar seed et (farkli studio type'lar)
- [ ] Her konusmada en az 2 mesaj (user + assistant)

### 5.7 DNA Vault Seed'leri

> **Kaynak:** `src/constants/studio_data.ts` — DNA Vault gercek alan yapisi
> **Kaynak:** `src-tauri/src/modules/llm/visual.rs` — DNA save/load
> DNA Vault alanlar: age, gender, ethnicity, hairColor, hairStyle, eyeColor, bodyType,
> complexion, facialStructure, expression, tattoo, scars, piercing, makeup, nails, teeth,
> facialHair, skinDetails, glasses, personality, aura, archetype, celebrity, visualStyle,
> clothingStyle, fabric, footwear, bottoms, action, aesthetic

```typescript
const sampleDna = [
  {
    name: 'Photorealistic Portrait DNA',
    description: 'Yuksek kaliteli fotorealist portre ayarlari',
    studioType: 'image',
    dnaJson: {
      // Karakter ozellikleri (studio_data.ts field_* alanlari)
      gender: 'female',
      age: '25-35',
      ethnicity: 'Mediterranean',
      hairColor: 'Brown',
      hairStyle: 'Wavy',
      eyeColor: 'Green',
      bodyType: 'Athletic',
      complexion: 'Olive',
      expression: 'Confident',
      // Teknik ayarlar
      style: 'photorealistic',
      quality: 'ultra_high',
      lighting: 'studio',
      camera: { model: 'Canon EOS R5', lens: '85mm f/1.4', iso: 100 },
      negativePrompts: ['cartoon', 'anime', 'illustration', 'low quality'],
    },
    isDefault: true,
  },
  {
    name: 'Cyberpunk Character DNA',
    description: 'Cyberpunk tarz karakter DNA profili',
    studioType: 'character',
    dnaJson: {
      gender: 'female',
      age: '18-25',
      ethnicity: 'East Asian',
      hairColor: 'Neon',
      hairStyle: 'Short',
      eyeColor: 'Blue',
      bodyType: 'Athletic',
      complexion: 'Fair',
      tattoo: 'Circuit patterns on arms',
      piercing: 'Cybernetic ear implants',
      makeup: 'Holographic lip gloss, neon eyeliner',
      visualStyle: 'cyberpunk',
      aesthetic: 'neon-noir',
      personality: 'Rebellious',
      archetype: 'Hacker',
    },
  },
  {
    name: 'High Fashion Model DNA',
    description: 'Moda studiosu icin model profili',
    studioType: 'fashion',
    dnaJson: {
      gender: 'female',
      age: '18-25',
      ethnicity: 'Nordic',
      hairColor: 'Blonde',
      hairStyle: 'Straight',
      eyeColor: 'Blue',
      bodyType: 'Thin',
      complexion: 'Porcelain',
      expression: 'Stoic',
      clothingStyle: 'Avant-garde',
      fabric: 'Silk, Leather',
      footwear: 'Stiletto heels',
      nails: 'Minimalist French tips',
      makeup: 'Editorial bold lips',
    },
  },
  {
    name: 'Anime Art DNA',
    description: 'Anime tarz cizim ayarlari',
    studioType: 'image',
    dnaJson: {
      style: 'anime',
      quality: 'high',
      lineWeight: 'medium',
      colorPalette: 'vibrant',
      influence: ['Studio Ghibli', 'Makoto Shinkai'],
      eyeColor: 'Violet',
      hairColor: 'Pink',
      hairStyle: 'Long',
    },
  },
  {
    name: 'Cinematic Video DNA',
    description: 'Film kalitesinde video ayarlari',
    studioType: 'cinema',
    dnaJson: {
      aspectRatio: '2.39:1',
      colorGrading: 'teal_orange',
      frameRate: 24,
      grain: 'subtle',
      lens: 'anamorphic',
    },
  },
];
```
- [ ] 5 ornek DNA vault seed'i yaz

### 5.8 Notification Seed'leri

```typescript
const sampleNotifications = [
  {
    type: 'system',
    title: 'Promtx\'e Hosgeldiniz!',
    body: 'AI destekli prompt muhendisligi platformuna hosgeldiniz. Baslamak icin bir studio secin.',
    data: { action: 'navigate', target: '/studio' },
  },
  {
    type: 'billing',
    title: 'Hosgeldin Kredisi',
    body: 'Hesabiniza 500 kredi hosgeldin bonusu eklendi.',
    data: { credits: 500 },
  },
  {
    type: 'generation',
    title: 'Ilk Gorseli Olusturun',
    body: 'Image Studio ile ilk AI gorselinizi olusturmaya hazir misiniz?',
    data: { action: 'navigate', target: '/studio/image' },
  },
];
```
- [ ] Her test kullaniciya 3 bildirim seed et

### 5.9 Referral Seed'leri
- [ ] Test kullanicilar arasi 2-3 referral kaydı olustur
- [ ] Farkli status'lerde: pending, completed

### 5.10 Token Usage Seed'leri (Analytics)

> **Kaynak:** `src-tauri/src/modules/llm/registry.rs` — gercek model listesi
> **Kaynak:** `src-tauri/src/ipc/commands/llm.rs:196` — provider tespiti: `gemini` -> google, diger -> openai

```typescript
// Son 30 gun icin rastgele token usage kayitlari
// GERCEK model ID'leri kullan (registry.rs'den)
const realModels = [
  { modelId: 'gemini-1.5-flash', provider: 'google' },
  { modelId: 'gemini-1.5-pro',   provider: 'google' },
  { modelId: 'gpt-4o',           provider: 'openai' },
  { modelId: 'gpt-3.5-turbo',    provider: 'openai' },
  { modelId: 'deepseek-chat',    provider: 'local' },
  { modelId: 'grok-1',           provider: 'local' },
  { modelId: 'dall-e-3',         provider: 'openai' }, // gorsel model
];

for (let i = 0; i < 100; i++) {
  const model = randomFrom(realModels);
  await prisma.tokenUsage.create({
    data: {
      userId: randomUser.id,
      modelId: model.modelId,
      provider: model.provider,
      studioType: randomFrom(['image', 'video', 'cinema', 'audio', 'character', 'fashion', 'marketing', 'edit']),
      inputTokens: randomInt(100, 5000),
      outputTokens: randomInt(50, 3000),
      costUsd: randomDecimal(0.001, 0.5),
      latencyMs: randomInt(200, 5000),
      createdAt: randomDateInLast30Days(),
    },
  });
}
```
- [ ] 100 token usage kaydı seed et (analytics dashboard icin)
- [ ] Gercek model ID'leri kullan (registry.rs ile birebir uyumlu)
- [ ] 8 studio type'in tumu temsil edilmeli
- [ ] Son 30 gun icine yayilmis tarihler

### 5.10.1 IAP Product ID Seed'leri

> **Kaynak:** Billing modul — `com.promtx.pro.monthly`, `com.promtx.pro.yearly`, `com.promtx.ent.monthly`

```typescript
const iapProducts = [
  { productId: 'com.promtx.pro.monthly',   platform: 'stripe', amount: 9.99,  currency: 'USD' },
  { productId: 'com.promtx.pro.yearly',    platform: 'stripe', amount: 99.99, currency: 'USD' },
  { productId: 'com.promtx.ent.monthly',   platform: 'stripe', amount: 49.99, currency: 'USD' },
  { productId: 'com.promtx.credits.100',   platform: 'stripe', amount: 4.99,  currency: 'USD' },
  { productId: 'com.promtx.credits.500',   platform: 'stripe', amount: 19.99, currency: 'USD' },
  { productId: 'com.promtx.credits.1000',  platform: 'stripe', amount: 34.99, currency: 'USD' },
];
```
- [ ] IAP product ID'lerini seed et (Stripe, Apple, Google Play platformlari)

### 5.11 Seed Calistirma
- [ ] `bunx prisma db seed` ile tum seed'leri calistir
- [ ] Seed sonrasi kayit sayilarini dogrula
- [ ] `bunx prisma studio` ile verileri gorsel kontrol et
- [ ] Seed'in idempotent oldugunu dogrula (tekrar calisinca hata vermemeli)

---

## BOLUM 6: POSTGRESQL YAPILANDIRMA

### 6.1 postgresql.conf
- [ ] `docker/postgres/conf/postgresql.conf` olustur
- [ ] Baglanti: `max_connections = 200`, `password_encryption = scram-sha-256`
- [ ] Bellek: `shared_buffers = 512MB`, `effective_cache_size = 1536MB`, `work_mem = 16MB`
- [ ] WAL: `wal_level = replica`, `max_wal_size = 2GB`, `min_wal_size = 512MB`
- [ ] Sorgu: `random_page_cost = 1.1` (SSD), `effective_io_concurrency = 200`
- [ ] Log: `log_min_duration_statement = 500`, `log_connections = on`, `log_timezone = 'Europe/Istanbul'`
- [ ] Autovacuum: `autovacuum = on`, `autovacuum_max_workers = 4`
- [ ] Paralel: `max_parallel_workers = 8`, `max_parallel_workers_per_gather = 4`
- [ ] Locale: `timezone = 'Europe/Istanbul'`

### 6.2 pg_hba.conf
- [ ] `docker/postgres/conf/pg_hba.conf` olustur
- [ ] Dev: `host all all 0.0.0.0/0 scram-sha-256`
- [ ] Prod: sadece Docker network + SSL zorunlu

### 6.3 Extensions
- [ ] `docker/postgres/init/01_extensions.sql` olustur
- [ ] `uuid-ossp`, `pgcrypto`, `pg_trgm`, `pg_stat_statements`
- [ ] (Prisma kendi migration'larini yonetir, ama extension'lar init script'te olmali)

---

## BOLUM 7: VERCEL DEPLOY ENTEGRASYONU

### 7.1 Vercel Proje Ayarlari
- [ ] Vercel'de yeni proje olustur: "promtx"
- [ ] GitHub repo'yu bagla
- [ ] Framework preset: Vite
- [ ] Build command: `bun run build`
- [ ] Output directory: `dist`
- [ ] Install command: `bun install`
- [ ] Node.js version: 20.x (Bun fallback icin)

### 7.2 Vercel Environment Variables
- [ ] `DATABASE_URL` — Production PostgreSQL connection string
- [ ] `REDIS_URL` — Production Redis connection string
- [ ] `GOOGLE_CLIENT_ID` — Google OAuth Client ID
- [ ] `GOOGLE_CLIENT_SECRET` — Google OAuth Client Secret
- [ ] `GOOGLE_REDIRECT_URI` — `https://promtx.vercel.app/auth/google/callback`
- [ ] `JWT_SECRET` — JWT signing secret
- [ ] `NEXTAUTH_SECRET` — Auth secret
- [ ] `STRIPE_SECRET_KEY` — Stripe API key
- [ ] `STRIPE_WEBHOOK_SECRET` — Stripe webhook secret
- [ ] `SENTRY_DSN` — Sentry error tracking
- [ ] `POSTHOG_KEY` — PostHog analytics key
- [ ] `VITE_API_URL` — Backend API URL
- [ ] Environment'lara gore ayir: Production, Preview, Development

### 7.3 Vercel Serverless Functions (API Routes)
- [ ] `api/` dizini olustur (Vercel serverless functions)
- [ ] `api/auth/google.ts` — Google OAuth redirect
- [ ] `api/auth/google/callback.ts` — Google OAuth callback
- [ ] `api/auth/login.ts` — Email/password login
- [ ] `api/auth/register.ts` — Email/password register
- [ ] `api/auth/refresh.ts` — Token refresh
- [ ] `api/health.ts` — Health check endpoint
- [ ] Her function icinde Prisma Client kullan
- [ ] Edge runtime dusun (cold start azaltma)

### 7.4 Vercel + PostgreSQL Baglantisi
- [ ] Vercel Postgres (Neon) veya external Supabase/Railway PostgreSQL
- [ ] Connection pooling: Prisma Data Proxy veya PgBouncer
- [ ] `DATABASE_URL` icinde `?pgbouncer=true&connection_limit=10` parametresi
- [ ] Serverless icin connection pooling stratejisi belgele

### 7.5 Vercel Domain ve DNS
- [ ] Custom domain: `promtx.ai` -> Vercel
- [ ] `www.promtx.ai` redirect -> `promtx.ai`
- [ ] SSL otomatik (Vercel managed)
- [ ] Preview deployments: `*.promtx.vercel.app`

### 7.6 vercel.json Yapilandirmasi
```json
{
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "framework": "vite",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" }
      ]
    }
  ]
}
```
- [ ] `vercel.json` dosyasi olustur
- [ ] SPA routing icin rewrite kurali
- [ ] API CORS headers
- [ ] Cache headers (statik dosyalar icin)

---

## BOLUM 8: RUST BACKEND DEGISIKLIKLERI

### 8.1 Cargo.toml — Prisma Entegrasyonu
- [ ] `prisma-client-rust` crate ekle (opsiyonel — Rust native Prisma)
  - [ ] Veya Bun/Node API layer kullan ve Rust'i sadece Tauri IPC icin tut
- [ ] Eski `sqlx` ve `sea-orm` bagimliliklarini asama asama kaldir
- [ ] `redis` crate sentinel feature: `redis = { version = "0.28", features = ["tokio-comp", "connection-manager", "sentinel"] }`
- [ ] Google OAuth icin: `oauth2` crate veya Bun API layer'da isle

### 8.2 Mimari Karar: Hibrit Yaklasim
- [ ] **Tauri IPC (Rust):** Yerel dosya islemleri, sistem entegrasyonlari, biometric
- [ ] **Bun API Layer:** Veritabani islemleri (Prisma), Auth (Google OAuth), Stripe webhook'lari
- [ ] **Vercel Serverless:** Web deploy icin API routes
- [ ] Frontend -> Bun API (web) VEYA Tauri IPC (desktop) -> PostgreSQL
- [ ] Ortak is mantigi `src/lib/api.ts` icinde, ortama gore backend sec

### 8.3 SQL Sozdizimi Degisiklikleri (Kalan Rust Kodu Icin)
- [ ] `?` placeholder -> `$1, $2, $3`
- [ ] `datetime('now')` -> `NOW()`
- [ ] `LIKE` -> `ILIKE`
- [ ] `GROUP_CONCAT` -> `STRING_AGG`
- [ ] `IFNULL` -> `COALESCE`
- [ ] `last_insert_rowid()` -> `RETURNING id`
- [ ] `0/1` boolean -> `true/false`
- [ ] `INSERT OR IGNORE` -> `INSERT ... ON CONFLICT DO NOTHING`
- [ ] `INTEGER PRIMARY KEY AUTOINCREMENT` -> `SERIAL` / `BIGSERIAL`
- [ ] `TEXT` JSON -> `JSONB`
- [ ] `BLOB` -> `BYTEA`
- [ ] `REAL` -> `NUMERIC` (para birimleri icin)
- [ ] SQLite FTS5 -> PostgreSQL `tsvector` + GIN index
- [ ] `Pool<Sqlite>` -> `Pool<Postgres>` (tum dosyalarda)

### 8.5 Guncellenmesi Gereken Tum IPC Komutlari

> **Kaynak:** `src-tauri/src/lib.rs` — tauri::invoke_handler

#### LLM Komutlari (`src-tauri/src/ipc/commands/llm.rs`)
- [ ] `generate_prompt` — SQL sorgularini PostgreSQL'e uyarla
- [ ] `generate_parallel_prompt` — batch insert kullan
- [ ] `stream_generate_prompt` — token_usage kaydi PostgreSQL
- [ ] `abort_prompt`
- [ ] `get_token_usage_history` — pagination (LIMIT/OFFSET)
- [ ] `get_token_usage_summary` — aggregate sorgular

#### Auth Komutlari (`src-tauri/src/ipc/commands/auth.rs`)
- [ ] `register` — UUID, RETURNING, transaction (wallet + user atomik)
- [ ] `login` — UUID karsilastirma, TIMESTAMPTZ
- [ ] `google_login` — UPSERT (`INSERT ... ON CONFLICT`), Account tablosu eklenmeli
- [ ] `verify_mfa` — TOTP dogrulama
- [ ] `rotate_token` — refresh token rotation, RETURNING
- [ ] `setup_2fa` — totp_secret kaydetme
- [ ] `get_referral_code` — referral tablosu sorgusu
- [ ] `create_api_key_cmd` — `ptx_` prefix, key_hash
- [ ] `verify_token` — JWT dogrulama (SQL degisikligi yok)
- [ ] `logout` — session status guncelleme
- [ ] `upload_avatar` — avatar_url guncelleme
- [ ] `impersonate_user` — admin icin 30dk session, audit log
- [ ] `forgot_password` — Resend email ile reset token

#### Billing Komutlari (`src-tauri/src/ipc/commands/billing.rs`)
- [ ] `get_wallet_balance` — `Decimal` okuma
- [ ] `create_topup_session` — Stripe checkout session
- [ ] `create_payment_intent` — Stripe payment intent
- [ ] `handle_stripe_webhook` — idempotency, event id kontrol
- [ ] `get_ledger_history` — pagination, TIMESTAMPTZ
- [ ] `validate_promo_code` — promo_codes tablosu sorgusu
- [ ] `verify_iap_receipt` — Apple/Google receipt dogrulama
- [ ] `download_receipt` — PDF generation

#### Admin Komutlari
- [ ] `admin_get_users` — pagination, ILIKE arama
- [ ] `admin_freeze_user` — is_frozen guncelleme, audit log
- [ ] `admin_update_credits` — wallet + ledger transaction
- [ ] `admin_logs` — audit_logs pagination

#### DNA Vault Komutlari
- [ ] `save_dna` — JSONB kaydetme, upsert
- [ ] `get_dna_vault` — JSONB sorgulama

#### Prompt History Komutlari
- [ ] `save_prompt_history` — meta_json -> JSONB
- [ ] `get_prompt_history` — pagination, studio_type filtre

#### Template Komutlari
- [ ] `save_prompt_template` — JSONB variables
- [ ] `get_prompt_templates` — studio_type + tags filtre
- [ ] `delete_prompt_template` — soft delete
- [ ] `expand_prompt_template` — variable substitution (SQL degisikligi yok)

#### Gorsel/Image Komutlari (`src-tauri/src/modules/llm/visual.rs`)
- [ ] `generate_image` — s3_key, size_bytes BIGINT
- [ ] `generate_variation` — parent_image_id FK
- [ ] `outpaint_image` — gorsel isleme
- [ ] `get_image_gallery` — pagination, user_id filtre
- [ ] `get_public_gallery` — `WHERE is_public = true`, pagination
- [ ] `toggle_public_status` — boolean toggle
- [ ] `set_display_name` — display_name guncelleme
- [ ] `share_image_asset` — paylasim URL olusturma
- [ ] `upscale_image` — gorsel isleme
- [ ] `optimize_visual_prompt` — prompt iyilestirme

#### TTS Komutlari
- [ ] `generate_speech` — audio generation

#### Workspace Komutlari
- [ ] `create_workspace` — UUID, RETURNING
- [ ] `list_workspaces` — owner_id + member sorgusu (JOIN)
- [ ] `invite_member` — workspace_invitations tablosu, email gonderimi
- [ ] `remove_member` — CASCADE dikkat

#### Storage/System Komutlari
- [ ] `check_llm_health` — provider health check
- [ ] `get_db_stats` — pg_stat_user_tables sorgusu
- [ ] `vacuum_database` — PostgreSQL'de VACUUM (farkli davranis!)
- [ ] `get_health_status` — tum servislerin durumu
- [ ] `get_metrics` — pg_stat_statements + custom metrikler
- [ ] `create_backup_cmd` — `pg_dump` bazli (SQLite backup API yerine)
- [ ] `restore_backup_cmd` — `pg_restore` bazli

#### Network Komutlari
- [ ] `get_network_status` — SQL degisikligi yok (HTTP check)
- [ ] `force_recheck_network` — SQL degisikligi yok
- [ ] `ping_services` — PostgreSQL + Redis ping ekle

#### Native Komutlari (SQL degisikligi yok)
- [ ] `process_image`, `get_memory_usage`, `extract_doc_text`, `process_text`
- [ ] `transcribe_audio`, `tokenize_text`

#### Event Komutlari
- [ ] `log_event` — audit_logs INSERT, JSONB metadata
- [ ] `submit_feedback` — feedbacks tablosu INSERT (BOLUM 14'te detayli, sadece text — dosya/PDF kabul edilmez)

### 8.4 Redis + Sentinel Client
- [ ] Redis baglanti modulu olustur (sentinel destekli)
- [ ] Cache key stratejisi:
  - [ ] `user:{id}:profile`
  - [ ] `user:{id}:wallet`
  - [ ] `session:{token}`
  - [ ] `rate:{ip}:{endpoint}`
- [ ] Cache invalidation: write-through + TTL
- [ ] Sentinel failover handling

---

## BOLUM 9: FRONTEND DEGISIKLIKLERI

### 9.1 Bun Script'leri Dogrulama
- [ ] `bun run dev` — Vite dev server (port 1420)
- [ ] `bun run build` — Production build
- [ ] `bun run preview` — Preview (port 4173)
- [ ] `bun run test` — Vitest
- [ ] `bun run lint` — TypeScript check
- [ ] `bun run e2e` — Playwright
- [ ] Tum script'lerin `bun` ile sorunsuz calistigini dogrula

### 9.2 Mevcut Route'lar ve Guncellenmesi Gerekenler

> **Kaynak:** `src/App.tsx` — React Router 7 lazy-loaded pages

| Route | Sayfa | Guncelleme |
|-------|-------|------------|
| `/` | PromptBuilder (Ana studio) | UUID ID'ler |
| `/wizard` | Wizard (AI-assisted prompt) | UUID |
| `/logs` | Logs (aktivite loglari) | PostgreSQL audit_logs sorgusu |
| `/dev` | DevTools | pg_stat kontrolu ekle |
| `/pricing` | Pricing (abonelik) | Prisma ile plan sorgusu |
| `/checkout` | Checkout (Stripe) | PostgreSQL ledger |
| `/help` | Help | Degisiklik yok |
| `/settings` | Settings | UUID, TOTP ayarlari |
| `/admin` | AdminDashboard | pg metrikleri, user CRUD |
| `/gallery` | Gallery (public gorsel) | is_public sorgusu, pagination |
| `/legal/privacy-policy` | PrivacyPolicy | Degisiklik yok |
| `/legal/terms-of-service` | TermsOfService | Degisiklik yok |
| `/legal/cookie-policy` | CookiePolicy | Degisiklik yok |
| `/auth/google/callback` | **YENI** | OAuth callback handler |

### 9.3 API Katmani Guncellemesi
- [ ] UUID formatinda ID'ler (mevcut TEXT ID -> UUID)
- [ ] ISO 8601 with timezone tarihler (TIMESTAMPTZ)
- [ ] Pagination response tipleri (cursor-based veya offset)
- [ ] Full-text search endpoint'leri (PostgreSQL tsvector)
- [ ] Google OAuth API cagrilari

### 9.4 Auth Flow Bilesenler
- [ ] Login sayfasi: Email/Password + Google OAuth (mevcut `login` komutu)
- [ ] Register sayfasi: Email/Password + Google OAuth (mevcut `register` komutu)
- [ ] Forgot password sayfasi (mevcut `forgot_password` komutu)
- [ ] 2FA/TOTP setup sayfasi (mevcut `setup_2fa` komutu)
- [ ] 2FA dogrulama dialog (mevcut `verify_mfa` komutu)
- [ ] OAuth callback handler: `/auth/google/callback`
- [ ] Auth state management (Zustand store guncelle — `src/lib/store.ts`)
- [ ] Protected route wrapper
- [ ] Auto-refresh token logic (mevcut `rotate_token` komutu)
- [ ] Impersonate mode indicator (admin icin — mevcut `impersonate_user`)

### 9.5 Yeni Bilesenler
- [ ] Google login butonu (`@react-oauth/google` veya custom)
- [ ] Notification bilesenni (real-time, Sonner toast ile entegre)
- [ ] Pagination bilesenni (gallery, prompt history, admin listeler)
- [ ] Full-text search bilesen (conversations arama)
- [ ] API key yonetim sayfasi (mevcut `create_api_key_cmd`)
- [ ] Referral kod paylasim bilesenni (mevcut `get_referral_code`)

### 9.6 Zustand Store Guncellemesi (`src/lib/store.ts`)
- [ ] `PromptHistoryItem` tip guncelleme: `id: string` (UUID formatinda gelecek)
- [ ] `PromptPreset` tip guncelleme: `id: string` (UUID)
- [ ] Auth state: `user`, `accessToken`, `refreshToken`, `isAuthenticated`
- [ ] Wallet state: `credits: number` (Decimal -> number frontend'de)
- [ ] Notification state: `unreadCount`, `notifications[]`
- [ ] Studio state guncelleme: 8 studio type enum uyumu
- [ ] Persistence middleware: IndexedDB (idb) ile uyumlu olmaya devam

---

## BOLUM 9B: STRIPE ABONELIK SISTEMI (SUBSCRIPTION)

> **Mevcut durum:** `src-tauri/src/modules/billing.rs`
> - `create_payment_intent()` — tek seferlik PaymentIntent (calisiyor)
> - `create_checkout_session()` — tek seferlik Checkout Session, `mode: "payment"` (calisiyor)
> - `handle_webhook()` — sadece `checkout.session.completed` ve `invoice.paid` (stub)
> - `validate_promo_code()` — hardcoded 3 kod: PROMTX20, LAUNCH50, WELCOME10
> - `generate_receipt()` — PDF receipt olusturma (calisiyor)
> - `process_refund()` — ledger reversal + receipt status guncelleme (calisiyor)
> - `apply_referral_code()` — referrer + referred bonus (calisiyor)
> - `validate_store_receipt()` — Apple/Google IAP stub (calisiyor)
>
> **Mevcut pricing tiers:** (`src/pages/Pricing.tsx`)
> - STARTER: $0/ay, 100 kredi (Free role)
> - CREATOR: $29/ay, 5000 kredi (Pro role)
> - STUDIO PRO: $69/ay, 15000 kredi (Enterprise role)
>
> **Mevcut IAP product -> role mapping:** (`src-tauri/src/modules/iap.rs:99`)
> - `com.promtx.pro.monthly` / `com.promtx.pro.yearly` -> Pro
> - `com.promtx.ent.monthly` -> Enterprise
> - Diger -> Free

### 9B.1 Stripe Product ve Price Tanimlari

- [ ] Stripe Dashboard'da Product'lar olustur:

| Product | Stripe Product ID | Aciklama |
|---------|------------------|----------|
| Promtx Starter | `prod_starter` | Ucretsiz plan |
| Promtx Creator | `prod_creator` | Profesyonel icerik uretimi |
| Promtx Studio Pro | `prod_studio_pro` | Tam studio erisimi |

- [ ] Stripe Price'lar olustur (recurring):

| Price | Product | Tutar | Periyot | Stripe Price ID |
|-------|---------|-------|---------|-----------------|
| Creator Aylik | Promtx Creator | $29/ay | monthly | `price_creator_monthly` |
| Creator Yillik | Promtx Creator | $290/yil (%17 indirim) | yearly | `price_creator_yearly` |
| Studio Pro Aylik | Promtx Studio Pro | $69/ay | monthly | `price_studio_pro_monthly` |
| Studio Pro Yillik | Promtx Studio Pro | $690/yil (%17 indirim) | yearly | `price_studio_pro_yearly` |

- [ ] Stripe Price ID'leri `.env.docker`'a ekle:
  - [ ] `STRIPE_PRICE_CREATOR_MONTHLY=price_xxx`
  - [ ] `STRIPE_PRICE_CREATOR_YEARLY=price_xxx`
  - [ ] `STRIPE_PRICE_STUDIO_PRO_MONTHLY=price_xxx`
  - [ ] `STRIPE_PRICE_STUDIO_PRO_YEARLY=price_xxx`

### 9B.2 Prisma Subscription Modelleri

```prisma
model Subscription {
  id                    String             @id @default(uuid())
  userId                String             @unique @map("user_id")
  stripeCustomerId      String             @unique @map("stripe_customer_id") @db.VarChar(255)
  stripeSubscriptionId  String?            @unique @map("stripe_subscription_id") @db.VarChar(255)
  stripePriceId         String?            @map("stripe_price_id") @db.VarChar(255)
  plan                  SubscriptionPlan   @default(starter)
  billingCycle          BillingCycle?      @map("billing_cycle")
  status                SubscriptionStatus @default(active)
  currentPeriodStart    DateTime?          @map("current_period_start")
  currentPeriodEnd      DateTime?          @map("current_period_end")
  cancelAtPeriodEnd     Boolean            @default(false) @map("cancel_at_period_end")
  canceledAt            DateTime?          @map("canceled_at")
  trialStart            DateTime?          @map("trial_start")
  trialEnd              DateTime?          @map("trial_end")
  monthlyCredits        Int                @default(100) @map("monthly_credits")
  creditsUsedThisPeriod Int                @default(0) @map("credits_used_this_period")
  metadata              Json               @default("{}")
  createdAt             DateTime           @default(now()) @map("created_at")
  updatedAt             DateTime           @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([stripeCustomerId])
  @@index([status])
  @@map("subscriptions")
}

model SubscriptionHistory {
  id                   String             @id @default(uuid())
  userId               String             @map("user_id")
  fromPlan             SubscriptionPlan   @map("from_plan")
  toPlan               SubscriptionPlan   @map("to_plan")
  fromPrice            String?            @map("from_price") @db.VarChar(255)
  toPrice              String?            @map("to_price") @db.VarChar(255)
  reason               String?            @db.VarChar(255)
  stripeEventId        String?            @map("stripe_event_id") @db.VarChar(255)
  createdAt            DateTime           @default(now()) @map("created_at")

  @@index([userId, createdAt(sort: Desc)])
  @@map("subscription_history")
}

enum SubscriptionPlan {
  starter       // Free — $0, 100 kredi
  creator       // Pro — $29/ay, 5000 kredi
  studio_pro    // Enterprise — $69/ay, 15000 kredi
}

enum BillingCycle {
  monthly
  yearly
}

enum SubscriptionStatus {
  active
  past_due
  canceled
  incomplete
  incomplete_expired
  trialing
  unpaid
  paused
}
```

- [ ] Subscription modeli Prisma schema'ya ekle
- [ ] SubscriptionHistory modeli ekle (plan degisiklik gecmisi)
- [ ] User modeline `subscription Subscription?` relation ekle
- [ ] `bunx prisma migrate dev --name add_subscriptions`
- [ ] Enum'lari ekle: `SubscriptionPlan`, `BillingCycle`, `SubscriptionStatus`

### 9B.3 Stripe Customer Olusturma

```rust
// billing.rs'e eklenecek
pub async fn get_or_create_customer(&self, user_id: &str, email: &str) -> Result<String, AppError> {
    // 1. DB'de mevcut stripe_customer_id var mi kontrol et
    // 2. Yoksa Stripe API ile olustur:
    //    POST https://api.stripe.com/v1/customers
    //    params: email, metadata[user_id], metadata[promtx_plan]
    // 3. DB'ye kaydet (subscriptions tablosu)
    // 4. stripe_customer_id don
}
```

- [ ] `get_or_create_customer()` fonksiyonu yaz
- [ ] Register sirasinda otomatik Stripe customer olustur
- [ ] Google login sirasinda da Stripe customer kontrol et/olustur
- [ ] Customer metadata'ya `user_id` ve `plan` ekle

### 9B.4 Subscription Checkout (Abonelik Baslatma)

```rust
// billing.rs — mevcut create_checkout_session'i genislet
pub async fn create_subscription_checkout(
    &self,
    user_id: &str,
    price_id: &str,  // price_creator_monthly, price_studio_pro_yearly vs.
    trial_days: Option<u32>,
) -> Result<String, AppError> {
    // Mevcut create_checkout_session'dan farkli:
    // mode: "subscription" (mevcut: "payment")
    // line_items[0][price]: price_id (mevcut: price_data inline)
    // subscription_data[trial_period_days]: 7 (opsiyonel)
    // subscription_data[metadata][user_id]: user_id
    // success_url: "promtx://subscription/success"
    // cancel_url: "promtx://subscription/cancel"
    // customer: stripe_customer_id (mevcut: yok — her seferinde yeni)
    // allow_promotion_codes: true (mevcut: var)
}
```

- [ ] `create_subscription_checkout()` fonksiyonu yaz
- [ ] `mode: "subscription"` kullan (mevcut `"payment"` degil)
- [ ] Mevcut `create_checkout_session()` korut — tek seferlik kredi yuklemeleri icin
- [ ] Trial period destegi: ilk 7 gun ucretsiz (opsiyonel)
- [ ] Stripe Customer ile iliskilendir (mevcut checkout'ta customer yok)
- [ ] Success/cancel URL'leri Tauri + Web icin ayir:
  - [ ] Tauri: `promtx://subscription/success`
  - [ ] Web: `https://promtx.ai/subscription/success`
  - [ ] Vercel: `https://promtx.vercel.app/subscription/success`

### 9B.5 Stripe Webhook Handler Genisletme

> **Mevcut:** `handle_webhook()` sadece `checkout.session.completed` ve `invoice.paid` (stub) isliyor

```rust
pub async fn handle_webhook(&self, event_type: &str, payload: Value, signature: Option<&str>) -> Result<(), AppError> {
    // ... mevcut HMAC dogrulama korunacak ...
    
    match event_type {
        // MEVCUT (calisiyor)
        "checkout.session.completed" => { /* mevcut: tek seferlik topup */ }
        
        // YENI: Abonelik basarili olusturuldu
        "customer.subscription.created" => {
            // 1. subscription_id, customer_id, price_id al
            // 2. DB'de subscription olustur/guncelle
            // 3. UserRole guncelle (Free -> Pro / Enterprise)
            // 4. Aylik kredi haklarini wallet'a ekle
            // 5. Hosgeldin email gonder (Resend API)
        }
        
        // YENI: Abonelik periyot yenilendi (aylik fatura odendi)
        "invoice.paid" => {
            // 1. subscription_id bul
            // 2. credits_used_this_period sifirla
            // 3. Aylik kredi haklarini wallet'a ekle (Creator: 5000, Studio Pro: 15000)
            // 4. current_period_start/end guncelle
            // 5. Ledger entry olustur (TransactionReason::Subscription)
            // 6. Receipt olustur (mevcut generate_receipt kullan)
        }
        
        // YENI: Fatura odenemedi
        "invoice.payment_failed" => {
            // 1. Subscription status -> past_due
            // 2. Kullaniciya email gonder (odeme hatasi)
            // 3. 3 basarisiz denemeden sonra: cancel
            // 4. SecurityEvent olustur
        }
        
        // YENI: Abonelik guncellendi (upgrade/downgrade)
        "customer.subscription.updated" => {
            // 1. Yeni price_id'den plan belirle
            // 2. UserRole guncelle
            // 3. Kredi haklari guncelle (prorate veya yeni periyod)
            // 4. SubscriptionHistory kaydı olustur
            // 5. Audit log yaz
        }
        
        // YENI: Abonelik iptal edildi
        "customer.subscription.deleted" => {
            // 1. Subscription status -> canceled
            // 2. UserRole -> Free
            // 3. monthlyCredits -> 100 (Starter default)
            // 4. cancel_at_period_end ise: periyod sonunda etkili olacak
            // 5. SubscriptionHistory kaydı olustur
            // 6. Iptal nedeni email gonder
        }
        
        // YENI: Trial bitiyor (3 gun kala bildirim)
        "customer.subscription.trial_will_end" => {
            // 1. Kullaniciya email gonder (trial bitiyor)
            // 2. In-app notification olustur
        }
        
        // YENI: Odeme yontemi guncellendi
        "payment_method.attached" => {
            // 1. Log kaydi
        }
        
        // YENI: Musteri silindi
        "customer.deleted" => {
            // 1. Subscription temizle
            // 2. UserRole -> Free
        }
        
        _ => {
            tracing::warn!("Billing: Unhandled webhook event type: {}", event_type);
        }
    }
}
```

- [ ] Webhook handler'i genislet — 8 yeni event type
- [ ] Her event icin idempotency kontrol (StripeEvent tablosuna kaydet, tekrar isleme)
- [ ] Basarisiz webhook'lar icin retry mekanizmasi
- [ ] Webhook endpoint'i Vercel'de de calistir (`api/webhooks/stripe.ts`)

### 9B.6 Abonelik Yonetimi (Customer Portal)

```rust
// billing.rs'e eklenecek
pub async fn create_customer_portal_session(&self, user_id: &str) -> Result<String, AppError> {
    // Stripe Customer Portal URL olustur
    // POST https://api.stripe.com/v1/billing_portal/sessions
    // customer: stripe_customer_id
    // return_url: "promtx://settings" veya "https://promtx.ai/settings"
    // Kullanici buradan: kart degistirme, plan degistirme, iptal yapabilir
}
```

- [ ] `create_customer_portal_session()` fonksiyonu yaz
- [ ] Stripe Dashboard'da Customer Portal ayarla:
  - [ ] Plan degisikligi (upgrade/downgrade) izin ver
  - [ ] Iptal izin ver (periyod sonunda etkili)
  - [ ] Fatura gecmisi goruntuleme
  - [ ] Odeme yontemi guncelleme
  - [ ] Promo code kullanimi
- [ ] Settings sayfasinda "Aboneligi Yonet" butonu ekle
- [ ] IPC komutu ekle: `manage_subscription`

### 9B.7 Plan Degisikligi (Upgrade / Downgrade)

```rust
pub async fn change_subscription_plan(
    &self,
    user_id: &str,
    new_price_id: &str,
    prorate: bool, // true: aninda fark odeme, false: sonraki periyodda
) -> Result<(), AppError> {
    // 1. Mevcut subscription_id al
    // 2. Stripe API: PATCH /v1/subscriptions/{sub_id}
    //    items[0][id]: mevcut item id
    //    items[0][price]: new_price_id
    //    proration_behavior: "create_prorations" veya "none"
    // 3. DB guncelle (plan, price_id)
    // 4. UserRole guncelle
    // 5. SubscriptionHistory kaydi
    // 6. Audit log
}
```

- [ ] Upgrade: Creator -> Studio Pro (aninda, prorate)
- [ ] Downgrade: Studio Pro -> Creator (periyod sonunda etkili)
- [ ] Downgrade: Creator -> Starter (iptal + periyod sonunda Free)
- [ ] Upgrade sirasinda mevcut kredi hakki korunmali
- [ ] Downgrade sirasinda fazla kredi kesilmemeli (mevcut bakiye kalir)

### 9B.8 Kredi Yonetimi (Abonelik Bazli)

| Plan | Aylik Kredi | Tasima | Ek Kredi |
|------|------------|--------|----------|
| Starter (Free) | 100 | Yok | Tek seferlik satin alim |
| Creator ($29) | 5000 | Maks 2000 sonraki aya | Tek seferlik satin alim |
| Studio Pro ($69) | 15000 | Maks 5000 sonraki aya | Tek seferlik satin alim |

- [ ] Aylik kredi yenileme: `invoice.paid` webhook'unda
- [ ] Kredi tasima mantigi: `carry_over_credits()` fonksiyonu
  - [ ] Periyod sonunda kullanilmayan kredilerin bir kismini tasima
  - [ ] Tasima limiti: plan bazli (yukaridaki tablo)
- [ ] `credits_used_this_period` sayaci: her generation'da artir
- [ ] Kredi bittiyse:
  - [ ] Starter: "Aboneliginizi yukseltin" mesaji goster
  - [ ] Creator/Studio Pro: "Ek kredi satin alin" secenegi (mevcut tek seferlik checkout)
- [ ] Abonelik iptali sonrasi: mevcut kredi bakiyesi korunur, yeni kredi eklenmez

### 9B.9 Stripe Webhook Endpoint (Vercel + Tauri)

#### Vercel API Route (`api/webhooks/stripe.ts`)
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const prisma = new PrismaClient();

export const config = { api: { bodyParser: false } }; // Raw body gerekli

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers['stripe-signature'] as string;
  const buf = await buffer(req);
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Idempotency: daha once islenmis mi?
  const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing?.processedAt) return res.json({ received: true, duplicate: true });
  
  // Event kaydet
  await prisma.stripeEvent.upsert({
    where: { id: event.id },
    update: {},
    create: { id: event.id, eventType: event.type, data: event.data as any },
  });
  
  // Event isle...
  switch (event.type) {
    case 'customer.subscription.created': /* ... */ break;
    case 'customer.subscription.updated': /* ... */ break;
    case 'customer.subscription.deleted': /* ... */ break;
    case 'invoice.paid': /* ... */ break;
    case 'invoice.payment_failed': /* ... */ break;
    // ...
  }
  
  // Islendi olarak isaretle
  await prisma.stripeEvent.update({
    where: { id: event.id },
    data: { processedAt: new Date(), status: 'completed' },
  });
  
  res.json({ received: true });
}
```

- [ ] `api/webhooks/stripe.ts` Vercel serverless function olustur
- [ ] Raw body parsing (Stripe imza dogrulamasi icin gerekli)
- [ ] Idempotency: StripeEvent tablosunda tekrar kontrol
- [ ] Error handling: basarisiz event'leri `retryCount` ile takip et
- [ ] Stripe Dashboard'da webhook endpoint URL'leri ekle:
  - [ ] Dev (Tauri): `stripe listen --forward-to localhost:3001/api/webhooks/stripe` (Stripe CLI)
  - [ ] Prod (Vercel): `https://promtx.ai/api/webhooks/stripe`
  - [ ] Preview: `https://promtx.vercel.app/api/webhooks/stripe`

### 9B.10 Frontend Abonelik Bilesen'leri

#### Pricing Sayfasi Guncellemesi (`src/pages/Pricing.tsx`)
- [ ] Mevcut TIERS yapisini koru ama genislet:
  ```typescript
  const TIERS = [
    {
      name: 'STARTER',
      plan: 'starter' as SubscriptionPlan,
      price: { monthly: 0, yearly: 0 },
      credits: 100,
      // ... mevcut features
      stripePriceId: { monthly: null, yearly: null },
    },
    {
      name: 'CREATOR',
      plan: 'creator' as SubscriptionPlan,
      price: { monthly: 29, yearly: 290 },
      credits: 5000,
      stripePriceId: {
        monthly: 'price_creator_monthly',
        yearly: 'price_creator_yearly',
      },
    },
    {
      name: 'STUDIO PRO',
      plan: 'studio_pro' as SubscriptionPlan,
      price: { monthly: 69, yearly: 690 },
      credits: 15000,
      stripePriceId: {
        monthly: 'price_studio_pro_monthly',
        yearly: 'price_studio_pro_yearly',
      },
    },
  ];
  ```
- [ ] Aylik/Yillik toggle switch ekle (yillik %17 indirim goster)
- [ ] Mevcut plan highlight'i (kullanicinin aktif planini isaretle)
- [ ] "Mevcut Plan" badge'i
- [ ] Upgrade butonu -> `create_subscription_checkout` IPC komutu
- [ ] Downgrade butonu -> onay dialog -> `change_subscription_plan`
- [ ] Free tier icin "Basla" butonu (kayit sayfasina yonlendir)

#### Subscription Status Bilesen'i (Settings sayfasi)
```typescript
// src/components/SubscriptionStatus.tsx
interface SubscriptionStatusProps {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  monthlyCredits: number;
  creditsUsed: number;
}
```
- [ ] Settings sayfasinda abonelik durumu karti
- [ ] Mevcut plan, sonraki yenileme tarihi, kredi kullanimi
- [ ] "Aboneligi Yonet" butonu -> Stripe Customer Portal
- [ ] "Plani Degistir" butonu -> Pricing sayfasi
- [ ] `cancelAtPeriodEnd` ise: "Aboneliginiz X tarihinde sona erecek" uyarisi
- [ ] Kredi kullanim cubugu (5000/5000 gibi progress bar)

#### Kredi Yetersiz Dialog'u
- [ ] Prompt generation sirasinda kredi yetersizse goster
- [ ] "Ek Kredi Satin Al" butonu (mevcut tek seferlik checkout)
- [ ] "Planini Yukselt" butonu (Pricing sayfasina yonlendir)
- [ ] Kalan kredi miktarini goster

#### Checkout Bilesen'leri
- [ ] `/checkout/subscription/success` sayfasi — abonelik basarili
- [ ] `/checkout/subscription/cancel` sayfasi — iptal edildi
- [ ] Mevcut `/checkout` sayfasi korunacak (tek seferlik kredi yuklemeleri icin)

### 9B.11 Abonelik Seed Data

```typescript
// prisma/seed.ts icine eklenecek

// Admin: Studio Pro abonelik
await prisma.subscription.upsert({
  where: { userId: adminUser.id },
  update: {},
  create: {
    userId: adminUser.id,
    stripeCustomerId: 'cus_test_admin_001',
    stripeSubscriptionId: 'sub_test_admin_001',
    stripePriceId: 'price_studio_pro_monthly',
    plan: 'studio_pro',
    billingCycle: 'monthly',
    status: 'active',
    monthlyCredits: 15000,
    creditsUsedThisPeriod: 3200,
    currentPeriodStart: new Date('2026-04-01'),
    currentPeriodEnd: new Date('2026-05-01'),
  },
});

// Pro kullanici: Creator abonelik (yillik)
await prisma.subscription.upsert({
  where: { userId: proUser.id },
  update: {},
  create: {
    userId: proUser.id,
    stripeCustomerId: 'cus_test_pro_001',
    stripeSubscriptionId: 'sub_test_pro_001',
    stripePriceId: 'price_creator_yearly',
    plan: 'creator',
    billingCycle: 'yearly',
    status: 'active',
    monthlyCredits: 5000,
    creditsUsedThisPeriod: 1800,
    currentPeriodStart: new Date('2026-01-15'),
    currentPeriodEnd: new Date('2027-01-15'),
  },
});

// Free kullanici: Starter (abonelik yok, sadece Stripe customer)
await prisma.subscription.upsert({
  where: { userId: freeUser.id },
  update: {},
  create: {
    userId: freeUser.id,
    stripeCustomerId: 'cus_test_free_001',
    plan: 'starter',
    status: 'active',
    monthlyCredits: 100,
    creditsUsedThisPeriod: 45,
  },
});

// Iptal edilmis abonelik ornegi
await prisma.subscription.upsert({
  where: { userId: designerUser.id },
  update: {},
  create: {
    userId: designerUser.id,
    stripeCustomerId: 'cus_test_designer_001',
    stripeSubscriptionId: 'sub_test_designer_001',
    stripePriceId: 'price_creator_monthly',
    plan: 'creator',
    billingCycle: 'monthly',
    status: 'active',
    cancelAtPeriodEnd: true, // Periyod sonunda iptal edilecek
    canceledAt: new Date('2026-04-20'),
    monthlyCredits: 5000,
    creditsUsedThisPeriod: 4100,
    currentPeriodStart: new Date('2026-04-01'),
    currentPeriodEnd: new Date('2026-05-01'),
  },
});

// Subscription history seed
await prisma.subscriptionHistory.createMany({
  data: [
    {
      userId: adminUser.id,
      fromPlan: 'creator',
      toPlan: 'studio_pro',
      reason: 'Upgrade — daha fazla kredi gerekti',
      createdAt: new Date('2026-03-15'),
    },
    {
      userId: designerUser.id,
      fromPlan: 'studio_pro',
      toPlan: 'creator',
      reason: 'Downgrade — maliyet optimizasyonu',
      createdAt: new Date('2026-02-01'),
    },
  ],
});
```

- [ ] Her test kullanici icin subscription seed et
- [ ] Admin: Studio Pro (aktif)
- [ ] Pro user: Creator yillik (aktif)
- [ ] Free user: Starter (Stripe customer var, abonelik yok)
- [ ] Designer: Creator (cancel_at_period_end = true)
- [ ] SubscriptionHistory ornekleri (upgrade + downgrade)

### 9B.12 Stripe Test Modu Kontrol Listesi

- [ ] Stripe Dashboard'da Test mode aktif
- [ ] Test API key'leri `.env.docker`'da:
  - [ ] `STRIPE_SECRET_KEY=sk_test_...`
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`
  - [ ] `STRIPE_WEBHOOK_SECRET=whsec_test_...`
- [ ] Stripe CLI kur: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
- [ ] Test kartlari:
  - [ ] Basarili odeme: `4242 4242 4242 4242`
  - [ ] Yetersiz bakiye: `4000 0000 0000 9995`
  - [ ] 3D Secure gerektiren: `4000 0025 0000 3155`
  - [ ] Iptal edilen kart: `4000 0000 0000 0341`
- [ ] Test senaryolari:
  - [ ] Starter -> Creator upgrade (aylik)
  - [ ] Creator -> Studio Pro upgrade (yillik)
  - [ ] Studio Pro -> Creator downgrade
  - [ ] Creator -> Starter iptal
  - [ ] Basarisiz odeme -> past_due -> retry
  - [ ] Trial baslat -> trial bitti -> ilk odeme
  - [ ] Promo code ile indirimli abonelik
  - [ ] Fatura goruntuleme (Customer Portal)
  - [ ] Kart degistirme (Customer Portal)

### 9B.13 IPC Komutlari (Yeni)

- [ ] `create_subscription_checkout` — Stripe subscription checkout URL don
- [ ] `get_subscription_status` — mevcut abonelik durumu (plan, kredi, tarih)
- [ ] `manage_subscription` — Customer Portal URL don
- [ ] `change_plan` — upgrade/downgrade
- [ ] `cancel_subscription` — periyod sonunda iptal
- [ ] `resume_subscription` — iptal edilen aboneligi geri al
- [ ] `get_invoices` — fatura gecmisi (Stripe API'den)
- [ ] `get_credit_usage` — bu periyottaki kredi kullanimi
- [ ] Mevcut `create_topup_session` korunacak — ek kredi icin tek seferlik odeme

---

## BOLUM 10: GUVENLIK

### 10.1 Auth Guvenlik
- [ ] Password hashing: Argon2 (mevcut — degisiklik yok)
- [ ] JWT token: RS256 veya HS256 + kisa omur (15 dk)
- [ ] Refresh token: Secure, HttpOnly cookie
- [ ] CSRF protection: state param (Google OAuth)
- [ ] Rate limiting: login endpoint (5 deneme / 15 dk)
- [ ] Account lockout: 5 basarisiz giris -> 30 dk kilitle
- [ ] Brute force detection: IP bazli izleme

### 10.2 Veritabani Guvenlik
- [ ] Parameterized queries (Prisma otomatik yapar)
- [ ] SSL baglanti (uretimde zorunlu)
- [ ] Role bazli erisim: `promtx_app` (sinirli yetki)
- [ ] PII koruma: email maskeleme, IP anonimize
- [ ] KVKK/GDPR: veri silme + export fonksiyonu

### 10.3 Network Guvenlik
- [ ] Docker network izolasyonu
- [ ] PostgreSQL: dis dunya'ya kapali (sadece Docker network)
- [ ] Redis: dis dunya'ya kapali
- [ ] Vercel: HTTPS zorunlu
- [ ] CORS: sadece izin verilen origin'ler

---

## BOLUM 11: CI/CD

### 11.1 GitHub Actions — Test Pipeline
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: promtx_test
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: promtx_test
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bunx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://promtx_test:test_password@localhost:5432/promtx_test
      - run: bunx prisma db seed
      - run: bun run test
      - run: bun run lint
```
- [ ] Test pipeline'i olustur (bun + prisma + postgres service)
- [ ] Build pipeline'i olustur
- [ ] Vercel preview deploy (PR'larda otomatik)

### 11.2 GitHub Actions — Build & Deploy
- [ ] `bun run build` ile production build
- [ ] Vercel CLI ile deploy: `bunx vercel --prod`
- [ ] Deploy oncesi `bunx prisma migrate deploy`
- [ ] Deploy sonrasi healthcheck

---

## BOLUM 12: YEDEKLEME VE MONITORING

### 12.1 Yedekleme
- [ ] Gunluk `pg_dump` ile tam yedek
- [ ] WAL archiving ile PITR (Point-in-Time Recovery)
- [ ] S3'e yedek yukleme
- [ ] 30 gun saklama politikasi
- [ ] Haftalik geri yukleme testi

### 12.2 Monitoring
- [ ] `pg_stat_statements` ile yavas sorgu tespiti
- [ ] Connection pool metrikleri
- [ ] Redis hit/miss orani
- [ ] Sentry ile hata takibi (mevcut — `@sentry/react`)
- [ ] PostHog ile kullanici analitigi (mevcut — `posthog-js`)
- [ ] Vercel Analytics (web deploy)

---

## BOLUM 13: ILK CALISTIRMA KONTROL LISTESI

### Faz 1: Temel Altyapi (1-2 Gun)
- [ ] 1. Docker Desktop kur
- [ ] 2. Bun versiyonunu dogrula
- [ ] 3. `docker-compose.yml` yaz
- [ ] 4. PostgreSQL + Redis servislerini baslat
- [ ] 5. Baglanti testi yap (`psql`, `redis-cli`)

### Faz 2: Prisma + Schema (1-2 Gun)
- [ ] 6. Prisma kur: `bun add -d prisma && bun add @prisma/client`
- [ ] 7. `schema.prisma` yaz (tum modeller)
- [ ] 8. `bunx prisma migrate dev --name init`
- [ ] 9. `bunx prisma generate`
- [ ] 10. `bunx prisma studio` ile tabloları kontrol et

### Faz 3: Seed Data (1 Gun)
- [ ] 11. `prisma/seed.ts` yaz
- [ ] 12. `bunx prisma db seed` calistir
- [ ] 13. Verileri gorsel kontrol et

### Faz 4: Google OAuth (1-2 Gun)
- [ ] 14. Google Cloud Console'da OAuth ayarla
- [ ] 15. Backend OAuth endpoint'lerini yaz
- [ ] 16. Frontend login/register butonlarini ekle
- [ ] 17. OAuth flow'u uc-uca test et

### Faz 5: Vercel Deploy (1 Gun)
- [ ] 18. `vercel.json` olustur
- [ ] 19. Vercel'de proje olustur ve env vars ekle
- [ ] 20. Preview deploy test et
- [ ] 21. Production deploy

### Faz 6: Sentinel + Guvenlik (1-2 Gun)
- [ ] 22. Redis Sentinel yapilandir
- [ ] 23. Rate limiting aktif et
- [ ] 24. SSL sertifikalari ayarla
- [ ] 25. Guvenlik kontrol listesini tamamla

### Faz 7: Dogrulama (1 Gun)
- [ ] 26. Register testi (email + Google)
- [ ] 27. Login testi (email + Google)
- [ ] 28. 2FA/TOTP setup ve dogrulama testi (`setup_2fa` + `verify_mfa`)
- [ ] 29. Prompt olusturma testi — her 8 studio icin:
  - [ ] Image Studio: `generate_prompt` + `generate_image`
  - [ ] Video Studio: `generate_prompt` (video prompt)
  - [ ] Cinema Studio: `generate_prompt` (script)
  - [ ] Audio Studio: `generate_speech`
  - [ ] Character Studio: DNA vault kaydet/yukle (`save_dna` + `get_dna_vault`)
  - [ ] Fashion Studio: `generate_prompt` (fashion prompt)
  - [ ] Marketing Studio: `generate_prompt` (marketing copy)
  - [ ] Edit Studio: `outpaint_image` + `upscale_image`
- [ ] 30. Kredi yukleme/harcama testi:
  - [ ] `get_wallet_balance` — bakiye goruntuleme
  - [ ] `create_topup_session` — Stripe checkout (test mode)
  - [ ] `get_ledger_history` — islem gecmisi
  - [ ] `validate_promo_code` — WELCOME2026 kodu ile test
- [ ] 31. Admin panel testi:
  - [ ] `admin_get_users` — kullanici listesi + pagination
  - [ ] `admin_freeze_user` — kullanici dondurma/acimatesti
  - [ ] `admin_update_credits` — kredi guncelleme
  - [ ] `admin_logs` — audit log goruntuleme
  - [ ] `get_metrics` — sistem metrikleri
  - [ ] `impersonate_user` — kullanici gibi goruntuleme
- [ ] 32. Workspace testi:
  - [ ] `create_workspace` — yeni workspace olustur
  - [ ] `invite_member` — uye davet et
  - [ ] `list_workspaces` — workspace listesi
- [ ] 33. Gallery testi:
  - [ ] `get_image_gallery` — kisisel galeri
  - [ ] `get_public_gallery` — public galeri + pagination
  - [ ] `toggle_public_status` — gorseli public yap/geri al
- [ ] 34. Search testi: full-text arama (conversations, prompt_history)
- [ ] 35. API key testi: `create_api_key_cmd` — `ptx_` prefix ile key olustur
- [ ] 36. Referral testi: `get_referral_code` — kod al, baska kullaniciya uygula
- [ ] 37. Network health: `ping_services` — PostgreSQL + Redis ping
- [ ] 38. Backup testi: `create_backup_cmd` + `restore_backup_cmd`
- [ ] 39. Prompt History testi:
  - [ ] `save_prompt_history` — her studio tipi icin kayit
  - [ ] `get_prompt_history` — pagination + filtre
  - [ ] `toggle_favorite` — favori isaretleme
  - [ ] `delete_prompt_history` — silme
  - [ ] Arama: prompt text icinde full-text search
- [ ] 40. Billing tam akis testi:
  - [ ] `get_wallet_balance` — bakiye goruntuleme
  - [ ] `create_subscription_checkout` — abonelik baslatma (Stripe test mode)
  - [ ] `get_subscription_status` — aktif plan kontrolu
  - [ ] `get_ledger_history` — islem gecmisi pagination
  - [ ] `get_receipts` — fatura listesi
  - [ ] `download_receipt` — PDF indirme
  - [ ] Upgrade/Downgrade akisi
- [ ] 41. Account yonetimi testi:
  - [ ] `get_linked_accounts` — bagli hesaplar listesi
  - [ ] `change_password` — sifre degistirme
  - [ ] `setup_2fa` + `verify_mfa` — 2FA aktif etme
  - [ ] `create_api_key_cmd` — API key olusturma
  - [ ] `export_user_data` — GDPR data export
- [ ] 42. Activity loglari testi:
  - [ ] Security logs: pagination + filtre (action, level, tarih)
  - [ ] Token usage: summary (daily/monthly/all) + model bazli breakdown
  - [ ] Aktif session listesi + uzaktan session sonlandirma
  - [ ] PDF export (mevcut jsPDF)
- [ ] 43. REST API testi (Vercel Serverless):
  - [ ] `POST /api/auth/login` — basarili + yanlis sifre + rate limit
  - [ ] `POST /api/auth/register` — basarili + duplicate email
  - [ ] `GET /api/gallery/public` — pagination + filtre (auth gereksiz)
  - [ ] `GET /api/prompt/history` — auth zorunlu + filtre
  - [ ] `GET /api/health` — uptime kontrolu
  - [ ] `POST /api/webhooks/stripe` — imza dogrulama
  - [ ] Response formati: IpcResponse ile birebir ayni
- [ ] 44. Galeri sistemi testi:
  - [ ] `get_my_gallery` — kisisel galeri + pagination + filtre
  - [ ] `get_public_gallery` — topluluk galerisi + siralama
  - [ ] `like_image` — like toggle + like sayisi guncelleme
  - [ ] `toggle_public_status` — public/private gecisi
  - [ ] `create_folder` + `move_to_folder` — klasor yonetimi
  - [ ] `share_gallery_item` — paylasim URL olusturma
  - [ ] `download_gallery_item` — gorsel indirme
  - [ ] `report_image` — icerik bildirimi
  - [ ] Toplu secim + toplu silme/tasima
- [ ] 45. Vercel'de canli test (API + frontend)
- [ ] 46. Performans baseline olcumu

---

## BOLUM 14: GERI BILDIRIM SISTEMI (FEEDBACK)

> **Mevcut durum:** `src/components/FeedbackModal.tsx` — 3 tip (Hata/Oneri/Diger), textarea, Tauri IPC ile gonderim
> **Mevcut IPC:** `submit_feedback` — feedback request alir, suan sadece log yaziyor
> **Hedef:** PostgreSQL'de feedbacks tablosuna kayit, admin panelinde yonetim, sadece metin bazli geri bildirim

### 14.1 Geri Bildirim Validasyonu (KRITIK — Sadece Mesaj)

> **KURAL:** Geri bildirim alani SADECE duz metin (plain text) kabul eder.
> Hicbir dosya, resim, PDF, video, ses dosyasi veya eklenti KABUL EDILMEZ.
> Bu karar bilerek alinmistir — guvenlik, depolama ve moderasyon basitligi icin.

#### Backend Validasyonu (Rust)
- [ ] `submit_feedback` IPC komutunu guncelle — Prisma/PostgreSQL'e INSERT
- [ ] Mesaj validasyonu:
  - [ ] Minimum uzunluk: 10 karakter (cok kisa mesajlari reddet)
  - [ ] Maksimum uzunluk: 5000 karakter (DB limiti ile uyumlu)
  - [ ] Sadece UTF-8 text kabul et
  - [ ] HTML tag'leri strip et (XSS onleme — `ammonia` crate veya regex)
  - [ ] Base64 encoded icerik tespiti ve reddi (dosya gizleme onleme)
  - [ ] URL/link filtreleme: mesajda URL varsa kabul et ama tiklanabilir yapma (plain text olarak sakla)
  - [ ] Bos satir normalizasyonu: ardarda 3+ bos satiri 2'ye dusur
- [ ] Dosya ekleme YETENEGINI backend'de tamamen devre disi birak:
  - [ ] `submit_feedback` komutunda `file`, `attachment`, `binary` parametresi OLMAMALI
  - [ ] `Content-Type` kontrolu: sadece `application/json` kabul et
  - [ ] Multipart form data KABUL EDILMEZ
- [ ] Rate limiting: kullanici basina 5 feedback / saat (spam onleme)
- [ ] Anonim feedback: giris yapmamis kullanicilar da gonderebilir (userId nullable)
- [ ] IP adresi ve User-Agent kaydet (abuse takibi icin)
- [ ] Debug context'i otomatik ekle (studio, promptType, viewport — mevcut FeedbackModal'daki gibi)

#### Frontend Validasyonu (`src/components/FeedbackModal.tsx`)
- [ ] Textarea'ya dosya surukle-birak (drag & drop) DEVRE DISI:
  - [ ] `onDrop` event'ini `preventDefault` + `stopPropagation` ile engelle
  - [ ] `onDragOver` event'ini engelle
  - [ ] Kullaniciya "Dosya eklenemez, sadece mesaj yazabilirsiniz" toast goster
- [ ] Textarea'ya yapistirma (paste) kontrolu:
  - [ ] `onPaste` event'inde `clipboardData.types` kontrol et
  - [ ] `text/plain` DISINDA bir sey yapistirmaya calisilirsa engelle
  - [ ] Resim yapistirma (screenshot paste) engelle
  - [ ] Dosya yapistirma engelle
  - [ ] "Sadece metin yapistirabilirsiniz" toast goster
- [ ] Karakter sayaci goster: `${message.length}/5000`
  - [ ] 4500+ karakterde sari uyari rengi
  - [ ] 5000'e ulasinca kirmizi + input durdur
- [ ] Minimum 10 karakter kontrolu — submit butonu 10 karaktere kadar disabled
- [ ] Tip secimi zorunlu (bug/feature/other) — mevcut haliyle uyumlu
- [ ] Gonderim sonrasi basari mesaji + modal kapat (mevcut haliyle korunacak)
- [ ] `<input type="file">` KESINLIKLE EKLENMEYECEK — dosya yukleme UI'i yok
- [ ] Emoji destegi: emojiler text olarak kabul edilir (engellenmez)

### 14.2 Feedback Prisma Modeli

> Schema: BOLUM 3.8.2'de tanimli (Feedback model)

- [ ] Migration olustur: `bunx prisma migrate dev --name add_feedback_table`
- [ ] Seed data: ornek feedback kayitlari ekle (bug + feature + other)

### 14.3 Admin Feedback Yonetimi

- [ ] Admin Dashboard'a "Geri Bildirimler" sekme/sayfa ekle
- [ ] Feedback listesi: tarih, tip, kullanici, durum ile filtrelenebilir tablo
- [ ] Durum degistirme: pending -> reviewing -> resolved / dismissed
- [ ] Admin notu ekleme (adminNote alani)
- [ ] Toplu islem: secili feedback'leri arsivle / sil
- [ ] Istatistikler: bug vs feature vs other dagilimi, gunluk/haftalik grafik
- [ ] IPC komutlari:
  - [ ] `list_feedbacks` — admin: tum feedback'leri listele (pagination + filter)
  - [ ] `update_feedback_status` — admin: durum degistir
  - [ ] `add_feedback_note` — admin: not ekle
  - [ ] `delete_feedback` — super_admin: kalici silme
  - [ ] `get_feedback_stats` — admin: istatistikler

### 14.4 Feedback Seed Data

```typescript
// prisma/seed.ts icine eklenecek
await prisma.feedback.createMany({
  data: [
    {
      userId: freeUser.id,
      type: 'bug',
      message: 'Image Studio\'da 16:9 aspect ratio sectigimde cikan gorsel 1:1 oluyor. Chrome 124, Windows 11.',
      status: 'reviewing',
      debugContext: { studio: 'image', promptType: 'detailed', viewport: '1920x1080' },
      createdAt: new Date('2026-04-20T14:30:00Z'),
    },
    {
      userId: proUser.id,
      type: 'feature',
      message: 'Video Studio\'ya batch generation eklenebilir mi? 10 prompt birden gonderip sirayla uretim yapilsa cok iyi olur.',
      status: 'pending',
      debugContext: { studio: 'video', promptType: 'simple', viewport: '2560x1440' },
      createdAt: new Date('2026-04-22T09:15:00Z'),
    },
    {
      userId: adminUser.id,
      type: 'other',
      message: 'Dark mode\'da Marketing Studio\'daki bazi text\'ler cok acik renkte, okunmuyor. Kontrast artirilabilir.',
      status: 'resolved',
      adminNote: 'Tailwind class guncellendi, v2.4.1 ile fix yayinlandi.',
      resolvedBy: adminUser.id,
      resolvedAt: new Date('2026-04-23T11:00:00Z'),
      debugContext: { studio: 'marketing', viewport: '1440x900' },
      createdAt: new Date('2026-04-21T16:45:00Z'),
    },
    {
      // Anonim feedback (giris yapmamis kullanici)
      type: 'bug',
      message: 'Pricing sayfasindaki countdown timer bazen negatif sayi gosteriyor. Tarih gectiginde sifirda kalmali.',
      status: 'pending',
      debugContext: { viewport: '375x812' },
      ipAddress: '192.168.1.100',
      createdAt: new Date('2026-04-24T20:00:00Z'),
    },
  ],
});
```

- [ ] 4 ornek feedback seed et (bug, feature, other, anonim)
- [ ] Farkli durumlar: pending, reviewing, resolved
- [ ] Debug context ornekleri

---

## BOLUM 15: STRIPE ODEME ALTYAPISI (EK GEREKSINIMLER)

> **Mevcut Stripe entegrasyonu:** BOLUM 9B'de detayli abonelik sistemi tanimli
> **Bu bolum:** Promtx'e ozel ek Stripe gereksinimleri, mevcut Checkout/Pricing ile uyum

### 15.1 Stripe Urun Yapisi (Promtx Pricing ile Uyum)

> **Kaynak:** `src/pages/Pricing.tsx` — 3 tier: STARTER ($0), CREATOR ($29), STUDIO PRO ($69)
> **Kaynak:** `src/pages/Checkout.tsx` — TL/USD cift para birimi, KDV hesabi, promo code

- [ ] Stripe Dashboard Product ayarlari:
  - [ ] Product metadata'ya `promtx_plan` ekle (starter/creator/studio_pro)
  - [ ] Product metadata'ya `monthly_credits` ekle (100/5000/15000)
  - [ ] Product description Turkce ve Ingilizce
- [ ] Stripe Tax ayarlari:
  - [ ] Turkiye KDV (%20) otomatik hesaplama: `automatic_tax: { enabled: true }`
  - [ ] Tax ID toplama: `tax_id_collection: { enabled: true }` (kurumsal musteriler icin)
  - [ ] Mevcut `Checkout.tsx`'teki %20 KDV hesabini Stripe'a devret (cift hesaplama onleme)
- [ ] Stripe Currency ayarlari:
  - [ ] Primary currency: USD
  - [ ] Mevcut `Checkout.tsx`'teki TL gosterimi icin: Stripe `currency: 'usd'` + frontend'de exchange rate ile TL goster (mevcut haliyle korunacak)
  - [ ] Exchange rate API: `open.er-api.com/v6/latest/USD` (mevcut Checkout.tsx'te var)
- [ ] Stripe Checkout Session olusturma ayarlari:
  - [ ] `allow_promotion_codes: true` (mevcut — Stripe tarafli promo code)
  - [ ] `billing_address_collection: 'auto'`
  - [ ] `customer_email` prefill (mevcut store'daki email)
  - [ ] `payment_method_types: ['card']` (Turkiye icin sadece kart)
  - [ ] `locale: 'tr'` (Turkce checkout deneyimi)
- [ ] Stripe Checkout branding:
  - [ ] Logo yukle (Promtx logo)
  - [ ] Brand color ayarla
  - [ ] Stripe Dashboard -> Settings -> Branding

### 15.2 Tek Seferlik Kredi Yukleme (Top-Up) — Mevcut Sistem Korunacak

> **Mevcut:** `create_checkout_session()` tek seferlik PaymentIntent, `mode: "payment"`
> **Kural:** Abonelik + tek seferlik yukleme BIRLIKTE calisacak

- [ ] Kredi paketleri tanimla:

| Paket | Kredi | Fiyat (USD) | Stripe Price ID |
|-------|-------|-------------|-----------------|
| Kucuk | 500 | $9.99 | `price_topup_500` |
| Orta | 2000 | $29.99 | `price_topup_2000` |
| Buyuk | 5000 | $59.99 | `price_topup_5000` |
| Mega | 15000 | $149.99 | `price_topup_15000` |

- [ ] Stripe'da one-time Price'lar olustur (`type: 'one_time'`)
- [ ] `create_topup_session` IPC komutu: mevcut `create_checkout_session` uzerine kurulacak
- [ ] Top-up basarili olunca: wallet'a kredi ekle + ledger entry (TransactionReason::TopUp)
- [ ] Top-up receipt PDF olustur (mevcut `generate_receipt` fonksiyonu)
- [ ] Checkout sayfasinda top-up paket secimi bilesen'i:
  - [ ] `/checkout/topup` route ekle
  - [ ] Kredi paketi kartlari (miktar + fiyat + "en populer" badge)

### 15.3 Stripe Promo Code Entegrasyonu

> **Mevcut:** `validate_promo_code()` — hardcoded 3 kod: PROMTX20, LAUNCH50, WELCOME10
> **Hedef:** Stripe Coupon/Promotion Code + DB PromoCode tablosu senkronizasyonu

- [ ] Stripe Dashboard'da Coupon'lar olustur:
  - [ ] `PROMTX20` — %20 indirim (tum planlar)
  - [ ] `LAUNCH50` — %50 indirim (ilk 3 ay)
  - [ ] `WELCOME10` — %10 indirim (ilk ay)
  - [ ] Yeni: `ANNUAL25` — %25 indirim (sadece yillik planlar)
- [ ] Stripe Promotion Code'lari Coupon'lara bagla
- [ ] Mevcut `validate_promo_code()` fonksiyonunu guncelle:
  - [ ] Once DB'den kontrol et (PromoCode tablosu)
  - [ ] DB'de yoksa Stripe API'den kontrol et: `GET /v1/promotion_codes?code=XXX`
  - [ ] Gecerlilik kontrol: expiry, max_uses, min_purchase
- [ ] Checkout'ta promo code uygulamasi:
  - [ ] Abonelik: `subscription_data.discounts` ile Stripe tarafli indirim
  - [ ] Top-up: `discounts` ile Stripe tarafli indirim
  - [ ] Mevcut frontend promo code input'u korunacak (`Checkout.tsx` line 66-74)

### 15.4 Stripe Fatura ve Receipt Yonetimi

> **Mevcut:** `generate_receipt()` — jsPDF ile PDF olusturma (calisiyor)

- [ ] Stripe Invoice ayarlari:
  - [ ] Otomatik fatura olusturma: abonelik odemeleri icin
  - [ ] Fatura numarasi formati: `PROMTX-2026-XXXX`
  - [ ] Fatura PDF'i Stripe'dan indirilebilir (Customer Portal)
- [ ] Mevcut `generate_receipt()` ile Stripe Invoice senkronizasyonu:
  - [ ] Stripe invoice URL'ini Receipt tablosunda sakla
  - [ ] Hem Stripe faturasi hem Promtx receipt PDF'i olustur
- [ ] Receipt'lari Settings sayfasinda listele:
  - [ ] Tarih, tutar, durum, PDF indirme butonu
  - [ ] Stripe Customer Portal'dan da erisilebilir

### 15.5 Stripe Guvenlik

- [ ] Webhook imza dogrulamasi: `stripe.webhooks.constructEvent()` (mevcut HMAC var)
- [ ] Idempotency: StripeEvent tablosunda event.id ile tekrar kontrol (BOLUM 9B.9'da tanimli)
- [ ] Stripe API key rotasyonu proseduru belgele
- [ ] PCI DSS uyumluluk: kart bilgileri ASLA Promtx sunucularinda saklanmaz (Stripe Elements kullan)
- [ ] Stripe Radar (fraud detection) aktif et
- [ ] Test/Live mode gecis kontrol listesi:
  - [ ] Tum `sk_test_` -> `sk_live_` degisimi
  - [ ] Tum `pk_test_` -> `pk_live_` degisimi
  - [ ] Webhook secret guncelleme
  - [ ] Product/Price ID'lerin live ortamda yeniden olusturulmasi
  - [ ] Customer Portal live URL

### 15.6 Mevcut Checkout.tsx Uyumluluk Kontrol Listesi

> **Kaynak:** `src/pages/Checkout.tsx` — TL/USD, exchange rate, promo code, KDV

- [ ] Mevcut exchange rate API (`open.er-api.com`) korunacak — sadece gorsel amaçli TL gosterimi
- [ ] Mevcut promo code input'u korunacak — backend validation ile calisacak
- [ ] Mevcut KDV (%20) hesabi: Stripe Tax aktif edilince frontend'den kaldirilacak veya sadece preview olarak kalacak
- [ ] Mevcut `handlePayment` fonksiyonu: `create_checkout_session` IPC -> Stripe URL -> openUrl (Tauri)
- [ ] Web (Vercel) icin: `window.location.href` ile Stripe Checkout'a yonlendir (openUrl yerine)
- [ ] Success callback: `/checkout/success` route'u
- [ ] Cancel callback: `/checkout/cancel` route'u

---

## BOLUM 16: SAYFA BAZLI POSTGRESQL GECIS GEREKSINIMLERI

> **Kapsam:** Her kullaniciya dokunan sayfanin PostgreSQL + Prisma gecisinde
> yapilmasi gereken spesifik isler. Bu bolum diger bolumlerdeki genel gereksinimleri
> sayfa bazinda somutlastirir.

---

### 16.1 GIRIS / KAYIT (Login & Register — `src/components/LoginModal.tsx`)

> **Mevcut:** `LoginModal.tsx` — 3 tab (login/register/forgot), email+password, Google OAuth, SSO placeholder
> **Mevcut IPC:** `login`, `register`, `google_login`, `forgot_password`
> **Mevcut Store:** `useAppStore` — `isAuthenticated`, `userToken`, `email`, `role`, `id`

#### 16.1.1 Register Flow (Kayit) — PostgreSQL Gecisi
- [ ] `register` IPC komutu guncelle:
  - [ ] `User` + `Wallet` + `Subscription(starter)` atomik transaction (tek islemde 3 tablo INSERT)
  - [ ] UUID `id` donmeli (`@id @default(uuid())`)
  - [ ] `passwordHash` argon2 ile hash'lenmeli (mevcut — degisiklik yok)
  - [ ] `role: 'free'` default (mevcut — degisiklik yok)
  - [ ] `isEmailVerified: false` default (yeni alan)
  - [ ] `locale`, `timezone` otomatik algilanmali (frontend'den gonderilmeli)
  - [ ] `createdAt` TIMESTAMPTZ olarak kaydedilmeli
  - [ ] `RETURNING id, email, role` ile response donmeli
  - [ ] Duplicate email kontrolu: `@unique` constraint -> `P2002` Prisma error handle
- [ ] Email dogrulama flow'u ekle:
  - [ ] Kayit sonrasi dogrulama email'i gonder (Resend API)
  - [ ] Email dogrulama token'i olustur (24 saat gecerli)
  - [ ] `/auth/verify-email?token=xxx` endpoint'i
  - [ ] `isEmailVerified` true yap
  - [ ] Dogrulanmamis hesaplar icin kisitlama: generation limiti (ornegin 10 kredi)
- [ ] Kayit sonrasi otomatik islemler:
  - [ ] Wallet olustur: `credits: 100` (Starter default)
  - [ ] Subscription olustur: `plan: 'starter'`, `status: 'active'`, `monthlyCredits: 100`
  - [ ] Stripe Customer olustur: `get_or_create_customer()` (BOLUM 9B.3)
  - [ ] Hosgeldin notification olustur (Notification tablosu)
  - [ ] AuditLog kaydi: `action: 'user.register'`
  - [ ] Referral kodu varsa: Referral tablosuna kaydet, bonus kredi ekle
- [ ] Frontend register form validasyonu (mevcut — genisletilecek):
  - [ ] Mevcut: ad, email, sifre, sifre tekrar (korunacak)
  - [ ] Mevcut: sifre guc cubugu (korunacak)
  - [ ] Mevcut: yaygın sifre kontrolu (korunacak)
  - [ ] Yeni: email format validasyonu (RFC 5322)
  - [ ] Yeni: Terms of Service + Privacy Policy onay checkbox'u (zorunlu)
  - [ ] Yeni: Kayit basarili -> email dogrulama sayfasina yonlendir
- [ ] Register response'da UUID formatinda `userId` donmeli (mevcut TEXT -> UUID)

#### 16.1.2 Login Flow (Giris) — PostgreSQL Gecisi
- [ ] `login` IPC komutu guncelle:
  - [ ] `WHERE email = $1` sorgusu PostgreSQL uyumlu (mevcut — degisiklik yok)
  - [ ] Password verify: argon2 (mevcut — degisiklik yok)
  - [ ] `loginCount` increment: `UPDATE users SET login_count = login_count + 1`
  - [ ] `lastLoginAt` guncelle: `NOW()` (TIMESTAMPTZ)
  - [ ] `failedLoginCount` yonetimi:
    - [ ] Basarisiz giris: `failed_login_count + 1`
    - [ ] 5 basarisiz giris: hesabi 15dk kilitle (`locked_until = NOW() + INTERVAL '15 minutes'`)
    - [ ] 10 basarisiz giris: hesabi 1 saat kilitle
    - [ ] Basarili giris: `failed_login_count = 0, locked_until = NULL`
  - [ ] `locked_until` kontrolu: `WHERE locked_until IS NULL OR locked_until < NOW()`
  - [ ] `isFrozen` kontrolu: donmus hesaplar giris yapamaz
  - [ ] Session olustur: `INSERT INTO sessions` (tokenHash, ipAddress, userAgent, deviceFingerprint)
  - [ ] JWT token olustur: `{ sub: userId, role, email, iat, exp }`
  - [ ] Refresh token olustur: `INSERT INTO refresh_tokens`
  - [ ] AuditLog kaydi: `action: 'user.login'`, IP + user agent
  - [ ] SecurityEvent: yeni cihaz/IP'den giris -> bildirim
- [ ] Frontend login sonrasi:
  - [ ] `setUserToken(token)` — mevcut (korunacak)
  - [ ] `setSubscriptionTier(role)` — mevcut (korunacak)
  - [ ] Yeni: `setUserId(userId)` — UUID formatinda
  - [ ] Yeni: `setEmail(email)` — store'a kaydet
  - [ ] Yeni: Wallet bakiyesini cek ve store'a kaydet
  - [ ] Yeni: Subscription bilgisini cek (plan, kredi, periyod)
  - [ ] Yeni: Okunmamis bildirim sayisini cek

#### 16.1.3 Google OAuth Login — PostgreSQL Gecisi
- [ ] `google_login` IPC komutu guncelle:
  - [ ] `Account` tablosuna `UPSERT` (`INSERT ... ON CONFLICT (provider, providerAccountId) DO UPDATE`)
  - [ ] `User` tablosuna `UPSERT` (email bazli — yoksa olustur, varsa login)
  - [ ] `passwordHash` NULL (Google ile giris yapanlar icin sifre yok)
  - [ ] `isEmailVerified: true` (Google zaten dogrulamis)
  - [ ] `avatarUrl` Google profile photo URL'si ile set et
  - [ ] `displayName` Google display name ile set et (eger bos ise)
  - [ ] Ilk Google login ise: Wallet + Subscription + Stripe Customer olustur (register ile ayni)
  - [ ] Session + JWT + Refresh token (login ile ayni)
- [ ] Frontend Google login butonu (mevcut `handleGoogle` — korunacak):
  - [ ] Deep-link callback: `deep-link://oauth-callback` (mevcut)
  - [ ] Web icin: redirect-based OAuth flow (yeni)
  - [ ] Token alma ve store'a kaydetme (mevcut)

#### 16.1.4 Sifremi Unuttum — PostgreSQL Gecisi
- [ ] `forgot_password` IPC komutu guncelle:
  - [ ] Password reset token olustur: `INSERT INTO password_reset_tokens` (yeni tablo veya SecurePayload kullan)
  - [ ] Token hash'le (argon2 veya SHA-256) ve DB'ye kaydet
  - [ ] Token 1 saat gecerli (`expires_at`)
  - [ ] Resend API ile sifre sifirlama email'i gonder
  - [ ] Rate limiting: ayni email icin 3 istek / saat
- [ ] `reset_password` IPC komutu (yeni):
  - [ ] Token dogrula (hash kontrolu + expiry)
  - [ ] Yeni sifreyi argon2 ile hash'le
  - [ ] `UPDATE users SET password_hash = $1 WHERE id = $2`
  - [ ] Tum mevcut session'lari revoke et (`UPDATE sessions SET status = 'revoked'`)
  - [ ] Tum refresh token'lari revoke et
  - [ ] AuditLog: `action: 'user.password_reset'`
  - [ ] Basarili sifirlama email'i gonder

#### 16.1.5 Logout — PostgreSQL Gecisi
- [ ] `logout` IPC komutu guncelle:
  - [ ] Session status: `UPDATE sessions SET status = 'logged_out' WHERE id = $1`
  - [ ] Refresh token revoke: `UPDATE refresh_tokens SET is_revoked = true WHERE session_id = $1`
  - [ ] AuditLog: `action: 'user.logout'`
- [ ] Frontend: mevcut `logout()` store action korunacak + token temizleme

---

### 16.2 PROMPT GECMISI (Prompt History — `src/lib/store.ts` + `src-tauri/src/ipc/commands/`)

> **Mevcut Frontend:** `useAppStore` — `promptHistory: PromptHistoryItem[]`, `addPromptToHistory()`, `toggleFavorite()`, `deletePromptFromHistory()`, `clearPromptHistory()`
> **Mevcut DB:** `prompt_history` tablosu (SQLite) — `PromptHistory` Prisma modeli (BOLUM 3.4)
> **Mevcut IPC:** `save_prompt_history`, `get_prompt_history`

#### 16.2.1 Prompt History Backend — PostgreSQL Gecisi
- [ ] `save_prompt_history` IPC guncelle:
  - [ ] `INSERT INTO prompt_history` PostgreSQL syntax
  - [ ] UUID `id` (mevcut TEXT -> UUID)
  - [ ] `userId` FK — zorunlu (giris yapmis kullanici)
  - [ ] `studioType` enum (8 studio: image/video/cinema/audio/character/fashion/marketing/edit)
  - [ ] `promptText` — olusturulan prompt metni
  - [ ] `generatedOutput` — AI ciktisi (nullable, buyuk olabilir)
  - [ ] `modelId` — kullanilan AI model (gemini-2.0-flash vs.)
  - [ ] `provider` — AIProvider enum (google/openai/anthropic/replicate...)
  - [ ] `parameters` — JSONB (formData, aspect ratio, quality settings vs.)
  - [ ] `qualityScore` — kullanici puani (nullable, 1-5)
  - [ ] `isFavorite` — favori isaretleme (default false)
  - [ ] `tags` — String[] (PostgreSQL array, aranabilir)
  - [ ] `createdAt` — TIMESTAMPTZ
  - [ ] RETURNING id, createdAt
- [ ] `get_prompt_history` IPC guncelle:
  - [ ] Cursor-based pagination: `WHERE created_at < $cursor ORDER BY created_at DESC LIMIT 50`
  - [ ] Filtreler:
    - [ ] `studioType` filtresi (tek veya coklu)
    - [ ] `isFavorite = true` filtresi (sadece favoriler)
    - [ ] `tags @> ARRAY['tag1']` filtresi (tag bazli arama)
    - [ ] `provider` filtresi
    - [ ] Tarih araligi: `created_at BETWEEN $start AND $end`
  - [ ] Full-text search: `promptText` icinde arama (PostgreSQL `ILIKE` veya `tsvector`)
  - [ ] Response: `{ items: PromptHistoryItem[], nextCursor: string | null, totalCount: number }`
- [ ] `toggle_favorite` IPC (yeni veya mevcut guncelle):
  - [ ] `UPDATE prompt_history SET is_favorite = NOT is_favorite WHERE id = $1 AND user_id = $2`
  - [ ] Yetki kontrolu: sadece kendi prompt'larini favoriye alabilir
- [ ] `delete_prompt_history` IPC (yeni):
  - [ ] `DELETE FROM prompt_history WHERE id = $1 AND user_id = $2`
  - [ ] Soft delete yerine hard delete (kullanici verisi, GDPR uyumlu silme)
- [ ] `clear_prompt_history` IPC (yeni):
  - [ ] `DELETE FROM prompt_history WHERE user_id = $1`
  - [ ] Onay gerektir (tehlikeli islem — frontend'de onay dialog'u)
- [ ] `rate_prompt` IPC (yeni):
  - [ ] `UPDATE prompt_history SET quality_score = $1 WHERE id = $2 AND user_id = $3`
  - [ ] Score: 1-5 arasi (integer)
- [ ] `add_tags_to_prompt` IPC (yeni):
  - [ ] `UPDATE prompt_history SET tags = tags || $1 WHERE id = $2 AND user_id = $3`
  - [ ] Duplicate tag eklemeyi onle

#### 16.2.2 Prompt History Frontend — PostgreSQL Gecisi
- [ ] `PromptHistoryItem` tip guncelle:
  ```typescript
  interface PromptHistoryItem {
    id: string;           // UUID (mevcut: nanoid)
    studioType: StudioType;
    promptText: string;
    generatedOutput?: string;
    modelId?: string;
    provider?: string;
    parameters: Record<string, any>; // JSONB
    qualityScore?: number;  // 1-5 (yeni)
    isFavorite: boolean;
    tags: string[];         // (yeni)
    createdAt: string;      // ISO 8601 with timezone
  }
  ```
- [ ] Zustand store'dan Prompt History'yi PostgreSQL'e tasima:
  - [ ] Mevcut: `promptHistory` state + localStorage persist -> Kaldirilacak
  - [ ] Yeni: Her islem IPC uzerinden DB'ye gidecek
  - [ ] `addPromptToHistory()` -> `invoke('save_prompt_history', { ... })`
  - [ ] `toggleFavorite()` -> `invoke('toggle_favorite', { id })`
  - [ ] `deletePromptFromHistory()` -> `invoke('delete_prompt_history', { id })`
  - [ ] `clearPromptHistory()` -> `invoke('clear_prompt_history')` + onay dialog
- [ ] Prompt History UI bilesen'i (mevcut veya yeni):
  - [ ] Infinite scroll / pagination (50 item per page)
  - [ ] Studio tipi filtre butonlari (8 studio icon'u)
  - [ ] "Sadece Favoriler" toggle switch
  - [ ] Arama cubugu (prompt text icinde search)
  - [ ] Tag filtreleme (tag chip'leri)
  - [ ] Tarih araligi secici (date range picker)
  - [ ] Her prompt karti: studio icon, prompt preview, model, tarih, favori yildizi, puan
  - [ ] Prompt kartina tikla -> prompt detayi dialog (tam metin + output + parameters)
  - [ ] "Tekrar Kullan" butonu — prompt'u ilgili studio'ya yukle
  - [ ] "Sil" butonu — onay dialog ile
  - [ ] Bos durum: "Henuz prompt gecmisiniz yok" empty state

---

### 16.3 BILLING (Faturalama — `src/pages/Pricing.tsx` + `src/pages/Checkout.tsx`)

> **Mevcut:** Pricing.tsx (3 tier), Checkout.tsx (TL/USD, promo, KDV), billing.rs (PaymentIntent, Checkout Session, Webhook)
> **Prisma:** Wallet, LedgerEntry, Subscription, SubscriptionHistory, Receipt, StripeEvent, IapTransaction
> **Detayli Stripe abonelik:** BOLUM 9B (korunacak)
> **Ek Stripe detaylari:** BOLUM 15 (korunacak)

#### 16.3.1 Billing Sayfalari — PostgreSQL Gecisi
- [ ] **Pricing Sayfasi** (`src/pages/Pricing.tsx`):
  - [ ] Mevcut 3 tier yapisi korunacak (STARTER/CREATOR/STUDIO PRO)
  - [ ] Kullanicinin aktif plan'ini DB'den cek ve highlight et:
    - [ ] `invoke('get_subscription_status')` -> `{ plan, status, credits, periodEnd }`
    - [ ] Aktif plan'a "Mevcut Plan" badge goster
    - [ ] Daha dusuk planlara "Downgrade" butonu, yuksek planlara "Upgrade" butonu
  - [ ] Aylik/Yillik toggle switch (BOLUM 9B.10'da tanimli)
  - [ ] Fiyat gosterimi: mevcut CountdownTimer korunacak
  - [ ] "Basla" butonu davranisi:
    - [ ] Giris yapmamis: LoginModal ac (register tab)
    - [ ] Starter (mevcut): "Mevcut Plan" goster
    - [ ] Creator/Studio Pro: `invoke('create_subscription_checkout', { priceId })` -> Stripe URL
- [ ] **Checkout Sayfasi** (`src/pages/Checkout.tsx`):
  - [ ] Mevcut TL/USD exchange rate korunacak
  - [ ] Mevcut promo code input korunacak
  - [ ] Mevcut KDV (%20) hesabi: Stripe Tax ile senkronize
  - [ ] `handlePayment` fonksiyonu:
    - [ ] Tauri: `invoke('create_checkout_session')` veya `invoke('create_subscription_checkout')` -> openUrl
    - [ ] Web: ayni invoke -> `window.location.href = stripeUrl`
  - [ ] Checkout tamamlandiktan sonra:
    - [ ] Wallet bakiyesini yeniden cek
    - [ ] Subscription status yeniden cek
    - [ ] Store'u guncelle
- [ ] **Checkout Success sayfasi** (yeni: `/checkout/success`):
  - [ ] Stripe redirect sonrasi gosterilecek
  - [ ] "Odemeniz basariyla alindi" mesaji
  - [ ] Yeni kredi bakiyesi goster
  - [ ] "Studio'ya Don" butonu
- [ ] **Checkout Cancel sayfasi** (yeni: `/checkout/cancel`):
  - [ ] "Islem iptal edildi" mesaji
  - [ ] "Pricing'e Don" butonu

#### 16.3.2 Wallet & Ledger — PostgreSQL Gecisi
- [ ] `get_wallet_balance` IPC guncelle:
  - [ ] `SELECT credits, lifetime_credits, currency FROM wallets WHERE user_id = $1`
  - [ ] `Decimal` -> frontend'de `number` olarak donmeli
  - [ ] Response: `{ credits: number, lifetimeCredits: number, currency: string }`
- [ ] `get_ledger_history` IPC guncelle:
  - [ ] `SELECT * FROM ledger_entries WHERE user_id = $1 ORDER BY created_at DESC`
  - [ ] Cursor-based pagination
  - [ ] Filtreler: `type` (credit/debit/refund...), tarih araligi
  - [ ] Response: `{ items: LedgerEntry[], nextCursor, totalCount }`
- [ ] `create_topup_session` IPC guncelle (mevcut — PostgreSQL uyarla):
  - [ ] Stripe Checkout Session olustur (`mode: 'payment'`)
  - [ ] Basarili odeme sonrasi: `INSERT INTO ledger_entries` + `UPDATE wallets SET credits = credits + $amount`
  - [ ] Transaction: wallet + ledger atomik (tek transaction)
- [ ] Kredi harcama (her prompt generation'da):
  - [ ] `pricing_matrix` tablosundan model maliyetini cek
  - [ ] `UPDATE wallets SET credits = credits - $cost WHERE user_id = $1 AND credits >= $cost`
  - [ ] Yetersiz kredi: islem reddi + "Kredi yetersiz" dialog (BOLUM 9B.10'da tanimli)
  - [ ] `INSERT INTO ledger_entries` (type: 'debit', description: model + studio)

#### 16.3.3 Receipt & Fatura — PostgreSQL Gecisi
- [ ] `download_receipt` IPC guncelle:
  - [ ] `SELECT * FROM receipts WHERE id = $1 AND user_id = $2`
  - [ ] Mevcut jsPDF + autoTable PDF olusturma korunacak
  - [ ] `invoice_number` formati: `PROMTX-2026-XXXX`
  - [ ] `billing_address` JSONB'den oku
- [ ] Receipt listesi IPC (yeni: `get_receipts`):
  - [ ] `SELECT * FROM receipts WHERE user_id = $1 ORDER BY created_at DESC`
  - [ ] Pagination
  - [ ] Settings sayfasinda veya ayri bir `/billing/receipts` sayfasinda goster
- [ ] Her odeme sonrasi otomatik Receipt olustur:
  - [ ] `INSERT INTO receipts` (order_id, amount, currency, tax_amount, status)
  - [ ] PDF generate et ve S3'e yukle (veya lokal sakla)
  - [ ] `pdf_url` ve `s3_key` kaydet

---

### 16.4 ACCOUNTS (Hesap Yonetimi — `src/components/AccountCenter.tsx` + `src/pages/Settings.tsx`)

> **Mevcut AccountCenter:** Kredi bakiyesi, session suresi, harcama grafigi
> **Mevcut Settings:** Email, dil, tema, geri bildirim, data export, neural engine, referral
> **Prisma:** User, Account, Session, ApiKey, Notification

#### 16.4.1 Hesap Bilgileri — PostgreSQL Gecisi
- [ ] **Profil Bilgileri** (Settings sayfasinda):
  - [ ] Email gosterimi: DB'den cek (mevcut store'dan — degisiklik yok)
  - [ ] Display name gosterimi ve duzenleme:
    - [ ] `invoke('set_display_name', { displayName })` — mevcut IPC
    - [ ] `UPDATE users SET display_name = $1 WHERE id = $2`
  - [ ] Avatar yukleme ve gosterim:
    - [ ] `invoke('upload_avatar', { file })` — mevcut IPC
    - [ ] Avatar S3'e yukle veya base64 olarak sakla
    - [ ] `UPDATE users SET avatar_url = $1 WHERE id = $2`
  - [ ] Dil tercihi kaydetme:
    - [ ] `UPDATE users SET locale = $1 WHERE id = $2` (mevcut frontend'de localStorage — DB'ye tasima)
  - [ ] Timezone:
    - [ ] `UPDATE users SET timezone = $1 WHERE id = $2`
    - [ ] Otomatik algilansin (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- [ ] **Bagli Hesaplar** (Accounts tablosu):
  - [ ] Bagli OAuth provider'lari listele:
    - [ ] `invoke('get_linked_accounts')` (yeni IPC)
    - [ ] `SELECT provider, provider_account_id, created_at FROM accounts WHERE user_id = $1`
    - [ ] Google baglanmis ise: Google icon + email goster
  - [ ] Yeni provider bagla:
    - [ ] "Google Hesabi Bagla" butonu (eger henuz baglanmamissa)
    - [ ] OAuth flow -> Account tablosuna INSERT
  - [ ] Provider baglantisini kes:
    - [ ] "Baglantıyı Kes" butonu (en az 1 giris yontemi kalmali — email+password veya baska provider)
    - [ ] `DELETE FROM accounts WHERE user_id = $1 AND provider = $2`
    - [ ] Kontrol: son giris yontemini silmeye izin verme
- [ ] **Sifre Degistirme**:
  - [ ] `invoke('change_password', { currentPassword, newPassword })` (yeni IPC)
  - [ ] Mevcut sifreyi dogrula (argon2 verify)
  - [ ] Yeni sifreyi hash'le ve kaydet
  - [ ] Diger tum session'lari revoke et (opsiyonel — "Diger cihazlardan cikis yap" checkbox)
  - [ ] AuditLog: `action: 'user.password_change'`
- [ ] **2FA / TOTP Yonetimi**:
  - [ ] `invoke('setup_2fa')` — mevcut IPC
  - [ ] TOTP secret olustur, QR code goster
  - [ ] `invoke('verify_mfa', { code })` — mevcut IPC
  - [ ] Dogrulama sonrasi: `UPDATE users SET totp_enabled = true, totp_secret = $1`
  - [ ] 2FA devre disi birakma: sifre dogrulamasi + `UPDATE users SET totp_enabled = false, totp_secret = NULL`
  - [ ] Yedek kodlar (backup codes) — SecurePayload tablosunda saklama
- [ ] **API Key Yonetimi**:
  - [ ] `invoke('create_api_key_cmd')` — mevcut IPC
  - [ ] Key listesi: `SELECT key_prefix, name, scopes, last_used_at, is_active FROM api_keys WHERE user_id = $1`
  - [ ] Key olustur: `ptx_` prefix + rastgele 32 karakter, hash'le ve kaydet
  - [ ] Key sil: `UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2`
  - [ ] Key scope yonetimi: `['read', 'write', 'generate']`

#### 16.4.2 AccountCenter Bilesen'i — PostgreSQL Gecisi
- [ ] **Kredi Bakiyesi** (mevcut — DB'den cek):
  - [ ] Mevcut `userCredits` store value -> DB'den anlik cek
  - [ ] `invoke('get_wallet_balance')` -> `{ credits, lifetimeCredits }`
  - [ ] Progress bar: `creditsUsedThisPeriod / monthlyCredits` orani
  - [ ] "Kredi Yukle" butonu -> Checkout sayfasi
- [ ] **Abonelik Durumu** (yeni — AccountCenter'a ekle):
  - [ ] Aktif plan adi (Starter/Creator/Studio Pro)
  - [ ] Sonraki yenileme tarihi (`currentPeriodEnd`)
  - [ ] Iptal durumu varsa: "X tarihinde sona erecek" uyarisi
  - [ ] "Plani Degistir" butonu -> Pricing sayfasi
- [ ] **Session Suresi** (mevcut — degisiklik yok):
  - [ ] Mevcut elapsed time sayaci korunacak
- [ ] **Bildirimler** (yeni):
  - [ ] Okunmamis bildirim sayisi badge
  - [ ] `invoke('get_notifications', { unreadOnly: true })` -> `Notification[]`
  - [ ] Bildirim listesi dropdown/modal
  - [ ] Okundu isaretleme: `UPDATE notifications SET is_read = true, read_at = NOW()`

#### 16.4.3 Data Export — PostgreSQL Gecisi
- [ ] Mevcut `handleExportData` (Settings.tsx) guncelle:
  - [ ] Mevcut: local store'dan JSON export (email, tier, credits, usage)
  - [ ] Yeni: DB'den tum kullanici verisini cek ve export et:
    - [ ] `invoke('export_user_data')` (yeni IPC)
    - [ ] User profil bilgileri
    - [ ] Prompt history (tum kayitlar)
    - [ ] Wallet + ledger history
    - [ ] Image generations
    - [ ] DNA vault
    - [ ] Conversations + messages
  - [ ] GDPR uyumlu: kullanici tum verisini indirebilmeli
  - [ ] Format: JSON (mevcut) + opsiyonel CSV

#### 16.4.4 Hesap Silme (Account Deletion)
- [ ] `invoke('delete_account')` (yeni IPC):
  - [ ] Sifre dogrulamasi gerektir
  - [ ] Stripe aboneligi iptal et (aninda)
  - [ ] 30 gun soft delete suresi (geri alinabilir)
  - [ ] `UPDATE users SET deleted_at = NOW(), is_frozen = true`
  - [ ] 30 gun sonra hard delete: tum iliskili veriler CASCADE silinir
  - [ ] AuditLog: `action: 'user.delete_request'`
  - [ ] Iptal email'i gonder: "Hesabiniz 30 gun icinde silinecek"
  - [ ] Geri alma linki: "Hesabinizi geri almak icin tiklayin"

---

### 16.5 USERS (Kullanici Yonetimi — Admin — `src/pages/AdminDashboard.tsx`)

> **Mevcut:** AdminDashboard.tsx — kullanici listesi, audit log, metrikler, freeze/unfreeze
> **Mevcut IPC:** `admin_get_users`, `admin_freeze_user`, `admin_update_credits`, `admin_logs`, `impersonate_user`
> **Prisma:** User, Wallet, Subscription, AuditLog, Session

#### 16.5.1 Kullanici Listesi — PostgreSQL Gecisi
- [ ] `admin_get_users` IPC guncelle:
  - [ ] `SELECT u.*, w.credits, s.plan, s.status FROM users u LEFT JOIN wallets w ON w.user_id = u.id LEFT JOIN subscriptions s ON s.user_id = u.id`
  - [ ] Cursor-based veya offset pagination: `LIMIT 25 OFFSET $offset`
  - [ ] Arama: `WHERE email ILIKE '%$term%' OR display_name ILIKE '%$term%'`
  - [ ] Filtreler:
    - [ ] Role: `WHERE role = $role` (free/pro/enterprise/admin/super_admin)
    - [ ] Durum: `WHERE is_frozen = true/false`
    - [ ] Plan: `WHERE s.plan = $plan` (starter/creator/studio_pro)
    - [ ] Kayit tarihi: `WHERE created_at BETWEEN $start AND $end`
  - [ ] Siralama: `ORDER BY created_at DESC` (default), `email ASC`, `login_count DESC`
  - [ ] Response:
    ```typescript
    {
      users: {
        id: string;
        email: string;
        displayName: string | null;
        role: UserRole;
        isFrozen: boolean;
        isEmailVerified: boolean;
        loginCount: number;
        lastLoginAt: string | null;
        credits: number;
        plan: SubscriptionPlan;
        subscriptionStatus: SubscriptionStatus;
        createdAt: string;
      }[];
      totalCount: number;
      page: number;
      pageSize: number;
    }
    ```
- [ ] Frontend kullanici listesi tablosu:
  - [ ] Mevcut `UserRecord` interface guncelle (subscription, credits ekle)
  - [ ] Tablo sutunlari: Email, Ad, Rol, Plan, Kredi, Durum, Son Giris, Kayit Tarihi
  - [ ] Arama cubugu (mevcut `searchTerm` — korunacak)
  - [ ] Filtre dropdown'lari (role, plan, durum)
  - [ ] Pagination kontrolleri (onceki/sonraki/sayfa numarasi)

#### 16.5.2 Kullanici Detay & Islemleri — PostgreSQL Gecisi
- [ ] **Kullanici Detay Sayfasi** (yeni veya modal):
  - [ ] Profil bilgileri: email, displayName, avatarUrl, role, locale, timezone
  - [ ] Hesap durumu: isFrozen, isEmailVerified, loginCount, lastLoginAt, failedLoginCount
  - [ ] Bagli hesaplar: Account tablosundaki provider'lar
  - [ ] Abonelik: plan, status, currentPeriodEnd, creditsUsed/monthlyCredits
  - [ ] Wallet: credits, lifetimeCredits
  - [ ] Son aktivite: son 10 audit log kaydi
  - [ ] Session listesi: aktif session'lar (IP, cihaz, tarih)
- [ ] **Kullanici Dondurma/Acma**:
  - [ ] `admin_freeze_user` IPC guncelle:
    - [ ] `UPDATE users SET is_frozen = $1 WHERE id = $2`
    - [ ] Dondurulunca: tum aktif session'lari revoke et
    - [ ] AuditLog: `action: 'admin.freeze_user'` veya `'admin.unfreeze_user'`
    - [ ] Notification: kullaniciya "Hesabiniz donduruldu" bildirimi
- [ ] **Kredi Yonetimi**:
  - [ ] `admin_update_credits` IPC guncelle:
    - [ ] `UPDATE wallets SET credits = credits + $amount WHERE user_id = $1`
    - [ ] `INSERT INTO ledger_entries` (type: 'adjustment', description: 'Admin kredi ayarlamasi')
    - [ ] Negatif ayarlama: kredi dusurme (ama 0'in altina dusurme)
    - [ ] AuditLog: `action: 'admin.update_credits'`, eski/yeni bakiye
- [ ] **Rol Degistirme** (yeni):
  - [ ] `invoke('admin_change_role', { userId, newRole })` (yeni IPC)
  - [ ] `UPDATE users SET role = $1 WHERE id = $2`
  - [ ] Rol degisikligi Subscription ile senkronize edilmeli
  - [ ] AuditLog: `action: 'admin.change_role'`
  - [ ] Sadece super_admin rol degistirebilir
- [ ] **Impersonate (Kullanici Gibi Goruntule)**:
  - [ ] `impersonate_user` IPC (mevcut — korunacak):
    - [ ] 30dk gecerli gecici session olustur
    - [ ] `ImpersonationBanner` bilesen'i goster (mevcut — korunacak)
    - [ ] AuditLog: `action: 'admin.impersonate'`
    - [ ] Impersonate sirasinda: yazma/silme islemleri YASAK (read-only)

#### 16.5.3 Admin Metrikleri — PostgreSQL Gecisi
- [ ] `get_db_stats` IPC guncelle:
  - [ ] `SELECT relname, n_live_tup FROM pg_stat_user_tables` — tablo bazli kayit sayisi
  - [ ] Response: `{ users: N, conversations: N, promptHistory: N, images: N, ... }`
- [ ] `get_metrics` IPC guncelle:
  - [ ] Toplam kullanici sayisi (role bazli dagilim)
  - [ ] Aktif abonelik sayisi (plan bazli dagilim)
  - [ ] Gunluk/haftalik/aylik yeni kayit sayisi
  - [ ] Toplam gelir (sum of ledger_entries where type = 'credit')
  - [ ] En cok kullanilan studioType
  - [ ] En cok kullanilan AI model
  - [ ] Ortalama session suresi
- [ ] Admin Dashboard UI:
  - [ ] Mevcut metrik kartlari korunacak (activeUsers, systemLoad, apiCalls, dbStatus)
  - [ ] Yeni: Plan dagilimi pasta grafigi
  - [ ] Yeni: Gunluk kayit/giris trendi cizgi grafigi
  - [ ] Yeni: Gelir trendi grafigi

---

### 16.6 ACTIVITY (Aktivite Loglari — `src/pages/Logs.tsx`)

> **Mevcut:** Logs.tsx — 2 tab: security (audit logs) + tokens (token usage)
> **Mevcut IPC:** `admin_logs`, `get_token_usage_history`, `get_token_usage_summary`
> **Prisma:** AuditLog, SecurityEvent, AppLog, TokenUsage

#### 16.6.1 Security Logs (Guvenlik Loglari) — PostgreSQL Gecisi
- [ ] `admin_logs` IPC guncelle (kullanici kendi loglarini gorsun):
  - [ ] Kullanici: `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC`
  - [ ] Admin: `SELECT * FROM audit_logs ORDER BY created_at DESC` (tum kullanicilar)
  - [ ] Cursor-based pagination: `LIMIT 50`
  - [ ] Filtreler:
    - [ ] `action` filtresi: login, logout, register, password_change, generation, billing vs.
    - [ ] `level` filtresi: debug, info, warn, error, critical
    - [ ] Tarih araligi
    - [ ] IP adresi
  - [ ] Response:
    ```typescript
    {
      logs: {
        id: string;
        action: string;
        level: LogLevel;
        ipAddress: string | null;
        userAgent: string | null;
        metadata: Record<string, any>; // JSONB
        createdAt: string;
      }[];
      nextCursor: string | null;
      totalCount: number;
    }
    ```
- [ ] Frontend security log tablosu guncelle:
  - [ ] Mevcut `LogEntry` interface'i PostgreSQL response'a uyarla
  - [ ] Mevcut `fetchLogs` fonksiyonunu pagination destekli yap
  - [ ] Mevcut arama cubugu: `action ILIKE` ve `metadata` JSONB icinde arama
  - [ ] Log detay modal'i: tiklayinca metadata JSONB'yi goster
  - [ ] Cihaz/OS/browser bilgisi: `userAgent` parse (mevcut — korunacak)
  - [ ] CSV / PDF export (mevcut PDF export korunacak — jsPDF)

#### 16.6.2 Token Usage Logs — PostgreSQL Gecisi
- [ ] `get_token_usage_history` IPC guncelle:
  - [ ] `SELECT * FROM token_usage WHERE user_id = $1 ORDER BY created_at DESC`
  - [ ] Cursor-based pagination
  - [ ] Filtreler: `modelId`, `provider`, `studioType`, tarih araligi
  - [ ] `isCached` filtresi (cache hit'leri ayir)
  - [ ] Response: `{ items: TokenUsageRecord[], nextCursor, totalCount }`
- [ ] `get_token_usage_summary` IPC guncelle:
  - [ ] `SELECT SUM(input_tokens), SUM(output_tokens), SUM(cost_usd), COUNT(*) FROM token_usage WHERE user_id = $1 AND created_at BETWEEN $start AND $end`
  - [ ] Periyot bazli: daily, weekly, monthly, all
  - [ ] Model bazli breakdown: `GROUP BY model_id`
  - [ ] Studio bazli breakdown: `GROUP BY studio_type`
  - [ ] Response:
    ```typescript
    {
      totalInputTokens: number;
      totalOutputTokens: number;
      totalCostUsd: number;
      generationCount: number;
      periodStart: string;
      periodEnd: string;
      byModel: { modelId: string, tokens: number, cost: number }[];
      byStudio: { studioType: string, count: number, cost: number }[];
    }
    ```
- [ ] Frontend token usage tablosu guncelle:
  - [ ] Mevcut `TokenUsageRecord` ve `TokenUsageSummary` interface'lerini guncelle
  - [ ] Mevcut `tokenPeriod` (daily/monthly/all) secici korunacak
  - [ ] Yeni: model bazli dagilim grafigi (bar chart)
  - [ ] Yeni: studio bazli dagilim grafigi (pie chart)
  - [ ] Yeni: gunluk kullanim trendi (line chart)
  - [ ] Mevcut session-level token sayaci (`sessionInputTokens`, `sessionOutputTokens`) korunacak

#### 16.6.3 Aktivite Ozeti (Dashboard) — Yeni
- [ ] Logs sayfasina "Ozet" tab'i ekle (mevcut security + tokens'a ek):
  - [ ] Son 24 saat aktivite ozeti:
    - [ ] Toplam generation sayisi
    - [ ] Harcanan kredi
    - [ ] En cok kullanilan studio
    - [ ] En cok kullanilan model
  - [ ] Son 7 gun grafigi (gunluk generation sayisi + maliyet)
  - [ ] Son giris bilgileri: IP, cihaz, zaman (SecurityEvent'ten)
  - [ ] Aktif session'lar listesi: `SELECT * FROM sessions WHERE user_id = $1 AND status = 'active'`
    - [ ] "Bu cihaz" isaretleme
    - [ ] "Cikis Yap" butonu (uzaktan session sonlandirma)
    - [ ] `UPDATE sessions SET status = 'revoked' WHERE id = $1`

---

## BOLUM 17: REST API KATMANI (PROMTX BACKEND API)

> **Mevcut durum:** Promtx simdi sadece Tauri IPC ile calisiyor (desktop). Web (Vercel) icin HTTP REST API lazim.
> **Mevcut altyapi:** `src/lib/api.ts` — `apiInvoke()` fonksiyonu zaten hibrit calisiyor:
>   - Tauri ortaminda: `invoke(cmd, args)` (IPC)
>   - Web ortaminda: `fetch(WEB_API_BASE_URL/cmd, { body: args })` (HTTP)
> **Mevcut base URL:** `VITE_API_URL || 'https://api.promtx.app'`
> **Hedef:** Basit bir REST API olustur ki Vercel + web istemci promtx'e baglanabilsin.
> **Teknoloji:** Vercel Serverless Functions (TypeScript) + Prisma Client

### 17.1 API Mimarisi

> **Karar:** Iki katmanli mimari
> 1. **Tauri Desktop:** Rust IPC komutlari (mevcut — degisiklik yok)
> 2. **Web/Vercel:** TypeScript REST API (Vercel Serverless Functions + Prisma)
> Her iki katman da ayni PostgreSQL veritabanina baglaniyor.
> Frontend'deki `apiInvoke()` zaten ikisini otomatik ayiriyor.

```
┌─────────────────┐     ┌──────────────────────────┐
│  Tauri Desktop   │     │  Web Browser (Vercel)     │
│  (React + Rust)  │     │  (React + Fetch API)      │
└────────┬────────┘     └────────────┬───────────────┘
         │ IPC                       │ HTTPS
         ▼                           ▼
┌────────────────┐      ┌──────────────────────────┐
│  Rust Backend  │      │  Vercel Serverless API    │
│  (Tauri cmds)  │      │  (TypeScript + Prisma)    │
└────────┬───────┘      └────────────┬──────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────────────────────────────────┐
│          PostgreSQL 16 + Redis 7                 │
└─────────────────────────────────────────────────┘
```

- [ ] Mimari dokumani hazirla (yukaridaki diyagram)
- [ ] Frontend `apiInvoke()` zaten hazir — ek degisiklik gereksiz
- [ ] API route isimlendirme kurali: `POST /api/{command}` (IPC komut ismiyle ayni)

### 17.2 API Dizin Yapisi

```
promtx/
├── api/                          # Vercel Serverless Functions
│   ├── _lib/                     # Paylasilabilir yardimcilar
│   │   ├── prisma.ts             # Prisma Client singleton
│   │   ├── auth.ts               # JWT dogrulama middleware
│   │   ├── redis.ts              # Redis client
│   │   ├── errors.ts             # Standart hata response'lari
│   │   ├── validate.ts           # Request validasyonu (zod)
│   │   └── rateLimit.ts          # Rate limiting (Redis bazli)
│   │
│   ├── auth/
│   │   ├── login.ts              # POST /api/auth/login
│   │   ├── register.ts           # POST /api/auth/register
│   │   ├── google.ts             # GET  /api/auth/google (redirect)
│   │   ├── google/
│   │   │   └── callback.ts       # GET  /api/auth/google/callback
│   │   ├── refresh.ts            # POST /api/auth/refresh
│   │   ├── logout.ts             # POST /api/auth/logout
│   │   ├── forgot-password.ts    # POST /api/auth/forgot-password
│   │   ├── reset-password.ts     # POST /api/auth/reset-password
│   │   └── verify-email.ts       # GET  /api/auth/verify-email?token=xxx
│   │
│   ├── user/
│   │   ├── me.ts                 # GET  /api/user/me (profil)
│   │   ├── update.ts             # PATCH /api/user/update
│   │   ├── avatar.ts             # POST /api/user/avatar
│   │   ├── linked-accounts.ts    # GET  /api/user/linked-accounts
│   │   ├── change-password.ts    # POST /api/user/change-password
│   │   ├── export-data.ts        # GET  /api/user/export-data
│   │   ├── delete-account.ts     # DELETE /api/user/delete-account
│   │   └── notifications.ts      # GET  /api/user/notifications
│   │
│   ├── prompt/
│   │   ├── generate.ts           # POST /api/prompt/generate
│   │   ├── history.ts            # GET  /api/prompt/history
│   │   ├── [id]/
│   │   │   ├── favorite.ts       # PATCH /api/prompt/{id}/favorite
│   │   │   ├── rate.ts           # PATCH /api/prompt/{id}/rate
│   │   │   ├── tags.ts           # PATCH /api/prompt/{id}/tags
│   │   │   └── index.ts          # DELETE /api/prompt/{id}
│   │   └── templates.ts          # GET  /api/prompt/templates
│   │
│   ├── gallery/
│   │   ├── index.ts              # GET  /api/gallery (kisisel galeri)
│   │   ├── public.ts             # GET  /api/gallery/public (public galeri — auth gereksiz)
│   │   ├── [id]/
│   │   │   ├── index.ts          # GET  /api/gallery/{id} (tek gorsel detay)
│   │   │   ├── toggle-public.ts  # PATCH /api/gallery/{id}/toggle-public
│   │   │   ├── like.ts           # POST /api/gallery/{id}/like
│   │   │   ├── download.ts       # GET  /api/gallery/{id}/download
│   │   │   └── share.ts          # POST /api/gallery/{id}/share
│   │   ├── upload.ts             # POST /api/gallery/upload (dis kaynak gorsel)
│   │   ├── folders.ts            # GET/POST /api/gallery/folders
│   │   └── stats.ts              # GET  /api/gallery/stats
│   │
│   ├── billing/
│   │   ├── wallet.ts             # GET  /api/billing/wallet
│   │   ├── ledger.ts             # GET  /api/billing/ledger
│   │   ├── checkout.ts           # POST /api/billing/checkout
│   │   ├── subscription.ts       # GET  /api/billing/subscription
│   │   ├── receipts.ts           # GET  /api/billing/receipts
│   │   ├── promo.ts              # POST /api/billing/promo (validate)
│   │   └── topup.ts              # POST /api/billing/topup
│   │
│   ├── workspace/
│   │   ├── index.ts              # GET/POST /api/workspace
│   │   ├── [id]/
│   │   │   ├── members.ts        # GET/POST/DELETE /api/workspace/{id}/members
│   │   │   └── invite.ts         # POST /api/workspace/{id}/invite
│   │
│   ├── admin/
│   │   ├── users.ts              # GET  /api/admin/users
│   │   ├── users/[id].ts         # GET/PATCH /api/admin/users/{id}
│   │   ├── logs.ts               # GET  /api/admin/logs
│   │   ├── metrics.ts            # GET  /api/admin/metrics
│   │   └── feedbacks.ts          # GET  /api/admin/feedbacks
│   │
│   ├── feedback.ts               # POST /api/feedback
│   │
│   ├── webhooks/
│   │   └── stripe.ts             # POST /api/webhooks/stripe
│   │
│   └── health.ts                 # GET  /api/health (public — auth gereksiz)
```

- [ ] `api/` dizin yapisini olustur
- [ ] Her endpoint Vercel Serverless Function olarak calisacak
- [ ] Dosya isimlendirme: Vercel file-based routing kurali (`api/auth/login.ts` -> `POST /api/auth/login`)

### 17.3 Paylasilabilir API Yardimcilari (`api/_lib/`)

#### 17.3.1 Prisma Client Singleton
```typescript
// api/_lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] Prisma Client singleton olustur (serverless cold start optimizasyonu)
- [ ] Connection pooling: `DATABASE_URL` icinde `?connection_limit=5` (serverless icin dusuk)
- [ ] Prisma Data Proxy veya PgBouncer dusun (cok sayida concurrent function icin)

#### 17.3.2 JWT Auth Middleware
```typescript
// api/_lib/auth.ts
import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export async function authenticate(req: NextApiRequest): Promise<AuthUser> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new ApiError(401, 'Token gerekli');

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  
  // Session aktif mi kontrol et
  const session = await prisma.session.findFirst({
    where: { userId: decoded.sub, status: 'active' },
  });
  if (!session) throw new ApiError(401, 'Gecersiz session');

  return { userId: decoded.sub, email: decoded.email, role: decoded.role };
}

export function requireRole(...roles: string[]) {
  return (user: AuthUser) => {
    if (!roles.includes(user.role)) throw new ApiError(403, 'Yetersiz yetki');
  };
}
```

- [ ] JWT dogrulama middleware yaz
- [ ] `Authorization: Bearer <token>` header'dan token al
- [ ] Token'i dogrula (jsonwebtoken veya jose)
- [ ] Session aktiflik kontrolu (DB'den)
- [ ] Role-based access control: `requireRole('admin', 'super_admin')`
- [ ] Token expired ise: 401 + `{ code: 'TOKEN_EXPIRED' }` (frontend auto-refresh tetiklesin)

#### 17.3.3 Standart API Response Formati
```typescript
// api/_lib/errors.ts
export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) {
    super(message);
  }
}

// Tum endpoint'ler bu formati kullanacak:
// Basari:  { status: 'success', data: T }
// Hata:    { status: 'error', error: string, code?: string }
// Bu format mevcut IpcResponse<T> ile BIREBIR AYNI — frontend degisiklik gereksiz.

export function success<T>(data: T) {
  return { status: 'success' as const, data };
}

export function error(message: string, code?: string) {
  return { status: 'error' as const, error: message, code };
}
```

- [ ] Standart response formati: `{ status: 'success' | 'error', data?, error? }`
- [ ] **KRITIK:** Mevcut `IpcResponse<T>` ile birebir ayni format — frontend hicbir degisiklik gerektirmez
- [ ] `ApiError` class'i: HTTP status code + mesaj + opsiyonel code

#### 17.3.4 Request Validasyonu (Zod)
```typescript
// api/_lib/validate.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  role: z.enum(['Free']).default('Free'),
});

export const feedbackSchema = z.object({
  feedback_type: z.enum(['bug', 'feature', 'other']),
  message: z.string().min(10).max(5000),
  debug_context: z.record(z.any()).optional(),
});

// ... diger schema'lar
```

- [ ] `bun add zod` (runtime validation)
- [ ] Her endpoint icin zod schema tanimla
- [ ] Request body'yi validate et, gecersizse 400 don
- [ ] Zod hatalarini kullanici dostu mesajlara cevir

#### 17.3.5 Rate Limiting (Redis Bazli)
```typescript
// api/_lib/rateLimit.ts
import { redis } from './redis';

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const current = await redis.incr(`rl:${key}`);
  if (current === 1) await redis.expire(`rl:${key}`, windowSeconds);
  return current <= limit;
}
```

- [ ] Redis bazli rate limiting
- [ ] Endpoint bazli limitler:
  - [ ] Auth endpoints: 10 istek / 15dk / IP
  - [ ] Generation endpoints: 30 istek / dk / kullanici
  - [ ] Gallery public: 100 istek / dk / IP
  - [ ] Genel: 200 istek / dk / kullanici
- [ ] Rate limit asildiysa: `429 Too Many Requests` + `Retry-After` header

### 17.4 Ornek API Endpoint Implementasyonu

#### Auth Login Endpoint
```typescript
// api/auth/login.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { loginSchema } from '../_lib/validate';
import { success, error, ApiError } from '../_lib/errors';
import { rateLimit } from '../_lib/rateLimit';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json(error('Method not allowed'));

  try {
    // Rate limiting
    const ip = req.headers['x-forwarded-for'] as string || 'unknown';
    if (!await rateLimit(`login:${ip}`, 10, 900)) {
      return res.status(429).json(error('Cok fazla deneme. 15 dakika sonra tekrar deneyin.'));
    }

    // Validate
    const body = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return res.status(401).json(error('Gecersiz email veya sifre'));

    // Check frozen
    if (user.isFrozen) return res.status(403).json(error('Hesabiniz dondurulmustur'));

    // Check locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json(error('Hesabiniz gecici olarak kilitli'));
    }

    // Verify password
    if (!user.passwordHash || !await argon2.verify(user.passwordHash, body.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
      });
      return res.status(401).json(error('Gecersiz email veya sifre'));
    }

    // Create session + JWT
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Update login stats
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    return res.status(200).json(success({ token, role: user.role, userId: user.id }));
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.statusCode).json(error(err.message));
    console.error('Login error:', err);
    return res.status(500).json(error('Sunucu hatasi'));
  }
}
```

- [ ] Login endpoint'i yaz (yukaridaki ornek)
- [ ] Response formati: `{ status: 'success', data: { token, role, userId } }` — IPC ile ayni

#### Gallery Public Endpoint
```typescript
// api/gallery/public.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { success, error } from '../_lib/errors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json(error('Method not allowed'));

  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 24, 100);
  const model = req.query.model as string | undefined;
  const sort = (req.query.sort as string) || 'newest';

  const where: any = { isPublic: true, status: 'completed' };
  if (model) where.modelId = model;
  if (cursor) where.createdAt = { lt: new Date(cursor) };

  const items = await prisma.imageGeneration.findMany({
    where,
    orderBy: sort === 'popular' ? { likesCount: 'desc' } : { createdAt: 'desc' },
    take: limit + 1, // +1 to check if there are more
    select: {
      id: true, prompt: true, resultUrl: true, thumbnailUrl: true,
      modelId: true, provider: true, width: true, height: true,
      aspectRatio: true, likesCount: true, createdAt: true,
      user: { select: { displayName: true, avatarUrl: true } },
    },
  });

  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  return res.status(200).json(success({
    items,
    nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
  }));
}
```

- [ ] Gallery public endpoint'i yaz (auth gereksiz)
- [ ] Cursor-based pagination
- [ ] Model + sort filtre

### 17.5 API Bagimliliklari

- [ ] `bun add zod` — request validasyonu
- [ ] `bun add jsonwebtoken` veya `bun add jose` — JWT islemleri
- [ ] `bun add argon2` — sifre hash (Rust'taki ile uyumlu olmali!)
- [ ] `bun add ioredis` — Redis client (rate limiting + cache)
- [ ] `bun add @vercel/node` — Vercel types (dev dependency)
- [ ] `bun add stripe` — Stripe SDK (webhook + checkout)
- [ ] Prisma Client zaten kurulu (BOLUM 3)

### 17.6 API Guvenligi

- [ ] CORS: sadece `promtx.ai`, `promtx.vercel.app`, `localhost:1420` izin ver
- [ ] Tum endpoint'lerde `Content-Type: application/json` kontrolu
- [ ] SQL injection onleme: Prisma ORM zaten parameterized query kullaniyor
- [ ] XSS onleme: response'larda HTML encode
- [ ] CSRF: SameSite cookie + Origin header kontrolu
- [ ] Helmet headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`
- [ ] Request body size limiti: 1MB (gorsel yuklemeleri haric)
- [ ] Sensitive data log'lama: password, token ASLA loglanmaz

### 17.7 API Port Haritasi (BOLUM 1 Guncellemesi)

| Servis | Port | Ortam | Aciklama |
|--------|------|-------|----------|
| Vercel Serverless API | — | Prod | `https://promtx.ai/api/*` (serverless, port yok) |
| Vercel Dev (local) | 3000 | Dev | `vercel dev` ile lokal test |

- [ ] `vercel dev` komutu ile lokal API testi
- [ ] BOLUM 1 port tablosuna Vercel dev port ekle
- [ ] `.env.local` icine `VITE_API_URL=http://localhost:3000` (dev icin)

### 17.8 API Test Stratejisi

- [ ] Her endpoint icin Vitest unit test yaz (`api/__tests__/`)
- [ ] Supertest veya `fetch` ile integration test
- [ ] Test DB: `promtx_test` (BOLUM 2.7'deki test Docker compose)
- [ ] Mock veriler: Prisma seed'den gelen verilerle test
- [ ] CI/CD: GitHub Actions'da API testleri calistir (BOLUM 11 ile entegre)
- [ ] Endpoint test listesi:
  - [ ] `POST /api/auth/login` — basarili + yanlis sifre + kilitli hesap + frozen
  - [ ] `POST /api/auth/register` — basarili + duplicate email + zayif sifre
  - [ ] `GET /api/gallery/public` — pagination + filtre + bos sonuc
  - [ ] `GET /api/prompt/history` — auth zorunlu + filtre + pagination
  - [ ] `GET /api/billing/wallet` — auth zorunlu + dogru bakiye
  - [ ] `POST /api/feedback` — basarili + validasyon hatasi + rate limit
  - [ ] `GET /api/admin/users` — admin yetkisi zorunlu + pagination
  - [ ] `POST /api/webhooks/stripe` — imza dogrulama + idempotency

### 17.9 Frontend API Entegrasyonu

> **Mevcut:** `src/lib/api.ts` — `apiInvoke()` zaten hibrit (Tauri IPC / HTTP fetch)
> **KURAL:** Frontend'de HICBIR degisiklik gerekmez — `apiInvoke()` otomatik secim yapar

- [ ] `VITE_API_URL` env degiskeni dogru ayarlanmali:
  - [ ] Dev (Tauri): bos birak — IPC kullanilir
  - [ ] Dev (Web): `http://localhost:3000`
  - [ ] Prod (Vercel): `https://promtx.ai` (rewrites ile `/api/*`)
  - [ ] Preview: `https://promtx.vercel.app`
- [ ] Frontend'deki `apiInvoke()` response formati API ile birebir eslesmeli
- [ ] Token yonetimi: `Authorization: Bearer <token>` header'i fetch'e ekle
  - [ ] `apiInvoke` icine token ekleme:
    ```typescript
    if (!isTauri()) {
      const token = useAppStore.getState().userToken;
      headers['Authorization'] = `Bearer ${token}`;
    }
    ```
- [ ] Token expired (401) response'unda otomatik refresh + retry

---

## BOLUM 18: GALERI SISTEMI (MY GALLERY + PUBLIC GALLERY)

> **Mevcut:** Iki ayri galeri bilesen'i var:
> 1. `src/pages/Gallery.tsx` — "Production Archive": prompt history bazli, MOCK_HISTORY, sidebar (All/Favorites), grid/list, arama, storage bar
> 2. `src/components/Gallery.tsx` — Gorsel galeri: `GalleryItem` (url, prompt, seed, isPublic, model, type), MOCK veriler, CachedImage, model/type filtre, StatPill, ImageComparison, AnnotationCanvas
> **Mevcut IPC:** `get_image_gallery`, `get_public_gallery`, `toggle_public_status`, `generate_image`, `share_image_asset`
> **Prisma:** `ImageGeneration` modeli (BOLUM 3.4), `Folder` modeli (BOLUM 3.6)

### 18.1 Galeri Mimarisi

> **Karar:** Mevcut 2 galeri bilesen'i birlestirmek yerine netlestirilecek:
> - `pages/Gallery.tsx` -> **Galerim (My Gallery):** kullanicinin tum uretim arsivi (prompt + gorseller)
> - `components/Gallery.tsx` -> **Gorsel Galeri (Image Gallery):** PromptBuilder icinde gorsel onizleme/karsilastirma

```
┌─────────────────────────────────────────────┐
│              GALERI SISTEMI                   │
├──────────────────┬──────────────────────────┤
│  Galerim         │  Public Galeri            │
│  (My Gallery)    │  (Community Showcase)     │
│  /gallery        │  /gallery?tab=public      │
│                  │                            │
│  - Prompt arsiv  │  - Topluluk gorselleri     │
│  - Gorsel arsiv  │  - Like/begeni             │
│  - Klasorler     │  - Trend/populer           │
│  - Favoriler     │  - Model filtre            │
│  - Arama         │  - Kesfet                  │
│  - Download      │  - Remix/tekrar kullan     │
│  - Paylas        │                            │
│  - Sil           │                            │
└──────────────────┴──────────────────────────┘
```

- [ ] Galeri sayfasini 2 tab'li yap: "Galerim" + "Topluluk"
- [ ] URL: `/gallery` (default: Galerim), `/gallery?tab=public` (Topluluk)

### 18.2 Galerim (My Gallery) — PostgreSQL Gecisi

> **Kaynak:** `src/pages/Gallery.tsx` — mevcut Production Archive

#### 18.2.1 Backend (IPC + API)
- [ ] `get_my_gallery` IPC/API (yeni — mevcut `get_image_gallery` genisletmesi):
  - [ ] `SELECT ig.*, ph.prompt_text, ph.studio_type FROM image_generations ig LEFT JOIN prompt_history ph ON ph.id = ig.prompt_id WHERE ig.user_id = $1`
  - [ ] Gorsel + prompt bilgisi birlestir (eger gorsel varsa gorseli, yoksa prompt kartini goster)
  - [ ] Cursor-based pagination: `LIMIT 24`
  - [ ] Filtreler:
    - [ ] Studio tipi: `WHERE studio_type = $type`
    - [ ] Medya tipi: `WHERE type IN ('image', 'video')`
    - [ ] Favori: `WHERE is_favorite = true`
    - [ ] Klasor: `WHERE folder_id = $folderId`
    - [ ] Tarih araligi: `WHERE created_at BETWEEN $start AND $end`
    - [ ] Model: `WHERE model_id = $model`
    - [ ] Arama: `WHERE prompt ILIKE '%$term%'`
  - [ ] Siralama: tarih (yeni/eski), begeni, boyut
  - [ ] Response:
    ```typescript
    {
      items: {
        id: string;
        type: 'image' | 'video' | 'prompt'; // gorsel/video/prompt-only
        prompt: string;
        resultUrl?: string;
        thumbnailUrl?: string;
        studioType: StudioType;
        modelId?: string;
        provider?: string;
        width?: number;
        height?: number;
        aspectRatio: string;
        sizeBytes: number;
        likesCount: number;
        isFavorite: boolean;
        isPublic: boolean;
        folderId?: string;
        tags: string[];
        createdAt: string;
      }[];
      nextCursor: string | null;
      totalCount: number;
      storageUsed: number;   // bytes — toplam depolama kullanimi
      storageLimit: number;  // bytes — plan bazli limit
    }
    ```
- [ ] `create_folder` IPC/API (yeni):
  - [ ] `INSERT INTO folders (user_id, name, color, icon) VALUES ($1, $2, $3, $4)`
  - [ ] Nested klasor destegi: `parent_id` FK
  - [ ] Klasor renk + icon secimi
- [ ] `move_to_folder` IPC/API (yeni):
  - [ ] `UPDATE image_generations SET folder_id = $1 WHERE id = $2 AND user_id = $3`
  - [ ] Toplu tasima: birden fazla gorsel ayni anda
- [ ] `delete_gallery_item` IPC/API (yeni):
  - [ ] Gorsel: S3'ten sil + DB'den sil (hard delete)
  - [ ] Prompt-only: `DELETE FROM prompt_history WHERE id = $1 AND user_id = $2`
  - [ ] Toplu silme: birden fazla item secip tek seferde sil
- [ ] `download_gallery_item` IPC/API:
  - [ ] Orijinal boyutta gorsel indir (S3 URL veya CDN)
  - [ ] Metadata dahil indir (EXIF'e prompt, model, seed bilgisi yaz — opsiyonel)
  - [ ] Toplu indirme: ZIP arsivi olarak (5'ten fazla gorsel icin)
- [ ] `share_gallery_item` IPC/API (mevcut `share_image_asset` genisletmesi):
  - [ ] Paylasim URL'i olustur: `https://promtx.ai/g/{shareId}` (kisa URL)
  - [ ] Paylasim ayarlari: public/link-only/private
  - [ ] Paylasim suresi: 24 saat / 7 gun / suresiz
  - [ ] OG meta tag'leri: gorsel thumbnail + prompt preview (sosyal medya paylasimi icin)
- [ ] `bulk_action` IPC/API (yeni):
  - [ ] Toplu favori ekle/cikar
  - [ ] Toplu klasore tasi
  - [ ] Toplu public/private yap
  - [ ] Toplu sil (onay dialog gerektir)
  - [ ] Toplu indir (ZIP)

#### 18.2.2 Frontend — Galerim Sayfasi Guncellemesi
- [ ] **MOCK verileri kaldir:** `MOCK_HISTORY` dizisini sil, DB'den gelen veriyle degistir
- [ ] **Sidebar genislet** (mevcut All/Favorites + yeni):
  - [ ] "Tumu" — tum icerik (mevcut)
  - [ ] "Favoriler" — `is_favorite = true` (mevcut)
  - [ ] "Gorseller" — `type = 'image'` (yeni)
  - [ ] "Videolar" — `type = 'video'` (yeni)
  - [ ] "Sesler" — Audio Studio ciktilari (yeni)
  - [ ] "Klasorler" — kullanici klasorleri (yeni):
    - [ ] Klasor listesi (DB'den)
    - [ ] "Yeni Klasor" butonu + klasor olusturma dialog
    - [ ] Klasore surukle-birak (drag & drop)
    - [ ] Klasor silme (icindekiler "Tumu"ye tasinir)
  - [ ] Her kategori yaninda sayi badge'i
- [ ] **Storage bar guncelle** (mevcut — DB'den gercek veri):
  - [ ] `storageUsed / storageLimit` oranini goster
  - [ ] Plan bazli limit:
    - [ ] Starter: 1 GB
    - [ ] Creator: 10 GB
    - [ ] Studio Pro: 50 GB
  - [ ] Limit yaklasiyorsa uyari goster
- [ ] **Grid/List gorunum** (mevcut — iyilestir):
  - [ ] Grid: gorsel thumbnail + prompt preview (mevcut)
  - [ ] List: gorsel kucuk thumbnail + prompt + model + tarih + boyut (mevcut)
  - [ ] Yeni: Masonry layout (farkli boyutlardaki gorseller icin)
  - [ ] Lazy loading: `IntersectionObserver` ile gorunur olunca yukle
  - [ ] Skeleton loading state (mevcut `Skeleton` component kullan)
- [ ] **Gorsel karti iyilestir** (mevcut — genislet):
  - [ ] Thumbnail: gercek gorsel goster (mevcut placeholder yerine)
  - [ ] Hover aksiyonlari: favori, indir, paylas, sil (mevcut)
  - [ ] Yeni: "Public Yap" toggle (gorseli topluluk galerisine ac)
  - [ ] Yeni: "Klasore Tasi" butonu
  - [ ] Yeni: like sayisi goster (public ise)
  - [ ] Yeni: boyut bilgisi (1024x1024, 512KB)
  - [ ] Yeni: model badge (DALL-E 3, Midjourney, Flux vs.)
  - [ ] Yeni: aspect ratio badge (1:1, 16:9, 4:3)
- [ ] **Detay Modal'i** (yeni — gorsel kartina tiklaninca):
  - [ ] Tam boyut gorsel goruntuleme (lightbox)
  - [ ] Prompt metni (kopyalanabilir)
  - [ ] Negative prompt (varsa)
  - [ ] Uretim parametreleri: model, provider, seed, steps, cfg_scale
  - [ ] Boyut: width x height, dosya boyutu
  - [ ] Tarih: olusturulma tarihi
  - [ ] Aksiyonlar: indir, paylas, favori, public toggle, sil, "Remix" (ayni parametrelerle yeniden uret)
  - [ ] Variation'lar: parent/child gorsel iliskisi (outpaint, upscale vs.)
  - [ ] Mevcut `ImageComparison` bilesen'i ile karsilastirma (2 gorsel yan yana)
  - [ ] Mevcut `AnnotationCanvas` ile gorsel uzerine not ekleme
- [ ] **Toplu secim modu** (yeni):
  - [ ] Checkbox ile birden fazla gorsel sec
  - [ ] Secili gorseller icin bulk action bar goster (altta veya ustte)
  - [ ] "X gorsel secildi" sayaci
  - [ ] Aksiyonlar: toplu sil, toplu tasi, toplu indir, toplu public/private
- [ ] **Arama iyilestir** (mevcut — genislet):
  - [ ] Mevcut text arama korunacak
  - [ ] Yeni: studio tipi filtre chip'leri (Image, Video, Cinema, Audio...)
  - [ ] Yeni: model filtre dropdown
  - [ ] Yeni: tarih araligi secici
  - [ ] Yeni: boyut filtre (kucuk/orta/buyuk)
  - [ ] Yeni: aspect ratio filtre

### 18.3 Topluluk Galerisi (Public Gallery) — PostgreSQL Gecisi

> **Mevcut:** `get_public_gallery` IPC — `WHERE is_public = true`

#### 18.3.1 Backend (IPC + API)
- [ ] `get_public_gallery` IPC/API guncelle:
  - [ ] `SELECT ig.*, u.display_name, u.avatar_url FROM image_generations ig JOIN users u ON u.id = ig.user_id WHERE ig.is_public = true AND ig.status = 'completed' AND ig.is_nsfw = false`
  - [ ] NSFW filtreleme: `is_nsfw = false` (default) veya `is_nsfw` iceren (kullanici tercihi)
  - [ ] Cursor-based pagination
  - [ ] Siralama modlari:
    - [ ] "En Yeni" — `ORDER BY created_at DESC`
    - [ ] "Populer" — `ORDER BY likes_count DESC`
    - [ ] "Trend" — son 7 gunde en cok begeni alan
    - [ ] "Rastgele" — `ORDER BY RANDOM() LIMIT 24`
  - [ ] Model filtre: `WHERE model_id = $model`
  - [ ] Studio tipi filtre: `WHERE studio_type = $type`
  - [ ] Arama: `WHERE prompt ILIKE '%$term%'`
  - [ ] Auth gereksiz (public endpoint)
- [ ] `like_image` IPC/API (yeni):
  - [ ] Like sistemi: `image_likes` tablosu (yeni Prisma model):
    ```prisma
    model ImageLike {
      userId    String   @map("user_id")
      imageId   String   @map("image_id")
      createdAt DateTime @default(now()) @map("created_at")

      user  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
      image ImageGeneration @relation(fields: [imageId], references: [id], onDelete: Cascade)

      @@id([userId, imageId])
      @@map("image_likes")
    }
    ```
  - [ ] Like toggle: `INSERT ... ON CONFLICT DO DELETE` (PostgreSQL upsert trick)
  - [ ] `image_generations.likes_count` trigger ile veya uygulama seviyesinde guncelle
  - [ ] Auth zorunlu (giris yapmamis kullanicilar like atamazlar)
  - [ ] Rate limiting: kullanici basina 100 like / saat
- [ ] `toggle_public_status` IPC/API (mevcut — korunacak):
  - [ ] `UPDATE image_generations SET is_public = NOT is_public WHERE id = $1 AND user_id = $2`
  - [ ] Public yapilinca: NSFW kontrol (opsiyonel — moderasyon)
  - [ ] Public'ten cikarilinca: like'lar korunur ama gorsel gizlenir
- [ ] `report_image` IPC/API (yeni):
  - [ ] Uygunsuz icerik bildirimi
  - [ ] `INSERT INTO image_reports (image_id, reporter_id, reason, status)` (yeni tablo)
  - [ ] Admin panelinde bildirim listesi ve moderasyon
  - [ ] 3+ bildirim alan gorsel otomatik gizlensin

#### 18.3.2 Prisma Modeli Eklemeleri
```prisma
model ImageLike {
  userId    String   @map("user_id")
  imageId   String   @map("image_id")
  createdAt DateTime @default(now()) @map("created_at")

  user  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  image ImageGeneration @relation(fields: [imageId], references: [id], onDelete: Cascade)

  @@id([userId, imageId])
  @@map("image_likes")
}

model ImageReport {
  id        String   @id @default(uuid())
  imageId   String   @map("image_id")
  reporterId String  @map("reporter_id")
  reason    String   @db.VarChar(500) // spam, nsfw, copyright, other
  status    String   @default("pending") @db.VarChar(20) // pending, reviewed, dismissed
  adminNote String?  @map("admin_note")
  createdAt DateTime @default(now()) @map("created_at")

  image ImageGeneration @relation(fields: [imageId], references: [id], onDelete: Cascade)
  reporter User         @relation(fields: [reporterId], references: [id])

  @@unique([imageId, reporterId]) // ayni gorsel icin ayni kullanici tek bildirim
  @@map("image_reports")
}
```

- [ ] `ImageLike` modeli Prisma schema'ya ekle
- [ ] `ImageReport` modeli Prisma schema'ya ekle
- [ ] `User` modeline relation ekle: `imageLikes ImageLike[]`, `imageReports ImageReport[]`
- [ ] `ImageGeneration` modeline relation ekle: `likes ImageLike[]`, `reports ImageReport[]`
- [ ] `bunx prisma migrate dev --name add_gallery_models`

#### 18.3.3 Frontend — Topluluk Galerisi Tab'i
- [ ] Topluluk tab'i icerigi:
  - [ ] Siralama butonlari: "En Yeni" | "Populer" | "Trend" | "Rastgele"
  - [ ] Model filtre chip'leri (DALL-E 3, Midjourney, Flux, Stable Diffusion, Luma...)
  - [ ] Studio filtre chip'leri (Image, Video, Character, Fashion...)
  - [ ] Arama cubugu
  - [ ] Masonry grid layout (farkli boyutlarda gorseller)
  - [ ] Infinite scroll (IntersectionObserver)
- [ ] Topluluk gorsel karti:
  - [ ] Thumbnail (gercek gorsel)
  - [ ] Kullanici adi + avatar (ureticinin bilgisi)
  - [ ] Like butonu + like sayisi (kalp icon)
  - [ ] Prompt preview (hover'da tam goster)
  - [ ] Model badge
  - [ ] "Remix" butonu — prompt'u kendi studio'na kopyala
  - [ ] "Bildir" butonu (uygunsuz icerik)
- [ ] Topluluk gorsel detay modal'i:
  - [ ] Tam boyut gorsel
  - [ ] Prompt (kopyalanabilir)
  - [ ] Uretici profil karti (displayName, avatarUrl)
  - [ ] Like butonu
  - [ ] "Remix" butonu
  - [ ] Paylasim butonu (link kopyala, sosyal medya)
  - [ ] "Bildir" butonu
  - [ ] Benzer gorseller onerisi (ayni model/prompt keyword'leri ile)

### 18.4 Galeri Depolama ve CDN

- [ ] **S3 / Cloudflare R2 entegrasyonu:**
  - [ ] Gorsel upload: orijinal + thumbnail (300px wide) olustur
  - [ ] S3 bucket: `promtx-gallery` (veya R2)
  - [ ] Key format: `users/{userId}/images/{imageId}.{ext}`
  - [ ] Thumbnail key: `users/{userId}/thumbs/{imageId}.webp`
  - [ ] CDN: Cloudflare veya Vercel Edge Network uzerinden serve et
  - [ ] Signed URL: private gorseller icin gecici erisim linki (1 saat)
- [ ] **Gorsel optimizasyonu:**
  - [ ] Upload sirasinda WebP'ye cevir (boyut azaltma)
  - [ ] Thumbnail olustur: 300px, 600px, 1200px (responsive)
  - [ ] EXIF metadata strip et (privacy)
  - [ ] Maks dosya boyutu: 20MB (upload limiti)
- [ ] **Depolama limitleri (plan bazli):**

| Plan | Depolama | Gorsel Basi Maks | Toplu Indirme |
|------|---------|------------------|---------------|
| Starter | 1 GB | 5 MB | 10 gorsel/ZIP |
| Creator | 10 GB | 10 MB | 50 gorsel/ZIP |
| Studio Pro | 50 GB | 20 MB | 200 gorsel/ZIP |

- [ ] Limit asildiginda: "Depolama dolu" uyarisi + upgrade teklifi
- [ ] Eski gorselleri otomatik silme YAPMA — kullanici kontrolunde

### 18.5 Galeri Seed Data

```typescript
// prisma/seed.ts icine eklenecek

// Admin kullanicisi gorselleri
const adminImages = await prisma.imageGeneration.createMany({
  data: [
    {
      userId: adminUser.id,
      prompt: 'Cyberpunk city skyline at night, neon lights reflecting on wet streets, cinematic 8k',
      resultUrl: 'https://picsum.photos/seed/promtx1/1024/1024',
      thumbnailUrl: 'https://picsum.photos/seed/promtx1/300/300',
      modelId: 'dall-e-3',
      provider: 'openai',
      width: 1024, height: 1024,
      aspectRatio: '1:1',
      sizeBytes: 2048000,
      status: 'completed',
      isPublic: true,
      likesCount: 42,
      createdAt: new Date('2026-04-20'),
    },
    {
      userId: adminUser.id,
      prompt: 'Professional fashion model in Tokyo streets, golden hour, editorial photography',
      resultUrl: 'https://picsum.photos/seed/promtx2/1024/1536',
      thumbnailUrl: 'https://picsum.photos/seed/promtx2/300/450',
      modelId: 'midjourney',
      provider: 'replicate',
      width: 1024, height: 1536,
      aspectRatio: '2:3',
      sizeBytes: 3145000,
      status: 'completed',
      isPublic: true,
      likesCount: 128,
      createdAt: new Date('2026-04-22'),
    },
  ],
});

// Pro kullanici gorselleri (biri private)
const proImages = await prisma.imageGeneration.createMany({
  data: [
    {
      userId: proUser.id,
      prompt: 'Abstract liquid metal flowing in zero gravity, highly detailed render',
      resultUrl: 'https://picsum.photos/seed/promtx3/1920/1080',
      thumbnailUrl: 'https://picsum.photos/seed/promtx3/300/169',
      modelId: 'flux',
      provider: 'replicate',
      width: 1920, height: 1080,
      aspectRatio: '16:9',
      sizeBytes: 4200000,
      status: 'completed',
      isPublic: false, // private
      likesCount: 0,
      createdAt: new Date('2026-04-23'),
    },
  ],
});

// Klasor seed
await prisma.folder.createMany({
  data: [
    { userId: adminUser.id, name: 'Marketing Kampanyasi', color: '#b44afd', icon: 'folder' },
    { userId: adminUser.id, name: 'Kisisel Projeler', color: '#14b8a6', icon: 'folder' },
    { userId: proUser.id, name: 'Marka Gorselleri', color: '#f59e0b', icon: 'folder' },
  ],
});

// Like seed
await prisma.imageLike.createMany({
  data: [
    { userId: proUser.id, imageId: adminImages[0].id },
    { userId: freeUser.id, imageId: adminImages[0].id },
    { userId: freeUser.id, imageId: adminImages[1].id },
  ],
});
```

- [ ] Galeri seed verisi olustur (en az 6 gorsel)
- [ ] Farkli aspect ratio'lar, modeller, public/private
- [ ] Klasor seed
- [ ] Like seed
- [ ] MOCK verileri kaldir: `MOCK_GALLERY_ITEMS` ve `MOCK_HISTORY` -> seed'den gelen gercek veri

### 18.6 Mevcut SQLite -> Prisma Eslestirme Tablosu Guncellemesi

| SQLite / Mevcut | Prisma Modeli | Durum |
|-----------------|---------------|-------|
| *(yeni)* | `ImageLike` | Like sistemi |
| *(yeni)* | `ImageReport` | Icerik bildirimi |

- [ ] BOLUM 3.9 eslestirme tablosuna ekle

---

## SKOR TABLOSU

| Bolum | Madde Sayisi | Oncelik | Durum |
|-------|-------------|---------|-------|
| 0. On Kosullar (Docker + Bun) | ~25 | KRITIK | [ ] Baslanmadi |
| 1. Port Yonetimi | ~10 | KRITIK | [ ] Baslanmadi |
| 2. Docker Compose + Sentinel | ~60 | KRITIK | [ ] Baslanmadi |
| 3. Prisma Schema + Migration | ~50 | KRITIK | [ ] Baslanmadi |
| 4. Google OAuth | ~25 | KRITIK | [ ] Baslanmadi |
| 5. Seed Data (Promtx) | ~60 | YUKSEK | [ ] Baslanmadi |
| 6. PostgreSQL Konfigurasyon | ~20 | YUKSEK | [ ] Baslanmadi |
| 7. Vercel Deploy | ~25 | YUKSEK | [ ] Baslanmadi |
| 8. Rust Backend + IPC Komutlari | ~80 | KRITIK | [ ] Baslanmadi |
| 9. Frontend + Routes + Store | ~40 | YUKSEK | [ ] Baslanmadi |
| 10. Guvenlik | ~20 | KRITIK | [ ] Baslanmadi |
| 11. CI/CD (Bun + Prisma) | ~15 | ORTA | [ ] Baslanmadi |
| 12. Yedekleme + Monitoring | ~15 | ORTA | [ ] Baslanmadi |
| 13. Dogrulama (40 madde) | ~40 | KRITIK | [ ] Baslanmadi |
| 14. Geri Bildirim Sistemi | ~30 | YUKSEK | [ ] Baslanmadi |
| 15. Stripe Odeme Altyapisi (Ek) | ~35 | YUKSEK | [ ] Baslanmadi |
| 16. Sayfa Bazli Gecis (Auth/History/Billing/Accounts/Users/Activity) | ~180 | KRITIK | [ ] Baslanmadi |
| 17. REST API Katmani (Vercel Serverless) | ~65 | KRITIK | [ ] Baslanmadi |
| 18. Galeri Sistemi (My Gallery + Public) | ~85 | YUKSEK | [ ] Baslanmadi |
| **TOPLAM** | **~945+** | — | — |

---

## TEKNOLOJI OZETI

| Kategori | Eski | Yeni |
|----------|------|------|
| Paket Yoneticisi | npm | **Bun** |
| ORM | sqlx + sea-orm | **Prisma** |
| Veritabani | SQLite | **PostgreSQL 16** |
| Cache | Moka (in-memory) | **Redis 7 + Sentinel** |
| Auth | Manuel JWT | **Google OAuth + JWT** |
| Deploy (Web) | — | **Vercel** |
| Deploy (Desktop) | Tauri | **Tauri** (degisiklik yok) |
| Migration | sqlx migrate | **Prisma Migrate** |
| Seed | Manuel SQL | **Prisma Seed (bun)** |
| CI/CD | GitHub Actions | **GitHub Actions + Vercel** |

### Mevcut Proje Bagimliliklari (Korunacak)

| Kategori | Paket | Versiyon | Not |
|----------|-------|----------|-----|
| UI Framework | React | 19 | Degisiklik yok |
| Routing | react-router-dom | 7 | OAuth callback route eklenecek |
| State | Zustand | 5 | Auth + wallet state eklenecek |
| Desktop | Tauri | 2 | IPC komutlari guncellenecek |
| Styling | Tailwind CSS | 4 | Degisiklik yok |
| Build | Vite | 6 | Degisiklik yok |
| Payment | @stripe/stripe-js | 9 | Korunacak |
| AI | @google/genai | 1.29 | Gemini API, korunacak |
| Error Tracking | @sentry/react | 10 | Korunacak |
| Analytics | posthog-js | 1.371 | Korunacak |
| i18n | paraglide-js | - | TR/EN, korunacak |
| Animation | motion | 12 | Degisiklik yok |
| Toast | sonner | - | Notification ile entegre |
| Icons | lucide-react | 0.546 | Degisiklik yok |
| PDF | jspdf + jspdf-autotable | - | Receipt icin korunacak |
| Crypto | crypto-js | 4.2 | Client-side sifreleme, korunacak |
| IndexedDB | idb | 8 | Offline cache, korunacak |
| Test | vitest + playwright | 4 / 1.59 | PostgreSQL test eklentisi |
| **YENI** | @prisma/client | latest | ORM |
| **YENI** | @react-oauth/google | latest | Google login butonu |
| **YENI** | zod | latest | API request validasyonu |
| **YENI** | jose / jsonwebtoken | latest | JWT islemleri (API) |
| **YENI** | ioredis | latest | Redis client (rate limiting) |
| **YENI** | @vercel/node | latest | Vercel Serverless types |

### Mevcut Rust Crate'ler (Guncellenmesi Gerekenler)

| Crate | Degisiklik |
|-------|-----------|
| `sqlx` | `features = ["sqlite"]` -> `["postgres"]` (veya kaldirilacak, Prisma gecisi) |
| `sea-orm` | `features = ["sqlx-sqlite"]` -> `["sqlx-postgres"]` (veya kaldirilacak) |
| `argon2` | Korunacak (sifre hashing) |
| `jsonwebtoken` | Korunacak (JWT) |
| `rust_decimal` | Korunacak (para birimi hassasiyeti) |
| `totp-rs` | Korunacak (2FA) |
| `redis` | `features = ["sentinel"]` EKLEnecek |
| `serde_json` | Korunacak |
| `tokio` | Korunacak |
| `reqwest` | Korunacak (Google OAuth, Stripe API) |

---

> **NOT:** Bu dokuman Promtx'in SQLite'tan PostgreSQL'e tam gecisini,
> Prisma ORM'e gecisi, Bun paket yoneticisine gecisi, Google OAuth entegrasyonunu,
> Redis Sentinel ile HA cache yapisini, Vercel deploy'unu,
> Stripe odeme altyapisini, geri bildirim sistemini ve
> sayfa bazli gecis gereksinimlerini (Auth, Prompt History, Billing, Accounts, Users, Activity),
> REST API katmanini (Vercel Serverless) ve galeri sistemini (My Gallery + Public Gallery) planlar.
> Her onay kutucugu tek bir aksiyonu temsil eder. Tamamlanan maddeler `[x]` ile isaretlenir.
> Tum `npm` komutlari `bun` ile degistirilmistir.
> Port cakismasi onlenmis, tum portlar BOLUM 1'deki tabloda tanimlanmistir.
>
> **Promtx'e Ozel Referanslar:**
> - Mevcut SQLite migration: `src-tauri/migrations/20260424000000_init.sql` (21 tablo)
> - Mevcut seed: `src-tauri/tests/fixtures/seed.sql` (admin, workspace, pricing, conversation)
> - Mevcut IPC komutlari: `src-tauri/src/lib.rs` invoke_handler (60+ komut)
> - UserRole enum: `Free, Pro, Enterprise, Admin, SuperAdmin` (auth.rs:12)
> - TransactionReason enum: `Generation, TopUp, Refund, Subscription` (ledger.rs:8)
> - WorkspaceRole enum: `Owner, Admin, Member, Viewer` (models.rs:92)
> - Model pricing: `registry.rs` (gpt-4o, gemini-1.5-pro/flash, deepseek, grok, dall-e-3)
> - Studio types: image, video, cinema, audio, character, fashion, marketing, edit
> - Admin email: `admin@promtx.os` (seed.sql)
> - API key prefix: `ptx_` (auth.rs)
