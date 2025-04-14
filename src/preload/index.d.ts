import { ElectronAPI } from '@electron-toolkit/preload'
import { Api } from './api'
declare global {
  interface Window {
    electron: ElectronAPI
    api: typeof Api
  }
}
