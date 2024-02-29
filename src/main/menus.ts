import {app, BrowserWindow, clipboard, ipcMain, Menu, nativeImage, shell} from 'electron'
import {getLocale, mediaType} from './store'
import {extname} from 'path'
type Menus = Parameters<typeof Menu.buildFromTemplate>[0]
const cmd = 'CmdOrCtrl'
const isMac = process.platform === 'darwin'

export const registerMenus = () => {
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

  ipcMain.on('tag-menu', (e, file?: string) => {
    const zh = getLocale() === 'zh'
    const click = (task: string) => {
      return () => e.sender.send('tag-task', task)
    }
    if (file) {
      const menu = Menu.buildFromTemplate([
        {
          label: zh ? '删除' : 'Delete',
          click: click('delete'),
          accelerator: `${cmd}+Backspace`
        }
      ])
      menu.popup({
        window: BrowserWindow.fromWebContents(e.sender)!
      })
    } else {
      const menu = Menu.buildFromTemplate([
        {
          label: zh ? '重命名' : 'Rename',
          click: click('rename')
        },
        {
          label: zh ? '删除' : 'Delete',
          click: click('delete')
        }
      ])
      menu.popup({
        window: BrowserWindow.fromWebContents(e.sender)!
      })
    }
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
