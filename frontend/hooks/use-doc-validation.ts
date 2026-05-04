'use client'
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { showNumber } from '@/lib/utils'

export interface ValidationWarning {
  field: string
  severity: 'error' | 'warn' | 'info'
  message: string
}

export interface UseDocValidationOptions {
  scId: number
  budgetYear: string
  docType?: 'BC' | 'BJ' | 'BY' | 'BG'
}

interface DocCounter {
  doc_type: string
  last_no: number
  prefix: string
  budget_year: string
}

export function useDocValidation(options: UseDocValidationOptions) {
  const { scId, budgetYear, docType } = options
  const [warnings, setWarnings] = useState<ValidationWarning[]>([])

  // โหลด doc counters เพื่อตรวจสอบเลขที่เอกสาร — stale 30 วินาที
  const { data: counters, isFetching: checking } = useQuery({
    queryKey: ['doc-counters', scId, budgetYear],
    queryFn: () => apiGet<DocCounter[]>(`DocCounter/loadCounters/${scId}/${budgetYear}`),
    enabled: scId > 0 && !!budgetYear,
    staleTime: 30_000,
  })

  const validateAmount = useCallback(
    (amount: number, availableBalance?: number): ValidationWarning | null => {
      if (amount <= 0) {
        const w: ValidationWarning = {
          field: 'amount',
          severity: 'error',
          message: 'จำนวนเงินต้องมากกว่า 0',
        }
        setWarnings((prev) => {
          const others = prev.filter((x) => x.field !== 'amount')
          return [...others, w]
        })
        return w
      }

      if (amount > 5_000_000) {
        const w: ValidationWarning = {
          field: 'amount',
          severity: 'warn',
          message: 'จำนวนเงินสูงผิดปกติ — กรุณาตรวจสอบ',
        }
        setWarnings((prev) => {
          const others = prev.filter((x) => x.field !== 'amount')
          return [...others, w]
        })
        return w
      }

      if (availableBalance !== undefined && amount > availableBalance) {
        const w: ValidationWarning = {
          field: 'amount',
          severity: 'error',
          message: `จำนวนเงินเกินยอดคงเหลือ ${showNumber(availableBalance)} บาท`,
        }
        setWarnings((prev) => {
          const others = prev.filter((x) => x.field !== 'amount')
          return [...others, w]
        })
        return w
      }

      // ล้าง warning ของ amount เมื่อผ่าน
      setWarnings((prev) => prev.filter((x) => x.field !== 'amount'))
      return null
    },
    []
  )

  const validateDocNo = useCallback(
    (docNo: string): { isDuplicate: boolean; checking: boolean } => {
      if (!counters || !docType || !docNo) {
        return { isDuplicate: false, checking }
      }

      const counter = counters.find((c) => c.doc_type === docType)
      if (!counter) {
        return { isDuplicate: false, checking }
      }

      // แยกหมายเลขจากท้าย docNo เช่น "BC0012/2568" → 12
      const numMatch = docNo.match(/(\d+)/)
      if (numMatch) {
        const docNum = parseInt(numMatch[1], 10)
        const lastNo = counter.last_no

        if (docNum > lastNo + 5) {
          const w: ValidationWarning = {
            field: 'doc_no',
            severity: 'warn',
            message: `เลขที่เอกสารอาจข้าม (เลขล่าสุด: ${lastNo})`,
          }
          setWarnings((prev) => {
            const others = prev.filter((x) => x.field !== 'doc_no')
            return [...others, w]
          })
        } else {
          setWarnings((prev) => prev.filter((x) => x.field !== 'doc_no'))
        }
      }

      return { isDuplicate: false, checking }
    },
    [counters, docType, checking]
  )

  const getFieldClass = useCallback(
    (fieldName: string): string => {
      const w = warnings.find((x) => x.field === fieldName)
      if (!w) return ''
      if (w.severity === 'error') return 'border-red-500 bg-red-50'
      if (w.severity === 'warn') return 'border-yellow-400 bg-yellow-50'
      return ''
    },
    [warnings]
  )

  const clearWarnings = useCallback(() => {
    setWarnings([])
  }, [])

  return {
    warnings,
    validateAmount,
    validateDocNo,
    getFieldClass,
    clearWarnings,
  }
}
