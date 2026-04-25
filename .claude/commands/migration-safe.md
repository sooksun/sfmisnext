---
description: ตรวจ TypeORM schema change ในมุม production safety (risk, rollback, backfill)
argument-hint: [brief description of schema change]
---

ทำหน้าที่ Database Safety Reviewer — ตรวจ schema change ก่อนลง production

## Input

- `$ARGUMENTS` = คำอธิบายการเปลี่ยน schema (ถ้าไม่มีให้ถาม)
- หรือตรวจจาก migration file ที่เพิ่งสร้างใน `backend/src/migrations/`

## Context (SFMIS)

- **Dev**: `synchronize: true` — entity เปลี่ยน → ตาราง auto-alter
- **Production**: `synchronize: false` — ต้องใช้ migration
- **Database**: MySQL 8
- **Existing migrations**: `backend/src/migrations/<timestamp>-<Name>.ts`
- **Data-source**: `backend/src/data-source.ts`

## ขั้นตอน

1. **ระบุการเปลี่ยนแปลง** — อ่าน migration file (ถ้ามี) + diff ของ entity ใหม่/เก่า
2. **ประเมิน 8 มุม** (ด้านล่าง)
3. **สรุปคำแนะนำ** พร้อม severity (🔴 critical, 🟡 caution, 🟢 safe)

## Output Format (ภาษาไทย)

### 1. วิเคราะห์ผลกระทบ
- ตาราง/คอลัมน์ที่เพิ่ม/ลบ/แก้ type
- ขนาด table ปัจจุบันมีเยอะแค่ไหน (แจ้ง risk ถ้า > 1M rows)

### 2. Migration Risks
| Risk | Severity | เหตุผล |
|---|---|---|
| Lock table ระหว่าง ALTER | 🔴/🟡/🟢 | ... |
| Default value บน NOT NULL column | ... | ... |
| Index creation cost | ... | ... |
| FK constraint ต่อตารางใหญ่ | ... | ... |

### 3. Data Loss Risk
- DROP column → ข้อมูลหาย
- Change type (INT → VARCHAR) → ข้อมูลอาจสูญรูปแบบ
- Reduce length → truncation

### 4. Backward Compatibility
- ตรวจกับ Angular frontend (`src/`) — ยังอ่าน field เดิมอยู่ไหม
- ตรวจกับ Next.js frontend (`frontend/`) — types.ts มีอ้างอิงไหม
- API contract เก่าจะ break หรือไม่

### 5. Rollout Plan
- ลำดับการ deploy:
  1. Deploy backend ที่รองรับทั้งเก่า+ใหม่ (expand phase)
  2. Run migration
  3. Deploy frontend ใหม่
  4. Remove compatibility code (contract phase) — PR แยก
- ถ้าเปลี่ยนแบบ breaking → ต้องมี downtime หรือ zero-downtime strategy

### 6. Rollback Plan
- Migration `down()` ทำอะไร — อธิบาย SQL
- Rollback ได้แบบ data loss หรือไม่
- ถ้า revert ไม่ได้ — ต้อง backup ก่อน

### 7. คำแนะนำก่อนรัน Migration บน Production
- [ ] Backup database (mysqldump)
- [ ] รัน migration บน staging ก่อน
- [ ] ตรวจ query plan ของตารางที่ได้รับผลกระทบ
- [ ] Monitor disk space (สำหรับ index creation)
- [ ] Schedule นอก peak traffic ถ้า lock ตารางใหญ่
- [ ] แจ้งทีม stakeholder

### 8. Checklist หลัง Deploy
- [ ] Smoke test endpoint ที่เกี่ยวข้อง
- [ ] ตรวจ log 15 นาทีแรก
- [ ] ตรวจ query latency ของตารางใหญ่
- [ ] Verify index ใหม่ถูกใช้จริง (EXPLAIN)
- [ ] Sync schema dump → `sfmisystem_db/`

## Severity Tag

- 🔴 **Critical** — ห้าม deploy ถ้าไม่มี backup + rollback plan
- 🟡 **Caution** — ต้องมีคนเฝ้า + monitor หลัง deploy
- 🟢 **Safe** — additive change, ไม่มี data loss risk

## Rules

- **เตือนเรื่อง data loss ทุกครั้ง** ถ้ามี DROP หรือ change type
- **ถามถ้าไม่ชัดเจน** ว่าข้อมูลมีเยอะแค่ไหน
- **ไม่รัน migration เอง** — แค่วิเคราะห์และแนะนำ
- ถ้าต้องรันจริง แนะนำให้ใช้ `/db-migrate run` (ซึ่งจะ ask confirm)
