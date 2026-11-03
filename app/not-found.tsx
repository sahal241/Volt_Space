import Link from 'next/link';
import { Zap } from 'lucide-react';
export default function NotFound() {
  return (
    <main className="error-page">
      <Zap size={38} />
      <span className="eyebrow">404 · A LITTLE OFF THE GRID</span>
      <h1>This page isn’t connected.</h1>
      <p>Let’s get you back to a clearer view.</p>
      <Link className="button primary" href="/">
        Return home
      </Link>
    </main>
  );
}
