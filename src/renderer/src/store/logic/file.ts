import { basename, isAbsolute, join } from 'path'
import { Elements } from '../../types/el'
import { Core } from '../core'
import { openConfirmDialog$ } from '../../components/Dialog/ConfirmDialog'
import i18n from '../../utils/i18n'
import { IFileItem, ISpaceNode } from '../../types'
import { MainApi } from '../../api/main'
import { readdir } from 'fs/promises'
import { runInAction } from 'mobx'
import { Transforms } from 'slate'
import { base64ToArrayBuffer, nid } from '../../utils'
import { ReactEditor } from 'slate-react'

export class FileAssets {
  constructor(
    private readonly core: Core
  ) {}
  findMedia(filePath: string, schema: Elements[], usedImages: Set<string>) {
    for (let s of schema) {
      if (s.type === 'media' || s.type === 'attach') {
        if (!s.url || s.url.startsWith('http')) continue
        const path = isAbsolute(s.url) ? s.url : join(filePath, '..', s.url)
        usedImages.add(path)
      }
      if (
        (s.type === 'blockquote' || s.type === 'list' || s.type === 'list-item' || s.type === 'table' || s.type === 'table-row' || s.type === 'table-cell')
        && s.children?.length
      ) {
        this.findMedia(filePath, s.children, usedImages)
      }
    }
  }

  // clear() {
  //   if (!this.core.tree.root) return
  //   openConfirmDialog$.next({
  //     title: i18n.t('note'),
  //     description: i18n.t('clearImageTip'),
  //     onConfirm: async () => {
  //       let imgDirs: (IFileItem | ISpaceNode)[] = []
  //       const base = basename(this.core.tree.root!.imageFolder || '')
  //       if (this.core.tree.root?.relative) {
  //         const stack = this.core.tree.root?.children!.slice() || []
  //         while (stack.length) {
  //           const item = stack.shift()!
  //           if (item.folder && item.children) {
  //             stack.unshift(...item.children)
  //             if (item.filename === base || !base || base === './' || base === '.') {
  //               imgDirs.push(item)
  //             }
  //           }
  //         }
  //       } else {
  //         const item = this.core.tree.root?.children?.find(item => item.filePath === join(this.core.tree.root?.filePath || '', this.core.tree.root?.imageFolder || '.images'))
  //         if (item) imgDirs.push(item)
  //       }

  //       if (!base || base === '.') {
  //         imgDirs.push(this.core.tree.root!)
  //       }

  //       if (imgDirs.length) {
  //         const usedImages = new Set<string>()
  //         const stack = this.core.tree.root?.children!.slice() || []
  //         while (stack.length) {
  //           const item = stack.pop()!
  //           if (item.folder) {
  //             stack.push(...item.children!.slice())
  //           } else {
  //             if (item.ext === 'md') {
  //               this.findMedia(item.filePath, item.schema || [], usedImages)
  //             }
  //           }
  //         }
  //         for (let dir of imgDirs) {
  //           const images = await readdir(dir.filePath)
  //           const remove = new Set<string>()
  //           for (let img of images) {
  //             const path = join(dir.filePath, img)
  //             if (!usedImages.has(path)) {
  //               remove.add(path)
  //               MainApi.moveToTrash(path)
  //             }
  //           }
  //           runInAction(() => {
  //             dir.children = dir.children?.filter(img => {
  //               return !remove.has(img.filePath)
  //             })
  //           })
  //         }
  //         this.core.message.success(i18n.t('clearSuccess'))
  //       }
  //     }
  //   })
  // }
  async convertRemoteImages(node: IFileItem) {
    if (node.ext === 'md') {
      const schema = node.schema
      if (schema) {
        const stack = schema.slice()
        const store = this.core.tree.currentTab.store
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
        this.core.message.info(
          change ? this.core.config.zh ? '转换成功' : 'Conversion successful' : this.core.config.zh ? '当前文档未引入网络图片' : 'The current note does not include network images'
        )
      }
    }
  }
}
