import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SupContract } from './entities/sup-contract.entity';
import { SupInspection } from './entities/sup-inspection.entity';
import { SupAnnualCheck } from './entities/sup-annual-check.entity';
import { SupDisposal } from './entities/sup-disposal.entity';
import { TransactionSupplies } from './entities/transaction-supplies.entity';
import { ParcelDetail } from '../project-approve/entities/parcel-detail.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';

@Injectable()
export class SupplieExtService {
  private readonly committeeThreshold: number;

  constructor(
    @InjectRepository(SupContract)
    private readonly ctRepo: Repository<SupContract>,
    @InjectRepository(SupInspection)
    private readonly inspRepo: Repository<SupInspection>,
    @InjectRepository(SupAnnualCheck)
    private readonly acRepo: Repository<SupAnnualCheck>,
    @InjectRepository(SupDisposal)
    private readonly dpRepo: Repository<SupDisposal>,
    @InjectRepository(TransactionSupplies)
    private readonly txRepo: Repository<TransactionSupplies>,
    @InjectRepository(ParcelDetail)
    private readonly pdRepo: Repository<ParcelDetail>,
    @InjectRepository(ParcelOrder)
    private readonly poRepo: Repository<ParcelOrder>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.committeeThreshold =
      this.configService.get<number>('COMMITTEE_THRESHOLD') ?? 5000;
  }

  // ========== Contract ==========
  async loadContract(scId: number, orderId?: number) {
    const qb = this.ctRepo
      .createQueryBuilder('c')
      .where('c.del = 0')
      .andWhere('c.sc_id = :scId', { scId })
      .orderBy('c.ct_id', 'DESC');
    if (orderId) qb.andWhere('c.order_id = :orderId', { orderId });
    const data = await qb.getMany();
    return { data, count: data.length, page: 1, pageSize: data.length };
  }

  async saveContract(body: any) {
    const isNew = !body.ct_id;
    const payload = {
      orderId: body.order_id ?? null,
      scId: body.sc_id ?? null,
      ctNo: body.ct_no ?? null,
      ctType: body.ct_type ?? 1,
      supplierId: body.supplier_id ?? null,
      ctDate: body.ct_date ? new Date(body.ct_date) : null,
      ctAmount: Number(body.ct_amount ?? 0),
      ctVat: Number(body.ct_vat ?? 0),
      ctTotal: Number(body.ct_total ?? 0),
      warrantyAmount: Number(body.warranty_amount ?? 0),
      warrantyType: body.warranty_type ?? 0,
      warrantyReturnDt: body.warranty_return_dt
        ? new Date(body.warranty_return_dt)
        : null,
      startDate: body.start_date ? new Date(body.start_date) : null,
      endDate: body.end_date ? new Date(body.end_date) : null,
      productWarrantyMonths: Number(body.product_warranty_months ?? 0),
      warrantyStartDate: body.warranty_start_date
        ? new Date(body.warranty_start_date)
        : null,
      warrantyEndDate: body.warranty_end_date
        ? new Date(body.warranty_end_date)
        : null,
      ctStatus: body.ct_status ?? 0,
      ctFile: body.ct_file ?? null,
      remark: body.remark ?? null,
      upBy: body.up_by ?? 0,
    };
    if (isNew) {
      const row = this.ctRepo.create(payload);
      await this.ctRepo.save(row);
      return { flag: true, ms: 'บันทึกสัญญาสำเร็จ', ct_id: row.ctId };
    }
    const ct = await this.ctRepo.findOne({
      where: { ctId: body.ct_id, del: 0 },
    });
    if (!ct) throw new NotFoundException('ไม่พบสัญญา');
    Object.assign(ct, payload);
    await this.ctRepo.save(ct);
    return { flag: true, ms: 'อัปเดตสัญญาสำเร็จ' };
  }

