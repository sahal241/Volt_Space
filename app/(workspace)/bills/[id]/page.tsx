import { BillDetail } from '@/components/bills/bill-detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <BillDetail id={(await params).id} />;
}
