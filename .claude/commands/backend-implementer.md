---
description: เขียน NestJS backend module แบบ production-ready (TypeORM, ไม่ใช่ Prisma)
argument-hint: [feature description]
---

ทำหน้าที่ Backend Implementer — เขียน module จริงตาม contract ที่ออกแบบแล้ว

## ⚠️ ต้องมีก่อนเริ่ม

- API contract (จาก `/api-contract-guardian`)
- Schema / entity design (จาก `/database-designer`)
- ถ้ายังไม่มี — **หยุดและแจ้งผู้ใช้** ว่าต้องทำก่อน

## Stack (SFMIS)

- NestJS 11 + TypeORM 0.3 + MySQL 8 (⚠️ **ไม่ใช่ Prisma**)
- `class-validator` + Global `ValidationPipe`
- JWT global guard (`APP_GUARD`) + `@Public()` bypass + `@Roles()` restrict
- bcrypt สำหรับ password
- Config: `@nestjs/config` + env

## Module Structure

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

## ขั้นตอน

1. **ตรวจ** — ถ้าเป็น module ใหม่ใช้ `/new-module` scaffold ก่อน
2. **อ่าน module ตัวอย่าง** 1 ตัวที่คล้ายที่สุด (อาจต้องใช้ Grep หา pattern)
3. **เขียน entity** — snake_case column, `@Index(['scId', 'del'])`, audit fields, `del: number`
4. **เขียน DTO** — snake_case field, `class-validator` decorators
5. **เขียน service** — business logic + repository
6. **เขียน controller** — endpoint + `@HttpCode(HttpStatus.OK)` + `ParseIntPipe`
7. **ลงทะเบียน module** — `TypeOrmModule.forFeature([Entity])` + `app.module.ts`
8. **เขียน spec test** (unit)

## Convention ต้องทำตาม

### Entity
```ts
@Index(['scId', 'del'])
@Entity('table_name')
export class TableName {
  @PrimaryGeneratedColumn({ name: 'xx_id' })
  xxId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'cre_date' })
  creDate: Date;

  @UpdateDateColumn({ name: 'up_date' })
  upDate: Date;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;
}
```

### DTO
```ts
export class CreateXxxDto {
  @IsInt() @Min(1)
  sc_id: number;

  @IsString() @MaxLength(200)
  name: string;

  @IsInt() @IsOptional()
  up_by?: number;
}
```

### Service
- Inject `Repository<Entity>` ผ่าน `@InjectRepository()`
- Filter `del: 0` เสมอ
- Pagination: `skip: page * pageSize, take: pageSize`
- List return: `{ data, count, page, pageSize }`
- CUD return: `{ flag: boolean, ms: string }`
- Error: return `{ flag: false, ms: 'เกิดข้อผิดพลาด' }` ไม่ต้อง throw ถ้า business error

### Controller
- `@Controller('Xxx')` PascalCase/camelCase ตาม Angular legacy
- `@Post('loadXxx/:scId/:page/:pageSize')` + `@HttpCode(HttpStatus.OK)` + `@Param('xx', ParseIntPipe)`
- GET mirror ถ้าเป็น list endpoint

### Module
```ts
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  controllers: [XxxController],
  providers: [XxxService],
  exports: [XxxService],
})
export class XxxModule {}
```
แล้วเพิ่มใน `backend/src/app.module.ts` `imports: [...]`

### Auth
- Default: protected (global JwtAuthGuard)
- เฉพาะ public endpoint ใส่ `@Public()`
- จำกัด role ใส่ `@Roles([1, 2])` (admin, ผู้บริหาร)

### Security
- Password เข้ารหัสด้วย `bcrypt.hash(pw, 10)`
- **ห้าม return** `password`, `password_default` ใน response
- Input validation ผ่าน ValidationPipe (whitelist=true)

## Output

- สร้าง/แก้ไฟล์จริงในโปรเจกต์
- หลังเสร็จ รัน `cd backend && npx tsc --noEmit` ตรวจ type
- **ห้ามรัน** `npm run start:dev` เอง
- รายงานสรุป:
  - ไฟล์ที่สร้าง/แก้
  - endpoint ที่ทำเสร็จ
  - ส่วนที่ผู้ใช้ต้องเติม (เช่น business rule ซับซ้อน)
  - ต้องรัน migration ไหม (`/db-migrate generate`)

## ข้อห้าม

- **ห้ามใช้ Prisma** — SFMIS ใช้ TypeORM
- **ห้ามสร้าง mock/stub code** ที่ใช้จริงไม่ได้
- **ห้ามลืม filter `del: 0`**
- **ห้าม hard-code role** — ใช้ `@Roles()` decorator
- **ห้าม return password** ใน API response
- **ไม่ add feature ที่ไม่ได้ระบุใน contract**
