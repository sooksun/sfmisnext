import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { FinancialAuditLog } from './entities/financial-audit-log.entity';
import { Admin } from '../admin/entities/admin.entity';
import { ReportDailyBalanceService } from '../report-daily-balance/report-daily-balance.service';
import {
  FINANCE_TYPES,
  COMMITTEE_TYPES,
  DIRECTOR_TYPES,
} from '../auth/roles.decorator';

/** admin.type ที่อนุญาตต่อ signer_role */
const ALLOWED_TYPES_BY_ROLE: Record<number, readonly number[]> = {
  1: FINANCE_TYPES,
  2: COMMITTEE_TYPES,
  3: DIRECTOR_TYPES,
};

@Injectable()
export class FinancialAuditService {
  constructor(
    @InjectRepository(FinancialAuditLog)
    private readonly auditLogRepository: Repository<FinancialAuditLog>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly reportDailyBalanceService: ReportDailyBalanceService,
  ) {}

  /** สร้าง snapshot JSON + SHA-256 hash สำหรับการลงนามรายวัน */
  private async buildDailySnapshot(scId: number, syId: number, date: string) {
    const summary = await this.reportDailyBalanceService.loadDailyBalance(
      scId,
      date,
      syId,
    );
    const snapshot = {
      sc_id: scId,
      sy_id: syId,
      date,
      rows: summary,
      signed_at: new Date().toISOString(),
    };
    const json = JSON.stringify(snapshot);
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    return { json, hash };
  }

  // ── รายวัน (Multi-signature) ─────────────────────────────────────────────
  // ระเบียบ กค. 2562:
  //   role=1 เจ้าหน้าที่การเงิน ลงนามก่อน (ผู้จัดทำ)
  //   role=2 คณะกรรมการตรวจสอบประจำวัน ลงนามถัดมา (ผู้ตรวจสอบ)
  //   role=3 ผู้อำนวยการ ลงนามสุดท้าย (ผู้สอบทาน ณ สิ้นเดือน)

  /** ตรวจสถานะการลงนามรายวัน (ทุก role) */
  async loadDailyAuditStatus(scId: number, syId: number, date: string) {
    const logs = await this.auditLogRepository.find({
      where: { scId, syId, auditType: 1, auditDate: date },
      order: { signerRole: 'ASC' },
    });

    const findRole = (role: number) => logs.find((l) => l.signerRole === role);
    const finance = findRole(1);
    const committee = findRole(2);
    const director = findRole(3);
    const signerCount = logs.length;

    // legacy: รองรับ response เก่า
    const first = finance ?? logs[0];

    return {
      date,
      signed: !!finance, // compat: “ลงนามแล้ว” = เจ้าหน้าที่การเงินลงนาม
      fully_signed: !!(finance && committee && director),
      signer_count: signerCount,
      signers: {
        finance: finance ? this.toSignerDto(finance) : null,
        committee: committee ? this.toSignerDto(committee) : null,
        director: director ? this.toSignerDto(director) : null,
      },
      // legacy fields
      signed_by: first?.signedBy ?? null,
      signed_name: first?.signedName ?? null,
      signed_position: first?.signedPosition ?? null,
      signed_at: first?.createDate ?? null,
      note: first?.note ?? null,
      fal_id: first?.falId ?? null,
    };
  }

  private toSignerDto(log: FinancialAuditLog) {
    return {
      fal_id: log.falId,
      signer_role: log.signerRole,
      signed_by: log.signedBy,
      signed_name: log.signedName,
      signed_position: log.signedPosition,
      signed_at: log.createDate,
      note: log.note,
    };
  }

