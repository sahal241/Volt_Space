import { Logo } from '@/components/layout/logo';
import { ThemeSwitch } from '@/components/layout/theme-switch';
import { Zap, ShieldCheck, Leaf } from 'lucide-react';
export const metadata = { robots: { index: false, follow: false } };
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <div className="auth-top">
        <Logo />
        <ThemeSwitch />
      </div>
      <aside className="auth-story">
        <div className="eyebrow">A LITTLE CLARITY. A LIGHTER BILL.</div>
        <h2>
          Good energy
          <br />
          starts with
          <br />
          <em>understanding.</em>
        </h2>
        <p>
          Understand your power.
          <br />
          Control your bill.
        </p>
        <div className="auth-orbit">
          <span>
            <Zap size={58} strokeWidth={1} />
          </span>
        </div>
        <div className="auth-story-footer">
          <span>
            <ShieldCheck size={16} />
            Private by design
          </span>
          <span>
            <Leaf size={16} />
            Built for Indian homes
          </span>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
