import Worker from './worker?worker'

const worker = new Worker()
let callback: ((data: string) => void) | null = null

worker.onmessage = e => {
  callback?.(e.data)
  callback = null
}
export const toMarkdown = (state: any[]):Promise<string> => {
  return new Promise(resolve => {
    callback = resolve
    worker.postMessage({state})
  })
}
