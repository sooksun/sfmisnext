import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplieRequest } from './entities/supplie-request.entity';
import { SupplieRequestDetail } from './entities/supplie-request-detail.entity';
import { TransactionSupplies } from '../supplie/entities/transaction-supplies.entity';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

const STATUS_NAMES: Record<number, string> = {
  0: 'ร่าง',
  1: 'ส่งคำขอ',
  2: 'อนุมัติ',
  3: 'เบิกจ่ายแล้ว',
  9: 'ยกเลิก',
};

function toNum(v: any): number {
  return v == null ? 0 : Number(v);
}

@Injectable()
export class SupplieRequestService {
  constructor(
    @InjectRepository(SupplieRequest)
    private readonly reqRepo: Repository<SupplieRequest>,
    @InjectRepository(SupplieRequestDetail)
    private readonly detRepo: Repository<SupplieRequestDetail>,
    @InjectRepository(TransactionSupplies)
    private readonly txRepo: Repository<TransactionSupplies>,
  ) {}

  async load(scId: number, page: number, pageSize: number) {
    const safePage = page > 0 ? page : 1;
    const [items, count] = await this.reqRepo.findAndCount({
      where: { scId, del: 0 },
      order: { reqId: 'DESC' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });
    return {
      data: items.map((r) => ({
        req_id: r.reqId,
        req_no: r.reqNo,
        req_date: r.reqDate,
        requester_id: r.requesterId,
        requester_name: r.requesterName,
        department: r.department,
        purpose: r.purpose,
        status: r.status,
        status_name: STATUS_NAMES[r.status] ?? '',
        approved_by: r.approvedBy,
        approved_date: r.approvedDate,
        issued_date: r.issuedDate,
        create_date: r.createDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  async getDetail(reqId: number, user?: JwtUser) {
    const req = await this.reqRepo.findOne({ where: { reqId, del: 0 } });
    if (!req) return null;
    if (user && req.scId != null) assertSameSchool(user, req.scId);
    const details = await this.detRepo.find({ where: { reqId, del: 0 } });
    return {
      req_id: req.reqId,
      req_no: req.reqNo,
      req_date: req.reqDate,
      requester_name: req.requesterName,
      department: req.department,
      purpose: req.purpose,
      status: req.status,
      status_name: STATUS_NAMES[req.status] ?? '',
      approved_by: req.approvedBy,
      approved_date: req.approvedDate,
      issued_date: req.issuedDate,
      reject_reason: req.rejectReason,
      details: details.map((d) => ({
        rqd_id: d.rqdId,
        supp_id: d.suppId,
        req_qty: d.reqQty,
        issued_qty: d.issuedQty,
        note: d.note,
      })),
    };
  }

  async add(body: any) {
    const req = this.reqRepo.create({
      scId: body.sc_id,
      reqNo: body.req_no ?? null,
      reqDate: body.req_date ? new Date(body.req_date) : null,
      requesterId: body.requester_id ?? null,
      requesterName: body.requester_name ?? null,
      department: body.department ?? null,
      purpose: body.purpose ?? null,
      status: 0,
      upBy: body.up_by ?? 0,
      del: 0,
    });
    await this.reqRepo.save(req);

    if (Array.isArray(body.details)) {
      for (const d of body.details) {
        const det = this.detRepo.create({
          reqId: req.reqId,
          suppId: d.supp_id ?? null,
          reqQty: Number(d.req_qty ?? 1),
          issuedQty: 0,
          note: d.note ?? null,
          del: 0,
        });
        await this.detRepo.save(det);
      }
    }
    return { flag: true, ms: 'บันทึกใบเบิกเรียบร้อย', req_id: req.reqId };
  }

  async update(body: any, user?: JwtUser) {
    const req = await this.reqRepo.findOne({
      where: { reqId: body.req_id, del: 0 },
    });
    if (!req) return { flag: false, ms: 'ไม่พบใบเบิก' };
    if (user && req.scId != null) assertSameSchool(user, req.scId);
    if (req.status > 1) return { flag: false, ms: 'อนุมัติแล้ว แก้ไขไม่ได้' };

    req.reqNo = body.req_no ?? req.reqNo;
    req.reqDate = body.req_date ? new Date(body.req_date) : req.reqDate;
    req.requesterName = body.requester_name ?? req.requesterName;
    req.department = body.department ?? req.department;
    req.purpose = body.purpose ?? req.purpose;
    req.upBy = body.up_by ?? req.upBy;
    await this.reqRepo.save(req);

    if (Array.isArray(body.details)) {
      await this.detRepo.update({ reqId: req.reqId }, { del: 1 });
      for (const d of body.details) {
        const det = this.detRepo.create({
          reqId: req.reqId,
          suppId: d.supp_id ?? null,
          reqQty: Number(d.req_qty ?? 1),
          issuedQty: 0,
          note: d.note ?? null,
          del: 0,
        });
        await this.detRepo.save(det);
      }
    }
    return { flag: true, ms: 'อัปเดตใบเบิกสำเร็จ' };
  }

  async submit(reqId: number, upBy: number, user?: JwtUser) {
    const req = await this.reqRepo.findOne({ where: { reqId, del: 0 } });
    if (!req) return { flag: false, ms: 'ไม่พบใบเบิก' };
    if (user && req.scId != null) assertSameSchool(user, req.scId);
    if (req.status !== 0) return { flag: false, ms: 'ส่งแล้วหรืออนุมัติแล้ว' };
    req.status = 1;
    req.upBy = upBy;
    await this.reqRepo.save(req);
    return { flag: true, ms: 'ส่งคำขอเบิกเรียบร้อย' };
  }

  async approve(reqId: number, approvedBy: number, user?: JwtUser) {
    const req = await this.reqRepo.findOne({ where: { reqId, del: 0 } });
    if (!req) return { flag: false, ms: 'ไม่พบใบเบิก' };
    if (user && req.scId != null) assertSameSchool(user, req.scId);
    if (req.status !== 1) return { flag: false, ms: 'สถานะไม่ถูกต้อง' };
    req.status = 2;
    req.approvedBy = approvedBy;
    req.approvedDate = new Date();
    req.upBy = approvedBy;
    await this.reqRepo.save(req);
    return { flag: true, ms: 'อนุมัติใบเบิกเรียบร้อย' };
  }

  async reject(reqId: number, reason: string, upBy: number, user?: JwtUser) {
    const req = await this.reqRepo.findOne({ where: { reqId, del: 0 } });
    if (!req) return { flag: false, ms: 'ไม่พบใบเบิก' };
    if (user && req.scId != null) assertSameSchool(user, req.scId);
    if (req.status !== 1) return { flag: false, ms: 'สถานะไม่ถูกต้อง' };
    req.status = 0;
    req.rejectReason = reason;
    req.upBy = upBy;
    await this.reqRepo.save(req);
    return { flag: true, ms: 'ส่งกลับแก้ไขเรียบร้อย' };
  }

  async issue(
    reqId: number,
    issuedBy: number,
    details: { rqd_id: number; issued_qty: number }[],
    user?: JwtUser,
  ) {
    const req = await this.reqRepo.findOne({ where: { reqId, del: 0 } });
    if (!req) return { flag: false, ms: 'ไม่พบใบเบิก' };
    if (user && req.scId != null) assertSameSchool(user, req.scId);
    if (req.status !== 2) return { flag: false, ms: 'ต้องอนุมัติก่อนจ่าย' };

    for (const d of details) {
      const det = await this.detRepo.findOne({
        where: { rqdId: d.rqd_id, del: 0 },
      });
      if (!det || !det.suppId) continue;

      const last = await this.txRepo
        .createQueryBuilder('t')
        .where('t.supp_id = :suppId', { suppId: det.suppId })
        .andWhere('t.del = 0')
        .orderBy('t.trans_id', 'DESC')
        .getOne();
      const prevBal = toNum(last?.transBalance ?? 0);
      const qty = Math.min(Number(d.issued_qty), prevBal);
      if (qty <= 0) continue;

      const tx = this.txRepo.create({
        suppId: det.suppId,
        transIn: 0,
        transOut: qty,
        transBalance: prevBal - qty,
        transComment: `เบิก ใบเบิก#${reqId}`,
        upBy: issuedBy,
        del: 0,
      });
      await this.txRepo.save(tx);

      det.issuedQty = qty;
      await this.detRepo.save(det);
    }

    req.status = 3;
    req.issuedBy = issuedBy;
    req.issuedDate = new Date();
    req.upBy = issuedBy;
    await this.reqRepo.save(req);
    return { flag: true, ms: 'บันทึกการจ่ายพัสดุเรียบร้อย' };
  }

  async cancel(reqId: number, upBy: number, user?: JwtUser) {
    const req = await this.reqRepo.findOne({ where: { reqId, del: 0 } });
    if (!req) return { flag: false, ms: 'ไม่พบใบเบิก' };
    if (user && req.scId != null) assertSameSchool(user, req.scId);
    if (req.status === 3)
      return { flag: false, ms: 'เบิกจ่ายแล้ว ยกเลิกไม่ได้' };
    req.status = 9;
    req.upBy = upBy;
    await this.reqRepo.save(req);
    return { flag: true, ms: 'ยกเลิกใบเบิกเรียบร้อย' };
  }
}
