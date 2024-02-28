import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import commonjsExternals from 'vite-plugin-commonjs-externals';

const externals = ['path', /^electron(\/.+)?$/, 'fs', 'crypto', 'fs/promises']
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    server: {
      port: 5175
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          worker: resolve(__dirname, 'src/renderer/worker.html')
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      react(),
      // @ts-ignore
      commonjsExternals({
        externals
      })
    ]
  }
})
