'use client'
import { cn } from '@/lib/utils'
import { fmtDateTH } from '@/lib/utils'
import { Check, X } from 'lucide-react'

export interface WorkflowStep {
  id: string
  label: string
  role: string
  status: 'pending' | 'active' | 'done' | 'skipped'
  completedAt?: string
  completedBy?: string
}

export interface WorkflowStatusBarProps {
  steps: WorkflowStep[]
  compact?: boolean
}

function StepCircle({ step, compact }: { step: WorkflowStep; compact: boolean }) {
  const size = compact ? 'h-7 w-7' : 'h-9 w-9'
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'

  // title สำหรับ hover tooltip (ใช้ title attr เนื่องจากไม่มี Radix Tooltip)
  const titleText =
    step.status === 'done'
      ? [
          step.completedBy ? `โดย: ${step.completedBy}` : '',
          step.completedAt ? `วันที่: ${fmtDateTH(step.completedAt)}` : '',
        ]
          .filter(Boolean)
          .join(' | ') || step.label
      : step.label

  if (step.status === 'done') {
    return (
      <div
        title={titleText}
        className={cn(
          'flex items-center justify-center rounded-full border-2 border-green-500 bg-green-50 text-green-600',
          size
        )}
      >
        <Check className={iconSize} strokeWidth={2.5} />
      </div>
    )
  }

  if (step.status === 'active') {
    return (
      <div
        title={titleText}
        className={cn(
          'relative flex items-center justify-center rounded-full border-2 border-indigo-500 bg-indigo-50 text-indigo-600',
          size
        )}
      >
        {/* pulse ring */}
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-300 opacity-40" />
        <span className={cn('relative rounded-full bg-indigo-500', compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      </div>
    )
  }

  if (step.status === 'skipped') {
    return (
      <div
        title={titleText}
        className={cn(
          'flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400',
          size
        )}
      >
        <X className={iconSize} />
      </div>
    )
  }

  // pending
  return (
    <div
      title={titleText}
      className={cn(
        'flex items-center justify-center rounded-full border-2 border-gray-300 bg-gray-50 text-gray-400',
        size
      )}
    >
      <span className={cn('rounded-full bg-gray-300', compact ? 'h-2 w-2' : 'h-2.5 w-2.5')} />
    </div>
  )
}

function ConnectorLine({ done }: { done: boolean }) {
  return (
    <div
      className={cn(
        'h-0.5 flex-1 transition-colors',
        done ? 'bg-green-400' : 'bg-gray-200'
      )}
    />
  )
}

export function WorkflowStatusBar({ steps, compact = false }: WorkflowStatusBarProps) {
  if (!steps || steps.length === 0) return null

  return (
    <div className="w-full overflow-x-auto">
      <div className={cn('flex items-start', compact ? 'gap-0' : 'gap-0')}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1
          return (
            <div key={step.id} className="flex items-start flex-1 min-w-0">
              {/* Step node */}
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <StepCircle step={step} compact={compact ?? false} />
                <div className={cn('text-center', compact ? 'max-w-[80px]' : 'max-w-[100px]')}>
                  <p
                    className={cn(
                      'font-medium leading-tight',
                      compact ? 'text-[10px]' : 'text-xs',
                      step.status === 'done' && 'text-green-700',
                      step.status === 'active' && 'text-indigo-700',
                      step.status === 'pending' && 'text-gray-500',
                      step.status === 'skipped' && 'text-gray-400 line-through'
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      'text-gray-400 leading-tight mt-0.5',
                      compact ? 'text-[9px]' : 'text-[10px]'
                    )}
                  >
                    {step.role}
                  </p>
                  {step.status === 'done' && step.completedBy && !compact && (
                    <p className="text-[9px] text-green-600 mt-0.5 truncate" title={step.completedBy}>
                      {step.completedBy}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector line between steps */}
              {!isLast && (
                <div className="flex items-center mt-[18px] flex-1 min-w-[12px] max-w-[40px]">
                  <ConnectorLine done={step.status === 'done'} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Preset: ขั้นตอนการเงินมาตรฐาน
export function FINANCIAL_WORKFLOW_STEPS(overrides?: Partial<WorkflowStep>[]): WorkflowStep[] {
  const defaults: WorkflowStep[] = [
    { id: 'entry', label: 'บันทึกรายการ', role: 'เจ้าหน้าที่การเงิน', status: 'pending' },
    { id: 'review_daily', label: 'ตรวจสอบประจำวัน', role: 'ผู้ตรวจสอบ', status: 'pending' },
    { id: 'director', label: 'ผู้อำนวยการอนุมัติ', role: 'ผู้อำนวยการ', status: 'pending' },
    { id: 'submit', label: 'ส่ง สพป.', role: 'เจ้าหน้าที่', status: 'pending' },
  ]
  if (!overrides) return defaults
  return defaults.map((step, idx) => ({
    ...step,
    ...(overrides[idx] ?? {}),
  }))
}
