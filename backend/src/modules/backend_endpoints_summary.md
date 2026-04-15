# สรุปการตรวจสอบและสร้าง Backend Endpoints

วันที่: 2 ธันวาคม 2025

## สรุปการตรวจสอบ

จากการตรวจสอบโมดูลต่างๆ ในระบบ SFMIS พบว่า:

1. **โมดูลที่มีอยู่แล้วและมี endpoint ครบถ้วน:**
   - Admin Module
   - Dashboard Module
   - School Year Module
   - School Module
   - Budget Module
   - Supplie Module
   - Bank Module
   - Receive Module
   - Receipt Module
   - Audit Committee Module
   - Project Approve Module

2. **โมดูลที่มีอยู่แล้วแต่มี endpoint ไม่ครบถ้วน ได้ทำการเพิ่มเติมแล้ว:**
   - General DB Module: เพิ่ม endpoint สำหรับ Partner
   - Settings Module: เพิ่ม endpoint สำหรับ SAO Policy, MOE Policy, Quick Win, SAO, Classroom Budget และ Budget Income Type
   - Policy Module: เพิ่ม endpoint สำหรับ loadRealBudget, loadExpenses, addRealBudget, updateRealBudget, addExpenses, updateExpenses

3. **โมดูลที่ยังไม่มี ได้ทำการสร้างใหม่:**
   - Project Module: สร้างใหม่ทั้งหมดพร้อม endpoint ตามที่ระบุในเอกสาร

## รายละเอียดการแก้ไข

### 1. General DB Module
- เพิ่ม endpoint สำหรับ Partner:
  - `POST /addPartner`
  - `POST /updatePartner`
  - `POST /remove_partner`

### 2. Settings Module
- เพิ่ม endpoint สำหรับ SAO Policy:
  - `POST /load_SaoPolicy/:page/:pageSize`
  - `POST /addSaoPolicy`
  - `POST /updateSaoPolicy`
  - `POST /removeSaoPolicy`
- เพิ่ม endpoint สำหรับ MOE Policy:
  - `POST /load_MoePolicy/:page/:pageSize`
  - `POST /addMoePolicy`
  - `POST /updateMoePolicy`
  - `POST /removeMoePolicy`
- เพิ่ม endpoint สำหรับ Quick Win:
  - `POST /load_QuickWin/:page/:pageSize`
  - `POST /addQuickWin`
  - `POST /updateQuickWin`
  - `POST /removeQuickWin`
- เพิ่ม endpoint สำหรับ SAO:
  - `POST /load_Sao/:page/:pageSize`
  - `POST /loadSaoGroup`
- เพิ่ม endpoint สำหรับ Classroom Budget:
  - `POST /load_classroom_budget/:page/:pageSize`
- เพิ่ม endpoint สำหรับ Budget Income Type:
  - `POST /load_budgetType/:scId/:page/:pageSize`

### 3. Policy Module
- เพิ่ม endpoint สำหรับ Real Budget และ Expenses:
  - `POST /loadRealBudget/:syId/:scId/:page/:pageSize`
  - `POST /loadExpenses/:scId/:year/:page/:pageSize`
  - `POST /addRealBudget`
  - `POST /updateRealBudget`
  - `POST /addExpenses`
  - `POST /updateExpenses`

### 4. Project Module
- สร้าง Project Module ใหม่ทั้งหมดพร้อม endpoint:
  - `POST /load_project/:scId/:userId/:page/:pageSize/:syId`
  - `POST /addProject`
  - `POST /updateProject`
  - `POST /removeProject`
  - `POST /loadPLNBudgetCategory/:scId/:syId/:budgetYear`
  - `POST /loadPLNBudgetCategory_rp`
  - `POST /master_sao_policy`
  - `POST /master_moe_policy`
  - `POST /master_obec_policy`
  - `POST /master_quick_win`
  - `POST /master_sc_policy/:scId`

## หมายเหตุ

- โมดูลที่สร้างใหม่และ endpoint ที่เพิ่มเติมยังไม่มีการเชื่อมต่อกับฐานข้อมูลจริง เนื่องจากยังไม่มี entity ที่เกี่ยวข้อง
- ควรมีการสร้าง entity ที่เกี่ยวข้องและเชื่อมต่อกับฐานข้อมูลเพื่อให้ endpoint ทำงานได้อย่างสมบูรณ์
- ควรมีการทดสอบ endpoint ทั้งหมดเพื่อให้แน่ใจว่าทำงานได้ถูกต้อง
- ควรมีการเพิ่ม validation และ error handling เพื่อให้ระบบมีความปลอดภัยและเสถียรมากขึ้น
