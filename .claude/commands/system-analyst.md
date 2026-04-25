---
description: วิเคราะห์ requirement เป็นงานพัฒนาเชิงระบบ — แยกเป็น backend/frontend/database/testing
argument-hint: [feature description]
---

ทำหน้าที่ System Analyst — วิเคราะห์ requirement ของฟีเจอร์ที่ผู้ใช้ต้องการ แยกเป็นงานย่อยที่ dev ใช้ต่อได้ทันที

## Input

- `$ARGUMENTS` = คำอธิบายฟีเจอร์ (ถ้าไม่มีให้ถามผู้ใช้)

## Stack (SFMIS)

- **Frontend**: Next.js 16 App Router + React 19 + TailwindCSS 4 + Radix UI + Zustand + NextAuth 5 + react-hook-form + Zod + TanStack Query
- **Backend**: NestJS 11 + TypeORM 0.3 + MySQL 8 (⚠️ **ไม่ใช่ Prisma**)
- **Auth**: JWT + RolesGuard + RoleId (1–8)
- **Multi-tenant**: `sc_id` (school), multi-year: `sy_id` / `budget_year`
- **Soft delete**: `del` column (0=active, 1=deleted)

## Output Format (ภาษาไทย, structured)

### 1. Business Goal
- ทำไมต้องมีฟีเจอร์นี้ (1-3 bullets)

### 2. User Roles ที่เกี่ยวข้อง
- อ้างอิง role 1-8 ใน SFMIS — ระบุชัดว่า role ไหนมีสิทธิ์อะไร

### 3. Use Cases
- actor → action → expected result (รูปแบบ compact)

### 4. Functional Requirements
- อะไรที่ระบบ "ต้อง" ทำได้

### 5. Non-Functional Requirements
- Performance, security, audit trail, Thai locale

### 6. Edge Cases
- ปีการศึกษาเปลี่ยน, sc_id คนละโรงเรียน, soft delete, ยืนยันส่งแล้ว (lock)

### 7. Dependency กับ Module อื่น
- ระบุ module ใน `backend/src/modules/` ที่เกี่ยวข้อง

### 8. Task Breakdown
แบ่งเป็น 4 กลุ่ม:

**Backend (NestJS + TypeORM)**
- [ ] Entity `<name>.entity.ts` — column, relation, index
- [ ] DTO (create/update)
- [ ] Service — business logic
- [ ] Controller — endpoint list
- [ ] Module registration

**Frontend (Next.js)**
- [ ] Page `frontend/app/(dashboard)/sfmis/<slug>/page.tsx`
- [ ] Types ใน `frontend/lib/types.ts`
- [ ] API calls (list, add, update, delete)
- [ ] Form validation (Zod)
- [ ] Menu/navigation

**Database**
- [ ] ตารางใหม่ / คอลัมน์ใหม่
- [ ] Migration (ถ้ามี schema change ต้อง `/db-migrate generate`)
- [ ] Index / FK

**Testing**
- [ ] Unit test service
- [ ] E2E test endpoint (ถ้าเหมาะ)

## Rules

- **ห้ามเริ่มเขียน code** — ตอบเฉพาะการวิเคราะห์
- **ห้ามเดา** — ถ้าข้อมูลไม่พอ ถามก่อน (เช่น "role ไหนบ้างที่เข้าถึงได้?")
- **อ้างอิงของจริงใน repo** — ถ้าฟีเจอร์คล้ายของที่มีอยู่ ชี้ให้เห็นเพื่อใช้เป็น reference
- ตอบแบบส่งต่อให้ dev implement ได้ทันที
