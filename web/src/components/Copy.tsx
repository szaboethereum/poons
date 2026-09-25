import { useState } from 'react';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* blocked */ }
  };
  return (
    <button type="button" className="copy-btn" onClick={copy} aria-label={done ? 'Copied' : `${label}: ${text.length > 60 ? 'code' : text}`}>
      {done ? 'Copied' : label}
    </button>
  );
}

export function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="code">
      <div className="code__bar"><span className="mono dim">{lang ?? ''}</span><CopyButton text={children} /></div>
      <pre><code>{children}</code></pre>
    </div>
  );
}

export function AddressRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="addr-row">
      <dt>{label}</dt>
      <dd>
        {link ? <a className="mono" href={link} target="_blank" rel="noopener noreferrer">{value}</a> : <span className="mono">{value}</span>}
        <CopyButton text={value} />
      </dd>
    </div>
  );
}
