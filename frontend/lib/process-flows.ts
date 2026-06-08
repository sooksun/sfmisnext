// นิยาม "สายงานต่อเนื่อง" (process flow) สำหรับการส่งต่อหน้า (page handoff)
// ใช้กับคอมโพเนนต์ <ProcessFlow flow="..." /> เพื่อแสดงแถบขั้นตอน + ปุ่มไปขั้นถัดไป

export interface ProcessStep {
  /** ป้ายชื่อขั้นตอน (สั้น) */
  label: string
  /** เส้นทางหน้า (route) */
  href: string
  /** คำอธิบายสั้น (tooltip) */
  hint?: string
}

export interface ProcessFlowDef {
  key: string
  title: string
  /** งานย่อย/ผลลัพธ์ที่ระบบช่วยทำให้อัตโนมัติ เพื่อลดขั้นตอนที่ผู้ใช้ต้องคลิก */
  automations?: string[]
  steps: ProcessStep[]
}

/** สายงานแผนแบบสั้น: เตรียมงบ → โครงการ → อนุมัติ → ส่งจัดซื้อ */
export const PLAN_FLOW: ProcessFlowDef = {
  key: 'plan',
  title: 'งานเตรียมงบและโครงการ',
  automations: [
    'สร้างรายการชั้นเรียนของปีให้อัตโนมัติ',
    'คำนวณงบจากรายหัวจากจำนวนนักเรียนที่ยืนยันแล้ว',
    'ส่งต่อโครงการที่อนุมัติแล้วไปทำแผนจัดซื้อจัดจ้าง',
  ],
  steps: [
    {
      label: 'เงินเหลือจ่ายปีเก่า',
      href: '/sfmis/prev-year-balance',
      hint: 'นำเงินเหลือจ่ายปีก่อน (ยอด ณ 30 ก.ย.) เข้ารวมในวงเงินวางแผนปีนี้',
    },
    {
      label: 'เตรียมงบประมาณ',
      href: '/sfmis/student',
      hint: 'บันทึกและยืนยันจำนวนนักเรียนของปี',
    },
    {
      label: 'กำหนดอัตราเงินต่อหัว',
      href: '/sfmis/perhead-rate-setting',
      hint: 'กำหนดอัตราเงินต่อหัวนักเรียน 1 คน แยกตามประเภทงบประมาณ',
    },
    {
      label: 'คำนวณงบจากรายหัว',
      href: '/sfmis/calculate-perhead',
      hint: 'คำนวณงบประมาณจากจำนวนนักเรียน × อัตราต่อหัว',
    },
    {
      label: 'งบประมาณรวมรายปี',
      href: '/sfmis/estimate-acadyear',
      hint: 'ดูสรุปงบประมาณที่ประมาณการ/ได้รับจริงทั้งปี',
    },
    {
      label: 'กำหนดวงเงินงบประมาณ',
      href: '/sfmis/budget-category',
      hint: 'จัดสรรวงเงินงบประมาณตามหมวด',
    },
    {
      label: 'แผนงาน/โครงการ',
      href: '/sfmis/plan-menu/project',
      hint: 'ลงรายละเอียดโครงการและวงเงินที่ขอ',
    },
    {
      label: 'บริหารโครงการ',
      href: '/sfmis/plan-menu/manage-project',
      hint: 'แตกโครงการเป็นรายการจัดซื้อ/จัดจ้าง + เลือกประเภทและพัสดุ',
    },
    {
      label: 'อนุมัติโครงการ',
      href: '/sfmis/plan-menu/proj-approve',
      hint: 'แผน การเงิน พัสดุ และ ผอ. ให้ความเห็นชอบ',
    },
    {
      label: 'ส่งต่อจัดซื้อ',
      href: '/sfmis/plan-menu/procurement-plan',
      hint: 'ส่งต่อรายการที่ต้องจัดซื้อจัดจ้างให้ฝ่ายพัสดุ',
    },
  ],
}

/** สายงานจ่ายเงิน: ขอเบิก → ตรวจสอบ → ออกเช็ค → หักภาษี → หลักฐานขอเบิก → เงินคงเหลือ */
export const PAY_FLOW: ProcessFlowDef = {
  key: 'pay',
  title: 'ขั้นตอนการจ่ายเงิน',
  automations: [
    'ตรวจสอบเลขเอกสารและเลขเช็คจากระบบ',
    'ออกเช็คแล้วระบบตัดยอดทะเบียนคุมเงิน',
    'คำนวณภาษีหัก ณ ที่จ่ายและสร้างหนังสือรับรองเมื่อเข้าเงื่อนไข',
  ],
  steps: [
    {
      label: 'ตั้งเรื่องจ่าย',
      href: '/sfmis/pay-menu/invoice',
      hint: 'ตั้งเรื่องขอเบิกตามมูลหนี้',
    },
    {
      label: 'ออกเช็ค',
      href: '/sfmis/pay-menu/generate-check',
      hint: 'ออกเช็ค + ตัดยอดทะเบียนคุม',
    },
    {
      label: 'เงินคงเหลือประจำวัน',
      href: '/sfmis/financial-report/daily-balance',
      hint: 'ตรวจยอดรับ-จ่ายและลงนามรายงานสิ้นวัน',
    },
  ],
}

