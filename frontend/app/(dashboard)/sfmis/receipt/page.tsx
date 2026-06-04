import { redirect } from 'next/navigation'

/** Super-admin menu legacy path → ใบเสร็จรับเงิน */
export default function ReceiptRedirectPage() {
  redirect('/sfmis/financial-report/receipt')
}
