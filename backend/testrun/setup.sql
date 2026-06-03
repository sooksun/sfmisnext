-- ============================================================
-- Sandbox setup สำหรับ test run โจทย์การเงิน (finance1.pdf)
-- โรงเรียนบ้านสุขสันต์ (ใช้ sc_id=1) · ปีงบประมาณ 2556 (1 ต.ค.2555 – 30 ก.ย.2556)
-- transactional budget_year (CE) = 2013 ; school_year.budget_year (BE) = 2556
-- ============================================================
SET @SC := 1;
SET @UP := 1;

-- 1) school_year ปีงบ 2556 (idempotent: ลบของเดิมที่เป็น 2556 ก่อน) ----------
DELETE FROM school_year WHERE sc_id=@SC AND budget_year=2556;
INSERT INTO school_year
  (sy_year, semester, sy_date_s, sy_date_e, up_by, del, cre_date, up_date, sc_id, budget_year, budget_date_s, budget_date_e)
VALUES
  (2556, 1, '2012-10-01', '2013-09-30', @UP, 0, NOW(), NOW(), @SC, 2556, '2012-10-01', '2013-09-30');
SET @SY := LAST_INSERT_ID();

-- 2) money types ตามทะเบียนคุมในคู่มือ (id 101–110) ---------------------------
DELETE FROM master_budget_income_type WHERE bg_type_id BETWEEN 101 AND 120;
INSERT INTO master_budget_income_type (bg_type_id, budget_type, budget_type_calc, budget_borrow_type, spacial_type, up_by, del, create_date, update_date) VALUES
 (101,'เงินอุดหนุนค่าใช้จ่ายรายหัว',1,'2',0,@UP,0,NOW(),NOW()),
 (102,'เงินอุดหนุนปัจจัยพื้นฐานนักเรียนยากจน',1,'2',0,@UP,0,NOW(),NOW()),
 (103,'เงินอุดหนุนค่าอาหารนักเรียนพักนอน',1,'2',0,@UP,0,NOW(),NOW()),
 (104,'เงินเรียนฟรี 15 ปี',1,'2',0,@UP,0,NOW(),NOW()),
 (105,'เงินรายได้สถานศึกษา',1,'2',0,@UP,0,NOW(),NOW()),
 (106,'เงินอุดหนุน อปท. (อาหารกลางวัน)',1,'2',0,@UP,0,NOW(),NOW()),
 (107,'เงินอุดหนุน อปท. (ประชาธิปไตย)',1,'2',0,@UP,0,NOW(),NOW()),
 (108,'เงินอุดหนุน อปท. (วงดุริยางค์)',1,'2',0,@UP,0,NOW(),NOW()),
 (109,'เงินประกันสัญญา',1,'1',0,@UP,0,NOW(),NOW()),
 (110,'เงินภาษีหัก ณ ที่จ่าย',1,'1',0,@UP,0,NOW(),NOW());

-- 2.5) ผู้ยืมเงิน (admin rows) ตามชื่อในคู่มือ (id 101–104) -------------------
DELETE FROM admin WHERE admin_id BETWEEN 101 AND 104;
INSERT INTO admin (admin_id, name, username, password, type, position, sc_id, up_by, del, cre_date, up_date) VALUES
 (101,'นางนิภา ธันยพร','nipha_borrower','x',7,5,@SC,@UP,0,NOW(),NOW()),
 (102,'นายสุชาติ วิทยาสุข','suchat_borrower','x',7,5,@SC,@UP,0,NOW(),NOW()),
 (103,'นางสุดสวย เชิญยิ้ม','sudsuay_borrower','x',7,5,@SC,@UP,0,NOW(),NOW()),
 (104,'นายทองดี อาทิตย์','thongdee_borrower','x',7,5,@SC,@UP,0,NOW(),NOW());

-- 3) ล้างข้อมูล transaction ของ sandbox นี้ (idempotent rerun) ----------------
DELETE FROM financial_transactions WHERE sc_id=@SC AND bg_type_id BETWEEN 101 AND 120;
DELETE FROM pln_receive_detail WHERE pr_id IN (SELECT pr_id FROM pln_receive WHERE sc_id=@SC AND budget_year='2013');
DELETE FROM pln_receive WHERE sc_id=@SC AND budget_year='2013';
DELETE FROM request_withdraw WHERE sc_id=@SC AND year='2013';
DELETE FROM opening_balance WHERE sc_id=@SC AND budget_year='2556';
DELETE FROM loan_agreement WHERE sc_id=@SC AND budget_year='2556';
DELETE FROM gov_revenue_entry WHERE sc_id=@SC AND (budget_year='2556' OR sy_id=@SY) OR detail='reload-test';
DELETE FROM smp_deposit_entry WHERE sc_id=@SC AND budget_year='2556';
DELETE FROM bank_ledger_entry WHERE sc_id=@SC AND sy_id=@SY;

-- 4) opening loan: นางนิภา ยืมอาหารกลางวัน 13,975 ค้างจากต้นปี (บย.2/55) -------
--    (เพื่อให้ 12 ต.ค. "ส่งใช้เงินยืม" ผ่าน API ได้) status=1 ค้างชำระ
INSERT INTO loan_agreement
  (sc_id, sy_id, budget_year, la_seq, la_no, borrower_id, borrower_name, borrower_position,
   money_type_id, money_type_name, purpose, amount, borrow_date, loan_category, due_date,
   status, up_by, del, create_date, update_date)
VALUES
  (@SC, @SY, '2556', 0, '2/55', 101, 'นางนิภา ธันยพร', '5',
   106, 'เงินอุดหนุน อปท. (อาหารกลางวัน)', 'ยืมจัดทำอาหารกลางวัน (ยกมา)', 13975, '2012-05-17', 3, '2012-06-16',
   1, @UP, 0, NOW(), NOW());

SELECT @SY AS new_sy_id, @SC AS sc_id;
