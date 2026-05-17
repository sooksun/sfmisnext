import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { UpdateCheckDto } from './dto/update-check.dto';
import { SaveCommitteeDto } from './dto/save-committee.dto';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { CheckReceiveCommittee } from './entities/check-receive-committee.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { calcWithholding } from '../../common/utils/withholding.util';
import { FinancialAuditService } from '../financial-audit/financial-audit.service';
import { INVOICE_STATUS } from '../../common/enums/invoice-status.enum';

/**
 * Map type_offer_check → money_channel
 *   type_offer_check: 1 = บค (เบิกเงินสด), 2 = บจ (เบิกจ่ายผ่านเช็ค/ธนาคาร)
 *   money_channel:     1 = cash, 2 = bank
 */
function mapCheckChannel(typeOfferCheck: number | null | undefined): number {
  if (typeOfferCheck === 1) return 1; // เบิกเงินสด
  if (typeOfferCheck === 2) return 2; // เบิกจ่ายผ่านเช็ค
  return 2;
}

@Injectable()
export class CheckService {
  private readonly committeeThreshold: number;

  constructor(
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
    @InjectRepository(CheckReceiveCommittee)
    private readonly committeeRepository: Repository<CheckReceiveCommittee>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly financialAuditService: FinancialAuditService,
  ) {
    // วงเงินที่ต้องมีคณะกรรมการตรวจรับ (ตามระเบียบ พัสดุ) — กำหนดได้ใน .env: COMMITTEE_THRESHOLD=5000
    this.committeeThreshold =
      this.configService.get<number>('COMMITTEE_THRESHOLD') ?? 5000;
  }

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
      take: 1000,
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

    const partner = check.pId
      ? await this.partnerRepository.findOne({
          where: { pId: check.pId, del: 0 },
        })
      : null;

    const amount = Number(check.amount ?? 0);
    const calVat = partner?.calVat ?? 2;
    const wht = calcWithholding(amount, calVat);

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
        amount: wht.gross,
        wht_base: wht.base,
        wht_vat_amount: wht.vatAmount,
        wht_amount: wht.withholdAmount,
        wht_net_payable: wht.netPayable,
        cal_vat: calVat,
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

  async cancelCheck(rwId: number, scId: number) {
    const check = await this.requestWithdrawRepository.findOne({
      where: { rwId, scId, del: 0 },
    });
    if (!check) return { flag: false, ms: 'ไม่พบข้อมูลเช็ค' };

    // ห้ามยกเลิกถ้าวันที่ออกเช็ค (หรือวันที่ขอเบิก) ถูกลงนามแล้ว
    const checkDate = check.offerCheckDate ?? check.dateRequest;
    const dateStr = checkDate
      ? checkDate instanceof Date
        ? checkDate.toISOString().slice(0, 10)
        : String(checkDate).slice(0, 10)
      : null;
    if (dateStr) {
      const locked = await this.financialAuditService.isDateLocked(
        scId,
        dateStr,
      );
      if (locked) {
        return {
          flag: false,
          ms: `วันที่ ${dateStr} ถูกลงนามแล้ว ไม่สามารถยกเลิกเช็คได้`,
        };
      }
    }

    check.status = 201;
    check.del = 1;
    await this.requestWithdrawRepository.save(check);

    // soft-delete financial_transactions ที่ผูกกับเช็คนี้ (ถ้ามี)
    await this.dataSource
      .getRepository(FinancialTransactions)
      .update(
        { rwId, type: -1, del: 0 },
        { del: 1, updateDate: new Date() },
      );

    return { flag: true, ms: 'ยกเลิกเช็คเรียบร้อยแล้ว' };
  }

