'use client'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Sparkles, Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FormDialog } from '@/components/shared/form-dialog'
import { apiPost } from '@/lib/api'

export interface AiParsedFields {
  proj_name: string | null
  proj_detail: string | null
  policy_ids: number[]
  proj_budget_type: string | null
  start_date: string | null
  end_date: string | null
  proj_budget: number | null
}

interface AiParseResponse {
  flag: boolean
  ms?: string
  data?: {
    fields: AiParsedFields
    questions: { field: string; question: string }[]
    provider: string
  }
}

interface AiProjectDialogProps {
  open: boolean
  onClose: () => void
  scId: number
  syId: number
  budgetYear: number
  policies: { scp_id: number; name: string }[]
  budgetTypes: string[]
  onApply: (f: AiParsedFields) => void
}

const AI_PLACEHOLDER =
  'พิมพ์หรือพูดข้อมูลโครงการรวมกันได้เลย เช่น:\n' +
  '"โครงการอบรมเชิงปฏิบัติการ AI สำหรับครู รายละเอียด อบรมการใช้ AI ช่วยสอน ' +
  'สอดคล้องนโยบายนำ AI มาใช้ เริ่ม 1 พฤษภาคม 2569 ถึง 30 มิถุนายน 2569 ' +
  'ใช้เงินอุดหนุนรายหัว วงเงิน 25000 บาท"'

export function AiProjectDialog({
  open, onClose, scId, syId, budgetYear, policies, budgetTypes, onApply,
}: AiProjectDialogProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [result, setResult] = useState<AiParsedFields | null>(null)
  const [questions, setQuestions] = useState<{ field: string; question: string }[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null)

  function stopVoice() {
    try { recogRef.current?.stop() } catch { /* ignore */ }
    setListening(false)
  }
  function resetState() {
    setText(''); setResult(null); setQuestions([]); setAnswers({}); setLoading(false)
    stopVoice()
  }
  function close() { resetState(); onClose() }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = typeof window !== 'undefined'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null
  const voiceSupported = !!SR

  function startVoice() {
    if (!SR) { toast.error('เบราว์เซอร์นี้ไม่รองรับการรับเสียง'); return }
    const recog = new SR()
    recog.lang = 'th-TH'
    recog.continuous = true
    recog.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      let chunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) chunk += e.results[i][0].transcript
      }
      if (chunk) setText((prev) => (prev ? prev + ' ' : '') + chunk.trim())
    }
    recog.onerror = () => setListening(false)
    recog.onend = () => setListening(false)
    recogRef.current = recog
    recog.start()
    setListening(true)
  }

  async function analyze() {
    const extra = questions
      .map((q) => answers[q.field])
      .filter((a) => a && a.trim())
      .join(' ')
    const combined = [text.trim(), extra.trim()].filter(Boolean).join('\n')
    if (!combined) { toast.error('กรุณาพิมพ์หรือพูดข้อมูลโครงการก่อน'); return }
    setLoading(true)
    try {
      const res = await apiPost<AiParseResponse>('ai/parse-project', {
        text: combined,
        sc_id: scId,
        sy_id: syId,
        budget_year: budgetYear,
        policies,
        budget_types: budgetTypes,
      })
      if (!res.flag || !res.data) {
        toast.error(res.ms || 'AI วิเคราะห์ไม่สำเร็จ')
        return
      }
      setResult(res.data.fields)
      setQuestions(res.data.questions || [])
      if (extra) setText(combined)
      setAnswers({})
      if ((res.data.questions || []).length === 0) {
        toast.success('วิเคราะห์ครบแล้ว — ตรวจผลแล้วกดนำไปใส่ฟอร์ม')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const policyName = (id: number) => policies.find((p) => p.scp_id === id)?.name ?? ('#' + id)

  return (
    <FormDialog open={open} onClose={close} title="สร้างโครงการด้วย AI" size="2xl">
      <div className="space-y-3">
        <div className="rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
          <p className="font-medium">พิมพ์หรือพูดข้อมูลโครงการรวมกันในกล่องเดียว แล้วให้ AI แยกเป็นช่อง ๆ ให้</p>
          <p className="mt-1 text-xs text-violet-700">
            ควรระบุ: ชื่อโครงการ · รายละเอียด · นโยบายโรงเรียนที่สอดคล้อง · วันที่เริ่ม · วันที่สิ้นสุด ·
            ประเภทงบประมาณ · วงเงิน — ระบุเท่าที่มี ระบบจะถามเพิ่มหากข้อมูลไม่ครบ
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>ข้อความโครงการ</Label>
            {voiceSupported && (
              <Button
                type="button"
                size="sm"
                variant={listening ? 'destructive' : 'outline'}
                onClick={() => (listening ? stopVoice() : startVoice())}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {listening ? 'หยุดพูด' : 'พูด'}
              </Button>
            )}
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={AI_PLACEHOLDER} />
          {listening && <p className="mt-1 text-xs text-red-500">● กำลังฟัง… พูดได้เลย ระบบจะต่อข้อความให้</p>}
        </div>

        <Button type="button" onClick={analyze} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ด้วย AI'}
        </Button>

        {questions.length > 0 && (
          <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">ข้อมูลบางส่วนยังไม่ชัดเจน กรุณาตอบเพิ่ม:</p>
            {questions.map((q, i) => (
              <div key={i}>
                <Label className="text-xs">{q.question}</Label>
                <Input
                  value={answers[q.field] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.field]: e.target.value }))}
                  placeholder="พิมพ์คำตอบ"
                />
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={analyze} disabled={loading}>
              วิเคราะห์อีกครั้งพร้อมคำตอบ
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-1 rounded-md border border-gray-200 bg-white p-3 text-sm">
            <p className="font-medium text-gray-700">ผลที่ AI สกัดได้</p>
            <Row label="ชื่อโครงการ" value={result.proj_name} />
            <Row label="รายละเอียด" value={result.proj_detail} />
            <Row label="นโยบายที่สอดคล้อง" value={result.policy_ids.length ? result.policy_ids.map(policyName).join(', ') : null} />
            <Row label="ประเภทงบประมาณ" value={result.proj_budget_type} />
            <Row label="วันที่เริ่ม" value={result.start_date} />
            <Row label="วันที่สิ้นสุด" value={result.end_date} />
            <Row label="วงเงิน" value={result.proj_budget != null ? result.proj_budget.toLocaleString('th-TH') : null} />
            <div className="pt-2">
              <Button type="button" onClick={() => onApply(result)} className="w-full">
                นำข้อมูลไปกรอกในฟอร์ม
              </Button>
            </div>
          </div>
        )}
      </div>
    </FormDialog>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-gray-500">{label}</span>
      <span className={value ? 'text-gray-800' : 'text-gray-300'}>{value || '— (ยังไม่มี)'}</span>
    </div>
  )
}
