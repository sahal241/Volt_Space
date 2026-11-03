'use client';
import { useState } from 'react';
import { Download, FileChartColumn } from 'lucide-react';
import { PageHeading, Card, Modal } from '@/components/ui/primitives';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
import { buildReport, reportNames, reportCsv, type ReportKind } from '@/lib/reports/model';
import { downloadBlob } from '@/lib/utils/format';
const descriptions = {
  monthly: 'Your verified energy use, household model, emissions and forecast.',
  bills: 'Your complete verified billing history with a charge breakdown.',
  appliances: 'Estimated consumption, costs and operating assumptions for your inventory.',
  savings: 'Compare saved scenarios, replacement payback and personal savings actions.',
};
export function Reports() {
  const w = useWorkspace(),
    toast = useToast(),
    [preview, setPreview] = useState<ReportKind | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const download = async (kind: ReportKind, format: 'pdf' | 'csv' | 'json') => {
    setBusy(true);
    setError('');
    try {
      let blob: Blob;
      if (w.isDemo) {
        const report = buildReport(w, kind, w.month, true);
        if (format === 'pdf') {
          const { createReportPdf } = await import('@/lib/reports/pdf');
          blob = new Blob([new Uint8Array(await createReportPdf(report))], {
            type: 'application/pdf',
          });
        } else
          blob = new Blob(
            [format === 'csv' ? reportCsv(report) : JSON.stringify(report, null, 2)],
            { type: format === 'csv' ? 'text/csv' : 'application/json' },
          );
      } else {
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, month: w.month, format }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'Unable to generate report.');
        }
        blob = await response.blob();
      }
      downloadBlob(`voltspace-${kind}-${w.month}.${format}`, blob);
      toast(`${format.toUpperCase()} report downloaded.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to download report.');
    } finally {
      setBusy(false);
    }
  };
  const report = preview ? buildReport(w, preview, w.month, w.isDemo) : null;
  return (
    <>
      <PageHeading
        eyebrow="YOUR ENERGY STORY"
        title="A clearer view, worth keeping."
        description="Professional PDF reports and portable CSV or JSON exports, generated from your account records."
      />
      <div className="report-banner">
        <FileChartColumn size={40} />
        <div>
          <h2>Your energy, ready to share.</h2>
          <p>Choose a report, review the numbers, and download the format that works for you.</p>
        </div>
        <span className="badge">
          {w.month} · {w.isDemo ? 'Demo' : 'Private account'}
        </span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="reports-grid">
        {(Object.keys(reportNames) as ReportKind[]).map((kind) => (
          <Card className="report-card" key={kind}>
            <span className="insight-icon mint">
              <FileChartColumn size={25} />
            </span>
            <h2>{reportNames[kind]}</h2>
            <p>{descriptions[kind]}</p>
            <div className="report-downloads">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void download(kind, 'pdf')}
              >
                <Download size={15} />
                PDF
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void download(kind, 'csv')}
              >
                CSV
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void download(kind, 'json')}
              >
                JSON
              </button>
              <button className="text-link" onClick={() => setPreview(kind)}>
                Preview
              </button>
            </div>
          </Card>
        ))}
      </div>
      <p className="form-hint">
        Empty sections are identified clearly. Reports distinguish verified bills from modeled
        estimates and document calculation assumptions. Saved scenarios are alternatives, never
        additive savings.
      </p>
      {report && (
        <Modal title={report.title} onClose={() => setPreview(null)}>
          <p className="muted">
            {report.month} · {report.source}
          </p>
          {report.sections.map((s) => (
            <div className="phase2-spacing" key={s.title}>
              <h3>{s.title}</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {s.columns.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((v, j) => (
                          <td key={j}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!s.rows.length && <p className="muted">No records yet.</p>}
            </div>
          ))}
          <details className="phase2-spacing">
            <summary>Assumptions</summary>
            {report.notes.map((n) => (
              <p className="form-hint" key={n}>
                {n}
              </p>
            ))}
          </details>
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void download(preview!, 'pdf')}
            >
              <Download size={16} />
              {busy ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
