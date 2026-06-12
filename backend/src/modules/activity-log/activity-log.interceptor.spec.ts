import { lastValueFrom, of, throwError } from 'rxjs';
import { ActivityLogInterceptor } from './activity-log.interceptor';

function ctx(method: string, url: string, body: any = {}, user: any = {}) {
  const req = {
    method,
    originalUrl: url,
    body,
    params: {},
    user,
    headers: { 'user-agent': 'jest' },
    ip: '127.0.0.1',
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
}
function handler(resp: any) {
  return { handle: () => of(resp) } as any;
}

describe('ActivityLogInterceptor', () => {
  let queue: { push: jest.Mock };
  let interceptor: ActivityLogInterceptor;

  beforeEach(() => {
    queue = { push: jest.fn() };
    interceptor = new ActivityLogInterceptor(queue as any);
  });

  it('GET ปกติ → ไม่ log', async () => {
    await lastValueFrom(
      interceptor.intercept(ctx('GET', '/api/Loan_agreement/load/1'), handler({ data: [] })),
    );
    expect(queue.push).not.toHaveBeenCalled();
  });

  it('GET export → log action=export', async () => {
    await lastValueFrom(
      interceptor.intercept(
        ctx('GET', '/api/Financial_assessment/export/5', {}, { sc_id: 1, admin_id: 2, type: 5, username: 'fin' }),
        handler({ head: {} }),
      ),
    );
    expect(queue.push).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'export', module: 'Financial_assessment', scId: 1 }),
    );
  });

  it('POST approve → action=approve + entity_id จาก body', async () => {
    await lastValueFrom(
      interceptor.intercept(
        ctx('POST', '/api/Loan_agreement/approve', { la_id: 7 }, { sc_id: 3, admin_id: 9, type: 2, username: 'dir' }),
        handler({ flag: true }),
      ),
    );
    const rec = queue.push.mock.calls[0][0];
    expect(rec.action).toBe('approve');
    expect(rec.entityId).toBe('7');
    expect(rec.success).toBe(1);
  });

  it('DELETE → action=delete, response flag=false → success=0', async () => {
    await lastValueFrom(
      interceptor.intercept(
        ctx('DELETE', '/api/Receipt/remove/4', {}, { sc_id: 1, admin_id: 1, type: 1, username: 'a' }),
        handler({ flag: false, ms: 'fail' }),
      ),
    );
    const rec = queue.push.mock.calls[0][0];
    expect(rec.action).toBe('delete');
    expect(rec.success).toBe(0);
  });

  it('login → ไม่เก็บ password ใน detail_json', async () => {
    await lastValueFrom(
      interceptor.intercept(
        ctx('POST', '/api/B_admin/login', { email: 'u', password: 'secret123' }, {}),
        handler({ access_token: 'x', admin_id: 5 }),
      ),
    );
    const rec = queue.push.mock.calls[0][0];
    expect(rec.action).toBe('login');
    expect(rec.adminName).toBe('u');
    expect(rec.detailJson).toBeNull();
  });

  it('field อ่อนไหวใน body ถูกปิด (***)', async () => {
    await lastValueFrom(
      interceptor.intercept(
        ctx('POST', '/api/Admin/update', { name: 'A', password: 'p', token: 't' }, { sc_id: 1, admin_id: 1, type: 1, username: 'a' }),
        handler({ flag: true }),
      ),
    );
    const rec = queue.push.mock.calls[0][0];
    expect(rec.detailJson).toContain('***');
    expect(rec.detailJson).not.toContain('"p"');
  });

  it('work-alert poll → ไม่ log (noise)', async () => {
    await lastValueFrom(
      interceptor.intercept(ctx('GET', '/api/Work_alert/count/1'), handler({ unread: 0 })),
    );
    expect(queue.push).not.toHaveBeenCalled();
  });

  it('error ใน handler → ยัง log success=0', async () => {
    const obs = interceptor.intercept(
      ctx('POST', '/api/Check/create', { amount: 1 }, { sc_id: 1, admin_id: 1, type: 5, username: 'a' }),
      { handle: () => throwError(() => new Error('boom')) } as any,
    );
    await expect(lastValueFrom(obs)).rejects.toThrow('boom');
    expect(queue.push).toHaveBeenCalledWith(expect.objectContaining({ success: 0 }));
  });
});
