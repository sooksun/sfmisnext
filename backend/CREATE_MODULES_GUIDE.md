# คู่มือการสร้างโมดูล Backend เพิ่มเติม

## โมดูลที่สร้างแล้ว ✅ (21 Modules)

### Core Modules
1. **AdminModule** - จัดการผู้ใช้ admin และ users
2. **DashboardModule** - หน้าแรกและ dashboard
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

## โมดูลที่ยังต้องสร้าง (ถ้ามี)

### 1. School Module
```bash
# สร้างโครงสร้าง
mkdir -p src/modules/school/{entities,dto}
```

**Endpoints ที่ต้องสร้าง:**
- `POST /api/School/load_school/:page/:pageSize`
- `POST /api/School/addSchool`
- `POST /api/School/updateSchool`
- `POST /api/School/removeSchool`
- `POST /api/School/loadBudgetIncomeTypeSchool/:scId/:page/:pageSize`
- `POST /api/school/loadProvice`

**Entity:** `School` (มีแล้ว)

### 2. General DB Module
```bash
mkdir -p src/modules/general-db/{entities,dto}
```

**Sub-modules:**
- **Unit** (tb_unit)
- **Type Supplies** (tb_type_supplies)
- **Supplies** (tb_supplies)
- **Partner** (tb_partner)

**Endpoints:**
- Unit: `/load_unit`, `/addUnit`, `/updateUnit`, `/remove_unit`
- Type Supplies: `/load_type_supplie`, `/addTypeSupplie`, `/updateTypeSupplie`, `/remove_type_supplie`
- Supplies: `/load_supplies`, `/addSupplie`, `/updateSupplies`, `/remove_supplies`, `/loadTypeSuppliesAndUnit`, `/loadFixSupplies`, `/fixSupplies`
- Partner: `/load_partner`, `/addPartner`, `/updatePartner`, `/remove_partner`

### 3. Settings Module
```bash
mkdir -p src/modules/settings/{entities,dto}
```

**Sub-modules:**
- School Policy (master_sc_policy)
- SAO Policy (master_sao_policy)
- MOE Policy (master_moe_policy)
- OBEC Policy (master_obec_policy)
- Quick Win (master_quick_win)
- SAO (master_sao)
- Classroom Budget
- Budget Income Type

### 4. Project Module
```bash
mkdir -p src/modules/project/{entities,dto}
```

**Endpoints:**
- `/load_project/:scId/:userId/:page/:pageSize/:syId`
- `/addProject`
- `/updateProject`
- `/removeProject`
- `/loadPLNBudgetCategory/:scId/:syId/:budgetYear`
- `/master_sao_policy`
- `/master_moe_policy`
- `/master_obec_policy`
- `/master_quick_win`
- `/master_sc_policy/:scId`

### 5. Project Approve Module
```bash
mkdir -p src/modules/project-approve/{entities,dto}
```

**Entity:** `pln_proj_approve`

### 6. Budget Module
```bash
mkdir -p src/modules/budget/{entities,dto}
```

**Entities:**
- `pln_budget_category`
- `pln_budget_category_detail`

### 7. Policy Module
```bash
mkdir -p src/modules/policy/{entities,dto}
```

**Entities:**
- `pln_real_budget`
- `tb_expenses`

### 8. Supplie Module
```bash
mkdir -p src/modules/supplie/{entities,dto}
```

**Entities:**
- `parcel_order`
- `parcel_detail`
- `receive_parcel_order`
- `receive_parcel_detail`

### 9. Withholding Certificate Module
```bash
mkdir -p src/modules/withholding-certificate/{entities,dto}
```

**Entity:** `withholding_certificate`

### 10. Bank Module
```bash
mkdir -p src/modules/bank/{entities,dto}
```

**Entity:** `bankaccount`

### 11. Receive Module
```bash
mkdir -p src/modules/receive/{entities,dto}
```

**Entity:** `pln_receive`

### 12. Receipt Module
```bash
mkdir -p src/modules/receipt/{entities,dto}
```

**Entity:** `receipt`

### 13. Audit Committee Module
```bash
mkdir -p src/modules/audit-committee/{entities,dto}
```

## Template สำหรับสร้างโมดูลใหม่

