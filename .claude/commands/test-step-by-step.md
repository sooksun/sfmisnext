---
description: ทดสอบระบบ SFMIS ทีละขั้น (env → static → unit → build → DB → smoke → integration) หยุดและตัดสินใจระหว่าง phase ได้
argument-hint: [phase number 0-7 | "all"] — เว้นว่าง = เริ่ม phase 0 แล้วถามต่อทีละขั้น
---

ทำหน้าที่ QA Engineer ของ SFMIS — เดินทดสอบระบบทีละ phase แบบมีจุดหยุด ผู้ใช้ตัดสินใจเดินต่อหรือหยุดเองได้

## Input

- `$ARGUMENTS`:
  - เว้นว่าง / `all` → เริ่มที่ Phase 0 แล้วถามต่อก่อนเข้า phase ถัดไป
  - ตัวเลข 0-7 → กระโดดไป phase นั้นเลย (เช่น `/test-step-by-step 5` = backend smoke)

## หลักการ

- **หยุดได้ทุก phase** — ถ้า phase ก่อนหน้า fail ระดับ 🔴 ต้องถามผู้ใช้ก่อนเดินต่อ
- **ไม่ start dev server เอง** ถ้าไม่ได้ขอ — ใช้คำสั่ง check-only (`tsc --noEmit`, `npm run build`) ก่อน
- **รายงานเป็นภาษาไทย** ทุก phase พร้อม pass/fail + ชี้ file:line ของ error
- **ห้าม mock** สิ่งที่ test ได้จริง (DB connection, build output)

---

## Phase 0 — Environment Readiness 🔴

ตรวจว่าโปรเจกต์พร้อม test หรือยัง

### 0.1 ตรวจไฟล์ env
```bash
ls -la backend/.env frontend/.env.local 2>&1
```
- ❌ ขาด `backend/.env` → แนะนำ `cp backend/env.example backend/.env`
- ❌ ขาด `frontend/.env.local` → แนะนำสร้างจากตัวอย่างใน `CLAUDE.md`

### 0.2 ตรวจ env keys ที่จำเป็น
อ่านและ verify ว่ามีครบ:
- `backend/.env`: `DB_HOST`, `DB_NAME`, `JWT_SECRET`, `CORS_ORIGIN`
- `frontend/.env.local`: `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL`, `AUTH_SECRET`

⚠️ ถ้า `JWT_SECRET` ว่างหรือเป็น default → 🔴 STOP

### 0.3 ตรวจ port ว่าง
```bash
netstat -ano | grep -E ":3000|:3001" 2>&1 | head -10
```
- ถ้าพบ process ติด port 3000/3001 → แจ้งผู้ใช้ก่อน (ไม่ kill เอง)

### 0.4 ตรวจ MySQL ตอบไหม
อ่าน `backend/.env` แล้ว ping ด้วย:
```bash
mysqladmin -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p<DB_PASS> ping 2>&1
```
- ถ้า MySQL ไม่ตอบ → แจ้งและถามว่าจะข้าม Phase 5/7 ไหม

### Phase 0 รายงาน
| Check | Result | Note |
|---|---|---|
| backend/.env | ✅ / ❌ | - |
| frontend/.env.local | ✅ / ❌ | - |
| JWT_SECRET set | ✅ / ❌ | - |
| ports 3000/3001 free | ✅ / ❌ | - |
| MySQL alive | ✅ / ❌ | - |

→ ถามผู้ใช้: เดินต่อ Phase 1 ไหม?

---

## Phase 1 — Static Analysis (Typecheck + Lint) 🟡

### 1.1 Typecheck Backend
```bash
cd backend && npx tsc --noEmit 2>&1
```
รายงาน: จำนวน error, file:line ที่พบ (top 10)

### 1.2 Typecheck Frontend
```bash
cd frontend && npx tsc --noEmit 2>&1
```
รายงาน: จำนวน error, file:line ที่พบ (top 10)

### 1.3 Lint Backend
```bash
cd backend && npm run lint 2>&1
```

### 1.4 Lint Frontend (ถ้ามี script)
```bash
cd frontend && npm run lint 2>&1 || echo "no lint script"
```

### Phase 1 รายงาน
| Check | Errors | Warnings | Status |
|---|---|---|---|
| Backend tsc | X | - | ✅ / ❌ |
| Frontend tsc | X | - | ✅ / ❌ |
| Backend lint | X | Y | ✅ / ❌ |
| Frontend lint | X | Y | ✅ / ❌ |