  async removeContract(ctId: number, upBy: number) {
    const ct = await this.ctRepo.findOne({ where: { ctId, del: 0 } });
    if (!ct) throw new NotFoundException('ไม่พบสัญญา');
    if (ct.ctStatus >= 2)
      throw new BadRequestException('สัญญาส่งมอบแล้ว ลบไม่ได้');
    ct.del = 1;
    ct.upBy = upBy || ct.upBy;
    await this.ctRepo.save(ct);
    return { flag: true, ms: 'ลบสำเร็จ' };
  }

  // ========== Inspection ==========
  async loadInspection(scId: number, orderId?: number) {
    const qb = this.inspRepo
      .createQueryBuilder('i')
      .where('i.del = 0')
      .andWhere('i.sc_id = :scId', { scId })
      .orderBy('i.insp_id', 'DESC');
    if (orderId) qb.andWhere('i.order_id = :orderId', { orderId });
    const data = await qb.getMany();
    return { data, count: data.length, page: 1, pageSize: data.length };
  }

  async saveInspection(body: any) {
    const isNew = !body.insp_id;
    const payload = {
      orderId: body.order_id ?? null,
      ctId: body.ct_id ?? null,
      scId: body.sc_id ?? null,
      inspDate: body.insp_date ? new Date(body.insp_date) : null,
      inspResult: body.insp_result ?? 1,
      inspNote: body.insp_note ?? null,
      committee1: body.committee1 ?? 0,
      committee2: body.committee2 ?? 0,
      committee3: body.committee3 ?? 0,
      reportNo: body.report_no ?? null,
      reportDate: body.report_date ? new Date(body.report_date) : null,
      upBy: body.up_by ?? 0,
    };

    // M9: ตรวจ committee ถ้า amount ≥ COMMITTEE_THRESHOLD
    if (body.order_id && body.insp_result === 1) {
      const po = await this.poRepo.findOne({
        where: { orderId: body.order_id, del: 0 },
      });
      if (po && Number(po.budgets || 0) >= this.committeeThreshold) {
        if (!body.committee1 || !body.committee2 || !body.committee3) {
          throw new BadRequestException(
            `ยอดจัดซื้อ ≥ ${this.committeeThreshold.toLocaleString('th-TH')} บาท ต้องระบุคณะกรรมการตรวจรับ 3 คน`,
          );
        }
      }
    }

    if (isNew) {
      const row = this.inspRepo.create(payload);
      await this.inspRepo.save(row);
      if (row.inspResult === 1) await this.postInspectionToStock(row);
      return { flag: true, ms: 'บันทึกการตรวจรับสำเร็จ', insp_id: row.inspId };
    }
    const insp = await this.inspRepo.findOne({
      where: { inspId: body.insp_id, del: 0 },
    });
    if (!insp) throw new NotFoundException('ไม่พบการตรวจรับ');
    if (insp.stockPosted === 1)
      throw new BadRequestException('ลงสต็อกแล้ว แก้ไขไม่ได้');
    Object.assign(insp, payload);
    await this.inspRepo.save(insp);
    if (insp.inspResult === 1) await this.postInspectionToStock(insp);
    return { flag: true, ms: 'อัปเดตการตรวจรับสำเร็จ' };
  }

  private async postInspectionToStock(insp: SupInspection) {
    if (insp.stockPosted === 1 || !insp.orderId) return;

    // M3: wrap ใน transaction เพื่อรับประกัน atomic (ป้องกัน half-posted)
    await this.dataSource.transaction(async (manager) => {
      const details = await manager.find(ParcelDetail, {
        where: { orderId: insp.orderId!, del: 0 },
      });
      for (const d of details) {
        if (!d.suppId) continue;
        const last = await manager
          .createQueryBuilder(TransactionSupplies, 't')
          .where('t.supp_id = :suppId', { suppId: d.suppId })
          .andWhere('t.del = 0')
          .orderBy('t.trans_id', 'DESC')
          .getOne();
        const prevBal = last ? Number(last.transBalance || 0) : 0;
        const inQty = Number(d.pcTotal || 0);
        const tx = manager.create(TransactionSupplies, {
          suppId: d.suppId,
          transIn: inQty,
          transOut: 0,
          transBalance: prevBal + inQty,
          transComment: `ตรวจรับ #${insp.inspId}`,
          upBy: insp.upBy,
        });
        await manager.save(TransactionSupplies, tx);
      }
      insp.stockPosted = 1;
      await manager.save(SupInspection, insp);
      if (insp.orderId) {
        const po = await manager.findOne(ParcelOrder, {
          where: { orderId: insp.orderId, del: 0 },
        });
        if (po) {
          po.orderStatus = 8;
          await manager.save(ParcelOrder, po);
        }
      }
    });
  }

