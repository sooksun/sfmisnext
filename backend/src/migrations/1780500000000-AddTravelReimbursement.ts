import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ใบเบิกค่าใช้จ่ายในการเดินทางไปราชการ (แบบ 8708)
 *  - travel_reimbursement: ส่วนที่ 1 (ใบเบิก + workflow ตรวจสอบ/อนุมัติ/จ่าย)
 *  - travel_reimbursement_traveler: ส่วนที่ 2 (ค่าใช้จ่ายรายคน)
 * ครูยื่นเอง → เจ้าหน้าที่การเงินตรวจสอบ → ผอ.อนุมัติ → จ่ายเงิน (ลงเป็น บค.)
 */
export class AddTravelReimbursement1780500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`travel_reimbursement\` (
        \`tr_id\`              INT          NOT NULL AUTO_INCREMENT,
        \`sc_id\`             INT          NOT NULL DEFAULT 0,
        \`sy_id\`             INT          NOT NULL DEFAULT 0,
        \`budget_year\`       VARCHAR(10)  NULL,
        \`requester_id\`      INT          NOT NULL DEFAULT 0,
        \`requester_name\`    VARCHAR(200) NULL,
        \`requester_position\` VARCHAR(200) NULL,
        \`affiliation\`       VARCHAR(255) NULL,
        \`province\`          VARCHAR(100) NULL,
        \`at_office\`         VARCHAR(255) NULL,
        \`order_ref\`         VARCHAR(200) NULL,
        \`order_date\`        DATE         NULL,
        \`purpose\`           TEXT         NULL,
        \`companions\`        TEXT         NULL,
        \`depart_from\`       INT          NOT NULL DEFAULT 2,
        \`depart_date\`       DATE         NULL,
        \`depart_time\`       VARCHAR(10)  NULL,
        \`return_date\`       DATE         NULL,
        \`return_time\`       VARCHAR(10)  NULL,
        \`total_days\`        FLOAT        NOT NULL DEFAULT 0,
        \`total_hours\`       FLOAT        NOT NULL DEFAULT 0,
        \`money_type_id\`     INT          NOT NULL DEFAULT 0,
        \`money_type_name\`   VARCHAR(200) NULL,
        \`la_id\`             INT          NULL,
        \`allowance_total\`   FLOAT        NOT NULL DEFAULT 0,
        \`lodging_total\`     FLOAT        NOT NULL DEFAULT 0,
        \`transport_total\`   FLOAT        NOT NULL DEFAULT 0,
        \`other_total\`       FLOAT        NOT NULL DEFAULT 0,
        \`grand_total\`       FLOAT        NOT NULL DEFAULT 0,
        \`evidence_count\`    INT          NOT NULL DEFAULT 0,
        \`verify_by\`         INT          NULL,
        \`verify_name\`       VARCHAR(200) NULL,
        \`verify_date\`       DATE         NULL,
        \`approve_by\`        INT          NULL,
        \`approve_name\`      VARCHAR(200) NULL,
        \`approve_date\`      DATE         NULL,
        \`receipt_date\`      DATE         NULL,
        \`type_offer_check\`  INT          NOT NULL DEFAULT 1,
        \`bc_no\`             VARCHAR(45)  NULL,
        \`ft_pay_id\`         INT          NULL,
        \`ft_return_id\`      INT          NULL,
        \`status\`            INT          NOT NULL DEFAULT 10,
        \`note\`              TEXT         NULL,
        \`up_by\`             INT          NOT NULL DEFAULT 0,
        \`del\`               INT          NOT NULL DEFAULT 0,
        \`create_date\`       DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
        \`update_date\`       DATETIME     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`tr_id\`),
        INDEX \`IDX_tr_sc_sy_del\` (\`sc_id\`, \`sy_id\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`travel_reimbursement_traveler\` (
        \`trt_id\`     INT          NOT NULL AUTO_INCREMENT,
        \`tr_id\`      INT          NOT NULL DEFAULT 0,
        \`seq\`        INT          NOT NULL DEFAULT 1,
        \`name\`       VARCHAR(200) NULL,
        \`position\`   VARCHAR(200) NULL,
        \`allowance\`  FLOAT        NOT NULL DEFAULT 0,
        \`lodging\`    FLOAT        NOT NULL DEFAULT 0,
        \`transport\`  FLOAT        NOT NULL DEFAULT 0,
        \`other\`      FLOAT        NOT NULL DEFAULT 0,
        \`total\`      FLOAT        NOT NULL DEFAULT 0,
        \`note\`       TEXT         NULL,
        \`del\`        INT          NOT NULL DEFAULT 0,
        \`create_date\` DATETIME    NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`trt_id\`),
        INDEX \`IDX_trt_tr_del\` (\`tr_id\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`travel_reimbursement_traveler\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`travel_reimbursement\``);
  }
}
