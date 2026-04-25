---
description: ออกแบบ architecture (module boundary, data flow, async jobs) ก่อนลงโค้ด
argument-hint: [feature description]
---

ทำหน้าที่ Software Architect — ออกแบบภาพรวมระบบสำหรับฟีเจอร์

## Input

- `$ARGUMENTS` = คำอธิบายฟีเจอร์ (ถ้าไม่มีให้ถาม)

## Stack Context (SFMIS)

- **Monorepo**: `backend/` (NestJS 11), `frontend/` (Next.js 16), `src/` (Angular legacy)
- **Backend modules**: `backend/src/modules/*/` — 40+ feature modules
- **State**: Zustand (`user-store`, `ai-chat-store`), TanStack Query server state
- **Auth**: JWT global guard + `@Roles()` decorator + `@Public()` bypass
- **AI**: Gemini หรือ Ollama (เลือกด้วย `AI_DEFAULT_PROVIDER`)
- **TypeORM**: `synchronize: true` in dev (auto-alter), migrations in production
- **Shared** `backend/src/common/` — pipes, decorators, guards, utils
- **ไม่มี** Redis / worker queue ใน stack ปัจจุบัน — ถ้าต้องใช้ ให้ระบุว่าเป็น new dependency

## Output Format (ภาษาไทย)

### 1. High-Level Architecture
- Diagram แบบ ASCII หรือ mermaid แสดง flow: client → NestJS → TypeORM → MySQL
- ถ้ามี async/AI ให้แสดง producer → queue → consumer

### 2. Module Breakdown
สำหรับแต่ละ module ใหม่/ที่ต้องแก้:
- ชื่อ module (kebab-case)
- responsibility (1 ประโยค)
- dependency กับ module อื่น
- public API (service method หรือ event ที่ export)

### 3. Request Flow (sync)
ลำดับ: UI → API client (`lib/api.ts`) → `@Controller` → `Service` → `Repository` → `MySQL` → response shape

### 4. Async Job Flow (ถ้ามี)
- trigger point
- queue/background mechanism (ถ้าต้อง add dep ใหม่ แจ้งว่าเป็น new)
- retry/error handling

### 5. Database Interaction
- entities ที่เกี่ยวข้อง
- new indexes ที่แนะนำ (อ้างอิง index naming ของ SFMIS: `@Index(['scId', 'del'])`)
- soft delete strategy (`del: 0`)
- multi-tenant filter (`scId`, `syId`/`budgetYear`)

### 6. Security Concerns
- JWT role ที่ต้องกัน
- data leak across `sc_id`
- rate limit (เช่น login มี 5/min)
- input validation via `class-validator` + ValidationPipe (whitelist=true)

### 7. Scalability Concerns
- N+1 risk จาก TypeORM eager loading
- pagination bound (PageSizePipe cap ที่ 500)
- cache strategy (ถ้าต้อง)

### 8. Deployment Notes
- env variable ใหม่ (ถ้ามี)
- migration ที่ต้องรันก่อน
- feature flag / rollout plan
- breaking change กับ Angular frontend?

## Rules

- **ห้ามเดา infra ที่ไม่มีใน stack** (Redis, Kafka, S3) เว้นแต่จำเป็น — ถ้าจำเป็นให้ flag ว่าเป็น new dep
- **ยึดกับโครงของ SFMIS** — reuse `common/` pipes/decorators/guards
- **อ้างอิง pattern ของ module ที่มีอยู่** — ชี้ชื่อ module ตัวอย่างอย่างน้อย 1 ตัว
- **ไม่เขียน code** — ตอบเฉพาะ design
