import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { GeneralDbService } from './general-db.service';
import type {
  AddPartnerPayload,
  UpdatePartnerPayload,
  AddSuppliePayload,
  UpdateSuppliesPayload,
  FixSuppliesPayload,
} from './general-db.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreateTypeSuppliesDto } from './dto/create-type-supplies.dto';
import { UpdateTypeSuppliesDto } from './dto/update-type-supplies.dto';

@Controller('General_db')
export class GeneralDbController {
  constructor(private readonly generalDbService: GeneralDbService) {}

  // Unit endpoints
  @Post('load_unit/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadUnits(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.generalDbService.loadUnits(scId, page, pageSize);
  }

  @Get('load_unit/:scId/:page/:pageSize')
  loadUnitsGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.generalDbService.loadUnits(scId, page, pageSize);
  }

  @Post('addUnit')
  @HttpCode(HttpStatus.OK)
  addUnit(@Body() payload: CreateUnitDto) {
    return this.generalDbService.addUnit(payload);
  }

  @Post('updateUnit')
  @HttpCode(HttpStatus.OK)
  updateUnit(@Body() payload: UpdateUnitDto) {
    return this.generalDbService.updateUnit(payload);
  }

  @Post('remove_unit')
  @HttpCode(HttpStatus.OK)
  removeUnit(@Body() payload: { un_id: number }) {
    return this.generalDbService.removeUnit(payload.un_id);
  }

  // TypeSupplies endpoints
  @Post('load_type_supplie/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadTypeSupplies(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.generalDbService.loadTypeSupplies(scId, page, pageSize);
  }

  @Get('load_type_supplie/:scId/:page/:pageSize')
  loadTypeSuppliesGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.generalDbService.loadTypeSupplies(scId, page, pageSize);
  }

  @Post('addTypeSupplie')
  @HttpCode(HttpStatus.OK)
  addTypeSupplie(@Body() payload: CreateTypeSuppliesDto) {
    return this.generalDbService.addTypeSupplie(payload);
  }

  @Post('updateTypeSupplie')
  @HttpCode(HttpStatus.OK)
  updateTypeSupplie(@Body() payload: UpdateTypeSuppliesDto) {
    return this.generalDbService.updateTypeSupplie(payload);
  }

  @Post('remove_type_supplie')
  @HttpCode(HttpStatus.OK)
  removeTypeSupplie(@Body() payload: { ts_id: number }) {
    return this.generalDbService.removeTypeSupplie(payload.ts_id);
  }

  // Partner endpoints
  @Post('load_partner/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadPartners(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.generalDbService.loadPartners(scId, page, pageSize);
  }

  @Get('load_partner/:scId/:page/:pageSize')
  loadPartnersGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.generalDbService.loadPartners(scId, page, pageSize);
  }

  @Post('addPartner')
  @HttpCode(HttpStatus.OK)
  addPartner(@Body() payload: AddPartnerPayload) {
    return this.generalDbService.addPartner(payload);
  }

  @Post('updatePartner')
  @HttpCode(HttpStatus.OK)
  updatePartner(@Body() payload: UpdatePartnerPayload) {
    return this.generalDbService.updatePartner(payload);
  }

  @Post('remove_partner')
  @HttpCode(HttpStatus.OK)
  removePartner(@Body() payload: { partner_id: number }) {
    return this.generalDbService.removePartner(payload.partner_id);
  }

  // Supplies endpoints
  @Get('load_supplies/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSupplies(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.generalDbService.loadSupplies(scId, page, pageSize);
  }

  @Post('addSupplie')
  @HttpCode(HttpStatus.OK)
  addSupplie(@Body() payload: AddSuppliePayload) {
    return this.generalDbService.addSupplie(payload);
  }

  @Post('updateSupplies')
  @HttpCode(HttpStatus.OK)
  updateSupplies(@Body() payload: UpdateSuppliesPayload) {
    return this.generalDbService.updateSupplies(payload);
  }

  @Post('remove_supplies')
  @HttpCode(HttpStatus.OK)
  removeSupplies(@Body() payload: { supp_id: number; del?: number }) {
    return this.generalDbService.removeSupplies(payload);
  }

  @Get('loadTypeSuppliesAndUnit/:scId')
  @HttpCode(HttpStatus.OK)
  loadTypeSuppliesAndUnit(@Param('scId', ParseIntPipe) scId: number) {
    return this.generalDbService.loadTypeSuppliesAndUnit(scId);
  }

  @Get('loadFixSupplies/:suppId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadFixSupplies(
    @Param('suppId', ParseIntPipe) suppId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.generalDbService.loadFixSupplies(suppId, page, pageSize);
  }

  @Post('fixSupplies')
  @HttpCode(HttpStatus.OK)
  fixSupplies(@Body() payload: FixSuppliesPayload) {
    return this.generalDbService.fixSupplies(payload);
  }
}
