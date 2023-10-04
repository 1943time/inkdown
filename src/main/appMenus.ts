import {Menu, app, ipcMain, BrowserWindow, shell, dialog} from 'electron'
import MenuItem = Electron.MenuItem
import {store} from './store'
import {is} from '@electron-toolkit/utils'

type MenuOptions = Parameters<typeof Menu.buildFromTemplate>[0]
const isMas = process.mas || false
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'
const cmd = 'CmdOrCtrl'
const task = (task: string, parameter?: any) => {
  return (e: MenuItem, win?: BrowserWindow) => {
    win?.webContents.send('key-task', task, parameter)
  }
}

export const createAppMenus = () => {
  const titles = Array.from(new Array(4)).map((_, i) => {
    const n = i + 1
    return {
      label: `Heading ${n}`,
      id: `title-${n}`,
      accelerator: `${cmd}+${n}`,
      click: task('head', n),
      enabled: false
    }
  })
  const menusLabel = {
    about: 'About Bluestone',
    update: 'Check for Updates',
    set: 'Settings',
    file: 'File',
    create: 'Create',
    createWindow: 'New Window',
    openQuickly: 'Open Quickly',
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
    clear: 'Clear',
    view: 'View',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    leading: 'Outline',
    search: 'Search',
    help: 'Help',
    doc: 'Documentation'
  }
  const update: MenuOptions[number]['submenu'] = !isMas ? [
    {
      label: menusLabel.update,
      click: () => {
        ipcMain.emit('check-updated')
        BrowserWindow.getFocusedWindow()?.webContents.send('check-updated')
      }
    }
  ] : []
  const menus: MenuOptions = [
    {
      label: 'Bluestone',
      role: 'appMenu',
      submenu: [
        {
          label: menusLabel.about,
          click: (e, win) => {
            BrowserWindow.getFocusedWindow()?.webContents?.send('open-about')
          }
        },
        ...update,
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
    }
  ]
  const systemFileMenus: MenuOptions[number]['submenu'] = isMac || isLinux ? [
    {type: 'separator'},
    {
      id: 'open',
      label: menusLabel.open,
      click: (menu, win) => {
        win?.webContents.send('open')
      }
    },
    {
      label: menusLabel.openRecent,
      role: 'recentDocuments',
      submenu: [
        {
          label: menusLabel.clearRecent,
          click: () => {
            app.clearRecentDocuments()
            BrowserWindow.getFocusedWindow()?.webContents.send('clear-recent')
          }
        }
      ]
    },
  ] : [
    {
      id: 'open',
      label: 'Open File',
      click: (menu, win) => {
        win?.webContents.send('open-file')
      }
    },
    {
      id: 'open',
      label: 'Open Folder',
      click: (menu, win) => {
        win?.webContents.send('open')
      }
    }
  ]
  menus.push({
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
      ...systemFileMenus,
      {
        label: menusLabel.openQuickly,
        accelerator: `${cmd}+o`,
        click: () => {
          BrowserWindow.getFocusedWindow()?.webContents.send('open-quickly')
        }
      },
      {type: 'separator'},
      {
        label: menusLabel.pdf,
        id: 'print-pdf',
        enabled: false,
        click: (e, win) => {
          win?.webContents.send('call-print-pdf')
        }
      },
      {
        label: menusLabel.html,
        id: 'print-html',
        enabled: false,
        click: (e, win) => {
          win?.webContents.send('call-print-html')
        }
      }
    ]
  })
  const delRange = isMac ? [
    {
      label: 'Delete Range',
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
      ...delRange,
      {role: 'selectAll'},
      {type: 'separator'},
      {
        id: 'break-line',
        accelerator: `${cmd}+Enter`,
        label: 'Line Break Within Paragraph',
        click: task('key-break')
      },
      {type: 'separator'},
      {
        accelerator: `${cmd}+shift+v`,
        label: 'Paste as Plain Text',
        click: task('paste-plain-text')
      },
      {
        accelerator: `${cmd}+alt+v`,
        label: 'Paste Markdown Code',
        click: task('paste-markdown-code')
      }
    ]
  })
  menus.push(
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
          label: 'Quote',
          id: 'quote',
          accelerator: `${cmd}+Alt+q`,
          click: task('quote'),
          enabled: false
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
          label: 'Formula',
          id: 'formula',
          submenu: [
            {
              label: 'Formula Block',
              id: 'insertKatex',
              accelerator: `${cmd}+k`,
              click: task('insertKatex'),
              enabled: false
            },
            {
              label: 'Inline Formula',
              id: 'insertInlineKatex',
              accelerator: `${cmd}+Alt+k`,
              click: task('insertInlineKatex'),
              enabled: false
            }
          ]
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
    }
  )
  menus.push(
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
          label: 'Image',
          accelerator: `${cmd}+p`,
          submenu: [
            {
              label: 'Insert local image',
              accelerator: `${cmd}+p`,
              click: (e, win) => {
                dialog.showOpenDialog({
                  properties: ['openFile'],
                  filters: [{extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'], name: 'Image'}],
                  securityScopedBookmarks: true
                }).then(res => {
                  if (res.filePaths.length) {
                    win?.webContents.send('key-task', 'insertImage', res.filePaths[0])
                  }
                })
              }
            },
            {
              accelerator: `${cmd}+shift+p`,
              label: 'Insert image via url',
              click: (e, win) => {
                win?.webContents.send('key-task', 'insertNetworkImage')
              }
            }
          ]
        },
        {type: 'separator'},
        {
          label: menusLabel.clear,
          accelerator: `${cmd}+\\`,
          click: task('clear')
        }
      ]
    }
  )
  const winMenus:MenuOptions[number]['submenu']  = isMac ? [] : [
    {
      label: 'Show Menu Bar',
      type: 'checkbox',
      checked: !!store.get('showMenuBar'),
      accelerator: 'Alt+1',
      click: e => {
        store.set('showMenuBar', e.checked)
        BrowserWindow.getAllWindows().forEach(w => {
          w.menuBarVisible = e.checked
        })
      }
    }
  ]
  const devTools:MenuOptions[number]['submenu'] = is.dev || true ? [
    {role: 'toggleDevTools'}
  ] : []
  menus.push(
    {
      label: menusLabel.view,
      role: 'viewMenu',
      submenu: [
        {role: 'zoomIn', accelerator: 'Alt+Shift+=', label: menusLabel.zoomIn},
        {role: 'zoomOut', accelerator: 'Alt+Shift+-', label: menusLabel.zoomOut},
        {type: 'separator'},
        ...winMenus,
        {
          label: menusLabel.leading,
          type: 'checkbox',
          id: 'showLeading',
          checked: typeof store.get('config.showLeading') === 'boolean' ? store.get('config.showLeading') as boolean : true,
          click: e => {
            BrowserWindow.getAllWindows().forEach(w => {
              w.webContents.send('changeConfig', 'showLeading', e.checked)
            })
          }
        },
        {
          label: menusLabel.search,
          id: 'search',
          accelerator: `${cmd}+f`,
          click: e => {
            BrowserWindow.getFocusedWindow()?.webContents.send('open-search')
          }
        },
        {type: 'separator'},
        {role: 'reload'},
        ...devTools
      ],
    }
  )
  menus.push({
    role: 'windowMenu'
  })

  menus.push(
    {
      label: menusLabel.help,
      role: 'help',
      submenu: [
        {
          label: menusLabel.doc,
          click: () => {
            shell.openExternal(`https://pb.bluemd.me/official/book/docs`)
          }
        },
        {
          label: 'Bluestone Website',
          click: () => {
            shell.openExternal('https://www.bluemd.me')
          }
        },
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
    const katex = instance.getMenuItemById('insertKatex')!
    const inlineKatex = instance.getMenuItemById('insertInlineKatex')!
    katex.enabled = ctx === 'paragraph'
    instance.getMenuItemById('break-line')!.enabled = ctx === 'paragraph'
    inlineKatex.enabled = ['table-cell', 'paragraph'].includes(ctx)
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
  ipcMain.on('open-file', (e, isMarkdown: boolean) => {
    instance.getMenuItemById('print-pdf')!.enabled = isMarkdown
    instance.getMenuItemById('print-html')!.enabled = isMarkdown
  })
}
