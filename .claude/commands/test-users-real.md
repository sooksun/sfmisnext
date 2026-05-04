---
description: ทดสอบระบบจริงโดย login ทุก role (1-8) แล้วทดลองบันทึกข้อมูลผ่าน API ที่ frontend ใช้ — รายงานเป็นภาษาไทย
argument-hint: [role number 1-8] — เว้นว่าง = ทดสอบทุก role
---

ทำหน้าที่ QA Engineer — ทดสอบระบบ SFMIS ด้วยการ login เป็น user ทุก role แล้วบันทึกข้อมูลจริงผ่าน endpoint เดียวกับที่ frontend (port 3001) เรียก

## Input

- `$ARGUMENTS`:
  - เว้นว่าง → ทดสอบทุก role (1-8)
  - ตัวเลข 1-8 → ทดสอบเฉพาะ role นั้น

## หลักการ

- **บันทึกข้อมูลจริง** ลง MySQL (ไม่ mock) ผ่าน endpoint เดียวกับที่ Next.js frontend เรียก
- **ใส่ prefix `__E2E__`** ทุก record ที่สร้าง → cleanup ได้ภายหลัง
- **เก็บ token แยก user** ห้ามใช้ token ของคนอื่น
- **ตรวจ multi-tenant guard** — ทุก request ต้องส่ง JWT ของ user ที่ login เท่านั้น
- **รายงานผลภาษาไทย** ทุก step

## ขั้นตอน

### 1. ตรวจ pre-condition

```bash
# Backend (port 3000) ต้อง alive
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health

# Frontend (port 3001) ต้อง alive (verify เท่านั้น ไม่ได้เรียก API ผ่าน)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/
```

- ถ้า backend ไม่ตอบ → 🔴 STOP, แจ้งผู้ใช้ start ด้วย `cd backend && npm run start:dev`
- ถ้า frontend ไม่ตอบ → 🟡 แจ้งเตือนแต่เดินต่อได้ (test ผ่าน backend ที่ frontend ใช้)
- ถ้า MySQL ตอบไม่ได้ → 🔴 STOP

### 2. Seed test users (idempotent)

```bash
cd backend && npm run seed:test-users
```

จะสร้าง 8 admin records (ถ้ายังไม่มี):

| Username | Password | type (role) | scId |
|---|---|---|---|
| test_role_1 | Test@1234 | 1 (Super Admin) | 1 |
| test_role_2 | Test@1234 | 2 (ผอ./Admin โรงเรียน) | 1 |
| test_role_3 | Test@1234 | 3 (ฝ่ายแผนงาน) | 1 |
| test_role_4 | Test@1234 | 4 (งานพัสดุ) | 1 |
| test_role_5 | Test@1234 | 5 (การเงิน) | 1 |
| test_role_6 | Test@1234 | 6 (หัวหน้าแผนงาน) | 1 |
| test_role_7 | Test@1234 | 7 (หัวหน้าพัสดุ) | 1 |
| test_role_8 | Test@1234 | 8 (หัวหน้าการเงิน) | 1 |

ผลลัพธ์: รายงานว่าสร้างใหม่กี่ record / มีอยู่แล้วกี่ record

### 3. รัน E2E test runner

```bash
cd backend && npm run test:users-e2e -- $ARGUMENTS
```

Script จะทำสำหรับแต่ละ user:

1. **Login** — POST `/api/B_admin/login` รับ JWT
2. **Read smoke** — GET endpoint ที่ role นั้นใช้บ่อย (verify auth + data load)
3. **Write smoke** — POST endpoint ที่ role นั้นต้องใช้ (บันทึกข้อมูลจริง)
4. **Verify** — read data ที่เพิ่ง save → ต้องเจอ
5. **Cleanup** — soft-delete record ที่สร้าง (`del=1`)

### 4. รายงานผล

แสดงตารางในรูปแบบนี้:

