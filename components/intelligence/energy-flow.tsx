'use client';
import { useId, useState } from 'react';
import { number } from '@/lib/utils/format';
export function EnergyFlow({
  baseline,
  unaccounted,
  categories,
}: {
  baseline: number;
  unaccounted: number;
  categories: { name: string; color: string; modeledKwh: number }[];
}) {
  const uid = useId(),
    [selected, setSelected] = useState<string | null>(null);
  const nodes = [
    ...categories.filter((c) => c.modeledKwh > 0),
    ...(unaccounted > 0
      ? [{ name: 'Unexplained', color: '#94a3b8', modeledKwh: unaccounted }]
      : []),
  ];
  const active = nodes.find((n) => n.name === selected);
  return (
    <div className="energy-flow">
      <div
        className="energy-flow-diagram"
        role="region"
        aria-label="Energy flow diagram; scroll horizontally on small screens"
        tabIndex={0}
      >
        <svg
          viewBox={`0 0 700 ${Math.max(230, nodes.length * 58 + 40)}`}
          role="img"
          aria-labelledby={uid}
        >
          <title
            id={uid}
          >{`Household energy flow. ${number(baseline)} kWh total; category allocations are modeled estimates.`}</title>
          <rect
            x="16"
            y="65"
            width="174"
            height="95"
            rx="18"
            fill="var(--subtle)"
            stroke="var(--border)"
          />
          <text x="103" y="101" textAnchor="middle" fill="var(--muted)" fontSize="13">
            HOUSEHOLD TOTAL
          </text>
          <text x="103" y="132" textAnchor="middle" fill="var(--text)" fontSize="22">
            {number(baseline)} kWh
          </text>
          {nodes.map((c, i) => {
            const y = 25 + i * 58;
            return (
              <g key={c.name} opacity={!selected || selected === c.name ? 1 : 0.3}>
                <path
                  d={`M190 113 C320 113 305 ${y + 20} 445 ${y + 20}`}
                  stroke={c.color}
                  fill="none"
                  strokeWidth={Math.max(
                    2,
                    Math.min(22, baseline ? (c.modeledKwh / baseline) * 35 : 2),
                  )}
                  opacity=".5"
                />
                <rect
                  x="445"
                  y={y}
                  width="239"
                  height="42"
                  rx="9"
                  fill="var(--subtle)"
                  stroke={c.color}
                />
                <text x="458" y={y + 26} fill="var(--text)" fontSize="13">
                  {c.name}
                </text>
                <text x="670" y={y + 26} textAnchor="end" fill="var(--text)" fontSize="13">
                  {number(c.modeledKwh)} kWh
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flow-controls" aria-label="Explore energy categories">
        <button
          className={`button ${selected === null ? 'primary' : 'subtle'} compact`}
          onClick={() => setSelected(null)}
        >
          All flows
        </button>
        {nodes.map((n) => (
          <button
            key={n.name}
            aria-pressed={selected === n.name}
            className="button subtle compact"
            onClick={() => setSelected(selected === n.name ? null : n.name)}
          >
            {n.name}
          </button>
        ))}
      </div>
      <p className="form-hint" aria-live="polite">
        {active
          ? `${active.name}: ${number(active.modeledKwh)} kWh, ${baseline ? number((active.modeledKwh / baseline) * 100) : 0}% of modeled household energy.`
          : 'Select a category to highlight its share. Category flows are estimates, not measured circuit readings.'}
      </p>
    </div>
  );
}
