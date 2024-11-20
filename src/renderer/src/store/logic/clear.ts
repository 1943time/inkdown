import { basename, isAbsolute, join } from 'path'
import { Elements } from '../../el'
import { Core } from '../core'
import { openConfirmDialog$ } from '../../components/Dialog/ConfirmDialog'
import i18n from '../../utils/i18n'
import { IFileItem, ISpaceNode } from '../..'
import { MainApi } from '../../api/main'
import { readdir } from 'fs/promises'
import { runInAction } from 'mobx'

export class ClaerUnusedFiles {
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

  clear() {
    if (!this.core.tree.root) return
    openConfirmDialog$.next({
      title: i18n.t('note'),
      description: i18n.t('clearImage'),
      onConfirm: async () => {
        let imgDirs: (IFileItem | ISpaceNode)[] = []
        const base = basename(this.core.tree.root!.imageFolder || '')
        if (this.core.tree.root?.relative) {
          const stack = this.core.tree.root?.children!.slice() || []
          while (stack.length) {
            const item = stack.shift()!
            if (item.folder && item.children) {
              stack.unshift(...item.children)
              if (item.filename === base || !base || base === './' || base === '.') {
                imgDirs.push(item)
              }
            }
          }
        } else {
          const item = this.core.tree.root?.children?.find(item => item.filePath === join(this.core.tree.root?.filePath || '', this.core.tree.root?.imageFolder || '.images'))
          if (item) imgDirs.push(item)
        }

        if (!base || base === '.') {
          imgDirs.push(this.core.tree.root!)
        }

        if (imgDirs.length) {
          const usedImages = new Set<string>()
          const stack = this.core.tree.root?.children!.slice() || []
          while (stack.length) {
            const item = stack.pop()!
            if (item.folder) {
              stack.push(...item.children!.slice())
            } else {
              if (item.ext === 'md') {
                this.findMedia(item.filePath, item.schema || [], usedImages)
              }
            }
          }
          for (let dir of imgDirs) {
            const images = await readdir(dir.filePath)
            const remove = new Set<string>()
            for (let img of images) {
              const path = join(dir.filePath, img)
              if (!usedImages.has(path)) {
                remove.add(path)
                MainApi.moveToTrash(path)
              }
            }
            runInAction(() => {
              dir.children = dir.children?.filter(img => {
                return !remove.has(img.filePath)
              })
            })
          }
          this.core.message.success(i18n.t('clearSuccess'))
        }
      }
    })
  }

}
