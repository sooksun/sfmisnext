import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { BudgetTransferService } from './budget-transfer.service';
import { BudgetTransfer } from './entities/budget-transfer.entity';
import type { JwtUser } from '../../common/utils/tenant-guard';

// ผู้ใช้โรงเรียน 5 (ไม่ใช่ super admin) — ต้องถูกบล็อกเมื่อแตะ record โรงเรียนอื่น
const userScA: JwtUser = { admin_id: 3, username: 'a', sc_id: 5, type: 2 };
// super admin — ข้ามได้
const superAdmin: JwtUser = { admin_id: 1, username: 'root', sc_id: 1, type: 1 };

describe('BudgetTransferService — cross-tenant guard', () => {
  let service: BudgetTransferService;
  let repo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = { findOne: jest.fn(), save: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetTransferService,
        { provide: getRepositoryToken(BudgetTransfer), useValue: repo },
      ],
    }).compile();
    service = module.get(BudgetTransferService);
  });

  const dtoApprove = { bt_id: 10, approved_by: 3, approved_date: '2026-06-30' };

  it('approve: บล็อก 403 เมื่อ record เป็นของโรงเรียนอื่น', async () => {
    repo.findOne.mockResolvedValue({ btId: 10, scId: 99, status: 1, del: 0 });
    await expect(service.approve(dtoApprove as any, userScA)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('approve: ผ่านเมื่อ record เป็นโรงเรียนเดียวกัน', async () => {
    repo.findOne.mockResolvedValue({ btId: 10, scId: 5, status: 1, del: 0 });
    repo.save.mockResolvedValue({});
    const res = await service.approve(dtoApprove as any, userScA);
    expect(res.flag).toBe(true);
    expect(repo.save).toHaveBeenCalled();
  });

  it('approve: super admin ข้าม cross-tenant ได้', async () => {
    repo.findOne.mockResolvedValue({ btId: 10, scId: 99, status: 1, del: 0 });
    repo.save.mockResolvedValue({});
    const res = await service.approve(dtoApprove as any, superAdmin);
    expect(res.flag).toBe(true);
  });

  it('cancel: บล็อก 403 ข้ามโรงเรียน', async () => {
    repo.findOne.mockResolvedValue({ btId: 10, scId: 99, status: 1, del: 0 });
    await expect(service.cancel(10, 3, userScA)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('reject: บล็อก 403 ข้ามโรงเรียน', async () => {
    repo.findOne.mockResolvedValue({ btId: 10, scId: 99, status: 1, del: 0 });
    await expect(
      service.reject({ bt_id: 10, approved_by: 3, note: 'x' } as any, userScA),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
