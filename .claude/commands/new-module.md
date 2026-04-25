---
description: Scaffold NestJS module ใหม่ตาม SFMIS pattern (controller + service + dto + entity)
argument-hint: <module-name> [table-name]
---

Scaffold NestJS module ใหม่ใน `backend/src/modules/` ตาม convention ของ SFMIS

## Input

- `$1` = ชื่อ module (kebab-case) เช่น `budget-request`
- `$2` = ชื่อตาราง (optional, snake_case) ถ้าไม่ระบุให้แปลงจาก `$1` เช่น `budget_request`

ถ้าไม่มี argument ให้ถามผู้ใช้ก่อน:
- ชื่อ module (kebab-case)
- ชื่อตาราง MySQL (snake_case)
- คำอธิบายสั้น ๆ ว่า module นี้ทำอะไร

## ขั้นตอน

1. **ตรวจก่อนสร้าง**: เช็คว่า `backend/src/modules/$1/` มีอยู่แล้วหรือไม่ ถ้ามีให้หยุดและแจ้งผู้ใช้
2. **อ่าน module ตัวอย่าง** 1 ตัวเพื่อ sync pattern ล่าสุด: `backend/src/modules/school-year/` (controller/service/module/entity + dto)
3. **สร้างไฟล์** ตามโครงสร้างนี้:

```
backend/src/modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
├── <name>.service.spec.ts
├── dto/
│   ├── create-<name>.dto.ts
│   └── update-<name>.dto.ts
└── entities/
    └── <name>.entity.ts
```

4. **ลงทะเบียนใน `backend/src/app.module.ts`** — เพิ่ม import และใส่ใน `imports: []`

## Convention ต้องทำตาม

- **Controller prefix**: ใช้ PascalCase/camelCase ของ module name (เลียนแบบ Angular legacy) เช่น `@Controller('budget_request')`
- **HTTP methods**: POST เป็นหลัก, ใส่ `@HttpCode(HttpStatus.OK)` ทุกครั้ง; GET mirror ให้ด้วยถ้าเป็น list endpoint
- **Path params**: ใช้ `@Param('xxx', ParseIntPipe)` สำหรับเลขจำนวนเต็ม
- **Naming endpoints**: `loadXxx`, `getXxx`, `saveXxx`/`addXxx`, `updateXxx`, `removeXxx`
- **List response**: `{ data: T[], count: number, page: number, pageSize: number }`
- **CUD response**: `{ flag: boolean, ms: string }`
- **Entity**: TypeORM `@Entity('table_name')`; PK ใช้ `@PrimaryGeneratedColumn({ name: 'xxx_id' })`; มี `del: number` (default 0), `upBy`, `creDate` (`@CreateDateColumn`), `upDate` (`@UpdateDateColumn`); ใส่ `@Index(['scId', 'del'])` ถ้ามี `sc_id`
- **Service**: ใช้ `Repository<Entity>` ผ่าน `@InjectRepository()`, filter `del: 0` เสมอ, pagination ใช้ `skip: page * pageSize, take: pageSize`
- **DTO**: ใช้ snake_case field names (เลียน legacy API), มี `class-validator` decorators (`@IsInt()`, `@IsOptional()`, etc.)
- **Module**: `TypeOrmModule.forFeature([Entity])` ใน imports, export service ถ้า module อื่นอาจใช้

## หลังสร้างเสร็จ

- รัน `cd backend && npx tsc --noEmit` เพื่อตรวจว่า compile ผ่าน
- รายงานสรุป: ไฟล์ที่สร้าง, endpoint ที่ scaffold, สิ่งที่ผู้ใช้ต้องเติมเอง (business logic ใน service, field จริงใน entity/dto)
- **อย่า** รัน `npm run start:dev` เอง — ปล่อยให้ผู้ใช้รันเอง

รายงานผลเป็นภาษาไทย
