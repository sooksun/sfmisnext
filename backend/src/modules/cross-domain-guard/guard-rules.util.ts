/**
 * guard-rules.util.ts
 *
 * กฎตรวจ "ความขัดแย้งข้ามงาน" (นโยบาย/แผน → พัสดุ → การเงิน) แบบ pure function
 * - ทดสอบได้ (ไม่มี dependency กับ DB/NestJS)
 * - ใช้ซ้ำได้ทั้ง write-path (enforce/บล็อก) และ inspect-path (สแกนเป็น alert ให้ AI)
 *
 * อ้างอิง:
 *  - ระบบการควบคุมเงินของหน่วยงานย่อย พ.ศ. 2544 (ห้ามก่อหนี้/จ่ายเกินวงเงิน)
 *  - ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างฯ 2560
 *  - ระเบียบกระทรวงการคลังว่าด้วยการเบิกเงินจากคลังฯ 2562 (เบิกได้เมื่อตรวจรับแล้ว)
 */

export type GuardSeverity = 'info' | 'warning' | 'error';

export interface GuardRuleResult {
  ok: boolean;
  /** รหัสกฎ (ใช้เป็น alert.type ฝั่ง inspect) */
  code: string;
  severity: GuardSeverity;
  /** ข้อความอธิบาย (แสดงผู้ใช้ได้ทันที) */
  message: string;
  /** อ้างอิงระเบียบ */
  lawRef?: string;
}

/** กันปัญหา float ปัดเศษสตางค์ (ให้ตรงกับ validatePayableLimit) */
export const GUARD_EPS = 0.005;

const baht = (n: number) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 });

/**
 * normalize ปีงบประมาณให้เทียบกันได้
 * รองรับ string/number, พ.ศ. (≥2400) → ค.ศ. และ ค.ศ. คงเดิม
 * คืน null ถ้าแปลงไม่ได้ (จะถูกข้ามตอนเทียบ)
 */
export function normalizeBudgetYear(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  // พ.ศ. → ค.ศ. (idempotent: ค.ศ. ที่สมเหตุผลจะ < 2400)
  return n >= 2400 ? n - 543 : n;
}

// ─────────────────────────────────────────────────────────────────────────
// G1 — โครงการก่อหนี้จัดซื้อรวมเกินวงเงินโครงการ
// ผลรวมคำสั่งซื้อที่ยังไม่ยกเลิก + วงเงินใหม่ ต้องไม่เกินงบโครงการ
// ─────────────────────────────────────────────────────────────────────────
export interface ProjectOvercommitInput {
  /** งบโครงการที่อนุมัติ (pln_project.proj_budget) */
  projBudget: number;
  /** ผลรวมวงเงินคำสั่งซื้อเดิมของโครงการ (ไม่รวมรายการที่กำลังตรวจ) */
  committedTotal: number;
  /** วงเงินคำสั่งซื้อใหม่/ที่กำลังบันทึก */
  newAmount: number;
}

