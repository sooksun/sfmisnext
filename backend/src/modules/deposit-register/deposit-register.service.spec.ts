import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DepositRegisterService } from './deposit-register.service';
import { DepositRegister } from './entities/deposit-register.entity';

function makeQb(rawOne: unknown = undefined) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['select', 'where'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getRawOne'] = jest.fn().mockResolvedValue(rawOne);
  return qb;
}

describe('DepositRegisterService', () => {
  let service: DepositRegisterService;
  let repo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
      createQueryBuilder: jest.fn(() => makeQb({ max: 0 })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositRegisterService,
        { provide: getRepositoryToken(DepositRegister), useValue: repo },
      ],
    }).compile();
    service = module.get(DepositRegisterService);
  });

  it('load: filter + map snake_case + is_open จาก return_date', async () => {
    repo.find.mockResolvedValue([
      {
        drId: 1,
        seq: 1,
        itemName: 'ส้วม',
        depositKind: 'เงินประกันสัญญา',
        receiveDate: '2025-10-20',
        receiveDocNo: 'บร.1',
        receiveAmount: 4500,
        depositDate: '2025-10-20',
        depositDocNo: 'บฝ.1',
        depositAmount: 4500,
        dueDate: '2026-10-19',
        returnDate: null,
        note: null,
      },
    ]);
    const r = await service.load(5, 3, '2569');
    expect(repo.find).toHaveBeenCalledWith({
      where: { scId: 5, syId: 3, budgetYear: '2569', del: 0 },
      order: { seq: 'ASC' },
    });
    expect(r[0].is_open).toBe(true);
    expect(r[0].receive_amount).toBe(4500);
  });

  it('load: มี return_date → is_open=false', async () => {
    repo.find.mockResolvedValue([
      {
        drId: 1,
        seq: 1,
        returnDate: '2025-11-26',
        receiveAmount: 0,
        depositAmount: 0,
      },
    ]);
    const r = await service.load(5, 3, '2569');
    expect(r[0].is_open).toBe(false);
  });

  it('add: seq = max+1 + map fields', async () => {
    repo.createQueryBuilder.mockReturnValue(makeQb({ max: 4 }));
    let saved: any;
    repo.save.mockImplementation((x: any) => {
      saved = x;
      return Promise.resolve(x);
    });
    const r = await service.add({
      sc_id: 5,
      sy_id: 3,
      budget_year: '2569',
      item_name: 'ส้วม',
      deposit_kind: 'เงินประกันสัญญา',
      receive_amount: 4500,
      up_by: 7,
    } as any);
    expect(saved.seq).toBe(5);
    expect(saved.itemName).toBe('ส้วม');
    expect(saved.receiveAmount).toBe(4500);
    expect(r.flag).toBe(true);
  });

  it('remove: soft delete', async () => {
    const r = await service.remove(9, 7);
    expect(repo.update).toHaveBeenCalledWith({ drId: 9 }, { del: 1, upBy: 7 });
    expect(r.flag).toBe(true);
  });
});
