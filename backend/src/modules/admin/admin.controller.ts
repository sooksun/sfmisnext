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
import { LoginDto } from './dto/login.dto';
import { AddAdminDto } from './dto/add-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto';

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

  @Post('load_admin/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadAdminsPost(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.adminService.loadAdmins(page, pageSize);
  }

  @Get('load_admin/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadAdmins(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.adminService.loadAdmins(page, pageSize);
  }

  @Post('load_user/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadUsersPost(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.adminService.loadUsersBySchool(scId, page, pageSize);
  }

  @Get('load_user/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadUsers(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.adminService.loadUsersBySchool(scId, page, pageSize);
  }

  @Post('remove_admin')
  @HttpCode(HttpStatus.OK)
  removeAdmin(@Body() payload: UpdateAdminStatusDto) {
    return this.adminService.removeAdmin(payload);
  }

  @Post('addAdmin')
  @HttpCode(HttpStatus.OK)
  addAdmin(@Body() payload: AddAdminDto) {
    return this.adminService.addAdmin(payload);
  }

  @Post('updateAdmin')
  @HttpCode(HttpStatus.OK)
  updateAdmin(@Body() payload: UpdateAdminDto) {
    return this.adminService.updateAdmin(payload);
  }

  @Post('add_user')
  @HttpCode(HttpStatus.OK)
  addUser(@Body() payload: any) {
    return this.adminService.addAdmin(payload);
  }

  @Post('update_user')
  @HttpCode(HttpStatus.OK)
  updateUser(@Body() payload: any) {
    return this.adminService.updateAdmin(payload);
  }

  @Post('remove_user')
  @HttpCode(HttpStatus.OK)
  removeUser(@Body() payload: any) {
    return this.adminService.removeAdmin(payload);
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
