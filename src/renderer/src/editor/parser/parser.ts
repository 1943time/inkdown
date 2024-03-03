import Worker from './worker?worker'
export const parserMdToSchema = (codes: string[]):Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const w = new Worker()
    w.postMessage({files: codes})
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

export const openMdParserHandle = () => {
  const w = new Worker()
  const parser = (codes: string[]): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      w.postMessage({files: codes})
      w.onmessage = e => {
        resolve(e.data)
      }
      w.addEventListener('error', reject)
    })
  }
  const terminate = () => w.terminate()
  return {parser, terminate}
}