  async removeInspection(inspId: number, upBy: number) {
    const insp = await this.inspRepo.findOne({ where: { inspId, del: 0 } });
    if (!insp) throw new NotFoundException('ไม่พบการตรวจรับ');
    if (insp.stockPosted === 1)
      throw new BadRequestException('ลงสต็อกแล้ว ลบไม่ได้');
    insp.del = 1;
    insp.upBy = upBy || insp.upBy;
    await this.inspRepo.save(insp);
    return { flag: true, ms: 'ลบสำเร็จ' };
  }

  // ========== Annual Check ==========
  async loadAnnualCheck(scId: number, acadYear: number) {
    const data = await this.acRepo
      .createQueryBuilder('a')
      .where('a.del = 0')
      .andWhere('a.sc_id = :scId', { scId })
      .andWhere('a.acad_year = :acadYear', { acadYear })
      .orderBy('a.ac_id', 'DESC')
      .getMany();
    return { data, count: data.length, page: 1, pageSize: data.length };
  }

  async saveAnnualCheck(body: any) {
    const isNew = !body.ac_id;
    const expected = Number(body.expected_qty ?? 0);
    const actual = Number(body.actual_qty ?? 0);
    const payload = {
      scId: body.sc_id ?? null,
      acadYear: body.acad_year ?? null,
      suppId: body.supp_id ?? null,
      expectedQty: expected,
      actualQty: actual,
      diffQty: actual - expected,
      status:
        body.status ?? (actual === expected ? 1 : actual < expected ? 2 : 3),
      note: body.note ?? null,
      checkerId: body.checker_id ?? null,
      checkDate: body.check_date ? new Date(body.check_date) : new Date(),
      upBy: body.up_by ?? 0,
    };
    if (isNew) {
      const row = this.acRepo.create(payload);
      await this.acRepo.save(row);
      return { flag: true, ms: 'บันทึกสำเร็จ', ac_id: row.acId };
    }
    const ac = await this.acRepo.findOne({
      where: { acId: body.ac_id, del: 0 },
    });
    if (!ac) throw new NotFoundException('ไม่พบรายการ');
    Object.assign(ac, payload);
    await this.acRepo.save(ac);
    return { flag: true, ms: 'อัปเดตสำเร็จ' };
  }

  async removeAnnualCheck(acId: number, upBy: number) {
    const ac = await this.acRepo.findOne({ where: { acId, del: 0 } });
    if (!ac) throw new NotFoundException('ไม่พบรายการ');
    ac.del = 1;
    ac.upBy = upBy || ac.upBy;
    await this.acRepo.save(ac);
    return { flag: true, ms: 'ลบสำเร็จ' };
  }

  // ========== Disposal ==========
  async loadDisposal(scId: number) {
    const data = await this.dpRepo
      .createQueryBuilder('d')
      .where('d.del = 0')
      .andWhere('d.sc_id = :scId', { scId })
      .orderBy('d.dp_id', 'DESC')
      .getMany();
    return { data, count: data.length, page: 1, pageSize: data.length };
  }

