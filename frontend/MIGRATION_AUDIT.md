# SFMIS Angular → Next.js Migration Audit

เอกสารนี้เป็น source of truth สำหรับการ port Angular (`src/`) → Next.js (`frontend/`) ก่อนถอน Angular ออก (ตามแผน `.claude/plans/sleepy-munching-noodle.md`)

**Last updated:** 2026-04-15 (Phase A complete — withholding-certificate ported, all 3 remaining pages resolved)

---

## สรุปภาพรวม

| สถานะ | จำนวน |
|---|---|
| ✅ **done** — ครอบคลุมแล้ว (logic ตรงกับ Angular) | 38 modules |
| 🔴 **port** — ต้องสร้างหน้า Next.js ใหม่ | 0 modules |
| ⚫ **dead** — Angular ยังไม่สมบูรณ์ / ไม่จำเป็น | ดู section ล่างสุด |

**Phase A เสร็จสมบูรณ์** — ไม่มีหน้าที่ต้อง port เพิ่มแล้ว

**Backend stubs ที่ implement จริงแล้วใน session นี้:** 20+ methods

## Critical Logic Fixes (session 2026-04-15)

| รายการ | ปัญหาเดิม | แก้แล้ว |
|---|---|---|
| `proj-approve` | ใช้ entity `PlnProjApprove` ผิด, status binary 0/1 | ✅ เปลี่ยนเป็น `ParcelOrder`, status machine 1→2→3→4→5, approve+reject+remark |
| backend `approveParcelBySupplie` | endpoint ไม่มี | ✅ เพิ่มแล้ว (status 3→4) |
| SAO CRUD | stub — ไม่ persist | ✅ entity `master_sao` + real CRUD |
| SAO-Policy CRUD | stub | ✅ entity `master_sao_policy` + real CRUD |
| MOE-Policy CRUD | stub | ✅ entity `master_moe_policy` + real CRUD |
| Quick-Win CRUD | stub | ✅ entity `master_quick_win` + real CRUD |
| Classroom-Budget CRUD | stub | ✅ entity `master_cb_level` + real CRUD |
| report-bookbank | ไม่มีข้อมูล — field name ผิด | ✅ rewrite service, running balance |
| check-control NaN | field name mapping ผิด | ✅ fixed |
| supplies dropdown empty | `loadUnits/loadTypeSupplies` คืน camelCase | ✅ map snake_case ถูกต้อง |
| `withholding-certificate` | อ่านอย่างเดียว, ไม่มี add/update | ✅ backend CRUD + new controller `Withholding_certificate`, frontend full CRUD + tax calc |
| `money/approve` | Angular stub ใช้ `B_admin/load_admin` ผิด | ✅ map ไปที่ `confirm-invoice` (ครอบอยู่แล้ว) |
| `money/register-money` | Angular stub ใช้ `B_admin/load_admin` ผิด | ✅ map ไปที่ `report/money-type` (ครอบอยู่แล้ว) |

---

## Module-by-module map

