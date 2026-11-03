'use client';
import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <CircleAlert size={38} />
      <h1>Something interrupted the flow.</h1>
      <p>We couldn’t load this page. Please try again.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <Link className="text-link" href="/">
        Return home
      </Link>
    </main>
  );
}
