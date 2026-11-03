import { Leaf, TrendingUp } from 'lucide-react';
import { efficiencyLabel } from '@/lib/calculations/energy';
export function EnergyScore({ score }: { score: number }) {
  return (
    <section className="card score-card">
      <div className="card-heading">
        <h2>Energy efficiency score</h2>
        <Leaf size={17} />
      </div>
      <div
        className="score-gauge"
        role="meter"
        aria-label="Energy efficiency score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <svg viewBox="0 0 200 120" aria-hidden="true">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--subtle)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="12"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${score} 100`}
          />
        </svg>
        <div>
          <strong>
            {score}
            <span>/100</span>
          </strong>
          <span className="score-label">
            {efficiencyLabel(score)} <Leaf size={12} />
          </span>
        </div>
      </div>
      <p>Based on your recorded use and appliance estimates.</p>
      <div className="score-footer">
        <TrendingUp size={14} />
        <span>Personal progress · transparent model</span>
      </div>
    </section>
  );
}
