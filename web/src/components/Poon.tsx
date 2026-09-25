import { useMemo } from 'react';
import { poonDataUri, toSeed } from '../lib/art';

interface Props {
  seed: string | bigint | null;
  size?: number;
  alt?: string;
  className?: string;
  eager?: boolean;
}

/** A Poon rendered from its seed with the shared art engine. Crisp pixels at any size. */
export function Poon({ seed, size = 64, alt = 'Poon', className = '', eager = false }: Props) {
  const src = useMemo(() => {
    const s = toSeed(seed);
    return s === null ? null : poonDataUri(s);
  }, [seed]);
  if (!src) return <span className={`poon poon--empty ${className}`} style={{ width: size, height: size }} role="img" aria-label="Unknown Poon" />;
  return (
    <img
      className={`poon ${className}`}
      src={src}
      width={size}
      height={size}
      alt={alt}
      draggable={false}
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
    />
  );
}
