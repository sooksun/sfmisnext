import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegulatoryThreshold } from './entities/regulatory-threshold.entity';
import {
  REGULATORY_DEFAULTS,
  REGULATORY_DEFAULT_MAP,
} from './regulatory-config.defaults';

@Injectable()
export class RegulatoryConfigService {
  /**
   * cache: key = `${scId}:${configKey}` → value
   * ล้างทั้งหมดเมื่อมีการ upsert/reset (singleton service, atomic พอสำหรับ single process)
   */
  private cache = new Map<string, number>();

  constructor(
    @InjectRepository(RegulatoryThreshold)
    private readonly repo: Repository<RegulatoryThreshold>,
  ) {}

  private cacheKey(scId: number, key: string): string {
    return `${scId}:${key}`;
  }

  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * ดึงค่าเกณฑ์ที่มีผลจริงสำหรับโรงเรียน
   * ลำดับ: ค่าเฉพาะโรงเรียน (sc_id) → ค่า global (sc_id=0) → ค่า default ในโค้ด
   */
  async getThreshold(scId: number, key: string): Promise<number> {
    const ck = this.cacheKey(scId, key);
    const cached = this.cache.get(ck);
    if (cached !== undefined) return cached;

    let resolved: number | undefined;

    if (scId && scId > 0) {
      const row = await this.repo.findOne({
        where: { scId, configKey: key, del: 0 },
      });
      if (row) resolved = Number(row.value);
    }

    if (resolved === undefined) {
      const globalRow = await this.repo.findOne({
        where: { scId: 0, configKey: key, del: 0 },
      });
      if (globalRow) resolved = Number(globalRow.value);
    }

    if (resolved === undefined) {
      resolved = REGULATORY_DEFAULT_MAP[key] ?? 0;
    }

    this.cache.set(ck, resolved);
    return resolved;
  }

  /** ดึงหลายคีย์พร้อมกัน → คืน object { key: value } */
  async getThresholds(
    scId: number,
    keys: string[],
  ): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const k of keys) {
      out[k] = await this.getThreshold(scId, k);
    }
    return out;
  }

  /**
   * คืนเกณฑ์ทั้งหมด (merged) สำหรับหน้า admin
   * พร้อม metadata (label, unit, group, lawRef) + ระบุว่า override อยู่หรือใช้ default
   */
  async getEffectiveConfig(scId: number) {
    const overrides = await this.repo.find({
      where: [
        { scId: scId && scId > 0 ? scId : 0, del: 0 },
        { scId: 0, del: 0 },
      ],
    });
    // index override: ให้ sc-specific ชนะ global
    const ovMap = new Map<string, { value: number; scId: number }>();
    for (const o of overrides) {
      const prev = ovMap.get(o.configKey);
      // sc-specific (scId>0) ชนะ global (scId=0)
      if (!prev || (o.scId > 0 && prev.scId === 0)) {
        ovMap.set(o.configKey, { value: Number(o.value), scId: o.scId });
      }
    }

    return REGULATORY_DEFAULTS.map((d) => {
      const ov = ovMap.get(d.key);
      return {
        key: d.key,
        label: d.label,
        group: d.group,
        unit: d.unit,
        law_ref: d.lawRef,
        default_value: d.value,
        value: ov ? ov.value : d.value,
        is_overridden: !!ov,
        override_scope: ov ? (ov.scId > 0 ? 'school' : 'global') : null,
      };
    });
  }

  /** บันทึก/แก้ไขค่าเกณฑ์ (upsert ตาม sc_id + key) */
  async upsert(scId: number, key: string, value: number, upBy: number) {
    if (!REGULATORY_DEFAULT_MAP[key] && REGULATORY_DEFAULT_MAP[key] !== 0) {
      // อนุญาตเฉพาะคีย์ที่รู้จัก (กันคีย์มั่ว)
      const known = REGULATORY_DEFAULTS.some((d) => d.key === key);
      if (!known) return { flag: false, ms: `ไม่รู้จักเกณฑ์ "${key}"` };
    }
    const unit = REGULATORY_DEFAULTS.find((d) => d.key === key)?.unit ?? null;

    let row = await this.repo.findOne({
      where: { scId, configKey: key, del: 0 },
    });
    if (row) {
      row.value = value;
      row.unit = unit;
      row.upBy = upBy;
    } else {
      row = this.repo.create({
        scId,
        configKey: key,
        value,
        unit,
        upBy,
        del: 0,
      });
    }
    await this.repo.save(row);
    this.clearCache();
    return { flag: true, ms: 'บันทึกเกณฑ์เรียบร้อยแล้ว' };
  }

  /** ลบค่า override (กลับไปใช้ค่า default/global) */
  async reset(scId: number, key: string, upBy: number) {
    const row = await this.repo.findOne({
      where: { scId, configKey: key, del: 0 },
    });
    if (row) {
      row.del = 1;
      row.upBy = upBy;
      await this.repo.save(row);
    }
    this.clearCache();
    return { flag: true, ms: 'รีเซ็ตกลับเป็นค่าตามระเบียบแล้ว' };
  }
}
