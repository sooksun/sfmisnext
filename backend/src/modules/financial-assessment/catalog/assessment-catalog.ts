/**
 * Catalog ข้อประเมินตนเองด้านการเงิน การบัญชี — แบบ 2544-2
 * อ้างอิงคู่มือ: docs/finance5.pdf (กลุ่มตรวจสอบภายใน สพฐ. พ.ศ. 2567)
 *
 * 52 ข้อย่อย / 10 ประเด็น / รวม 100 คะแนน
 * เก็บเป็น constant ใน code (ไม่ใช่ DB) — เวอร์ชันคุมด้วยโค้ด ลดความเสี่ยงข้อมูลเพี้ยน
 *
 * eval_mode:
 *   auto    = Rule Engine ตรวจอัตโนมัติได้ (เฟส 1)
 *   prefill = ระบบเสนอคำตอบ แต่คนยืนยัน (เฟส 2)
 *   manual  = ยืนยันเอง + แนบหลักฐาน
 * naAllowed = ระบุ N/A ได้ (ตัดออกจากฐานคะแนน)
 */

export type AssessEvalMode = 'auto' | 'prefill' | 'manual';

export interface AssessItemDef {
  code: string; // เช่น '2.1'
  topic: number; // 1-10
  label: string;
  weight: number; // คะแนนเต็มของข้อ
  mode: AssessEvalMode;
  naAllowed: boolean;
  /** deep-link ไปหน้าโมดูลต้นทาง (สำหรับปุ่ม "ดูหลักฐาน") */
  evidence?: string;
}

export interface AssessTopicDef {
  no: number;
  name: string;
  max: number; // คะแนนเต็มประเด็น
}

export const ASSESS_TOPICS: AssessTopicDef[] = [
  { no: 1, name: 'การบริหารการเงินของสถานศึกษา', max: 10 },
  { no: 2, name: 'การควบคุมเงินคงเหลือ', max: 20 },
  { no: 3, name: 'การเก็บรักษาเงิน', max: 5 },
  { no: 4, name: 'การควบคุมการรับเงิน', max: 10 },
  { no: 5, name: 'การควบคุมการจ่ายเงิน', max: 20 },
  { no: 6, name: 'การจัดทำบัญชี', max: 17 },
  { no: 7, name: 'การจัดทำรายงานการเงิน', max: 5 },
  { no: 8, name: 'การตรวจสอบรับจ่ายประจำวัน', max: 3 },
  { no: 9, name: 'การควบคุมเงินยืม', max: 5 },
  { no: 10, name: 'การควบคุมใบเสร็จรับเงิน', max: 5 },
];

