import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { FinancialAuditService } from './financial-audit.service';
import { FinancialAuditLog } from './entities/financial-audit-log.entity';
import { Admin } from '../admin/entities/admin.entity';
import { ReportDailyBalanceService } from '../report-daily-balance/report-daily-balance.service';

describe('FinancialAuditService', () => {
  let service: FinancialAuditService;
  let auditRepo: any;
  let report: any;

  beforeEach(async () => {
    auditRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    report = { loadDailyBalance: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialAuditService,
        { provide: getRepositoryToken(FinancialAuditLog), useValue: auditRepo },
        { provide: getRepositoryToken(Admin), useValue: { findOne: jest.fn() } },
        { provide: ReportDailyBalanceService, useValue: report },
      ],
    }).compile();
    service = module.get(FinancialAuditService);
  });

  describe('verifyDailySnapshot — ตรวจ integrity ด้วย SHA-256', () => {
    it('ยังไม่มี snapshot → flag=false', async () => {
      auditRepo.findOne.mockResolvedValue(null);
      const r = await service.verifyDailySnapshot(1, 2, '2026-06-10');
      expect(r.flag).toBe(false);
    });

    it('snapshot ไม่ถูกแก้ไข → snapshot_valid=true ; ตรงยอดปัจจุบัน → current_matches_snapshot=true', async () => {
      const rows = [{ bgTypeId: 9, balance: 1000 }];
      report.loadDailyBalance.mockResolvedValue(rows);
      const snapshot = JSON.stringify({
        sc_id: 1, sy_id: 2, date: '2026-06-10', rows, signed_at: '2026-06-10T03:00:00Z',
      });
      const hash = crypto.createHash('sha256').update(snapshot).digest('hex');
      auditRepo.findOne.mockResolvedValue({
        snapshotJson: snapshot, snapshotHash: hash, signedName: 'ผอ.', createDate: new Date(),
      });

      const r = await service.verifyDailySnapshot(1, 2, '2026-06-10');
      expect(r.snapshot_valid).toBe(true);
      expect(r.current_matches_snapshot).toBe(true);
    });

    it('hash ถูกแก้ (tampered) → snapshot_valid=false', async () => {
      const snapshot = JSON.stringify({ sc_id: 1, sy_id: 2, date: '2026-06-10', rows: [], signed_at: 'x' });
      report.loadDailyBalance.mockResolvedValue([]);
      auditRepo.findOne.mockResolvedValue({
        snapshotJson: snapshot, snapshotHash: 'deadbeef_ปลอม', signedName: 'ผอ.', createDate: new Date(),
      });
      const r = await service.verifyDailySnapshot(1, 2, '2026-06-10');
      expect(r.snapshot_valid).toBe(false);
    });

    it('ยอดปัจจุบันเปลี่ยนหลังลงนาม → current_matches_snapshot=false', async () => {
      const snapRows = [{ bgTypeId: 9, balance: 1000 }];
      const snapshot = JSON.stringify({
        sc_id: 1, sy_id: 2, date: '2026-06-10', rows: snapRows, signed_at: 'x',
      });
      const hash = crypto.createHash('sha256').update(snapshot).digest('hex');
      report.loadDailyBalance.mockResolvedValue([{ bgTypeId: 9, balance: 9999 }]); // ยอดเปลี่ยน
      auditRepo.findOne.mockResolvedValue({
        snapshotJson: snapshot, snapshotHash: hash, signedName: 'ผอ.', createDate: new Date(),
      });
      const r = await service.verifyDailySnapshot(1, 2, '2026-06-10');
      expect(r.snapshot_valid).toBe(true);
      expect(r.current_matches_snapshot).toBe(false);
    });
  });

  describe('isDateLocked — year/day lock (finance role=1 ลงนาม)', () => {
    it('มีลายเซ็น finance (role=1) → locked', async () => {
      auditRepo.findOne.mockResolvedValue({ falId: 5 });
      expect(await service.isDateLocked(1, '2026-06-10')).toBe(true);
      expect(auditRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ auditType: 1, signerRole: 1 }),
        }),
      );
    });

    it('ยังไม่ลงนาม → ไม่ locked', async () => {
      auditRepo.findOne.mockResolvedValue(null);
      expect(await service.isDateLocked(1, '2026-06-10')).toBe(false);
    });
  });
});
