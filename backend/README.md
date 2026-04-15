# SFMIS Backend API

Backend API สำหรับระบบบริหารจัดการการเงินของโรงเรียน (SFMIS) สร้างด้วย NestJS + TypeORM + MySQL

## สถาปัตยกรรม

- **Framework**: NestJS 11.0.1
- **ORM**: TypeORM 0.3.27
- **Database**: MySQL (mysql2 3.15.3)
- **Validation**: class-validator + class-transformer
- **API Base Path**: `/api`

## การติดตั้งและรัน

### 1. ติดตั้ง Dependencies

```bash
cd backend
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` จาก `env.example`:

```bash
cp env.example .env
```

แก้ไขค่าตามสภาพแวดล้อม:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=sfmisystem
```

### 3. รัน Backend

```bash
# Development mode (watch mode)
npm run start:dev

# Production mode
npm run start:prod

# Build
npm run build
```

Backend จะรันที่ `http://localhost:3000/api`

### 4. Seeding ข้อมูลเริ่มต้น

```bash
npm run seed
```

จะสร้าง:
- Admin user: `admin_local` / `Admin@123`
- School ตัวอย่าง (sc_id=1)
- SchoolYear ปีปัจจุบัน

## โครงสร้าง Backend Modules (21 Modules)

### Core Modules
1. **AdminModule** - จัดการผู้ใช้งานและผู้ดูแลระบบ
2. **DashboardModule** - Dashboard และรายงานสรุป
3. **SchoolYearModule** - จัดการปีการศึกษา
4. **SchoolModule** - ข้อมูลโรงเรียน

### Master Data Modules
5. **GeneralDbModule** - ข้อมูลพื้นฐาน (Unit, Type Supplies, Supplies, Partner)
6. **PolicyModule** - นโยบายและข้อมูลพื้นฐาน
7. **SettingsModule** - ตั้งค่าต่างๆ (นโยบายโรงเรียน, นโยบาย สพท)

### Planning & Budget Modules
8. **StudentModule** - บันทึกข้อมูลนักเรียนและคำนวณงบจากรายหัว
9. **BudgetModule** - งบประมาณรวมรายปีและกำหนดวงเงินงบประมาณ
10. **ProjectModule** - จัดการโครงการ
11. **ProjectApproveModule** - การอนุมัติโครงการและขอซื้อ/ขอจ้าง

### Finance Modules
12. **ReceiveModule** - การรับเงิน
13. **ReceiptModule** - ใบเสร็จรับเงิน
14. **InvoiceModule** - ขอเบิก
15. **CheckModule** - ออกเช็ค
16. **BankModule** - ตั้งค่าการเงิน (บัญชีธนาคาร, ผูกบัญชี)

### Supply Modules
17. **SupplieModule** - งานพัสดุ (ตรวจรับ, เบิก, อนุมัติ)
18. **AuditCommitteeModule** - แต่งตั้งคณะกรรมการ

### Report Modules
19. **ReportDailyBalanceModule** - รายงานคงเหลือประจำวัน
20. **ReportCheckControlModule** - ลงทะเบียนควบคุมเช็ค
21. **ReportBookbankModule** - ลงทะเบียนควบคุมบัญชีธนาคาร
22. **RegisterMoneyTypeModule** - ทะเบียนคุมหน้างบใบสำคัญคู่จ่ายและควบคุมประเภทเงิน

## โครงสร้างไฟล์

```
backend/
├── src/
│   ├── modules/           # Backend modules
│   │   ├── admin/
│   │   ├── dashboard/
│   │   ├── school-year/
│   │   └── ...
│   ├── app.module.ts      # Root module
│   ├── main.ts            # Application entry point
│   └── seeds.ts           # Database seeding script
├── test/                  # E2E tests
├── package.json
├── tsconfig.json
└── .env                   # Environment variables (สร้างเอง)
```

## หลักการออกแบบ

### Response Format

**สำหรับ List:**
```typescript
{
  data: any[],
  count: number,
  page: number,
  pageSize: number
}
```

**สำหรับ Create/Update/Delete:**
```typescript
{
  flag: boolean,
  ms: string
}
```

### Soft Delete

ใช้ field `del` สำหรับ soft delete:
- `del = 0` = active
- `del = 1` = deleted

### Audit Fields

ทุก entity ควรมี:
- `up_by`: ID ผู้แก้ไข
- `cre_date`: วันที่สร้าง
- `up_date`: วันที่แก้ไขล่าสุด

### Validation

ใช้ DTO + ValidationPipe:
- `class-validator` สำหรับ validation rules
- `class-transformer` สำหรับ transform data

## API Endpoints

ดูรายละเอียด endpoints ทั้งหมดได้ที่ `BACKEND_ARCHITECTURE.md`

## การสร้าง Module ใหม่

ดูคู่มือได้ที่ `CREATE_MODULES_GUIDE.md`

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## เอกสารเพิ่มเติม

- `BACKEND_ARCHITECTURE.md` - สถาปัตยกรรมและ endpoints ทั้งหมด
- `CREATE_MODULES_GUIDE.md` - คู่มือการสร้าง module ใหม่
- `../context.md` - บริบทและ data flow ของระบบ
- `../plan.md` - แผนการพัฒนา
- `../tasks.md` - รายการงานและสถานะ

## License

MIT
