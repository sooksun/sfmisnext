'use client'
import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Pencil, Trash2, CalendarClock, Weight, User2, GripVertical } from 'lucide-react'
import { cn, fmtDateTH } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface KanbanTask {
  task_id: number
  title: string
  detail?: string | null
  status: number
  assignee_name?: string
  due_date?: string | null
  weight?: number
  evidence_required?: number
}

// คอลัมน์ Kanban — ไม่รวม "ยกเลิก" (9) ที่ซ่อนจากบอร์ด
const COLUMNS: { status: number; label: string; tint: string }[] = [
  { status: 1, label: 'ยังไม่เริ่ม', tint: 'bg-gray-50 border-gray-200' },
  { status: 2, label: 'กำลังทำ', tint: 'bg-blue-50 border-blue-200' },
  { status: 3, label: 'รอตรวจ', tint: 'bg-amber-50 border-amber-200' },
  { status: 4, label: 'เสร็จแล้ว', tint: 'bg-green-50 border-green-200' },
  { status: 5, label: 'ติดขัด', tint: 'bg-red-50 border-red-200' },
]

interface KanbanBoardProps {
  tasks: KanbanTask[]
  onStatusChange: (taskId: number, newStatus: number) => void
  onEdit?: (task: KanbanTask) => void
  onDelete?: (task: KanbanTask) => void
  listView?: boolean
}

function isOverdue(t: KanbanTask): boolean {
  if (!t.due_date || t.status === 4) return false
  const due = new Date(t.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  draggable = true,
}: {
  task: KanbanTask
  onEdit?: (t: KanbanTask) => void
  onDelete?: (t: KanbanTask) => void
  draggable?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.task_id,
    disabled: !draggable,
  })
  const overdue = isOverdue(task)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-md border bg-white p-2 shadow-sm',
        overdue ? 'border-red-300' : 'border-gray-200',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-1">
        {draggable && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab touch-none text-gray-300 hover:text-gray-500"
            title="ลากเพื่อย้ายสถานะ"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
            {task.assignee_name && (
              <span className="inline-flex items-center gap-0.5">
                <User2 className="h-3 w-3" />
                {task.assignee_name}
              </span>
            )}
            {task.due_date && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5',
                  overdue && 'font-medium text-red-600',
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {fmtDateTH(task.due_date)}
                {overdue && ' (เกินกำหนด)'}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5">
              <Weight className="h-3 w-3" />
              {task.weight ?? 1}
            </span>
            {task.evidence_required === 1 && (
              <span className="rounded bg-purple-100 px-1 text-purple-600">
                ต้องมีหลักฐาน
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {onEdit && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onEdit(task)} title="แก้ไข">
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => onDelete(task)} title="ลบ">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Column({
  status,
  label,
  tint,
  tasks,
  onEdit,
  onDelete,
}: {
  status: number
  label: string
  tint: string
  tasks: KanbanTask[]
  onEdit?: (t: KanbanTask) => void
  onDelete?: (t: KanbanTask) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[120px] flex-col rounded-lg border p-2',
        tint,
        isOver && 'ring-2 ring-indigo-400',
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1 text-sm font-semibold text-gray-700">
        <span>{label}</span>
        <span className="rounded-full bg-white/70 px-2 text-xs text-gray-500">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((t) => (
          <TaskCard key={t.task_id} task={t} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

export function KanbanBoard({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  listView = false,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const byStatus = (s: number) => tasks.filter((t) => t.status === s)
  const activeTask = tasks.find((t) => t.task_id === activeId) ?? null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(Number(e.active.id))
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const overId = e.over?.id
    if (!overId) return
    const newStatus = Number(String(overId).replace('col-', ''))
    const taskId = Number(e.active.id)
    const task = tasks.find((t) => t.task_id === taskId)
    if (task && task.status !== newStatus) {
      onStatusChange(taskId, newStatus)
    }
  }

  // ── List view (สำรองสำหรับมือถือ) — เปลี่ยนสถานะด้วย dropdown ──
  if (listView) {
    return (
      <div className="space-y-4">
        {COLUMNS.map((col) => {
          const items = byStatus(col.status)
          if (items.length === 0) return null
          return (
            <div key={col.status}>
              <h4 className="mb-1 text-sm font-semibold text-gray-700">
                {col.label} ({items.length})
              </h4>
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.task_id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <TaskCard task={t} onEdit={onEdit} onDelete={onDelete} draggable={false} />
                    </div>
                    <select
                      className="h-8 rounded border border-gray-300 text-xs"
                      value={t.status}
                      onChange={(e) => onStatusChange(t.task_id, Number(e.target.value))}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.status} value={c.status}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {tasks.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">ยังไม่มีงาน</p>
        )}
      </div>
    )
  }

  // ── Kanban view (drag & drop) ──
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((col) => (
          <Column
            key={col.status}
            status={col.status}
            label={col.label}
            tint={col.tint}
            tasks={byStatus(col.status)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} draggable={false} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
