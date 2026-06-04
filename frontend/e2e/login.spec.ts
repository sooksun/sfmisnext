import { test, expect } from '@playwright/test'

test('login admin_local แล้ว redirect ไป /dashboard', async ({ page }) => {
  await page.goto('/sign-in')

  await page.getByLabel(/ชื่อผู้ใช้|username/i).fill('admin_local')
  await page.getByLabel(/รหัสผ่าน|password/i).fill('Admin@123')

  await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()

  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
  expect(page.url()).toContain('/dashboard')

  await expect(page.getByText(/ผู้ดูแลพิเศษ|admin_local|SFMIS/i).first()).toBeVisible({
    timeout: 10_000,
  })
})
