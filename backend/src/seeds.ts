import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { Admin } from './modules/admin/entities/admin.entity';
import { SchoolYear } from './modules/school-year/entities/school-year.entity';
import { School } from './modules/school/entities/school.entity';
import { MasterLevel } from './modules/admin/entities/master-level.entity';
import { FinancialTransactions } from './modules/report-daily-balance/entities/financial-transactions.entity';
import { BudgetIncomeType } from './modules/policy/entities/budget-income-type.entity';
import { PlnReceive } from './modules/receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from './modules/receive/entities/pln-receive-detail.entity';
import { Receipt } from './modules/receipt/entities/receipt.entity';
import { RequestWithdraw } from './modules/invoice/entities/request-withdraw.entity';
import { Partner } from './modules/general-db/entities/partner.entity';
import { BankAccount } from './modules/bank/entities/bankaccount.entity';
import { BankDb } from './modules/bank/entities/bank-db.entity';
import { BudgetIncomeTypeSchool } from './modules/bank/entities/budget-income-type-school.entity';
import { WithholdingCertificate } from './modules/registration-certificate/entities/withholding-certificate.entity';
import { MasterClassroom } from './modules/student/entities/master-classroom.entity';
import { MasterBudgetCategory } from './modules/budget/entities/master-budget-category.entity';
import { Student } from './modules/student/entities/student.entity';
import { Project } from './modules/project/entities/project.entity';
import { PlnProjApprove } from './modules/project-approve/entities/pln-proj-approve.entity';
import { Supplies } from './modules/supplie/entities/supplies.entity';
import { TransactionSupplies } from './modules/supplie/entities/transaction-supplies.entity';
// ---- ตารางที่เพิ่มใหม่ ----
import { TypeSupplies } from './modules/general-db/entities/type-supplies.entity';
import { Unit } from './modules/general-db/entities/unit.entity';
import { MasterObecPolicy } from './modules/settings/entities/master-obec-policy.entity';
import { MasterScPolicy } from './modules/settings/entities/master-sc-policy.entity';
import { TbEstimateAcadyear } from './modules/budget/entities/tb-estimate-acadyear.entity';
import { PlnBudgetCategory } from './modules/budget/entities/pln-budget-category.entity';
import { PlnBudgetCategoryDetail } from './modules/budget/entities/pln-budget-category-detail.entity';
import { TbExpenses } from './modules/budget/entities/tb-expenses.entity';
import { PlnRealBudget } from './modules/policy/entities/pln-real-budget.entity';
import { MasterClassroomBudget } from './modules/student/entities/master-classroom-budget.entity';
import { SubmittingStudentRecords } from './modules/student/entities/submitting-student-records.entity';
import { ParcelOrder } from './modules/project-approve/entities/parcel-order.entity';
import { ParcelDetail } from './modules/project-approve/entities/parcel-detail.entity';
import { ReceiveParcelOrder } from './modules/supplie/entities/receive-parcel-order.entity';
import { ReceiveParcelDetail } from './modules/supplie/entities/receive-parcel-detail.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sfmisystem',
  entities: [
    Admin,
    SchoolYear,
    School,
    MasterLevel,
    FinancialTransactions,
    BudgetIncomeType,
    PlnReceive,
    PlnReceiveDetail,
    Receipt,
    RequestWithdraw,
    Partner,
    BankAccount,
    BankDb,
    BudgetIncomeTypeSchool,
    WithholdingCertificate,
    MasterClassroom,
    MasterBudgetCategory,
    Student,
    Project,
    PlnProjApprove,
    Supplies,
    TransactionSupplies,
    TypeSupplies,
    Unit,
    MasterObecPolicy,
    MasterScPolicy,
    TbEstimateAcadyear,
    PlnBudgetCategory,
    PlnBudgetCategoryDetail,
    TbExpenses,
    PlnRealBudget,
    MasterClassroomBudget,
    SubmittingStudentRecords,
    ParcelOrder,
    ParcelDetail,
    ReceiveParcelOrder,
    ReceiveParcelDetail,
  ],
  synchronize: false,
});

