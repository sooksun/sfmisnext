import {
  normalizeThai,
  levenshtein,
  similarity,
  suggestTerms,
  buildGlossaryPromptBlock,
  SFMIS_GLOSSARY,
} from './sfmis-glossary';

describe('sfmis-glossary', () => {
  describe('normalizeThai', () => {
    it('ตัดช่องว่างและวรรณยุกต์ออก', () => {
      expect(normalizeThai('เงินอุดหนุน  รายหัว')).toBe(normalizeThai('เงินอุดหนุนรายหัว'));
    });
    it('ตัดวรรณยุกต์/การันต์ออก (ค่า → คา)', () => {
      expect(normalizeThai('ค่าเดินทาง')).toBe('คาเดินทาง');
      expect(normalizeThai('ภ.ง.ด.')).toBe('ภงด');
    });
  });

  describe('levenshtein / similarity', () => {
    it('คำเหมือนกัน = ระยะ 0', () => {
      expect(levenshtein('abc', 'abc')).toBe(0);
      expect(similarity('abc', 'abc')).toBe(1);
    });
    it('ต่างกัน 1 ตัว = ระยะ 1', () => {
      expect(levenshtein('อุดหนุน', 'อุดหนนุน')).toBe(1);
    });
  });

  describe('suggestTerms — เดาคำใกล้เคียง', () => {
    it('ตัวอย่างจากผู้ใช้: "เงินอุดหนนุนรายหัว" → เงินอุดหนุนค่าใช้จ่ายรายหัว', () => {
      const out = suggestTerms('เงินอุดหนนุนรายหัว');
      expect(out.length).toBeGreaterThan(0);
      expect(out[0].canonical).toBe('เงินอุดหนุนค่าใช้จ่ายรายหัว');
    });

    it('คำย่อ/ชื่อไม่เป็นทางการ: "เงินรายหัว" ก็เดาได้', () => {
      const out = suggestTerms('เงินรายหัว');
      expect(out.map((s) => s.canonical)).toContain('เงินอุดหนุนค่าใช้จ่ายรายหัว');
    });

    it('จับศัพท์ที่ฝังในประโยค: "อยากเบิกค่าเดินทางไปราชการ"', () => {
      const out = suggestTerms('อยากเบิกค่าเดินทางไปราชการ');
      expect(out.some((s) => s.canonical.includes('เดินทางไปราชการ'))).toBe(true);
    });

    it('เดา บก.111 จากคำพิมพ์ผิด "บก111"', () => {
      const out = suggestTerms('ขอแบบ บก111');
      expect(out.some((s) => s.canonical === 'ใบรับรองแทนใบเสร็จรับเงิน')).toBe(true);
    });

    it('คำที่ไม่เกี่ยวข้องเลย → ไม่มีผลลัพธ์', () => {
      expect(suggestTerms('xyz123 hello world')).toHaveLength(0);
    });

    it('คืนผลเรียงตามคะแนน และไม่เกิน limit', () => {
      const out = suggestTerms('เงินอุดหนุน', { limit: 2 });
      expect(out.length).toBeLessThanOrEqual(2);
      if (out.length === 2) expect(out[0].score).toBeGreaterThanOrEqual(out[1].score);
    });

    it('relatedTask ถูกผูกกับศัพท์ที่มีงานเกี่ยวข้อง', () => {
      const out = suggestTerms('สัญญายืมเงิน');
      const loan = out.find((s) => s.canonical === 'สัญญายืมเงิน');
      expect(loan?.relatedTask).toBe('create_loan');
    });
  });

  describe('buildGlossaryPromptBlock', () => {
    it('มีหัวข้อ + ครบทุกศัพท์ใน glossary', () => {
      const block = buildGlossaryPromptBlock();
      expect(block).toContain('อภิธานศัพท์ระบบ');
      for (const t of SFMIS_GLOSSARY) {
        expect(block).toContain(t.canonical);
      }
    });
  });
});
