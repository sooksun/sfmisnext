import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RuleEngineService } from './rule-engine.service';
import { GovRevenueEntry } from '../../gov-revenue/entities/gov-revenue-entry.entity';
import { FinancialTransactions } from '../../report-daily-balance/entities/financial-transactions.entity';
import { BudgetRequest } from '../../budget-request/entities/budget-request.entity';
import { BankLedgerEntry } from '../../bank-ledger/entities/bank-ledger-entry.entity';
import { SmpDepositEntry } from '../../smp-deposit/entities/smp-deposit-entry.entity';
import { DepositRegister } from '../../deposit-register/entities/deposit-register.entity';
import { CashKeepingCommittee } from '../../cash-committee/entities/cash-keeping-committee.entity';
import { BankReconciliation } from '../../bank-reconciliation/entities/bank-reconciliation.entity';
import { MonthlySubmission } from '../../monthly-submission/entities/monthly-submission.entity';
import { FinancialAuditLog } from '../../financial-audit/entities/financial-audit-log.entity';
import { LoanAgreement } from '../../loan-agreement/entities/loan-agreement.entity';
import { ReceiptBook } from '../../receipt-book/entities/receipt-book.entity';
import { Project } from '../../project/entities/project.entity';
import { Receipt } from '../../receipt/entities/receipt.entity';
import { WithholdingCertificate } from '../../registration-certificate/entities/withholding-certificate.entity';
import { FinanceAnnualAttestation } from '../entities/finance-annual-attestation.entity';

function qbStub(rows: any[]) {
  const qb: any = {
    select: () => qb,
    addSelect: () => qb,
    where: () => qb,
    andWhere: () => qb,
    groupBy: () => qb,
    getRawMany: () => Promise.resolve(rows),
  };
  return qb;
}

function repoMock(opts: {
  count?: number;
  find?: any[];
  findOne?: any;
  qbRows?: any[];
}) {
  return {
    count: jest.fn().mockResolvedValue(opts.count ?? 0),
    find: jest.fn().mockResolvedValue(opts.find ?? []),
    findOne: jest.fn().mockResolvedValue(opts.findOne ?? null),
    createQueryBuilder: jest.fn(() => qbStub(opts.qbRows ?? [])),
  };
}

