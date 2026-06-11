import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SupContract } from './entities/sup-contract.entity';
import { SupInspection } from './entities/sup-inspection.entity';
import { SupAnnualCheck } from './entities/sup-annual-check.entity';
import { SupDisposal } from './entities/sup-disposal.entity';
import { TransactionSupplies } from './entities/transaction-supplies.entity';
import { ReceiveParcelOrder } from './entities/receive-parcel-order.entity';
import { ReceiveParcelDetail } from './entities/receive-parcel-detail.entity';
import { ParcelDetail } from '../project-approve/entities/parcel-detail.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';
import { CrossDomainGuardService } from '../cross-domain-guard/cross-domain-guard.service';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Injectable()
export class SupplieExtService {
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
    @InjectRepository(ReceiveParcelOrder)
    private readonly rpoRepo: Repository<ReceiveParcelOrder>,
    @InjectRepository(ReceiveParcelDetail)
    private readonly rpdRepo: Repository<ReceiveParcelDetail>,
    private readonly dataSource: DataSource,
    private readonly regulatoryConfig: RegulatoryConfigService,
    private readonly crossDomainGuard: CrossDomainGuardService,
  ) {}

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

  /** ใบขอจัดซื้อ/จ้างที่พร้อมทำสัญญา (order_status 6=ตั้งกรรมการ, 7=จัดซื้อ) + ชื่อร้านค้า */
  async loadOrdersReadyForContract(scId: number) {
    const data = await this.poRepo
      .createQueryBuilder('po')
      .leftJoin('tb_partner', 'p', 'p.p_id = po.p_id AND p.del = 0')
      .where('po.del = 0')
      .andWhere('po.sc_id = :scId', { scId })
      .andWhere('po.order_status BETWEEN 6 AND 7')
      .orderBy('po.order_id', 'DESC')
      .select('po.order_id', 'order_id')
      .addSelect('po.project_type', 'project_type')
      .addSelect('po.details', 'details')
      .addSelect('po.budgets', 'budgets')
      .addSelect('po.p_id', 'p_id')
      .addSelect('po.acad_year', 'acad_year')
      .addSelect('po.order_status', 'order_status')
      .addSelect('p.p_name', 'p_name')
      .getRawMany();
    return { data, count: data.length };
  }

  /** ปีงบประมาณ พ.ศ. — จาก budget_year, ct_date, หรือปีปัจจุบัน */
  private beYearFrom(body: any): number {
    if (Number(body.budget_year) > 0) return Number(body.budget_year);
    if (body.ct_date) return new Date(body.ct_date).getFullYear() + 543;
    return new Date().getFullYear() + 543;
  }

  /** เลขที่สัญญาถัดไป <ลำดับ>/<ปีงบประมาณ พ.ศ.> (นับต่อจากเลขสูงสุดในปีนั้นของโรงเรียน) */
  private async computeNextNo(scId: number, year: number): Promise<string> {
    const rows = await this.ctRepo.find({ where: { scId, del: 0 } });
    const re = new RegExp(`^(\\d+)\\/${year}$`);
    let max = 0;
    for (const c of rows) {
      const m = (c.ctNo || '').match(re);
      if (m && Number(m[1]) > max) max = Number(m[1]);
    }
    return `${max + 1}/${year}`;
  }

  async getNextContractNo(scId: number, year: number) {
    const y = year > 0 ? year : new Date().getFullYear() + 543;
    return { next_no: await this.computeNextNo(scId, y) };
  }

  async saveContract(body: any, user?: JwtUser) {
    // G2: มูลค่าสัญญาต้องไม่เกินวงเงินคำสั่งซื้อที่อนุมัติจัดหา (hard-block, ปิดได้)
    await this.crossDomainGuard.assertContractWithinOrder({
      scId: Number(body.sc_id ?? 0),
      orderId: body.order_id ?? null,
      contractTotal: Number(body.ct_total ?? 0),
    });

    const isNew = !body.ct_id;
    // เลขที่สัญญา: ใช้ที่กรอกมา หรือสร้างอัตโนมัติเมื่อเป็นรายการใหม่และเว้นว่าง
    let ctNo: string | null = body.ct_no || null;
    if (isNew && !ctNo) {
      ctNo = await this.computeNextNo(body.sc_id, this.beYearFrom(body));
    }
    const payload = {
      orderId: body.order_id ?? null,
      scId: body.sc_id ?? null,
      ctNo,
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
    if (user && ct.scId != null) assertSameSchool(user, ct.scId);
    Object.assign(ct, payload);
    await this.ctRepo.save(ct);
    return { flag: true, ms: 'อัปเดตสัญญาสำเร็จ' };
  }

  async removeContract(ctId: number, upBy: number, user?: JwtUser) {
    const ct = await this.ctRepo.findOne({ where: { ctId, del: 0 } });
    if (!ct) throw new NotFoundException('ไม่พบสัญญา');
    if (user && ct.scId != null) assertSameSchool(user, ct.scId);
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

  async saveInspection(body: any, user?: JwtUser) {
    const isNew = !body.insp_id;
    const scId = body.sc_id ?? 0;

    // ดึงคำสั่งซื้อครั้งเดียว (ใช้ทั้งตรวจ committee + หาปีงบสำหรับเลขรายงาน)
    const po = body.order_id
      ? await this.poRepo.findOne({
          where: { orderId: body.order_id, del: 0 },
        })
      : null;

    // เลขที่รายงานตรวจรับอัตโนมัติ "บ.N/2569" — N = ลำดับถัดไปต่อโรงเรียนต่อปีงบ
    // (ปีงบจาก parcel_order.acad_year; fallback = ปีของวันที่ตรวจรับแปลงเป็น พ.ศ.)
    const genReportNo = async (): Promise<string | null> => {
      const year =
        po?.acadYear ??
        (body.insp_date ? new Date(body.insp_date).getFullYear() + 543 : null);
      if (!year) return null;
      const used = await this.inspRepo
        .createQueryBuilder('i')
        .where('i.del = 0')
        .andWhere('i.sc_id = :scId', { scId })
        .andWhere('i.report_no LIKE :suffix', { suffix: `บ.%/${year}` })
        .getCount();
      return `บ.${used + 1}/${year}`;
    };

    const payload = {
      orderId: body.order_id ?? null,
      ctId: body.ct_id ?? null,
      scId: body.sc_id ?? null,
      inspDate: body.insp_date ? new Date(body.insp_date) : null,
      inspResult: body.insp_result ?? 1,
      inspNote: body.insp_note ?? null,
      committee1: body.committee1 ? String(body.committee1) : null,
      committee2: body.committee2 ? String(body.committee2) : null,
      committee3: body.committee3 ? String(body.committee3) : null,
      reportNo: body.report_no ? String(body.report_no) : null,
      reportDate: body.report_date ? new Date(body.report_date) : null,
      upBy: body.up_by ?? 0,
    };

    // M9: ตรวจ committee — ระเบียบฯ 2560 ข้อ 25–26
    // วงเงินเกินเกณฑ์ผู้ตรวจรับคนเดียว (default 100,000) ต้องมีคณะกรรมการตรวจรับ 3 คน
    if (po && body.insp_result === 1) {
      const inspectorSingleMax = await this.regulatoryConfig.getThreshold(
        po.scId ?? body.sc_id ?? 0,
        'procurement.inspector_single_max',
      );
      if (Number(po.budgets || 0) > inspectorSingleMax) {
        if (!body.committee1 || !body.committee2 || !body.committee3) {
          throw new BadRequestException(
            `ยอดจัดซื้อ ${Number(po.budgets || 0).toLocaleString('th-TH')} บาท เกิน ${inspectorSingleMax.toLocaleString('th-TH')} บาท ต้องระบุคณะกรรมการตรวจรับ 3 คน`,
          );
        }
      }
    }

    if (isNew) {
      const row = this.inspRepo.create(payload);
      if (!row.reportNo) row.reportNo = await genReportNo();
      await this.inspRepo.save(row);
      if (row.inspResult === 1) await this.postInspectionToStock(row);
      return { flag: true, ms: 'บันทึกการตรวจรับสำเร็จ', insp_id: row.inspId };
    }
    const insp = await this.inspRepo.findOne({
      where: { inspId: body.insp_id, del: 0 },
    });
    if (!insp) throw new NotFoundException('ไม่พบการตรวจรับ');
    if (user && insp.scId != null) assertSameSchool(user, insp.scId);
    if (insp.stockPosted === 1)
      throw new BadRequestException('ลงสต็อกแล้ว แก้ไขไม่ได้');
    const prevReportNo = insp.reportNo; // กันเลขเดิมถูกทับเมื่อไม่ได้กรอกมาใหม่
    Object.assign(insp, payload);
    if (!insp.reportNo) insp.reportNo = prevReportNo ?? (await genReportNo());
    await this.inspRepo.save(insp);
    if (insp.inspResult === 1) await this.postInspectionToStock(insp);
    return { flag: true, ms: 'อัปเดตการตรวจรับสำเร็จ' };
  }

  private async postInspectionToStock(insp: SupInspection) {
    if (insp.stockPosted === 1 || !insp.orderId) return;

    // M3: wrap ใน transaction เพื่อรับประกัน atomic (ป้องกัน half-posted)
    await this.dataSource.transaction(async (manager) => {
      // ลงสต็อกตาม "จำนวนที่รับจริง" (receive_parcel_detail.rp_total)
      // กรณีรับไม่ครบ/บางส่วน สต็อกจะตรงของจริง ไม่ใช่จำนวนสั่งซื้อเต็ม (pc_total)
      const receive = await manager.findOne(ReceiveParcelOrder, {
        where: { orderId: insp.orderId!, del: 0 },
        order: { receiveId: 'DESC' },
      });

      // qtyBySupp = แผนผัง supp_id → จำนวนที่รับจริง
      const qtyBySupp = new Map<number, number>();
      if (receive) {
        const rDetails = await manager.find(ReceiveParcelDetail, {
          where: { receiveId: receive.receiveId, del: 0 },
        });
        for (const rd of rDetails) {
          if (!rd.suppId) continue;
          qtyBySupp.set(
            rd.suppId,
            (qtyBySupp.get(rd.suppId) ?? 0) + Number(rd.rpTotal || 0),
          );
        }
      }

      // Fallback: ถ้าไม่มีบันทึกรับพัสดุ ใช้จำนวนสั่งซื้อเต็มจาก parcel_detail (พฤติกรรมเดิม)
      if (qtyBySupp.size === 0) {
        const details = await manager.find(ParcelDetail, {
          where: { orderId: insp.orderId!, del: 0 },
        });
        for (const d of details) {
          if (!d.suppId) continue;
          qtyBySupp.set(
            d.suppId,
            (qtyBySupp.get(d.suppId) ?? 0) + Number(d.pcTotal || 0),
          );
        }
      }

      for (const [suppId, inQty] of qtyBySupp) {
        if (inQty <= 0) continue;
        const last = await manager
          .createQueryBuilder(TransactionSupplies, 't')
          .where('t.supp_id = :suppId', { suppId })
          .andWhere('t.del = 0')
          .orderBy('t.trans_id', 'DESC')
          .getOne();
        const prevBal = last ? Number(last.transBalance || 0) : 0;
        const tx = manager.create(TransactionSupplies, {
          suppId,
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

      // ปิดงานคำสั่งซื้อ + ซิงค์สถานะรับพัสดุให้ตรงกัน (receive_status=1 ตรวจรับแล้ว)
      const po = await manager.findOne(ParcelOrder, {
        where: { orderId: insp.orderId!, del: 0 },
      });
      if (po) {
        po.orderStatus = 8;
        await manager.save(ParcelOrder, po);
      }
      if (receive) {
        receive.receiveStatus = 1;
        await manager.save(ReceiveParcelOrder, receive);
      }
    });
  }

  async removeInspection(inspId: number, upBy: number, user?: JwtUser) {
    const insp = await this.inspRepo.findOne({ where: { inspId, del: 0 } });
    if (!insp) throw new NotFoundException('ไม่พบการตรวจรับ');
    if (user && insp.scId != null) assertSameSchool(user, insp.scId);
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

  async saveAnnualCheck(body: any, user?: JwtUser) {
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
    if (user && ac.scId != null) assertSameSchool(user, ac.scId);
    Object.assign(ac, payload);
    await this.acRepo.save(ac);
    return { flag: true, ms: 'อัปเดตสำเร็จ' };
  }

  async removeAnnualCheck(acId: number, upBy: number, user?: JwtUser) {
    const ac = await this.acRepo.findOne({ where: { acId, del: 0 } });
    if (!ac) throw new NotFoundException('ไม่พบรายการ');
    if (user && ac.scId != null) assertSameSchool(user, ac.scId);
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

  async saveDisposal(body: any, user?: JwtUser) {
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
    if (user && dp.scId != null) assertSameSchool(user, dp.scId);
    if (dp.dpStatus === 2)
      throw new BadRequestException('ดำเนินการแล้ว แก้ไขไม่ได้');
    Object.assign(dp, payload);
    await this.dpRepo.save(dp);
    return { flag: true, ms: 'อัปเดตสำเร็จ' };
  }

  async executeDisposal(dpId: number, upBy: number, user?: JwtUser) {
    const dp = await this.dpRepo.findOne({ where: { dpId, del: 0 } });
    if (!dp) throw new NotFoundException('ไม่พบรายการ');
    if (user && dp.scId != null) assertSameSchool(user, dp.scId);
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

  async removeDisposal(dpId: number, upBy: number, user?: JwtUser) {
    const dp = await this.dpRepo.findOne({ where: { dpId, del: 0 } });
    if (!dp) throw new NotFoundException('ไม่พบรายการ');
    if (user && dp.scId != null) assertSameSchool(user, dp.scId);
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
