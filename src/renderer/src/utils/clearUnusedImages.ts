import {treeStore} from '../store/tree'
import {message$} from './index'
import {configStore} from '../store/config'
import {IFileItem, ISpaceNode} from '../index'
import {basename, isAbsolute, join} from 'path'
import {MainApi} from '../api/main'
import {runInAction} from 'mobx'
import {openConfirmDialog$} from '../components/dialog/ConfirmDialog'
import {Elements} from '../el'
import {readdir} from 'fs/promises'
import { mediaType } from '@renderer/editor/utils/dom'

const findMedia = (filePath: string, schema: Elements[], usedImages: Set<string>) => {
  for (let s of schema) {
    if (s.type === 'media') {
      if (!s.url || s.url.startsWith('http')) continue
      const path = isAbsolute(s.url) ? s.url : join(filePath, '..', s.url)
      usedImages.add(path)
    }
    if (
      (s.type === 'blockquote' || s.type === 'list' || s.type === 'list-item' || s.type === 'table' || s.type === 'table-row' || s.type === 'table-cell')
      && s.children?.length
    ) {
      findMedia(filePath, s.children, usedImages)
    }
  }
}

export const clearUnusedImages = () => {
  if (!treeStore.root) return
  openConfirmDialog$.next({
    title: configStore.zh ? '提示' : 'Notice',
    description: configStore.zh ? '存储区中未被引用的图片将被删除' : 'Unreferenced images in the storage area will be deleted',
    onConfirm: async () => {
      let imgDirs: (IFileItem | ISpaceNode)[] = []
      const base = basename(treeStore.root!.imageFolder || '')
      if (treeStore.root?.relative) {
        const stack = treeStore.root?.children!.slice() || []
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
        const item = treeStore.root?.children?.find(item => item.filePath === join(treeStore.root?.filePath || '', treeStore.root?.imageFolder || '.images'))
        if (item) imgDirs.push(item)
      }

      if (!base || base === '.') {
        imgDirs.push(treeStore.root!)
      }

      if (imgDirs.length) {
        const usedImages = new Set<string>()
        const stack = treeStore.root?.children!.slice() || []
        while (stack.length) {
          const item = stack.pop()!
          if (item.folder) {
            stack.push(...item.children!.slice())
          } else {
            if (item.ext === 'md') {
              findMedia(item.filePath, item.schema || [], usedImages)
            }
          }
        }
        for (let dir of imgDirs) {
          const images = await readdir(dir.filePath)
          const remove = new Set<string>()
          for (let img of images) {
            if (mediaType(img) !== 'image') continue
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
        message$.next({
          type: 'success',
          content: configStore.zh ? '清除成功' : 'Clear successfully'
        })
      }
    }
  })
}
