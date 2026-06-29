# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SFMIS (School Financial Management Information System) — a Thai school financial management system. Respond to the user in Thai (concise, complete). UI strings in both frontends are Thai.

The system has **two frontends**: the legacy Angular app (`src/`) and the new Next.js app (`frontend/`). Active development is happening in the Next.js frontend; the Angular frontend is being phased out.

## Tech Stack

- **Backend**: NestJS 11.0.1 + TypeORM 0.3.27 + MySQL 8 (mysql2, **not Prisma**)
- **Frontend (new)**: Next.js 16.2.2 + React 19 + TailwindCSS 4 + Radix UI + Zustand + NextAuth 5 beta
- **Frontend (legacy)**: Angular 16.2.12 + Angular Material + TailwindCSS 2.1 + Fuse theme (`src/@fuse/`)
- **Database**: MySQL 8 (UTF8MB4), soft delete via `del` column (0=active, 1=deleted)

## Commands

### How to Run (Development)

Start both **API** and **Web** in two terminals:

```bash
# Terminal 1 — API (NestJS backend, port 3000)
cd backend
npm run start:dev

# Terminal 2 — Web (Next.js frontend, port 3001)
cd frontend
npm run dev
```

Then open http://localhost:3001 — login with `admin_local` / `Admin@123`.

### Backend (from `backend/`)
- `npm run start:dev` — NestJS dev server with watch on port 3000
- `npm run build` — compile TypeScript
- `npm run test` — Jest unit + integration tests (77 tests)
- `npm run test -- <pattern>` — run a single test file or name pattern (e.g. `npm run test -- school.service`)
- `npm run test:watch` — Jest in watch mode
- `npm run test:cov` — coverage report
- `npm run test:debug` — debug Jest with `--inspect-brk` (runInBand)
- `npm run test:e2e` — E2E tests (requires `E2E_TEST=1` env, needs running MySQL)
- `npm run lint` — ESLint with fix
- `npm run migration:generate` — generate TypeORM migration
- `npm run migration:run` — run pending migrations
- `npm run migration:revert` — revert last migration
- `npm run seed` — seed DB (creates admin: `admin_local` / `Admin@123`)

### Next.js Frontend (from `frontend/`)
- `npm run dev` — Next.js dev server on port 3001 (Webpack mode, avoids Turbopack crash on Windows)
- `npm run build` — production build (output: standalone)
- `npm start` — start production build on port 3001

> **Warning**: Next.js 16.2 has breaking changes vs older versions. Read `frontend/node_modules/next/dist/docs/` before writing Next.js code. Heed deprecation notices.

### Angular Frontend — Legacy (from root)
- `npm start` — Angular dev server on port 4200 (uses `--openssl-legacy-provider`)
- `npm run build` — production build
- `npm test` — Karma/Jasmine tests
- `npm run lint` — TSLint with auto-fix

### Combined (from root)
- `npm run start:all` / `npm run dev` — run Angular frontend + backend concurrently
- `npm run install:all` — install deps for both Angular frontend and backend
- `npm run build:all` / `npm run test:all` / `npm run lint:all`

### Production (Docker)
```bash
docker-compose up -d --build
```
See `PRODUCTION.md` for full deployment guide, smoke tests, and rollback plan.

### Environment
Backend requires `backend/.env` (copy from `backend/env.example`):
```
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=sfmisystem
CORS_ORIGIN=http://localhost:3001,http://localhost:4200
JWT_SECRET=<secret>
COMMITTEE_THRESHOLD=5000   # Baht threshold for committee approval (procurement)
SENTRY_DSN=               # optional, enables error tracking via Sentry
AI_DEFAULT_PROVIDER=gemini # or ollama
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
OLLAMA_BASE_URL=
OLLAMA_MODEL=
```
Next.js frontend requires `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/
NEXTAUTH_URL=http://localhost:3001
AUTH_SECRET=<your-secret-key>
```
Angular frontend API base URL in `src/environments/environment.ts` → `http://localhost:3000/api/`.

