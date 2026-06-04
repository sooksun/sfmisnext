'use client'

import Link from 'next/link'
import { ArrowRight, ClipboardList, PackageCheck, ReceiptText, Route } from 'lucide-react'
import { PROCESS_FLOWS } from '@/lib/process-flows'
import { cn } from '@/lib/utils'

const TRACKS = [
  {
    flow: 'plan',
    title: 'แผนและงบประมาณ',
    icon: ClipboardList,
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    flow: 'procure',
    title: 'พัสดุ',
    icon: PackageCheck,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    flow: 'pay',
    title: 'จ่ายเงิน',
    icon: ReceiptText,
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    flow: 'receive',
    title: 'รับเงิน',
    icon: Route,
    tone: 'border-rose-200 bg-rose-50 text-rose-700',
  },
]

export function WorkflowGuide() {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Route className="h-5 w-5 text-gray-700" />
        <h2 className="text-base font-semibold text-gray-900">ลำดับงานหลัก</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {TRACKS.map((track) => {
          const flow = PROCESS_FLOWS[track.flow]
          const Icon = track.icon
          const firstStep = flow.steps[0]
          const lastStep = flow.steps[flow.steps.length - 1]

          return (
            <div key={track.flow} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md border', track.tone)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{track.title}</h3>
                    <p className="truncate text-xs text-gray-500">
                      {firstStep.label} ถึง {lastStep.label}
                    </p>
                  </div>
                </div>
                <Link
                  href={firstStep.href}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  เริ่มงาน
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1">
                {flow.steps.map((step, index) => (
                  <Link
                    key={step.href}
                    href={step.href}
                    title={step.hint}
                    className="flex min-w-[120px] items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 hover:border-gray-300 hover:bg-white"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-gray-600">
                      {index + 1}
                    </span>
                    <span className="truncate">{step.label}</span>
                  </Link>
                ))}
              </div>

              {flow.automations && flow.automations.length > 0 && (
                <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                  ระบบช่วยทำ: {flow.automations.join(' · ')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
