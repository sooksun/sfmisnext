import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Composite indexes สำหรับ list query ที่กรองตาม status / type / date range
 *
 * ที่มา: architecture audit พบ query pattern ที่ filter หลาย column
 * พร้อมกันแต่ index เดิมครอบแค่ scId+del → seq scan เมื่อข้อมูลโต
 *
 * - request_withdraw: list ตาม status (เช็ค status ∈ {200,201,202}, invoice status flow)
 * - tb_supplies: filter ตามประเภทพัสดุ (ts_id)
 * - financial_transactions: daily-balance ดึงตามช่วงวัน + budget_year
 * - parcel_order: queue อนุมัติตาม order_status
 */
export class AddCompositeIndexesForListQueries1779100000000
  implements MigrationInterface
{
  name = 'AddCompositeIndexesForListQueries1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX `IDX_request_withdraw_sc_sy_status_del` ' +
        'ON `request_withdraw` (`sc_id`, `sy_id`, `status`, `del`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_tb_supplies_sc_ts_del` ' +
        'ON `tb_supplies` (`sc_id`, `ts_id`, `del`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_financial_transactions_sc_year_date_del` ' +
        'ON `financial_transactions` (`sc_id`, `budget_year`, `create_date`, `del`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_parcel_order_sc_year_status_del` ' +
        'ON `parcel_order` (`sc_id`, `acad_year`, `order_status`, `del`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_parcel_order_sc_year_status_del` ON `parcel_order`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_financial_transactions_sc_year_date_del` ON `financial_transactions`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_tb_supplies_sc_ts_del` ON `tb_supplies`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_request_withdraw_sc_sy_status_del` ON `request_withdraw`',
    );
  }
}
