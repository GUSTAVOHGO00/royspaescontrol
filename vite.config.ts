import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Roy's — Fechamento de Pães",
        short_name: "Roy's Pães",
        description: "Controle interno de fechamento de pães da Roy's.",
        theme_color: "#0767B1",
        background_color: "#F6F1E8",
        display: "standalone",
        start_url: "./",
        lang: "pt-BR",
        icons: [
          {
            src: "brand/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "brand/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,png,jpg,svg,woff2,gz}"],
        globIgnores: ["brand/icon-*.png"],
        runtimeCaching: [
          {
            urlPattern: /\.(?:jpg|jpeg|webp)$/i,
            handler: "CacheFirst",
            options: { cacheName: "roys-product-photos", expiration: { maxEntries: 12 } }
          }
        ],
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html"
      }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true
  }
});
