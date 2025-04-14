import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Api } from './api'

try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', Api)
} catch (error) {
  console.error(error)
}
