import {BrowserWindow, ipcMain, Menu, shell} from 'electron'

type Menus = Parameters<typeof Menu.buildFromTemplate>[0]
const cmd = 'CmdOrCtrl'

export const registerMenus = () => {
  ipcMain.on('tool-menu', (e, filePath?: string) => {
    const temp: Menus = [
      {
        type: 'separator'
      },
      {
        label: '复制Markdown源码',
        enabled: filePath?.endsWith('.md'),
        click: (e, win) => win?.webContents.send('copy-source-code')
      },
      {
        label: '导出pdf',
        enabled: filePath?.endsWith('.md'),
        click: (e, win) => win?.webContents.send('print-to-pdf')
      },
      // {
      //   label: '导出html',
      //   enabled: !!filePath,
      //   click: (e, win) => win?.webContents.send('print-to-html')
      // },
      {
        type: 'separator'
      },
      {
        label: '在Finder中显示',
        enabled: !!filePath,
        click: () => shell.showItemInFolder(filePath!)
      },
      {
        label: '默认应用打开',
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

  ipcMain.on('tree-context-menu', (e, params: {
    type: 'rootFolder' | 'file' | 'folder'
    filePath?: string
  }) => {
    const temp = new Set<Menus[number]>()
    const sendCommand = (command: string) => {
      e.sender.send('tree-command', {
        ...params,
        command: command
      })
    }
    // if (params.type === 'file') {
    //   temp.add({
    //     label: '新Tab中打开',
    //     click: () => sendCommand('openInNewTab')
    //   })
    // }
    if (params.type !== 'file') {
      temp.add({
        label: '新建文件',
        click: () => sendCommand('createNote')
      })
      temp.add({
        label: '新建文件夹',
        click: () => sendCommand('createFolder')
      })
    }
    if (params.type !== 'rootFolder') {
      temp.add({
        label: '重命名',
        click: () => sendCommand('rename')
      })
      temp.add({
        type: 'separator'
      })
      temp.add({
        label: '在Finder中显示',
        click: () => shell.showItemInFolder(params.filePath!)
      })
      if (params.type === 'file') {
        temp.add({
          label: '默认应用打开',
          click: () => shell.openPath(params.filePath!)
        })
        if (params.filePath?.endsWith('.md')) {
          temp.add({
            label: '复制Markdown源码',
            click: (e, win) => win?.webContents.send('copy-source-code', params.filePath)
          })
        }
      }
      temp.add({type: 'separator'})
      temp.add({
        label: '删除',
        click: () => sendCommand('delete')
      })
    }
    const menu = Menu.buildFromTemplate(Array.from(temp))
    menu.popup({
      window: BrowserWindow.fromWebContents(e.sender)!
    })
  })

  ipcMain.on('table-menu', (e) => {
    const click = (task: string) => {
      return () => e.sender.send('table-task', task)
    }
    const temp: Menus = [
      {
        label: '上方插入行',
        id: 'insertRowBefore',
        click: click('insertRowBefore'),
      },
      {
        label: '下方插入行',
        id: 'insertRowAfter',
        accelerator: `${cmd}+Enter`,
        click: click('insertRowAfter'),
      },
      {type: 'separator'},
      {
        label: '左侧插入列',
        id: 'insertColBefore',
        click: click('insertColBefore'),
      },
      {
        label: '又侧插入列',
        id: 'insertColAfter',
        click: click('insertColAfter'),
      },
      {type: 'separator'},
      {
        label: '删除列',
        id: 'removeCol',
        click: click('removeCol')
      },
      {
        label: '删除行',
        id: 'removeRow',
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
