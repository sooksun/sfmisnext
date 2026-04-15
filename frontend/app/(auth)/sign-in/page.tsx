'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Landmark, Loader2 } from 'lucide-react'

const signInSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})

type SignInValues = z.infer<typeof signInSchema>

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
  })

  async function onSubmit(values: SignInValues) {
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        username: values.username,
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      } else {
        toast.success('เข้าสู่ระบบสำเร็จ')
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 mb-3">
            <Landmark className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">SFMIS</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">ระบบบริหารจัดการการเงินโรงเรียน</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อผู้ใช้
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              {...register('username')}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none transition-colors
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                ${errors.username ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
              placeholder="admin_local"
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none transition-colors
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5
              text-sm font-medium text-white shadow-sm transition-colors
              hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        School Financial Management Information System
      </p>
    </div>
  )
}
