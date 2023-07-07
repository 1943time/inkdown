import {Menu, app, ipcMain, BrowserWindow, shell, dialog} from 'electron'
import MenuItem = Electron.MenuItem
import {store} from './store'
type MenuOptions = Parameters<typeof Menu.buildFromTemplate>[0]

const cmd = 'CmdOrCtrl'
const levelMap = new Map([
  [1, '一'],
  [2, '二'],
  [3, '三'],
  [4, '四'],
  [5, '五'],
  [6, '六'],
])
const task = (task: string, parameter?: any) => {
  return (e: MenuItem, win?: BrowserWindow) => {
    win?.webContents.send('key-task', task, parameter)
  }
}

const titles = Array.from(new Array(4)).map((_, i) => {
  const n = i + 1
  return {
    label: `${levelMap.get(n)}级标题`,
    id: `title-${n}`,
    accelerator: `${cmd}+${n}`,
    click: task('head', n),
    enabled: false
  }
})

let timer:any
export const createAppMenus = () => {
  const menus: MenuOptions = [
    {
      label: app.getName(),
      role: 'appMenu',
      submenu: [
        {
          label: '关于',
          click: (e,win) => {
            // win.webContents.send('showAbout')
          }
        },
        {
          label: '检测更新',
          click: () => {
            ipcMain.emit('check-updated')
          }
        },
        {type: 'separator'},
        {
          label: '偏好设置',
          accelerator: `${cmd}+,`,
          click: e => {
            BrowserWindow.getFocusedWindow()?.webContents.send('openSet')
          }
        },
        {role: 'services',},
        {type: 'separator'},
        {role: 'quit'}
      ]
    },
    {
      label: '文件',
      id: 'file',
      role: 'fileMenu',
      submenu: [
        {
          id: 'create',
          label: '新建',
          accelerator: `${cmd}+n`,
          click: (menu, win) => {
            win?.webContents.send('create')
          }
        },
        {
          label: '新建窗口',
          accelerator: `${cmd}+shift+n`,
          click: () => {
            ipcMain.emit('create-window')
          }
        },
        {type: 'separator'},
        {
          id: 'open',
          label: '打开',
          accelerator: `${cmd}+o`,
          click: (menu, win) => {
            win?.webContents.send('open')
          }
        },
        {
          label: '打开最近的文件',
          role: 'recentDocuments',
          submenu:[
            {
              label: '清除',
              role: 'clearRecentDocuments'
            }
          ]
        },
        {type: 'separator'},
        {
          label: '导出PDF',
          click: (e, win) => {
            win?.webContents.send('print-to-pdf')
          }
        },
        // {
        //   label: '导出HTML'
        // }
      ]
    },
    {
      label: '编辑',
      id: 'edit',
      role: 'editMenu',
      submenu: [
        {role: 'undo'},
        {role: 'redo'},
        {type: 'separator'},
        {
          label: 'save',
          accelerator: `${cmd}+s`,
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('save-doc')
          }
        },
        {role: 'copy'},
        {role: 'paste'},
        {role: 'cut'},
        {role: 'delete'},
        {role: 'selectAll'}
      ]
    },
    {
      label: '段落',
      id: 'paragraph',
      submenu: [
        ...titles,
        {type: 'separator'},
        {
          label: '段落',
          id: 'paragraph',
          accelerator: `${cmd}+0`,
          enabled: false,
          click: task('paragraph')
        },
        {type: 'separator'},
        {
          label: '提升标题',
          id: 'titleIncrease',
          accelerator: `${cmd}+]`,
          enabled: false,
          click: task('head+')
        },
        {
          label: '降低标题',
          id: 'titleDecrement',
          enabled: false,
          accelerator: `${cmd}+[`,
          click: task('head-')
        },
        {
          label: '插入表格',
          id: 'insertTable',
          accelerator: `${cmd}+Alt+t`,
          click: task('insertTable'),
          enabled: false
        },
        {
          label: '代码块',
          id: 'insertCode',
          accelerator: `${cmd}+Alt+c`,
          click: task('insertCode'),
          enabled: false
        },
        {
          label: '公式块',
          id: 'insertKatex',
          accelerator: `${cmd}+Alt+t`,
          click: task('insertKatex'),
          enabled: false
        },
        {type: 'separator'},
        {
          label: '有序列表',
          id: 'insertOrderedList',
          accelerator: `${cmd}+Alt+o`,
          click: task('insertOrderedList'),
          enabled: false
        },
        {
          label: '无序列表',
          id: 'insertUnorderedList',
          accelerator: `${cmd}+Alt+u`,
          click: task('insertUnorderedList'),
          enabled: false
        },
        {
          label: '有序任务列表',
          id: 'insertTaskOrderedList',
          accelerator: `${cmd}+Shift+o`,
          click: task('insertTaskOrderedList'),
          enabled: false
        },
        {
          label: '无序任务列表',
          id: 'insertTaskUnorderedList',
          accelerator: `${cmd}+Shift+u`,
          click: task('insertTaskUnorderedList'),
          enabled: false
        },
        {type: 'separator'},
        {
          label: '水平分割线',
          id: 'insertHorizontalRule',
          accelerator: `${cmd}+Alt+/`,
          click: task('insertHorizontalRule'),
          enabled: false
        }
      ]
    },
    {
      label: '格式',
      id: 'format',
      submenu: [
        {
          label: '加粗',
          accelerator: `${cmd}+b`,
          click: task('bold')
        },
        {
          label: '斜体',
          accelerator: `${cmd}+i`,
          click: task('italic')
        },
        {
          label: '删除线',
          accelerator: `Ctrl+Shift+\``,
          click: task('strikethrough')
        },
        {
          label: '行内代码',
          accelerator: `Ctrl+\``,
          click: task('code')
        },
        {
          label: '插入图片',
          accelerator: `${cmd}+Shift+i`,
          click: (e, win) => {
            dialog.showOpenDialog({
              properties: ['openFile'],
              filters: [{extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'], name: '图片'}],
              securityScopedBookmarks: true
            }).then(res => {
              if (res.filePaths.length) {
                win?.webContents.send('key-task', 'insertImage', res.filePaths[0])
              }
            })
          }
        },
        {type: 'separator'},
        {
          label: '清除',
          accelerator: `${cmd}+\\`,
          click: task('clear')
        }
      ]
    },
    {
      label: '显示',
      role: 'viewMenu',
      submenu: [
        {role: 'zoom', label: '缩放'},
        {role: 'zoomIn', accelerator: 'Alt+Shift+=', label: '放大'},
        {role: 'zoomOut', accelerator: 'Alt+Shift+-', label: '缩小'},
        {type: 'separator'},
        {
          label: '大纲',
          type: 'checkbox',
          id: 'showLeading',
          checked: !!store.get('config.showLeading'),
          click: e => {
            store.set('config.showLeading', e.checked)
            BrowserWindow.getAllWindows().forEach(w => {
              w.webContents.send('changeConfig', 'showLeading', e.checked)
            })
          }
        },
        {
          label: '搜索',
          id: 'search',
          accelerator: `${cmd}+f`
        },
        {type: 'separator'},
        {role: 'reload'},
        {role: 'toggleDevTools'}
      ]
    },
    {
      label: '帮助',
      role: 'help',
      submenu: [
        {
          label: '文档',
          click: () => {
            shell.openExternal('https://bluestone.md-writer.com/book/docs')
          }
        },
        {
          label: 'Github',
          click: () => {
            shell.openExternal('https://github.com/1943time/bluestone')
          }
        },
        {
          label: 'Email',
          click: () => {
            shell.openExternal("mailto:mdwriter@163.com?subject=&body=");
          }
        }
      ]
    }
  ]
  const instance = Menu.buildFromTemplate(menus)
  const setParagraph = (enable: boolean, exclude?: ['title']) => {
    const menu = instance.getMenuItemById('paragraph')
    menu?.submenu?.items.forEach(m => {
      if (exclude && exclude.some(t => m.id?.startsWith(t))) {
        m.enabled = false
      } else if (m.id) {
        m.enabled = enable
      }
    })
  }
  const setFormat = (enable: boolean) => {
    const menu = instance.getMenuItemById('format')
    menu?.submenu?.items.forEach(m => {
      m.enabled = enable
    })
  }

  Menu.setApplicationMenu(instance)
  ipcMain.on('changeContext', (e, ctx: string, isTop: boolean) => {
    switch (ctx) {
      case 'table-cell':
        setParagraph(false)
        setFormat(true)
        break
      case 'code-line':
        setParagraph(false)
        setFormat(false)
        break
      case 'paragraph':
        setParagraph(true, isTop ? undefined : ['title'])
        setFormat(true)
        break
      case 'head':
        setParagraph(true)
        setFormat(true)
        break
      default:
        setParagraph(false)
        setFormat(false)
        break
    }
  })
}
