import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import fs from 'fs';
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
        onFinished: function () {
            var hostname = 'https://android-stream-desk.vercel.app';
            var sitemap = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url>\n    <loc>".concat(hostname, "/</loc>\n    <lastmod>").concat(new Date().toISOString().split('T')[0], "</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>");
            fs.writeFileSync(path.resolve(__dirname, 'dist/sitemap.xml'), sitemap);
            console.log('Sitemap generated successfully!');
        }
    }
});