### Health Check
- Backend: `GET http://localhost:3000/api/health` — returns DB connection status

## Architecture

### Backend (NestJS)
- Entry: `backend/src/main.ts` → `backend/src/app.module.ts`
- API prefix: `/api/` — all routes are prefixed
- Standard module structure: `module.ts`, `controller.ts`, `service.ts`, `dto/`, `entities/`
- 41 feature modules — core: Admin, Dashboard, SchoolYear, School, GeneralDb, Policy, Student, Budget, Settings, Project, ProjectApprove, Receive, Receipt, Invoice, Check, Bank, Supplie, AuditCommittee, ReportDailyBalance, ReportCheckControl, ReportBookbank, RegisterMoneyType; extended: Ai, BankLedger, BankReconciliation, CashKeeping, DayCloseCheck, DocCounter, FinancialAudit, FiscalYearBalance, GlobalSearch, GovRevenue, Health, LoanAgreement, MonthlySubmission, ProcurementPlan, ReceiptBook, SmpDeposit, UnifiedRegister, YearEndReport
- TypeORM `synchronize` is ON in dev, OFF in production (`NODE_ENV=production`)
- ⚠️ `synchronize: true` in dev means entity changes auto-alter tables. Generate a migration before merging schema changes (`npm run migration:generate`) — production relies on migrations, not sync.
- Global `ValidationPipe` with `whitelist: true` and `transform: true`
- Multi-tenancy by `sc_id` (school ID); multi-year by `sy_id` (school year) and `budget_year`

### Next.js Frontend (`frontend/`)
- App Router with route groups: `(auth)/` for login, `(dashboard)/` for protected pages
- Feature pages under `app/(dashboard)/sfmis/` — 20+ SFMIS pages
- API calls via `frontend/lib/api.ts` — `apiGet<T>()` and `apiPost<T>()` that auto-attach Bearer token from `auth-token.ts` (in-memory + sessionStorage fallback) and `up_by` from `localStorage.data`; has 401 retry logic: clears token → refreshes from NextAuth session → retries → signs out if still 401
- Token storage: `frontend/lib/auth-token.ts` — in-memory primary, sessionStorage only for Fast Refresh recovery (XSS defense — **not** localStorage)
- Auth: NextAuth 5 beta (`frontend/auth.ts`) — Credentials provider against `/api/B_admin/login`, JWT strategy, 8-hour sessions; `access_token` stored in JWT payload
- State: Zustand store at `frontend/stores/user-store.ts` — persisted to localStorage, holds `user` and `yearData`; `frontend/stores/ai-chat-store.ts` — AI chat UI state, keeps last 50 messages
- Types: all domain entities defined in `frontend/lib/types.ts`
- Providers wired in `frontend/app/layout.tsx`: SessionProvider, QueryClientProvider, Toaster

### Angular Frontend (`src/`) — Legacy
- Entry: `src/main.ts` → `src/app/app.module.ts` → `src/app/app.routing.ts`
- Feature modules: `src/app/modules/admin/sfmisystem/` (invoice, receipt, budget, school, report, etc.)
- Central API service: `src/@fuse/services/connect.api.service.ts` — all HTTP calls go through here
- Auth: guards (`AuthGuard`, `NoAuthGuard`) + HTTP interceptor for token injection
- Locale: `th-TH` (Thai)

### Database
- SQL schema files in `sfmisystem_db/` (30+ files)
- Audit fields on most tables: `cre_date`, `up_date`, `up_by`
- Soft delete: `del` column (0=active, 1=deleted) — always filter by `del=0`

## Domain Areas

- **งานนโยบายและแผน** — Student headcount → budget calc, Project + ProjectApprove
- **งานการเงิน** — Receive, Invoice (request), Check (issue), Receipt, daily-balance reports
- **งานพัสดุ** — Supplie purchase/receive/issue, materials register
- **งานผู้อำนวยการ** — director-level approvals (project/budget/invoice)

