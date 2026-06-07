import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { ReportCheckControlService } from './report-check-control.service';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { Admin } from '../admin/entities/admin.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

describe('ReportCheckControlService', () => {
  let service: ReportCheckControlService;
  let rwRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;
  let partnerRepo: jest.Mocked<any>;
  let budgetTypeRepo: jest.Mocked<any>;

  function makeCheck(overrides: Record<string, unknown> = {}) {
    return {
      rwId: 1,
      noDoc: 'D-001',
      checkNoDoc: 'CHK-001',
      dateRequest: new Date('2026-05-01'),
      offerCheckDate: new Date('2026-05-03'),
      amount: 5000,
      detail: 'ค่าวัสดุ',
      status: 200,
      userOfferCheck: 7,
      pId: 3,
      bgTypeId: 2,
      remark: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    rwRepo = { find: jest.fn() };
    adminRepo = { find: jest.fn() };
    partnerRepo = { find: jest.fn() };
    budgetTypeRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCheckControlService,
        { provide: getRepositoryToken(RequestWithdraw), useValue: rwRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: getRepositoryToken(Partner), useValue: partnerRepo },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: budgetTypeRepo },
      ],
    }).compile();

    service = module.get(ReportCheckControlService);
  });

  it('ไม่พบเช็ค → คืน array ว่าง', async () => {
    rwRepo.find.mockResolvedValue([]);
    const result = await service.loadCheckControl(1, 3);
    expect(result).toEqual([]);
    // ไม่ต้อง query ข้อมูล related เมื่อไม่มีเช็ค
    expect(adminRepo.find).not.toHaveBeenCalled();
    expect(partnerRepo.find).not.toHaveBeenCalled();
    expect(budgetTypeRepo.find).not.toHaveBeenCalled();
  });

  it('filter scId, syId, del=0 และ status IN (200,201,202)', async () => {
    rwRepo.find.mockResolvedValue([]);
    await service.loadCheckControl(5, 9);
    expect(rwRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scId: 5,
          syId: 9,
          del: 0,
          status: In([200, 201, 202]),
        }),
        order: { rwId: 'DESC' },
      }),
    );
  });

  it('happy path — map ข้อมูล + join admin/partner/budgetType ถูกต้อง', async () => {
    rwRepo.find.mockResolvedValue([makeCheck()]);
    adminRepo.find.mockResolvedValue([{ adminId: 7, name: 'นาง ก' }]);
    partnerRepo.find.mockResolvedValue([{ pId: 3, pName: 'ร้านค้า A' }]);
    budgetTypeRepo.find.mockResolvedValue([
      { bgTypeId: 2, budgetType: 'เงินอุดหนุน' },
    ]);

    const [row] = await service.loadCheckControl(1, 3);
    expect(row.rw_id).toBe(1);
    expect(row.no_doc).toBe('D-001');
    expect(row.check_no_doc).toBe('CHK-001');
    expect(row.amount).toBe(5000);
    expect(row.user_offer_check_name).toBe('นาง ก');
    expect(row.partner_name).toBe('ร้านค้า A');
    expect(row.budget_type).toBe('เงินอุดหนุน');
  });

  it('ไม่พบ admin/partner/budgetType ที่ join → คืน empty string', async () => {
    rwRepo.find.mockResolvedValue([makeCheck()]);
    adminRepo.find.mockResolvedValue([]);
    partnerRepo.find.mockResolvedValue([]);
    budgetTypeRepo.find.mockResolvedValue([]);

    const [row] = await service.loadCheckControl(1, 3);
    expect(row.user_offer_check_name).toBe('');
    expect(row.partner_name).toBe('');
    expect(row.budget_type).toBe('');
  });

  it('คัด id ที่ <= 0 ออกจาก query related (ไม่ส่ง find ถ้าไม่มี id ใช้ได้)', async () => {
    rwRepo.find.mockResolvedValue([
      makeCheck({ userOfferCheck: 0, pId: 0, bgTypeId: 0 }),
    ]);

    await service.loadCheckControl(1, 3);
    expect(adminRepo.find).not.toHaveBeenCalled();
    expect(partnerRepo.find).not.toHaveBeenCalled();
    expect(budgetTypeRepo.find).not.toHaveBeenCalled();
  });

  it('dedupe id ก่อน query related (In รับ unique ids)', async () => {
    rwRepo.find.mockResolvedValue([
      makeCheck({ rwId: 1, userOfferCheck: 7, pId: 3, bgTypeId: 2 }),
      makeCheck({ rwId: 2, userOfferCheck: 7, pId: 3, bgTypeId: 2 }),
    ]);
    adminRepo.find.mockResolvedValue([]);
    partnerRepo.find.mockResolvedValue([]);
    budgetTypeRepo.find.mockResolvedValue([]);

    await service.loadCheckControl(1, 3);
    expect(adminRepo.find).toHaveBeenCalledWith({ where: { adminId: In([7]) } });
    expect(partnerRepo.find).toHaveBeenCalledWith({ where: { pId: In([3]) } });
    expect(budgetTypeRepo.find).toHaveBeenCalledWith({
      where: { bgTypeId: In([2]) },
    });
  });
});
