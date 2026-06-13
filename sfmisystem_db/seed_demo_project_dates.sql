-- Seed: เติมวันที่ demo (เริ่มต้น/สิ้นสุด) + budget_year ให้โครงการเดิมที่ยังว่าง
-- "สอดคล้องกับข้อมูลเดิม": อิงช่วงปีงบประมาณ (fiscal range) จาก school_year ของแต่ละโครงการ
--   - budget_year   = school_year.budget_year (ถ้าโครงการยังไม่มี)
--   - start_date    = วันแรกของปีงบ + เลื่อนเป็นช่วง ๆ ตาม proj_id (0/14/.../70 วัน) ให้ Gantt อ่านง่าย
--   - end_date      = start_date + (60..150 วัน) ตัดไม่ให้เกินวันสิ้นปีงบ
-- ปลอดภัย: แก้เฉพาะแถวที่ start_date หรือ end_date เป็น NULL (ไม่ทับของจริง)
UPDATE pln_project p
JOIN school_year sy ON sy.sy_id = p.sy_id
SET
  p.budget_year = COALESCE(p.budget_year, sy.budget_year),
  p.start_date = DATE_ADD(sy.budget_date_s, INTERVAL ((p.proj_id % 6) * 14) DAY),
  p.end_date = LEAST(
    sy.budget_date_e,
    DATE_ADD(
      DATE_ADD(sy.budget_date_s, INTERVAL ((p.proj_id % 6) * 14) DAY),
      INTERVAL (60 + (p.proj_id % 4) * 30) DAY
    )
  )
WHERE p.del = 0
  AND (p.start_date IS NULL OR p.end_date IS NULL)
  AND sy.budget_date_s IS NOT NULL
  AND sy.budget_date_e IS NOT NULL;
