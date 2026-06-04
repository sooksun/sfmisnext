'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiPost } from '@/lib/api'

const schema = z
  .object({
    old_password: z.string().min(1, 'กรุณาระบุรหัสผ่านเดิม'),
    new_password: z
      .string()
      .min(8, 'อย่างน้อย 8 ตัวอักษร')
      .regex(
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{8,}$/,
        'ต้องมีตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ',
      ),
    confirm_password: z.string().min(1, 'กรุณายืนยันรหัสผ่าน'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'รหัสผ่านใหม่ไม่ตรงกัน',
    path: ['confirm_password'],
  })

type FormValues = z.infer<typeof schema>

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const res = await apiPost<{ flag: boolean; ms: string }>('B_admin/changePassword', {
        old_password: values.old_password,
        new_password: values.new_password,
      })
      if (res.flag) {
        toast.success(res.ms || 'เปลี่ยนรหัสผ่านสำเร็จ')
        reset()
        onOpenChange(false)
      } else {
        toast.error(res.ms || 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            เปลี่ยนรหัสผ่าน
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="old_password">รหัสผ่านเดิม</Label>
            <Input id="old_password" type="password" autoComplete="current-password" {...register('old_password')} />
            {errors.old_password && (
              <p className="text-xs text-red-600 mt-1">{errors.old_password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="new_password">รหัสผ่านใหม่</Label>
            <Input id="new_password" type="password" autoComplete="new-password" {...register('new_password')} />
            {errors.new_password && (
              <p className="text-xs text-red-600 mt-1">{errors.new_password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirm_password">ยืนยันรหัสผ่านใหม่</Label>
            <Input id="confirm_password" type="password" autoComplete="new-password" {...register('confirm_password')} />
            {errors.confirm_password && (
              <p className="text-xs text-red-600 mt-1">{errors.confirm_password.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
