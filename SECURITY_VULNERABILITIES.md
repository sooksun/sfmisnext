# Security Vulnerabilities Report — SFMIS

รายงาน vulnerabilities ของระบบ SFMIS หลังลบ Angular legacy frontend (เหลือ Backend NestJS + Frontend Next.js เท่านั้น)

**วันที่สแกน:** 2026-05-04
**Tool:** `npm audit` (npm 10.x)

---

## 📊 Executive Summary

| Stack | Total | 🔴 Critical | 🟠 High | 🟡 Moderate | 🟢 Low |
|---|---:|---:|---:|---:|---:|
| Backend (NestJS) | 28 | 1 | 11 | 14 | 2 |
| Frontend (Next.js) | 1 | 0 | 1 | 0 | 0 |
| **รวม** | **29** | **1** | **12** | **15** | **2** |

> **หมายเหตุ:** vulnerability ส่วนใหญ่ใน backend อยู่ใน devDependencies (NestJS CLI tooling, build tools) — **ไม่ส่งผลต่อ production runtime** เพราะ deploy ใช้ `npm ci --omit=dev`

---

## 🚨 Production-Critical (ต้องแก้ก่อน deploy)

### Frontend

#### 1. ~~🟠 HIGH — `next` 16.2.2 (DoS)~~ → **แพตช์แล้ว (2026-05-12)**
- **Advisory:** GHSA-q4gf-8mx6-v5v3 — Denial of Service with Server Components
- **CVSS:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **Range:** `>=16.0.0-beta.0 <16.2.3`
- **Fix ที่ใช้ใน repo:** อัปเกรด `next` → **16.2.6** (ล่าสุดในเลน 16.2.x ณ วันที่แพตช์) และรัน `npm audit` ติดตาม
- **คำสั่งอ้างอิง:**
  ```bash
  cd frontend && npm install next@16.2.6
  ```

#### 2. ~~🟡 MODERATE — `postcss` <8.5.10 (XSS)~~ → **แพตช์แล้ว (2026-05-12)**
- **Advisory:** GHSA-qx2v-qp2m-jg93 — XSS via Unescaped `</style>` in CSS Stringify
- **CVSS:** 6.1
- **หมายเหตุ:** `next@16.2.6` ยัง bundle `postcss@8.4.x` — ใช้ **`overrides` ใน `frontend/package.json`** บังคับ `postcss@^8.5.10` (resolve เป็น 8.5.14) และ `fast-uri@^3.1.2` เพื่อปิดช่องโหว่ transitive ที่ `npm audit` รายงาน

#### 3. 🟠 HIGH — `xlsx` 0.18.5 ⚠️ **ไม่มี fix จาก npm**
- **Advisories:**
  - GHSA-4r6h-8v6p-xvw6 — Prototype Pollution (CVSS 7.8)
  - GHSA-5pgg-2g8v-p4x9 — ReDoS (CVSS 7.5)
- **Range:** `<0.20.2` (เวอร์ชันปัจจุบัน 0.18.5)
- **สาเหตุ:** SheetJS หยุด publish เวอร์ชันใหม่บน npm registry แล้ว — เวอร์ชันใหม่ต้องดาวน์โหลดจาก https://cdn.sheetjs.com/
- **การใช้งานในโปรเจกต์:** `frontend/lib/export-xlsx.ts` — export รายงานเป็น Excel
- **ทางเลือก:**
  - **A.** ติดตั้งจาก CDN: `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (vendored)
  - **B.** เปลี่ยนไปใช้ `exceljs` (npm) แทน — รองรับ feature ส่วนใหญ่ของ xlsx
  - **C.** ยอมรับ risk เพราะ:
    - Prototype Pollution: เกิดเมื่อ parse Excel จาก untrusted source — SFMIS export อย่างเดียว ไม่ import → low impact
    - ReDoS: เกิดเมื่อ parse — เช่นเดียวกัน
- **แนะนำ:** **C ในระยะสั้น** (low real impact), **A หรือ B ในระยะยาว**

### Backend

#### 4. 🟠 HIGH — `@nestjs/core` ≤11.1.17
- **Advisory:** GHSA-36xv-jgw5-4q75 — Injection in output used by downstream component
- **CVSS:** 6.1 (severity moderate ตาม CVSS แต่ npm รายงาน high)
- **Fix:** อัปเกรด NestJS family → 11.1.18+ (semver-compatible)

#### 5. 🟠 HIGH — `@nestjs/platform-express` (transitive: multer, path-to-regexp)
- **Advisories ซ้อน:**
  - `multer` — DoS via incomplete cleanup, resource exhaustion, uncontrolled recursion
  - `path-to-regexp` — DoS via sequential optional groups + multiple wildcards (ReDoS)
- **Risk หลัก:** DoS attack — ส่ง crafted route ทำให้ regex backtrack หนัก
- **Mitigation ปัจจุบัน:** Helmet + Rate limit (Throttler) ลด attack surface
- **Fix:** อัปเกรด NestJS family

#### Single command แก้ทั้ง 4-5 ตัว
```bash
cd backend && npm install \
  @nestjs/common@latest \
  @nestjs/core@latest \
  @nestjs/platform-express@latest \
  @nestjs/config@latest \
  @nestjs/typeorm@latest