## Reference Docs (root)

- `context.md` — system context, domain, data flow
- `plan.md` / `tasks.md` / `DEVELOPMENT_ROADMAP.md` — roadmap & task state
- `PRD_API_Endpoints.md` / `PRD_Database_Schema.md` / `PRD_Flowcharts.md` — PRDs (note: filenames mention Prisma but the codebase uses TypeORM)
- `SECURITY_VULNERABILITIES.md` — known CVE inventory and remediation plan
- `backend/BACKEND_ARCHITECTURE.md`, `backend/CREATE_MODULES_GUIDE.md` — module conventions

## API Conventions

- **List endpoints** return: `{ data: any[], count: number, page: number, pageSize: number }`
- **CUD endpoints** return: `{ flag: boolean, ms: string }`
- Controllers use `@HttpCode(HttpStatus.OK)` on POST endpoints
- Path params validated with `ParseIntPipe`

## UI Components (Next.js)

### Frontend Utilities (`frontend/lib/`)
- `export-xlsx.ts` — `exportToXlsx(rows, sheetName, filename)` using `xlsx` library; triggered by `<ExportButton>` (green download button in `frontend/components/ui/export-button.tsx`)
- `print-utils.ts` — `openPrintWindow()` for A4/A5 print layouts; helpers: `numberToThaiBaht()` (amount → Thai text for checks), `thaiFullDate()`, `fmtBaht()`, `makeTable()`, `makeHeader()`, `makeSignatures()` — use these for official Thai document printing
- `utils/withholding.ts` — `calcWithholding()` for frontend VAT/withholding preview (mirrors backend `withholding.util.ts`)

### AI Module (`/api/ai`)
- ให้บริการ ChatService, ValidationService, AnalysisService, MergeService
- รองรับ 2 providers: Gemini (`GEMINI_API_KEY`) หรือ Ollama (`OLLAMA_BASE_URL`) — เลือกด้วย `AI_DEFAULT_PROVIDER`
- ทุก role เข้าถึงได้ (roles 1–8); ใช้ `ai-chat-store.ts` ใน frontend

### ThaiDatePicker
- ไฟล์: `frontend/components/ui/thai-date-picker.tsx`
- รับ `value: string` (YYYY-MM-DD, CE) / คืน `string` (YYYY-MM-DD, CE)
- แสดงปีเป็น **พ.ศ.** เช่น `15 เม.ย. 2569`
- ใช้กับ react-hook-form ผ่าน `watch` + `setValue`:
  ```tsx
  const dateVal = watch('field_name')
  <ThaiDatePicker value={dateVal} onChange={(v) => setValue('field_name', v, { shouldValidate: true })} />
  ```
- **ห้าม** ใช้ `{...register('field')}` — ต้องใช้ controlled pattern ข้างต้นเท่านั้น

### Date Formatting (utils.ts)
- `fmtDateTH(date)` — แปลงวันที่ทุกรูปแบบ → ภาษาไทย พ.ศ. เต็ม
  - `"2026-04-15"` → `"15 เม.ย. 2569"`
  - `"2026-04-15T04:29:15.256Z"` → `"15 เม.ย. 2569 04:29 น."`
  - รองรับ ISO (T), SQL (space), ตัด timezone อัตโนมัติ
- `getThaiDate` / `getThaiDateTime` — alias ของ `fmtDateTH` (backward-compatible)
- `toBE(year)` — แปลง CE year เป็น BE (idempotent: ถ้า ≥ 2400 คืนค่าเดิม)
- **Database/API ยังรับ-ส่ง YYYY-MM-DD (CE) เสมอ** — แปลงเฉพาะตอนแสดงผล

## Known Patterns & Gotchas

