
import {Menu, app, ipcMain, BrowserWindow, shell, dialog, ipcRenderer} from 'electron'
import MenuItem = Electron.MenuItem
import {getLocale, store} from './store'

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
  const zh = getLocale() === 'zh'
  const update: MenuOptions[number]['submenu'] = !isMas ? [
    {
      label: zh ? '检查更新' : 'Check for Updates',
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
          label: zh ? '关于' : 'About',
          id: 'about',
          click: (e, win) => {
            BrowserWindow.getFocusedWindow()?.webContents?.send('open-about')
          }
        },
        ...update,
        {type: 'separator'},
        {
          label: zh ? '设置' : 'Settings',
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
    label: zh ? '文件' : 'File',
    id: 'file',
    role: 'fileMenu',
    submenu: [
      {
        id: 'create',
        label: zh ? '打开文档' : 'Open Doc',
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
        label: zh ? '新建窗口' : 'New Window',
        accelerator: `${cmd}+shift+n`,
        id: 'create-window',
        click: () => {
          ipcMain.emit('create-window')
        }
      },
      {type: 'separator'},
      {
        label: zh ? '新建标签' : 'New Tab',
        id: 'new-tab',
        accelerator: `${cmd}+t`,
        click: (menu, win) => {
          win?.webContents.send('new-tab')
        }
      },
      {
        label: zh ? '关闭当前标签' : 'Close Current Tab',
        id: 'close-current-tab',
        accelerator: `${cmd}+w`,
        click: () => {
          BrowserWindow.getFocusedWindow()?.webContents.send('close-current-tab')
        }
      },
      {
        label: zh ? '快速打开' : 'Open Quickly',
        id: 'open-quickly',
        accelerator: `${cmd}+o`
      }
    ]
  })

  const delRange = isMac ? [
    {
      label: zh ? '删除范围' : 'Delete Range',
      id: 'delete-range',
      submenu: [
        {
          label: zh ? '删除行' : 'Delete Line',
          accelerator: `${cmd}+Backspace`
        },
        {
          label: zh ? '删除词' : 'Delete Word',
          accelerator: `Alt+Backspace`
        }
      ]
    }
  ] : []

  menus.push({
    label: zh ? '编辑' : 'Edit',
    id: 'edit',
    role: 'editMenu',
    submenu: [
      {role: 'undo'},
      {role: 'redo'},
      {type: 'separator'},
      {
        label: zh ? '保存' : 'Save',
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
        label: zh ? '选择' : 'Selection',
        submenu: [
          {
            role: 'selectAll',
            label: zh ? '全选' : 'Select All'
          },
          {
            accelerator: `${cmd}+shift+l`,
            click: task('select-line'),
            label: zh ? '选择行' : 'Select Line'
          },
          {
            accelerator: `${cmd}+e`,
            click: task('select-format'),
            label: zh ? '选择格式' : 'Select Format'
          },
          {
            accelerator: `${cmd}+d`,
            click: task('select-word'),
            label: zh ? '选择词' : 'Select Word'
          }
        ]
      }
    ]
  })

  menus.push(
    {
      label: zh ? '视图' : 'View',
      role: 'viewMenu',
      submenu: [
        {role: 'zoomIn', accelerator: 'Alt+Shift+=', label: 'Zoom In'},
        {role: 'zoomOut', accelerator: 'Alt+Shift+-', label: 'Zoom Out'},
        {type: 'separator'},
        {
          label: zh ? '大纲' : 'Outline',
          type: 'checkbox',
          id: 'showLeading',
          checked: typeof store.get('config.showLeading') === 'boolean' ? store.get('config.showLeading') as boolean : true,
          click: e => {
            store.set('config.showLeading', typeof store.get('config.showLeading') === 'boolean' ? !store.get('config.showLeading') : false)
            BrowserWindow.getAllWindows().forEach(w => {
              w.webContents.send('changeConfig', 'showLeading', e.checked)
            })
          }
        },
        {
          label: zh ? '搜索' : 'Search',
          id: 'search',
          accelerator: `${cmd}+f`,
          click: e => {
            BrowserWindow.getFocusedWindow()?.webContents.send('open-search')
          }
        },
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
      label: zh ? '帮助' : 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            if (app.getLocale() === 'zh-CN') {
              shell.openExternal(`https://doc.bluemd.me/book/zh-docs`)
            } else {
              shell.openExternal(`https://doc.bluemd.me/book/docs`)
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
