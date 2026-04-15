import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, YearData } from '@/lib/types'

interface UserStore {
  user: User | null
  yearData: YearData | null
  setUser: (user: User | null) => void
  setYearData: (yearData: YearData | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      yearData: null,
      setUser: (user) => set({ user }),
      setYearData: (yearData) => set({ yearData }),
      clearUser: () => set({ user: null, yearData: null }),
    }),
    {
      name: 'sfmis-user',
    }
  )
)
