import {app, BrowserWindow, clipboard, ipcMain, Menu, nativeImage, shell} from 'electron'
import {getLocale, mediaType} from './store'
import {extname} from 'path'
type Menus = Parameters<typeof Menu.buildFromTemplate>[0]
const cmd = 'CmdOrCtrl'
const isMac = process.platform === 'darwin'

export const registerMenus = () => {
  ipcMain.on('tool-menu', (e, filePath?: string) => {
    const zh = getLocale() === 'zh'
    const temp: Menus = [
      {
        label: zh ? '使用文档' : 'Documentation',
        click: () => {
          if (zh) {
            shell.openExternal(`https://doc.bluemd.me/book/zh-docs`)
          } else {
            shell.openExternal(`https://doc.bluemd.me/book/docs`)
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label:zh ? '复制Markdown代码' : 'Copy Markdown Source Code',
        enabled: filePath?.endsWith('.md'),
        click: (e, win) => win?.webContents.send('copy-source-code')
      },
      {
        label: zh ? '导出PDF' : 'Export To PDF',
        enabled: filePath?.endsWith('.md'),
        click: (e, win) => {
          win?.webContents.send('call-print-pdf')
        }
      },
      {
        label: zh ? '导出HTML' : 'Export To HTML',
        enabled: filePath?.endsWith('.md'),
        click: (e, win) => {
          win?.webContents.send('call-print-html')
        }
      },
      {
        type: 'separator'
      },
      {
        label: zh ? '转换远程图片至本机' : 'Convert remote images to local',
        enabled: filePath?.endsWith('.md'),
        click: (e, win) => win?.webContents.send('convert-remote-images')
      },
      {
        label: zh ? '文件历史' : 'File History',
        enabled: filePath?.endsWith('.md'),
        click: (e, win) => win?.webContents.send('open-file-history')
      },
      {
        type: 'separator'
      },
      {
        label: zh ? '在Finder中显示' : 'Reveal in Finder',
        enabled: !!filePath,
        click: () => shell.showItemInFolder(filePath!)
      },
      {
        label: zh ? '使用默认APP打开' : 'Open in default app',
        click: () => shell.openPath(filePath!),
        enabled: !!filePath
      }
    ]
    const showLeading = Menu.getApplicationMenu()?.getMenuItemById('showLeading')
    if (showLeading) temp.unshift(showLeading)
    const menu = Menu.buildFromTemplate(temp)
    menu.popup({
      window: BrowserWindow.fromWebContents(e.sender)!
    })
  })

  ipcMain.on('tab-context-menu', (e) => {
    const zh = getLocale() === 'zh'
    const menu = Menu.buildFromTemplate([
      {
        label: zh ? '关闭标签' : 'Close Tab',
        click: () => {
          e.sender?.send('close-selected-tab')
        }
      },
      {
        label: zh ? '关闭其他标签' : 'Close Other Tab',
        click: () => {
          e.sender?.send('close-other-tabs')
        }
      }
    ])
    menu.popup({
      window: BrowserWindow.fromWebContents(e.sender)!
    })
  })

  ipcMain.on('tree-context-menu', (e, params: {
    type: 'rootFolder' | 'file' | 'folder',
    filePath?: string
  }) => {
    const zh = getLocale() === 'zh'
    const temp = new Set<Menus[number]>()
    const sendCommand = (command: string) => {
      e.sender.send('tree-command', {
        ...params,
        command: command
      })
    }
    if (params.type !== 'file') {
      temp.add({
        label: zh ? '新建笔记' : 'New Note',
        click: () => sendCommand('createNote')
      })
      temp.add({
        label: zh ? '新建文件夹' : 'New Folder',
        click: () => sendCommand('createFolder')
      })
    }
    if (params.type !== 'rootFolder') {
      temp.add({
        label: zh ? '重命名' : 'Rename',
        click: () => sendCommand('rename')
      })
    }
    if (params.type !== 'file') {
      temp.add({
        type: 'separator'
      })
      temp.add({
        label: zh ? '分享文件夹' : 'Share Folder',
        click: () => sendCommand('shareFolder')
      })
      if (params.type !== 'rootFolder') {
        temp.add({
          type: 'separator'
        })
      }
    }
    if (params.type !== 'rootFolder') {
      if (params.type === 'file') {
        temp.add({
          label: zh ? '在新标签中打开' :'Open in New Tab',
          click: () => sendCommand('openInNewTab')
        })
        if (params.filePath?.endsWith('.md')) {
          temp.add({
            label: zh ? '新建副本' : 'New Copy',
            click: () => sendCommand('newCopy')
          })
        }
        if (mediaType(params.filePath) === 'image') {
          temp.add({
            label: zh ? '复制图片文件' : 'Copy Image File',
            click: () => {
              clipboard.writeImage(nativeImage.createFromPath(params.filePath!))
            }
          })
        }
      }
      temp.add({
        type: 'separator'
      })
      temp.add({
        label: zh ? '在Finder中显示' : 'Reveal in Finder',
        click: () => shell.showItemInFolder(params.filePath!)
      })
      if (params.type === 'file') {
        temp.add({
          label: zh ? '使用默认APP打开' : 'Open in default app',
          click: () => shell.openPath(params.filePath!)
        })
        if (params.filePath?.endsWith('.md')) {
          temp.add({
            label: zh ? '复制Markdown代码' : 'Copy Markdown Source Code',
            click: (e, win) => win?.webContents.send('copy-source-code', params.filePath)
          })
        }
      }
      temp.add({type: 'separator'})
      temp.add({
        label: zh ? '移到废纸篓' : 'Move to Trash',
        click: () => sendCommand('delete')
      })
    }
    const menu = Menu.buildFromTemplate(Array.from(temp))
    menu.popup({
      window: BrowserWindow.fromWebContents(e.sender)!
    })
  })

  ipcMain.on('table-menu', (e, head?: boolean) => {
    const zh = getLocale() === 'zh'
    const click = (task: string) => {
      return () => e.sender.send('table-task', task)
    }
    const temp: Menus = [
      {
        label: zh ? '在上面添加行' : 'Add Row Above',
        click: click('insertRowBefore'),
      },
      {
        label: zh ? '在下面添加行' : 'Add Row Below',
        accelerator: `${cmd}+Enter`,
        click: click('insertRowAfter'),
      },
      {type: 'separator'},
      {
        label: zh ? '在前面添加列' : 'Add Column Before',
        click: click('insertColBefore'),
      },
      {
        label: zh ? '在后面添加列' : 'Add Column After',
        click: click('insertColAfter'),
      },
      {
        type: 'separator'
      },
      {
        label: zh ? '表格项中换行' : 'Line break within table-cell',
        accelerator: `${cmd}+Shift+Enter`,
        click: click('insertTableCellBreak')
      },
      {
        label: 'Move',
        submenu: [
          {
            label: zh ? '上移一行' : 'Move Up One Row',
            click: click('moveUpOneRow'),
            enabled: !head
          },
          {
            label: zh ? '下移一行' : 'Move Down One Row',
            click: click('moveDownOneRow'),
            enabled: !head
          },
          {
            label: zh ? '左移一列' : 'Move Left One Col',
            click: click('moveLeftOneCol')
          },
          {
            label: zh ? '右移一列' : 'Move Right One Col',
            click: click('moveRightOneCol')
          }
        ]
      },
      {type: 'separator'},
      {
        label: zh ? '删除列' : 'Delete Col',
        click: click('removeCol')
      },
      {
        label: zh ? '删除行' : 'Delete Row',
        accelerator: `${cmd}+Shift+Backspace`,
        click: click('removeRow')
      }
    ]
    const menu = Menu.buildFromTemplate(temp)
    menu.popup({
      window: BrowserWindow.fromWebContents(e.sender)!
    })
  })
}
