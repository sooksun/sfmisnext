import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class AddProjectApproveDto {
  @IsNotEmpty()
  @IsNumber()
  sc_id: number;

  @IsNotEmpty()
  @IsNumber()
  acad_year: number;

  @IsNotEmpty()
  @IsNumber()
  proj_id: number;

  @IsNotEmpty()
  @IsNumber()
  numbers: number;

  @IsNotEmpty()
  @IsString()
  details: string;

  @IsNotEmpty()
  @IsString()
  resources: string;

  @IsNotEmpty()
  @IsNumber()
  total_budgets: number;

  @IsNotEmpty()
  @IsNumber()
  budgets: number;

  @IsNotEmpty()
  @IsNumber()
  remaind_budgets: number;

  @IsNotEmpty()
  @IsDateString()
  operate_date: string;

  @IsNotEmpty()
  @IsNumber()
  job_type: number;

  @IsNotEmpty()
  @IsNumber()
  note_number: number;

  @IsNotEmpty()
  @IsDateString()
  buy_date: string;

  @IsNotEmpty()
  @IsString()
  buy_reason: string;

  @IsNotEmpty()
  @IsNumber()
  departments: number;

  @IsNotEmpty()
  @IsNumber()
  due_date: number;

  @IsNotEmpty()
  @IsString()
  committee1: string;

  @IsNotEmpty()
  @IsString()
  committee2: string;

  @IsNotEmpty()
  @IsString()
  committee3: string;

  @IsNotEmpty()
  @IsString()
  book_order_committee: string;

  @IsNotEmpty()
  @IsDateString()
  date_order_committee: string;

  @IsNotEmpty()
  @IsString()
  book_report_number: string;

  @IsNotEmpty()
  @IsString()
  date_book_report: string;

  @IsNotEmpty()
  @IsNumber()
  suppliers: number;

  @IsNotEmpty()
  @IsNumber()
  present_cost: number;

  @IsNotEmpty()
  @IsDateString()
  date_win: string;

  @IsNotEmpty()
  @IsString()
  number_orders: string;

  @IsNotEmpty()
  @IsDateString()
  orders_date: string;

  @IsNotEmpty()
  @IsNumber()
  due_orders_date: number;

  @IsNotEmpty()
  @IsDateString()
  over_due_date: string;

  @IsNotEmpty()
  @IsDateString()
  prove_date: string;

  @IsNotEmpty()
  @IsString()
  number_report_widdraw: string;

  @IsNotEmpty()
  @IsDateString()
  date_report_widdraw: string;

  @IsOptional()
  @IsNumber()
  up_by?: number;
}
