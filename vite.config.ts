import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

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
}))
