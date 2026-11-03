'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  FileChartColumn,
  FileText,
  FlaskConical,
  House,
  LogOut,
  Menu,
  PlugZap,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Onboarding } from '@/components/intelligence/onboarding';
import { Logo } from './logo';
import { ThemeSwitch } from './theme-switch';
import { WorkspaceProvider, useWorkspace } from '@/components/ui/providers';
import { DemoNotice, Modal } from '@/components/ui/primitives';
import { logout } from '@/app/auth/actions';
import { generateInsights } from '@/lib/insights/rules';
import { format, parseISO } from 'date-fns';
import type { Section } from '@/types';
export const navigation = [
  { slug: 'dashboard', label: 'Overview', Icon: House },
  { slug: 'twin', label: 'Energy twin', Icon: Activity },
  { slug: 'assistant', label: 'Ask VoltSpace', Icon: CircleHelp },
  { slug: 'bills', label: 'My bills', Icon: FileText },
  { slug: 'appliances', label: 'Appliances', Icon: PlugZap },
  { slug: 'simulator', label: 'Savings simulator', Icon: FlaskConical },
  { slug: 'insights', label: 'Energy insights', Icon: ChartNoAxesCombined },
  { slug: 'reports', label: 'Reports', Icon: FileChartColumn },
  { slug: 'settings', label: 'Settings', Icon: Settings },
] as const satisfies readonly { slug: Section; label: string; Icon: typeof House }[];
export function AppShell({
  children,
  isDemo = false,
  email,
}: {
  children: ReactNode;
  isDemo?: boolean;
  email?: string;
}) {
  return (
    <WorkspaceProvider isDemo={isDemo}>
      <Shell email={email}>{children}</Shell>
    </WorkspaceProvider>
  );
}
function Shell({ children, email }: { children: ReactNode; email?: string }) {
  const pathname = usePathname(),
    { isDemo, month, setMonth, bills, appliances, settings, loading, error, refresh } =
      useWorkspace();
  const [menu, setMenu] = useState(false),
    [notifications, setNotifications] = useState(false),
    [help, setHelp] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null),
    menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const sidebar = sidebarRef.current,
      menuButton = menuButtonRef.current;
    const focusable = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') ?? [],
      ).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
      if (event.key !== 'Tab') return;
      const items = focusable(),
        first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      menuButton?.focus();
    };
  }, [menu]);
  const monthOptions = [
    ...new Set([
      month,
      new Date().toISOString().slice(0, 7),
      ...bills.map((b) => b.billing_month.slice(0, 7)),
    ]),
  ]
    .sort()
    .reverse();
  const insightCount = generateInsights(
    bills,
    appliances,
    settings.tariff,
    month,
    settings.billingDays,
  ).length;
  const base = isDemo ? '/demo' : '';
  const current =
    navigation.find(
      (item) => pathname.endsWith(item.slug) || pathname.includes(`/${item.slug}/`),
    ) ?? navigation[0];
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside ref={sidebarRef} className={`sidebar ${menu ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-icon">
            <House size={17} />
          </span>
          <div>
            My home<span>Residential workspace</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-section-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ slug, label, Icon }) => {
            const selected = current.slug === slug;
            return (
              <Link
                key={slug}
                href={`${base}/${slug}`}
                aria-current={selected ? 'page' : undefined}
                className={`nav-link ${selected ? 'active' : ''}`}
                onClick={() => setMenu(false)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {slug === 'insights' && <span className="nav-count">{insightCount}</span>}
                {selected && <span className="nav-active-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Activity size={20} />
            </span>
            <h3>A smarter home starts here.</h3>
            <p>
              Small changes today.
              <br />A lighter bill tomorrow.
            </p>
            <Link href={`${base}/simulator`}>
              Explore your savings <ArrowUpRight size={15} />
            </Link>
          </div>
          <button className="nav-link" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            Help & getting started
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-security">
            <ShieldCheck size={14} />
            Your energy data stays yours
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="app-main">
        <header className="app-header">
          <div className="breadcrumb">
            <button
              ref={menuButtonRef}
              className="icon-button mobile-only"
              aria-label="Open navigation"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span className="desktop-only">Workspace</span>
            <span className="breadcrumb-divider desktop-only">/</span>
            <strong>{current.label}</strong>
          </div>
          <div className="header-actions">
            <label className="month-select">
              <CalendarDays size={16} />
              <span className="sr-only">Current month</span>
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                {monthOptions.map((value) => (
                  <option key={value} value={value}>
                    {format(parseISO(value + '-01'), 'MMMM yyyy')}
                  </option>
                ))}
              </select>
            </label>
            <span className="desktop-only">
              <ThemeSwitch />
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {insightCount > 0 && <i />}
            </button>
            <Link className="avatar" href={`${base}/settings`} aria-label="Profile settings">
              {email ? email.slice(0, 2).toUpperCase() : 'AM'}
            </Link>
          </div>
        </header>
        <main id="main-content" className="workspace-main">
          {isDemo && <DemoNotice />}
          {loading ? (
            <div className="page-loading" role="status">
              <span className="loading-ring" />
              <p>Loading your private workspace…</p>
            </div>
          ) : error ? (
            <section className="card empty-state" role="alert">
              <h1>We couldn’t load your workspace.</h1>
              <p>{error}</p>
              <button className="button primary" onClick={() => void refresh()}>
                Try again
              </button>
            </section>
          ) : (
            <>
              <Onboarding />
              {children}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            VoltSpace AI <span className="footer-dot">·</span> Understand your power. Control your
            bill.
          </span>
          {isDemo ? (
            <Link href="/auth/signup">
              Create your account <ArrowUpRight size={13} />
            </Link>
          ) : (
            <form action={logout}>
              <button className="text-link" type="submit">
                <LogOut size={14} />
                Log out
              </button>
            </form>
          )}
          <span className="footer-legal">
            <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
          </span>
        </footer>
      </div>
      {notifications && (
        <Modal title="Notifications" onClose={() => setNotifications(false)}>
          <div className="notice">
            <Bell size={22} />
            <div>
              <h3>Your energy activity</h3>
              <p>
                {bills.length} verified bills and {appliances.length} appliances in this workspace.{' '}
                {insightCount} current energy insights are ready to review.
              </p>
            </div>
          </div>
          <Link
            className="button primary phase2-spacing"
            href={`${base}/insights`}
            onClick={() => setNotifications(false)}
          >
            Review energy insights
          </Link>
        </Modal>
      )}
      {help && (
        <Modal title="Welcome to VoltSpace" onClose={() => setHelp(false)}>
          <p className="muted">
            Upload and review your electricity bills, add appliances, and compare energy scenarios.
            The public demo is separate from private account data.
          </p>
          <div className="notice">
            <ShieldCheck size={24} />
            <p>
              AI analysis sends the chosen document to Google Gemini only after you consent. Review
              extracted values before saving. Manual bill entry is always available.
            </p>
          </div>
          <Link className="button primary" href="/" onClick={() => setHelp(false)}>
            How VoltSpace works <ArrowUpRight size={16} />
          </Link>
        </Modal>
      )}
    </div>
  );
}
