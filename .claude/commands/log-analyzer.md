---
description: วิเคราะห์ log หา timeline, root cause, next steps
argument-hint: [log file path | paste logs]
---

ทำหน้าที่ Log Analyzer — อ่าน log หา root cause + timeline

## Input

- `$ARGUMENTS` = path ของ log file หรือผู้ใช้ paste log มาในข้อความ
- ถ้าไม่มี → ถามว่า log อยู่ที่ไหน (Sentry / file / docker logs / browser console)

## Sources ที่ SFMIS มี

- **Backend**: NestJS Logger (stdout) → `docker logs <backend-container>`
- **Frontend**: Browser console + Sentry (ถ้าตั้ง)
- **Sentry**: `SENTRY_DSN` env — ส่ง error events
- **MySQL**: error log ของ MySQL container
- **CI**: GitHub Actions logs

## ขั้นตอน

1. **รับ input** — file path หรือ paste
2. **อ่าน log + จัดเรียงตามเวลา**
3. **หา 3 อย่าง**: trigger event, first error, cascade
4. **แยก symptom vs cause**
5. **แนะ next debugging steps**

## Output Format (ภาษาไทย)

### 1. Timeline ของเหตุการณ์
| Time | Component | Event | Severity |
|---|---|---|---|
| 10:23:45 | Backend | DB connection lost | 🔴 |
| 10:23:46 | Backend | Health check fail | 🔴 |
| 10:23:50 | Frontend | 502 errors spike | 🟡 (cascade) |

### 2. จุดเริ่ม Error
- ระบุชัด: file/line + timestamp + first occurrence
- ตัวอย่าง:
  ```
  [10:23:45] [ERROR] [TypeORM] connect ETIMEDOUT 10.0.0.5:3306
  ```

### 3. Root Cause (สมมติฐาน)
- 1-3 สมมติฐาน เรียงตามความน่าจะเป็น
- พร้อมหลักฐานใน log ที่สนับสนุน

### 4. Symptom vs Cause
- **Symptoms** (ที่ user/monitor เห็น): 502, slow response, infinite spinner
- **Cause** (ของจริง): network partition, OOM, deadlock, ...
- เตือน: อย่าแก้ symptom ถ้ายังไม่รู้ cause

### 5. Next Debugging Steps
- [ ] Action 1 (เช่น "เช็ค `docker stats` ของ MySQL container")
- [ ] Action 2 (เช่น "อ่าน slow query log")
- [ ] Action 3 (เช่น "ใช้ `/debug-deep` กับ context นี้")

### 6. การป้องกันในอนาคต
- เพิ่ม alert (เช่น Sentry rule)
- เพิ่ม health check coverage
- Refactor / circuit breaker
- Doc / runbook update

## Patterns ที่เจอบ่อยใน SFMIS

| Pattern | สาเหตุที่พบบ่อย |
|---|---|
| `JsonWebTokenError: jwt malformed` | token expire / front-end ส่ง token ผิด format |
| `EntityNotFoundError` + soft delete | filter `del: 0` ไม่ครอบ / record ถูก soft delete แล้ว |
| `QueryFailedError: Duplicate entry` | unique constraint ชน — ตรวจ `sc_id + xxx_year` |
| `401 → retry → 401 → signOut` (frontend) | token รีเฟรชไม่สำเร็จ — check NextAuth `access_token` ใน JWT |
| MySQL `Lock wait timeout` | long transaction หรือ deadlock |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL service ยังไม่ up (compose timing) |
| Sentry: `Hydration failed` | server/client component mismatch ใน Next.js |

## Rules

- **อย่าเดา root cause** ถ้า evidence ไม่พอ — แสดง "ยังไม่พอ ต้องเก็บข้อมูลเพิ่ม"
- **อย่าด่วนสรุป** ที่ first ERROR — บางครั้ง error แรกเป็น cascade
- **เก็บ evidence** จาก log เป็น excerpt ในรายงาน (ไม่ต้องยาว)
- **ถ้าจะเปลี่ยน code/config ต้อง confirm** — สำหรับ live system
