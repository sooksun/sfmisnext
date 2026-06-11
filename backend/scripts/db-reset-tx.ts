/**
 * รีเซ็ตข้อมูล transaction (เก็บ master/config) — ใช้ทดสอบปีงบใหม่
 *  โหมด:
 *   ts-node scripts/db-reset-tx.ts --list   → แสดงตารางทั้งหมด + จำนวนแถว (อ่านอย่างเดียว)
 *   ts-node scripts/db-reset-tx.ts --run     → TRUNCATE เฉพาะตาราง transaction (ตาม TX_TABLES)
 */
import AppDataSource from '../src/data-source';

// ── ตาราง transaction ที่จะล้าง (ชื่อจริงจาก --list) ──
const TX_TABLES = [
  // การเงิน: รับ/จ่าย/ทะเบียนคุม
  'main_register',
  'financial_transactions',
  'request_withdraw',
  'pln_receive',
  'pln_receive_detail',
  'receipt',
  'budget_request',
  'gov_revenue_entry',
  'smp_deposit_entry',
  'bank_reconciliation',
  'bank_reconciliation_item',
  'deposit_register',
  'loan_agreement',
  'loan_return_evidence',
  'monthly_submission',
  'financial_audit_log',
  'cash_keeping_record',
  'withholding_certificate',
  'travel_reimbursement',
  'travel_reimbursement_traveler',
  'submitting_student_records',
  'fiscal_year_balance',
  'tb_expenses',
  'tb_intra_bank_transfer',
  // พัสดุ/จัดซื้อ (transaction)
  'parcel_order',
  'parcel_detail',
  'receive_parcel_order',
  'receive_parcel_detail',
  'sup_inspection',
  'tb_transaction_supplies',
];

async function main() {
  const mode = process.argv.includes('--run') ? 'run' : 'list';
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();

  const tables: Array<{ TABLE_NAME: string }> = await qr.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);
  const existing = new Set(tables.map((t) => t.TABLE_NAME));

  if (mode === 'list') {
    console.log(`\n=== ตารางทั้งหมด ${existing.size} ตาราง ===`);
    for (const t of tables) {
      const c: Array<{ n: number }> = await qr.query(
        `SELECT COUNT(*) AS n FROM \`${t.TABLE_NAME}\``,
      );
      const inTx = TX_TABLES.includes(t.TABLE_NAME) ? ' [TX→ล้าง]' : '';
      console.log(`${t.TABLE_NAME.padEnd(40)} ${String(c[0].n).padStart(8)}${inTx}`);
    }
    const missing = TX_TABLES.filter((t) => !existing.has(t));
    if (missing.length) console.log(`\n(ไม่พบในฐานข้อมูล ข้ามไป): ${missing.join(', ')}`);
    console.log('\n— โหมด list (อ่านอย่างเดียว) ไม่มีการลบ —');
  } else {
    const toTrunc = TX_TABLES.filter((t) => existing.has(t));
    console.log(`\n=== TRUNCATE ${toTrunc.length} ตาราง ===`);
    await qr.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of toTrunc) {
      await qr.query(`TRUNCATE TABLE \`${t}\``);
      console.log(`  ✓ ${t}`);
    }
    await qr.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n— ล้างข้อมูล transaction เรียบร้อย (master/config ไม่ถูกแตะ) —');
  }

  await qr.release();
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