### react-hook-form + Zod
- **ห้ามใช้ `z.coerce.number()`** กับ `zodResolver` — TypeScript error: `Resolver<...field: unknown>` not assignable
- ใช้ `z.number()` + `valueAsNumber: true` ใน register แทน:
  ```tsx
  z.object({ amount: z.number().min(0) })
  <Input type="number" {...register('amount', { valueAsNumber: true })} />
  ```
- Select / ThaiDatePicker ใช้ `setValue('field', value)` ไม่ใช่ `register`

### localStorage structure
```ts
// localStorage.getItem('data') — ข้อมูลผู้ใช้
{ sc_id: number, admin_id: number, name: string, ... }

// localStorage.getItem('years') — ปีการศึกษา/งบประมาณ
{
  sy_date:     { sy_id: number, sy_year: number }   // sy_id = auto-increment ID
  budget_date: { sy_id: number, budget_year: number } // budget_year = ปีจริง เช่น 2569
}
```

### sy_id vs budget_year/acad_year ⚠️
- `sy_id` = auto-increment primary key ของตาราง school_year (เช่น 1, 2, 3)
- `budget_year` = ปีงบประมาณจริง (เช่น 2568, 2569)
- `parcel_order.acad_year` เก็บ **ปีจริง** (budget_year) ไม่ใช่ sy_id
  → endpoint `Project_approve/loadProjectApprove/:sc_id/:sy_id` รับ `budget_year` ไม่ใช่ `sy_id`
- กฎ: ถ้า endpoint ของ Angular เดิมใช้ชื่อ `:sy_id` แต่ table เก็บเป็นปี ให้ส่ง `budget_year`

### Project vs ProjectApprove (คนละ module!)
| Module | Table | หน้า | ใช้สำหรับ |
|---|---|---|---|
| `Project` | `pln_project` | `plan-menu/project` | CRUD โครงการ (เพิ่ม/แก้/ลบ) |
| `ProjectApprove` | `parcel_order` | `plan-menu/proj-approve` | workflow จัดซื้อ/จัดจ้าง |
- `project/load_project/:scId/:userId/:page/:pageSize/:syId` — โหลดโครงการ
- `Project/addProject`, `Project/updateProject`, `Project/removeProject` — CRUD โครงการ

### NestJS — หลายตัว Controller ใน Module เดียว
เพิ่ม controller ใหม่เข้า `controllers: [...]` ใน `*.module.ts`:
```ts
@Module({
  controllers: [MainController, ExtraController],
  providers:   [MainService],
})
```
ตัวอย่าง: `registration-certificate.module.ts` มีทั้ง `RegistrationCertificateController` และ `WithholdingCertificateController`

### Student page (`receive-menu/student`)
- `Student/checkClassOnYear` — ต้องเรียกก่อน loadStudent เพื่อ auto-init row ทุก class level
- Response `loadStudent` มี `edit: boolean` — `false` = ล็อกแล้ว (ยืนยันส่งแล้ว) ซ่อนปุ่มแก้ไข

### Withholding Certificate (หักภาษี ณ ที่จ่าย)
- `cal_vat = 1` → vat = amount−(amount×7/107); deduct = vat×0.01
- `cal_vat = 0` → deduct = amount×0.01
- status 100 = กำลังดำเนินการ (แก้ไขได้), status 101 = ออกหนังสือแล้ว (ล็อก)
- Backend: `Withholding_certificate/` prefix, อยู่ใน `registration-certificate` module

## Development Rules

- Do not change existing Angular interfaces/APIs unless necessary
- Backend entities use TypeORM `@Entity()` decorators with `TypeOrmModule.forFeature()`
- Tailwind CSS (Angular) has custom theme with 5 presets (default, brand, indigo, rose, purple, amber)
- Prettier: 120 char width, single quotes, 2-space indent, trailing commas ES5
- Build budgets: 5MB initial warning, 8MB error

## Security

