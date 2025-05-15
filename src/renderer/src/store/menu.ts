import React from 'react'
import { observable, toJS } from 'mobx'
import { Store } from './store'
import { IDoc } from 'types/model'
import { IMenu, openMenus } from '@/ui/common/Menu'
import { copy, nid, os } from '@/utils/common'
import { EditorUtils } from '@/editor/utils/editorUtils'
import i18next from 'i18next'

export class ContextMenu {
  constructor(private readonly store: Store) {}
  getCreateName(name = 'Untitled', parent: IDoc) {
    const start = name.match(/\s(\d+)$/)
    let index = start ? +start[1] : 0
    let cur = name
    const stack = parent.children || []
    while (stack.some((s) => s.name === cur)) {
      index++
      cur = name + ' ' + index
    }
    return cur
  }
  openGlobalMenu(e: React.MouseEvent) {
    openMenus(e, [
      {
        text: i18next.t('menu.exportWorkspace'),
        click: () => {
          this.store.note.setState({ openExportSpace: true })
        }
      },
      {
        text: i18next.t('menu.viewAttachments'),
        click: () => {
          this.store.note.setState({ openSpaceFiles: true })
        }
      },
      {
        text: i18next.t('menu.downloadImages'),
        disabled: !this.store.note.state.opendDoc,
        click: () => {
          this.store.note.state.currentTab.downloadDocImage()
        }
      },
      {
        text: i18next.t('menu.fileHistory'),
        disabled: !this.store.note.state.opendDoc,
        click: () => {
          this.store.note.setState({ openHistory: true })
        }
      },
      {
        text: i18next.t('menu.exportPDF'),
        disabled: !this.store.note.state.opendDoc,
        click: () => {
          this.store.system.printPdf({
            docId: this.store.note.state.opendDoc!.id
          })
        }
      },
      { hr: true },
      {
        text: i18next.t('menu.settings'),
        key: 'cmd+,',
        click: () => {
          this.store.settings.setData((state) => {
            state.open = true
          })
        }
      }
    ])
  }
  createFolder(name: string, parentId: string = 'root') {
    const id = nid()
    const now = Date.now()
    const spaceId = this.store.note.state.currentSpace!.id
    const data: IDoc = observable({
      id,
      name,
      deleted: false,
      spaceId,
      parentId: parentId,
      updated: now,
      sort: 0,
      folder: true,
      created: now,
      children: []
    })
    this.store.model.createDoc(toJS(data))
    // core.ipc.sendMessage({
    //   type: 'createFolder',
    //   data: { cid: id, spaceCid: core.tree.root.cid, parentCid: state().ctxNode?.cid }
    // })
    this.store.note.setState((draft) => {
      draft.nodes[id] = data
      draft.nodes[parentId]!.children!.unshift(data)
      const updateData: Partial<IDoc>[] = []
      draft.nodes[parentId]!.children!.map((s, i) => {
        s.sort = i
        s.updated = now
        updateData.push({ id: s.id, sort: i, updated: now })
      })
      this.store.model.updateDocs(updateData)
    })
    return data
  }
  createDoc(parentId: string = 'root', name = 'Untitled', schema?: any[]) {
    const parent = this.store.note.state.nodes[parentId]
    const docName = this.getCreateName(name, parent)
    this.store.note.setState((state) => {
      const now = Date.now()
      const doc: IDoc = observable(
        {
          id: nid(),
          name: docName,
          parentId,
          folder: false,
          schema: schema ? copy(schema) : [EditorUtils.p],
          spaceId: this.store.note.state.currentSpace?.id!,
          sort: 0,
          created: now,
          updated: now
        },
        { schema: false }
      )
      state.nodes[doc.id] = doc
      this.store.note.openDoc(doc)
      doc.folder ? parent.children?.unshift(doc) : parent.children?.push(doc)
      this.store.model.createDoc(doc).then(() => {
        this.store.model.updateDocs(
          parent.children!.map((d, i) => {
            return {
              id: d.id,
              sort: i,
              updated: now
            }
          })
        )
      })
      setTimeout(() => {
        const title = document.querySelector<HTMLInputElement>('.page-title')
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
    })
  }
  openContextMenu(e: React.MouseEvent, node: IDoc) {
    this.store.note.setState({ selectedDoc: node, ctxNode: node })
    if (!node.folder) {
      const menus: IMenu[] = [
        {
          text: i18next.t('menu.newCopy'),
          click: async () => {
            this.createDoc(node.parentId || 'root', node.name, node.schema)
          }
        },
        {
          text: i18next.t('menu.copyMarkdown'),
          click: async () => {
            const res = await this.store.output.toMarkdown({
              node
            })
            this.store.copySuccessfully(res.md)
          }
        },
        {
          text: i18next.t('menu.openInNewTab'),
          click: () => {
            this.store.note.createTab(node)
          },
          key: 'cmd+click'
        },
        {
          text: os() === 'mac' ? 'Reveal in Finder' : 'Show in Explorer',
          click: () => {
            this.store.local.showInFinder(node)
          }
        }
      ]
      if (this.store.note.state.currentSpace?.writeFolderPath) {
        menus.push(
          ...[
            { hr: true },
            {
              text: i18next.t('menu.showInFinder'),
              click: () => {
                this.store.local.showInFinder(node)
              }
            }
          ]
        )
      }
      menus.push(
        ...[
          { hr: true },
          {
            text: i18next.t('menu.moveToTrash'),
            click: () => this.store.note.moveToTrash(node),
            key: 'cmd+backspace'
          }
        ]
      )
      openMenus(e, menus, () => {
        this.store.note.setState({ ctxNode: null })
      })
    } else {
      const menus: IMenu[] = [
        {
          text: i18next.t('menu.newDocument'),
          click: () => {
            this.createDoc(node.id)
          }
        },
        {
          text: i18next.t('menu.newFolder'),
          click: () => {
            this.store.note.setState({ selectedDoc: null })
            this.store.note.openEditFolderDialog$.next({
              mode: 'create'
            })
          }
        }
      ]
      if (node.id !== 'root') {
        menus.push({
          text: i18next.t('menu.rename'),
          click: () => {
            this.store.note.setState({ selectedDoc: null })
            this.store.note.openEditFolderDialog$.next({
              ctxNode: node,
              mode: 'update'
            })
          }
        })
        menus.push({ hr: true })
        menus.push({
          text: os() === 'mac' ? 'Reveal in Finder' : 'Show in Explorer',
          click: () => {
            this.store.local.showInFinder(node)
          }
        })
      }
      menus.push(
        ...[
          {
            hr: true
          },
          {
            text: i18next.t('menu.importMarkdown'),
            click: () => {
              this.store.local.newDocFromlocal(node)
            }
          },
          {
            text: i18next.t('menu.importFolder'),
            click: () => {
              this.store.note.openImportFolder$.next(node.id)
            }
          }
        ]
      )
      if (node.id !== 'root') {
        menus.push(
          ...[
            { hr: true },
            {
              text: i18next.t('menu.moveToTrash'),
              click: () => this.store.note.moveToTrash(node),
              key: 'cmd+backspace'
            }
          ]
        )
      }
      openMenus(e, menus, () => {
        this.store.note.setState({ ctxNode: null })
      })
    }
  }
}
