# SFMISystem – School Financial Management Information System

ระบบบริหารจัดการการเงิน/งบประมาณของสถานศึกษา (SFMIS) ที่มี **Angular** เป็น frontend และ **NestJS + TypeORM + MySQL** เป็น backend

## 📋 สารบัญ

- [คุณสมบัติหลัก](#คุณสมบัติหลัก)
- [เทคโนโลยีที่ใช้](#เทคโนโลยีที่ใช้)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การติดตั้งและรัน](#การติดตั้งและรัน)
- [การใช้งาน](#การใช้งาน)
- [เอกสารเพิ่มเติม](#เอกสารเพิ่มเติม)

## ✨ คุณสมบัติหลัก

### งานนโยบายและแผน
- บันทึกข้อมูลนักเรียนและคำนวณงบจากรายหัว
- จัดการงบประมาณรวมรายปีและกำหนดวงเงินงบประมาณ
- จัดการโครงการและการอนุมัติโครงการ
- ตั้งค่านโยบายโรงเรียนและนโยบาย สพท

### งานการเงิน
- การรับเงินเข้าบัญชีและรับเงินเหลือจ่ายปีเก่า
- การขอเบิกและการออกเช็ค
- ใบเสร็จรับเงิน
- รายงานการเงิน (คงเหลือประจำวัน, ควบคุมเช็ค, ควบคุมบัญชีธนาคาร)

### งานพัสดุ
- ขอซื้อ/ขอจ้าง
- ตรวจรับพัสดุและเบิกพัสดุ
- บัญชีวัสดุและตั้งค่าประเภทพัสดุ
- อนุมัติใช้งบประมาณและอนุมัติเบิกพัสดุ

### งานผู้อำนวยการ
- อนุมัติโครงการ, ใช้งบประมาณ, และขอเบิก
- ดูรายงานต่างๆ

## 🛠 เทคโนโลยีที่ใช้

### Frontend
- **Angular** 16.2.12
- **Angular Material** 16.2.12
- **Tailwind CSS** 2.1.2
- **ApexCharts** 3.26.1 (สำหรับกราฟ)
- **FullCalendar** 6.1.10 (สำหรับปฏิทิน)
- **RxJS** 7.8.1

### Backend
- **NestJS** 11.0.1
- **TypeORM** 0.3.27
- **MySQL** (mysql2 3.15.3)
- **class-validator** + **class-transformer**

### Database
- **MySQL**
- Schema files อยู่ใน `sfmisystem_db/`

## 📁 โครงสร้างโปรเจกต์

```
sfmisystem/
├── backend/                 # NestJS Backend API
│   ├── src/
│   │   ├── modules/         # Backend modules (21 modules)
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   └── seeds.ts         # Database seeding
│   ├── BACKEND_ARCHITECTURE.md
│   ├── CREATE_MODULES_GUIDE.md
│   └── README.md
│
├── src/                     # Angular Frontend
│   ├── app/
│   │   ├── modules/
│   │   │   ├── admin/
│   │   │   │   ├── sfmisystem/  # SFMIS modules
│   │   │   │   └── aimc/        # AIMC modules
│   │   │   └── auth/
│   │   ├── core/            # Core services
│   │   └── layout/
│   ├── @fuse/               # Fuse theme components
│   └── environments/        # Environment configs
│
├── sfmisystem_db/           # Database SQL files
├── docs/                    # เอกสารเพิ่มเติม
├── context.md              # บริบทและ data flow
├── plan.md                 # แผนการพัฒนา
├── tasks.md                # รายการงาน
└── README.md               # ไฟล์นี้
```

## 🚀 การติดตั้งและรัน

### ข้อกำหนดเบื้องต้น

- **Node.js** 16+ (แนะนำใช้ LTS version)
- **MySQL** 5.7+ หรือ 8.0+
- **npm** หรือ **yarn**

### 1. Clone Repository

```bash
git clone <repository-url>
cd sfmisystem
```

### 2. ติดตั้ง Frontend Dependencies

```bash
npm install
```

### 3. ติดตั้ง Backend Dependencies

```bash
cd backend
npm install
```

### 4. ตั้งค่า Database

1. สร้าง database ใน MySQL:
```sql
CREATE DATABASE sfmisystem CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Import SQL files จาก `sfmisystem_db/`:
```bash
mysql -u root -p sfmisystem < sfmisystem_db/*.sql
```

### 5. ตั้งค่า Backend Environment

```bash
cd backend
cp env.example .env
```

แก้ไข `.env`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=sfmisystem
```

### 6. Seeding ข้อมูลเริ่มต้น (Optional)

```bash
cd backend
npm run seed
```

จะสร้าง:
- Admin user: `admin_local` / `Admin@123`
- School ตัวอย่าง (sc_id=1)
- SchoolYear ปีปัจจุบัน

### 7. รัน Backend

```bash
cd backend
npm run start:dev
```

Backend จะรันที่ `http://localhost:3000/api`

### 8. รัน Frontend

```bash
# จาก root directory
npm start
# หรือ
ng serve
```

Frontend จะรันที่ `http://localhost:4200`

## 📖 การใช้งาน

### Login

1. เปิดเบราว์เซอร์ไปที่ `http://localhost:4200`
2. Login ด้วย:
   - Username: `admin_local`
   - Password: `Admin@123`

### การเชื่อมต่อ Frontend ↔ Backend

- Frontend ใช้ `ConnectApiService` (`src/@fuse/services/connect.api.service.ts`)
- API Base URL ตั้งค่าใน `src/environments/environment.ts`
- Default: `http://localhost:3000/api/`

### Backend Modules

ระบบมี **21 Backend Modules** ครอบคลุมทุกฟีเจอร์:

1. **AdminModule** - จัดการผู้ใช้งาน
2. **DashboardModule** - Dashboard
3. **SchoolYearModule** - ปีการศึกษา
4. **SchoolModule** - โรงเรียน
5. **GeneralDbModule** - ข้อมูลพื้นฐาน
6. **PolicyModule** - นโยบาย
7. **StudentModule** - นักเรียน
8. **BudgetModule** - งบประมาณ
9. **SettingsModule** - ตั้งค่า
10. **ProjectModule** - โครงการ
11. **ProjectApproveModule** - อนุมัติโครงการ
12. **ReceiveModule** - รับเงิน
13. **ReceiptModule** - ใบเสร็จ
14. **InvoiceModule** - ขอเบิก
15. **CheckModule** - ออกเช็ค
16. **BankModule** - บัญชีธนาคาร
17. **SupplieModule** - พัสดุ
18. **AuditCommitteeModule** - คณะกรรมการ
19. **ReportDailyBalanceModule** - รายงานคงเหลือ
20. **ReportCheckControlModule** - ควบคุมเช็ค
21. **ReportBookbankModule** - ควบคุมบัญชี
22. **RegisterMoneyTypeModule** - ทะเบียนประเภทเงิน

ดูรายละเอียด endpoints ได้ที่ `backend/BACKEND_ARCHITECTURE.md`

## 📚 เอกสารเพิ่มเติม

### เอกสารหลัก
- **[context.md](context.md)** - บริบทระบบ, โดเมน, data flow
- **[plan.md](plan.md)** - แผนการพัฒนาและ roadmap
- **[tasks.md](tasks.md)** - รายการงานและสถานะ

### Backend Documentation
- **[backend/README.md](backend/README.md)** - คู่มือ Backend
- **[backend/BACKEND_ARCHITECTURE.md](backend/BACKEND_ARCHITECTURE.md)** - สถาปัตยกรรมและ endpoints
- **[backend/CREATE_MODULES_GUIDE.md](backend/CREATE_MODULES_GUIDE.md)** - คู่มือสร้าง module ใหม่

### Development Guides
- **[docs/](docs/)** - เอกสารเพิ่มเติม
  - `angular_update_guide.md` - คู่มืออัปเดต Angular
  - `system_architecture.md` - สถาปัตยกรรมระบบ
  - และอื่นๆ

## 🔧 Scripts

### Frontend
```bash
npm start              # รัน development server
npm run build          # Build production
npm run build:dev      # Build development
npm run test           # Run tests
npm run lint           # Lint code
npm run format         # Format code
```

### Backend
```bash
cd backend
npm run start:dev      # รัน development (watch mode)
npm run start:prod     # รัน production
npm run build          # Build
npm run seed           # Seed database
npm run test           # Run tests
npm run lint           # Lint code
```

## 🏗️ การพัฒนา

### สร้าง Backend Module ใหม่

ดูคู่มือที่ `backend/CREATE_MODULES_GUIDE.md`

### API Response Format

**List:**
```typescript
{
  data: any[],
  count: number,
  page: number,
  pageSize: number
}
```

**Create/Update/Delete:**
```typescript
{
  flag: boolean,
  ms: string
}
```

### Soft Delete

ใช้ field `del`:
- `del = 0` = active
- `del = 1` = deleted

## 🔒 Security

### Security Vulnerabilities

ระบบมี security vulnerabilities หลายรายการ (38 vulnerabilities) ดูรายละเอียดได้ที่ **[SECURITY_VULNERABILITIES.md](SECURITY_VULNERABILITIES.md)**

### การแก้ไข Security Issues

#### วิธีที่แนะนำ (ปลอดภัย)
```bash
# ใช้ script ที่เตรียมไว้
npm run security:fix

# หรือแก้ไขด้วยตนเอง
npm audit fix  # ไม่ใช่ --force
```

#### ⚠️ อย่าใช้
```bash
# ❌ อย่าทำ - จะทำให้เกิด breaking changes
npm audit fix --force
```

### Critical Vulnerabilities
- **crypto-js** <4.2.0 - ควรอัปเดตเป็น 4.2.0
- **Angular packages** - ต้องอัปเดตแบบค่อยเป็นค่อยไป (16 → 17 → 18 → 19)

ดูรายละเอียดและแผนการแก้ไขได้ที่ `SECURITY_VULNERABILITIES.md`

## 🐛 Troubleshooting

### Backend ไม่เชื่อมต่อ Database
- ตรวจสอบ `.env` ใน `backend/`
- ตรวจสอบว่า MySQL กำลังรันอยู่
- ตรวจสอบ username/password/database name

### Frontend ไม่เชื่อมต่อ Backend
- ตรวจสอบว่า Backend รันอยู่ที่ `http://localhost:3000`
- ตรวจสอบ `src/environments/environment.ts` (apiUrl)
- ตรวจสอบ CORS settings ใน Backend

### Build Errors
- ลบ `node_modules` และ `package-lock.json` แล้วรัน `npm install` ใหม่
- ตรวจสอบ Node.js version (ต้อง 16+)

## 📝 License

MIT

## 👥 Contributors

- Development Team

---

**หมายเหตุ**: ระบบพร้อมใช้งานแล้ว แต่ควรทำการทดสอบในสภาพแวดล้อมจริงและแก้ไข bug ที่พบเพิ่มเติม
