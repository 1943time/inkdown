import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin,bytecodePlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import commonjsExternals from 'vite-plugin-commonjs-externals';

const externals = ['path', /^electron(\/.+)?$/, 'fs', 'crypto']
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()],
    server: {
      port: 5175
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()]
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
      commonjsExternals.default({
        externals
      })
    ]
  }
})
