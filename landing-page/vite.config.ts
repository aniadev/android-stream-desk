import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // @ts-ignore
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
    onFinished() {
      const hostname = 'https://android-stream-desk.vercel.app'
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${hostname}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
      fs.writeFileSync(path.resolve(__dirname, 'dist/sitemap.xml'), sitemap)
      console.log('Sitemap generated successfully!')
    }
  }
})
