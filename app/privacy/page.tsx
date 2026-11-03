import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
export const metadata = {
  alternates: { canonical: '/privacy' },
  title: 'Privacy',
  description:
    'How VoltSpace handles your account, private electricity bills and optional Gemini analysis.',
};
export default function Privacy() {
  return (
    <main className="legal-page">
      <Logo />
      <h1>Your energy data belongs to you.</h1>
      <p>Last updated: 3 November 2026</p>
      <h2>What the application stores</h2>
      <p>
        VoltSpace stores your account email and profile, bills you verify, uploaded bill documents,
        appliance inventory, tariffs, scenarios, targets and savings-plan progress. The public demo
        uses illustrative records separately from private accounts. Theme preference is stored in
        your browser.
      </p>
      <h2>Private by account</h2>
      <p>
        Supabase provides authentication, database storage and private file storage. Row Level
        Security restricts account records to their owner. Bill documents are accessed using
        short-lived signed links. Anyone you share such a link with may view it until it expires.
        This application does not sell your energy records or include advertising trackers.
      </p>
      <h2>Optional Google Gemini processing</h2>
      <p>
        Bill extraction sends your chosen bill document to Google Gemini only after explicit
        consent. Documents may contain personal identifiers; you can enter a bill manually instead.
        The assistant sends your question and a minimal calculated energy summary, excluding
        document files, account and meter numbers and your email. Avoid placing unnecessary personal
        information in questions. Gemini explanations are checked against calculated facts.
      </p>
      <p>
        Google’s processing and retention depend on the API account and service terms configured by
        the deployment operator. Review{' '}
        <a
          className="text-link"
          href="https://ai.google.dev/gemini-api/terms"
          target="_blank"
          rel="noreferrer"
        >
          Gemini API terms
        </a>{' '}
        before choosing to share data. VoltSpace does not store assistant questions in its database;
        questions and answers remain in the current page session.
      </p>
      <h2>Exports and deletion</h2>
      <p>
        Download reports and JSON exports from Reports or Settings. Account deletion requires
        password verification and explicit confirmation. When the deployment administrator enables
        deletion, uploaded files are removed before the auth account and related database records.
        Removing an account is irreversible. If deletion is not enabled, contact the administrator
        responsible for your deployment. Backups and provider logs may follow the providers’
        retention schedules.
      </p>
      <h2>Security and operational logs</h2>
      <p>
        API keys are processed server-side. AI request counters prevent abuse and are linked to your
        account. Application errors avoid logging bill contents and secrets. Hosting, database and
        AI providers may maintain their own operational logs. No system can guarantee absolute
        security.
      </p>
      <h2>Deployment operator</h2>
      <p>
        The person or organization operating this installation is responsible for its production
        privacy obligations, provider configuration, retention policies and user support. For access
        or deletion requests, contact that operator using the contact channel provided with the
        deployed service.
      </p>
      <div className="legal-links">
        <Link className="text-link" href="/">
          Home
        </Link>
        <Link className="text-link" href="/terms">
          Terms
        </Link>
        <Link className="text-link" href="/settings">
          Manage your data
        </Link>
      </div>
    </main>
  );
}
