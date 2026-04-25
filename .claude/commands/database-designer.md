---
description: ออกแบบฐานข้อมูล (ERD, TypeORM entities, indexes) สำหรับ SFMIS
argument-hint: [domain/feature description]
---

ทำหน้าที่ Database Designer — ออกแบบ schema ก่อนเขียน entity จริง

## Input

- `$ARGUMENTS` = domain หรือ feature ที่ต้องออกแบบ (ถ้าไม่มีให้ถาม)

## Stack (SFMIS)

- **Database**: MySQL 8 (UTF8MB4)
- **ORM**: TypeORM 0.3 — **ไม่ใช่ Prisma** ⚠️
- **Multi-tenant**: column `sc_id` (ทุกตารางที่เกี่ยวกับโรงเรียน)
- **Multi-year**: `sy_id` (auto-increment PK ของ `school_year`) + `budget_year` (ปีจริง เช่น 2569)
- **Soft delete**: `del` column (0=active, 1=deleted) — filter `del=0` เสมอ
- **Audit fields**: `cre_date`, `up_date`, `up_by`

## Output Format (ภาษาไทย)

### 1. ERD เชิงข้อความ
แสดง entity + ความสัมพันธ์:
```
school_year (sy_id PK) ─┬─< pln_project (pj_id PK, sy_id FK)
                        └─< expenses (ex_id PK, ex_year_in FK ~ budget_year)
```

### 2. Table List
ตารางใหม่ + ตารางที่ต้องแก้ (ระบุชัด)

### 3. Field Definitions
แต่ละ table แสดงเป็นตาราง:

| Field | Type | Null | Default | Note |
|---|---|---|---|---|
| xx_id | int | No | auto | PK |
| sc_id | int | No | - | FK → school |
| del | int | No | 0 | soft delete |
| cre_date | datetime | Yes | now | audit |
| up_date | datetime | Yes | - | audit |
| up_by | int | Yes | - | audit (admin_id) |

### 4. PK / FK
- ระบุ PK, FK, ON DELETE behavior

### 5. Indexes ที่ควรมี
- Composite index ที่ใช้บ่อย: `(sc_id, del)`, `(sc_id, sy_id, del)`
- Unique constraints
- อ้างอิง pattern `@Index(['scId', 'del'])` ของ SFMIS

### 6. Soft Delete Strategy
- ทุกตารางมี `del` column (default 0)
- Query filter `where: { del: 0 }`

### 7. Audit Fields
- `@CreateDateColumn({ name: 'cre_date' })` / `@UpdateDateColumn({ name: 'up_date' })`
- `upBy: number` เก็บ `admin_id` ของคนล่าสุดที่แก้

### 8. Multi-tenant Support
- ทุก row เจาะจง `sc_id`
- query ต้อง filter `sc_id` เสมอ (ป้องกัน cross-tenant leak)
- ตารางที่ขึ้นกับปี: ใช้ `sy_id` (ถ้าอ้างอิง school_year PK) หรือ `budget_year` (ถ้าเก็บปีจริง เช่น `parcel_order.acad_year`)

### 9. TypeORM Entity Draft
แสดง skeleton (snake_case column, camelCase property):
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

### 10. Migration Plan
- ถ้า dev (`synchronize: true`) จะ auto-alter; แต่ก่อน merge ต้องรัน `/db-migrate generate`
- ระบุผลกระทบ: ต้อง backfill data มั้ย? default value ปลอดภัยมั้ย?
- ข้อควรระวัง: การเปลี่ยน type / drop column → data loss risk

## Rules

- **ห้ามใช้ Prisma syntax** — SFMIS ใช้ TypeORM
- **ต้องมี `del`, `up_by`, `cre_date`, `up_date`** ในทุกตารางที่เก็บข้อมูลผู้ใช้
- **ต้องมี `sc_id`** ถ้า scope เป็นโรงเรียน
- **ตั้งชื่อ column snake_case** (ตรงกับ MySQL convention ของ SFMIS)
- **ชี้ให้เห็น schema ที่มีอยู่แล้ว** ใน `sfmisystem_db/` ถ้าเกี่ยวข้อง
