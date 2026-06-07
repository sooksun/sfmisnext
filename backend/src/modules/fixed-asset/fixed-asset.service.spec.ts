import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like } from 'typeorm';
import { FixedAssetService } from './fixed-asset.service';
import { FixedAsset } from './entities/fixed-asset.entity';
import { FixedAssetDepreciation } from './entities/fixed-asset-depreciation.entity';
import { AddFixedAssetDto } from './dto/add-fixed-asset.dto';
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';

// createQueryBuilder mock (getOne) สำหรับ genFaCode
function makeQb(getOneResult: unknown = null) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['where', 'orderBy'].forEach((m) => (qb[m] = jest.fn().mockReturnValue(chain())));
  qb['getOne'] = jest.fn().mockResolvedValue(getOneResult);
  return qb;
}

describe('FixedAssetService', () => {
  let service: FixedAssetService;
  let faRepo: jest.Mocked<any>;
  let fadRepo: jest.Mocked<any>;

  beforeEach(async () => {
    faRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
      createQueryBuilder: jest.fn().mockReturnValue(makeQb(null)),
    };
    fadRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FixedAssetService,
        { provide: getRepositoryToken(FixedAsset), useValue: faRepo },
        { provide: getRepositoryToken(FixedAssetDepreciation), useValue: fadRepo },
      ],
    }).compile();

    service = module.get(FixedAssetService);
  });

  function makeFa(overrides: Record<string, unknown> = {}): any {
    return {
      faId: 1,
      faCode: 'A01/2569/0001',
      faName: 'โต๊ะทำงาน',
      faCategory: 1,
      faBrand: null,
      faModel: null,
      faSerialNo: null,
      acquiredDate: '2026-01-01',
      acquiredPrice: 10000,
      usefulLifeYears: 5,
      accumulatedDepreciation: 0,
      salvageValue: 1,
      location: null,
      responsibleName: null,
      source: 1,
      status: 1,
      parcelOrderId: null,
      createDate: null,
      ...overrides,
    };
  }

  // ─── load ───────────────────────────────────────────────────────────────────
  describe('load', () => {
    it('filter scId + del=0, pagination, คืน count/page/pageSize', async () => {
      faRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.load(5, 2, 20);
      expect(faRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scId: 5, del: 0 }),
          skip: 20,
          take: 20,
        }),
      );
      expect(result).toEqual({ data: [], count: 0, page: 2, pageSize: 20 });
    });

    it('filter status, category, q (Like) เมื่อระบุ', async () => {
      faRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.load(1, 1, 10, 1, 2, 'โต๊ะ');
      const where = faRepo.findAndCount.mock.calls[0][0].where;
      expect(where.status).toBe(1);
      expect(where.faCategory).toBe(2);
      expect(where.faName).toEqual(Like('%โต๊ะ%'));
    });

    it('ไม่ filter status/category ถ้าเป็น 0', async () => {
      faRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.load(1, 1, 10, 0, 0);
      const where = faRepo.findAndCount.mock.calls[0][0].where;
      expect(where.status).toBeUndefined();
      expect(where.faCategory).toBeUndefined();
    });

    it('map + คำนวณ book_value = acquired - accum (>= salvage)', async () => {
      faRepo.findAndCount.mockResolvedValue([
        [makeFa({ acquiredPrice: 10000, accumulatedDepreciation: 3000, salvageValue: 1 })],
        1,
      ]);
      const result = await service.load(1, 1, 10);
      expect(result.data[0].book_value).toBe(7000);
      expect(result.data[0].fa_category_name).toBe('ครุภัณฑ์สำนักงาน');
      expect(result.data[0].status_name).toBe('ใช้งาน');
      expect(result.data[0].source_name).toBe('งบประมาณ');
    });

    it('book_value ไม่ต่ำกว่า salvage value', async () => {
      faRepo.findAndCount.mockResolvedValue([
        [makeFa({ acquiredPrice: 10000, accumulatedDepreciation: 9999, salvageValue: 500 })],
        1,
      ]);
      const result = await service.load(1, 1, 10);
      // acquired - accum = 1 แต่ salvage = 500 => 500
      expect(result.data[0].book_value).toBe(500);
    });
  });

  // ─── get ────────────────────────────────────────────────────────────────────
  describe('get', () => {
    it('ไม่พบ → null', async () => {
      faRepo.findOne.mockResolvedValue(null);
      const result = await service.get(99);
      expect(result).toBeNull();
    });

    it('คืน asset + book_value + depreciation_history', async () => {
      faRepo.findOne.mockResolvedValue(makeFa());
      fadRepo.find.mockResolvedValue([
        { budgetYear: 2569, depreciationAmount: 2000, bookValueEnd: 8000, calcDate: '2026-09-30' },
      ]);
      const result = await service.get(1);
      expect(result?.book_value).toBe(10000); // 10000 - 0 accum (>= salvage 1)
      expect(result?.depreciation_history).toHaveLength(1);
      expect(result?.depreciation_history[0].depreciation_amount).toBe(2000);
    });
  });

  // ─── add ────────────────────────────────────────────────────────────────────
  describe('add', () => {
    const baseDto: AddFixedAssetDto = {
      sc_id: 1,
      fa_name: 'เก้าอี้',
      fa_category: 1,
      acquired_price: 5000,
      up_by: 7,
    } as AddFixedAssetDto;

    it('auto-gen fa_code เมื่อไม่ส่งมา (prefix A01/พ.ศ./seq)', async () => {
      faRepo.createQueryBuilder.mockReturnValue(makeQb(null)); // ไม่มี code เดิม
      faRepo.findOne.mockResolvedValue(null);
      const result = await service.add(baseDto);
      const created = faRepo.create.mock.calls[0][0];
      expect(created.faCode).toMatch(/^A01\/\d{4}\/0001$/);
      expect(result.flag).toBe(true);
    });

    it('gen seq ต่อจาก code เดิม', async () => {
      const year = new Date().getFullYear() + 543;
      faRepo.createQueryBuilder.mockReturnValue(
        makeQb({ faCode: `A01/${year}/0005` }),
      );
      faRepo.findOne.mockResolvedValue(null);
      await service.add(baseDto);
      const created = faRepo.create.mock.calls[0][0];
      expect(created.faCode).toBe(`A01/${year}/0006`);
    });

    it('ใช้ fa_code ที่ส่งมาถ้ามี (trim)', async () => {
      faRepo.findOne.mockResolvedValue(null);
      await service.add({ ...baseDto, fa_code: '  CUSTOM-1  ' });
      const created = faRepo.create.mock.calls[0][0];
      expect(created.faCode).toBe('CUSTOM-1');
      expect(faRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('fa_code ซ้ำ → flag: false', async () => {
      faRepo.findOne.mockResolvedValue({ faId: 9, faCode: 'CUSTOM-1' });
      const result = await service.add({ ...baseDto, fa_code: 'CUSTOM-1' });
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('มีอยู่แล้ว');
      expect(faRepo.save).not.toHaveBeenCalled();
    });

    it('default usefulLifeYears=5, salvageValue=1, source=1, status=1, accumDep=0', async () => {
      faRepo.createQueryBuilder.mockReturnValue(makeQb(null));
      faRepo.findOne.mockResolvedValue(null);
      await service.add(baseDto);
      const created = faRepo.create.mock.calls[0][0];
      expect(created.usefulLifeYears).toBe(5);
      expect(created.salvageValue).toBe(1);
      expect(created.source).toBe(1);
      expect(created.status).toBe(1);
      expect(created.accumulatedDepreciation).toBe(0);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────
  describe('update', () => {
    const dto: UpdateFixedAssetDto = {
      fa_id: 1,
      fa_name: 'ชื่อใหม่',
      up_by: 7,
    } as UpdateFixedAssetDto;

    it('ไม่พบ → flag: false', async () => {
      faRepo.findOne.mockResolvedValue(null);
      const result = await service.update(dto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบครุภัณฑ์' });
    });

    it('ครุภัณฑ์จำหน่ายแล้ว (status=4) → ห้ามแก้ไข', async () => {
      faRepo.findOne.mockResolvedValue(makeFa({ status: 4 }));
      const result = await service.update(dto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('จำหน่ายแล้ว');
      expect(faRepo.save).not.toHaveBeenCalled();
    });

    it('happy path → map field + save', async () => {
      const fa = makeFa();
      faRepo.findOne.mockResolvedValue(fa);
      const result = await service.update({
        fa_id: 1,
        fa_name: 'ชื่อใหม่',
        acquired_price: 8000,
        up_by: 9,
      } as UpdateFixedAssetDto);
      expect(fa.faName).toBe('ชื่อใหม่');
      expect(fa.acquiredPrice).toBe(8000);
      expect(fa.upBy).toBe(9);
      expect(result.flag).toBe(true);
    });

    it('field ที่ undefined ไม่ถูกแก้', async () => {
      const fa = makeFa({ faName: 'เดิม', location: 'ห้อง A' });
      faRepo.findOne.mockResolvedValue(fa);
      await service.update({ fa_id: 1, up_by: 7 } as UpdateFixedAssetDto);
      expect(fa.faName).toBe('เดิม');
      expect(fa.location).toBe('ห้อง A');
    });
  });

  // ─── changeStatus ─────────────────────────────────────────────────────────────
  describe('changeStatus', () => {
    it('ไม่พบ → flag: false', async () => {
      faRepo.findOne.mockResolvedValue(null);
      const result = await service.changeStatus(99, 2, '', 7);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบครุภัณฑ์' });
    });

    it('เปลี่ยนสถานะ + note + upBy', async () => {
      const fa = makeFa();
      faRepo.findOne.mockResolvedValue(fa);
      const result = await service.changeStatus(1, 2, 'ชำรุดจากการใช้งาน', 9);
      expect(fa.status).toBe(2);
      expect(fa.note).toBe('ชำรุดจากการใช้งาน');
      expect(fa.upBy).toBe(9);
      expect(result.flag).toBe(true);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('ไม่พบ → flag: false', async () => {
      faRepo.findOne.mockResolvedValue(null);
      const result = await service.remove(99, 7);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบครุภัณฑ์' });
    });

    it('soft delete (del=1) + upBy', async () => {
      const fa = makeFa();
      faRepo.findOne.mockResolvedValue(fa);
      const result = await service.remove(1, 9);
      expect(fa.del).toBe(1);
      expect(fa.upBy).toBe(9);
      expect(result.flag).toBe(true);
    });
  });

  // ─── calcDepreciation ─────────────────────────────────────────────────────────
  describe('calcDepreciation', () => {
    it('คำนวณค่าเสื่อมรายปีแบบเส้นตรง (acquired-salvage)/life', async () => {
      const fa = makeFa({ acquiredPrice: 10000, salvageValue: 0, usefulLifeYears: 5, accumulatedDepreciation: 0 });
      faRepo.find.mockResolvedValue([fa]);
      fadRepo.findOne.mockResolvedValue(null); // ยังไม่เคยคำนวณปีนี้
      const result = await service.calcDepreciation(1, 2569, 7);
      // (10000-0)/5 = 2000
      expect(fa.accumulatedDepreciation).toBe(2000);
      const rec = fadRepo.create.mock.calls[0][0];
      expect(rec.depreciationAmount).toBe(2000);
      expect(rec.budgetYear).toBe(2569);
      expect(result.ms).toContain('1 รายการ');
    });

    it('ข้ามครุภัณฑ์ที่จำหน่ายแล้ว (status=4) หรือยกเลิก (status=9)', async () => {
      faRepo.find.mockResolvedValue([
        makeFa({ faId: 1, status: 4 }),
        makeFa({ faId: 2, status: 9 }),
      ]);
      fadRepo.findOne.mockResolvedValue(null);
      const result = await service.calcDepreciation(1, 2569, 7);
      expect(fadRepo.save).not.toHaveBeenCalled();
      expect(result.ms).toContain('0 รายการ');
    });

    it('ข้ามครุภัณฑ์ที่คำนวณปีนี้แล้ว (มี record เดิม)', async () => {
      faRepo.find.mockResolvedValue([makeFa()]);
      fadRepo.findOne.mockResolvedValue({ fadId: 1 }); // มีแล้ว
      const result = await service.calcDepreciation(1, 2569, 7);
      expect(fadRepo.create).not.toHaveBeenCalled();
      expect(result.ms).toContain('0 รายการ');
    });

    it('ค่าเสื่อมปีสุดท้ายจำกัดไม่เกิน remaining (ไม่ต่ำกว่า salvage)', async () => {
      // เหลือคิดได้แค่ 500 แต่รายปี = 2000 → คิดแค่ 500
      const fa = makeFa({
        acquiredPrice: 10000,
        salvageValue: 0,
        usefulLifeYears: 5,
        accumulatedDepreciation: 9500,
      });
      faRepo.find.mockResolvedValue([fa]);
      fadRepo.findOne.mockResolvedValue(null);
      await service.calcDepreciation(1, 2569, 7);
      const rec = fadRepo.create.mock.calls[0][0];
      expect(rec.depreciationAmount).toBe(500);
      expect(fa.accumulatedDepreciation).toBe(10000);
    });

    it('คิดเต็มจำนวนแล้ว (remaining=0) → ค่าเสื่อม=0', async () => {
      const fa = makeFa({
        acquiredPrice: 10000,
        salvageValue: 0,
        usefulLifeYears: 5,
        accumulatedDepreciation: 10000,
      });
      faRepo.find.mockResolvedValue([fa]);
      fadRepo.findOne.mockResolvedValue(null);
      await service.calcDepreciation(1, 2569, 7);
      const rec = fadRepo.create.mock.calls[0][0];
      expect(rec.depreciationAmount).toBe(0);
    });
  });

  // ─── report ───────────────────────────────────────────────────────────────────
  describe('report', () => {
    it('จัดกลุ่มตามหมวด + รวม total_acquired / total_book_value', async () => {
      faRepo.find.mockResolvedValue([
        makeFa({ faId: 1, faCategory: 1, acquiredPrice: 10000, accumulatedDepreciation: 2000, salvageValue: 0 }),
        makeFa({ faId: 2, faCategory: 1, acquiredPrice: 5000, accumulatedDepreciation: 0, salvageValue: 0 }),
        makeFa({ faId: 3, faCategory: 2, acquiredPrice: 20000, accumulatedDepreciation: 5000, salvageValue: 0 }),
      ]);
      const result = await service.report(1, 2569);
      expect(result.summary.total_items).toBe(3);
      expect(result.summary.total_acquired).toBe(35000);
      // book: (10000-2000)+(5000-0)+(20000-5000) = 8000+5000+15000 = 28000
      expect(result.summary.total_book_value).toBe(28000);
      expect(result.data).toHaveLength(2); // 2 หมวด
    });

    it('ไม่มีครุภัณฑ์ → summary เป็น 0, data ว่าง', async () => {
      faRepo.find.mockResolvedValue([]);
      const result = await service.report(1, 2569);
      expect(result.summary.total_items).toBe(0);
      expect(result.summary.total_acquired).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
