import Worker from './worker?worker'

export const parserMdToSchema = (codes: string[], share = false):Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const w = new Worker()
    w.postMessage({files: codes, share})
    w.onmessage = e => {
      w.terminate()
      resolve(e.data)
    }
    const error = () => {
      w.terminate()
      reject()
    }
    w.addEventListener('error', error)
    w.addEventListener('messageerror', error)
  })
}
