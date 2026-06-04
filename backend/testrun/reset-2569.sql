-- ============================================================
-- RESET ข้อมูลการเงิน "ปีงบประมาณ 2569" (sy_id=2) แล้วเตรียมตั้งต้นใหม่
-- transactional budget_year (CE) = 2026 ; school_year.budget_year (BE) = 2569
-- ใช้คู่กับ: node testrun/run-2569.js  (replay โจทย์ finance1.pdf ทีละรายการ)
-- ============================================================
SET @SC := 1;
SET @SY := 2;       -- school_year ปีงบ 2569 (sy_year=2569)
SET @UP := 1;
SET @BE := '2569';  -- พ.ศ.

-- 1) ล้าง transaction การเงินของปี 2569 ทั้งหมด (sy_id=2) -----------------------
DELETE FROM financial_transactions WHERE sc_id=@SC AND sy_id=@SY;
DELETE FROM pln_receive_detail WHERE pr_id IN (SELECT pr_id FROM pln_receive WHERE sc_id=@SC AND sy_id=@SY);
DELETE FROM pln_receive WHERE sc_id=@SC AND sy_id=@SY;
DELETE FROM check_receive_committee WHERE rw_id IN (SELECT rw_id FROM request_withdraw WHERE sc_id=@SC AND sy_id=@SY);
DELETE FROM withholding_certificate WHERE sc_id=@SC AND sy_id=@SY;
DELETE FROM request_withdraw WHERE sc_id=@SC AND sy_id=@SY;
DELETE FROM receipt WHERE sc_id=@SC AND sy_id=@SY;
DELETE FROM loan_agreement WHERE sc_id=@SC AND sy_id=@SY;
DELETE FROM gov_revenue_entry WHERE sc_id=@SC AND sy_id=@SY;
DELETE FROM smp_deposit_entry WHERE sc_id=@SC AND sy_id=@SY;
DELETE FROM bank_ledger_entry WHERE sc_id=@SC AND sy_id=@SY;
DELETE FROM cash_keeping_record WHERE sc_id=@SC AND sy_id=@SY;
DELETE FROM opening_balance WHERE sc_id=@SC AND sy_id=@SY;

-- 2) reset ตัวนับเลขเอกสารอัตโนมัติ (ทั้ง ค.ศ. เดิม 2026 และ พ.ศ. ใหม่ 2569) ----
DELETE FROM document_counter WHERE sc_id=@SC AND budget_year IN ('2026','2569');

-- 3) reset เล่มใบเสร็จที่ใช้งานอยู่ของปี 2569 → เริ่มนับเลขที่ใหม่จากต้นเล่ม -----
UPDATE receipt_book SET current_no = from_no, update_date = NOW()
  WHERE sc_id=@SC AND sy_id=@SY AND status=1;

-- 4) ผู้ยืมเงินตามโจทย์ (admin id 101–104) เผื่อยังไม่มี -----------------------
INSERT INTO admin (admin_id, name, username, password, type, position, sc_id, up_by, del, cre_date, up_date) VALUES
 (101,'นางนิภา ธันยพร','nipha_borrower','x',7,5,@SC,@UP,0,NOW(),NOW()),
 (102,'นายสุชาติ วิทยาสุข','suchat_borrower','x',7,5,@SC,@UP,0,NOW(),NOW()),
 (103,'นางสุดสวย เชิญยิ้ม','sudsuay_borrower','x',7,5,@SC,@UP,0,NOW(),NOW()),
 (104,'นายทองดี อาทิตย์','thongdee_borrower','x',7,5,@SC,@UP,0,NOW(),NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name), sc_id=VALUES(sc_id), del=0, up_date=NOW();

-- 5) ผู้ขายที่ต้องหักภาษี ณ ที่จ่าย (cal_vat: 0=ไม่มี VAT, 1=มี VAT 7%) ---------
--    ใช้ทดสอบการหักภาษีอัตโนมัติตอนจ่ายเงิน (p_id 9001–9009)
DELETE FROM tb_partner WHERE p_id BETWEEN 9001 AND 9009;
INSERT INTO tb_partner (p_id, p_name, cal_vat, pay_type, p_type, sc_id, del) VALUES
 (9001,'ร้านกุมภาภัณฑ์',0,2,2,@SC,0),
 (9002,'บริษัท นภิส จำกัด',1,2,2,@SC,0),
 (9003,'ร้านนลมิวสิค',0,2,2,@SC,0),
 (9004,'ร้านกีฬาบูติก',0,2,2,@SC,0),
 (9005,'บริษัท นกน้อยการเรียน จำกัด',1,2,2,@SC,0),
 (9006,'บริษัท มานิตย์เคมีคอล จำกัด',1,2,2,@SC,0),
 (9007,'บริษัท โยธา จำกัด',1,2,2,@SC,0),
 (9008,'หจก.โจคอมพิวเตอร์',1,2,2,@SC,0),
 (9009,'ร้านสุภาเครื่องครัว',0,2,2,@SC,0);

