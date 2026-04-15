import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { BudgetIncomeTypeSchool } from '../bank/entities/budget-income-type-school.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';

export interface BookbankTransaction {
  ft_id: number;
  type: number;
  bg_type_id: number | null;
  amount: number;
  create_date: Date | null;
  detail: Record<string, unknown> | null;
  balance: number;
}

@Injectable()
export class ReportBookbankService {
  constructor(
    @InjectRepository(FinancialTransactions)
    private readonly financialTransactionsRepository: Repository<FinancialTransactions>,
    @InjectRepository(BudgetIncomeTypeSchool)
    private readonly budgetIncomeTypeSchoolRepository: Repository<BudgetIncomeTypeSchool>,
    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepository: Repository<PlnReceive>,
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
  ) {}

  async loadReportRegisterBookbank(
    baId: number,
    scId: number,
    syId: number,
    year: string,
  ) {
    // หา bg_type_id ที่ผูกกับบัญชีธนาคารนี้
    const budgetTypeLinks = await this.budgetIncomeTypeSchoolRepository.find({
      where: { baId, scId, del: 0 },
    });

    const bgTypeIds = budgetTypeLinks
      .map((link) => link.bgTypeId)
      .filter((id): id is number => id !== null && id > 0);

    if (bgTypeIds.length === 0) {
      return [];
    }

    // โหลด financial transactions ของประเภทเงินที่ผูกกับบัญชีนี้
    const transactions = await this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere('ft.bg_type_id IN (:...bgTypeIds)', { bgTypeIds })
      .orderBy('ft.create_date', 'ASC')
      .addOrderBy('ft.ft_id', 'ASC')
      .getMany();

    // โหลด PlnReceive และ RequestWithdraw ที่เกี่ยวข้องแบบ batch (ไม่ query ทีละแถว)
    const prIds = [...new Set(transactions.filter(t => t.type === 1 && t.prId > 0).map(t => t.prId))];
    const rwIds = [...new Set(transactions.filter(t => t.type === -1 && t.rwId > 0).map(t => t.rwId))];

    const [receives, withdraws] = await Promise.all([
      prIds.length > 0
        ? this.plnReceiveRepository.find({ where: { prId: In(prIds) } })
        : [],
      rwIds.length > 0
        ? this.requestWithdrawRepository.find({ where: { rwId: In(rwIds) } })
        : [],
    ]);

    const receiveMap = new Map<number, typeof receives[0]>(receives.map(r => [r.prId, r] as [number, typeof receives[0]]));
    const withdrawMap = new Map<number, typeof withdraws[0]>(withdraws.map(w => [w.rwId, w] as [number, typeof withdraws[0]]));

    // คำนวณ balance สะสม + map field ให้ตรงกับ frontend
    let runningBalance = 0;
    return transactions.map((trans) => {
      const isIncome = trans.type === 1;
      const isExpense = trans.type === -1;

      const transIn = isIncome ? trans.amount : 0;
      const transOut = isExpense ? trans.amount : 0;
      runningBalance += transIn - transOut;

      // สร้างเลขที่อ้างอิงและรายละเอียด
      let transNo = `FT-${trans.ftId}`;
      let detail = '';

      if (isIncome && trans.prId > 0) {
        const r = receiveMap.get(trans.prId);
        if (r) { transNo = r.prNo ?? transNo; detail = `รับเงิน ${r.receiveForm ?? ''}`.trim(); }
      } else if (isExpense && trans.rwId > 0) {
        const w = withdrawMap.get(trans.rwId);
        if (w) { transNo = w.noDoc ?? transNo; detail = `จ่าย ${w.detail ?? ''}`.trim(); }
      }

      const dateStr = trans.createDate
        ? trans.createDate.toISOString().split('T')[0]
        : '';

      return {
        bb_id: trans.ftId,
        trans_date: dateStr,
        trans_no: transNo,
        detail: detail || (isIncome ? 'รายรับ' : 'รายจ่าย'),
        trans_in: transIn,
        trans_out: transOut,
        balance: runningBalance,
        up_by: String(trans.upBy ?? ''),
        up_date: trans.updateDate ? trans.updateDate.toISOString() : dateStr,
      };
    });
  }
}
