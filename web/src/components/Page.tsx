import type { ReactNode } from 'react';

interface Props {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Standard page shell: one h1 per route (focused on navigation), optional eyebrow, lede and aside. */
export function Page({ eyebrow, title, sub, aside, className = '', children }: Props) {
  return (
    <div className={`page ${className}`}>
      <div className="wrap">
        <header className="page__head">
          <div className="page__intro">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1 className="page__title" tabIndex={-1} data-page-title>{title}</h1>
            {sub && <p className="page__sub">{sub}</p>}
          </div>
          {aside && <div className="page__aside">{aside}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}