export function checkProjectOvercommit(
  i: ProjectOvercommitInput,
): GuardRuleResult {
  const budget = Number(i.projBudget ?? 0);
  // ถ้าไม่ได้กำหนดงบโครงการ (0) → ไม่บังคับกฎนี้ (ใช้กฎ R2 เตือนงบ=0 แทน)
  if (budget <= 0) {
    return {
      ok: true,
      code: 'project_overcommit',
      severity: 'info',
      message: '',
    };
  }
  const remaining = budget - Number(i.committedTotal ?? 0);
  const want = Number(i.newAmount ?? 0);
  if (want > remaining + GUARD_EPS) {
    return {
      ok: false,
      code: 'project_overcommit',
      severity: 'error',
      message:
        `วงเงินจัดซื้อของโครงการคงเหลือ ${baht(remaining)} บาท ` +
        `แต่ขอก่อหนี้ ${baht(want)} บาท (งบโครงการ ${baht(budget)} บาท) — เกินวงเงินโครงการ`,
      lawRef: 'ระบบการควบคุมเงินของหน่วยงานย่อย พ.ศ. 2544',
    };
  }
  return {
    ok: true,
    code: 'project_overcommit',
    severity: 'info',
    message: '',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// G2 — มูลค่าสัญญาเกินวงเงินคำสั่งซื้อ
// ─────────────────────────────────────────────────────────────────────────
export interface ContractOverOrderInput {
  /** วงเงินคำสั่งซื้อที่อนุมัติจัดหา (parcel_order.budgets) */
  orderBudget: number;
  /** มูลค่ารวมตามสัญญา (sup_contract.ct_total) */
  contractTotal: number;
}

export function checkContractOverOrder(
  i: ContractOverOrderInput,
): GuardRuleResult {
  const order = Number(i.orderBudget ?? 0);
  const contract = Number(i.contractTotal ?? 0);
  if (order > 0 && contract > order + GUARD_EPS) {
    return {
      ok: false,
      code: 'contract_over_order',
      severity: 'error',
      message:
        `มูลค่าสัญญา ${baht(contract)} บาท เกินวงเงินคำสั่งซื้อที่อนุมัติ ${baht(order)} บาท — ` +
        `ต้องไม่เกินวงเงินที่อนุมัติจัดหา`,
      lawRef: 'ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างฯ 2560',
    };
  }
  return {
    ok: true,
    code: 'contract_over_order',
    severity: 'info',
    message: '',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// G3 — ตั้งเบิกก่อนตรวจรับพัสดุครบ
// ─────────────────────────────────────────────────────────────────────────
export interface PayBeforeInspectionInput {
  /** คำสั่งซื้อนี้ต้องตรวจรับก่อนเบิกหรือไม่ (วัสดุ/ครุภัณฑ์=true, ค่าเดินทาง/เงินยืม=false) */
  requiresInspection: boolean;
  /** ตรวจรับผ่านแล้ว (sup_inspection.insp_result = ผ่าน) */
  inspectionPassed: boolean;
  /** ลงบัญชีพัสดุแล้ว (sup_inspection.stock_posted = 1) */
  stockPosted: boolean;
}

export function checkPayBeforeInspection(
  i: PayBeforeInspectionInput,
): GuardRuleResult {
  if (!i.requiresInspection) {
    return {
      ok: true,
      code: 'pay_before_inspection',
      severity: 'info',
      message: '',
    };
  }
  if (!i.inspectionPassed || !i.stockPosted) {
    const missing = !i.inspectionPassed
      ? 'ยังไม่ผ่านการตรวจรับ'
      : 'ตรวจรับแล้วแต่ยังไม่ได้ลงบัญชีพัสดุ';
    return {
      ok: false,
      code: 'pay_before_inspection',
      severity: 'error',
      message: `ไม่สามารถตั้งเบิกได้ — ${missing} (ต้องตรวจรับผ่านและลงบัญชีพัสดุก่อนจึงเกิดมูลหนี้ให้เบิกได้)`,
      lawRef: 'ระเบียบกระทรวงการคลังว่าด้วยการเบิกเงินจากคลังฯ 2562',
    };
  }
  return {
    ok: true,
    code: 'pay_before_inspection',
    severity: 'info',
    message: '',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// G4 — ปีงบประมาณไม่สอดคล้องกันข้ามเอกสาร (soft warning)
// labels: รายชื่อเอกสาร+ปี เพื่อบอกผู้ใช้ว่าตัวไหนเพี้ยน
// ─────────────────────────────────────────────────────────────────────────
export interface YearMismatchInput {
  years: { label: string; year: string | number | null | undefined }[];
}

export function checkYearMismatch(i: YearMismatchInput): GuardRuleResult {
  const normalized = i.years
    .map((y) => ({ label: y.label, ce: normalizeBudgetYear(y.year) }))
    .filter((y) => y.ce !== null);
  const distinct = Array.from(new Set(normalized.map((y) => y.ce)));
  if (distinct.length > 1) {
    const detail = normalized
      .map((y) => `${y.label}=${(y.ce as number) + 543}`)
      .join(', ');
    return {
      ok: false,
      code: 'year_mismatch',
      severity: 'warning',
      message: `ปีงบประมาณไม่สอดคล้องกันข้ามเอกสาร (${detail}) — ตรวจสอบว่าควรเป็นปีงบเดียวกัน`,
      lawRef: 'แนวการประเมินฯ กลุ่มตรวจสอบภายใน สพฐ.',
    };
  }
  return { ok: true, code: 'year_mismatch', severity: 'info', message: '' };
}

// ─────────────────────────────────────────────────────────────────────────
// G5 — อ้างอิงประเภทเงิน/หมวดงบที่ไม่ได้เปิดใช้ในปีนั้น (soft warning)
// ─────────────────────────────────────────────────────────────────────────
export interface InactiveBgTypeInput {
  bgTypeId: number;
  /** ประเภทเงินนี้เปิดใช้ในปีงบนั้นหรือไม่ (มี estimate/หมวด active) */
  isActive: boolean;
}

export function checkInactiveBgType(i: InactiveBgTypeInput): GuardRuleResult {
  if (!i.isActive) {
    return {
      ok: false,
      code: 'inactive_bgtype',
      severity: 'warning',
      message: `ประเภทเงิน/หมวดงบรหัส ${i.bgTypeId} ไม่ได้เปิดใช้หรือไม่มีวงเงินในปีงบนี้ — ตรวจสอบการตั้งงบประมาณ`,
      lawRef: 'ระบบการควบคุมเงินของหน่วยงานย่อย พ.ศ. 2544',
    };
  }
  return { ok: true, code: 'inactive_bgtype', severity: 'info', message: '' };
}
