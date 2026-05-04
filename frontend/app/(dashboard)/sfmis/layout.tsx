import { SfmisRouteGuard } from '@/components/shared/sfmis-route-guard'

export default function SfmisLayout({ children }: { children: React.ReactNode }) {
  return <SfmisRouteGuard>{children}</SfmisRouteGuard>
}
