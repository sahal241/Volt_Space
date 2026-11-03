'use client';
import { useId, useSyncExternalStore } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { currency, number } from '@/lib/utils/format';
import { EmptyState } from '@/components/ui/primitives';
import type { MonthlyBill } from '@/lib/calculations/bills';
const subscribe = () => () => {};
function ChartFrame({
  children,
  label,
  className = '',
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <div className={`chart-frame ${className}`} role="img" aria-label={label}>
      {mounted ? children : <div className="chart-skeleton" aria-hidden="true" />}
    </div>
  );
}
const style = {
  backgroundColor: 'var(--surface-raised)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: 10,
  fontSize: 12,
};
const axis = { fill: 'var(--text-muted)', fontSize: 11 };
export function ConsumptionChart({ data }: { data: MonthlyBill[] }) {
  const id = useId();
  return (
    <ChartFrame
      label={data
        .map(
          (row) => `${row.month}: ${row.units === null ? 'No bill' : `${number(row.units)} kWh`}`,
        )
        .join('; ')}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#21c9ae" stopOpacity={0.25} />
              <stop offset="1" stopColor="#21c9ae" stopOpacity="0" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="3 5" />
          <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} dy={8} />
          <YAxis tick={axis} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={style}
            formatter={(value) => [`${number(Number(value))} kWh`, 'Consumption']}
          />
          <Area
            dataKey="units"
            type="monotone"
            isAnimationActive={false}
            connectNulls={false}
            stroke="#21c9ae"
            strokeWidth={2.5}
            fill={`url(#${id})`}
            dot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function DailyChart({ data }: { data: { day: string; units: number }[] }) {
  if (!data.length)
    return (
      <EmptyState
        title="No daily meter readings"
        description="Bills provide period totals, not measured daily consumption. Use the daily average shown above; no daily readings are invented."
      />
    );
  return (
    <ChartFrame label="Illustrative daily consumption" className="daily-chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="day" tick={axis} />
          <YAxis tick={axis} />
          <Tooltip
            contentStyle={style}
            formatter={(value) => [`${number(Number(value))} kWh`, 'Usage']}
          />
          <Bar dataKey="units" fill="#21c9ae" isAnimationActive={false} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
export function DistributionChart({
  data,
  total,
}: {
  data: { name: string; value: number; color: string; kwh: number; cost: number }[];
  total: number;
}) {
  if (!data.length)
    return (
      <EmptyState
        title="Your inventory powers this view"
        description="Add appliances with rated power and operating hours to see an approximate energy distribution."
      />
    );
  return (
    <div className="distribution-content">
      <ChartFrame
        label={data
          .map(
            (item) =>
              `${item.name}: ${number(item.value)} percent, ${number(item.kwh)} kWh, ${currency(item.cost)}`,
          )
          .join('; ')}
        className="donut-chart"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data}
              dataKey="kwh"
              nameKey="name"
              innerRadius="68%"
              outerRadius="91%"
              paddingAngle={3}
              stroke="none"
            >
              {data.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={style}
              formatter={(value) => [`${number(Number(value))} kWh`, 'Estimated use']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{number(total)}</strong>
          <span>kWh estimated</span>
        </div>
      </ChartFrame>
      <div className="distribution-legend">
        {data.map((item) => (
          <div key={item.name} title={`${number(item.kwh)} kWh · ${currency(item.cost)} / month`}>
            <span>
              <i style={{ background: item.color }} />
              {item.name}
            </span>
            <strong>{number(item.value)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
export function BillComparison({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <ChartFrame
      label={data.map((item) => `${item.month}: ${currency(item.amount)}`).join('; ')}
      className="comparison-chart"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={data}
          margin={{ top: 10, left: -5, right: 10, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="3 5" />
          <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
          <YAxis
            tick={axis}
            tickFormatter={(value) => `₹${number(Number(value) / 1000)}k`}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip
            contentStyle={style}
            formatter={(value) => [currency(Number(value)), 'Bill amount']}
          />
          <Bar dataKey="amount" isAnimationActive={false} radius={[5, 5, 0, 0]} maxBarSize={60}>
            {data.map((item, index) => (
              <Cell
                key={item.month}
                fill={index === data.length - 1 ? '#21c9ae' : 'var(--bar-color)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