```

> ⚠️ ทดสอบทุก endpoint หลังอัปเกรด (มี 41 modules) — เพราะ NestJS minor bump บางครั้งเปลี่ยนพฤติกรรม pipe/guard

---

## 🛠️ DevDependencies (ไม่กระทบ production runtime)

vulnerabilities เหล่านี้อยู่ใน build tools / CLI tools — **deploy ด้วย `npm ci --omit=dev`** จะไม่ติดตั้งและไม่ติด container

| Package | Severity | สาเหตุ | หมายเหตุ |
|---|---|---|---|
| `handlebars` | 🔴 critical | Multiple injection / prototype pollution | ผ่าน `@nestjs/cli` → `@angular-devkit/schematics-cli` |
| `@nestjs/cli` | 🟠 high | ใช้ตอน scaffold เท่านั้น | ไม่ใช้ runtime |
| `glob`, `minimatch`, `picomatch` | 🟠 high | ReDoS / command injection ใน CLI | tool ภายใน build |
| `lodash` | 🟠 high | Prototype Pollution | transitive ของ build chain |
| `@isaacs/brace-expansion` | 🟠 high | Resource consumption | transitive |
| `flatted` | 🟠 high | DoS in parse | transitive |

### Mitigation
- ✅ Production deploy ใช้ `npm ci --omit=dev` (ตาม `PRODUCTION.md` ระบุ)
- ✅ Docker build (multi-stage) ตัด devDependencies ออกจาก final image
- ⚠️ ถ้าต้องการลบให้สะอาด: รัน `npm audit fix` ใน backend (ไม่ใช้ `--force`) ทุกไตรมาส

---

## 🔍 Mitigations ที่มีอยู่แล้ว (ลด attack surface)

### Authentication & Authorization
- ✅ **Global `JwtAuthGuard`** ผ่าน `APP_GUARD` — endpoint ทุกตัว require JWT (ยกเว้น `@Public()`)
- ✅ **Global `RolesGuard`** + `@Roles(roleId[])` — restrict by user role
- ✅ **`assertSameSchool()` helper** — กัน multi-tenant data leak (ดู `tenant-guard.ts`)
- ✅ **bcrypt rounds = 12** — เกินมาตรฐาน OWASP (≥10)
- ✅ **MD5 → bcrypt auto-migration** — รองรับ legacy password ระหว่าง transition

### Network & Headers
- ✅ **Helmet** — security headers default (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ **CORS** — restricted ใน production via `CORS_ORIGIN` env (ไม่ใช่ `*`)
- ✅ **HTTPS** — บังคับผ่าน reverse proxy (Nginx/Cloudflare)

### Rate Limiting (DoS protection)
- ✅ **Login endpoint**: 5 req/min ผ่าน `ThrottlerGuard`
- ✅ **AI endpoints**: 30 req/min — กัน Gemini/OpenRouter cost spike

### Input Validation
- ✅ **Global `ValidationPipe`** — `whitelist: true, transform: true` — DTO บังคับ validate
- ✅ **`PageSizePipe`** — cap `pageSize` ที่ 500 → กัน DB abuse
- ✅ **TypeORM Repository pattern** — parameterized queries กัน SQL injection

### Secrets & Config
- ✅ **`.env` gitignored** — ไม่หลุด git (ตรวจแล้ว)
- ✅ **docker-compose ใช้ `${VAR:?error}`** — fail-fast ถ้าขาด secret (commit 5238bb9)
- ✅ **JWT_SECRET, AUTH_SECRET** — ต้อง random ≥256-bit

### Monitoring (optional)
- ✅ **Sentry conditional load** — ถ้า `SENTRY_DSN` set จะ activate global exception filter
- ✅ **Log policy** — backend ไม่ log password/token/PII (ตรวจ `chat.service.ts:90`)

---

## 📋 Action Plan ก่อน Deploy Production

### P0 — ต้องทำก่อน Deploy
- [ ] อัปเกรด `next` → 16.2.4 (FE)
- [ ] อัปเกรด NestJS family ใน backend (BE)
- [ ] รัน `npm test` หลังอัปเกรด (backend test suite — 257 tests)
- [ ] รัน `npm run build` หลังอัปเกรด (ทั้ง 2 ฝั่ง)

### P1 — ทำในรอบถัดไป (low real-world impact ใน SFMIS)
- [ ] ตัดสินใจเรื่อง `xlsx` (ทางเลือก A/B/C ด้านบน)
- [ ] รัน `npm audit fix` ใน backend ทุกไตรมาส
- [ ] subscribe GitHub Dependabot alerts สำหรับ repo

### P2 — Hardening เพิ่ม
- [ ] พิจารณาเพิ่ม WAF (web application firewall) ที่ reverse proxy
- [ ] Audit log สำหรับ admin actions (เริ่มมี `financial_audit_log` แล้ว — ขยาย scope)
- [ ] Rotate `JWT_SECRET` schedule (เช่น ทุก 6 เดือน — ใช้ JWT versioning)

---

## ❌ ห้ามทำ

### `npm audit fix --force`
- จะอัปเกรด NestJS เป็น major version ที่อาจมี breaking change
- จะอัปเกรด `typeorm` เป็น 0.2.41 (downgrade!) ที่ไม่รองรับ feature ที่ใช้อยู่
- ทำให้ระบบไม่ work

### `npm install xlsx@latest` (ผ่าน npm registry)
- npm registry ค้างที่ 0.18.5 — ติดตั้งใหม่จะเอาเวอร์ชันเก่าเดิม
- ต้องใช้ CDN: `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`

---

## 🔗 References

- [npm audit docs](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [GitHub Security Advisories](https://github.com/advisories)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/helmet)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [SheetJS Migration Guide](https://docs.sheetjs.com/docs/getting-started/installation/) — หา xlsx replacement

---

## 📝 ประวัติการสแกน

| วันที่ | Backend | Frontend | หมายเหตุ |
|---|---|---|---|
| 2026-05-04 | 28 (1C/11H/14M/2L) | 3 (0C/2H/1M) | หลังลบ Angular legacy |
| 2024 (เก่า) | — | — | รายงานเก่าสำหรับ Angular 16.2 — **ไม่ relevant** เพราะ Angular ถูกลบแล้ว |
