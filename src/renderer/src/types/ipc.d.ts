declare global {
  interface Window {
    __ipcRendererCallback: (callbackId: string, response: any) => void
    webkit: {
      messageHandlers: {
        ipcHandler: {
          postMessage: (payload: any) => void
        }
      }
    }
    ipcEvents: Record<string, (data: any) => void>
  }
}

export {}
