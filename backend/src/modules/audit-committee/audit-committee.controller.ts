import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuditCommitteeService } from './audit-committee.service';
import { UpdateSetCommitteeDto } from './dto/update-set-committee.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
@Controller('Audit_committee')
export class AuditCommitteeController {
  constructor(private readonly auditCommitteeService: AuditCommitteeService) {}

  @Get('loadAuditCommitteeStatus/:scId/:yearId')
  @HttpCode(HttpStatus.OK)
  loadAuditCommitteeStatus(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('yearId', ParseIntPipe) yearId: number,
  ) {
    return this.auditCommitteeService.loadAuditCommitteeStatus(scId, yearId);
  }

  @Post('updateSetCommittee')
  @HttpCode(HttpStatus.OK)
  updateSetCommittee(@Body() dto: UpdateSetCommitteeDto) {
    return this.auditCommitteeService.updateSetCommittee(dto);
  }
}
