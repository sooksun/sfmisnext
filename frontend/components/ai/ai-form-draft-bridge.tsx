'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'

export const AI_DRAFT_STORAGE_KEY = 'sfmis-ai-form-draft'

export interface AiFormDraftPacket {
  route: string
  task_label: string
  open_button?: string | null
  fields: Record<string, unknown>
  field_labels: Record<string, string>
  missing_fields?: { field: string; label: string; question: string }[]
  created_at: number
}

function normalize(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: unknown) {
  const next = String(value ?? '')
  if (element instanceof HTMLSelectElement) {
    const option = Array.from(element.options).find(
      (item) => item.value === next || normalize(item.textContent ?? '') === normalize(next),
    )
    if (!option) return false
    element.value = option.value
  } else {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
    setter?.call(element, next)
  }
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  element.dispatchEvent(new Event('blur', { bubbles: true }))
  element.classList.add('ring-2', 'ring-emerald-400', 'bg-emerald-50')
  return true
}

// ห้ามใช้ปุ่มใน dialog และปุ่มที่ยัง disabled (async data ยังไม่โหลด)
function findButtonByText(text: string): HTMLButtonElement | null {
  const wanted = normalize(text)
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) => {
    if (button.closest('[role="dialog"]') || button.disabled) return false
    return normalize(button.textContent ?? '').includes(wanted)
  }) ?? null
}

const ADD_BUTTON_HINTS = ['เพิ่ม', 'ยื่น', 'สร้าง', 'ออกใบ', 'ลงรายการ', 'ทำรายการ', 'บันทึกใหม่']

function findAddButton(preferred?: string | null): HTMLButtonElement | null {
  if (preferred) {
    const exact = findButtonByText(preferred)
    if (exact) return exact
  }
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) => {
    if (button.closest('[role="dialog"]') || button.disabled) return false
    const text = normalize(button.textContent ?? '')
    return !!text && ADD_BUTTON_HINTS.some((hint) => text.includes(normalize(hint)))
  }) ?? null
}

/** รอให้ปุ่มปรากฏและ enabled — retry สูงสุด maxMs มิลลิวินาที */
async function waitForButton(preferred: string | null | undefined, maxMs = 3000): Promise<HTMLButtonElement | null> {
  const interval = 300
  const max = Math.ceil(maxMs / interval)
  for (let i = 0; i < max; i++) {
    await new Promise((resolve) => window.setTimeout(resolve, interval))
    const btn = findAddButton(preferred)
    if (btn) return btn
  }
  return null
}

/** รอให้มี dialog/modal ปรากฏในหน้า — ยืนยันว่าปุ่มเปิดสำเร็จ */
async function waitForDialog(maxMs = 1500): Promise<boolean> {
  const interval = 200
  const max = Math.ceil(maxMs / interval)
  for (let i = 0; i < max; i++) {
    await new Promise((resolve) => window.setTimeout(resolve, interval))
    if (document.querySelector('[role="dialog"]')) return true
  }
  return false
}

function findFieldByName(name: string) {
  return Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input[name], textarea[name], select[name]',
  )).find((element) => element.name === name) ?? null
}

function findControlByLabel(label: string): HTMLElement | null {
  const wanted = normalize(label)
  const labels = Array.from(document.querySelectorAll('label'))
  const matched = labels.find((item) => {
    const text = normalize(item.textContent ?? '')
    return text.includes(wanted) || wanted.includes(text.replace('*', '').trim())
  })
  if (!matched) return null
  const container = matched.parentElement
  return container?.querySelector<HTMLElement>('button[role="combobox"], input, textarea, select, button[type="button"]') ?? null
}

async function fillRadixSelect(trigger: HTMLElement, value: unknown): Promise<boolean> {
  trigger.click()
  await new Promise((resolve) => window.setTimeout(resolve, 80))
  const wanted = normalize(String(value ?? ''))
  const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
  const option = options.find((item) => {
    const text = normalize(item.textContent ?? '')
    return text === wanted || text.includes(wanted) || wanted.includes(text)
  })
  if (!option) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    return false
  }
  option.click()
  trigger.classList.add('ring-2', 'ring-emerald-400', 'bg-emerald-50')
  return true
}

