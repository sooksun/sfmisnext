import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { PlnBudgetCategory } from './entities/pln-budget-category.entity';
import { PlnBudgetCategoryDetail } from './entities/pln-budget-category-detail.entity';
import { TbEstimateAcadyear } from './entities/tb-estimate-acadyear.entity';
import { MasterBudgetCategory } from './entities/master-budget-category.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { TbExpenses } from './entities/tb-expenses.entity';
import { CheckBudgetCategoryOnYearDto } from './dto/check-budget-category-on-year.dto';
import { CheckBudgetCategoryOnYearsDto } from './dto/check-budget-category-on-years.dto';
import { AddPlnBudgetCategoryDto } from './dto/add-pln-budget-category.dto';
import { AddNewBudgetCategoryDto } from './dto/add-new-budget-category.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { AddEstimateAcadyearDto } from './dto/add-estimate-acadyear.dto';
import { UpdateRealBudgetDto } from './dto/update-real-budget.dto';

@Injectable()
export class BudgetService {
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
    @InjectRepository(TbExpenses)
    private readonly tbExpensesRepository: Repository<TbExpenses>,
  ) {}

  async loadEstimateAcadyearGroup(scId: number, year: number, syId: number) {
    try {
      if (!scId || scId <= 0) {
        throw new Error('Invalid sc_id');
      }
      if (!year || year <= 0) {
        throw new Error('Invalid year');
      }
      if (!syId || syId <= 0) {
        throw new Error('Invalid sy_id');
      }

      const categories = await this.masterBudgetCategoryRepository.find({
        order: { bgCateId: 'ASC' },
      });

      if (!categories || categories.length === 0) {
        return {
          data: [],
          totalrealbudget: 0,
          totalsumbudget: 0,
        };
      }

      // Get total estimate for this school/year
      const estimate = await this.tbEstimateAcadyearRepository.findOne({
        where: {
          scId,
          syId,
          budgetYear: year.toString(),
          del: 0,
        },
      });

      const totalEstimate = estimate?.eaBudget || 0;

      // Get budget category for each category
      const data = await Promise.all(
        categories.map(async (category) => {
          try {
            // Get budget category for this school/year/category
            const plnBudget = await this.plnBudgetCategoryRepository.findOne({
              where: {
                scId,
                acadYear: syId,
                bgCateId: category.bgCateId,
                budgetYear: year.toString(),
                del: 0,
              },
            });

            // Calculate total budget from details (real_budget)
            let totalBudget = 0;
            let expenses = 0;
            if (plnBudget) {
              const details = await this.plnBudgetCategoryDetailRepository.find(
                {
                  where: {
                    pbcId: plnBudget.pbcId,
                    del: 0,
                  },
                },
              );
              totalBudget = details.reduce(
                (sum, detail) => sum + detail.budget,
                0,
              );

              // Calculate expenses from tb_expenses table
              // Get all bg_type_id from budget category details
              const bgTypeIds = details
                .map((detail) => detail.bgTypeId)
                .filter((id) => id !== null && id !== undefined);

              if (bgTypeIds.length > 0) {
                try {
                  // Get expenses for this school, budget year, and budget types
                  const expensesList = await this.tbExpensesRepository.find({
                    where: {
                      scId,
                      exYearOut: year,
                      bgTypeId: In(bgTypeIds),
                    },
                  });

                  // Sum all expenses (including pending approval - ex_status = 0)
                  expenses = expensesList.reduce(
                    (sum, exp) => sum + (exp.exMoney || 0),
                    0,
                  );
                } catch (expenseError) {
                  console.error(
                    'Error calculating expenses for category:',
                    category.bgCateId,
                    expenseError,
                  );
                  expenses = 0; // Set to 0 if error occurs
                }
              }
            }

            const categoryEstimate = totalEstimate;

            return {
              ea_id: estimate?.eaId || 0,
              bg_cate_id: category.bgCateId,
              budget_cate: category.budgetCate,
              budget_type: category.budgetCate, // For compatibility
              ea_budget: categoryEstimate,
              sum_budget: categoryEstimate, // For compatibility
              real_budget: totalBudget,
              ea_status: estimate?.eaStatus || 0,
              sc_id: scId,
              sy_id: syId,
              budget_year: year.toString(),
              expenses: expenses,
            };
          } catch (categoryError) {
            console.error(
              'Error processing category:',
              category.bgCateId,
              categoryError,
            );
            return {
              ea_id: estimate?.eaId || 0,
              bg_cate_id: category.bgCateId,
              budget_cate: category.budgetCate,
              budget_type: category.budgetCate,
              ea_budget: totalEstimate,
              sum_budget: totalEstimate,
              real_budget: 0,
              ea_status: estimate?.eaStatus || 0,
              sc_id: scId,
              sy_id: syId,
              budget_year: year.toString(),
              expenses: 0,
            };
          }
        }),
      );

      const totalrealbudget = data.reduce(
        (sum, item) => sum + item.real_budget,
        0,
      );
      const totalsumbudget = data.reduce(
        (sum, item) => sum + item.ea_budget,
        0,
      );

      return {
        data,
        totalrealbudget,
        totalsumbudget,
      };
    } catch (error) {
      console.error('loadEstimateAcadyearGroup error:', error);
      return {
        data: [],
        totalrealbudget: 0,
        totalsumbudget: 0,
      };
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

      const categories = await this.masterBudgetCategoryRepository.find({
        order: { bgCateId: 'ASC' },
      });

      const data = await Promise.all(
        categories.map(async (category) => {
          try {
            const plnBudget = await this.plnBudgetCategoryRepository.findOne({
              where: {
                scId,
                acadYear: syId,
                bgCateId: category.bgCateId,
                budgetYear,
                del: 0,
              },
            });

            // Get budget details
            let budgetIncome = 0;
            if (plnBudget) {
              const details = await this.plnBudgetCategoryDetailRepository.find(
                {
                  where: {
                    pbcId: plnBudget.pbcId,
                    del: 0,
                  },
                },
              );
              budgetIncome = details.reduce(
                (sum, detail) => sum + detail.budget,
                0,
              );
            }

            return {
              pbc_id: plnBudget?.pbcId || 0,
              bg_cate_id: category.bgCateId,
              budget_cate: category.budgetCate,
              percents: plnBudget?.percents || 0,
              total: plnBudget?.total || 0,
              budget_income: budgetIncome,
              acad_year: syId,
              budget_year: budgetYear,
            };
          } catch (categoryError) {
            console.error(
              'Error processing category:',
              category.bgCateId,
              categoryError,
            );
            return {
              pbc_id: 0,
              bg_cate_id: category.bgCateId,
              budget_cate: category.budgetCate,
              percents: 0,
              total: 0,
              budget_income: 0,
              acad_year: syId,
              budget_year: budgetYear,
            };
          }
        }),
      );

      return data;
    } catch (error) {
      console.error('loadPLNBudgetCategory error:', error);
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

      // Check if budget categories exist for this year
      const count = await this.plnBudgetCategoryRepository.count({
        where: {
          scId: payload.sc_id,
          acadYear: payload.sy_id,
          budgetYear: payload.budget_date,
          del: 0,
        },
      });

      // If no categories, create default records
      if (count === 0) {
        const categories = await this.masterBudgetCategoryRepository.find({
          order: { bgCateId: 'ASC' },
        });

        if (categories && categories.length > 0) {
          const budgetCategories = categories.map((category) => {
            const plnBudget = new PlnBudgetCategory();
            plnBudget.scId = payload.sc_id;
            plnBudget.acadYear = payload.sy_id;
            plnBudget.budgetYear = payload.budget_date;
            plnBudget.bgCateId = category.bgCateId;
            plnBudget.percents = 0;
            plnBudget.total = 0;
            plnBudget.del = 0;
            plnBudget.upBy = payload.up_by || 0;
            return plnBudget;
          });

          await this.plnBudgetCategoryRepository.save(budgetCategories);
        }
      }

      // Get total budget from estimate
      const estimate = await this.tbEstimateAcadyearRepository.findOne({
        where: {
          scId: payload.sc_id,
          syId: payload.sy_id,
          budgetYear: payload.budget_date,
          del: 0,
        },
      });

      const budget = estimate?.eaBudget || 0;

      return { valid: true, budget };
    } catch (error) {
      console.error('checkBudgetCategoryOnYear error:', error);
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

      // Get estimate budget
      const estimate = await this.tbEstimateAcadyearRepository.findOne({
        where: {
          scId: payload.sc_id,
          syId: payload.sy_id,
          budgetYear: payload.budget_date,
          del: 0,
        },
      });

      const budgetProject = estimate?.eaBudget || 0;
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
      console.error('checkBudgetCategoryOnYears error:', error);
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
      console.error('loadBudgetIncomeType error:', error);
      return [];
    }
  }

  async loadBudgetIncome(pbcId: number, _syId: number) {
    try {
      // Validate input
      if (!pbcId || pbcId <= 0) {
        return [];
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
      console.error('loadBudgetIncome error:', error);
      return [];
    }
  }

  async addPLNBudgetCategory(payload: AddPlnBudgetCategoryDto) {
    try {
      // Validate input
      if (!payload.pbc_id || payload.pbc_id <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล pbc_id' };
      }

      const plnBudget = await this.plnBudgetCategoryRepository.findOne({
        where: { pbcId: payload.pbc_id, del: 0 },
      });

      if (!plnBudget) {
        return { flag: false, ms: 'ไม่พบข้อมูลหมวดงบประมาณ' };
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

      // Get estimate for percent calculation
      const whereCondition: FindOptionsWhere<TbEstimateAcadyear> = {
        scId: plnBudget.scId,
        syId: plnBudget.acadYear,
        del: 0,
      };
      if (plnBudget.budgetYear) {
        whereCondition.budgetYear = plnBudget.budgetYear;
      }
      const estimate = await this.tbEstimateAcadyearRepository.findOne({
        where: whereCondition,
      });

      if (estimate && estimate.eaBudget > 0) {
        plnBudget.percents = (total * 100) / estimate.eaBudget;
      }

      await this.plnBudgetCategoryRepository.save(plnBudget);

      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('Add PLN Budget Category error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' +
          ((error as Error).message || 'Unknown error'),
      };
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
      console.error('Add new budget category error:', error);
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
      console.error('loadMasterBudgetCategories error:', error);
      return [];
    }
  }

  async updateEstimate(payload: UpdateEstimateDto) {
    try {
      const estimate = await this.tbEstimateAcadyearRepository.findOne({
        where: { eaId: payload.ea_id, del: 0 },
      });

      if (!estimate) {
        return { flag: false, ms: 'ไม่พบข้อมูลงบประมาณ' };
      }

      if (payload.sc_id !== undefined) {
        estimate.scId = payload.sc_id;
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
      console.error('Update estimate error:', error);
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

      // Calculate percent
      if (estimate.eaBudget > 0) {
        plnBudget.percents = (payload.real_budget * 100) / estimate.eaBudget;
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
      console.error('Update real budget error:', error);
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
      console.error('Add estimate acadyear error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการเพิ่มข้อมูล: ' +
          ((error as Error).message || 'Unknown error'),
      };
    }
  }
}