  async updateCheck(dto: UpdateCheckDto, scId: number) {
    // Wrap ใน transaction + pessimistic_write lock — กัน race condition ตอน
    // 2 request พร้อมกันออกเช็คใบเดียวกัน (double-insert FT, bypass committee check)
    return this.dataSource.transaction(async (em) => {
      const checkRepo = em.getRepository(RequestWithdraw);
      const committeeRepo = em.getRepository(CheckReceiveCommittee);
      const ftRepo = em.getRepository(FinancialTransactions);

      const check = await checkRepo.findOne({
        where: { rwId: dto.rw_id, scId, del: 0 },
        lock: { mode: 'pessimistic_write' },
      });

      if (!check) {
        return { flag: false, ms: 'ไม่พบข้อมูลเช็ค' };
      }

      // ── ตรวจสอบคณะกรรมการตรวจรับ เมื่อจะออกเช็ค (CHECK_ISSUED) ─────────────
      if (
        dto.status === INVOICE_STATUS.CHECK_ISSUED &&
        Number(check.amount) >= this.committeeThreshold
      ) {
        const committee = await committeeRepo.findOne({
          where: { rwId: dto.rw_id, del: 0 },
        });
        if (!committee || !committee.member1Name) {
          return {
            flag: false,
            ms: `จำนวนเงิน ${Number(check.amount).toLocaleString('th-TH')} บาท ต้องระบุคณะกรรมการตรวจรับก่อนออกเช็ค`,
          };
        }
      }

      const prevStatus = check.status;

      if (dto.check_no_doc !== undefined)
        check.checkNoDoc = dto.check_no_doc.toString();
      if (dto.type_offer_check !== undefined)
        check.typeOfferCheck = dto.type_offer_check;
      if (dto.user_offer_check !== undefined)
        check.userOfferCheck = dto.user_offer_check;
      if (dto.offer_check_date !== undefined)
        check.offerCheckDate = new Date(dto.offer_check_date);
      if (dto.status !== undefined) check.status = dto.status;
      if (dto.del !== undefined) check.del = dto.del;

      await checkRepo.save(check);

      // ── Sync financial_transactions (ledger) ──────────────────────────
      // เมื่อเปลี่ยนจาก "ยังไม่ออก" → "ออกเช็คแล้ว" (CHECK_ISSUED) ให้สร้าง transaction type=-1
      // ถ้ายกเลิก (status≠CHECK_ISSUED) ให้ soft-delete transaction ที่เคยสร้างไว้
      if (
        check.status === INVOICE_STATUS.CHECK_ISSUED &&
        prevStatus !== INVOICE_STATUS.CHECK_ISSUED
      ) {
        // ป้องกัน double-insert — ตรวจว่ามี ft ของ rwId นี้อยู่แล้วไหม
        // (ภายใน transaction + lock จึง atomic กับ save ของ check ด้านบน)
        const exists = await ftRepo.count({
          where: { rwId: check.rwId, type: -1, del: 0 },
        });
        if (exists === 0) {
          const ft = ftRepo.create({
            type: -1,
            bgTypeId: check.bgTypeId ?? 0,
            amount: Number(check.amount ?? 0),
            scId: check.scId ?? 0,
            syId: check.syId ?? null,
            upBy: dto.up_by ?? 0,
            prId: 0,
            prdId: 0,
            rwId: check.rwId,
            prbId: 0,
            moneyChannel: mapCheckChannel(check.typeOfferCheck),
            baId: null,
            del: 0,
            createDate: check.offerCheckDate ?? new Date(),
            updateDate: new Date(),
          });
          await ftRepo.save(ft);
        }
      } else if (prevStatus === 202 && check.status !== 202) {
        // ยกเลิกออกเช็ค → soft-delete ft
        await ftRepo.update(
          { rwId: check.rwId, type: -1, del: 0 },
          { del: 1, updateDate: new Date() },
        );
      }

      return { flag: true };
    });
  }

  async loadCommittee(rwId: number, scId: number, userType: number) {
    // Super Admin (type=1) ข้ามโรงเรียนได้ — ตรวจเฉพาะ type อื่น
    if (userType !== 1) {
      const rw = await this.requestWithdrawRepository.findOne({
        where: { rwId, scId, del: 0 },
      });
      if (!rw) {
        throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลของโรงเรียนนี้');
      }
    }

    const c = await this.committeeRepository.findOne({
      where: { rwId, del: 0 },
    });
    if (!c) return null;
    return {
      crc_id: c.crcId,
      rw_id: c.rwId,
      member1_name: c.member1Name ?? '',
      member1_position: c.member1Position ?? '',
      member2_name: c.member2Name ?? '',
      member2_position: c.member2Position ?? '',
      member3_name: c.member3Name ?? '',
      member3_position: c.member3Position ?? '',
    };
  }

  async saveCommittee(dto: SaveCommitteeDto) {
    // ตรวจสอบว่า rw_id นี้เป็นของ sc_id นี้จริง
    const rw = await this.requestWithdrawRepository.findOne({
      where: { rwId: dto.rw_id, scId: dto.sc_id, del: 0 },
    });
    if (!rw) return { flag: false, ms: 'ไม่พบข้อมูลการเบิกจ่าย' };

    // upsert — ถ้ามีแล้วให้อัปเดต
    let c = await this.committeeRepository.findOne({
      where: { rwId: dto.rw_id },
    });
    if (!c) {
      c = this.committeeRepository.create({ rwId: dto.rw_id, scId: dto.sc_id });
    }
    c.member1Name = dto.member1_name;
    c.member1Position = dto.member1_position;
    c.member2Name = dto.member2_name ?? null;
    c.member2Position = dto.member2_position ?? null;
    c.member3Name = dto.member3_name ?? null;
    c.member3Position = dto.member3_position ?? null;
    c.upBy = dto.up_by ?? 0;
    c.del = 0;
    await this.committeeRepository.save(c);
    return { flag: true, ms: 'บันทึกคณะกรรมการเรียบร้อยแล้ว' };
  }
}
