import { ipcMain, Menu, BrowserWindow } from 'electron'
import { MenuItemConstructorOptions } from 'electron'

ipcMain.handle('show-context-menu', async (event, items: MenuItemConstructorOptions[]) => {
  return new Promise((resolve) => {
    const menu = Menu.buildFromTemplate(
      items.map((item) => ({
        ...item,
        click: () => {
          resolve(item.id || '')
        }
      }))
    )
    menu.popup({
      window: BrowserWindow.fromWebContents(event.sender) || undefined,
      callback: () => {
        resolve(null)
      }
    })
  })
})
