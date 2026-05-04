import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setAuthToken, clearAuthToken, getAccessToken, getUserId, getScId } from '../lib/auth-token'

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, writable: true })

describe('auth-token', () => {
  beforeEach(() => {
    clearAuthToken()
    sessionStorageMock.clear()
  })

  it('setAuthToken — เก็บ token, userId, scId', () => {
    setAuthToken('tok123', 5, 10)
    expect(getAccessToken()).toBe('tok123')
    expect(getUserId()).toBe(5)
    expect(getScId()).toBe(10)
  })

  it('clearAuthToken — ลบ token ออกทั้งหมด', () => {
    setAuthToken('tok123', 5, 10)
    clearAuthToken()
    expect(getAccessToken()).toBeNull()
    expect(getUserId()).toBeNull()
    expect(getScId()).toBeNull()
  })

  it('clearAuthToken — ลบ sessionStorage ด้วย', () => {
    setAuthToken('tok123', 5, 10)
    clearAuthToken()
    expect(sessionStorageMock.getItem('__sfmis_tk')).toBeNull()
  })

  it('setAuthToken — บันทึกลง sessionStorage', () => {
    setAuthToken('tok-ss', 1, 2)
    expect(sessionStorageMock.getItem('__sfmis_tk')).toBe('tok-ss')
  })

  it('getAccessToken — คืน null เมื่อยังไม่ set', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('getAccessToken — อ่านจาก sessionStorage เมื่อ module var ว่าง', () => {
    // Simulate HMR: sessionStorage has token but module var was reset
    sessionStorageMock.setItem('__sfmis_tk', 'recovered-token')
    // Access directly without setAuthToken (simulating module reload)
    expect(getAccessToken()).toBe('recovered-token')
  })

  it('getUserId — คืน null เมื่อยังไม่ set', () => {
    expect(getUserId()).toBeNull()
  })

  it('getScId — คืน null เมื่อยังไม่ set', () => {
    expect(getScId()).toBeNull()
  })
})
