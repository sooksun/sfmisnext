---
description: วิเคราะห์ diff แล้ว commit แบบเป็นกลุ่มตาม Conventional Commits + ข้อความไทย
argument-hint: [optional context เช่น "เฉพาะ frontend"]
---

วิเคราะห์การเปลี่ยนแปลงปัจจุบัน จัดกลุ่มตามความหมาย และสร้าง commit หลายก้อนถ้าจำเป็น

## ⚠️ กฎเหล็ก

- **ห้าม commit โดยอัตโนมัติ** — เสนอแผนแบ่งกลุ่ม + ข้อความ commit ก่อนเสมอ ให้ผู้ใช้ยืนยัน
- **ห้ามใช้ `--no-verify`** (ไม่ข้าม pre-commit hook)
- **ห้ามใช้ `git add -A` หรือ `git add .`** — add เฉพาะไฟล์ที่ระบุ
- **ห้าม commit ไฟล์ลับ** (`.env`, `credentials*`, `secrets*`)

## ขั้นตอน

### 1. สำรวจสถานะ
รันขนานกัน:
```bash
git status
git diff --stat
git log --oneline -10
```

### 2. จัดกลุ่มการเปลี่ยนแปลง
อ่าน `git diff` แล้วจัดกลุ่มตามเกณฑ์:
- **ตามโดเมน/ฟีเจอร์**: `budget-menu`, `receive-menu`, `plan-menu`, `admin`, `auth` ฯลฯ
- **ตามประเภท**: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`, `perf`
- **ตามขอบเขต**: `backend`, `frontend`, `ui`, `api`, `db`
- ถ้าไฟล์เดียวกันมีทั้ง feat และ fix ปะปน → แยกเป็น 2 commit ถ้าเป็นไปได้ ถ้าทำไม่ได้ให้ใช้ประเภทที่เป็นเจตนาหลัก

### 3. สร้าง Commit Messages

Format ตาม **Conventional Commits** + description ภาษาไทย (ดูจาก `git log` ล่าสุด):

```
<type>(<scope>): <คำอธิบายสั้นภาษาไทย>

[body ถ้าจำเป็น — อธิบาย "ทำไม" ไม่ใช่ "ทำอะไร"]
```

**ตัวอย่างจาก repo นี้:**
- `feat(ui): แสดงวันที่เป็น พ.ศ. ภาษาไทยทุกคอลัมน์ตาราง`
- `fix(proj-approve): ใช้ budget_year แทน sy_id เพื่อ query parcel_order.acad_year`
- `docs(claude): บันทึก patterns สำคัญ — ThaiDatePicker, fmtDateTH`

**scope แนะนำ:**
- UI ทั่วไป: `ui`
- Module เฉพาะ: `budget`, `receive`, `project`, `proj-approve`, `admin`, `auth`, `dashboard`
- โครงสร้าง: `backend`, `frontend`, `db`, `api`, `ci`, `deps`

### 4. เสนอแผนให้ผู้ใช้ดู

แสดงในรูปแบบ:

```
📋 แผนการ commit (N commits):

Commit 1: feat(scope): ข้อความ
  - file1
  - file2

Commit 2: fix(scope): ข้อความ
  - file3

ต้องการดำเนินการหรือไม่? (yes / แก้ไข / ยกเลิก)
```

### 5. ดำเนินการ (หลังผู้ใช้ยืนยัน)

สำหรับแต่ละกลุ่ม:
```bash
git add <specific-files>
git commit -m "$(cat <<'EOF'
<type>(<scope>): <ข้อความ>

[body]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

ใช้ HEREDOC เสมอเพื่อจัดรูปแบบให้ถูกต้อง

### 6. รายงานผล
- แสดง `git log --oneline -N` ของ commits ใหม่
- แจ้งว่า **ยังไม่ push** (ถ้าผู้ใช้ต้องการ push ให้บอก)

## หมายเหตุ

- ถ้าผู้ใช้ให้ argument (`$1`) เช่น `"เฉพาะ frontend"` → กรองเฉพาะไฟล์ใน `frontend/` เท่านั้น
- ถ้าทั้ง staged + unstaged มีของ — ถามก่อนว่าจะใช้ staged เท่านั้น หรือรวม unstaged ด้วย
- ถ้า pre-commit hook ล้มเหลว → **อย่า amend** ให้แก้ปัญหาแล้ว commit ใหม่
