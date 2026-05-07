import { DashboardChrome } from '@/components/DashboardChrome';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <DashboardChrome>{children}</DashboardChrome>;
}
