import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { Attachment } from './entities/attachment.entity';
import { DeleteLogService } from '../delete-log/delete-log.service';
import type { JwtUser } from '../../common/utils/tenant-guard';

describe('AttachmentService', () => {
  let service: AttachmentService;
  let repo: jest.Mocked<any>;
  let deleteLog: jest.Mocked<any>;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    deleteLog = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentService,
        { provide: getRepositoryToken(Attachment), useValue: repo },
        { provide: DeleteLogService, useValue: deleteLog },
      ],
    }).compile();

    service = module.get(AttachmentService);
  });

  // ─── list ───────────────────────────────────────────────────────────────────
  describe('list', () => {
    it('filter scId, refType, refId, del=0; เรียง attId ASC', async () => {
      repo.find.mockResolvedValue([]);
      await service.list(5, 'parcel_order', 9);
      expect(repo.find).toHaveBeenCalledWith({
        where: { scId: 5, refType: 'parcel_order', refId: 9, del: 0 },
        order: { attId: 'ASC' },
      });
    });

    it('คืน data ว่างและ count=0 ถ้าไม่มีไฟล์', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.list(1, 'receipt', 1);
      expect(result).toEqual({ data: [], count: 0 });
    });

    it('สร้าง url = /api/attachment/file/<stored_name> และ map snake_case', async () => {
      repo.find.mockResolvedValue([
        {
          attId: 3,
          scId: 5,
          refType: 'sup_contract',
          refId: 9,
          fileName: 'สัญญา.pdf',
          storedName: 'abc123.pdf',
          mime: 'application/pdf',
          sizeBytes: 2048,
          category: 'contract',
          note: 'ฉบับจริง',
          upBy: 7,
          createDate: null,
        },
      ]);
      const result = await service.list(5, 'sup_contract', 9);
      expect(result.count).toBe(1);
      const row = result.data[0];
      expect(row.att_id).toBe(3);
      expect(row.file_name).toBe('สัญญา.pdf');
      expect(row.stored_name).toBe('abc123.pdf');
      expect(row.url).toBe('/api/attachment/file/abc123.pdf');
      expect(row.size_bytes).toBe(2048);
      expect(row.category).toBe('contract');
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('persist row และคืน flag:true + att_id', async () => {
      repo.create.mockImplementation((v: any) => v);
      repo.save.mockResolvedValue({ attId: 42 });

      const result = await service.create({
        scId: 5,
        refType: 'receipt',
        refId: 9,
        fileName: 'r.png',
        storedName: 'deadbeef.png',
        mime: 'image/png',
        sizeBytes: 100,
      });

      expect(repo.save).toHaveBeenCalled();
      const created = repo.create.mock.calls[0][0];
      expect(created.del).toBe(0);
      expect(created.upBy).toBe(0);
      expect(created.category).toBeNull();
      expect(result).toEqual({
        flag: true,
        ms: 'อัปโหลดไฟล์เรียบร้อยแล้ว',
        att_id: 42,
      });
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('ไม่พบไฟล์ → flag:false และไม่ลง delete-log', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.remove(99, 7);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบไฟล์แนบ' });
      expect(deleteLog.log).not.toHaveBeenCalled();
    });

    it('happy path → del=1, upBy set, ลง delete-log, flag:true', async () => {
      const row: any = { attId: 1, scId: 5, del: 0, upBy: 0 };
      repo.findOne.mockResolvedValue(row);
      repo.save.mockResolvedValue(row);

      const result = await service.remove(1, 7);
      expect(row.del).toBe(1);
      expect(row.upBy).toBe(7);
      expect(deleteLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'tb_attachment',
          rowId: 1,
          reason: 'ลบไฟล์แนบ',
          deletedBy: 7,
          scId: 5,
        }),
      );
      expect(result).toEqual({ flag: true, ms: 'ลบไฟล์แนบเรียบร้อยแล้ว' });
    });

    it('cross-tenant → ForbiddenException (user คนละโรงเรียน)', async () => {
      const row: any = { attId: 1, scId: 5, del: 0, upBy: 0 };
      repo.findOne.mockResolvedValue(row);
      const otherSchoolUser: JwtUser = {
        admin_id: 1,
        username: 'u',
        sc_id: 99,
        type: 3,
      };

      await expect(service.remove(1, 7, otherSchoolUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.save).not.toHaveBeenCalled();
      expect(deleteLog.log).not.toHaveBeenCalled();
    });
  });
});
