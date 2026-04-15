# SFMIS Production Deployment Guide

## Pre-Production Checklist

### Environment
- [ ] `NODE_ENV=production` is set
- [ ] `DB_PASS` is set to a strong password (not empty)
- [ ] `CORS_ORIGIN` is set to production frontend URL
- [ ] `backend/.env` exists with production values
- [ ] `frontend/.env.local` has correct `NEXT_PUBLIC_API_URL`
- [ ] MySQL 8 is running with UTF8MB4 charset

### Database
- [ ] TypeORM `synchronize` is OFF (automatic when NODE_ENV=production)
- [ ] Run `npm run migration:run` (from backend/) to apply migrations
- [ ] Database is seeded: `npm run seed` (creates admin: `admin_local` / `Admin@123`)
- [ ] Change default admin password immediately after first login
- [ ] Database backups are configured

### Build Verification
- [ ] `cd backend && npm run build` — succeeds with no errors
- [ ] `cd frontend && npm run build` — succeeds with no errors
- [ ] `cd backend && npm test` — all tests pass
- [ ] `cd backend && npm run test:e2e` — E2E tests pass (with DB)

### Security
- [ ] Helmet security headers enabled (automatic)
- [ ] CORS restricted to production origin (automatic with CORS_ORIGIN)
- [ ] Login rate limiting active (5 req/min)
- [ ] No `.env` files committed to git
- [ ] SSL/TLS configured on load balancer/reverse proxy

---

## Staging Rollout Procedure

### 1. Build
```bash
# Backend
cd backend
npm ci --omit=dev
npm run build

# Frontend
cd frontend
npm ci
npm run build
```

### 2. Deploy Database Changes
```bash
cd backend
npm run migration:run
```

### 3. Start Services
```bash
# Backend (port 3000)
cd backend
NODE_ENV=production node dist/main.js

# Frontend (port 3001)
cd frontend
npm start
```

### Or with Docker
```bash
docker-compose up -d --build
```

### 4. Verify Health
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","info":{"database":{"status":"up"}},...}
```

---

## Post-Deploy Smoke Tests

Run these checks immediately after deployment:

```bash
BASE=http://localhost:3000/api

# 1. Health check
curl -s $BASE/health | grep '"status":"ok"'

# 2. Login works
curl -s -X POST $BASE/B_admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin_local","password":"Admin@123"}' \
  | grep '"flag":"success"'

# 3. Load admins (pagination)
curl -s $BASE/B_admin/load_admin/0/10 \
  | grep '"count"'

# 4. School year check
curl -s -X POST $BASE/B_school_year/check_year \
  | grep '"flag"'

# 5. Frontend loads
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/sign-in
# Expected: 200
```

---

## Rollback Plan

### Quick Rollback (< 5 minutes)
1. Stop the new deployment
2. Restore previous build artifacts
3. Start the previous version
4. Verify health check passes

### Docker Rollback
```bash
# Stop current
docker-compose down

# Deploy previous version
git checkout <previous-tag>
docker-compose up -d --build
```

### Database Rollback
```bash
cd backend
npm run migration:revert
```

### Rollback Decision Criteria
Rollback immediately if any of these occur:
- Health check fails (`/api/health` returns error)
- Login endpoint returns HTTP 500
- Admin list endpoint fails
- Frontend shows blank page or JavaScript errors
- Error rate exceeds 5% of requests

---

## Architecture Overview

```
                    ┌─────────────┐
                    │   Nginx /   │
                    │ Load Balancer│
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐     ┌─────────▼────────┐
     │   Frontend       │     │    Backend        │
     │   Next.js :3001  │────▶│    NestJS :3000   │
     │   (App Router)   │     │    /api/*         │
     └─────────────────┘     └────────┬──────────┘
                                       │
                              ┌────────▼────────┐
                              │    MySQL 8       │
                              │    :3306         │
                              └─────────────────┘
```

## Key URLs
- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:3000/api`
- Health Check: `http://localhost:3000/api/health`
- Login: POST `http://localhost:3000/api/B_admin/login`

## Known Limitations for Production
1. **MD5 password hashing** — legacy requirement, migration to bcrypt planned
2. **No JWT auth guards** on data endpoints — relies on frontend session management
3. **N+1 queries** in budget service — may be slow with many categories
4. **Base64 images** stored in DB — consider object storage for scale
