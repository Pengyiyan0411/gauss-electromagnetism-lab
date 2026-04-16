import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // 极致优化：只拆分庞大的 three.js，绝对安全
        manualChunks: {
          'three-core': ['three']
        }
      }
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // 【万无一失修改 1】删除了硬性要求 favicon 的配置，避免找不到文件报错
      workbox: {
        // 【万无一失修改 2】只缓存最核心必定存在的前端三剑客文件，忽略可能不存在的特殊格式
        globPatterns: ['**/*.{js,css,html}'],
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
