import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

type FieldProps = {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function Field({ label, helper, error, required, children }: FieldProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-semibold text-error flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs text-on-surface-variant">{helper}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  iconRight?: ReactNode;
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon, iconRight, invalid, className = '', ...rest },
  ref,
) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={`w-full h-12 rounded-2xl bg-surface-container-lowest border-2 ${
          invalid
            ? 'border-error/40 focus:border-error focus:shadow-[0_0_0_4px_rgb(186,26,26,0.1)]'
            : 'border-outline-variant/20 focus:border-primary/40 focus:shadow-[0_0_0_4px_rgb(0,35,111,0.08)]'
        } ${icon ? 'pl-12' : 'pl-4'} ${iconRight ? 'pr-12' : 'pr-4'} text-sm font-medium text-on-surface placeholder:text-on-surface-variant/60 outline-none transition-all ${className}`}
        {...rest}
      />
      {iconRight && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
          {iconRight}
        </span>
      )}
    </div>
  );
});
