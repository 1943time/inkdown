import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import commonjsExternals from 'vite-plugin-commonjs-externals';

const externals = ['path', /^electron(\/.+)?$/, 'fs', 'crypto']
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
