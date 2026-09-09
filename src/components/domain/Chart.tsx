import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cx } from '@/utils/format';
import { Skeleton } from '@/components/ui/Skeleton';

export const CHART_COLORS = {
  sent: '#6366f1',
  delivered: '#14b8a6',
  read: '#22c55e',
  failed: '#f43f5e',
  pending: '#f59e0b',
};

export interface ChartPoint {
  [key: string]: string | number;
}

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

interface TooltipStyleProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string | number }>;
}

function ChartTooltip({ active, payload, label }: TooltipStyleProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs shadow-pop dark:border-surface-700 dark:bg-surface-900">
      <p className="mb-1 font-semibold text-surface-900 dark:text-surface-100">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name ?? p.dataKey}:</span>
          <span className="font-semibold text-surface-800 dark:text-surface-200">
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  actions,
  loading,
  height = 300,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  loading?: boolean;
  height?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('rounded-xl border border-surface-200 bg-white p-5 shadow-card dark:border-surface-800 dark:bg-surface-900', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            {title && <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {loading ? (
        <div style={{ height }} className="w-full animate-pulse">
          <div className="flex h-full flex-col justify-end gap-2 p-2">
            {['', '', '', '', '', '', '', ''].map((_, i) => (
              <Skeleton key={i} className="h-full" />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ height }} className="w-full">
          {children}
        </div>
      )}
    </div>
  );
}

export function LineChartView({
  data,
  series,
  height = 300,
  xKey,
}: {
  data: ChartPoint[];
  series: ChartSeries[];
  height?: number;
  xKey: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-800" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="text-surface-400" />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="text-surface-400" />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AreaChartView({
  data,
  series,
  xKey,
  height = 300,
}: {
  data: ChartPoint[];
  series: ChartSeries[];
  xKey: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-800" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={`url(#grad-${s.key})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarChartView({
  data,
  series,
  xKey,
  height = 300,
}: {
  data: ChartPoint[];
  series: ChartSeries[];
  xKey: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-800" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={34} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChartView({
  data,
  height = 240,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const colors = [CHART_COLORS.delivered, CHART_COLORS.read, CHART_COLORS.failed, CHART_COLORS.pending, '#6366f1', '#8b5cf6', '#ec4899'];
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-bold text-surface-900 dark:text-surface-100">{centerValue}</p>
            {centerLabel && <p className="text-xs text-surface-400">{centerLabel}</p>}
          </div>
        </div>
      )}
    </div>
  );
}