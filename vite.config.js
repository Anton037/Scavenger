import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

function buildVersion(command) {
  const cwd = fileURLToPath(new URL('.', import.meta.url));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    const revision = git('rev-parse', '--short=8', 'HEAD');
    const local = command === 'serve' || git('status', '--porcelain', '--untracked-files=no');
    return `Version ${pkg.version} · ${revision}${local ? ' · lokal' : ''}`;
  } catch {
    return `Version ${pkg.version} · ohne Git-Stand`;
  }
}

export default defineConfig(({ command }) => {
  const label = buildVersion(command);
  return {
    base: './',
    build: {
      chunkSizeWarningLimit: 700,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'three-vendor',
                test: /node_modules[\\/]three/,
              },
            ],
          },
        },
      },
    },
    plugins: [{
      name: 'scavenger-build-version',
      transformIndexHtml: (html) => html.replace('%SCAVENGER_BUILD_VERSION%', label),
    }],
  };
});