  /** ลงนามรับรองประจำวัน — รองรับ signer_role */
  async signDaily(dto: {
    sc_id: number;
    sy_id: number;
    date: string;
    signed_by: number;
    signed_position?: string;
    note?: string;
    signer_role?: number; // 1=finance (default), 2=committee, 3=director
  }) {
    const role = dto.signer_role ?? 1;
    if (![1, 2, 3].includes(role)) {
      return { flag: false, ms: 'signer_role ต้องเป็น 1, 2, หรือ 3' };
    }

    // ตรวจ role ก่อนหน้าต้องลงนามแล้ว (enforce workflow order)
    if (role >= 2) {
      const prevRole = role - 1;
      const prev = await this.auditLogRepository.findOne({
        where: {
          scId: dto.sc_id,
          syId: dto.sy_id,
          auditType: 1,
          auditDate: dto.date,
          signerRole: prevRole,
        },
      });
      if (!prev) {
        const roleName =
          prevRole === 1 ? 'เจ้าหน้าที่การเงิน' : 'คณะกรรมการตรวจสอบ';
        return { flag: false, ms: `กรุณารอ ${roleName} ลงนามก่อน` };
      }
    }

    // ป้องกัน double-sign ใน role เดียวกัน
    const existing = await this.auditLogRepository.findOne({
      where: {
        scId: dto.sc_id,
        syId: dto.sy_id,
        auditType: 1,
        auditDate: dto.date,
        signerRole: role,
      },
    });
    if (existing) {
      const roleName =
        role === 1
          ? 'เจ้าหน้าที่การเงิน'
          : role === 2
            ? 'คณะกรรมการตรวจสอบ'
            : 'ผู้อำนวยการ';
      return { flag: false, ms: `${roleName} ได้ลงนามรายวันนี้แล้ว` };
    }

    const admin = await this.adminRepository.findOne({
      where: { adminId: dto.signed_by, del: 0 },
    });

    // ตรวจสิทธิ์ตาม admin.type — committee member / director ต้องมี type ที่ถูกต้อง
    if (admin) {
      const allowed = ALLOWED_TYPES_BY_ROLE[role];
      if (allowed && !allowed.includes(admin.type ?? 0)) {
        const roleNames: Record<number, string> = {
          1: 'เจ้าหน้าที่การเงิน (ประเภท 5 หรือ 8)',
          2: 'คณะกรรมการตรวจสอบ (ประเภท 3–7)',
          3: 'ผู้อำนวยการ (ประเภท 1 หรือ 2)',
        };
        return {
          flag: false,
          ms: `ผู้ใช้นี้ไม่มีสิทธิ์ลงนามในฐานะ${roleNames[role] ?? 'ผู้มีอำนาจ'}`,
        };
      }
    }

    // สร้าง snapshot เฉพาะ role=1 (finance signs first, snapshot lock ณ ตรงนี้)
    // role 2/3 ใช้ snapshot เดิม
    let snapshotJson: string | null = null;
    let snapshotHash: string | null = null;
    if (role === 1) {
      const s = await this.buildDailySnapshot(dto.sc_id, dto.sy_id, dto.date);
      snapshotJson = s.json;
      snapshotHash = s.hash;
    }

    const log = this.auditLogRepository.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      auditType: 1,
      auditDate: dto.date,
      signerRole: role,
      signedBy: dto.signed_by,
      signedName: admin?.name ?? null,
      signedPosition: dto.signed_position ?? null,
      note: dto.note ?? null,
      snapshotJson,
      snapshotHash,
    });
    await this.auditLogRepository.save(log);

    const roleName =
      role === 1
        ? 'เจ้าหน้าที่การเงิน'
        : role === 2
          ? 'คณะกรรมการ'
          : 'ผู้อำนวยการ';
    return {
      flag: true,
      ms: `${roleName}ลงนามเรียบร้อยแล้ว`,
      snapshot_hash: snapshotHash,
      signer_role: role,
    };
  }

  /** ตรวจสอบความถูกต้องของ snapshot (เทียบยอดปัจจุบันกับตอนลงนาม) */
  async verifyDailySnapshot(scId: number, syId: number, date: string) {
    const log = await this.auditLogRepository.findOne({
      where: { scId, syId, auditType: 1, auditDate: date },
    });
    if (!log || !log.snapshotJson) {
      return { flag: false, ms: 'ยังไม่มี snapshot — อาจยังไม่ได้ลงนาม' };
    }

    // ตรวจ integrity ของ snapshot เดิม
    const expectedHash = crypto
      .createHash('sha256')
      .update(log.snapshotJson)
      .digest('hex');
    const snapshotValid = expectedHash === log.snapshotHash;

    // เทียบกับยอดปัจจุบัน
    const current = await this.reportDailyBalanceService.loadDailyBalance(
      scId,
      date,
      syId,
    );
    const currentJson = JSON.stringify({
      sc_id: scId,
      sy_id: syId,
      date,
      rows: current,
      signed_at: JSON.parse(log.snapshotJson).signed_at,
    });
    const matches = currentJson === log.snapshotJson;

    return {
      flag: true,
      snapshot_valid: snapshotValid,
      current_matches_snapshot: matches,
      signed_at: log.createDate,
      signed_by: log.signedName,
      snapshot_hash: log.snapshotHash,
    };
  }

  /**
   * ตรวจว่าวันที่นี้ถูกลงนามแล้วหรือยัง
   * Lock เมื่อ finance (role=1) ลงนามเท่านั้น (snapshot ถูกสร้าง)
   */
  async isDateLocked(scId: number, date: string): Promise<boolean> {
    const log = await this.auditLogRepository.findOne({
      where: { scId, auditType: 1, auditDate: date, signerRole: 1 },
      select: ['falId'],
    });
    return !!log;
  }

  /**
   * ตรวจช่วงวันที่ — ถ้ามีวันไหนในช่วงถูกลงนามแล้ว คืน array ของวัน locked
   */
  async findLockedDatesInRange(scId: number, from: string, to: string) {
    const logs = await this.auditLogRepository
      .createQueryBuilder('fal')
      .where('fal.sc_id = :scId', { scId })
      .andWhere('fal.audit_type = 1')
      .andWhere('fal.audit_date BETWEEN :from AND :to', { from, to })
      .select('fal.audit_date', 'audit_date')
      .getRawMany<{ audit_date: string }>();
    return logs.map((l) => l.audit_date);
  }

  // ── รายเดือน ───────────────────────────────────────────────────────────────

  /** ตรวจสถานะการลงนามรายเดือน */
  async loadMonthlyAuditStatus(scId: number, syId: number, month: string) {
    const log = await this.auditLogRepository.findOne({
      where: { scId, syId, auditType: 2, auditMonth: month },
    });
    return {
      month,
      signed: !!log,
      signed_by: log?.signedBy ?? null,
      signed_name: log?.signedName ?? null,
      signed_position: log?.signedPosition ?? null,
      signed_at: log?.createDate ?? null,
      note: log?.note ?? null,
      fal_id: log?.falId ?? null,
    };
  }

  /** ลงนามรับรองประจำเดือน (ผู้อำนวยการ) */
  async signMonthly(dto: {
    sc_id: number;
    sy_id: number;
    month: string; // YYYY-MM
    signed_by: number;
    signed_position?: string;
    note?: string;
  }) {
    const existing = await this.auditLogRepository.findOne({
      where: {
        scId: dto.sc_id,
        syId: dto.sy_id,
        auditType: 2,
        auditMonth: dto.month,
      },
    });
    if (existing) return { flag: false, ms: 'ลงนามรายเดือนนี้แล้ว' };

    const admin = await this.adminRepository.findOne({
      where: { adminId: dto.signed_by, del: 0 },
    });

    const log = this.auditLogRepository.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      auditType: 2,
      auditMonth: dto.month,
      signedBy: dto.signed_by,
      signedName: admin?.name ?? null,
      signedPosition: dto.signed_position ?? null,
      note: dto.note ?? null,
    });
    await this.auditLogRepository.save(log);
    return { flag: true, ms: 'ผู้อำนวยการลงนามรายเดือนเรียบร้อยแล้ว' };
  }

  // ── ประวัติรวม ─────────────────────────────────────────────────────────────

  /** โหลดประวัติการลงนามทั้งหมดของปี */
  async loadAuditHistory(scId: number, syId: number) {
    const logs = await this.auditLogRepository.find({
      where: { scId, syId },
      order: { createDate: 'DESC' },
    });
    return logs.map((l) => ({
      fal_id: l.falId,
      audit_type: l.auditType,
      audit_date: l.auditDate,
      audit_month: l.auditMonth,
      signed_by: l.signedBy,
      signed_name: l.signedName ?? '',
      signed_position: l.signedPosition ?? '',
      note: l.note ?? '',
      signed_at: l.createDate,
    }));
  }

  /** โหลดสรุปรายเดือน: จำนวนวันที่ลงนามแล้ว vs ยังไม่ลงนาม */
  async loadMonthSummary(scId: number, syId: number, month: string) {
    // นับวันที่ทำงานในเดือน (1-31) ที่มี transaction
    const dailySigned = await this.auditLogRepository
      .createQueryBuilder('fal')
      .where('fal.sc_id = :scId', { scId })
      .andWhere('fal.sy_id = :syId', { syId })
      .andWhere('fal.audit_type = 1')
      .andWhere('fal.audit_date LIKE :month', { month: `${month}%` })
      .select('fal.audit_date', 'audit_date')
      .addSelect('fal.signed_name', 'signed_name')
      .addSelect('fal.create_date', 'signed_at')
      .getRawMany<{
        audit_date: string;
        signed_name: string;
        signed_at: Date;
      }>();

    const monthly = await this.auditLogRepository.findOne({
      where: { scId, syId, auditType: 2, auditMonth: month },
    });

    return {
      month,
      daily_signed_count: dailySigned.length,
      daily_signed_dates: dailySigned,
      monthly_signed: !!monthly,
      monthly_signed_name: monthly?.signedName ?? null,
      monthly_signed_position: monthly?.signedPosition ?? null,
      monthly_signed_at: monthly?.createDate ?? null,
    };
  }
}
