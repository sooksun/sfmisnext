import { test, expect } from '@playwright/test'

test.describe('SFMIS smoke', () => {
  test('หน้า sign-in แสดงฟอร์ม login', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByRole('heading', { name: /เข้าสู่ระบบ|SFMIS/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByLabel(/ชื่อผู้ใช้|username/i)).toBeVisible()
    await expect(page.getByLabel(/รหัสผ่าน|password/i)).toBeVisible()
  })

  test('redirect ไม่ login → sign-in', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/sign-in/, { timeout: 15_000 })
    expect(page.url()).toContain('/sign-in')
  })
})
