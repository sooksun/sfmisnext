'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  CalendarRange,
  FolderOpen,
  CheckSquare,
  DollarSign,
  Receipt,
  FileText,
  BarChart2,
  Package,
  ClipboardCheck,
  Settings,
  Building2,
  UserCog,
  BookOpen,
  Landmark,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  School,
  GraduationCap,
  Wallet,
  CreditCard,
  BookMarked,
  ShieldCheck,
  ListOrdered,
  Boxes,
  Scale,
  ArrowDownToLine,
  Store,
  Ruler,
  PackageCheck,
  ClipboardList,
  UserCheck,
  BookKey,
  PieChart,
  BadgeCheck,
  Calculator,
  TrendingUp,
  ArrowUpDown,
  GitBranch,
  Layers,
  Banknote,
  Coins,
  BookCopy,
  KeyRound,
  BookOpenCheck,
  CalendarClock,
  Hash,
  Send,
  FileBarChart2,
  Notebook,
  LayoutList,
  Sparkles,
  Brain,
  AlertTriangle,
  GitMerge,
  HardDrive,
  Shield,
  BellRing,
  ClipboardSignature,
  Plane,
  History,
  FolderKanban,
  ListTodo,
  GanttChartSquare,
  MapPin,
  BarChart3,
  ShoppingCart,
  ClipboardCheck as ClipboardCheckDistrict,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

// ─── Role constants ────────────────────────────────────────────────────────────
// 1=SuperAdmin, 2=SchoolAdmin, 3=PlanStaff, 4=SupplyStaff, 5=FinanceStaff
// 6=PlanHead,   7=SupplyHead,  8=FinanceHead
const ALL    = [1, 2, 3, 4, 5, 6, 7, 8]
const ADMIN  = [1, 2]
const PLAN   = [1, 2, 3, 6]
const SUPPLY = [1, 2, 4, 7]
const FINANCE = [1, 2, 5, 8]
const SUPER  = [1]
const DISTRICT = [1, 9]   // ผู้ดูแลสูงสุด + เจ้าหน้าที่เขตพื้นที่

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  children?: NavItem[]
  roles?: number[]  // ถ้าไม่ระบุ = ทุก role เห็นได้
  /** ซ่อนจากเมนู (ยังเข้าถึงผ่าน "ส่งต่อหน้า"/ลิงก์ได้) — ลดความรกของเมนู */
  hidden?: boolean
}

