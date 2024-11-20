import { IFileItem, ISpaceNode } from '../../index'
import { IMenu, openMenus } from '../Menu'
import React from 'react'
import { configStore } from '../../store/config'
import { isMac, message$, nid } from '../../utils'
import { MainApi } from '../../api/main'
import { toMarkdown } from '../../editor/utils/toMarkdown'
import { db, IFile } from '../../store/db'
import { join, parse, sep } from 'path'
import { createFileNode } from '../../store/parserNode'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { action, runInAction } from 'mobx'
import { EditorUtils } from '../../editor/utils/editorUtils'
import { openEditFolderDialog$ } from './EditFolderDialog'
import { openEbook$ } from '../../server/ui/Ebook'
import { shareStore } from '../../server/store'
import { copyToClipboard } from '../../utils/copy'
import { Core, useCoreContext } from '../../store/core'

export const deepCreateDoc = async (filePath: string) => {
  const core = useCoreContext()
  if (!core.tree.root) {
    return
  }
  const parent = join(filePath, '..')
  const nodeMap = new Map(core.tree.nodes.map(n => [n.filePath, n]))
  let parentNode: ISpaceNode | IFileItem = nodeMap.get(parent) || core.tree.root
  if (!existsSync(parent)) {
    mkdirSync(parent, {recursive: true})
    const stack = parent.replace(core.tree.root.filePath + sep, '').split(sep)
    let curPaths: string[] = []
    for (const item of stack) {
      curPaths.push(item)
      const path = join(core.tree.root.filePath, curPaths.join(sep))
      if (nodeMap.get(path)) {
        parentNode = nodeMap.get(path)!
      } else {
        const id = nid()
        const now = Date.now()
        const data: IFile = {
          cid: id,
          filePath: path,
          spaceId: core.tree.root!.cid,
          updated: now,
          sort: 0,
          folder: true,
          created: now
        }
        await db.file.add(data)
        runInAction(() => {
          const node = createFileNode(data, parentNode)
          parentNode.children!.unshift(node)
          parentNode = node
        })
      }
    }
  }
  createDoc({parent: parentNode, newName: parse(filePath).name})
}

