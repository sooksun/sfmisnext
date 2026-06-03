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
  Truck,
  ClipboardCheck,
  Settings,
  Building2,
  UserCog,
  BookOpen,
  Landmark,
  ChevronDown,
  ChevronRight,
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

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  children?: NavItem[]
  roles?: number[]  // ถ้าไม่ระบุ = ทุก role เห็นได้
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
    label: '1. งานนโยบายและแผน',
    icon: BookOpen,
    roles: PLAN,
    children: [
      { label: '1.1 ข้อมูลนักเรียน',           href: '/sfmis/student',               icon: GraduationCap, roles: PLAN },
      { label: '1.2 เกณฑ์เงินต่อหัวนักเรียน', href: '/sfmis/perhead-rate-setting',   icon: TrendingUp,    roles: PLAN },
      { label: '1.3 คำนวณเงินต่อหัวนักเรียน', href: '/sfmis/calculate-perhead',      icon: Calculator,    roles: PLAN },
      { label: '1.4 การจัดสรรงบประมาณ',       href: '/sfmis/budget-allocation',      icon: Wallet,        roles: PLAN },
      { label: '1.5 หมวดงบประมาณ',            href: '/sfmis/budget-category',        icon: Layers,        roles: PLAN },
      { label: '1.6 งบประมาณที่ได้รับจริง',   href: '/sfmis/real-budget',            icon: ArrowUpDown,   roles: PLAN },
      { label: '1.7 ประมาณการปีการศึกษา',     href: '/sfmis/estimate-acadyear',      icon: CalendarRange, roles: PLAN },
      { label: '1.8 แผนงาน/โครงการ',          href: '/sfmis/plan-menu/project',      icon: FolderOpen,    roles: [...PLAN, 4, 7] },
      { label: '1.9 อนุมัติโครงการ',          href: '/sfmis/plan-menu/proj-approve', icon: CheckSquare,   roles: [...PLAN, 4, 7] },
      { label: '1.10 แผนจัดซื้อจัดจ้างประจำปี', href: '/sfmis/plan-menu/procurement-plan', icon: ClipboardList, roles: [...PLAN, 4, 7] },
      { label: '1.11 ประกาศ e-GP',              href: '/sfmis/plan-menu/egp-announcement',  icon: FileBarChart2, roles: [...PLAN, 4, 7] },
      { label: '1.12 โอนงบประมาณ',             href: '/sfmis/plan-menu/budget-transfer',    icon: ArrowUpDown,   roles: PLAN },
      { label: '1.13 รายจ่าย',                  href: '/sfmis/expenses',               icon: DollarSign,    roles: PLAN },
      { label: '1.14 ติดตามแผน-โครงการ',       href: '/sfmis/plan-menu/plan-trace',         icon: GitBranch,     roles: PLAN },
      { label: '1.15 ติดตามผลโครงการ',         href: '/sfmis/plan-menu/project-followup',   icon: TrendingUp,    roles: PLAN },
      { label: '1.16 รายงาน SAR',              href: '/sfmis/plan-menu/sar-report',         icon: FileBarChart2, roles: PLAN },
    ],
  },
  {
    label: '2. งานการเงิน',
    icon: DollarSign,
    roles: FINANCE,
    children: [
      // — รับเงิน —
      { label: '2.1 รับเงิน',                        href: '/sfmis/receive-menu/receive',                icon: ArrowDownToLine, roles: FINANCE },
      { label: '2.2 ใบเสร็จรับเงิน',                 href: '/sfmis/financial-report/receipt',            icon: BookMarked,      roles: FINANCE },
      { label: '2.3 รับเงินเพื่อเก็บรักษา',          href: '/sfmis/financial-report/cash-keeping',       icon: KeyRound,        roles: FINANCE },
      // — จ่ายเงิน / ขอเบิก —
      { label: '2.4 ใบสำคัญจ่าย (ขอเบิก)',           href: '/sfmis/pay-menu/invoice',                    icon: FileText,        roles: FINANCE },
      { label: '2.5 ตรวจสอบใบสำคัญจ่าย',            href: '/sfmis/confirm-invoice',                     icon: ClipboardList,   roles: FINANCE },
      { label: '2.6 สร้างเช็ค',                      href: '/sfmis/pay-menu/generate-check',             icon: CreditCard,      roles: FINANCE },
      { label: '2.7 หนังสือรับรองหักภาษี ณ ที่จ่าย', href: '/sfmis/pay-menu/withholding-certificate',    icon: FileText,        roles: FINANCE },
      { label: '2.8 หลักฐานขอเบิกเงินงบประมาณ',     href: '/sfmis/pay-menu/budget-request',             icon: ClipboardList,   roles: FINANCE },
      // — เงินยืม —
      { label: '2.9 ทะเบียนสัญญายืมเงิน (บย.)',     href: '/sfmis/pay-menu/loan-agreement',             icon: BookCopy,        roles: FINANCE },
      // — เงินฝากส่วนราชการ / นำส่ง / โอน —
      { label: '2.10 นำฝาก-ถอน สมุดคู่ฝาก สพป.',     href: '/sfmis/receive-menu/spp-deposit',            icon: BookOpenCheck,   roles: FINANCE },
      { label: '2.11 ทะเบียนสมุดคู่ฝาก สพป.',        href: '/sfmis/financial-report/smp-deposit',        icon: BookOpenCheck,   roles: FINANCE },
      { label: '2.12 เงินรายได้แผ่นดิน (ดอกเบี้ย)',  href: '/sfmis/financial-report/gov-revenue',        icon: Banknote,        roles: FINANCE },
      { label: '2.13 โอนเงินระหว่างบัญชี',          href: '/sfmis/financial-report/intra-bank-transfer', icon: Landmark,       roles: FINANCE },
      // — สรุป / ปิดบัญชี —
      { label: '2.14 ยอดเงินคงเหลือประจำวัน',        href: '/sfmis/financial-report/daily-balance',      icon: BarChart2,       roles: FINANCE },
      { label: '2.15 รายงานประจำเดือน',              href: '/sfmis/financial-report/monthly-submission', icon: Send,            roles: FINANCE },
      { label: '2.16 รายงานสิ้นปีงบประมาณ',         href: '/sfmis/financial-report/year-end-report',    icon: FileBarChart2,   roles: FINANCE },
      { label: '2.17 ปิดปีงบประมาณ / ยอดยกมา',      href: '/sfmis/financial-report/fiscal-year-close',  icon: CalendarClock,   roles: FINANCE },
      // — ตั้งค่าเอกสารการเงิน —
      { label: '2.18 ทะเบียนสมุดใบเสร็จ',           href: '/sfmis/financial-report/receipt-book',       icon: Notebook,        roles: FINANCE },
      { label: '2.19 ตั้งเลขที่เอกสาร',             href: '/sfmis/financial-report/doc-counter',        icon: Hash,            roles: FINANCE },
    ],
  },
  {
    label: '3. งานพัสดุ',
    icon: Package,
    roles: SUPPLY,
    children: [
      // — ตั้งค่าพื้นฐานพัสดุ —
      { label: '3.1 ประเภทพัสดุ',        href: '/sfmis/supplie-setting/type-supplies', icon: ListOrdered, roles: SUPPLY },
      { label: '3.2 หน่วยนับ',           href: '/sfmis/supplie-setting/unit',           icon: Ruler,       roles: SUPPLY },
      { label: '3.3 ร้านค้า/ผู้รับจ้าง', href: '/sfmis/supplie-setting/partner',       icon: Store,       roles: SUPPLY },
      { label: '3.4 แต่งตั้งคณะกรรมการ', href: '/sfmis/setting-committee',             icon: UserCheck,   roles: SUPPLY },
      // — จัดซื้อ / จัดจ้าง —
      { label: '3.5 อนุมัติขอซื้อ/ขอจ้าง', href: '/sfmis/supplie-setting/withdraw-confirm', icon: CheckSquare, roles: SUPPLY },
      { label: '3.6 สัญญา/ใบสั่งซื้อ',   href: '/sfmis/supplie-setting/contract',      icon: FileText,    roles: SUPPLY },
      { label: '3.7 หลักประกันสัญญา',    href: '/sfmis/contract-security',             icon: Shield,        roles: SUPPLY },
      // — รับ / ตรวจรับ —
      { label: '3.8 รับพัสดุ',           href: '/sfmis/receive-parcel',                icon: Truck,       roles: SUPPLY },
      { label: '3.9 ยืนยันรับพัสดุ',     href: '/sfmis/receive-parcel-confirm',        icon: PackageCheck, roles: SUPPLY },
      { label: '3.10 ตรวจรับพัสดุ',      href: '/sfmis/supplie-setting/inspection',    icon: BadgeCheck,  roles: SUPPLY },
      // — ทะเบียน / เบิกจ่าย —
      { label: '3.11 บัญชีวัสดุ',         href: '/sfmis/supplies',                      icon: Boxes,       roles: SUPPLY },
      { label: '3.12 ทะเบียนครุภัณฑ์',    href: '/sfmis/supplie-setting/fixed-asset',   icon: HardDrive,     roles: SUPPLY },
      { label: '3.13 เบิกพัสดุ',          href: '/sfmis/supplie-setting/withdraw',       icon: ClipboardCheck, roles: SUPPLY },
      { label: '3.14 ใบเบิกพัสดุ',        href: '/sfmis/supplie-setting/requisition',   icon: ClipboardSignature, roles: SUPPLY },
      // — ตรวจสอบ / จำหน่าย / แจ้งเตือน —
      { label: '3.15 ตรวจสอบพัสดุประจำปี', href: '/sfmis/supplie-setting/annual-check', icon: ShieldCheck, roles: SUPPLY },
      { label: '3.16 จำหน่ายพัสดุ',       href: '/sfmis/supplie-setting/disposal',      icon: Scale,         roles: SUPPLY },
      { label: '3.17 แจ้งเตือนรับประกัน', href: '/sfmis/supplie-setting/warranty-alert', icon: BellRing,     roles: SUPPLY },
    ],
  },
  {
    label: '4. รายงาน',
    icon: BarChart2,
    roles: ALL,
    children: [
      { label: '4.1 ทะเบียนคุมทุกประเภท',        href: '/sfmis/financial-report/unified-register', icon: LayoutList,  roles: ALL },
      { label: '4.2 ควบคุมเงินตามประเภท',        href: '/sfmis/report/money-type',                 icon: PieChart,    roles: ALL },
      { label: '4.3 เงินคงเหลือประจำวัน',            href: '/sfmis/report/daily-balance',          icon: BarChart2,   roles: FINANCE },
      { label: '4.4 ควบคุมเช็ค',                  href: '/sfmis/report/check-control',              icon: CreditCard,  roles: FINANCE },
      { label: '4.5 สมุดบัญชีธนาคาร',            href: '/sfmis/report/bookbank',                   icon: BookKey,     roles: FINANCE },
      { label: '4.6 ทะเบียนคุมเงินฝากธนาคาร',   href: '/sfmis/report/bank-ledger',                icon: Landmark,    roles: FINANCE },
      { label: '4.7 งบเทียบยอดธนาคาร',          href: '/sfmis/report/bank-reconciliation',         icon: Scale,       roles: FINANCE },
      { label: '4.8 หนังสือรับรองภาษีหัก ณ ที่จ่าย', href: '/sfmis/report/certificate',           icon: BadgeCheck,  roles: FINANCE },
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
      { label: '6.10 Receipt',             href: '/sfmis/financial-report/receipt', icon: Receipt, roles: SUPER },
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
  if (!item.roles || item.roles.length === 0) return true
  return item.roles.includes(userType)
}

function NavLink({ item, depth = 0, userType }: { item: NavItem; depth?: number; userType: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => {
    if (!item.children) return false
    return item.children.some((child) => child.href && pathname.startsWith(child.href))
  })

  if (!canAccess(item, userType)) return null

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false

  if (item.children) {
    const visibleChildren = item.children.filter((c) => canAccess(c, userType))
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
