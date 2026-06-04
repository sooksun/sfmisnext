import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { BudgetIncomeTypeSchool } from '../bank/entities/budget-income-type-school.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';

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
    @InjectRepository(OpeningBalance)
    private readonly openingBalanceRepository: Repository<OpeningBalance>,
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
    //  - กรองตามปีงบ (sy_id) มิฉะนั้นยอดสะสมจะปนข้ามปี (ยอดไม่ตรง)
    //  - กรองเฉพาะรายการที่ผ่านธนาคาร (money_channel=2) เท่านั้น เพราะสมุดบัญชี
    //    ธนาคารต้องสะท้อนเฉพาะเงินเข้า-ออกบัญชีจริง (รับโอน/เช็ค บจ) ไม่รวมเงินสด (บค)
    const transactions = await this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere('ft.bg_type_id IN (:...bgTypeIds)', { bgTypeIds })
      .andWhere(syId ? 'ft.sy_id = :syId' : '1=1', { syId })
      .andWhere('ft.money_channel = :bankCh', { bankCh: 2 })
      .orderBy('ft.create_date', 'ASC')
      .addOrderBy('ft.ft_id', 'ASC')
      .getMany();

    // โหลด PlnReceive และ RequestWithdraw ที่เกี่ยวข้องแบบ batch (ไม่ query ทีละแถว)
    const prIds = [
      ...new Set(
        transactions
          .filter((t) => t.type === 1 && t.prId > 0)
          .map((t) => t.prId),
      ),
    ];
    const rwIds = [
      ...new Set(
        transactions
          .filter((t) => t.rwId > 0) // รวมรายการหักภาษีอัตโนมัติ (type=1, rwId>0) ด้วย
          .map((t) => t.rwId),
      ),
    ];

    const [receives, withdraws] = await Promise.all([
      prIds.length > 0
        ? this.plnReceiveRepository.find({ where: { prId: In(prIds) } })
        : [],
      rwIds.length > 0
        ? this.requestWithdrawRepository.find({ where: { rwId: In(rwIds) } })
        : [],
    ]);

    const receiveMap = new Map<number, (typeof receives)[0]>(
      receives.map((r) => [r.prId, r] as [number, (typeof receives)[0]]),
    );
    const withdrawMap = new Map<number, (typeof withdraws)[0]>(
      withdraws.map((w) => [w.rwId, w] as [number, (typeof withdraws)[0]]),
    );

    // ยอดยกมาต้นปีของบัญชีนี้ = ผลรวมยอดยกมาประเภทเงินที่ผูกบัญชี เฉพาะที่อยู่ใน
    // ธนาคาร (storage_type=2) — สมุดบัญชีธนาคารต้องเริ่มจากยอดเงินฝากต้นปี
    const openings = await this.openingBalanceRepository.find({
      where: { scId, syId, storageType: 2, del: 0 },
    });
    const openingBank = openings
      .filter((o) => bgTypeIds.includes(o.moneyTypeId))
      .reduce((s, o) => s + (Number(o.amount) || 0), 0);

    // คำนวณ balance สะสม + map field ให้ตรงกับ frontend
    let runningBalance = openingBank;
    const rows = transactions.map((trans) => {
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
        if (r) {
          transNo = r.prNo ?? transNo;
          detail = `รับเงิน ${r.receiveForm ?? ''}`.trim();
        }
      } else if (isIncome && trans.prId === 0 && trans.rwId > 0) {
        // รับเข้าจากการหักภาษี ณ ที่จ่ายอัตโนมัติ (ไม่มีใบเสร็จ)
        const w = withdrawMap.get(trans.rwId);
        transNo = w?.noDoc ?? transNo;
        detail = `หักภาษี ณ ที่จ่าย ${w?.detail ?? ''}`.trim();
      } else if (isExpense && trans.rwId > 0) {
        const w = withdrawMap.get(trans.rwId);
        if (w) {
          transNo = w.noDoc ?? transNo;
          detail = `จ่าย ${w.detail ?? ''}`.trim();
        }
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

    // แถวยอดยกมาต้นปี (ถ้ามี) ไว้บนสุด เพื่อให้ยอดสะสมตรง
    if (openingBank !== 0) {
      rows.unshift({
        bb_id: 0,
        trans_date: '',
        trans_no: '',
        detail: 'ยอดยกมาต้นปี',
        trans_in: openingBank,
        trans_out: 0,
        balance: openingBank,
        up_by: '',
        up_date: '',
      });
    }
    return rows;
  }
}
