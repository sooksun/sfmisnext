import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { Admin } from './entities/admin.entity';
import { MasterLevel } from './entities/master-level.entity';

const md5 = (str: string) => crypto.createHash('md5').update(str).digest('hex');

function createMockAdmin(overrides: Partial<Admin> = {}): Admin {
  return {
    adminId: 1,
    name: 'Test Admin',
    username: 'testadmin',
    email: 'test@example.com',
    password: md5('password123'),
    passwordDefault: 'password123',
    del: 0,
    scId: 1,
    type: 1,
    position: 1,
    codeLogin: 'abc123',
    upBy: 1,
    creDate: new Date('2024-01-01'),
    upDate: new Date('2024-01-01'),
    ...overrides,
  } as Admin;
}

describe('AdminService', () => {
  let service: AdminService;
  let adminRepo: any;
  let masterLevelRepo: any;
  let jwtService: any;

  beforeEach(async () => {
    adminRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((data) => ({ ...data }) as Admin),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    masterLevelRepo = {
      find: jest.fn(),
    };

    jwtService = {
      sign: jest.fn(() => 'mock.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: getRepositoryToken(MasterLevel), useValue: masterLevelRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('login', () => {
    it('should return success with admin data on valid credentials', async () => {
      const admin = createMockAdmin();
      adminRepo.findOne.mockResolvedValue(admin);

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(result).toHaveProperty('flag', 'success');
      expect(result).toHaveProperty('data');
      expect((result as any).data.admin_id).toBe(1);
    });

    it('should include access_token in successful login', async () => {
      const admin = createMockAdmin();
      adminRepo.findOne.mockResolvedValue(admin);

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(result).toHaveProperty('access_token', 'mock.jwt.token');
    });

    it('should return error when user not found', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      const result = await service.login({ email: 'nonexistent@test.com', password: 'pass' });

      expect(result).toEqual({ flag: 'error', error: 'ไม่พบบัญชีผู้ใช้' });
    });

    it('should return error on wrong password', async () => {
      const admin = createMockAdmin();
      adminRepo.findOne.mockResolvedValue(admin);

      const result = await service.login({ email: 'test@example.com', password: 'wrongpassword' });

      expect(result).toEqual({ flag: 'error', error: 'รหัสผ่านไม่ถูกต้อง' });
    });

    it('should query with both email and username fields', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      await service.login({ email: 'admin', password: 'pass' });

      expect(adminRepo.findOne).toHaveBeenCalledWith({
        where: [
          { email: 'admin', del: 0 },
          { username: 'admin', del: 0 },
        ],
      });
    });

    it('should filter out soft-deleted admins', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      await service.login({ email: 'test@example.com', password: 'pass' });

      const whereClause = adminRepo.findOne.mock.calls[0][0].where;
      expect(whereClause[0]).toHaveProperty('del', 0);
      expect(whereClause[1]).toHaveProperty('del', 0);
    });

    it('should auto-migrate MD5 password to bcrypt on successful login', async () => {
      const admin = createMockAdmin({ password: md5('password123') });
      adminRepo.findOne.mockResolvedValue(admin);

      await service.login({ email: 'test@example.com', password: 'password123' });

      // password should be rehashed with bcrypt
      expect(admin.password).toMatch(/^\$2/);
      expect(await bcrypt.compare('password123', admin.password!)).toBe(true);
    });

    it('should accept bcrypt password directly', async () => {
      const bcryptHash = await bcrypt.hash('password123', 10);
      const admin = createMockAdmin({ password: bcryptHash });
      adminRepo.findOne.mockResolvedValue(admin);

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(result).toHaveProperty('flag', 'success');
    });
  });

  describe('loadAdmins', () => {
    it('should return paginated results with correct structure', async () => {
      const admins = [createMockAdmin(), createMockAdmin({ adminId: 2, name: 'Admin 2' })];
      adminRepo.findAndCount.mockResolvedValue([admins, 2]);

      const result = await service.loadAdmins(0, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('count', 2);
      expect(result).toHaveProperty('page', 0);
      expect(result).toHaveProperty('pageSize', 10);
      expect(result.data).toHaveLength(2);
    });

    it('should only return non-deleted admins', async () => {
      adminRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.loadAdmins(0, 10);

      expect(adminRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { del: 0 },
        }),
      );
    });

    it('should apply correct pagination offset', async () => {
      adminRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.loadAdmins(2, 5);

      expect(adminRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        }),
      );
    });
  });

  describe('loadUsersBySchool', () => {
    it('should filter by school ID', async () => {
      adminRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.loadUsersBySchool(42, 0, 10);

      expect(adminRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { del: 0, scId: 42 },
        }),
      );
    });
  });

  describe('addAdmin', () => {
    it('should return error if username or email already exists', async () => {
      adminRepo.findOne.mockResolvedValue(createMockAdmin());

      const result = await service.addAdmin({
        name: 'New',
        email: 'test@example.com',
      } as any);

      expect(result).toEqual({ flag: false, ms: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว' });
    });

    it('should hash password with bcrypt (not MD5)', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      await service.addAdmin({
        name: 'New',
        email: 'new@test.com',
        password: 'secret',
      } as any);

      const createCall = adminRepo.create.mock.calls[0][0] as any;
      // bcrypt hash starts with $2
      expect(createCall.password).toMatch(/^\$2/);
      expect(await bcrypt.compare('secret', createCall.password)).toBe(true);
      // MD5 should NOT be used
      expect(createCall.password).not.toBe(md5('secret'));
    });

    it('should use default password 123456 when none provided and hash with bcrypt', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      await service.addAdmin({ name: 'New', email: 'new@test.com' } as any);

      const createCall = adminRepo.create.mock.calls[0][0] as any;
      expect(createCall.password).toMatch(/^\$2/);
      expect(await bcrypt.compare('123456', createCall.password)).toBe(true);
      // ✅ passwordDefault should NOT be stored as plaintext
      expect(createCall.passwordDefault).toBeUndefined();
    });

    it('should generate username from email prefix', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      await service.addAdmin({ name: 'New', email: 'john@school.th' } as any);

      const createCall = adminRepo.create.mock.calls[0][0] as any;
      expect(createCall.username).toBe('john');
    });

    it('should extract base64 from data URL for profile', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      await service.addAdmin({
        name: 'New',
        email: 'new@test.com',
        profile: 'data:image/png;base64,abc123data',
      } as any);

      const createCall = adminRepo.create.mock.calls[0][0] as any;
      expect(createCall.avata).toBe('abc123data');
    });

    it('should handle FilePayload object for profile', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      await service.addAdmin({
        name: 'New',
        email: 'new@test.com',
        profile: { valid: true, data: 'imgdata' },
      } as any);

      const createCall = adminRepo.create.mock.calls[0][0] as any;
      expect(createCall.avata).toBe('imgdata');
    });

    it('should return success on successful save', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      const result = await service.addAdmin({ name: 'New', email: 'new@test.com' } as any);

      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
    });

    it('should return error if save fails', async () => {
      adminRepo.findOne.mockResolvedValue(null);
      adminRepo.save.mockRejectedValue(new Error('DB error'));

      const result = await service.addAdmin({ name: 'New', email: 'new@test.com' } as any);

      expect(result).toEqual({ flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    });
  });

  describe('removeAdmin', () => {
    it('should return "1" on success', async () => {
      adminRepo.findOne.mockResolvedValue(createMockAdmin());

      const result = await service.removeAdmin({ admin_id: 1, del: 1 } as any);

      expect(result).toBe('1');
    });

    it('should return "0" when admin not found', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      const result = await service.removeAdmin({ admin_id: 999, del: 1 } as any);

      expect(result).toBe('0');
    });

    it('should not find soft-deleted admins', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      await service.removeAdmin({ admin_id: 1, del: 1 } as any);

      expect(adminRepo.findOne).toHaveBeenCalledWith({
        where: { adminId: 1, del: 0 },
      });
    });

    it('should set del field from payload', async () => {
      const admin = createMockAdmin();
      adminRepo.findOne.mockResolvedValue(admin);

      await service.removeAdmin({ admin_id: 1, del: 1 } as any);

      expect(adminRepo.save).toHaveBeenCalledWith(expect.objectContaining({ del: 1 }));
    });
  });

  describe('updateAdmin', () => {
    it('should return error when admin_id is missing', async () => {
      const result = await service.updateAdmin({} as any);

      expect(result).toEqual({ flag: false, ms: 'ไม่พบ admin_id' });
    });

    it('should return error when admin not found', async () => {
      adminRepo.findOne.mockResolvedValue(null);

      const result = await service.updateAdmin({ admin_id: 999 } as any);

      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลผู้ใช้' });
    });

    it('should only update fields that are provided', async () => {
      const admin = createMockAdmin();
      adminRepo.findOne.mockResolvedValue(admin);

      await service.updateAdmin({ admin_id: 1, name: 'Updated Name' } as any);

      expect(admin.name).toBe('Updated Name');
      expect(admin.email).toBe('test@example.com'); // unchanged
    });

    it('should hash new password with bcrypt (not MD5)', async () => {
      const admin = createMockAdmin();
      adminRepo.findOne.mockResolvedValue(admin);

      await service.updateAdmin({ admin_id: 1, password: 'newpass' } as any);

      expect(admin.password).toMatch(/^\$2/);
      expect(await bcrypt.compare('newpass', admin.password!)).toBe(true);
      expect(admin.password).not.toBe(md5('newpass'));
    });

    it('should return success on successful update', async () => {
      adminRepo.findOne.mockResolvedValue(createMockAdmin());

      const result = await service.updateAdmin({ admin_id: 1, name: 'Updated' } as any);

      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
    });
  });

  describe('loadPosition', () => {
    it('should return formatted positions', async () => {
      masterLevelRepo.find.mockResolvedValue([
        { levId: 1, level: 'Level 1', position: 'Teacher' } as MasterLevel,
      ]);

      const result = await service.loadPosition();

      expect(result).toEqual([{ lev_id: 1, level: 'Level 1', position: 'Teacher' }]);
    });
  });

  describe('toResponse (via login)', () => {
    it('should format avata as full/thumb object', async () => {
      const admin = createMockAdmin({ avata: 'img_data' });
      adminRepo.findOne.mockResolvedValue(admin);

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect((result as any).data.avata).toEqual({ full: 'img_data', thumb: 'img_data' });
    });

    it('should return null avata when not set', async () => {
      const admin = createMockAdmin({ avata: undefined });
      adminRepo.findOne.mockResolvedValue(admin);

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect((result as any).data.avata).toBeNull();
    });

    it('should not include password in response', async () => {
      const admin = createMockAdmin();
      adminRepo.findOne.mockResolvedValue(admin);

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect((result as any).data).not.toHaveProperty('password');
      expect((result as any).data).not.toHaveProperty('password_default');
      expect((result as any).data).not.toHaveProperty('passwordDefault');
    });
  });
});