  async saveDisposal(body: any) {
    const isNew = !body.dp_id;
    const payload = {
      scId: body.sc_id ?? null,
      suppId: body.supp_id ?? null,
      qty: Number(body.qty ?? 0),
      method: body.method ?? 1,
      reason: body.reason ?? null,
      soldAmount: Number(body.sold_amount ?? 0),
      approvedBy: body.approved_by ?? null,
      approveDate: body.approve_date ? new Date(body.approve_date) : null,
      dpStatus: body.dp_status ?? 0,
      upBy: body.up_by ?? 0,
    };
    if (isNew) {
      const row = this.dpRepo.create(payload);
      await this.dpRepo.save(row);
      return { flag: true, ms: 'บันทึกสำเร็จ', dp_id: row.dpId };
    }
    const dp = await this.dpRepo.findOne({
      where: { dpId: body.dp_id, del: 0 },
    });
    if (!dp) throw new NotFoundException('ไม่พบรายการ');
    if (dp.dpStatus === 2)
      throw new BadRequestException('ดำเนินการแล้ว แก้ไขไม่ได้');
    Object.assign(dp, payload);
    await this.dpRepo.save(dp);
    return { flag: true, ms: 'อัปเดตสำเร็จ' };
  }

  async executeDisposal(dpId: number, upBy: number) {
    const dp = await this.dpRepo.findOne({ where: { dpId, del: 0 } });
    if (!dp) throw new NotFoundException('ไม่พบรายการ');
    if (dp.dpStatus === 2) throw new BadRequestException('ดำเนินการแล้ว');
    if (dp.dpStatus !== 1) throw new BadRequestException('ต้องอนุมัติก่อน');
    if (!dp.suppId) throw new BadRequestException('ไม่มีพัสดุ');
    const last = await this.txRepo
      .createQueryBuilder('t')
      .where('t.supp_id = :suppId', { suppId: dp.suppId })
      .andWhere('t.del = 0')
      .orderBy('t.trans_id', 'DESC')
      .getOne();
    const prevBal = last ? Number(last.transBalance || 0) : 0;
    const outQty = Number(dp.qty || 0);
    if (prevBal < outQty)
      throw new BadRequestException(`สต็อกไม่พอ (คงเหลือ ${prevBal})`);
    const tx = this.txRepo.create({
      suppId: dp.suppId,
      transIn: 0,
      transOut: outQty,
      transBalance: prevBal - outQty,
      transComment: `จำหน่าย #${dp.dpId}`,
      upBy,
    });
    await this.txRepo.save(tx);
    dp.dpStatus = 2;
    dp.upBy = upBy || dp.upBy;
    await this.dpRepo.save(dp);
    return { flag: true, ms: 'ดำเนินการจำหน่ายสำเร็จ' };
  }

  async removeDisposal(dpId: number, upBy: number) {
    const dp = await this.dpRepo.findOne({ where: { dpId, del: 0 } });
    if (!dp) throw new NotFoundException('ไม่พบรายการ');
    if (dp.dpStatus === 2)
      throw new BadRequestException('ดำเนินการแล้ว ลบไม่ได้');
    dp.del = 1;
    dp.upBy = upBy || dp.upBy;
    await this.dpRepo.save(dp);
    return { flag: true, ms: 'ลบสำเร็จ' };
  }

  // ========== Warranty Alerts ==========
  async getExpiringWarranty(scId: number, daysAhead: number = 90) {
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const limit = new Date(today.getTime() + daysAhead * 86400000);
    const limitStr = limit.toISOString().substring(0, 10);

    const contracts = await this.ctRepo
      .createQueryBuilder('c')
      .where('c.del = 0 AND c.sc_id = :scId', { scId })
      .andWhere('c.warranty_end_date IS NOT NULL')
      .andWhere('c.warranty_end_date >= :today', { today: todayStr })
      .andWhere('c.warranty_end_date <= :limit', { limit: limitStr })
      .orderBy('c.warranty_end_date', 'ASC')
      .getMany();

    return contracts.map((c) => ({
      type: 'contract',
      id: c.ctId,
      label: c.ctNo ?? `#${c.ctId}`,
      amount: Number(c.ctTotal),
      warranty_start_date: c.warrantyStartDate,
      warranty_end_date: c.warrantyEndDate,
      days_remaining: Math.ceil(
        (new Date(c.warrantyEndDate!.toString()).getTime() - today.getTime()) /
          86400000,
      ),
    }));
  }
}
