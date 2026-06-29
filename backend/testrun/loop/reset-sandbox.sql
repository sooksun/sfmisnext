-- reset-sandbox.sql — ล้างข้อมูล transactional ของ sandbox sc_id=2 เท่านั้น
-- ⚠️ ทุก statement scoped sc_id=2 (ห้ามแก้ให้ลบข้าม sc_id). ใช้ก่อน re-seed bootstrap.
-- รัน: node backend/testrun/loop/run-sql.js reset-sandbox.sql   (หรือ source ผ่าน mysql client)
SET FOREIGN_KEY_CHECKS = 0;

-- ── child/detail tables (no sc_id) — ลบผ่าน parent ที่ sc_id=2 ──
DELETE FROM pln_budget_category_detail WHERE pbc_id IN (SELECT pbc_id FROM pln_budget_category WHERE sc_id=2);
DELETE FROM pln_receive_detail        WHERE pr_id  IN (SELECT pr_id  FROM pln_receive WHERE sc_id=2);
DELETE FROM parcel_detail             WHERE order_id IN (SELECT order_id FROM parcel_order WHERE sc_id=2);
DELETE FROM receive_parcel_detail     WHERE receive_id IN (SELECT receive_id FROM receive_parcel_order WHERE sc_id=2);
DELETE FROM tb_transaction_supplies   WHERE supp_id IN (SELECT supp_id FROM tb_supplies WHERE sc_id=2);
DELETE FROM withholding_certificate   WHERE sc_id=2;
DELETE FROM check_receive_committee   WHERE rw_id IN (SELECT rw_id FROM request_withdraw WHERE sc_id=2);

-- ── parent transactional tables (have sc_id) ──
DELETE FROM financial_transactions    WHERE sc_id=2;
DELETE FROM tb_expenses               WHERE sc_id=2;
DELETE FROM budget_request            WHERE sc_id=2;
DELETE FROM request_withdraw          WHERE sc_id=2;
DELETE FROM receipt                   WHERE sc_id=2;
DELETE FROM pln_receive               WHERE sc_id=2;
DELETE FROM receive_parcel_order      WHERE sc_id=2;
DELETE FROM pln_proj_approve          WHERE sc_id=2;
DELETE FROM parcel_order              WHERE sc_id=2;
DELETE FROM tb_supplies               WHERE sc_id=2;
DELETE FROM pln_project               WHERE sc_id=2;
DELETE FROM pln_real_budget           WHERE sc_id=2;
DELETE FROM pln_budget_category       WHERE sc_id=2;
DELETE FROM tb_estimate_acadyear      WHERE sc_id=2;
DELETE FROM opening_balance           WHERE sc_id=2;
DELETE FROM submitting_student_records WHERE sc_id=2;
DELETE FROM tb_student                WHERE sc_id=2;
DELETE FROM budget_income_type_school WHERE sc_id=2;
DELETE FROM bankaccount               WHERE sc_id=2;
DELETE FROM tb_partner                WHERE sc_id=2;
-- เงินยืม / ฝาก / รายได้แผ่นดิน (ถ้ามี)
DELETE FROM loan_agreement            WHERE sc_id=2;
DELETE FROM gov_revenue_entry         WHERE sc_id=2;
DELETE FROM bank_ledger_entry         WHERE sc_id=2;
DELETE FROM smp_deposit_entry         WHERE sc_id=2;
DELETE FROM monthly_submission        WHERE sc_id=2;
DELETE FROM document_counter          WHERE sc_id=2;
DELETE FROM receipt_book              WHERE sc_id=2;
-- school_year ลบท้ายสุด (อ้างอิงโดยหลายตาราง)
DELETE FROM school_year               WHERE sc_id=2;

SET FOREIGN_KEY_CHECKS = 1;
