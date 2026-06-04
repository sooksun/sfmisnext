# E2E (Playwright)

## ติดตั้งเบราว์เซอร์ (ครั้งแรก)

```bash
npm run test:e2e:install
```

## รันเทสต์

| คำสั่ง | ความหมาย |
|--------|----------|
| `npm run test:e2e` | Smoke เท่านั้น (sign-in, redirect) ~10s |
| `npm run test:e2e:crawl` | Crawl ทุกหน้า ~15+ นาที |
| `npm run test:e2e:all` | รวม smoke + crawl |

**ก่อน crawl:** ต้องมี **backend** รันที่ `http://localhost:3000` (API)

## บัญชี login

ค่าเริ่มต้น (จาก `npm run seed` ใน backend):

- **User:** `admin_local`
- **Pass:** `Admin@123`
- **Role:** type=2 (ผู้ดูแลโรงเรียน) — เมนู Super Admin บางหน้าจะขึ้น "ไม่มีสิทธิ์"

PowerShell:

```powershell
$env:E2E_USER = "admin_local"
$env:E2E_PASS = "Admin@123"
npm run test:e2e:crawl
```

หรือลบตัวแปรเพื่อใช้ default:

```powershell
Remove-Item Env:E2E_USER -ErrorAction SilentlyContinue
Remove-Item Env:E2E_PASS -ErrorAction SilentlyContinue
```

## ข้อผิดพลาดที่พบบ่อย

| อาการ | แก้ |
|--------|-----|
| `Executable doesn't exist` | `npm run test:e2e:install` |
| `CredentialsSignin` / login timeout | อย่าใส่ข้อความตัวอย่างเช่น `ชื่อ super admin` — ใช้ `admin_local` / `Admin@123` |
| crawl login ล้ม | ใช้ `admin_local` / `Admin@123` + backend :3000 |

รายงาน crawl: `test-results/all-pages-report.json`
