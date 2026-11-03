'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/primitives';
import { useWorkspace } from '@/hooks/use-workspace';
import { api } from '@/lib/utils/api';
export function DeleteAccount({ onClose }: { onClose: () => void }) {
  const { isDemo } = useWorkspace(),
    router = useRouter(),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [readiness, setReadiness] = useState<{ available: boolean; reason: string | null } | null>(
    null,
  );
  useEffect(() => {
    if (isDemo) return;
    let active = true;
    const controller = new AbortController();
    api<{ available: boolean; reason: string | null }>('/api/account', {
      signal: controller.signal,
    })
      .then((value) => {
        if (active) setReadiness(value);
      })
      .catch((error) => {
        if (active)
          setReadiness({
            available: false,
            reason:
              error instanceof Error ? error.message : 'Unable to verify deletion configuration.',
          });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [isDemo]);
  return (
    <Modal
      title="Permanently delete account"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {isDemo ? (
        <p className="muted">
          Demo mode has no account to delete. Your private account is unaffected.
        </p>
      ) : (
        <>
          <p>
            This permanently deletes your sign-in, profile, bills, private documents, appliances,
            targets, plans and saved scenarios. Export your records first. This cannot be undone.
          </p>
          {!readiness?.available && (
            <p className="notice warning">
              {readiness === null ? 'Checking secure account deletion…' : readiness.reason} Your
              data remains intact.
            </p>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api('/api/account', { method: 'DELETE', body: { password, confirmation } });
                setPassword('');
                router.replace('/?account=deleted');
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to delete account.');
                setBusy(false);
              }
            }}
          >
            <label className="phase2-spacing">
              Current password
              <input
                required
                type="password"
                autoComplete="current-password"
                maxLength={256}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="phase2-spacing">
              Type DELETE to confirm
              <input
                required
                autoComplete="off"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
                Cancel
              </button>
              <button
                className="button primary danger-button"
                disabled={busy || !readiness?.available || confirmation !== 'DELETE' || !password}
              >
                {busy ? 'Removing account…' : 'Permanently delete my account'}
              </button>
            </div>
          </form>
        </>
      )}
      {isDemo && (
        <div className="modal-actions">
          <button className="button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </Modal>
  );
}
