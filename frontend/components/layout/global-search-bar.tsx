'use client'
/**
 * GlobalSearchBar
 * - Debounce 400ms ก่อนเรียก API
 * - แสดง dropdown ผลลัพธ์สูงสุด 8 รายการ
 * - ปิดด้วย click-outside หรือ Escape
 * - NOT wired to topbar yet — main developer will add it
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Receipt, CreditCard, FileText, Loader2 } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { fmtDateTH, showNumber, cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchResultType = 'receipt' | 'check' | 'invoice'

interface SearchResult {
  type: SearchResultType
  id: number
  doc_no: string
  date: string | null
  amount: number
  detail: string
}

// Map result type to destination page
const PAGE_ROUTES: Record<SearchResultType, string> = {
  receipt: '/sfmis/pay-menu/invoice',   // receive page (receipt/income)
  check: '/sfmis/pay-menu/generate-check',
  invoice: '/sfmis/pay-menu/invoice',
}

const TYPE_LABELS: Record<SearchResultType, string> = {
  receipt: 'ใบรับเงิน',
  check: 'เช็ค',
  invoice: 'ใบขอเบิก',
}

// ─── Icon by type ─────────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: SearchResultType }) {
  const cls = 'h-4 w-4 shrink-0'
  if (type === 'receipt') return <Receipt className={cn(cls, 'text-green-600')} />
  if (type === 'check') return <CreditCard className={cn(cls, 'text-blue-600')} />
  return <FileText className={cn(cls, 'text-orange-500')} />
}

function typeBadgeCls(type: SearchResultType) {
  if (type === 'receipt') return 'bg-green-100 text-green-700'
  if (type === 'check') return 'bg-blue-100 text-blue-700'
  return 'bg-orange-100 text-orange-700'
}

// ─── Hook: debounced search ────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalSearchBar({ scId }: { scId: number }) {
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebounce(query, 400)

  // ── Fetch results when debounced query changes ────────────────────────────
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q || scId <= 0) {
      setResults([])
      setOpen(false)
      return
    }

    let cancelled = false
    setLoading(true)

    apiGet<SearchResult[]>(`GlobalSearch/search/${scId}?q=${encodeURIComponent(q)}`)
      .then((data) => {
        if (cancelled) return
        setResults((Array.isArray(data) ? data : []).slice(0, 8))
        setOpen(true)
        setHighlightIdx(-1)
      })
      .catch(() => {
        if (cancelled) return
        setResults([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [debouncedQuery, scId])

  // ── Click-outside closes dropdown ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Navigate to result page ───────────────────────────────────────────────
  const navigate = useCallback(
    (result: SearchResult) => {
      setOpen(false)
      setQuery('')
      setResults([])
      router.push(PAGE_ROUTES[result.type])
    },
    [router],
  )

  // ── Keyboard navigation ───────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return

    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
      return
    }

    if (e.key === 'Enter' && highlightIdx >= 0 && results[highlightIdx]) {
      e.preventDefault()
      navigate(results[highlightIdx])
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2.5 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder="ค้นหาเลขเอกสาร..."
          className={cn(
            'h-9 w-full rounded-md border border-gray-300 bg-white pl-8 pr-8 text-sm',
            'placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300',
            'transition-colors',
          )}
        />
        {loading && (
          <Loader2 className="absolute right-2.5 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              ไม่พบผลลัพธ์สำหรับ &ldquo;{debouncedQuery}&rdquo;
            </div>
          ) : (
            <ul>
              {results.map((result, idx) => (
                <li key={`${result.type}:${result.id}`}>
                  <button
                    type="button"
                    onClick={() => navigate(result)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors',
                      idx === highlightIdx ? 'bg-blue-50' : 'hover:bg-gray-50',
                      idx < results.length - 1 && 'border-b border-gray-100',
                    )}
                  >
                    {/* Icon */}
                    <span className="mt-0.5">
                      <TypeIcon type={result.type} />
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 truncate">
                          {result.doc_no || `#${result.id}`}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium',
                            typeBadgeCls(result.type),
                          )}
                        >
                          {TYPE_LABELS[result.type]}
                        </span>
                      </div>
                      {result.detail && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">{result.detail}</p>
                      )}
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                        {result.date && <span>{fmtDateTH(result.date)}</span>}
                        {result.amount > 0 && (
                          <span className="font-medium text-gray-600">
                            {showNumber(result.amount)} บาท
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t bg-gray-50 px-4 py-1.5">
            <p className="text-xs text-gray-400">
              {results.length > 0
                ? `พบ ${results.length} ผลลัพธ์ — กด Enter เพื่อเปิด`
                : 'พิมพ์เลขเอกสาร เช่น บค.12/2568'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
