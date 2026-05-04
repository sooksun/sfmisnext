import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('b_admin')
export class BAdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('updateAdmin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1, 2)
  updateAdmin(@Body() payload: UpdateAdminDto) {
    return this.adminService.updateAdmin(payload);
  }

  @Post('loadPosition')
  @HttpCode(HttpStatus.OK)
  loadPositionPost() {
    return this.adminService.loadPosition();
  }

  @Get('loadPosition')
  @HttpCode(HttpStatus.OK)
  loadPosition() {
    return this.adminService.loadPosition();
  }
}
