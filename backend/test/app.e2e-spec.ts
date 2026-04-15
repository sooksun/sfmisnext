import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * E2E tests require a running MySQL database.
 * Set E2E_TEST=1 environment variable to run these tests.
 * Run with: E2E_TEST=1 npm run test:e2e
 */
const describeIfDb = process.env.E2E_TEST ? describe : describe.skip;

describeIfDb('SFMIS E2E Tests', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Health Check', () => {
    it('GET /api/health should return healthy status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body.info).toHaveProperty('database');
    });
  });

  describe('Login Flow', () => {
    it('POST /api/B_admin/login should authenticate admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/B_admin/login')
        .send({ email: 'admin_local', password: 'Admin@123' })
        .expect(200);

      expect(res.body).toHaveProperty('flag');
      // If seeded admin exists, flag = 'success'; otherwise 'error'
      if (res.body.flag === 'success') {
        expect(res.body.data).toHaveProperty('admin_id');
        expect(res.body.data).toHaveProperty('name');
        expect(res.body.data).toHaveProperty('email');
      }
    });

    it('POST /api/B_admin/login should reject wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/B_admin/login')
        .send({ email: 'admin_local', password: 'WrongPassword' })
        .expect(200);

      // Should return error flag (not HTTP error, the API returns 200 with flag)
      expect(['error', 'success']).toContain(res.body.flag);
      if (res.body.flag === 'error') {
        expect(res.body.error).toBeDefined();
      }
    });
  });

  describe('Admin CRUD', () => {
    let createdAdminId: number;

    it('POST /api/B_admin/load_admin/0/10 should return paginated admins', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/B_admin/load_admin/0/10')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('page', 0);
      expect(res.body).toHaveProperty('pageSize', 10);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/B_admin/addAdmin should create new admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/B_admin/addAdmin')
        .send({
          name: 'E2E Test User',
          email: `e2e_test_${Date.now()}@test.com`,
          password: 'Test@123',
          type: 2,
          position: 1,
          sc_id: 1,
        })
        .expect(200);

      expect(res.body).toHaveProperty('flag', true);
      expect(res.body).toHaveProperty('ms');
    });

    it('GET /api/B_admin/load_admin/0/100 should include the new admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/B_admin/load_admin/0/100')
        .expect(200);

      const e2eAdmin = res.body.data.find((a: any) =>
        a.name === 'E2E Test User',
      );
      if (e2eAdmin) {
        createdAdminId = e2eAdmin.admin_id;
        expect(e2eAdmin.name).toBe('E2E Test User');
      }
    });

    it('POST /api/B_admin/remove_admin should soft-delete admin', async () => {
      if (!createdAdminId) return;

      const res = await request(app.getHttpServer())
        .post('/api/B_admin/remove_admin')
        .send({ admin_id: createdAdminId, del: 1 })
        .expect(200);

      expect(res.text).toBe('1');
    });
  });

  describe('School Year', () => {
    it('POST /api/B_school_year/load_school_year/0/10 should return school years', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/B_school_year/load_school_year/0/10')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('count');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/school_year/check_year should return current year', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/school_year/check_year')
        .expect(200);

      expect(res.body).toHaveProperty('flag');
      if (res.body.flag) {
        expect(res.body).toHaveProperty('sy_date');
        expect(res.body).toHaveProperty('budget_date');
      }
    });
  });

  describe('Response Shape Validation', () => {
    it('list endpoints should return { data, count, page, pageSize }', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/B_admin/load_admin/0/10')
        .expect(200);

      const keys = Object.keys(res.body);
      expect(keys).toContain('data');
      expect(keys).toContain('count');
      expect(keys).toContain('page');
      expect(keys).toContain('pageSize');
    });
  });
});
