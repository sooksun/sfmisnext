import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Mock layer สำหรับเทสต์หน้าเพจ (App Router client component)
 *
 * หน้าเพจ SFMIS ผูกกับ: react-query, @/lib/api (apiGet/apiPost),
 * @/hooks/use-app-context (zustand), sonner (toast)
 *   → ใน test ให้ vi.mock('@/lib/api'), vi.mock('@/hooks/use-app-context'),
 *     vi.mock('sonner') ต่อไฟล์ แล้วใช้ renderWithClient() ครอบ QueryClientProvider จริง
 */

/** context ปลอมมาตรฐานสำหรับ useAppContext (โรงเรียน 1 ปีงบ 2569) */
export const mockAppContext = {
  scId: 1,
  adminId: 1,
  userName: 'ผู้ทดสอบ',
  userType: 2,
  scName: 'โรงเรียนทดสอบ',
  syId: 1,
  syYear: 2569,
  budgetYear: 2569,
  budgetSyId: 1,
  user: { sc_id: 1, admin_id: 1, name: 'ผู้ทดสอบ', type: 2, sc_name: 'โรงเรียนทดสอบ' },
  yearData: {
    sy_date: { sy_id: 1, sy_year: 2569 },
    budget_date: { sy_id: 1, budget_year: 2569 },
  },
}

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

export function renderWithClient(ui: ReactElement) {
  return render(ui, { wrapper: Providers })
}
