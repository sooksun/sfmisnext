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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  children?: NavItem[]
}

const navGroups: NavItem[] = [
  {
    label: 'แดชบอร์ด',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'งานนโยบายและแผน',
    icon: BookOpen,
    children: [
      { label: 'ข้อมูลนักเรียน', href: '/sfmis/student', icon: GraduationCap },
      { label: 'เกณฑ์เงินต่อหัวนักเรียน', href: '/sfmis/perhead-rate-setting', icon: TrendingUp },
      { label: 'คำนวณเงินต่อหัวนักเรียน', href: '/sfmis/calculate-perhead', icon: Calculator },
      { label: 'การจัดสรรงบประมาณ', href: '/sfmis/budget-allocation', icon: Wallet },
      { label: 'หมวดงบประมาณ', href: '/sfmis/budget-category', icon: Layers },
      { label: 'งบประมาณที่ได้รับจริง', href: '/sfmis/real-budget', icon: ArrowUpDown },
      { label: 'รายจ่าย', href: '/sfmis/expenses', icon: DollarSign },
      { label: 'ประมาณการปีการศึกษา', href: '/sfmis/estimate-acadyear', icon: CalendarRange },
      { label: 'แผนงาน/โครงการ', href: '/sfmis/plan-menu/project', icon: FolderOpen },
      { label: 'อนุมัติโครงการ', href: '/sfmis/plan-menu/proj-approve', icon: CheckSquare },
    ],
  },
  {
    label: 'งานการเงิน',
    icon: DollarSign,
    children: [
      { label: 'รับเงิน', href: '/sfmis/receive-menu/receive', icon: ArrowDownToLine },
      { label: 'ใบสำคัญจ่าย', href: '/sfmis/pay-menu/invoice', icon: FileText },
      { label: 'ตรวจสอบใบสำคัญจ่าย', href: '/sfmis/confirm-invoice', icon: ClipboardList },
      { label: 'สร้างเช็ค', href: '/sfmis/pay-menu/generate-check', icon: CreditCard },
      { label: 'หนังสือรับรองหักภาษี ณ ที่จ่าย', href: '/sfmis/pay-menu/withholding-certificate', icon: FileText },
      { label: 'ใบเสร็จรับเงิน', href: '/sfmis/financial-report/receipt', icon: BookMarked },
      { label: 'ยอดเงินคงเหลือประจำวัน', href: '/sfmis/financial-report/daily-balance', icon: BarChart2 },
    ],
  },
  {
    label: 'งานพัสดุ',
    icon: Package,
    children: [
      { label: 'บัญชีวัสดุ', href: '/sfmis/supplies', icon: Boxes },
      { label: 'รับพัสดุ', href: '/sfmis/receive-parcel', icon: Truck },
      { label: 'ยืนยันรับพัสดุ', href: '/sfmis/receive-parcel-confirm', icon: PackageCheck },
      { label: 'เบิกพัสดุ', href: '/sfmis/supplie-setting/withdraw', icon: ClipboardCheck },
      { label: 'อนุมัติขอซื้อ/ขอจ้าง', href: '/sfmis/supplie-setting/withdraw-confirm', icon: CheckSquare },
      { label: 'แต่งตั้งคณะกรรมการ', href: '/sfmis/setting-committee', icon: UserCheck },
      { label: 'ประเภทพัสดุ', href: '/sfmis/supplie-setting/type-supplies', icon: ListOrdered },
      { label: 'หน่วยนับ', href: '/sfmis/supplie-setting/unit', icon: Ruler },
      { label: 'ร้านค้า/ผู้รับจ้าง', href: '/sfmis/supplie-setting/partner', icon: Store },
    ],
  },
  {
    label: 'รายงาน',
    icon: BarChart2,
    children: [
      { label: 'ควบคุมเช็ค', href: '/sfmis/report/check-control', icon: CreditCard },
      { label: 'สมุดบัญชีธนาคาร', href: '/sfmis/report/bookbank', icon: BookKey },
      { label: 'ควบคุมเงินตามประเภท', href: '/sfmis/report/money-type', icon: PieChart },
      { label: 'หนังสือรับรองภาษีหัก ณ ที่จ่าย', href: '/sfmis/report/certificate', icon: BadgeCheck },
    ],
  },
  {
    label: 'ตั้งค่าโรงเรียน',
    icon: Settings,
    children: [
      { label: 'ผู้ใช้งาน', href: '/sfmis/user', icon: Users },
      { label: 'ปีการศึกษา', href: '/sfmis/year', icon: CalendarRange },
      { label: 'นโยบายโรงเรียน', href: '/sfmis/school-policy', icon: ShieldCheck },
      { label: 'บัญชีธนาคาร', href: '/sfmis/business-setting/account-bank', icon: Landmark },
    ],
  },
  {
    label: 'ระบบแอดมิน',
    icon: UserCog,
    children: [
      { label: 'โรงเรียน', href: '/sfmis/school', icon: School },
      { label: 'ผู้ดูแลระบบ', href: '/sfmis/admin', icon: UserCog },
      { label: 'นโยบาย สพฐ.', href: '/sfmis/obec-policy', icon: Building2 },
      { label: 'นโยบาย ศธ.', href: '/sfmis/moe-policy', icon: Scale },
      { label: 'Quick Win', href: '/sfmis/quick-win', icon: CheckSquare },
      { label: 'ประเภทรายรับงบประมาณ', href: '/sfmis/budget-income-type', icon: BookOpen },
      { label: 'งบห้องเรียน', href: '/sfmis/classroom-budget', icon: GraduationCap },
      { label: 'นโยบาย อปท.', href: '/sfmis/sao-policy', icon: BookMarked },
      { label: 'อปท.', href: '/sfmis/sao', icon: Building2 },
      { label: 'Receipt',  href: '/sfmis/receipt', icon: Receipt },
    ],
  },
]

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => {
    if (!item.children) return false
    return item.children.some((child) => child.href && pathname.startsWith(child.href))
  })

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false

  if (item.children) {
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
            {item.children.map((child) => (
              <NavLink key={child.href ?? child.label} item={child} depth={depth + 1} />
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
          <NavLink key={item.href ?? item.label} item={item} />
        ))}
      </nav>
    </aside>
  )
}
