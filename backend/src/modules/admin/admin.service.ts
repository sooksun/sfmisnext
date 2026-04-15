import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { AddAdminDto } from './dto/add-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto';
import { Admin } from './entities/admin.entity';
import { MasterLevel } from './entities/master-level.entity';
import type { JwtPayload } from '../auth/jwt.strategy';

const BCRYPT_ROUNDS = 12;

interface FilePayload {
  valid: boolean;
  data: string;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(MasterLevel)
    private readonly masterLevelRepository: Repository<MasterLevel>,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    const admin = await this.adminRepository.findOne({
      where: [
        { email: payload.email, del: 0 },
        { username: payload.email, del: 0 },
      ],
    });

    if (!admin) {
      return { flag: 'error', error: 'ไม่พบบัญชีผู้ใช้' };
    }

    const passwordMatch = await this.verifyPassword(payload.password, admin);
    if (!passwordMatch) {
      return { flag: 'error', error: 'รหัสผ่านไม่ถูกต้อง' };
    }

    // อัปเดต last_login
    admin.lastLogin = new Date();
    await this.adminRepository.save(admin);

    // ออก JWT token
    const jwtPayload: JwtPayload = {
      sub: admin.adminId,
      username: admin.username ?? '',
      sc_id: admin.scId ?? 0,
      type: admin.type ?? 0,
    };
    const access_token = this.jwtService.sign(jwtPayload);

