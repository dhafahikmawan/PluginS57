import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cp, rm } from "node:fs/promises";
import type { Plugin } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Sprite / icon assets: copy from Samples/Icons/ into geolibre-plugin/dist/icons/
// at build time so the host can serve them over HTTP.
//
// At runtime, geolibre.ts resolves the URL with:
//   app.resolvePluginAssetUrl?.(pluginId, "icons/sprite.json")
// and falls back to loading from the map instance directly if the host does
// not support resolvePluginAssetUrl.
// ---------------------------------------------------------------------------
const ICON_SRC  = resolve(__dirname, "../Samples/Icons");
const ICON_DEST = resolve(__dirname, "geolibre-plugin/dist/icons");

function bundleIconAssets(): Plugin {
  return {
    name: "geolibre-plugin:bundle-icons",
    async closeBundle() {
      await rm(ICON_DEST, { recursive: true, force: true });
      await cp(ICON_SRC, ICON_DEST, { recursive: true });
      console.log(`[bundle-icons] Copied sprite assets → geolibre-plugin/dist/icons/`);
    },
  };
}

export default defineConfig({
  publicDir: false, // prevent Vite from also copying an unrelated public/ dir
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env': {}
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/geolibre.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "geolibre-plugin/dist",
    emptyOutDir: true,
    rollupOptions: {
      external: [],
      output: {
        assetFileNames: () => "style.css",
      },
    },
    cssCodeSplit: false,
    sourcemap: false,
    minify: false,
  },
  plugins: [bundleIconAssets()],
});