-- 6) เปิด "หักภาษี ณ ที่จ่ายทุกครั้งที่จ่ายให้ผู้ขาย" (wht_min=0) สำหรับโรงเรียนนี้
DELETE FROM regulatory_threshold WHERE sc_id=@SC AND config_key='finance.wht_min';
INSERT INTO regulatory_threshold (sc_id, config_key, value, unit, up_by, del, create_date, update_date)
 VALUES (@SC,'finance.wht_min',0,'บาท',@UP,0,NOW(),NOW());

-- 7) เงินยืมค้างต้นปี: นางนิภา ยืมอาหารกลางวัน 13,975 (รอส่งใช้ 12 ต.ค.) --------
INSERT INTO loan_agreement
  (sc_id, sy_id, budget_year, la_seq, la_no, borrower_id, borrower_name, borrower_position,
   money_type_id, money_type_name, purpose, amount, borrow_date, loan_category, due_date,
   status, up_by, del, create_date, update_date)
VALUES
  (@SC, @SY, @BE, 0, '2/68', 101, 'นางนิภา ธันยพร', '5',
   106, 'เงินอุดหนุน อปท. (อาหารกลางวัน)', '[finance1-2569] ยืมจัดทำอาหารกลางวัน (ยกมาต้นปี)',
   13975, '2025-05-17', 3, '2025-06-16', 1, @UP, 0, NOW(), NOW());

-- 8) ผูกประเภทเงิน finance1 (101–110) เข้าบัญชีธนาคาร เพื่อให้รายการจ่ายเช็ค (บจ)
--    ไหลเข้า "สมุดบัญชีธนาคาร" (รายงาน 4.5) ; เงินอุดหนุน→บัญชี 1, รายได้สถานศึกษา→บัญชี 2
DELETE FROM budget_income_type_school WHERE sc_id=@SC AND bg_type_id BETWEEN 101 AND 110;
INSERT INTO budget_income_type_school (sc_id, ba_id, bg_type_id, up_by, del, create_date, update_date) VALUES
 (@SC, 1, 101, @UP, 0, NOW(), NOW()),  -- เงินอุดหนุนค่าใช้จ่ายรายหัว
 (@SC, 1, 102, @UP, 0, NOW(), NOW()),  -- ปัจจัยพื้นฐานนักเรียนยากจน
 (@SC, 1, 103, @UP, 0, NOW(), NOW()),  -- อาหารนักเรียนพักนอน
 (@SC, 1, 104, @UP, 0, NOW(), NOW()),  -- เรียนฟรี 15 ปี
 (@SC, 2, 105, @UP, 0, NOW(), NOW()),  -- เงินรายได้สถานศึกษา → บัญชีรายได้สถานศึกษา
 (@SC, 1, 106, @UP, 0, NOW(), NOW()),  -- อุดหนุน อปท. (อาหารกลางวัน)
 (@SC, 1, 107, @UP, 0, NOW(), NOW()),  -- อุดหนุน อปท. (ประชาธิปไตย)
 (@SC, 1, 108, @UP, 0, NOW(), NOW()),  -- อุดหนุน อปท. (วงดุริยางค์)
 (@SC, 1, 109, @UP, 0, NOW(), NOW()),  -- เงินประกันสัญญา
 (@SC, 1, 110, @UP, 0, NOW(), NOW());  -- เงินภาษีหัก ณ ที่จ่าย

SELECT 'reset-2569 done' AS status,
  (SELECT COUNT(*) FROM financial_transactions WHERE sc_id=@SC AND sy_id=@SY) AS ft_left,
  (SELECT COUNT(*) FROM request_withdraw WHERE sc_id=@SC AND sy_id=@SY) AS rw_left,
  (SELECT COUNT(*) FROM budget_income_type_school WHERE sc_id=@SC AND bg_type_id BETWEEN 101 AND 110) AS bank_links;
