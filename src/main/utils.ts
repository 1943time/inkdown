import nlp from 'compromise'
import { Jieba } from '@node-rs/jieba'
import { dict } from '@node-rs/jieba/dict'
const jieba = Jieba.withDict(dict)

export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj }
  keys.forEach((key) => {
    delete result[key]
  })
  return result as Omit<T, K>
}

const chineseSegment = (text: string): string[] => {
  return jieba.cut(text, true)
}

const englishSegment = (text: string): string[] => {
  const doc = nlp(text)
  return doc.terms().out('array')
}

const mixedSegment = (text: string): string[] => {
  const chineseRegex = /[\u4e00-\u9fa5]+/g
  const englishRegex = /[a-zA-Z]+/g

  const chineseParts = text.match(chineseRegex) || []
  const englishParts = text.match(englishRegex) || []

  const chineseSegments = chineseParts.flatMap((part) => chineseSegment(part))
  const englishSegments = englishParts.flatMap((part) => englishSegment(part))

  return [...chineseSegments, ...englishSegments].filter(Boolean)
}

export const prepareFtsTokens = (text: string) => {
  const tokens = mixedSegment(text)
  return tokens
}
