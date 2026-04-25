---
description: Scaffold หน้า Next.js ใหม่ใน frontend/app/(dashboard)/sfmis/ ตาม SFMIS pattern
argument-hint: <page-slug> [title-thai]
---

Scaffold หน้า Next.js ใหม่ใน `frontend/app/(dashboard)/sfmis/` ตาม convention ของ SFMIS

## Input

- `$1` = page slug (kebab-case) เช่น `budget-request`
- `$2` = หัวข้อภาษาไทย (optional) เช่น `"ขออนุมัติงบประมาณ"`

ถ้าไม่มี argument ให้ถามผู้ใช้:
- slug ของหน้า
- หัวข้อ (ไทย)
- endpoint prefix ของ backend (เช่น `Budget_request/`)
- ต้องการแบบ CRUD เต็ม (list + add/edit/delete) หรือแบบ read-only/custom

## ⚠️ ต้องอ่านก่อนสร้าง

1. `frontend/AGENTS.md` — Next.js 16.2 มี breaking changes ห้ามเชื่อความรู้ที่ training มา
2. `frontend/node_modules/next/dist/docs/` — เช็ค API ปัจจุบันก่อนใช้ feature ที่ไม่มั่นใจ
3. อ่านหน้าตัวอย่างอย่างน้อย 1 หน้า: `frontend/app/(dashboard)/sfmis/expenses/page.tsx` (pattern เต็ม CRUD + form dialog)

## ขั้นตอน

1. **ตรวจก่อนสร้าง**: เช็คว่า `frontend/app/(dashboard)/sfmis/$1/` มีอยู่แล้วหรือไม่ ถ้ามีให้หยุดและแจ้งผู้ใช้
2. **สร้างไฟล์** `frontend/app/(dashboard)/sfmis/$1/page.tsx`
3. **เพิ่มเมนู** (ถ้าผู้ใช้ต้องการ) — หาไฟล์ sidebar/menu config และเพิ่มลิงก์

## Convention ต้องทำตาม

### Imports พื้นฐาน
```tsx
'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'
```

### กฎเหล็ก (จาก CLAUDE.md)
- **อย่าใช้ `z.coerce.number()`** กับ `zodResolver` — ใช้ `z.number()` + `register('field', { valueAsNumber: true })`
- **ThaiDatePicker**: ใช้ controlled pattern `value={watch('field')}` + `onChange={(v) => setValue('field', v, { shouldValidate: true })}` ห้ามใช้ `{...register(...)}`
- **Select**: ใช้ `setValue` ไม่ใช่ `register`
- **Context**: ดึง `scId`, `budgetSyId`, `syId` จาก `useAppContext()`
- **วันที่แสดงผล**: ใช้ `fmtDateTH()` จาก `@/lib/utils` (แปลงเป็น พ.ศ. ไทย) — DB ส่ง YYYY-MM-DD CE เสมอ
- **Export XLSX**: ถ้ามีตาราง ใช้ `<ExportButton>` จาก `@/components/ui/export-button` + `exportToXlsx` จาก `@/lib/export-xlsx`
- **Print เอกสารราชการ**: ใช้ helpers ใน `@/lib/print-utils` (numberToThaiBaht, thaiFullDate, etc.)

### API pattern
- List: `apiPost<{ data: T[]; count: number }>('<Endpoint>/load<Name>/...', {})` — มักไม่ใช่ GET
- Save: `apiPost('<Endpoint>/add<Name>' | 'update<Name>', payload)` — check `res.flag`
- Delete: `apiPost('<Endpoint>/remove<Name>', { id: x, del: 1 })`
- Toast: `toast.success('บันทึกเรียบร้อยแล้ว')` / `toast.error(res.ms || 'มีปัญหาในการบันทึก')`

### Soft delete
- Backend filter `del: 0` อยู่แล้ว — frontend แค่ส่ง `del: 1` ตอนลบ

### Structure skeleton
```tsx
export default function XxxPage() {
  const { scId, budgetSyId } = useAppContext()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [editing, setEditing] = useState<Row | null>(null)

  const { data, isLoading } = useQuery({ ... })
  const saveMutation = useMutation({ ... })
  const deleteMutation = useMutation({ ... })

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="..." actions={<Button>...</Button>} />
      <div className="p-4">
        <DataTable ... />
      </div>
      <FormDialog ...>...</FormDialog>
      <ConfirmDialog ... />
    </div>
  )
}
```

## หลังสร้างเสร็จ

- รัน `cd frontend && npx tsc --noEmit` เพื่อตรวจ type
- รายงานสรุป: ไฟล์ที่สร้าง, ส่วนที่ต้องเติม (types จริง, field form, endpoint จริง), URL ของหน้า (`/sfmis/$1`)
- **อย่า** รัน `npm run dev` เอง — ปล่อยให้ผู้ใช้รันเอง

รายงานผลเป็นภาษาไทย
