import { HTMLAttributes, ReactNode } from 'react';

type Tone = 'lowest' | 'low' | 'default' | 'high';

const toneStyles: Record<Tone, string> = {
  lowest: 'bg-surface-container-lowest',
  low: 'bg-surface-container-low',
  default: 'bg-surface-container',
  high: 'bg-surface-container-high',
};

type Props = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  children: ReactNode;
};

const paddingStyles = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

export function Card({ tone = 'lowest', padding = 'md', hover = false, className = '', children, ...rest }: Props) {
  return (
    <div
      className={`rounded-3xl shadow-sm ${toneStyles[tone]} ${paddingStyles[padding]} ${
        hover ? 'hover:shadow-lg hover:-translate-y-0.5 transition-all' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
