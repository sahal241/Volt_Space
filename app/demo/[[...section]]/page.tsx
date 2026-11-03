import { EnergyTwin } from '@/components/intelligence/twin';
import { EnergyAssistant } from '@/components/intelligence/assistant';
import { BillDetail } from '@/components/bills/bill-detail';
import { notFound } from 'next/navigation';
import { Dashboard } from '@/components/dashboard/dashboard';
import { Bills } from '@/components/bills/bills';
import { Appliances } from '@/components/appliances/appliances';
import { Simulator } from '@/components/simulator/simulator';
import { Insights } from '@/components/insights/insights';
import { Reports } from '@/components/reports/reports';
import { Settings } from '@/components/settings/settings';
const pages = {
  twin: EnergyTwin,
  assistant: EnergyAssistant,
  dashboard: Dashboard,
  bills: Bills,
  appliances: Appliances,
  simulator: Simulator,
  insights: Insights,
  reports: Reports,
  settings: Settings,
};
export function generateStaticParams() {
  return [[], ...Object.keys(pages).map((key) => [key])].map((section) => ({ section }));
}
export default async function DemoPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = ['dashboard'] } = await params;
  if (section.length === 2 && section[0] === 'bills') return <BillDetail id={section[1]} />;
  if (section.length > 1 || !Object.hasOwn(pages, section[0])) notFound();
  const Page = pages[section[0] as keyof typeof pages];
  return <Page />;
}
