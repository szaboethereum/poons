// Fixed deployment facts, so the site shows real addresses even before the indexer answers.
// Build-time overrides: VITE_API_URL, VITE_TOKEN_ADDRESS, VITE_DEMO=1 (local development only).
export const DEPLOYMENT = {
  chainId: 4663,
  poons: '0xD71500d59Ab6eB99cA7074EfD042B8bAee9bF2B2',
  renderer: '0x8515a1ECa608Ec6f0249D87722661e7Ab31788aE',
  token: (import.meta.env.VITE_TOKEN_ADDRESS as string | undefined) || null,
};

export const PONS_URL = DEPLOYMENT.token
  ? `https://www.ponsfamily.com/launchpad/${DEPLOYMENT.token}`
  : 'https://www.ponsfamily.com/launchpad';

export const OPENSEA_URL = 'https://opensea.io/collection/poons-rh';

/** Generated data is only ever used when a local build asks for it explicitly. */
export const DEMO = import.meta.env.DEV && import.meta.env.VITE_DEMO === '1';
