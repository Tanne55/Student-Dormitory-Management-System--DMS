import { ReactNode } from 'react';

type Tone = 'pending' | 'approved' | 'rejected' | 'in-progress' | 'neutral' | 'info';

const toneStyles: Record<Tone, string> = {
  pending: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  approved: 'bg-green-600 text-white shadow-md shadow-green-600/20',
  rejected: 'bg-error-container text-on-error-container',
  'in-progress': 'bg-primary-fixed text-on-primary-fixed',
  neutral: 'bg-surface-container-high text-on-surface-variant',
  info: 'bg-secondary-container text-on-secondary-container',
};

type Props = {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
};

export function Badge({ tone = 'neutral', icon, children }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${toneStyles[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
