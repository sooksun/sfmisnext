import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PlnBudgetCategory } from './entities/pln-budget-category.entity';
import { PlnBudgetCategoryDetail } from './entities/pln-budget-category-detail.entity';
import { TbEstimateAcadyear } from './entities/tb-estimate-acadyear.entity';
import { MasterBudgetCategory } from './entities/master-budget-category.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { PlnRealBudget } from '../policy/entities/pln-real-budget.entity';
import { TbExpenses } from './entities/tb-expenses.entity';
import { CheckBudgetCategoryOnYearDto } from './dto/check-budget-category-on-year.dto';
import { CheckBudgetCategoryOnYearsDto } from './dto/check-budget-category-on-years.dto';
import { AddPlnBudgetCategoryDto } from './dto/add-pln-budget-category.dto';
import { AddNewBudgetCategoryDto } from './dto/add-new-budget-category.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { AddEstimateAcadyearDto } from './dto/add-estimate-acadyear.dto';
import { UpdateRealBudgetDto } from './dto/update-real-budget.dto';
import { StudentService } from '../student/student.service';
import { PlanPrevBalanceService } from '../plan-prev-balance/plan-prev-balance.service';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    @InjectRepository(PlnBudgetCategory)
    private readonly plnBudgetCategoryRepository: Repository<PlnBudgetCategory>,
    @InjectRepository(PlnBudgetCategoryDetail)
    private readonly plnBudgetCategoryDetailRepository: Repository<PlnBudgetCategoryDetail>,
    @InjectRepository(TbEstimateAcadyear)
    private readonly tbEstimateAcadyearRepository: Repository<TbEstimateAcadyear>,
    @InjectRepository(MasterBudgetCategory)
    private readonly masterBudgetCategoryRepository: Repository<MasterBudgetCategory>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
    @InjectRepository(PlnRealBudget)
    private readonly plnRealBudgetRepository: Repository<PlnRealBudget>,
    @InjectRepository(TbExpenses)
    private readonly tbExpensesRepository: Repository<TbExpenses>,
    private readonly studentService: StudentService,
    private readonly planPrevBalanceService: PlanPrevBalanceService,
  ) {}

  /**
   * โหลดยอดประมาณการรายรับ "แยกตามประเภทเงิน" — ใช้ใน budget-category dialog (หน้า 1.7)
   *
   * ดึงสดจากการคำนวณรายหัว (หน้า 1.5) แยกตาม bg_type_id เพื่อให้รายการ/ยอด
   * ตรงกับวงเงินหมวด (= ผลรวมรายหัว) เสมอ — คีย์ด้วย `syId` ไม่ใช่ปี พ.ศ./ค.ศ.
   * ส่งกลับเฉพาะประเภทที่มียอด > 0
   */
  async loadEstimatedIncomeByType(scId: number, syId: number) {
    try {
      const byType = await this.studentService.getPerheadByType(scId, syId);
      // เงินเหลือจ่ายปีเก่า (ยืนยันแล้ว) แยกตามประเภทเงิน — บวกรวมเข้ายอดประมาณการ
      const carry = await this.planPrevBalanceService.getSummaryByType(
        scId,
        syId,
      );
      const carryByType = new Map(carry.map((c) => [c.bg_type_id, c]));

      // ปัดยอดประมาณการต่อประเภทเป็น "จำนวนเต็มบาท" — การวางแผนวงเงินงบประมาณ
      // ใช้หน่วยบาทเต็ม (เศษสตางค์จากรายหัว×สัดส่วนเป็น noise) เพื่อให้เพดานกรอก
      // และ "งบทั้งหมด" (= ผลรวมค่านี้) เป็นจำนวนเต็มชุดเดียวกัน → กรอกครบลงตัว 0 พอดี
      const round0 = (n: number) => Math.round(n);

      const merged = byType.map((it) => {
        const c = carryByType.get(it.bg_type_id);
        const carryover = c?.carryover_amount ?? 0;
        carryByType.delete(it.bg_type_id);
        return {
          ...it,
          carryover_amount: carryover,
          estimated_amount: round0(it.estimated_amount + carryover),
        };
      });

      // ประเภทเงินที่มีเฉพาะเงินเหลือจ่ายปีเก่า (ไม่มียอดรายหัว)
      for (const c of carryByType.values()) {
        merged.push({
          bg_type_id: c.bg_type_id,
          budget_type: c.budget_type,
          carryover_amount: c.carryover_amount,
          estimated_amount: round0(c.carryover_amount),
        });
      }

      return merged.filter((it) => it.estimated_amount > 0);
    } catch (error) {
      this.logger.error('loadEstimatedIncomeByType error:', error);
      return [];
    }
  }

  /**
   * หน้า 1.6 ประมาณการงบประมาณปีการศึกษา — คืน array แยก "ตามประเภทเงิน"
   * (ตรงกับ interface ฝั่ง frontend: budget_type_id/budget_type_name/estimate_amount/real_amount/remain_amount)
   *
   * - estimate_amount = ยอดประมาณการรายหัว (หน้า 1.5) แยกตามประเภทเงิน
   * - real_amount     = รายจ่ายจริงของปีงบนั้น (tb_expenses) แยกตามประเภทเงิน
   * - `year` = CE budget year (เช่น 2026); budget_year ที่คืน = พ.ศ. สำหรับแสดงผล
   */
  async loadEstimateAcadyearGroup(scId: number, year: number, syId: number) {
    if (!scId || scId <= 0 || !year || year <= 0 || !syId || syId <= 0) {
      return [];
    }

    try {
      // ประมาณการรายรับแยกตามประเภทเงิน — ดึงสดจากการคำนวณรายหัว
      const byType = await this.studentService.getPerheadByType(scId, syId);
      // เงินเหลือจ่ายปีเก่า (ยืนยันแล้ว) แยกตามประเภทเงิน
      const carry = await this.planPrevBalanceService.getSummaryByType(
        scId,
        syId,
      );
      const carryByType = new Map(carry.map((c) => [c.bg_type_id, c]));

      // รวมรายการ: ประเภทที่มีรายหัว และ/หรือ มีเงินเหลือจ่ายปีเก่า
      const merged = new Map<
        number,
        { budget_type: string; perhead: number; carryover: number }
      >();
      for (const t of byType) {
        merged.set(t.bg_type_id, {
          budget_type: t.budget_type,
          perhead: t.estimated_amount,
          carryover: 0,
        });
      }
      for (const c of carry) {
        const prev = merged.get(c.bg_type_id);
        if (prev) prev.carryover += c.carryover_amount;
        else
          merged.set(c.bg_type_id, {
            budget_type: c.budget_type,
            perhead: 0,
            carryover: c.carryover_amount,
          });
      }

      const rows = Array.from(merged.entries()).filter(
        ([, v]) => v.perhead + v.carryover > 0,
      );
      if (rows.length === 0) return [];

      // ใช้จริง (รายจ่ายจริง) แยกตามประเภทเงินจาก tb_expenses ของปีงบนั้น
      const bgTypeIds = rows.map(([id]) => id);
      const expenses = await this.tbExpensesRepository.find({
        where: { scId, exYearOut: year, bgTypeId: In(bgTypeIds) },
      });
      const usedByType = new Map<number, number>();
      for (const e of expenses) {
        if (e.bgTypeId == null) continue;
        usedByType.set(
          e.bgTypeId,
          (usedByType.get(e.bgTypeId) ?? 0) + (e.exMoney || 0),
        );
      }

      return rows.map(([bgTypeId, v]) => {
        const used = usedByType.get(bgTypeId) ?? 0;
        const total = v.perhead + v.carryover;
        return {
          budget_type_id: bgTypeId,
          budget_type_name: v.budget_type,
          estimate_amount: v.perhead, // ประมาณการรายหัว
          carryover_amount: v.carryover, // เงินเหลือจ่ายปีเก่า (บรรทัดแยก)
          total_income: total, // วงเงินรวม = รายหัว + เหลือจ่ายปีเก่า
          real_amount: used,
          remain_amount: total - used,
          budget_year: year + 543,
        };
      });
    } catch (error) {
      this.logger.error('loadEstimateAcadyearGroup error:', error);
      throw new InternalServerErrorException('โหลดข้อมูลงบประมาณล้มเหลว');
    }
  }

  async loadPLNBudgetCategory(scId: number, syId: number, budgetYear: string) {
    try {
      // Validate input
      if (!scId || scId <= 0) {
        throw new Error('Invalid sc_id');
      }
      if (!syId || syId <= 0) {
        throw new Error('Invalid sy_id');
      }
      if (!budgetYear) {
        throw new Error('Invalid budget_year');
      }

      // query 1: master categories
      const categories = await this.masterBudgetCategoryRepository.find({
        order: { bgCateId: 'ASC' },
      });

      // query 2: all pln_budget_category rows for this school/year in one shot
      const plnBudgets = await this.plnBudgetCategoryRepository.find({
        where: { scId, acadYear: syId, budgetYear, del: 0 },
      });
      // ถ้ามี row ซ้ำต่อหมวด (ข้อมูลเก่า) ให้เลือกตัวที่มียอดมากที่สุด เพื่อไม่แสดงค่าผิด
      const plnByCategory = new Map<number, (typeof plnBudgets)[number]>();
      for (const p of plnBudgets) {
        const prev = plnByCategory.get(p.bgCateId);
        if (!prev || (p.total ?? 0) > (prev.total ?? 0)) {
          plnByCategory.set(p.bgCateId, p);
        }
      }

      // query 3: all details for those pbc_ids in one shot
      const pbcIds = plnBudgets.map((p) => p.pbcId);
      const allDetails = pbcIds.length
        ? await this.plnBudgetCategoryDetailRepository.find({
            where: { pbcId: In(pbcIds), del: 0 },
          })
        : [];
      const incomeSumByPbc = new Map<number, number>();
      for (const d of allDetails) {
        if (d.pbcId != null) {
          incomeSumByPbc.set(
            d.pbcId,
            (incomeSumByPbc.get(d.pbcId) ?? 0) + (d.budget ?? 0),
          );
        }
      }

      const data = categories.map((category) => {
        const plnBudget = plnByCategory.get(category.bgCateId);
        return {
          pbc_id: plnBudget?.pbcId ?? 0,
          bg_cate_id: category.bgCateId,
          budget_cate: category.budgetCate,
          percents: plnBudget?.percents ?? 0,
          total: plnBudget?.total ?? 0,
          budget_income: plnBudget
            ? (incomeSumByPbc.get(plnBudget.pbcId) ?? 0)
            : 0,
          acad_year: syId,
          budget_year: budgetYear,
        };
      });

      return data;
    } catch (error) {
      this.logger.error('loadPLNBudgetCategory error:', error);
      return [];
    }
  }

  async checkBudgetCategoryOnYear(payload: CheckBudgetCategoryOnYearDto) {
    try {
      // Validate input
      if (!payload.sc_id || payload.sc_id <= 0) {
        return { valid: false, budget: 0, error: 'Invalid sc_id' };
      }
      if (!payload.sy_id || payload.sy_id <= 0) {
        return { valid: false, budget: 0, error: 'Invalid sy_id' };
      }
      if (!payload.budget_date) {
        return { valid: false, budget: 0, error: 'Invalid budget_date' };
      }

      // สร้างหมวดงบ "เฉพาะที่ยังไม่มี" (idempotent) — กันการสร้างซ้ำเมื่อ endpoint
      // ถูกเรียกซ้อน (เช่น React StrictMode เรียก effect 2 ครั้งใน dev)
      const categories = await this.masterBudgetCategoryRepository.find({
        order: { bgCateId: 'ASC' },
      });
      const existing = await this.plnBudgetCategoryRepository.find({
        where: {
          scId: payload.sc_id,
          acadYear: payload.sy_id,
          budgetYear: payload.budget_date,
          del: 0,
        },
      });
      const existingCateIds = new Set(existing.map((e) => e.bgCateId));
      const missing = (categories ?? []).filter(
        (c) => !existingCateIds.has(c.bgCateId),
      );
      if (missing.length > 0) {
        // insert().orIgnore() — กัน race ระหว่างคำขอที่เกือบพร้อมกัน
        await this.plnBudgetCategoryRepository
          .createQueryBuilder()
          .insert()
          .orIgnore()
          .values(
            missing.map((category) => ({
              scId: payload.sc_id,
              acadYear: payload.sy_id,
              budgetYear: payload.budget_date,
              bgCateId: category.bgCateId,
              percents: 0,
              total: 0,
              del: 0,
              upBy: payload.up_by || 0,
            })),
          )
          .execute();
      }

      // ยอดประมาณการ = ผลรวมรายหัว (หน้า 1.5) + เงินเหลือจ่ายปีเก่า (หน้า 1.2)
      const [perhead, carryover] = await Promise.all([
        this.studentService.getPerheadTotal(payload.sc_id, payload.sy_id),
        this.planPrevBalanceService.getCarryoverTotal(
          payload.sc_id,
          payload.sy_id,
        ),
      ]);

      // วงเงินที่ "กรอกได้จริง" = ผลรวมของยอดประมาณการแยกประเภท (เพดานต่อประเภท)
      // ใช้ตัวเลขชุดเดียวกับที่ dialog หน้า 1.7 ใช้เป็นเพดานกรอก (loadEstimatedIncomeByType)
      // เพื่อให้ "งบทั้งหมด" = ผลรวมเพดาน → กรอกครบแล้วคงเหลือ = 0 พอดี (ไม่เหลือเศษจาก
      // การปัด/ความต่างของ float ระหว่างยอดรวมกับยอดแยกประเภท)
      const byType = await this.loadEstimatedIncomeByType(
        payload.sc_id,
        payload.sy_id,
      );
      const round2 = (n: number) => Math.round(n * 100) / 100;
      const budget = round2(
        byType.reduce((s, it) => s + (it.estimated_amount || 0), 0),
      );

      return {
        valid: true,
        budget,
        perhead: round2(perhead),
        carryover: round2(carryover),
      };
    } catch (error) {
      this.logger.error('checkBudgetCategoryOnYear error:', error);
      return {
        valid: false,
        budget: 0,
        error: (error as Error).message || 'Unknown error',
      };
    }
  }

  async checkBudgetCategoryOnYears(payload: CheckBudgetCategoryOnYearsDto) {
    try {
      // Validate input
      if (!payload.pbc_id || payload.pbc_id <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล pbc_id' };
      }
      if (!payload.sc_id || payload.sc_id <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล sc_id' };
      }
      if (!payload.sy_id || payload.sy_id <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล sy_id' };
      }
      if (!payload.budget_date) {
        return { flag: false, ms: 'ไม่พบข้อมูล budget_date' };
      }

      const plnBudget = await this.plnBudgetCategoryRepository.findOne({
        where: {
          pbcId: payload.pbc_id,
          scId: payload.sc_id,
          acadYear: payload.sy_id,
          budgetYear: payload.budget_date,
          del: 0,
        },
      });

      if (!plnBudget) {
        return { flag: false, ms: 'ไม่พบข้อมูลหมวดงบประมาณ' };
      }

      // Get total budget from details
      const details = await this.plnBudgetCategoryDetailRepository.find({
        where: {
          pbcId: plnBudget.pbcId,
          del: 0,
        },
      });

      const totalBudgetGroup = details.reduce(
        (sum, detail) => sum + detail.budget,
        0,
      );

      // ยอดประมาณการ = ผลรวมรายหัว (หน้า 1.5) + เงินเหลือจ่ายปีเก่า (หน้า 1.2)
      const [perhead, carryover] = await Promise.all([
        this.studentService.getPerheadTotal(payload.sc_id, payload.sy_id),
        this.planPrevBalanceService.getCarryoverTotal(
          payload.sc_id,
          payload.sy_id,
        ),
      ]);
      const budgetProject = perhead + carryover;
      const balanceBudget = budgetProject - totalBudgetGroup;
      const percent =
        budgetProject > 0 ? (totalBudgetGroup * 100) / budgetProject : 0;

      return {
        pbc_id: plnBudget.pbcId,
        budgetProject,
        totalBudgetGroup,
        balance_budget: balanceBudget,
        percent: percent.toFixed(2),
      };
    } catch (error) {
      this.logger.error('checkBudgetCategoryOnYears error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการตรวจสอบงบประมาณ: ' +
          ((error as Error).message || 'Unknown error'),
      };
    }
  }

  async loadBudgetIncomeType() {
    try {
      const items = await this.budgetIncomeTypeRepository.find({
        where: { del: 0 },
        order: { bgTypeId: 'ASC' },
      });

      return items.map((item) => ({
        bg_type_id: item.bgTypeId,
        budget_type: item.budgetType,
        budget_type_calc: item.budgetTypeCalc,
        budget_borrow_type: item.budgetBorrowType,
        spacial_type: item.spacialType,
      }));
    } catch (error) {
      this.logger.error('loadBudgetIncomeType error:', error);
      return [];
    }
  }

  async loadBudgetIncome(
    pbcId: number,
    _syId: number,
    userScId?: number,
    userType?: number,
  ) {
    try {
      if (!pbcId || pbcId <= 0) {
        return [];
      }

      if (userType !== undefined && userType !== 1 && userScId !== undefined) {
        const category = await this.plnBudgetCategoryRepository.findOne({
          where: { pbcId, del: 0 },
        });
        if (!category || category.scId !== userScId) {
          throw new ForbiddenException(
            'ไม่มีสิทธิ์เข้าถึงข้อมูลงบประมาณของโรงเรียนนี้',
          );
        }
      }

      const details = await this.plnBudgetCategoryDetailRepository.find({
        where: {
          pbcId,
          del: 0,
        },
        relations: [],
      });

      // Get budget income types
      const budgetTypes = await this.budgetIncomeTypeRepository.find({
        where: { del: 0 },
      });

      return details.map((detail) => {
        const budgetType = budgetTypes.find(
          (bt) => bt.bgTypeId === detail.bgTypeId,
        );
        return {
          pbcd_id: detail.pbcdId,
          bg_type_id: detail.bgTypeId,
          budget_type: budgetType?.budgetType || '',
          budget: detail.budget,
          budget_year: detail.budgetYear,
        };
      });
    } catch (error) {
      this.logger.error('loadBudgetIncome error:', error);
      return [];
    }
  }

  async loadBudgetIncomeTypeSummary(
    scId: number,
    syId: number,
    budgetYear: string,
  ) {
    try {
      const incomeTypes = await this.budgetIncomeTypeRepository.find({
        where: { del: 0 },
      });
      const categories = await this.plnBudgetCategoryRepository.find({
        where: { scId, acadYear: syId, budgetYear, del: 0 },
      });
      if (!categories.length) {
        return incomeTypes.map((it) => ({
          bg_type_id: it.bgTypeId,
          budget_type: it.budgetType,
          total_allocated: 0,
        }));
      }
      const pbcIds = categories.map((c) => c.pbcId);
      const details = await this.plnBudgetCategoryDetailRepository.find({
        where: { pbcId: In(pbcIds), del: 0 },
      });
      const map = new Map<number, number>();
      for (const d of details) {
        if (d.bgTypeId != null)
          map.set(d.bgTypeId, (map.get(d.bgTypeId) ?? 0) + d.budget);
      }
      return incomeTypes.map((it) => ({
        bg_type_id: it.bgTypeId,
        budget_type: it.budgetType,
        total_allocated: map.get(it.bgTypeId) ?? 0,
      }));
    } catch (error) {
      this.logger.error('loadBudgetIncomeTypeSummary error:', error);
      return [];
    }
  }

  async addPLNBudgetCategory(
    payload: AddPlnBudgetCategoryDto,
    userScId?: number,
    userType?: number,
  ) {
    try {
      if (!payload.pbc_id || payload.pbc_id <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล pbc_id' };
      }

      const plnBudget = await this.plnBudgetCategoryRepository.findOne({
        where: { pbcId: payload.pbc_id, del: 0 },
      });

      if (!plnBudget) {
        return { flag: false, ms: 'ไม่พบข้อมูลหมวดงบประมาณ' };
      }

      if (userType !== undefined && userType !== 1 && userScId !== undefined) {
        if (plnBudget.scId !== userScId) {
          throw new ForbiddenException(
            'ไม่มีสิทธิ์แก้ไขงบประมาณของโรงเรียนนี้',
          );
        }
      }
      // Delete old details if specified
      if (payload.budget_del && payload.budget_del.length > 0) {
        for (const delItem of payload.budget_del as { pbcd_id?: number }[]) {
          if (delItem.pbcd_id) {
            const detail = await this.plnBudgetCategoryDetailRepository.findOne(
              {
                where: { pbcdId: delItem.pbcd_id, del: 0 },
              },
            );
            if (detail) {
              detail.del = 1;
              await this.plnBudgetCategoryDetailRepository.save(detail);
            }
          }
        }
      }

      // Save or update details
      for (const item of payload.bit_group) {
        if (item.pbcd_id && item.pbcd_id > 0) {
          // Update existing
          const detail = await this.plnBudgetCategoryDetailRepository.findOne({
            where: { pbcdId: item.pbcd_id, del: 0 },
          });
          if (detail) {
            detail.bgTypeId = item.bg_type_id;
            detail.budget = item.budget;
            detail.budgetYear = item.budget_year || plnBudget.acadYear;
            detail.updateDate = new Date();
            await this.plnBudgetCategoryDetailRepository.save(detail);
          }
        } else {
          // Create new
          const detail = new PlnBudgetCategoryDetail();
          detail.pbcId = payload.pbc_id;
          detail.bgTypeId = item.bg_type_id;
          detail.budget = item.budget;
          detail.budgetYear = item.budget_year || plnBudget.acadYear;
          detail.del = 0;
          detail.upBy = payload.up_by || 0;
          await this.plnBudgetCategoryDetailRepository.save(detail);
        }
      }

      // Update total and percent
      const details = await this.plnBudgetCategoryDetailRepository.find({
        where: {
          pbcId: payload.pbc_id,
          del: 0,
        },
      });

      const total = details.reduce((sum, detail) => sum + detail.budget, 0);
      plnBudget.total = total;

      // สัดส่วน % คิดจากยอดประมาณการสด (การคำนวณรายหัว) ให้ฐานตรงกับหน้า 1.5/1.7
      const estimateTotal = await this.studentService.getPerheadTotal(
        plnBudget.scId,
        plnBudget.acadYear,
      );
      if (estimateTotal > 0) {
        plnBudget.percents = (total * 100) / estimateTotal;
      }

      await this.plnBudgetCategoryRepository.save(plnBudget);

      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      this.logger.error('Add PLN Budget Category error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' +
          ((error as Error).message || 'Unknown error'),
      };
    }
  }

  /**
   * ลบหมวดงบประมาณ (soft-delete) พร้อมรายละเอียดยอดเงินในหมวดนั้น
   * ตรวจ tenancy: ผู้ใช้ที่ไม่ใช่ super admin ลบได้เฉพาะหมวดของโรงเรียนตนเอง
   */
  async removePLNBudgetCategory(
    pbcId: number,
    userScId?: number,
    userType?: number,
    upBy?: number,
  ) {
    try {
      if (!pbcId || pbcId <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล pbc_id' };
      }

      const plnBudget = await this.plnBudgetCategoryRepository.findOne({
        where: { pbcId, del: 0 },
      });
      if (!plnBudget) {
        return { flag: false, ms: 'ไม่พบข้อมูลหมวดงบประมาณ' };
      }

      if (
        userType !== undefined &&
        userType !== 1 &&
        userScId !== undefined &&
        plnBudget.scId !== userScId
      ) {
        throw new ForbiddenException('ไม่มีสิทธิ์ลบงบประมาณของโรงเรียนนี้');
      }

      // soft-delete รายละเอียดยอดเงินในหมวดนี้
      const details = await this.plnBudgetCategoryDetailRepository.find({
        where: { pbcId, del: 0 },
      });
      for (const d of details) {
        d.del = 1;
        d.updateDate = new Date();
        await this.plnBudgetCategoryDetailRepository.save(d);
      }

      // soft-delete หมวดงบ
      plnBudget.del = 1;
      if (upBy !== undefined) plnBudget.upBy = upBy;
      plnBudget.updateDate = new Date();
      await this.plnBudgetCategoryRepository.save(plnBudget);

      return { flag: true, ms: 'ลบหมวดงบประมาณเรียบร้อยแล้ว' };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error('Remove PLN Budget Category error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการลบหมวดงบประมาณ' };
    }
  }

  async addNewBudgetCategory(payload: AddNewBudgetCategoryDto) {
    try {
      // Validate input
      if (!payload.sc_id || payload.sc_id <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล sc_id' };
      }
      if (!payload.sy_id || payload.sy_id <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล sy_id' };
      }
      if (!payload.bg_cate_id || payload.bg_cate_id <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล bg_cate_id' };
      }
      if (!payload.budget_year) {
        return { flag: false, ms: 'ไม่พบข้อมูล budget_year' };
      }

      // Check if budget category already exists for this school/year/category
      const existing = await this.plnBudgetCategoryRepository.findOne({
        where: {
          scId: payload.sc_id,
          acadYear: payload.sy_id,
          bgCateId: payload.bg_cate_id,
          budgetYear: payload.budget_year,
          del: 0,
        },
      });

      if (existing) {
        return { flag: false, ms: 'กลุ่มงานนี้มีอยู่แล้วในปีงบประมาณนี้' };
      }

      // Get estimate for percent calculation
      const estimate = await this.tbEstimateAcadyearRepository.findOne({
        where: {
          scId: payload.sc_id,
          syId: payload.sy_id,
          budgetYear: payload.budget_year,
          del: 0,
        },
      });

      if (!estimate) {
        return {
          flag: false,
          ms: 'ไม่พบข้อมูลงบประมาณรวมรายปี กรุณากำหนดงบประมาณรวมรายปีก่อน',
        };
      }

      // Create new budget category
      const plnBudget = new PlnBudgetCategory();
      plnBudget.scId = payload.sc_id;
      plnBudget.acadYear = payload.sy_id;
      plnBudget.budgetYear = payload.budget_year;
      plnBudget.bgCateId = payload.bg_cate_id;
      plnBudget.percents = 0;
      plnBudget.total = 0;
      plnBudget.del = 0;
      plnBudget.upBy = payload.up_by || 0;
      plnBudget.createDate = new Date();
      plnBudget.updateDate = new Date();

      await this.plnBudgetCategoryRepository.save(plnBudget);

      return {
        flag: true,
        ms: 'เพิ่มการจัดสรรสำเร็จ',
        pbc_id: plnBudget.pbcId,
      };
    } catch (error) {
      this.logger.error('Add new budget category error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการเพิ่มการจัดสรร: ' +
          ((error as Error).message || 'Unknown error'),
      };
    }
  }

  async loadMasterBudgetCategories() {
    try {
      const categories = await this.masterBudgetCategoryRepository.find({
        order: { bgCateId: 'ASC' },
      });

      return categories.map((category) => ({
        bg_cate_id: category.bgCateId,
        budget_cate: category.budgetCate,
      }));
    } catch (error) {
      this.logger.error('loadMasterBudgetCategories error:', error);
      return [];
    }
  }

  async updateEstimate(
    payload: UpdateEstimateDto,
    userScId?: number,
    userType?: number,
  ) {
    try {
      const estimate = await this.tbEstimateAcadyearRepository.findOne({
        where: { eaId: payload.ea_id, del: 0 },
      });

      if (!estimate) {
        return { flag: false, ms: 'ไม่พบข้อมูลงบประมาณ' };
      }

      // ตรวจ tenant โดยใช้ sc_id จาก DB record (ไม่ใช่จาก body)
      if (userType !== undefined && userType !== 1 && userScId !== undefined) {
        if (estimate.scId !== userScId) {
          throw new ForbiddenException(
            'ไม่มีสิทธิ์แก้ไขงบประมาณของโรงเรียนนี้',
          );
        }
      }
      if (payload.ea_status !== undefined) {
        estimate.eaStatus = payload.ea_status;
      }
      if (payload.real_budget !== undefined) {
        estimate.realBudget = payload.real_budget;
      }

      estimate.updateDate = new Date();

      await this.tbEstimateAcadyearRepository.save(estimate);
      return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
    } catch (error) {
      this.logger.error('Update estimate error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการอัปเดตข้อมูล: ' +
          ((error as Error).message || 'Unknown error'),
      };
    }
  }

  async updateRealBudget(payload: UpdateRealBudgetDto) {
    try {
      // Validate input
      if (!payload.pbc_id || payload.pbc_id <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล pbc_id' };
      }

      if (payload.real_budget < 0) {
        return { flag: false, ms: 'งบประมาณจริงต้องมากกว่าหรือเท่ากับ 0' };
      }

      // Find budget category
      const plnBudget = await this.plnBudgetCategoryRepository.findOne({
        where: {
          pbcId: payload.pbc_id,
          scId: payload.sc_id,
          acadYear: payload.sy_id,
          del: 0,
        },
      });

      if (!plnBudget) {
        return { flag: false, ms: 'ไม่พบข้อมูลหมวดงบประมาณ' };
      }

      // Get estimate for percent calculation
      if (!plnBudget.budgetYear) {
        return { flag: false, ms: 'ไม่พบข้อมูลปีงบประมาณในหมวดงบประมาณ' };
      }

      const estimate = await this.tbEstimateAcadyearRepository.findOne({
        where: {
          scId: payload.sc_id,
          syId: payload.sy_id,
          budgetYear: plnBudget.budgetYear,
          del: 0,
        },
      });

      if (!estimate) {
        return { flag: false, ms: 'ไม่พบข้อมูลงบประมาณรวมรายปี' };
      }

      // Update total in pln_budget_category
      plnBudget.total = payload.real_budget;

      // สัดส่วน % คิดจากยอดประมาณการสด (การคำนวณรายหัว) ให้ฐานตรงกับหน้า 1.5/1.7
      const estimateTotal = await this.studentService.getPerheadTotal(
        payload.sc_id,
        payload.sy_id,
      );
      if (estimateTotal > 0) {
        plnBudget.percents = (payload.real_budget * 100) / estimateTotal;
      } else {
        plnBudget.percents = 0;
      }

      plnBudget.updateDate = new Date();
      if (payload.up_by) {
        plnBudget.upBy = payload.up_by;
      }

      await this.plnBudgetCategoryRepository.save(plnBudget);

      return { flag: true, ms: 'อัปเดตงบประมาณจริงสำเร็จ' };
    } catch (error) {
      this.logger.error('Update real budget error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการอัปเดตงบประมาณจริง: ' +
          ((error as Error).message || 'Unknown error'),
      };
    }
  }

  async addEstimateAcadyear(payload: AddEstimateAcadyearDto) {
    // Check if estimate already exists
    const existing = await this.tbEstimateAcadyearRepository.findOne({
      where: {
        scId: payload.sc_id,
        syId: payload.sy_id,
        budgetYear: payload.budget_year,
        del: 0,
      },
    });

    if (existing) {
      return {
        flag: false,
        ms: 'มีข้อมูลงบประมาณรวมรายปีสำหรับปีงบประมาณนี้อยู่แล้ว',
      };
    }

    try {
      const estimate = new TbEstimateAcadyear();
      estimate.scId = payload.sc_id;
      estimate.syId = payload.sy_id;
      estimate.budgetYear = payload.budget_year;
      estimate.eaBudget = payload.ea_budget;
      estimate.realBudget = 0;
      estimate.eaStatus = payload.ea_status || 0;
      estimate.del = 0;
      estimate.upBy = payload.up_by || 0;
      estimate.createDate = new Date();
      estimate.updateDate = new Date();

      const saved = await this.tbEstimateAcadyearRepository.save(estimate);

      // Create default budget categories if they don't exist
      const categories = await this.masterBudgetCategoryRepository.find({
        order: { bgCateId: 'ASC' },
      });

      const existingCategories = await this.plnBudgetCategoryRepository.find({
        where: {
          scId: payload.sc_id,
          acadYear: payload.sy_id,
          budgetYear: payload.budget_year,
          del: 0,
        },
      });

      if (existingCategories.length === 0) {
        const budgetCategories = categories.map((category) => {
          const plnBudget = new PlnBudgetCategory();
          plnBudget.scId = payload.sc_id;
          plnBudget.acadYear = payload.sy_id;
          plnBudget.budgetYear = payload.budget_year;
          plnBudget.bgCateId = category.bgCateId;
          plnBudget.percents = 0;
          plnBudget.total = 0;
          plnBudget.del = 0;
          plnBudget.upBy = payload.up_by || 0;
          plnBudget.createDate = new Date();
          plnBudget.updateDate = new Date();
          return plnBudget;
        });

        await this.plnBudgetCategoryRepository.save(budgetCategories);
      }

      return {
        flag: true,
        ms: 'เพิ่มข้อมูลงบประมาณรวมรายปีสำเร็จ',
        ea_id: saved.eaId,
      };
    } catch (error) {
      this.logger.error('Add estimate acadyear error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการเพิ่มข้อมูล: ' +
          ((error as Error).message || 'Unknown error'),
      };
    }
  }

  /**
   * สถานะการยืนยันงบประมาณรวมรายปี (หน้า "งบประมาณรวมรายปี")
   * คืนยอดที่ยืนยันไว้ + สถานะ confirmed เพื่อให้หน้าจอรู้ว่ายืนยันแล้วหรือยัง
   * - budgetYear = CE string (เช่น "2026") ให้ตรงกับ pln_budget_category
   */
  async loadEstimateAcadyearStatus(
    scId: number,
    syId: number,
    budgetYear: string,
  ) {
    const row = await this.tbEstimateAcadyearRepository.findOne({
      where: { scId, syId, budgetYear, del: 0 },
    });
    return {
      confirmed: row?.eaStatus === 1,
      ea_budget: row?.eaBudget ?? 0,
      update_date: row?.updateDate ?? null,
    };
  }

  /**
   * ยืนยันงบประมาณรวมรายปี — ตรึงยอดรวม (รายหัว + เงินเหลือจ่ายปีเก่า) เป็นวงเงินที่ใช้
   * พิจารณาจัดสรรแผนงาน/โครงการตลอดปี (ea_status = 1)
   * ยอดคำนวณฝั่ง server ให้ตรงกับที่หน้าจอแสดงเสมอ (ไม่รับยอดจาก client)
   */
  async confirmEstimateAcadyear(payload: {
    sc_id: number;
    sy_id: number;
    budget_year: string;
    up_by?: number;
  }) {
    try {
      const [perhead, carryover] = await Promise.all([
        this.studentService.getPerheadTotal(payload.sc_id, payload.sy_id),
        this.planPrevBalanceService.getCarryoverTotal(
          payload.sc_id,
          payload.sy_id,
        ),
      ]);
      const total = perhead + carryover;
      if (total <= 0) {
        return {
          flag: false,
          ms: 'ยังไม่มียอดงบประมาณให้ยืนยัน — กรุณาตรวจสอบการคำนวณรายหัว/เงินเหลือจ่ายปีเก่า',
        };
      }

      let row = await this.tbEstimateAcadyearRepository.findOne({
        where: {
          scId: payload.sc_id,
          syId: payload.sy_id,
          budgetYear: payload.budget_year,
          del: 0,
        },
      });
      if (!row) {
        row = new TbEstimateAcadyear();
        row.scId = payload.sc_id;
        row.syId = payload.sy_id;
        row.budgetYear = payload.budget_year;
        row.realBudget = 0;
        row.del = 0;
        row.createDate = new Date();
      }
      row.eaBudget = total;
      row.eaStatus = 1;
      row.upBy = payload.up_by ?? 0;
      row.updateDate = new Date();
      await this.tbEstimateAcadyearRepository.save(row);

      return {
        flag: true,
        ms: `ยืนยันงบประมาณรวมรายปีเรียบร้อย (${total.toLocaleString('th-TH')} บาท)`,
        ea_budget: total,
      };
    } catch (error) {
      this.logger.error('confirmEstimateAcadyear error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการยืนยันงบประมาณ: ' +
          ((error as Error).message || 'Unknown error'),
      };
    }
  }
}
