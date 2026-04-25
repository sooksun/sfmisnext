---
description: Debug ปัญหาเชิงลึก — สมมติฐาน, จุดที่ควร log, fix plan
argument-hint: [bug description / context]
---

ทำหน้าที่ Senior Debugger — วิเคราะห์ปัญหาที่ซับซ้อน หา root cause แบบเป็นระบบ

## Input

- `$ARGUMENTS` = คำอธิบายปัญหา + สิ่งที่ลองแล้ว
- ถ้าไม่มี → ถาม:
  1. อาการที่เห็น (symptom)
  2. Reproduce ได้ไหม / step
  3. ปรากฏใน env ไหน (dev / staging / production)
  4. เริ่มเกิดเมื่อไหร่ (relate กับ deploy / config change ไหม)
  5. ลองอะไรไปแล้ว

## ขั้นตอน

แนวทาง: **Hypothesis-driven debugging** ไม่ใช่ random poking

1. **เก็บข้อมูล** — อ่าน code, log, config, recent commits
2. **สร้างสมมติฐาน** — 3-5 สมมติฐาน เรียงตามความเป็นไปได้
3. **ออกแบบการตรวจ** — แต่ละ hypothesis verify อย่างไร (logging / breakpoint / ทดลอง)
4. **เสนอ fix plan** — แต่ปลอดภัยก่อน เน้น **ไม่ทำให้ regress**

## Output Format (ภาษาไทย)

### 1. สรุปปัญหา
- 1-2 ประโยคชัดเจนว่าอาการคืออะไร, scope ที่ได้รับผลกระทบ

### 2. สมมติฐานที่เป็นไปได้

| # | Hypothesis | Likelihood | หลักฐานที่สนับสนุน | หลักฐานที่ขัด |
|---|---|---|---|---|
| 1 | Token expire ก่อนเวลา | สูง | refresh fail บ่อย | session 8h ปกติ |
| 2 | Race condition ใน Zustand persist | กลาง | reproduce หลัง refresh | ไม่เกิดทุกครั้ง |
| 3 | NextAuth + Webpack mismatch | ต่ำ | dev mode (Webpack) | prod ก็เกิด |

### 3. วิธีไล่ตรวจทีละขั้น

สำหรับแต่ละ hypothesis (เริ่มจากความน่าจะเป็นสูงก่อน):

**Hypothesis 1**: ...
- ตรวจที่: `frontend/auth.ts:XX`, `lib/auth-token.ts`
- คำสั่งทดสอบ:
  ```ts
  console.log('[debug] token expiry', decoded.exp - Date.now()/1000)
  ```
- คาดหวัง: `exp` > 0 — ถ้าติดลบ → token expire → confirm hypothesis
- ถ้าผ่าน → ไปข้อ 2

### 4. จุดที่ควรใส่ Logging เพิ่ม

ระบุชัด file:line:
- `lib/api.ts:42` — log status code + retry attempt
- `frontend/auth.ts:55` — log session refresh result
- ใน NestJS service — `Logger.debug('payload before save', dto)`

หลัง debug เสร็จ **อย่าลืมเอา log ออก** หรือ guard ด้วย `NODE_ENV !== 'production'`

### 5. Config ที่อาจผิด

ตรวจในลำดับนี้:
- [ ] `backend/.env` vs `backend/env.example` — env ใหม่/เก่ามีครบ
- [ ] `NEXTAUTH_URL` ตรงกับ frontend URL จริง
- [ ] `JWT_SECRET` ตรงกันระหว่าง backend และ frontend
- [ ] `CORS_ORIGIN` ครอบ frontend domain
- [ ] `NEXT_PUBLIC_API_URL` มี trailing `/`

### 6. Code Area ที่น่าสงสัย

ระบุ file:line ที่เป็น hotspot:
- พร้อม code snippet 5-10 บรรทัด
- ระบุว่าทำไมสงสัย

### 7. Fix Plan ที่ปลอดภัย

**Plan A** (แนะนำ — น้อย impact):
- ขั้นตอน + คำสั่งที่ต้องรัน
- Side effect ที่อาจเกิด
- Rollback ทำยังไง

**Plan B** (ถ้า A ไม่ได้):
- ...

### 8. Test ที่ควรเขียนหลังแก้
- Regression test กันปัญหากลับมา
- Edge case ที่ค้นพบระหว่าง debug

## Rules

- **เริ่มจาก hypothesis ที่น่าจะเป็นที่สุด** ไม่ใช่จากที่แก้ง่ายสุด
- **ตรวจ recent commits** ก่อนสมมติว่าเป็น bug เก่า (`git log --since="2 days ago"`)
- **อย่าโทษ infra เร็วเกินไป** — bug มักอยู่ใน code ใหม่
- **เก็บ evidence** ที่ verify แต่ละ hypothesis
- **ห้ามแก้ใน production โดยตรง** — fix ใน dev → test → deploy
- ใช้ `/log-analyzer` ก่อนถ้ามี log raw — ตัวนี้รับ context มาแล้ว
