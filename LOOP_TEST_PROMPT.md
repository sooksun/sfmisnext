# LOOP_TEST_PROMPT — เตรียม / ทดสอบ / พัฒนา 3 Module (แผน · พัสดุ · การเงิน)

> วิธีใช้: เปิด backend (`cd backend && npm run start:dev`) แล้วสั่ง
> `/loop ทำงานทดสอบ-แก้-พัฒนา 3 module ตามขั้นตอนใน LOOP_TEST_PROMPT.md`

คุณคือวิศวกรทดสอบระบบ SFMIS รันใน `/loop`. **แต่ละรอบทำให้เสร็จ "1 เมนู" (หรือ 2 เมนูเล็ก)** แล้วหยุดรอรอบถัดไป — ห้ามพยายามทำทุกเมนูในรอบเดียว. ทุกรอบต้อง self-contained: อ่าน state → ทำงาน → อัปเดต state → ตั้งรอบถัดไป.

## กติกาพื้นฐาน (ยึดทุกรอบ)
- **Sandbox เท่านั้น:** ลงข้อมูลที่ `sc_id=2` (โรงเรียน demo) เท่านั้น. ทุก SQL cleanup ต้องมี `WHERE sc_id=2`. **ห้ามแตะ sc_id อื่น**.
- **API จริง:** ยิงผ่าน harness เดิม `backend/testrun/lib.js` (base `http://127.0.0.1:3000/api`, login `admin_local`/`Admin@123`). ตั้ง env: `SFMIS_TEST_SC_ID=2` และ `SY_ID/BUDGET_YEAR_*` ตามที่ตรวจได้จาก `school_year` ของ sc_id=2.
- **ข้อมูลจริงเชิงไทย:** ชื่อโครงการ/ร้านค้า/รายการเป็นภาษาไทยสมจริง, จำนวนเงินสมเหตุผล, วันที่อยู่ในปีงบสนามทดสอบ.
- **เมนูละ 3–5 รายการ** ครอบ happy-path + อย่างน้อย 1 **negative case** (ยิงให้ระบบ block ตาม guard/threshold เช่น เกินวงเงิน, ต่ำกว่าเกณฑ์คณะกรรมการ, จ่ายก่อนตรวจรับ).
- **ยืนยัน 3 ชั้น** ต่อ 1 รายการ: (a) HTTP 200 + `flag:true`/มี id, (b) แถวใน DB (`db()` query) ตรงค่าที่ส่ง, (c) list endpoint คืนรายการนั้น.
- **ขนาดงานต่อรอบ:** จำกัด 1 เมนู เพื่อให้แต่ละ turn จบในตัวและ resume ได้.

## รอบแรกเท่านั้น — BOOTSTRAP
ทำครั้งเดียว (ถ้า `LOOP_TEST_PROGRESS.md` ยังไม่มี):
1. เช็ก backend ที่ :3000 (`GET /api/health`). ถ้าไม่ขึ้น → `cd backend && npm run start:dev` (background) แล้วรอจน health ผ่าน.
2. ตรวจ sandbox: ถ้า `sc_id=2` ยังไม่มี ให้รัน seeder demo ที่มี (`seed-demo-area.ts`). หา `sy_id`/`budget_year` ของ sc_id=2 จากตาราง `school_year` แล้วบันทึกเป็น env ใน progress.
3. สร้าง `backend/testrun/loop/reset-sandbox.sql` (ล้าง transaction ของ sc_id=2 + reset doc counter, **scoped sc_id=2 ทุก statement**) แล้วรันหนึ่งครั้ง.
4. เขียน `LOOP_TEST_PROGRESS.md` จาก **MENU CHECKLIST** ด้านล่าง (ทุกเมนู สถานะ `pending`).
5. เขียนหัว `TEST_REPORT_LOOP_2569.md` (วันที่, sc_id=2, sy_id, budget_year, ผู้ทดสอบ) — mirror ฟอร์แมต `TEST_REPORT_E2E_2569.md`.

