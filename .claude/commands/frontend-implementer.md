---
description: เขียน Next.js frontend (App Router + React 19) ตาม SFMIS pattern
argument-hint: [feature description]
---

ทำหน้าที่ Frontend Implementer — สร้าง UI จริงตาม contract

## ⚠️ ต้องอ่านก่อน

1. `frontend/AGENTS.md` — Next.js 16.2 มี breaking changes ห้ามเชื่อ training data
2. `frontend/node_modules/next/dist/docs/` — เช็ค API ปัจจุบันก่อนใช้ feature ที่ไม่มั่นใจ
3. หน้าตัวอย่างในโปรเจกต์ อย่างน้อย 1 หน้า (เช่น `frontend/app/(dashboard)/sfmis/expenses/page.tsx`)

## ⚠️ ต้องมี

- API contract (จาก `/api-contract-guardian`) — ถ้ายังไม่มีให้หยุด

## Stack (SFMIS)

- **Next.js 16.2** App Router + React 19
- **Styling**: TailwindCSS 4 + Radix UI + shadcn-style components ใน `frontend/components/ui/`
- **Forms**: react-hook-form + Zod (`@hookform/resolvers/zod`)
- **State**: Zustand (persisted — `user-store`, `yearData`), TanStack Query
- **Auth**: NextAuth 5 beta (`auth.ts`), token ใน JWT payload → in-memory (`auth-token.ts`)
- **API**: `lib/api.ts` (`apiGet<T>`, `apiPost<T>`) — auto-attach Bearer, 401 retry
- **Context**: `useAppContext()` → `scId`, `budgetSyId`, `syId`
- **Locale**: Thai (พ.ศ.) — `fmtDateTH()` จาก `@/lib/utils`
- **Export**: `exportToXlsx` / `<ExportButton>`
- **Print**: `@/lib/print-utils` (A4/A5, `numberToThaiBaht`, `thaiFullDate`)

## Page Location

```
frontend/app/(dashboard)/sfmis/<slug>/page.tsx
```

## กฎเหล็ก (จาก CLAUDE.md — อย่าฝ่าฝืน)

1. **ห้าม `z.coerce.number()`** กับ `zodResolver` → ใช้ `z.number()` + `register('field', { valueAsNumber: true })`
2. **ThaiDatePicker** — controlled pattern:
   ```tsx
   const dateVal = watch('field_name')
   <ThaiDatePicker value={dateVal} onChange={(v) => setValue('field_name', v, { shouldValidate: true })} />
   ```
   **ห้ามใช้** `{...register('field')}`
3. **Select** → `setValue`, ไม่ใช่ `register`
4. **Date display** → `fmtDateTH()` (พ.ศ.) แต่ DB ส่งรับ YYYY-MM-DD CE เสมอ
5. **sy_id vs budget_year** — อ่าน CLAUDE.md ก่อน! `sy_id` = PK auto-increment; `budget_year` = ปีจริง (2569); `parcel_order.acad_year` เก็บ budget_year
6. **localStorage**: อย่าเก็บ sensitive data (token ใช้ in-memory + sessionStorage เท่านั้น)

## Skeleton

```tsx
'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

const schema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  amount: z.number().min(0),
})
type Form = z.infer<typeof schema>

export default function XxxPage() {
  const { scId, budgetSyId } = useAppContext()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  // ... state + queries + mutations
  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="หัวข้อ" actions={<Button>...</Button>} />
      <div className="p-4"><DataTable ... /></div>
      <FormDialog ...>...</FormDialog>
      <ConfirmDialog ... />
    </div>
  )
}
```

## States ที่ต้องมีครบทุกหน้า

- [ ] **Loading** — แสดง skeleton หรือ spinner
- [ ] **Empty** — "ไม่พบข้อมูล"
- [ ] **Error** — `toast.error(res.ms || 'เกิดข้อผิดพลาด')`
- [ ] **Validation error** — แสดงใต้ field (`errors.field.message`)

## Output

- สร้าง/แก้ไฟล์จริง
- **ตรวจ type**: รัน `cd frontend && npx tsc --noEmit`
- **ห้าม** รัน `npm run dev` เอง — ปล่อยผู้ใช้รัน
- รายงาน:
  - ไฟล์ที่สร้าง/แก้
  - URL ของหน้า (`/sfmis/<slug>`)
  - ส่วนที่ผู้ใช้ต้องเติม (type ที่แม่นยำจริง, เมนู, permission per role)

## ข้อห้าม

- **ห้ามใช้ localStorage เก็บ token**
- **ห้าม hardcode URL** — ใช้ `NEXT_PUBLIC_API_URL`
- **ไม่ลืม 401 retry** — `apiPost` ทำให้แล้ว อย่าเขียนซ้ำ
- **ไม่ add feature ที่ไม่ได้ระบุ**
- **ห้าม test UI ด้วย `npm run dev` เอง** — แจ้งผู้ใช้ให้ test
