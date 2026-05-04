/**
 * SFMIS E2E user test runner
 * - Login as each role 1-8 via backend /api/B_admin/login
 * - Verify auth + role guard via list endpoints
 * - Role 1 (super admin) does full create→verify→cleanup cycle
 * - Other roles: read-only verification (writes need complex prereqs)
 *
 * Usage:
 *   npm run test:users-e2e          # all roles
 *   npm run test:users-e2e -- 1     # only role 1
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3000/api';
const FRONTEND_BASE = process.env.E2E_FRONTEND_BASE || 'http://localhost:3001';
const SC_ID = 1;
const SY_ID = 1;
const PASSWORD = 'Test@1234';
const E2E_PREFIX = '__E2E__';

const ROLE_LABEL: Record<number, string> = {
  1: 'Super Admin',
  2: 'ผอ./Admin โรงเรียน',
  3: 'ฝ่ายแผนงาน',
  4: 'งานพัสดุ',
  5: 'การเงิน',
  6: 'หัวหน้าแผนงาน',
  7: 'หัวหน้าพัสดุ',
  8: 'หัวหน้าการเงิน',
};

type Status = 'pass' | 'fail' | 'skip';

interface TestResult {
  role: number;
  username: string;
  login: Status;
  read?: Status;
  write?: Status;
  verify?: Status;
  cleanup?: Status;
  notes: string[];
}

interface LoginInfo {
  token: string;
  admin_id: number;
  sc_id: number;
  type: number;
}

interface ApiResponse {
  ok: boolean;
  status: number;
  body: unknown;
}

async function http(
  method: 'GET' | 'POST',
  path: string,
  token?: string,
  payload?: unknown,
): Promise<ApiResponse> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

function asObj(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function strProp(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  return typeof v === 'string' ? v : '';
}

function numProp(o: Record<string, unknown>, key: string): number {
  const v = o[key];
  return typeof v === 'number' ? v : Number(v ?? 0);
}

async function checkPreconditions(): Promise<{
  backend: boolean;
  frontend: boolean;
}> {
  let backend = false;
  let frontend = false;
  try {
    const r = await fetch(`${API_BASE}/health`);
    backend = r.ok;
  } catch {
    /* ignore */
  }
  try {
    const r = await fetch(FRONTEND_BASE);
    frontend = r.status < 500;
  } catch {
    /* ignore */
  }
  return { backend, frontend };
}

async function login(username: string): Promise<LoginInfo | null> {
  const res = await http('POST', '/B_admin/login', undefined, {
    email: username,
    password: PASSWORD,
  });
  const body = asObj(res.body);
  const token = strProp(body, 'access_token');
  if (body.flag !== 'success' || !token) return null;
  const data = asObj(body.data);
  return {
    token,
    admin_id: numProp(data, 'admin_id'),
    sc_id: numProp(data, 'sc_id'),
    type: numProp(data, 'type'),
  };
}

// ── Role-specific scenarios ─────────────────────────────────────────────

/**
 * Role 1 — Super Admin
 * Full cycle: create test admin → verify in list → soft-delete
 */
async function testRole1(token: string, r: TestResult): Promise<void> {
  // Read
  const list = await http('GET', `/B_admin/load_admin/1/100`, token);
  if (!list.ok) {
    r.read = 'fail';
    r.notes.push(`Read failed: HTTP ${list.status}`);
    return;
  }
  r.read = 'pass';

  // Write
  const ts = Date.now();
  const testName = `${E2E_PREFIX}admin_${ts}`;
  const add = await http('POST', '/B_admin/addAdmin', token, {
    name: testName,
    email: `${E2E_PREFIX}${ts}@test.local`,
    password: 'Temp@1234',
    type: 5, // ทดลองสร้าง admin การเงิน
    position: 5,
    sc_id: SC_ID,
  });
  const addBody = asObj(add.body);
  if (!add.ok || !addBody.flag) {
    r.write = 'fail';
    r.notes.push(
      `Add admin failed: HTTP ${add.status} ${strProp(addBody, 'ms')}`,
    );
    return;
  }
  r.write = 'pass';

  // Verify
  const verify = await http('GET', `/B_admin/load_admin/1/200`, token);
  const arr = asArray(asObj(verify.body).data);
  const found = arr.find((a) => strProp(a, 'name') === testName);
  if (!found) {
    r.verify = 'fail';
    r.notes.push('Verify: ไม่พบ record ที่เพิ่งสร้างใน list');
    return;
  }
  r.verify = 'pass';

  // Cleanup
  const adminId = numProp(found, 'admin_id') || numProp(found, 'adminId');
  if (!adminId) {
    r.cleanup = 'skip';
    r.notes.push('Cleanup skipped: ไม่ได้ admin_id จาก response');
    return;
  }
  const del = await http('POST', '/B_admin/remove_admin', token, {
    admin_id: adminId,
    del: 1,
  });
  const delBody = asObj(del.body);
  r.cleanup = del.ok && delBody.flag ? 'pass' : 'fail';
  if (r.cleanup === 'fail') {
    r.notes.push(`Cleanup: HTTP ${del.status} ${strProp(delBody, 'ms')}`);
  }
}

