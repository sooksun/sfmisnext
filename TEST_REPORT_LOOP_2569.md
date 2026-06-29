# รายงานการทดสอบ-แก้-พัฒนา 3 Module (Loop) — ปีงบ 2569

- **วันที่ทดสอบ:** 29 มิ.ย. 2569
- **โรงเรียน (sandbox):** `sc_id=2` โรงเรียนบ้านเดโมวิทยา
- **ปีการศึกษา/งบ:** `sy_id=4` (ภาค 1/2569) · budget_year BE 2569 / API CE 2026
- **ผู้ทดสอบ:** admin_local (type=1)
- **วิธี:** ยิง API จริงผ่าน `backend/testrun/loop/*.js` (harness `lib.js`) — happy-path 3–5 รายการ/เมนู + negative case + ยืนยัน 3 ชั้น (HTTP / DB / list)
- **โหมด:** เจอ bug → แก้ที่ source → build → รันซ้ำจนผ่าน

> ขอบเขตความปลอดภัย: ทุกการเขียนข้อมูลและ cleanup จำกัดที่ `sc_id=2` เท่านั้น

---

## สรุปผลรวม (อัปเดตทุกรอบ)

| Module | เมนูทดสอบ | ผ่าน | bug พบ | bug แก้แล้ว |
|---|---|---|---|---|
| 1 — นโยบายและแผน | 1/6 | 8/8 เคส | 0 | 0 |
| 2 — พัสดุ | 0/4 | - | - | - |
| 3 — การเงิน | 0/9 | - | - | - |

---

## Bootstrap

| ขั้นตอน | ผล | หมายเหตุ |
|---|---|---|
| backend health | ✅ | DB up |
| seed sandbox sc_id=2 | ✅ | reset-sample.ts (SEED_TRUNCATE=0) — school_year sy_id 3,4; ข้อมูลครบ แผน→พัสดุ→การเงิน; ไม่กระทบ sc_id อื่น |
| sanity API (login + list) | ✅ | sy_id=3: Student 9 / Receive 15 / Project 8 แถว (sy_id=4 มีแค่ students/budget — transaction หลักอยู่ sy_id=3) |

---

## [Module 1] P1 — 1.2 เตรียมงบ/นักเรียน  ✅ 8/8

สคริปต์: `backend/testrun/loop/plan-student.js` · บักเก็ตทดสอบ: budget_year 2027 (insert) / 2028 (auto-init) — แยกจากข้อมูล seed 2026

| ขั้นตอน | endpoint | #records | ผล | หมายเหตุ |
|---|---|---|---|---|
| โหลดชั้นเรียน | `Student/loadClassroom` | 18 ชั้น | ✅ | ใช้ 5 ชั้นแรกทดสอบ |
| เพิ่มนักเรียน (happy) | `Student/addStudent` | 5 | ✅ | flag:true ครบ 5/5 (รวม 57 คน) |
| ยืนยัน DB | `tb_student` | 5 | ✅ | rows=5, sum=57 ตรง |
| ยืนยัน list | `Student/loadStudent` | 5 | ✅ | data=5, total=57, edit=true |
| กันซ้ำ (neg) | `Student/addStudent` ซ้ำ class | 1 | ✅ | flag:false "ข้อมูล...มีอยู่แล้ว" |
| validation (neg) | `Student/addStudent` st_count=-5 | 1 | ✅ | HTTP 400 (@Min(0)) |
| แก้ไขจำนวน | `Student/updateStudent` | 1 | ✅ | flag:true, DB st_count=20 ตรง |
| auto-init ปีว่าง | `Student/checkClassOnYear` | 18 | ✅ | สร้างครบ 18 ชั้น |

🐞 ไม่พบ bug

### ข้อเสนอปรับปรุง
- **P1-S1 (ความถูกต้องเชิงธุรกิจ):** `checkClassOnYear` และ `addStudent` ไม่ตรวจว่า `class_id` อยู่ในช่วงชั้นที่โรงเรียนเปิดสอนจริง (โรงเรียนนี้ อ.1–ป.6 แต่ auto-init สร้างครบ 18 ชั้นรวม ม.1–ม.6) → ควร join `setSchoolClassrooms`/`loadSchoolClassrooms` (is_open=1) เพื่อ init เฉพาะชั้นที่เปิด ลดแถวขยะและตัวเลขรายหัวที่ผิด
- **P1-S2 (UX):** `addStudent` คืน `flag:false` ทั้งกรณี "ซ้ำ" และ "error" ปนกัน — ควรแยก code/HTTP (เช่น 409 ซ้ำ) เพื่อให้ frontend แสดงข้อความต่างกันได้

<!-- รอบถัดไป append ใต้บรรทัดนี้ -->

