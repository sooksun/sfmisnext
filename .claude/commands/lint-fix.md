---
description: รัน ESLint fix ทั้ง backend + frontend และรายงานผลเป็นภาษาไทย
---

รัน ESLint + auto-fix ทั้ง backend และ frontend รายงานผลเป็นภาษาไทย

## ขั้นตอน

รัน 2 คำสั่งนี้ **ขนานกัน**:

```bash
cd backend && npm run lint
```

```bash
cd frontend && npx next lint --fix
```

> หมายเหตุ: `backend/package.json` มี `lint` script (ESLint + --fix ติดไว้แล้ว)
> Frontend ใช้ `next lint --fix` ตรง ๆ (เช็ค `frontend/package.json` ว่ามี `lint` script หรือไม่ ถ้ามีให้ใช้แทน)

## รายงานผล

แสดงตารางสรุป:

| โปรเจกต์ | สถานะ | Fixed | Remaining |
|---|---|---|---|
| Backend | ✅ / ❌ | N | N |
| Frontend | ✅ / ❌ | N | N |

ถ้ามี warning/error ที่ auto-fix ไม่ได้:
- แสดงไฟล์:บรรทัด + ชื่อ rule
- จัดกลุ่มตาม rule
- อธิบายสั้น ๆ ว่าทำไม rule นี้เตือน และแนวทางแก้

ถ้าทั้งหมดผ่าน → "ผ่านทั้ง backend และ frontend ✅"

**สำคัญ**: หลัง auto-fix ให้เช็ค `git diff` ย่อ ๆ ว่ามีไฟล์ไหนถูกแก้บ้าง แจ้งผู้ใช้ (แต่ไม่ commit)
