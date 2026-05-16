import { ReactNode } from 'react';

type Props = {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon = 'inbox', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/60">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-on-surface mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-on-surface-variant max-w-md mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
