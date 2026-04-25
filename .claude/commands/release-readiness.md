---
description: ประเมินความพร้อมก่อน deploy production — env, migration, monitoring, rollback
---

ทำหน้าที่ Release Manager — ตรวจ checklist ก่อน deploy production

## Stack (SFMIS)

- **Deploy**: Docker Compose (`docker-compose.yml`) — MySQL + Backend + Frontend
- **CI/CD**: GitHub Actions — `ci.yml` (lint+build+test), `deploy.yml` (blue-green)
- **Monitoring**: Sentry (`SENTRY_DSN` env, opt-in)
- **Health check**: `GET /api/health`
- **Production guide**: `PRODUCTION.md`

## ขั้นตอน

1. **อ่าน docs**: `PRODUCTION.md`, `SECURITY_VULNERABILITIES.md`, `DEVELOPMENT_ROADMAP.md`
2. **เช็ค env**: เปรียบเทียบ `backend/env.example` กับ env จริงที่ใช้
3. **เช็ค migration**: pending migration เหลือไหม
4. **รัน checklist** 14 ข้อ
5. **สรุป severity + go/no-go**

## Checklist (ภาษาไทย)

### 1. Env Variables 🔴
- [ ] `JWT_SECRET` ตั้งค่าแล้ว (ไม่ใช่ default)
- [ ] `DB_*` ครบ (HOST, PORT, USER, PASS, NAME)
- [ ] `CORS_ORIGIN` จำกัดเฉพาะ frontend domain (ไม่ใช่ `*`)
- [ ] `NODE_ENV=production`
- [ ] `COMMITTEE_THRESHOLD` (default 5000)
- [ ] AI: `AI_DEFAULT_PROVIDER` + key/url ของ provider ที่เลือก
- [ ] Frontend: `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL`, `AUTH_SECRET`
- [ ] **ตรวจว่า env file ไม่ถูก commit เข้า git**

### 2. Migration Readiness 🔴
- [ ] `synchronize: false` ใน production
- [ ] Pending migration รัน clean บน staging
- [ ] Migration `down()` ทดสอบแล้ว
- [ ] DB backup ก่อน migrate

### 3. Seed Strategy 🟡
- [ ] Admin default rotate password หลัง deploy ครั้งแรก (`admin_local`/`Admin@123`)
- [ ] Master data (school year, role) seed แล้ว
- [ ] Production seed ≠ dev seed

### 4. Logging 🟡
- [ ] NestJS Logger configured
- [ ] **ห้าม log password / token / PII**
- [ ] Log level เหมาะสม (production: warn+)

### 5. Monitoring 🟡
- [ ] Sentry `SENTRY_DSN` ตั้งค่า + ทดสอบ event ส่งถึง
- [ ] Health check `/api/health` ตอบ 200
- [ ] Frontend error boundary ครอบ root

### 6. Exception Handling 🟡
- [ ] Global filter จับ unhandled exceptions
- [ ] Service ที่เรียก external API มี timeout + retry
- [ ] DB connection error → graceful response

### 7. Backup Plan 🔴
- [ ] mysqldump schedule (daily / hourly)
- [ ] Backup retention policy
- [ ] ทดสอบ restore ได้จริง

### 8. Auth / Security 🔴
- [ ] JWT_SECRET strong (>32 chars random)
- [ ] Helmet configured (default settings)
- [ ] Rate limit login (5/min ผ่าน ThrottlerGuard)
- [ ] HTTPS enforced (reverse proxy)
- [ ] Cookie `Secure` + `SameSite`
- [ ] Password ใช้ bcrypt (round ≥ 10)

### 9. CORS / Cookies / Session 🟡
- [ ] CORS_ORIGIN ระบุ domain ชัดเจน
- [ ] NextAuth session 8 ชม. (ปัจจุบัน)
- [ ] Token storage: in-memory + sessionStorage (ไม่ใช่ localStorage)

### 10. Health Checks 🟡
- [ ] `/api/health` รวม DB ping
- [ ] Container healthcheck ใน Dockerfile
- [ ] Load balancer probe ตั้งถูก

### 11. Rate Limiting 🟡
- [ ] Login: 5/min
- [ ] Public API ที่เสี่ยง: configured
- [ ] Auth APIs: throttle

### 12. File Storage 🟢
- [ ] Upload directory persistent (volume mount)
- [ ] File size limit
- [ ] Allowed file types

### 13. Queue / Retry 🟢
- [ ] (ถ้ามี AI/async): retry strategy
- [ ] Dead-letter handling

### 14. Deployment Rollback Plan 🔴
- [ ] Blue-green strategy ผ่าน CI ทดสอบแล้ว
- [ ] Migration revert plan
- [ ] DB backup ก่อน deploy
- [ ] Smoke test scripts พร้อม

## Output Format

### Severity Summary
| Severity | Total | Pass | Fail | Note |
|---|---|---|---|---|
| 🔴 Critical | X | Y | Z | ... |
| 🟡 Important | X | Y | Z | ... |
| 🟢 Nice-to-have | X | Y | Z | ... |

### Go / No-Go Decision
- ✅ **GO** — ถ้า critical pass หมด
- ❌ **NO-GO** — ถ้ามี critical fail
- ⚠️ **CONDITIONAL** — pass critical แต่ medium ยังเปิด → ต้องมี action plan

### Action Items (ถ้ายังไม่พร้อม)
- [ ] [severity] item — owner: ?, deadline: ?

## Rules

- **อย่ารัน deploy เอง** — เป็น advisor เท่านั้น
- **ตรวจของจริงในเครื่อง** — อ่าน file/config จริง อย่าอ้าง memory
- **เตือนเรื่อง backup** ถ้า fail
