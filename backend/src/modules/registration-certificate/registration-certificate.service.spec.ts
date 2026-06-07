import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { RegistrationCertificateService } from './registration-certificate.service';
import { WithholdingCertificate } from './entities/withholding-certificate.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { Partner } from '../general-db/entities/partner.entity';

// ─── QueryBuilder mock factory ───────────────────────────────────────────────
function makeQb(rawResult: unknown[] = []) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  [
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
    'groupBy',
  ].forEach((m) => (qb[m] = jest.fn().mockReturnValue(chain())));
  qb['getRawMany'] = jest.fn().mockResolvedValue(rawResult);
  return qb;
}

describe('RegistrationCertificateService', () => {
  let service: RegistrationCertificateService;
  let wcRepo: jest.Mocked<any>;
  let rwRepo: jest.Mocked<any>;
  let partnerRepo: jest.Mocked<any>;
  let managerQuery: jest.Mock;

  beforeEach(async () => {
    managerQuery = jest.fn().mockResolvedValue([]);

    wcRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((x) => x),
    };
    rwRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => makeQb([])),
      manager: { query: managerQuery },
    };
    partnerRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationCertificateService,
        { provide: getRepositoryToken(WithholdingCertificate), useValue: wcRepo },
        { provide: getRepositoryToken(RequestWithdraw), useValue: rwRepo },
        { provide: getRepositoryToken(Partner), useValue: partnerRepo },
      ],
    }).compile();

    service = module.get(RegistrationCertificateService);
  });

  // ─── loadWithholdingCertificateList ────────────────────────────────────────
  describe('loadWithholdingCertificateList', () => {
    it('filter scId, syId, del=0', async () => {
      wcRepo.find.mockResolvedValue([]);
      await service.loadWithholdingCertificateList(5, 3);
      expect(wcRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scId: 5, syId: 3, del: 0 }),
        }),
      );
    });

    it('คืน array ว่างเมื่อไม่มี cert', async () => {
      wcRepo.find.mockResolvedValue([]);
      const result = await service.loadWithholdingCertificateList(1, 1);
      expect(result).toEqual([]);
      // ไม่ต้องไป query rw/partner ถ้าไม่มี cert
      expect(rwRepo.find).not.toHaveBeenCalled();
    });

    it('คำนวณ WHT cal_vat=1 ถูกต้อง (10700 → vat 700, หัก 100, สุทธิ 10600)', async () => {
      wcRepo.find.mockResolvedValue([
        { wcId: 1, wcNo: 'WC-1', ofId: 10, wcRank: 1, syId: 3, status: 100 },
      ]);
      rwRepo.find.mockResolvedValue([
        { rwId: 10, pId: 20, amount: 10700, detail: 'ค่าเช่า' },
      ]);
      partnerRepo.find.mockResolvedValue([
        { pId: 20, pName: 'ร้าน A', calVat: 1 },
      ]);

      const result = await service.loadWithholdingCertificateList(5, 3);
      expect(result).toHaveLength(1);
      const r = result[0];
      expect(r.amount).toBe(10700);
      expect(r.base).toBeCloseTo(10000, 1);
      expect(r.vat_amount).toBeCloseTo(700, 1);
      expect(r.deduct).toBeCloseTo(100, 1);
      expect(r.net_payable).toBeCloseTo(10600, 1);
      expect(r.p_name).toBe('ร้าน A');
      expect(r.detail).toBe('ค่าเช่า');
    });

    it('คำนวณ WHT cal_vat=2 (ไม่มี VAT) หัก 1% ของยอดรวม', async () => {
      wcRepo.find.mockResolvedValue([
        { wcId: 2, wcNo: 'WC-2', ofId: 11, syId: 3, status: 100 },
      ]);
      rwRepo.find.mockResolvedValue([{ rwId: 11, pId: 21, amount: 10000 }]);
      partnerRepo.find.mockResolvedValue([
        { pId: 21, pName: 'ร้าน B', calVat: 2 },
      ]);

      const result = await service.loadWithholdingCertificateList(5, 3);
      const r = result[0];
      expect(r.vat_amount).toBe(0);
      expect(r.deduct).toBe(100);
      expect(r.net_payable).toBe(9900);
    });

    it('default calVat=2 เมื่อไม่พบ partner', async () => {
      wcRepo.find.mockResolvedValue([
        { wcId: 3, ofId: 12, syId: 3, status: 100 },
      ]);
      rwRepo.find.mockResolvedValue([{ rwId: 12, pId: 0, amount: 5000 }]);
      partnerRepo.find.mockResolvedValue([]);

      const result = await service.loadWithholdingCertificateList(5, 3);
      const r = result[0];
      // calVat=2 → หัก 1% ของ 5000 = 50
      expect(r.deduct).toBe(50);
      expect(r.p_name).toBe('');
    });

    it('amount=0 เมื่อไม่พบ request_withdraw', async () => {
      wcRepo.find.mockResolvedValue([
        { wcId: 4, ofId: 999, syId: 3, status: 100 },
      ]);
      rwRepo.find.mockResolvedValue([]);
      partnerRepo.find.mockResolvedValue([]);

      const result = await service.loadWithholdingCertificateList(5, 3);
      expect(result[0].amount).toBe(0);
      expect(result[0].deduct).toBe(0);
    });

    it('map ค่า null เป็น default (wc_no/year ว่าง, wc_rank 0)', async () => {
      wcRepo.find.mockResolvedValue([
        { wcId: 5, wcNo: null, ofId: 0, wcRank: null, year: null, syId: 3, status: 100 },
      ]);
      const result = await service.loadWithholdingCertificateList(5, 3);
      expect(result[0].wc_no).toBe('');
      expect(result[0].year).toBe('');
      expect(result[0].wc_rank).toBe(0);
    });
  });

  // ─── loadCheckForWC ────────────────────────────────────────────────────────
  describe('loadCheckForWC', () => {
    it('คืน array ว่างเมื่อไม่มีข้อมูล', async () => {
      rwRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.loadCheckForWC(5, 3);
      expect(result).toEqual([]);
    });

    it('map raw row + แปลง amount/cal_vat เป็น number', async () => {
      rwRepo.createQueryBuilder.mockReturnValue(
        makeQb([
          {
            of_id: 10,
            of_no: 'D-1',
            detail: 'ค่าวัสดุ',
            p_name: 'ร้าน C',
            p_address: 'addr',
            p_id_tax: '123',
            amount: '5000',
            cal_vat: '1',
          },
        ]),
      );
      const result = await service.loadCheckForWC(5, 3);
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(5000);
      expect(result[0].cal_vat).toBe(1);
      expect(result[0].p_name).toBe('ร้าน C');
    });

    it('null fields → default (amount 0, cal_vat 2)', async () => {
      rwRepo.createQueryBuilder.mockReturnValue(
        makeQb([
          {
            of_id: 11,
            of_no: null,
            detail: null,
            p_name: null,
            p_address: null,
            p_id_tax: null,
            amount: null,
            cal_vat: null,
          },
        ]),
      );
      const result = await service.loadCheckForWC(5, 3);
      expect(result[0].amount).toBe(0);
      expect(result[0].cal_vat).toBe(2);
      expect(result[0].of_no).toBe('');
      expect(result[0].p_name).toBe('');
    });
  });

  // ─── addWithholdingCertificate ─────────────────────────────────────────────
  describe('addWithholdingCertificate', () => {
    const dto = {
      wc_no: 'WC-100',
      of_id: 10,
      sc_id: 5,
      wc_rank: 1,
      cer_date: '2026-06-01',
      sy_id: 3,
      year: '2569',
    };

    it('happy path → flag:true + บันทึก', async () => {
      wcRepo.save.mockResolvedValue({});
      const result = await service.addWithholdingCertificate(dto);
      expect(result).toEqual({ flag: true, ms: 'บันทึกเรียบร้อยแล้ว' });
      expect(wcRepo.save).toHaveBeenCalled();
    });

    it('default status=100 เมื่อไม่ส่ง status', async () => {
      let saved: any;
      wcRepo.create.mockImplementation((x: any) => x);
      wcRepo.save.mockImplementation((x: any) => {
        saved = x;
        return Promise.resolve(x);
      });
      await service.addWithholdingCertificate(dto);
      expect(saved.status).toBe(100);
      expect(saved.del).toBe(0);
    });

    it('ใช้ status ที่ส่งมา', async () => {
      let saved: any;
      wcRepo.save.mockImplementation((x: any) => {
        saved = x;
        return Promise.resolve(x);
      });
      await service.addWithholdingCertificate({ ...dto, status: 101 });
      expect(saved.status).toBe(101);
    });
  });

  // ─── updateWithholdingCertificate ──────────────────────────────────────────
  describe('updateWithholdingCertificate', () => {
    it('ไม่พบ cert → flag:false', async () => {
      wcRepo.findOne.mockResolvedValue(null);
      const result = await service.updateWithholdingCertificate({ wc_id: 99 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูล' });
    });

    it('filter del=0 ที่ findOne', async () => {
      wcRepo.findOne.mockResolvedValue(null);
      await service.updateWithholdingCertificate({ wc_id: 1 });
      expect(wcRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ wcId: 1, del: 0 }),
        }),
      );
    });

    it('status=101 (ออกแล้ว) → throw BadRequest (ล็อก แก้ไม่ได้)', async () => {
      wcRepo.findOne.mockResolvedValue({ wcId: 1, status: 101, del: 0 });
      await expect(
        service.updateWithholdingCertificate({ wc_id: 1, wc_no: 'X' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('status=100 → แก้ไขได้', async () => {
      const cert: any = { wcId: 1, status: 100, del: 0 };
      wcRepo.findOne.mockResolvedValue(cert);
      wcRepo.save.mockResolvedValue(cert);

      const result = await service.updateWithholdingCertificate({
        wc_id: 1,
        wc_no: 'NEW',
        wc_rank: 2,
        status: 101,
      });
      expect(result).toEqual({ flag: true, ms: 'บันทึกเรียบร้อยแล้ว' });
      expect(cert.wcNo).toBe('NEW');
      expect(cert.wcRank).toBe(2);
      expect(cert.status).toBe(101);
    });

    it('del=1 → soft delete ได้แม้ status=101', async () => {
      const cert: any = { wcId: 1, status: 101, del: 0 };
      wcRepo.findOne.mockResolvedValue(cert);
      wcRepo.save.mockResolvedValue(cert);

      const result = await service.updateWithholdingCertificate({
        wc_id: 1,
        del: 1,
      });
      expect(result).toEqual({ flag: true, ms: 'ลบเรียบร้อยแล้ว' });
      expect(cert.del).toBe(1);
    });

    it('อัปเดตเฉพาะ field ที่ส่งมา (undefined ไม่แตะ)', async () => {
      const cert: any = {
        wcId: 1,
        status: 100,
        del: 0,
        wcNo: 'OLD',
        ofId: 5,
      };
      wcRepo.findOne.mockResolvedValue(cert);
      wcRepo.save.mockResolvedValue(cert);

      await service.updateWithholdingCertificate({ wc_id: 1, of_id: 9 });
      expect(cert.ofId).toBe(9);
      expect(cert.wcNo).toBe('OLD'); // ไม่เปลี่ยน
    });
  });

  // ─── loadRegistrationCertificate ───────────────────────────────────────────
  describe('loadRegistrationCertificate', () => {
    it('filter scId, year(string), del=0', async () => {
      wcRepo.find.mockResolvedValue([]);
      await service.loadRegistrationCertificate(5, '2569');
      expect(wcRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scId: 5, year: '2569', del: 0 }),
        }),
      );
    });

    it('แปลง year ตัวเลข → string ใน where', async () => {
      wcRepo.find.mockResolvedValue([]);
      await service.loadRegistrationCertificate(5, 2569 as any);
      expect(wcRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ year: '2569' }),
        }),
      );
    });

    it('คืน array ว่างเมื่อไม่มี cert', async () => {
      wcRepo.find.mockResolvedValue([]);
      const result = await service.loadRegistrationCertificate(5, '2569');
      expect(result).toEqual([]);
    });

    it('คำนวณ cert_amount = ภาษีที่หัก (cal_vat=1, 10700 → 100)', async () => {
      wcRepo.find.mockResolvedValue([
        { wcId: 1, wcNo: 'WC-1', ofId: 10, cerDate: null, syId: 3, year: '2569', status: 101, upBy: 7 },
      ]);
      rwRepo.find.mockResolvedValue([
        { rwId: 10, pId: 20, amount: 10700, detail: 'ค่าเช่า', bgTypeId: 2 },
      ]);
      partnerRepo.find.mockResolvedValue([
        { pId: 20, pName: 'ร้าน A', calVat: 1 },
      ]);
      managerQuery.mockResolvedValue([
        { bg_type_id: 2, budget_type: 'งบดำเนินงาน' },
      ]);

      const result = await service.loadRegistrationCertificate(5, '2569');
      expect(result).toHaveLength(1);
      const r = result[0];
      expect(r.cert_amount).toBeCloseTo(100, 1);
      expect(r.gross_amount).toBe(10700);
      expect(r.partner_name).toBe('ร้าน A');
      expect(r.budget_type_name).toBe('งบดำเนินงาน');
      expect(r.up_by).toBe('7');
    });

    it('up_by null → ว่าง', async () => {
      wcRepo.find.mockResolvedValue([
        { wcId: 2, ofId: 0, cerDate: null, syId: 3, year: '2569', status: 100, upBy: null },
      ]);
      rwRepo.find.mockResolvedValue([]);
      partnerRepo.find.mockResolvedValue([]);

      const result = await service.loadRegistrationCertificate(5, '2569');
      expect(result[0].up_by).toBe('');
      expect(result[0].cert_amount).toBe(0);
    });
  });
});
