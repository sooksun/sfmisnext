import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { OpeningBalanceService } from './opening-balance.service';
import { OpeningBalance } from './entities/opening-balance.entity';
import { FiscalYearBalance } from '../fiscal-year-balance/entities/fiscal-year-balance.entity';
import type { JwtUser } from '../../common/utils/tenant-guard';

const userScA: JwtUser = { admin_id: 3, username: 'a', sc_id: 5, type: 2 };
const superAdmin: JwtUser = {
  admin_id: 1,
  username: 'root',
  sc_id: 1,
  type: 1,
};

describe('OpeningBalanceService — cross-tenant guard', () => {
  let service: OpeningBalanceService;
  let repo: jest.Mocked<any>;
  let fybRepo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = { findOne: jest.fn(), update: jest.fn() };
    // ปีก่อนหน้ายังไม่ปิดปี (is_final=0) — ไม่ล็อกยอดยกมา
    fybRepo = { count: jest.fn().mockResolvedValue(0) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpeningBalanceService,
        { provide: getRepositoryToken(OpeningBalance), useValue: repo },
        { provide: getRepositoryToken(FiscalYearBalance), useValue: fybRepo },
      ],
    }).compile();
    service = module.get(OpeningBalanceService);
  });

  const dtoUpdate = {
    ob_id: 12,
    balance_date: '2026-06-30',
    amount: 100,
    up_by: 3,
  };

  it('update: บล็อก 403 ข้ามโรงเรียน', async () => {
    repo.findOne.mockResolvedValue({ obId: 12, scId: 99, del: 0 });
    await expect(
      service.updateOpeningBalance(dtoUpdate as any, userScA),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('update: ผ่านเมื่อโรงเรียนเดียวกัน', async () => {
    repo.findOne.mockResolvedValue({ obId: 12, scId: 5, del: 0 });
    repo.update.mockResolvedValue({});
    const res = await service.updateOpeningBalance(dtoUpdate as any, userScA);
    expect(res.flag).toBe(true);
    expect(repo.update).toHaveBeenCalled();
  });

  it('update: super admin ข้ามได้', async () => {
    repo.findOne.mockResolvedValue({ obId: 12, scId: 99, del: 0 });
    repo.update.mockResolvedValue({});
    const res = await service.updateOpeningBalance(
      dtoUpdate as any,
      superAdmin,
    );
    expect(res.flag).toBe(true);
  });

  it('update: ไม่พบ record → flag false ไม่ throw', async () => {
    repo.findOne.mockResolvedValue(null);
    const res = await service.updateOpeningBalance(dtoUpdate as any, userScA);
    expect(res.flag).toBe(false);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('delete: บล็อก 403 ข้ามโรงเรียน', async () => {
    repo.findOne.mockResolvedValue({ obId: 12, scId: 99, del: 0 });
    await expect(
      service.deleteOpeningBalance(12, 3, userScA),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('delete: ผ่านเมื่อโรงเรียนเดียวกัน (soft-delete)', async () => {
    repo.findOne.mockResolvedValue({ obId: 12, scId: 5, del: 0 });
    repo.update.mockResolvedValue({});
    const res = await service.deleteOpeningBalance(12, 3, userScA);
    expect(res.flag).toBe(true);
    expect(repo.update).toHaveBeenCalledWith({ obId: 12 }, { del: 1, upBy: 3 });
  });

  // ── year-lock: ปีก่อนหน้าปิดปีแล้ว (is_final=1) → ห้ามแก้/ลบยอดยกมา ──────
  it('update: บล็อกเมื่อปีก่อนหน้าปิดปีแล้ว', async () => {
    repo.findOne.mockResolvedValue({
      obId: 12,
      scId: 5,
      budgetYear: '2569',
      del: 0,
    });
    fybRepo.count.mockResolvedValue(1); // ปี 2568 ปิดแล้ว
    const res = await service.updateOpeningBalance(dtoUpdate as any, userScA);
    expect(res.flag).toBe(false);
    expect(res.ms).toContain('ถูกล็อก');
    expect(repo.update).not.toHaveBeenCalled();
    expect(fybRepo.count).toHaveBeenCalledWith({
      where: { scId: 5, budgetYear: '2568', isFinal: 1, del: 0 },
    });
  });

  it('delete: บล็อกเมื่อปีก่อนหน้าปิดปีแล้ว', async () => {
    repo.findOne.mockResolvedValue({
      obId: 12,
      scId: 5,
      budgetYear: '2569',
      del: 0,
    });
    fybRepo.count.mockResolvedValue(1);
    const res = await service.deleteOpeningBalance(12, 3, userScA);
    expect(res.flag).toBe(false);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
