import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { FixedAsset } from './entities/fixed-asset.entity';
import { FixedAssetDepreciation } from './entities/fixed-asset-depreciation.entity';
import { AddFixedAssetDto } from './dto/add-fixed-asset.dto';
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';

const CATEGORY_NAMES: Record<number, string> = {
  1: 'ครุภัณฑ์สำนักงาน',
  2: 'คอมพิวเตอร์',
  3: 'ยานพาหนะ',
  4: 'ครุภัณฑ์การศึกษา',
  5: 'อื่นๆ',
};
const STATUS_NAMES: Record<number, string> = {
  1: 'ใช้งาน',
  2: 'ชำรุด',
  3: 'ซ่อม',
  4: 'จำหน่ายแล้ว',
  9: 'ยกเลิก',
};
const SOURCE_NAMES: Record<number, string> = {
  1: 'งบประมาณ',
  2: 'เงินรายได้สถานศึกษา',
  3: 'เงินบริจาค',
  4: 'โอนมา',
};

function toNum(v: any): number {
  return v == null ? 0 : Number(v);
}

@Injectable()
export class FixedAssetService {
  constructor(
    @InjectRepository(FixedAsset)
    private readonly faRepo: Repository<FixedAsset>,
    @InjectRepository(FixedAssetDepreciation)
    private readonly fadRepo: Repository<FixedAssetDepreciation>,
  ) {}

  private currentBookValue(fa: FixedAsset): number {
    const acquired = toNum(fa.acquiredPrice);
    const accum = toNum(fa.accumulatedDepreciation);
    return Math.max(toNum(fa.salvageValue), acquired - accum);
  }

  private async genFaCode(scId: number, category: number): Promise<string> {
    const year = new Date().getFullYear() + 543; // พ.ศ.
    const prefix = `A${String(category).padStart(2, '0')}`;
    const last = await this.faRepo
      .createQueryBuilder('fa')
      .where('fa.sc_id = :scId AND fa.fa_code LIKE :like', {
        scId,
        like: `${prefix}/${year}/%`,
      })
      .orderBy('fa.fa_code', 'DESC')
      .getOne();
    let seq = 1;
    if (last) {
      const parts = last.faCode.split('/');
      seq = Number(parts[2] ?? 0) + 1;
    }
    return `${prefix}/${year}/${String(seq).padStart(4, '0')}`;
  }