## ทุกรอบ — ลำดับงาน
1. อ่าน `LOOP_TEST_PROGRESS.md` → เลือกเมนู `pending` ตัวถัดไป (เรียงตาม checklist; ทำ module ตามลำดับ แผน → พัสดุ → การเงิน เพื่อให้ data ไหลต่อกัน).
2. เปิด controller/DTO ของเมนูนั้น (`backend/src/modules/<m>/*.controller.ts`, `dto/`) เพื่อรู้ฟิลด์ create จริง.
3. เขียน/อัปเดตสคริปต์ `backend/testrun/loop/<module>-<menu>.js` (ใช้ helper จาก `../lib.js`): seed 3–5 รายการ + negative case + ยืนยัน 3 ชั้น + `rec()` ทุกสเต็ป. รันด้วย `node backend/testrun/loop/<...>.js`.
4. อ่านผล:
   - **ผ่านหมด** → mark เมนู `done` ใน progress, append ผลลงรายงาน (ตารางราย module).
   - **เจอ bug/❌** → วินิจฉัย root cause (อ่านโค้ด service/entity/SQL) → **แก้ที่ source** (backend/frontend) → `cd backend && npm run build` (+ `npm run test -- <pattern>` ถ้ามีเทสที่เกี่ยว) → **รันสคริปต์เดิมซ้ำ** จนผ่าน → บันทึกบล็อก 🐞 `[BUG — แก้แล้ว]` (อาการ/สาเหตุ+path/ผลกระทบ/การแก้+ไฟล์/พิสูจน์).
   - **block ไม่ได้ทั้งที่ควร block** (negative case หลุด) → ถือเป็น bug ความถูกต้อง แก้เช่นกัน.
5. เพิ่มหัวข้อ **"ข้อเสนอปรับปรุง"** ของเมนูนั้นในรายงาน (UX, validation ที่ขาด, ความเสี่ยง, ฟิลด์ audit, index) — แม้ผ่านก็ต้องเสนออย่างน้อย 1 ข้อ.
6. อัปเดต `LOOP_TEST_PROGRESS.md` (สถานะ + จำนวน bug ที่แก้ + เวลาโดยประมาณ).
7. ถ้ายังมี `pending` → ตั้งรอบถัดไป (ScheduleWakeup ~60–120s). ถ้า **ไม่เหลือ pending** → เขียนสรุปท้ายรายงาน (คะแนนรวม ผ่าน X/Y, bug ที่แก้, Top improvement) แล้ว **จบ loop (ไม่ต้องตั้งรอบใหม่)**.

## MENU CHECKLIST (เมนู → endpoint create/list หลัก)

### Module 1 — งานนโยบายและแผน (Policy & Plan)
| เมนู | สร้าง | list/verify |
|---|---|---|
| 1.2 เตรียมงบ/นักเรียน (`/sfmis/student`) | `Student/checkClassOnYear` → `Student/addStudent` | `Student/loadStudent/:sy/:by/:sc/0/50` |
| 1.4 ตั้งค่าเงินรายหัว | `Student/setPerheadRate` | `Student/loadCalculatePerhead/:sc/:year` |
| 1.6/1.7 งบรายปี + วงเงิน | `Budget/addEstimateAcadyear`, `Budget/addPLNBudgetCategory` | `Budget/loadEstimateAcadyearGroup/...`, `Budget/loadPLNBudgetCategory/...` |
| 1.8 โครงการ | `Project/addProject` | `Project/load_project/:sc/:user/0/50/:sy` |
| 1.8 อนุมัติโครงการ | `Project_approve/addProjectApprove` → approve* | `Project_approve/loadProjectApprove/:sc/:sy` |
| 1.8 แผนจัดซื้อ | `Procurement_plan/addPlan` + `addPlanItem` | `Procurement_plan/loadPlan/:sc/:acad_year` |

