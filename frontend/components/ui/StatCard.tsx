import { ReactNode } from 'react';
import { Card } from './Card';

type Accent = 'primary' | 'success' | 'warning' | 'danger' | 'info';

const accentStyles: Record<Accent, { badge: string; text: string }> = {
  primary: { badge: 'bg-primary-fixed text-on-primary-fixed', text: 'text-primary' },
  success: { badge: 'bg-green-100 text-green-700', text: 'text-green-700' },
  warning: { badge: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', text: 'text-on-tertiary-container' },
  danger: { badge: 'bg-error-container text-on-error-container', text: 'text-error' },
  info: { badge: 'bg-secondary-container text-on-secondary-container', text: 'text-secondary' },
};

type Props = {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: Accent;
  meta?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
};

export function StatCard({ label, value, icon, accent = 'primary', meta, trend, trendValue }: Props) {
  const a = accentStyles[accent];
  return (
    <Card padding="md" className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${a.badge}`}>
          {icon}
        </div>
        {meta && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {meta}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-black tracking-tight ${a.text}`}>{value}</p>
        {trend && trendValue && (
          <span
            className={`text-xs font-bold ${
              trend === 'up' ? 'text-green-700' : 'text-error'
            }`}
          >
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
        )}
      </div>
    </Card>
  );
}
