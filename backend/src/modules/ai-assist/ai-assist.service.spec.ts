import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AiAssistService } from './ai-assist.service';
import { WorkAlert } from '../work-alert/entities/work-alert.entity';
import { ActivityLog } from '../activity-log/entities/activity-log.entity';
import { School } from '../school/entities/school.entity';
import { AiRouterService } from '../ai/ai-router.service';

describe('AiAssistService (fallback rule-based เมื่อไม่มี AI)', () => {
  let service: AiAssistService;
  let waRepo: jest.Mocked<any>;
  let logRepo: jest.Mocked<any>;
  let ai: jest.Mocked<any>;

  beforeEach(async () => {
    waRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    logRepo = { find: jest.fn().mockResolvedValue([]) };
    // AI ไม่พร้อม → selectProvider โยน error เสมอ
    ai = { selectProvider: jest.fn().mockRejectedValue(new Error('no ai')), chat: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAssistService,
        { provide: getRepositoryToken(WorkAlert), useValue: waRepo },
        { provide: getRepositoryToken(ActivityLog), useValue: logRepo },
        { provide: getRepositoryToken(School), useValue: { find: jest.fn() } },
        { provide: AiRouterService, useValue: ai },
      ],
    }).compile();
    service = module.get(AiAssistService);
  });

  it('dailySummary: ไม่มีงานค้าง → ข้อความ + source=rule (ไม่เรียก AI)', async () => {
    const r = await service.dailySummary(1, '2569');
    expect(r.source).toBe('rule');
    expect(r.summary).toContain('ไม่มีงานค้าง');
    expect(ai.chat).not.toHaveBeenCalled();
  });

  it('dailySummary: มีงานค้าง แต่ AI ปิด → fallback list', async () => {
    waRepo.find.mockResolvedValue([
      { title: 'นำส่งภาษี', severity: 'error', dueDate: '2026-06-07', status: 1 },
    ]);
    const r = await service.dailySummary(1, '2569');
    expect(r.source).toBe('rule');
    expect(r.summary).toContain('นำส่งภาษี');
  });

  it('weeklyDigest: ตรวจ pattern แยกหน้าที่ไม่ครบ (คนเดียว create+approve)', async () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 86400000).toISOString();
    logRepo.find.mockResolvedValue([
      { alId: '1', adminId: 5, action: 'create', module: 'Loan_agreement', entityId: '9', creDate: recent },
      { alId: '2', adminId: 5, action: 'approve', module: 'Loan_agreement', entityId: '9', creDate: recent },
    ]);
    const r = await service.weeklyDigest(1, now);
    expect(r.findings.map((f) => f.code)).toContain('SEGREGATION');
  });

  it('weeklyDigest: แก้ไขเอกสารเดียวกันถี่ → HEAVY_EDIT', async () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 3600000).toISOString();
    logRepo.find.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => ({
        alId: String(i), adminId: 5, action: 'update', module: 'Invoice', entityId: '3', creDate: recent,
      })),
    );
    const r = await service.weeklyDigest(1, now);
    expect(r.findings.map((f) => f.code)).toContain('HEAVY_EDIT');
  });

  it('advisory: AI ปิด → fallback สะท้อนคำเตือน + เขียน work_alert(source=ai)', async () => {
    const r = await service.advisory(1, '2569', 'budget-request', { amount: 9 }, [
      { code: 'AMOUNT_HIGH', message: 'ยอดสูง' },
    ]);
    expect(r.suspicious).toBe(true);
    expect(r.reason).toContain('ยอดสูง');
    expect(waRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'ai', ruleCode: 'AI_ADVISORY' }),
    );
  });

  it('ask: AI ปิด → คืนงานค้างเป็นข้อความ', async () => {
    waRepo.find.mockResolvedValue([{ title: 'ส่งรายงานเดือน', severity: 'warning', dueDate: '2026-06-15' }]);
    const r = await service.ask(1, '2569', 'เดือนนี้ต้องทำอะไร');
    expect(r.source).toBe('rule');
    expect(r.answer).toContain('ส่งรายงานเดือน');
  });
});
