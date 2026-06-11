import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiptBook } from './entities/receipt-book.entity';
import { Admin } from '../admin/entities/admin.entity';
import {
  AddReceiptBookDto,
  CloseBookDto,
  VoidBookDto,
  AdvanceCurrentDto,
} from './dto/receipt-book.dto';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Injectable()
export class ReceiptBookService {
  constructor(
    @InjectRepository(ReceiptBook)
    private readonly rbRepo: Repository<ReceiptBook>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
  ) {}

  async loadBooks(scId: number, syId: number, budgetYear: string) {
    const books = await this.rbRepo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { rbId: 'DESC' },
    });

    return {
      data: books.map((b) => this.toDto(b)),
      count: books.length,
    };
  }

  async getActiveBook(scId: number, budgetYear: string) {
    const book = await this.rbRepo.findOne({
      where: { scId, budgetYear, status: 1, del: 0 },
    });
    return book ? this.toDto(book) : null;
  }

  async addBook(dto: AddReceiptBookDto) {
    // validate no active book already exists
    const existing = await this.rbRepo.findOne({
      where: {
        scId: dto.sc_id,
        budgetYear: dto.budget_year,
        status: 1,
        del: 0,
      },
    });
    if (existing) {
      return {
        flag: false,
        ms: 'มีเล่มที่กำลังใช้อยู่แล้ว กรุณาปิดเล่มเดิมก่อน',
      };
    }

    // ห้ามข้ามปีงบในเล่มเดียว: ถ้ามีเล่มปีงบก่อนหน้ายัง active อยู่ ต้องปิด/ยกเลิกใบที่เหลือก่อน
    const activeBooks = await this.rbRepo.find({
      where: { scId: dto.sc_id, status: 1, del: 0 },
    });
    const curYear = parseInt(dto.budget_year, 10);
    const staleBook = activeBooks.find((b) => {
      const y = parseInt(b.budgetYear ?? '0', 10);
      return y && curYear && y < curYear;
    });
    if (staleBook) {
      return {
        flag: false,
        ms: `มีเล่มใบเสร็จปีงบ ${staleBook.budgetYear} ที่ยังไม่ปิด — ต้องปิดเล่มและยกเลิกใบที่เหลือก่อนเปิดเล่มปีงบใหม่ (ห้ามใช้ข้ามปีงบ)`,
      };
    }

    const book = this.rbRepo.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      budgetYear: dto.budget_year,
      bookCode: dto.book_code ?? null,
      fromNo: dto.from_no,
      toNo: dto.to_no,
      currentNo: dto.from_no,
      status: 1,
      openedDate: dto.opened_date ?? null,
      note: dto.note ?? null,
      upBy: dto.up_by,
      del: 0,
    });

    await this.rbRepo.save(book);
    return {
      flag: true,
      ms: `เพิ่มเล่มใบเสร็จ "${dto.book_code ?? ''}" เรียบร้อยแล้ว`,
    };
  }

  async closeBook(dto: CloseBookDto, user?: JwtUser) {
    const book = await this.rbRepo.findOne({
      where: { rbId: dto.rb_id, del: 0 },
    });
    if (!book) return { flag: false, ms: 'ไม่พบเล่มใบเสร็จ' };
    if (user) assertSameSchool(user, book.scId);
    if (book.status !== 1)
      return { flag: false, ms: 'ปิดได้เฉพาะเล่มที่กำลังใช้งาน (สถานะ 1)' };

    book.status = 2;
    book.closedDate = dto.closed_date;
    book.upBy = dto.up_by;
    await this.rbRepo.save(book);
    return {
      flag: true,
      ms: `ปิดเล่มใบเสร็จ "${book.bookCode ?? ''}" เรียบร้อยแล้ว`,
    };
  }

  async voidBook(dto: VoidBookDto, user?: JwtUser) {
    const book = await this.rbRepo.findOne({
      where: { rbId: dto.rb_id, del: 0 },
    });
    if (!book) return { flag: false, ms: 'ไม่พบเล่มใบเสร็จ' };
    if (user) assertSameSchool(user, book.scId);
    if (book.status === 3) return { flag: false, ms: 'เล่มนี้ถูกยกเลิกแล้ว' };

    // snapshot voided_by_name จาก Admin
    let voidedByName: string | null = null;
    const admin = await this.adminRepo.findOne({
      where: { adminId: dto.up_by },
    });
    if (admin) {
      voidedByName = admin.name ?? admin.username ?? null;
    }

    const today = new Date().toISOString().substring(0, 10);
    book.status = 3;
    book.voidedDate = today;
    book.voidedBy = dto.up_by;
    book.voidedByName = voidedByName;
    book.voidReason = dto.void_reason;
    book.upBy = dto.up_by;
    await this.rbRepo.save(book);
    return {
      flag: true,
      ms: `ยกเลิกเล่มใบเสร็จ "${book.bookCode ?? ''}" เรียบร้อยแล้ว`,
    };
  }

  async advanceCurrent(dto: AdvanceCurrentDto, user?: JwtUser) {
    const book = await this.rbRepo.findOne({
      where: { rbId: dto.rb_id, del: 0 },
    });
    if (!book) return { flag: false, ms: 'ไม่พบเล่มใบเสร็จ' };
    if (user) assertSameSchool(user, book.scId);
    if (book.status === 3)
      return { flag: false, ms: 'ไม่สามารถแก้ไขเล่มที่ยกเลิกแล้ว' };

    book.currentNo = dto.new_current_no;
    book.upBy = dto.up_by;

    // auto-close if exhausted
    if (dto.new_current_no > book.toNo) {
      book.status = 2;
      const today = new Date().toISOString().substring(0, 10);
      book.closedDate = today;
    }

    await this.rbRepo.save(book);
    return {
      flag: true,
      ms: `อัปเดตเลขที่ปัจจุบันเป็น ${dto.new_current_no} เรียบร้อยแล้ว`,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private toDto(b: ReceiptBook) {
    const range = b.toNo - b.fromNo + 1;
    const used = b.currentNo - b.fromNo;
    const remaining = b.toNo - b.currentNo + 1;
    const usagePct =
      range > 0 ? Math.min(100, Math.round((used / range) * 100)) : 0;

    return {
      rb_id: b.rbId,
      sc_id: b.scId,
      sy_id: b.syId,
      budget_year: b.budgetYear,
      book_code: b.bookCode,
      from_no: b.fromNo,
      to_no: b.toNo,
      current_no: b.currentNo,
      status: b.status,
      remaining,
      usage_pct: usagePct,
      opened_date: b.openedDate,
      closed_date: b.closedDate,
      voided_date: b.voidedDate,
      voided_by: b.voidedBy,
      voided_by_name: b.voidedByName,
      void_reason: b.voidReason,
      note: b.note,
      create_date: b.createDate,
    };
  }
}
