import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { IntraBankTransferService } from './intra-bank-transfer.service';
import { IntraBankTransfer } from './entities/intra-bank-transfer.entity';
import { BankLedgerEntry } from '../bank-ledger/entities/bank-ledger-entry.entity';
import type { JwtUser } from '../../common/utils/tenant-guard';

const userScA: JwtUser = { admin_id: 3, username: 'a', sc_id: 5, type: 2 };
const superAdmin: JwtUser = {
  admin_id: 1,
  username: 'root',
  sc_id: 1,
  type: 1,
};

describe('IntraBankTransferService — cross-tenant guard', () => {
  let service: IntraBankTransferService;
  let repo: jest.Mocked<any>;
  let bleRepo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = { findOne: jest.fn(), save: jest.fn() };
    // auto-sync ทะเบียนเงินฝาก: create คืน arg, save คืน row พร้อม bleId
    bleRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockResolvedValue({ bleId: 1 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntraBankTransferService,
        { provide: getRepositoryToken(IntraBankTransfer), useValue: repo },
        { provide: getRepositoryToken(BankLedgerEntry), useValue: bleRepo },
      ],
    }).compile();
    service = module.get(IntraBankTransferService);
  });

  const dtoComplete = { ibt_id: 7, completed_date: '2026-06-30', up_by: 3 };

  it('complete: บล็อก 403 ข้ามโรงเรียน', async () => {
    repo.findOne.mockResolvedValue({ ibtId: 7, scId: 99, status: 1, del: 0 });
    await expect(
      service.complete(dtoComplete as any, userScA),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('complete: ผ่านเมื่อโรงเรียนเดียวกัน + auto-sync ทะเบียนเงินฝาก 2 ฝั่ง', async () => {
    repo.findOne.mockResolvedValue({
      ibtId: 7,
      scId: 5,
      status: 1,
      del: 0,
      fromBankId: 1,
      toBankId: 2,
      amount: 1000,
      fee: 20,
      ibtNo: 'IBT0001/2569',
    });
    repo.save.mockResolvedValue({});
    const res = await service.complete(dtoComplete as any, userScA);
    expect(res.flag).toBe(true);
    // สร้าง ledger 2 รายการ: ถอนต้นทาง (amount+fee) + ฝากปลายทาง (amount)
    expect(bleRepo.save).toHaveBeenCalledTimes(2);
    const entries = bleRepo.create.mock.calls.map((c) => c[0]);
    const out = entries.find((e) => e.entryType === 2);
    const inn = entries.find((e) => e.entryType === 1);
    expect(out.baId).toBe(1);
    expect(out.amount).toBe(1020); // 1000 + 20 ค่าธรรมเนียม
    expect(inn.baId).toBe(2);
    expect(inn.amount).toBe(1000);
  });

  it('complete: เคารพ ledger id ที่ caller ส่งมา ไม่สร้างซ้ำ', async () => {
    repo.findOne.mockResolvedValue({
      ibtId: 7,
      scId: 5,
      status: 1,
      del: 0,
      fromBankId: 1,
      toBankId: 2,
      amount: 1000,
      fee: 0,
      ibtNo: 'IBT0001/2569',
    });
    repo.save.mockResolvedValue({});
    const res = await service.complete(
      { ...dtoComplete, from_ledger_id: 11, to_ledger_id: 12 } as any,
      userScA,
    );
    expect(res.flag).toBe(true);
    expect(bleRepo.save).not.toHaveBeenCalled();
  });

  it('complete: super admin ข้ามได้', async () => {
    repo.findOne.mockResolvedValue({ ibtId: 7, scId: 99, status: 1, del: 0 });
    repo.save.mockResolvedValue({});
    const res = await service.complete(dtoComplete as any, superAdmin);
    expect(res.flag).toBe(true);
  });

  it('cancel: บล็อก 403 ข้ามโรงเรียน', async () => {
    repo.findOne.mockResolvedValue({ ibtId: 7, scId: 99, status: 1, del: 0 });
    await expect(
      service.cancel(7, 'reason', 3, userScA),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
