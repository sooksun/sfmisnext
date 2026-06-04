'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

/** เล่มใบเสร็จที่กำลังเปิดใช้ (status=1) — ระบบใช้ครั้งละ 1 เล่ม */
export interface ActiveReceiptBook {
  rb_id: number
  book_code: string | null // เล่มที่
  from_no: number
  to_no: number
  current_no: number // เลขที่ถัดไปที่จะออก
  remaining: number // จำนวนใบที่เหลือในเล่ม
  status: number
}

/**
 * useActiveReceiptBook — ดึงเล่มใบเสร็จที่เปิดใช้อยู่ สำหรับ auto-input
 *   - มีเล่ม → คืน { book_code (เล่มที่), current_no (เลขที่ถัดไป), remaining }
 *   - ไม่มีเล่ม → data = null (ให้ฟอร์มเตือนผู้ใช้ไปเปิดเล่มก่อน)
 *
 * รับ apiYear เป็น ค.ศ. (string) ตรงกับที่ backend เก็บใน receipt_book.budget_year
 */
export function useActiveReceiptBook(scId: number, apiYear: string) {
  return useQuery({
    queryKey: ['active-receipt-book', scId, apiYear],
    queryFn: async () => {
      const res = await apiGet<{ data: ActiveReceiptBook | null }>(
        `ReceiptBook/activeBook/${scId}/${apiYear}`,
      )
      return res?.data ?? null
    },
    enabled: scId > 0 && !!apiYear,
  })
}
