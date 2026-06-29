import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface BackupMeta {
  sc_id: number;
  budget_year: number | null;
  exported_at: string;
  row_counts: Record<string, number>;
  total_rows: number;
}

export interface BackupPayload {
  meta: BackupMeta;
  tables: Record<string, unknown[]>;
}

@Injectable()
export class SchoolBackupService {
  private readonly logger = new Logger(SchoolBackupService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * ค้นทุกตารางที่มีคอลัมน์ sc_id และ export ข้อมูลของโรงเรียนนั้น
   * ถ้าระบุ budgetYear จะ filter ตาราง transaction ด้วย sy_id หรือ budget_year
   * ตารางที่ไม่มีคอลัมน์ปี จะ export ทั้งหมด (config / master)
   */
  async exportSchool(
    scId: number,
    budgetYear: number | null,
  ): Promise<BackupPayload> {
    const dbName: string = this.dataSource.options.database as string;

    // 1) หาตารางทั้งหมดที่มี sc_id
    const tablesWithScId = await this.dataSource.query<{ tbl: string }[]>(
      `SELECT TABLE_NAME AS tbl
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'sc_id'
       ORDER BY TABLE_NAME`,
      [dbName],
    );

    // 2) หาว่าแต่ละตารางมีคอลัมน์ปี (budget_year / sy_id) ไหม (สำหรับ filter)
    const yearColRows = await this.dataSource.query<
      { tbl: string; col: string }[]
    >(
      `SELECT TABLE_NAME AS tbl, COLUMN_NAME AS col
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME IN (${tablesWithScId.map(() => '?').join(',')})
         AND COLUMN_NAME IN ('budget_year', 'sy_id')
       ORDER BY TABLE_NAME, COLUMN_NAME`,
      [dbName, ...tablesWithScId.map((r) => r.tbl)],
    );

    // map: tableName → year column ที่จะใช้ filter (budget_year > sy_id)
    const yearColMap = new Map<string, string>();
    for (const r of yearColRows) {
      if (!yearColMap.has(r.tbl) || r.col === 'budget_year') {
        yearColMap.set(r.tbl, r.col);
      }
    }

    // 3) หา sy_id ที่ตรงกับ budgetYear (ถ้ามี)
    let syId: number | null = null;
    if (budgetYear) {
      const sy = await this.dataSource.query<{ sy_id: number }[]>(
        `SELECT sy_id FROM school_year WHERE sc_id = ? AND school_year = ? LIMIT 1`,
        [scId, budgetYear],
      );
      syId = sy[0]?.sy_id ?? null;
    }

    // 4) ดึงข้อมูลแต่ละตาราง
    const tables: Record<string, unknown[]> = {};
    const rowCounts: Record<string, number> = {};
    let totalRows = 0;

    for (const { tbl } of tablesWithScId) {
      try {
        let rows: unknown[];

        if (budgetYear && yearColMap.has(tbl)) {
          const col = yearColMap.get(tbl)!;
          if (col === 'budget_year') {
            rows = await this.dataSource.query(
              `SELECT * FROM \`${tbl}\` WHERE sc_id = ? AND budget_year = ?`,
              [scId, budgetYear],
            );
          } else {
            // sy_id — ใช้ได้เฉพาะเมื่อหา syId เจอ
            if (syId) {
              rows = await this.dataSource.query(
                `SELECT * FROM \`${tbl}\` WHERE sc_id = ? AND sy_id = ?`,
                [scId, syId],
              );
            } else {
              rows = await this.dataSource.query(
                `SELECT * FROM \`${tbl}\` WHERE sc_id = ?`,
                [scId],
              );
            }
          }
        } else {
          rows = await this.dataSource.query(
            `SELECT * FROM \`${tbl}\` WHERE sc_id = ?`,
            [scId],
          );
        }

        tables[tbl] = rows;
        rowCounts[tbl] = rows.length;
        totalRows += rows.length;
      } catch (err) {
        this.logger.warn(`backup: skip table ${tbl} — ${(err as Error).message}`);
      }
    }

    // 5) ดึงตารางลูกที่ไม่มี sc_id แต่ผูกกับ parent ที่มี sc_id
    await this.exportChildTables(scId, syId, budgetYear, tables, rowCounts);
    totalRows = Object.values(rowCounts).reduce((s, n) => s + n, 0);

    return {
      meta: {
        sc_id: scId,
        budget_year: budgetYear,
        exported_at: new Date().toISOString(),
        row_counts: rowCounts,
        total_rows: totalRows,
      },
      tables,
    };
  }

  /** ดึงตารางลูกที่ไม่มี sc_id (เช่น parcel_detail, pln_receive_detail) */
  private async exportChildTables(
    scId: number,
    syId: number | null,
    budgetYear: number | null,
    tables: Record<string, unknown[]>,
    rowCounts: Record<string, number>,
  ) {
    // [child_table, child_fk, parent_table, parent_pk]
    const CHILDREN: [string, string, string, string][] = [
      ['pln_receive_detail', 'pr_id', 'pln_receive', 'pr_id'],
      ['parcel_detail', 'order_id', 'parcel_order', 'order_id'],
      ['receive_parcel_detail', 'receive_id', 'receive_parcel_order', 'receive_id'],
      ['tb_transaction_supplies', 'supp_id', 'tb_supplies', 'supp_id'],
      ['pln_budget_category_detail', 'pbc_id', 'pln_budget_category', 'pbc_id'],
      ['bank_reconciliation_item', 'br_id', 'bank_reconciliation', 'br_id'],
      ['supplie_request_detail', 'req_id', 'supplie_request', 'req_id'],
      ['travel_reimbursement_traveler', 'tr_id', 'travel_reimbursement', 'tr_id'],
      ['tb_fixed_asset_depreciation', 'fa_id', 'tb_fixed_asset', 'fa_id'],
      ['pln_procurement_plan_item', 'pp_id', 'pln_procurement_plan', 'pp_id'],
    ];

    for (const [child, childFk, parent, parentPk] of CHILDREN) {
      // หา parent ids ของโรงเรียนนี้
      const parentRows = tables[parent];
      if (!parentRows || parentRows.length === 0) {
        tables[child] = [];
        rowCounts[child] = 0;
        continue;
      }
      const ids = (parentRows as Record<string, unknown>[])
        .map((r) => r[parentPk])
        .filter((v) => v != null);

      if (ids.length === 0) {
        tables[child] = [];
        rowCounts[child] = 0;
        continue;
      }

      try {
        const rows = await this.dataSource.query(
          `SELECT * FROM \`${child}\` WHERE \`${childFk}\` IN (${ids.map(() => '?').join(',')})`,
          ids,
        );
        tables[child] = rows;
        rowCounts[child] = rows.length;
      } catch (err) {
        this.logger.warn(`backup child: skip ${child} — ${(err as Error).message}`);
      }
    }
  }

  /** รายชื่อปีงบประมาณที่มีข้อมูลในโรงเรียนนี้ */
  async listYears(scId: number): Promise<{ sy_id: number; school_year: number }[]> {
    return this.dataSource.query(
      `SELECT sy_id, school_year FROM school_year WHERE sc_id = ? ORDER BY school_year DESC`,
      [scId],
    );
  }
}
