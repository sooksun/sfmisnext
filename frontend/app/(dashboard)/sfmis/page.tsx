import { redirect } from 'next/navigation'

// /sfmis ไม่มีหน้า index — เด้งไปแดชบอร์ดหลัก (เข้าเมนูย่อยผ่าน sidebar)
export default function SfmisIndexPage() {
  redirect('/dashboard')
}