export function AiFormDraftBridge() {
  const pathname = usePathname()

  useEffect(() => {
    const raw = sessionStorage.getItem(AI_DRAFT_STORAGE_KEY)
    if (!raw) {
      console.log('[AiBridge] no packet in sessionStorage')
      return
    }

    let packet: AiFormDraftPacket
    try {
      packet = JSON.parse(raw) as AiFormDraftPacket
    } catch {
      sessionStorage.removeItem(AI_DRAFT_STORAGE_KEY)
      return
    }

    const ageMs = Date.now() - packet.created_at
    console.log('[AiBridge] packet found', { packetRoute: packet.route, pathname, ageMs })

    if (packet.route !== pathname) {
      console.log('[AiBridge] route mismatch — skip')
      return
    }
    if (ageMs > 10 * 60 * 1000) {
      console.log('[AiBridge] packet expired — skip')
      sessionStorage.removeItem(AI_DRAFT_STORAGE_KEY)
      return
    }

    const packetMissing = (packet.missing_fields ?? []).map((m) => m.label)

    // แจ้งผู้ใช้ทันทีว่า AI กำลังเตรียมแบบฟอร์ม (ก่อนรอ async)
    toast.info('AI กำลังเตรียมแบบฟอร์ม…', { id: 'ai-bridge', duration: 8000 })

    let cancelled = false
    const prepare = async () => {
      try {
        // รอ page render เบื้องต้น
        await new Promise((resolve) => window.setTimeout(resolve, 500))
        if (cancelled) { toast.dismiss('ai-bridge'); return }

        let dialogOpened = !packet.open_button // ถ้าไม่มี open_button ถือว่าไม่ต้องเปิด dialog

        if (packet.open_button) {
          // retry หาปุ่มที่ enabled (รอ async data โหลดเสร็จ) สูงสุด 3 วินาที
          const addButton = await waitForButton(packet.open_button, 3000)
          if (cancelled) return

          if (!addButton) {
            sessionStorage.removeItem(AI_DRAFT_STORAGE_KEY)
            if (packetMissing.length > 0) {
              toast.warning(`⚠️ ต้องกรอกเพิ่มเติม: ${packetMissing.join(', ')}`, { duration: 8000 })
            }
            toast.warning(
              `ไม่พบปุ่ม "${packet.open_button}" กรุณากดเปิดแบบฟอร์มแล้วกรอกข้อมูลด้วยตนเอง`,
              { duration: 6000 },
            )
            return
          }

          addButton.click()

          // รอให้ dialog เปิด — ยืนยันก่อนกรอก field
          dialogOpened = await waitForDialog(1500)
          if (cancelled) return

          if (!dialogOpened) {
            // click อาจไม่ทำงาน (ปุ่มถูก disable อีกครั้ง หรือไม่มี dialog) — แจ้งและออก
            sessionStorage.removeItem(AI_DRAFT_STORAGE_KEY)
            if (packetMissing.length > 0) {
              toast.warning(`⚠️ ต้องกรอกเพิ่มเติม: ${packetMissing.join(', ')}`, { duration: 8000 })
            }
            toast.warning('กรุณากดเปิดแบบฟอร์มด้วยตนเอง แล้วกรอกข้อมูลที่แจ้งด้านบน', { duration: 6000 })
            return
          }

          // รอ field ใน dialog render เสร็จ
          await new Promise((resolve) => window.setTimeout(resolve, 400))
          if (cancelled) return
        }

        let filled = 0
        const unresolved: string[] = []
        for (const [field, value] of Object.entries(packet.fields)) {
          const label = packet.field_labels[field] ?? field
          const named = findFieldByName(field)
          if (named && setNativeValue(named, value)) {
            filled++
            continue
          }

          const control = findControlByLabel(label)
          if (control?.matches('button[role="combobox"]') && await fillRadixSelect(control, value)) {
            filled++
            continue
          }

          if (/date|วันที่/i.test(field + label)) {
            window.dispatchEvent(new CustomEvent('sfmis:ai-prefill-date', {
              detail: { field, label, value: String(value) },
            }))
            filled++
            continue
          }
          unresolved.push(label)
        }

        sessionStorage.removeItem(AI_DRAFT_STORAGE_KEY)

        const allPending = [...new Set([...unresolved, ...packetMissing])]

        if (allPending.length === 0) {
          toast.success(
            filled > 0
              ? `✅ ข้อมูลครบแล้ว ดำเนินการต่อได้ (AI กรอกแล้ว ${filled} ช่อง)`
              : `✅ ข้อมูลครบแล้ว ดำเนินการต่อได้`,
            { duration: 6000 },
          )
        } else {
          if (filled > 0) {
            toast.info(`AI กรอกข้อมูลให้แล้ว ${filled} ช่อง`, { duration: 4000 })
          }
          toast.warning(`⚠️ ต้องกรอกเพิ่มเติม: ${allPending.join(', ')}`, { duration: 8000 })
        }
      } catch (error) {
        sessionStorage.removeItem(AI_DRAFT_STORAGE_KEY)
        const msg = error instanceof Error ? error.message : String(error)
        toast.error(`AI ไม่สามารถกรอกข้อมูลอัตโนมัติได้: ${msg}`)
      }
    }
    void prepare()
    return () => { cancelled = true }
  }, [pathname])

  return null
}
