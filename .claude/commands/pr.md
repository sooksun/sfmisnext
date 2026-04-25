---
description: สร้าง Pull Request พร้อม template (ใช้ gh CLI ถ้ามี หรือ fallback เป็น compare URL)
argument-hint: [base-branch] — default main
---

สร้าง Pull Request จาก branch ปัจจุบันไปยัง base branch (default: `main`)

## ⚠️ กฎ

- **ห้าม push โดยไม่ถาม** ถ้า branch ยังไม่ถูก push — เสนอคำสั่ง push ให้ผู้ใช้ยืนยัน
- **ห้าม force-push** เด็ดขาด
- ตรวจก่อนว่า branch ปัจจุบัน **ไม่ใช่** `main` หรือ base branch — ถ้าใช่ให้หยุดและแจ้งให้สร้าง branch ใหม่
- ถ้ามีไฟล์ยังไม่ commit — ถามว่าจะ commit ก่อน (แนะนำ `/commit-smart`) หรือ PR แค่ที่ commit แล้ว

## ขั้นตอน

### 1. รวบรวม context (ขนานกัน)
```bash
git branch --show-current
git status
git log <base>..HEAD --oneline
git diff <base>...HEAD --stat
```
- `<base>` = `$1` ถ้ามี, ไม่งั้น `main`

### 2. ตรวจ remote tracking
```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>&1 || echo "no-upstream"
```
- ถ้าไม่มี upstream → แจ้งผู้ใช้ว่าต้อง push ก่อน พร้อมเสนอคำสั่ง:
  ```bash
  git push -u origin <branch>
  ```
  รอผู้ใช้ยืนยัน

### 3. วิเคราะห์ commits ที่จะรวมใน PR

อ่าน **ทุก commit** (ไม่ใช่แค่ commit ล่าสุด) + diff รวม แล้วสรุป:
- Commit messages ทั้งหมด
- ไฟล์ที่เปลี่ยน (กลุ่มตาม scope)
- ประเภทของการเปลี่ยนแปลง (feat / fix / refactor / ...)

### 4. ร่าง PR title + body

**Title**: สั้น กระชับ (<70 ตัวอักษร) รูปแบบ Conventional Commits + ไทย
- ตัวอย่าง: `feat(budget): เพิ่มหน้าขออนุมัติงบประมาณ`

**Body** (ภาษาไทย, Markdown):
```markdown
## สรุปการเปลี่ยนแปลง
- [bullet สำคัญ 1-3 ข้อ "ทำไม" ไม่ใช่ "ทำอะไร"]

## รายละเอียด
- [จุดทางเทคนิคสำคัญ — เช่น entity ใหม่, endpoint ใหม่, breaking change]

## แผนการทดสอบ
- [ ] ทดสอบ golden path: ...
- [ ] ทดสอบ edge case: ...
- [ ] รัน `npm run test` / `npm run build`

## หมายเหตุ
- [migration ที่ต้องรัน / env ใหม่ / dep ใหม่ / ฯลฯ ถ้ามี]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

แสดงร่างให้ผู้ใช้ดูก่อน **รอยืนยัน**

### 5. สร้าง PR

**Path A: ถ้ามี `gh` CLI** (เช็คด้วย `command -v gh`)

```bash
gh pr create --base <base> --title "..." --body "$(cat <<'EOF'
...
EOF
)"
```

หลังสำเร็จ — รายงาน URL ของ PR

**Path B: ถ้าไม่มี `gh` CLI** (fallback — เครื่องนี้เป็นแบบนี้ตอนนี้)

สร้าง compare URL จาก `git remote get-url origin`:
- SSH remote `git@github.com:owner/repo.git` → `https://github.com/owner/repo/compare/<base>...<branch>?expand=1`
- HTTPS remote → แปลงให้เป็น web URL

แสดงผู้ใช้:
1. URL compare ให้คลิกเปิด
2. Title + body ในรูปแบบ markdown block ให้ copy-paste
3. แนะนำ `gh` CLI ถ้าอยากให้สร้างอัตโนมัติครั้งหน้า (winget install GitHub.cli)

### 6. หลังสร้างเสร็จ

- แสดง URL ของ PR (ถ้ามี)
- **อย่า** merge
- แจ้งถ้ามีอะไรที่ผู้ใช้ควรทำต่อ (review, run CI, ฯลฯ)

รายงานผลเป็นภาษาไทย