export const ASSESS_ITEMS: AssessItemDef[] = [
  // ── ประเด็น 1 การบริหารการเงิน (10) ──
  {
    code: '1.1',
    topic: 1,
    weight: 2,
    mode: 'prefill',
    naAllowed: false,
    label: 'สถานศึกษามีการจัดทำแผนปฏิบัติการประจำปี',
    evidence: '/sfmis/plan-menu/manage-project',
  },
  {
    code: '1.2',
    topic: 1,
    weight: 1,
    mode: 'manual',
    naAllowed: false,
    label:
      'แผนปฏิบัติการประจำปีมีความสอดคล้องกับภารกิจของสถานศึกษา นโยบายและจุดเน้นของ สพฐ.',
  },
  {
    code: '1.3',
    topic: 1,
    weight: 1,
    mode: 'prefill',
    naAllowed: false,
    label:
      'แผนปฏิบัติการประจำปีครอบคลุมแหล่งเงินทุกประเภทที่อยู่ในความรับผิดชอบของสถานศึกษา',
  },
  {
    code: '1.4',
    topic: 1,
    weight: 1,
    mode: 'auto',
    naAllowed: false,
    label:
      'แผนปฏิบัติการประจำปีได้รับความเห็นชอบจากคณะกรรมการสถานศึกษาขั้นพื้นฐาน',
  },
  {
    code: '1.5',
    topic: 1,
    weight: 1,
    mode: 'auto',
    naAllowed: false,
    label:
      'มีการจัดทำทะเบียนหรือเอกสารควบคุมการใช้จ่ายเงินโครงการ/กิจกรรม ให้เป็นไปตามแผนปฏิบัติการประจำปี',
    evidence: '/sfmis/pay-menu/budget-request',
  },
  {
    code: '1.6',
    topic: 1,
    weight: 2,
    mode: 'prefill',
    naAllowed: false,
    label:
      'การใช้จ่ายแต่ละโครงการ/กิจกรรมเป็นไปตามแผนฯ กรณีจำเป็นทำไม่ได้ มีการรายงานปัญหา/อุปสรรคให้ ผอ. ทราบ',
    evidence: '/sfmis/real-budget',
  },
  {
    code: '1.7',
    topic: 1,
    weight: 1,
    mode: 'manual',
    naAllowed: false,
    label:
      'มีการติดตามเร่งรัดการดำเนินงานโครงการ/กิจกรรม ให้ใช้จ่ายเงินตามแผนฯ อย่างน้อยทุกภาคเรียน',
  },
  {
    code: '1.8',
    topic: 1,
    weight: 1,
    mode: 'manual',
    naAllowed: false,
    label:
      'จัดทำรายงานผลการดำเนินงานครบทุกโครงการ/กิจกรรมตามแผนฯ เสนอให้ ผอ. ทราบ',
  },

  // ── ประเด็น 2 การควบคุมเงินคงเหลือ (20) ──
  {
    code: '2.1',
    topic: 2,
    weight: 5,
    mode: 'auto',
    naAllowed: false,
    label:
      'จัดทำรายงานเงินคงเหลือประจำวันทุกวันที่มีการรับ-จ่ายเงิน ถูกต้องเป็นปัจจุบัน และเสนอ ผอ. ทราบและลงนาม',
    evidence: '/sfmis/financial-report/daily-balance',
  },
  {
    code: '2.2',
    topic: 2,
    weight: 5,
    mode: 'auto',
    naAllowed: false,
    label:
      'ยอดเงินคงเหลือแต่ละประเภทในรายงานฯ ตรงกับทะเบียนคุมเงินนอกงบประมาณ และทะเบียนคุมการรับ-นำส่งเงินรายได้แผ่นดิน',
    evidence: '/sfmis/financial-report/unified-register',
  },
  {
    code: '2.3',
    topic: 2,
    weight: 2,
    mode: 'manual',
    naAllowed: false,
    label: 'ยอดเงินสดคงเหลือมีอยู่จริงครบถ้วน และตรงกับรายงานเงินคงเหลือประจำวัน',
  },
  {
    code: '2.4',
    topic: 2,
    weight: 5,
    mode: 'auto',
    naAllowed: true,
    label:
      'ยอดเงินฝากธนาคารตามสมุดคู่ฝาก (ออมทรัพย์/ประจำ) และทะเบียนเงินฝากกระแสรายวันทุกบัญชี ตรงกับรายงานเงินคงเหลือประจำวัน',
    evidence: '/sfmis/report/bank-ledger',
  },
  {
    code: '2.5',
    topic: 2,
    weight: 3,
    mode: 'auto',
    naAllowed: false,
    label:
      'ยอดเงินฝากส่วนราชการผู้เบิกตามสมุดคู่ฝาก (ส่วนราชการผู้เบิก) ตรงกับรายงานเงินคงเหลือประจำวัน',
    evidence: '/sfmis/financial-report/smp-deposit',
  },

  // ── ประเด็น 3 การเก็บรักษาเงิน (5) ──
  {
    code: '3.1',
    topic: 3,
    weight: 1,
    mode: 'auto',
    naAllowed: false,
    label:
      'มีคำสั่งคณะกรรมการเก็บรักษาเงิน โดยระบุหน้าที่ของกรรมการให้ชัดเจน (ระเบียบ กค. 2562 ข้อ 86-88 โดยอนุโลม)',
    evidence: '/sfmis/setting-committee',
  },
  {
    code: '3.2',
    topic: 3,
    weight: 1,
    mode: 'prefill',
    naAllowed: false,
    label: 'กรรมการเก็บรักษาเงินปฏิบัติหน้าที่ตามระเบียบกำหนด',
    evidence: '/sfmis/financial-report/cash-keeping',
  },
  {
    code: '3.3',
    topic: 3,
    weight: 2,
    mode: 'auto',
    naAllowed: false,
    label:
      'การเก็บรักษาเงินสดและเงินฝากธนาคารแต่ละประเภท เป็นไปตามวงเงินอำนาจการเก็บรักษาที่ กค. อนุมัติและระเบียบที่เกี่ยวข้อง',
  },
  {
    code: '3.4',
    topic: 3,
    weight: 0.5,
    mode: 'auto',
    naAllowed: false,
    label:
      'เงินรายได้แผ่นดินนำส่งอย่างน้อยเดือนละ 1 ครั้ง กรณีเก็บไว้เกิน 10,000 บาท นำส่งอย่างช้าไม่เกิน 3 วันทำการถัดไป',
    evidence: '/sfmis/financial-report/gov-revenue',
  },
  {
    code: '3.5',
    topic: 3,
    weight: 0.5,
    mode: 'auto',
    naAllowed: false,
    label:
      'เงินภาษีหัก ณ ที่จ่าย นำส่งสรรพากรในท้องที่ภายใน 7 วัน (หรือ 15 วันกรณียื่นออนไลน์) นับแต่วันสิ้นเดือนที่จ่ายเงิน',
  },

  // ── ประเด็น 4 การควบคุมการรับเงิน (10) ──
  {
    code: '4.1',
    topic: 4,
    weight: 1,
    mode: 'manual',
    naAllowed: false,
    label: 'มีคำสั่งหรือบันทึกมอบหมายผู้ทำหน้าที่รับจ่ายเงินอย่างชัดเจน',
  },
  {
    code: '4.2',
    topic: 4,
    weight: 2,
    mode: 'manual',
    naAllowed: false,
    label:
      'ผู้ทำหน้าที่รับเงินเป็นผู้ที่ได้รับมอบหมายตามคำสั่งหรือบันทึกมอบหมายของ ผอ.',
  },
  {
    code: '4.3',
    topic: 4,
    weight: 4,
    mode: 'auto',
    naAllowed: false,
    label:
      'ออกใบเสร็จรับเงินตามแบบของ สพฐ. ให้ผู้ชำระเงินทุกครั้งที่มีการรับเงิน (ยกเว้นดอกเบี้ยเงินฝาก และภาษีหัก ณ ที่จ่าย)',
    evidence: '/sfmis/receipt',
  },
  {
    code: '4.4',
    topic: 4,
    weight: 2,
    mode: 'prefill',
    naAllowed: false,
    label: 'ใบเสร็จรับเงินระบุรายละเอียดรายการครบถ้วน สมบูรณ์',
  },
  {
    code: '4.5',
    topic: 4,
    weight: 1,
    mode: 'auto',
    naAllowed: false,
    label:
      'ยอดเงินรวมในใบเสร็จรับเงินทุกฉบับที่รับ ตรงกับยอดที่สรุปไว้ด้านหลังสำเนาใบเสร็จฉบับสุดท้ายของแต่ละวัน',
  },

  // ── ประเด็น 5 การควบคุมการจ่ายเงิน (20) ──
  {
    code: '5.1',
    topic: 5,
    weight: 5,
    mode: 'auto',
    naAllowed: false,
    label: 'การจ่ายเงินแต่ละประเภทตรงตามวัตถุประสงค์ และระเบียบหรือแนวทางการดำเนินงานที่กำหนด',
  },
  {
    code: '5.2',
    topic: 5,
    weight: 5,
    mode: 'auto',
    naAllowed: false,
    label: 'การจ่ายเงินทุกรายการได้รับอนุมัติจากผู้อำนวยการสถานศึกษา',
    evidence: '/sfmis/pay-menu/budget-request',
  },
  {
    code: '5.3',
    topic: 5,
    weight: 5,
    mode: 'prefill',
    naAllowed: false,
    label: 'มีหลักฐานการจ่ายถูกต้อง ครบถ้วนทุกรายการที่จ่ายเงิน',
  },
  {
    code: '5.4',
    topic: 5,
    weight: 3,
    mode: 'manual',
    naAllowed: false,
    label:
      'ใบสำคัญคู่จ่ายที่เป็นใบเสร็จรับเงินจากเจ้าหนี้ มีรายการครบถ้วนตามที่กระทรวงการคลังกำหนด',
  },
  {
    code: '5.5',
    topic: 5,
    weight: 2,
    mode: 'manual',
    naAllowed: false,
    label:
      'ผู้จ่ายเงินประทับตรา "จ่ายเงินแล้ว" ลงลายมือชื่อรับรองการจ่าย ระบุชื่อตัวบรรจงและวัน เดือน ปีที่จ่าย กำกับหลักฐานการจ่ายทุกรายการ',
  },

  // ── ประเด็น 6 การจัดทำบัญชี (17) ──
  {
    code: '6.1',
    topic: 6,
    weight: 1,
    mode: 'auto',
    naAllowed: false,
    label:
      'มีการจัดทำทะเบียนคุมการรับและนำส่งเงินรายได้แผ่นดินเป็นปัจจุบัน บันทึกรายการถูกต้องตรงตามหลักฐาน',
    evidence: '/sfmis/financial-report/gov-revenue',
  },
  {
    code: '6.2',
    topic: 6,
    weight: 5,
    mode: 'auto',
    naAllowed: false,
    label:
      'มีการจัดทำทะเบียนคุมเงินนอกงบประมาณเพื่อควบคุมเงินแต่ละประเภท ครบถ้วน เป็นปัจจุบัน บันทึกรายการรับจ่ายถูกต้องตรงตามหลักฐาน',
    evidence: '/sfmis/financial-report/unified-register',
  },
  {
    code: '6.3',
    topic: 6,
    weight: 2,
    mode: 'auto',
    naAllowed: true,
    label:
      'มีการจัดทำทะเบียนคุมเงินนอกงบประมาณ-เงินฝาก เพื่อใช้ควบคุมเงินประกันสัญญา',
    evidence: '/sfmis/financial-report/deposit-register',
  },
  {
    code: '6.4',
    topic: 6,
    weight: 1,
    mode: 'auto',
    naAllowed: false,
    label: 'มีการจัดทำทะเบียนคุมหลักฐานขอเบิก เพื่อบันทึกรายละเอียดการขอเบิกเงินงบประมาณ',
    evidence: '/sfmis/pay-menu/budget-request',
  },
  {
    code: '6.5',
    topic: 6,
    weight: 2,
    mode: 'auto',
    naAllowed: true,
    label:
      'มีการจัดทำทะเบียนเงินฝากธนาคารประเภทกระแสรายวันครบทุกบัญชี บันทึกรายการถูกต้องตามหลักฐาน',
    evidence: '/sfmis/report/bank-ledger',
  },
  {
    code: '6.6',
    topic: 6,
    weight: 3,
    mode: 'auto',
    naAllowed: false,
    label:
      'มีการจัดทำสมุดคู่ฝาก (ส่วนราชการผู้เบิก) เป็นปัจจุบัน บันทึกควบคุมการฝากถอนเงินกับ สพป./สพม. ถูกต้องครบถ้วน',
    evidence: '/sfmis/financial-report/smp-deposit',
  },
  {
    code: '6.7',
    topic: 6,
    weight: 3,
    mode: 'auto',
    naAllowed: false,
    label:
      'ทุกสิ้นวันทำการ ผอ. หรือผู้ที่ได้รับมอบหมายตรวจสอบการบันทึกรายการเคลื่อนไหวในทะเบียนต่าง ๆ',
    evidence: '/sfmis/report/daily-balance',
  },

  // ── ประเด็น 7 การจัดทำรายงานการเงิน (5) ──
  {
    code: '7.1',
    topic: 7,
    weight: 2,
    mode: 'auto',
    naAllowed: false,
    label:
      'รายงานเงินคงเหลือประจำวัน ณ วันทำการสุดท้ายของเดือน ยอดคงเหลือแต่ละประเภทถูกต้องตรงกับทะเบียนคุมทุกประเภท',
    evidence: '/sfmis/financial-report/daily-balance',
  },
  {
    code: '7.2',
    topic: 7,
    weight: 1,
    mode: 'auto',
    naAllowed: true,
    label:
      'งบเทียบยอดเงินฝากธนาคารประเภทกระแสรายวันทุกบัญชีเป็นประจำทุกเดือน ยอดตาม Bank Statement ตรงกับทะเบียนคุม (ระบุส่วนต่างได้)',
    evidence: '/sfmis/report/bank-reconciliation',
  },
  {
    code: '7.3',
    topic: 7,
    weight: 1,
    mode: 'auto',
    naAllowed: false,
    label:
      'จัดส่งสำเนารายงานเงินคงเหลือประจำวัน ณ วันทำการสุดท้ายของเดือน ให้เขตพื้นที่ฯ ภายในวันที่ 15 ของเดือนถัดไป',
    evidence: '/sfmis/financial-report/monthly-submission',
  },
  {
    code: '7.4',
    topic: 7,
    weight: 0.5,
    mode: 'auto',
    naAllowed: true,
    label: 'จัดส่งงบเทียบยอดเงินฝากธนาคารประเภทกระแสรายวันทุกบัญชี ให้เขตพื้นที่ฯ',
    evidence: '/sfmis/financial-report/monthly-submission',
  },
  {
    code: '7.5',
    topic: 7,
    weight: 0.5,
    mode: 'auto',
    naAllowed: false,
    label:
      'รายงานการรับ-จ่ายเงินรายได้สถานศึกษาประจำปีงบประมาณ เสนอ กก.สถานศึกษาและเขตพื้นที่ฯ ภายใน 30 วันนับแต่วันสิ้นปีงบประมาณ',
    evidence: '/sfmis/financial-report/year-end-report',
  },

  // ── ประเด็น 8 การตรวจสอบรับจ่ายประจำวัน (3) ──
  {
    code: '8.1',
    topic: 8,
    weight: 1,
    mode: 'manual',
    naAllowed: false,
    label:
      'มีการแต่งตั้งหรือมอบหมายผู้ทำหน้าที่ตรวจสอบรับจ่ายประจำวัน (ระเบียบ กค. 2562 ข้อ 43 และข้อ 83 โดยอนุโลม)',
  },
  {
    code: '8.2',
    topic: 8,
    weight: 2,
    mode: 'auto',
    naAllowed: false,
    label: 'ผู้ที่ได้รับมอบหมายมีการตรวจสอบรับจ่ายประจำวันตามที่ระเบียบกำหนด',
    evidence: '/sfmis/report/daily-balance',
  },

  // ── ประเด็น 9 การควบคุมเงินยืม (5) — N/A ทั้งหมดได้ ──
  {
    code: '9.1',
    topic: 9,
    weight: 1,
    mode: 'prefill',
    naAllowed: true,
    label: 'สัญญาการยืมเงินเป็นไปตามแบบที่กระทรวงการคลังกำหนด และมีสาระสำคัญครบถ้วน',
    evidence: '/sfmis/pay-menu/loan-agreement',
  },
  {
    code: '9.2',
    topic: 9,
    weight: 1,
    mode: 'manual',
    naAllowed: true,
    label: 'มีการจัดทำประมาณการค่าใช้จ่ายแนบประกอบสัญญาการยืมเงิน',
  },
  {
    code: '9.3',
    topic: 9,
    weight: 1,
    mode: 'auto',
    naAllowed: true,
    label: 'ไม่มีการให้ลูกหนี้ยืมเงินครั้งใหม่ โดยที่ยังมิได้ส่งใช้เงินยืมรายเก่า',
    evidence: '/sfmis/pay-menu/loan-agreement',
  },
  {
    code: '9.4',
    topic: 9,
    weight: 1,
    mode: 'auto',
    naAllowed: true,
    label: 'การส่งใช้เงินยืมเป็นไปตามระยะเวลาที่ระเบียบกำหนด',
    evidence: '/sfmis/pay-menu/loan-agreement',
  },
  {
    code: '9.5',
    topic: 9,
    weight: 1,
    mode: 'prefill',
    naAllowed: true,
    label:
      'กรณีมีลูกหนี้เงินยืมค้างเกินระยะเวลาที่ระเบียบกำหนด มีการเร่งรัด ติดตาม และรายงานให้ ผอ. ทราบเพื่อพิจารณาสั่งการ',
    evidence: '/sfmis/pay-menu/loan-agreement',
  },

  // ── ประเด็น 10 การควบคุมใบเสร็จรับเงิน (5) ──
  {
    code: '10.1',
    topic: 10,
    weight: 1,
    mode: 'auto',
    naAllowed: false,
    label: 'มีการจัดทำทะเบียนคุมใบเสร็จรับเงิน โดยบันทึกรายการถูกต้อง ครบถ้วน เป็นปัจจุบัน',
    evidence: '/sfmis/financial-report/receipt-book',
  },
  {
    code: '10.2',
    topic: 10,
    weight: 1,
    mode: 'prefill',
    naAllowed: false,
    label:
      'ใบเสร็จที่ลงรายการผิดพลาด ใช้วิธีขีดฆ่าและเขียนใหม่ทั้งจำนวน โดยผู้รับเงินลงลายมือชื่อกำกับ กรณียกเลิกแนบต้นฉบับไว้กับสำเนาในเล่ม',
    evidence: '/sfmis/financial-report/receipt-book',
  },
  {
    code: '10.3',
    topic: 10,
    weight: 1,
    mode: 'auto',
    naAllowed: false,
    label: 'ไม่มีการใช้ใบเสร็จรับเงินข้ามปีงบประมาณ',
    evidence: '/sfmis/financial-report/receipt-book',
  },
  {
    code: '10.4',
    topic: 10,
    weight: 1,
    mode: 'auto',
    naAllowed: true,
    label:
      'ใบเสร็จของปีงบประมาณก่อนที่ใช้ไม่หมดเล่ม มีการประทับตราเลิกใช้ ปรุ หรือเจาะรูใบเสร็จที่เหลือ ไม่ให้นำมาใช้รับเงินได้อีก',
    evidence: '/sfmis/financial-report/receipt-book',
  },
  {
    code: '10.5',
    topic: 10,
    weight: 1,
    mode: 'auto',
    naAllowed: false,
    label:
      'สิ้นปีงบประมาณ จัดทำรายงานการใช้ใบเสร็จรับเงิน เสนอ ผอ. และส่งเขตพื้นที่ฯ อย่างช้าไม่เกินวันที่ 31 ตุลาคมของปีงบประมาณถัดไป',
    evidence: '/sfmis/financial-report/receipt-book',
  },
];

/** ระดับผลการประเมิน (แบบ 2544-2) */
export function assessLevel(percent: number): { level: number; label: string } {
  if (percent >= 85) return { level: 4, label: 'ดีมาก' };
  if (percent >= 70) return { level: 3, label: 'ดี' };
  if (percent >= 60) return { level: 2, label: 'พอใช้' };
  return { level: 1, label: 'ปรับปรุง' };
}

/** ตรวจความถูกต้องของ catalog (กัน weight เพี้ยน) — เรียกใน test */
export function validateCatalog(): { ok: boolean; total: number; count: number } {
  const total = ASSESS_ITEMS.reduce((s, i) => s + i.weight, 0);
  return { ok: Math.abs(total - 100) < 0.001, total, count: ASSESS_ITEMS.length };
}
