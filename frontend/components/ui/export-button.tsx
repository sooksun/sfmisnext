'use client'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportButtonProps {
  onExport: () => void
  loading?: boolean
  label?: string
}

export function ExportButton({ onExport, loading, label = 'ดาวน์โหลด Excel' }: ExportButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onExport}
      disabled={loading}
      className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 hover:text-green-800"
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  )
}
