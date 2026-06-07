import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class AddPlanDto {
  @IsInt() sc_id: number;
  @IsInt() acad_year: number;
  @IsOptional() @IsString() pp_no?: string;
  @IsOptional() @IsString() pp_title?: string;
  @IsOptional() @IsNumber() pp_total_budget?: number;
  @IsOptional() @IsInt() pp_source?: number;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @IsInt() up_by?: number;
  /** ผูกกับใบขอจัดซื้อ (parcel_order.order_id) — ถ้ามี ระบบจะสร้างรายการในแผนและผูก ppi_id กลับให้อัตโนมัติ */
  @IsOptional() @IsInt() order_id?: number;
}

export class UpdatePlanDto extends AddPlanDto {
  @IsInt() pp_id: number;
}

export class AnnouncePlanDto {
  @IsInt() pp_id: number;
  @IsOptional() @IsString() announce_date?: string;
  @IsOptional() @IsString() announce_url?: string;
  @IsOptional() @IsInt() up_by?: number;
}

export class AddPlanItemDto {
  @IsInt() pp_id: number;
  @IsOptional() @IsInt() project_id?: number;
  @IsOptional() @IsString() item_title?: string;
  @IsOptional() @IsNumber() item_budget?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) buy_month?: number;
  @IsOptional() @IsInt() method_type?: number;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @IsInt() up_by?: number;
}

export class UpdatePlanItemDto extends AddPlanItemDto {
  @IsInt() ppi_id: number;
}
