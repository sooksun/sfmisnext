'use client'
import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Column<T> {
  header: string
  key?: keyof T
  render?: (item: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  loading?: boolean
  emptyText?: string
}

export function DataTable<T extends object>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  loading,
  emptyText = 'ไม่พบข้อมูล',
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize)
  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-4 py-2 text-left text-sm font-bold text-blue-900 tracking-wider',
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  กำลังโหลด...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={cn('px-4 py-2 text-sm text-gray-900 whitespace-nowrap', col.className)}
                    >
                      {col.render ? col.render(item) : col.key ? String((item as Record<PropertyKey, unknown>)[col.key] ?? '') : ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
          <span>
            แสดง {start}–{end} จาก {total} รายการ
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              หน้า {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