| Role | User | Login | Read | Write | Verify | Cleanup | Note |
|---|---|---|---|---|---|---|---|
| 1 | test_role_1 | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| 2 | test_role_2 | ✅ | ✅ | ⏭ skip | - | - | role นี้ approve เท่านั้น (อ่านอย่างเดียว) |
| 3 | test_role_3 | ✅ | ✅ | ✅ | ✅ | ✅ | สร้าง project __E2E__ |
| 4 | test_role_4 | ✅ | ✅ | ✅ | ✅ | ✅ | สร้าง type-supplies __E2E__ |
| 5 | test_role_5 | ✅ | ✅ | ✅ | ✅ | ✅ | สร้าง invoice __E2E__ |
| ... | | | | | | | |

### 5. ถ้ามีของค้าง (cleanup ไม่สมบูรณ์)

แสดง command ให้ผู้ใช้ลบเอง:

```sql
-- ตัวอย่าง: ลบ project ที่สร้างจาก E2E
UPDATE pln_project SET del=1 WHERE prj_name LIKE '__E2E__%';
UPDATE request_withdraw SET del=1 WHERE detail LIKE '__E2E__%';
UPDATE pln_project SET del=1 WHERE prj_name LIKE '__E2E__%';
```

## Per-role test scenarios

ตามที่ E2E script ทำ:

### Role 1 (Super Admin)
- **Read**: GET `/api/B_admin/load_admin/1/10` — ดู list admin
- **Write**: POST `/api/B_admin/addAdmin` (สร้าง admin ชื่อ `__E2E__test_admin_<ts>`) → POST `/api/B_admin/remove_admin` (ลบทันที)

### Role 2 (ผอ./Admin โรงเรียน)
- **Read**: GET `/api/B_admin/load_user/1/1/10` — ดู user ในโรงเรียน
- **Write**: POST `/api/Invoice/ConfirmInvoice` แต่ต้องมี invoice ที่ status=102 อยู่ก่อน → ถ้าไม่มี → skip + แจ้ง

### Role 3 (ฝ่ายแผนงาน)
- **Read**: GET `/api/Project/load_project/1/<adminId>/0/10/<sy_id>`
- **Write**: POST `/api/Project/addProject` (project ชื่อ `__E2E__plan_<ts>`)

### Role 4 (งานพัสดุ)
- **Read**: GET `/api/General/loadTypeSupplies/1`
- **Write**: POST `/api/General/addTypeSupplies` (`tsName: __E2E__type_<ts>`)

### Role 5 (การเงิน)
- **Read**: GET `/api/Invoice/loadInvoiceOrder/1/<sy_id>`
- **Write**: POST `/api/Invoice/addInvoice` (`detail: __E2E__inv_<ts>`)

### Role 6 (หัวแผนงาน)
- **Read**: GET `/api/Project/load_project/1/<adminId>/0/10/<sy_id>`
- **Write**: skip — role 6 ส่วนใหญ่ approve ไม่ create

### Role 7 (หัวพัสดุ)
- **Read**: GET supplies list
- **Write**: skip — role 7 ส่วนใหญ่ approve

### Role 8 (หัวการเงิน)
- **Read**: GET `/api/Invoice/loadConfirmInvoice/1/<permission>/<sy_id>`
- **Write**: skip — role 8 approve

## Rules

- **ห้าม assume DB มีข้อมูลพร้อม** — ถ้า test ต้องการ prereq (เช่น role 2 ต้องมี invoice รออนุมัติ) ให้ skip + รายงาน "needs setup" ไม่ใช่ fail
- **Cleanup ต้องสำเร็จ** ก่อนจบ — ถ้า cleanup fail แจ้งผู้ใช้พร้อม SQL
- **ห้ามใช้ admin_local** ของ production — สร้าง test_role_X แยก
- **อ้าง CLAUDE.md** ตอน assert (sc_id isolation, del=0 filter, response shape `{ flag, ms }` หรือ `{ data, count }`)
- **ทุก output ภาษาไทย**
- **ห้าม log token** เต็ม — show แค่ 8 ตัวแรก

## ถ้า script ยังไม่มี (ครั้งแรก)

ถ้ายังไม่มี `backend/scripts/seed-test-users.ts` หรือ `backend/scripts/test-users-e2e.ts` → แจ้งผู้ใช้ว่าต้อง create ก่อน (ดู skill นี้เป็นคู่มือรัน, ไม่ใช่ create ไฟล์)

ถ้าผู้ใช้สั่ง create scripts → ใช้ template ที่ documented ใน skill นี้
