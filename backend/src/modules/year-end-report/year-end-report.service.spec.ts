import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { YearEndReportService } from './year-end-report.service';
import { Receipt } from '../receipt/entities/receipt.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

// ─── QueryBuilder mock factory ───────────────────────────────────────────────
function makeQb(opts: { many?: unknown[]; rawMany?: unknown[] } = {}) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['leftJoin', 'where', 'andWhere', 'select', 'addSelect', 'orderBy', 'groupBy'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getMany'] = jest.fn().mockResolvedValue(opts.many ?? []);
  qb['getRawMany'] = jest.fn().mockResolvedValue(opts.rawMany ?? []);
  return qb;
}

describe('YearEndReportService', () => {
  let service: YearEndReportService;
  let receiptRepo: jest.Mocked<any>;
  let prRepo: jest.Mocked<any>;
  let prdRepo: jest.Mocked<any>;
  let btRepo: jest.Mocked<any>;

  beforeEach(async () => {
    receiptRepo = { createQueryBuilder: jest.fn() };
    prRepo = { createQueryBuilder: jest.fn() };
    prdRepo = { createQueryBuilder: jest.fn() };
    btRepo = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YearEndReportService,
        { provide: getRepositoryToken(Receipt), useValue: receiptRepo },
        { provide: getRepositoryToken(PlnReceive), useValue: prRepo },
        { provide: getRepositoryToken(PlnReceiveDetail), useValue: prdRepo },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: btRepo },
      ],
    }).compile();

    service = module.get(YearEndReportService);
  });

  // ─── getReceiptUsageReport ────────────────────────────────────────────────────
  describe('getReceiptUsageReport', () => {
    it('ไม่มีใบเสร็จ → total_count=0, by_type ว่าง', async () => {
      receiptRepo.createQueryBuilder.mockReturnValue(makeQb({ rawMany: [] }));
      const result = await service.getReceiptUsageReport(1, 3, '2569');
      expect(result.total_count).toBe(0);
      expect(result.by_type).toEqual([]);
      expect(result.deadline).toBe('15 ต.ค.');
      expect(result.budget_year).toBe('2569');
    });

    it('group by receive_form และนับจำนวน + รวมยอด', async () => {
      receiptRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          rawMany: [
            { r_r_id: 1, r_pr_id: '10', receive_form: 'แบบ ก' },
            { r_r_id: 2, r_pr_id: '11', receive_form: 'แบบ ก' },
            { r_r_id: 3, r_pr_id: '12', receive_form: 'แบบ ข' },
          ],
        }),
      );
      // prd: sum budget per pr_id
      prdRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          rawMany: [
            { pr_id: '10', total_budget: '1000' },
            { pr_id: '11', total_budget: '500' },
            { pr_id: '12', total_budget: '300' },
          ],
        }),
      );

      const result = await service.getReceiptUsageReport(1, 3, '2569');
      expect(result.total_count).toBe(3);
      const ka = result.by_type.find((t) => t.type_name === 'แบบ ก')!;
      const kb = result.by_type.find((t) => t.type_name === 'แบบ ข')!;
      expect(ka.count).toBe(2);
      expect(ka.amount_total).toBe(1500); // 1000 + 500
      expect(kb.count).toBe(1);
      expect(kb.amount_total).toBe(300);
    });

    it('receive_form ว่าง → จัดเป็น "ทั่วไป"', async () => {
      receiptRepo.createQueryBuilder.mockReturnValue(
        makeQb({ rawMany: [{ r_r_id: 1, r_pr_id: '0', receive_form: null }] }),
      );
      const result = await service.getReceiptUsageReport(1, 3, '2569');
      expect(result.by_type[0].type_name).toBe('ทั่วไป');
    });

    it('filter status=1 และ year ตามที่ส่ง (พ.ศ.)', async () => {
      const qb = makeQb({ rawMany: [] });
      receiptRepo.createQueryBuilder.mockReturnValue(qb);
      await service.getReceiptUsageReport(5, 3, '2569');
      expect(qb.where).toHaveBeenCalledWith('r.sc_id = :scId', { scId: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith('r.year = :year', { year: '2569' });
      expect(qb.andWhere).toHaveBeenCalledWith('r.status = :status', { status: '1' });
    });

    it('รับ budget_year เป็น ค.ศ. ก็คำนวณ days_remaining ได้ (แปลงเป็น CE)', async () => {
      receiptRepo.createQueryBuilder.mockReturnValue(makeQb({ rawMany: [] }));
      const result = await service.getReceiptUsageReport(1, 3, '2026');
      expect(typeof result.days_remaining).toBe('number');
      expect(result.budget_year).toBe('2026');
    });

    it('เกิด error → fallback คืน total_count=0 และ deadline', async () => {
      receiptRepo.createQueryBuilder.mockImplementation(() => {
        throw new Error('DB down');
      });
      const result = await service.getReceiptUsageReport(1, 3, '2569');
      expect(result.total_count).toBe(0);
      expect(result.by_type).toEqual([]);
      expect(result.deadline).toBe('15 ต.ค.');
    });
  });

  // ─── getSchoolRevenueReport ───────────────────────────────────────────────────
  describe('getSchoolRevenueReport', () => {
    it('ไม่มี receive → total ทั้งหมด 0', async () => {
      prRepo.createQueryBuilder.mockReturnValue(makeQb({ many: [] }));
      const result = await service.getSchoolRevenueReport(1, 3, '2569');
      expect(result.total_income).toBe(0);
      expect(result.total_expense).toBe(0);
      expect(result.net).toBe(0);
      expect(result.by_category).toEqual([]);
      expect(result.deadline).toBe('30 ต.ค.');
    });

    it('group by ประเภทงบ พร้อมชื่อจาก budgetIncomeType และรวม income', async () => {
      prRepo.createQueryBuilder.mockReturnValue(
        makeQb({ many: [{ prId: 10 }, { prId: 11 }] }),
      );
      prdRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          rawMany: [
            { pr_id: '10', prd_budget: '1000', bg_type_id: '1', prd_detail: 'a' },
            { pr_id: '11', prd_budget: '2000', bg_type_id: '1', prd_detail: 'b' },
            { pr_id: '11', prd_budget: '500', bg_type_id: '2', prd_detail: 'c' },
          ],
        }),
      );
      btRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          many: [
            { bgTypeId: 1, budgetType: 'เงินอุดหนุน' },
            { bgTypeId: 2, budgetType: 'เงินรายได้' },
          ],
        }),
      );

      const result = await service.getSchoolRevenueReport(1, 3, '2569');
      const aud = result.by_category.find((c) => c.category === 'เงินอุดหนุน')!;
      const rev = result.by_category.find((c) => c.category === 'เงินรายได้')!;
      expect(aud.income).toBe(3000); // 1000 + 2000
      expect(rev.income).toBe(500);
      expect(result.total_income).toBe(3500);
      expect(result.net).toBe(3500);
    });

    it('bg_type_id เป็น null → จัดเป็น "ไม่ระบุประเภท"', async () => {
      prRepo.createQueryBuilder.mockReturnValue(makeQb({ many: [{ prId: 10 }] }));
      prdRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          rawMany: [{ pr_id: '10', prd_budget: '700', bg_type_id: null, prd_detail: null }],
        }),
      );
      const result = await service.getSchoolRevenueReport(1, 3, '2569');
      expect(result.by_category[0].category).toBe('ไม่ระบุประเภท');
      expect(result.by_category[0].income).toBe(700);
    });

    it('bg_type_id ที่หาชื่อไม่เจอ → "ประเภท {id}"', async () => {
      prRepo.createQueryBuilder.mockReturnValue(makeQb({ many: [{ prId: 10 }] }));
      prdRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          rawMany: [{ pr_id: '10', prd_budget: '100', bg_type_id: '99', prd_detail: null }],
        }),
      );
      btRepo.createQueryBuilder.mockReturnValue(makeQb({ many: [] }));
      const result = await service.getSchoolRevenueReport(1, 3, '2569');
      expect(result.by_category[0].category).toBe('ประเภท 99');
    });

    it('filter cf_transaction=1 และ del=0', async () => {
      const qb = makeQb({ many: [] });
      prRepo.createQueryBuilder.mockReturnValue(qb);
      await service.getSchoolRevenueReport(8, 3, '2569');
      expect(qb.andWhere).toHaveBeenCalledWith('pr.cf_transaction = :cf', { cf: 1 });
      expect(qb.andWhere).toHaveBeenCalledWith('pr.del = :del', { del: 0 });
    });

    it('เกิด error → fallback คืน 0 ทั้งหมด', async () => {
      prRepo.createQueryBuilder.mockImplementation(() => {
        throw new Error('DB down');
      });
      const result = await service.getSchoolRevenueReport(1, 3, '2569');
      expect(result.total_income).toBe(0);
      expect(result.net).toBe(0);
      expect(result.by_category).toEqual([]);
    });
  });
});
