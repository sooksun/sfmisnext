import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogQueue } from './activity-log.queue';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// route ที่ไม่ต้อง log (noise/poll/อ่าน)
const SKIP_PATTERNS = [
  /\/Work_alert\/(load|count)/i,
  /\/ai\/chat/i,
  /\/health/i,
  /\/auth\/refresh/i,
];
const SENSITIVE_KEY = /password|token|secret|otp|pin|authorization/i;
const MAX_JSON = 2000;

/**
 * ดักทุก endpoint เขียนข้อมูล → push เข้า ActivityLogQueue (ไม่บล็อก response)
 * ครอบทั้งระบบด้วย APP_INTERCEPTOR — ไม่ต้องแก้รายโมดูล
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private readonly queue: ActivityLogQueue) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method: string = req?.method ?? 'GET';
    const url: string = (req?.originalUrl ?? req?.url ?? '').split('?')[0];

    const isExport = /\/(export|print|download)/i.test(url);
    const shouldLog =
      (WRITE_METHODS.has(method) || isExport) &&
      !SKIP_PATTERNS.some((re) => re.test(url));

    if (!shouldLog) return next.handle();

    return next.handle().pipe(
      tap({
        next: (body) => this.record(req, method, url, body, true),
        error: () => this.record(req, method, url, null, false),
      }),
    );
  }

  private record(
    req: any,
    method: string,
    url: string,
    body: unknown,
    ok: boolean,
  ) {
    try {
      const user = req?.user ?? {};
      const success =
        ok && !(body && typeof body === 'object' && (body as any).flag === false);
      const isLogin = /\/login$/i.test(url);
      const module = this.parseModule(url);
      const action = this.parseAction(method, url, isLogin);

      this.queue.push({
        scId: Number(user.sc_id ?? this.fromBody(req, 'sc_id') ?? 0),
        adminId: Number(
          user.admin_id ?? (body as any)?.admin_id ?? 0,
        ),
        adminName: isLogin
          ? String(req?.body?.email ?? '-').slice(0, 150)
          : (user.username ?? null),
        role: Number(user.type ?? 0),
        action,
        module,
        method,
        route: url.slice(0, 255),
        entityId: this.parseEntityId(req, body),
        summary: `${action} ${module ?? ''}`.trim().slice(0, 255),
        detailJson: isLogin ? null : this.sanitizeBody(req?.body),
        success: success ? 1 : 0,
        ip: this.parseIp(req),
        userAgent: String(req?.headers?.['user-agent'] ?? '').slice(0, 255),
      });
    } catch {
      // เงียบ — การ log ต้องไม่กระทบ request
    }
  }

  private parseModule(url: string): string | null {
    // /api/Loan_agreement/approve → Loan_agreement
    const m = url.match(/\/api\/([^/]+)/i);
    return m ? m[1].slice(0, 60) : null;
  }

  private parseAction(method: string, url: string, isLogin: boolean): string {
    if (isLogin) return 'login';
    const u = url.toLowerCase();
    if (/\/(export|print|download)/.test(u)) return 'export';
    if (/(approve|aprove)/.test(u)) return 'approve';
    if (/confirm|verify|precheck/.test(u)) return 'confirm';
    if (method === 'DELETE' || /(remove|delete|destroy|void|cancel)/.test(u))
      return 'delete';
    if (/(add|create|insert|generate|new)/.test(u)) return 'create';
    if (/(update|edit|save|set|alter)/.test(u)) return 'update';
    if (method === 'PUT' || method === 'PATCH') return 'update';
    return 'action';
  }

  private parseEntityId(req: any, body: unknown): string | null {
    const fromResp =
      (body as any)?.id ??
      (body as any)?.insertId ??
      (body as any)?.data?.id ??
      (body as any)?.ms_id ??
      (body as any)?.fa_id;
    if (fromResp != null) return String(fromResp).slice(0, 60);
    const b = req?.body ?? {};
    const key = Object.keys(b).find((k) => /(^id$|_id$)/.test(k));
    const p = req?.params ?? {};
    const pkey = Object.keys(p).find((k) => /(^id$|_id$)/.test(k));
    const v = (key && b[key]) ?? (pkey && p[pkey]);
    return v != null ? String(v).slice(0, 60) : null;
  }

  private parseIp(req: any): string | null {
    const xf = req?.headers?.['x-forwarded-for'];
    const ip = (Array.isArray(xf) ? xf[0] : xf)?.split(',')[0] ?? req?.ip;
    return ip ? String(ip).slice(0, 45) : null;
  }

  private fromBody(req: any, key: string): unknown {
    return req?.body?.[key];
  }

  private sanitizeBody(body: unknown): string | null {
    if (!body || typeof body !== 'object') return null;
    try {
      const clean = JSON.parse(JSON.stringify(body), (k, v) =>
        SENSITIVE_KEY.test(k) ? '***' : v,
      );
      const s = JSON.stringify(clean);
      return s.length > MAX_JSON ? s.slice(0, MAX_JSON) + '…' : s;
    } catch {
      return null;
    }
  }
}
