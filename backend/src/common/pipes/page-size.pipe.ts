import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export const MAX_PAGE_SIZE = 500;

/**
 * PageSizePipe — แปลง string → number และ cap ที่ MAX_PAGE_SIZE (500)
 * ใช้แทน ParseIntPipe บน @Param('pageSize') ทุก endpoint เพื่อป้องกัน
 * ผู้ไม่หวังดีส่ง pageSize=999999 ทำให้ DB โหลดข้อมูลทั้งหมด
 */
@Injectable()
export class PageSizePipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 1) {
      throw new BadRequestException('pageSize ต้องเป็นตัวเลขที่มากกว่า 0');
    }
    return Math.min(n, MAX_PAGE_SIZE);
  }
}
