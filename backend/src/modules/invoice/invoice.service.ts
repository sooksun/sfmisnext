import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestWithdraw } from './entities/request-withdraw.entity';
import { AddInvoiceDto } from './dto/add-invoice.dto';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

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
  ) {}

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
    });

    return partners.map((partner) => ({
      p_id: partner.pId,
      p_name: partner.pName,
      pay_type: partner.payType,
      cal_vat: partner.calVat,
      del: partner.del,
    }));
  }

  async loadBudgetType(_scId: number, _syId: number, _year: string) {
    // Load budget income types with available budget
    // This is a simplified version - might need to join with budget tables
    const budgetTypes = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    return budgetTypes.map((type) => ({
      bg_type_id: type.bgTypeId,
      budget_type_id: type.bgTypeId,
      budget_type: type.budgetType,
      budget_type_name: type.budgetType,
      minWithdrawn: 0, // TODO: Calculate from budget tables
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
    });

    await this.requestWithdrawRepository.save(invoice);

    return { flag: true };
  }

  async updateInvoice(dto: AddInvoiceDto) {
    if (!dto.rw_id) {
      return { flag: false, ms: 'ไม่พบ rw_id' };
    }

    const invoice = await this.requestWithdrawRepository.findOne({
      where: { rwId: dto.rw_id, del: 0 },
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

    await this.requestWithdrawRepository.save(invoice);

    return { flag: true };
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

    if (permission === 100) {
      qb.andWhere('rw.status = 100');
    } else if (permission === 102) {
      qb.andWhere('rw.status = 102');
    } else {
      qb.andWhere('rw.status IN (100, 102)');
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
      budgets: r.budgets == null ? 0 : Number(r.budgets),
    }));
  }

  async confirmInvoice(dto: {
    rw_id: number;
    status: number;
    remark?: string;
  }) {
    const invoice = await this.requestWithdrawRepository.findOne({
      where: { rwId: dto.rw_id, del: 0 },
    });

    if (!invoice) {
      return { flag: false, ms: 'ไม่พบข้อมูลขอเบิก' };
    }

    // status: 100 = อนุมัติ, 101 = ไม่อนุมัติ, 102 = ผอ. อนุมัติ (user_type = 2)
    invoice.status = dto.status;
    if (dto.remark !== undefined) {
      invoice.remark = dto.remark;
    }

    invoice.updateDate = new Date();
    await this.requestWithdrawRepository.save(invoice);

    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }
}
