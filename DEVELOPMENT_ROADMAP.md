# 🚀 แผนการพัฒนาต่อ SFMIS (Development Roadmap)

> **สถานะปัจจุบัน:** ระบบ production-ready — Backend 68 โมดูล (NestJS + TypeORM) + Next.js Frontend (Angular กำลัง phase-out)
> **อัปเดตล่าสุด:** 5 มิถุนายน 2569 (2026)
> **แหล่งความจริงของสถานะ:** `plan.md` + `CLAUDE.md` (ไฟล์นี้คือแผน "งานที่เหลือ" เท่านั้น)

---

## 📊 สรุปสถานะโปรเจกต์ (ตามจริง มิ.ย. 2569)

| ส่วน | สถานะ | หมายเหตุ |
|------|--------|----------|
| Backend (NestJS + TypeORM) | ✅ | **67 modules** (21 core + ขยาย ~46 เช่น loan-agreement, travel-reimbursement, bank-reconciliation, gov-revenue, regulatory-config) |
| Frontend (Next.js 16.2 + React 19) | ✅ | **83 หน้า** ใต้ `frontend/app/(dashboard)/sfmis/` |
| Frontend (Angular legacy `src/`) | ⏳ phase-out | คงไว้ชั่วคราว ไม่พัฒนาต่อ |
| Database (MySQL 8 + TypeORM) | ✅ | 83+ entities, 16 migrations (`backend/src/migrations/`) — **ไม่ใช่ Prisma** |
| Unit Tests (Backend) | ✅ บางส่วน | **306 tests / 20 suites** — ยังไม่ถึงเป้า coverage 80% |
| Unit Tests (Frontend) | ❌ | ยังไม่มี (เป้า: Vitest สำหรับฟอร์ม react-hook-form + zod) |
| E2E Tests | ⚠️ smoke เท่านั้น | ยังไม่ครอบ flow วิกฤต login→ขอซื้อ→อนุมัติ→รับพัสดุ→เบิก→เช็ค |
| Security (JWT/bcrypt/RBAC/Helmet/Throttler) | ✅ | ทำครบ — ดู §Security ใน `CLAUDE.md` |
| Production Deploy (Docker + CI/CD) | ✅ | `docker-compose.yml`, GitHub Actions (`ci.yml`, `deploy.yml`), Sentry |

> ⚠️ เวอร์ชันก่อนหน้าของไฟล์นี้ (ธ.ค. 2567) ระบุ JWT/Tests/Docker = 0% ซึ่ง **ไม่ตรงกับ repo จริง** — งานเหล่านั้นทำเสร็จแล้ว เนื้อหาด้านล่างปรับให้เหลือเฉพาะงานที่ยังค้างจริง

---

## 🎯 งานที่ยังเหลือจริง (เรียงตามความสำคัญ)

### Phase 8: Testing & Quality Assurance

#### 8.1 Unit Tests — ขยาย coverage ให้ถึง 80% (Backend)
**ความสำคัญ:** ⭐⭐⭐⭐ | **สถานะ:** ✅ มีโครง 306 tests แล้ว — เหลือเติมให้ครบ

- [x] โครง Jest + 20 suites หลัก (admin, budget, invoice, check, loan-agreement ฯลฯ)
- [ ] เติม unit test โมดูลที่ยังไม่มี spec (report-*, monthly-submission, year-end-report, unified-register ฯลฯ)
- [ ] ตั้ง CI gate ที่ `test:cov` ≥ 80%

#### 8.2 E2E Tests — ครอบ flow วิกฤต
**ความสำคัญ:** ⭐⭐⭐⭐ | **สถานะ:** ⚠️ มี smoke test พื้นฐานแล้ว

- [x] Playwright smoke (`frontend/e2e/`)
- [ ] Flow การเงินครบวง: login → รับเงิน/ออกใบเสร็จ → ขอเบิก → ผอ.อนุมัติ → ออกเช็ค → รายงานคงเหลือ
- [ ] Flow พัสดุ: ขอซื้อ → อนุมัติหลายชั้น → ตรวจรับ → เบิกพัสดุ
- [ ] Flow เงินยืม/ค่าเดินทาง: ยื่น → ตรวจ → อนุมัติ → จ่าย → ส่งใช้

#### 8.3 Frontend Unit Tests (ยังไม่เริ่ม)
**ความสำคัญ:** ⭐⭐⭐ | **สถานะ:** ❌

- [ ] ตั้งค่า Vitest + React Testing Library
- [ ] ทดสอบ schema validation (zod) ของฟอร์มการเงินหลัก (invoice, loan-agreement, travel-reimbursement)

---

### Phase 9: Security & Compliance Hardening
> หมายเหตุ: JWT, bcrypt, RolesGuard, Helmet, Throttler(login), assertSameSchool (multi-tenant), Sentry, PageSizePipe — **ทำเสร็จแล้ว** เหลือเฉพาะรายการด้านล่าง

