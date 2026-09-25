// The shared art engine is plain JS (UMD); src/lib/art.ts gives it types.
declare module '*/poons-art.js' {
  const engine: unknown;
  export default engine;
}
