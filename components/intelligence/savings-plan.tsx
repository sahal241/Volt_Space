'use client';
import { useState } from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { Card, CardHeader, EmptyState, Modal } from '@/components/ui/primitives';
import { useWorkspace, useToast } from '@/hooks/use-workspace';
export function SavingsPlanTracker() {
  const { plans, updatePlan, removePlan } = useWorkspace(),
    toast = useToast(),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState<string | null>(null);
  async function act(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Unable to update plan.', 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="phase2-spacing">
      <CardHeader
        title="Your personal savings plan"
        subtitle="Track recommended actions. Completing a task records your progress; it does not claim measured savings."
      />
      {plans.length ? (
        <div className="plan-list">
          {plans.map((p) => (
            <div key={p.id}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={p.status === 'completed'}
                  disabled={busy}
                  onChange={() =>
                    void act(() =>
                      updatePlan(p.id, p.status === 'completed' ? 'planned' : 'completed'),
                    )
                  }
                />
                <span>
                  {p.title}
                  <small className="block muted">
                    {p.status === 'completed' ? 'Completed' : 'Planned'}
                  </small>
                </span>
              </label>
              {p.status === 'completed' && <CheckCircle2 className="accent" size={18} />}
              <button
                className="icon-button danger-text"
                aria-label={`Remove plan ${p.title}`}
                onClick={() => setDeleting(p.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Turn an insight into a habit"
          description="Add a recommendation below to create your personal action plan."
        />
      )}
      {deleting && (
        <Modal title="Remove this planned action?" onClose={() => setDeleting(null)}>
          <p>The original recommendation remains available when its rule applies.</p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await removePlan(deleting);
                  setDeleting(null);
                })
              }
            >
              Remove action
            </button>
          </div>
        </Modal>
      )}
    </Card>
  );
}