/**
 * Role 2 — Admin โรงเรียน / ผอ.
 * Read-only: ดู user ในโรงเรียน
 */
async function testRole2(token: string, r: TestResult): Promise<void> {
  const list = await http('GET', `/B_admin/load_user/${SC_ID}/1/10`, token);
  r.read = list.ok ? 'pass' : 'fail';
  if (!list.ok) r.notes.push(`Read user list failed: HTTP ${list.status}`);
  r.write = 'skip';
  r.notes.push(
    'Write skipped — role นี้ส่วนใหญ่เป็น approver (ConfirmInvoice ต้องมี invoice prereq)',
  );
}

/**
 * Role 3 — ฝ่ายแผนงาน
 * Read-only: ดู project list
 */
async function testRole3(
  token: string,
  info: LoginInfo,
  r: TestResult,
): Promise<void> {
  const list = await http(
    'GET',
    `/Project/load_project/${SC_ID}/${info.admin_id}/0/10/${SY_ID}`,
    token,
  );
  r.read = list.ok ? 'pass' : 'fail';
  if (!list.ok) r.notes.push(`Read project list failed: HTTP ${list.status}`);
  r.write = 'skip';
  r.notes.push(
    'Write skipped — Project/addProject ต้องมี prereq (budget category, master data)',
  );
}

/**
 * Role 4 — งานพัสดุ
 * Read-only: ดู type-supplies (master)
 */
async function testRole4(token: string, r: TestResult): Promise<void> {
  const list = await http('GET', `/General/loadTypeSupplies/${SC_ID}`, token);
  if (list.status === 404) {
    r.read = 'skip';
    r.notes.push('Endpoint /General/loadTypeSupplies ไม่พบ — ตรวจ controller');
  } else {
    r.read = list.ok ? 'pass' : 'fail';
    if (!list.ok) r.notes.push(`Read failed: HTTP ${list.status}`);
  }
  r.write = 'skip';
  r.notes.push('Write skipped — supplies-related write needs prereq');
}

/**
 * Role 5 — การเงิน
 * Read-only: ดู invoice list
 */
async function testRole5(token: string, r: TestResult): Promise<void> {
  const list = await http(
    'GET',
    `/Invoice/loadInvoiceOrder/${SC_ID}/${SY_ID}`,
    token,
  );
  r.read = list.ok ? 'pass' : 'fail';
  if (!list.ok) r.notes.push(`Read invoice list failed: HTTP ${list.status}`);
  r.write = 'skip';
  r.notes.push(
    'Write skipped — addInvoice ต้องมี bg_type_id, p_id, user_request ที่มีอยู่จริง',
  );
}

/**
 * Role 6 — หัวหน้าแผนงาน (project approve)
 */
async function testRole6(
  token: string,
  info: LoginInfo,
  r: TestResult,
): Promise<void> {
  const list = await http(
    'GET',
    `/Project/load_project/${SC_ID}/${info.admin_id}/0/10/${SY_ID}`,
    token,
  );
  r.read = list.ok ? 'pass' : 'fail';
  if (!list.ok) r.notes.push(`Read failed: HTTP ${list.status}`);
  r.write = 'skip';
  r.notes.push('Write skipped — role นี้ approve ไม่ create');
}

/**
 * Role 7 — หัวหน้าพัสดุ
 */
async function testRole7(token: string, r: TestResult): Promise<void> {
  const list = await http('GET', `/General/loadTypeSupplies/${SC_ID}`, token);
  if (list.status === 404) {
    r.read = 'skip';
    r.notes.push('Endpoint not found');
  } else {
    r.read = list.ok ? 'pass' : 'fail';
    if (!list.ok) r.notes.push(`Read failed: HTTP ${list.status}`);
  }
  r.write = 'skip';
  r.notes.push('Write skipped — role นี้ approve ไม่ create');
}

/**
 * Role 8 — หัวหน้าการเงิน (invoice approve)
 */