    return {
      flag: 'success',
      data: this.toResponse(admin),
      access_token,
    };
  }

  /**
   * ตรวจสอบรหัสผ่านพร้อม migration path:
   * 1. ลอง bcrypt ก่อน (password ที่เพิ่งเปลี่ยน)
   * 2. ถ้าไม่ match → ลอง MD5 (password เก่า)
   * 3. ถ้า MD5 match → rehash ด้วย bcrypt แล้ว update DB (auto-migration)
   */
  private async verifyPassword(plain: string, admin: Admin): Promise<boolean> {
    if (!admin.password) return false;

    // ลอง bcrypt ก่อน
    const isBcrypt = admin.password.startsWith('$2');
    if (isBcrypt) {
      return bcrypt.compare(plain, admin.password);
    }

    // MD5 fallback (legacy)
    const md5 = crypto.createHash('md5').update(plain).digest('hex');
    if (md5 !== admin.password) return false;

    // auto-migrate: rehash ด้วย bcrypt แล้วบันทึก
    admin.password = await bcrypt.hash(plain, BCRYPT_ROUNDS);
    admin.passwordDefault = undefined; // ลบ plaintext ระหว่าง migrate
    await this.adminRepository.save(admin);
    return true;
  }

  async loadAdmins(page: number, pageSize: number) {
    const [items, count] = await this.adminRepository.findAndCount({
      where: { del: 0 },
      order: { adminId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((admin) => this.toResponse(admin)),
      count,
      page,
      pageSize,
    };
  }

  async loadUsersBySchool(scId: number, page: number, pageSize: number) {
    const [items, count] = await this.adminRepository.findAndCount({
      where: { del: 0, scId },
      order: { adminId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((admin) => this.toResponse(admin)),
      count,
      page,
      pageSize,
    };
  }

  async addAdmin(payload: AddAdminDto) {
    const username =
      payload.username || payload.email?.split('@')[0] || `user_${Date.now()}`;

    const existing = await this.adminRepository.findOne({
      where: [
        { username: username, del: 0 },
        { email: payload.email, del: 0 },
      ],
    });

    if (existing) {
      return { flag: false, ms: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว' };
    }

    // ดึง profile/license base64
    let profileData: string | undefined = undefined;
    if (payload.profile) {
      if (typeof payload.profile === 'object') {
        const fp = payload.profile as unknown as FilePayload;
        if (fp.valid && fp.data) profileData = fp.data;
      } else if (typeof payload.profile === 'string') {
        const m = payload.profile.match(/^data:[^;]+;base64,(.+)$/);
        profileData = m ? m[1] : payload.profile;
      }
    }

    let licenseData: string | undefined = undefined;
    if (payload.license) {
      if (typeof payload.license === 'object') {
        const fp = payload.license as unknown as FilePayload;
        if (fp.valid && fp.data) licenseData = fp.data;
      } else if (typeof payload.license === 'string') {
        const m = payload.license.match(/^data:[^;]+;base64,(.+)$/);
        licenseData = m ? m[1] : payload.license;
      }
    }

    const passwordPlain = payload.password || payload.password_default || '123456';
    // ✅ bcrypt แทน MD5
    const passwordHash = await bcrypt.hash(passwordPlain, BCRYPT_ROUNDS);
    const codeLogin = crypto.randomBytes(10).toString('hex');

    const admin = this.adminRepository.create({
      name: payload.name,
      username: username,
      email: payload.email,
      password: passwordHash,
      // ✅ ไม่เก็บ passwordDefault เป็น plaintext อีกต่อไป
      codeLogin: codeLogin,
      avata: profileData,
      license: licenseData,
      type: payload.type,
      position: payload.position,
      scId: payload.sc_id,
      upBy: payload.up_by || 1,
      del: 0,
      creDate: new Date(),
      upDate: new Date(),
    });

    try {
      await this.adminRepository.save(admin);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('Add admin error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async removeAdmin(payload: UpdateAdminStatusDto) {
    const admin = await this.adminRepository.findOne({
      where: { adminId: payload.admin_id, del: 0 },
    });

    if (!admin) {
      return '0';
    }

    admin.del = payload.del;
    admin.upBy = payload.up_by ?? admin.upBy;
    await this.adminRepository.save(admin);
    return '1';
  }

  async updateAdmin(payload: UpdateAdminDto) {
    if (!payload.admin_id) {
      return { flag: false, ms: 'ไม่พบ admin_id' };
    }

    const admin = await this.adminRepository.findOne({
      where: { adminId: payload.admin_id, del: 0 },
    });

    if (!admin) {
      return { flag: false, ms: 'ไม่พบข้อมูลผู้ใช้' };
    }

    if (payload.name !== undefined) admin.name = payload.name;
    if (payload.username !== undefined) admin.username = payload.username;
    if (payload.email !== undefined) admin.email = payload.email;

    if (payload.password !== undefined) {
      // ✅ bcrypt แทน MD5
      admin.password = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);
    }
    // ✅ ไม่อัปเดต password_default เป็น plaintext อีกต่อไป

    if (payload.profile !== undefined) {
      admin.avata = payload.profile || undefined;
    } else if (payload.avata !== undefined) {
      admin.avata = payload.avata || undefined;
    }
    if (payload.license !== undefined) {
      admin.license = payload.license || undefined;
    }
    if (payload.type !== undefined) admin.type = payload.type;
    if (payload.position !== undefined) admin.position = payload.position;
    if (payload.sc_id !== undefined) admin.scId = payload.sc_id;
    if (payload.up_by !== undefined) admin.upBy = payload.up_by;
    if (payload.del !== undefined) admin.del = payload.del;

    admin.upDate = new Date();

    try {
      await this.adminRepository.save(admin);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('Update admin error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async loadPosition() {
    const positions = await this.masterLevelRepository.find({
      order: { levId: 'ASC' },
    });

    return positions.map((pos) => ({
      lev_id: pos.levId,
      level: pos.level,
      position: pos.position,
    }));
  }

  private toResponse(admin: Admin) {
    let avataFormatted: { full: string; thumb: string } | null = null;
    if (admin.avata) {
      avataFormatted = { full: admin.avata, thumb: admin.avata };
    }

    let licenseFormatted: { full: string; thumb: string } | null = null;
    if (admin.license) {
      licenseFormatted = { full: admin.license, thumb: admin.license };
    }

    return {
      id: admin.adminId,
      admin_id: admin.adminId,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      type: admin.type,
      position: admin.position,
      sc_id: admin.scId,
      avata: avataFormatted,
      license: licenseFormatted,
      code_login: admin.codeLogin,
      last_login: admin.lastLogin,
      up_by: admin.upBy,
      up_date: admin.upDate,
      del: admin.del,
      cre_date: admin.creDate,
      // ✅ ไม่มี password / password_default ใน response
    };
  }
}
