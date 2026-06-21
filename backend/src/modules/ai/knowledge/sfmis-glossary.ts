/**
 * sfmis-glossary.ts
 *
 * อภิธานศัพท์งานการเงิน-พัสดุของสถานศึกษา (สพฐ.) + เครื่องมือเดาคำใกล้เคียง
 *
 * ใช้ 2 จุด:
 *  1) AssistantCommandService — จับคู่งานแบบทนคำสะกดผิด/คำเรียกไม่เป็นทางการ
 *     และเสนอ "คุณหมายถึง ..." (did-you-mean)
 *  2) ChatService — ฉีดเป็นฐานความรู้คำศัพท์ใน system prompt เพื่อให้ตีความ
 *     คำที่ผู้ใช้พิมพ์ผิด/ย่อ แล้วตอบโดยอ้างคำที่ถูกต้อง
 *
 * เป็น pure functions ทั้งหมด (ไม่มี dependency) — ทดสอบ/นำกลับมาใช้ใหม่ได้ง่าย
 */

export interface GlossaryTerm {
  /** คำ/ชื่อทางการที่ถูกต้อง */
  canonical: string;
  /** ตัวย่อหรือรหัสเอกสาร (เช่น บร., บค.) — ถ้ามี */
  abbr?: string;
  /** คำพ้อง คำเรียกไม่เป็นทางการ และตัวสะกดที่คนมักพิมพ์ */
  variants: string[];
  /** คำอธิบายสั้น (1 บรรทัด) สำหรับให้ AI ใช้ตอบ */
  meaning: string;
  /** หมวด: เงิน | เอกสาร | ภาษี | พัสดุ | ยืมเงิน | รายงาน | ทั่วไป */
  category: string;
  /** task_key ของงานที่เกี่ยวข้อง (ถ้าผู้ใช้พูดถึงคำนี้ มักอยากทำงานนี้) */
  relatedTask?: string;
}

/**
 * ฐานคำศัพท์ — เพิ่ม/แก้ได้ตามจริง คำใน variants ควรครอบคลุมคำที่ครูเรียกจริง
 * รวมถึงตัวสะกดผิดที่พบบ่อย (เครื่องเดาคำจะทนคำผิดเล็กน้อยได้อยู่แล้ว)
 */