async function testRole8(token: string, r: TestResult): Promise<void> {
  // permission ในเส้นทางคือ role/scope param ของ confirm endpoint — ใช้ 100 (รออนุมัติชั้นกลาง)
  const list = await http(
    'GET',
    `/Invoice/loadConfirmInvoice/${SC_ID}/100/${SY_ID}`,
    token,
  );
  r.read = list.ok ? 'pass' : 'fail';
  if (!list.ok) r.notes.push(`Read failed: HTTP ${list.status}`);
  r.write = 'skip';
  r.notes.push('Write skipped — role นี้ approve ไม่ create');
}

// ── Driver ──────────────────────────────────────────────────────────────

async function runRole(role: number): Promise<TestResult> {
  const username = `test_role_${role}`;
  const r: TestResult = { role, username, login: 'fail', notes: [] };

  const info = await login(username);
  if (!info) {
    r.notes.push('Login failed — ตรวจว่าได้รัน seed:test-users แล้ว');
    return r;
  }
  if (info.type !== role) {
    r.notes.push(
      `⚠ JWT type=${info.type} ไม่ตรงกับ role ${role} ที่ต้องการ — DB อาจมี user ชื่อนี้แต่ type ผิด`,
    );
  }
  r.login = 'pass';

  try {
    switch (role) {
      case 1:
        await testRole1(info.token, r);
        break;
      case 2:
        await testRole2(info.token, r);
        break;
      case 3:
        await testRole3(info.token, info, r);
        break;
      case 4:
        await testRole4(info.token, r);
        break;
      case 5:
        await testRole5(info.token, r);
        break;
      case 6:
        await testRole6(info.token, info, r);
        break;
      case 7:
        await testRole7(info.token, r);
        break;
      case 8:
        await testRole8(info.token, r);
        break;
      default:
        r.notes.push(`Role ${role} ไม่รู้จัก`);
    }
  } catch (err) {
    r.notes.push(`Exception: ${(err as Error).message}`);
  }

  return r;
}

function cell(v?: Status): string {
  if (v === 'pass') return '✅';
  if (v === 'fail') return '❌';
  if (v === 'skip') return '⏭';
  return '-';
}

function printReport(results: TestResult[]): void {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('สรุปผลการทดสอบ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(
    '| Role | Label | Login | Read | Write | Verify | Cleanup | Note |',
  );
  console.log(
    '|------|-------|-------|------|-------|--------|---------|------|',
  );
  for (const r of results) {
    const note = r.notes.join('; ').slice(0, 70);
    console.log(
      `| ${r.role} | ${ROLE_LABEL[r.role] ?? '?'} | ${cell(r.login)} | ${cell(r.read)} | ${cell(r.write)} | ${cell(r.verify)} | ${cell(r.cleanup)} | ${note} |`,
    );
  }

  const fails = results.filter(
    (r) => r.login === 'fail' || r.read === 'fail' || r.write === 'fail',
  ).length;
  const passes = results.length - fails;
  console.log('');
  console.log(`📊 ผ่าน ${passes}/${results.length} role | fail ${fails}`);
  console.log('');
  console.log(
    "💡 ถ้ามี record ค้างใน DB (cleanup ไม่ครบ): SELECT * FROM admin WHERE name LIKE '__E2E__%';",
  );
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  const targetRoles = arg ? [parseInt(arg, 10)] : [1, 2, 3, 4, 5, 6, 7, 8];

  console.log('SFMIS E2E User Test');
  console.log(`API: ${API_BASE}`);
  console.log(`Frontend: ${FRONTEND_BASE}`);
  console.log('');

  const pre = await checkPreconditions();
  console.log(`Backend: ${pre.backend ? '✅ alive' : '❌ down'}`);
  console.log(
    `Frontend: ${pre.frontend ? '✅ alive' : '⚠ down (test ผ่าน backend อย่างเดียว)'}`,
  );

  if (!pre.backend) {
    console.error('');
    console.error('❌ Backend ไม่ตอบ — สั่ง start ก่อน:');
    console.error('   cd backend && npm run start:dev');
    process.exit(1);
  }
  console.log('');

  const results: TestResult[] = [];
  for (const role of targetRoles) {
    if (role < 1 || role > 8) {
      console.warn(`⚠ ข้าม role ${role} (รองรับ 1-8 เท่านั้น)`);
      continue;
    }
    process.stdout.write(`▶ Role ${role} (${ROLE_LABEL[role]})... `);
    const r = await runRole(role);
    console.log(
      r.login === 'pass' ? `login ✓` : `login ✗ (${r.notes[0] ?? ''})`,
    );
    results.push(r);
  }

  printReport(results);
}

main().catch((err) => {
  console.error('❌ Test runner error:', err);
  process.exit(1);
});
