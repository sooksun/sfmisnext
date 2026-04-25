---
description: จัดการ TypeORM migration — generate, run, revert, status
argument-hint: <generate|run|revert|status|show> [migration-name]
---

จัดการ TypeORM migration สำหรับ backend (MySQL)

## ⚠️ กฎเหล็ก

- **ห้ามรัน `migration:run` บน production โดยไม่ได้รับอนุญาต** — ถ้าตรวจเจอ `NODE_ENV=production` ให้หยุดและถามก่อน
- **ห้าม revert โดยไม่ได้รับอนุญาต** — การ revert อาจทำให้ข้อมูลหาย ให้อธิบายผลกระทบและขอ confirmation ก่อนทุกครั้ง
- **ห้ามแก้ migration ที่รันไปแล้ว** (committed ใน migrations history) — ให้สร้าง migration ใหม่แทน
- `synchronize: true` ใน dev — การเปลี่ยน entity ทำให้ตาราง auto-alter; ก่อน merge ต้องสร้าง migration เสมอ
- Migration ชื่อตาม pattern: `<timestamp>-<PascalCaseName>.ts` อยู่ใน `backend/src/migrations/`

## Actions

### `generate <Name>`
สร้าง migration อัตโนมัติจาก diff ระหว่าง entity ปัจจุบันกับ DB:

```bash
cd backend && npm run migration:generate -- src/migrations/<Name>
```

หลังสร้าง:
1. อ่านไฟล์ใหม่ล่าสุดใน `backend/src/migrations/`
2. แสดงสรุป up/down SQL ให้ผู้ใช้ตรวจทาน:
   - ตาราง/คอลัมน์ที่เพิ่ม/ลบ/แก้
   - index, foreign key, default values
3. เตือนถ้ามีการเปลี่ยนที่อาจทำให้ข้อมูลหาย (drop column, change type)

ถ้าไม่มี argument ชื่อ — ถามผู้ใช้ว่าจะตั้งชื่อว่าอะไร (PascalCase บอก action + object เช่น `AddLoanColumnsToRequestWithdraw`)

### `run`
รัน migration ที่ยัง pending:

```bash
cd backend && npm run migration:run
```

ก่อนรัน:
1. เช็ค `backend/.env` — อ่าน `DB_NAME`, `NODE_ENV`
2. ถ้า `NODE_ENV=production` → หยุดและขอ confirmation explicit
3. เช็คว่ามี migration pending กี่ตัว แสดงรายชื่อ
4. ขอให้ผู้ใช้ confirm ก่อนรัน

หลังรัน:
- แสดงว่ารัน migration ใดไปบ้าง
- แนะนำให้ test smoke test หลังรัน

### `revert`
ย้อน migration ล่าสุด 1 ตัว:

```bash
cd backend && npm run migration:revert
```

**ก่อนรัน**:
1. แสดง migration ล่าสุดที่จะถูก revert (ชื่อไฟล์)
2. อ่าน method `down()` แล้วอธิบายเป็นภาษาไทยว่าจะเกิดอะไรขึ้น
3. เตือนว่าข้อมูลในคอลัมน์/ตารางที่ถูก drop จะหาย
4. **รอ confirmation** "ยืนยัน revert" ก่อนรัน

### `status` / `show`
แสดง migration ที่รันแล้วและ pending:

```bash
cd backend && npx typeorm-ts-node-commonjs migration:show -d src/data-source.ts
```

แสดงตาราง:
| ลำดับ | ชื่อ migration | สถานะ |
|---|---|---|
| 1 | ... | ✅ executed / ⏳ pending |

## ถ้าไม่มี argument

ถามผู้ใช้ว่าต้องการทำอะไร:
1. `generate` — สร้าง migration ใหม่จาก diff
2. `run` — รัน migration ที่ pending
3. `revert` — ย้อน migration ล่าสุด
4. `status` — ดูสถานะ migration

## หมายเหตุ

- Migration มี `up()` + `down()` — TypeORM generate มาให้ครบ แต่ควรอ่านตรวจก่อน `run`
- ถ้า generate ได้ migration ว่าง (ไม่มี diff) แปลว่า entity กับ DB ตรงกันแล้ว
- Data-source: `backend/src/data-source.ts` อ่าน env จาก `.env` ใน `backend/`

รายงานผลเป็นภาษาไทย
