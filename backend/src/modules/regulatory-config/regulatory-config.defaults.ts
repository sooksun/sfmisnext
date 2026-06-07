/**
 * regulatory-config.defaults.ts
 *
 * แค็ตตาล็อกเกณฑ์/วงเงินตามกฎหมาย-ระเบียบราชการ (ค่า default)
 * ค่าเหล่านี้ "ตั้งค่าได้" รายโรงเรียนผ่านตาราง regulatory_threshold
 * แต่ถ้าไม่ตั้ง จะ fallback มาที่ค่าตามระเบียบด้านล่างนี้
 *
 * อ้างอิง:
 *  - พ.ร.บ.การจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560
 *  - กฎกระทรวงกำหนดวงเงินฯ / ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างฯ พ.ศ. 2560
 *  - ระเบียบกระทรวงการคลังว่าด้วยการเบิกเงินจากคลังฯ พ.ศ. 2562
 *  - ระบบการควบคุมเงินของหน่วยงานย่อย พ.ศ. 2544
 */

export interface RegulatoryDefault {
  /** คีย์อ้างอิงในโค้ด */
  key: string;
  /** ค่า default ตามระเบียบ */
  value: number;
  /** หน่วย (สำหรับแสดงผล) */
  unit: string;
  /** กลุ่ม: procurement = พัสดุ, finance = การเงิน */
  group: 'procurement' | 'finance';
  /** ป้ายชื่อภาษาไทย */
  label: string;
  /** อ้างอิงกฎหมาย/ระเบียบ */
  lawRef: string;
}

export const REGULATORY_DEFAULTS: RegulatoryDefault[] = [
  // ── พัสดุ (Procurement) ─────────────────────────────────────────────
  {
    key: 'procurement.specific_max',
    value: 500000,
    unit: 'บาท',
    group: 'procurement',
    label: 'วงเงินสูงสุดวิธีเฉพาะเจาะจง',
    lawRef: 'พ.ร.บ.จัดซื้อจัดจ้างฯ 2560 ม.56(2)(ข) + กฎกระทรวงกำหนดวงเงินฯ',
  },
  {
    key: 'procurement.inspector_single_max',
    value: 100000,
    unit: 'บาท',
    group: 'procurement',
    label:
      'วงเงินสูงสุดที่แต่งตั้งผู้ตรวจรับคนเดียวได้ (เกินกว่านี้ต้องเป็นคณะกรรมการ ≥3 คน)',
    lawRef: 'ระเบียบกระทรวงการคลังฯ 2560 ข้อ 25–26',
  },
  {
    key: 'procurement.report_brief_max',
    value: 10000,
    unit: 'บาท',
    group: 'procurement',
    label: 'วงเงินสูงสุดที่ทำรายงานขอซื้อขอจ้างแบบย่อได้',
    lawRef: 'ระเบียบกระทรวงการคลังฯ 2560 ข้อ 22 วรรคสอง',
  },
  {
    key: 'procurement.plan_publish_min',
    value: 500000,
    unit: 'บาท',
    group: 'procurement',
    label: 'วงเงินขั้นต่ำที่ต้องประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง',
    lawRef: 'พ.ร.บ.จัดซื้อจัดจ้างฯ 2560 ม.11',
  },
  {
    key: 'procurement.contract_security_pct',
    value: 5,
    unit: '%',
    group: 'procurement',
    label: 'อัตราหลักประกันสัญญา (ร้อยละของวงเงินตามสัญญา)',
    lawRef: 'ระเบียบกระทรวงการคลังฯ 2560 ข้อ 168',
  },

  // ── การเงิน/ภาษี (Finance) ──────────────────────────────────────────
  {
    key: 'finance.wht_min',
    value: 10000,
    unit: 'บาท',
    group: 'finance',
    label: 'วงเงินขั้นต่ำที่ต้องหักภาษี ณ ที่จ่าย (ต่ำกว่านี้ไม่ต้องหัก)',
    lawRef: 'คำสั่งกรมสรรพากร ท.ป.4/2528',
  },
  {
    key: 'finance.wht_rate_goods',
    value: 1,
    unit: '%',
    group: 'finance',
    label: 'อัตราหักภาษี ณ ที่จ่าย — ซื้อสินค้า/จ้างทำของ',
    lawRef: 'ท.ป.4/2528',
  },
  {
    key: 'finance.wht_rate_service',
    value: 3,
    unit: '%',
    group: 'finance',
    label: 'อัตราหักภาษี ณ ที่จ่าย — ค่าบริการ/ค่าวิชาชีพ',
    lawRef: 'ท.ป.4/2528',
  },
  {
    key: 'finance.wht_rate_rent',
    value: 5,
    unit: '%',
    group: 'finance',
    label: 'อัตราหักภาษี ณ ที่จ่าย — ค่าเช่าอสังหาริมทรัพย์',
    lawRef: 'ท.ป.4/2528',
  },
  {
    key: 'finance.gov_revenue_urgent',
    value: 10000,
    unit: 'บาท',
    group: 'finance',
    label: 'ยอดเงินรายได้แผ่นดินที่ต้องนำส่งภายใน 3 วันทำการ',
    lawRef: 'ระเบียบกระทรวงการคลังฯ 2562 ข้อ 81(2)',
  },
  {
    key: 'finance.gov_revenue_urgent_days',
    value: 3,
    unit: 'วันทำการ',
    group: 'finance',
    label: 'จำนวนวันทำการที่ต้องนำส่งเงินรายได้แผ่นดิน (กรณีเกินวงเงิน)',
    lawRef: 'ระเบียบกระทรวงการคลังฯ 2562 ข้อ 81(2)',
  },
  {
    key: 'finance.cash_reserve_default',
    value: 15000,
    unit: 'บาท',
    group: 'finance',
    label: 'วงเงินเก็บรักษาเงินสดเริ่มต้น (เงินรายได้สถานศึกษา)',
    lawRef: 'หนังสือกรมบัญชีกลาง 5 ต.ค. 2549',
  },
  {
    key: 'finance.monthly_submit_day',
    value: 15,
    unit: 'วันที่',
    group: 'finance',
    label: 'เส้นตายส่งรายงานการเงินรายเดือนให้ สพท. (วันที่ของเดือนถัดไป)',
    lawRef: 'แนวการประเมินฯ กลุ่มตรวจสอบภายใน สพฐ. 2567',
  },
  {
    key: 'finance.block_overspend',
    value: 1,
    unit: '0/1',
    group: 'finance',
    label:
      'บล็อกการจ่าย/ยืมเกินยอดคงเหลือของประเภทเงิน (1=บล็อก, 0=ปิด) — เงินแต่ละประเภทห้ามติดลบ',
    lawRef: 'ระบบการควบคุมเงินของหน่วยงานย่อย พ.ศ. 2544',
  },
  {
    key: 'finance.block_cash_negative',
    value: 1,
    unit: '0/1',
    group: 'finance',
    label:
      'บล็อกการจ่ายเงินสดเกินยอดเงินสดคงเหลือของประเภทเงิน (1=บล็อก, 0=ปิด) — เงินสดห้ามติดลบ ต้องเบิกเงินสดจากธนาคารก่อนจ่าย',
    lawRef: 'ระบบการควบคุมเงินของหน่วยงานย่อย พ.ศ. 2544',
  },
];

/** map key → ค่า default (ใช้ fallback เร็ว ๆ) */
export const REGULATORY_DEFAULT_MAP: Record<string, number> =
  REGULATORY_DEFAULTS.reduce(
    (acc, d) => {
      acc[d.key] = d.value;
      return acc;
    },
    {} as Record<string, number>,
  );
