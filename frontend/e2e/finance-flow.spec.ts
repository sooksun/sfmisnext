import { test, expect, type Page } from '@playwright/test'

/**
 * E2E เส้นทางงานการเงิน (finance flow) — เดินตามลำดับงานจริงทีละขั้น
 *   ตั้งค่าต้นปี → รับเงิน → ขอเบิก(ใบสำคัญจ่าย) → ตรวจสอบ → ออกเช็ค → รายงานคงเหลือ/คุมเช็ค
 *
 * ทดสอบว่าทุกหน้าในเส้นทางเปิดได้ ไม่ redirect ออก ไม่มี error overlay และ render เนื้อหาหลัก
 * (ไม่ผูกกับ record เฉพาะใน seed — เป็น smoke ระดับ flow ที่เสถียร)
 *
 * ต้องมี: backend ที่ :3000 + DB ที่ seed แล้ว (`cd backend && npm run seed`)
 * รัน: `cd frontend && npm run test:e2e:all`  (หรือ `npx playwright test e2e/finance-flow.spec.ts`)
 */

const LOGIN_USER = process.env.E2E_USER ?? 'admin_local'
const LOGIN_PASS = process.env.E2E_PASS ?? 'Admin@123'

async function login(page: Page) {
  await page.goto('/sign-in')
  await page.locator('#username').fill(LOGIN_USER)
  await page.locator('#password').fill(LOGIN_PASS)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 }).catch(() => {
    throw new Error(
      `Login ล้มเหลว (user="${LOGIN_USER}") — ตรวจ backend :3000 + seed (admin_local/Admin@123) ` +
        `ปัจจุบันอยู่ที่ ${page.url()}`,
    )
  })
}

/** เปิดหน้าแล้วตรวจว่าไม่หลุด session + ไม่มี error overlay + มีเนื้อหา render */
async function assertPageHealthy(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForTimeout(700)

  expect(page.url(), `ถูก redirect ออกจาก ${path} (session หลุด/ไม่มีสิทธิ์)`).not.toContain(
    '/sign-in',
  )
  if (res) {
    expect(res.status(), `${path} คืน HTTP ${res.status()}`).toBeLessThan(500)
  }

  const body = await page.locator('body').innerText()
  expect(
    /Application error|Unhandled Runtime Error|Internal Server Error/i.test(body),
    `${path} แสดง error overlay`,
  ).toBe(false)

  // มีเนื้อหาหลัก render (heading หรือ table หรือ form อย่างน้อยหนึ่ง)
  const hasContent = await page
    .locator('h1, h2, table, form, [role="table"]')
    .first()
    .isVisible()
    .catch(() => false)
  expect(hasContent, `${path} ไม่มีเนื้อหาหลัก render`).toBe(true)
}

// ลำดับขั้นเส้นทางงานการเงิน
const FINANCE_FLOW: { step: string; path: string }[] = [
  { step: '1. ตั้งค่าต้นปี (ทะเบียนสมุดใบเสร็จ)', path: '/sfmis/financial-report/receipt-book' },
  { step: '2. รับเงิน', path: '/sfmis/receive-menu/receive' },
  { step: '3. ใบเสร็จที่ออกแล้ว', path: '/sfmis/financial-report/receipt' },
  { step: '4. ขอเบิก / ใบสำคัญจ่าย', path: '/sfmis/pay-menu/invoice' },
  { step: '5. ตรวจสอบใบสำคัญจ่าย', path: '/sfmis/confirm-invoice' },
  { step: '6. ออกเช็ค', path: '/sfmis/pay-menu/generate-check' },
  { step: '7. หนังสือรับรองหักภาษี ณ ที่จ่าย', path: '/sfmis/pay-menu/withholding-certificate' },
  { step: '8. ปิดวัน (เงินคงเหลือประจำวัน)', path: '/sfmis/financial-report/daily-balance' },
  { step: '9. รายงานควบคุมเช็ค', path: '/sfmis/report/check-control' },
  { step: '10. รายงานควบคุมเงินตามประเภท', path: '/sfmis/report/money-type' },
]

test.describe('เส้นทางงานการเงิน (finance flow) เปิดได้ครบทุกขั้น', () => {
  test.setTimeout(180_000)

  test('login แล้วเดินครบทุกขั้นของงานการเงิน', async ({ page }) => {
    await login(page)

    // รอ SessionSync ตั้งปีงบ เพื่อลด API error จาก scId/syId = 0
    await page
      .waitForFunction(
        () => {
          const t = document.body?.innerText ?? ''
          return !t.includes('ยังไม่ได้เลือกปีการศึกษา') && /ปีงบประมาณ/.test(t)
        },
        { timeout: 45_000 },
      )
      .catch(() => {
        /* บางโรงเรียนไม่มีปี — เดินต่อได้ */
      })

    for (const { step, path } of FINANCE_FLOW) {
      await test.step(step, async () => {
        await assertPageHealthy(page, path)
      })
    }
  })
})
