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

const navGroups: NavItem[] = [
  {
    label: 'แดชบอร์ด',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ALL,
  },
  {
    label: 'งานนโยบายและแผน',
    icon: BookOpen,
    roles: PLAN,
    children: [
      { label: 'ข้อมูลนักเรียน',           href: '/sfmis/student',               icon: GraduationCap, roles: PLAN },
      { label: 'เกณฑ์เงินต่อหัวนักเรียน', href: '/sfmis/perhead-rate-setting',   icon: TrendingUp,    roles: PLAN },
      { label: 'คำนวณเงินต่อหัวนักเรียน', href: '/sfmis/calculate-perhead',      icon: Calculator,    roles: PLAN },
      { label: 'การจัดสรรงบประมาณ',       href: '/sfmis/budget-allocation',      icon: Wallet,        roles: PLAN },
      { label: 'หมวดงบประมาณ',            href: '/sfmis/budget-category',        icon: Layers,        roles: PLAN },
      { label: 'งบประมาณที่ได้รับจริง',   href: '/sfmis/real-budget',            icon: ArrowUpDown,   roles: PLAN },
      { label: 'รายจ่าย',                  href: '/sfmis/expenses',               icon: DollarSign,    roles: PLAN },
      { label: 'ประมาณการปีการศึกษา',     href: '/sfmis/estimate-acadyear',      icon: CalendarRange, roles: PLAN },
      { label: 'แผนงาน/โครงการ',          href: '/sfmis/plan-menu/project',      icon: FolderOpen,    roles: [...PLAN, 4, 7] },
      { label: 'อนุมัติโครงการ',          href: '/sfmis/plan-menu/proj-approve', icon: CheckSquare,   roles: [...PLAN, 4, 7] },
      { label: 'แผนจัดซื้อจัดจ้างประจำปี', href: '/sfmis/plan-menu/procurement-plan', icon: ClipboardList, roles: [...PLAN, 4, 7] },
      { label: 'ประกาศ e-GP',              href: '/sfmis/plan-menu/egp-announcement',  icon: FileBarChart2, roles: [...PLAN, 4, 7] },
    ],
  },
  {
    label: 'งานการเงิน',
    icon: DollarSign,
    roles: FINANCE,
    children: [
      { label: 'รับเงิน',                          href: '/sfmis/receive-menu/receive',                icon: ArrowDownToLine, roles: FINANCE },
      { label: 'ใบสำคัญจ่าย',                       href: '/sfmis/pay-menu/invoice',                    icon: FileText,        roles: FINANCE },
      { label: 'ตรวจสอบใบสำคัญจ่าย',               href: '/sfmis/confirm-invoice',                     icon: ClipboardList,   roles: FINANCE },
      { label: 'สร้างเช็ค',                         href: '/sfmis/pay-menu/generate-check',             icon: CreditCard,      roles: FINANCE },
      { label: 'ทะเบียนสัญญายืมเงิน (บย.)',        href: '/sfmis/pay-menu/loan-agreement',             icon: BookCopy,        roles: FINANCE },
      { label: 'หลักฐานขอเบิกเงินงบประมาณ',       href: '/sfmis/pay-menu/budget-request',             icon: ClipboardList,   roles: FINANCE },
      { label: 'สมุดคู่ฝาก สพป. (ใหม่)',           href: '/sfmis/receive-menu/spp-deposit',            icon: BookOpenCheck,   roles: FINANCE },
      { label: 'หนังสือรับรองหักภาษี ณ ที่จ่าย', href: '/sfmis/pay-menu/withholding-certificate',   icon: FileText,        roles: FINANCE },
      { label: 'ใบเสร็จรับเงิน',                   href: '/sfmis/financial-report/receipt',            icon: BookMarked,      roles: FINANCE },
      { label: 'ยอดเงินคงเหลือประจำวัน',           href: '/sfmis/financial-report/daily-balance',      icon: BarChart2,       roles: FINANCE },
      { label: 'เงินรายได้แผ่นดิน',               href: '/sfmis/financial-report/gov-revenue',        icon: Banknote,        roles: FINANCE },
      { label: 'รับเงินเพื่อเก็บรักษา',           href: '/sfmis/financial-report/cash-keeping',      icon: KeyRound,        roles: FINANCE },
      { label: 'สมุดคู่ฝาก สพป.',                  href: '/sfmis/financial-report/smp-deposit',        icon: BookOpenCheck,   roles: FINANCE },
      { label: 'ปิดปีงบประมาณ / ยอดยกมา',         href: '/sfmis/financial-report/fiscal-year-close', icon: CalendarClock,   roles: FINANCE },
      { label: 'รายงานประจำเดือน',                 href: '/sfmis/financial-report/monthly-submission', icon: Send,            roles: FINANCE },
      { label: 'รายงานสิ้นปีงบประมาณ',            href: '/sfmis/financial-report/year-end-report',   icon: FileBarChart2,   roles: FINANCE },
      { label: 'ทะเบียนสมุดใบเสร็จ',              href: '/sfmis/financial-report/receipt-book',      icon: Notebook,        roles: FINANCE },
      { label: 'ตั้งเลขที่เอกสาร',                href: '/sfmis/financial-report/doc-counter',        icon: Hash,            roles: FINANCE },
    ],
  },
  {
    label: 'งานพัสดุ',
    icon: Package,
    roles: SUPPLY,
    children: [
      { label: 'บัญชีวัสดุ',          href: '/sfmis/supplies',                      icon: Boxes,       roles: SUPPLY },
      { label: 'รับพัสดุ',            href: '/sfmis/receive-parcel',                icon: Truck,       roles: SUPPLY },
      { label: 'ยืนยันรับพัสดุ',      href: '/sfmis/receive-parcel-confirm',        icon: PackageCheck, roles: SUPPLY },
      { label: 'เบิกพัสดุ',          href: '/sfmis/supplie-setting/withdraw',       icon: ClipboardCheck, roles: SUPPLY },
      { label: 'อนุมัติขอซื้อ/ขอจ้าง', href: '/sfmis/supplie-setting/withdraw-confirm', icon: CheckSquare, roles: SUPPLY },
      { label: 'แต่งตั้งคณะกรรมการ', href: '/sfmis/setting-committee',             icon: UserCheck,   roles: SUPPLY },
      { label: 'ประเภทพัสดุ',        href: '/sfmis/supplie-setting/type-supplies', icon: ListOrdered, roles: SUPPLY },
      { label: 'หน่วยนับ',           href: '/sfmis/supplie-setting/unit',           icon: Ruler,       roles: SUPPLY },
      { label: 'ร้านค้า/ผู้รับจ้าง', href: '/sfmis/supplie-setting/partner',       icon: Store,       roles: SUPPLY },
      { label: 'สัญญา/ใบสั่งซื้อ',   href: '/sfmis/supplie-setting/contract',      icon: FileText,    roles: SUPPLY },
      { label: 'ตรวจรับพัสดุ',       href: '/sfmis/supplie-setting/inspection',    icon: BadgeCheck,  roles: SUPPLY },
      { label: 'ตรวจสอบพัสดุประจำปี', href: '/sfmis/supplie-setting/annual-check', icon: ShieldCheck, roles: SUPPLY },
      { label: 'จำหน่ายพัสดุ',       href: '/sfmis/supplie-setting/disposal',      icon: Scale,         roles: SUPPLY },
      { label: 'ใบเบิกพัสดุ',        href: '/sfmis/supplie-setting/requisition',   icon: ClipboardSignature, roles: SUPPLY },
      { label: 'ทะเบียนครุภัณฑ์',    href: '/sfmis/supplie-setting/fixed-asset',   icon: HardDrive,     roles: SUPPLY },
      { label: 'หลักประกันสัญญา',    href: '/sfmis/contract-security',             icon: Shield,        roles: SUPPLY },
      { label: 'แจ้งเตือนรับประกัน', href: '/sfmis/supplie-setting/warranty-alert', icon: BellRing,     roles: SUPPLY },
    ],
  },
  {
    label: 'รายงาน',
    icon: BarChart2,
    roles: ALL,
    children: [
      { label: 'ทะเบียนคุมทุกประเภท',        href: '/sfmis/financial-report/unified-register', icon: LayoutList,  roles: ALL },
      { label: 'ควบคุมเช็ค',                  href: '/sfmis/report/check-control',              icon: CreditCard,  roles: FINANCE },
      { label: 'สมุดบัญชีธนาคาร',            href: '/sfmis/report/bookbank',                   icon: BookKey,     roles: FINANCE },
      { label: 'ทะเบียนคุมเงินฝากธนาคาร',   href: '/sfmis/report/bank-ledger',                icon: Landmark,    roles: FINANCE },
      { label: 'งบเทียบยอดธนาคาร',          href: '/sfmis/report/bank-reconciliation',         icon: Scale,       roles: FINANCE },
      { label: 'ควบคุมเงินตามประเภท',        href: '/sfmis/report/money-type',                 icon: PieChart,    roles: ALL },
      { label: 'หนังสือรับรองภาษีหัก ณ ที่จ่าย', href: '/sfmis/report/certificate',           icon: BadgeCheck,  roles: FINANCE },
      { label: 'เงินคงเหลือประจำวัน',            href: '/sfmis/report/daily-balance',          icon: BarChart2,   roles: FINANCE },
    ],
  },
  {
    label: 'ตั้งค่าโรงเรียน',
    icon: Settings,
    roles: ADMIN,
    children: [
      { label: 'ผู้ใช้งาน',       href: '/sfmis/user',                        icon: Users,        roles: ADMIN },
      { label: 'ปีการศึกษา',      href: '/sfmis/year',                        icon: CalendarRange, roles: ADMIN },
      { label: 'นโยบายโรงเรียน', href: '/sfmis/school-policy',               icon: ShieldCheck,  roles: ADMIN },
      { label: 'บัญชีธนาคาร',    href: '/sfmis/business-setting/account-bank', icon: Landmark,   roles: ADMIN },
      { label: 'ยอดยกมาต้นปี',   href: '/sfmis/year/opening-balance',          icon: ArrowDownToLine, roles: ADMIN },
    ],
  },
  {
    label: 'ระบบแอดมิน',
    icon: UserCog,
    roles: SUPER,
    children: [
      { label: 'โรงเรียน',             href: '/sfmis/school',          icon: School,   roles: SUPER },
      { label: 'ผู้ดูแลระบบ',          href: '/sfmis/admin',           icon: UserCog,  roles: SUPER },
      { label: 'นโยบาย สพฐ.',          href: '/sfmis/obec-policy',     icon: Building2, roles: SUPER },
      { label: 'นโยบาย ศธ.',           href: '/sfmis/moe-policy',      icon: Scale,    roles: SUPER },
      { label: 'Quick Win',            href: '/sfmis/quick-win',        icon: CheckSquare, roles: SUPER },
      { label: 'ประเภทรายรับงบประมาณ', href: '/sfmis/budget-income-type', icon: BookOpen, roles: SUPER },
      { label: 'งบห้องเรียน',          href: '/sfmis/classroom-budget', icon: GraduationCap, roles: SUPER },
      { label: 'นโยบาย อปท.',          href: '/sfmis/sao-policy',      icon: BookMarked, roles: SUPER },
      { label: 'อปท.',                 href: '/sfmis/sao',             icon: Building2, roles: SUPER },
      { label: 'Receipt',             href: '/sfmis/receipt',          icon: Receipt,  roles: SUPER },
    ],
  },
  {
    label: 'AI Assistant',
    icon: Sparkles,
    roles: ALL,
    children: [
      { label: 'AI วิเคราะห์รายงาน', href: '/sfmis/ai-insights', icon: Brain,          roles: ALL },
      { label: 'AI ตรวจสอบข้อมูล',  href: '/sfmis/ai-alerts',   icon: AlertTriangle,  roles: ALL },
      { label: 'AI นำเข้าข้อมูล',   href: '/sfmis/ai-merge',    icon: GitMerge,       roles: ALL },
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
