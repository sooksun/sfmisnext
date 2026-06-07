import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { IntraBankTransferService } from './intra-bank-transfer.service';
import { IntraBankTransfer } from './entities/intra-bank-transfer.entity';
import type { JwtUser } from '../../common/utils/tenant-guard';

const userScA: JwtUser = { admin_id: 3, username: 'a', sc_id: 5, type: 2 };
const superAdmin: JwtUser = { admin_id: 1, username: 'root', sc_id: 1, type: 1 };

describe('IntraBankTransferService — cross-tenant guard', () => {
  let service: IntraBankTransferService;
  let repo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = { findOne: jest.fn(), save: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntraBankTransferService,
        { provide: getRepositoryToken(IntraBankTransfer), useValue: repo },
      ],
    }).compile();
    service = module.get(IntraBankTransferService);
  });

  const dtoComplete = { ibt_id: 7, completed_date: '2026-06-30', up_by: 3 };

  it('complete: บล็อก 403 ข้ามโรงเรียน', async () => {
    repo.findOne.mockResolvedValue({ ibtId: 7, scId: 99, status: 1, del: 0 });
    await expect(service.complete(dtoComplete as any, userScA)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('complete: ผ่านเมื่อโรงเรียนเดียวกัน', async () => {
    repo.findOne.mockResolvedValue({ ibtId: 7, scId: 5, status: 1, del: 0 });
    repo.save.mockResolvedValue({});
    const res = await service.complete(dtoComplete as any, userScA);
    expect(res.flag).toBe(true);
  });

  it('complete: super admin ข้ามได้', async () => {
    repo.findOne.mockResolvedValue({ ibtId: 7, scId: 99, status: 1, del: 0 });
    repo.save.mockResolvedValue({});
    const res = await service.complete(dtoComplete as any, superAdmin);
    expect(res.flag).toBe(true);
  });

  it('cancel: บล็อก 403 ข้ามโรงเรียน', async () => {
    repo.findOne.mockResolvedValue({ ibtId: 7, scId: 99, status: 1, del: 0 });
    await expect(service.cancel(7, 'reason', 3, userScA)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
});
