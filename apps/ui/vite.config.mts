import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const appVersion = packageJson.version;

// Generate a build hash for cache busting.
function getBuildHash(): string {
  try {
    const { execSync } = require('child_process');
    const gitHash = execSync('git rev-parse --short=8 HEAD', { encoding: 'utf-8' }).trim();
    if (gitHash) return gitHash;
  } catch {
    // Fallback
  }
  return crypto.createHash('md5').update(`${appVersion}-${Date.now()}`).digest('hex').slice(0, 8);
}

const buildHash = getBuildHash();

/**
 * Vite plugin to inject the build hash into sw.js for cache busting.
 */
function swCacheBuster(): Plugin {
  const CACHE_NAME_BASE = 'automaker-v5';
  const CACHE_NAME_PATTERN = new RegExp(`const CACHE_NAME = '${CACHE_NAME_BASE}';`);
  const CRITICAL_ASSETS_PATTERN = /const CRITICAL_ASSETS = \[\];/;
  return {
    name: 'sw-cache-buster',
    apply: 'build',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist', 'sw.js');
      if (!fs.existsSync(swPath)) {
        console.warn('[sw-cache-buster] sw.js not found in dist/ — skipping cache bust');
        return;
      }
      let swContent = fs.readFileSync(swPath, 'utf-8');
      if (!CACHE_NAME_PATTERN.test(swContent)) {
        return;
      }
      swContent = swContent.replace(
        CACHE_NAME_PATTERN,
        `const CACHE_NAME = '${CACHE_NAME_BASE}-${buildHash}';`
      );

      const indexHtmlPath = path.resolve(__dirname, 'dist', 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        if (CRITICAL_ASSETS_PATTERN.test(swContent)) {
          const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
          const criticalAssetsSet = new Set<string>();
          const assetRegex = /(?:href|src)="(\.\/(assets\/[^"]+))"/g;
          let match;
          while ((match = assetRegex.exec(indexHtml)) !== null) {
            const assetPath = '/' + match[2];
            if (assetPath.endsWith('.js') || assetPath.endsWith('.css')) {
              criticalAssetsSet.add(assetPath);
            }
          }
          const criticalAssets = Array.from(criticalAssetsSet);
          if (criticalAssets.length > 0) {
            swContent = swContent.replace(
              CRITICAL_ASSETS_PATTERN,
              `const CRITICAL_ASSETS = ${JSON.stringify(criticalAssets)};`
            );
          }
        }
      }
      fs.writeFileSync(swPath, swContent, 'utf-8');
    },
  };
}

/**
 * Vite plugin to optimize the HTML output for mobile PWA loading speed.
 */
function mobilePreloadOptimizer(): Plugin {
  const deferredChunks = [
    'vendor-reactflow',
    'vendor-xterm',
    'vendor-codemirror',
    'vendor-markdown',
    'vendor-icons',
  ];

  return {
    name: 'mobile-preload-optimizer',
    enforce: 'post',
    transformIndexHtml(html) {
      for (const chunk of deferredChunks) {
        const modulePreloadRegex = new RegExp(
          `<link rel="modulepreload" crossorigin href="(\\./assets/${chunk}-[^"]+\\.js)">`,
          'g'
        );
        html = html.replace(modulePreloadRegex, (_match, href) => {
          return `<link rel="prefetch" href="${href}" as="script">`;
        });

        const cssRegex = new RegExp(
          `<link rel="stylesheet" crossorigin href="(\\./assets/${chunk}-[^"]+\\.css)">`,
          'g'
        );
        html = html.replace(cssRegex, (_match, href) => {
          return `<link rel="prefetch" href="${href}" as="style">`;
        });
      }
      return html;
    },
  };
}

export default defineConfig(({ command }) => {
  return {
    plugins: [
      TanStackRouterVite({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
      }),
      tailwindcss(),
      react(),
      mobilePreloadOptimizer(),
      swCacheBuster(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: process.env.HOST || '0.0.0.0',
      port: parseInt(process.env.AUTOMAKER_WEB_PORT || '3007', 10),
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://localhost:' + (process.env.AUTOMAKER_SERVER_PORT ?? '3008'),
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      target: 'esnext',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        external: [
          'child_process',
          'fs',
          'path',
          'crypto',
          'http',
          'net',
          'os',
          'util',
          'stream',
          'events',
          'readline',
        ],
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/use-sync-external-store/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-router') || id.includes('@tanstack/react-query')) {
              return 'vendor-tanstack';
            }
            if (id.includes('@radix-ui/')) {
              return 'vendor-radix';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@fontsource/')) {
              const match = id.match(/@fontsource\/([^/]+)/);
              if (match) return `font-${match[1]}`;
            }
            if (id.includes('@codemirror/') || id.includes('@lezer/')) {
              return 'vendor-codemirror';
            }
            if (id.includes('xterm') || id.includes('@xterm/')) {
              return 'vendor-xterm';
            }
            if (id.includes('@xyflow/') || id.includes('reactflow')) {
              return 'vendor-reactflow';
            }
            if (id.includes('zustand') || id.includes('zod')) {
              return 'vendor-state';
            }
            if (id.includes('react-markdown') || id.includes('remark-') || id.includes('rehype-')) {
              return 'vendor-markdown';
            }
          },
        },
      },
    },
    optimizeDeps: {
      exclude: ['@automaker/platform'],
      include: ['react', 'react-dom', 'use-sync-external-store'],
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_BUILD_HASH__: JSON.stringify(buildHash),
    },
  };
});
