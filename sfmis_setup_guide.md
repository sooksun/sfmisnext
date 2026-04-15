# คู่มือการติดตั้งและใช้งานระบบ SFMIS

วันที่: 2 ธันวาคม 2025

## ความต้องการของระบบ

### สภาพแวดล้อมที่จำเป็น
1. **Node.js**: เวอร์ชัน 16.x หรือใหม่กว่า (ระบบปัจจุบันใช้ v22.14.0)
2. **npm**: เวอร์ชันล่าสุด
3. **MySQL**: เวอร์ชัน 5.7 หรือใหม่กว่า
4. **Angular CLI**: เวอร์ชัน 16.x (ตรงกับเวอร์ชันของ Angular ในโปรเจกต์)

## การติดตั้งระบบ

### 1. การติดตั้ง Frontend (Angular)

1. เข้าไปที่โฟลเดอร์หลักของโปรเจกต์
```bash
cd /path/to/sfmisystem
```

2. ติดตั้ง Dependencies
```bash
npm install
```

3. รันแอปพลิเคชัน Angular
```bash
npm start
```
หรือ
```bash
ng serve
```

Frontend จะทำงานที่ http://localhost:4200

### 2. การติดตั้ง Backend (NestJS)

1. เข้าไปที่โฟลเดอร์ backend
```bash
cd /path/to/sfmisystem/backend
```

2. ติดตั้ง Dependencies
```bash
npm install
```

3. สร้างไฟล์ .env จาก env.example
```bash
cp env.example .env
```

4. แก้ไขไฟล์ .env ให้ตรงกับการตั้งค่าฐานข้อมูลของคุณ
```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=sfmisystem
```

5. รันแอปพลิเคชัน NestJS
```bash
npm run start:dev
```

Backend จะทำงานที่ http://localhost:3000/api

### 3. การตั้งค่าฐานข้อมูล

1. สร้างฐานข้อมูล MySQL ชื่อ `sfmisystem`
```sql
CREATE DATABASE sfmisystem CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. นำเข้าข้อมูลเริ่มต้น (ถ้ามี)
```bash
cd /path/to/sfmisystem/backend
npm run seed
```

## โครงสร้างของระบบ

### Frontend (Angular)
- **Angular**: เวอร์ชัน 16.2.12
- **Angular Material**: เวอร์ชัน 16.2.12
- **Theme**: Fuse Angular Admin Template

โครงสร้างหลักของ Frontend:
- **src/app/modules/admin/sfmisystem**: โมดูลหลักของระบบ SFMIS
- **src/app/modules/sfmis**: โมดูลใหม่ที่ปรับโครงสร้างตาม feature domains
- **src/environments**: ไฟล์การตั้งค่าสภาพแวดล้อม (environment.ts, environment.prod.ts)

### Backend (NestJS)
- **NestJS**: เวอร์ชัน 11.0.1
- **TypeORM**: เวอร์ชัน 0.3.27
- **MySQL**: ฐานข้อมูลหลัก

โครงสร้างหลักของ Backend:
- **src/modules**: โมดูลต่างๆ ของระบบ
  - admin: จัดการผู้ใช้ admin
  - dashboard: หน้าแรกและ dashboard
  - school-year: จัดการปีการศึกษา
  - school: จัดการโรงเรียน
  - general-db: จัดการข้อมูลทั่วไป (Unit, Type Supplies, Supplies, Partner)
  - policy: จัดการนโยบาย
  - project: จัดการโครงการ
  - project-approve: จัดการการอนุมัติโครงการ
  - budget: จัดการงบประมาณ
  - bank: จัดการบัญชีธนาคาร
  - supplie: จัดการพัสดุ
  - receive: จัดการการรับเงิน
  - receipt: จัดการใบเสร็จ
  - audit-committee: จัดการคณะกรรมการตรวจสอบ

## การใช้งานระบบ

### การเข้าสู่ระบบ
1. เปิดเบราว์เซอร์และเข้าไปที่ http://localhost:4200
2. เข้าสู่ระบบด้วยบัญชีผู้ใช้ที่มีอยู่ (ถ้ามี) หรือสร้างบัญชีใหม่

### โมดูลหลักของระบบ
1. **Dashboard**: แสดงภาพรวมของระบบ
2. **งานนโยบายและแผน**: จัดการโครงการและงบประมาณ
3. **งานการเงิน**: จัดการการรับ-จ่ายเงิน
4. **งานพัสดุ**: จัดการพัสดุและครุภัณฑ์
5. **ตั้งค่าระบบ**: จัดการการตั้งค่าต่างๆ ของระบบ

## การแก้ไขปัญหาเบื้องต้น

### ปัญหาการเชื่อมต่อฐานข้อมูล
1. ตรวจสอบว่า MySQL กำลังทำงานอยู่
2. ตรวจสอบการตั้งค่าในไฟล์ .env ว่าถูกต้อง
3. ตรวจสอบว่าฐานข้อมูล sfmisystem มีอยู่จริง

### ปัญหา Frontend ไม่สามารถเชื่อมต่อกับ Backend
1. ตรวจสอบว่า Backend กำลังทำงานที่พอร์ต 3000
2. ตรวจสอบการตั้งค่า API URL ใน environment.ts (apiUrl: 'http://localhost:3000/api/')

### ปัญหาการรันสคริปต์ PowerShell
หากพบข้อผิดพลาด "running scripts is disabled on this system":
1. เปิด PowerShell ด้วยสิทธิ์ Administrator
2. รันคำสั่ง:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## คำสั่งที่ใช้บ่อย

### Frontend (Angular)
```bash
# รัน development server
npm start

# สร้างไฟล์สำหรับ production
npm run build

# รัน linting
npm run lint

# แก้ไขปัญหา linting
npm run lint:fix
```

### Backend (NestJS)
```bash
# รัน development server
npm run start:dev

# สร้างไฟล์สำหรับ production
npm run build

# รัน production server
npm run start:prod

# รัน seed data
npm run seed
```

## หมายเหตุ
- ระบบนี้ใช้ Angular 16.2.12 และ NestJS 11.0.1
- ระบบนี้ต้องการ Node.js เวอร์ชัน 16.x หรือใหม่กว่า
- ระบบนี้ใช้ฐานข้อมูล MySQL
