import {Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {base64ToArrayBuffer, message$, nid} from '../../utils'
import {IFileItem} from '../../index'
import {mediaType} from './dom'
import { Core } from '../../store/core'

export const getRemoteMediaType = async (url: string) => {
  if (!url) return 'other'
  try {
    const type = mediaType(url)
    if (type !== 'other') return type
    let contentType = ''
    const controller = new AbortController()
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    })
    if (!res.ok) {
      throw new Error()
    }
    setTimeout(() => {
      controller.abort()
    }, 1000)
    contentType = res.headers.get('content-type') || ''
    return contentType.split('/')[0]
  } catch (e) {
    return null
  }
}
