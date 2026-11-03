import { useId } from 'react';
import { ArrowDownRight, Leaf, Zap } from 'lucide-react';
export function DashboardPreview() {
  const gradientId = useId();
  return (
    <div
      className="dashboard-preview"
      aria-label="Illustrative energy dashboard showing 286 kWh consumption, a ₹2,340 bill, and an efficiency score of 82"
    >
      <div className="preview-titlebar">
        <div>
          <span />
          <span />
          <span />
        </div>
        <span>voltspace / your home</span>
        <span className="preview-live">
          <i /> DEMO OVERVIEW
        </span>
      </div>
      <div className="preview-content">
        <div className="preview-heading">
          <div>
            <span className="eyebrow">YOUR HOME, IN BALANCE</span>
            <h3>Good energy. Better living.</h3>
          </div>
          <span className="preview-date">November 2026</span>
        </div>
        <div className="preview-metrics">
          <div>
            <span>
              <Zap size={13} /> Monthly consumption
            </span>
            <strong>
              286 <small>kWh</small>
            </strong>
            <em>
              <ArrowDownRight size={12} />
              12% vs. last month
            </em>
          </div>
          <div>
            <span>Estimated bill</span>
            <strong>₹2,340</strong>
            <em>
              <ArrowDownRight size={12} />
              ₹330 less this month
            </em>
          </div>
          <div>
            <span>
              <Leaf size={13} /> Savings potential
            </span>
            <strong>
              ₹420 <small>/mo</small>
            </strong>
            <em>Small changes. Real impact.</em>
          </div>
        </div>
        <div className="preview-chart">
          <div className="preview-chart-heading">
            <strong>Your energy, over time</strong>
            <span>
              <i />
              Consumption (kWh)
            </span>
          </div>
          <div className="preview-chart-svg">
            <svg
              viewBox="0 0 600 150"
              role="img"
              aria-label="Sample consumption falls from 342 to 286 kWh"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#21c9ae" stopOpacity=".25" />
                  <stop offset="1" stopColor="#21c9ae" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[20, 60, 100, 140].map((y) => (
                <line
                  x1="0"
                  y1={y}
                  x2="600"
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 5"
                  key={y}
                />
              ))}
              <path
                d="M0 65 C45 65 65 20 120 24 S200 73 240 65 S320 117 360 105 S435 85 480 92 S550 135 600 130 L600 150 L0 150Z"
                fill={`url(#${gradientId})`}
              />
              <path
                className="energy-line"
                d="M0 65 C45 65 65 20 120 24 S200 73 240 65 S320 117 360 105 S435 85 480 92 S550 135 600 130"
                fill="none"
                stroke="#21c9ae"
                strokeWidth="3"
              />
              <circle
                cx="480"
                cy="92"
                r="5"
                fill="#21c9ae"
                stroke="var(--surface)"
                strokeWidth="3"
              />
            </svg>
            <div className="preview-chart-months">
              {['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="preview-insight">
          <span className="preview-insight-icon">
            <Leaf size={18} />
          </span>
          <div>
            <strong>A lighter footprint starts with one small change.</strong>
            <span>One hour less AC could save approximately ₹280/month.</span>
          </div>
          <span className="preview-score">
            82<small>/100</small>
          </span>
        </div>
      </div>
    </div>
  );
}