export const createDoc = async ({parent, newName, copyItem, ghost}: {
  parent?: IFileItem | ISpaceNode, newName?: string, copyItem?: IFileItem, ghost?: boolean
}) => {
  const core = useCoreContext()
  newName = newName || 'Untitled'
  const name = getCreateName(parent, newName)
  const id = nid()
  const now = Date.now()
  let target = parent ? join(parent.filePath, name + '.md') : newName + '.md'
  const md = toMarkdown(copyItem?.schema || [EditorUtils.p])
  let updated = 0
  if (target && !ghost) {
    writeFileSync(target, md , {encoding: 'utf-8'})
    const s = statSync(target)
    updated = s.mtime.valueOf()
  }
  const data:IFile = {
    cid: id,
    filePath: target,
    created: now,
    folder: false,
    updated: updated,
    schema: JSON.parse(JSON.stringify(copyItem?.schema || [EditorUtils.p])),
    sort: 0,
    lastOpenTime: now,
    spaceId: parent ? parent.root ? parent.cid : parent.spaceId : undefined
  }
  if (!ghost) {
    await db.file.add(data)
  }
  const newNode = createFileNode(data, parent, ghost)
  if (parent) {
    const index = copyItem ? parent!.children!.findIndex(n => n === copyItem) : parent.children!.length - 1
    runInAction(() => {
      parent!.children!.splice(index + 1, 0, newNode)
    })
    parent.children!.map((n, i) => {
      db.file.update(n.cid, {sort: i})
      n.sort = i
    })
    core.tree.nodeMap.set(data.cid, newNode)
  }
  if (core.tree.selectItem) {
    runInAction(() => core.tree.selectItem = null)
  }
  core.tree.openNote(newNode)
  setTimeout(() => {
    setTimeout(() => {
      const title =
        core.tree.currentTab.store.container?.querySelector<HTMLInputElement>('.page-title')
      if (title) {
        title.focus()
        const range = document.createRange()
        range.selectNodeContents(title)
        range.collapse(false)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }, 30)
  }, 30)
}

export const getCreateName = (parent?: IFileItem | ISpaceNode, name = 'Untitled') => {
  if (!parent) return name
  const start = name.match(/\s(\d+)$/)
  let index = start ? +start[1] : 0
  let cur = name
  const stack = parent.children || []
  while (stack.some(s => s.filename === cur)) {
    index++
    cur = name + ' ' + index
  }
  return cur
}
export const openContextMenu = (e: React.MouseEvent, node: IFileItem | ISpaceNode, core: Core) => {
  runInAction(() => {
    core.tree.selectItem = node.root ? null : node
    core.tree.ctxNode = node
  })
  if (!node.root && !node.folder) {
    const isMd = node.ext === 'md'
    const menus: IMenu[] = [
      {
        text: configStore.zh ? '在新标签中打开' : 'Open in New Tab',
        click: () => {
          core.tree.appendTab(node)
        },
        key: 'cmd+click'
      }
    ]
    if (isMd) {
      menus.push(...[
        {
          text: configStore.zh ? '新副本' : 'New Copy',
          click: async () => {
            createDoc({
              parent: node.parent,
              newName: node.filename,
              copyItem: node
            })
          }
        },
        {
          text: configStore.zh ? '复制Inkdown URL' : 'Copy Inkdown URL',
          click: async () => {
            copyToClipboard(`bluestone://open?space=${core.tree.root?.cid}&path=${encodeURIComponent(node.filePath)}`)
            message$.next({
              type: 'success',
              content: configStore.zh ? '已复制到剪贴板' : 'Copied to clipboard'
            })
          }
        },
        {hr: true},
        {
          text: configStore.zh ? '复制Markdown代码' : 'Copy Markdown Source Code',
          click: () => {
            const md = toMarkdown(node.schema || [])
            window.api.copyToClipboard(md)
            message$.next({
              type: 'success',
              content: configStore.zh ? '已复制到剪贴板' : 'Copied to clipboard'
            })
          }
        }
      ])
    }
    menus.push(...[
      {
        text: configStore.zh ? isMac ? '在Finder中显示' : '在File Explorer中显示' : isMac ? 'Reveal in Finder' : 'Reveal in File Explorer',
        click: () => MainApi.showInFolder(node.filePath)
      },
      {hr: true},
      {
        text: configStore.zh ? '移到废纸篓' : 'Move to Trash',
        click: () => core.tree.moveToTrash(node),
        key: 'cmd+backspace'
      }
    ])
    openMenus(e, menus, action(() => {
      core.tree.ctxNode = null
    }))
  } else {
    const menus:IMenu[] = [
      {
        text: configStore.zh ? '新建文档' : 'New Doc',
        click: () => {
          createDoc({
            parent: node
          })
        }
      },
      {
        text: configStore.zh ? '新建文件夹' : 'New Folder',
        click: () => {
          openEditFolderDialog$.next({
            ctxNode: node.root ? undefined : node,
            mode: 'create'
          })
        }
      },
    ]
    if (!node.root) {
      menus.push({
        text: configStore.zh ? '重命名' : 'Rename',
        click: () => {
          runInAction(() => {
            core.tree.selectItem = null
          })
          openEditFolderDialog$.next({
            ctxNode: node,
            mode: 'update'
          })
        }
      })
    }
    menus.push(...[
      {hr: true},
      {
        text: configStore.zh ? isMac ? '在Finder中显示' : '在File Explorer中显示' : isMac ? 'Reveal in Finder' : 'Reveal in File Explorer',
        click: () => MainApi.showInFolder(node.filePath)
      },
      {
        text: configStore.zh ? '分享文件夹' : 'Share Folder',
        click: () => {
          if (!shareStore.serviceConfig) {
            return message$.next({
              type: 'info',
              content: configStore.zh ? '请先配置分享服务.' : 'Please configure sharing service first.'
            })
          }
          openEbook$.next({folderPath: node.filePath})
        }
      }
    ])
    if (!node.root) {
      menus.push(...[
        {hr: true},
        {
          text: configStore.zh ? '移到废纸篓' : 'Move to Trash',
          click: () => core.tree.moveToTrash(node),
          key: 'cmd+backspace'
        }
      ])
    }
    openMenus(e, menus, action(() => {
      core.tree.ctxNode = null
    }))
  }
}
