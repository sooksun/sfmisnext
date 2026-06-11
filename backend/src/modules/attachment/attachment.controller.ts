import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as path from 'path';
import { AttachmentService } from './attachment.service';
import {
  attachmentMulterOptions,
  UPLOAD_DIR,
} from './attachment.config';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { assertSameSchool, type JwtUser } from '../../common/utils/tenant-guard';

interface UploadedFileMeta {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
}

interface UploadBody {
  ref_type: string;
  ref_id: string;
  sc_id: string;
  category?: string;
  note?: string;
  up_by?: string;
}

@UseGuards(RolesGuard)
@Controller('attachment')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', attachmentMulterOptions))
  upload(
    @UploadedFile() file: UploadedFileMeta | undefined,
    @Body() body: UploadBody,
    @CurrentUser() user: JwtUser,
  ) {
    const scId = Number(body.sc_id);
    const refId = Number(body.ref_id);
    if (!body.ref_type || !Number.isInteger(scId) || !Number.isInteger(refId)) {
      throw new BadRequestException('ข้อมูลไม่ครบถ้วน (ref_type, ref_id, sc_id)');
    }
    assertSameSchool(user, scId);

    if (!file) {
      throw new BadRequestException('ไม่พบไฟล์ที่อัปโหลด');
    }

    return this.attachmentService.create({
      scId,
      refType: body.ref_type,
      refId,
      fileName: path.basename(file.originalname),
      storedName: file.filename,
      mime: file.mimetype,
      sizeBytes: file.size,
      category: body.category ?? null,
      note: body.note ?? null,
      upBy: body.up_by ? Number(body.up_by) : 0,
    });
  }

  @Get('list/:sc_id/:ref_type/:ref_id')
  @HttpCode(HttpStatus.OK)
  list(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('ref_type') refType: string,
    @Param('ref_id', ParseIntPipe) refId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.attachmentService.list(scId, refType, refId);
  }

  @Get('file/:stored_name')
  file(@Param('stored_name') storedName: string, @Res() res: Response) {
    // กัน path traversal — อนุญาตเฉพาะ basename ที่ไม่มีตัวคั่น path / '..'
    if (
      storedName.includes('/') ||
      storedName.includes('\\') ||
      storedName.includes('..') ||
      path.basename(storedName) !== storedName
    ) {
      throw new BadRequestException('ชื่อไฟล์ไม่ถูกต้อง');
    }
    return res.sendFile(path.join(UPLOAD_DIR, storedName));
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(
    @Body() body: { att_id: number; up_by?: number; reason?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.attachmentService.remove(body.att_id, body.up_by ?? 0, user);
  }
}
