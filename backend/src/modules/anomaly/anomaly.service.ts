import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { budgetYearBEOf } from '../../common/utils/year.util';

export interface AnomalyWarning {
  code: string;
  field?: string;
  message: string;
  severity: 'warning' | 'info';
}

export interface PrecheckInput {
  sc_id: number;
  budget_year: string;
  module?: string;
  payload: Record<string, unknown>;
}

const AMOUNT_KEY = /amount|total|sum|baht|price|วงเงิน|จำนวนเงิน|ยอด/i;
const DATE_KEY = /date|วันที่/i;
const CASH_MODULES = /receive|receipt|cash|รับเงิน|ใบเสร็จ/i;
const MS_DAY = 86400000;

/**
 * ตรวจค่าผิดปกติขณะกรอก (L2 warn) — deterministic ไม่ใช้ AI
 * คืนคำเตือนให้ frontend แสดงก่อนบันทึก (ยังบันทึกได้ ไม่ใช่ block)
 */
@Injectable()
export class AnomalyService {
  constructor(
    @InjectRepository(FinancialTransactions)
    private readonly ftRepo: Repository<FinancialTransactions>,
  ) {}

  async precheck(input: PrecheckInput): Promise<{ warnings: AnomalyWarning[] }> {
    const { payload } = input;
    const warnings: AnomalyWarning[] = [];
    const now = new Date();

    // ── ตรวจวันที่ ──
    for (const { field, date } of this.extractDates(payload)) {
      if (date.getTime() > now.getTime() + MS_DAY) {
        warnings.push({
          code: 'DATE_FUTURE',
          field,
          severity: 'warning',
          message: `วันที่ (${field}) เป็นอนาคต — โปรดตรวจสอบความถูกต้อง`,
        });
      } else if (now.getTime() - date.getTime() > 30 * MS_DAY) {
        const days = Math.floor((now.getTime() - date.getTime()) / MS_DAY);
        warnings.push({
          code: 'DATE_OLD',
          field,
          severity: 'warning',
          message: `วันที่ (${field}) ย้อนหลัง ${days} วัน — บันทึกย้อนหลังนานผิดปกติ`,
        });
      }
      if (input.budget_year) {
        const by = budgetYearBEOf(date);
        if (String(by) !== String(input.budget_year)) {
          warnings.push({
            code: 'YEAR_MISMATCH',
            field,
            severity: 'warning',
            message: `วันที่ (${field}) อยู่ในปีงบประมาณ ${by} แต่กำลังทำงานปีงบ ${input.budget_year}`,
          });
        }
      }
      if (CASH_MODULES.test(input.module ?? '') && (date.getDay() === 0 || date.getDay() === 6)) {
        warnings.push({
          code: 'WEEKEND',
          field,
          severity: 'info',
          message: `วันที่ (${field}) ตรงกับวันหยุดเสาร์-อาทิตย์ — ตรวจสอบการรับเงินนอกวันทำการ`,
        });
      }
    }

    // ── ตรวจจำนวนเงิน ──
    const amt = this.extractAmount(payload);
    if (amt && amt.value > 0) {
      const stats = await this.amountBaseline(input.sc_id);
      const threshold = Math.max(stats.p95 * 3, 100000);
      if (amt.value > threshold) {
        warnings.push({
          code: 'AMOUNT_HIGH',
          field: amt.field,
          severity: 'warning',
          message: `ยอดเงิน ${amt.value.toLocaleString()} บาท สูงผิดปกติ (ปกติไม่เกิน ~${Math.round(stats.p95).toLocaleString()} บาท) — โปรดตรวจจำนวนศูนย์/ทศนิยม`,
        });
      }
      if (amt.value >= 1000000 && amt.value % 100000 === 0) {
        warnings.push({
          code: 'AMOUNT_ROUND',
          field: amt.field,
          severity: 'info',
          message: `ยอดเงินเป็นจำนวนกลม ${amt.value.toLocaleString()} บาท — ตรวจสอบว่าไม่ได้พิมพ์ศูนย์เกิน`,
        });
      }
      // อาจบันทึกซ้ำ: ยอดเดียวกัน วันเดียวกัน มีอยู่แล้ว
      const dupDate = this.extractDates(payload)[0]?.date;
      if (dupDate) {
        const dup = await this.findDuplicate(input.sc_id, amt.value, dupDate);
        if (dup) {
          warnings.push({
            code: 'MAYBE_DUP',
            field: amt.field,
            severity: 'warning',
            message: `พบรายการยอด ${amt.value.toLocaleString()} บาท วันที่เดียวกันในระบบแล้ว — อาจบันทึกซ้ำ`,
          });
        }
      }
    }

    return { warnings };
  }

  private extractDates(p: Record<string, unknown>): { field: string; date: Date }[] {
    const out: { field: string; date: Date }[] = [];
    for (const [k, v] of Object.entries(p)) {
      if (!DATE_KEY.test(k) || typeof v !== 'string' || !v) continue;
      const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v);
      if (!isNaN(d.getTime())) out.push({ field: k, date: d });
    }
    return out;
  }

  private extractAmount(p: Record<string, unknown>): { field: string; value: number } | null {
    for (const [k, v] of Object.entries(p)) {
      if (!AMOUNT_KEY.test(k)) continue;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (Number.isFinite(n)) return { field: k, value: n };
    }
    return null;
  }

  private async amountBaseline(scId: number): Promise<{ p95: number; count: number }> {
    const rows = await this.ftRepo.find({
      where: { scId, del: 0 },
      select: ['amount'],
      order: { ftId: 'DESC' },
      take: 500,
    });
    const vals = rows
      .map((r) => Math.abs(Number(r.amount) || 0))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    if (vals.length < 10) return { p95: 0, count: vals.length }; // ข้อมูลน้อย → ใช้เกณฑ์ขั้นต่ำคงที่
    const idx = Math.floor(vals.length * 0.95);
    return { p95: vals[Math.min(idx, vals.length - 1)], count: vals.length };
  }

  private async findDuplicate(scId: number, amount: number, date: Date): Promise<boolean> {
    const d = date.toISOString().slice(0, 10);
    const n = await this.ftRepo
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId AND ft.del = 0', { scId })
      .andWhere('ABS(ABS(ft.amount) - :amt) < 0.005', { amt: amount })
      .andWhere('DATE(ft.create_date) = :d', { d })
      .getCount();
    return n > 0;
  }
}
