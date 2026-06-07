import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportBookbankService } from './report-bookbank.service';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { BudgetIncomeTypeSchool } from '../bank/entities/budget-income-type-school.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';

// ─── QueryBuilder mock factory (getMany) ─────────────────────────────────────
function makeQb(rows: unknown[] = []) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['where', 'andWhere', 'orderBy', 'addOrderBy', 'select', 'addSelect'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getMany'] = jest.fn().mockResolvedValue(rows);
  return qb;
}

function makeFt(overrides: Record<string, unknown> = {}) {
  return {
    ftId: 1,
    type: 1,
    bgTypeId: 2,
    amount: 1000,
    rwId: 0,
    prId: 0,
    moneyChannel: 2,
    upBy: 5,
    scId: 1,
    syId: 3,
    createDate: new Date('2026-05-01T00:00:00.000Z'),
    updateDate: new Date('2026-05-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ReportBookbankService', () => {
  let service: ReportBookbankService;
  let ftRepo: jest.Mocked<any>;
  let bitsRepo: jest.Mocked<any>;
  let prRepo: jest.Mocked<any>;
  let rwRepo: jest.Mocked<any>;
  let obRepo: jest.Mocked<any>;

  beforeEach(async () => {
    ftRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQb([])) };
    bitsRepo = { find: jest.fn() };
    prRepo = { find: jest.fn() };
    rwRepo = { find: jest.fn() };
    obRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportBookbankService,
        { provide: getRepositoryToken(FinancialTransactions), useValue: ftRepo },
        { provide: getRepositoryToken(BudgetIncomeTypeSchool), useValue: bitsRepo },
        { provide: getRepositoryToken(PlnReceive), useValue: prRepo },
        { provide: getRepositoryToken(RequestWithdraw), useValue: rwRepo },
        { provide: getRepositoryToken(OpeningBalance), useValue: obRepo },
      ],
    }).compile();

    service = module.get(ReportBookbankService);
  });

  it('ไม่มี bg_type_id ผูกบัญชี → คืน array ว่างทันที (ไม่ query ft)', async () => {
    bitsRepo.find.mockResolvedValue([]);
    const result = await service.loadReportRegisterBookbank(10, 1, 3, '2569');
    expect(result).toEqual([]);
    expect(ftRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('คัด bgTypeId ที่เป็น null/<=0 ออก แล้วถ้าว่างคืน []', async () => {
    bitsRepo.find.mockResolvedValue([
      { bgTypeId: null },
      { bgTypeId: 0 },
    ]);
    const result = await service.loadReportRegisterBookbank(10, 1, 3, '2569');
    expect(result).toEqual([]);
  });

  it('filter budgetTypeLinks ด้วย baId, scId, del=0', async () => {
    bitsRepo.find.mockResolvedValue([]);
    await service.loadReportRegisterBookbank(10, 5, 3, '2569');
    expect(bitsRepo.find).toHaveBeenCalledWith({
      where: { baId: 10, scId: 5, del: 0 },
    });
  });

  it('คำนวณ running balance สะสมถูกต้อง (รายรับ - รายจ่าย)', async () => {
    bitsRepo.find.mockResolvedValue([{ bgTypeId: 2 }]);
    const qb = makeQb([
      makeFt({ ftId: 1, type: 1, amount: 1000 }), // +1000
      makeFt({ ftId: 2, type: -1, amount: 300 }), // -300 => 700
      makeFt({ ftId: 3, type: 1, amount: 500 }), // +500 => 1200
    ]);
    ftRepo.createQueryBuilder.mockReturnValue(qb);
    prRepo.find.mockResolvedValue([]);
    rwRepo.find.mockResolvedValue([]);
    obRepo.find.mockResolvedValue([]);

    const rows = await service.loadReportRegisterBookbank(10, 1, 3, '2569');
    expect(rows.map((r) => r.balance)).toEqual([1000, 700, 1200]);
    expect(rows[0].trans_in).toBe(1000);
    expect(rows[1].trans_out).toBe(300);
  });

  it('มียอดยกมาต้นปี (storage_type=2) → เพิ่มแถวยอดยกมาบนสุด และเริ่มสะสมจากยอดนั้น', async () => {
    bitsRepo.find.mockResolvedValue([{ bgTypeId: 2 }]);
    const qb = makeQb([makeFt({ ftId: 1, type: 1, amount: 1000 })]);
    ftRepo.createQueryBuilder.mockReturnValue(qb);
    prRepo.find.mockResolvedValue([]);
    rwRepo.find.mockResolvedValue([]);
    obRepo.find.mockResolvedValue([
      { moneyTypeId: 2, amount: 5000 },
      { moneyTypeId: 99, amount: 999 }, // ไม่ผูกบัญชีนี้ — ต้องไม่นับ
    ]);

    const rows = await service.loadReportRegisterBookbank(10, 1, 3, '2569');
    expect(rows[0].detail).toBe('ยอดยกมาต้นปี');
    expect(rows[0].trans_in).toBe(5000);
    expect(rows[0].balance).toBe(5000);
    // แถวรายการแรกต่อยอด 5000 + 1000 = 6000
    expect(rows[1].balance).toBe(6000);
  });

  it('ยอดยกมา = 0 → ไม่เพิ่มแถวยอดยกมา', async () => {
    bitsRepo.find.mockResolvedValue([{ bgTypeId: 2 }]);
    const qb = makeQb([makeFt({ ftId: 1, type: 1, amount: 1000 })]);
    ftRepo.createQueryBuilder.mockReturnValue(qb);
    prRepo.find.mockResolvedValue([]);
    rwRepo.find.mockResolvedValue([]);
    obRepo.find.mockResolvedValue([]);

    const rows = await service.loadReportRegisterBookbank(10, 1, 3, '2569');
    expect(rows.find((r) => r.detail === 'ยอดยกมาต้นปี')).toBeUndefined();
    expect(rows).toHaveLength(1);
  });

  it('รายรับที่มี prId → ใช้ prNo + รายละเอียด "รับเงิน"', async () => {
    bitsRepo.find.mockResolvedValue([{ bgTypeId: 2 }]);
    const qb = makeQb([makeFt({ ftId: 1, type: 1, amount: 1000, prId: 7 })]);
    ftRepo.createQueryBuilder.mockReturnValue(qb);
    prRepo.find.mockResolvedValue([
      { prId: 7, prNo: 'PR-007', receiveForm: 'เงินอุดหนุน' },
    ]);
    rwRepo.find.mockResolvedValue([]);
    obRepo.find.mockResolvedValue([]);

    const [row] = await service.loadReportRegisterBookbank(10, 1, 3, '2569');
    expect(row.trans_no).toBe('PR-007');
    expect(row.detail).toBe('รับเงิน เงินอุดหนุน');
  });

  it('รายจ่ายที่มี rwId → ใช้ noDoc + รายละเอียด "จ่าย"', async () => {
    bitsRepo.find.mockResolvedValue([{ bgTypeId: 2 }]);
    const qb = makeQb([makeFt({ ftId: 1, type: -1, amount: 500, rwId: 9 })]);
    ftRepo.createQueryBuilder.mockReturnValue(qb);
    prRepo.find.mockResolvedValue([]);
    rwRepo.find.mockResolvedValue([{ rwId: 9, noDoc: 'D-009', detail: 'ค่าน้ำ' }]);
    obRepo.find.mockResolvedValue([]);

    const [row] = await service.loadReportRegisterBookbank(10, 1, 3, '2569');
    expect(row.trans_no).toBe('D-009');
    expect(row.detail).toBe('จ่าย ค่าน้ำ');
    expect(row.trans_out).toBe(500);
  });

  it('รายรับจากหักภาษี ณ ที่จ่าย (prId=0, rwId>0) → รายละเอียด "หักภาษี ณ ที่จ่าย"', async () => {
    bitsRepo.find.mockResolvedValue([{ bgTypeId: 2 }]);
    const qb = makeQb([
      makeFt({ ftId: 1, type: 1, amount: 100, prId: 0, rwId: 9 }),
    ]);
    ftRepo.createQueryBuilder.mockReturnValue(qb);
    prRepo.find.mockResolvedValue([]);
    rwRepo.find.mockResolvedValue([{ rwId: 9, noDoc: 'WHT-1', detail: 'ภาษี' }]);
    obRepo.find.mockResolvedValue([]);

    const [row] = await service.loadReportRegisterBookbank(10, 1, 3, '2569');
    expect(row.trans_no).toBe('WHT-1');
    expect(row.detail).toBe('หักภาษี ณ ที่จ่าย ภาษี');
  });

  it('default detail = "รายรับ"/"รายจ่าย" เมื่อไม่มีเอกสารอ้างอิง', async () => {
    bitsRepo.find.mockResolvedValue([{ bgTypeId: 2 }]);
    const qb = makeQb([
      makeFt({ ftId: 1, type: 1, amount: 100, prId: 0, rwId: 0 }),
      makeFt({ ftId: 2, type: -1, amount: 50, prId: 0, rwId: 0 }),
    ]);
    ftRepo.createQueryBuilder.mockReturnValue(qb);
    prRepo.find.mockResolvedValue([]);
    rwRepo.find.mockResolvedValue([]);
    obRepo.find.mockResolvedValue([]);

    const rows = await service.loadReportRegisterBookbank(10, 1, 3, '2569');
    expect(rows[0].detail).toBe('รายรับ');
    expect(rows[1].detail).toBe('รายจ่าย');
  });

  it('createDate null → trans_date เป็น empty string', async () => {
    bitsRepo.find.mockResolvedValue([{ bgTypeId: 2 }]);
    const qb = makeQb([makeFt({ ftId: 1, createDate: null, updateDate: null })]);
    ftRepo.createQueryBuilder.mockReturnValue(qb);
    prRepo.find.mockResolvedValue([]);
    rwRepo.find.mockResolvedValue([]);
    obRepo.find.mockResolvedValue([]);

    const [row] = await service.loadReportRegisterBookbank(10, 1, 3, '2569');
    expect(row.trans_date).toBe('');
  });

  it('โหลด opening เฉพาะ storageType=2 และ del=0', async () => {
    bitsRepo.find.mockResolvedValue([{ bgTypeId: 2 }]);
    ftRepo.createQueryBuilder.mockReturnValue(makeQb([]));
    prRepo.find.mockResolvedValue([]);
    rwRepo.find.mockResolvedValue([]);
    obRepo.find.mockResolvedValue([]);

    await service.loadReportRegisterBookbank(10, 5, 3, '2569');
    expect(obRepo.find).toHaveBeenCalledWith({
      where: { scId: 5, syId: 3, storageType: 2, del: 0 },
    });
  });
});
