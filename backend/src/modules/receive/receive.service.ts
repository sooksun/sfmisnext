import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { PlnReceive } from './entities/pln-receive.entity';
import { PlnReceiveDetail } from './entities/pln-receive-detail.entity';
import { AddReceiveDto } from './dto/add-receive.dto';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { CashKeepingRecord } from '../cash-keeping/entities/cash-keeping-record.entity';
import { FinancialAuditService } from '../financial-audit/financial-audit.service';
import { Receipt } from '../receipt/entities/receipt.entity';
import { ReceiptBook } from '../receipt-book/entities/receipt-book.entity';

/**
 * Map receive_money_type → money_channel
 *   receive_money_type: 1=เช็ค, 2=เงินสด, 3=โอนเงิน
 *   money_channel:      1=cash, 2=bank
 * เงินสด (2) → cash ; เช็ค/โอน (1/3) → bank ; อื่น → cash (default)
 */
function mapReceiveChannel(
  receiveMoneyType: number | null | undefined,
): number {
  if (receiveMoneyType === 2) return 1;
  if (receiveMoneyType === 1 || receiveMoneyType === 3) return 2;
  return 1;
}

@Injectable()
export class ReceiveService {
  constructor(
    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepository: Repository<PlnReceive>,
    @InjectRepository(PlnReceiveDetail)
    private readonly plnReceiveDetailRepository: Repository<PlnReceiveDetail>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
    private readonly dataSource: DataSource,
    private readonly financialAuditService: FinancialAuditService,
  ) {}

  async loadReceive(scId: number, syId: number, budgetYear: string) {
    const receives = await this.plnReceiveRepository.find({
      where: {
        scId,
        syId,
        budgetYear,
        del: 0,
      },
      order: { prId: 'DESC' },
    });

    const result = await Promise.all(
      receives.map(async (receive) => {
        const details = await this.plnReceiveDetailRepository.find({
          where: {
            prId: receive.prId,
            del: 0,
          },
        });

        const totalBudget = details.reduce(
          (sum, detail) => sum + (detail.prdBudget || 0),
          0,
        );

        // Lookup budget type name
        let budgetTypeName = '';
        if (receive.receiveMoneyType) {
          const bt = await this.budgetIncomeTypeRepository.findOne({
            where: { bgTypeId: receive.receiveMoneyType },
          });
          if (bt) budgetTypeName = bt.budgetType;
        }

        return {
          pr_id: receive.prId,
          rw_id: receive.prId,
          pr_no: receive.prNo,
          sc_id: receive.scId,
          receive_form: receive.receiveForm,
          sy_id: receive.syId,
          budget_year: receive.budgetYear,
          user_receive: receive.userReceive,
          receive_money_type: receive.receiveMoneyType,
          budget_type_id: receive.receiveMoneyType,
          budget_type_name: budgetTypeName,
          receive_date: receive.receiveDate,
          amount: totalBudget,
          note: receive.receiveForm,
          cf_transaction: receive.cfTransaction,
          up_by: receive.upBy,
          up_date: receive.updateDate,
          del: receive.del,
          create_date: receive.createDate,
          update_date: receive.updateDate,
          total_budget: totalBudget,
          pln_receive_detail: {
            data: details.map((detail) => ({
              prd_id: detail.prdId,
              pr_id: detail.prId,
              bg_type_id: detail.bgTypeId,
              prd_detail: detail.prdDetail,
              prd_budget: detail.prdBudget,
              up_by: detail.upBy,
              del: detail.del,
              create_date: detail.createDate,
              update_date: detail.updateDate,
            })),
          },
        };
      }),
    );

    return result;
  }

  async loadAutoAddReceive(scId: number, syId: number) {
    // Get the last pr_no for this school and year
    const lastReceive = await this.plnReceiveRepository.findOne({
      where: {
        scId,
        syId,
        del: 0,
      },
      order: { prId: 'DESC' },
    });

    let nextPrNo = 1;
    if (lastReceive && lastReceive.prNo) {
      // Try to parse the last pr_no as number
      const lastPrNo = parseInt(lastReceive.prNo, 10);
      if (!isNaN(lastPrNo)) {
        nextPrNo = lastPrNo + 1;
      }
    }

    return { pr_no: nextPrNo };
  }

  async loadDirector(scId: number) {
    // Load admin users with type = 8 (หัวหน้าการเงิน)
    const directors = await this.adminRepository.find({
      where: {
        scId,
        type: 8,
        del: 0,
      },
      order: { adminId: 'ASC' },
    });

    return directors.map((admin) => ({
      admin_id: admin.adminId,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      type: admin.type,
      sc_id: admin.scId,
    }));
  }

