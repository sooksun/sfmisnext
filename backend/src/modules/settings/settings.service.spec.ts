import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { MasterScPolicy } from './entities/master-sc-policy.entity';
import { MasterObecPolicy } from './entities/master-obec-policy.entity';
import { MasterSao } from './entities/master-sao.entity';
import { MasterSaoPolicy } from './entities/master-sao-policy.entity';
import { MasterMoePolicy } from './entities/master-moe-policy.entity';
import { MasterQuickWin } from './entities/master-quick-win.entity';
import { MasterCbLevel } from './entities/master-cb-level.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

function repoMock() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x) => x),
    createQueryBuilder: jest.fn(),
  };
}

function makeQb(rawMany: unknown[] = []) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['select', 'where', 'orderBy'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getRawMany'] = jest.fn().mockResolvedValue(rawMany);
  return qb;
}

describe('SettingsService', () => {
  let service: SettingsService;
  let scRepo: jest.Mocked<any>;
  let obecRepo: jest.Mocked<any>;
  let saoRepo: jest.Mocked<any>;
  let saoPolRepo: jest.Mocked<any>;
  let moeRepo: jest.Mocked<any>;
  let qwRepo: jest.Mocked<any>;
  let cbRepo: jest.Mocked<any>;
  let bitRepo: jest.Mocked<any>;

  beforeEach(async () => {
    scRepo = repoMock();
    obecRepo = repoMock();
    saoRepo = repoMock();
    saoPolRepo = repoMock();
    moeRepo = repoMock();
    qwRepo = repoMock();
    cbRepo = repoMock();
    bitRepo = repoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(MasterScPolicy), useValue: scRepo },
        { provide: getRepositoryToken(MasterObecPolicy), useValue: obecRepo },
        { provide: getRepositoryToken(MasterSao), useValue: saoRepo },
        { provide: getRepositoryToken(MasterSaoPolicy), useValue: saoPolRepo },
        { provide: getRepositoryToken(MasterMoePolicy), useValue: moeRepo },
        { provide: getRepositoryToken(MasterQuickWin), useValue: qwRepo },
        { provide: getRepositoryToken(MasterCbLevel), useValue: cbRepo },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: bitRepo },
      ],
    }).compile();

    service = module.get(SettingsService);
  });

  // ─── School Policy ─────────────────────────────────────────────────────────
  describe('School Policy', () => {
    it('loadSchoolPolicy: filter scId+del=0, paginate, map field', async () => {
      scRepo.findAndCount.mockResolvedValue([
        [
          {
            scpId: 1,
            scId: 5,
            scPolicy: 'นโยบาย',
            upBy: 7,
            createDate: null,
            updateDate: null,
            del: 0,
          },
        ],
        1,
      ]);
      const result = await service.loadSchoolPolicy(5, 0, 10);
      expect(scRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 5, del: 0 },
          skip: 0,
          take: 10,
        }),
      );
      expect(result.count).toBe(1);
      expect(result.data[0].scp_id).toBe(1);
      expect(result.data[0].sc_policy).toBe('นโยบาย');
    });

    it('addSchoolPolicy: happy path → flag:true', async () => {
      scRepo.save.mockResolvedValue({});
      const result = await service.addSchoolPolicy({
        sc_id: 5,
        sc_policy: 'x',
        up_by: 7,
      } as any);
      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
    });

    it('addSchoolPolicy: error → flag:false', async () => {
      scRepo.save.mockRejectedValue(new Error('DB'));
      const result = await service.addSchoolPolicy({
        sc_id: 5,
        sc_policy: 'x',
        up_by: 7,
      } as any);
      expect(result).toEqual({
        flag: false,
        ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      });
    });

    it('updateSchoolPolicy: ไม่พบ → flag:false', async () => {
      scRepo.findOne.mockResolvedValue(null);
      const result = await service.updateSchoolPolicy({ scp_id: 99 } as any);
      expect(result).toEqual({
        flag: false,
        ms: 'ไม่พบข้อมูลนโยบายโรงเรียน',
      });
    });

    it('updateSchoolPolicy: filter del=0 + happy path', async () => {
      const row: any = { scpId: 1, del: 0 };
      scRepo.findOne.mockResolvedValue(row);
      scRepo.save.mockResolvedValue(row);
      const result = await service.updateSchoolPolicy({
        scp_id: 1,
        sc_policy: 'ใหม่',
        up_by: 9,
      } as any);
      expect(scRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scpId: 1, del: 0 } }),
      );
      expect(result).toEqual({ flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' });
      expect(row.scPolicy).toBe('ใหม่');
      expect(row.upBy).toBe(9);
    });

    it('removeSchoolPolicy: ไม่พบ → "0"', async () => {
      scRepo.findOne.mockResolvedValue(null);
      const result = await service.removeSchoolPolicy({ scp_id: 99 });
      expect(result).toBe('0');
    });

    it('removeSchoolPolicy: soft delete → "1"', async () => {
      const row: any = { scpId: 1, del: 0 };
      scRepo.findOne.mockResolvedValue(row);
      scRepo.save.mockResolvedValue(row);
      const result = await service.removeSchoolPolicy({ scp_id: 1 });
      expect(result).toBe('1');
      expect(row.del).toBe(1);
    });

    it('removeSchoolPolicy: save error → "0"', async () => {
      scRepo.findOne.mockResolvedValue({ scpId: 1, del: 0 });
      scRepo.save.mockRejectedValue(new Error('DB'));
      const result = await service.removeSchoolPolicy({ scp_id: 1 });
      expect(result).toBe('0');
    });
  });

  // ─── OBEC Policy ───────────────────────────────────────────────────────────
  describe('OBEC Policy', () => {
    it('loadObecPolicy: filter del=0 + map', async () => {
      obecRepo.findAndCount.mockResolvedValue([
        [{ id: 1, obecPolicy: 'p', detail: 'd', upBy: 7, del: 0 }],
        1,
      ]);
      const result = await service.loadObecPolicy(0, 10);
      expect(result.data[0].obec_policy).toBe('p');
      expect(result.count).toBe(1);
    });

    it('updateObecPolicy: ไม่พบ → flag:false', async () => {
      obecRepo.findOne.mockResolvedValue(null);
      const result = await service.updateObecPolicy({ id: 99 } as any);
      expect(result.flag).toBe(false);
    });

    it('removeObecPolicy: soft delete → "1"', async () => {
      const row: any = { id: 1, del: 0 };
      obecRepo.findOne.mockResolvedValue(row);
      obecRepo.save.mockResolvedValue(row);
      expect(await service.removeObecPolicy({ id: 1 })).toBe('1');
      expect(row.del).toBe(1);
    });
  });

  // ─── SAO Policy ────────────────────────────────────────────────────────────
  describe('SAO Policy', () => {
    it('addSaoPolicy: happy path', async () => {
      saoPolRepo.save.mockResolvedValue({});
      const result = await service.addSaoPolicy({ sao_policy_name: 'x' });
      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
    });

    it('updateSaoPolicy: ไม่มี id → flag:false', async () => {
      const result = await service.updateSaoPolicy({});
      expect(result).toEqual({ flag: false, ms: 'ไม่พบ sao_policy_id' });
    });

    it('updateSaoPolicy: ไม่พบ row → flag:false', async () => {
      saoPolRepo.findOne.mockResolvedValue(null);
      const result = await service.updateSaoPolicy({ sao_policy_id: 1 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูล' });
    });

    it('removeSaoPolicy: soft delete → flag:true', async () => {
      const row: any = { saoPolicyId: 1, del: 0 };
      saoPolRepo.findOne.mockResolvedValue(row);
      saoPolRepo.save.mockResolvedValue(row);
      const result = await service.removeSaoPolicy({ sao_policy_id: 1 });
      expect(result).toEqual({ flag: true, ms: 'ลบข้อมูลสำเร็จ' });
      expect(row.del).toBe(1);
    });
  });

  // ─── MOE Policy ────────────────────────────────────────────────────────────
  describe('MOE Policy', () => {
    it('addMoePolicy: happy path', async () => {
      moeRepo.save.mockResolvedValue({});
      const result = await service.addMoePolicy({ policy_name: 'x' });
      expect(result.flag).toBe(true);
    });

    it('updateMoePolicy: ไม่มี id → flag:false', async () => {
      const result = await service.updateMoePolicy({});
      expect(result).toEqual({ flag: false, ms: 'ไม่พบ moe_policy_id' });
    });
  });

  // ─── Quick Win ─────────────────────────────────────────────────────────────
  describe('Quick Win', () => {
    it('addQuickWin: happy path', async () => {
      qwRepo.save.mockResolvedValue({});
      const result = await service.addQuickWin({ qw_name: 'x' });
      expect(result.flag).toBe(true);
    });

    it('removeQuickWin: ไม่มี id → flag:false', async () => {
      const result = await service.removeQuickWin({});
      expect(result).toEqual({ flag: false, ms: 'ไม่พบ qw_id' });
    });
  });

  // ─── SAO ───────────────────────────────────────────────────────────────────
  describe('SAO', () => {
    it('loadSao: filter del=0 + map', async () => {
      saoRepo.findAndCount.mockResolvedValue([
        [{ saoId: 1, saoName: 'เขต1', saoGroup: 'กลุ่ม', del: 0, upBy: 7 }],
        1,
      ]);
      const result = await service.loadSao(0, 10);
      expect(result.data[0].sao_name).toBe('เขต1');
    });

    it('updateSao: ไม่มี id → flag:false', async () => {
      const result = await service.updateSao({});
      expect(result).toEqual({ flag: false, ms: 'ไม่พบ sao_id' });
    });

    it('updateSao: ไม่พบ → flag:false', async () => {
      saoRepo.findOne.mockResolvedValue(null);
      const result = await service.updateSao({ sao_id: 1 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูล สพท.' });
    });

    it('removeSao: soft delete → flag:true', async () => {
      const row: any = { saoId: 1, del: 0 };
      saoRepo.findOne.mockResolvedValue(row);
      saoRepo.save.mockResolvedValue(row);
      const result = await service.removeSao({ sao_id: 1 });
      expect(result.flag).toBe(true);
      expect(row.del).toBe(1);
    });

    it('loadSaoGroup: distinct group filter del=0', async () => {
      const qb = makeQb([{ sao_group: 'กลุ่ม A' }, { sao_group: '' }]);
      saoRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.loadSaoGroup();
      expect(result).toEqual(['กลุ่ม A']); // กรอง falsy ออก
    });
  });

  // ─── Classroom Budget ──────────────────────────────────────────────────────
  describe('Classroom Budget', () => {
    it('loadClassroomBudget: แปลง budget_amount เป็น number', async () => {
      cbRepo.findAndCount.mockResolvedValue([
        [{ cbId: 1, levelName: 'ป.1', budgetAmount: '1500', del: 0, upBy: 7 }],
        1,
      ]);
      const result = await service.loadClassroomBudget(0, 10);
      expect(result.data[0].budget_amount).toBe(1500);
    });

    it('updateClassroomBudget: ไม่มี cb_id → flag:false', async () => {
      const result = await service.updateClassroomBudget({});
      expect(result).toEqual({ flag: false, ms: 'ไม่พบ cb_id' });
    });

    it('removeClassroomBudget: soft delete → flag:true', async () => {
      const row: any = { cbId: 1, del: 0 };
      cbRepo.findOne.mockResolvedValue(row);
      cbRepo.save.mockResolvedValue(row);
      const result = await service.removeClassroomBudget({ cb_id: 1 });
      expect(result.flag).toBe(true);
      expect(row.del).toBe(1);
    });
  });

  // ─── Budget Income Type ────────────────────────────────────────────────────
  describe('Budget Income Type', () => {
    it('loadBudgetType: map field + filter del=0', async () => {
      bitRepo.findAndCount.mockResolvedValue([
        [
          {
            bgTypeId: 1,
            budgetType: 'งบ',
            budgetTypeCalc: 1,
            budgetBorrowType: '2',
            spacialType: 0,
            upBy: 7,
            del: 0,
          },
        ],
        1,
      ]);
      const result = await service.loadBudgetType(5, 0, 10);
      expect(result.data[0].bit_id).toBe(1);
      expect(result.data[0].bit_name).toBe('งบ');
    });

    it('addBudgetIncomeType: default ค่า + happy path', async () => {
      let saved: any;
      bitRepo.save.mockImplementation((x: any) => {
        saved = x;
        return Promise.resolve(x);
      });
      const result = await service.addBudgetIncomeType({ bit_name: 'งบ' });
      expect(result.flag).toBe(true);
      expect(saved.budgetTypeCalc).toBe(1);
      expect(saved.budgetBorrowType).toBe('2');
      expect(saved.del).toBe(0);
    });

    it('addBudgetIncomeType: save error → flag:false', async () => {
      bitRepo.save.mockRejectedValue(new Error('DB'));
      const result = await service.addBudgetIncomeType({ bit_name: 'งบ' });
      expect(result).toEqual({
        flag: false,
        ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      });
    });

    it('updateBudgetIncomeType: ไม่พบ → flag:false', async () => {
      bitRepo.findOne.mockResolvedValue(null);
      const result = await service.updateBudgetIncomeType({ bit_id: 99 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูล' });
    });

    it('removeBudgetIncomeType: soft delete → flag:true', async () => {
      const row: any = { bgTypeId: 1, del: 0 };
      bitRepo.findOne.mockResolvedValue(row);
      bitRepo.save.mockResolvedValue(row);
      const result = await service.removeBudgetIncomeType({ bit_id: 1 });
      expect(result).toEqual({ flag: true, ms: 'ลบข้อมูลสำเร็จ' });
      expect(row.del).toBe(1);
    });
  });
});
