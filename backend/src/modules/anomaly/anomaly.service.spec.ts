import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnomalyService } from './anomaly.service';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';

describe('AnomalyService', () => {
  let service: AnomalyService;
  let ftRepo: jest.Mocked<any>;

  beforeEach(async () => {
    ftRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({
        where: () => ({
          andWhere: () => ({ andWhere: () => ({ getCount: () => Promise.resolve(0) }) }),
        }),
      })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyService,
        { provide: getRepositoryToken(FinancialTransactions), useValue: ftRepo },
      ],
    }).compile();
    service = module.get(AnomalyService);
  });

  const codes = (w: any[]) => w.map((x) => x.code);
  const ymd = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

  it('วันที่อนาคต → DATE_FUTURE', async () => {
    const r = await service.precheck({
      sc_id: 1, budget_year: '', payload: { action_date: ymd(10) },
    });
    expect(codes(r.warnings)).toContain('DATE_FUTURE');
  });

  it('วันที่ย้อนหลังเกิน 30 วัน → DATE_OLD', async () => {
    const r = await service.precheck({
      sc_id: 1, budget_year: '', payload: { doc_date: ymd(-45) },
    });
    expect(codes(r.warnings)).toContain('DATE_OLD');
  });

  it('ปีงบไม่ตรง → YEAR_MISMATCH', async () => {
    const r = await service.precheck({
      sc_id: 1, budget_year: '2569', payload: { action_date: '2020-05-10' },
    });
    expect(codes(r.warnings)).toContain('YEAR_MISMATCH');
  });

  it('ยอดสูงผิดปกติ (ไม่มีประวัติ → เกณฑ์ 100,000) → AMOUNT_HIGH', async () => {
    const r = await service.precheck({
      sc_id: 1, budget_year: '', payload: { amount: 1500000 },
    });
    expect(codes(r.warnings)).toContain('AMOUNT_HIGH');
    expect(codes(r.warnings)).toContain('AMOUNT_ROUND');
  });

  it('ยอดปกติ + วันที่ปกติ → ไม่มีคำเตือน', async () => {
    const r = await service.precheck({
      sc_id: 1, budget_year: '', payload: { amount: 3500, action_date: ymd(-2) },
    });
    expect(r.warnings).toHaveLength(0);
  });

  it('AMOUNT_HIGH ใช้ P95×3 จากประวัติ', async () => {
    // ประวัติยอดราว 5,000 → p95≈5000, threshold = max(15000, 100000)=100000
    ftRepo.find.mockResolvedValue(
      Array.from({ length: 50 }, () => ({ amount: 5000 })),
    );
    const r = await service.precheck({
      sc_id: 1, budget_year: '', payload: { total: 120000 },
    });
    expect(codes(r.warnings)).toContain('AMOUNT_HIGH');
  });

  it('อาจบันทึกซ้ำ → MAYBE_DUP', async () => {
    ftRepo.createQueryBuilder.mockReturnValue({
      where: () => ({
        andWhere: () => ({ andWhere: () => ({ getCount: () => Promise.resolve(1) }) }),
      }),
    });
    const r = await service.precheck({
      sc_id: 1, budget_year: '', payload: { amount: 3500, action_date: '2026-06-10' },
    });
    expect(codes(r.warnings)).toContain('MAYBE_DUP');
  });
});
