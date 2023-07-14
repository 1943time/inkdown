import {Menu, app, ipcMain, BrowserWindow, shell, dialog} from 'electron'
import MenuItem = Electron.MenuItem
import {getLocale, store} from './store'
type MenuOptions = Parameters<typeof Menu.buildFromTemplate>[0]

const cmd = 'CmdOrCtrl'
const levelZhMap = new Map([
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

export const createAppMenus = () => {
  const titles = Array.from(new Array(4)).map((_, i) => {
    const n = i + 1
    return {
      label: getLocale() === 'zh' ? `${levelZhMap.get(n)}级标题` : `Heading ${n}`,
      id: `title-${n}`,
      accelerator: `${cmd}+${n}`,
      click: task('head', n),
      enabled: false
    }
  })
  const menusLabel = getLocale() === 'zh' ? {
    about: '关于 BlueStone',
    update: '检查更新',
    set: '偏好设置',
    file: '文件',
    create: '新建',
    createWindow: '新建窗口',
    open: '打开',
    openRecent: '打开最近的文件',
    clearRecent: '清除',
    pdf: '导出 PDF',
    html: '导出 HTML',
    eBook: '导出电子书',
    edit: '编辑',
    paragraph: '段落',
    titleIncrease: '提升标题',
    titleDecrease: '降低标题',
    insertTable: '插入表格',
    code: '代码块',
    katex: '公式块',
    orderedList: '有序列表',
    unorderedList: '无序列表',
    orderedTaskList: '有序任务列表',
    unorderedTaskList: '无序任务列表',
    horizontalLine: '水平分割线',
    format: '格式',
    bold: '加粗',
    italic: '斜体',
    strikethrough: '删除线',
    inlineCode: '行内代码',
    insertPicture: '插入图片',
    clear: '清除',
    view: '显示',
    zoomIn: '放大',
    zoomOut: '缩小',
    leading: '大纲',
    search: '搜索',
    help: '帮助',
    doc: '文档'
  } : {
    about: 'About Bluestone',
    update: 'Check for Updates',
    set: 'Settings',
    file: 'File',
    create: 'Create',
    createWindow: 'New Window',
    open: 'Open',
    openRecent: 'Open Recent',
    clearRecent: 'Clear Items',
    pdf: 'Export To PDF',
    html: 'Export To HTML',
    eBook: 'Export eBook',
    edit: 'Edit',
    paragraph: 'Paragraph',
    titleIncrease: 'Increase Heading Level',
    titleDecrease: 'Decrease Heading Level',
    insertTable: 'Insert Table',
    code: 'Code Fences',
    katex: 'Math Block',
    orderedList: 'Ordered List',
    unorderedList: 'Unordered List',
    orderedTaskList: 'Ordered Task List',
    unorderedTaskList: 'Unordered Task List',
    horizontalLine: 'Horizontal Line',
    format: 'Format',
    bold: 'Bold',
    italic: 'Italic',
    strikethrough: 'Strikethrough',
    inlineCode: 'Inline Code',
    insertPicture: 'Insert Picture',
    clear: 'Clear',
    view: 'View',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    leading: 'Outline',
    search: 'Search',
    help: 'Help',
    doc: 'Document'
  }

  const menus: MenuOptions = [
    {
      label: app.getName(),
      role: 'appMenu',
      submenu: [
        {
          label: menusLabel.about,
          click: (e,win) => {
            BrowserWindow.getFocusedWindow()?.webContents?.send('open-about')
          }
        },
        {
          label: menusLabel.update,
          click: () => {
            ipcMain.emit('check-updated')
            BrowserWindow.getFocusedWindow()?.webContents.send('check-updated')
          }
        },
        {type: 'separator'},
        {
          label: menusLabel.set,
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
      label: menusLabel.file,
      id: 'file',
      role: 'fileMenu',
      submenu: [
        {
          id: 'create',
          label: menusLabel.create,
          accelerator: `${cmd}+n`,
          click: (menu, win) => {
            win?.webContents.send('create')
          }
        },
        {
          label: menusLabel.createWindow,
          accelerator: `${cmd}+shift+n`,
          click: () => {
            ipcMain.emit('create-window')
          }
        },
        {type: 'separator'},
        {
          id: 'open',
          label: menusLabel.open,
          accelerator: `${cmd}+o`,
          click: (menu, win) => {
            win?.webContents.send('open')
          }
        },
        {
          label: menusLabel.openRecent,
          role: 'recentDocuments',
          submenu:[
            {
              label: menusLabel.clearRecent,
              role: 'clearRecentDocuments'
            }
          ]
        },
        {type: 'separator'},
        {
          label: menusLabel.pdf,
          click: (e, win) => {
            win?.webContents.send('call-print-pdf')
          }
        },
        {
          label: menusLabel.html,
          click: (e, win) => {
            win?.webContents.send('print-to-html')
          }
        },
        {
          label: menusLabel.eBook,
          click: (e, win) => {
            win?.webContents.send('export-ebook')
          }
        }
      ]
    },
    {
      label: menusLabel.edit,
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
        {role: 'selectAll'}
      ]
    },
    {
      label: menusLabel.paragraph,
      id: 'paragraph',
      submenu: [
        ...titles,
        {type: 'separator'},
        {
          label: menusLabel.paragraph,
          id: 'paragraph',
          accelerator: `${cmd}+0`,
          enabled: false,
          click: task('paragraph')
        },
        {type: 'separator'},
        {
          label: menusLabel.titleIncrease,
          id: 'titleIncrease',
          accelerator: `${cmd}+]`,
          enabled: false,
          click: task('head+')
        },
        {
          label: menusLabel.titleDecrease,
          id: 'titleDecrement',
          enabled: false,
          accelerator: `${cmd}+[`,
          click: task('head-')
        },
        {
          label: menusLabel.insertTable,
          id: 'insertTable',
          accelerator: `${cmd}+Alt+t`,
          click: task('insertTable'),
          enabled: false
        },
        {
          label: menusLabel.code,
          id: 'insertCode',
          accelerator: `${cmd}+Alt+c`,
          click: task('insertCode'),
          enabled: false
        },
        {
          label: menusLabel.katex,
          id: 'insertKatex',
          accelerator: `${cmd}+Alt+t`,
          click: task('insertKatex'),
          enabled: false
        },
        {type: 'separator'},
        {
          label: menusLabel.orderedList,
          id: 'insertOrderedList',
          accelerator: `${cmd}+Alt+o`,
          click: task('insertOrderedList'),
          enabled: false
        },
        {
          label: menusLabel.unorderedList,
          id: 'insertUnorderedList',
          accelerator: `${cmd}+Alt+u`,
          click: task('insertUnorderedList'),
          enabled: false
        },
        {
          label: menusLabel.orderedTaskList,
          id: 'insertTaskOrderedList',
          accelerator: `${cmd}+Shift+o`,
          click: task('insertTaskOrderedList'),
          enabled: false
        },
        {
          label: menusLabel.unorderedTaskList,
          id: 'insertTaskUnorderedList',
          accelerator: `${cmd}+Shift+u`,
          click: task('insertTaskUnorderedList'),
          enabled: false
        },
        {type: 'separator'},
        {
          label: menusLabel.horizontalLine,
          id: 'insertHorizontalRule',
          accelerator: `${cmd}+Alt+/`,
          click: task('insertHorizontalRule'),
          enabled: false
        }
      ]
    },
    {
      label: menusLabel.format,
      id: 'format',
      submenu: [
        {
          label: menusLabel.bold,
          accelerator: `${cmd}+b`,
          click: task('bold')
        },
        {
          label: menusLabel.italic,
          accelerator: `${cmd}+i`,
          click: task('italic')
        },
        {
          label: menusLabel.strikethrough,
          accelerator: `Ctrl+Shift+\``,
          click: task('strikethrough')
        },
        {
          label: menusLabel.inlineCode,
          accelerator: `Ctrl+\``,
          click: task('code')
        },
        {
          label: menusLabel.insertPicture,
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
          label: menusLabel.clear,
          accelerator: `${cmd}+\\`,
          click: task('clear')
        }
      ]
    },
    {
      label: menusLabel.view,
      role: 'viewMenu',
      submenu: [
        {role: 'zoomIn', accelerator: 'Alt+Shift+=', label: menusLabel.zoomIn},
        {role: 'zoomOut', accelerator: 'Alt+Shift+-', label: menusLabel.zoomOut},
        {type: 'separator'},
        {
          label: menusLabel.leading,
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
          label: menusLabel.search,
          id: 'search',
          accelerator: `${cmd}+f`
        },
        {type: 'separator'},
        {role: 'reload'},
        {role: 'toggleDevTools'}
      ]
    },
    {
      label: menusLabel.help,
      role: 'help',
      submenu: [
        // {
        //   label: menusLabel.doc,
        //   click: () => {
        //     shell.openExternal('https://bluestone.md-writer.com/book/docs')
        //   }
        // },
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