- **Helmet** security headers on all API responses (CSP disabled for API — frontend controls its own)
- **CORS** restricted to `CORS_ORIGIN` env in production; open in dev
- **Rate limiting** on login endpoint (5 requests/minute via ThrottlerGuard)
- **Soft delete** — all update/delete operations filter `del: 0` to prevent modifying deleted records
- Plaintext `password_default` is NOT returned in API responses
- **Global JwtAuthGuard** registered as `APP_GUARD` — all endpoints require JWT by default; use `@Public()` decorator to bypass
- **RolesGuard** with `@Roles(roleId[])` decorator — omitting `@Roles()` allows any authenticated user; specify role IDs to restrict
- **PageSizePipe** (`backend/src/common/pipes/page-size.pipe.ts`) — caps `pageSize` at 500 to prevent DB abuse
- **Sentry** (`backend/src/instrument.ts`) — loaded first in `main.ts`; active only when `SENTRY_DSN` env is set

## CI/CD

GitHub Actions in `.github/workflows/`:
- `ci.yml` — lint, build, test on push/PR to main/develop (Node 20, separate backend/frontend jobs)
- `deploy.yml` — blue-green deployment on push to main

## Docker

- `backend/Dockerfile` — multi-stage build with health check
- `frontend/Dockerfile` — standalone Next.js output
- `docker-compose.yml` — full stack (MySQL + Backend + Frontend)

## Production Deployment (live server)