### Module 2 — งานพัสดุ (Procurement)
| เมนู | สร้าง | list/verify |
|---|---|---|
| 2.1 คณะกรรมการ | (committee endpoint ของ supplie/setting) | load committee |
| 2.2 คำขอจัดซื้อ | `Project_approve/addParcelDetail` / supplie request | `Supplie/loadSupplieOrder/:sc/:year` |
| 2.3 รับ–ตรวจรับพัสดุ | `Supplie/editReceiveParcel` → `Supplie/confirmWithDrawParcel` | `Supplie/loadReceive/:sc/:sy`, `Supplie/loadStockSupplie` |
| 2.4 สัญญา/หลักประกัน | contract + `contract-security` | load contract |
| 2.7 เบิกพัสดุ/ใบเบิก | requisition/withdraw | stock balance |

### Module 3 — งานการเงิน (Finance)
| เมนู | สร้าง | list/verify |
|---|---|---|
| 3.2 รับเงิน | `Receive/addReceive` | `Receive/loadReceive/:sc/:sy/:by` |
| 3.1/3.2 ใบเสร็จ | `Receipt/addReceipt` | `Receipt/loadReceipt/:sc/:y/:year` |
| 3.3 จ่ายเงิน/ใบสำคัญ | `Invoice/addInvoice` → `Invoice/ConfirmInvoice` | `Invoice/loadInvoiceOrder/:sc/:y`, `loadConfirmInvoice` |
| 3.3 สร้างเช็ค | `Check/updateCheck` (+`saveCommittee`) | `Check/loadCheck/:sc/:sy` |
| 3.4 เงินยืม | loan-agreement create → workflow | load loan |
| 3.6 รายได้แผ่นดิน | `GovRevenue/addEntry` | `GovRevenue/loadEntries/...`, `monthlySummary` |
| 3.6 เงินฝาก/สมุดคู่ฝาก | smp-deposit / `BankLedger/addEntry` | `BankLedger/loadLedger/:sc/:sy/:ba` |
| 3.7 เงินคงเหลือประจำวัน | (auto จาก txn) | `daily-balance` report = 0 diff |
| 3.8 รายงานประจำเดือน | monthly-submission | load monthly |

> เมนูซ่อน/รายงาน (4.x) ทดสอบเป็น read-only verify หลังจาก txn ครบ (bank-ledger, check-control, bookbank, unified-register, money-type) — ลงท้าย checklist.

## NEGATIVE CASES บังคับ (ต้องถูก block)
- **G1** สั่งซื้อรวมเกิน `proj_budget` → 400.
- **G3** ตั้งเบิก (`Invoice/addInvoice`) ก่อนตรวจรับ/stock-post → 400.
- **Threshold** ออเดอร์เกิน `procurement.inspector_single_max` (100k) โดยไม่มีกรรมการ ≥3 / เกิน committee threshold → ต้องบังคับกรรมการ.
- **WHT** invoice ≥ 10,000 หมวดบริการ → ต้องมีหัก ณ ที่จ่ายอัตโนมัติ.
- **Overspend** จ่ายเกินยอดคงเหลือกองทุน (`finance.block_overspend`) → 400.

อ้างอิงกฎ: `backend/src/modules/cross-domain-guard/` (G1–G4) และ `backend/src/modules/regulatory-config/regulatory-config.defaults.ts` (thresholds).

## ฟอร์แมตรายงาน (mirror `TEST_REPORT_E2E_2569.md`)
ต่อ module = ตาราง `ขั้นตอน | endpoint | #records | ผล(✅/⚠️) | หมายเหตุ`.
Bug = บล็อก `[BUG — แก้แล้ว]` / `[จุดเสี่ยง]` + อาการ / สาเหตุ(path) / ผลกระทบ / การแก้(ไฟล์) / พิสูจน์.
ปิดท้ายแต่ละเมนูด้วย **ข้อเสนอปรับปรุง** อย่างน้อย 1 ข้อ.

## ENV สำหรับรันสคริปต์ (ตัวอย่าง)
```bash
# PowerShell
$env:SFMIS_TEST_SC_ID=2
$env:SFMIS_TEST_SY_ID=<sy_id ของ sc_id=2>
$env:SFMIS_TEST_BUDGET_YEAR_CE=2026
$env:SFMIS_TEST_BUDGET_YEAR_BE=2569
$env:SFMIS_TEST_UP_BY=<admin_id ของ sandbox>
node backend/testrun/loop/<module>-<menu>.js
```
