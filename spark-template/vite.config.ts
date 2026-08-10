import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname
const devApiTarget = process.env.DEV_API_TARGET || "http://127.0.0.1:8080"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // DO NOT REMOVE
    createIconImportProxy() as PluginOption,
    sparkPlugin({ port: 3000 }) as PluginOption,
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    proxy: {
      '/api/audio-separator': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/video-info': {
        target: devApiTarget,
        changeOrigin: true
      },
      '^/download$': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/download-progress': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/download-caption': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/check-captions': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/ping': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/get-file': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/thumbnail': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/stream-video': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/get-stream-session': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/proxy-video': {
        target: devApiTarget,
        changeOrigin: true
      }
    }
  }
});
