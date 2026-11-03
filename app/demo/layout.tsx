import { AppShell } from '@/components/layout/app-shell';
export const metadata = { robots: { index: false, follow: false } };
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <AppShell isDemo>{children}</AppShell>;
}
