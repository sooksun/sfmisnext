import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThan } from 'typeorm';
import { RequestWithdraw } from './entities/request-withdraw.entity';
import { AddInvoiceDto } from './dto/add-invoice.dto';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialAuditService } from '../financial-audit/financial-audit.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
    @InjectRepository(ParcelOrder)
    private readonly parcelOrderRepository: Repository<ParcelOrder>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
    private readonly financialAuditService: FinancialAuditService,
  ) {}

  /**
   * มูลหนี้จากพัสดุที่ "ตรวจรับแล้ว" และยังไม่ได้ตั้งเบิก — สำหรับ auto-fill หน้าขอเบิก
   *   เงื่อนไข: sup_inspection ผ่าน (insp_result=1 + stock_posted=1) และ
   *   ยังไม่มี request_withdraw อ้าง order_id นั้น (ยังไม่ตั้งเบิก)
   *   คืน ร้านค้า(p_id/ชื่อ) + ยอดตามสัญญา + ประเภทงบ + โครงการ + order_id
   */
  async loadPayableParcels(scId: number) {
    const sql = `
      SELECT
        po.order_id                            AS order_id,
        ct.ct_id                               AS ct_id,
        ct.supplier_id                         AS p_id,
        p.p_name                               AS partner_name,
        COALESCE(ct.ct_total, ct.ct_amount, 0) AS amount,
        po.bg_type_id                          AS bg_type_id,
        bit.budget_type                        AS budget_type_name,
        po.project_id                          AS project_id,
        proj.proj_name                         AS project_name,
        MAX(insp.insp_date)                    AS insp_date
      FROM sup_inspection insp
      JOIN parcel_order po              ON po.order_id = insp.order_id
      LEFT JOIN sup_contract ct         ON ct.order_id = po.order_id AND ct.del = 0
      LEFT JOIN tb_partner p            ON p.p_id = ct.supplier_id
      LEFT JOIN pln_project proj        ON proj.proj_id = po.project_id
      LEFT JOIN master_budget_income_type bit ON bit.bg_type_id = po.bg_type_id
      WHERE po.sc_id = ?
        AND insp.insp_result = 1
        AND insp.stock_posted = 1
        AND insp.del = 0
        AND NOT EXISTS (
          SELECT 1 FROM request_withdraw rw
          WHERE rw.order_id = po.order_id AND rw.del = 0
        )
      GROUP BY po.order_id, ct.ct_id, ct.supplier_id, p.p_name,
               ct.ct_total, ct.ct_amount, po.bg_type_id, bit.budget_type,
               po.project_id, proj.proj_name
      ORDER BY insp_date DESC, po.order_id DESC
    `;
    const rows = (await this.requestWithdrawRepository.manager.query(sql, [
      scId,
    ])) as Record<string, unknown>[];
    return rows.map((r) => ({
      order_id: Number(r.order_id),
      ct_id: r.ct_id == null ? null : Number(r.ct_id),
      p_id: r.p_id == null ? 0 : Number(r.p_id),
      partner_name: (r.partner_name as string) ?? '',
      amount: r.amount == null ? 0 : Number(r.amount),
      bg_type_id: r.bg_type_id == null ? 0 : Number(r.bg_type_id),
      budget_type_name: (r.budget_type_name as string) ?? '',
      project_id: r.project_id == null ? 0 : Number(r.project_id),
      project_name: (r.project_name as string) ?? '',
      insp_date: r.insp_date ?? null,
    }));
  }

  async loadInvoiceOrder(scId: number, yId: number) {
    const rows = await this.requestWithdrawRepository
      .createQueryBuilder('rw')
      .leftJoin('tb_partner', 'p', 'p.p_id = rw.p_id')
      .leftJoin(
        'master_budget_income_type',
        'bit',
        'bit.bg_type_id = rw.bg_type_id',
      )
      .leftJoin('parcel_order', 'po', 'po.order_id = rw.order_id')
      .leftJoin('pln_project', 'proj', 'proj.proj_id = po.project_id')
      .leftJoin('admin', 'adm', 'adm.admin_id = rw.user_request')
      .where('rw.sc_id = :scId', { scId })
      .andWhere('rw.sy_id = :yId', { yId })
      .andWhere('rw.del = 0')
      .select('rw.rw_id', 'rw_id')
      .addSelect('rw.sc_id', 'sc_id')
      .addSelect('rw.no_doc', 'no_doc')
      .addSelect('rw.payment_type', 'payment_type')
      .addSelect('rw.bg_type_id', 'bg_type_id')
      .addSelect('rw.rw_type', 'rw_type')
      .addSelect('rw.order_id', 'order_id')
      .addSelect('rw.p_id', 'p_id')
      .addSelect('rw.detail', 'detail')
      .addSelect('rw.amount', 'amount')
      .addSelect('rw.certificate_payment', 'certificate_payment')
      .addSelect('rw.date_request', 'date_request')
      .addSelect('rw.user_request', 'user_request')
      .addSelect('rw.user_request_head', 'user_request_head')
      .addSelect('rw.user_offer_check', 'user_offer_check')
      .addSelect('rw.receipt_number', 'receipt_number')
      .addSelect('rw.check_no_doc', 'check_no_doc')
      .addSelect('rw.offer_check_date', 'offer_check_date')
      .addSelect('rw.type_offer_check', 'type_offer_check')
      .addSelect('rw.status', 'status')
      .addSelect('rw.remark', 'remark')
      .addSelect('rw.precheck_note', 'precheck_note')
      .addSelect('rw.sy_id', 'sy_id')
      .addSelect('rw.year', 'year')
      .addSelect('rw.up_by', 'up_by')
      .addSelect('rw.del', 'del')
      .addSelect('rw.update_date', 'up_date')
      .addSelect('p.p_name', 'partner_name')
      .addSelect('bit.budget_type', 'budget_type_name')
      .addSelect('proj.proj_name', 'project_name')
      .addSelect('adm.name', 'user_request_name')
      .orderBy('rw.rw_id', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      ...r,
      amount: r.amount == null ? 0 : Number(r.amount),
      partner_name: r.partner_name ?? '',
      budget_type_name: r.budget_type_name ?? '',
      project_name: r.project_name ?? '',
      user_request_name: r.user_request_name ?? '',
    }));
  }

  async loadProjects(scId: number, syId: number) {
    // Load parcel orders that are approved (status >= 2)
    const orders = await this.parcelOrderRepository.find({
      where: {
        scId,
        acadYear: syId,
        del: 0,
        orderStatus: 2, // Approved by plan
      },
      order: { orderId: 'DESC' },
    });

    return orders.map((order) => ({
      order_id: order.orderId,
      project_id: order.projectId,
      details: order.details,
      budgets: order.budgets,
      p_id: order.suppliers || 0,
      bg_type_id: order.bgTypeId,
    }));
  }

  async loadPartner(scId: number) {
    const partners = await this.partnerRepository.find({
      where: {
        scId,
        del: 0,
      },
      order: { pId: 'ASC' },
      take: 1000,
    });

    return partners.map((partner) => ({
      p_id: partner.pId,
      p_name: partner.pName,
      pay_type: partner.payType,
      cal_vat: partner.calVat,
      del: partner.del,
    }));
  }

  async loadBudgetType(scId: number, syId: number, _year: string) {
    const budgetTypes = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
      take: 1000,
    });

    // ยอดเบิกสะสมแล้วต่อประเภทเงิน (status >= 200 = ผ่านอนุมัติ/ออกเช็คแล้ว)
    const withdrawn = await this.requestWithdrawRepository
      .createQueryBuilder('rw')
      .select('rw.bg_type_id', 'bgTypeId')
      .addSelect('SUM(rw.amount)', 'total')
      .where(
        'rw.sc_id = :scId AND rw.sy_id = :syId AND rw.del = 0 AND rw.status >= 200',
        { scId, syId },
      )
      .groupBy('rw.bg_type_id')
      .getRawMany<{ bgTypeId: number; total: string }>();

    const withdrawnMap = new Map(
      withdrawn.map((r) => [
        Number(r.bgTypeId),
        Math.round(Number(r.total) * 100) / 100,
      ]),
    );

    return budgetTypes.map((type) => ({
      bg_type_id: type.bgTypeId,
      budget_type_id: type.bgTypeId,
      budget_type: type.budgetType,
      budget_type_name: type.budgetType,
      minWithdrawn: withdrawnMap.get(type.bgTypeId) ?? 0,
      disabled: false,
    }));
  }

  async loadUserRequest(scId: number) {
    const users = await this.adminRepository.find({
      where: {
        scId,
        del: 0,
      },
      order: { adminId: 'ASC' },
    });

    return users.map((user) => ({
      admin_id: user.adminId,
      name: user.name,
      username: user.username,
      email: user.email,
      type: user.type,
      sc_id: user.scId,
    }));
  }

  async addInvoice(dto: AddInvoiceDto) {
    // ── H4: ตรวจงบคงเหลือก่อนสร้างใบเบิก ──────────────────────────────────
    if (dto.order_id && dto.order_id > 0 && dto.amount) {
      const order = await this.parcelOrderRepository.findOne({
        where: { orderId: dto.order_id, del: 0 },
      });
      if (order && order.budgets) {
        const row = await this.requestWithdrawRepository
          .createQueryBuilder('rw')
          .select('COALESCE(SUM(rw.amount),0)', 'totalWithdrawn')
          .where('rw.order_id = :orderId', { orderId: dto.order_id })
          .andWhere('rw.del = 0')
          .andWhere('rw.status NOT IN (:...cancelled)', {
            cancelled: [51, 201],
          })
          .getRawOne<{ totalWithdrawn: string }>();
        const remaining =
          Number(order.budgets) - Number(row?.totalWithdrawn ?? 0);
        if (dto.amount > remaining) {
          return {
            flag: false,
            ms: `งบคงเหลือไม่เพียงพอ (คงเหลือ ${remaining.toLocaleString('th-TH')} บาท, ขอเบิก ${dto.amount.toLocaleString('th-TH')} บาท)`,
          };
        }
      }
    }

    // ── ตรวจสอบเงินยืมค้างชำระ ─────────────────────────────────────────────
    if (dto.rw_type === 1 && dto.user_request) {
      const today = new Date().toISOString().substring(0, 10);
      const outstanding = await this.requestWithdrawRepository.findOne({
        where: {
          scId: dto.sc_id,
          rwType: 1,
          userRequest: dto.user_request,
          loanReturnedDate: IsNull(),
          loanReturnDueDate: Not(IsNull()),
          del: 0,
        },
      });
      // ถ้ามีเงินยืมที่ยังไม่ได้คืนและเลยกำหนดแล้ว → block
      if (outstanding && outstanding.loanReturnDueDate! < today) {
        return {
          flag: false,
          ms: `มีเงินยืมค้างชำระ (ใบสำคัญ ${outstanding.noDoc ?? '—'}) เลยกำหนดส่งคืนแล้ว กรุณาส่งคืนก่อน`,
        };
      }
    }

    // ── auto-calc กำหนดส่งคืน ─────────────────────────────────────────────
    let loanReturnDueDate: string | null = dto.loan_return_due_date ?? null;
    if (dto.rw_type === 1 && dto.loan_start_date && !loanReturnDueDate) {
      const due = new Date(dto.loan_start_date);
      due.setDate(due.getDate() + 30);
      loanReturnDueDate = due.toISOString().substring(0, 10);
    }

    const invoice = this.requestWithdrawRepository.create({
      scId: dto.sc_id,
      noDoc: dto.no_doc,
      paymentType: dto.payment_type ?? 0,
      bgTypeId: dto.bg_type_id,
      rwType: dto.rw_type,
      orderId: dto.order_id ?? 0,
      pId: dto.p_id,
      detail: dto.detail,
      amount: dto.amount,
      certificatePayment: dto.certificate_payment ?? 1,
      dateRequest: new Date(dto.date_request),
      userRequestHead: dto.user_request_head ?? 0,
      userRequest: dto.user_request,
      userOfferCheck: dto.user_offer_check ?? 0,
      receiptNumber: dto.receipt_number || null,
      receiptPicture: dto.receipt_picture || null,
      offerCheckDate: dto.offer_check_date
        ? new Date(dto.offer_check_date)
        : null,
      checkNoDoc: dto.check_no_doc || null,
      typeOfferCheck: dto.type_offer_check ?? 0,
      status: dto.status ?? 0,
      remark: dto.remark || null,
      syId: dto.sy_id,
      year: dto.year,
      upBy: dto.up_by ?? 0,
      del: dto.del ?? 0,
      loanType: dto.loan_type ?? null,
      loanStartDate: dto.loan_start_date ?? null,
      loanReturnDueDate,
      loanReturnedDate: dto.loan_returned_date ?? null,
      loanReturnCash: dto.loan_return_cash ?? null,
      loanReturnVoucherAmount: dto.loan_return_voucher_amount ?? null,
    });

    await this.requestWithdrawRepository.save(invoice);

    return { flag: true };
  }

  async updateInvoice(dto: AddInvoiceDto) {
    if (!dto.rw_id) {
      return { flag: false, ms: 'ไม่พบ rw_id' };
    }

    const invoice = await this.requestWithdrawRepository.findOne({
      where: { rwId: dto.rw_id, scId: dto.sc_id, del: 0 },
    });

    if (!invoice) {
      return { flag: false, ms: 'ไม่พบข้อมูลขอเบิก' };
    }

    if (dto.no_doc !== undefined) invoice.noDoc = dto.no_doc;
    if (dto.payment_type !== undefined) invoice.paymentType = dto.payment_type;
    if (dto.bg_type_id !== undefined) invoice.bgTypeId = dto.bg_type_id;
    if (dto.rw_type !== undefined) invoice.rwType = dto.rw_type;
    if (dto.order_id !== undefined) invoice.orderId = dto.order_id;
    if (dto.p_id !== undefined) invoice.pId = dto.p_id;
    if (dto.detail !== undefined) invoice.detail = dto.detail;
    if (dto.amount !== undefined) invoice.amount = dto.amount;
    if (dto.certificate_payment !== undefined)
      invoice.certificatePayment = dto.certificate_payment;
    if (dto.date_request !== undefined)
      invoice.dateRequest = new Date(dto.date_request);
    if (dto.user_request_head !== undefined)
      invoice.userRequestHead = dto.user_request_head;
    if (dto.user_request !== undefined) invoice.userRequest = dto.user_request;
    if (dto.user_offer_check !== undefined)
      invoice.userOfferCheck = dto.user_offer_check;
    if (dto.receipt_number !== undefined)
      invoice.receiptNumber = dto.receipt_number;
    if (dto.receipt_picture !== undefined)
      invoice.receiptPicture = dto.receipt_picture;
    if (dto.offer_check_date !== undefined)
      invoice.offerCheckDate = dto.offer_check_date
        ? new Date(dto.offer_check_date)
        : null;
    if (dto.check_no_doc !== undefined) invoice.checkNoDoc = dto.check_no_doc;
    if (dto.type_offer_check !== undefined)
      invoice.typeOfferCheck = dto.type_offer_check;
    if (dto.status !== undefined) invoice.status = dto.status;
    if (dto.remark !== undefined) invoice.remark = dto.remark;
    if (dto.del !== undefined) invoice.del = dto.del;
    if (dto.up_by !== undefined) invoice.upBy = dto.up_by;
    if (dto.loan_type !== undefined) invoice.loanType = dto.loan_type;
    if (dto.loan_start_date !== undefined)
      invoice.loanStartDate = dto.loan_start_date;
    if (dto.loan_return_due_date !== undefined)
      invoice.loanReturnDueDate = dto.loan_return_due_date;
    if (dto.loan_returned_date !== undefined)
      invoice.loanReturnedDate = dto.loan_returned_date;
    if (dto.loan_return_cash !== undefined)
      invoice.loanReturnCash = dto.loan_return_cash;
    if (dto.loan_return_voucher_amount !== undefined)
      invoice.loanReturnVoucherAmount = dto.loan_return_voucher_amount;

    await this.requestWithdrawRepository.save(invoice);

    return { flag: true };
  }

  async loadLoanStatus(scId: number, syId: number) {
    const loans = await this.requestWithdrawRepository
      .createQueryBuilder('rw')
      .leftJoin('admin', 'adm', 'adm.admin_id = rw.user_request')
      .where('rw.sc_id = :scId', { scId })
      .andWhere('rw.sy_id = :syId', { syId })
      .andWhere('rw.rw_type = 1')
      .andWhere('rw.del = 0')
      .andWhere('rw.status >= 200') // อนุมัติและออกเช็คแล้ว
      .select('rw.rw_id', 'rw_id')
      .addSelect('rw.no_doc', 'no_doc')
      .addSelect('rw.detail', 'detail')
      .addSelect('rw.amount', 'amount')
      .addSelect('rw.loan_type', 'loan_type')
      .addSelect('rw.loan_start_date', 'loan_start_date')
      .addSelect('rw.loan_return_due_date', 'loan_return_due_date')
      .addSelect('rw.loan_returned_date', 'loan_returned_date')
      .addSelect('rw.loan_return_cash', 'loan_return_cash')
      .addSelect('rw.loan_return_voucher_amount', 'loan_return_voucher_amount')
      .addSelect('rw.status', 'status')
      .addSelect('rw.user_request', 'user_request')
      .addSelect('adm.name', 'requester_name')
      .orderBy('rw.loan_return_due_date', 'ASC')
      .getRawMany();

    const today = new Date().toISOString().substring(0, 10);

    return loans.map((r) => {
      const returned = !!r.loan_returned_date;
      const returnTotal =
        Number(r.loan_return_cash ?? 0) +
        Number(r.loan_return_voucher_amount ?? 0);
      let loanStatus: 'returned' | 'active' | 'overdue';
      if (returned) {
        loanStatus = 'returned';
      } else if (r.loan_return_due_date && r.loan_return_due_date < today) {
        loanStatus = 'overdue';
      } else {
        loanStatus = 'active';
      }
      return {
        rw_id: r.rw_id,
        no_doc: r.no_doc ?? '',
        detail: r.detail ?? '',
        amount: Number(r.amount ?? 0),
        loan_type: r.loan_type,
        loan_start_date: r.loan_start_date,
        loan_return_due_date: r.loan_return_due_date,
        loan_returned_date: r.loan_returned_date,
        loan_return_cash: Number(r.loan_return_cash ?? 0),
        loan_return_voucher_amount: Number(r.loan_return_voucher_amount ?? 0),
        return_total: returnTotal,
        loan_status: loanStatus,
        requester_name: r.requester_name ?? '',
        user_request: r.user_request,
      };
    });
  }

  async returnLoan(
    scId: number,
    dto: {
      rw_id: number;
      loan_returned_date: string;
      loan_return_cash: number;
      loan_return_voucher_amount: number;
      up_by?: number;
    },
  ) {
    const loan = await this.requestWithdrawRepository.findOne({
      where: { rwId: dto.rw_id, scId, rwType: 1, del: 0 },
    });
    if (!loan) return { flag: false, ms: 'ไม่พบข้อมูลเงินยืม' };
    if (loan.loanReturnedDate)
      return { flag: false, ms: 'บันทึกการคืนเงินแล้ว' };

    const returnTotal =
      Number(dto.loan_return_cash) + Number(dto.loan_return_voucher_amount);
    if (returnTotal < Number(loan.amount)) {
      return {
        flag: false,
        ms: `ยอดส่งคืน ${returnTotal.toLocaleString('th-TH')} บาท น้อยกว่ายอดยืม ${Number(loan.amount).toLocaleString('th-TH')} บาท`,
      };
    }

    loan.loanReturnedDate = dto.loan_returned_date;
    loan.loanReturnCash = dto.loan_return_cash;
    loan.loanReturnVoucherAmount = dto.loan_return_voucher_amount;
    if (dto.up_by !== undefined) loan.upBy = dto.up_by;

    await this.requestWithdrawRepository.save(loan);
    return { flag: true, ms: 'บันทึกการคืนเงินเรียบร้อยแล้ว' };
  }

  async loadConfirmInvoice(scId: number, permission: number, syId: number) {
    // permission: 100 = หัวหน้าการเงินตรวจ, 102 = ผอ. อนุมัติ
    // status ที่จะแสดง:
    //   permission=100 -> status=100 (ส่งหัวหน้าตรวจ)
    //   permission=102 -> status=102 (หัวหน้าอนุมัติแล้ว รอ ผอ.)
    //   อื่น ๆ         -> 100 และ 102 (เผื่อ admin ดูรวม)
    const qb = this.requestWithdrawRepository
      .createQueryBuilder('rw')
      .leftJoin('tb_partner', 'p', 'p.p_id = rw.p_id')
      .leftJoin(
        'master_budget_income_type',
        'bit',
        'bit.bg_type_id = rw.bg_type_id',
      )
      .leftJoin('parcel_order', 'po', 'po.order_id = rw.order_id')
      .leftJoin('pln_project', 'proj', 'proj.proj_id = po.project_id')
      .leftJoin(
        'budget_income_type_school',
        'bits',
        'bits.bg_type_id = rw.bg_type_id AND bits.sc_id = rw.sc_id AND bits.del = 0',
      )
      .leftJoin('bankaccount', 'ba', 'ba.ba_id = bits.ba_id AND ba.del = 0')
      .leftJoin('bank_db', 'bdb', 'bdb.b_id = ba.b_id')
      .where('rw.sc_id = :scId', { scId })
      .andWhere('rw.sy_id = :syId', { syId })
      .andWhere('rw.del = 0');

    if (permission === 50) {
      qb.andWhere('rw.status = 50');
    } else if (permission === 100) {
      qb.andWhere('rw.status = 100');
    } else if (permission === 102) {
      qb.andWhere('rw.status = 102');
    } else {
      qb.andWhere('rw.status IN (50, 100, 102)');
    }

    qb.orderBy('rw.rw_id', 'DESC')
      .select('rw.rw_id', 'rw_id')
      .addSelect('rw.sc_id', 'sc_id')
      .addSelect('rw.no_doc', 'invoice_no')
      .addSelect('rw.detail', 'invoice_name')
      .addSelect('rw.date_request', 'invoice_date')
      .addSelect('rw.amount', 'budgets')
      .addSelect('proj.proj_name', 'project_name')
      .addSelect('p.p_name', 'partner_name')
      .addSelect('bdb.b_name_l', 'bank_name')
      .addSelect('ba.ba_no', 'account_no')
      .addSelect('bit.budget_type', 'budget_type_name')
      .addSelect('rw.status', 'status')
      .addSelect('rw.remark', 'remark')
      .addSelect('rw.precheck_note', 'precheck_note')
      .addSelect('rw.up_by', 'up_by')
      .addSelect('rw.update_date', 'up_date');

    const rows = await qb.getRawMany<{
      rw_id: number;
      sc_id: number;
      invoice_no: string | null;
      invoice_name: string | null;
      invoice_date: Date | null;
      budgets: string | number | null;
      project_name: string | null;
      partner_name: string | null;
      bank_name: string | null;
      account_no: string | null;
      budget_type_name: string | null;
      status: number;
      remark: string | null;
      precheck_note: string | null;
      up_by: number | null;
      up_date: Date | null;
    }>();

    // บังคับให้ budgets เป็น number (MySQL decimal/float บางครั้ง return เป็น string)
    return rows.map((r) => ({
      ...r,
      invoice_no: r.invoice_no ?? '',
      invoice_name: r.invoice_name ?? '',
      project_name: r.project_name ?? '',
      partner_name: r.partner_name ?? '',
      bank_name: r.bank_name ?? '',
      account_no: r.account_no ?? '',
      budget_type_name: r.budget_type_name ?? '',
      precheck_note: r.precheck_note ?? '',
      budgets: r.budgets == null ? 0 : Number(r.budgets),
    }));
  }

  async confirmInvoice(
    dto: {
      rw_id: number;
      status: number;
      remark?: string;
      precheck_note?: string;
      up_by?: number;
    },
    scId: number,
  ) {
    const invoice = await this.requestWithdrawRepository.findOne({
      where: { rwId: dto.rw_id, scId, del: 0 },
    });

    if (!invoice) {
      return { flag: false, ms: 'ไม่พบข้อมูลขอเบิก' };
    }

    const fromPrecheck = invoice.status === 50;
    invoice.status = dto.status;
    if (dto.remark !== undefined) {
      invoice.remark = dto.remark;
    }

    // บันทึกข้อมูลเจ้าหน้าที่ตรวจฎีกา เมื่อ transition จาก 50 → 100/51
    if (fromPrecheck && (dto.status === 100 || dto.status === 51)) {
      invoice.precheckBy = dto.up_by ?? null;
      invoice.precheckDate = new Date();
      invoice.precheckNote = dto.precheck_note ?? null;
    }

    if (dto.up_by !== undefined) invoice.upBy = dto.up_by;
    invoice.updateDate = new Date();
    await this.requestWithdrawRepository.save(invoice);

    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }

  async deleteInvoice(rwId: number, scId: number, upBy?: number) {
    const invoice = await this.requestWithdrawRepository.findOne({
      where: { rwId, scId, del: 0 },
    });
    if (!invoice) return { flag: false, ms: 'ไม่พบข้อมูลใบเบิก' };

    // ห้ามลบถ้าวันที่ขอเบิกถูกลงนามแล้ว
    const dateStr = invoice.dateRequest
      ? invoice.dateRequest instanceof Date
        ? invoice.dateRequest.toISOString().slice(0, 10)
        : String(invoice.dateRequest).slice(0, 10)
      : null;
    if (dateStr) {
      const locked = await this.financialAuditService.isDateLocked(
        scId,
        dateStr,
      );
      if (locked) {
        return {
          flag: false,
          ms: `วันที่ ${dateStr} ถูกลงนามแล้ว ไม่สามารถลบรายการได้`,
        };
      }
    }

    invoice.del = 1;
    if (upBy !== undefined) invoice.upBy = upBy;
    invoice.updateDate = new Date();
    await this.requestWithdrawRepository.save(invoice);
    return { flag: true, ms: 'ลบข้อมูลใบเบิกเรียบร้อยแล้ว' };
  }
}
