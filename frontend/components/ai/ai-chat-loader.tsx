'use client'

import dynamic from 'next/dynamic'

const AiChatWidget = dynamic(
  () => import('./ai-chat-widget').then((m) => m.AiChatWidget),
  { ssr: false },
)

export function AiChatLoader() {
  return <AiChatWidget />
}
