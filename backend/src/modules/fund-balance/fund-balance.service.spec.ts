import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FundBalanceService } from './fund-balance.service';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';

// QueryBuilder ที่ chain ได้ และคืน getRawOne ตามที่กำหนด
function makeQb(rawOne: unknown) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['select', 'where', 'andWhere'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getRawOne'] = jest.fn().mockResolvedValue(rawOne);
  return qb;
}

describe('FundBalanceService', () => {
  let service: FundBalanceService;
  let ftRepo: jest.Mocked<any>;
  let obRepo: jest.Mocked<any>;

  // ลำดับการเรียก qb ใน compute(): opening → income(type 1) → expense(type -1)
  function setupBalance(opening: number, income: number, expense: number) {
    const openingQb = makeQb({ s: String(opening) });
    const incomeQb = makeQb({ s: String(income) });
    const expenseQb = makeQb({ s: String(expense) });
    obRepo.createQueryBuilder.mockReturnValue(openingQb);
    ftRepo.createQueryBuilder
      .mockReturnValueOnce(incomeQb)
      .mockReturnValueOnce(expenseQb);
    return { openingQb, incomeQb, expenseQb };
  }

  beforeEach(async () => {
    ftRepo = { createQueryBuilder: jest.fn() };
    obRepo = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundBalanceService,
        {
          provide: getRepositoryToken(FinancialTransactions),
          useValue: ftRepo,
        },
        { provide: getRepositoryToken(OpeningBalance), useValue: obRepo },
      ],
    }).compile();

    service = module.get(FundBalanceService);
  });

  // ─── available (all channels) ──────────────────────────────────────────────────
  describe('available', () => {
    it('ยอดคงเหลือ = ยอดยกมา + รับ − จ่าย', async () => {
      setupBalance(2000, 5000, 1000);
      const result = await service.available(1, 3, 2);
      expect(result).toBe(6000); // 2000 + 5000 - 1000
    });

    it('ยอดยกมา/รับ/จ่าย เป็น 0 → คืน 0', async () => {
      setupBalance(0, 0, 0);
      const result = await service.available(1, 3, 2);
      expect(result).toBe(0);
    });

    it('null getRawOne → ถือเป็น 0', async () => {
      obRepo.createQueryBuilder.mockReturnValue(makeQb(null));
      ftRepo.createQueryBuilder
        .mockReturnValueOnce(makeQb(null))
        .mockReturnValueOnce(makeQb(null));
      const result = await service.available(1, 3, 2);
      expect(result).toBe(0);
    });

    it('สามารถติดลบได้ถ้าจ่ายมากกว่ารับ+ยกมา', async () => {
      setupBalance(0, 1000, 5000);
      const result = await service.available(1, 3, 2);
      expect(result).toBe(-4000);
    });

    it('filter opening ด้วย sc_id, money_type_id, del=0 และ sy_id', async () => {
      const { openingQb } = setupBalance(0, 0, 0);
      await service.available(7, 5, 9);
      expect(openingQb.where).toHaveBeenCalledWith('o.sc_id = :scId', {
        scId: 7,
      });
      expect(openingQb.andWhere).toHaveBeenCalledWith('o.money_type_id = :mt', {
        mt: 9,
      });
      expect(openingQb.andWhere).toHaveBeenCalledWith('o.del = 0');
      expect(openingQb.andWhere).toHaveBeenCalledWith('o.sy_id = :syId', {
        syId: 5,
      });
    });

    it('syId=0 → opening ใช้ 1=1 แทน sy_id filter', async () => {
      const { openingQb } = setupBalance(0, 0, 0);
      await service.available(1, 0, 2);
      expect(openingQb.andWhere).toHaveBeenCalledWith('1=1', { syId: 0 });
    });

    it('mode all → ไม่ filter storage_type / money_channel', async () => {
      const { openingQb, incomeQb } = setupBalance(0, 0, 0);
      await service.available(1, 3, 2);
      expect(openingQb.andWhere).not.toHaveBeenCalledWith(
        'o.storage_type NOT IN (2,3)',
      );
      expect(incomeQb.andWhere).not.toHaveBeenCalledWith(
        '(f.money_channel = 1 OR f.money_channel = 0)',
      );
    });

    it('ft income/expense filter ด้วย type 1 และ -1', async () => {
      const { incomeQb, expenseQb } = setupBalance(0, 0, 0);
      await service.available(1, 3, 2);
      expect(incomeQb.andWhere).toHaveBeenCalledWith('f.type = :type', {
        type: 1,
      });
      expect(expenseQb.andWhere).toHaveBeenCalledWith('f.type = :type', {
        type: -1,
      });
    });
  });

  // ─── availableCash (cash only) ───────────────────────────────────────────────────
  describe('availableCash', () => {
    it('mode cash → opening filter storage_type NOT IN (2,3)', async () => {
      const { openingQb } = setupBalance(1000, 0, 0);
      await service.availableCash(1, 3, 2);
      expect(openingQb.andWhere).toHaveBeenCalledWith(
        'o.storage_type NOT IN (2,3)',
      );
    });

    it('mode cash → ft filter money_channel 1 หรือ 0', async () => {
      const { incomeQb, expenseQb } = setupBalance(0, 0, 0);
      await service.availableCash(1, 3, 2);
      expect(incomeQb.andWhere).toHaveBeenCalledWith(
        '(f.money_channel = 1 OR f.money_channel = 0)',
      );
      expect(expenseQb.andWhere).toHaveBeenCalledWith(
        '(f.money_channel = 1 OR f.money_channel = 0)',
      );
    });

    it('คำนวณยอดเงินสดคงเหลือถูกต้อง', async () => {
      setupBalance(500, 2000, 800);
      const result = await service.availableCash(1, 3, 2);
      expect(result).toBe(1700);
    });
  });

  // ─── availableInTx / availableCashInTx ───────────────────────────────────────────
  describe('availableInTx / availableCashInTx', () => {
    it('availableInTx ใช้ repo จาก EntityManager', async () => {
      const txObRepo = { createQueryBuilder: jest.fn() };
      const txFtRepo = { createQueryBuilder: jest.fn() };
      txObRepo.createQueryBuilder.mockReturnValue(makeQb({ s: '1000' }));
      txFtRepo.createQueryBuilder
        .mockReturnValueOnce(makeQb({ s: '3000' }))
        .mockReturnValueOnce(makeQb({ s: '500' }));
      const em = {
        getRepository: jest
          .fn()
          .mockImplementation((entity) =>
            entity === OpeningBalance ? txObRepo : txFtRepo,
          ),
      } as any;

      const result = await service.availableInTx(em, 1, 3, 2);
      expect(result).toBe(3500); // 1000 + 3000 - 500
      // ต้องไม่แตะ repo ปกติของ service
      expect(ftRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(obRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('availableCashInTx ใช้ repo จาก EntityManager + filter เงินสด', async () => {
      const txObRepo = { createQueryBuilder: jest.fn() };
      const txFtRepo = { createQueryBuilder: jest.fn() };
      const openingQb = makeQb({ s: '0' });
      const incomeQb = makeQb({ s: '0' });
      txObRepo.createQueryBuilder.mockReturnValue(openingQb);
      txFtRepo.createQueryBuilder
        .mockReturnValueOnce(incomeQb)
        .mockReturnValueOnce(makeQb({ s: '0' }));
      const em = {
        getRepository: jest
          .fn()
          .mockImplementation((entity) =>
            entity === OpeningBalance ? txObRepo : txFtRepo,
          ),
      } as any;

      await service.availableCashInTx(em, 1, 3, 2);
      expect(openingQb.andWhere).toHaveBeenCalledWith(
        'o.storage_type NOT IN (2,3)',
      );
      expect(incomeQb.andWhere).toHaveBeenCalledWith(
        '(f.money_channel = 1 OR f.money_channel = 0)',
      );
    });
  });
});
