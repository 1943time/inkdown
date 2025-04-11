/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_CDN: string
  readonly VITE_APP_API: string
  readonly VITE_APP_PB: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly MODE: 'pro' | 'deploy' | 'single'
}
