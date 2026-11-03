import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
export const metadata = {
  alternates: { canonical: '/terms' },
  title: 'Terms',
  description: 'Terms and calculation limitations for using VoltSpace energy intelligence.',
};
export default function Terms() {
  return (
    <main className="legal-page">
      <Logo />
      <h1>Use your energy information thoughtfully.</h1>
      <p>Last updated: 3 November 2026</p>
      <h2>Purpose and scope</h2>
      <p>
        VoltSpace helps residential users understand electricity bills and explore energy habits. It
        is an independent analysis tool, not an electricity provider, certified audit service,
        payment service or electrical fault diagnosis system.
      </p>
      <h2>Your records and account</h2>
      <p>
        Keep your sign-in details secure. Upload documents you have permission to process. Review
        extracted values before saving; you are responsible for correcting inaccurate or incomplete
        data. Do not attempt to access another account’s data, bypass limits or upload malicious
        files.
      </p>
      <h2>Estimates and financial decisions</h2>
      <p>
        Appliance estimates assume entered wattage, quantities, hours and operating days. Actual
        duty cycles, temperature, usage and efficiency vary. Tariff models use your chosen flat or
        progressive rates, fixed charges, tax and other charges; they do not automatically reproduce
        every provider’s subsidies, arrears, adjustments or rounding rules.
      </p>
      <p>
        Forecasts extrapolate historical daily use and do not predict weather or seasonal changes.
        Efficiency scores are personal progress indices, not official energy ratings. Carbon
        emissions use an editable factor whose default is illustrative. Replacement payback and
        return calculations exclude maintenance, financing, inflation and discounting. Independent
        scenarios may overlap and their savings must not be added together. Verify assumptions
        before making purchases or financial decisions.
      </p>
      <h2>AI assistance</h2>
      <p>
        Gemini extraction may be incomplete or incorrect. The assistant explains validated,
        deterministic facts; responses may still be unsuitable for your circumstances. It cannot
        change your account or act on your behalf. Manual bill entry and the calculation tools
        remain available without AI.
      </p>
      <h2>Availability and deletion</h2>
      <p>
        Availability depends on the configured hosting, Supabase and Gemini services, their quotas
        and your connection. Export records you need to retain. Permanent deletion removes account
        records and documents and cannot be undone. The deployment operator manages support, backups
        and any applicable service commitments.
      </p>
      <h2>Privacy and rights</h2>
      <p>
        See the Privacy page for data processing information. These terms do not limit rights that
        cannot lawfully be excluded under applicable law. The deployment operator must provide any
        additional terms, legal identity and support contact required for their public service.
      </p>
      <div className="legal-links">
        <Link className="text-link" href="/">
          Home
        </Link>
        <Link className="text-link" href="/privacy">
          Privacy
        </Link>
      </div>
    </main>
  );
}
