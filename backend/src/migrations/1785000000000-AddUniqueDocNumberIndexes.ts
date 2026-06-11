import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เพิ่ม UNIQUE index กันเลขเอกสารซ้ำที่ระดับฐานข้อมูล (เดิมกันที่ application เท่านั้น)
 *  - receipt:          (sc_id, sy_id, r_no)         เลขที่ใบเสร็จ
 *  - request_withdraw: (sc_id, sy_id, check_no_doc) เลขที่เช็ค
 *  - tb_fixed_asset:   (sc_id, fa_code)             เลขครุภัณฑ์
 *
 * คอลัมน์เลขเป็น NULL ได้ (MySQL อนุญาตหลายแถว NULL ใน unique index)
 * ถ้าข้อมูลเดิมมีเลขซ้ำอยู่แล้ว จะข้ามการสร้าง index ตัวนั้นพร้อมพิมพ์คำเตือน
 * (ไม่ทำให้ migration ล้มเหลว) — ต้องล้างข้อมูลซ้ำก่อนแล้วรัน migration ใหม่
 */
export class AddUniqueDocNumberIndexes1785000000000
  implements MigrationInterface
{
  private async indexExists(
    queryRunner: QueryRunner,
    table: string,
    index: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
       LIMIT 1`,
      [table, index],
    )) as Array<{ INDEX_NAME: string }>;
    return rows.length > 0;
  }

  private async createUniqueIfClean(
    queryRunner: QueryRunner,
    table: string,
    index: string,
    columns: string[],
  ): Promise<void> {
    if (await this.indexExists(queryRunner, table, index)) return;

    const colList = columns.map((c) => `\`${c}\``).join(', ');
    const notNull = columns
      .map((c) => `\`${c}\` IS NOT NULL`)
      .join(' AND ');
    const dups = (await queryRunner.query(
      `SELECT ${colList}, COUNT(*) AS cnt FROM \`${table}\`
       WHERE ${notNull}
       GROUP BY ${colList} HAVING cnt > 1 LIMIT 5`,
    )) as Array<Record<string, unknown>>;

    if (dups.length > 0) {
      console.warn(
        `[AddUniqueDocNumberIndexes] ข้าม ${index} บน ${table} — พบเลขซ้ำ ${dups.length}+ ชุด ` +
          `กรุณาล้างข้อมูลซ้ำก่อน: ${JSON.stringify(dups)}`,
      );
      return;
    }

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`${index}\` ON \`${table}\` (${colList})`,
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createUniqueIfClean(queryRunner, 'receipt', 'uidx_receipt_no', [
      'sc_id',
      'sy_id',
      'r_no',
    ]);
    await this.createUniqueIfClean(
      queryRunner,
      'request_withdraw',
      'uidx_check_no',
      ['sc_id', 'sy_id', 'check_no_doc'],
    );
    await this.createUniqueIfClean(
      queryRunner,
      'tb_fixed_asset',
      'uidx_fa_code',
      ['sc_id', 'fa_code'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, index] of [
      ['receipt', 'uidx_receipt_no'],
      ['request_withdraw', 'uidx_check_no'],
      ['tb_fixed_asset', 'uidx_fa_code'],
    ] as const) {
      if (await this.indexExists(queryRunner, table, index)) {
        await queryRunner.query(`DROP INDEX \`${index}\` ON \`${table}\``);
      }
    }
  }
}
