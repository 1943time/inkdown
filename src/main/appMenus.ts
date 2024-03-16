
import {Menu, app, ipcMain, BrowserWindow, shell, dialog, ipcRenderer} from 'electron'
import MenuItem = Electron.MenuItem

type MenuOptions = Parameters<typeof Menu.buildFromTemplate>[0]
const isMas = process.mas || false
const isMac = process.platform === 'darwin'
const cmd = 'CmdOrCtrl'
const task = (task: string, parameter?: any) => {
  return (e: MenuItem, win?: BrowserWindow) => {
    win?.webContents.send('key-task', task, parameter)
  }
}
const getSystemMenus = () => {
  const update: MenuOptions[number]['submenu'] = !isMas ? [
    {
      label: 'Check for Updates',
      click: () => {
        BrowserWindow.getFocusedWindow()?.webContents.send('check-updated')
      }
    }
  ] : []
  const menus: MenuOptions = [
    {
      label: 'Bluestone',
      role: 'appMenu',
      id: 'app',
      submenu: [
        {
          label: 'About',
          id: 'about',
          click: (e, win) => {
            BrowserWindow.getFocusedWindow()?.webContents?.send('open-about')
          }
        },
        ...update,
        {type: 'separator'},
        {
          label: 'Settings',
          id: 'settings',
          accelerator: `${cmd}+,`,
          click: e => {
            BrowserWindow.getFocusedWindow()?.webContents.send('openSet')
          }
        },
        {role: 'services',},
        {type: 'separator'},
        {role: 'quit'}
      ]
    }
  ]

  menus.push({
    label: 'File',
    id: 'file',
    role: 'fileMenu',
    submenu: [
      {
        id: 'create',
        label: 'Open Doc',
        accelerator: `${cmd}+shift+n`,
        click: (e, win) => {
          dialog.showOpenDialog({
            filters: [{name: 'md', extensions: ['md']}],
            properties: ['openFile']
          }).then(res => {
            if (res.filePaths?.length) {
              win?.webContents.send('open-path', res.filePaths[0])
            }
          })
        }
      },
      {
        label: 'New Window',
        accelerator: `${cmd}+shift+n`,
        id: 'create-window',
        click: () => {
          ipcMain.emit('create-window')
        }
      },
      {type: 'separator'},
      {
        label: 'New Tab',
        id: 'new-tab',
        accelerator: `${cmd}+t`,
        click: (menu, win) => {
          win?.webContents.send('new-tab')
        }
      },
      {
        label: 'Close Current Tab',
        id: 'close-current-tab',
        accelerator: `${cmd}+w`,
        click: () => {
          BrowserWindow.getFocusedWindow()?.webContents.send('close-current-tab')
        }
      },
      {
        label: 'Open Quickly',
        id: 'open-quickly',
        accelerator: `${cmd}+o`
      }
    ]
  })

  const delRange = isMac ? [
    {
      label: 'Delete Range',
      id: 'delete-range',
      submenu: [
        {
          label: 'Delete Line',
          accelerator: `${cmd}+Backspace`
        },
        {
          label: 'Delete Word',
          accelerator: `Alt+Backspace`
        }
      ]
    }
  ] : []

  menus.push({
    label: 'Edit',
    id: 'edit',
    role: 'editMenu',
    submenu: [
      {role: 'undo'},
      {role: 'redo'},
      {type: 'separator'},
      {
        label: 'Save',
        accelerator: `${cmd}+s`,
        click: () => {
          BrowserWindow.getFocusedWindow()?.webContents.send('save-doc')
        }
      },
      {role: 'copy'},
      {role: 'paste'},
      {role: 'cut'},
      {role: 'delete'},
      ...delRange,
      {
        label: 'Selection',
        submenu: [
          {
            role: 'selectAll',
            label: 'Select All'
          },
          {
            accelerator: `${cmd}+shift+l`,
            click: task('select-line'),
            label: 'Select Line'
          },
          {
            accelerator: `${cmd}+e`,
            click: task('select-format'),
            label: 'Select Format'
          },
          {
            accelerator: `${cmd}+d`,
            click: task('select-word'),
            label: 'Select Word'
          }
        ]
      }
    ]
  })

  menus.push(
    {
      label: 'View',
      role: 'viewMenu',
      submenu: [
        {role: 'zoomIn', accelerator: 'Alt+Shift+=', label: 'Zoom In'},
        {role: 'zoomOut', accelerator: 'Alt+Shift+-', label: 'Zoom Out'},
        {type: 'separator'},
        {type: 'separator'},
        {role: 'togglefullscreen'},
        {role: 'reload'},
        {role: 'toggleDevTools'}
      ],
    }
  )
  menus.push({
    role: 'windowMenu'
  })

  menus.push(
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            if (app.getLocale() === 'zh-CN') {
              shell.openExternal(`https://doc.bluemd.me/doc/Q1vCjNmL8Dnvz`)
            } else {
              shell.openExternal(`https://doc.bluemd.me/doc/tAfxJPwODVe4i`)
            }
          }
        },
        // {
        //   label: 'Bluestone Website',
        //   click: () => {
        //     shell.openExternal('https://www.bluemd.me')
        //   }
        // },
        {
          label: 'Github',
          click: () => {
            shell.openExternal('https://github.com/1943time/bluestone')
          }
        },
        {
          label: 'Issues',
          click: () => {
            shell.openExternal('https://github.com/1943time/bluestone/issues')
          }
        },
        {
          label: 'Email',
          click: () => {
            shell.openExternal("mailto:1943dejavu@gmail.com?subject=&body=");
          }
        }
      ]
    }
  )
  return menus
}
export const createAppMenus = () => {
  const menus = getSystemMenus()
  let instance = Menu.buildFromTemplate(menus)
  Menu.setApplicationMenu(instance)
}
