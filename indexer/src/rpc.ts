// Counts every JSON-RPC request so /api/health can show the real RPC budget.
export const rpcStats = { total: 0, byMethod: {} as Record<string, number>, since: Date.now() };

export function countRpc(req: Request) {
  req.clone().json().then((b: any) => {
    for (const m of (Array.isArray(b) ? b : [b]).map((x: any) => x.method)) {
      rpcStats.total++;
      rpcStats.byMethod[m] = (rpcStats.byMethod[m] ?? 0) + 1;
    }
  }).catch(() => {});
}
