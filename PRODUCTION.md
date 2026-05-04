# SFMIS Production Deployment Guide

ระบบบริหารการเงินโรงเรียน — คู่มือ deploy production

**Stack:** NestJS 11 (port 3000) + Next.js 16 (port 3001) + MySQL 8 (port 3306)

---

## Pre-Production Checklist

### 1. Environment Variables (Required)

ใช้ `${VAR:?error}` ใน `docker-compose.yml` — ถ้าลืม set จะ fail-fast พร้อม error message ชัดเจน

#### Backend (required ใน prod)
- [ ] `NODE_ENV=production`
- [ ] `DB_PASS` — strong password (ห้ามเว้นว่างหรือใช้ default)
- [ ] `JWT_SECRET` — random ≥256-bit (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`)
- [ ] `CORS_ORIGIN` — production frontend URL เท่านั้น (เช่น `https://sfmis.example.com`) — **ห้ามใช้ `*`**
- [ ] `OPENROUTER_API_KEY` — สำหรับ AI Assistant (สมัครที่ https://openrouter.ai/keys)
- [ ] `AI_DEFAULT_PROVIDER=openrouter` (default ใน docker-compose)

#### Frontend (required ใน prod)
- [ ] `NEXT_PUBLIC_API_URL` — `https://api.example.com/api/`
- [ ] `NEXTAUTH_URL` — `https://example.com`
- [ ] `AUTH_SECRET` — random ≥256-bit (สร้างคนละตัวกับ JWT_SECRET)

#### Optional but recommended
- [ ] `SENTRY_DSN` — ตั้งเพื่อเปิด Sentry error tracking + global exception filter
- [ ] `COMMITTEE_THRESHOLD=5000` — วงเงินที่ต้องมีคณะกรรมการตรวจรับ (default 5000 บาท)

### 2. Database
- [ ] TypeORM `synchronize` is **OFF** ใน prod (auto ตาม `NODE_ENV=production`)
- [ ] รัน `cd backend && npm run migration:run` เพื่อ apply migration
- [ ] รัน `cd backend && npm run seed` เพื่อสร้าง admin (`admin_local`/`Admin@123`) + master data
- [ ] **เปลี่ยน password admin_local ทันที** หลัง first login
- [ ] ตั้ง `mysqldump` schedule (daily/hourly)
- [ ] ⚠️ **ห้าม seed mock volume** ใน prod — `seedMockStudents/Projects/Supplies/...` สร้างข้อมูลปลอม 1,000-1,500 row/ตาราง สำหรับ dev เท่านั้น

### 3. Build Verification
- [ ] `cd backend && npm run build` → success (nest build ~7s)
- [ ] `cd frontend && npm run build` → success (Next.js, 79 routes)
- [ ] `cd backend && npm test` → 257 tests pass
- [ ] `cd backend && npx tsc --noEmit` → ไม่มี type error
- [ ] `cd frontend && npx tsc --noEmit` → ไม่มี type error

### 4. Security
- [ ] **Global `JwtAuthGuard`** active (ผ่าน `APP_GUARD`) — endpoint ทุกตัว require JWT ยกเว้นที่มี `@Public()`
- [ ] **Helmet** security headers enabled (auto)
- [ ] **CORS** restricted via `CORS_ORIGIN` env (auto ใน prod)
- [ ] **Login rate limiting** — 5 req/min via `ThrottlerGuard`
- [ ] **AI rate limiting** — 30 req/min กัน cost spike
- [ ] **bcrypt rounds = 12** สำหรับ password hashing
- [ ] ตรวจ `SECURITY_VULNERABILITIES.md` — แก้ vuln ที่ระบุว่า P0
- [ ] `.env` files **ไม่อยู่ใน git** (ตรวจ `.gitignore`)
- [ ] SSL/TLS configured ที่ reverse proxy (Nginx / Cloudflare)

---

## Deployment Procedures

### Option A: Docker Compose (แนะนำ)

```bash
# 1. Set required env vars (ใน .env หรือ shell)
export DB_PASS=<strong-password>
export JWT_SECRET=<random-256-bit>
export AUTH_SECRET=<random-256-bit>
export CORS_ORIGIN=https://sfmis.example.com
export NEXT_PUBLIC_API_URL=https://api.example.com/api/
export NEXTAUTH_URL=https://sfmis.example.com
export OPENROUTER_API_KEY=sk-or-v1-...

# 2. Build + start (จะ fail-fast ถ้าขาด env)
docker compose up -d --build

# 3. Run migrations
docker compose exec backend npm run migration:run

# 4. Seed master data + admin (first deploy เท่านั้น)
docker compose exec backend npm run seed

# 5. Verify health
curl http://localhost:3000/api/health
# Expected: {"status":"ok","info":{"database":{"status":"up"}},...}
```

### Option B: Manual

```bash
# Backend
cd backend
npm ci --omit=dev          # ติดตั้งเฉพาะ production deps
npm run build
npm run migration:run
NODE_ENV=production node dist/main.js &

# Frontend
cd frontend
npm ci
npm run build              # output: standalone build
npm start                  # port 3001
```

---

## Post-Deploy Smoke Tests

```bash
BASE=http://localhost:3000/api
FRONTEND=http://localhost:3001

# 1. Health check
curl -s $BASE/health | grep '"status":"ok"' && echo "✓ health"

# 2. Login (note: field คือ "email" ไม่ใช่ "username")
TOKEN=$(curl -s -X POST $BASE/B_admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin_local","password":"Admin@123"}' \
  | grep -oE '"access_token":"[^"]+"' | cut -d'"' -f4)
[ -n "$TOKEN" ] && echo "✓ login (token len: ${#TOKEN})"

# 3. Authenticated endpoint
curl -s -H "Authorization: Bearer $TOKEN" $BASE/B_admin/load_admin/0/10 \
  | grep '"count"' && echo "✓ load_admin"

# 4. AI provider check
curl -s -H "Authorization: Bearer $TOKEN" $BASE/ai/status \
  | grep '"openrouter":true' && echo "✓ AI provider"

# 5. Frontend root → redirect ไป /sign-in (307)
curl -s -o /dev/null -w "%{http_code}" $FRONTEND/ \
  | grep -q "307" && echo "✓ frontend redirect"

# 6. Login page renders
curl -s -o /dev/null -w "%{http_code}" $FRONTEND/sign-in \
  | grep -q "200" && echo "✓ sign-in page"
```

หาก smoke test ใดล้มเหลว → triggered rollback ทันที

---

## Rollback Plan

### Rollback Decision Criteria
ถ้าเจอ ≥1 ข้อต่อไปนี้ภายใน 10 นาทีหลัง deploy → rollback **ทันที**:
- `/api/health` ตอบ error หรือ DB:down
- Login endpoint ตอบ HTTP 5xx
- Error rate > 5% ของ request
- Frontend แสดงหน้าขาว / JavaScript error
- Sentry error count > baseline × 3

### Quick Rollback (< 5 นาที)

```bash
# Docker rollback
docker compose down
git checkout <previous-tag>
docker compose up -d --build

# Verify
curl -s http://localhost:3000/api/health
```

### Database Rollback

```bash
# Revert migration ล่าสุด (ถ้า schema เปลี่ยน)
docker compose exec backend npm run migration:revert

# หรือ restore จาก backup
mysql -u root -p sfmisystem < backup-YYYY-MM-DD.sql
```

> ⚠️ ก่อน deploy ทุกครั้ง — `mysqldump -u root -p sfmisystem > backup-$(date +%F).sql`

---

## Architecture Overview

```
                    ┌─────────────────┐
                    │   Nginx /       │
                    │   Cloudflare    │ ← SSL termination
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
       ┌────────▼────────┐     ┌──────────▼──────────┐
       │   Frontend       │     │    Backend          │
       │   Next.js :3001  │────▶│    NestJS :3000     │
       │   (App Router)   │     │    /api/*           │
       └─────────────────┘     └──────────┬──────────┘
                                           │
                              ┌────────────▼───────────┐
                              │    MySQL 8 :3306        │
                              │    (UTF8MB4)            │
                              └────────────────────────┘
                                           │
                              ┌────────────▼───────────┐
                              │   AI Provider           │
                              │   OpenRouter            │
                              │   (google/gemini-2.5)   │
                              └────────────────────────┘
```

### Key URLs
- Frontend: `https://example.com` (sign-in: `/sign-in`)
- Backend API: `https://api.example.com/api`
- Health Check: `https://api.example.com/api/health`
- Login: `POST /api/B_admin/login` (body: `{"email","password"}`)

---

## Monitoring

### Health Check
- **Endpoint:** `GET /api/health`
- **Response:** `{"status":"ok","info":{"database":{"status":"up"}},...}`
- **Interval แนะนำ:** 30 วินาที (ตาม `Dockerfile HEALTHCHECK`)

### Sentry (optional)
ตั้ง `SENTRY_DSN` env → จะเปิดอัตโนมัติ:
- Global exception filter — capture unhandled exceptions
- Performance tracing
- Release tracking (set `SENTRY_RELEASE` ระหว่าง build เพื่อ tag เวอร์ชัน)

### Logs
- NestJS Logger ใน production: level `warn+`
- ❌ ห้าม log password / token / PII
- AI service log เฉพาะ message length ไม่ log content (กัน PII leak)

---

## Authentication & Authorization (สรุปสำหรับ ops)

| Layer | Mechanism |
|---|---|
| Login | `POST /api/B_admin/login` → JWT (8 ชม. หมดอายุ) |
| Token storage (FE) | in-memory + sessionStorage fallback (XSS defense — **ไม่ใช่** localStorage) |
| Endpoint guard | Global `JwtAuthGuard` ผ่าน `APP_GUARD` — ทุก endpoint require JWT (ยกเว้น `@Public()`) |
| Role-based | `@Roles(roleId[])` + `RolesGuard` (8 roles: Director / Finance / Plan / Supplie / etc.) |
| Multi-tenant | `assertSameSchool()` helper — กัน cross-school data leak |
| Password | bcrypt rounds=12 + MD5 auto-migration สำหรับ legacy account |
| Rate limit | Login 5/min, AI 30/min |

---

## Known Limitations

1. **Multi-tenancy by `sc_id`** — ระบบ scope ข้อมูลตามโรงเรียน หาก deploy เป็น multi-tenant SaaS ต้องตรวจสอบ `assertSameSchool` ใช้ครบทุก endpoint
2. **MD5 legacy passwords** — ถูก auto-migrate ไป bcrypt เมื่อ user login ครั้งถัดไป (ใน `admin.service.ts`)
3. **`xlsx` 0.18.5** — มี vulnerability แต่ไม่มี fix บน npm — ดู `SECURITY_VULNERABILITIES.md` ว่าจะแก้ทาง A/B/C
4. **N+1 queries** ใน budget service — อาจช้าเมื่อมี budget categories จำนวนมาก
5. **Base64 images** เก็บใน DB — ควรย้ายไป object storage ถ้า scale ใหญ่ขึ้น
6. **AI provider cost** — OpenRouter `google/gemini-2.5-flash` ~$0.30/1M input tokens — มี rate limit 30 req/min/user แต่ควร monitor cost รายเดือน

---

## เอกสารเพิ่มเติม
- [`SECURITY_VULNERABILITIES.md`](./SECURITY_VULNERABILITIES.md) — รายงาน vulnerabilities + แผนแก้
- [`CLAUDE.md`](./CLAUDE.md) — guidance สำหรับ AI dev assistant
- [`DEVELOPMENT_ROADMAP.md`](./DEVELOPMENT_ROADMAP.md) — roadmap ฟีเจอร์
- [`PRD_API_Endpoints.md`](./PRD_API_Endpoints.md) — API contract
- [`backend/BACKEND_ARCHITECTURE.md`](./backend/BACKEND_ARCHITECTURE.md) — backend module conventions
