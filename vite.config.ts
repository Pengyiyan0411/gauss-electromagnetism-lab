import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // 保持你原有的其他配置（如 alias 等）
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // 极致优化：手动拆包，防止单个 js 文件过大导致首屏卡顿
        manualChunks: {
          'three-core': ['three'],
          'vendor': ['axios', 'socket.io-client']
        }
      }
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      workbox: {
        // 静态资源强缓存策略
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,wgsl}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts' }
          }
        ]
      }
    })
  ]
});