→ ถ้า fail 🔴 หยุดถาม / ถ้า warning 🟡 เดินต่อได้

---

## Phase 2 — Unit Tests 🟡

### 2.1 Backend Jest
```bash
cd backend && npm run test -- --passWithNoTests 2>&1
```
รายงาน:
- รวม: x passed, y failed, z skipped
- Test ที่ fail: ชื่อ + reason 1 บรรทัด
- ถ้า fail ใน core (auth, school, sc_id isolation) → 🔴

### 2.2 (ถ้ามี) Frontend tests
```bash
cd frontend && npm test -- --passWithNoTests --watchAll=false 2>&1 || echo "no frontend tests"
```

→ ถามผู้ใช้: เดินต่อ Phase 3 (build) ไหม? (ใช้เวลา 1-3 นาที)

---

## Phase 3 — Build Verification 🔴

### 3.1 Build Backend
```bash
cd backend && npm run build 2>&1
```
- ✅ มี `backend/dist/` + ไม่มี error
- ❌ Build fail → STOP, แสดง error

### 3.2 Build Frontend (Next.js)
```bash
cd frontend && npm run build 2>&1
```
- ✅ มี `.next/` + รายงานหน้าที่ build ได้ครบ
- ❌ Build fail → STOP, แสดงหน้าที่ fail

⚠️ **Next.js 16.2 breaking changes** — ดู deprecation warning ใน output ด้วย

### Phase 3 รายงาน
| Build | Status | Time | Output Size |
|---|---|---|---|
| Backend | ✅ / ❌ | Xs | - |
| Frontend | ✅ / ❌ | Xs | - |

---

## Phase 4 — Database Health 🟡

### 4.1 Migration status
```bash
cd backend && npm run typeorm -- migration:show 2>&1 || echo "check manual"
```
- ✅ ไม่มี pending
- 🟡 มี pending migration → แจ้งและถามว่ารันไหม (`npm run migration:run`)

### 4.2 Schema sync (dev only)
- อ่าน `backend/src/app.module.ts` ดู `synchronize` setting
- ⚠️ ถ้า production มี `synchronize: true` → 🔴

### 4.3 Seed (optional, ถามก่อน)
```bash
cd backend && npm run seed 2>&1
```
- เฉพาะถ้า DB ว่าง — ถามผู้ใช้ก่อน
- ตรวจว่า admin default `admin_local` / `Admin@123` ใช้ได้

→ ถามผู้ใช้: เริ่ม Phase 5 (start dev server เพื่อ smoke test) ไหม? นี่จะ start backend ที่พอร์ต 3000 ใน background

---

## Phase 5 — Backend Smoke Test 🔴

### 5.1 Start backend ใน background
```bash
cd backend && npm run start:dev
```
รัน background พร้อม `run_in_background: true`

รอประมาณ 10-15 วิ ให้ Nest bootstrap

### 5.2 Health check
```bash
curl -s http://localhost:3000/api/health 2>&1
```
- ✅ Response 200 + DB connected
- ❌ Response error → STOP, อ่าน log จาก background process

### 5.3 Login endpoint
```bash
curl -s -X POST http://localhost:3000/api/B_admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_local","password":"Admin@123"}' 2>&1
```
- ✅ ได้ `access_token` กลับมา → เก็บไว้ใช้ phase 7
- ❌ 401 → ตรวจ seed / ตรวจ password hash
- ❌ 5xx → 🔴 STOP

### 5.4 Rate limit smoke (optional)
ส่ง login ผิด 6 ครั้งติด — ครั้งที่ 6 ต้องโดน throttle (429)

### Phase 5 รายงาน
| Check | Status | Note |
|---|---|---|
| Server boot | ✅ / ❌ | - |
| /api/health | ✅ / ❌ | DB: connected/fail |
| Login | ✅ / ❌ | token received? |
| Rate limit | ✅ / ❌ | (ถ้าทดสอบ) |

→ **อย่าลืม** kill backend background process ก่อนจบ phase ถ้าไม่ใช้ต่อ

---

## Phase 6 — Frontend Smoke Test 🟡

### 6.1 Start frontend (ถ้ายังไม่รัน)
```bash
cd frontend && npm run dev
```
รัน background, รอ 15-20 วิ

### 6.2 Homepage / login page โหลดไหม
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>&1
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/login 2>&1
```
- ✅ 200/307 (redirect ไป login)
- ❌ 500 → ตรวจ console จาก background

### 6.3 Static assets
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/_next/static 2>&1
```

