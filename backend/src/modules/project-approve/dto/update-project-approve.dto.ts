import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class UpdateProjectApproveDto {
  @IsNotEmpty()
  @IsNumber()
  ppa_id: number;

  @IsOptional()
  @IsNumber()
  sc_id?: number;

  @IsOptional()
  @IsNumber()
  acad_year?: number;

  @IsOptional()
  @IsNumber()
  proj_id?: number;

  @IsOptional()
  @IsNumber()
  numbers?: number;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  resources?: string;

  @IsOptional()
  @IsNumber()
  total_budgets?: number;

  @IsOptional()
  @IsNumber()
  budgets?: number;

  @IsOptional()
  @IsNumber()
  remaind_budgets?: number;

  @IsOptional()
  @IsDateString()
  operate_date?: string;

  @IsOptional()
  @IsNumber()
  job_type?: number;

  @IsOptional()
  @IsNumber()
  note_number?: number;

  @IsOptional()
  @IsDateString()
  buy_date?: string;

  @IsOptional()
  @IsString()
  buy_reason?: string;

  @IsOptional()
  @IsNumber()
  departments?: number;

  @IsOptional()
  @IsNumber()
  due_date?: number;

  @IsOptional()
  @IsString()
  committee1?: string;

  @IsOptional()
  @IsString()
  committee2?: string;

  @IsOptional()
  @IsString()
  committee3?: string;

  @IsOptional()
  @IsString()
  book_order_committee?: string;

  @IsOptional()
  @IsDateString()
  date_order_committee?: string;

  @IsOptional()
  @IsString()
  book_report_number?: string;

  @IsOptional()
  @IsString()
  date_book_report?: string;

  @IsOptional()
  @IsNumber()
  suppliers?: number;

  @IsOptional()
  @IsNumber()
  present_cost?: number;

  @IsOptional()
  @IsDateString()
  date_win?: string;

  @IsOptional()
  @IsString()
  number_orders?: string;

  @IsOptional()
  @IsDateString()
  orders_date?: string;

  @IsOptional()
  @IsNumber()
  due_orders_date?: number;

  @IsOptional()
  @IsDateString()
  over_due_date?: string;

  @IsOptional()
  @IsDateString()
  prove_date?: string;

  @IsOptional()
  @IsString()
  number_report_widdraw?: string;

  @IsOptional()
  @IsDateString()
  date_report_widdraw?: string;

  @IsOptional()
  @IsNumber()
  up_by?: number;
}
