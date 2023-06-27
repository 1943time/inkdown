import { defineConfig } from "vite"
export default defineConfig({
  build: {
    //打包后文件目录
    outDir: "src/renderer/public/output",
    cssCodeSplit: true,
    minify: true,
    lib: {
      entry: "src/renderer/src/styles/editor.scss",
      fileName: "[hash]",
      formats: ["es"]
    }
  }
})