async function seedAdmin() {
  const adminRepo = AppDataSource.getRepository(Admin);

  const existing = await adminRepo.findOne({
    where: { username: 'admin_local' },
  });

  if (existing) {
    console.log('admin_local มีอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const passwordPlain = 'Admin@123';
  const passwordMd5 = crypto
    .createHash('md5')
    .update(passwordPlain)
    .digest('hex');

  const admin = adminRepo.create({
    name: 'ผู้ดูแลพิเศษ',
    username: 'admin_local',
    email: 'admin_local@sfmisystem.com',
    password: passwordMd5,
    passwordDefault: passwordPlain,
    del: 0,
    codeLogin: 'LOCALCODE',
    scId: 1,
    creDate: new Date(),
    upDate: new Date(),
    upBy: 1,
    type: 2,
    position: 2,
  });

  await adminRepo.save(admin);
  console.log('สร้าง admin_local สำเร็จ');
}

async function seedSchool() {
  const schoolRepo = AppDataSource.getRepository(School);

  const existing = await schoolRepo.findOne({
    where: { scId: 1 },
  });

  if (existing) {
    console.log('School sc_id=1 มีอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const school = schoolRepo.create({
    scName: 'โรงเรียนตัวอย่าง SFMIS',
    del: 0,
    upDate: new Date(),
  });

  await schoolRepo.save(school);
  console.log('สร้าง School ตัวอย่างสำเร็จ');
}

async function seedSchoolYear() {
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  const currentYear = new Date().getFullYear();

  const existing = await schoolYearRepo.findOne({
    where: { syYear: currentYear, semester: 1, del: 0 },
  });

  if (existing) {
    console.log('SchoolYear ปีปัจจุบันมีอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const schoolYear = schoolYearRepo.create({
    syYear: currentYear,
    semester: 1,
    del: 0,
    creDate: new Date(),
    upDate: new Date(),
    scId: 1,
    budgetYear: currentYear,
  });

  await schoolYearRepo.save(schoolYear);
  console.log('สร้าง SchoolYear ปีปัจจุบันสำเร็จ');
}

async function seedMasterLevel() {
  const masterLevelRepo = AppDataSource.getRepository(MasterLevel);

  const existing = await masterLevelRepo.count();

  if (existing > 0) {
    console.log('MasterLevel มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const positions = [
    { level: '1', position: 'ผู้อำนวยการ' },
    { level: '2', position: 'รองผู้อำนวยการ' },
    { level: '3', position: 'หัวหน้างาน' },
    { level: '4', position: 'ครู' },
    { level: '5', position: 'เจ้าหน้าที่' },
    { level: '6', position: 'ผู้ดูแลระบบ' },
  ];

  for (const pos of positions) {
    const level = masterLevelRepo.create({
      level: pos.level,
      position: pos.position,
    });
    await masterLevelRepo.save(level);
  }

  console.log('สร้าง MasterLevel สำเร็จ');
}

async function seedMasterClassroom() {
  const masterClassroomRepo = AppDataSource.getRepository(MasterClassroom);
  if ((await masterClassroomRepo.count()) > 0) {
    console.log('MasterClassroom มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const classrooms = [
    { classLev: 'อนุบาล 1' },
    { classLev: 'อนุบาล 2' },
    { classLev: 'อนุบาล 3' },
    { classLev: 'ประถมศึกษาปีที่ 1' },
    { classLev: 'ประถมศึกษาปีที่ 2' },
    { classLev: 'ประถมศึกษาปีที่ 3' },
    { classLev: 'ประถมศึกษาปีที่ 4' },
    { classLev: 'ประถมศึกษาปีที่ 5' },
    { classLev: 'ประถมศึกษาปีที่ 6' },
    { classLev: 'มัธยมศึกษาปีที่ 1' },
    { classLev: 'มัธยมศึกษาปีที่ 2' },
    { classLev: 'มัธยมศึกษาปีที่ 3' },
    { classLev: 'มัธยมศึกษาปีที่ 4' },
    { classLev: 'มัธยมศึกษาปีที่ 5' },
    { classLev: 'มัธยมศึกษาปีที่ 6' },
    { classLev: 'ป.ว.ช. 1' },
    { classLev: 'ป.ว.ช. 2' },
    { classLev: 'ป.ว.ช. 3' },
  ];
  for (const classroom of classrooms) {
    await masterClassroomRepo.save(masterClassroomRepo.create(classroom));
  }
  console.log(`สร้าง MasterClassroom สำเร็จ (${classrooms.length} ชั้นเรียน)`);
}

async function seedBudgetIncomeType() {
  const budgetIncomeTypeRepo = AppDataSource.getRepository(BudgetIncomeType);

  const existing = await budgetIncomeTypeRepo.count();

  if (existing > 0) {
    console.log('BudgetIncomeType มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const budgetTypes = [
    {
      budgetType: 'เงินอุดหนุนทั่วไป',
      budgetTypeCalc: 1,
      budgetBorrowType: '2',
      spacialType: 0,
    },
    {
      budgetType: 'เงินอุดหนุนเฉพาะกิจ',
      budgetTypeCalc: 1,
      budgetBorrowType: '2',
      spacialType: 0,
    },
    {
      budgetType: 'เงินรายได้',
      budgetTypeCalc: 1,
      budgetBorrowType: '2',
      spacialType: 0,
    },
    {
      budgetType: 'เงินรายได้จากการขาย',
      budgetTypeCalc: 1,
      budgetBorrowType: '2',
      spacialType: 0,
    },
    {
      budgetType: 'เงินรายได้จากการให้บริการ',
      budgetTypeCalc: 1,
      budgetBorrowType: '2',
      spacialType: 0,
    },
    {
      budgetType: 'เงินรายได้จากการบริจาค',
      budgetTypeCalc: 1,
      budgetBorrowType: '2',
      spacialType: 0,
    },
    {
      budgetType: 'เงินรายได้จากดอกผล',
      budgetTypeCalc: 1,
      budgetBorrowType: '2',
      spacialType: 0,
    },
    {
      budgetType: 'เงินรายได้อื่นๆ',
      budgetTypeCalc: 1,
      budgetBorrowType: '2',
      spacialType: 0,
    },
    {
      budgetType: 'เงินกองทุน',
      budgetTypeCalc: 1,
      budgetBorrowType: '1',
      spacialType: 0,
    },
    {
      budgetType: 'เงินรายได้แผ่นดิน',
      budgetTypeCalc: 1,
      budgetBorrowType: '3',
      spacialType: 0,
    },
  ];

  for (const budgetType of budgetTypes) {
    const type = budgetIncomeTypeRepo.create({
      budgetType: budgetType.budgetType,
      budgetTypeCalc: budgetType.budgetTypeCalc,
      budgetBorrowType: budgetType.budgetBorrowType,
      spacialType: budgetType.spacialType,
      upBy: 1,
      del: 0,
      createDate: new Date(),
      updateDate: new Date(),
    });
    await budgetIncomeTypeRepo.save(type);
  }

  console.log(`สร้าง BudgetIncomeType สำเร็จ (${budgetTypes.length} ประเภท)`);
}

async function seedMasterBudgetCategory() {
  const masterBudgetCategoryRepo =
    AppDataSource.getRepository(MasterBudgetCategory);

  const existing = await masterBudgetCategoryRepo.count();

  if (existing > 0) {
    console.log('MasterBudgetCategory มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const categories = [
    { bgCateId: 1, budgetCate: 'งบพัฒนาคุณภาพการศึกษา', percents: 0.0 },
    { bgCateId: 2, budgetCate: 'งบบริหาร/งบดำเนินงาน', percents: 0.0 },
    {
      bgCateId: 3,
      budgetCate: 'งบประมาณที่มีวัตถุประสงค์เฉพาะ',
      percents: 0.0,
    },
    { bgCateId: 5, budgetCate: 'งบสำรองจ่าย', percents: 0.0 },
  ];

  for (const category of categories) {
    const cat = masterBudgetCategoryRepo.create({
      bgCateId: category.bgCateId,
      budgetCate: category.budgetCate,
      percents: category.percents,
    });
    await masterBudgetCategoryRepo.save(cat);
  }

  console.log(
    `สร้าง MasterBudgetCategory สำเร็จ (${categories.length} ประเภท)`,
  );
}

async function seedFinancialTransactions() {
  const financialTransactionsRepo = AppDataSource.getRepository(
    FinancialTransactions,
  );
  const budgetIncomeTypeRepo = AppDataSource.getRepository(BudgetIncomeType);
  const plnReceiveRepo = AppDataSource.getRepository(PlnReceive);
  const requestWithdrawRepo = AppDataSource.getRepository(RequestWithdraw);

  // ลบข้อมูลเก่าถ้ามี (เพื่อสร้างใหม่)
  const existing = await financialTransactionsRepo.count({
    where: { scId: 1 },
  });

  if (existing > 0) {
    console.log(
      `พบข้อมูล FinancialTransactions เก่า ${existing} รายการ กำลังลบ...`,
    );
    await financialTransactionsRepo.delete({ scId: 1 });
    console.log('ลบข้อมูลเก่าสำเร็จ');
  }

  // ดึงประเภทเงินทั้งหมด
  const budgetTypes = await budgetIncomeTypeRepo.find({
    where: { del: 0 },
    order: { bgTypeId: 'ASC' },
  });

  if (budgetTypes.length === 0) {
    console.log('ไม่พบประเภทเงิน กรุณา seed BudgetIncomeType ก่อน');
    return;
  }

  // ดึง PlnReceive และ RequestWithdraw ที่มีอยู่
  const receives = await plnReceiveRepo.find({
    where: { scId: 1, cfTransaction: 1, del: 0 },
  });
  const withdraws = await requestWithdrawRepo.find({
    where: { scId: 1, del: 0 },
  });

  const budgetTypeIds = budgetTypes.map((bt) => bt.bgTypeId);
  console.log(`ใช้ประเภทเงิน: ${budgetTypeIds.join(', ')}`);
  console.log(
    `พบ PlnReceive: ${receives.length} รายการ, RequestWithdraw: ${withdraws.length} รายการ`,
  );

  const scId = 1; // โรงเรียน ID
  const upBy = 1; // ผู้สร้างข้อมูล

  // สร้างข้อมูล 12 เดือน (ปี 2567-2568)
  // ปี 2567 = 2024 CE, ปี 2568 = 2025 CE
  // เริ่มจาก 1 ม.ค. 2567 (2024-01-01) ถึง 31 ธ.ค. 2568 (2025-12-31)
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2025-12-31');
  const daysToGenerate =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

  const transactions: FinancialTransactions[] = [];

  console.log(
    `กำลังสร้างข้อมูล ${daysToGenerate} วัน (${startDate.toISOString().split('T')[0]} ถึง ${endDate.toISOString().split('T')[0]})`,
  );

  for (let day = 0; day < daysToGenerate; day++) {
    const transactionDate = new Date(startDate);
    transactionDate.setDate(transactionDate.getDate() + day);

    // ข้ามวันหยุดสุดสัปดาห์ (เสาร์-อาทิตย์) บางวัน
    const dayOfWeek = transactionDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // วันหยุดมีโอกาส 30% ที่จะมีรายการ
      if (Math.random() > 0.3) {
        continue;
      }
    }

    // สุ่มจำนวนรายการต่อวัน (1-8 รายการ)
    const transactionsPerDay = Math.floor(Math.random() * 8) + 1;

    for (let i = 0; i < transactionsPerDay; i++) {
      // สุ่มประเภทเงิน (ครอบคลุมทุกประเภท)
      const bgTypeId =
        budgetTypeIds[Math.floor(Math.random() * budgetTypeIds.length)];

      // สุ่มประเภทรายการ (1 = รายรับ, -1 = รายจ่าย)
      // ให้รายรับมีโอกาส 45% และรายจ่าย 55%
      const type = Math.random() < 0.45 ? 1 : -1;

      // สุ่มจำนวนเงินตามประเภท
      // รายรับ: 5,000 - 200,000 บาท
      // รายจ่าย: 1,000 - 150,000 บาท
      const amount =
        type === 1
          ? Math.floor(Math.random() * 195000) + 5000
          : Math.floor(Math.random() * 149000) + 1000;

      // สร้างเวลาแบบสุ่มในวันนั้น
      const transactionTime = new Date(transactionDate);
      transactionTime.setHours(
        Math.floor(Math.random() * 8) + 8, // 8:00 - 16:00
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60),
      );

      // เชื่อมโยงกับ PlnReceive หรือ RequestWithdraw ที่มีอยู่
      let prId = 0;
      let prdId = 0;
      let rwId = 0;

      if (type === 1 && receives.length > 0) {
        // รายรับ - เชื่อมโยงกับ PlnReceive
        const receive = receives[Math.floor(Math.random() * receives.length)];
        prId = receive.prId;
        prdId = receive.prId; // Use prId as prdId for simplicity
      } else if (type === -1 && withdraws.length > 0) {
        // รายจ่าย - เชื่อมโยงกับ RequestWithdraw
        const withdraw =
          withdraws[Math.floor(Math.random() * withdraws.length)];
        rwId = withdraw.rwId;
      }

      const transaction = financialTransactionsRepo.create({
        type,
        bgTypeId,
        amount,
        scId,
        upBy,
        prId,
        prdId,
        rwId,
        prbId: 0,
        del: '0',
        createDate: transactionTime,
        updateDate: transactionTime,
      });

      transactions.push(transaction);
    }

    // แสดงความคืบหน้า
    if ((day + 1) % 30 === 0) {
      console.log(
        `สร้างข้อมูลแล้ว ${day + 1}/${daysToGenerate} วัน (${transactions.length} รายการ)`,
      );
    }
  }

  // บันทึกข้อมูลทีละ batch (500 รายการต่อครั้ง)
  const batchSize = 500;
  const totalBatches = Math.ceil(transactions.length / batchSize);
  console.log(
    `กำลังบันทึกข้อมูล ${transactions.length} รายการ (${totalBatches} batches)...`,
  );

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    await financialTransactionsRepo.save(batch);
    const currentBatch = Math.floor(i / batchSize) + 1;
    console.log(
      `บันทึก FinancialTransactions batch ${currentBatch}/${totalBatches} (${batch.length} รายการ)`,
    );
  }

  // สรุปข้อมูล
  const incomeCount = transactions.filter((t) => t.type === 1).length;
  const expenseCount = transactions.filter((t) => t.type === -1).length;
  const totalIncome = transactions
    .filter((t) => t.type === 1)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === -1)
    .reduce((sum, t) => sum + t.amount, 0);

  console.log(`สร้าง FinancialTransactions สำเร็จ!`);
  console.log(`  - จำนวนรายการทั้งหมด: ${transactions.length} รายการ`);
  console.log(
    `  - รายรับ: ${incomeCount} รายการ (รวม ${totalIncome.toLocaleString('th-TH')} บาท)`,
  );
  console.log(
    `  - รายจ่าย: ${expenseCount} รายการ (รวม ${totalExpense.toLocaleString('th-TH')} บาท)`,
  );
  console.log(
    `  - ยอดคงเหลือ: ${(totalIncome - totalExpense).toLocaleString('th-TH')} บาท`,
  );
  console.log(`  - ครอบคลุม ${budgetTypeIds.length} ประเภทเงิน`);
}

async function seedPartner() {
  const partnerRepo = AppDataSource.getRepository(Partner);
  const existing = await partnerRepo.count({ where: { scId: 1 } });
  if (existing > 0) {
    console.log('Partner มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const partners = [
    {
      pName: 'บริษัท ABC จำกัด',
      pType: 2,
      payType: 2,
      pIdTax: '0123456789012',
    },
    { pName: 'นายสมชาย ใจดี', pType: 1, payType: 1, pIdTax: '1234567890123' },
    {
      pName: 'ห้างหุ้นส่วน XYZ',
      pType: 2,
      payType: 2,
      pIdTax: '2345678901234',
    },
    { pName: 'นางสมหญิง รักดี', pType: 1, payType: 1, pIdTax: '3456789012345' },
    {
      pName: 'บริษัท DEF จำกัด',
      pType: 2,
      payType: 2,
      pIdTax: '4567890123456',
    },
  ];

  for (const p of partners) {
    const partner = partnerRepo.create({
      ...p,
      scId: 1,
      upBy: 1,
      del: 0,
    });
    await partnerRepo.save(partner);
  }
  console.log(`สร้าง Partner สำเร็จ (${partners.length} รายการ)`);
}

async function seedBankDb() {
  const bankDbRepo = AppDataSource.getRepository(BankDb);
  const existing = await bankDbRepo.count();
  if (existing > 0) {
    console.log('BankDb มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const banks = [
    { bNameL: 'ธนาคารกรุงเทพ', bNameS: 'BKK' },
    { bNameL: 'ธนาคารกสิกรไทย', bNameS: 'KBANK' },
    { bNameL: 'ธนาคารไทยพาณิชย์', bNameS: 'SCB' },
    { bNameL: 'ธนาคารกรุงไทย', bNameS: 'KTB' },
  ];

  for (const bank of banks) {
    const bankDb = bankDbRepo.create(bank);
    await bankDbRepo.save(bankDb);
  }
  console.log(`สร้าง BankDb สำเร็จ (${banks.length} รายการ)`);
}

async function seedBankAccount() {
  const bankAccountRepo = AppDataSource.getRepository(BankAccount);
  const bankDbRepo = AppDataSource.getRepository(BankDb);
  const existing = await bankAccountRepo.count({ where: { scId: 1 } });
  if (existing > 0) {
    console.log('BankAccount มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const banks = await bankDbRepo.find();
  if (banks.length === 0) {
    console.log('ไม่พบ BankDb กรุณา seed BankDb ก่อน');
    return;
  }

  const accounts = [
    { baName: 'บัญชีออมทรัพย์', baNo: '123-456-7890', bId: banks[0].bId },
    { baName: 'บัญชีกระแสรายวัน', baNo: '234-567-8901', bId: banks[1].bId },
  ];

  for (const acc of accounts) {
    const account = bankAccountRepo.create({
      ...acc,
      scId: 1,
      upBy: 1,
      del: 0,
    });
    await bankAccountRepo.save(account);
  }
  console.log(`สร้าง BankAccount สำเร็จ (${accounts.length} รายการ)`);
}

async function seedBudgetIncomeTypeSchool() {
  const budgetIncomeTypeSchoolRepo = AppDataSource.getRepository(
    BudgetIncomeTypeSchool,
  );
  const bankAccountRepo = AppDataSource.getRepository(BankAccount);
  const budgetIncomeTypeRepo = AppDataSource.getRepository(BudgetIncomeType);

  const existing = await budgetIncomeTypeSchoolRepo.count({
    where: { scId: 1 },
  });
  if (existing > 0) {
    console.log('BudgetIncomeTypeSchool มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const bankAccounts = await bankAccountRepo.find({
    where: { scId: 1, del: 0 },
  });
  const budgetTypes = await budgetIncomeTypeRepo.find({ where: { del: 0 } });

  if (bankAccounts.length === 0 || budgetTypes.length === 0) {
    console.log('ไม่พบ BankAccount หรือ BudgetIncomeType');
    return;
  }

  // ผูกประเภทเงินกับบัญชีธนาคาร (แต่ละบัญชีมี 3-5 ประเภทเงิน)
  let bindingCount = 0;
  for (const bankAccount of bankAccounts) {
    const typesToBind = budgetTypes.slice(0, Math.min(5, budgetTypes.length));
    for (const budgetType of typesToBind) {
      const binding = budgetIncomeTypeSchoolRepo.create({
        scId: 1,
        baId: bankAccount.baId,
        bgTypeId: budgetType.bgTypeId,
        upBy: 1,
        del: 0,
      });
      await budgetIncomeTypeSchoolRepo.save(binding);
      bindingCount++;
    }
  }
  console.log(`สร้าง BudgetIncomeTypeSchool สำเร็จ (${bindingCount} รายการ)`);
}

async function seedPlnReceive() {
  const plnReceiveRepo = AppDataSource.getRepository(PlnReceive);
  const plnReceiveDetailRepo = AppDataSource.getRepository(PlnReceiveDetail);
  const budgetIncomeTypeRepo = AppDataSource.getRepository(BudgetIncomeType);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  const existing = await plnReceiveRepo.count({ where: { scId: 1 } });
  if (existing > 0) {
    console.log('PlnReceive มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const budgetTypes = await budgetIncomeTypeRepo.find({ where: { del: 0 } });
  const schoolYears = await schoolYearRepo.find({
    where: { del: 0 },
    order: { syYear: 'DESC' },
    take: 1,
  });
  const syId = schoolYears.length > 0 ? schoolYears[0].syId : 1;
  const year = schoolYears.length > 0 ? String(schoolYears[0].syYear) : '2567';

  // สร้าง 20 รายการรับเงิน
  for (let i = 1; i <= 20; i++) {
    const receiveDate = new Date(
      2024,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    );
    const receiveMoneyType = [1, 2, 3][Math.floor(Math.random() * 3)]; // 1=เช็ค, 2=เงินสด, 3=เงินฝากธนาคาร
    const bgTypeId =
      budgetTypes[Math.floor(Math.random() * budgetTypes.length)].bgTypeId;

    const receive = plnReceiveRepo.create({
      prNo: `PR-${String(i).padStart(6, '0')}`,
      scId: 1,
      syId,
      budgetYear: year,
      receiveForm: `แบบฟอร์มรับเงิน ${i}`,
      userReceive: 1,
      receiveMoneyType,
      receiveDate,
      cfTransaction: 1, // ยืนยันแล้ว
      upBy: 1,
      del: 0,
    });
    const savedReceive = await plnReceiveRepo.save(receive);

    // สร้าง detail
    const detail = plnReceiveDetailRepo.create({
      prId: savedReceive.prId,
      bgTypeId,
      prdDetail: `รายละเอียดการรับเงิน ${i}`,
      prdBudget: Math.floor(Math.random() * 50000) + 10000,
      upBy: 1,
      del: 0,
    });
    await plnReceiveDetailRepo.save(detail);
  }
  console.log('สร้าง PlnReceive สำเร็จ (20 รายการ)');
}

async function seedReceipt() {
  const receiptRepo = AppDataSource.getRepository(Receipt);
  const plnReceiveRepo = AppDataSource.getRepository(PlnReceive);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  const existing = await receiptRepo.count({ where: { scId: 1 } });
  if (existing > 0) {
    console.log('Receipt มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const receives = await plnReceiveRepo.find({
    where: { scId: 1, cfTransaction: 1, del: 0 },
    take: 15,
  });
  const schoolYears = await schoolYearRepo.find({
    where: { del: 0 },
    order: { syYear: 'DESC' },
    take: 1,
  });
  const syId = schoolYears.length > 0 ? schoolYears[0].syId : 1;
  const year = schoolYears.length > 0 ? String(schoolYears[0].syYear) : '2567';

  for (let i = 0; i < receives.length; i++) {
    const receive = receives[i];
    const receipt = receiptRepo.create({
      rNo: `R-${String(i + 1).padStart(6, '0')}`,
      detail: `ใบเสร็จรับเงินสำหรับ ${receive.prNo}`,
      prId: String(receive.prId),
      dateGenerate: receive.receiveDate || new Date(),
      status: '1',
      syId,
      year,
      scId: 1,
      upBy: 1,
    });
    await receiptRepo.save(receipt);
  }
  console.log(`สร้าง Receipt สำเร็จ (${receives.length} รายการ)`);
}

async function seedRequestWithdraw() {
  const requestWithdrawRepo = AppDataSource.getRepository(RequestWithdraw);
  const partnerRepo = AppDataSource.getRepository(Partner);
  const budgetIncomeTypeRepo = AppDataSource.getRepository(BudgetIncomeType);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  const existing = await requestWithdrawRepo.count({ where: { scId: 1 } });
  if (existing > 0) {
    console.log('RequestWithdraw มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const partners = await partnerRepo.find({ where: { scId: 1, del: 0 } });
  const budgetTypes = await budgetIncomeTypeRepo.find({ where: { del: 0 } });
  const schoolYears = await schoolYearRepo.find({
    where: { del: 0 },
    order: { syYear: 'DESC' },
    take: 1,
  });
  const syId = schoolYears.length > 0 ? schoolYears[0].syId : 1;
  const year = schoolYears.length > 0 ? String(schoolYears[0].syYear) : '2567';

  // สร้าง 30 รายการขอเบิก
  for (let i = 1; i <= 30; i++) {
    const dateRequest = new Date(
      2024,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    );
    const partner = partners[Math.floor(Math.random() * partners.length)];
    const budgetType =
      budgetTypes[Math.floor(Math.random() * budgetTypes.length)];
    const amount = Math.floor(Math.random() * 100000) + 5000;

    // สุ่ม status: 100, 102, 200, 201, 202
    const statusOptions = [100, 102, 200, 201, 202];
    const status =
      statusOptions[Math.floor(Math.random() * statusOptions.length)];

    const requestWithdraw = requestWithdrawRepo.create({
      scId: 1,
      noDoc: `DOC-${String(i).padStart(6, '0')}`,
      paymentType: [1, 2, 3][Math.floor(Math.random() * 3)],
      bgTypeId: budgetType.bgTypeId,
      rwType: [1, 2, 3, 4][Math.floor(Math.random() * 4)],
      pId: partner.pId,
      detail: `รายละเอียดการขอเบิก ${i}`,
      amount,
      certificatePayment: [1, 2, 3][Math.floor(Math.random() * 3)], // 1=บค, 2=บจ, 3=อื่นๆ
      dateRequest,
      userRequestHead: 1,
      userRequest: 1,
      userOfferCheck: status >= 200 ? 1 : 0,
      offerCheckDate:
        status >= 200
          ? new Date(dateRequest.getTime() + 7 * 24 * 60 * 60 * 1000)
          : null,
      checkNoDoc: status >= 200 ? `CHK-${String(i).padStart(6, '0')}` : null,
      typeOfferCheck: status >= 200 ? [1, 2][Math.floor(Math.random() * 2)] : 0,
      status,
      syId,
      year,
      upBy: 1,
      del: 0,
    });
    await requestWithdrawRepo.save(requestWithdraw);
  }
  console.log('สร้าง RequestWithdraw สำเร็จ (30 รายการ)');
}

async function seedWithholdingCertificate() {
  const withholdingCertificateRepo = AppDataSource.getRepository(
    WithholdingCertificate,
  );
  const requestWithdrawRepo = AppDataSource.getRepository(RequestWithdraw);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  const existing = await withholdingCertificateRepo.count({
    where: { scId: 1 },
  });
  if (existing > 0) {
    console.log('WithholdingCertificate มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }

  const withdraws = await requestWithdrawRepo.find({
    where: { scId: 1, del: 0, status: 200 }, // ใช้เฉพาะที่อนุมัติแล้ว
    take: 20,
  });
  const schoolYears = await schoolYearRepo.find({
    where: { del: 0 },
    order: { syYear: 'DESC' },
    take: 1,
  });
  const syId = schoolYears.length > 0 ? schoolYears[0].syId : 1;
  const year = schoolYears.length > 0 ? String(schoolYears[0].syYear) : '2567';

  for (let i = 0; i < withdraws.length; i++) {
    const withdraw = withdraws[i];
    const certDate =
      withdraw.offerCheckDate || withdraw.dateRequest || new Date();
    const certificate = withholdingCertificateRepo.create({
      wcNo: `WC-${String(i + 1).padStart(6, '0')}`,
      ofId: withdraw.rwId,
      scId: 1,
      wcRank: i + 1,
      cerDate: certDate,
      syId,
      year,
      status: 101, // ออกหนังสือรับรองแล้ว
      del: 0,
      upBy: 1,
    });
    await withholdingCertificateRepo.save(certificate);
  }
  console.log(
    `สร้าง WithholdingCertificate สำเร็จ (${withdraws.length} รายการ)`,
  );
}

// ---------------------------------------------------------------------------
// Mock / stress-volume seeds (ประมาณ 1000+ แถว/ตาราง)
// ถ้าตารางมีข้อมูลเกิน MOCK_THRESHOLD อยู่แล้ว จะข้ามการสร้าง (idempotent)
// ---------------------------------------------------------------------------

const MOCK_STUDENT_ROWS = 1500;
const MOCK_PROJECT_ROWS = 1500;
const MOCK_PROJ_APPROVE_ROWS = 1500;
const MOCK_SUPPLIES_ROWS = 1200;
const MOCK_TRANS_SUPPLIES_ROWS = 1500;
const MOCK_REQUEST_WITHDRAW_ROWS = 1200;
const MOCK_THRESHOLD = 1000;
const INSERT_CHUNK = 500;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDateWithin(daysBack: number): Date {
  const now = Date.now();
  const delta = Math.floor(Math.random() * daysBack) * 24 * 60 * 60 * 1000;
  return new Date(now - delta);
}

async function saveInChunks<T>(
  repo: { save: (entities: T[]) => Promise<T[]> },
  rows: T[],
  label: string,
): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    await repo.save(chunk);
    console.log(
      `  ${label}: บันทึก ${Math.min(i + INSERT_CHUNK, rows.length)} / ${rows.length}`,
    );
  }
}

async function seedMockStudents() {
  const studentRepo = AppDataSource.getRepository(Student);
  const classroomRepo = AppDataSource.getRepository(MasterClassroom);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  const existing = await studentRepo.count({ where: { scId: 1 } });
  if (existing >= MOCK_THRESHOLD) {
    console.log(
      `Student มี ${existing} แถว (>= ${MOCK_THRESHOLD}) ข้ามการสร้าง mock`,
    );
    return;
  }

  const classrooms = await classroomRepo.find();
  const schoolYears = await schoolYearRepo.find({ where: { del: 0 } });
  const syId = schoolYears[0]?.syId ?? 1;
  const budgetYears = ['2566', '2567', '2568', '2569'];

  if (classrooms.length === 0) {
    console.log('ไม่มี MasterClassroom ข้าม seedMockStudents');
    return;
  }

  const rows: Student[] = [];
  for (let i = 0; i < MOCK_STUDENT_ROWS; i++) {
    const classroom = randPick(classrooms);
    rows.push(
      studentRepo.create({
        scId: 1,
        syId: randPick(schoolYears)?.syId ?? syId,
        budgetYear: randPick(budgetYears),
        classId: classroom.classId,
        stCount: randInt(15, 45),
        upBy: 1,
        del: 0,
      }),
    );
  }
  await saveInChunks(studentRepo, rows, 'Student');
  console.log(`สร้าง Student mock สำเร็จ (${rows.length} แถว)`);
}

async function seedMockProjects() {
  const projectRepo = AppDataSource.getRepository(Project);
  const categoryRepo = AppDataSource.getRepository(MasterBudgetCategory);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  const existing = await projectRepo.count({ where: { scId: 1 } });
  if (existing >= MOCK_THRESHOLD) {
    console.log(
      `Project มี ${existing} แถว (>= ${MOCK_THRESHOLD}) ข้ามการสร้าง mock`,
    );
    return;
  }

  const categories = await categoryRepo.find();
  const schoolYears = await schoolYearRepo.find({ where: { del: 0 } });
  const syId = schoolYears[0]?.syId ?? 1;

  const projectThemes = [
    'พัฒนาทักษะ',
    'ส่งเสริมคุณธรรม',
    'ปรับปรุงอาคาร',
    'จัดซื้อครุภัณฑ์',
    'อบรมครู',
    'กิจกรรมวันสำคัญ',
    'แข่งขันวิชาการ',
    'ทัศนศึกษา',
    'ห้องสมุดดิจิทัล',
    'กีฬาภายใน',
    'เสริมการเรียนรู้',
    'STEM ศึกษา',
    'โภชนาการ',
    'สุขภาพนักเรียน',
    'ดนตรีไทย',
    'ภาษาอังกฤษ',
    'คอมพิวเตอร์',
    'จริยธรรม',
    'อาชีพ',
    'ศิลปะ',
  ];
  const projectTargets = [
    'ระดับอนุบาล',
    'ระดับประถม',
    'ระดับมัธยมต้น',
    'ระดับมัธยมปลาย',
    'ทุกระดับ',
    'ครูและบุคลากร',
  ];

  const rows: Project[] = [];
  for (let i = 1; i <= MOCK_PROJECT_ROWS; i++) {
    rows.push(
      projectRepo.create({
        projName: `โครงการ${randPick(projectThemes)}สำหรับ${randPick(projectTargets)} ครั้งที่ ${i}`,
        projDetail: `รายละเอียดโครงการที่ ${i} — วัตถุประสงค์เพื่อพัฒนาและส่งเสริมผู้เรียนตามนโยบายของสถานศึกษา`,
        projBudget: randInt(10000, 500000),
        pbcId: categories.length > 0 ? randPick(categories).bgCateId : null,
        scId: 1,
        syId: randPick(schoolYears)?.syId ?? syId,
        upBy: 1,
        projStatus: randPick([0, 1, 2, 3]),
        del: 0,
      }),
    );
  }
  await saveInChunks(projectRepo, rows, 'Project');
  console.log(`สร้าง Project mock สำเร็จ (${rows.length} แถว)`);
}

async function seedMockProjectApprovals() {
  const approveRepo = AppDataSource.getRepository(PlnProjApprove);
  const projectRepo = AppDataSource.getRepository(Project);

  const existing = await approveRepo.count({ where: { scId: 1 } });
  if (existing >= MOCK_THRESHOLD) {
    console.log(
      `PlnProjApprove มี ${existing} แถว (>= ${MOCK_THRESHOLD}) ข้ามการสร้าง mock`,
    );
    return;
  }

  const projects = await projectRepo.find({
    where: { scId: 1, del: 0 },
    take: MOCK_PROJ_APPROVE_ROWS,
  });
  if (projects.length === 0) {
    console.log('ไม่มี Project ข้าม seedMockProjectApprovals');
    return;
  }

  const resources = [
    'เงินอุดหนุน',
    'เงินรายได้สถานศึกษา',
    'เงินนอกงบประมาณ',
    'เงินบริจาค',
  ];
  const committees = [
    'นายสมชาย ใจดี',
    'นางสาวสุภาพร มั่นคง',
    'นายวิทยา พัฒนา',
    'นางสมจิตร เรืองฤทธิ์',
    'นายพงษ์ศักดิ์ สายใจ',
    'นางมะลิวัลย์ ศรีสุข',
  ];

  const rows: PlnProjApprove[] = [];
  const year = new Date().getFullYear();
  for (let i = 0; i < MOCK_PROJ_APPROVE_ROWS; i++) {
    const proj = projects[i % projects.length];
    const total = randInt(20000, 300000);
    const used = randInt(0, total);
    const operate = randDateWithin(365);
    const buy = randDateWithin(330);
    rows.push(
      approveRepo.create({
        scId: 1,
        acadYear: year,
        projId: proj.projId,
        numbers: randInt(1, 50),
        details: `รายละเอียดการอนุมัติโครงการที่ ${i + 1}`,
        resources: randPick(resources),
        totalBudgets: total,
        budgets: used,
        remaindBudgets: total - used,
        operateDate: operate,
        jobType: randPick([1, 2, 3]),
        noteNumber: randInt(1, 9999),
        buyDate: buy,
        buyReason: `เหตุผลการจัดซื้อจัดจ้าง ${i + 1}`,
        departments: randPick([1, 2, 3, 4]),
        dueDate: randInt(7, 90),
        committee1: randPick(committees),
        committee2: randPick(committees),
        committee3: randPick(committees),
        bookOrderCommittee: `ศธ-${String(i + 1).padStart(5, '0')}`,
        dateOrderCommittee: operate,
        bookReportNumber: `RPT-${String(i + 1).padStart(5, '0')}`,
        dateBookReport: buy.toISOString().slice(0, 10),
        suppliers: randInt(1, 9999),
        presentCost: used,
        dateWin: buy,
        numberOrders: `PO-${String(i + 1).padStart(5, '0')}`,
        ordersDate: buy,
        dueOrdersDate: randInt(7, 60),
        overDueDate: new Date(buy.getTime() + 60 * 86400000),
        proveDate: new Date(buy.getTime() + 30 * 86400000),
        numberReportWiddraw: `RW-${String(i + 1).padStart(5, '0')}`,
        dateReportWiddraw: new Date(buy.getTime() + 45 * 86400000),
        del: 0,
        upBy: 1,
      }),
    );
  }
  await saveInChunks(approveRepo, rows, 'PlnProjApprove');
  console.log(`สร้าง PlnProjApprove mock สำเร็จ (${rows.length} แถว)`);
}

async function seedMockSupplies() {
  const suppliesRepo = AppDataSource.getRepository(Supplies);

  const existing = await suppliesRepo.count({ where: { scId: 1 } });
  if (existing >= MOCK_THRESHOLD) {
    console.log(
      `Supplies มี ${existing} แถว (>= ${MOCK_THRESHOLD}) ข้ามการสร้าง mock`,
    );
    return;
  }

  const itemNames = [
    'กระดาษ A4',
    'ปากกาลูกลื่นสีน้ำเงิน',
    'ปากกาเมจิก',
    'ดินสอ HB',
    'ยางลบ',
    'ไม้บรรทัด 30 ซม.',
    'แฟ้มเอกสาร',
    'กระดาษกาว',
    'กระดาษโน้ต',
    'ลวดเย็บกระดาษ',
    'เครื่องเย็บกระดาษ',
    'แผ่น CD',
    'เม้าส์คอมพิวเตอร์',
    'คีย์บอร์ด USB',
    'หมึกพิมพ์',
    'หมึกเติม',
    'ถ่านอัลคาไลน์ AA',
    'ถังขยะ',
    'ไม้กวาด',
    'น้ำยาล้างห้องน้ำ',
    'ผงซักฟอก',
    'น้ำยาฆ่าเชื้อ',
    'ผ้าเช็ดอเนกประสงค์',
    'ถุงมือยาง',
    'แอลกอฮอล์ 75%',
  ];
  const units = [1, 2, 3, 4, 5]; // หน่วยนับ: กล่อง/ชิ้น/แพ็ค/โหล/รีม

  const rows: Supplies[] = [];
  for (let i = 1; i <= MOCK_SUPPLIES_ROWS; i++) {
    const base = randPick(itemNames);
    rows.push(
      suppliesRepo.create({
        suppNo: `S${String(i).padStart(6, '0')}`,
        suppName: `${base} รุ่น ${randInt(100, 999)}`,
        suppPrice: randInt(10, 5000),
        tsId: randInt(1, 5),
        unId: randPick(units),
        suppDetail: `รายละเอียดวัสดุ ${base}`,
        suppAddress: `ชั้นเก็บของหมายเลข ${randInt(1, 50)}`,
        suppCapMax: randInt(50, 500),
        suppCapMin: randInt(0, 20),
        scId: 1,
        upBy: 1,
        del: 0,
      }),
    );
  }
  await saveInChunks(suppliesRepo, rows, 'Supplies');
  console.log(`สร้าง Supplies mock สำเร็จ (${rows.length} แถว)`);
}

async function seedMockSupplieTransactions() {
  const transRepo = AppDataSource.getRepository(TransactionSupplies);
  const suppliesRepo = AppDataSource.getRepository(Supplies);

  const existing = await transRepo.count();
  if (existing >= MOCK_THRESHOLD) {
    console.log(
      `TransactionSupplies มี ${existing} แถว (>= ${MOCK_THRESHOLD}) ข้ามการสร้าง mock`,
    );
    return;
  }

  const supplies = await suppliesRepo.find({
    where: { scId: 1, del: 0 },
    take: 2000,
  });
  if (supplies.length === 0) {
    console.log('ไม่มี Supplies ข้าม seedMockSupplieTransactions');
    return;
  }

  const comments = ['รับเข้าคลัง', 'เบิกใช้', 'โอนย้าย', 'ปรับยอด', 'ตรวจนับ'];
  const rows: TransactionSupplies[] = [];
  for (let i = 0; i < MOCK_TRANS_SUPPLIES_ROWS; i++) {
    const supp = randPick(supplies);
    const isIn = Math.random() < 0.5;
    const qty = randInt(1, 100);
    rows.push(
      transRepo.create({
        suppId: supp.suppId,
        transIn: isIn ? qty : 0,
        transOut: isIn ? 0 : qty,
        transBalance: randInt(0, 500),
        transComment: randPick(comments),
        upBy: 1,
        del: 0,
      }),
    );
  }
  await saveInChunks(transRepo, rows, 'TransactionSupplies');
  console.log(`สร้าง TransactionSupplies mock สำเร็จ (${rows.length} แถว)`);
}

async function seedMockRequestWithdraw() {
  const requestRepo = AppDataSource.getRepository(RequestWithdraw);
  const partnerRepo = AppDataSource.getRepository(Partner);
  const budgetTypeRepo = AppDataSource.getRepository(BudgetIncomeType);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  const existing = await requestRepo.count({ where: { scId: 1 } });
  if (existing >= MOCK_THRESHOLD) {
    console.log(
      `RequestWithdraw มี ${existing} แถว (>= ${MOCK_THRESHOLD}) ข้ามการสร้าง mock`,
    );
    return;
  }

  const partners = await partnerRepo.find({ where: { scId: 1, del: 0 } });
  const budgetTypes = await budgetTypeRepo.find({ where: { del: 0 } });
  const schoolYears = await schoolYearRepo.find({
    where: { del: 0 },
    order: { syYear: 'DESC' },
    take: 1,
  });
  const syId = schoolYears[0]?.syId ?? 1;
  const year = schoolYears[0] ? String(schoolYears[0].syYear) : '2567';

  if (partners.length === 0 || budgetTypes.length === 0) {
    console.log(
      'ข้าม seedMockRequestWithdraw: ต้องการ Partner และ BudgetIncomeType',
    );
    return;
  }

  const statusOptions = [0, 100, 101, 102, 200, 201, 202];
  const rows: RequestWithdraw[] = [];
  const startSeq = existing + 1;
  for (let i = 0; i < MOCK_REQUEST_WITHDRAW_ROWS; i++) {
    const seq = startSeq + i;
    const partner = randPick(partners);
    const budgetType = randPick(budgetTypes);
    const amount = randInt(5000, 200000);
    const status = randPick(statusOptions);
    const dateRequest = randDateWithin(365);

    rows.push(
      requestRepo.create({
        scId: 1,
        noDoc: `DOC-${String(seq).padStart(6, '0')}`,
        paymentType: randPick([1, 2, 3]),
        bgTypeId: budgetType.bgTypeId,
        rwType: randPick([1, 2, 3, 4]),
        pId: partner.pId,
        detail: `รายการขอเบิก mock ที่ ${seq}`,
        amount,
        certificatePayment: randPick([1, 2]),
        dateRequest,
        userRequestHead: 1,
        userRequest: 1,
        userOfferCheck: status >= 200 ? 1 : 0,
        offerCheckDate:
          status >= 200
            ? new Date(dateRequest.getTime() + 7 * 86400000)
            : null,
        checkNoDoc: status >= 200 ? `CHK-${String(seq).padStart(6, '0')}` : null,
        typeOfferCheck: status >= 200 ? randPick([1, 2]) : 0,
        status,
        syId,
        year,
        upBy: 1,
        del: 0,
      }),
    );
  }
  await saveInChunks(requestRepo, rows, 'RequestWithdraw');
  console.log(`สร้าง RequestWithdraw mock สำเร็จ (${rows.length} แถว)`);
}

// ============================================================
// ตารางที่เพิ่มใหม่ — 15 ตาราง
// ============================================================

async function seedTypeSupplies() {
  const repo = AppDataSource.getRepository(TypeSupplies);
  if ((await repo.count()) > 0) {
    console.log('TypeSupplies มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const types = [
    'วัสดุสำนักงาน',
    'วัสดุคอมพิวเตอร์และเทคโนโลยี',
    'วัสดุทำความสะอาด',
    'วัสดุไฟฟ้าและช่าง',
    'วัสดุก่อสร้างและตกแต่ง',
    'วัสดุการเรียนการสอน',
    'วัสดุงานบ้านและครัว',
    'วัสดุกีฬาและนันทนาการ',
    'วัสดุศิลปะและดนตรี',
    'วัสดุงานพยาบาล',
  ];
  for (const tsName of types) {
    await repo.save(repo.create({ tsName, scId: 1, del: 0, upBy: 1 }));
  }
  console.log(`สร้าง TypeSupplies สำเร็จ (${types.length} ประเภท)`);
}

async function seedUnit() {
  const repo = AppDataSource.getRepository(Unit);
  if ((await repo.count()) > 0) {
    console.log('Unit มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const units = [
    'กล่อง', 'ชิ้น', 'แพ็ค', 'โหล', 'รีม',
    'อัน', 'แผ่น', 'ขวด', 'ถุง', 'ม้วน',
    'กระป๋อง', 'หลอด', 'ชุด', 'เล่ม', 'คู่',
  ];
  for (const unName of units) {
    await repo.save(repo.create({ unName, scId: 1, uStatus: 1, upBy: 1 }));
  }
  console.log(`สร้าง Unit สำเร็จ (${units.length} หน่วย)`);
}

async function seedMasterObecPolicy() {
  const repo = AppDataSource.getRepository(MasterObecPolicy);
  if ((await repo.count()) > 0) {
    console.log('MasterObecPolicy มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const policies = [
    { obecPolicy: 'นโยบายด้านความปลอดภัย สพฐ.', detail: 'โรงเรียนต้องจัดให้มีมาตรการรักษาความปลอดภัยของนักเรียน ครู และบุคลากรอย่างเข้มแข็ง' },
    { obecPolicy: 'นโยบายการศึกษาเพื่อพัฒนาทักษะอาชีพ', detail: 'ส่งเสริมการเรียนการสอนที่เชื่อมโยงกับทักษะวิชาชีพและการทำงานในศตวรรษที่ 21' },
    { obecPolicy: 'นโยบายลดภาระครูและบุคลากรทางการศึกษา', detail: 'ลดงานด้านเอกสาร เพิ่มเวลาสอน นำเทคโนโลยีมาใช้บริหารจัดการ' },
    { obecPolicy: 'นโยบายพัฒนาคุณภาพผู้เรียน', detail: 'พัฒนาผลสัมฤทธิ์ทางการเรียน ส่งเสริมศักยภาพนักเรียนรายบุคคล' },
    { obecPolicy: 'นโยบายพัฒนาสมรรถนะครูและบุคลากร', detail: 'ส่งเสริมการพัฒนาวิชาชีพครู จัดอบรมประจำปีอย่างต่อเนื่อง' },
    { obecPolicy: 'นโยบายการสร้างโอกาสทางการศึกษา', detail: 'จัดการศึกษาให้ทั่วถึง เท่าเทียม ลดความเหลื่อมล้ำ' },
    { obecPolicy: 'นโยบายด้านการบริหารงบประมาณโปร่งใส', detail: 'การใช้งบประมาณต้องโปร่งใส ตรวจสอบได้ เน้นประสิทธิผลและประสิทธิภาพ' },
    { obecPolicy: 'นโยบายส่งเสริมสุขภาวะนักเรียน', detail: 'ดูแลสุขภาพกาย สุขภาพจิต และโภชนาการของนักเรียน' },
  ];
  for (const p of policies) {
    await repo.save(repo.create({ ...p, upBy: 1, del: 0 }));
  }
  console.log(`สร้าง MasterObecPolicy สำเร็จ (${policies.length} นโยบาย)`);
}

async function seedMasterScPolicy() {
  const repo = AppDataSource.getRepository(MasterScPolicy);
  if ((await repo.count({ where: { scId: 1 } })) > 0) {
    console.log('MasterScPolicy มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const policies = [
    'มุ่งพัฒนาผู้เรียนให้มีคุณภาพตามมาตรฐานการศึกษาชาติ',
    'ส่งเสริมการบริหารจัดการโรงเรียนตามหลักธรรมาภิบาล',
    'พัฒนาแหล่งเรียนรู้และสภาพแวดล้อมที่เอื้อต่อการเรียนรู้',
    'ส่งเสริมการมีส่วนร่วมของชุมชนในการพัฒนาโรงเรียน',
    'นำเทคโนโลยีมาใช้ในการบริหารและการจัดการเรียนการสอน',
    'พัฒนาครูและบุคลากรอย่างต่อเนื่องและเป็นระบบ',
  ];
  for (const scPolicy of policies) {
    await repo.save(repo.create({ scPolicy, scId: 1, del: 0, upBy: 1 }));
  }
  console.log(`สร้าง MasterScPolicy สำเร็จ (${policies.length} นโยบาย)`);
}

async function seedTbEstimateAcadyear() {
  const repo = AppDataSource.getRepository(TbEstimateAcadyear);
  const budgetTypeRepo = AppDataSource.getRepository(BudgetIncomeType);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  if ((await repo.count({ where: { scId: 1 } })) > 0) {
    console.log('TbEstimateAcadyear มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const budgetTypes = await budgetTypeRepo.find({ where: { del: 0 } });
  const schoolYears = await schoolYearRepo.find({ where: { del: 0 }, order: { syYear: 'DESC' }, take: 2 });
  if (!budgetTypes.length || !schoolYears.length) return;

  const budgetAmounts: Record<string, number> = {
    'เงินอุดหนุนทั่วไป': 1200000,
    'เงินอุดหนุนเฉพาะกิจ': 800000,
    'เงินรายได้': 350000,
    'เงินรายได้จากการขาย': 80000,
    'เงินรายได้จากการให้บริการ': 60000,
    'เงินรายได้จากการบริจาค': 150000,
    'เงินรายได้จากดอกผล': 25000,
    'เงินรายได้อื่นๆ': 45000,
    'เงินกองทุน': 200000,
    'เงินรายได้แผ่นดิน': 500000,
  };

  let count = 0;
  for (const sy of schoolYears) {
    for (const bt of budgetTypes) {
      const ea = budgetAmounts[bt.budgetType] ?? randInt(50000, 500000);
      await repo.save(repo.create({
        scId: 1,
        syId: sy.syId,
        budgetYear: String(sy.syYear),
        eaBudget: ea,
        realBudget: Math.floor(ea * (0.7 + Math.random() * 0.4)),
        eaStatus: 1,
        del: 0,
        upBy: 1,
      }));
      count++;
    }
  }
  console.log(`สร้าง TbEstimateAcadyear สำเร็จ (${count} รายการ)`);
}

async function seedPlnBudgetCategory() {
  const pbcRepo = AppDataSource.getRepository(PlnBudgetCategory);
  const pbcdRepo = AppDataSource.getRepository(PlnBudgetCategoryDetail);
  const categoryRepo = AppDataSource.getRepository(MasterBudgetCategory);
  const budgetTypeRepo = AppDataSource.getRepository(BudgetIncomeType);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  if ((await pbcRepo.count({ where: { scId: 1 } })) > 0) {
    console.log('PlnBudgetCategory มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const categories = await categoryRepo.find();
  const budgetTypes = await budgetTypeRepo.find({ where: { del: 0 } });
  const schoolYears = await schoolYearRepo.find({ where: { del: 0 }, order: { syYear: 'DESC' }, take: 2 });
  if (!categories.length || !schoolYears.length) return;

  let pbcCount = 0, pbcdCount = 0;
  for (const sy of schoolYears) {
    for (const cat of categories) {
      const total = randInt(100000, 800000);
      const pbc = await pbcRepo.save(pbcRepo.create({
        scId: 1,
        acadYear: sy.syYear,
        budgetYear: String(sy.syYear),
        bgCateId: cat.bgCateId,
        percents: randInt(10, 40),
        total,
        del: 0,
        upBy: 1,
      }));
      pbcCount++;
      // สร้าง detail 2-4 รายการต่อหมวด
      const typesToLink = budgetTypes.slice(0, randInt(2, 4));
      for (const bt of typesToLink) {
        await pbcdRepo.save(pbcdRepo.create({
          bgTypeId: bt.bgTypeId,
          pbcId: pbc.pbcId,
          budget: Math.floor(total / typesToLink.length),
          budgetYear: sy.syYear,
          del: 0,
          upBy: 1,
        }));
        pbcdCount++;
      }
    }
  }
  console.log(`สร้าง PlnBudgetCategory สำเร็จ (${pbcCount} หมวด, ${pbcdCount} detail)`);
}

async function seedPlnRealBudget() {
  const repo = AppDataSource.getRepository(PlnRealBudget);
  const budgetTypeRepo = AppDataSource.getRepository(BudgetIncomeType);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  if ((await repo.count({ where: { scId: 1 } })) > 0) {
    console.log('PlnRealBudget มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const budgetTypes = await budgetTypeRepo.find({ where: { del: 0 } });
  const schoolYears = await schoolYearRepo.find({ where: { del: 0 }, order: { syYear: 'DESC' }, take: 2 });
  if (!budgetTypes.length || !schoolYears.length) return;

  let count = 0;
  const receiveTypes = [0, 1, 2];
  for (const sy of schoolYears) {
    for (const bt of budgetTypes) {
      for (let seq = 1; seq <= 3; seq++) {
        const amount = randInt(20000, 400000);
        await repo.save(repo.create({
          scId: 1,
          acadYear: sy.syYear,
          autoNumbers: seq,
          bgTypeId: bt.bgTypeId,
          receivetype: randPick(receiveTypes),
          recieveAcadyear: sy.syYear,
          detail: `รับจัดสรรงบประมาณ ${bt.budgetType} งวดที่ ${seq}/${sy.syYear}`,
          amount,
          upBy: 1,
          del: 0,
        }));
        count++;
      }
    }
  }
  console.log(`สร้าง PlnRealBudget สำเร็จ (${count} รายการ)`);
}

async function seedTbExpenses() {
  const repo = AppDataSource.getRepository(TbExpenses);
  const budgetTypeRepo = AppDataSource.getRepository(BudgetIncomeType);
  const partnerRepo = AppDataSource.getRepository(Partner);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  if ((await repo.count({ where: { scId: 1 } })) > 0) {
    console.log('TbExpenses มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const budgetTypes = await budgetTypeRepo.find({ where: { del: 0 } });
  const partners = await partnerRepo.find({ where: { scId: 1, del: 0 } });
  const schoolYears = await schoolYearRepo.find({ where: { del: 0 }, order: { syYear: 'DESC' }, take: 1 });
  if (!budgetTypes.length) return;

  const rows: TbExpenses[] = [];
  const year = schoolYears[0]?.syYear ?? new Date().getFullYear();
  for (let i = 0; i < 50; i++) {
    const bt = randPick(budgetTypes);
    const partner = partners.length ? randPick(partners) : null;
    rows.push(repo.create({
      scId: 1,
      exYearIn: year,
      bgTypeId: bt.bgTypeId,
      exTypeBudget: randPick([1, 2, 3]),
      pId: partner?.pId ?? 0,
      exYearOut: year,
      exRemark: `รายจ่ายประเภท ${bt.budgetType} รายการที่ ${i + 1}`,
      exMoney: randInt(5000, 150000),
      exStatus: randPick([0, 1]),
      upBy: 1,
    }));
  }
  await saveInChunks(repo, rows, 'TbExpenses');
  console.log(`สร้าง TbExpenses สำเร็จ (${rows.length} รายการ)`);
}

async function seedMasterClassroomBudget() {
  const repo = AppDataSource.getRepository(MasterClassroomBudget);
  const classroomRepo = AppDataSource.getRepository(MasterClassroom);
  const budgetTypeRepo = AppDataSource.getRepository(BudgetIncomeType);

  if ((await repo.count()) > 0) {
    console.log('MasterClassroomBudget มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const classrooms = await classroomRepo.find();
  const budgetTypes = await budgetTypeRepo.find({ where: { del: 0 } });
  if (!classrooms.length || !budgetTypes.length) return;

  // อัตราเงินอุดหนุนรายหัว (บาท/คน) แยกตามระดับ
  const rateMap: Record<string, number> = {
    'อนุบาล': 1700, 'ประถม': 1900, 'มัธยมต้น': 3500,
    'มัธยมปลาย': 3800, 'ป.ว.ช.': 7600,
  };

  let count = 0;
  const mainBt = budgetTypes[0]; // เงินอุดหนุนทั่วไป
  for (const cls of classrooms) {
    const level = Object.keys(rateMap).find(k => cls.classLev?.includes(k.substring(0, 3))) ?? 'ประถม';
    const amount = rateMap[level] ?? 1900;
    await repo.save(repo.create({
      classId: cls.classId,
      bgTypeId: mainBt.bgTypeId,
      amount,
      upBy: 1,
      del: 0,
    }));
    count++;
  }
  console.log(`สร้าง MasterClassroomBudget สำเร็จ (${count} รายการ)`);
}

async function seedSubmittingStudentRecords() {
  const repo = AppDataSource.getRepository(SubmittingStudentRecords);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  if ((await repo.count({ where: { scId: 1 } })) > 0) {
    console.log('SubmittingStudentRecords มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const schoolYears = await schoolYearRepo.find({ where: { del: 0 } });
  for (const sy of schoolYears) {
    await repo.save(repo.create({
      status: 100,
      syId: sy.syId,
      year: sy.syYear,
      scId: 1,
      upBy: 1,
      del: 0,
    }));
  }
  console.log(`สร้าง SubmittingStudentRecords สำเร็จ (${schoolYears.length} รายการ)`);
}

async function seedParcelOrders() {
  const orderRepo = AppDataSource.getRepository(ParcelOrder);
  const detailRepo = AppDataSource.getRepository(ParcelDetail);
  const projectRepo = AppDataSource.getRepository(Project);
  const suppliesRepo = AppDataSource.getRepository(Supplies);
  const budgetTypeRepo = AppDataSource.getRepository(BudgetIncomeType);
  const partnerRepo = AppDataSource.getRepository(Partner);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  if ((await orderRepo.count({ where: { scId: 1 } })) > 0) {
    console.log('ParcelOrder มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const projects = await projectRepo.find({ where: { scId: 1, del: 0 }, take: 30 });
  const supplies = await suppliesRepo.find({ where: { scId: 1, del: 0 }, take: 50 });
  const budgetTypes = await budgetTypeRepo.find({ where: { del: 0 } });
  const partners = await partnerRepo.find({ where: { scId: 1, del: 0 } });
  const schoolYears = await schoolYearRepo.find({ where: { del: 0 }, order: { syYear: 'DESC' }, take: 1 });
  if (!projects.length || !supplies.length) return;

  const year = schoolYears[0]?.syYear ?? new Date().getFullYear();
  const adminId = 1;
  let orderCount = 0, detailCount = 0;

  for (let i = 0; i < 30; i++) {
    const proj = randPick(projects);
    const bt = budgetTypes.length ? randPick(budgetTypes) : null;
    const partner = partners.length ? randPick(partners) : null;
    const orderDate = randDateWithin(300);
    const orderStatus = randPick([1, 3, 5, 7, 9]);
    const budget = randInt(20000, 300000);

    const order = await orderRepo.save(orderRepo.create({
      projectId: proj.projId,
      projectType: randPick([1, 2]),
      scId: 1,
      bgTypeId: bt?.bgTypeId ?? 1,
      adminId,
      orderDate,
      orderStatus,
      remark: `หมายเหตุคำสั่งซื้อที่ ${i + 1}`,
      del: 0,
      acadYear: year,
      numbers: randInt(1, 10),
      details: `รายละเอียดการจัดซื้อจัดจ้างลำดับที่ ${i + 1}`,
      pId: partner?.pId ?? 0,
      resources: randPick([1, 2, 3]),
      budgets: budget,
      jobType: randPick([1, 2, 3]),
      noteNumber: i + 1,
      buyDate: orderDate,
      buyReason: `เหตุผลการจัดซื้อ ${i + 1}`,
      departments: randPick([1, 2, 3]),
      dueDate: new Date(orderDate.getTime() + randInt(15, 60) * 86400000),
      committee1: 1,
      committee2: 1,
      committee3: 1,
      dayDeadline: randInt(7, 30),
      upBy: adminId,
    }));
    orderCount++;

    // สร้าง 2-4 รายการพัสดุต่อคำสั่งซื้อ
    const suppliesToLink = supplies.slice(0, randInt(2, 4));
    for (const supp of suppliesToLink) {
      await detailRepo.save(detailRepo.create({
        orderId: order.orderId,
        suppId: supp.suppId,
        pcTotal: randInt(1, 20),
        del: 0,
      }));
      detailCount++;
    }
  }
  console.log(`สร้าง ParcelOrder สำเร็จ (${orderCount} คำสั่งซื้อ, ${detailCount} รายการพัสดุ)`);
}

async function seedReceiveParcelOrders() {
  const receiveRepo = AppDataSource.getRepository(ReceiveParcelOrder);
  const receiveDetailRepo = AppDataSource.getRepository(ReceiveParcelDetail);
  const orderRepo = AppDataSource.getRepository(ParcelOrder);
  const detailRepo = AppDataSource.getRepository(ParcelDetail);
  const schoolYearRepo = AppDataSource.getRepository(SchoolYear);

  if ((await receiveRepo.count({ where: { scId: 1 } })) > 0) {
    console.log('ReceiveParcelOrder มีข้อมูลอยู่แล้ว ข้ามการสร้าง');
    return;
  }
  const orders = await orderRepo.find({
    where: { scId: 1, orderStatus: 7, del: 0 },
    take: 20,
  });
  const schoolYears = await schoolYearRepo.find({ where: { del: 0 }, order: { syYear: 'DESC' }, take: 1 });
  if (!orders.length) {
    console.log('ไม่มี ParcelOrder ที่อนุมัติแล้ว ข้าม ReceiveParcelOrder');
    return;
  }

  const syYear = schoolYears[0]?.syYear ?? new Date().getFullYear();
  let receiveCount = 0, detailCount = 0;

  for (const order of orders) {
    const receiveDate = new Date(order.orderDate ?? new Date());
    receiveDate.setDate(receiveDate.getDate() + randInt(7, 30));

    const receive = await receiveRepo.save(receiveRepo.create({
      adminId: 1,
      agentAdminId: 0,
      userPacelId: 1,
      scId: 1,
      orderId: order.orderId,
      syYear,
      title: `ใบรับพัสดุคำสั่งซื้อ ${order.orderId}`,
      del: 0,
      receiveDate,
      receiveStatus: randPick([1, 2, 3]),
    }));
    receiveCount++;

    // สร้าง detail จาก parcel_detail ของ order นี้
    const parcelDetails = await detailRepo.find({
      where: { orderId: order.orderId, del: 0 },
    });
    for (const pd of parcelDetails) {
      await receiveDetailRepo.save(receiveDetailRepo.create({
        receiveId: receive.receiveId,
        suppId: pd.suppId ?? 0,
        rpTotal: Math.floor((pd.pcTotal ?? 1) * (0.5 + Math.random() * 0.5)),
        del: 0,
      }));
      detailCount++;
    }
  }
  console.log(`สร้าง ReceiveParcelOrder สำเร็จ (${receiveCount} ใบรับ, ${detailCount} รายการ)`);
}

async function run() {
  try {
    await AppDataSource.initialize();
    console.log('เชื่อมต่อฐานข้อมูลสำเร็จ');

    await seedAdmin();
    await seedSchool();
    await seedSchoolYear();
    await seedMasterLevel();
    await seedMasterClassroom();
    await seedBudgetIncomeType();
    await seedMasterBudgetCategory();
    // ตารางใหม่ที่ต้องสร้างก่อน (master data)
    await seedTypeSupplies();
    await seedUnit();
    await seedMasterObecPolicy();
    await seedMasterScPolicy();
    await seedFinancialTransactions();
    await seedPartner();
    await seedBankDb();
    await seedBankAccount();
    await seedBudgetIncomeTypeSchool();
    await seedPlnReceive();
    await seedReceipt();
    await seedRequestWithdraw();
    await seedWithholdingCertificate();
    // ตารางใหม่ที่ต้องการ master ก่อน
    await seedTbEstimateAcadyear();
    await seedPlnBudgetCategory();
    await seedPlnRealBudget();
    await seedTbExpenses();
    await seedMasterClassroomBudget();
    await seedSubmittingStudentRecords();

    // Mock / stress-volume seeds
    console.log('--- เริ่มสร้าง mock data (~1000 แถว/ตาราง) ---');
    await seedMockStudents();
    await seedMockProjects();
    await seedMockProjectApprovals();
    await seedMockSupplies();
    await seedMockSupplieTransactions();
    await seedMockRequestWithdraw();
    // Mock พัสดุ (ต้องการ Supplies ก่อน)
    await seedParcelOrders();
    await seedReceiveParcelOrders();

    console.log('Seeding เสร็จสมบูรณ์');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการ seed ข้อมูล', error);
  } finally {
    await AppDataSource.destroy();
  }
}

void run();
