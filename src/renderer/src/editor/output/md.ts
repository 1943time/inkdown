import Worker from './worker?worker'

const worker = new Worker()
let callbackMap = new Map<string, Function>()

worker.onmessage = e => {
  if (callbackMap.get(e.data?.path)) {
    callbackMap.get(e.data?.path)!(e.data.data)
    callbackMap.delete(e.data?.path)
  }
}
export const toMarkdown = (state: any[], path: string):Promise<string> => {
  return new Promise(resolve => {
    callbackMap.set(path, resolve)
    worker.postMessage({state, path})
  })
}
