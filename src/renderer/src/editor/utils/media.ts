import {treeStore} from '../../store/tree'
import {Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {base64ToArrayBuffer, message$, nid} from '../../utils'
import {configStore} from '../../store/config'
import {IFileItem} from '../../index'
import {mediaType} from './dom'

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

export const convertRemoteImages = async (node: IFileItem) => {
  if (node.ext === 'md') {
    const schema = node.schema
    if (schema) {
      const stack = schema.slice()
      const store = treeStore.currentTab.store
      let change = false
      while (stack.length) {
        const item = stack.pop()!
        if (item.type === 'media') {
          if (item.url?.startsWith('http')) {
            const ext = item.url.match(/[\w_-]+\.(png|webp|jpg|jpeg|gif|svg)/i)
            if (ext) {
              try {
                change = true
                const res = await window.api.fetch(item.url).then(res => res.arrayBuffer())
                let path = await store.saveFile({
                  name: nid() + '.' + ext[1].toLowerCase(),
                  buffer: res
                })
                Transforms.setNodes(store.editor, {
                  url: path
                }, {at: ReactEditor.findPath(store.editor, item)})
              } catch (e) {
                console.error(e)
              }
            }
          } else if (item.url?.startsWith('data:')) {
            const m = item.url.match(/data:image\/(\w+);base64,(.*)/)
            if (m) {
              try {
                change = true
                const path = await store.saveFile({
                  name: Date.now().toString(16) + '.' + m[1].toLowerCase(),
                  buffer: base64ToArrayBuffer(m[2])
                })
                Transforms.setNodes(store.editor, {
                  url: path
                }, {at: ReactEditor.findPath(store.editor, item)})
              } catch (e) {}
            }
          }
        } else if (item.children?.length) {
          stack.push(...item.children)
        }
      }
      message$.next({
        type: 'info',
        content: change ? configStore.zh ? '转换成功' : 'Conversion successful' : configStore.zh ? '当前文档未引入网络图片' : 'The current note does not include network images'
      })
    }
  }
}
