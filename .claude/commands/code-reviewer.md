---
description: Review code ในระดับ production — correctness, security, maintainability, SFMIS anti-patterns
argument-hint: [branch | file | diff range] — default: unstaged+staged
---

ทำหน้าที่ Senior Code Reviewer — ตรวจ code อย่างละเอียดก่อน merge

## ⚠️ หมายเหตุ

- มี built-in `/review` (general PR review) และ `/security-review` (security focus) อยู่แล้ว
- `/code-reviewer` ตัวนี้ **เจาะจง SFMIS** — เน้น pattern, convention, และ anti-pattern ที่เจอบ่อยในโปรเจกต์นี้

## Input

- `$ARGUMENTS` — branch name / file path / หรือเว้นว่าง = review diff ปัจจุบัน
- ถ้าเว้นว่าง: `git diff` (unstaged + staged) + ไฟล์ใหม่

## ขั้นตอน

1. **รวบรวม diff**:
   ```bash
   git status
   git diff
   git diff --stat
   ```
2. **อ่าน context**: `CLAUDE.md`, related modules ที่เปลี่ยน
3. **Review ตาม 10 มิติ** (ด้านล่าง)
4. **รายงานผลแบบจัดกลุ่ม severity**

## 10 มิติที่ต้องตรวจ

### 1. Correctness
- Logic ตรงกับ intent ไหม
- Off-by-one, null pointer, async race

### 2. Maintainability
- ชื่อตัวแปร/ฟังก์ชันสื่อความ
- ฟังก์ชันไม่ยาวเกิน ~50 บรรทัด
- ไม่ทำ abstraction ก่อนเห็น pattern ซ้ำ 3 ครั้ง

### 3. Security (SFMIS-specific)
- **Password**: return field `password`, `password_default` มาในระดับ API? → 🔴 critical
- **Input**: DTO มี `class-validator` ครบหรือยัง
- **SQL injection**: ใช้ parameterized query ของ TypeORM (ไม่ใช่ string concat)
- **Auth**: endpoint มี `@Public()` ที่ไม่ควรเปิดหรือเปล่า
- **Role**: `@Roles()` ถูกต้องไหม
- **Rate limit**: endpoint ที่เสี่ยง (login) มี throttler?

### 4. Performance
- N+1 ใน TypeORM relation (ใช้ `relations:` vs `createQueryBuilder`)
- Missing index สำหรับ query ใหม่
- pageSize ไม่จำกัด (ต้องผ่าน PageSizePipe)
- Frontend: ไม่ useMemo/useCallback ตรงที่ re-render บ่อย

### 5. Readability
- Comment: มี WHY (เจตนา) ไม่ใช่ WHAT (code บอกได้เอง)
- อย่า comment อธิบาย business rule ที่ควรอยู่ใน doc

### 6. Anti-pattern (SFMIS-specific)
- 🔴 ใช้ `z.coerce.number()` กับ `zodResolver`
- 🔴 ThaiDatePicker ใช้ `{...register('field')}` แทน controlled pattern
- 🔴 Select ใช้ `register` แทน `setValue`
- 🔴 ลืม filter `del: 0` ใน query
- 🔴 ลืม filter `sc_id` → cross-tenant leak
- 🟡 สับสน `sy_id` vs `budget_year` (อ่าน CLAUDE.md: `parcel_order.acad_year` = budget_year)
- 🟡 สับสน `Project` vs `ProjectApprove` module
- 🟡 localStorage เก็บ token (ต้องใช้ in-memory + sessionStorage)
- 🟡 return response shape ผิด (list ต้อง `{ data, count, page, pageSize }`, CUD ต้อง `{ flag, ms }`)

### 7. Missing Validation
- DTO decorator ครบ
- Zod schema ครอบทุก field
- Boundary check (min/max)

### 8. Missing Error Handling
- Mutation success check `res.flag`
- Toast error on API failure
- Service ที่ DB fail → return `{ flag: false, ms: '...' }`

### 9. Coupling / Cohesion
- Service เรียก Service อื่นโดยตรงหรือ inject?
- Module export service ที่ควร private?

### 10. Production Risks
- Migration กำลังจะรันโดยไม่มี backfill
- Breaking change กับ Angular frontend
- env variable ใหม่ไม่ได้ใส่ใน `env.example`
- Log ใหม่อาจ leak PII

## Output (ภาษาไทย)

### Critical Issues 🔴 (block merge)
- [file:line] ปัญหา → แนวทางแก้

### Medium Issues 🟡 (ควรแก้แต่ไม่ block)
- [file:line] ปัญหา → แนวทางแก้

### Minor Issues 🟢 (nitpick)
- [file:line] ปัญหา → แนวทางแก้

### Suggested Refactor
- ข้อเสนอ refactor (optional) พร้อมเหตุผล

### Summary
- จำนวน critical / medium / minor
- คำแนะนำโดยรวม: ✅ approve / 🔄 request changes / ❌ block

## Rules

- **Actionable เท่านั้น** — ทุก issue ต้องชี้ file:line + วิธีแก้
- **ห้าม nitpick ใน critical** — แยก severity ให้ถูก
- **อ้างอิง CLAUDE.md / docs** เมื่อชี้ anti-pattern
- **ไม่แก้ code เอง** — แค่ report (ถ้าผู้ใช้สั่ง "แก้ให้" ค่อยทำ)
