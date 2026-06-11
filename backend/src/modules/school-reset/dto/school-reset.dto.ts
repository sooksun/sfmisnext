import { Equals, IsString } from 'class-validator';

/**
 * ต้องพิมพ์ยืนยัน confirm = 'RESET' เป๊ะ ๆ ถึงจะรันได้ (กันกดพลาด)
 */
export class SchoolResetDto {
  @IsString()
  @Equals('RESET', { message: 'กรุณาพิมพ์ RESET เพื่อยืนยันการล้างข้อมูล' })
  confirm: string;
}