/** สายงานจัดซื้อ/จัดจ้าง: อนุมัติขอซื้อ → กรรมการ → สัญญา → หลักประกัน → รับพัสดุ → ตรวจรับ → บัญชีวัสดุ → ขอเบิก */
export const PROCURE_FLOW: ProcessFlowDef = {
  key: 'procure',
  title: 'ขั้นตอนจัดซื้อ/จัดจ้าง',
  automations: [
    'เก็บข้อมูลกรรมการ สัญญา หลักประกัน และการส่งมอบไว้ในชุดจัดซื้อเดียว',
    'หลังตรวจรับแล้วส่งต่อเป็นมูลหนี้ให้การเงินตั้งเรื่องจ่าย',
    'รายการวัสดุพร้อมนำไปลงบัญชีวัสดุและเบิกจ่ายต่อ',
  ],
  steps: [
    {
      label: 'แต่งตั้งกรรมการ',
      href: '/sfmis/setting-committee',
      hint: 'แต่งตั้งคณะกรรมการจัดซื้อ/ตรวจรับ',
    },
    {
      label: 'รับงานจัดซื้อ',
      href: '/sfmis/supplie-setting/withdraw-confirm',
      hint: 'อนุมัติคำขอจัดซื้อจัดจ้าง',
    },
    {
      label: 'เอกสารจัดซื้อ/ตรวจรับ',
      href: '/sfmis/supplie-setting/procurement-docs',
      hint: 'พิมพ์ชุดเอกสารจัดซื้อ (รายงานขอซื้อ/ใบสั่งซื้อ/ใบตรวจรับ ฯลฯ) ต่อคำสั่งซื้อ',
    },
    {
      label: 'ทำสัญญา/ส่งมอบ',
      href: '/sfmis/supplie-setting/contract',
      hint: 'ทำสัญญา/ใบสั่งซื้อกับร้านค้า',
    },
    {
      label: 'รับพัสดุ',
      href: '/sfmis/receive-parcel',
      hint: 'บันทึกรับพัสดุเข้าคลัง',
    },
    {
      label: 'บัญชีวัสดุ',
      href: '/sfmis/supplies',
      hint: 'ลงบัญชีวัสดุ → พร้อมเบิก-จ่าย',
    },
    {
      label: 'ส่งเบิก',
      href: '/sfmis/pay-menu/invoice',
      hint: 'แจ้งการเงินตั้งเรื่องจ่ายเจ้าหนี้',
    },
  ],
}

/** สายงานรับเงิน: เล่มใบเสร็จ → เลขเอกสาร → รับเงิน/ใบเสร็จ → เก็บรักษา → ทะเบียนคุม → เงินคงเหลือ */
export const RECEIVE_FLOW: ProcessFlowDef = {
  key: 'receive',
  title: 'ขั้นตอนการรับเงิน',
  automations: [
    'ดึงเล่มใบเสร็จที่เปิดใช้อยู่และเลขที่ถัดไปให้อัตโนมัติ',
    'บันทึกรับเงินแล้วลงทะเบียนคุมเงินตามประเภท',
    'ถ้าเป็นเงินสด ระบบสร้างบันทึกการรับเงินเพื่อเก็บรักษาให้',
  ],
  steps: [
    {
      label: 'ตั้งค่าต้นปี',
      href: '/sfmis/financial-report/receipt-book',
      hint: 'รับและเปิดใช้เล่มใบเสร็จราชการ',
    },
    {
      label: 'รับเงิน/ใบเสร็จ',
      href: '/sfmis/receive-menu/receive',
      hint: 'บันทึกรับเงินและออกใบเสร็จทุกครั้ง',
    },
    {
      label: 'เงินคงเหลือประจำวัน',
      href: '/sfmis/financial-report/daily-balance',
      hint: 'สรุปเงินสด ธนาคาร และเงินฝาก สพป. สิ้นวัน',
    },
  ],
}

export const PROCESS_FLOWS: Record<string, ProcessFlowDef> = {
  plan: PLAN_FLOW,
  pay: PAY_FLOW,
  procure: PROCURE_FLOW,
  receive: RECEIVE_FLOW,
}
