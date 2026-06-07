import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegulatoryConfigService } from './regulatory-config.service';
import { RegulatoryThreshold } from './entities/regulatory-threshold.entity';
import { REGULATORY_DEFAULT_MAP } from './regulatory-config.defaults';

describe('RegulatoryConfigService', () => {
  let service: RegulatoryConfigService;
  let repo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegulatoryConfigService,
        { provide: getRepositoryToken(RegulatoryThreshold), useValue: repo },
      ],
    }).compile();

    service = module.get(RegulatoryConfigService);
  });

  // ─── getThreshold ─────────────────────────────────────────────────────────
  describe('getThreshold', () => {
    it('คืนค่าเฉพาะโรงเรียน (sc-specific) ถ้ามี override', async () => {
      repo.findOne.mockResolvedValueOnce({ value: '999' });
      const v = await service.getThreshold(5, 'finance.wht_min');
      expect(v).toBe(999);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { scId: 5, configKey: 'finance.wht_min', del: 0 },
      });
    });

    it('fallback ไปค่า global (sc_id=0) เมื่อไม่มี sc-specific', async () => {
      repo.findOne
        .mockResolvedValueOnce(null) // sc-specific ไม่มี
        .mockResolvedValueOnce({ value: '8888' }); // global มี
      const v = await service.getThreshold(5, 'finance.wht_min');
      expect(v).toBe(8888);
      expect(repo.findOne).toHaveBeenLastCalledWith({
        where: { scId: 0, configKey: 'finance.wht_min', del: 0 },
      });
    });

    it('fallback ไปค่า default ในโค้ดเมื่อไม่มี override เลย', async () => {
      repo.findOne.mockResolvedValue(null);
      const v = await service.getThreshold(5, 'finance.wht_min');
      expect(v).toBe(REGULATORY_DEFAULT_MAP['finance.wht_min']); // 10000
    });

    it('คีย์ที่ไม่รู้จักและไม่มี override → คืน 0', async () => {
      repo.findOne.mockResolvedValue(null);
      const v = await service.getThreshold(5, 'unknown.key');
      expect(v).toBe(0);
    });

    it('scId=0 → ข้ามการ query sc-specific (เรียก findOne ครั้งเดียวสำหรับ global)', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.getThreshold(0, 'finance.wht_min');
      expect(repo.findOne).toHaveBeenCalledTimes(1);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { scId: 0, configKey: 'finance.wht_min', del: 0 },
      });
    });

    it('ใช้ cache — เรียกซ้ำ key เดิมไม่ query DB อีก', async () => {
      repo.findOne.mockResolvedValue({ value: '500' });
      const first = await service.getThreshold(1, 'finance.wht_min');
      const second = await service.getThreshold(1, 'finance.wht_min');
      expect(first).toBe(500);
      expect(second).toBe(500);
      expect(repo.findOne).toHaveBeenCalledTimes(1); // ครั้งที่สองใช้ cache
    });

    it('แปลง string value จาก DB → number', async () => {
      repo.findOne.mockResolvedValueOnce({ value: '12345.67' });
      const v = await service.getThreshold(1, 'finance.wht_min');
      expect(v).toBe(12345.67);
      expect(typeof v).toBe('number');
    });
  });

  // ─── getThresholds (หลายคีย์) ─────────────────────────────────────────────
  describe('getThresholds', () => {
    it('คืน object { key: value } ครบทุกคีย์', async () => {
      repo.findOne.mockResolvedValue(null); // ใช้ default ทั้งหมด
      const out = await service.getThresholds(1, [
        'finance.wht_min',
        'procurement.specific_max',
      ]);
      expect(out).toEqual({
        'finance.wht_min': REGULATORY_DEFAULT_MAP['finance.wht_min'],
        'procurement.specific_max':
          REGULATORY_DEFAULT_MAP['procurement.specific_max'],
      });
    });
  });

  // ─── getEffectiveConfig (merge default + override) ────────────────────────
  describe('getEffectiveConfig', () => {
    it('ไม่มี override → คืนค่า default ทั้งหมด is_overridden=false', async () => {
      repo.find.mockResolvedValue([]);
      const cfg = await service.getEffectiveConfig(5);
      const whtMin = cfg.find((c) => c.key === 'finance.wht_min');
      expect(whtMin?.value).toBe(REGULATORY_DEFAULT_MAP['finance.wht_min']);
      expect(whtMin?.is_overridden).toBe(false);
      expect(whtMin?.override_scope).toBeNull();
      expect(whtMin?.default_value).toBe(
        REGULATORY_DEFAULT_MAP['finance.wht_min'],
      );
    });

    it('มี override ระดับโรงเรียน → ใช้ค่านั้น scope=school', async () => {
      repo.find.mockResolvedValue([
        { configKey: 'finance.wht_min', value: '5000', scId: 5 },
      ]);
      const cfg = await service.getEffectiveConfig(5);
      const whtMin = cfg.find((c) => c.key === 'finance.wht_min');
      expect(whtMin?.value).toBe(5000);
      expect(whtMin?.is_overridden).toBe(true);
      expect(whtMin?.override_scope).toBe('school');
    });

    it('มีเฉพาะ override ระดับ global → scope=global', async () => {
      repo.find.mockResolvedValue([
        { configKey: 'finance.wht_min', value: '7000', scId: 0 },
      ]);
      const cfg = await service.getEffectiveConfig(5);
      const whtMin = cfg.find((c) => c.key === 'finance.wht_min');
      expect(whtMin?.value).toBe(7000);
      expect(whtMin?.override_scope).toBe('global');
    });

    it('sc-specific ชนะ global เมื่อมีทั้งคู่', async () => {
      repo.find.mockResolvedValue([
        { configKey: 'finance.wht_min', value: '7000', scId: 0 },
        { configKey: 'finance.wht_min', value: '3000', scId: 5 },
      ]);
      const cfg = await service.getEffectiveConfig(5);
      const whtMin = cfg.find((c) => c.key === 'finance.wht_min');
      expect(whtMin?.value).toBe(3000);
      expect(whtMin?.override_scope).toBe('school');
    });

    it('query filter scId (>0) และ global พร้อม del=0', async () => {
      repo.find.mockResolvedValue([]);
      await service.getEffectiveConfig(5);
      expect(repo.find).toHaveBeenCalledWith({
        where: [
          { scId: 5, del: 0 },
          { scId: 0, del: 0 },
        ],
      });
    });

    it('scId=0 → ใช้ 0 เป็น scope แรก', async () => {
      repo.find.mockResolvedValue([]);
      await service.getEffectiveConfig(0);
      expect(repo.find).toHaveBeenCalledWith({
        where: [
          { scId: 0, del: 0 },
          { scId: 0, del: 0 },
        ],
      });
    });
  });

  // ─── upsert ───────────────────────────────────────────────────────────────
  describe('upsert', () => {
    it('คีย์ไม่รู้จัก → flag: false', async () => {
      const res = await service.upsert(1, 'bogus.key', 100, 9);
      expect(res.flag).toBe(false);
      expect(res.ms).toContain('bogus.key');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('มี row เดิม → update value/unit/upBy แล้ว save', async () => {
      const existing = { value: 0, unit: null, upBy: 0 } as any;
      repo.findOne.mockResolvedValue(existing);
      const res = await service.upsert(1, 'finance.wht_min', 5000, 9);
      expect(existing.value).toBe(5000);
      expect(existing.unit).toBe('บาท');
      expect(existing.upBy).toBe(9);
      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(res).toEqual({ flag: true, ms: 'บันทึกเกณฑ์เรียบร้อยแล้ว' });
    });

    it('ไม่มี row เดิม → create ใหม่ del=0 แล้ว save', async () => {
      repo.findOne.mockResolvedValue(null);
      const res = await service.upsert(2, 'finance.wht_min', 8000, 4);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scId: 2,
          configKey: 'finance.wht_min',
          value: 8000,
          unit: 'บาท',
          upBy: 4,
          del: 0,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(res.flag).toBe(true);
    });

    it('upsert คีย์ value=0 (เช่น flag) → ยังถือว่าเป็นคีย์ที่รู้จัก', async () => {
      repo.findOne.mockResolvedValue(null);
      const res = await service.upsert(1, 'finance.block_overspend', 0, 1);
      expect(res.flag).toBe(true);
    });

    it('upsert ล้าง cache — getThreshold หลัง upsert ต้อง query DB ใหม่', async () => {
      // โหลด cache ก่อน
      repo.findOne.mockResolvedValueOnce({ value: '100' });
      await service.getThreshold(1, 'finance.wht_min');
      // upsert (ล้าง cache)
      repo.findOne.mockResolvedValueOnce(null);
      await service.upsert(1, 'finance.wht_min', 200, 1);
      // อ่านใหม่ ต้อง query DB อีกครั้ง
      repo.findOne.mockResolvedValueOnce({ value: '200' });
      const v = await service.getThreshold(1, 'finance.wht_min');
      expect(v).toBe(200);
    });
  });

  // ─── reset ────────────────────────────────────────────────────────────────
  describe('reset', () => {
    it('มี row override → soft delete (del=1) แล้ว save', async () => {
      const existing = { del: 0, upBy: 0 } as any;
      repo.findOne.mockResolvedValue(existing);
      const res = await service.reset(1, 'finance.wht_min', 9);
      expect(existing.del).toBe(1);
      expect(existing.upBy).toBe(9);
      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(res).toEqual({
        flag: true,
        ms: 'รีเซ็ตกลับเป็นค่าตามระเบียบแล้ว',
      });
    });

    it('ไม่มี row override → ไม่ save แต่ยังคืน flag: true', async () => {
      repo.findOne.mockResolvedValue(null);
      const res = await service.reset(1, 'finance.wht_min', 9);
      expect(repo.save).not.toHaveBeenCalled();
      expect(res.flag).toBe(true);
    });

    it('filter del=0 ที่ findOne', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.reset(3, 'finance.wht_min', 1);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { scId: 3, configKey: 'finance.wht_min', del: 0 },
      });
    });
  });
});
