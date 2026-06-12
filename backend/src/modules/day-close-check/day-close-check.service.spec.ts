import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DayCloseCheckService } from './day-close-check.service';
import { CashKeepingRecord } from '../cash-keeping/entities/cash-keeping-record.entity';
import { FinancialAuditLog } from '../financial-audit/entities/financial-audit-log.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';

describe('DayCloseCheckService', () => {
  let service: DayCloseCheckService;
  let ckr: any, audit: any, loan: any;

  beforeEach(async () => {
    ckr = { find: jest.fn().mockResolvedValue([]) };
    audit = { findOne: jest.fn().mockResolvedValue(null) };
    loan = { find: jest.fn().mockResolvedValue([]) };
    const repo = () => ({ find: jest.fn(), findOne: jest.fn() });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DayCloseCheckService,
        { provide: getRepositoryToken(CashKeepingRecord), useValue: ckr },
        { provide: getRepositoryToken(FinancialAuditLog), useValue: audit },
        { provide: getRepositoryToken(LoanAgreement), useValue: loan },
        { provide: getRepositoryToken(RequestWithdraw), useValue: repo() },
        { provide: getRepositoryToken(PlnReceive), useValue: repo() },
        { provide: getRepositoryToken(FinancialTransactions), useValue: repo() },
      ],
    }).compile();
    service = module.get(DayCloseCheckService);
  });

  const byId = (r: any, id: string) => r.items.find((i: any) => i.id === id);

  it('ยังไม่ลงนามรายวัน/รายเดือน → warn และ all_passed=false', async () => {
    const r = await service.runDayCloseCheck(1, 2, '2026-06-10');
    expect(byId(r, 'audit_receive').status).toBe('warn');
    expect(byId(r, 'audit_register').status).toBe('warn');
    expect(r.all_passed).toBe(false);
  });

  it('ลงนามรายวันแล้ว → audit_receive = pass + ชื่อผู้ลงนาม', async () => {
    audit.findOne.mockImplementation((opts: any) =>
      Promise.resolve(
        opts.where.auditType === 1
          ? { signedName: 'ผอ.สมชาย', auditDate: '2026-06-10' }
          : null,
      ),
    );
    const r = await service.runDayCloseCheck(1, 2, '2026-06-10');
    expect(byId(r, 'audit_receive').status).toBe('pass');
    expect(byId(r, 'audit_receive').detail).toContain('ผอ.สมชาย');
  });

  it('เงินยืมเกินกำหนด → loan_overdue = warn + รวมยอด', async () => {
    loan.find.mockResolvedValue([
      { amount: 10000, status: 1 },
      { amount: 5000, status: 1 },
    ]);
    const r = await service.runDayCloseCheck(1, 2, '2026-06-10');
    const item = byId(r, 'loan_overdue');
    expect(item.status).toBe('warn');
    expect(item.detail).toContain('2 รายการ');
    expect(item.detail).toContain('15,000');
  });

  it('ทุกอย่างผ่าน (ลงนามครบ ไม่มีเงินยืมค้าง ไม่มีเงินเก็บรักษา) → all_passed=true', async () => {
    audit.findOne.mockResolvedValue({ signedName: 'ผอ.', auditDate: '2026-06-10' });
    const r = await service.runDayCloseCheck(1, 2, '2026-06-10');
    // cash=pass (ไม่มี pending), audit×2=pass, loan=pass
    expect(r.all_passed).toBe(true);
    expect(r.items).toHaveLength(4);
  });

  it('error ใน repo → degrade เป็น warn ไม่ throw', async () => {
    audit.findOne.mockRejectedValue(new Error('db down'));
    const r = await service.runDayCloseCheck(1, 2, '2026-06-10');
    expect(byId(r, 'audit_receive').status).toBe('warn');
    expect(r.check_date).toBe('2026-06-10');
  });
});
