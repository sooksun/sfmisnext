/**
 * withholding.ts — คำนวณภาษีหัก ณ ที่จ่าย (Withholding Tax)
 *
 * Mirror ของ backend/src/common/utils/withholding.util.ts
 * ใช้สำหรับ preview ยอดใน UI โดยไม่ต้องเรียก API
 *
 * อัตรา 1% — ทั้งบุคคลธรรมดา (pType=1) และนิติบุคคล (pType=2)
 */

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
export function calcWithholding(amount: number, calVat: number): WithholdingResult {
  const gross = amount;
  const withholdRate = 0.01;

  let base: number;
  let vatAmount: number;

  if (calVat === 1) {
    base = (amount * 100) / 107;
    vatAmount = amount - base;
  } else {
    base = amount;
    vatAmount = 0;
  }

  const withholdAmount = base * withholdRate;
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
