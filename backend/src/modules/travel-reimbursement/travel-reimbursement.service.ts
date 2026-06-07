import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TravelReimbursement } from './entities/travel-reimbursement.entity';
import { TravelReimbursementTraveler } from './entities/travel-reimbursement-traveler.entity';
import { AddTravelReimbursementDto } from './dto/add-travel-reimbursement.dto';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';
import { LoanReturnEvidence } from '../loan-agreement/entities/loan-return-evidence.entity';
import { DocCounterService } from '../doc-counter/doc-counter.service';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';

const STATUS = {
  PENDING_VERIFY: 10, // รอตรวจสอบ (เจ้าหน้าที่การเงิน)
  PENDING_APPROVE: 11, // รออนุมัติ (ผอ.)
  PENDING_PAY: 12, // รอจ่ายเงิน
  PAID: 2, // จ่ายแล้ว
  CANCELLED: 3,
} as const;

const STATUS_NAMES: Record<number, string> = {
  10: 'รอตรวจสอบ',
  11: 'รออนุมัติ',
  12: 'รอจ่ายเงิน',
  2: 'จ่ายแล้ว',
  3: 'ยกเลิก',
};

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class TravelReimbursementService {
  constructor(
    @InjectRepository(TravelReimbursement)
    private readonly trRepo: Repository<TravelReimbursement>,
    @InjectRepository(TravelReimbursementTraveler)
    private readonly trtRepo: Repository<TravelReimbursementTraveler>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetTypeRepo: Repository<BudgetIncomeType>,
    @InjectRepository(LoanAgreement)
    private readonly laRepo: Repository<LoanAgreement>,
    private readonly docCounter: DocCounterService,
    private readonly dataSource: DataSource,
    private readonly fundBalance: FundBalanceService,
    private readonly regulatoryConfig: RegulatoryConfigService,
  ) {}

  private async adminName(adminId?: number | null): Promise<string | null> {
    if (!adminId) return null;
    const a = await this.adminRepo.findOne({ where: { adminId } });
    return a ? (a.name ?? a.username ?? null) : null;
  }

  async loadList(scId: number, syId: number, budgetYear: string) {
    const rows = await this.trRepo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { trId: 'DESC' },
    });
    // map la_no สำหรับรายการที่เชื่อมเงินยืม
    const laIds = rows.map((r) => r.laId).filter((x): x is number => !!x);
    const loans = laIds.length
      ? await this.laRepo.find({ where: laIds.map((id) => ({ laId: id })) })
      : [];
    const laNoById = new Map(loans.map((l) => [l.laId, l.laNo]));

    return {
      data: rows.map((t) => ({
        tr_id: t.trId,
        requester_id: t.requesterId,
        requester_name: t.requesterName,
        requester_position: t.requesterPosition,
        affiliation: t.affiliation,
        province: t.province,
        at_office: t.atOffice,
        order_ref: t.orderRef,
        order_date: t.orderDate,
        purpose: t.purpose,
        companions: t.companions,
        depart_from: t.departFrom,
        depart_date: t.departDate,
        depart_time: t.departTime,
        return_date: t.returnDate,
        return_time: t.returnTime,
        total_days: t.totalDays,
        total_hours: t.totalHours,
        money_type_id: t.moneyTypeId,
        money_type_name: t.moneyTypeName,
        la_id: t.laId,
        la_no: t.laId ? (laNoById.get(t.laId) ?? null) : null,
        allowance_total: t.allowanceTotal,
        lodging_total: t.lodgingTotal,
        transport_total: t.transportTotal,
        other_total: t.otherTotal,
        grand_total: t.grandTotal,
        evidence_count: t.evidenceCount,
        verify_name: t.verifyName,
        verify_date: t.verifyDate,
        approve_name: t.approveName,
        approve_date: t.approveDate,
        receipt_date: t.receiptDate,
        type_offer_check: t.typeOfferCheck,
        bc_no: t.bcNo,
        status: t.status,
        status_name: STATUS_NAMES[t.status] ?? '',
        note: t.note,
        create_date: t.createDate,
      })),
      count: rows.length,
    };
  }

  async loadTravelers(trId: number) {
    const rows = await this.trtRepo.find({
      where: { trId, del: 0 },
      order: { seq: 'ASC' },
    });
    return rows.map((t) => ({
      trt_id: t.trtId,
      tr_id: t.trId,
      seq: t.seq,
      name: t.name,
      position: t.position,
      allowance: t.allowance,
      lodging: t.lodging,
      transport: t.transport,
      other: t.other,
      total: t.total,
      note: t.note,
    }));
  }

  async addTravelReimbursement(dto: AddTravelReimbursementDto) {
    // snapshot ผู้ขอเบิก
    let requesterName: string | null = null;
    let requesterPosition: string | null = dto.requester_position ?? null;
    const admin = await this.adminRepo.findOne({
      where: { adminId: dto.requester_id },
    });
    if (admin) {
      requesterName = admin.name ?? admin.username ?? null;
      if (!requesterPosition)
        requesterPosition = admin.position != null ? String(admin.position) : null;
    }

    let moneyTypeName: string | null = null;
    const bt = await this.budgetTypeRepo.findOne({
      where: { bgTypeId: dto.money_type_id },
    });
    if (bt) moneyTypeName = bt.budgetType;

    // travelers — ถ้าไม่ส่งมา ใช้ผู้ขอเบิกเป็นผู้เดินทางคนเดียว
    const travelersInput =
      dto.travelers && dto.travelers.length > 0
        ? dto.travelers
        : [{ name: requesterName ?? '', position: requesterPosition ?? '' }];

    const norm = travelersInput.map((t, i) => {
      const allowance = Number(t.allowance ?? 0);
      const lodging = Number(t.lodging ?? 0);
      const transport = Number(t.transport ?? 0);
      const other = Number(t.other ?? 0);
      return {
        seq: i + 1,
        name: t.name ?? null,
        position: t.position ?? null,
        allowance,
        lodging,
        transport,
        other,
        total: r2(allowance + lodging + transport + other),
        note: t.note ?? null,
      };
    });

    const allowanceTotal = r2(norm.reduce((s, t) => s + t.allowance, 0));
    const lodgingTotal = r2(norm.reduce((s, t) => s + t.lodging, 0));
    const transportTotal = r2(norm.reduce((s, t) => s + t.transport, 0));
    const otherTotal = r2(norm.reduce((s, t) => s + t.other, 0));
    const grandTotal = r2(allowanceTotal + lodgingTotal + transportTotal + otherTotal);

    if (grandTotal <= 0) {
      return { flag: false, ms: 'กรุณาระบุค่าใช้จ่ายอย่างน้อย 1 รายการ' };
    }

    return this.dataSource.transaction(async (em) => {
      const trR = em.getRepository(TravelReimbursement);
      const trtR = em.getRepository(TravelReimbursementTraveler);

      const tr = await trR.save(
        trR.create({
          scId: dto.sc_id,
          syId: dto.sy_id,
          budgetYear: dto.budget_year,
          requesterId: dto.requester_id,
          requesterName,
          requesterPosition,
          affiliation: dto.affiliation ?? null,
          province: dto.province ?? null,
          atOffice: dto.at_office ?? null,
          orderRef: dto.order_ref ?? null,
          orderDate: dto.order_date ?? null,
          purpose: dto.purpose ?? null,
          companions: dto.companions ?? null,
          departFrom: dto.depart_from ?? 2,
          departDate: dto.depart_date ?? null,
          departTime: dto.depart_time ?? null,
          returnDate: dto.return_date ?? null,
          returnTime: dto.return_time ?? null,
          totalDays: Number(dto.total_days ?? 0),
          totalHours: Number(dto.total_hours ?? 0),
          moneyTypeId: dto.money_type_id,
          moneyTypeName,
          laId: dto.la_id ?? null,
          allowanceTotal,
          lodgingTotal,
          transportTotal,
          otherTotal,
          grandTotal,
          evidenceCount: Number(dto.evidence_count ?? 0),
          status: STATUS.PENDING_VERIFY,
          note: dto.note ?? null,
          upBy: dto.up_by ?? 0,
          del: 0,
        }),
      );

      for (const t of norm) {
        await trtR.save(trtR.create({ ...t, trId: tr.trId, del: 0 }));
      }

      return {
        flag: true,
        ms: 'ยื่นขอเบิกค่าเดินทางเรียบร้อยแล้ว (รอตรวจสอบ)',
      };
    });
  }

  async verify(dto: {
    tr_id: number;
    verify_by: number;
    verify_name?: string;
    verify_date: string;
    up_by?: number;
  }) {
    const tr = await this.trRepo.findOne({ where: { trId: dto.tr_id, del: 0 } });
    if (!tr) return { flag: false, ms: 'ไม่พบใบขอเบิกค่าเดินทาง' };
    if (tr.status !== STATUS.PENDING_VERIFY)
      return {
        flag: false,
        ms: `ตรวจสอบไม่ได้ — อยู่ในสถานะ "${STATUS_NAMES[tr.status] ?? ''}"`,
      };
    tr.verifyBy = dto.verify_by;
    tr.verifyName = dto.verify_name ?? (await this.adminName(dto.verify_by));
    tr.verifyDate = dto.verify_date;
    tr.status = STATUS.PENDING_APPROVE;
    tr.upBy = dto.up_by ?? dto.verify_by;
    await this.trRepo.save(tr);
    return { flag: true, ms: 'ตรวจสอบเรียบร้อยแล้ว (รออนุมัติ)' };
  }

  async approve(dto: {
    tr_id: number;
    approve_by: number;
    approve_name?: string;
    approve_date: string;
    up_by?: number;
  }) {
    const tr = await this.trRepo.findOne({ where: { trId: dto.tr_id, del: 0 } });
    if (!tr) return { flag: false, ms: 'ไม่พบใบขอเบิกค่าเดินทาง' };
    if (tr.status !== STATUS.PENDING_APPROVE)
      return {
        flag: false,
        ms: `อนุมัติไม่ได้ — อยู่ในสถานะ "${STATUS_NAMES[tr.status] ?? ''}" (ต้องตรวจสอบก่อน)`,
      };
    tr.approveBy = dto.approve_by;
    tr.approveName = dto.approve_name ?? (await this.adminName(dto.approve_by));
    tr.approveDate = dto.approve_date;
    tr.status = STATUS.PENDING_PAY;
    tr.upBy = dto.up_by ?? dto.approve_by;
    await this.trRepo.save(tr);
    return { flag: true, ms: 'อนุมัติเรียบร้อยแล้ว (รอจ่ายเงิน)' };
  }

  /**
   * จ่ายเงิน — เจ้าหน้าที่การเงินจ่ายเช็ค/เงินสด ลงเป็นใบสำคัญจ่าย บค./บจ.
   *  - กรณีเชื่อมเงินยืม (la_id): ส่งใช้เงินยืม (เงินออกไปแล้วตอนยืม)
   *      จ่ายจริง ≤ ยืม → ส่งใช้ + คืนเงินสดส่วนเกิน (FT +1)
   *      จ่ายจริง > ยืม → ปิดเงินยืม + เบิกเพิ่มส่วนต่าง (FT -1, บค.)
   *  - กรณีไม่เชื่อมเงินยืม: จ่ายเต็มจำนวนเป็น บค. (FT -1)
   */
  async disburse(dto: {
    tr_id: number;
    receipt_date: string;
    type_offer_check?: number; // 1=เงินสด(บค.) 2=เช็ค(บจ.)
    up_by?: number;
  }) {
    const tr = await this.trRepo.findOne({ where: { trId: dto.tr_id, del: 0 } });
    if (!tr) return { flag: false, ms: 'ไม่พบใบขอเบิกค่าเดินทาง' };
    if (tr.status !== STATUS.PENDING_PAY)
      return {
        flag: false,
        ms: `จ่ายเงินไม่ได้ — อยู่ในสถานะ "${STATUS_NAMES[tr.status] ?? ''}" (ต้องอนุมัติก่อน)`,
      };

    const channel = dto.type_offer_check === 2 ? 2 : 1; // default เงินสด (บค.)
    const upBy = dto.up_by ?? 0;
    const grand = Number(tr.grandTotal);
    const payDate = dto.receipt_date;

    const blockOverspend = await this.regulatoryConfig.getThreshold(
      tr.scId,
      'finance.block_overspend',
    );
    const blockCashNeg = await this.regulatoryConfig.getThreshold(
      tr.scId,
      'finance.block_cash_negative',
    );

    return this.dataSource.transaction(async (em) => {
      const ftRepo = em.getRepository(FinancialTransactions);
      const trR = em.getRepository(TravelReimbursement);
      const laR = em.getRepository(LoanAgreement);
      const lreR = em.getRepository(LoanReturnEvidence);

      // เตรียมตัวเลขก่อน (ยังไม่เขียน) เพื่อตรวจยอดเงินก่อนออกเลขเอกสาร
      let payAmount = grand; // จำนวนเงินที่จะจ่ายออกใหม่ (FT -1)
      let cashReturn = 0; // เงินสดคืนเข้าประเภทเงิน (FT +1) กรณีเงินยืม
      let loan: LoanAgreement | null = null;

      if (tr.laId) {
        loan = await laR.findOne({ where: { laId: tr.laId, del: 0 } });
        if (!loan) return { flag: false, ms: 'ไม่พบสัญญาเงินยืมที่เชื่อม' };
        if (loan.status !== 1)
          return {
            flag: false,
            ms: `ส่งใช้ไม่ได้ — เงินยืม ${loan.laNo} ไม่อยู่สถานะค้างชำระ`,
          };
        const loanAmt = Number(loan.amount);
        if (grand <= loanAmt) {
          cashReturn = r2(loanAmt - grand);
          payAmount = 0; // เงินออกไปแล้วตอนยืม ไม่จ่ายใหม่
        } else {
          cashReturn = 0;
          payAmount = r2(grand - loanAmt); // เบิกเพิ่มส่วนต่าง
        }
      }

      // ── ตรวจยอดเงินก่อนจ่าย (เฉพาะเงินที่จะจ่ายออกใหม่) ───────────────────
      if (payAmount > 0) {
        if (blockOverspend >= 1) {
          const avail = await this.fundBalance.availableInTx(
            em,
            tr.scId,
            tr.syId,
            tr.moneyTypeId,
          );
          if (payAmount - avail > 0.005)
            return {
              flag: false,
              ms: `จ่ายไม่ได้ — ยอดคงเหลือประเภทเงินนี้ ${avail.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ไม่พอจ่าย ${payAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
            };
        }
        if (channel === 1 && blockCashNeg >= 1) {
          const cash = await this.fundBalance.availableCashInTx(
            em,
            tr.scId,
            tr.syId,
            tr.moneyTypeId,
          );
          if (payAmount - cash > 0.005)
            return {
              flag: false,
              ms: `จ่ายเงินสดไม่ได้ — เงินสดคงเหลือของประเภทเงินนี้ ${cash.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ไม่พอจ่าย ${payAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (เงินสดห้ามติดลบ)`,
            };
        }
      }

      // ── ออกเลขที่ใบสำคัญจ่าย บค.(เงินสด)/บจ.(เช็ค) ────────────────────────
      const voucherType = channel === 1 ? 'BC' : 'BJ';
      const issued = await this.docCounter.issueWithin(
        em,
        tr.scId,
        String(tr.budgetYear ?? ''),
        voucherType,
      );
      const bcNo = issued.formatted;

      let ftPayId: number | null = null;
      let ftReturnId: number | null = null;

      // จ่ายเงินออกใหม่ (FT -1)
      if (payAmount > 0) {
        const ftPay = await ftRepo.save(
          ftRepo.create({
            type: -1,
            bgTypeId: tr.moneyTypeId,
            amount: payAmount,
            scId: tr.scId,
            syId: tr.syId,
            budgetYear: Number(tr.budgetYear) || null,
            moneyChannel: channel,
            upBy,
            del: 0,
            createDate: payDate ? new Date(payDate) : new Date(),
          }),
        );
        ftPayId = ftPay.ftId;
      }

      // กรณีเชื่อมเงินยืม → ส่งใช้/ปิดเงินยืม
      if (loan) {
        const loanAmt = Number(loan.amount);
        const voucherAmt = grand <= loanAmt ? grand : loanAmt;
        if (cashReturn > 0) {
          const ftRet = await ftRepo.save(
            ftRepo.create({
              type: 1,
              bgTypeId: loan.moneyTypeId,
              amount: cashReturn,
              scId: loan.scId,
              syId: loan.syId,
              moneyChannel: 2,
              upBy,
              del: 0,
              createDate: payDate ? new Date(payDate) : new Date(),
            }),
          );
          ftReturnId = ftRet.ftId;
        }
        loan.returnedDate = payDate;
        loan.returnCash = cashReturn;
        loan.returnVoucherAmount = voucherAmt;
        loan.status = 2; // คืนแล้ว
        loan.ftReturnId = ftReturnId;
        loan.upBy = upBy;
        await laR.save(loan);
        await lreR.save(
          lreR.create({
            laId: loan.laId,
            evidenceNo: bcNo,
            evidenceDate: payDate,
            cashAmount: cashReturn,
            voucherAmount: voucherAmt,
            note: `ส่งใช้ด้วยใบเบิกค่าเดินทาง ${bcNo}`,
            upBy,
            del: 0,
          }),
        );
      }

      tr.receiptDate = payDate;
      tr.typeOfferCheck = channel;
      tr.bcNo = bcNo;
      tr.ftPayId = ftPayId;
      tr.ftReturnId = ftReturnId;
      tr.status = STATUS.PAID;
      tr.upBy = upBy;
      await trR.save(tr);

      return {
        flag: true,
        ms: `จ่ายค่าเดินทาง เลขที่ ${bcNo} เรียบร้อยแล้ว`,
      };
    });
  }

  async cancel(trId: number, note: string, upBy: number) {
    const tr = await this.trRepo.findOne({ where: { trId, del: 0 } });
    if (!tr) return { flag: false, ms: 'ไม่พบใบขอเบิกค่าเดินทาง' };
    if (tr.status === STATUS.PAID)
      return { flag: false, ms: 'ไม่สามารถยกเลิกใบที่จ่ายเงินแล้ว' };
    if (tr.status === STATUS.CANCELLED)
      return { flag: false, ms: 'ใบนี้ถูกยกเลิกแล้ว' };
    tr.status = STATUS.CANCELLED;
    tr.note = note || tr.note;
    tr.upBy = upBy;
    await this.trRepo.save(tr);
    return { flag: true, ms: 'ยกเลิกใบขอเบิกค่าเดินทางเรียบร้อยแล้ว' };
  }
}
