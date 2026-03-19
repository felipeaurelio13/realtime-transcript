import { ReactNode } from 'react';
import clsx from 'clsx';

export const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft transition-all duration-smooth">
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
    <div className="panel-scroll max-h-[42vh] overflow-y-auto text-sm leading-relaxed">{children}</div>
  </section>
);

export const PillButton = ({
  label,
  onClick,
  kind = 'neutral',
  disabled = false
}: {
  label: string;
  onClick: () => void;
  kind?: 'neutral' | 'accent';
  disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={clsx(
      'rounded-full px-4 py-2 text-sm font-medium transition duration-smooth active:scale-95 disabled:opacity-40',
      kind === 'accent' ? 'bg-accent text-accentForeground' : 'bg-surface text-text border border-border'
    )}
  >
    {label}
  </button>
);
