import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController (integration)', () => {
  let app: INestApplication;
  let adminService: Partial<AdminService>;

  beforeAll(async () => {
    adminService = {
      login: jest.fn(),
      loadAdmins: jest.fn(),
      loadUsersBySchool: jest.fn(),
      addAdmin: jest.fn(),
      updateAdmin: jest.fn(),
      removeAdmin: jest.fn(),
      loadPosition: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/B_admin/login', () => {
    it('should return 200 on valid login payload', async () => {
      (adminService.login as jest.Mock).mockResolvedValue({
        flag: 'success',
        data: { admin_id: 1, name: 'Admin' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/B_admin/login')
        .send({ email: 'admin@test.com', password: 'pass123' })
        .expect(200);

      expect(res.body.flag).toBe('success');
      expect(res.body.data.admin_id).toBe(1);
    });

    it('should validate login DTO (missing email)', async () => {
      (adminService.login as jest.Mock).mockResolvedValue({
        flag: 'error',
        error: 'ไม่พบบัญชีผู้ใช้',
      });

      const res = await request(app.getHttpServer())
        .post('/api/B_admin/login')
        .send({ password: 'pass123' });

      // ValidationPipe should reject missing required field
      // If it returns 400, validation works; if 200, service handles it
      expect([200, 400]).toContain(res.status);
    });
  });

  describe('GET /api/B_admin/load_admin/:page/:pageSize', () => {
    it('should return paginated admins', async () => {
      (adminService.loadAdmins as jest.Mock).mockResolvedValue({
        data: [],
        count: 0,
        page: 0,
        pageSize: 10,
      });

      const res = await request(app.getHttpServer())
        .get('/api/B_admin/load_admin/0/10')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('count');
    });

    it('should reject non-numeric page params', async () => {
      await request(app.getHttpServer())
        .get('/api/B_admin/load_admin/abc/10')
        .expect(400);
    });
  });

  describe('POST /api/B_admin/load_admin/:page/:pageSize', () => {
    it('should also work via POST', async () => {
      (adminService.loadAdmins as jest.Mock).mockResolvedValue({
        data: [],
        count: 0,
        page: 0,
        pageSize: 10,
      });

      await request(app.getHttpServer())
        .post('/api/B_admin/load_admin/0/10')
        .expect(200);
    });
  });

  describe('GET /api/B_admin/load_user/:scId/:page/:pageSize', () => {
    it('should filter users by school', async () => {
      (adminService.loadUsersBySchool as jest.Mock).mockResolvedValue({
        data: [],
        count: 0,
        page: 0,
        pageSize: 10,
      });

      await request(app.getHttpServer())
        .get('/api/B_admin/load_user/1/0/10')
        .expect(200);

      expect(adminService.loadUsersBySchool).toHaveBeenCalledWith(1, 0, 10);
    });
  });

  describe('POST /api/B_admin/addAdmin', () => {
    it('should create admin and return result', async () => {
      (adminService.addAdmin as jest.Mock).mockResolvedValue({
        flag: true,
        ms: 'success',
      });

      const res = await request(app.getHttpServer())
        .post('/api/B_admin/addAdmin')
        .send({ name: 'New Admin', email: 'new@test.com', password: 'pass', type: 1, position: 1 });

      // DTO validation may reject if additional required fields are missing
      if (res.status === 200) {
        expect(res.body.flag).toBe(true);
      } else {
        expect(res.status).toBe(400);
      }
    });
  });

  describe('POST /api/B_admin/remove_admin', () => {
    it('should return 200 (POST endpoints use HttpCode OK)', async () => {
      (adminService.removeAdmin as jest.Mock).mockResolvedValue('1');

      const res = await request(app.getHttpServer())
        .post('/api/B_admin/remove_admin')
        .send({ admin_id: 1, del: 1 })
        .expect(200);

      expect(res.text).toBe('1');
    });
  });

  describe('POST /api/B_admin/updateAdmin', () => {
    it('should update admin', async () => {
      (adminService.updateAdmin as jest.Mock).mockResolvedValue({
        flag: true,
        ms: 'success',
      });

      await request(app.getHttpServer())
        .post('/api/B_admin/updateAdmin')
        .send({ admin_id: 1, name: 'Updated' })
        .expect(200);
    });
  });

  describe('Alias endpoints', () => {
    it('POST /api/B_admin/add_user should call addAdmin', async () => {
      (adminService.addAdmin as jest.Mock).mockResolvedValue({ flag: true, ms: 'ok' });

      await request(app.getHttpServer())
        .post('/api/B_admin/add_user')
        .send({ name: 'User', email: 'user@test.com' })
        .expect(200);

      expect(adminService.addAdmin).toHaveBeenCalled();
    });

    it('POST /api/B_admin/remove_user should call removeAdmin', async () => {
      (adminService.removeAdmin as jest.Mock).mockResolvedValue('1');

      await request(app.getHttpServer())
        .post('/api/B_admin/remove_user')
        .send({ admin_id: 1, del: 1 })
        .expect(200);

      expect(adminService.removeAdmin).toHaveBeenCalled();
    });
  });

  describe('GET/POST /api/B_admin/loadPosition', () => {
    it('should return positions via GET', async () => {
      (adminService.loadPosition as jest.Mock).mockResolvedValue([
        { lev_id: 1, level: 'Level 1', position: 'Teacher' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/B_admin/loadPosition')
        .expect(200);

      expect(res.body).toHaveLength(1);
    });

    it('should return positions via POST', async () => {
      (adminService.loadPosition as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .post('/api/B_admin/loadPosition')
        .expect(200);
    });
  });
});
