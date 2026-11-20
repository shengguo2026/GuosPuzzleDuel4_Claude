// Bundles the host into one ES module (dist/host.mjs) that start.bat / start.sh
// run with plain Node 24. The client build is served from ../client/dist.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/host.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  logLevel: 'warning',
  // ws loads optional native helpers with require(); keep them optional.
  external: ['bufferutil', 'utf-8-validate'],
  banner: {
    js: "import { createRequire as __gpd4CreateRequire } from 'node:module'; const require = __gpd4CreateRequire(import.meta.url);",
  },
});
console.log('host built: apps/host/dist/host.mjs');
