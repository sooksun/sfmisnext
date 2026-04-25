---
description: รัน tsc --noEmit ทั้ง backend + frontend และรายงานผลเป็นภาษาไทย
---

ตรวจ TypeScript ทั้ง 2 โปรเจกต์ขนานกัน รายงานผลเป็นภาษาไทย

## ขั้นตอน

รัน 2 คำสั่งนี้ **ขนานกัน** (parallel):

```bash
cd backend && npx tsc --noEmit
```

```bash
cd frontend && npx tsc --noEmit
```

## รายงานผล

แสดงตารางสรุปแบบนี้:

| โปรเจกต์ | ผลลัพธ์ | จำนวน error |
|---|---|---|
| Backend (NestJS) | ✅ / ❌ | N |
| Frontend (Next.js) | ✅ / ❌ | N |

ถ้ามี error:
- แสดงไฟล์:บรรทัด ของ error แรก ๆ (สูงสุด 10 รายการ)
- จัดกลุ่มตามไฟล์เพื่ออ่านง่าย
- ถ้า error ซ้ำ pattern เดียวกัน อธิบายสาเหตุเป็นภาษาไทยและแนะแนวทางแก้

ถ้าผ่านทั้งคู่ → ตอบสั้น ๆ ว่า "ผ่านทั้ง backend และ frontend ✅"

**อย่าแก้ code เอง** เว้นแต่ผู้ใช้สั่ง — แค่ report
