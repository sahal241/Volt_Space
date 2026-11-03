import { Zap } from 'lucide-react';
import Link from 'next/link';
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="logo" aria-label="VoltSpace AI home">
      <span className="logo-mark">
        <Zap size={23} fill="currentColor" strokeWidth={1.5} />
      </span>
      {!compact && (
        <span>
          VoltSpace<span className="logo-ai">AI</span>
        </span>
      )}
    </Link>
  );
}
