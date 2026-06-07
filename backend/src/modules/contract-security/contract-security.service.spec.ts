import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContractSecurityService } from './contract-security.service';
import { ContractSecurity } from './entities/contract-security.entity';
import { ContractPenalty } from './entities/contract-penalty.entity';
import { SmpDepositEntry } from '../smp-deposit/entities/smp-deposit-entry.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';

// ─── QueryBuilder mock factory (getOne) ──────────────────────────────────────
function makeQb(oneResult: unknown = null) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['where', 'andWhere', 'orderBy', 'select'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getOne'] = jest.fn().mockResolvedValue(oneResult);
  return qb;
}

describe('ContractSecurityService', () => {
  let service: ContractSecurityService;
  let secRepo: jest.Mocked<any>;
  let penRepo: jest.Mocked<any>;
  let smpRepo: jest.Mocked<any>;
  let budgetTypeRepo: jest.Mocked<any>;
  let regulatoryConfig: jest.Mocked<Pick<RegulatoryConfigService, 'getThreshold'>>;

  beforeEach(async () => {
    secRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(),
    };
    penRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(),
    };
    smpRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(),
    };
    budgetTypeRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQb(null)) };
    regulatoryConfig = { getThreshold: jest.fn().mockResolvedValue(5) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractSecurityService,
        { provide: getRepositoryToken(ContractSecurity), useValue: secRepo },
        { provide: getRepositoryToken(ContractPenalty), useValue: penRepo },
        { provide: getRepositoryToken(SmpDepositEntry), useValue: smpRepo },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: budgetTypeRepo },
        { provide: RegulatoryConfigService, useValue: regulatoryConfig },
      ],
    }).compile();

    service = module.get(ContractSecurityService);
  });

  // ─── loadByContract ──────────────────────────────────────────────────────
  describe('loadByContract', () => {
    it('filter ctId และ del=0', async () => {
      secRepo.find.mockResolvedValue([]);
      await service.loadByContract(7);
      expect(secRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ctId: 7, del: 0 } }),
      );
    });

    it('map field + แปลง type/form/status เป็นชื่อ และ amount เป็น number', async () => {
      secRepo.find.mockResolvedValue([
        {
          csId: 1,
          ctId: 7,
          securityType: 2,
          securityForm: 1,
          amount: '5000.50',
          percentOfContract: '5',
          bankName: 'ธ.กรุงไทย',
          documentNo: 'D-1',
          status: 1,
          note: null,
        },
      ]);
      const [row] = await service.loadByContract(7);
      expect(row.security_type_name).toBe('หลักประกันสัญญา');
      expect(row.security_form_name).toBe('เงินสด');
      expect(row.status_name).toBe('ถือครอง');
      expect(row.amount).toBe(5000.5);
      expect(row.percent_of_contract).toBe(5);
    });

    it('type/form/status ที่ไม่รู้จัก → ชื่อเป็น empty string', async () => {
      secRepo.find.mockResolvedValue([
        { csId: 1, ctId: 7, securityType: 99, securityForm: 99, status: 99, amount: null },
      ]);
      const [row] = await service.loadByContract(7);
      expect(row.security_type_name).toBe('');
      expect(row.security_form_name).toBe('');
      expect(row.status_name).toBe('');
      expect(row.amount).toBe(0);
    });
  });

  // ─── addSecurity ─────────────────────────────────────────────────────────
  describe('addSecurity', () => {
    it('happy path (form != 1) → ไม่นำฝาก สพป. flag: true', async () => {
      const result = await service.addSecurity({
        ct_id: 7,
        sc_id: 1,
        security_type: 2,
        security_form: 3, // หนังสือค้ำประกัน
        amount: 5000,
        up_by: 9,
      });
      expect(result.flag).toBe(true);
      expect(smpRepo.save).not.toHaveBeenCalled();
      expect(secRepo.save).toHaveBeenCalledTimes(1);
    });

    it('form=1 (เงินสด) → สร้างรายการนำฝาก สพป. และผูก smpDepositId', async () => {
      smpRepo.save.mockImplementation(async (x: any) => {
        x.sdeId = 55;
        return x;
      });
      budgetTypeRepo.createQueryBuilder.mockReturnValue(
        makeQb({ bgTypeId: 3, budgetType: 'เงินประกันสัญญา' }),
      );
      const result = await service.addSecurity({
        ct_id: 7,
        sc_id: 1,
        sy_id: 3,
        budget_year: 2569,
        security_type: 2,
        security_form: 1,
        amount: 5000,
        document_no: 'D-1',
        up_by: 9,
      });
      expect(smpRepo.save).toHaveBeenCalled();
      // smpDepositId ผูกกลับ + save อีกครั้ง
      expect(secRepo.save).toHaveBeenCalledTimes(2);
      expect(result.ms).toContain('นำฝาก สพป.');
    });

    it('form ค่า default = 1 เมื่อไม่ส่ง security_form → นำฝาก สพป.', async () => {
      await service.addSecurity({ ct_id: 7, sc_id: 1, security_type: 4, amount: 100, up_by: 1 });
      expect(smpRepo.save).toHaveBeenCalled();
    });

    it('type=2 + contract_amount → เตือนเมื่อยอดต่างจาก % ที่กำหนด (ไม่บล็อก)', async () => {
      const result = await service.addSecurity({
        ct_id: 7,
        sc_id: 1,
        security_type: 2,
        security_form: 3,
        amount: 1000, // ควรเป็น 5% ของ 100000 = 5000
        contract_amount: 100000,
        up_by: 1,
      });
      expect(regulatoryConfig.getThreshold).toHaveBeenCalledWith(
        1,
        'procurement.contract_security_pct',
      );
      expect(result.flag).toBe(true);
      expect(result.ms).toContain('เตือน');
    });

    it('type=2 + ยอดตรงกับ % → ไม่เตือน', async () => {
      const result = await service.addSecurity({
        ct_id: 7,
        sc_id: 1,
        security_type: 2,
        security_form: 3,
        amount: 5000, // = 5% ของ 100000
        contract_amount: 100000,
        up_by: 1,
      });
      expect(result.ms).not.toContain('เตือน');
    });
  });

  // ─── returnSecurity ──────────────────────────────────────────────────────
  describe('returnSecurity', () => {
    const dto = { cs_id: 1, return_date: '2026-05-01', return_evidence_no: 'R-1', up_by: 9 };

    it('ไม่พบรายการ → flag: false', async () => {
      secRepo.findOne.mockResolvedValue(null);
      const result = await service.returnSecurity(dto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการหลักประกัน' });
    });

    it('สถานะไม่ใช่ถือครอง (status != 1) → flag: false', async () => {
      secRepo.findOne.mockResolvedValue({ csId: 1, status: 2, del: 0 });
      const result = await service.returnSecurity(dto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ถือครอง');
    });

    it('happy path → set status=2, returnDate, returnEvidenceNo และ flag: true', async () => {
      const s: any = { csId: 1, status: 1, del: 0, smpDepositId: null };
      secRepo.findOne.mockResolvedValue(s);
      const result = await service.returnSecurity(dto);
      expect(s.status).toBe(2);
      expect(s.returnDate).toBe('2026-05-01');
      expect(s.returnEvidenceNo).toBe('R-1');
      expect(result).toEqual({ flag: true, ms: 'คืนหลักประกันเรียบร้อยแล้ว' });
    });

    it('มี smpDepositId → สร้างรายการถอน (mirror) เงินฝากส่วนราชการ', async () => {
      const s: any = {
        csId: 1,
        ctId: 7,
        status: 1,
        del: 0,
        smpDepositId: 55,
        securityType: 2,
        returnEvidenceNo: 'R-1',
      };
      secRepo.findOne.mockResolvedValue(s);
      smpRepo.findOne.mockResolvedValue({
        sdeId: 55,
        scId: 1,
        syId: 3,
        budgetYear: 2569,
        amount: 5000,
        moneyTypeId: 3,
        moneyTypeName: 'เงินประกันสัญญา',
        docNo: 'D-1',
      });
      await service.returnSecurity(dto);
      expect(smpRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ entryType: 2, amount: 5000 }),
      );
    });

    it('smpDepositId มี แต่ไม่พบ original entry → ไม่สร้าง mirror', async () => {
      const s: any = { csId: 1, status: 1, del: 0, smpDepositId: 55, securityType: 2 };
      secRepo.findOne.mockResolvedValue(s);
      smpRepo.findOne.mockResolvedValue(null);
      await service.returnSecurity(dto);
      expect(smpRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── confiscateSecurity ──────────────────────────────────────────────────
  describe('confiscateSecurity', () => {
    it('ไม่พบรายการ → flag: false', async () => {
      secRepo.findOne.mockResolvedValue(null);
      const result = await service.confiscateSecurity({ cs_id: 1, up_by: 9 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการหลักประกัน' });
    });

    it('happy path → status=3 (ยึด) และ flag: true', async () => {
      const s: any = { csId: 1, status: 1, del: 0 };
      secRepo.findOne.mockResolvedValue(s);
      const result = await service.confiscateSecurity({ cs_id: 1, note: 'ยึด', up_by: 9 });
      expect(s.status).toBe(3);
      expect(s.note).toBe('ยึด');
      expect(result.flag).toBe(true);
    });
  });

  // ─── removeSecurity ──────────────────────────────────────────────────────
  describe('removeSecurity', () => {
    it('ไม่พบรายการ → flag: false', async () => {
      secRepo.findOne.mockResolvedValue(null);
      const result = await service.removeSecurity(1, 9);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('สถานะคืนแล้ว (status=2) → ลบไม่ได้', async () => {
      secRepo.findOne.mockResolvedValue({ csId: 1, status: 2, del: 0 });
      const result = await service.removeSecurity(1, 9);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('คืนแล้ว');
    });

    it('happy path → soft delete (del=1) flag: true', async () => {
      const s: any = { csId: 1, status: 1, del: 0 };
      secRepo.findOne.mockResolvedValue(s);
      const result = await service.removeSecurity(1, 9);
      expect(s.del).toBe(1);
      expect(s.upBy).toBe(9);
      expect(result.flag).toBe(true);
    });
  });

  // ─── calcPenalty ─────────────────────────────────────────────────────────
  describe('calcPenalty', () => {
    const base = {
      ct_id: 7,
      sc_id: 1,
      due_date: '2026-05-01',
      actual_delivery_date: '2026-05-11',
      contract_amount: 100000,
      up_by: 9,
    };

    it('ส่งมอบภายในกำหนด (ไม่ล่าช้า) → flag: false ไม่บันทึก', async () => {
      const result = await service.calcPenalty({
        ...base,
        actual_delivery_date: '2026-05-01',
      });
      expect(result.flag).toBe(false);
      expect(result.days_late).toBe(0);
      expect(penRepo.save).not.toHaveBeenCalled();
    });

    it('ค่าปรับ = max(100/วัน, rate% ของมูลค่าสัญญา) — เลือก percent เมื่อสูงกว่า', async () => {
      // 10 วัน, 100000 * 0.1% = 100/วัน → เท่ากับ 100, perDay=100
      const result = await service.calcPenalty(base);
      expect(result.days_late).toBe(10);
      expect(result.per_day).toBe(100);
      expect(result.penalty_amount).toBe(1000);
      expect(penRepo.save).toHaveBeenCalled();
    });

    it('rate% ต่ำ → ใช้ขั้นต่ำ 100 บาท/วัน', async () => {
      // contract เล็ก, byPercent < 100 → perDay = 100
      const result = await service.calcPenalty({
        ...base,
        contract_amount: 1000, // 0.1% = 1 บาท
      });
      expect(result.per_day).toBe(100);
      expect(result.penalty_amount).toBe(1000); // 100 * 10
    });

    it('กำหนด daily_rate_percent เอง → ใช้ค่านั้น', async () => {
      const result = await service.calcPenalty({
        ...base,
        daily_rate_percent: 1, // 100000 * 1% = 1000/วัน
      });
      expect(result.per_day).toBe(1000);
      expect(result.penalty_amount).toBe(10000);
    });
  });

  // ─── markPenaltyCollected ────────────────────────────────────────────────
  describe('markPenaltyCollected', () => {
    it('ไม่พบค่าปรับ → flag: false', async () => {
      penRepo.findOne.mockResolvedValue(null);
      const result = await service.markPenaltyCollected(1, '2026-05-01', 9);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบค่าปรับ' });
    });

    it('happy path → status=3 + collectedDate', async () => {
      const p: any = { cpId: 1, status: 1, del: 0 };
      penRepo.findOne.mockResolvedValue(p);
      const result = await service.markPenaltyCollected(1, '2026-05-01', 9);
      expect(p.status).toBe(3);
      expect(p.collectedDate).toBe('2026-05-01');
      expect(result.flag).toBe(true);
    });
  });

  // ─── waivePenalty ────────────────────────────────────────────────────────
  describe('waivePenalty', () => {
    it('ไม่พบค่าปรับ → flag: false', async () => {
      penRepo.findOne.mockResolvedValue(null);
      const result = await service.waivePenalty(1, 'เหตุผล', 9);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบค่าปรับ' });
    });

    it('happy path → status=4 + waivedReason', async () => {
      const p: any = { cpId: 1, status: 1, del: 0 };
      penRepo.findOne.mockResolvedValue(p);
      const result = await service.waivePenalty(1, 'เหตุสุดวิสัย', 9);
      expect(p.status).toBe(4);
      expect(p.waivedReason).toBe('เหตุสุดวิสัย');
      expect(result.flag).toBe(true);
    });
  });

  // ─── loadPenalties ───────────────────────────────────────────────────────
  describe('loadPenalties', () => {
    it('filter ctId และ del=0', async () => {
      penRepo.find.mockResolvedValue([]);
      await service.loadPenalties(7);
      expect(penRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ctId: 7, del: 0 } }),
      );
    });

    it('map field + แปลง amount string → number', async () => {
      penRepo.find.mockResolvedValue([
        {
          cpId: 1,
          ctId: 7,
          daysLate: 10,
          contractAmount: '100000',
          dailyRatePercent: '0.1',
          penaltyAmount: '1000.50',
          status: 1,
        },
      ]);
      const [row] = await service.loadPenalties(7);
      expect(row.contract_amount).toBe(100000);
      expect(row.penalty_amount).toBe(1000.5);
      expect(row.daily_rate_percent).toBe(0.1);
    });
  });
});
