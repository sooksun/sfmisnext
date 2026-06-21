import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkAlertService } from './work-alert.service';
import { WorkAlert } from './entities/work-alert.entity';
import { School } from '../school/entities/school.entity';
import { DeadlineEngineService } from './deadline-engine.service';
import { DailyCheckService } from './daily-check.service';
import { CrossDepartmentAuditService } from './cross-department-audit.service';
import type { ComputedAlert } from './deadline-rules';

const computed = (over: Partial<ComputedAlert> = {}): ComputedAlert => ({
  rule_code: 'WHT_REMIT',
  period: '2026-03',
  severity: 'warning',
  title: 'นำส่งภาษี',
  detail: 'x',
  link: '/x',
  due_date: '2026-04-07',
  assignee_role: '5,8',
  ...over,
});

describe('WorkAlertService', () => {
  let service: WorkAlertService;
  let waRepo: jest.Mocked<any>;
  let engine: { computeForSchool: jest.Mock };
  let daily: { computeForSchool: jest.Mock };
  let crossDepartment: { computeForSchool: jest.Mock };

  beforeEach(async () => {
    waRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    engine = { computeForSchool: jest.fn().mockResolvedValue([]) };
    daily = { computeForSchool: jest.fn().mockResolvedValue([]) };
    crossDepartment = { computeForSchool: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkAlertService,
        { provide: getRepositoryToken(WorkAlert), useValue: waRepo },
        { provide: getRepositoryToken(School), useValue: { find: jest.fn() } },
        { provide: DeadlineEngineService, useValue: engine },
        { provide: DailyCheckService, useValue: daily },
        { provide: CrossDepartmentAuditService, useValue: crossDepartment },
      ],
    }).compile();
    service = module.get(WorkAlertService);
  });

  it('sync: กฎใหม่ → สร้าง work_alert status=1', async () => {
    engine.computeForSchool.mockResolvedValue([computed()]);
    waRepo.find.mockResolvedValue([]);
    const r = await service.sync(1, '2569');
    expect(r.computed).toBe(1);
    expect(waRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ ruleCode: 'WHT_REMIT', status: 1 }),
    );
  });

  it('sync: กฎที่ทำเสร็จแล้ว (ไม่ emit) → auto-resolve status=3 resolvedBy=auto', async () => {
    engine.computeForSchool.mockResolvedValue([]); // ไม่มีกฎ emit แล้ว
    const existing = {
      waId: 9, ruleCode: 'WHT_REMIT', period: '2026-03', status: 1,
    };
    waRepo.find.mockImplementation((opts: any) =>
      Promise.resolve(opts?.where?.source === 'calendar' ? [existing] : []),
    );
    const r = await service.sync(1, '2569');
    expect(r.resolved).toBe(1);
    expect(existing.status).toBe(3);
    expect((existing as any).resolvedBy).toBe('auto');
  });

  it('sync: เคารพการรับทราบ (status=2) ไม่รีเซ็ตเป็น 1 เมื่อกฎยัง emit', async () => {
    engine.computeForSchool.mockResolvedValue([computed()]);
    const acked = {
      waId: 9, ruleCode: 'WHT_REMIT', period: '2026-03', status: 2,
    };
    // find ถูกเรียกแยก source — คืน acked เฉพาะ source=calendar
    waRepo.find.mockImplementation((opts: any) =>
      Promise.resolve(opts?.where?.source === 'calendar' ? [acked] : []),
    );
    await service.sync(1, '2569');
    expect(acked.status).toBe(2); // ยังคงรับทราบ
  });

  it('canSee: จนท.การเงิน (type 5) เห็นเฉพาะ assignee 5,8 ; ผอ.เห็นทุกงาน', async () => {
    const rows = [
      { waId: 1, scId: 1, status: 1, assigneeRole: '5,8' },
      { waId: 2, scId: 1, status: 1, assigneeRole: '4,7' }, // พัสดุ
    ];
    waRepo.find.mockResolvedValue(rows);
    const finance = await service.load(1, '2569', { type: 5, sc_id: 1 } as any, false);
    expect(finance.data.map((d: any) => d.wa_id)).toEqual([1]);
    const director = await service.load(1, '2569', { type: 2, sc_id: 1 } as any, false);
    expect(director.data).toHaveLength(2);
  });

  it('count: นับเฉพาะ status=1 ที่ผู้ใช้เห็น', async () => {
    waRepo.find.mockResolvedValue([
      { scId: 1, status: 1, assigneeRole: '5,8' },
      { scId: 1, status: 1, assigneeRole: '4' },
    ]);
    const r = await service.count(1, { type: 5, sc_id: 1 } as any);
    expect(r.unread).toBe(1);
  });

  it('sync: รวม calendar + daily_check + cross_department (แยก source ไม่ชนกัน)', async () => {
    engine.computeForSchool.mockResolvedValue([computed({ rule_code: 'WHT_REMIT' })]);
    daily.computeForSchool.mockResolvedValue([
      computed({ rule_code: 'UNCLOSED_DAYS', period: '2569' }),
    ]);
    crossDepartment.computeForSchool.mockResolvedValue([
      computed({ rule_code: 'PROCUREMENT_STALE', period: '15' }),
    ]);
    waRepo.find.mockResolvedValue([]); // ไม่มีของเดิมทั้งสาม source
    const r = await service.sync(1, '2569');
    expect(r.computed).toBe(3);
    const sources = waRepo.create.mock.calls.map((c: any[]) => c[0].source);
    expect(sources).toEqual(expect.arrayContaining(['calendar', 'daily_check', 'cross_department']));
  });
});
