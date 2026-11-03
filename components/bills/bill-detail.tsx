'use client';
import { useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
import { Card, CardHeader, PageHeading, EmptyState } from '@/components/ui/primitives';
import { api } from '@/lib/utils/api';
import { currency, number } from '@/lib/utils/format';
import { billingDays, compareBills } from '@/lib/calculations/bills';
export function BillDetail({ id }: { id: string }) {
  const { bills, isDemo, settings } = useWorkspace(),
    toast = useToast();
  const [url, setUrl] = useState<string | null>(null),
    [loading, setLoading] = useState(false),
    [documentError, setDocumentError] = useState('');
  const bill = bills.find((b) => b.id === id),
    base = isDemo ? '/demo' : '';
  if (!bill)
    return (
      <Card>
        <EmptyState
          title="Bill not found"
          description="This bill may have been deleted or is not available in your account."
          action={
            <Link className="button secondary" href={`${base}/bills`}>
              Back to bills
            </Link>
          }
        />
      </Card>
    );
  const previous = [...bills]
    .filter((b) => b.billing_month < bill.billing_month)
    .sort((a, b) => b.billing_month.localeCompare(a.billing_month))[0];
  const comparison = compareBills(bill, previous ?? null, settings.tariff);
  const days = billingDays(bill);
  async function openDocument() {
    setLoading(true);
    setDocumentError('');
    try {
      const result = await api<{ url: string }>(`/api/bills/${id}/document`);
      setUrl(result.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open document.';
      setDocumentError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Link className="text-link back-link" href={`${base}/bills`}>
        <ArrowLeft size={15} />
        Back to bills
      </Link>
      <PageHeading
        title={`${format(parseISO(bill.billing_month), 'MMMM yyyy')} electricity bill`}
        description={
          bill.consumer_name
            ? `Verified bill for ${bill.consumer_name}`
            : 'Your verified electricity record.'
        }
        action={
          <span className="badge mint">
            <ShieldCheck size={14} />
            {bill.extraction_status === 'extracted'
              ? 'AI extracted · Human reviewed'
              : 'Manual entry · Reviewed'}
          </span>
        }
      />
      <div className="metrics-grid">
        <Card>
          <p>Consumption</p>
          <div className="metric-value">
            {number(bill.units_consumed ?? 0)}
            <span>kWh</span>
          </div>
        </Card>
        <Card>
          <p>Bill amount</p>
          <div className="metric-value">{currency(bill.bill_amount ?? 0)}</div>
        </Card>
        <Card>
          <p>Average daily usage</p>
          <div className="metric-value">
            {number((bill.units_consumed ?? 0) / days)}
            <span>kWh/day</span>
          </div>
        </Card>
        <Card>
          <p>Effective total rate</p>
          <div className="metric-value">
            {bill.units_consumed ? currency((bill.bill_amount ?? 0) / bill.units_consumed) : '—'}
            <span>/kWh</span>
          </div>
        </Card>
      </div>
      <div className="reports-grid">
        <Card>
          <CardHeader title="Bill summary" />
          <dl className="detail-list">
            {[
              ['Account number', bill.consumer_number],
              ['Meter number', bill.meter_number],
              ['Tariff / category', bill.tariff_category],
              ['Billing start', bill.billing_start],
              ['Billing end', bill.billing_end],
              ['Due date', bill.due_date],
              ['Previous reading', bill.previous_reading],
              ['Current reading', bill.current_reading],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt>{label}</dt>
                <dd>{value ?? 'Not recorded'}</dd>
              </div>
            ))}
            <div>
              <dt>Period used for daily average</dt>
              <dd>{days} days</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Charges" />
          <dl className="detail-list">
            {[
              ['Energy charge', bill.energy_charge],
              ['Fixed charge', bill.fixed_charge],
              ['Taxes', bill.tax],
              ['Other charges', bill.other_charge],
              ['Printed bill total', bill.bill_amount ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt>{label}</dt>
                <dd>{currency(Number(value))}</dd>
              </div>
            ))}
          </dl>
          <p className="form-hint">
            Effective rate includes all recorded charges. If period dates are missing, the billing
            month’s calendar days are used.
          </p>
        </Card>
        <Card>
          <CardHeader
            title="Compared with previous available bill"
            subtitle={
              previous
                ? format(parseISO(previous.billing_month), 'MMMM yyyy')
                : 'Add an earlier bill to unlock comparisons'
            }
          />
          {comparison ? (
            <dl className="detail-list">
              <div>
                <dt>Consumption difference</dt>
                <dd>
                  {comparison.kwhDifference > 0 ? '+' : ''}
                  {number(comparison.kwhDifference)} kWh
                </dd>
              </div>
              <div>
                <dt>Percentage change</dt>
                <dd>
                  {comparison.percentage === null
                    ? 'Not defined: prior use was zero'
                    : `${number(comparison.percentage)}%`}
                </dd>
              </div>
              <div>
                <dt>Bill difference</dt>
                <dd>
                  {comparison.billDifference === null ? '—' : currency(comparison.billDifference)}
                </dd>
              </div>
              <div>
                <dt>Estimated energy cost difference</dt>
                <dd>{currency(comparison.estimatedCostDifference ?? 0)}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">
              No earlier bill is available. Comparisons do not invent a prior month.
            </p>
          )}
          <p className="form-hint">
            Different billing-period lengths can affect comparisons. Estimated costs use your
            current tariff and exclude unchanged fixed fees.
          </p>
        </Card>
        <Card>
          <CardHeader title="Original document" action={<FileText size={20} />} />
          {bill.file_url && !isDemo ? (
            <>
              <p className="muted">
                The original stays private. Preview access expires after two minutes.
              </p>
              <button
                className="button secondary document-button"
                onClick={() => void openDocument()}
                disabled={loading}
              >
                {loading
                  ? 'Opening private file…'
                  : url
                    ? 'Refresh document access'
                    : 'Open private document'}
              </button>
              {documentError && (
                <p role="alert" className="form-error">
                  {documentError}
                </p>
              )}
              {url && (
                <>
                  <a
                    className="text-link"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                  >
                    Open original in a new tab <ExternalLink size={14} />
                  </a>
                  <iframe
                    className="bill-document"
                    src={url}
                    title="Private electricity bill document"
                    referrerPolicy="no-referrer"
                  />
                </>
              )}
            </>
          ) : (
            <p className="muted">No original document is attached to this bill.</p>
          )}
        </Card>
      </div>
    </>
  );
}
