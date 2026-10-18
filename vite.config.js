import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'Rabhchik — Saurabh & Anushika',
        short_name: 'Rabhchik',
        description: 'Saurabh & Anushika’s wedding, all in one place.',
        theme_color: '#B08A2A',
        background_color: '#FFFDF9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Cache guest photos (not videos: range requests don't cache well)
            urlPattern: ({ request, url }) =>
              request.destination === 'image' && url.pathname.includes('/storage/v1/object/public/media/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'rabchik-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
})