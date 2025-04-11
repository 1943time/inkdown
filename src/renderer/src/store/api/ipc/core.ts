import { nanoid } from 'nanoid'

export class IpcCore {
  private pendingPromises: Record<string, { resolve: (value: any) => void; reject: (reason?: any) => void }> = {}
  private get messageHandler() {
    return window.webkit?.messageHandlers?.ipcHandler
  }
  constructor() {
    if (this.messageHandler) {
      window.__ipcRendererCallback = (callbackId, response) => {
        console.log(`Received callback for ID ${callbackId}:`, response)
        const promiseCallbacks = this.pendingPromises[callbackId]
        if (promiseCallbacks) {
          if (response && response.status === 'success') {
            promiseCallbacks.resolve(response.data)
          } else if (response && response.status === 'error') {
            // Create a real Error object for better stack traces
            const error = new Error(response.error || 'Unknown IPC error from native')
            promiseCallbacks.reject(error)
          } else {
            // Handle unexpected response structure
            promiseCallbacks.reject(new Error('Invalid response structure received from native.'))
          }
          // Clean up
          delete this.pendingPromises[callbackId]
        } else {
          console.warn(`IPC Warning: Received callback for unknown or already resolved ID: ${callbackId}`)
        }
      }
    }
    window.ipcEvents = {}
  }
  get isWebview() {
    return !!this.messageHandler
  }
  invoke(channel: string, data: Record<string, any> = {}) {
    const callbackId = nanoid()
    const promise = new Promise((resolve, reject) => {
      this.pendingPromises[callbackId] = { resolve, reject }
    })
    const payload = {
      channel,
      data,
      callbackId
    }
    this.messageHandler?.postMessage(payload)
    return promise
  }
  on<T extends Record<string, any>>(eventName: string, callback: (data: T) => any) {
    window.ipcEvents[eventName] = callback
  }
  off(eventName: string) {
    delete window.ipcEvents[eventName]
  }
}
