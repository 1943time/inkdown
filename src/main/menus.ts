import {BrowserWindow, ipcMain, Menu} from 'electron'
import {getLocale} from './store'

const cmd = 'CmdOrCtrl'

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
}