// เมนูจัดเรียงตามลำดับขั้นตอนการทำงาน (workflow) พร้อมเลขกำกับ
//   กลุ่มหลัก 1–7 ; เมนูย่อย x.y เรียงตามลำดับการปฏิบัติงานจริง
//   อ้างอิงคู่มือระบบบัญชีหน่วยงานย่อย พ.ศ. 2544 (1=บันทึก/ปฏิบัติ → รายงาน → ตั้งค่า)
const navGroups: NavItem[] = [
  {
    label: 'แดชบอร์ด',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ALL,
  },
  {
    label: '1. เตรียมงบและโครงการ',
    icon: BookOpen,
    roles: PLAN,
    children: [
      { label: '1.1 เงินเหลือจ่ายปีเก่า',     href: '/sfmis/prev-year-balance',           icon: Coins,         roles: PLAN },
      { label: '1.2 เตรียมงบประมาณ',          href: '/sfmis/student',                    icon: GraduationCap, roles: PLAN },
      { label: '1.3 กำหนดชั้นที่เปิดสอน',     href: '/sfmis/class-open-config',           icon: School,        roles: PLAN },
      { label: '1.4 ตั้งค่าเงินรายหัว (ประเภท+อัตรา)', href: '/sfmis/perhead-rate-setting',  icon: ListOrdered,   roles: PLAN },
      { label: '1.5 คำนวณงบจากรายหัว',        href: '/sfmis/calculate-perhead',           icon: Calculator,    roles: PLAN },
      { label: '1.6 งบประมาณรวมรายปี',        href: '/sfmis/estimate-acadyear',           icon: CalendarRange, roles: PLAN },
      { label: '1.7 กำหนดวงเงินงบประมาณ',     href: '/sfmis/budget-category',             icon: Layers,        roles: PLAN },
      { label: '1.8 แผนงาน/อนุมัติโครงการ (รวม 4 ขั้นตอน)', href: '/sfmis/plan-menu/project-pipeline', icon: FolderOpen, roles: [...PLAN, 4, 7] },
      // หน้าเดิม 4 หน้า → รวมเป็นแท็บใน project-pipeline แล้ว (คง route ไว้ deep link เดิมยังเข้าได้)
      { label: '1.8.1 แผนงาน/โครงการ',        href: '/sfmis/plan-menu/project',           icon: FolderOpen,    roles: [...PLAN, 4, 7], hidden: true },
      { label: '1.8.2 บริหารโครงการ',         href: '/sfmis/plan-menu/manage-project',    icon: Boxes,         roles: [...PLAN, 4, 7], hidden: true },
      { label: '1.8.3 อนุมัติโครงการ',        href: '/sfmis/plan-menu/proj-approve',      icon: CheckSquare,   roles: [...PLAN, 4, 7], hidden: true },
      { label: '1.8.4 แผนจัดซื้อจัดจ้าง',     href: '/sfmis/plan-menu/procurement-plan',  icon: ClipboardList, roles: [...PLAN, 4, 7], hidden: true },
      { label: '1.9 ติดตามแผน-โครงการ',       href: '/sfmis/plan-menu/plan-trace',        icon: GitBranch,     roles: PLAN },
      { label: '1.10 พื้นที่ทำงานโครงการ',     href: '/sfmis/plan-menu/projects',          icon: FolderKanban,  roles: [...PLAN, 4, 5, 7, 8] },
      { label: '1.11 งานของฉัน',              href: '/sfmis/my-tasks',                    icon: ListTodo,      roles: [1, 2, 3, 4, 5, 6, 7, 8] },
      { label: '1.12 รายงาน Gantt โครงการ',   href: '/sfmis/plan-menu/project-gantt',     icon: GanttChartSquare, roles: [...PLAN, 4, 7] },
      { label: 'การจัดสรรงบประมาณ',          href: '/sfmis/budget-allocation',           icon: Wallet,        roles: PLAN, hidden: true },
      { label: 'งบประมาณที่ได้รับจริง',       href: '/sfmis/real-budget',                 icon: ArrowUpDown,   roles: PLAN, hidden: true },
      { label: 'ประกาศ e-GP',                 href: '/sfmis/plan-menu/egp-announcement', icon: FileBarChart2, roles: [...PLAN, 4, 7], hidden: true },
      { label: 'โอนงบประมาณ',                href: '/sfmis/plan-menu/budget-transfer',   icon: ArrowUpDown,   roles: PLAN, hidden: true },
      { label: 'รายจ่าย',                     href: '/sfmis/expenses',                   icon: DollarSign,    roles: PLAN, hidden: true },
      { label: 'ติดตามผลโครงการ',            href: '/sfmis/plan-menu/project-followup', icon: TrendingUp,    roles: PLAN, hidden: true },
    ],
  },
  {
    label: '2. จัดซื้อจัดจ้าง',
    icon: Package,
    roles: SUPPLY,
    children: [
      { label: '2.1 แต่งตั้งคณะกรรมการ',  href: '/sfmis/setting-committee',            icon: UserCheck,   roles: SUPPLY },
      { label: '2.2 คำขอจัดซื้อ/จัดจ้าง', href: '/sfmis/supplie-setting/withdraw-confirm', icon: CheckSquare, roles: SUPPLY },
      { label: '2.3 รับ–ตรวจรับพัสดุ',     href: '/sfmis/receive-parcel',               icon: PackageCheck, roles: SUPPLY },
      { label: '2.4 สัญญา/ส่งมอบ',        href: '/sfmis/supplie-setting/contract',    icon: FileText,    roles: SUPPLY },
      { label: '2.5 เอกสารจัดซื้อ/ตรวจรับ', href: '/sfmis/supplie-setting/procurement-docs', icon: BadgeCheck, roles: SUPPLY },
      { label: '2.6 บัญชีวัสดุ',          href: '/sfmis/supplies',                    icon: Boxes,       roles: SUPPLY },
      { label: '2.7 เบิกพัสดุ/ใบเบิก',    href: '/sfmis/supplie-setting/requisition',   icon: ClipboardSignature, roles: SUPPLY },
      { label: '2.8 ตรวจสอบ/จำหน่ายประจำปี', href: '/sfmis/supplie-setting/annual-check', icon: ShieldCheck, roles: SUPPLY },
      { label: '2.9 ใบจัดซื้อวัสดุเครื่องบริโภค', href: '/sfmis/pay-menu/food-purchase-doc', icon: ClipboardSignature, roles: SUPPLY },
      // ── ตั้งค่า/ขั้นย่อย (เข้าถึงผ่านลิงก์/ProcessFlow) ──
      { label: 'ตั้งค่าพัสดุ (ประเภท)',  href: '/sfmis/supplie-setting/type-supplies', icon: ListOrdered, roles: SUPPLY, hidden: true },
      { label: 'หน่วยนับ',                href: '/sfmis/supplie-setting/unit',          icon: Ruler,       roles: SUPPLY, hidden: true },
      { label: 'ร้านค้า/ผู้รับจ้าง',      href: '/sfmis/supplie-setting/partner',      icon: Store,       roles: SUPPLY, hidden: true },
      { label: 'หลักประกันสัญญา',         href: '/sfmis/contract-security',            icon: Shield,      roles: SUPPLY, hidden: true },
      { label: 'ตรวจรับพัสดุ (รายการ)',  href: '/sfmis/supplie-setting/inspection',    icon: BadgeCheck,  roles: SUPPLY, hidden: true },
      { label: 'ทะเบียนครุภัณฑ์',         href: '/sfmis/supplie-setting/fixed-asset',   icon: HardDrive,   roles: SUPPLY, hidden: true },
      { label: 'เบิกพัสดุ (คลัง)',        href: '/sfmis/supplie-setting/withdraw',      icon: ClipboardCheck, roles: SUPPLY, hidden: true },
      { label: 'จำหน่ายพัสดุ',            href: '/sfmis/supplie-setting/disposal',      icon: Scale,       roles: SUPPLY, hidden: true },
      { label: 'แจ้งเตือนรับประกัน',      href: '/sfmis/supplie-setting/warranty-alert', icon: BellRing,   roles: SUPPLY, hidden: true },
    ],
  },
  {
    label: '3. งานการเงิน',
    icon: DollarSign,
    roles: FINANCE,
    children: [
      { label: '3.1 ตั้งค่าต้นปี',                  href: '/sfmis/financial-report/receipt-book',       icon: Notebook,        roles: FINANCE },
      { label: '3.2 รับเงิน',                        href: '/sfmis/receive-menu/receive',                icon: ArrowDownToLine, roles: FINANCE },
      // 2.4 เดิมออกใบเสร็จแบบ 2 ขั้น — รวมเข้า 2.3 แล้ว (รับเงิน=ออกใบเสร็จ บร. ในตัว)
      // หน้านี้ซ้ำกับ 2.3 (ดู/พิมพ์ซ้ำ) + 2.1 (ทะเบียนเล่ม) → ซ่อนจากเมนู (เก็บ route ไว้)
      { label: 'ใบเสร็จรับเงิน (ที่ออกแล้ว)',         href: '/sfmis/financial-report/receipt',            icon: BookMarked,      roles: FINANCE, hidden: true },
      { label: 'รับเงินเพื่อเก็บรักษา',              href: '/sfmis/financial-report/cash-keeping',       icon: KeyRound,        roles: FINANCE, hidden: true },
      { label: '3.3 จ่ายเงิน',                       href: '/sfmis/pay-menu/invoice',                    icon: FileText,        roles: FINANCE },
      // ขั้นต่อเนื่องของการจ่ายเงิน — เข้าถึงผ่านแถบ "ขั้นตอนการจ่ายเงิน" (ProcessFlow)
      { label: 'ตรวจสอบใบสำคัญจ่าย',                href: '/sfmis/confirm-invoice',                     icon: ClipboardList,   roles: FINANCE, hidden: true },
      { label: 'สร้างเช็ค',                          href: '/sfmis/pay-menu/generate-check',             icon: CreditCard,      roles: FINANCE, hidden: true },
      { label: 'หนังสือรับรองหักภาษี ณ ที่จ่าย',    href: '/sfmis/pay-menu/withholding-certificate',    icon: FileText,        roles: FINANCE, hidden: true },
      // ทะเบียนคุมหลักฐานขอเบิก → ย้ายไปแสดงในกลุ่ม "4. รายงาน" (รวมกับทะเบียนคุมอื่น)
      { label: '3.4 เงินยืม',                        href: '/sfmis/pay-menu/loan-agreement',             icon: BookCopy,        roles: FINANCE },
      { label: 'ยืมเงินข้ามประเภท',                 href: '/sfmis/pay-menu/fund-borrowing',             icon: BookCopy,        roles: FINANCE, hidden: true },
      { label: '3.5 ขอเบิกค่าเดินทาง',               href: '/sfmis/pay-menu/travel-reimbursement',       icon: Plane,           roles: ALL },
      { label: '3.6 เงินฝาก/นำส่ง/โอน',              href: '/sfmis/receive-menu/spp-deposit',            icon: BookOpenCheck,   roles: FINANCE },
      { label: 'ทะเบียนสมุดคู่ฝาก สพป.',            href: '/sfmis/financial-report/smp-deposit',        icon: BookOpenCheck,   roles: FINANCE, hidden: true },
      { label: 'เงินรายได้แผ่นดิน (ดอกเบี้ย)',      href: '/sfmis/financial-report/gov-revenue',        icon: Banknote,        roles: FINANCE, hidden: true },
      { label: 'โอนเงินระหว่างบัญชี',               href: '/sfmis/financial-report/intra-bank-transfer', icon: Landmark,       roles: FINANCE, hidden: true },
      { label: '3.7 เงินคงเหลือประจำวัน',             href: '/sfmis/financial-report/daily-balance',      icon: BarChart2,       roles: FINANCE },
      { label: '3.8 รายงานประจำเดือน',              href: '/sfmis/financial-report/monthly-submission', icon: Send,            roles: FINANCE },
      { label: '3.9 ปิดปี / ยอดยกมา',               href: '/sfmis/financial-report/fiscal-year-close',  icon: CalendarClock,   roles: FINANCE },
      { label: 'รายงานสิ้นปีงบประมาณ',              href: '/sfmis/financial-report/year-end-report',    icon: FileBarChart2,   roles: FINANCE, hidden: true },
      { label: 'ตั้งเลขที่เอกสาร',                  href: '/sfmis/financial-report/doc-counter',        icon: Hash,            roles: FINANCE, hidden: true },
    ],
  },
  {
    label: '4. รายงาน',
    icon: BarChart2,
    roles: ALL,
    children: [
      { label: '4.1 ทะเบียนคุมทุกประเภท',        href: '/sfmis/financial-report/unified-register', icon: LayoutList,  roles: ALL },
      { label: '4.2 ควบคุมเงินตามประเภท',        href: '/sfmis/report/money-type',                 icon: PieChart,    roles: ALL },
      // 4.3 ซ้ำกับ 2.16 ยอดเงินคงเหลือประจำวัน (ฉบับทางการ) — ซ่อนเพื่อลดความซ้ำ
      { label: '4.3 เงินคงเหลือประจำวัน',            href: '/sfmis/report/daily-balance',          icon: BarChart2,   roles: FINANCE, hidden: true },
      { label: '4.4 ควบคุมเช็ค',                  href: '/sfmis/report/check-control',              icon: CreditCard,  roles: FINANCE },
      { label: '4.5 สมุดบัญชีธนาคาร',            href: '/sfmis/report/bookbank',                   icon: BookKey,     roles: FINANCE },
      { label: '4.6 ทะเบียนคุมเงินฝากธนาคาร',   href: '/sfmis/report/bank-ledger',                icon: Landmark,    roles: FINANCE },
      { label: '4.7 งบเทียบยอดธนาคาร',          href: '/sfmis/report/bank-reconciliation',         icon: Scale,       roles: FINANCE },
      { label: '4.8 หนังสือรับรองภาษีหัก ณ ที่จ่าย', href: '/sfmis/report/certificate',           icon: BadgeCheck,  roles: FINANCE },
      { label: '4.9 ทะเบียนคุมหลักฐานขอเบิก',    href: '/sfmis/pay-menu/budget-request',          icon: ClipboardList, roles: FINANCE },
      { label: '4.10 ทะเบียนคุมเงินฝาก',         href: '/sfmis/financial-report/deposit-register', icon: Landmark,     roles: FINANCE },
      { label: '4.11 ประเมินตนเอง (แบบ 2544)',   href: '/sfmis/financial-report/self-assessment',  icon: ClipboardCheck, roles: FINANCE },
      { label: '4.12 งานที่ต้องทำ (เตือนตามปฏิทิน)', href: '/sfmis/work-alerts',                    icon: BellRing,      roles: ALL },
    ],
  },
  {
    label: '5. ตั้งค่าโรงเรียน',
    icon: Settings,
    roles: ADMIN,
    children: [
      { label: '5.1 ผู้ใช้งาน',       href: '/sfmis/user',                        icon: Users,        roles: ADMIN },
      { label: '5.2 ปีการศึกษา',      href: '/sfmis/year',                        icon: CalendarRange, roles: ADMIN },
      { label: '5.3 นโยบายโรงเรียน', href: '/sfmis/school-policy',               icon: ShieldCheck,  roles: ADMIN },
      { label: '5.4 บัญชีธนาคาร',    href: '/sfmis/business-setting/account-bank', icon: Landmark,   roles: ADMIN },
      { label: '5.5 ยอดยกมาต้นปี',   href: '/sfmis/year/opening-balance',          icon: ArrowDownToLine, roles: ADMIN },
      { label: '5.6 บันทึกการลบข้อมูล', href: '/sfmis/admin-tools/delete-log',    icon: ShieldCheck,     roles: ADMIN },
      { label: '5.6.1 บันทึกกิจกรรมระบบ', href: '/sfmis/admin-tools/activity-log', icon: History,         roles: ADMIN },
      { label: '5.7 เกณฑ์ตามระเบียบ', href: '/sfmis/admin-tools/regulatory-config', icon: Settings,    roles: ADMIN },
      { label: '5.8 กรรมการเก็บรักษาเงิน', href: '/sfmis/admin-tools/cash-committee', icon: UserCheck, roles: ADMIN },
      { label: '5.9 รีเซ็ต/ข้อมูลตัวอย่าง', href: '/sfmis/admin-tools/system-reset', icon: RotateCcw, roles: SUPER },
    ],
  },
  {
    label: '6. ระบบแอดมิน',
    icon: UserCog,
    roles: SUPER,
    children: [
      { label: '6.1 โรงเรียน',             href: '/sfmis/school',          icon: School,   roles: SUPER },
      { label: '6.2 ผู้ดูแลระบบ',          href: '/sfmis/admin',           icon: UserCog,  roles: SUPER },
      { label: '6.3 นโยบาย สพฐ.',          href: '/sfmis/obec-policy',     icon: Building2, roles: SUPER },
      { label: '6.4 นโยบาย ศธ.',           href: '/sfmis/moe-policy',      icon: Scale,    roles: SUPER },
      { label: '6.5 Quick Win',            href: '/sfmis/quick-win',        icon: CheckSquare, roles: SUPER },
      { label: '6.6 ประเภทรายรับงบประมาณ', href: '/sfmis/budget-income-type', icon: BookOpen, roles: SUPER },
      { label: '6.7 งบห้องเรียน',          href: '/sfmis/classroom-budget', icon: GraduationCap, roles: SUPER },
      { label: '6.8 นโยบาย อปท.',          href: '/sfmis/sao-policy',      icon: BookMarked, roles: SUPER },
      { label: '6.9 อปท.',                 href: '/sfmis/sao',             icon: Building2, roles: SUPER },
      { label: '6.10 แบบ สพท. 2544 (สังเคราะห์เขต)', href: '/sfmis/admin-tools/district-assessment', icon: ClipboardCheck, roles: DISTRICT },
    ],
  },
  {
    label: 'สำนักงานเขตพื้นที่',
    icon: MapPin,
    roles: DISTRICT,
    children: [
      { label: 'ภาพรวมเขตพื้นที่',         href: '/sfmis/area/dashboard',  icon: BarChart3,              roles: DISTRICT },
      { label: 'แผนงาน/โครงการ',           href: '/sfmis/area/plan',       icon: FolderKanban,           roles: DISTRICT },
      { label: 'การเงิน',                  href: '/sfmis/area/finance',    icon: DollarSign,             roles: DISTRICT },
      { label: 'พัสดุ/จัดซื้อ',            href: '/sfmis/area/supply',     icon: ShoppingCart,           roles: DISTRICT },
      { label: 'ประเมินตนเอง (สพท.2544)', href: '/sfmis/admin-tools/district-assessment', icon: ClipboardCheckDistrict, roles: DISTRICT },
    ],
  },
  {
    label: '7. AI Assistant',
    icon: Sparkles,
    roles: ALL,
    children: [
      { label: '7.1 AI วิเคราะห์รายงาน', href: '/sfmis/ai-insights', icon: Brain,          roles: ALL },
      { label: '7.2 AI ตรวจสอบข้อมูล',  href: '/sfmis/ai-alerts',   icon: AlertTriangle,  roles: ALL },
      { label: '7.3 AI นำเข้าข้อมูล',   href: '/sfmis/ai-merge',    icon: GitMerge,       roles: ALL },
    ],
  },
]

