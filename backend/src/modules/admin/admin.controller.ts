import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { AddAdminDto } from './dto/add-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PageSizePipe } from '../../common/pipes/page-size.pipe';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('B_admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  login(@Body() payload: LoginDto) {
    return this.adminService.login(payload);
  }

  @Post('changePassword')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Body() payload: ChangePasswordDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.adminService.changeMyPassword(user.admin_id, payload);
  }

  // ── Super Admin only: จัดการ admin ข้ามโรงเรียน ─────────────────

  @Post('load_admin/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1)
  loadAdminsPost(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.adminService.loadAdmins(page, pageSize);
  }

  @Get('load_admin/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1)
  loadAdmins(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.adminService.loadAdmins(page, pageSize);
  }

  @Post('addAdmin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1)
  addAdmin(@Body() payload: AddAdminDto) {
    return this.adminService.addAdmin(payload);
  }

  @Post('updateAdmin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1)
  updateAdmin(@Body() payload: UpdateAdminDto) {
    return this.adminService.updateAdmin(payload);
  }

  @Post('remove_admin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1)
  removeAdmin(@Body() payload: UpdateAdminStatusDto) {
    return this.adminService.removeAdmin(payload);
  }

  // ── Admin + School Admin: จัดการ user ภายในโรงเรียน ────────────

  @Post('load_user/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1, 2)
  loadUsersPost(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.adminService.loadUsersBySchool(scId, page, pageSize);
  }

  @Get('load_user/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1, 2)
  loadUsers(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.adminService.loadUsersBySchool(scId, page, pageSize);
  }

  @Post('add_user')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1, 2)
  addUser(@Body() payload: AddAdminDto, @CurrentUser() user: JwtUser) {
    return this.adminService.addAdmin(payload, user);
  }

  @Post('update_user')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1, 2)
  updateUser(@Body() payload: UpdateAdminDto, @CurrentUser() user: JwtUser) {
    return this.adminService.updateAdmin(payload, user);
  }

  @Post('remove_user')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1, 2)
  removeUser(
    @Body() payload: UpdateAdminStatusDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.adminService.removeAdmin(payload, user);
  }

  // ── Public data (ใช้ JWT ตรวจสิทธิ์แค่ว่า login แล้ว) ──────────

  // รายชื่อผู้ใช้ในโรงเรียนสำหรับ dropdown (ผู้ยืม/ผู้รับ/ผู้จ่าย) — ทุก role
  // ที่ login แล้วเรียกได้ แต่ดูได้เฉพาะโรงเรียนตัวเอง (assertSameSchool)
  @Get('load_user_options/:scId')
  @HttpCode(HttpStatus.OK)
  loadUserOptions(
    @Param('scId', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.adminService.loadUserOptions(scId);
  }

  @Get('loadPosition')
  @HttpCode(HttpStatus.OK)
  loadPositionGet() {
    return this.adminService.loadPosition();
  }

  @Post('loadPosition')
  @HttpCode(HttpStatus.OK)
  loadPosition() {
    return this.adminService.loadPosition();
  }
}
