import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Giao Việc – MKG Task Manager',
        short_name: 'Giao Việc',
        description: 'Ứng dụng quản lý và giao việc nội bộ MKG',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'vi',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Giao việc mới',
            short_name: 'Giao việc',
            description: 'Tạo công việc mới',
            url: '/?action=new-task',
            icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // Cache PocketBase API calls with network-first strategy
            urlPattern: /^https:\/\/db\.mkg\.vn\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pocketbase-api',
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // disable in dev to avoid confusion
      },
    }),
  ],
})
