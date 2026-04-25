import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { AddAdminDto } from './dto/add-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto';
import { Admin } from './entities/admin.entity';
import { MasterLevel } from './entities/master-level.entity';
import type { JwtPayload } from '../auth/jwt.strategy';
import { DeleteLogService } from '../delete-log/delete-log.service';

const BCRYPT_ROUNDS = 12;
/** จำกัดขนาด Base64 ไม่เกิน 2 MB (≈ 2.67 MB base64-encoded) */
const MAX_BASE64_LENGTH = (2 * 1024 * 1024 * 4) / 3; // ~2.67M chars
const ALLOWED_MIME_PATTERN =
  /^data:(image\/(jpeg|png|gif|webp|svg\+xml)|application\/pdf);base64,/;

interface FilePayload {
  valid: boolean;
  data: string;
}

/**
 * ดึง base64 data จาก payload พร้อม validate ขนาดและ mime type
 * คืน base64 string (ไม่มี data-uri prefix) หรือ undefined ถ้าไม่ผ่าน
 */
function extractBase64(input: unknown): string | undefined {
  if (!input) return undefined;

  let raw: string | undefined;

  if (typeof input === 'object') {
    const fp = input as FilePayload;
    if (fp.valid && fp.data) raw = fp.data;
  } else if (typeof input === 'string') {
    raw = input;
  }

  if (!raw) return undefined;

  // ตรวจ data-uri: ต้องเป็น image หรือ PDF เท่านั้น
  const dataUriMatch = raw.match(/^data:[^;]+;base64,(.+)$/);
  if (dataUriMatch) {
    if (!ALLOWED_MIME_PATTERN.test(raw)) return undefined; // mime ไม่อนุญาต
    raw = dataUriMatch[1];
  }

  // ตรวจขนาด
  if (raw.length > MAX_BASE64_LENGTH) return undefined;

  return raw;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(MasterLevel)
    private readonly masterLevelRepository: Repository<MasterLevel>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly deleteLog: DeleteLogService,
  ) {}

  async login(payload: LoginDto) {
    const admin = await this.adminRepository.findOne({
      where: [
        { email: payload.email, del: 0 },
        { username: payload.email, del: 0 },
      ],
    });

    // ใช้ message เดียวกันสำหรับ "ไม่พบ user" และ "password ผิด"
    // เพื่อกัน user enumeration attack (attacker เดา username ได้จาก response ที่ต่างกัน)
    const INVALID_CREDENTIALS = {
      flag: 'error',
      error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    };

    if (!admin) {
      return INVALID_CREDENTIALS;
    }

    const passwordMatch = await this.verifyPassword(payload.password, admin);
    if (!passwordMatch) {
      return INVALID_CREDENTIALS;
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

    // ดึงชื่อโรงเรียน
    let scName: string | null = null;
    if (admin.scId) {
      try {
        const [school] = await this.dataSource.query(
          'SELECT sc_name FROM school WHERE sc_id = ? AND del = 0 LIMIT 1',
          [admin.scId],
        );
        scName = school?.sc_name ?? null;
      } catch {
        /* ignore */
      }
    }

    return {
      flag: 'success',
      data: { ...this.toResponse(admin), sc_name: scName },
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

    // ดึง profile/license base64 พร้อม validate ขนาดและ mime type
    const profileData = extractBase64(payload.profile);
    const licenseData = extractBase64(payload.license);

    const passwordPlain =
      payload.password ||
      payload.password_default ||
      crypto.randomBytes(12).toString('base64url'); // สุ่ม password แทน hardcode '123456'
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
      this.logger.error('Add admin error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async removeAdmin(payload: UpdateAdminStatusDto & { reason?: string }) {
    const admin = await this.adminRepository.findOne({
      where: { adminId: payload.admin_id, del: 0 },
    });

    if (!admin) {
      return '0';
    }

    const snapshot = { ...admin, password: '[redacted]' };
    admin.del = payload.del;
    admin.upBy = payload.up_by ?? admin.upBy;
    await this.adminRepository.save(admin);
    if (payload.del === 1) {
      await this.deleteLog.log({
        table: 'tb_admin',
        rowId: admin.adminId,
        reason: payload.reason ?? null,
        deletedBy: payload.up_by ?? '',
        scId: admin.scId ?? undefined,
        snapshot,
      });
    }
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
      admin.avata = extractBase64(payload.profile) || undefined;
    } else if (payload.avata !== undefined) {
      admin.avata = extractBase64(payload.avata) || undefined;
    }
    if (payload.license !== undefined) {
      admin.license = extractBase64(payload.license) || undefined;
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
      this.logger.error('Update admin error:', error);
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