  async load(
    scId: number,
    page: number,
    pageSize: number,
    status?: number,
    category?: number,
    q?: string,
  ) {
    const where: any = { scId, del: 0 };
    if (status != null && status > 0) where.status = status;
    if (category != null && category > 0) where.faCategory = category;
    if (q) where.faName = Like(`%${q}%`);

    const [items, count] = await this.faRepo.findAndCount({
      where,
      order: { faId: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((fa) => ({
        fa_id: fa.faId,
        fa_code: fa.faCode,
        fa_name: fa.faName,
        fa_category: fa.faCategory,
        fa_category_name: CATEGORY_NAMES[fa.faCategory] ?? '',
        fa_brand: fa.faBrand,
        fa_model: fa.faModel,
        fa_serial_no: fa.faSerialNo,
        acquired_date: fa.acquiredDate,
        acquired_price: toNum(fa.acquiredPrice),
        useful_life_years: fa.usefulLifeYears,
        accumulated_depreciation: toNum(fa.accumulatedDepreciation),
        book_value: this.currentBookValue(fa),
        location: fa.location,
        responsible_name: fa.responsibleName,
        source: fa.source,
        source_name: SOURCE_NAMES[fa.source] ?? '',
        status: fa.status,
        status_name: STATUS_NAMES[fa.status] ?? '',
        parcel_order_id: fa.parcelOrderId,
        create_date: fa.createDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  async get(faId: number) {
    const fa = await this.faRepo.findOne({ where: { faId, del: 0 } });
    if (!fa) return null;
    const history = await this.fadRepo.find({
      where: { faId, del: 0 },
      order: { budgetYear: 'ASC' },
    });
    return {
      ...fa,
      book_value: this.currentBookValue(fa),
      depreciation_history: history.map((h) => ({
        budget_year: h.budgetYear,
        depreciation_amount: toNum(h.depreciationAmount),
        book_value_end: toNum(h.bookValueEnd),
        calc_date: h.calcDate,
      })),
    };
  }

  async add(dto: AddFixedAssetDto) {
    const faCode =
      dto.fa_code && dto.fa_code.trim()
        ? dto.fa_code.trim()
        : await this.genFaCode(dto.sc_id, dto.fa_category);

    const dup = await this.faRepo.findOne({
      where: { scId: dto.sc_id, faCode, del: 0 },
    });
    if (dup) {
      return { flag: false, ms: `เลขครุภัณฑ์ ${faCode} มีอยู่แล้ว` };
    }

    const fa = this.faRepo.create({
      scId: dto.sc_id,
      faCode,
      faName: dto.fa_name,
      faCategory: dto.fa_category,
      faDetail: dto.fa_detail ?? null,
      faBrand: dto.fa_brand ?? null,
      faModel: dto.fa_model ?? null,
      faSerialNo: dto.fa_serial_no ?? null,
      acquiredDate: dto.acquired_date ?? null,
      acquiredPrice: dto.acquired_price,
      usefulLifeYears: dto.useful_life_years ?? 5,
      depreciationMethod: dto.depreciation_method ?? 1,
      salvageValue: dto.salvage_value ?? 1,
      accumulatedDepreciation: 0,
      location: dto.location ?? null,
      responsibleAdminId: dto.responsible_admin_id ?? null,
      responsibleName: dto.responsible_name ?? null,
      source: dto.source ?? 1,
      parcelOrderId: dto.parcel_order_id ?? null,
      receiveParcelOrderId: dto.receive_parcel_order_id ?? null,
      imageUrl: dto.image_url ?? null,
      note: dto.note ?? null,
      status: 1,
      upBy: dto.up_by,
      del: 0,
    });
    await this.faRepo.save(fa);
    return { flag: true, ms: `บันทึกครุภัณฑ์ ${faCode} เรียบร้อยแล้ว` };
  }

  async update(dto: UpdateFixedAssetDto) {
    const fa = await this.faRepo.findOne({
      where: { faId: dto.fa_id, del: 0 },
    });
    if (!fa) return { flag: false, ms: 'ไม่พบครุภัณฑ์' };
    if (fa.status === 4)
      return { flag: false, ms: 'ครุภัณฑ์นี้ถูกจำหน่ายแล้ว ไม่สามารถแก้ไขได้' };

    const map: Record<string, keyof FixedAsset> = {
      fa_name: 'faName',
      fa_category: 'faCategory',
      fa_detail: 'faDetail',
      fa_brand: 'faBrand',
      fa_model: 'faModel',
      fa_serial_no: 'faSerialNo',
      acquired_date: 'acquiredDate',
      acquired_price: 'acquiredPrice',
      useful_life_years: 'usefulLifeYears',
      depreciation_method: 'depreciationMethod',
      salvage_value: 'salvageValue',
      location: 'location',
      responsible_admin_id: 'responsibleAdminId',
      responsible_name: 'responsibleName',
      source: 'source',
      image_url: 'imageUrl',
      note: 'note',
    };
    for (const k of Object.keys(map)) {
      const v = (dto as any)[k];
      if (v !== undefined) (fa as any)[map[k]] = v;
    }
    fa.upBy = dto.up_by ?? fa.upBy;
    await this.faRepo.save(fa);
    return { flag: true, ms: 'แก้ไขครุภัณฑ์เรียบร้อยแล้ว' };
  }

  async changeStatus(faId: number, status: number, note: string, upBy: number) {
    const fa = await this.faRepo.findOne({ where: { faId, del: 0 } });
    if (!fa) return { flag: false, ms: 'ไม่พบครุภัณฑ์' };
    fa.status = status;
    if (note) fa.note = note;
    fa.upBy = upBy;
    await this.faRepo.save(fa);
    return { flag: true, ms: 'เปลี่ยนสถานะเรียบร้อยแล้ว' };
  }

  async remove(faId: number, upBy: number) {
    const fa = await this.faRepo.findOne({ where: { faId, del: 0 } });
    if (!fa) return { flag: false, ms: 'ไม่พบครุภัณฑ์' };
    fa.del = 1;
    fa.upBy = upBy;
    await this.faRepo.save(fa);
    return { flag: true, ms: 'ลบครุภัณฑ์เรียบร้อยแล้ว' };
  }

  async calcDepreciation(scId: number, budgetYear: number, upBy: number) {
    const assets = await this.faRepo.find({
      where: { scId, del: 0 },
    });

    let calculated = 0;
    const today = new Date().toISOString().substring(0, 10);

    for (const fa of assets) {
      if (fa.status === 4 || fa.status === 9) continue;
      const exists = await this.fadRepo.findOne({
        where: { faId: fa.faId, budgetYear, del: 0 },
      });
      if (exists) continue;

      const acquired = toNum(fa.acquiredPrice);
      const salvage = toNum(fa.salvageValue);
      const life = Math.max(1, fa.usefulLifeYears || 5);
      const annualDep = (acquired - salvage) / life;

      const remainingDep =
        acquired - salvage - toNum(fa.accumulatedDepreciation);
      const thisYearDep = Math.max(0, Math.min(annualDep, remainingDep));

      fa.accumulatedDepreciation =
        toNum(fa.accumulatedDepreciation) + thisYearDep;
      fa.upBy = upBy;
      await this.faRepo.save(fa);

      const rec = this.fadRepo.create({
        faId: fa.faId,
        budgetYear,
        depreciationAmount: thisYearDep,
        bookValueEnd: this.currentBookValue(fa),
        calcDate: today,
        upBy,
        del: 0,
      });
      await this.fadRepo.save(rec);
      calculated++;
    }

    return {
      flag: true,
      ms: `คำนวณค่าเสื่อมราคาปี ${budgetYear} เรียบร้อย — ${calculated} รายการ`,
    };
  }

  async report(scId: number, budgetYear: number) {
    const assets = await this.faRepo.find({
      where: { scId, del: 0 },
      order: { faCategory: 'ASC', faCode: 'ASC' },
    });

    const byCategory: Record<number, any> = {};
    let grandTotal = 0;
    let grandBookValue = 0;

    for (const fa of assets) {
      const cat = fa.faCategory;
      if (!byCategory[cat]) {
        byCategory[cat] = {
          category: cat,
          category_name: CATEGORY_NAMES[cat] ?? '',
          items: [],
          total_acquired: 0,
          total_book_value: 0,
        };
      }
      const bookValue = this.currentBookValue(fa);
      byCategory[cat].items.push({
        fa_id: fa.faId,
        fa_code: fa.faCode,
        fa_name: fa.faName,
        acquired_date: fa.acquiredDate,
        acquired_price: toNum(fa.acquiredPrice),
        accumulated_depreciation: toNum(fa.accumulatedDepreciation),
        book_value: bookValue,
        status: fa.status,
        status_name: STATUS_NAMES[fa.status] ?? '',
        location: fa.location,
      });
      byCategory[cat].total_acquired += toNum(fa.acquiredPrice);
      byCategory[cat].total_book_value += bookValue;
      grandTotal += toNum(fa.acquiredPrice);
      grandBookValue += bookValue;
    }

    return {
      data: Object.values(byCategory),
      summary: {
        total_items: assets.length,
        total_acquired: grandTotal,
        total_book_value: grandBookValue,
      },
      budget_year: budgetYear,
    };
  }
}
