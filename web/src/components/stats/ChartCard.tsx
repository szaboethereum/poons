import type { ReactNode } from 'react';

interface Props { title: string; sub?: ReactNode; actions?: ReactNode; note?: ReactNode; className?: string; children: ReactNode }

export function ChartCard({ title, sub, actions, note, className = '', children }: Props) {
  return (
    <figure className={`chart-card ${className}`}>
      <figcaption className="chart-card__head">
        <div>
          <h2 className="chart-card__title">{title}</h2>
          {sub && <p className="chart-card__sub">{sub}</p>}
        </div>
        {actions && <div className="chart-card__actions">{actions}</div>}
      </figcaption>
      <div className="chart-card__body">{children}</div>
      {note && <p className="chart-card__note">{note}</p>}
    </figure>
  );
}

export function EmptyChart({ children, height = 200 }: { children: ReactNode; height?: number }) {
  return <div className="chart-empty" style={{ minHeight: height }}>{children}</div>;
}

/** Segmented control used for chart options (bucket size, scale…). */
export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className="seg__btn" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface TipState { x: number; y: number; content: ReactNode }
export function Tooltip({ tip, width }: { tip: TipState | null; width: number }) {
  if (!tip) return null;
  const left = Math.min(Math.max(tip.x, 70), width - 70);
  return (
    <div className="chart-tip" style={{ left, top: tip.y }} role="presentation">
      {tip.content}
    </div>
  );
}
