'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  FileText,
  UploadCloud,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Search,
  X,
  LoaderCircle,
} from 'lucide-react';
import { Card, CardHeader, EmptyState, Modal, PageHeading } from '@/components/ui/primitives';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
import { validateBillFile } from '@/lib/validation/schemas';
import { inspectFile } from '@/lib/validation/files';
import { createBillStorage } from '@/lib/supabase/bill-storage';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/utils/api';
import { currency, number } from '@/lib/utils/format';
import type { Bill } from '@/types';
import type { ExtractedBill, BillInput } from '@/lib/validation/bills';
import { BillForm } from './bill-form';
interface Review {
  id: string;
  source: 'manual' | 'extracted';
  initial?: Bill | ExtractedBill;
  path: string | null;
  editing: boolean;
  warnings: string[];
}
export function Bills() {
  const { bills, isDemo, saveBill, removeBill } = useWorkspace(),
    toast = useToast(),
    input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [path, setPath] = useState<string | null>(null),
    [uploadId, setUploadId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false),
    [dragging, setDragging] = useState(false),
    [review, setReview] = useState<Review | null>(null),
    [deleting, setDeleting] = useState<Bill | null>(null),
    [consent, setConsent] = useState(false);
  const [year, setYear] = useState('all'),
    [search, setSearch] = useState(''),
    [sort, setSort] = useState('newest'),
    [pending, setPending] = useState<
      { id: string; file_path: string; created_at: string; byte_size: number }[]
    >([]),
    [uploadError, setUploadError] = useState('');
  const loadPending = useCallback(async () => {
    if (isDemo) return;
    try {
      setPending(await api('/api/bills/uploads'));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to load pending uploads.');
    }
  }, [isDemo]);
  useEffect(() => {
    if (!isDemo) {
      let active = true;
      api<typeof pending>('/api/bills/uploads')
        .then((data) => {
          if (active) setPending(data);
        })
        .catch((error) => {
          if (active)
            setUploadError(
              error instanceof Error ? error.message : 'Pending upload list unavailable.',
            );
        });
      return () => {
        active = false;
      };
    }
  }, [isDemo]);
  async function choose(selected: File | null) {
    if (!selected) return;
    const message = validateBillFile(selected);
    if (message) {
      toast(message, 'error');
      return;
    }
    try {
      inspectFile(new Uint8Array(await selected.arrayBuffer()), selected.type);
      setFile(selected);
      setPath(null);
      setUploadId(crypto.randomUUID());
      setConsent(false);
      setUploadError('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Invalid file.', 'error');
    }
    if (input.current) input.current.value = '';
  }
  async function stage() {
    if (!file) return null;
    if (path) return path;
    if (isDemo) return null;
    try {
      const uploaded = await createBillStorage(createClient()).stage(file, uploadId);
      setPath(uploaded);
      return uploaded;
    } catch (error) {
      await loadPending();
      throw error;
    }
  }
  async function analyze() {
    if (!file) return;
    if (isDemo) {
      toast(
        'AI analysis is available in your signed-in workspace. Manual demo entry is available here.',
        'error',
      );
      return;
    }
    setBusy(true);
    setUploadError('');
    try {
      const uploaded = await stage();
      const result = await api<{ extracted: ExtractedBill; warnings: string[] }>(
        '/api/bills/extract',
        { method: 'POST', body: { id: uploadId, path: uploaded, consent } },
      );
      setReview({
        id: uploadId,
        source: 'extracted',
        initial: result.extracted,
        path: uploaded,
        editing: false,
        warnings: [
          `Model confidence: ${result.extracted.confidence}. This is a self-assessment, not a measured probability.`,
          ...result.warnings,
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed.';
      setUploadError(message);
      toast(message, 'error');
    } finally {
      setBusy(false);
      void loadPending();
    }
  }
  function manual() {
    setReview({ id: uploadId, source: 'manual', path, editing: false, warnings: [] });
  }
  async function save(values: BillInput) {
    if (!review) return;
    let attached = review.path;
    if (!review.editing && file && !attached) attached = await stage();
    await saveBill(review.id, values, attached, review.editing);
    setReview(null);
    setFile(null);
    setPath(null);
    setUploadId(crypto.randomUUID());
    toast(isDemo ? 'Verified bill saved to the demo session.' : 'Verified bill saved securely.');
    void loadPending();
  }
  async function discard(id: string) {
    setBusy(true);
    try {
      await api('/api/bills/uploads', { method: 'DELETE', body: { id } });
      if (id === uploadId) {
        setPath(null);
        setFile(null);
        setUploadId(crypto.randomUUID());
        setReview(null);
      }
      await loadPending();
      toast('Pending upload removed.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to discard file.', 'error');
    } finally {
      setBusy(false);
    }
  }
  const years = [...new Set(bills.map((b) => b.billing_month.slice(0, 4)))].sort().reverse();
  const filtered = bills
    .filter(
      (b) =>
        (year === 'all' || b.billing_month.startsWith(year)) &&
        [
          b.consumer_name,
          b.consumer_number,
          b.meter_number,
          b.billing_month,
          b.tariff_category,
          format(parseISO(b.billing_month), 'MMMM yyyy'),
        ].some((value) => value?.toLowerCase().includes(search.toLowerCase())),
    )
    .sort((a, b) =>
      sort === 'amount'
        ? (b.bill_amount ?? 0) - (a.bill_amount ?? 0)
        : sort === 'units'
          ? (b.units_consumed ?? 0) - (a.units_consumed ?? 0)
          : sort === 'oldest'
            ? a.billing_month.localeCompare(b.billing_month)
            : b.billing_month.localeCompare(a.billing_month),
    );
  const base = isDemo ? '/demo' : '';
  return (
    <>
      <PageHeading
        eyebrow="THE BIGGER PICTURE"
        title="Your bills, made clearer."
        description="Upload, review and keep a reliable history of your electricity use."
        action={
          <button className="button primary" disabled={busy || !!review} onClick={manual}>
            <Plus size={16} />
            Enter bill manually
          </button>
        }
      />
      {!review && (
        <>
          <Card className="upload-card">
            <div className="upload-intro">
              <span className="appliance-icon">
                <FileText size={24} />
              </span>
              <h2>Upload an electricity bill</h2>
              <p>PDF, PNG, JPG or JPEG. Original files stay in private, account-scoped storage.</p>
              <span className="badge mint">Review before saving</span>
            </div>
            <div
              className={`upload-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (!busy && !file) void choose(event.dataTransfer.files[0] ?? null);
              }}
            >
              <UploadCloud size={33} />
              <h3>{file ? file.name : 'Drop your bill here'}</h3>
              <p>
                {file
                  ? `${number(file.size / 1024)} KB · ${path ? 'Uploaded privately' : 'Ready to upload'}`
                  : 'or choose a file from your device'}
              </p>
              {!file ? (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                >
                  Choose file
                </button>
              ) : (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    if (path) void discard(uploadId);
                    else {
                      setFile(null);
                      setUploadId(crypto.randomUUID());
                    }
                  }}
                >
                  <X size={14} />
                  Remove file
                </button>
              )}
              <input
                className="sr-only"
                ref={input}
                type="file"
                accept="application/pdf,image/png,image/jpeg,.jpg,.jpeg"
                aria-label="Choose electricity bill"
                onChange={(event) => void choose(event.target.files?.[0] ?? null)}
              />
              <span>Up to 10 MB · no public document URLs</span>
            </div>
          </Card>
          {file && (
            <Card className="analysis-controls">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                I agree to send this bill, including account details it contains, to Google Gemini
                for extraction.
              </label>
              <p className="form-hint">
                AI is optional. Manual entry keeps your bill out of Gemini.{' '}
                {isDemo ? 'Demo files are not uploaded.' : ''}
              </p>
              <div className="modal-actions">
                <button className="button secondary" disabled={busy} onClick={manual}>
                  Use manual entry
                </button>
                <button
                  className="button primary"
                  disabled={busy || !consent}
                  onClick={() => void analyze()}
                >
                  {busy ? (
                    <>
                      <LoaderCircle className="spin" size={16} />
                      Analyzing…
                    </>
                  ) : (
                    'Analyze bill'
                  )}
                </button>
              </div>
            </Card>
          )}
          {uploadError && (
            <div className="notice warning" role="alert">
              <p>
                {uploadError}{' '}
                <button className="text-link" disabled={busy} onClick={manual}>
                  Enter manually
                </button>
              </p>
            </div>
          )}
        </>
      )}
      {review && (
        <BillForm
          key={`${review.id}-${review.source}`}
          initial={review.initial}
          source={review.source}
          warnings={review.warnings}
          onSave={save}
          onCancel={() => setReview(null)}
        />
      )}
      {!isDemo && pending.length > 0 && (
        <Card className="staged-files">
          <CardHeader
            title="Pending original files"
            subtitle="These have no saved bill record. Resume manual entry or discard files you no longer need."
          />
          {pending.map((ticket) => (
            <div className="staged-file" key={ticket.id}>
              <FileText size={18} />
              <div>
                <strong>{ticket.file_path.split('/').at(-1)}</strong>
                <span>Uploaded {format(parseISO(ticket.created_at), 'dd MMM yyyy, HH:mm')}</span>
              </div>
              {ticket.byte_size > 1 && (
                <button
                  className="text-link"
                  disabled={busy || !!review}
                  onClick={() => {
                    setFile(null);
                    setPath(ticket.file_path);
                    setUploadId(ticket.id);
                    setReview({
                      id: ticket.id,
                      source: 'manual',
                      path: ticket.file_path,
                      editing: false,
                      warnings: [],
                    });
                  }}
                >
                  Resume
                </button>
              )}
              <button
                className="icon-button danger-text"
                disabled={busy}
                aria-label={`Discard pending upload ${ticket.id}`}
                onClick={() => void discard(ticket.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </Card>
      )}
      <Card className="bills-table-card">
        <CardHeader
          title="Bill history"
          subtitle={isDemo ? 'Illustrative demo records' : 'Verified records from your account'}
          action={<span className="badge">{filtered.length} bills</span>}
        />
        <div className="bill-filters">
          <label className="search-field">
            <Search size={16} />
            <span className="sr-only">Search bills</span>
            <input
              placeholder="Search account, meter or period…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter year</span>
            <select value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort bills</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount">Highest amount</option>
              <option value="units">Highest usage</option>
            </select>
          </label>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Billing period</th>
                  <th>Units consumed</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bill) => (
                  <tr key={bill.id}>
                    <td>
                      <span className="table-bill-title">
                        <FileText size={18} />
                        {format(parseISO(bill.billing_month), 'MMMM yyyy')}
                      </span>
                    </td>
                    <td>
                      {bill.units_consumed === null
                        ? 'Not recorded'
                        : `${number(bill.units_consumed)} kWh`}
                    </td>
                    <td>
                      <strong>
                        {bill.bill_amount === null ? 'Not recorded' : currency(bill.bill_amount)}
                      </strong>
                    </td>
                    <td>
                      <span className="badge mint">
                        {bill.extraction_status === 'extracted'
                          ? 'Extracted · Reviewed'
                          : 'Manual · Reviewed'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="icon-button"
                          aria-label={`View ${bill.billing_month} bill`}
                          href={`${base}/bills/${bill.id}`}
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          className="icon-button"
                          disabled={busy || !!review}
                          aria-label={`Edit ${bill.billing_month} bill`}
                          onClick={() =>
                            setReview({
                              id: bill.id,
                              source: bill.extraction_status ?? 'manual',
                              initial: bill,
                              path: bill.file_url,
                              editing: true,
                              warnings: [],
                            })
                          }
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger-text"
                          disabled={busy}
                          aria-label={`Delete ${bill.billing_month} bill`}
                          onClick={() => setDeleting(bill)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              bills.length ? 'No bills match these filters' : 'Your first bill starts the story'
            }
            description={
              bills.length
                ? 'Try a different year or search.'
                : 'Upload a bill for review, or enter its details manually. No AI is required.'
            }
          />
        )}
      </Card>
      {deleting && (
        <Modal
          title="Delete this bill?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p className="muted">
            This removes the record and its private original document. This action cannot be undone.
          </p>
          <div className="modal-actions">
            <button className="button secondary" disabled={busy} onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const warning = await removeBill(deleting.id);
                  setDeleting(null);
                  toast(warning ?? 'Bill deleted.', warning ? 'error' : 'success');
                  await loadPending();
                } catch (error) {
                  toast(error instanceof Error ? error.message : 'Delete failed.', 'error');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Deleting…' : 'Delete bill'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
