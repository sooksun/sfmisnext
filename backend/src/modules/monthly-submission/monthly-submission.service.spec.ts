import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MonthlySubmissionService } from './monthly-submission.service';
import { MonthlySubmission } from './entities/monthly-submission.entity';
import { Admin } from '../admin/entities/admin.entity';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';

describe('MonthlySubmissionService', () => {
  let service: MonthlySubmissionService;
  let msRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;
  let regulatoryConfig: jest.Mocked<
    Pick<RegulatoryConfigService, 'getThreshold'>
  >;

  beforeEach(async () => {
    msRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    adminRepo = { findOne: jest.fn() };
    regulatoryConfig = { getThreshold: jest.fn().mockResolvedValue(15) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthlySubmissionService,
        { provide: getRepositoryToken(MonthlySubmission), useValue: msRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: RegulatoryConfigService, useValue: regulatoryConfig },
      ],
    }).compile();

    service = module.get(MonthlySubmissionService);
  });

  // ─── loadSubmissions ──────────────────────────────────────────────────────────
  describe('loadSubmissions', () => {
    it('filter scId, syId และ del=0', async () => {
      msRepo.find.mockResolvedValue([]);
      await service.loadSubmissions(5, 3);
      expect(msRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 5, syId: 3, del: 0 },
        }),
      );
    });

    it('คืน { data, count } และ map fields ถูกต้อง', async () => {
      msRepo.find.mockResolvedValue([
        {
          msId: 1,
          scId: 5,
          syId: 3,
          submitMonth: '2569-01',
          status: 3,
          checklist: '[]',
          submittedAt: null,
          submittedBy: null,
          submittedByName: null,
          note: null,
          createDate: null,
          updateDate: null,
        },
      ]);
      const result = await service.loadSubmissions(5, 3);
      expect(result.count).toBe(1);
      expect(result.data[0].ms_id).toBe(1);
      expect(result.data[0].sc_id).toBe(5);
      expect(result.data[0].submit_month).toBe('2569-01');
    });

    it('status=1 และเลยกำหนด (เดือนในอดีต) → isOverdue=true', async () => {
      msRepo.find.mockResolvedValue([
        { msId: 1, scId: 5, syId: 3, submitMonth: '2020-01', status: 1 },
      ]);
      const result = await service.loadSubmissions(5, 3);
      expect(result.data[0].isOverdue).toBe(true);
    });

    it('status=1 แต่ยังไม่ถึงกำหนด (เดือนอนาคต) → isOverdue=false', async () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 2);
      const fm = `${future.getFullYear()}-01`;
      msRepo.find.mockResolvedValue([
        { msId: 1, scId: 5, syId: 3, submitMonth: fm, status: 1 },
      ]);
      const result = await service.loadSubmissions(5, 3);
      expect(result.data[0].isOverdue).toBe(false);
    });

    it('status != 1 → isOverdue=false เสมอ (ส่งแล้ว/ยืนยันแล้ว)', async () => {
      msRepo.find.mockResolvedValue([
        { msId: 1, scId: 5, syId: 3, submitMonth: '2020-01', status: 2 },
      ]);
      const result = await service.loadSubmissions(5, 3);
      expect(result.data[0].isOverdue).toBe(false);
    });

    it('คืน array ว่างเมื่อไม่มีข้อมูล', async () => {
      msRepo.find.mockResolvedValue([]);
      const result = await service.loadSubmissions(1, 1);
      expect(result).toEqual({ data: [], count: 0 });
    });
  });

  // ─── getOrCreate ──────────────────────────────────────────────────────────────
  describe('getOrCreate', () => {
    it('มี record อยู่แล้ว → คืนค่าเดิม ไม่สร้างใหม่', async () => {
      msRepo.findOne.mockResolvedValue({
        msId: 7,
        scId: 1,
        syId: 3,
        submitMonth: '2569-02',
        status: 2,
        checklist: '[]',
      });
      const result = await service.getOrCreate(1, 3, '2569-02');
      expect(result.ms_id).toBe(7);
      expect(result.status).toBe(2);
      expect(msRepo.create).not.toHaveBeenCalled();
      expect(msRepo.save).not.toHaveBeenCalled();
    });

    it('ไม่มี record → สร้างใหม่ status=1 พร้อม default checklist', async () => {
      msRepo.findOne.mockResolvedValue(null);
      const created = {
        msId: 9,
        scId: 1,
        syId: 3,
        submitMonth: '2569-03',
        status: 1,
      };
      msRepo.create.mockReturnValue(created);
      msRepo.save.mockResolvedValue(created);

      const result = await service.getOrCreate(1, 3, '2569-03');
      expect(msRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scId: 1,
          syId: 3,
          submitMonth: '2569-03',
          status: 1,
          del: 0,
        }),
      );
      // checklist ต้องเป็น JSON ของ default checklist (4 รายการ checked=false)
      const createArg = msRepo.create.mock.calls[0][0];
      const parsed = JSON.parse(createArg.checklist);
      expect(parsed).toHaveLength(4);
      expect(parsed[0].checked).toBe(false);
      expect(result.ms_id).toBe(9);
    });

    it('filter findOne ด้วย scId + submitMonth + del=0', async () => {
      msRepo.findOne.mockResolvedValue(null);
      msRepo.create.mockReturnValue({});
      msRepo.save.mockResolvedValue({});
      await service.getOrCreate(8, 3, '2569-04');
      expect(msRepo.findOne).toHaveBeenCalledWith({
        where: { scId: 8, submitMonth: '2569-04', del: 0 },
      });
    });
  });

  // ─── saveSubmission ──────────────────────────────────────────────────────────
  describe('saveSubmission', () => {
    const dto = {
      sc_id: 1,
      sy_id: 3,
      submit_month: '2569-05',
      checklist: '[{"id":1,"checked":true}]',
      note: 'หมายเหตุ',
      up_by: 7,
    };

    it('record ยืนยันแล้ว (status=3) → flag:false ห้ามแก้', async () => {
      msRepo.findOne.mockResolvedValue({ msId: 1, status: 3 });
      const result = await service.saveSubmission(dto);
      expect(result).toEqual({
        flag: false,
        ms: 'ไม่สามารถแก้ไขรายการที่ยืนยันแล้ว',
      });
      expect(msRepo.save).not.toHaveBeenCalled();
    });

    it('มี record (status!=3) → update checklist/note/upBy และ flag:true', async () => {
      const existing = {
        msId: 1,
        status: 1,
        checklist: 'old',
        note: 'n',
        upBy: 0,
      } as any;
      msRepo.findOne.mockResolvedValue(existing);
      msRepo.save.mockResolvedValue(existing);
      const result = await service.saveSubmission(dto);
      expect(existing.checklist).toBe(dto.checklist);
      expect(existing.note).toBe('หมายเหตุ');
      expect(existing.upBy).toBe(7);
      expect(result).toEqual({ flag: true, ms: 'บันทึกเรียบร้อยแล้ว' });
    });

    it('ไม่มี record → create ใหม่ status=1 และ flag:true', async () => {
      msRepo.findOne.mockResolvedValue(null);
      const created = { msId: 2 } as any;
      msRepo.create.mockReturnValue(created);
      msRepo.save.mockResolvedValue(created);
      const result = await service.saveSubmission(dto);
      expect(msRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scId: 1,
          syId: 3,
          submitMonth: '2569-05',
          status: 1,
          checklist: dto.checklist,
          del: 0,
        }),
      );
      expect(result).toEqual({ flag: true, ms: 'บันทึกเรียบร้อยแล้ว' });
    });
  });

  // ─── submitMonth ──────────────────────────────────────────────────────────────
  describe('submitMonth', () => {
    it('ไม่พบ record → flag:false', async () => {
      msRepo.findOne.mockResolvedValue(null);
      const result = await service.submitMonth({ ms_id: 99, up_by: 1 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('record ยืนยันแล้ว (status=3) → flag:false', async () => {
      msRepo.findOne.mockResolvedValue({ msId: 1, status: 3 });
      const result = await service.submitMonth({ ms_id: 1, up_by: 1 });
      expect(result).toEqual({
        flag: false,
        ms: 'ยืนยันแล้ว ไม่สามารถแก้ไขได้',
      });
    });

    it('happy path → status=2, snapshot ชื่อผู้ส่ง, flag:true', async () => {
      const record = { msId: 1, status: 1 } as any;
      msRepo.findOne.mockResolvedValue(record);
      adminRepo.findOne.mockResolvedValue({ adminId: 7, name: 'ครู ก' });
      msRepo.save.mockResolvedValue(record);

      const result = await service.submitMonth({ ms_id: 1, up_by: 7 });
      expect(record.status).toBe(2);
      expect(record.submittedAt).toBeInstanceOf(Date);
      expect(record.submittedBy).toBe(7);
      expect(record.submittedByName).toBe('ครู ก');
      expect(record.upBy).toBe(7);
      expect(result).toEqual({ flag: true, ms: 'ส่งรายงานเรียบร้อยแล้ว' });
    });

    it('admin ไม่พบ → submittedByName=null แต่ยังส่งได้', async () => {
      const record = { msId: 1, status: 1 } as any;
      msRepo.findOne.mockResolvedValue(record);
      adminRepo.findOne.mockResolvedValue(null);
      msRepo.save.mockResolvedValue(record);

      const result = await service.submitMonth({ ms_id: 1, up_by: 7 });
      expect(record.submittedByName).toBeNull();
      expect(result.flag).toBe(true);
    });

    it('admin มี username แต่ไม่มี name → ใช้ username', async () => {
      const record = { msId: 1, status: 1 } as any;
      msRepo.findOne.mockResolvedValue(record);
      adminRepo.findOne.mockResolvedValue({
        adminId: 7,
        name: null,
        username: 'teacher1',
      });
      msRepo.save.mockResolvedValue(record);

      await service.submitMonth({ ms_id: 1, up_by: 7 });
      expect(record.submittedByName).toBe('teacher1');
    });
  });

  // ─── confirmSubmission ────────────────────────────────────────────────────────
  describe('confirmSubmission', () => {
    it('ไม่พบ record → flag:false', async () => {
      msRepo.findOne.mockResolvedValue(null);
      const result = await service.confirmSubmission({ ms_id: 99, up_by: 1 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('record ยืนยันแล้ว → flag:false', async () => {
      msRepo.findOne.mockResolvedValue({ msId: 1, status: 3 });
      const result = await service.confirmSubmission({ ms_id: 1, up_by: 1 });
      expect(result).toEqual({ flag: false, ms: 'ยืนยันแล้ว' });
    });

    it('happy path → status=3, upBy ถูกตั้ง, flag:true', async () => {
      const record = { msId: 1, status: 2 } as any;
      msRepo.findOne.mockResolvedValue(record);
      msRepo.save.mockResolvedValue(record);
      const result = await service.confirmSubmission({ ms_id: 1, up_by: 9 });
      expect(record.status).toBe(3);
      expect(record.upBy).toBe(9);
      expect(result).toEqual({
        flag: true,
        ms: 'ยืนยันรับรายงานเรียบร้อยแล้ว',
      });
    });
  });

  // ─── getCurrentMonthAlert ─────────────────────────────────────────────────────
  describe('getCurrentMonthAlert', () => {
    it('มีเดือนที่ยังไม่ส่ง (status<2) และเลยกำหนด → hasAlert=true', async () => {
      msRepo.find.mockResolvedValue([
        { submitMonth: '2020-01', status: 1 },
        { submitMonth: '2020-02', status: 0 },
      ]);
      const result = await service.getCurrentMonthAlert(1, 3);
      expect(result.hasAlert).toBe(true);
      expect(result.overdue_months).toEqual(['2020-01', '2020-02']);
    });

    it('status>=2 (ส่งแล้ว) → ไม่นับ overdue', async () => {
      msRepo.find.mockResolvedValue([{ submitMonth: '2020-01', status: 2 }]);
      const result = await service.getCurrentMonthAlert(1, 3);
      expect(result.hasAlert).toBe(false);
      expect(result.overdue_months).toEqual([]);
    });

    it('ยังไม่เลยกำหนด → ไม่นับ overdue', async () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 2);
      msRepo.find.mockResolvedValue([
        { submitMonth: `${future.getFullYear()}-01`, status: 1 },
      ]);
      const result = await service.getCurrentMonthAlert(1, 3);
      expect(result.hasAlert).toBe(false);
    });
  });
});
