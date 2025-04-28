import { encode } from 'gpt-tokenizer'
import dayjs from 'dayjs'

export const getTokens = (text: string) => {
  return encode(text).length
}

export function findLastIndex<T>(array: T[], callback: (item: T) => boolean) {
  const reversedIndex = [...array].reverse().findIndex(callback)
  return reversedIndex === -1 ? -1 : array.length - 1 - reversedIndex
}

export const modelToLabel = (model: string) => {
  return model
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-')
}

export const generateRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export const formatTime = (time: number): string => {
  const now = dayjs()
  const target = dayjs(time)

  if (target.isSame(now, 'day')) {
    return target.format('HH:mm:ss')
  } else if (target.isSame(now, 'year')) {
    return target.format('MM-DD HH:mm:ss')
  } else {
    return target.format('YYYY-MM-DD HH:mm:ss')
  }
}