  async loadBudgetIncomeType() {
    const items = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    return items.map((item) => ({
      bg_type_id: item.bgTypeId,
      budget_type_id: item.bgTypeId,
      budget_type: item.budgetType,
      budget_type_name: item.budgetType,
      del: item.del,
    }));
  }

  async loadReceiveById(prId: number, scId: number) {
    const receive = await this.plnReceiveRepository.findOne({
      where: { prId, scId, del: 0 },
    });
    if (!receive) return null;

    const details = await this.plnReceiveDetailRepository.find({
      where: { prId, del: 0 },
    });

    // batch load budget type names
    const bgTypeIds = [
      ...new Set(details.map((d) => d.bgTypeId).filter(Boolean)),
    ] as number[];
    const btList = bgTypeIds.length
      ? await this.budgetIncomeTypeRepository.find({
          where: { bgTypeId: In(bgTypeIds) },
        })
      : [];
    const btMap = new Map(btList.map((b) => [b.bgTypeId, b.budgetType]));

    // เล่มที่ — จากเล่มใบเสร็จที่ใช้งานอยู่ (receipt_book status=1)
    let bookNo: string | null = null;
    try {
      const [book] = await this.dataSource.query(
        `SELECT book_code FROM receipt_book
         WHERE sc_id=? AND status=1 AND del=0 ORDER BY rb_id DESC LIMIT 1`,
        [scId],
      );
      bookNo = book?.book_code ?? null;
    } catch {
      /* ไม่มีเล่ม — ปล่อยว่าง */
    }

    return {
      pr_id: receive.prId,
      pr_no: receive.prNo,
      book_no: bookNo,
      sc_id: receive.scId,
      sy_id: receive.syId,
      budget_year: receive.budgetYear,
      receive_form: receive.receiveForm,
      receive_money_type: receive.receiveMoneyType,
      receive_date: receive.receiveDate,
      cf_transaction: receive.cfTransaction,
      up_by: receive.upBy,
      details: details.map((d) => ({
        prd_id: d.prdId,
        bg_type_id: d.bgTypeId,
        bg_type_name: btMap.get(d.bgTypeId!) ?? '',
        prd_detail: d.prdDetail,
        prd_budget: d.prdBudget ?? 0,
      })),
      total: details.reduce((s, d) => s + (d.prdBudget ?? 0), 0),
    };
  }

