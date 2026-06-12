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
import { CashReserveLimit } from '../../report-daily-balance/entities/cash-reserve-limit.entity';
import { CashKeepingRecord } from '../../cash-keeping/entities/cash-keeping-record.entity';
import { RequestWithdraw } from '../../invoice/entities/request-withdraw.entity';
import { PlnReceive } from '../../receive/entities/pln-receive.entity';
import { BudgetIncomeTypeSchool } from '../../bank/entities/budget-income-type-school.entity';
import { FiscalYearBalance } from '../../fiscal-year-balance/entities/fiscal-year-balance.entity';
import { FinanceAnnualAttestation } from '../entities/finance-annual-attestation.entity';
import { OpeningBalance } from '../../opening-balance/entities/opening-balance.entity';

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
      [OpeningBalance, 'opening'],
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
      [CashReserveLimit, 'crl'],
      [CashKeepingRecord, 'ckr'],
      [RequestWithdraw, 'rw'],
      [PlnReceive, 'pr'],
      [BudgetIncomeTypeSchool, 'bits'],
      [FiscalYearBalance, 'fyb'],
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

  it('3.3 เงินสดเกินวงเงินเก็บรักษา → no ; ไม่ตั้งวงเงิน → unknown', async () => {
    const svc1 = await build({
      crl: repoMock({ findOne: { limitAmount: 15000 } }),
      ft: repoMock({
        find: [
          { type: 1, amount: 20000, moneyChannel: 1 },
          { type: -1, amount: 2000, moneyChannel: 1 },
        ],
        count: 2,
      }),
    });
    expect((await svc1.evaluate(ctx))['3.3'].result).toBe('no'); // คงเหลือ 18,000 > 15,000

    const svc2 = await build({ crl: repoMock({ findOne: null }) });
    expect((await svc2.evaluate(ctx))['3.3'].result).toBe('unknown');
  });

  it('4.3 รับเงินยืนยันแล้วแต่ไม่มีใบเสร็จ → no', async () => {
    const svc = await build({
      pr: repoMock({ find: [{ prId: 1 }, { prId: 2 }] }),
      receipt: repoMock({ find: [{ prId: 1, status: '1' }], count: 1 }),
    });
    const r = await svc.evaluate(ctx);
    expect(r['4.3'].result).toBe('no'); // pr 2 ไม่มีใบเสร็จ
    expect(r['4.5'].result).toBe('yes'); // single-source
  });

  it('5.2 จ่ายผูกใบขอเบิกที่ยังไม่ผ่าน ผอ. → no ; ผ่านครบ → yes', async () => {
    const ftPays = [
      { type: -1, amount: 100, rwId: 11 },
      { type: -1, amount: 200, rwId: 12 },
    ];
    const svc1 = await build({
      ft: repoMock({ find: ftPays, count: 2 }),
      rw: repoMock({
        find: [
          { rwId: 11, status: 202 },
          { rwId: 12, status: 100 }, // ยังไม่ถึง ผอ.อนุมัติ
        ],
      }),
    });
    expect((await svc1.evaluate(ctx))['5.2'].result).toBe('no');

    const svc2 = await build({
      ft: repoMock({ find: ftPays, count: 2 }),
      rw: repoMock({
        find: [
          { rwId: 11, status: 200 },
          { rwId: 12, status: 202 },
        ],
      }),
    });
    expect((await svc2.evaluate(ctx))['5.2'].result).toBe('yes');
  });

  it('5.3 ใบขอเบิกจ่ายแล้วไม่มีใบสำคัญคู่จ่าย → no', async () => {
    const svc = await build({
      rw: repoMock({
        find: [
          { rwId: 1, status: 202, receiptNumber: 'ร.1', receiptPicture: null },
          { rwId: 2, status: 202, receiptNumber: null, receiptPicture: null },
        ],
      }),
    });
    expect((await svc.evaluate(ctx))['5.3'].result).toBe('no');
  });

  it('6.7 ผอ. (role 3) ไม่ลงนามครบทุกวันที่มีรายการ → no', async () => {
    const svc = await build({
      ft: repoMock({ qbRows: [{ d: '2026-01-05' }, { d: '2026-01-06' }], count: 2 }),
      audit: repoMock({
        count: 2,
        qbRows: [
          { d: '2026-01-05', role: 3 },
          { d: '2026-01-06', role: 1 }, // วันที่ 6 มีแต่การเงิน ผอ.ไม่ลงนาม
        ],
      }),
    });
    const r = await svc.evaluate(ctx);
    expect(r['2.1'].result).toBe('yes'); // มีลงนาม (role ใดก็ได้) ครบ
    expect(r['6.7'].result).toBe('no'); // ผอ. ไม่ครบ
  });

  it('7.5/10.5 ปีงบอนาคต → unknown (ยังไม่ถึงกำหนด)', async () => {
    const future = String(new Date().getFullYear() + 543 + 2); // ปีงบอนาคตแน่นอน
    const svc = await build({
      rb: repoMock({ find: [{ budgetYear: future, currentNo: 1, toNo: 50 }] }),
    });
    const r = await svc.evaluate({ scId: 1, syId: 1, budgetYear: future });
    expect(r['7.5'].result).toBe('unknown');
    expect(r['10.5'].result).toBe('unknown');
  });

  it('1.3 แผนครอบคลุมแหล่งเงิน: ครบ → yes / ขาด → no', async () => {
    const types = [{ bgTypeId: 1 }, { bgTypeId: 2 }];
    const svc1 = await build({
      proj: repoMock({
        find: [{ projBudgetType: 'อุดหนุนรายหัว' }, { projBudgetType: 'เรียนฟรี' }],
        count: 2,
      }),
      bits: repoMock({ find: types }),
    });
    expect((await svc1.evaluate(ctx))['1.3'].result).toBe('yes');

    const svc2 = await build({
      proj: repoMock({ find: [{ projBudgetType: 'อุดหนุนรายหัว' }], count: 1 }),
      bits: repoMock({ find: types }),
    });
    expect((await svc2.evaluate(ctx))['1.3'].result).toBe('no');
  });

  // ── ข้อ 3: เทียบยอดจริง (เลิก tautology) — จับประเภทเงินติดลบ ──
  it('2.2/7.1: ประเภทเงินยอดติดลบ → no (ยอดยกมา+รับ-จ่าย ต่อประเภท)', async () => {
    const svc = await build({
      opening: repoMock({ qbRows: [{ tid: 9, amt: '1000' }] }),
      ft: repoMock({ qbRows: [{ tid: 9, amt: '-2000' }], count: 1 }), // จ่ายเกินยอด → -1000
    });
    const r = await svc.evaluate(ctx);
    expect(r['2.2'].result).toBe('no');
    expect(r['7.1'].result).toBe('no');
  });

  it('2.2: ทุกประเภทไม่ติดลบ → yes (แสดงยอดรวมจริง)', async () => {
    const svc = await build({
      opening: repoMock({ qbRows: [{ tid: 9, amt: '5000' }] }),
      ft: repoMock({ qbRows: [{ tid: 9, amt: '-2000' }] }), // เหลือ 3000
    });
    const r = await svc.evaluate(ctx);
    expect(r['2.2'].result).toBe('yes');
    expect(r['2.2'].detail).toContain('3,000');
  });

  it('2.5: ถอนเงินฝากส่วนราชการเกินยอดฝาก → no', async () => {
    const svc = await build({
      smp: repoMock({
        find: [
          { entryType: 1, amount: 1000 }, // ฝาก
          { entryType: 2, amount: 3000 }, // ถอน → -2000
        ],
      }),
    });
    expect((await svc.evaluate(ctx))['2.5'].result).toBe('no');
  });
});
