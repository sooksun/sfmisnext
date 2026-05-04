'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseOfflineDraftOptions<T> {
  key: string
  defaultValue: T
  debounceMs?: number
}

interface StoredDraft<T> {
  data: T
  savedAt: string
}

export function useOfflineDraft<T>(opts: UseOfflineDraftOptions<T>) {
  const { key, defaultValue, debounceMs = 1000 } = opts
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // โหลด draft จาก localStorage ตอน mount
  const loadFromStorage = useCallback((): { value: T; savedAt: Date | null } => {
    if (typeof window === 'undefined') {
      return { value: defaultValue, savedAt: null }
    }
    const raw = localStorage.getItem(key)
    if (!raw) return { value: defaultValue, savedAt: null }
    try {
      const parsed: StoredDraft<T> = JSON.parse(raw)
      return {
        value: parsed.data ?? defaultValue,
        savedAt: parsed.savedAt ? new Date(parsed.savedAt) : null,
      }
    } catch {
      return { value: defaultValue, savedAt: null }
    }
  }, [key, defaultValue])

  const initial = loadFromStorage()
  const [draft, setDraftState] = useState<T>(initial.value)
  const [lastSaved, setLastSaved] = useState<Date | null>(initial.savedAt)
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(key) !== null
  })

  // ซิงค์ hasDraft เมื่อ key เปลี่ยน
  useEffect(() => {
    const { value, savedAt } = loadFromStorage()
    setDraftState(value)
    setLastSaved(savedAt)
    setHasDraft(typeof window !== 'undefined' && localStorage.getItem(key) !== null)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const persistToStorage = useCallback(
    (value: T) => {
      if (typeof window === 'undefined') return
      try {
        const now = new Date().toISOString()
        const stored: StoredDraft<T> = { data: value, savedAt: now }
        localStorage.setItem(key, JSON.stringify(stored))
        setLastSaved(new Date(now))
        setHasDraft(true)
      } catch {
        // localStorage อาจเต็ม — ไม่ throw ให้ผู้ใช้
      }
    },
    [key]
  )

  const setDraft = useCallback(
    (value: T | ((prev: T) => T)) => {
      setDraftState((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value
        // debounce บันทึก
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          persistToStorage(next)
        }, debounceMs)
        return next
      })
    },
    [persistToStorage, debounceMs]
  )

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
    setHasDraft(false)
    setLastSaved(null)
    setDraftState(defaultValue)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [key, defaultValue])

  // cleanup timer เมื่อ unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return {
    draft,
    setDraft,
    clearDraft,
    hasDraft,
    lastSaved,
  }
}
