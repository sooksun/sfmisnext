import { test, expect, chromium } from '@playwright/test'
import { APP_ROUTES } from './routes'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

/** บัญชีจาก seed (`cd backend && npm run seed`): admin_local / Admin@123 (type=2 ผู้ดูแลโรงเรียน) */
const LOGIN_USER = process.env.E2E_USER ?? 'admin_local'
const LOGIN_PASS = process.env.E2E_PASS ?? 'Admin@123'
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'

const PLACEHOLDER_USERS = new Set([
  'ชื่อ super admin',
  'super admin',
  'username',
  'admin',
])

type PageResult = {
  path: string
  status: 'ok' | 'warn' | 'fail'
  finalUrl: string
  issues: string[]
  durationMs: number
}

test('crawl ทุกหน้า + สร้างรายงาน', async () => {
  if (PLACEHOLDER_USERS.has(LOGIN_USER) || LOGIN_PASS === 'รหัสผ่าน' || LOGIN_PASS === 'password') {
    throw new Error(
      `E2E_USER/E2E_PASS เป็นข้อความตัวอย่าง ไม่ใช่บัญชีจริง (ได้ "${LOGIN_USER}")\n` +
        'ใช้จาก seed: $env:E2E_USER="admin_local"; $env:E2E_PASS="Admin@123"\n' +
        'หรือลบตัวแปรแล้วรันใหม่ (จะใช้ค่า default)',
    )
  }

  test.setTimeout(1_200_000)

  const browser = await chromium.launch()
  const page = await browser.newPage()
  const results: PageResult[] = []

  async function login() {
    await page.goto(`${BASE}/sign-in`)
    await page.locator('#username').fill(LOGIN_USER)
    await page.locator('#password').fill(LOGIN_PASS)
    await page.locator('button[type="submit"]').click()
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    } catch {
      const body = await page.locator('body').innerText()
      const hint =
        body.includes('อีเมลหรือรหัสผ่าน') || page.url().includes('/sign-in')
          ? `ตรวจสอบ E2E_USER/E2E_PASS (ปัจจุบัน: "${LOGIN_USER}") และว่า backend รันที่ :3000\n` +
            'บัญชี seed: admin_local / Admin@123 — รัน `cd backend && npm run seed` ถ้ายังไม่มี'
          : `ไม่ redirect ไป /dashboard (ยังอยู่ที่ ${page.url()})`
      throw new Error(`Login failed: ${hint}`)
    }
  }

  try {
    await login()
    // รอ SessionSync ตั้งปีงบ — ลด API error จาก scId/syId = 0
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText ?? ''
        return !t.includes('ยังไม่ได้เลือกปีการศึกษา') && /ปีงบประมาณ/.test(t)
      },
      { timeout: 45_000 },
    ).catch(() => {
      /* บางโรงเรียนไม่มีปี — crawl ต่อได้ */
    })
    await page.waitForTimeout(1500)
  } catch (e) {
    await browser.close()
    throw e
  }

  for (const path of APP_ROUTES) {
    if (path === '/sign-in') continue
    const started = Date.now()
    const issues: string[] = []
    const pathConsole: string[] = []
    const handler = (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === 'error') {
        const t = msg.text()
        if (
          !t.includes('favicon') &&
          !t.includes('hydration') &&
          !t.includes('401') &&
          !t.includes('Failed to load resource')
        ) {
          pathConsole.push(t.slice(0, 150))
        }
      }
    }
    page.on('console', handler)

    let status: PageResult['status'] = 'ok'
    try {
      const res = await page.goto(`${BASE}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      })
      await page.waitForTimeout(600)

      const finalUrl = page.url()
      if (finalUrl.includes('/sign-in')) {
        issues.push('redirect ไป sign-in')
        status = 'fail'
        await login()
      }
      if (res && res.status() >= 500) {
        issues.push(`HTTP ${res.status()}`)
        status = 'fail'
      }

      const body = await page.locator('body').innerText()
      if (/Application error|Unhandled Runtime Error|Internal Server Error/i.test(body)) {
        issues.push('error overlay บนหน้า')
        status = 'fail'
      }
      if (/ไม่มีสิทธิ์เข้าถึงหน้านี้/i.test(body)) {
        issues.push('RBAC ไม่มีสิทธิ์')
        if (status === 'ok') status = 'warn'
      }
      if (pathConsole.length > 0) {
        issues.push(`console.error x${pathConsole.length}`)
        if (status === 'ok') status = 'warn'
      }
    } catch (e) {
      issues.push(String(e).slice(0, 120))
      status = 'fail'
    }

    page.off('console', handler)
    results.push({
      path,
      status,
      finalUrl: page.url(),
      issues,
      durationMs: Date.now() - started,
    })
  }

  await browser.close()

  const ok = results.filter((r) => r.status === 'ok').length
  const warn = results.filter((r) => r.status === 'warn').length
  const fail = results.filter((r) => r.status === 'fail').length

  const reportDir = join(process.cwd(), 'test-results')
  mkdirSync(reportDir, { recursive: true })
  const jsonPath = join(reportDir, 'all-pages-report.json')
  writeFileSync(
    jsonPath,
    JSON.stringify(
      { at: new Date().toISOString(), user: LOGIN_USER, ok, warn, fail, total: results.length, results },
      null,
      2,
    ),
    'utf8',
  )

  const md = buildMarkdownReport(results, { ok, warn, fail, user: LOGIN_USER })
  const mdPath = join(reportDir, 'all-pages-report.md')
  writeFileSync(mdPath, md, 'utf8')

  console.log('\n' + md)

  // รายงานเสมอ; fail เฉพาะเมื่อมี crash จริงหลายหน้า (ไม่นับ browser closed จาก timeout)
  const hardFail = results.filter(
    (r) =>
      r.status === 'fail' &&
      !r.issues.some((i) => i.includes('browser has been closed')),
  ).length
  expect(hardFail, `${hardFail} hard FAIL — ดู ${mdPath}`).toBe(0)
})

function buildMarkdownReport(
  results: PageResult[],
  sum: { ok: number; warn: number; fail: number; user: string },
) {
  const lines = [
    '# SFMIS All Pages Test Report',
    '',
    `**วันที่:** ${new Date().toLocaleString('th-TH')}`,
    `**ผู้ทดสอบ (login):** ${sum.user}`,
    '',
    '| สถานะ | จำนวน |',
    '|--------|--------|',
    `| OK | ${sum.ok} |`,
    `| WARN | ${sum.warn} |`,
    `| FAIL | ${sum.fail} |`,
    `| รวม | ${results.length} |`,
    '',
  ]
  if (results.some((r) => r.status === 'fail')) {
    lines.push('## FAIL', '')
    for (const r of results.filter((x) => x.status === 'fail')) {
      lines.push(`- \`${r.path}\` — ${r.issues.join('; ') || 'unknown'}`)
    }
    lines.push('')
  }
  if (results.some((r) => r.status === 'warn')) {
    lines.push('## WARN', '')
    for (const r of results.filter((x) => x.status === 'warn')) {
      lines.push(`- \`${r.path}\` — ${r.issues.join('; ')}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}