export const SFMIS_GLOSSARY: GlossaryTerm[] = [
  // ── ประเภทเงิน ───────────────────────────────────────────────────────────
  {
    canonical: 'เงินอุดหนุนค่าใช้จ่ายรายหัว',
    variants: ['เงินอุดหนุนรายหัว', 'เงินรายหัว', 'งบรายหัว', 'ค่าใช้จ่ายรายหัว', 'อุดหนุนรายหัว', 'รายหัว'],
    meaning: 'เงินอุดหนุนทั่วไปที่จัดสรรตามจำนวนนักเรียน (รายหัว) ใช้เป็นค่าใช้จ่ายในการจัดการเรียนการสอน',
    category: 'เงิน',
  },
  {
    canonical: 'เงินอุดหนุนปัจจัยพื้นฐานนักเรียนยากจน',
    variants: ['ปัจจัยพื้นฐาน', 'เงินปัจจัยพื้นฐาน', 'นักเรียนยากจน', 'เงินยากจน', 'ปจ.พื้นฐาน'],
    meaning: 'เงินอุดหนุนช่วยเหลือนักเรียนยากจนระดับประถม-ม.ต้น เพื่อลดความเหลื่อมล้ำ',
    category: 'เงิน',
  },
  {
    canonical: 'เงินอุดหนุนเรียนฟรี 15 ปี',
    variants: ['เรียนฟรี', 'เรียนฟรี 15 ปี', 'เงินเรียนฟรี', 'นโยบายเรียนฟรี', '15 ปี'],
    meaning: 'เงินอุดหนุนตามนโยบายเรียนฟรี 15 ปี: ค่าหนังสือ อุปกรณ์การเรียน เครื่องแบบ และกิจกรรมพัฒนาผู้เรียน',
    category: 'เงิน',
  },
  {
    canonical: 'เงินอุดหนุนค่าอาหารกลางวัน',
    variants: ['อาหารกลางวัน', 'ค่าอาหารกลางวัน', 'เงินอาหารกลางวัน', 'อุดหนุน อปท.', 'อปท อาหารกลางวัน'],
    meaning: 'เงินอุดหนุนค่าอาหารกลางวันนักเรียน (มักได้รับจาก อปท./เทศบาล)',
    category: 'เงิน',
  },
  {
    canonical: 'เงินรายได้สถานศึกษา',
    variants: ['รายได้สถานศึกษา', 'เงินรายได้', 'รายได้โรงเรียน', 'เงินบำรุงการศึกษา', 'เงินนอกงบ'],
    meaning: 'เงินรายได้ของสถานศึกษา (เช่น ค่าบำรุง บริจาค ผลประโยชน์) เก็บรักษาได้ตามวงเงิน ส่วนเกินต้องนำฝากธนาคาร',
    category: 'เงิน',
  },
  {
    canonical: 'เงินรายได้แผ่นดิน',
    abbr: 'บง.',
    variants: ['รายได้แผ่นดิน', 'เงินแผ่นดิน', 'นำส่งคลัง', 'นำส่งรายได้แผ่นดิน', 'เงินส่งคลัง'],
    meaning: 'เงินที่ต้องนำส่งคลังเป็นรายได้แผ่นดิน เช่น ดอกเบี้ย เงินเหลือจ่าย — ยอดเกินเกณฑ์ต้องนำส่งภายในกำหนด',
    category: 'เงิน',
    relatedTask: 'work_alerts',
  },
  {
    canonical: 'ภาษีหัก ณ ที่จ่าย',
    variants: ['หัก ณ ที่จ่าย', 'ภาษีหัก', 'หักภาษี', 'wht', 'ภงด', 'ภ.ง.ด.'],
    meaning: 'ภาษีที่ผู้จ่ายเงินหักไว้เมื่อจ่าย ≥ เกณฑ์ แล้วนำส่งสรรพากร (ซื้อของ/จ้างทำของ 1% บริการ 1% ค่าเช่า 5%)',
    category: 'ภาษี',
    relatedTask: 'withholding_certificate',
  },
  {
    canonical: 'เงินประกันสัญญา',
    variants: ['ประกันสัญญา', 'หลักประกันสัญญา', 'เงินค้ำประกัน', 'หลักประกัน'],
    meaning: 'เงินหลักประกันการปฏิบัติตามสัญญา (ปกติ 5% ของวงเงินตามสัญญา) คืนเมื่อพ้นกำหนดรับประกัน',
    category: 'เงิน',
  },

  // ── เอกสาร / เลขที่ ────────────────────────────────────────────────────────
  {
    canonical: 'ใบเสร็จรับเงิน',
    abbr: 'บร.',
    variants: ['ใบเสร็จ', 'บร', 'ออกใบเสร็จ', 'รับเงิน', 'ใบรับเงิน'],
    meaning: 'หลักฐานการรับเงิน ออกเป็นเล่ม-เลขที่ (บร.) ต้องมีชื่อผู้ชำระ วันที่ รายการ จำนวนเงิน และลายมือชื่อผู้รับ',
    category: 'เอกสาร',
    relatedTask: 'receive_money',
  },
  {
    canonical: 'ใบสำคัญจ่ายเงินสด',
    abbr: 'บค.',
    variants: ['บค', 'ใบสำคัญจ่าย', 'เบิกเงินสด', 'จ่ายเงินสด'],
    meaning: 'หลักฐานการจ่ายเงินสด (บค.) ใช้เมื่อจ่ายเป็นเงินสดให้ผู้รับภายใน/ภายนอก',
    category: 'เอกสาร',
    relatedTask: 'create_invoice',
  },
  {
    canonical: 'ใบสำคัญจ่ายเช็ค',
    abbr: 'บจ.',
    variants: ['บจ', 'จ่ายเช็ค', 'ออกเช็ค', 'สั่งจ่ายเช็ค'],
    meaning: 'หลักฐานการจ่ายเงินด้วยเช็ค (บจ.) ใช้เมื่อสั่งจ่ายผ่านบัญชีธนาคาร',
    category: 'เอกสาร',
    relatedTask: 'generate_check',
  },
  {
    canonical: 'สัญญายืมเงิน',
    abbr: 'บย.',
    variants: ['บย', 'ยืมเงิน', 'เงินยืม', 'ลูกหนี้เงินยืม', 'ขอยืมเงิน', 'ใบยืมเงิน'],
    meaning: 'สัญญาการยืมเงินราชการ (บย.) ค่าเดินทางส่งใช้ภายใน 15 วัน อื่น ๆ 30 วัน ห้ามยืมใหม่ถ้ายังค้างเก่า',
    category: 'ยืมเงิน',
    relatedTask: 'create_loan',
  },
  {
    canonical: 'ใบเบิกค่าใช้จ่ายในการเดินทางไปราชการ',
    abbr: 'แบบ 8708',
    variants: ['ค่าเดินทาง', 'เบิกค่าเดินทาง', 'เดินทางไปราชการ', '8708', 'ค่าเดินทางไปราชการ', 'ค่าเบี้ยเลี้ยง'],
    meaning: 'แบบขอเบิกค่าใช้จ่ายเดินทางไปราชการ (แบบ 8708): เบี้ยเลี้ยง ที่พัก พาหนะ ค่าใช้จ่ายอื่น',
    category: 'เอกสาร',
    relatedTask: 'travel_reimbursement',
  },
  {
    canonical: 'ใบรับรองแทนใบเสร็จรับเงิน',
    abbr: 'แบบ บก.111',
    variants: ['บก.111', 'บก111', 'ใบรับรองแทนใบเสร็จ', 'รับรองแทนใบเสร็จ', 'ไม่มีใบเสร็จ'],
    meaning: 'แบบ บก.111 ใช้รับรองรายจ่ายที่ไม่อาจเรียกใบเสร็จรับเงินได้ (เช่น ค่าพาหนะ/ค่าใช้จ่ายอื่นในการเดินทาง)',
    category: 'เอกสาร',
    relatedTask: 'travel_reimbursement',
  },
  {
    canonical: 'หนังสือรับรองการหักภาษี ณ ที่จ่าย',
    variants: ['หนังสือรับรองหักภาษี', 'ใบหักภาษี', 'ใบรับรองหักภาษี', '50 ทวิ', 'หนังสือรับรองภาษี'],
    meaning: 'หนังสือรับรองที่ออกให้ผู้ถูกหักภาษี ณ ที่จ่าย เพื่อใช้เป็นหลักฐานภาษี',
    category: 'เอกสาร',
    relatedTask: 'withholding_certificate',
  },

  // ── พัสดุ / จัดซื้อจัดจ้าง ─────────────────────────────────────────────────
  {
    canonical: 'รายงานขอซื้อขอจ้าง',
    variants: ['ขอซื้อ', 'ขอจ้าง', 'รายงานขอซื้อ', 'จัดซื้อ', 'จัดจ้าง', 'จัดซื้อจัดจ้าง', 'ซื้อของ'],
    meaning: 'เอกสารเริ่มกระบวนการจัดซื้อจัดจ้าง — ต้องอนุมัติก่อนดำเนินการ และห้ามจ่ายก่อนตรวจรับ',
    category: 'พัสดุ',
    relatedTask: 'procurement_request',
  },
  {
    canonical: 'แผนการจัดซื้อจัดจ้าง',
    variants: ['แผนจัดซื้อ', 'แผนจัดจ้าง', 'แผนการจัดซื้อ', 'ทำแผนจัดซื้อ'],
    meaning: 'แผนการจัดซื้อจัดจ้างประจำปี โครงการวงเงินถึงเกณฑ์ต้องประกาศเผยแพร่แผน',
    category: 'พัสดุ',
    relatedTask: 'create_procurement_plan',
  },
  {
    canonical: 'วิธีเฉพาะเจาะจง',
    variants: ['เฉพาะเจาะจง', 'ตกลงราคา', 'วิธีตกลงราคา', 'จัดซื้อเฉพาะเจาะจง'],
    meaning: 'วิธีจัดซื้อจัดจ้างที่ใช้ได้เมื่อวงเงินไม่เกินเกณฑ์ที่กำหนด เกินกว่านั้นต้องวิธีคัดเลือก/e-bidding',
    category: 'พัสดุ',
  },
  {
    canonical: 'คณะกรรมการตรวจรับพัสดุ',
    variants: ['ตรวจรับ', 'กรรมการตรวจรับ', 'ตรวจรับพัสดุ', 'รับพัสดุ', 'คณะกรรมการตรวจรับ'],
    meaning: 'ผู้ตรวจรับพัสดุ/งานจ้าง — วงเงินน้อยแต่งตั้งคนเดียวได้ เกินเกณฑ์ต้องคณะกรรมการ ≥ 3 คน',
    category: 'พัสดุ',
    relatedTask: 'receive_parcel',
  },
  {
    canonical: 'บัญชีวัสดุ',
    variants: ['ทะเบียนวัสดุ', 'เบิกวัสดุ', 'คลังวัสดุ', 'วัสดุคงคลัง'],
    meaning: 'ทะเบียนคุมวัสดุ บันทึกรับ-จ่าย-คงเหลือวัสดุของโรงเรียน',
    category: 'พัสดุ',
    relatedTask: 'supplies',
  },

  // ── แผนงาน / โครงการ ───────────────────────────────────────────────────────
  {
    canonical: 'โครงการ',
    variants: ['เพิ่มโครงการ', 'สร้างโครงการ', 'แผนงานโครงการ', 'งานโครงการ'],
    meaning: 'โครงการตามแผนปฏิบัติการประจำปี ใช้เป็นต้นเรื่องเบิกจ่ายและจัดซื้อจัดจ้าง',
    category: 'ทั่วไป',
    relatedTask: 'create_project',
  },
  {
    canonical: 'เงินยืมข้ามประเภท',
    variants: ['ยืมข้ามประเภท', 'ยืมเงินข้ามประเภท', 'ยืมข้ามบัญชี', 'ยืมข้ามหมวด'],
    meaning: 'การยืมเงินจากประเภทเงินหนึ่งไปใช้อีกประเภทชั่วคราว — ห้ามยืมจากภาษี/ประกัน/รายได้แผ่นดิน',
    category: 'ยืมเงิน',
    relatedTask: 'fund_borrowing',
  },
  {
    canonical: 'เงินฝาก สพป./สพท.',
    abbr: 'บฝ./บถ.',
    variants: ['ฝากเงิน สพป', 'ถอนเงิน สพป', 'สมุดคู่ฝาก', 'เงินฝากเขต', 'ฝากเขตพื้นที่'],
    meaning: 'เงินนอกงบประมาณที่ฝากไว้กับ สพป./สพท. (บฝ.=นำฝาก บถ.=ถอน) มีสมุดคู่ฝากควบคุม',
    category: 'เงิน',
    relatedTask: 'spp_deposit',
  },

  // ── รายงาน ────────────────────────────────────────────────────────────────
  {
    canonical: 'รายงานเงินคงเหลือประจำวัน',
    variants: ['เงินคงเหลือประจำวัน', 'ปิดยอดประจำวัน', 'รายงานสิ้นวัน', 'ยอดคงเหลือประจำวัน'],
    meaning: 'รายงานสรุปเงินคงเหลือ (เงินสด/เงินฝาก) ณ สิ้นวัน เพื่อปิดยอดและให้คณะกรรมการเก็บรักษาเงินลงนาม',
    category: 'รายงาน',
    relatedTask: 'daily_balance',
  },
  {
    canonical: 'รายงานการเงินประจำเดือน',
    variants: ['รายงานประจำเดือน', 'นำส่งรายเดือน', 'รายงานเดือน', 'ส่งรายงานเขต'],
    meaning: 'รายงานการเงินที่ต้องนำส่ง สพท. ภายในวันที่กำหนดของเดือนถัดไป',
    category: 'รายงาน',
    relatedTask: 'monthly_submission',
  },
  {
    canonical: 'งานค้างและคำเตือน',
    variants: ['งานค้าง', 'งานเร่งด่วน', 'คำเตือน', 'ความเสี่ยง', 'แจ้งเตือน', 'สิ่งที่ต้องทำ'],
    meaning: 'รายการงานที่ค้างดำเนินการหรือมีความเสี่ยงผิดระเบียบ ควรจัดการก่อน',
    category: 'รายงาน',
    relatedTask: 'work_alerts',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// เครื่องมือเดาคำใกล้เคียง (typo-tolerant)
// ════════════════════════════════════════════════════════════════════════════

const THAI_TONE_MARKS = /[็-๎]/g; // ไม้เอก-โท-ตรี-จัตวา + วรรณยุกต์/การันต์

/**
 * normalize ข้อความไทยสำหรับเทียบ: ตัดช่องว่าง/อักขระวรรณยุกต์/ตัวเล็ก
 * ทำให้ "เงินอุดหนุน  รายหัว" ≈ "เงินอุดหนุนรายหัว" และทนรูปวรรณยุกต์ต่างกัน
 */
export function normalizeThai(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .replace(THAI_TONE_MARKS, '')
    .replace(/[\s.,()/\-_"'`]/g, '')
    .trim();
}

/** ระยะแก้ไข Levenshtein (จำนวนการเพิ่ม/ลบ/แทนที่อักขระ) */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** ความคล้าย 0..1 จากระยะแก้ไข (1 = เหมือนกันทุกตัว) */
export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/**
 * หาความคล้ายสูงสุดของ needle เทียบกับ "หน้าต่าง" ทุกตำแหน่งใน haystack
 * รองรับกรณีคำศัพท์ฝังอยู่ในประโยค เช่น "อยากเบิกเงินอุดหนนุนรายหัว"
 * - exact substring → 1.0
 * - ไม่งั้นเลื่อนหน้าต่าง ±2 ตัว แล้วเอาค่าคล้ายสูงสุด
 */
function bestWindowSimilarity(haystack: string, needle: string): number {
  if (!needle) return 0;
  if (haystack.includes(needle)) return 1;
  const n = needle.length;
  let best = 0;
  const lo = Math.max(1, n - 2);
  const hi = n + 2;
  for (let w = lo; w <= hi; w++) {
    for (let i = 0; i + w <= haystack.length; i++) {
      const s = similarity(haystack.slice(i, i + w), needle);
      if (s > best) {
        best = s;
        if (best === 1) return 1;
      }
    }
  }
  return best;
}

/**
 * haystack มี needle แบบทนคำสะกดผิดเล็กน้อยหรือไม่ (>= threshold)
 * normalize ให้อัตโนมัติ — ใช้กับการจับคู่ alias ของงาน
 */
export function fuzzyIncludes(haystack: string, needle: string, threshold = 0.82): boolean {
  const h = normalizeThai(haystack);
  const n = normalizeThai(needle);
  if (n.length < 2) return false;
  if (h.includes(n)) return true;
  return bestWindowSimilarity(h, n) >= threshold;
}

export interface TermSuggestion {
  canonical: string;
  abbr?: string;
  meaning: string;
  category: string;
  relatedTask?: string;
  /** คะแนนความมั่นใจ 0..1 */
  score: number;
  /** คำที่ผู้ใช้พิมพ์ซึ่งไปตรงกับศัพท์นี้ (surface form ที่ match) */
  matched: string;
}

/** จำกัดความยาวที่นำมาเทียบแบบ fuzzy (กันค่าใช้จ่ายบนข้อความยาว) */
const FUZZY_MAX_HAYSTACK = 220;

/**
 * เดาศัพท์ที่ผู้ใช้น่าจะหมายถึงจากข้อความ (did-you-mean)
 * ทนคำสะกดผิดเล็กน้อย เช่น "อุดหนนุนรายหัว" → "เงินอุดหนุนค่าใช้จ่ายรายหัว"
 *
 * @param input   ข้อความผู้ใช้ (คำเดียวหรือทั้งประโยค)
 * @param opts    limit (ค่าเริ่มต้น 3), minScore (ค่าเริ่มต้น 0.68)
 */
export function suggestTerms(
  input: string,
  opts: { limit?: number; minScore?: number } = {},
): TermSuggestion[] {
  const limit = opts.limit ?? 3;
  const minScore = opts.minScore ?? 0.68;
  const hay = normalizeThai(input).slice(0, FUZZY_MAX_HAYSTACK);
  if (hay.length < 2) return [];

  const results: TermSuggestion[] = [];
  for (const term of SFMIS_GLOSSARY) {
    const surfaces = [term.canonical, ...(term.abbr ? [term.abbr] : []), ...term.variants];
    let best = 0;
    let bestSurface = term.canonical;
    for (const surface of surfaces) {
      const norm = normalizeThai(surface);
      if (norm.length < 2) continue;
      // ศัพท์สั้น (≤3 ตัว เช่น "บร") ต้องตรงเป๊ะ — กัน false positive
      const score =
        norm.length <= 3
          ? hay.includes(norm)
            ? 1
            : 0
          : bestWindowSimilarity(hay, norm);
      if (score > best) {
        best = score;
        bestSurface = surface;
      }
    }
    if (best >= minScore) {
      results.push({
        canonical: term.canonical,
        abbr: term.abbr,
        meaning: term.meaning,
        category: term.category,
        relatedTask: term.relatedTask,
        score: Number(best.toFixed(3)),
        matched: bestSurface,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score || b.matched.length - a.matched.length)
    .slice(0, limit);
}

/**
 * บล็อกข้อความอภิธานศัพท์สำหรับใส่ใน system prompt ของแชท
 * ให้ AI ตีความคำที่ผู้ใช้พิมพ์ผิด/ย่อ แล้วอ้างถึงคำที่ถูกต้อง
 */
export function buildGlossaryPromptBlock(): string {
  const lines = [
    '=== อภิธานศัพท์ระบบ (ใช้ตีความคำย่อ/คำเรียกไม่เป็นทางการ และเสนอคำที่ถูกต้อง) ===',
  ];
  for (const t of SFMIS_GLOSSARY) {
    const alt = [t.abbr, ...t.variants].filter(Boolean).slice(0, 4).join(', ');
    lines.push(`- ${t.canonical}${alt ? ` (เรียกว่า: ${alt})` : ''}: ${t.meaning}`);
  }
  lines.push(
    'แนวทางใช้อภิธานศัพท์: ถ้าผู้ใช้พิมพ์คำสะกดผิดหรือใช้คำเรียกไม่เป็นทางการ ' +
      'ให้ระบุคำที่ถูกต้องที่คุณเข้าใจไว้ต้นคำตอบ (เช่น “เข้าใจว่าหมายถึง เงินอุดหนุนค่าใช้จ่ายรายหัว”) ' +
      'ถ้าคำกำกวมเข้าได้หลายความหมาย ให้เสนอ 2-3 ตัวเลือกที่ใกล้เคียงแล้วถามยืนยันสั้น ๆ',
  );
  return lines.join('\n');
}