describe('RuleEngineService', () => {
  async function build(repos: Record<string, any>) {
    const tokens: [any, string][] = [
      [GovRevenueEntry, 'gov'],
      [FinancialTransactions, 'ft'],
      [BudgetRequest, 'br'],
      [BankLedgerEntry, 'ble'],
      [SmpDepositEntry, 'smp'],
      [DepositRegister, 'dep'],
      [CashKeepingCommittee, 'ckc'],
      [BankReconciliation, 'recon'],
      [MonthlySubmission, 'ms'],
      [FinancialAuditLog, 'audit'],
      [LoanAgreement, 'loan'],
      [ReceiptBook, 'rb'],
      [Project, 'proj'],
      [Receipt, 'receipt'],
      [WithholdingCertificate, 'wht'],
      [FinanceAnnualAttestation, 'attest'],
    ];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        ...tokens.map(([ent, key]) => ({
          provide: getRepositoryToken(ent),
          useValue: repos[key] ?? repoMock({}),
        })),
      ],
    }).compile();
    return module.get(RuleEngineService);
  }

  const ctx = { scId: 1, syId: 1, budgetYear: '2569' };

  it('ไม่มีเงินยืม → 9.1/9.3/9.4/9.5 = na', async () => {
    const svc = await build({ loan: repoMock({ find: [] }) });
    const r = await svc.evaluate(ctx);
    expect(r['9.1'].result).toBe('na');
    expect(r['9.3'].result).toBe('na');
    expect(r['9.4'].result).toBe('na');
    expect(r['9.5'].result).toBe('na');
  });

  it('ส่งใช้เงินยืมเกินกำหนด → 9.4 = no', async () => {
    const loan = repoMock({
      find: [
        {
          borrowerId: 5,
          borrowerName: 'ครู ก',
          expenseDetail: 'ไปราชการ',
          status: 2, // RETURNED
          dueDate: '2026-01-10',
          returnedDate: '2026-02-01', // เกินกำหนด
        },
      ],
    });
    const svc = await build({ loan });
    const r = await svc.evaluate(ctx);
    expect(r['9.4'].result).toBe('no');
    expect(r['9.1'].result).toBe('yes'); // ข้อมูลครบ
  });

  it('มีทะเบียนคุม → 6.1/6.2/6.4/6.6 = yes ; ไม่มีเงินประกัน → 6.3 = na', async () => {
    const svc = await build({
      gov: repoMock({ count: 3 }),
      ft: repoMock({ count: 50 }),
      br: repoMock({ count: 8 }),
      smp: repoMock({ count: 4 }),
      dep: repoMock({ count: 0 }),
      ble: repoMock({ count: 0 }),
    });
    const r = await svc.evaluate(ctx);
    expect(r['6.1'].result).toBe('yes');
    expect(r['6.2'].result).toBe('yes');
    expect(r['6.4'].result).toBe('yes');
    expect(r['6.6'].result).toBe('yes');
    expect(r['6.3'].result).toBe('na'); // ไม่มีเงินประกันสัญญา
    expect(r['6.5'].result).toBe('na'); // ไม่มีบัญชีกระแสรายวัน
  });

  it('กรรมการเก็บรักษาเงิน < 2 คน → 3.1 = no', async () => {
    const svc = await build({ ckc: repoMock({ count: 1 }) });
    const r = await svc.evaluate(ctx);
    expect(r['3.1'].result).toBe('no');
  });

  it('เล่มใบเสร็จปีก่อนยังเปิดใช้ → 10.3 = no, 10.4 = no', async () => {
    const rb = repoMock({
      find: [
        {
          budgetYear: '2569',
          closedDate: null,
          voidedDate: null,
          currentNo: 5,
          toNo: 50,
        },
        {
          budgetYear: '2568',
          closedDate: null,
          voidedDate: null,
          currentNo: 30,
          toNo: 50,
        }, // ปีก่อน ยังเปิด มีเลขเหลือ ยังไม่ retired
      ],
    });
    const svc = await build({ rb });
    const r = await svc.evaluate(ctx);
    expect(r['10.1'].result).toBe('yes');
    expect(r['10.3'].result).toBe('no');
    expect(r['10.4'].result).toBe('no');
  });

  it('10.4 เล่มปีก่อนประทับตราเลิกใช้แล้ว → yes', async () => {
    const rb = repoMock({
      find: [
        {
          budgetYear: '2568',
          closedDate: null,
          voidedDate: null,
          currentNo: 30,
          toNo: 50,
          retiredDate: '2025-10-01',
        },
      ],
    });
    const svc = await build({ rb });
    const r = await svc.evaluate(ctx);
    expect(r['10.4'].result).toBe('yes');
  });

  it('2.4 งบเทียบยอดไม่ลงตัว → no ; ไม่มี recon → na', async () => {
    const svc1 = await build({
      recon: repoMock({ find: [{ isBalanced: 1 }, { isBalanced: 0 }] }),
    });
    expect((await svc1.evaluate(ctx))['2.4'].result).toBe('no');
    const svc2 = await build({ recon: repoMock({ find: [] }) });
    expect((await svc2.evaluate(ctx))['2.4'].result).toBe('na');
  });

  it('1.4 มีบันทึกความเห็นชอบ กก. → yes ; ไม่มี → unknown', async () => {
    const svc1 = await build({
      attest: repoMock({
        findOne: { planCommitteeDate: '2025-05-10', planCommitteeDocNo: '1/2569' },
      }),
    });
    expect((await svc1.evaluate(ctx))['1.4'].result).toBe('yes');
    const svc2 = await build({ attest: repoMock({ findOne: null }) });
    expect((await svc2.evaluate(ctx))['1.4'].result).toBe('unknown');
  });

  it('3.5 นำส่งภาษีเกินกำหนด → no', async () => {
    const wht = repoMock({
      find: [
        { cerDate: '2026-01-15', remitDate: '2026-02-20', remitChannel: 1 },
      ],
    });
    const r = await (await build({ wht })).evaluate(ctx);
    expect(r['3.5'].result).toBe('no');
  });
});
