-- ตั้งค่าประเภทเงินที่ยืมได้ (budget_borrow_type='1') ตรงคู่มือ — apply ตรงกับ live DB (dev)
SET NAMES utf8mb4;

UPDATE `master_budget_income_type`
SET `budget_borrow_type` = '1', `update_date` = NOW()
WHERE del = 0
  AND budget_borrow_type <> '1'
  AND (
    budget_type LIKE '%รายหัว%'
    OR budget_type LIKE '%อาหารกลางวัน%'
    OR (budget_type LIKE '%เรียนฟรี 15 ปี%' AND budget_type NOT LIKE '%-%')
  );

SELECT bg_type_id, budget_type, budget_borrow_type
FROM `master_budget_income_type`
WHERE del = 0
ORDER BY bg_type_id;
