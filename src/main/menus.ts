import {BrowserWindow, ipcMain, Menu, shell} from 'electron'
import {getLocale} from './store'

type Menus = Parameters<typeof Menu.buildFromTemplate>[0]
const cmd = 'CmdOrCtrl'

export const registerMenus = () => {
  const locale = getLocale()

  const menusLabel = locale === 'zh' ? {
    copyMarkdown: '复制Markdown源码',
    pdf: '导出PDF',
    openInFinder: '在Finder中显示',
    openInDefault: '默认应用打开',
    delete: '删除',
    createNote: '新建文档',
    createFolder: '新建文件夹',
    rename: '重命名',
    insertRowAbove: '上方插入行',
    insertRowBelow: '下方插入行',
    insertColBefore: '左侧插入列',
    insertColAfter: '右侧插入列',
    delCol: '删除列',
    delRow: '删除行'
  } : {
    copyMarkdown: 'Copy Markdown Source Code',
    pdf: 'Export To PDF',
    openInFinder: 'Reveal in Finder',
    openInDefault: 'Open in default app',
    delete: 'Delete',
    createNote: 'New note',
    createFolder: 'New folder',
    rename: 'Rename',
    insertRowAbove: 'Add Row Above',
    insertRowBelow: 'Add Row Below',
    insertColBefore: 'Add Column before',
    insertColAfter: 'Add Column after',
    delCol: 'Delete col',
    delRow: 'Delete row'
  }
  ipcMain.on('tool-menu', (e, filePath?: string) => {
    const temp: Menus = [
      {
        type: 'separator'
      },
      {
        label: menusLabel.copyMarkdown,
        enabled: filePath?.endsWith('.md'),
        click: (e, win) => win?.webContents.send('copy-source-code')
      },
      {
        label: menusLabel.pdf,
        enabled: filePath?.endsWith('.md'),
        click: (e, win) => {
          win?.webContents.send('call-print-pdf')
        }
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
        label: menusLabel.openInFinder,
        enabled: !!filePath,
        click: () => shell.showItemInFolder(filePath!)
      },
      {
        label: menusLabel.openInDefault,
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
        label: menusLabel.createNote,
        click: () => sendCommand('createNote')
      })
      temp.add({
        label: menusLabel.createFolder,
        click: () => sendCommand('createFolder')
      })
    }
    if (params.type !== 'rootFolder') {
      temp.add({
        label: menusLabel.rename,
        click: () => sendCommand('rename')
      })
      temp.add({
        type: 'separator'
      })
      temp.add({
        label: menusLabel.openInFinder,
        click: () => shell.showItemInFolder(params.filePath!)
      })
      if (params.type === 'file') {
        temp.add({
          label: menusLabel.openInDefault,
          click: () => shell.openPath(params.filePath!)
        })
        if (params.filePath?.endsWith('.md')) {
          temp.add({
            label: menusLabel.copyMarkdown,
            click: (e, win) => win?.webContents.send('copy-source-code', params.filePath)
          })
        }
      }
      temp.add({type: 'separator'})
      temp.add({
        label: menusLabel.delete,
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
        label: menusLabel.insertRowAbove,
        click: click('insertRowBefore'),
      },
      {
        label: menusLabel.insertRowBelow,
        accelerator: `${cmd}+Enter`,
        click: click('insertRowAfter'),
      },
      {type: 'separator'},
      {
        label: menusLabel.insertColBefore,
        click: click('insertColBefore'),
      },
      {
        label: menusLabel.insertColAfter,
        click: click('insertColAfter'),
      },
      {type: 'separator'},
      {
        label: menusLabel.delCol,
        click: click('removeCol')
      },
      {
        label: menusLabel.delRow,
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
