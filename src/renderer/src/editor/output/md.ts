import Worker from './worker?worker'
import {nanoid} from 'nanoid'

const worker = new Worker()
let callbackMap = new Map<string, Function>()

worker.onmessage = e => {
  if (callbackMap.get(e.data?.id)) {
    callbackMap.get(e.data?.id)!(e.data.data)
    callbackMap.delete(e.data?.id)
  }
}
export const toMarkdown = (state: any[]):Promise<string> => {
  return new Promise(resolve => {
    const id = nanoid()
    callbackMap.set(id, resolve)
    worker.postMessage({state, id})
  })
}
