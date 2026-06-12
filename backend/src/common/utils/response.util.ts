/**
 * ตัวช่วยสร้าง response มาตรฐาน CUD ของ SFMIS: { flag, ms }
 * (แทนการเขียน `return { flag: true, ms: '...' }` ด้วยมือกระจายหลายร้อยจุด)
 */
export interface FlagResponse {
  flag: boolean;
  ms: string;
}

/** สำเร็จ — แนบ field เพิ่มได้ (เช่น id ที่เพิ่งสร้าง) */
export function ok<T extends Record<string, unknown>>(
  ms: string,
  extra?: T,
): FlagResponse & T {
  return { flag: true, ms, ...(extra ?? ({} as T)) };
}

/** ไม่สำเร็จ */
export function fail<T extends Record<string, unknown>>(
  ms: string,
  extra?: T,
): FlagResponse & T {
  return { flag: false, ms, ...(extra ?? ({} as T)) };
}
