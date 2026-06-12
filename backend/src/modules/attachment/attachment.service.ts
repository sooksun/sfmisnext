import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';
import { DeleteLogService } from '../delete-log/delete-log.service';
import { assertSameSchool, type JwtUser } from '../../common/utils/tenant-guard';

export interface CreateAttachmentMeta {
  scId: number;
  refType: string;
  refId: number;
  fileName: string;
  storedName: string;
  mime: string;
  sizeBytes: number;
  category?: string | null;
  note?: string | null;
  upBy?: number;
}

@Injectable()
export class AttachmentService {
  constructor(
    @InjectRepository(Attachment)
    private readonly repo: Repository<Attachment>,
    private readonly deleteLog: DeleteLogService,
  ) {}

  /** สร้าง URL สำหรับเข้าถึงไฟล์ผ่าน endpoint stream */
  private buildUrl(storedName: string): string {
    return `/api/attachment/file/${storedName}`;
  }

  /** รายการไฟล์แนบ (เฉพาะที่ยังไม่ถูกลบ) ของ ref หนึ่งๆ */
  async list(scId: number, refType: string, refId: number) {
    const rows = await this.repo.find({
      where: { scId, refType, refId, del: 0 },
      order: { attId: 'ASC' },
    });
    const data = rows.map((r) => ({
      att_id: r.attId,
      sc_id: r.scId,
      ref_type: r.refType,
      ref_id: r.refId,
      file_name: r.fileName,
      stored_name: r.storedName,
      mime: r.mime,
      size_bytes: r.sizeBytes,
      category: r.category,
      note: r.note,
      up_by: r.upBy,
      create_date: r.createDate,
      url: this.buildUrl(r.storedName),
    }));
    return { data, count: data.length };
  }

  /** หา attachment จากชื่อไฟล์ที่เก็บ (ใช้ตรวจ tenant ก่อนส่งไฟล์) */
  async findByStoredName(storedName: string) {
    return this.repo.findOne({ where: { storedName, del: 0 } });
  }

  /** บันทึก metadata ไฟล์ที่อัปโหลดแล้ว */
  async create(meta: CreateAttachmentMeta) {
    const row = this.repo.create({
      scId: meta.scId,
      refType: meta.refType,
      refId: meta.refId,
      fileName: meta.fileName,
      storedName: meta.storedName,
      mime: meta.mime,
      sizeBytes: meta.sizeBytes,
      category: meta.category ?? null,
      note: meta.note ?? null,
      upBy: meta.upBy ?? 0,
      del: 0,
    });
    const saved = await this.repo.save(row);
    return { flag: true, ms: 'อัปโหลดไฟล์เรียบร้อยแล้ว', att_id: saved.attId };
  }

  /** ลบไฟล์แนบ (soft delete) + ลง delete-log */
  async remove(attId: number, upBy = 0, user?: JwtUser) {
    const row = await this.repo.findOne({ where: { attId, del: 0 } });
    if (!row) {
      return { flag: false, ms: 'ไม่พบไฟล์แนบ' };
    }

    if (user) {
      assertSameSchool(user, row.scId);
    }

    const snapshot = { ...row };
    row.del = 1;
    row.upBy = upBy;
    await this.repo.save(row);

    await this.deleteLog.log({
      table: 'tb_attachment',
      rowId: attId,
      reason: 'ลบไฟล์แนบ',
      deletedBy: upBy,
      scId: row.scId,
      snapshot,
    });

    return { flag: true, ms: 'ลบไฟล์แนบเรียบร้อยแล้ว' };
  }
}
