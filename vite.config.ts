import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function siteOriginFromEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  const raw = env.VITE_SITE_URL || 'https://dezzapego.com'
  return raw.replace(/\/$/, '')
}

function htmlInjectSiteOriginAndAdSense(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  const origin = siteOriginFromEnv(mode)
  const adsenseClient = (env.VITE_ADSENSE_CLIENT || '').trim()
  const adsenseAccountMeta = adsenseClient
    ? `<meta name="google-adsense-account" content="${adsenseClient}" />`
    : ''

  return {
    name: 'html-inject-runtime-public-config',
    transformIndexHtml(html: string) {
      return html
        .replaceAll('%SITE_ORIGIN%', origin)
        .replaceAll('%ADSENSE_ACCOUNT_META%', adsenseAccountMeta)
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    htmlInjectSiteOriginAndAdSense(mode),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('recharts')) return 'vendor-charts'
          if (id.includes('@radix-ui')) return 'vendor-radix'
          return undefined
        },
      },
    },
  },
  ssr: {
    noExternal: ['react-helmet-async'],
  },
}))
