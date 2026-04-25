ทดสอบระบบ SFMIS ทั้ง Frontend (Next.js) และ Backend (NestJS) แล้วรายงานผลเป็นภาษาไทย

ดำเนินการตามลำดับต่อไปนี้:

## 1. ตรวจสอบ TypeScript — Frontend (Next.js)

```bash
cd frontend && npx tsc --noEmit 2>&1
```

รายงาน:
- จำนวน type error ที่พบ
- ไฟล์และบรรทัดที่มีปัญหา (ถ้ามี)

## 2. ตรวจสอบ TypeScript — Backend (NestJS)

```bash
cd backend && npx tsc --noEmit 2>&1
```

รายงาน:
- จำนวน type error ที่พบ
- ไฟล์และบรรทัดที่มีปัญหา (ถ้ามี)

## 3. รัน Unit Tests — Backend

```bash
cd backend && npm run test -- --passWithNoTests 2>&1
```

รายงาน:
- จำนวน test ที่ผ่าน / ไม่ผ่าน / ข้าม
- ชื่อ test ที่ล้มเหลว (ถ้ามี)

## 4. ตรวจสอบ Build — Backend

```bash
cd backend && npm run build 2>&1
```

รายงาน:
- build สำเร็จหรือล้มเหลว
- error ที่พบ (ถ้ามี)

## 5. ตรวจสอบ Build — Frontend (Next.js)

```bash
cd frontend && npm run build 2>&1
```

รายงาน:
- build สำเร็จหรือล้มเหลว
- หน้าที่ build ได้ / ไม่ได้
- error ที่พบ (ถ้ามี)

---

## สรุปผลการทดสอบ

สรุปผลรวมในรูปแบบตารางแบบนี้:

| รายการทดสอบ | ผลลัพธ์ | หมายเหตุ |
|---|---|---|
| TypeScript Frontend | ✅ / ❌ | - |
| TypeScript Backend | ✅ / ❌ | - |
| Unit Tests Backend | ✅ / ❌ | x passed, y failed |
| Build Backend | ✅ / ❌ | - |
| Build Frontend | ✅ / ❌ | - |

หากพบ error ให้แสดงรายละเอียดและแนะนำวิธีแก้ไขเป็นภาษาไทย
