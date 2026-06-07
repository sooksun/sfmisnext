import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { CashKeepingService } from '../cash-keeping/cash-keeping.service';

export interface RegisterTransaction {
  ft_id: number;
  type: number;
  amount: number;
  create_date: Date | null;
  update_date: Date | null;
  receive_general: Record<string, unknown> | null;
  receive: Record<string, unknown> | null;
  pay: Record<string, unknown> | null;
  receive_money_type: number | null;
  balance: number;
  cash: number;
  receive_bank: number;
}

@Injectable()
export class RegisterMoneyTypeService {
  private readonly logger = new Logger(RegisterMoneyTypeService.name);

  constructor(
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
    @InjectRepository(FinancialTransactions)
    private readonly financialTransactionsRepository: Repository<FinancialTransactions>,
    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepository: Repository<PlnReceive>,
    @InjectRepository(PlnReceiveDetail)
    private readonly plnReceiveDetailRepository: Repository<PlnReceiveDetail>,
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
    @InjectRepository(OpeningBalance)
    private readonly openingBalanceRepository: Repository<OpeningBalance>,
    private readonly dataSource: DataSource,
    private readonly fundBalance: FundBalanceService,
    private readonly cashKeeping: CashKeepingService,
  ) {}

  /**
   * นำเงินสด (คงมือ) ของประเภทเงินไปฝากธนาคาร — แถว "นำเงินฝากธนาคาร" ในทะเบียนคุม
   *  สร้าง 2 รายการสุทธิ 0: เงินสดออก (type=−1 ช่อง1) + เงินฝากธนาคารเข้า (type=+1 ช่อง2)
   *  → ยอดรวมประเภทเงินไม่เปลี่ยน แต่ย้ายจากเงินสดไปธนาคาร (กันนำฝากเกินเงินสดคงเหลือ)
   */
  async depositCash(dto: {
    sc_id: number;
    sy_id: number;
    bg_type_id: number;
    deposit_date: string;
    amount: number;
    doc_no?: string;
    ba_id?: number;
    up_by?: number;
  }) {
    const amount = Number(dto.amount);
    if (!(amount > 0))
      return { flag: false, ms: 'จำนวนเงินที่นำฝากต้องมากกว่า 0' };

    const result = await this.dataSource.transaction(async (em) => {
      const ftRepo = em.getRepository(FinancialTransactions);

      // กันนำฝากเกิน "เงินสดคงเหลือ" ของประเภทเงินนี้
      const cash = await this.fundBalance.availableCashInTx(
        em,
        dto.sc_id,
        dto.sy_id,
        dto.bg_type_id,
      );
      if (amount - cash > 0.005) {
        return {
          flag: false,
          ms: `นำฝากไม่ได้ — เงินสดคงเหลือ ${cash.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ไม่พอนำฝาก ${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
        };
      }

      const createDate = dto.deposit_date
        ? new Date(dto.deposit_date)
        : new Date();

      // เงินสดออก (คงมือลดลง)
      await ftRepo.save(
        ftRepo.create({
          type: -1,
          bgTypeId: dto.bg_type_id,
          amount,
          scId: dto.sc_id,
          syId: dto.sy_id,
          moneyChannel: 1,
          registerKind: 'deposit',
          refNo: dto.doc_no ?? null,
          upBy: dto.up_by ?? 0,
          del: 0,
          createDate,
        }),
      );
      // เงินฝากธนาคารเข้า
      await ftRepo.save(
        ftRepo.create({
          type: 1,
          bgTypeId: dto.bg_type_id,
          amount,
          scId: dto.sc_id,
          syId: dto.sy_id,
          moneyChannel: 2,
          baId: dto.ba_id ?? null,
          registerKind: 'deposit',
          refNo: dto.doc_no ?? null,
          upBy: dto.up_by ?? 0,
          del: 0,
          createDate,
        }),
      );

      return { flag: true, ms: 'นำเงินสดฝากธนาคารเรียบร้อยแล้ว' };
    });

    // ปิดบันทึกเก็บรักษาเงินสดที่นำฝากแล้ว (FIFO) — ให้ตัวเตือนนำฝากแม่นยำ
    if (result.flag) {
      await this.cashKeeping.markDepositedFifo(
        dto.sc_id,
        dto.sy_id,
        amount,
        dto.deposit_date ?? null,
        dto.up_by ?? 0,
      );
    }
    return result;
  }

  /**
   * เตือนการนำส่งภาษีหัก ณ ที่จ่าย — ต้องนำส่งภายในวันที่ 7 ของเดือนถัดไป
   *  สรุปภาษีที่หักไว้ (รับเข้าทะเบียนภาษี) − ที่นำส่งแล้ว แยกรายเดือน
   *  status: overdue (เลยวันที่ 7 แล้วยังค้าง) | due_soon (ใกล้กำหนด) | pending
   */
  async whtRemitReminder(scId: number, syId: number, _year: string) {
    // หาประเภทเงิน "ภาษีหัก ณ ที่จ่าย"
    const bt = await this.budgetIncomeTypeRepository
      .createQueryBuilder('bt')
      .where('bt.budget_type LIKE :n', { n: '%ภาษีหัก%' })
      .andWhere('bt.del = 0')
      .orderBy('bt.bg_type_id', 'ASC')
      .getOne();
    if (!bt)
      return { data: [], count: 0, ms: 'ไม่พบประเภทเงินภาษีหัก ณ ที่จ่าย' };

    const txns = await this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere(syId ? 'ft.sy_id = :syId' : '1=1', { syId })
      .andWhere('ft.bg_type_id = :bg', { bg: bt.bgTypeId })
      .getMany();

    // group ตามเดือนของ create_date (YYYY-MM)
    const byMonth = new Map<string, { collected: number; remitted: number }>();
    for (const t of txns) {
      const d = t.createDate ? new Date(t.createDate) : null;
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(key)) byMonth.set(key, { collected: 0, remitted: 0 });
      const m = byMonth.get(key)!;
      if (t.type === 1) m.collected += Number(t.amount);
      else if (t.type === -1) m.remitted += Number(t.amount);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = [...byMonth.entries()]
      .map(([month, v]) => {
        const [y, mo] = month.split('-').map(Number);
        // กำหนดนำส่ง = วันที่ 7 ของเดือนถัดไป
        const deadline = new Date(y, mo, 7); // mo (1-12) → index mo = เดือนถัดไป
        deadline.setHours(0, 0, 0, 0);
        const outstanding = v.collected - v.remitted;
        const MS = 24 * 60 * 60 * 1000;
        const daysToDeadline = Math.round(
          (deadline.getTime() - today.getTime()) / MS,
        );
        let status: 'remitted' | 'overdue' | 'due_soon' | 'pending' = 'pending';
        if (outstanding <= 0.005) status = 'remitted';
        else if (daysToDeadline < 0) status = 'overdue';
        else if (daysToDeadline <= 7) status = 'due_soon';
        return {
          month,
          collected: Math.round(v.collected * 100) / 100,
          remitted: Math.round(v.remitted * 100) / 100,
          outstanding: Math.round(outstanding * 100) / 100,
          deadline: deadline.toISOString().slice(0, 10),
          days_to_deadline: daysToDeadline,
          status,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    const needAction = rows.filter(
      (r) => r.status === 'overdue' || r.status === 'due_soon',
    );
    return {
      data: rows,
      count: rows.length,
      need_action: needAction.length,
      overdue: rows.filter((r) => r.status === 'overdue').length,
    };
  }

  async loadBudgetType() {
    const budgetTypes = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    return budgetTypes.map((type) => ({
      bg_type_id: type.bgTypeId,
      budget_type: type.budgetType,
      bg_type_name: type.budgetType, // alias ที่ dropdown ฝั่ง frontend ใช้แสดงผล
      budget_borrow_type: type.budgetBorrowType, // Frontend needs this for template selection
    }));
  }

  async loadRegisterControlMoneyType(
    bgTypeId: number,
    scId: number,
    syId: number,
    year: string,
  ) {
    // Load financial transactions for this budget type
    const transactions = await this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere(syId ? 'ft.sy_id = :syId' : '1=1', { syId })
      .andWhere('ft.bg_type_id = :bgTypeId', { bgTypeId })
      .orderBy('ft.create_date', 'ASC')
      .addOrderBy('ft.ft_id', 'ASC')
      .getMany();

    // Get budget type name
    const budgetType = await this.budgetIncomeTypeRepository.findOne({
      where: { bgTypeId },
    });

    // ── ยอดยกมาต้นปี (opening_balance) ของประเภทเงินนี้ ─────────────────────
    // money_type_id = bg_type_id ; storage_type 1=เงินสด 2=ธนาคาร 3=ฝากสพป.
    const openingRows = await this.openingBalanceRepository.find({
      where: syId
        ? { scId, syId, moneyTypeId: bgTypeId, del: 0 }
        : { scId, moneyTypeId: bgTypeId, del: 0 },
    });
    const openingCash = openingRows
      .filter((o) => o.storageType === 1)
      .reduce((s, o) => s + Number(o.amount || 0), 0);
    const openingBank = openingRows
      .filter((o) => o.storageType === 2 || o.storageType === 3)
      .reduce((s, o) => s + Number(o.amount || 0), 0);
    const openingTotal = openingCash + openingBank;

    // Return empty data if no transactions (แต่ยังแสดงยอดยกมา ถ้ามี)
    if (transactions.length === 0) {
      this.logger.debug(
        `No transactions found for bgTypeId: ${bgTypeId}, scId: ${scId}`,
      );
      return {
        bg_type_id: bgTypeId,
        sc_id: scId,
        sy_id: syId,
        year,
        carry_forward: openingTotal,
        data: [
          {
            budget_type: budgetType?.budgetType || '',
            transaction: [],
          },
        ],
      };
    }

    // Process transactions — เริ่มจากยอดยกมาต้นปี
    let balance = openingTotal;
    let cashBalance = openingCash;
    let bankBalance = openingBank;
    const processedTransactions: RegisterTransaction[] = [];

    for (const trans of transactions) {
      let receiveDetail: Record<string, unknown> | null = null;
      let payDetail: Record<string, unknown> | null = null;
      let receiveMoneyType: number | null = null;

      if (trans.type === 1 && trans.prId > 0) {
        // Income - load receive and detail
        const receive = await this.plnReceiveRepository.findOne({
          where: { prId: trans.prId },
        });
        if (receive) {
          receiveMoneyType = receive.receiveMoneyType;
          // Load receive detail for prd_detail
          const receiveDetails = await this.plnReceiveDetailRepository.find({
            where: { prId: trans.prId, del: 0 },
          });
          const prdDetail =
            receiveDetails.length > 0 ? receiveDetails[0].prdDetail : null;

          receiveDetail = {
            pr_no: receive.prNo,
            receive_date: receive.receiveDate,
            receive_money_type: receive.receiveMoneyType,
            prd_detail: prdDetail,
            ft_id: trans.ftId, // Frontend expects ft_id
          };
        }
      } else if (trans.type === 1 && trans.prId === 0 && trans.rwId > 0) {
        // รับเข้าจากการหักภาษี ณ ที่จ่ายอัตโนมัติ (ไม่มีใบเสร็จ/ไม่มี pln_receive)
        const rw = await this.requestWithdrawRepository.findOne({
          where: { rwId: trans.rwId },
        });
        receiveDetail = {
          pr_no: rw?.noDoc ?? null,
          receive_date: trans.createDate,
          receive_money_type: null,
          prd_detail: rw
            ? `หักภาษี ณ ที่จ่าย — ${rw.detail ?? ''}`
            : 'หักภาษี ณ ที่จ่าย',
          ft_id: trans.ftId,
        };
      } else if (trans.type === -1 && trans.rwId > 0) {
        // Expense - load request withdraw
        const requestWithdraw = await this.requestWithdrawRepository.findOne({
          where: { rwId: trans.rwId },
        });
        if (requestWithdraw) {
          payDetail = {
            no_doc: requestWithdraw.noDoc,
            date_request: requestWithdraw.dateRequest,
            amount: trans.amount,
            detail: requestWithdraw.detail,
            check_no_doc: requestWithdraw.checkNoDoc,
            ft_id: trans.ftId, // Frontend expects ft_id
          };
        }
      }

      if (trans.type === 1) {
        balance += trans.amount;
        // Calculate cash/bank balance based on receive_money_type
        // 1 = เช็ค, 2 = เงินสด, 3 = เงินฝากธนาคาร
        if (receiveMoneyType === 2) {
          cashBalance += trans.amount;
        } else if (receiveMoneyType === 1 || receiveMoneyType === 3) {
          bankBalance += trans.amount;
        }
      } else if (trans.type === -1) {
        balance -= trans.amount;
        bankBalance -= trans.amount; // Payment usually from bank
      }

      processedTransactions.push({
        ft_id: trans.ftId,
        type: trans.type,
        amount: trans.amount,
        create_date: trans.createDate,
        update_date: trans.updateDate || trans.createDate, // Frontend expects update_date
        receive_general: receiveDetail, // Frontend expects receive_general
        receive: receiveDetail,
        pay: payDetail,
        receive_money_type: receiveMoneyType, // Add receive_money_type for frontend
        balance,
        cash: cashBalance,
        receive_bank: bankBalance,
      });
    }

    // Calculate totals
    const totalIncome = processedTransactions
      .filter((t) => t.type === 1)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = processedTransactions
      .filter((t) => t.type === -1)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCash = processedTransactions
      .filter((t) => t.receive_money_type === 2)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDeposit = processedTransactions
      .filter(
        (t) =>
          t.receive_money_type === null ||
          t.receive_money_type === 1 ||
          t.receive_money_type === 3,
      )
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      bg_type_id: bgTypeId,
      sc_id: scId,
      sy_id: syId,
      year,
      carry_forward: openingTotal, // ยอดยกมาต้นปี
      revenue: totalIncome, // Frontend expects revenue
      expenses: totalExpense, // Frontend expects expenses
      cash: totalCash, // Frontend expects cash
      deposit: totalDeposit, // Frontend expects deposit
      total: totalIncome - totalExpense, // Frontend expects total
      data: [
        {
          budget_type: budgetType?.budgetType || '',
          transaction: processedTransactions,
        },
      ],
    };
  }
}
