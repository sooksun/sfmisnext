import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CashCommitteeService } from './cash-committee.service';
import { CashKeepingCommittee } from './entities/cash-keeping-committee.entity';

describe('CashCommitteeService', () => {
  let service: CashCommitteeService;
  let repo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashCommitteeService,
        { provide: getRepositoryToken(CashKeepingCommittee), useValue: repo },
      ],
    }).compile();
    service = module.get(CashCommitteeService);
  });

  describe('load', () => {
    it('filter scId+del=0, map snake_case', async () => {
      repo.find.mockResolvedValue([
        {
          ckcId: 1,
          role: 'keeper',
          seq: 1,
          name: 'นาย ก',
          position: 'ครู',
          orderNo: '35/2568',
          orderDate: '2025-10-01',
        },
      ]);
      const r = await service.load(5);
      expect(repo.find).toHaveBeenCalledWith({
        where: { scId: 5, del: 0 },
        order: { role: 'ASC', seq: 'ASC' },
      });
      expect(r[0]).toEqual({
        ckc_id: 1,
        role: 'keeper',
        seq: 1,
        name: 'นาย ก',
        position: 'ครู',
        order_no: '35/2568',
        order_date: '2025-10-01',
      });
    });
  });

  describe('save', () => {
    const dto: any = {
      sc_id: 5,
      up_by: 7,
      members: [
        {
          role: 'keeper',
          seq: 1,
          name: ' นาย ก ',
          position: 'ครู',
          order_no: '35/2568',
          order_date: '2025-10-01',
        },
        { role: 'auditor', seq: 1, name: 'นาง ข' },
        { role: 'keeper', seq: 2, name: '   ' }, // ว่าง → ข้าม
      ],
    };

    it('soft-delete ของเดิมก่อน แล้วบันทึกเฉพาะรายชื่อที่ไม่ว่าง (trim)', async () => {
      const r = await service.save(dto);
      expect(repo.update).toHaveBeenCalledWith(
        { scId: 5, del: 0 },
        { del: 1, upBy: 7 },
      );
      const saved = repo.save.mock.calls[0][0];
      expect(saved).toHaveLength(2); // เว้นรายการชื่อว่าง
      expect(saved[0].name).toBe('นาย ก'); // trim
      expect(saved[0].role).toBe('keeper');
      expect(saved[1].role).toBe('auditor');
      expect(r.flag).toBe(true);
    });

    it('role ที่ไม่ใช่ auditor → normalize เป็น keeper', async () => {
      await service.save({
        sc_id: 5,
        up_by: 7,
        members: [{ role: 'weird', seq: 1, name: 'x' }],
      } as any);
      const saved = repo.save.mock.calls[0][0];
      expect(saved[0].role).toBe('keeper');
    });
  });
});
