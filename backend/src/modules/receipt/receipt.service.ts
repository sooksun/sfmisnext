import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Receipt } from './entities/receipt.entity';
import { AddReceiptDto } from './dto/add-receipt.dto';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { FinancialAuditService } from '../financial-audit/financial-audit.service';

@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepository: Repository<PlnReceive>,
    @InjectRepository(PlnReceiveDetail)
    private readonly plnReceiveDetailRepository: Repository<PlnReceiveDetail>,
    private readonly financialAuditService: FinancialAuditService,
  ) {}

  async loadReceipt(scId: number, yId: number, year: string) {
    const yearStr = year ? String(year) : '';

    const rows = await this.receiptRepository
      .createQueryBuilder('r')
      .leftJoin('pln_receive', 'pr', 'pr.pr_id = r.pr_id')
      .where('r.sc_id = :scId', { scId })
      .andWhere('r.sy_id = :yId', { yId })
      .andWhere('r.year = :yearStr', { yearStr })
      .andWhere('r.status = :status', { status: '1' })
      .select('r.r_id', 'r_id')
      .addSelect('r.r_no', 'r_no')
      .addSelect('r.detail', 'detail')
      .addSelect('r.pr_id', 'pr_id')
      .addSelect('r.date_generate', 'date_generate')
      .addSelect('r.status', 'status')
      .addSelect('r.sy_id', 'sy_id')
      .addSelect('r.year', 'year')
      .addSelect('r.sc_id', 'sc_id')
      .addSelect('r.up_by', 'up_by')
      .addSelect('r.update_date', 'up_date')
      .addSelect('pr.receive_form', 'receive_form')
      .orderBy('r.r_id', 'DESC')
      .getRawMany();

    if (rows.length === 0) return [];

    // H5: คำนวณ total_budget จาก pln_receive_detail แทน hard-code 0
    const prIds = [...new Set(rows.map((r) => r.pr_id).filter(Boolean))];
    let totalBudgetMap = new Map<number, number>();
    if (prIds.length > 0) {
      const details = await this.plnReceiveDetailRepository.find({
        where: { prId: In(prIds), del: 0 },
      });
      for (const d of details) {
        const prev = totalBudgetMap.get(d.prId) ?? 0;
        totalBudgetMap.set(d.prId, prev + Number(d.prdBudget || 0));
      }
    }

    return rows.map((r) => ({
      ...r,
      receive_form: r.receive_form ?? '',
      total_budget: totalBudgetMap.get(r.pr_id) ?? 0,
    }));
  }

  async loadReceive(scId: number, syId: number, year: string) {
    // 1) ดึง receives ทั้งหมดใน 1 query
    const receives = await this.plnReceiveRepository.find({
      where: {
        scId,
        syId,
        budgetYear: year,
        del: 0,
        cfTransaction: 1, // Only confirmed transactions
      },
      order: { prId: 'DESC' },
    });

    if (receives.length === 0) return [];

    // 2) ดึง details ทั้งหมดใน 1 query (แทน N queries)
    const prIds = receives.map((r) => r.prId);
    const allDetails = await this.plnReceiveDetailRepository.find({
      where: { prId: In(prIds), del: 0 },
    });

    // 3) Group details by prId ใน memory
    const detailsByPrId = new Map<number, PlnReceiveDetail[]>();
    for (const d of allDetails) {
      const arr = detailsByPrId.get(d.prId);
      if (arr) arr.push(d);
      else detailsByPrId.set(d.prId, [d]);
    }

    // 4) Map ผลลัพธ์
    return receives.map((receive) => {
      const details = detailsByPrId.get(receive.prId) ?? [];
      const totalBudget = details.reduce(
        (sum, detail) => sum + (detail.prdBudget || 0),
        0,
      );

      return {
        pr_id: receive.prId,
        pr_no: receive.prNo,
        receive_form: receive.receiveForm,
        receive_date: receive.receiveDate,
        total_budget: totalBudget,
        detail_data: details.map((detail) => ({
          prd_id: detail.prdId,
          bg_type_id: detail.bgTypeId,
          prd_detail: detail.prdDetail,
          prd_budget: detail.prdBudget,
        })),
      };
    });
  }

  async addReceipt(dto: AddReceiptDto) {
    const receipt = this.receiptRepository.create({
      rNo: dto.r_no,
      detail: dto.detail,
      prId: dto.pr_id,
      dateGenerate: new Date(dto.date_generate),
      status: dto.status || '1',
      syId: dto.sy_id,
      year: dto.year,
      scId: dto.sc_id,
      upBy: dto.up_by || 0,
    });

    await this.receiptRepository.save(receipt);

    return { flag: true };
  }

  async updateReceipt(dto: AddReceiptDto) {
    if (!dto.r_id) {
      return { flag: false, ms: 'ไม่พบ r_id' };
    }

    const receipt = await this.receiptRepository.findOne({
      where: { rId: dto.r_id, status: '1' },
    });

    if (!receipt) {
      return { flag: false, ms: 'ไม่พบข้อมูลใบเสร็จ' };
    }

    receipt.rNo = dto.r_no;
    receipt.detail = dto.detail;
    receipt.prId = dto.pr_id;
    receipt.dateGenerate = new Date(dto.date_generate);
    receipt.status = dto.status || receipt.status;
    receipt.upBy = dto.up_by || receipt.upBy;

    await this.receiptRepository.save(receipt);

    return { flag: true };
  }

  async removeReceipt(rId: number, scId: number) {
    const receipt = await this.receiptRepository.findOne({
      where: { rId, scId, status: '1' },
    });

    if (!receipt) {
      return { flag: false, ms: 'ไม่พบข้อมูลใบเสร็จ' };
    }

    // M2: ตรวจ FinancialAudit lock ก่อนลบ
    if (receipt.dateGenerate) {
      const dateStr =
        receipt.dateGenerate instanceof Date
          ? receipt.dateGenerate.toISOString().slice(0, 10)
          : String(receipt.dateGenerate).slice(0, 10);
      const locked = await this.financialAuditService.isDateLocked(
        scId,
        dateStr,
      );
      if (locked) {
        return {
          flag: false,
          ms: `วันที่ ${dateStr} ถูกลงนามแล้ว ไม่สามารถลบใบเสร็จได้`,
        };
      }
    }

    receipt.status = '0';
    await this.receiptRepository.save(receipt);
    return { flag: true };
  }
}
