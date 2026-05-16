'use client';

import { ReactNode, useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export function Modal({ open, onClose, title, description, icon, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${sizeStyles[size]} bg-surface-container-lowest rounded-[28px] shadow-2xl shadow-on-surface/10 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || icon) && (
          <div className="px-8 pt-8 pb-4 flex items-start gap-4">
            {icon && (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="flex-1">
              {title && <h2 className="text-xl font-bold text-on-surface tracking-tight">{title}</h2>}
              {description && <p className="text-sm text-on-surface-variant mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}
        <div className="px-8 pb-6">{children}</div>
        {footer && (
          <div className="px-8 py-4 bg-surface-container-low flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
