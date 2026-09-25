// The Poons pixel wordmark, traced 1:1 from brand/logo.png (42x9 cells; the "OO" are a pair of glasses).
// Kept as inline SVG so the ink follows the theme (currentColor) while lens colours stay fixed.
const PATHS: [fill: string, d: string][] = [
  ["currentColor", "M0 0h5v1h-5zM9 0h6v1h-6zM19 0h6v1h-6zM28 0h2v1h-2zM33 0h2v1h-2zM37 0h5v1h-5zM0 1h2v1h-2zM4 1h2v1h-2zM8 1h8v1h-8zM18 1h8v1h-8zM28 1h3v1h-3zM33 1h2v1h-2zM36 1h2v1h-2zM0 2h2v1h-2zM4 2h2v1h-2zM7 2h3v1h-3zM14 2h6v1h-6zM24 2h3v1h-3zM28 2h4v1h-4zM33 2h2v1h-2zM36 2h2v1h-2zM0 3h2v1h-2zM4 3h2v1h-2zM8 3h2v1h-2zM14 3h6v1h-6zM24 3h2v1h-2zM28 3h2v1h-2zM31 3h4v1h-4zM36 3h4v1h-4zM0 4h5v1h-5zM8 4h2v1h-2zM14 4h2v1h-2zM18 4h2v1h-2zM24 4h2v1h-2zM28 4h2v1h-2zM32 4h3v1h-3zM37 4h4v1h-4zM0 5h2v1h-2zM8 5h2v1h-2zM14 5h2v1h-2zM18 5h2v1h-2zM24 5h2v1h-2zM28 5h2v1h-2zM33 5h2v1h-2zM39 5h3v1h-3zM0 6h2v1h-2zM8 6h2v1h-2zM14 6h2v1h-2zM18 6h2v1h-2zM24 6h2v1h-2zM28 6h2v1h-2zM33 6h2v1h-2zM40 6h2v1h-2zM0 7h2v1h-2zM8 7h8v1h-8zM18 7h8v1h-8zM28 7h2v1h-2zM33 7h2v1h-2zM40 7h2v1h-2zM0 8h2v1h-2zM9 8h6v1h-6zM19 8h6v1h-6zM28 8h2v1h-2zM33 8h2v1h-2zM36 8h5v1h-5z"],
  ["#ffffff", "M10 2h2v1h-2zM20 2h2v1h-2zM10 3h1v1h-1zM20 3h1v1h-1z"],
  ["#cfe2ea", "M12 2h2v1h-2zM22 2h2v1h-2zM11 3h3v1h-3zM21 3h3v1h-3zM10 4h4v1h-4zM20 4h4v1h-4zM10 5h4v1h-4zM20 5h4v1h-4zM10 6h4v1h-4zM20 6h4v1h-4z"],
];

export function Logo({ height = 24, className = '', title = 'Poons' }: { height?: number; className?: string; title?: string }) {
  return (
    <svg className={`logo ${className}`} viewBox="0 0 42 9" height={height} width={(height * 42) / 9} shapeRendering="crispEdges" role="img" aria-label={title}>
      {PATHS.map(([fill, d]) => <path key={fill} fill={fill} d={d} className={fill === '#cfe2ea' ? 'logo__lens' : undefined} />)}
    </svg>
  );
}
