import Link from 'next/link';
import {
  Activity,
  MessageCircle,
  Target,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  FileSearch,
  FlaskConical,
  Gauge,
  Leaf,
  LockKeyhole,
  PlugZap,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import { ThemeSwitch } from '@/components/layout/theme-switch';
import { DashboardPreview } from '@/components/dashboard/dashboard-preview';
const features = [
  {
    Icon: FileSearch,
    title: 'AI Bill Analysis',
    text: 'From a confusing bill to a clearer picture of your charges and consumption.',
    actionLabel: 'Extract, review, then save',
    href: '/auth/signup',
  },
  {
    Icon: BarChart3,
    title: 'Energy Dashboard',
    text: 'See your consumption, spending and energy trends in one considered space.',
    actionLabel: 'Explore the demo',
    href: '/demo/dashboard',
  },
  {
    Icon: PlugZap,
    title: 'Appliance Estimator',
    text: 'Connect your everyday appliances to their estimated monthly energy cost.',
    actionLabel: 'Build your inventory',
    href: '/demo/appliances',
  },
  {
    Icon: Gauge,
    title: 'Bill Calculator',
    text: 'Turn kilowatt-hours into meaningful cost estimates with a custom tariff.',
    actionLabel: 'Flat and progressive slab rates',
    href: '/demo/simulator#bill-estimator',
  },
  {
    Icon: Sparkles,
    title: 'Smart Recommendations',
    text: 'Find practical changes that can help your home use energy more thoughtfully.',
    actionLabel: 'Explore your recommendations',
    href: '/demo/insights',
  },
  {
    Icon: FlaskConical,
    title: 'Savings Simulator',
    text: 'What if you used the AC a little less? See the potential before you change a habit.',
    actionLabel: 'Compare household scenarios',
    href: '/demo/simulator',
  },
  {
    Icon: Activity,
    title: 'Energy Digital Twin',
    text: 'Reconcile bills with appliance estimates and explore an interactive model of your household.',
    actionLabel: 'Follow your energy',
    href: '/demo/twin',
  },
  {
    Icon: MessageCircle,
    title: 'Ask VoltSpace',
    text: 'Get a grounded explanation of your energy data, with every number supplied by verified calculations.',
    actionLabel: 'Try the demo assistant',
    href: '/demo/assistant',
  },
  {
    Icon: Target,
    title: 'Forecasts & Targets',
    text: 'Plan ahead with transparent forecasts, personal budgets and an adjustable emissions estimate.',
    actionLabel: 'Explore your next month',
    href: '/demo/twin',
  },
];
export const metadata = { alternates: { canonical: '/' } };
export default function Home() {
  return (
    <div className="landing">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="landing-header">
        <Logo />
        <nav aria-label="Public navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#privacy">Your privacy</a>
        </nav>
        <div>
          <ThemeSwitch />
          <Link href="/auth/login" className="login-link">
            Log in
          </Link>
          <Link href="/auth/signup" className="button primary small">
            Get started <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main id="main-content">
        <section className="hero">
          <div className="hero-grid-pattern" aria-hidden="true" />
          <div className="hero-copy">
            <span className="hero-pill">
              <span className="live-dot" />A little intelligence. A lot less guesswork.
            </span>
            <h1>
              Understand where
              <br />
              every unit of
              <br />
              <em>electricity goes.</em>
            </h1>
            <p>
              Make sense of your electricity bill, discover what powers your consumption, and find
              small changes that could make a real difference.
            </p>
            <div className="hero-buttons">
              <Link className="button primary" href="/auth/signup">
                Analyze My Bill <ArrowUpRight size={18} />
              </Link>
              <Link className="button secondary" href="/demo/dashboard">
                Explore Demo <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-note">
              <ShieldCheck size={15} />
              <span>Built for Indian homes</span>
              <span>·</span>
              <span>Your data, in your control</span>
            </div>
            <p className="hero-phase">
              AI extraction is optional. Every bill is reviewed before saving.
            </p>
          </div>
          <div className="hero-visual">
            <div className="hero-energy-label">
              <span className="live-dot" />
              THE BIGGER PICTURE, AT A GLANCE
            </div>
            <DashboardPreview />
            <div className="hero-float">
              <span>
                <Leaf size={20} />
              </span>
              <div>
                <strong>Small changes add up.</strong>
                <p>
                  Sample savings potential <b>₹420/mo</b>
                </p>
              </div>
            </div>
            <div className="energy-flow-label">
              <Zap size={13} /> FROM EVERYDAY ENERGY TO EVERYDAY CLARITY
            </div>
          </div>
        </section>
        <div className="landing-belief">
          <span>LESS GUESSWORK.</span>
          <span>MORE UNDERSTANDING.</span>
          <span>BETTER ENERGY.</span>
          <a href="#how-it-works" aria-label="See how it works">
            <ArrowDown size={18} />
          </a>
        </div>
        <section id="how-it-works" className="landing-section how-section">
          <div className="section-title">
            <span className="eyebrow">CLARITY, IN THREE SMALL STEPS</span>
            <h2>
              Your bill is just
              <br />
              the beginning.
            </h2>
            <p>
              You shouldn’t need to be an engineer to understand the energy that powers your home.
            </p>
          </div>
          <div className="steps-grid">
            {[
              {
                Icon: UploadCloud,
                title: 'Upload your bill',
                text: 'Start with a PDF or a clear photo. Review the extracted values, or enter your bill manually.',
              },
              {
                Icon: BarChart3,
                title: 'Understand consumption',
                text: 'Find the patterns behind your usage. See how appliances and everyday habits add up.',
              },
              {
                Icon: Leaf,
                title: 'Save intelligently',
                text: 'Explore practical changes, simulate the difference, and build better energy habits.',
              },
            ].map(({ Icon, title, text }, i) => (
              <div className="step" key={title}>
                <div className="step-top">
                  <span>
                    <Icon size={25} strokeWidth={1.5} />
                  </span>
                  <b>0{i + 1}</b>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="features" className="landing-section features-section">
          <div className="section-title centered">
            <span className="eyebrow">BUILT AROUND YOUR HOME</span>
            <h2>
              A smarter relationship
              <br />
              with your electricity.
            </h2>
            <p>Thoughtful tools that turn complicated numbers into clear, useful decisions.</p>
          </div>
          <div className="features-grid">
            {features.map(({ Icon, title, text, actionLabel, href }) => (
              <article className="feature-card" key={title}>
                <span className="feature-icon">
                  <Icon size={23} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link className="feature-phase" href={href}>
                  {actionLabel}
                  <ChevronRight size={13} />
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-section intelligence-section">
          <div className="section-title">
            <span className="eyebrow">THE POWER OF PERSPECTIVE</span>
            <h2>
              Finally, a bill
              <br />
              that <em>makes sense.</em>
            </h2>
            <p>
              A calmer view of your home’s energy. Clear trends, useful estimates, and the context
              to understand what’s changing.
            </p>
            <ul className="check-list">
              <li>
                <Check size={17} />
                Know where your energy goes
              </li>
              <li>
                <Check size={17} />
                Compare the months that matter
              </li>
              <li>
                <Check size={17} />
                Find your next opportunity to save
              </li>
            </ul>
            <Link className="text-link" href="/demo/dashboard">
              Take a look inside <ArrowUpRight size={17} />
            </Link>
          </div>
          <DashboardPreview />
        </section>
        <section id="privacy" className="landing-section privacy-section">
          <div className="privacy-symbol">
            <ShieldCheck size={56} strokeWidth={1} />
            <LockKeyhole size={20} />
          </div>
          <div className="section-title">
            <span className="eyebrow">PRIVATE BY DESIGN</span>
            <h2>
              Your home.
              <br />
              Your energy. Your data.
            </h2>
            <p>
              You decide what to share. Account records are protected with individual access
              controls, bill storage is private, and your data stays under your control.
            </p>
            <div className="privacy-points">
              <span>
                <LockKeyhole size={15} />
                Private storage
              </span>
              <span>
                <ShieldCheck size={15} />
                Account-level access
              </span>
            </div>
          </div>
        </section>
        <section className="landing-final-cta">
          <span className="final-zap">
            <Zap size={34} strokeWidth={1.5} />
          </span>
          <span className="eyebrow">UNDERSTAND YOUR POWER. CONTROL YOUR BILL.</span>
          <h2>
            A better energy habit
            <br />
            starts with a little clarity.
          </h2>
          <p>Take the first step towards a more thoughtful, efficient home.</p>
          <Link className="button primary" href="/auth/signup">
            Start with VoltSpace <ArrowUpRight size={18} />
          </Link>
          <Link className="final-demo-link" href="/demo/dashboard">
            Or explore the demo first <ArrowRight size={14} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <div>
          <Logo />
          <p>Understand your power. Control your bill.</p>
        </div>
        <div>
          <Link href="/demo/dashboard">Explore demo</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/auth/login">Log in</Link>
        </div>
        <span>
          © {new Date().getFullYear()} VoltSpace AI
          <br />
          Made for a more efficient tomorrow.
        </span>
      </footer>
    </div>
  );
}
