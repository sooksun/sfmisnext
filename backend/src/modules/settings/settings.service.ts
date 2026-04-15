import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterScPolicy } from './entities/master-sc-policy.entity';
import { MasterObecPolicy } from './entities/master-obec-policy.entity';
import { MasterSao } from './entities/master-sao.entity';
import { MasterSaoPolicy } from './entities/master-sao-policy.entity';
import { MasterMoePolicy } from './entities/master-moe-policy.entity';
import { MasterQuickWin } from './entities/master-quick-win.entity';
import { MasterCbLevel } from './entities/master-cb-level.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { CreateSchoolPolicyDto } from './dto/create-school-policy.dto';
import { UpdateSchoolPolicyDto } from './dto/update-school-policy.dto';
import { CreateObecPolicyDto } from './dto/create-obec-policy.dto';
import { UpdateObecPolicyDto } from './dto/update-obec-policy.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(MasterScPolicy)
    private readonly masterScPolicyRepository: Repository<MasterScPolicy>,
    @InjectRepository(MasterObecPolicy)
    private readonly masterObecPolicyRepository: Repository<MasterObecPolicy>,
    @InjectRepository(MasterSao)
    private readonly masterSaoRepository: Repository<MasterSao>,
    @InjectRepository(MasterSaoPolicy)
    private readonly masterSaoPolicyRepository: Repository<MasterSaoPolicy>,
    @InjectRepository(MasterMoePolicy)
    private readonly masterMoePolicyRepository: Repository<MasterMoePolicy>,
    @InjectRepository(MasterQuickWin)
    private readonly masterQuickWinRepository: Repository<MasterQuickWin>,
    @InjectRepository(MasterCbLevel)
    private readonly masterCbLevelRepository: Repository<MasterCbLevel>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
  ) {}

  // School Policy
  async loadSchoolPolicy(scId: number, page: number, pageSize: number) {
    const [items, count] = await this.masterScPolicyRepository.findAndCount({
      where: { scId, del: 0 },
      order: { scpId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((item) => ({
        scp_id: item.scpId,
        sc_id: item.scId,
        sc_policy: item.scPolicy,
        up_by: item.upBy,
        create_date: item.createDate,
        update_date: item.updateDate,
        del: item.del,
      })),
      count,
      page,
      pageSize,
    };
  }

  async addSchoolPolicy(payload: CreateSchoolPolicyDto) {
    const policy = new MasterScPolicy();
    policy.scId = payload.sc_id;
    policy.scPolicy = payload.sc_policy;
    policy.upBy = payload.up_by;
    policy.del = 0;

    try {
      await this.masterScPolicyRepository.save(policy);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('Add school policy error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async updateSchoolPolicy(payload: UpdateSchoolPolicyDto) {
    const policy = await this.masterScPolicyRepository.findOne({
      where: { scpId: payload.scp_id, del: 0 },
    });

    if (!policy) {
      return { flag: false, ms: 'ไม่พบข้อมูลนโยบายโรงเรียน' };
    }

    if (payload.sc_id !== undefined) {
      policy.scId = payload.sc_id;
    }
    if (payload.sc_policy !== undefined) {
      policy.scPolicy = payload.sc_policy;
    }
    if (payload.up_by !== undefined) {
      policy.upBy = payload.up_by;
    }

    policy.updateDate = new Date();

    try {
      await this.masterScPolicyRepository.save(policy);
      return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('Update school policy error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
  }

  async removeSchoolPolicy(payload: { scp_id: number }) {
    const policy = await this.masterScPolicyRepository.findOne({
      where: { scpId: payload.scp_id, del: 0 },
    });

    if (!policy) {
      return '0';
    }

    policy.del = 1;
    policy.updateDate = new Date();

    try {
      await this.masterScPolicyRepository.save(policy);
      return '1';
    } catch (error) {
      console.error('Remove school policy error:', error);
      return '0';
    }
  }

  // OBEC Policy
  async loadObecPolicy(page: number, pageSize: number) {
    const [items, count] = await this.masterObecPolicyRepository.findAndCount({
      where: { del: 0 },
      order: { id: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((item) => ({
        id: item.id,
        obec_policy: item.obecPolicy,
        detail: item.detail,
        up_by: item.upBy,
        create_date: item.createDate,
        update_date: item.updateDate,
        del: item.del,
      })),
      count,
      page,
      pageSize,
    };
  }

  async addObecPolicy(payload: CreateObecPolicyDto) {
    const policy = new MasterObecPolicy();
    policy.obecPolicy = payload.obec_policy;
    policy.detail = payload.detail || null;
    policy.upBy = payload.up_by;
    policy.del = 0;

    try {
      await this.masterObecPolicyRepository.save(policy);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('Add OBEC policy error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async updateObecPolicy(payload: UpdateObecPolicyDto) {
    const policy = await this.masterObecPolicyRepository.findOne({
      where: { id: payload.id, del: 0 },
    });

    if (!policy) {
      return { flag: false, ms: 'ไม่พบข้อมูลนโยบาย สพท' };
    }

    if (payload.obec_policy !== undefined) {
      policy.obecPolicy = payload.obec_policy;
    }
    if (payload.detail !== undefined) {
      policy.detail = payload.detail;
    }
    if (payload.up_by !== undefined) {
      policy.upBy = payload.up_by;
    }

    policy.updateDate = new Date();

    try {
      await this.masterObecPolicyRepository.save(policy);
      return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('Update OBEC policy error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
  }

  async removeObecPolicy(payload: { id: number }) {
    const policy = await this.masterObecPolicyRepository.findOne({
      where: { id: payload.id, del: 0 },
    });

    if (!policy) {
      return '0';
    }

    policy.del = 1;
    policy.updateDate = new Date();

    try {
      await this.masterObecPolicyRepository.save(policy);
      return '1';
    } catch (error) {
      console.error('Remove OBEC policy error:', error);
      return '0';
    }
  }

  // SAO Policy
  async loadSaoPolicy(page: number, pageSize: number) {
    const [items, count] = await this.masterSaoPolicyRepository.findAndCount({
      where: { del: 0 },
      order: { saoPolicyId: 'ASC' },
      skip: page * pageSize,
      take: pageSize,
    });
    return {
      data: items.map((item) => ({
        sao_policy_id: item.saoPolicyId,
        sao_policy_name: item.saoPolicyName,
        del: item.del,
        up_by: item.upBy,
        create_date: item.createDate,
        update_date: item.updateDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  async addSaoPolicy(payload: any) {
    const item = new MasterSaoPolicy();
    item.saoPolicyName = payload.sao_policy_name;
    item.upBy = payload.up_by ?? null;
    item.del = 0;
    try {
      await this.masterSaoPolicyRepository.save(item);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('addSaoPolicy error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async updateSaoPolicy(payload: any) {
    if (!payload.sao_policy_id) return { flag: false, ms: 'ไม่พบ sao_policy_id' };
    const item = await this.masterSaoPolicyRepository.findOne({
      where: { saoPolicyId: payload.sao_policy_id, del: 0 },
    });
    if (!item) return { flag: false, ms: 'ไม่พบข้อมูล' };
    if (payload.sao_policy_name !== undefined) item.saoPolicyName = payload.sao_policy_name;
    if (payload.up_by !== undefined) item.upBy = payload.up_by;
    try {
      await this.masterSaoPolicyRepository.save(item);
      return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('updateSaoPolicy error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
  }

  async removeSaoPolicy(payload: any) {
    if (!payload.sao_policy_id) return { flag: false, ms: 'ไม่พบ sao_policy_id' };
    const item = await this.masterSaoPolicyRepository.findOne({
      where: { saoPolicyId: payload.sao_policy_id, del: 0 },
    });
    if (!item) return { flag: false, ms: 'ไม่พบข้อมูล' };
    item.del = 1;
    try {
      await this.masterSaoPolicyRepository.save(item);
      return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('removeSaoPolicy error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
    }
  }

  // MOE Policy
  async loadMoePolicy(page: number, pageSize: number) {
    const [items, count] = await this.masterMoePolicyRepository.findAndCount({
      where: { del: 0 },
      order: { moePolicyId: 'ASC' },
      skip: page * pageSize,
      take: pageSize,
    });
    return {
      data: items.map((item) => ({
        moe_policy_id: item.moePolicyId,
        policy_name: item.policyName,
        policy_detail: item.policyDetail ?? '',
        del: item.del,
        up_by: item.upBy,
        create_date: item.createDate,
        update_date: item.updateDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  async addMoePolicy(payload: any) {
    const item = new MasterMoePolicy();
    item.policyName = payload.policy_name;
    item.policyDetail = payload.policy_detail ?? null;
    item.upBy = payload.up_by ?? null;
    item.del = 0;
    try {
      await this.masterMoePolicyRepository.save(item);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('addMoePolicy error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async updateMoePolicy(payload: any) {
    if (!payload.moe_policy_id) return { flag: false, ms: 'ไม่พบ moe_policy_id' };
    const item = await this.masterMoePolicyRepository.findOne({
      where: { moePolicyId: payload.moe_policy_id, del: 0 },
    });
    if (!item) return { flag: false, ms: 'ไม่พบข้อมูล' };
    if (payload.policy_name !== undefined) item.policyName = payload.policy_name;
    if (payload.policy_detail !== undefined) item.policyDetail = payload.policy_detail;
    if (payload.up_by !== undefined) item.upBy = payload.up_by;
    try {
      await this.masterMoePolicyRepository.save(item);
      return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('updateMoePolicy error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
  }

  async removeMoePolicy(payload: any) {
    if (!payload.moe_policy_id) return { flag: false, ms: 'ไม่พบ moe_policy_id' };
    const item = await this.masterMoePolicyRepository.findOne({
      where: { moePolicyId: payload.moe_policy_id, del: 0 },
    });
    if (!item) return { flag: false, ms: 'ไม่พบข้อมูล' };
    item.del = 1;
    try {
      await this.masterMoePolicyRepository.save(item);
      return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('removeMoePolicy error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
    }
  }

  // Quick Win
  async loadQuickWin(page: number, pageSize: number) {
    const [items, count] = await this.masterQuickWinRepository.findAndCount({
      where: { del: 0 },
      order: { qwId: 'ASC' },
      skip: page * pageSize,
      take: pageSize,
    });
    return {
      data: items.map((item) => ({
        qw_id: item.qwId,
        qw_name: item.qwName,
        qw_detail: item.qwDetail ?? '',
        del: item.del,
        up_by: item.upBy,
        create_date: item.createDate,
        update_date: item.updateDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  async addQuickWin(payload: any) {
    const item = new MasterQuickWin();
    item.qwName = payload.qw_name;
    item.qwDetail = payload.qw_detail ?? null;
    item.upBy = payload.up_by ?? null;
    item.del = 0;
    try {
      await this.masterQuickWinRepository.save(item);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('addQuickWin error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async updateQuickWin(payload: any) {
    if (!payload.qw_id) return { flag: false, ms: 'ไม่พบ qw_id' };
    const item = await this.masterQuickWinRepository.findOne({
      where: { qwId: payload.qw_id, del: 0 },
    });
    if (!item) return { flag: false, ms: 'ไม่พบข้อมูล' };
    if (payload.qw_name !== undefined) item.qwName = payload.qw_name;
    if (payload.qw_detail !== undefined) item.qwDetail = payload.qw_detail;
    if (payload.up_by !== undefined) item.upBy = payload.up_by;
    try {
      await this.masterQuickWinRepository.save(item);
      return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('updateQuickWin error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
  }

  async removeQuickWin(payload: any) {
    if (!payload.qw_id) return { flag: false, ms: 'ไม่พบ qw_id' };
    const item = await this.masterQuickWinRepository.findOne({
      where: { qwId: payload.qw_id, del: 0 },
    });
    if (!item) return { flag: false, ms: 'ไม่พบข้อมูล' };
    item.del = 1;
    try {
      await this.masterQuickWinRepository.save(item);
      return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('removeQuickWin error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
    }
  }

  // SAO (สำนักงานเขตพื้นที่การศึกษา)
  async loadSao(page: number, pageSize: number) {
    const [items, count] = await this.masterSaoRepository.findAndCount({
      where: { del: 0 },
      order: { saoId: 'ASC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((item) => ({
        sao_id: item.saoId,
        sao_name: item.saoName,
        sao_group: item.saoGroup,
        del: item.del,
        up_by: item.upBy,
        create_date: item.createDate,
        update_date: item.updateDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  async addSao(payload: any) {
    const item = new MasterSao();
    item.saoName = payload.sao_name;
    item.saoGroup = payload.sao_group ?? '';
    item.upBy = payload.up_by ?? null;
    item.del = 0;

    try {
      await this.masterSaoRepository.save(item);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('addSao error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async updateSao(payload: any) {
    if (!payload.sao_id) {
      return { flag: false, ms: 'ไม่พบ sao_id' };
    }

    const item = await this.masterSaoRepository.findOne({
      where: { saoId: payload.sao_id, del: 0 },
    });

    if (!item) {
      return { flag: false, ms: 'ไม่พบข้อมูล สพท.' };
    }

    if (payload.sao_name !== undefined) item.saoName = payload.sao_name;
    if (payload.sao_group !== undefined) item.saoGroup = payload.sao_group;
    if (payload.up_by !== undefined) item.upBy = payload.up_by;

    try {
      await this.masterSaoRepository.save(item);
      return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('updateSao error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
  }

  async removeSao(payload: any) {
    if (!payload.sao_id) {
      return { flag: false, ms: 'ไม่พบ sao_id' };
    }

    const item = await this.masterSaoRepository.findOne({
      where: { saoId: payload.sao_id, del: 0 },
    });

    if (!item) {
      return { flag: false, ms: 'ไม่พบข้อมูล สพท.' };
    }

    item.del = 1;

    try {
      await this.masterSaoRepository.save(item);
      return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('removeSao error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
    }
  }

  async loadSaoGroup() {
    const items = await this.masterSaoRepository
      .createQueryBuilder('s')
      .select('DISTINCT s.sao_group', 'sao_group')
      .where('s.del = :del', { del: 0 })
      .orderBy('s.sao_group', 'ASC')
      .getRawMany();

    return items.map((i) => i.sao_group).filter(Boolean);
  }

  // Classroom Budget (งบประมาณต่อห้องเรียน)
  async loadClassroomBudget(page: number, pageSize: number) {
    const [items, count] = await this.masterCbLevelRepository.findAndCount({
      where: { del: 0 },
      order: { cbId: 'ASC' },
      skip: page * pageSize,
      take: pageSize,
    });
    return {
      data: items.map((item) => ({
        cb_id: item.cbId,
        level_name: item.levelName,
        budget_amount: Number(item.budgetAmount),
        del: item.del,
        up_by: item.upBy,
        create_date: item.createDate,
        update_date: item.updateDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  async addClassroomBudget(payload: any) {
    const item = new MasterCbLevel();
    item.levelName = payload.level_name;
    item.budgetAmount = payload.budget_amount ?? 0;
    item.upBy = payload.up_by ?? null;
    item.del = 0;
    try {
      await this.masterCbLevelRepository.save(item);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('addClassroomBudget error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async updateClassroomBudget(payload: any) {
    if (!payload.cb_id) return { flag: false, ms: 'ไม่พบ cb_id' };
    const item = await this.masterCbLevelRepository.findOne({
      where: { cbId: payload.cb_id, del: 0 },
    });
    if (!item) return { flag: false, ms: 'ไม่พบข้อมูล' };
    if (payload.level_name !== undefined) item.levelName = payload.level_name;
    if (payload.budget_amount !== undefined) item.budgetAmount = payload.budget_amount;
    if (payload.up_by !== undefined) item.upBy = payload.up_by;
    try {
      await this.masterCbLevelRepository.save(item);
      return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('updateClassroomBudget error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
  }

  async removeClassroomBudget(payload: any) {
    if (!payload.cb_id) return { flag: false, ms: 'ไม่พบ cb_id' };
    const item = await this.masterCbLevelRepository.findOne({
      where: { cbId: payload.cb_id, del: 0 },
    });
    if (!item) return { flag: false, ms: 'ไม่พบข้อมูล' };
    item.del = 1;
    try {
      await this.masterCbLevelRepository.save(item);
      return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('removeClassroomBudget error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
    }
  }

  // Budget Income Type
  async loadBudgetType(scId: number, page: number, pageSize: number) {
    const [items, count] = await this.budgetIncomeTypeRepository.findAndCount({
      where: { del: 0 },
      order: { bgTypeId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((item) => ({
        bit_id: item.bgTypeId,
        bit_name: item.budgetType,
        bit_detail: `calc:${item.budgetTypeCalc} borrow:${item.budgetBorrowType}`,
        budget_type_calc: item.budgetTypeCalc,
        budget_borrow_type: item.budgetBorrowType,
        spacial_type: item.spacialType,
        up_by: item.upBy,
        del: item.del,
      })),
      count,
      page,
      pageSize,
    };
  }

  async loadBudgetIncomeType(page: number, pageSize: number) {
    const [items, count] = await this.budgetIncomeTypeRepository.findAndCount({
      where: { del: 0 },
      order: { bgTypeId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((item) => ({
        bit_id: item.bgTypeId,
        bit_name: item.budgetType,
        bit_detail: `calc:${item.budgetTypeCalc} borrow:${item.budgetBorrowType}`,
        budget_type_calc: item.budgetTypeCalc,
        budget_borrow_type: item.budgetBorrowType,
        spacial_type: item.spacialType,
        up_by: item.upBy,
        del: item.del,
      })),
      count,
      page,
      pageSize,
    };
  }

  async addBudgetIncomeType(payload: any) {
    const item = new BudgetIncomeType();
    item.budgetType = payload.bit_name;
    item.budgetTypeCalc = payload.budget_type_calc ?? 1;
    item.budgetBorrowType = payload.budget_borrow_type ?? '2';
    item.spacialType = payload.spacial_type ?? 0;
    item.upBy = payload.up_by ?? 1;
    item.del = 0;

    try {
      await this.budgetIncomeTypeRepository.save(item);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (_error) {
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async updateBudgetIncomeType(payload: any) {
    const item = await this.budgetIncomeTypeRepository.findOne({
      where: { bgTypeId: payload.bit_id, del: 0 },
    });
    if (!item) return { flag: false, ms: 'ไม่พบข้อมูล' };

    if (payload.bit_name !== undefined) item.budgetType = payload.bit_name;
    if (payload.budget_type_calc !== undefined) item.budgetTypeCalc = payload.budget_type_calc;
    if (payload.budget_borrow_type !== undefined) item.budgetBorrowType = payload.budget_borrow_type;
    if (payload.up_by !== undefined) item.upBy = payload.up_by;

    try {
      await this.budgetIncomeTypeRepository.save(item);
      return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
    } catch (_error) {
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
  }

  async removeBudgetIncomeType(payload: any) {
    const item = await this.budgetIncomeTypeRepository.findOne({
      where: { bgTypeId: payload.bit_id, del: 0 },
    });
    if (!item) return { flag: false, ms: 'ไม่พบข้อมูล' };

    item.del = 1;
    try {
      await this.budgetIncomeTypeRepository.save(item);
      return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
    } catch (_error) {
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
    }
  }
}
