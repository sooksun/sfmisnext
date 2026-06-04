import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { DocumentCounter } from './entities/document-counter.entity';
import { GetNextNumberDto, ResetCounterDto } from './dto/doc-counter.dto';

/**
 * แมปรหัสเอกสาร → คำนำหน้าภาษาไทย ตามระเบียบควบคุมเงินหน่วยงานย่อย 2544
 *  บร. = ใบเสร็จ/หลักฐานรับเงิน   บค. = เบิกเงินสด (ใบสำคัญ)   บจ. = จ่ายเช็ค/ธนาคาร
 *  บย. = สัญญายืมเงิน            บง. = นำส่งเงินรายได้แผ่นดิน   บฝ. = นำฝากส่วนราชการผู้เบิก
 *  บถ. = เบิกถอนส่วนราชการผู้เบิก  บก. = ภาษีหัก ณ ที่จ่าย
 */
export const DOC_TYPE_PREFIX: Record<string, string> = {
  BR: 'บร.',
  BC: 'บค.',
  BJ: 'บจ.',
  BY: 'บย.',
  BG: 'บง.',
  BF: 'บฝ.',
  BT: 'บถ.',
  BK: 'บก.',
};

const ALL_DOC_TYPES = ['BR', 'BC', 'BJ', 'BY', 'BG', 'BF', 'BT', 'BK'];

@Injectable()
export class DocCounterService {
  constructor(private readonly dataSource: DataSource) {}

  /** จัด format เลขที่เอกสารภาษาไทย เช่น บค.12/2569 */
  static format(docType: string, seq: number, budgetYear: string): string {
    const prefix = DOC_TYPE_PREFIX[docType] ?? docType;
    return `${prefix}${seq}/${budgetYear}`;
  }

  /**
   * ออกเลขที่เอกสารถัดไป "ภายใน transaction ที่มีอยู่แล้ว" (atomic ด้วย row lock)
   * ใช้โดย service อื่นที่กำลังอยู่ใน dataSource.transaction(...)
   */
  async issueWithin(
    manager: EntityManager,
    scId: number,
    budgetYear: string,
    docType: string,
  ): Promise<{ seq: number; formatted: string }> {
    let row = await manager.findOne(DocumentCounter, {
      where: { scId, budgetYear, docType },
      lock: { mode: 'pessimistic_write' },
    });
    if (!row) {
      row = manager.create(DocumentCounter, {
        scId,
        budgetYear,
        docType,
        lastNo: 0,
      });
      await manager.save(DocumentCounter, row);
      row = await manager.findOne(DocumentCounter, {
        where: { scId, budgetYear, docType },
        lock: { mode: 'pessimistic_write' },
      });
    }
    row!.lastNo += 1;
    await manager.save(DocumentCounter, row!);
    return {
      seq: row!.lastNo,
      formatted: DocCounterService.format(docType, row!.lastNo, budgetYear),
    };
  }

  /** ออกเลขที่เอกสารถัดไป (เปิด transaction เอง) — สำหรับ caller ที่ไม่มี transaction */
  async issue(
    scId: number,
    budgetYear: string,
    docType: string,
  ): Promise<{ seq: number; formatted: string }> {
    return this.dataSource.transaction((em) =>
      this.issueWithin(em, scId, budgetYear, docType),
    );
  }

  /** ดึงเลขที่ถัดไป พร้อม lock row เพื่อป้องกัน race condition */
  async getNextNumber(dto: GetNextNumberDto) {
    const { sc_id, budget_year, doc_type } = dto;
    const repo = this.dataSource.getRepository(DocumentCounter);
    const qr = this.dataSource.createQueryRunner();

    await qr.connect();
    await qr.startTransaction();
    try {
      // upsert row ถ้ายังไม่มี แล้ว lock
      let row = await qr.manager.findOne(DocumentCounter, {
        where: { scId: sc_id, budgetYear: budget_year, docType: doc_type },
        lock: { mode: 'pessimistic_write' },
      });

      if (!row) {
        // สร้าง row ใหม่ (ยังไม่มีใน transaction) แล้ว lock ใหม่อีกครั้ง
        const newRow = qr.manager.create(DocumentCounter, {
          scId: sc_id,
          budgetYear: budget_year,
          docType: doc_type,
          lastNo: 0,
        });
        await qr.manager.save(DocumentCounter, newRow);
        row = await qr.manager.findOne(DocumentCounter, {
          where: { scId: sc_id, budgetYear: budget_year, docType: doc_type },
          lock: { mode: 'pessimistic_write' },
        });
      }

      row!.lastNo += 1;
      await qr.manager.save(DocumentCounter, row!);
      await qr.commitTransaction();

      const next_no = row!.lastNo;
      const prefix = DOC_TYPE_PREFIX[doc_type] ?? doc_type;
      const formatted = `${prefix}${next_no}/${budget_year}`;

      return { flag: true, ms: 'success', data: { next_no, formatted } };
    } catch (error: unknown) {
      await qr.rollbackTransaction();
      const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      return { flag: false, ms: msg };
    } finally {
      await qr.release();
    }
  }

  /** โหลดสรุปทุก doc_type สำหรับโรงเรียน + ปีงบประมาณ (คืน 4 rows เสมอ) */
  async loadCounters(scId: number, budgetYear: string) {
    const repo = this.dataSource.getRepository(DocumentCounter);
    const rows = await repo.find({ where: { scId, budgetYear } });

    const map = new Map(rows.map((r) => [r.docType, r]));

    const data = ALL_DOC_TYPES.map((docType) => {
      const row = map.get(docType);
      const lastNo = row?.lastNo ?? 0;
      const prefix = DOC_TYPE_PREFIX[docType] ?? docType;
      return {
        doc_type: docType,
        last_no: lastNo,
        next_no: lastNo + 1,
        formatted_next: `${prefix}${lastNo + 1}/${budgetYear}`,
        budget_year: budgetYear,
      };
    });

    return { data, count: data.length };
  }

  /** รีเซ็ต (หรือตั้งค่า) last_no ของ row */
  async resetCounter(dto: ResetCounterDto) {
    const { sc_id, budget_year, doc_type, reset_to } = dto;
    const repo = this.dataSource.getRepository(DocumentCounter);

    let row = await repo.findOne({
      where: { scId: sc_id, budgetYear: budget_year, docType: doc_type },
    });

    if (!row) {
      row = repo.create({
        scId: sc_id,
        budgetYear: budget_year,
        docType: doc_type,
        lastNo: reset_to,
      });
    } else {
      row.lastNo = reset_to;
    }

    await repo.save(row);
    return {
      flag: true,
      ms: `รีเซ็ตเลขที่เอกสาร ${doc_type} เป็น ${reset_to} เรียบร้อยแล้ว`,
    };
  }
}