- **Server path**: `/DATA/AppData/www/sfmisystem` (Linux host `payaprai-MS-7E41`, public IP `203.172.184.47`)
- **DB**: external **MariaDB** at `192.168.1.4:3306`, database `sfmisystem` (not the in-compose MySQL)
- **Compose file**: `docker-compose.production.yml` + `.env.production` (env_file). Helper: `deploy-production.sh`
- **Published ports** (host → container): **API `9941`→3000**, **Web `9940`→3001**. Direct URLs: web `http://203.172.184.47:9940`, API `http://203.172.184.47:9941/api/`
- **Public URL = `https://sfmis.cnppai.com`** (behind Nginx Proxy Manager + Let's Encrypt) — see *Reverse proxy* below.
- Backend log prints `localhost:3000` (internal container port) — this is correct; external access is via 9941/9940 or the domain.

### Deploy command — needs a `.env` file for interpolation
```bash
cd /DATA/AppData/www/sfmisystem
ln -sf .env.production .env       # ONE-TIME: compose auto-reads .env (no --env-file needed)
git pull origin main
docker compose -f docker-compose.production.yml up -d --build
```
- ⚠️ Compose interpolates `${NEXT_PUBLIC_API_URL}` (frontend build arg) from `.env` in the project dir. **Without `.env` (or `--env-file .env.production`) it resolves blank** → `WARN ... not set` → the frontend bundle bakes a blank API URL → AI "Failed to fetch" + login `CredentialsSignin`. The `.env` symlink fixes this permanently. `WARN ... not set` appearing on any compose command means the symlink is missing.
- `NEXT_PUBLIC_*` are baked at **build** time → changing the API URL/ports requires a frontend **`--build`**, not just restart. Backend-only env (`AI_*`, `CORS_ORIGIN`, `DB_*`) is runtime (`env_file`) → `up -d backend` (recreate) is enough.
- **The API URL lives in places that must match**: `docker-compose.production.yml` (port map / extra_hosts), `.env.production` (`NEXT_PUBLIC_API_URL`/`NEXTAUTH_URL`/`CORS_ORIGIN`), NPM proxy, and the URL opened in the browser.
- **Login endpoint `B_admin/login` expects field `email`** (holds the username value), not `username`. `frontend/auth.ts` posts `{email, password}` to `${NEXT_PUBLIC_API_URL}B_admin/login`.

### DB grant for Docker (one-time on MariaDB)
The backend container reaches MariaDB from the Docker bridge gateway `172.17.0.1`. The DB user must be granted for that host or it fails with `Access denied for user '<user>'@'172.17.0.1'`:
```sql
CREATE USER IF NOT EXISTS '<DB_USER>'@'172.17.0.%' IDENTIFIED BY '<DB_PASS matching .env.production>';
GRANT ALL PRIVILEGES ON sfmisystem.* TO '<DB_USER>'@'172.17.0.%';
FLUSH PRIVILEGES;
```

### Reverse proxy (Nginx Proxy Manager → `sfmis.cnppai.com`)
NPM (container `nginxproxymanager`, admin on host `:81`) maps `sfmis.cnppai.com` → frontend `192.168.1.4:9940` with Force-SSL. Because the browser page is HTTPS on the domain but `lib/api.ts` calls the absolute `NEXT_PUBLIC_API_URL`, the API must be served **same-origin over HTTPS** or it's blocked (mixed-content + CORS). Set `NEXT_PUBLIC_API_URL=https://sfmis.cnppai.com/api/`, `NEXTAUTH_URL=https://sfmis.cnppai.com`, `CORS_ORIGIN=https://sfmis.cnppai.com,http://203.172.184.47:9940`, `AUTH_TRUST_HOST=true`, then rebuild.
- **Two custom locations** on the `sfmis.cnppai.com` proxy host (order by nginx longest-prefix): `/api/auth` → `192.168.1.4:9940` (NextAuth lives on the frontend), `/api` → `192.168.1.4:9941` (SFMIS backend). Without splitting `/api/auth`, login breaks.
- NPM's **Custom Locations UI throws "Internal Error"** in v2.14 — use the host's **Advanced** tab (raw nginx `location` blocks) instead.
- **`extra_hosts: ['sfmis.cnppai.com:192.168.1.4']` on the frontend service** (in `docker-compose.production.yml`) — NextAuth `authorize()` runs server-side in the container and fetches the public domain; without this the container hits hairpin-NAT and fails TLS (`tlsv1 unrecognized name`) → login fails. The mapping makes the container reach NPM directly.

### AI provider — Gemini free tier runs out
`AI_DEFAULT_PROVIDER=gemini` (free tier) hits daily/per-minute quota → AI replies "เกิดข้อผิดพลาดในการสร้างคำตอบ" (HTTP 429 `RESOURCE_EXHAUSTED` in backend logs). Switch to the already-configured OpenRouter: set `AI_DEFAULT_PROVIDER=openrouter` (uses `OPENROUTER_API_KEY` + `OPENROUTER_MODEL=google/gemini-2.5-flash`), then `up -d backend`. Startup logs `Default AI provider: openrouter`.

### Backups — automated
`backup-db.sh` (repo root) dumps MariaDB → `backups/*.sql.gz`, keeps 14 days. Runs via docker `mariadb:11` on the **same docker network as `sfmisystem-backend-1`** (default bridge can't reach `192.168.1.4`; the network also matches the `172.17.0.%` grant). Cron: `0 2 * * * /DATA/AppData/www/sfmisystem/backup-db.sh >> .../backups/backup.log 2>&1`. The MariaDB `--ssl-verify-server-cert ... passwordless` warning is harmless (password via `MYSQL_PWD`).

### Seeding a fresh production DB ⚠️
Prod uses `synchronize:false` + `migrationsRun:true`, and migrations are **incremental only** (no base-schema migration). The old `sfmisystem_db/sfmisystem.sql` (Sep 2025 Angular dump, 55 tables) is a **different schema** (`project` vs `pln_project`, missing `budget_request`/`sup_contract_security`/`tb_fixed_asset`…) — importing it makes migrations fail. **Correct baseline = `mysqldump` the dev DB** (99 tables, schema matches entities) + append `INSERT INTO migrations(timestamp,name)` for all current migration classes so `migrationsRun` treats them as applied. Dev MySQL uses `utf8mb4_general_ci` (MariaDB-compatible). Demo data is tenant `sc_id=2` — delete with `DELETE FROM <each table with sc_id> WHERE sc_id=2` (70 tables).