### 1. สร้าง Entity
```typescript
// src/modules/{module}/entities/{entity}.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('table_name')
export class EntityName {
  @PrimaryGeneratedColumn({ name: 'id_column' })
  id: number;

  @Column({ name: 'column_name', type: 'varchar', length: 255 })
  columnName: string;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'cre_date', nullable: true })
  creDate: Date;

  @UpdateDateColumn({ name: 'up_date', nullable: true })
  upDate: Date;
}
```

### 2. สร้าง DTOs
```typescript
// src/modules/{module}/dto/create-{entity}.dto.ts
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateEntityDto {
  @IsString()
  name: string;

  @IsInt()
  @IsOptional()
  sc_id?: number;

  @IsInt()
  @IsOptional()
  up_by?: number;
}
```

### 3. สร้าง Service
```typescript
// src/modules/{module}/{module}.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityName } from './entities/{entity}.entity';

@Injectable()
export class ModuleService {
  constructor(
    @InjectRepository(EntityName)
    private readonly repository: Repository<EntityName>,
  ) {}

  async load(page: number, pageSize: number) {
    const [items, count] = await this.repository.findAndCount({
      where: { del: 0 },
      order: { id: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items,
      count,
      page,
      pageSize,
    };
  }

  async create(payload: CreateEntityDto) {
    const entity = this.repository.create(payload);
    await this.repository.save(entity);
    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }

  async update(payload: UpdateEntityDto) {
    const entity = await this.repository.findOne({
      where: { id: payload.id },
    });

    if (!entity) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    Object.assign(entity, payload);
    await this.repository.save(entity);
    return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
  }

  async remove(id: number) {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    entity.del = 1;
    await this.repository.save(entity);
    return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
  }
}
```

### 4. สร้าง Controller
```typescript
// src/modules/{module}/{module}.controller.ts
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ModuleService } from './{module}.service';

@Controller('ModuleName')
export class ModuleController {
  constructor(private readonly service: ModuleService) {}

  @Post('load/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.service.load(page, pageSize);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  create(@Body() payload: CreateEntityDto) {
    return this.service.create(payload);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() payload: UpdateEntityDto) {
    return this.service.update(payload);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(@Body() payload: { id: number }) {
    return this.service.remove(payload.id);
  }
}
```

### 5. สร้าง Module
```typescript
// src/modules/{module}/{module}.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleController } from './{module}.controller';
import { ModuleService } from './{module}.service';
import { EntityName } from './entities/{entity}.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EntityName])],
  controllers: [ModuleController],
  providers: [ModuleService],
  exports: [ModuleService],
})
export class ModuleModule {}
```

### 6. เพิ่มใน AppModule
```typescript
import { ModuleModule } from './modules/{module}/{module}.module';

@Module({
  imports: [
    // ... other modules
    ModuleModule,
  ],
})
export class AppModule {}
```

## ขั้นตอนการสร้างโมดูลใหม่

1. สร้างโฟลเดอร์และไฟล์ตาม template
2. อ่าน SQL dump เพื่อดูโครงสร้างตาราง
3. สร้าง Entity ตามโครงสร้างตาราง
4. สร้าง DTOs สำหรับ create/update
5. สร้าง Service พร้อม CRUD methods
6. สร้าง Controller พร้อม endpoints
7. สร้าง Module และเพิ่มใน AppModule
8. ทดสอบ endpoints

## หมายเหตุ

### Soft Delete
- ใช้ `del` field สำหรับ soft delete
  - `del = 0` = active
  - `del = 1` = deleted

### Audit Fields
- ใช้ `up_by` สำหรับ track ผู้แก้ไข
- ใช้ `cre_date` และ `up_date` สำหรับ track เวลา

### Response Format
- **Create/Update/Delete**: `{ flag: true/false, ms: 'message' }`
- **List**: `{ data: [], count: 0, page: 0, pageSize: 0 }`

### Validation
- ใช้ DTO + ValidationPipe
- ใช้ `class-validator` สำหรับ validation rules
- ใช้ `class-transformer` สำหรับ transform data

### Database
- ใช้ TypeORM (ไม่ใช้ Prisma)
- Entity ต้อง map กับตารางจริงใน MySQL
- ดูโครงสร้างตารางจาก `../sfmisystem_db/*.sql`

## ตัวอย่างการใช้งาน

ดูตัวอย่างการสร้าง module จาก modules ที่มีอยู่แล้ว:
- `src/modules/admin/` - ตัวอย่าง AdminModule
- `src/modules/dashboard/` - ตัวอย่าง DashboardModule
- `src/modules/school-year/` - ตัวอย่าง SchoolYearModule