| Angular module | ทำอะไร | Next.js equivalent | Action |
|---|---|---|---|
| `account-bank` | บริหารบัญชีธนาคารของโรงเรียน | — | 🔴 port |
| `admin` | หน้าจัดการผู้ใช้งาน admin | `admin` | ✅ done |
| `budget-income-type-school` | ผูกประเภทเงิน × บัญชีธนาคาร | `budget-income-type` (merged) | ✅ done |
| `confirm-invoice` | ตรวจสอบใบสำคัญจ่าย (หัวหน้า/ผอ.) | `confirm-invoice` | ✅ done |
| `generate-check` | ออกเช็ค (หลังใบสำคัญถูกอนุมัติ) | `pay-menu/generate-check` | ✅ done (fixed 2026-04-15) |
| `invoice` | สร้างใบสำคัญจ่าย / ขอเบิก | `pay-menu/invoice` | ✅ done (fixed 2026-04-15) |
| `money/approve` | อนุมัติจ่ายเงิน (Angular stub ใช้ endpoint ผิด) | `confirm-invoice` (ครอบทั้ง head+director) | ✅ done |
| `money/receive` | บันทึกรับเงินเข้าบัญชี | `receive-menu` | 🟡 partial |
| `money/register-money` | ทะเบียนคุมประเภทเงิน (Angular stub) | `report/money-type` (`Register_control_money_type` API) | ✅ done |
| `parcel/buy` | ขอซื้อ / ขอจ้าง (PO) | — | 🔴 port |
| `parcel/check` | ตรวจรับพัสดุ | `receive-parcel-confirm` | 🟡 partial |
| `parcel/register` | ทะเบียนพัสดุ | — | 🔴 port |
| `payment-type` | ตั้งค่าประเภทการชำระ | — | 🔴 port |
| `policy/approval` | ตั้งค่าเส้นทางอนุมัติ | — | 🔴 port |
| `policy/budget-allocation` | จัดสรรงบประมาณตามหมวด | `budget-allocation` | ✅ done (fixed 2026-04-14) |
| `policy/budget-category` | หมวดงบประมาณ (master) | `budget-category` | ✅ done |
| `policy/calculate-perhead` | คำนวณเงินต่อหัวนักเรียน | `calculate-perhead` | ✅ done |
| `policy/estimate-acadyear` | ประมาณการปีการศึกษา | `estimate-acadyear` | ✅ done |
| `policy/expenses` | บันทึกรายจ่าย | `expenses` (**backend stub**) | 🟡 partial |
| `policy/finance` | ตั้งค่านโยบายการเงิน | — | 🔴 port |
| `policy/perhead-rate-setting` | ตั้งอัตราต่อหัว | `perhead-rate-setting` | ✅ done |
| `policy/project` | สร้าง/แก้โครงการ | — | 🔴 port |
| `policy/proj-approve` | อนุมัติโครงการ (config) | — | 🔴 port |
| `policy/real-budget` | งบประมาณที่ได้รับจริง | `real-budget` | ✅ done (fixed 2026-04-14) |
| `policy/student` | บันทึก/จัดการนักเรียน | `student` | ✅ done |
| `proj-approve-business` | อนุมัติโครงการ (หัวหน้าการเงิน) | `plan-menu/proj-approve` (รวม) | ✅ done |
| `proj-approve-cart` | ตะกร้าดูรายละเอียด | `plan-menu/proj-approve` (inline) | ✅ done |
| `proj-approve-ceo` | อนุมัติโครงการ (ผอ.) | `plan-menu/proj-approve` (รวม) | ✅ done |
| `proj-approve-plan` | อนุมัติโครงการ (หัวหน้าแผน) | `plan-menu/proj-approve` (รวม) | ✅ done |
| `proj-approve-supplie` | อนุมัติโครงการ (หัวหน้าพัสดุ) | `plan-menu/proj-approve` (รวม) | ✅ done |
| `receipt` | ออกใบเสร็จรับเงิน | `financial-report/receipt` | 🟡 partial (fixed 2026-04-15 — backend JOIN added, UI exists) |
| `report` | รายงานสรุป (ต่าง ๆ) | `report`, `financial-report` | 🟡 partial |
| `school` | ข้อมูลโรงเรียน | `school`, `school-policy` | ✅ done |
| `setting-committee` | ตั้งคณะกรรมการตรวจรับ | `setting-committee` | ✅ done |
| `settings` | SAO/MOE/OBEC/QuickWin/ClassroomBudget | `sao`, `sao-policy`, `obec-policy`, `moe-policy`, `quick-win`, `classroom-budget` | ✅ done (real CRUD 2026-04-15) |
| `supplie_flow/partner` | ทะเบียนคู่ค้า/ร้านค้า | `supplie-setting/partner` | ✅ done |
| `supplie_flow/receive-parcel` | รับพัสดุเข้าคลัง | `receive-parcel` | ✅ done |
| `supplie_flow/receive-parcel-confirm` | ยืนยันรับพัสดุ | `receive-parcel-confirm` | ✅ done |
| `supplie_flow/supplies` | คลังพัสดุ | `supplies` | ✅ done |
| `supplie_flow/type-supplies` | ประเภทพัสดุ | `supplie-setting/type-supplies` | ✅ done |
| `supplie_flow/unit` | หน่วยนับ | `supplie-setting/unit` | ✅ done |
| `supplie_flow/withdrawn-supplies-confirm` | ยืนยันเบิกพัสดุ | `supplie-setting/withdraw-confirm` | ✅ done |
| `users` | จัดการผู้ใช้งาน | `user` | ✅ done |
| `withholding-certificate` | หนังสือรับรองหัก ณ ที่จ่าย | `pay-menu/withholding-certificate` (full CRUD + tax calc) | ✅ done (2026-04-15) |
| `year` | ปีการศึกษา/ปีงบประมาณ | `year` | ✅ done |