#### 9.1 ตรวจสอบ multi-tenant ให้ครบทุก endpoint
**ความสำคัญ:** ⭐⭐⭐⭐⭐ | **สถานะ:** ✅ ปิดช่องที่พบแล้ว (มิ.ย. 2569)

- [x] แก้ cross-tenant IDOR: budget-transfer / intra-bank-transfer / opening-balance (approve/cancel/update/delete โหลด record แล้ว `assertSameSchool`)
- [x] invoice debt-limit validation (กันเบิกเกินมูลหนี้ พัสดุ/ค่าเดินทาง/เงินยืม ทั้ง add + update)
- [ ] audit แบบกวาดทั้งระบบว่าทุก endpoint ที่รับ id แก้ไขข้อมูล มี tenant scoping ครบ

#### 9.2 อัปเกรด dependency ด้านความปลอดภัย
**ความสำคัญ:** ⭐⭐⭐ | **สถานะ:** ✅ เสร็จทั้ง frontend + backend (5 มิ.ย. 2569) — `npm audit` = 0 ทั้งคู่

- [x] **Frontend: `npm audit` = 0 vulnerabilities**
  - [x] `next` 16.2.6 → 16.2.7
  - [x] `next-auth` 5.0.0-beta.30 → beta.31 (หมายเหตุ: v5 **ยังไม่มี stable** — npm latest คือ v4; คง v5 beta ถูกต้องแล้ว)
  - [x] `xlsx` 0.18.5 (npm, High: prototype pollution + ReDoS) → **0.20.3 จาก SheetJS CDN** (drop-in, ไม่แก้โค้ด). ⚠️ Docker/CI ต้องเข้าถึง `cdn.sheetjs.com` ได้ตอน `npm ci`
  - [x] `brace-expansion` (moderate) → `npm audit fix`
- [x] **Backend: `npm audit` = 0 vulnerabilities** (จากเดิม 28: 1 critical + 13 high) — แก้ด้วย `npm audit fix` ล้วน ไม่ต้อง --force/major bump
  - [x] `axios` 1.15.0 → 1.17.0 (ปิด axios high หลายตัว: prototype pollution, SSRF, MITM)
  - [x] `@nestjs/core` 11.1.9 → 11.1.24 (ปิด injection/path-to-regexp high)
  - [x] `uuid` 11.1.0 → 11.1.1, + transitive (brace-expansion, body-parser, diff ฯลฯ)
  - [x] verify: `npm run build` ผ่าน + **1003 tests / 52 suites ผ่านทั้งหมด**

---

### Phase 10: Performance Optimization

#### 10.1 Database Optimization
**ความสำคัญ:** ⭐⭐⭐⭐ | **ระยะเวลา:** 1 สัปดาห์

- [ ] วิเคราะห์ Query ที่ช้าด้วย MySQL EXPLAIN
- [ ] เพิ่ม Database Index ที่จำเป็น
- [ ] เพิ่ม Query Caching (Redis)
- [ ] Optimize N+1 Query problems

**Index ที่แนะนำเพิ่ม:**
```sql
-- ตัวอย่าง indexes ที่ควรเพิ่ม
CREATE INDEX idx_project_sc_id_sy_id ON pln_proj_approve(sc_id, sy_id);
CREATE INDEX idx_receive_sc_id_year ON pln_receive(sc_id, budget_year);
CREATE INDEX idx_student_sy_id ON tb_student(sy_id, budget_year);
```

#### 10.2 API Response Optimization
**ความสำคัญ:** ⭐⭐⭐ | **ระยะเวลา:** 3-5 วัน

- [ ] เพิ่ม Response Compression (gzip)
- [ ] เพิ่ม API Response Caching
- [ ] Implement Lazy Loading ใน Frontend

---

### Phase 11: Production Deployment

#### 11.1 Deployment Setup
**ความสำคัญ:** ⭐⭐⭐⭐⭐ | **ระยะเวลา:** 1 สัปดาห์

**ตัวเลือก Deployment:**

| Option | Cost | Complexity | Recommended For |
|--------|------|------------|-----------------|
| VPS (DigitalOcean/Vultr) | $5-20/เดือน | Medium | Production |
| Docker + Docker Compose | - | Medium | ทุก environment |
| Kubernetes | $$$ | High | Enterprise |
| Serverless (AWS Lambda) | Variable | High | Scalability |

