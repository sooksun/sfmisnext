'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

// embed หน้าเดิมเป็นแท็บ (คงฟังก์ชัน + deep link เดิมไว้ทุกหน้า)
import ProjectPage from '../project/page'
import ManageProjectPage from '../manage-project/page'
import ProjApprovePage from '../proj-approve/page'
import ProcurementPlanPage from '../procurement-plan/page'

type Tab = 'project' | 'manage' | 'approve' | 'procure'

const TABS: { key: Tab; label: string }[] = [
  { key: 'project', label: '1) แผนงาน/โครงการ' },
  { key: 'manage', label: '2) บริหารโครงการ' },
  { key: 'approve', label: '3) อนุมัติโครงการ' },
  { key: 'procure', label: '4) แผนจัดซื้อจัดจ้าง' },
]

const VALID = new Set<Tab>(['project', 'manage', 'approve', 'procure'])

function ProjectPipelineInner() {
  const params = useSearchParams()
  const initial = (params.get('tab') as Tab) || 'project'
  const [tab, setTab] = useState<Tab>(VALID.has(initial) ? initial : 'project')

  // sync query string เมื่อสลับแท็บ (ไม่ reload — เก็บ deep link ได้)
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url.toString())
  }, [tab])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      {/* แท็บรวม 4 ขั้นตอนงานแผน/โครงการ — ทำต่อเนื่องโดยฝ่ายเดียวกัน */}
      <div className="flex gap-1 border-b bg-white px-4 pt-3 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-auto min-w-0">
        {tab === 'project' && <ProjectPage />}
        {tab === 'manage' && <ManageProjectPage />}
        {tab === 'approve' && <ProjApprovePage />}
        {tab === 'procure' && <ProcurementPlanPage />}
      </div>
    </div>
  )
}

export default function ProjectPipelinePage() {
  // useSearchParams ต้องอยู่ใน Suspense boundary (Next.js)
  return (
    <Suspense fallback={null}>
      <ProjectPipelineInner />
    </Suspense>
  )
}
