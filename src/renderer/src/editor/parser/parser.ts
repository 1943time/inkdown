import Worker from './worker?worker'
import {nid} from '../../utils'

export const parserMdToSchema = (codes: string[]):Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const w = new Worker()
    const id = nid()
    w.postMessage({files: codes, id})
    w.onmessage = e => {
      if (e.data.id === id) {
        w.terminate()
        resolve(e.data.results)
      }
    }
    const error = () => {
      w.terminate()
      reject()
    }
    w.addEventListener('error', error)
    w.addEventListener('messageerror', error)
  })
}

export const openMdParserHandle = () => {
  const w = new Worker()
  const parser = (codes: string[]): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const id = nid()
      w.postMessage({files: codes, id})
      w.onmessage = e => {
        if (e.data.id === id) {
          resolve(e.data.results)
        }
      }
      w.addEventListener('error', reject)
    })
  }
  const terminate = () => w.terminate()
  return {parser, terminate}
}
