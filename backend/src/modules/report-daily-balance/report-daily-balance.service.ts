import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FinancialTransactions } from './entities/financial-transactions.entity';
import { CashReserveLimit } from './entities/cash-reserve-limit.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';

// วงเงินสำรองจ่ายเริ่มต้น ถ้าโรงเรียนยังไม่ได้ตั้งค่า (บาท)
const DEFAULT_CASH_LIMIT = 15000;

@Injectable()
export class ReportDailyBalanceService {
  constructor(
    @InjectRepository(FinancialTransactions)
    private readonly financialTransactionsRepository: Repository<FinancialTransactions>,
    @InjectRepository(CashReserveLimit)
    private readonly cashReserveLimitRepository: Repository<CashReserveLimit>,
    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepository: Repository<PlnReceive>,
    @InjectRepository(PlnReceiveDetail)
    private readonly plnReceiveDetailRepository: Repository<PlnReceiveDetail>,
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
    @InjectRepository(OpeningBalance)
    private readonly openingBalanceRepository: Repository<OpeningBalance>,
  ) {}

  async loadDailyBalance(scId: number, date: string, syId: number) {
    // Parse date string to Date object
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // โรงเรียน + ปีการศึกษา + วันที่ → ตรวจสอบย้อนกลับได้ครบถ้วน
    const baseWhere = (
      qb: ReturnType<
        typeof this.financialTransactionsRepository.createQueryBuilder
      >,
    ) =>
      qb
        .where('ft.sc_id = :scId', { scId })
        .andWhere('ft.del = :del', { del: '0' })
        .andWhere(syId ? 'ft.sy_id = :syId' : '1=1', { syId });

    // Load financial transactions for the date
    const transactions = await baseWhere(
      this.financialTransactionsRepository.createQueryBuilder('ft'),
    )
      .andWhere('ft.create_date >= :startDate', { startDate: startOfDay })
      .andWhere('ft.create_date <= :endDate', { endDate: endOfDay })
      .orderBy('ft.ft_id', 'ASC')
      .getMany();

    // Calculate balance by budget type
    // carryForward = ยอดยกมาก่อนเริ่มวันที่เลือก (ต้นวัน)
    // income/expense = ของวันนี้เท่านั้น
    // balance = carryForward + income - expense
    const balanceByType: Record<
      number,
      { carryForward: number; income: number; expense: number; balance: number }
    > = {};

    // Initialize ยอดยกมา from previous transactions (before target date, same sy_id)
    const previousTransactions = await baseWhere(
      this.financialTransactionsRepository.createQueryBuilder('ft'),
    )
      .andWhere('ft.create_date < :startDate', { startDate: startOfDay })
      .getMany();

    previousTransactions.forEach((trans) => {
      if (!balanceByType[trans.bgTypeId]) {
        balanceByType[trans.bgTypeId] = {
          carryForward: 0,
          income: 0,
          expense: 0,
          balance: 0,
        };
      }
      if (trans.type === 1) {
        balanceByType[trans.bgTypeId].carryForward += trans.amount;
      } else if (trans.type === -1) {
        balanceByType[trans.bgTypeId].carryForward -= trans.amount;
      }
    });
    // ── รวมยอดยกมาต้นปีงบประมาณ (opening_balance) เข้า carryForward ──────────
    // opening_balance.money_type_id = bg_type_id ; เป็นยอดตั้งต้นก่อนรายการแรก
    // (balance_date ต้นปี < วันที่เลือก จึงนับเป็นยอดยกมาเสมอ)
    const openingRows = await this.openingBalanceRepository
      .createQueryBuilder('ob')
      .where('ob.sc_id = :scId', { scId })
      .andWhere('ob.del = :del', { del: 0 })
      .andWhere(syId ? 'ob.sy_id = :syId' : '1=1', { syId })
      .andWhere('ob.balance_date < :startDate', { startDate: startOfDay })
      .getMany();

    openingRows.forEach((ob) => {
      const typeId = ob.moneyTypeId;
      if (!balanceByType[typeId]) {
        balanceByType[typeId] = {
          carryForward: 0,
          income: 0,
          expense: 0,
          balance: 0,
        };
      }
      balanceByType[typeId].carryForward += Number(ob.amount) || 0;
    });

    // balance เริ่มต้น = ยอดยกมา (ของวันนี้ยังไม่มี)
    for (const typeId of Object.keys(balanceByType)) {
      balanceByType[Number(typeId)].balance =
        balanceByType[Number(typeId)].carryForward;
    }

    // ── Batch-load related data แทน N+1 queries ────────────────────
    // รวบรวม IDs ที่ต้องการจาก transactions ทั้งหมด
    const prIds = new Set<number>();
    const prdIds = new Set<number>();
    const rwIds = new Set<number>();

    for (const trans of transactions) {
      if (trans.type === 1 && trans.prId > 0) {
        prIds.add(trans.prId);
        if (trans.prdId > 0) prdIds.add(trans.prdId);
      } else if (trans.type === -1 && trans.rwId > 0) {
        rwIds.add(trans.rwId);
      }
    }

    // ดึงข้อมูลทั้งหมดใน 3 queries (แทน N queries ต่อ transaction)
    const [receiveList, receiveDetailList, withdrawList] = await Promise.all([
      prIds.size > 0
        ? this.plnReceiveRepository.find({ where: { prId: In([...prIds]) } })
        : ([] as PlnReceive[]),
      prdIds.size > 0
        ? this.plnReceiveDetailRepository.find({
            where: { prdId: In([...prdIds]) },
          })
        : ([] as PlnReceiveDetail[]),
      rwIds.size > 0
        ? this.requestWithdrawRepository.find({
            where: { rwId: In([...rwIds]) },
          })
        : ([] as RequestWithdraw[]),
    ]);

    // สร้าง lookup maps
    const receiveMap = new Map(receiveList.map((r) => [r.prId, r]));
    const receiveDetailMap = new Map(
      receiveDetailList.map((d) => [d.prdId, d]),
    );
    const withdrawMap = new Map(withdrawList.map((w) => [w.rwId, w]));

    // Process transactions for the target date
    const dailyTransactions: any[] = [];

    for (const trans of transactions) {
      if (!balanceByType[trans.bgTypeId]) {
        balanceByType[trans.bgTypeId] = {
          carryForward: 0,
          income: 0,
          expense: 0,
          balance: 0,
        };
      }

      let detail: Record<string, unknown> | null = null;

      if (trans.type === 1 && trans.prId > 0) {
        const receive = receiveMap.get(trans.prId);
        const receiveDetail = receiveDetailMap.get(trans.prdId);

        if (receive && receiveDetail) {
          detail = {
            type: 'receive',
            pr_no: receive.prNo,
            prd_detail: receiveDetail.prdDetail,
            amount: trans.amount,
          };
        }
      } else if (trans.type === -1 && trans.rwId > 0) {
        const requestWithdraw = withdrawMap.get(trans.rwId);

        if (requestWithdraw) {
          detail = {
            type: 'withdraw',
            no_doc: requestWithdraw.noDoc,
            detail: requestWithdraw.detail,
            amount: trans.amount,
          };
        }
      }

      if (trans.type === 1) {
        balanceByType[trans.bgTypeId].income += trans.amount;
        balanceByType[trans.bgTypeId].balance += trans.amount;
      } else if (trans.type === -1) {
        balanceByType[trans.bgTypeId].expense += trans.amount;
        balanceByType[trans.bgTypeId].balance -= trans.amount;
      }

      dailyTransactions.push({
        ft_id: trans.ftId,
        type: trans.type,
        bg_type_id: trans.bgTypeId,
        amount: trans.amount,
        create_date: trans.createDate,
        detail,
        balance: balanceByType[trans.bgTypeId].balance,
      });
    }

    // Load budget type names
    const bgTypeIds = Object.keys(balanceByType).map((id) => parseInt(id));
    const budgetTypes =
      bgTypeIds.length > 0
        ? await this.budgetIncomeTypeRepository.find({
            where: { bgTypeId: In(bgTypeIds), del: 0 },
          })
        : [];

    const budgetTypeMap = new Map<number, string>();
    budgetTypes.forEach((bt) => budgetTypeMap.set(bt.bgTypeId, bt.budgetType));

    // Format summary for frontend — คืนเป็น array ตรงตามที่ frontend คาด
    const summary = Object.keys(balanceByType).map((bgTypeId) => {
      const typeId = parseInt(bgTypeId);
      const b = balanceByType[typeId];
      const name = budgetTypeMap.get(typeId) || `ประเภท ${typeId}`;
      return {
        bg_type_id: typeId,
        budget_type: name,
        budget_type_name: name, // alias สำหรับ frontend เดิม
        carry_forward: b.carryForward, // ยอดยกมา (ก่อนเริ่มวันนี้)
        income: b.income, // รับเข้าวันนี้
        expense: b.expense, // จ่ายออกวันนี้
        balance: b.balance, // คงเหลือ = ยกมา + รับ - จ่าย
        date,
        _transactions: dailyTransactions.filter((t) => t.bg_type_id === typeId),
      };
    });

    return summary;
  }

