/** "Founding Resident": the qualifying buy was on the Pons bonding curve, before graduation. */
export function FounderBadge({ small = false, iconOnly = false }: { small?: boolean; iconOnly?: boolean }) {
  if (iconOnly) {
    return (
      <span className="founder-star" title="Founding Resident" role="img" aria-label="Founding Resident">
        <Star />
      </span>
    );
  }
  return (
    <span className={`founder${small ? ' founder--sm' : ''}`} title="Bought on the bonding curve, before graduation">
      <Star /> Founding Resident
    </span>
  );
}

// 5x5 pixel star, matching the gold star the on-chain art draws.
function Star() {
  return (
    <svg className="founder__star" viewBox="0 0 5 5" width="10" height="10" shapeRendering="crispEdges" aria-hidden="true">
      <path fill="currentColor" d="M2 0h1v1h-1zM0 1h5v1h-5zM1 2h3v1h-3zM1 3h1v1h-1zM3 3h1v1h-1zM0 4h1v1h-1zM4 4h1v1h-1z" />
    </svg>
  );
}
