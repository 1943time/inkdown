import Worker from './worker?worker'
import {nid} from '../../utils'
import {isAbsolute, join} from 'path'
import {readFileSync} from 'fs'
export type ParserResult = {
  schema:any[], links: {path: number[], target: string}[]
}

const filterSchemaLinks = (links: ParserResult['links'], filePath: string) => {
  if (!filePath) return []
  const filterLinks: ParserResult['links'] = []
  for (let l of links) {
    if (!l.target || l.target.startsWith('http') || l.target.startsWith('data:')) continue
    let path = l.target.replace(/#[^\n]+$/, '')
    path = isAbsolute(l.target) ? l.target : join(filePath, '..', l.target)
    filterLinks.push({path: l.path, target: path})
  }
  return filterLinks
}

const transformResult = (codes: {filePath: string}[], results: ParserResult[]) => {
  return results.map((r, i) => {
    return {schema: r.schema, links: filterSchemaLinks(r.links, codes[i].filePath)}
  })
}

export const parserMdToSchema = (codes: {filePath: string, code?: string}[]):Promise<ParserResult[]> => {
  return new Promise((resolve, reject) => {
    const w = new Worker()
    const id = nid()
    w.postMessage({files: codes.map(c => {
      if (c.code) return c.code
      return readFileSync(c.filePath, {encoding: 'utf-8'})
    }), id})
    w.onmessage = e => {
      if (e.data.id === id) {
        w.terminate()
        resolve(transformResult(codes, e.data.results))
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
  const parser = (codes: {filePath: string, code?: string}[]): Promise<ParserResult[]> => {
    return new Promise((resolve, reject) => {
      const id = nid()
      w.postMessage({files: codes.map(c => {
          if (c.code) return c.code
          return readFileSync(c.filePath, {encoding: 'utf-8'})
        }), id})
      w.onmessage = e => {
        if (e.data.id === id) {
          resolve(transformResult(codes, e.data.results))
        }
      }
      w.addEventListener('error', reject)
    })
  }
  const terminate = () => w.terminate()
  return {parser, terminate}
}