  async loadCashLimitCheck(scId: number) {
    // ดึง limit ที่ตั้งไว้ (ถ้ายังไม่ตั้ง ใช้ค่า default)
    const limitRecord = await this.cashReserveLimitRepository.findOne({
      where: { scId },
    });
    const limitAmount = limitRecord
      ? limitRecord.limitAmount
      : DEFAULT_CASH_LIMIT;

    // ── แยก cash vs bank ตาม money_channel ─────────────────────────────
    // cash (money_channel=1 หรือ 0 สำหรับ legacy) ต้องไม่เกินวงเงินสำรองจ่าย
    // bank (money_channel=2) แสดงเพิ่มเติมเป็น informational
    const cashResult = await this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere('(ft.money_channel = 1 OR ft.money_channel = 0)')
      .select(
        'SUM(CASE WHEN ft.type = 1 THEN ft.amount ELSE 0 END)',
        'total_income',
      )
      .addSelect(
        'SUM(CASE WHEN ft.type = -1 THEN ft.amount ELSE 0 END)',
        'total_expense',
      )
      .getRawOne<{ total_income: string; total_expense: string }>();

    const bankResult = await this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere('ft.money_channel = 2')
      .select(
        'SUM(CASE WHEN ft.type = 1 THEN ft.amount ELSE 0 END)',
        'total_income',
      )
      .addSelect(
        'SUM(CASE WHEN ft.type = -1 THEN ft.amount ELSE 0 END)',
        'total_expense',
      )
      .getRawOne<{ total_income: string; total_expense: string }>();

    // รวมยอดยกมาต้นปี (opening_balance): storage_type 1=เงินสด, 2=ธนาคาร
    const openingRows = await this.openingBalanceRepository.find({
      where: { scId, del: 0 },
    });
    const openingCash = openingRows
      .filter((o) => o.storageType === 1)
      .reduce((s, o) => s + Number(o.amount || 0), 0);
    const openingBank = openingRows
      .filter((o) => o.storageType === 2)
      .reduce((s, o) => s + Number(o.amount || 0), 0);

    const cashBalance =
      openingCash +
      Number(cashResult?.total_income ?? 0) -
      Number(cashResult?.total_expense ?? 0);
    const bankBalance =
      openingBank +
      Number(bankResult?.total_income ?? 0) -
      Number(bankResult?.total_expense ?? 0);
    const exceeded = cashBalance > limitAmount;
    const excessAmount = exceeded ? cashBalance - limitAmount : 0;

    return {
      limit_amount: limitAmount,
      current_balance: cashBalance, // ← คงความ compatible กับ frontend เดิม (คือเงินสด)
      cash_balance: cashBalance, // เงินสด/เช็คในมือ (ใช้เทียบกับ limit)
      bank_balance: bankBalance, // เงินฝากธนาคาร (informational)
      total_balance: cashBalance + bankBalance,
      exceeded,
      excess_amount: excessAmount,
      note: limitRecord?.note ?? null,
    };
  }

  async setCashLimit(dto: {
    sc_id: number;
    limit_amount: number;
    note?: string;
    up_by?: number;
  }) {
    let record = await this.cashReserveLimitRepository.findOne({
      where: { scId: dto.sc_id },
    });
    if (!record) {
      record = this.cashReserveLimitRepository.create({ scId: dto.sc_id });
    }
    record.limitAmount = dto.limit_amount;
    record.note = dto.note ?? null;
    record.upBy = dto.up_by ?? 0;
    await this.cashReserveLimitRepository.save(record);
    return { flag: true, ms: 'บันทึกวงเงินสำรองจ่ายเรียบร้อยแล้ว' };
  }
}
