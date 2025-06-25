import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionPlan } from '../../subscriptions/schemas/subscription.schema';

export class PaymentItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @IsOptional()
  @IsString()
  buyerName?: string;

  @IsOptional()
  @IsEmail()
  buyerEmail?: string;

  @IsOptional()
  @IsString()
  buyerPhone?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items?: PaymentItemDto[];
}

export class CreateSubscriptionPaymentDto {
  @IsNotEmpty()
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsOptional()
  @IsNumber()
  durationMonths?: number;

  @IsOptional()
  @IsString()
  buyerName?: string;

  @IsOptional()
  @IsEmail()
  buyerEmail?: string;
}

export class PaymentWebhookDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  desc: string;

  @IsNotEmpty()
  success: boolean;

  @IsNotEmpty()
  data: {
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    reference: string;
    transactionDateTime: string;
    currency: string;
    paymentLinkId: string;
    code: string;
    desc: string;
    counterAccountBankId?: string;
    counterAccountBankName?: string;
    counterAccountName?: string;
    counterAccountNumber?: string;
    virtualAccountName?: string;
    virtualAccountNumber?: string;
    status: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  };

  @IsNotEmpty()
  @IsString()
  signature: string;
}