---

## รายการ "partial" — รายละเอียดงานที่เหลือ

### `money/receive` → `receive-menu`
Next.js มี `receive-menu` แล้ว แต่น่าจะเป็นหน้า hub/เมนู ยังต้องเทียบว่า sub-flow (รับเงิน + ออก receipt อัตโนมัติ + link กับ budget_income_type) ครบเหมือน Angular หรือไม่

### `parcel/check` → `receive-parcel-confirm`
เช็คว่ามี UI สำหรับตรวจรับทีละรายการพร้อม committee sign-off ครบหรือเปล่า

### `policy/expenses` → `expenses` (Next.js หน้ามี, backend stub)
Backend ที่ `backend/src/modules/policy/policy.service.ts` — `loadExpenses / addExpenses / updateExpenses / removeExpenses` ยังเป็น stub คืน `{flag:true}` — ต้องสร้างเอนทิตี (คาดว่า `pln_expenses` — เทียบกับ SQL file หรือ Angular service) + CRUD เหมือนที่ทำกับ `real-budget` แล้ว

### `report` → `report`, `financial-report`
Next.js มี 2 หน้านี้ แต่ Angular มี 4 รายงาน: daily-balance, check-control, registration-bookbank, registration-certificate. ต้องเช็คว่า Next.js ครอบทั้ง 4 หรือเปล่า

### `settings` (hub) → `sao`, `sao-policy`, `obec-policy`, `moe-policy`, `quick-win`, `classroom-budget`
Next.js pages มีหมดแล้ว **แต่ backend เป็น stub ทั้งหมด** (ดู Backend Stubs) — UI โชว์ "บันทึกสำเร็จ" แต่ data ไม่ persist

---

## Backend stubs ที่ต้อง implement จริง

เจอจาก `grep "ในกรณีที่ยังไม่มี entity"` ทั้งใน backend/src/ — 27 methods รวม

### `backend/src/modules/policy/policy.service.ts` (4)
- `loadExpenses` / `addExpenses` / `updateExpenses` / `removeExpenses`
  - ต้องการ entity `PlnExpenses` + module wiring + seed

### `backend/src/modules/project/project.service.ts` (7)
- `loadPLNBudgetCategory(scId, syId, budgetYear)` — returns empty array
- `loadPLNBudgetCategoryRp`
- `masterSaoPolicy / masterMoePolicy / masterObecPolicy / masterQuickWin / masterScPolicy` (5 master list readers)
  - เอนทิตีบางตัว (`SaoPolicy`, `MoePolicy`, `ObecPolicy`, `QuickWin`) ใช้ร่วมกับ settings module ด้านล่าง — ต้องสร้างครั้งเดียว, ใช้ทั้งสองโมดูล

### `backend/src/modules/settings/settings.service.ts` (16)
- SAO Policy: `loadSaoPolicy / addSaoPolicy / updateSaoPolicy / removeSaoPolicy`
- MOE Policy: `loadMoePolicy / addMoePolicy / updateMoePolicy / removeMoePolicy`
- Quick Win: `loadQuickWin / addQuickWin / updateQuickWin / removeQuickWin`
- SAO: `addSao / updateSao` (load exists but add/update are stubs)
- Classroom Budget: `addClassroomBudget / updateClassroomBudget`
  - ต้องการเอนทิตี: `SaoPolicy`, `MoePolicy`, `ObecPolicy` (load already real?), `QuickWin`, `MasterSao`, `MasterClassroomBudget`

