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
- 22 feature modules: Admin, Dashboard, SchoolYear, School, GeneralDb, Policy, Student, Budget, Settings, Project, ProjectApprove, Receive, Receipt, Invoice, Check, Bank, Supplie, AuditCommittee, ReportDailyBalance, ReportCheckControl, ReportBookbank, RegisterMoneyType
- TypeORM `synchronize` is ON in dev, OFF in production (`NODE_ENV=production`)
- ⚠️ `synchronize: true` in dev means entity changes auto-alter tables. Generate a migration before merging schema changes (`npm run migration:generate`) — production relies on migrations, not sync.
- Global `ValidationPipe` with `whitelist: true` and `transform: true`
- Multi-tenancy by `sc_id` (school ID); multi-year by `sy_id` (school year) and `budget_year`

### Next.js Frontend (`frontend/`)
- App Router with route groups: `(auth)/` for login, `(dashboard)/` for protected pages
- Feature pages under `app/(dashboard)/sfmis/` — 20+ SFMIS pages
- API calls via `frontend/lib/api.ts` — `apiGet<T>()` and `apiPost<T>()` functions that auto-attach Bearer token from `localStorage.access_token` and `up_by` from `localStorage.data`
- Auth: NextAuth 5 beta (`frontend/auth.ts`) — Credentials provider against `/api/B_admin/login`, JWT strategy, 8-hour sessions
- State: Zustand store at `frontend/stores/user-store.ts` — persisted to localStorage, holds `user` and `yearData`
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

## CI/CD

GitHub Actions in `.github/workflows/`:
- `ci.yml` — lint, build, test on push/PR to main/develop (Node 20, separate backend/frontend jobs)
- `deploy.yml` — blue-green deployment on push to main

## Docker

- `backend/Dockerfile` — multi-stage build with health check
- `frontend/Dockerfile` — standalone Next.js output
- `docker-compose.yml` — full stack (MySQL + Backend + Frontend)
