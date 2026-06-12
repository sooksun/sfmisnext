import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FinancialAssessmentService } from './financial-assessment.service';
import { RuleEngineService } from './rules/rule-engine.service';
import { FinancialAssessment } from './entities/financial-assessment.entity';
import { FinancialAssessmentItem } from './entities/financial-assessment-item.entity';
import { FinanceAnnualAttestation } from './entities/finance-annual-attestation.entity';
import { School } from '../school/entities/school.entity';
import {
  ASSESS_ITEMS,
  validateCatalog,
  assessLevel,
} from './catalog/assessment-catalog';

describe('FinancialAssessment — catalog', () => {
  it('รวมคะแนนเต็มทั้ง catalog = 100 และมี 52 ข้อ', () => {
    const v = validateCatalog();
    expect(v.ok).toBe(true);
    expect(v.total).toBeCloseTo(100, 5);
    expect(v.count).toBe(52);
  });

  it('item_code ไม่ซ้ำกัน', () => {
    const codes = ASSESS_ITEMS.map((i) => i.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('assessLevel จัดระดับตามเกณฑ์ 2544', () => {
    expect(assessLevel(90).level).toBe(4); // ดีมาก
    expect(assessLevel(85).level).toBe(4);
    expect(assessLevel(84.5).level).toBe(3); // ดี
    expect(assessLevel(70).level).toBe(3);
    expect(assessLevel(69.5).level).toBe(2); // พอใช้
    expect(assessLevel(60).level).toBe(2);
    expect(assessLevel(59.99).level).toBe(1); // ปรับปรุง
  });
});

describe('FinancialAssessmentService — scoring', () => {
  let service: FinancialAssessmentService;
  let faRepo: jest.Mocked<any>;
  let itemRepo: jest.Mocked<any>;
  let schoolRepo: jest.Mocked<any>;

  beforeEach(async () => {
    faRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    itemRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    schoolRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialAssessmentService,
        { provide: getRepositoryToken(FinancialAssessment), useValue: faRepo },
        {
          provide: getRepositoryToken(FinancialAssessmentItem),
          useValue: itemRepo,
        },
        {
          provide: getRepositoryToken(FinanceAnnualAttestation),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(School),
          useValue: schoolRepo,
        },
        {
          provide: RuleEngineService,
          useValue: { evaluate: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get(FinancialAssessmentService);
  });

  it('confirm: yes ทุกข้อ → 100 คะแนน ระดับ 4 และ status=2', async () => {
    const head: any = { faId: 1, scId: 1, status: 1, del: 0 };
    faRepo.findOne.mockResolvedValue(head);
    itemRepo.find.mockResolvedValue(
      ASSESS_ITEMS.map((d) => ({
        itemCode: d.code,
        weight: d.weight,
        answer: 'yes',
      })),
    );

    const r = await service.confirm(
      { fa_id: 1 } as any,
      { admin_id: 9, sc_id: 1, type: 2, username: 'u' } as any,
    );

    expect(r.flag).toBe(true);
    expect(head.totalScore).toBeCloseTo(100, 5);
    expect(head.maxScore).toBeCloseTo(100, 5);
    expect(head.percent).toBeCloseTo(100, 5);
    expect(head.level).toBe(4);
    expect(head.status).toBe(2);
    expect(head.confirmedBy).toBe(9);
  });

  it('กฎ N/A: ตัดออกจากฐานคะแนน ไม่นับเป็น 0', async () => {
    const head: any = { faId: 2, scId: 1, status: 1, del: 0 };
    faRepo.findOne.mockResolvedValue(head);
    // เงินยืม (ประเด็น 9, รวม 5) ตอบ na ทั้งหมด, ข้ออื่น yes ทั้งหมด
    itemRepo.find.mockResolvedValue(
      ASSESS_ITEMS.map((d) => ({
        itemCode: d.code,
        weight: d.weight,
        answer: d.topic === 9 ? 'na' : 'yes',
      })),
    );

    await service.confirm(
      { fa_id: 2 } as any,
      { admin_id: 1, sc_id: 1, type: 2, username: 'u' } as any,
    );

    // ฐานคะแนนเหลือ 95 (ตัดเงินยืม 5 ออก), ได้ครบ 95 → 100%
    expect(head.maxScore).toBeCloseTo(95, 5);
    expect(head.totalScore).toBeCloseTo(95, 5);
    expect(head.percent).toBeCloseTo(100, 5);
    expect(head.level).toBe(4);
  });

  it('saveAssessment: ปฏิเสธถ้าชุดประเมินถูกยืนยันแล้ว (status>=2)', async () => {
    faRepo.findOne.mockResolvedValue({ faId: 3, status: 2, del: 0 });
    const r = await service.saveAssessment({
      sc_id: 1,
      sy_id: 1,
      budget_year: '2569',
    } as any);
    expect(r.flag).toBe(false);
  });

  // ── PRD §10.5: super admin override lock หลัง confirm ──
  it('saveAssessment: super admin (type=1) แก้ได้แม้ยืนยันแล้ว', async () => {
    faRepo.findOne.mockResolvedValue({ faId: 3, scId: 1, status: 2, del: 0 });
    itemRepo.find.mockResolvedValue([]);
    const r = await service.saveAssessment(
      { sc_id: 1, sy_id: 1, budget_year: '2569' } as any,
      { admin_id: 1, sc_id: 99, type: 1, username: 'root' } as any,
    );
    expect(r.flag).toBe(true);
  });

  it('runAuto: super admin (type=1) รันได้แม้ยืนยันแล้ว', async () => {
    faRepo.findOne.mockResolvedValue({ faId: 3, scId: 1, status: 2, del: 0 });
    itemRepo.find.mockResolvedValue([]);
    const r = await service.runAuto(3, {
      admin_id: 1, sc_id: 99, type: 1, username: 'root',
    } as any);
    expect(r.flag).toBe(true);
  });

  // ── G1: tenant guard บน endpoint ที่รับ fa_id ──
  describe('cross-tenant guard (fa_id endpoints)', () => {
    const headSchool1: any = { faId: 9, scId: 1, status: 1, del: 0 };
    const intruder = { admin_id: 99, sc_id: 2, type: 5, username: 'x' } as any; // โรงเรียนอื่น ไม่ใช่ super
    const superAdmin = { admin_id: 1, sc_id: 99, type: 1, username: 'root' } as any;

    it('confirm ข้ามโรงเรียน → ForbiddenException', async () => {
      faRepo.findOne.mockResolvedValue({ ...headSchool1 });
      await expect(
        service.confirm({ fa_id: 9 } as any, intruder),
      ).rejects.toThrow('ไม่สามารถดูหรือแก้ไขข้อมูลของโรงเรียนอื่นได้');
    });

    it('runAuto ข้ามโรงเรียน → ForbiddenException', async () => {
      faRepo.findOne.mockResolvedValue({ ...headSchool1 });
      await expect(service.runAuto(9, intruder)).rejects.toThrow(
        'ไม่สามารถดูหรือแก้ไขข้อมูลของโรงเรียนอื่นได้',
      );
    });

    it('markSubmitted ข้ามโรงเรียน → ForbiddenException', async () => {
      faRepo.findOne.mockResolvedValue({ ...headSchool1, status: 2 });
      await expect(service.markSubmitted(9, intruder)).rejects.toThrow(
        'ไม่สามารถดูหรือแก้ไขข้อมูลของโรงเรียนอื่นได้',
      );
    });

    it('exportData ข้ามโรงเรียน → ForbiddenException', async () => {
      faRepo.findOne.mockResolvedValue({ ...headSchool1 });
      await expect(service.exportData(9, intruder)).rejects.toThrow(
        'ไม่สามารถดูหรือแก้ไขข้อมูลของโรงเรียนอื่นได้',
      );
    });

    it('super admin (type=1) ข้ามโรงเรียนได้', async () => {
      faRepo.findOne.mockResolvedValue({ ...headSchool1, status: 2 });
      const r = await service.markSubmitted(9, superAdmin);
      expect(r.flag).toBe(true);
    });
  });

  // ── เฟส 3: แบบ สพท. 2544 ──
  describe('districtSummary', () => {
    it('สังเคราะห์ระดับเขต: นับระดับเฉพาะที่ยืนยันแล้ว + รายชื่อโรงเรียนไม่ส่ง', async () => {
      schoolRepo.find.mockResolvedValue([
        { scId: 1, scName: 'รร.หนึ่ง' },
        { scId: 2, scName: 'รร.สอง' },
        { scId: 3, scName: 'รร.สาม' },
      ]);
      faRepo.find.mockResolvedValue([
        {
          faId: 11, scId: 1, status: 3, studentCount: 80,
          totalScore: 90, maxScore: 100, percent: 90, level: 4,
        },
        {
          faId: 12, scId: 2, status: 1, studentCount: 700, // ร่าง = ยังไม่ส่ง
          totalScore: 10, maxScore: 100, percent: 10, level: 1,
        },
      ]);
      itemRepo.find.mockResolvedValue([
        { assessmentId: 11, itemCode: '2.1', topicNo: 2, answer: 'yes', score: 5 },
        { assessmentId: 11, itemCode: '9.1', topicNo: 9, answer: 'na', score: 0 },
      ]);

      const r = await service.districtSummary('2569');

      expect(r.rows).toHaveLength(3);
      expect(r.summary.total_schools).toBe(3);
      expect(r.summary.evaluated).toBe(1); // เฉพาะ status>=2
      expect(r.summary.submitted).toBe(1); // status=3
      expect(r.summary.level_4).toBe(1);
      expect(r.summary.not_submitted.map((n: any) => n.sc_id)).toEqual([2, 3]);

      const row1 = r.rows.find((x: any) => x.sc_id === 1)!;
      expect(row1.school_size).toBe('เล็ก'); // 80 คน
      expect(row1.topic_earned[2]).toBe(5);
      expect(row1.score_by_code['9.1']).toBe('NA');
      const row3 = r.rows.find((x: any) => x.sc_id === 3)!;
      expect(row3.has_assessment).toBe(false);
      expect(row3.level_label).toBe('-');
    });
  });
});
