import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SchoolYearModule } from './modules/school-year/school-year.module';
import { SchoolModule } from './modules/school/school.module';
import { GeneralDbModule } from './modules/general-db/general-db.module';
import { PolicyModule } from './modules/policy/policy.module';
import { StudentModule } from './modules/student/student.module';
import { BudgetModule } from './modules/budget/budget.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ProjectModule } from './modules/project/project.module';
import { ProjectApproveModule } from './modules/project-approve/project-approve.module';
import { ReceiveModule } from './modules/receive/receive.module';
import { ReceiptModule } from './modules/receipt/receipt.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { CheckModule } from './modules/check/check.module';
import { BankModule } from './modules/bank/bank.module';
import { SupplieModule } from './modules/supplie/supplie.module';
import { AuditCommitteeModule } from './modules/audit-committee/audit-committee.module';
import { ReportDailyBalanceModule } from './modules/report-daily-balance/report-daily-balance.module';
import { ReportCheckControlModule } from './modules/report-check-control/report-check-control.module';
import { ReportBookbankModule } from './modules/report-bookbank/report-bookbank.module';
import { RegisterMoneyTypeModule } from './modules/register-money-type/register-money-type.module';
import { RegistrationCertificateModule } from './modules/registration-certificate/registration-certificate.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'login',
        ttl: 60000,
        limit: 5,
      },
    ]),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'sfmisystem',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
        migrationsRun: false,
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    AdminModule,
    DashboardModule,
    SchoolYearModule,
    SchoolModule,
    GeneralDbModule,
    PolicyModule,
    StudentModule,
    BudgetModule,
    SettingsModule,
    ProjectModule,
    ProjectApproveModule,
    ReceiveModule,
    ReceiptModule,
    InvoiceModule,
    CheckModule,
    BankModule,
    SupplieModule,
    AuditCommitteeModule,
    ReportDailyBalanceModule,
    ReportCheckControlModule,
    ReportBookbankModule,
    RegisterMoneyTypeModule,
    RegistrationCertificateModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT guard — ทุก endpoint ต้อง authenticate ยกเว้นที่มี @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
