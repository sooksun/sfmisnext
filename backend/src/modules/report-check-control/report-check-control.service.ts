import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { Admin } from '../admin/entities/admin.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Injectable()
export class ReportCheckControlService {
  constructor(
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
  ) {}

  async loadCheckControl(scId: number, syId: number) {
    // Load checks (request_withdraw where status = 200, 201, 202)
    const checks = await this.requestWithdrawRepository.find({
      where: {
        scId,
        syId,
        del: 0,
        status: In([200, 201, 202]), // เช็คที่ออกแล้ว
      },
      order: { rwId: 'DESC' },
    });

    // Return empty array if no checks found
    if (checks.length === 0) {
      console.log(`No checks found for scId: ${scId}, syId: ${syId}`);
      return [];
    }

    // Load related data
    const adminIds = [
      ...new Set(checks.map((c) => c.userOfferCheck).filter((id) => id > 0)),
    ];
    const partnerIds = [
      ...new Set(checks.map((c) => c.pId).filter((id) => id > 0)),
    ];
    const budgetTypeIds = [
      ...new Set(checks.map((c) => c.bgTypeId).filter((id) => id > 0)),
    ];

    const [admins, partners, budgetTypes] = await Promise.all([
      adminIds.length > 0
        ? this.adminRepository.find({
            where: { adminId: In(adminIds) },
          })
        : ([] as Admin[]),
      partnerIds.length > 0
        ? this.partnerRepository.find({
            where: { pId: In(partnerIds) },
          })
        : ([] as Partner[]),
      budgetTypeIds.length > 0
        ? this.budgetIncomeTypeRepository.find({
            where: { bgTypeId: In(budgetTypeIds) },
          })
        : ([] as BudgetIncomeType[]),
    ]);

    const adminMap = new Map<number, Admin>();
    admins.forEach((a) => adminMap.set(a.adminId, a));

    const partnerMap = new Map<number, Partner>();
    partners.forEach((p) => partnerMap.set(p.pId, p));

    const budgetTypeMap = new Map<number, BudgetIncomeType>();
    budgetTypes.forEach((b) => budgetTypeMap.set(b.bgTypeId, b));

    return checks.map((check) => {
      const admin = adminMap.get(check.userOfferCheck);
      const partner = partnerMap.get(check.pId);
      const budgetType = budgetTypeMap.get(check.bgTypeId);

      return {
        rw_id: check.rwId,
        no_doc: check.noDoc,
        check_no_doc: check.checkNoDoc,
        date_request: check.dateRequest,
        offer_check_date: check.offerCheckDate,
        amount: check.amount,
        detail: check.detail,
        status: check.status,
        user_offer_check: check.userOfferCheck,
        user_offer_check_name: admin?.name || '',
        p_id: check.pId,
        partner_name: partner?.pName || '',
        bg_type_id: check.bgTypeId,
        budget_type: budgetType?.budgetType || '',
        remark: check.remark,
      };
    });
  }
}
