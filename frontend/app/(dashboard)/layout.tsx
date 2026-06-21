import { SidebarNav } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { SessionSync } from '@/components/session-sync'
import { AiChatLoader } from '@/components/ai/ai-chat-loader'
import { AiFormDraftBridge } from '@/components/ai/ai-form-draft-bridge'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarNav />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4">
          <SessionSync>{children}</SessionSync>
        </main>
      </div>
      <AiFormDraftBridge />
      <AiChatLoader />
    </div>
  )
}
