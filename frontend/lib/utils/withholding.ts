/**
 * withholding.ts — คำนวณภาษีหัก ณ ที่จ่าย (Withholding Tax)
 *
 * Mirror ของ backend/src/common/utils/withholding.util.ts
 * ใช้สำหรับ preview ยอดใน UI โดยไม่ต้องเรียก API
 *
 * อัตรา (opts.rate) default 1% — ซื้อสินค้า/จ้างทำของ ; บริการ 3% ; เช่า 5%
 * เกณฑ์ขั้นต่ำ (opts.minThreshold): ยอดต่ำกว่าไม่หัก (default 0 = ไม่ gate)
 */

export interface WithholdingOptions {
  /** อัตราหัก ณ ที่จ่าย เป็น % (เช่น 1, 3, 5) — default 1 */
  rate?: number
  /** วงเงินขั้นต่ำที่ต้องหัก (gross) — ต่ำกว่านี้ไม่หัก ; default 0 */
  minThreshold?: number
}

export interface WithholdingResult {
  /** ยอดรวม (ก่อนหัก) */
  gross: number;
  /** ฐานภาษีที่ใช้คำนวณ (ก่อนบวก VAT ถ้ามี) */
  base: number;
  /** ภาษีมูลค่าเพิ่ม 7% (0 ถ้า calVat ≠ 1) */
  vatAmount: number;
  /** อัตราหัก ณ ที่จ่าย (0.01 = 1%) */
  withholdRate: number;
  /** จำนวนเงินที่หัก ณ ที่จ่าย */
  withholdAmount: number;
  /** ยอดจ่ายสุทธิ (gross − withholdAmount) */
  netPayable: number;
}

/**
 * คำนวณภาษีหัก ณ ที่จ่าย
 *
 * @param amount  - จำนวนเงินรวม (รวม VAT ถ้ามี)
 * @param calVat  - 1 = มี VAT 7%, ค่าอื่น = ไม่มี VAT
 */
export function calcWithholding(
  amount: number,
  calVat: number,
  opts: WithholdingOptions = {},
): WithholdingResult {
  const gross = amount;
  const ratePct = opts.rate ?? 1
  const minThreshold = opts.minThreshold ?? 0
  const withholdRate = ratePct / 100;

  let base: number;
  let vatAmount: number;

  if (calVat === 1) {
    base = (amount * 100) / 107;
    vatAmount = amount - base;
  } else {
    base = amount;
    vatAmount = 0;
  }

  const withholdAmount = gross < minThreshold ? 0 : base * withholdRate;
  const netPayable = gross - withholdAmount;

  return {
    gross: roundTo2(gross),
    base: roundTo2(base),
    vatAmount: roundTo2(vatAmount),
    withholdRate,
    withholdAmount: roundTo2(withholdAmount),
    netPayable: roundTo2(netPayable),
  };
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}
