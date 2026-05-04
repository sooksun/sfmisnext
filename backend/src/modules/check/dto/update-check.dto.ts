import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const UPDATE_FIELDS = [
  'check_no_doc',
  'type_offer_check',
  'user_offer_check',
  'offer_check_date',
  'status',
  'amount',
  'del',
  'transaction',
] as const;

function AtLeastOneUpdateField(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'atLeastOneUpdateField',
      target: (object as any).constructor,
      propertyName,
      options: {
        message: `ต้องระบุอย่างน้อยหนึ่ง field ที่ต้องการอัปเดต (${UPDATE_FIELDS.join(', ')})`,
        ...validationOptions,
      },
      validator: {
        validate(_: unknown, args: ValidationArguments) {
          const dto = args.object as Record<string, unknown>;
          return UPDATE_FIELDS.some((f) => dto[f] !== undefined);
        },
      },
    });
  };
}

export class UpdateCheckDto {
  @AtLeastOneUpdateField()
  @IsNotEmpty()
  @IsNumber()
  rw_id: number;

  @IsOptional()
  @IsNumber()
  sc_id?: number;

  @IsOptional()
  @IsNumber()
  check_no_doc?: number;

  @IsOptional()
  @IsNumber()
  type_offer_check?: number;

  @IsOptional()
  @IsNumber()
  user_offer_check?: number;

  @IsOptional()
  @IsDateString()
  offer_check_date?: string;

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  del?: number;

  @IsOptional()
  @IsNumber()
  up_by?: number;

  @IsOptional()
  transaction?: {
    real_amount: number;
    bg_type_id: number;
    up_by: number;
    sc_id: number;
  };
}