**งานที่ต้องทำ:**
- [ ] สร้าง Dockerfile สำหรับ Backend
- [ ] สร้าง Dockerfile สำหรับ Frontend
- [ ] สร้าง docker-compose.yml
- [ ] ตั้งค่า Nginx reverse proxy
- [ ] ตั้งค่า SSL/HTTPS (Let's Encrypt)
- [ ] ตั้งค่า CI/CD (GitHub Actions)

**ตัวอย่าง Dockerfile (Backend):**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

**ตัวอย่าง docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=sfmisystem
    depends_on:
      - mysql

  frontend:
    build: .
    ports:
      - "4200:80"
    depends_on:
      - backend

  mysql:
    image: mysql:8.0
    volumes:
      - mysql_data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=secret
      - MYSQL_DATABASE=sfmisystem

volumes:
  mysql_data:
```

#### 11.2 Monitoring & Logging
**ความสำคัญ:** ⭐⭐⭐⭐ | **ระยะเวลา:** 3-5 วัน

- [ ] ตั้งค่า Application Logging (Winston)
- [ ] ตั้งค่า Error Tracking (Sentry)
- [ ] ตั้งค่า Performance Monitoring
- [ ] ตั้งค่า Health Check endpoints
- [ ] ตั้งค่า Database Backup Automation

---

### Phase 12: Feature Enhancement (Optional)

#### 12.1 UI/UX Improvements
**ความสำคัญ:** ⭐⭐⭐ | **ระยะเวลา:** ตามความต้องการ

- [ ] ปรับ Responsive Design สำหรับ Mobile
- [ ] เพิ่ม Dark Mode
- [ ] ปรับปรุง Loading States / Skeleton
- [ ] เพิ่ม Better Error Messages
- [ ] เพิ่ม Tooltips และ Help texts

#### 12.2 New Features
**ความสำคัญ:** ⭐⭐ | **ระยะเวลา:** ตามความต้องการ

- [ ] ระบบ Notification (In-app + Email)
- [ ] ระบบ Export PDF/Excel สำหรับรายงาน
- [ ] ระบบ Audit Log (บันทึกทุกการเปลี่ยนแปลง)
- [ ] ระบบ Dashboard แบบ Real-time
- [ ] API Documentation (Swagger/OpenAPI)

#### 12.3 Mobile App (Future)
**ความสำคัญ:** ⭐ | **ระยะเวลา:** 2-3 เดือน

- [ ] พัฒนา Mobile App (React Native / Flutter)
- [ ] สร้าง API สำหรับ Mobile

---

## 📋 Recommended Priority Order (งานที่เหลือ มิ.ย. 2569)

| ลำดับ | Phase | งาน | ความสำคัญ |
|-------|-------|-----|-----------|
| 1 | 8.2 | E2E Tests ครอบ flow การเงิน/พัสดุ/เงินยืม | ⭐⭐⭐⭐ |
| 2 | 8.1 | ขยาย backend unit test ให้ coverage ≥ 80% | ⭐⭐⭐⭐ |
| 3 | 9.1 | Audit multi-tenant scoping ให้ครบทุก endpoint | ⭐⭐⭐⭐ |
| 4 | 9.2 | อัปเกรด security deps (next, next-auth, xlsx) | ⭐⭐⭐ |
| 5 | 8.3 | Frontend unit tests (Vitest) | ⭐⭐⭐ |
| 6 | 10.1 | Database/Query optimization + Redis cache | ⭐⭐⭐ |
| 7 | 12.2 | New Features (Notification, role-based dashboard) | ⭐⭐ |

> Security & Deploy (JWT/RBAC/Helmet/Throttler/Docker/CI-CD/Sentry) = ✅ เสร็จแล้ว ไม่อยู่ในคิวข้างบน

---

## 🛠️ Quick Start Commands

### รัน Development Environment
```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend (Next.js — พัฒนาหลัก)
cd frontend
npm run dev
```

### รัน Tests (หลังจากสร้าง)
```bash
# Unit Tests
cd backend
npm run test

# E2E Tests
npm run test:e2e

# Test Coverage
npm run test:cov
```

### Build for Production
```bash
# Backend
cd backend
npm run build

# Frontend (Next.js)
cd frontend
npm run build
```

---

## 📚 เอกสารที่เกี่ยวข้อง

| ไฟล์ | คำอธิบาย |
|------|----------|
| `context.md` | บริบทระบบและ Data Flow |
| `plan.md` | แผนการพัฒนาและสถานะ |
| `tasks.md` | รายการงานย่อยและสถานะ |
| `backend/BACKEND_ARCHITECTURE.md` | สถาปัตยกรรม Backend |
| `backend/CREATE_MODULES_GUIDE.md` | คู่มือสร้าง Module ใหม่ |
| `backend/README.md` | คู่มือ Backend |

---

## 💡 Tips สำหรับการพัฒนาต่อ

1. **เริ่มจาก Security** - JWT Auth ควรทำก่อน Deploy production
2. **Tests ช่วยประหยัดเวลา** - ลงทุนเขียน Tests ตอนนี้ ประหยัดเวลา debug ในอนาคต
3. **Docker ทำให้ Deploy ง่าย** - ใช้ Container ช่วยให้ environment consistent
4. **Monitor ก่อน Production** - ตั้งค่า logging ให้พร้อมก่อน go-live
5. **Backup สำคัญมาก** - ตั้งค่า automated backup ก่อน production

---

**อัปเดตล่าสุด:** 5 มิถุนายน 2569 (ปรับให้ตรงสถานะ repo จริง — แก้ข้อมูลสถานะ 0% ที่ล้าสมัย)