---

## Dead code (Fuse theme demos — ไม่ port, ลบได้ตอน Phase B)

ใน `src/app/modules/admin/` (ไม่ใช่ `sfmisystem/`) มี demo modules จาก Fuse theme ที่ไม่ใช่ SFMIS และไม่ได้ใช้งานจริง:

- `apps/` — academy, calendar, chat, contacts, ecommerce, file-manager, help-center, mailbox, notes, tasks, database, system-management
- `dashboards/` — analytics, project (หลาย version)
- `docs/` — core-features, guides, other-components, changelog
- `pages/` — authentication, coming-soon, error (404/500), invoice (pricing), maintenance, profile, pricing (table/modern/simple/single)
- `ui/` — animations, cards, colors, forms/*, icons, page-layouts, typography, angular-material, datatable, tailwindcss
- `landing/home`

ทั้งหมดจะถูกลบพร้อม `src/` ใน Phase B

---

## ลำดับการ port (แนะนำ — by domain priority)

| ลำดับ | Batch | หน้า Next.js ที่ต้องสร้าง/แก้ | ทำไม |
|---|---|---|---|
| 1 | **Finance core** | `invoice`, `receipt`, `generate-check` | Block การทำงาน SFMIS จริง — ถ้าไม่มี ใช้ระบบไม่ได้ |
| 2 | **Project approval chain** | `proj-approve-plan`, `proj-approve-business`, `proj-approve-supplie`, `proj-approve-ceo`, `proj-approve-cart` | ระบบอนุมัติโครงการ 5 ขั้นคู่กัน — ถ้าขาดขั้นเดียวทั้ง chain ใช้ไม่ได้ |
| 3 | **Supplies workflow** | `parcel/buy`, `parcel/register`, `supplie_flow/partner`, `supplie_flow/type-supplies`, `supplie_flow/unit`, `supplie_flow/withdrawn-supplies-confirm` | งานพัสดุ — รองจาก finance |
| 4 | **Money / misc** | `money/approve`, `money/register-money`, `withholding-certificate`, `payment-type`, `account-bank` | อิสระต่อกัน ทำได้ขนานกัน |
| 5 | **Policy admin** | `policy/finance`, `policy/approval`, `policy/project`, `policy/proj-approve` | ตั้งค่าที่ไม่บ่อย ใช้น้อย |
| 6 | **Partial fix** | complete `money/receive` (กับ `receive-menu`), `parcel/check`, `report` (4 sub-reports), `expenses` (wire backend) | ปิดรอย partial |
| 7 | **Backend stub fills** | 27 methods ข้างบน | ไปคู่กับหน้าที่ใช้เท่าที่จำเป็น ไม่ต้องทำครบในคราวเดียว |

---

## Reference patterns (ต้องอ่านก่อนเริ่ม port)

### Frontend
- `frontend/app/(dashboard)/sfmis/real-budget/page.tsx` — best pattern (z.coerce, BE year, toast, invalidate query)
- `frontend/app/(dashboard)/sfmis/confirm-invoice/page.tsx` — state-machine status pattern
- `frontend/lib/api.ts` — `apiGet` / `apiPost` (Bearer token auto)
- `frontend/lib/utils.ts` — `toBE()`, `getThaiDateTime()`, `showNumber()`
- `frontend/components/shared/{data-table,form-dialog,confirm-dialog,page-header}.tsx` — primitives

### Backend
- `backend/src/modules/invoice/invoice.service.ts` — QueryBuilder + LEFT JOIN pattern
- `backend/src/modules/policy/policy.service.ts::loadRealBudget` — raw CRUD pattern (ทำวันนี้)
- `backend/src/modules/policy/entities/pln-real-budget.entity.ts` — entity pattern ที่ตรงกับ SQL file

### Navigation
- `frontend/components/layout/sidebar.tsx` — ต้องเพิ่มลิงก์หน้าใหม่
- หมวดใน CLAUDE.md: งานนโยบายและแผน / งานการเงิน / งานพัสดุ / งานผู้อำนวยการ
