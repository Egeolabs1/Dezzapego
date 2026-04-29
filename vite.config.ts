import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function siteOriginFromEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  const raw = env.VITE_SITE_URL || 'https://dezzapego.com'
  return raw.replace(/\/$/, '')
}

function htmlInjectSiteOrigin(mode: string) {
  const origin = siteOriginFromEnv(mode)
  return {
    name: 'html-inject-site-origin',
    transformIndexHtml(html: string) {
      return html.replaceAll('%SITE_ORIGIN%', origin)
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    htmlInjectSiteOrigin(mode),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Dezzapego — Classificados e anúncios',
        short_name: 'Dezzapego',
        description:
          'Classificados online: imóveis, carros, eletrônicos e mais. Publique grátis ou encontre ofertas no Brasil.',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          // User can add screenshots here later
        ]
      }
    })
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