function canAccess(item: NavItem, userType: number): boolean {
  // ผู้ดูแลพิเศษ (type=1) เข้าได้ทุกเมนู — ตรงกับ backend RolesGuard
  if (userType === 1) return true
  if (!item.roles || item.roles.length === 0) return true
  return item.roles.includes(userType)
}

function NavLink({ item, depth = 0, userType }: { item: NavItem; depth?: number; userType: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => {
    if (!item.children) return false
    return item.children.some((child) => child.href && pathname.startsWith(child.href))
  })

  if (item.hidden) return null

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false

  if (item.children) {
    // กลุ่มแสดงเมื่อมีเมนูย่อยที่ผู้ใช้เข้าถึงได้อย่างน้อย 1 รายการ
    // (ไม่ผูกกับ roles ของกลุ่มเอง — เผื่อมีเมนูย่อย role กว้างกว่ากลุ่ม เช่น ขอเบิกค่าเดินทาง)
    const visibleChildren = item.children.filter(
      (c) => canAccess(c, userType) && !c.hidden,
    )
    if (visibleChildren.length === 0) return null

    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            'text-gray-300 hover:bg-gray-700 hover:text-white',
            depth > 0 && 'pl-8'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {open && (
          <div className="ml-2 border-l border-gray-700 pl-1">
            {visibleChildren.map((child) => (
              <NavLink key={child.href ?? child.label} item={child} depth={depth + 1} userType={userType} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        depth > 0 ? 'pl-6' : '',
        isActive
          ? 'bg-indigo-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

export function SidebarNav() {
  const { userType } = useAppContext()

  return (
    <aside className="flex flex-col w-64 bg-gray-800 shrink-0 overflow-y-auto">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 shrink-0">
          <Landmark className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">SFMIS</p>
          <p className="text-xs text-gray-400 truncate">ระบบการเงินโรงเรียน</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navGroups.map((item) => (
          <NavLink key={item.href ?? item.label} item={item} userType={userType} />
        ))}
      </nav>
    </aside>
  )
}
