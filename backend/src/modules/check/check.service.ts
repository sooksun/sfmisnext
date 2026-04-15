import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { UpdateCheckDto } from './dto/update-check.dto';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Injectable()
export class CheckService {
  constructor(
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
  ) {}

  async loadCheck(scId: number, syId: number) {
    const rows = await this.requestWithdrawRepository
      .createQueryBuilder('rw')
      .leftJoin('tb_partner', 'p', 'p.p_id = rw.p_id')
      .leftJoin(
        'master_budget_income_type',
        'bit',
        'bit.bg_type_id = rw.bg_type_id',
      )
      .where('rw.sc_id = :scId', { scId })
      .andWhere('rw.sy_id = :syId', { syId })
      .andWhere('rw.del = 0')
      .andWhere('rw.status IN (:...statuses)', { statuses: [200, 201, 202] })
      .select('rw.rw_id', 'rw_id')
      .addSelect('rw.no_doc', 'no_doc')
      .addSelect('rw.bg_type_id', 'bg_type_id')
      .addSelect('rw.p_id', 'p_id')
      .addSelect('rw.detail', 'detail')
      .addSelect('rw.amount', 'amount')
      .addSelect('rw.date_request', 'date_request')
      .addSelect('rw.check_no_doc', 'check_no_doc')
      .addSelect('rw.offer_check_date', 'offer_check_date')
      .addSelect('rw.user_offer_check', 'user_offer_check')
      .addSelect('rw.type_offer_check', 'type_offer_check')
      .addSelect('rw.status', 'status')
      .addSelect('rw.remark', 'remark')
      .addSelect('rw.sy_id', 'sy_id')
      .addSelect('rw.up_by', 'up_by')
      .addSelect('rw.update_date', 'up_date')
      .addSelect('p.p_name', 'partner_name')
      .addSelect('bit.budget_type', 'budget_type_name')
      .orderBy('rw.rw_id', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      ...r,
      amount: r.amount == null ? 0 : Number(r.amount),
      partner_name: r.partner_name ?? '',
      budget_type_name: r.budget_type_name ?? '',
    }));
  }

  async loadAutoNoCheck(scId: number, syId: number) {
    // Get the last check_no_doc for this school and year
    const lastCheck = await this.requestWithdrawRepository
      .createQueryBuilder('rw')
      .where('rw.sc_id = :scId', { scId })
      .andWhere('rw.sy_id = :syId', { syId })
      .andWhere('rw.del = 0')
      .andWhere('rw.check_no_doc IS NOT NULL')
      .orderBy('rw.rw_id', 'DESC')
      .getOne();

    let nextCheckNo = 1;
    if (lastCheck && lastCheck.checkNoDoc) {
      const lastCheckNo = parseInt(lastCheck.checkNoDoc, 10);
      if (!isNaN(lastCheckNo)) {
        nextCheckNo = lastCheckNo + 1;
      }
    }

    return { check_no_doc: nextCheckNo };
  }

  async loadUser(scId: number) {
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

  async loadBudget(_scId: number) {
    const budgetTypes = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    return budgetTypes.map((type) => ({
      bg_type_id: type.bgTypeId,
      budget_type: type.budgetType,
      del: type.del,
    }));
  }

  async loadCheckById(scId: number, syId: number, rwId: number) {
    const check = await this.requestWithdrawRepository.findOne({
      where: {
        rwId,
        scId,
        syId,
        del: 0,
      },
    });

    if (!check) {
      return [];
    }

    return [
      {
        rw_id: check.rwId,
        sc_id: check.scId,
        no_doc: check.noDoc,
        payment_type: check.paymentType,
        bg_type_id: check.bgTypeId,
        rw_type: check.rwType,
        order_id: check.orderId,
        p_id: check.pId,
        detail: check.detail,
        amount: check.amount,
        certificate_payment: check.certificatePayment,
        date_request: check.dateRequest,
        user_request_head: check.userRequestHead,
        user_request: check.userRequest,
        user_offer_check: check.userOfferCheck,
        receipt_number: check.receiptNumber,
        receipt_picture: check.receiptPicture
          ? { full: check.receiptPicture }
          : null,
        offer_check_date: check.offerCheckDate,
        check_no_doc: check.checkNoDoc,
        type_offer_check: check.typeOfferCheck,
        status: check.status,
        remark: check.remark,
        sy_id: check.syId,
        year: check.year,
        up_by: check.upBy,
        del: check.del,
        create_date: check.createDate,
        update_date: check.updateDate,
      },
    ];
  }

  async cancelCheck(rwId: number) {
    const check = await this.requestWithdrawRepository.findOne({
      where: { rwId, del: 0 },
    });
    if (!check) return { flag: false, ms: 'ไม่พบข้อมูลเช็ค' };

    check.status = 201;
    check.del = 1;
    await this.requestWithdrawRepository.save(check);
    return { flag: true, ms: 'ยกเลิกเช็คเรียบร้อยแล้ว' };
  }

  async updateCheck(dto: UpdateCheckDto) {
    const check = await this.requestWithdrawRepository.findOne({
      where: { rwId: dto.rw_id, del: 0 },
    });

    if (!check) {
      return { flag: false, ms: 'ไม่พบข้อมูลเช็ค' };
    }

    check.checkNoDoc = dto.check_no_doc.toString();
    if (dto.type_offer_check !== undefined)
      check.typeOfferCheck = dto.type_offer_check;
    check.userOfferCheck = dto.user_offer_check;
    check.offerCheckDate = new Date(dto.offer_check_date);
    check.status = dto.status;
    if (dto.del !== undefined) check.del = dto.del;

    await this.requestWithdrawRepository.save(check);

    // TODO: Create transaction if needed (dto.transaction)

    return { flag: true };
  }
}