### 6.4 ⚠️ UI smoke ที่ curl ไม่ทดสอบให้ได้
แจ้งผู้ใช้: phase นี้ทดสอบแค่ HTTP response — UI rendering / ปุ่ม / form ต้องเปิด browser ทดสอบเอง:
- เปิด http://localhost:3001
- Login `admin_local` / `Admin@123`
- เข้าเมนูหลัก (เช่น `/sfmis/plan-menu/project`) ดูว่าโหลด data ไหม

---

## Phase 7 — Integration Smoke 🟢

ใช้ token จาก Phase 5.3 ทดสอบ flow ที่สำคัญ

### 7.1 Multi-tenant isolation
```bash
TOKEN="<token จาก phase 5>"
curl -s http://localhost:3000/api/Dashboard/loadDashboard/<sc_id>/<sy_id> \
  -H "Authorization: Bearer $TOKEN" 2>&1
```
- ✅ ได้ data ของ sc_id ตัวเอง
- ลอง sc_id อื่น → ❌ ต้องไม่เห็นข้อมูล (cross-tenant guard ทำงาน)

### 7.2 Soft-delete filter
- เลือก endpoint list ใดๆ — verify ว่า record ที่มี `del=1` ไม่ถูก return

### 7.3 Auth guard
```bash
curl -s http://localhost:3000/api/Dashboard/loadDashboard/1/1 2>&1
```
ไม่มี Bearer → ต้อง 401

### 7.4 Public endpoint
```bash
curl -s http://localhost:3000/api/health 2>&1
```
ไม่มี token → ต้อง 200 (เพราะ `@Public()`)

### Phase 7 รายงาน
| Check | Status | Note |
|---|---|---|
| Tenant isolation (sc_id) | ✅ / ❌ | - |
| Soft delete filter (del=0) | ✅ / ❌ | - |
| Auth guard (no token → 401) | ✅ / ❌ | - |
| Public endpoint (200) | ✅ / ❌ | - |

---

## สรุปสุดท้าย (หลังจบทุก phase ที่รัน)

### Pass/Fail Matrix
| Phase | รายการ | ผลลัพธ์ | Severity |
|---|---|---|---|
| 0 | Env | ✅ / ❌ | 🔴 |
| 1 | Typecheck/Lint | ✅ / ❌ | 🟡 |
| 2 | Unit tests | ✅ / ❌ | 🟡 |
| 3 | Build | ✅ / ❌ | 🔴 |
| 4 | DB health | ✅ / ❌ | 🟡 |
| 5 | Backend smoke | ✅ / ❌ | 🔴 |
| 6 | Frontend smoke | ✅ / ❌ | 🟡 |
| 7 | Integration smoke | ✅ / ❌ | 🟢 |

### Verdict
- ✅ **READY** — 🔴 ผ่านหมด, 🟡 ยอมรับได้
- ⚠️ **NEEDS WORK** — 🔴 ผ่าน แต่ 🟡 มีปัญหา (action items ด้านล่าง)
- ❌ **NOT READY** — 🔴 fail ใดๆ

### Action Items (ถ้ามี issue)
- [ ] [severity] [phase] file:line — ปัญหา → วิธีแก้

### Background process cleanup
แจ้งผู้ใช้ว่ามี backend/frontend process รันอยู่ใน background ตอนไหน — ให้ผู้ใช้สั่ง kill ถ้าไม่ใช้ต่อ

---

## Rules

- **เริ่ม phase 0 เสมอ** ถ้าผู้ใช้ไม่ระบุ — env ผิดทำ phase อื่น fail สับสน
- **ห้ามข้าม phase 3 (build)** ถ้าจะ ship — type pass แต่ build fail เป็นไปได้ใน Next.js
- **ถามก่อน start dev server** — เป็น long-running process ใช้ resource
- **ใช้ background mode** สำหรับ dev server, อย่า block conversation
- **kill background process** หลัง phase 7 หรือเมื่อจบ ถ้าผู้ใช้ไม่ขอใช้ต่อ
- **อ้างอิง CLAUDE.md** เมื่อเจอ anti-pattern (เช่น sy_id vs budget_year, soft delete, sc_id)
- **ห้าม fix code เอง** — แค่ report + แนะนำ (ถ้าผู้ใช้สั่งแก้ค่อยทำ)
- **ผลลัพธ์เป็นภาษาไทย** ตลอดทุก phase