  async addReceive(dto: AddReceiveDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
      // Create or update pln_receive
      let receive: PlnReceive;
      if (dto.pr_id && dto.pr_id > 0) {
        const foundReceive = await manager.findOne(PlnReceive, {
          where: { prId: dto.pr_id, del: 0 },
        });
        if (!foundReceive) {
          return { flag: false, ms: 'ไม่พบข้อมูลการรับเงิน' };
        }
        receive = foundReceive;
      } else {
        receive = manager.create(PlnReceive, {});
      }

      receive.prNo = dto.pr_no ?? null;
      receive.scId = dto.sc_id;
      receive.receiveForm = dto.receive_form ?? dto.note ?? null;
      receive.syId = dto.sy_id;
      receive.budgetYear = dto.budget_year;
      receive.userReceive = dto.user_receive ?? 0;
      receive.receiveMoneyType =
        dto.receive_money_type ?? dto.budget_type_id ?? 0;
      receive.receiveDate = new Date(dto.receive_date);
      receive.cfTransaction = dto.cf_transaction ?? 0;
      receive.upBy = dto.up_by ?? null;

      await manager.save(PlnReceive, receive);

      // Handle receive details - support both receiveList array and flat amount
      const receiveList = dto.receiveList ?? [];

      if (receiveList.length === 0 && dto.amount && receive.receiveMoneyType) {
        const detail = manager.create(PlnReceiveDetail, { prId: receive.prId });
        detail.bgTypeId = receive.receiveMoneyType;
        detail.prdDetail = receive.receiveForm ?? null;
        detail.prdBudget = Number(dto.amount);
        detail.upBy = receive.upBy ?? null;
        await manager.save(PlnReceiveDetail, detail);
      }

      for (const detailItem of receiveList) {
        let detail: PlnReceiveDetail;
        if (detailItem.prd_id && detailItem.prd_id > 0) {
          const foundDetail = await manager.findOne(PlnReceiveDetail, {
            where: { prdId: detailItem.prd_id, del: 0 },
          });
          if (!foundDetail) continue;
          detail = foundDetail;
        } else {
          detail = manager.create(PlnReceiveDetail, { prId: receive.prId });
        }
        detail.bgTypeId = detailItem.bg_type_id;
        detail.prdDetail = detailItem.prd_detail || null;
        detail.prdBudget = detailItem.prd_budget;
        detail.upBy = detailItem.up_by ?? null;
        await manager.save(PlnReceiveDetail, detail);
      }

      // Handle deleted details
      for (const detailItem of dto.receiveList_del ?? []) {
        if (detailItem.prd_id && detailItem.prd_id > 0) {
          const detail = await manager.findOne(PlnReceiveDetail, {
            where: { prdId: detailItem.prd_id, del: 0 },
          });
          if (detail) {
            detail.del = 1;
            await manager.save(PlnReceiveDetail, detail);
          }
        }
      }

      // ── Sync financial_transactions (ledger) ──────────────────────────
      // ลบ transactions เก่าของ receive นี้ (กรณี update) แล้วสร้างใหม่ตาม detail
      await manager
        .createQueryBuilder()
        .update(FinancialTransactions)
        .set({ del: 1 })
        .where('pr_id = :prId AND type = 1 AND del = :del', {
          prId: receive.prId,
          del: 0,
        })
        .execute();

      const channel = mapReceiveChannel(receive.receiveMoneyType);
      const activeDetails = await manager.find(PlnReceiveDetail, {
        where: { prId: receive.prId, del: 0 },
      });
      for (const d of activeDetails) {
        const ft = manager.create(FinancialTransactions, {
          type: 1,
          bgTypeId: d.bgTypeId ?? 0,
          amount: Number(d.prdBudget ?? 0),
          scId: receive.scId ?? 0,
          syId: receive.syId ?? null,
          budgetYear: receive.budgetYear ? Number(receive.budgetYear) : null,
          upBy: receive.upBy ?? 0,
          prId: receive.prId,
          prdId: d.prdId,
          rwId: 0,
          prbId: 0,
          moneyChannel: channel,
          baId: null,
          del: 0,
          createDate: receive.receiveDate ?? new Date(),
          updateDate: new Date(),
        });
        await manager.save(FinancialTransactions, ft);
      }

      // ── อัตโนมัติ: รับเงินสด → สร้างบันทึกการเก็บรักษาเงินสด ─────────────
      // receive_money_type 2 = เงินสด ; สร้าง 1 ฉบับต่อรายการรับเงินสด
      if (receive.receiveMoneyType === 2) {
        const cashTotal = activeDetails.reduce(
          (s, d) => s + Number(d.prdBudget ?? 0),
          0,
        );
        if (cashTotal > 0) {
          await this.createCashKeeping(manager, receive, cashTotal);
        }
      }

      // ── ออกใบเสร็จ บร. + เดินเลขเล่ม (จุดเดียวที่รับเงิน — one-step) ────────
      // ออกเฉพาะตอน "สร้างใหม่" และเมื่อมีเล่มใบเสร็จเปิดใช้อยู่ (lock กันเลขซ้ำ)
      let issuedRNo: string | null = null;
      const isNew = !(dto.pr_id && dto.pr_id > 0);
      if (isNew) {
        const book = await manager.findOne(ReceiptBook, {
          where: {
            scId: dto.sc_id,
            syId: dto.sy_id,
            budgetYear: dto.budget_year,
            status: 1,
            del: 0,
          },
          order: { rbId: 'DESC' },
          lock: { mode: 'pessimistic_write' },
        });
        if (book && book.currentNo <= book.toNo) {
          const bookNo = book.bookCode ?? String(book.rbId);
          const receiptNo = book.currentNo;
          issuedRNo = `บร. เล่มที่ ${bookNo} เลขที่ ${receiptNo}`;
          const receiptRow = manager.create(Receipt, {
            rNo: issuedRNo,
            bookNo,
            receiptNo,
            detail: receive.receiveForm ?? 'รับเงิน',
            prId: String(receive.prId),
            dateGenerate: receive.receiveDate ?? new Date(),
            status: '1',
            syId: receive.syId,
            year: receive.budgetYear,
            scId: receive.scId,
            upBy: receive.upBy ?? 0,
          });
          await manager.save(Receipt, receiptRow);
          // สะท้อนเลขที่ในเล่มลงบน pln_receive
          receive.prNo = String(receiptNo);
          await manager.save(PlnReceive, receive);
          // เดินเลขถัดไป + ปิดเล่มอัตโนมัติถ้าหมด
          book.currentNo += 1;
          if (book.currentNo > book.toNo) {
            book.status = 2;
            book.closedDate = new Date().toISOString().substring(0, 10);
          }
          await manager.save(ReceiptBook, book);
        }
      }

      return {
        flag: true,
        ms: issuedRNo
          ? `บันทึกและออกใบเสร็จ ${issuedRNo} เรียบร้อยแล้ว`
          : 'บันทึกเรียบร้อยแล้ว',
      };
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'บันทึกการรับเงินไม่สำเร็จ';
      return { flag: false, ms: message };
    }
  }

  /**
   * สร้างบันทึกการเก็บรักษาเงินสดอัตโนมัติ
   *  ผู้ส่งมอบ = ผู้รับเงิน (เจ้าหน้าที่การเงิน) ; ผู้รับเก็บรักษา = ผอ. (type 1/2)
   *  กันซ้ำ: 1 ฉบับต่อ pr_id (ผูกใน note)
   */
  private async createCashKeeping(
    manager: import('typeorm').EntityManager,
    receive: PlnReceive,
    amount: number,
  ): Promise<void> {
    const ckRepo = manager.getRepository(CashKeepingRecord);
    const refNote = `[auto pr:${receive.prId}]`;
    const exists = await ckRepo
      .createQueryBuilder('ck')
      .where('ck.sc_id = :sc', { sc: receive.scId })
      .andWhere('ck.note LIKE :n', { n: `%${refNote}%` })
      .andWhere('ck.del = 0')
      .getCount();
    if (exists > 0) return;

    const senderId = receive.userReceive || receive.upBy || 0;
    // ผู้รับเก็บรักษา = ผู้อำนวยการ (admin type 1 หรือ 2) ของโรงเรียน
    const director = await this.adminRepository.findOne({
      where: [
        { scId: receive.scId ?? 0, type: 1, del: 0 },
        { scId: receive.scId ?? 0, type: 2, del: 0 },
      ],
      order: { type: 'ASC', adminId: 'ASC' },
    });
    const receiverId = director?.adminId || senderId;

    const snap = async (id: number) => {
      if (!id)
        return { name: null as string | null, pos: null as string | null };
      const a = await this.adminRepository.findOne({ where: { adminId: id } });
      return {
        name: a?.name ?? a?.username ?? null,
        pos: a?.position != null ? String(a.position) : null,
      };
    };
    const s = await snap(senderId);
    const r = await snap(receiverId);

    const recordDate = (
      receive.receiveDate ? new Date(receive.receiveDate) : new Date()
    )
      .toISOString()
      .slice(0, 10);

    await ckRepo.save(
      ckRepo.create({
        scId: receive.scId ?? 0,
        syId: receive.syId ?? 0,
        recordDate,
        amount,
        moneyDetail: `รับเงินสดตามใบเสร็จ ${receive.prNo ?? ''}`.trim(),
        senderId,
        senderName: s.name,
        senderPosition: s.pos,
        receiverId,
        receiverName: r.name,
        receiverPosition: r.pos,
        note: `สร้างอัตโนมัติจากการรับเงินสด ${refNote}`,
        status: 1,
        upBy: receive.upBy ?? 0,
        del: 0,
      }),
    );
  }

  async deleteReceive(prId: number, scId: number, upBy?: number) {
    return this.dataSource.transaction(async (manager) => {
      const receive = await manager.findOne(PlnReceive, {
        where: { prId, scId, del: 0 },
        lock: { mode: 'pessimistic_write' },
      });
      if (!receive) return { flag: false, ms: 'ไม่พบข้อมูลการรับเงิน' };

      const dateStr = receive.receiveDate
        ? receive.receiveDate instanceof Date
          ? receive.receiveDate.toISOString().slice(0, 10)
          : String(receive.receiveDate).slice(0, 10)
        : null;
      if (dateStr) {
        const locked = await this.financialAuditService.isDateLocked(
          scId,
          dateStr,
        );
        if (locked) {
          return {
            flag: false,
            ms: `วันที่ ${dateStr} ถูกลงนามแล้ว ไม่สามารถลบรายการรับเงินได้`,
          };
        }
      }

      await manager.update(PlnReceiveDetail, { prId, del: 0 }, { del: 1 });
      await manager
        .createQueryBuilder()
        .update(FinancialTransactions)
        .set({ del: 1 })
        .where('pr_id = :prId AND type = 1 AND del = :del', { prId, del: 0 })
        .execute();
      receive.del = 1;
      if (upBy !== undefined) receive.upBy = upBy;
      await manager.save(PlnReceive, receive);
      return { flag: true, ms: 'ลบข้อมูลการรับเงินเรียบร้อยแล้ว' };
    });
  }
}
