import { action, runInAction } from 'mobx'
import { IFileItem, ISpaceNode } from '../../types'
import { Core } from '../core'
import { IMenu, openMenus } from '../../components/Menu'
import { copyToClipboard } from '../../utils/copy'
import i18n from '../../utils/i18n'
import { toMarkdown } from '../../editor/utils/toMarkdown'
import { isMac } from '../../utils'
import { MainApi } from '../../api/main'
import { openEditFolderDialog$ } from '../../components/tree/EditFolderDialog'
import { openEbook$ } from '../../server/ui/Ebook'

export class ContextMenu {
  constructor(
    private readonly core: Core
  ) {}
  openTreeMenu(e: React.MouseEvent, node: IFileItem | ISpaceNode) {
    runInAction(() => {
      this.core.tree.selectItem = node.root ? null : node
      this.core.tree.ctxNode = node
    })
    if (!node.root && !node.folder) {
      const isMd = node.ext === 'md'
      const menus: IMenu[] = [
        {
          text: this.core.config.zh ? '在新标签中打开' : 'Open in New Tab',
          click: () => {
            this.core.tree.appendTab(node)
          },
          key: 'cmd+click'
        }
      ]
      if (isMd) {
        menus.push(...[
          {
            text: this.core.config.zh ? '新副本' : 'New Copy',
            click: async () => {
              this.core.node.createDoc({
                parent: node.parent,
                newName: node.filename,
                copyItem: node
              })
            }
          },
          {
            text: this.core.config.zh ? '复制Inkdown URL' : 'Copy Inkdown URL',
            click: async () => {
              copyToClipboard(`bluestone://open?space=${this.core.tree.root?.cid}&path=${encodeURIComponent(node.filePath)}`)
              this.core.message.success(i18n.t('copied'))
            }
          },
          {hr: true},
          {
            text: this.core.config.zh ? '复制Markdown代码' : 'Copy Markdown Source Code',
            click: () => {
              const md = toMarkdown(node.schema || [])
              window.api.copyToClipboard(md)
              this.core.message.success(i18n.t('copied'))
            }
          }
        ])
      }
      menus.push(...[
        {
          text: this.core.config.zh ? isMac ? '在Finder中显示' : '在File Explorer中显示' : isMac ? 'Reveal in Finder' : 'Reveal in File Explorer',
          click: () => MainApi.showInFolder(node.filePath)
        },
        {hr: true},
        {
          text: this.core.config.zh ? '移到废纸篓' : 'Move to Trash',
          click: () => this.core.tree.moveToTrash(node),
          key: 'cmd+backspace'
        }
      ])
      openMenus(e, menus, action(() => {
        this.core.tree.ctxNode = null
      }))
    } else {
      const menus:IMenu[] = [
        {
          text: this.core.config.zh ? '新建文档' : 'New Doc',
          click: () => {
            this.core.node.createDoc({
              parent: node
            })
          }
        },
        {
          text: this.core.config.zh ? '新建文件夹' : 'New Folder',
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
          text: this.core.config.zh ? '重命名' : 'Rename',
          click: () => {
            runInAction(() => {
              this.core.tree.selectItem = null
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
          text: this.core.config.zh ? isMac ? '在Finder中显示' : '在File Explorer中显示' : isMac ? 'Reveal in Finder' : 'Reveal in File Explorer',
          click: () => MainApi.showInFolder(node.filePath)
        },
        {
          text: this.core.config.zh ? '分享文件夹' : 'Share Folder',
          click: () => {
            if (!this.core.share.serviceConfig) {
              return this.core.message.info(this.core.config.zh ? '请先配置分享服务.' : 'Please configure sharing service first.')
            }
            openEbook$.next({folderPath: node.filePath})
          }
        }
      ])
      if (!node.root) {
        menus.push(...[
          {hr: true},
          {
            text: this.core.config.zh ? '移到废纸篓' : 'Move to Trash',
            click: () => this.core.tree.moveToTrash(node),
            key: 'cmd+backspace'
          }
        ])
      }
      openMenus(e, menus, action(() => {
        this.core.tree.ctxNode = null
      }))
    }
  }
}
