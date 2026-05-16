import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
};

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-container shadow-lg shadow-primary/20 hover:-translate-y-0.5',
  gradient:
    'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg shadow-primary/25 hover:-translate-y-0.5',
  secondary:
    'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high border border-outline-variant/20',
  ghost: 'text-primary hover:bg-surface-container',
  danger:
    'bg-error text-on-error hover:bg-error/90 shadow-lg shadow-error/20 hover:-translate-y-0.5',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-6 text-sm',
  lg: 'h-14 px-8 text-base',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, loading, fullWidth, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        icon && <span className="flex items-center">{icon}</span>
      )}
      {children}
      {!loading && iconRight && <span className="flex items-center">{iconRight}</span>}
    </button>
  );
});
