
import {Menu, app, ipcMain, BrowserWindow, shell, dialog, ipcRenderer} from 'electron'
import MenuItem = Electron.MenuItem
import {getLocale, store} from './store'
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
const getSystemMenus = () => {
  const zh = getLocale() === 'zh'
  const titles = Array.from(new Array(4)).map((_, i) => {
    const n = i + 1
    return {
      label: `${zh ? '标题' : 'Heading'} ${n}`,
      id: `title-${n}`,
      accelerator: `${cmd}+${n}`,
      click: task('head', n),
      enabled: false
    }
  })
  const update: MenuOptions[number]['submenu'] = !isMas ? [
    {
      label: zh ? '检查更新' : 'Check for Updates',
      click: () => {
        ipcMain.emit('check-updated')
        BrowserWindow.getFocusedWindow()?.webContents.send('check-updated')
      }
    }
  ] : []
  const menus: MenuOptions = [
    {
      label: zh ? '青石' : 'Bluestone',
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
  const getOpenPaths = () => {
    const openPaths:string[] = store.get('recent-open-paths') as string[] || []
    let openPathMenus:MenuOptions[number]['submenu'] = []
    if (openPaths.length) {
      const home = app.getPath('home')
      openPathMenus.push(...openPaths.map(p => {
        return {
          label: p.replace(home, '~'),
          click: e => {
            ipcMain.emit('open-history-path', e, p)
          }
        }
      }))
      openPathMenus.push({
        type: 'separator'
      })
    }
    openPathMenus.push({
      label: zh ? '清除记录' : 'Clear Recent',
      id: 'clear-recent',
      click: () => {
        app.clearRecentDocuments()
        BrowserWindow.getFocusedWindow()?.webContents.send('clear-recent')
        store.delete('recent-open-paths')
        ipcMain.emit('refresh-recent')
      }
    })
    return openPathMenus
  }
  const systemFileMenus: MenuOptions[number]['submenu'] = isMac ? [
    {type: 'separator'},
    {
      id: 'open',
      label: zh ? '打开' : 'Open',
      click: (menu, win) => {
        win?.webContents.send('open')
      }
    },
    {
      label: zh ? '最近打开' : 'Open Recent',
      id: 'open-recent',
      role: 'recentDocuments',
      submenu: [
        {
          label: zh ? '清除记录' : 'Clear Recent',
          click: () => {
            app.clearRecentDocuments()
            BrowserWindow.getFocusedWindow()?.webContents.send('clear-recent')
          }
        }
      ]
    },
  ] : [
    {type: 'separator'},
    {
      id: 'open-file',
      label: zh ? '打开文件' : 'Open File',
      click: (menu, win) => {
        win?.webContents.send('open-file')
      }
    },
    {
      id: 'open-folder',
      label: zh ? '打开文件夹' : 'Open Folder',
      click: (menu, win) => {
        win?.webContents.send('open')
      }
    },
    {type: 'separator'},
    {
      id: 'recent-open-paths',
      label: zh ? '最近打开' : 'Open Recent',
      submenu: getOpenPaths()
    }
  ]
  menus.push({
    label: zh ? '文件' : 'File',
    id: 'file',
    role: 'fileMenu',
    submenu: [
      {
        id: 'create',
        label: zh ? '新建笔记' : 'New Note',
        accelerator: `${cmd}+n`,
        click: (menu, win) => {
          win?.webContents.send('create')
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
        accelerator: `${cmd}+w`
      },
      ...systemFileMenus,
      {
        label: zh ? '快速打开' : 'Open Quickly',
        id: 'open-quickly',
        accelerator: `${cmd}+o`,
        click: () => {
          BrowserWindow.getFocusedWindow()?.webContents.send('open-quickly')
        }
      },
      {
        label: zh ? '清除未使用的图片' : 'Clear Unused Images',
        id: 'clear-unused-images',
        click: (e, win) => {
          win?.webContents.send('clear-unused-images')
        }
      },
      {type: 'separator'},
      {
        label: zh ? '导出PDF' : 'Export To PDF',
        id: 'print-pdf',
        enabled: false,
        click: (e, win) => {
          win?.webContents.send('call-print-pdf')
        }
      },
      {
        label: zh ? '导出HTML' : 'Export To HTML',
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
            accelerator: `${cmd}+l`,
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
      },
      {type: 'separator'},
      {
        id: 'break-line',
        accelerator: `${cmd}+Enter`,
        label: zh ? '段落内换行' :'Line Break Within Paragraph',
        click: task('key-break')
      },
      {type: 'separator'},
      {
        accelerator: `${cmd}+shift+v`,
        label: zh ? '黏贴为纯文本' : 'Paste as Plain Text',
        click: task('paste-plain-text')
      },
      {
        accelerator: `${cmd}+alt+v`,
        label: zh ? '黏贴为Markdown代码' : 'Paste Markdown Code',
        click: task('paste-markdown-code')
      }
    ]
  })
  menus.push(
    {
      label: zh ? '段落' : 'Paragraph',
      id: 'paragraph',
      submenu: [
        ...titles,
        {type: 'separator'},
        {
          label: zh ? '段落' : 'Paragraph',
          id: 'paragraph',
          accelerator: `${cmd}+0`,
          enabled: false,
          click: task('paragraph')
        },
        {type: 'separator'},
        {
          label: zh ? '提升标题等级' : 'Increase Heading Level',
          id: 'titleIncrease',
          accelerator: `${cmd}+]`,
          enabled: false,
          click: task('head+')
        },
        {
          label: zh ? '降低标题等级' : 'Decrease Heading Level',
          id: 'titleDecrement',
          enabled: false,
          accelerator: `${cmd}+[`,
          click: task('head-')
        },
        {
          label: zh ? '引用' : 'Quote',
          id: 'quote',
          accelerator: `${cmd}+Alt+q`,
          click: task('quote'),
          enabled: false
        },
        {
          label: zh ? '插入表格' : 'Insert Table',
          id: 'insertTable',
          accelerator: `${cmd}+Alt+t`,
          click: task('insertTable'),
          enabled: false
        },
        {
          label: zh ? '代码栏' : 'Code Fences',
          id: 'insertCode',
          accelerator: `${cmd}+Alt+c`,
          click: task('insertCode'),
          enabled: false
        },
        {
          label: zh ? '公式' : 'Formula',
          id: 'formula',
          submenu: [
            {
              label: zh ? '块级公式' : 'Formula Block',
              id: 'insertKatex',
              accelerator: `${cmd}+k`,
              click: task('insertKatex'),
              enabled: false
            },
            {
              label: zh ? '行内公式' : 'Inline Formula',
              id: 'insertInlineKatex',
              accelerator: `${cmd}+Alt+k`,
              click: task('insertInlineKatex'),
              enabled: false
            }
          ]
        },
        {
          label: 'Front Matter',
          id: 'frontmatter',
          click: task('insertFrontmatter'),
          enabled: false
        },
        {type: 'separator'},
        {
          label: zh ? '有序列表' : 'Ordered List',
          id: 'insertOrderedList',
          accelerator: `${cmd}+Alt+o`,
          click: task('insertOrderedList'),
          enabled: false
        },
        {
          label: zh ? '无序列表' : 'Unordered List',
          id: 'insertUnorderedList',
          accelerator: `${cmd}+Alt+u`,
          click: task('insertUnorderedList'),
          enabled: false
        },
        {
          label: zh ? '有序任务列表' : 'Ordered Task List',
          id: 'insertTaskOrderedList',
          accelerator: `${cmd}+Shift+o`,
          click: task('insertTaskOrderedList'),
          enabled: false
        },
        {
          label: zh ? '无序任务列表' : 'Unordered Task List',
          id: 'insertTaskUnorderedList',
          accelerator: `${cmd}+Shift+u`,
          click: task('insertTaskUnorderedList'),
          enabled: false
        },
        {type: 'separator'},
        {
          label: zh ? '水平线' : 'Horizontal Line',
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
      label: zh ? '格式' : 'Format',
      id: 'format',
      submenu: [
        {
          label: zh ? '加粗' : 'Bold',
          accelerator: `${cmd}+b`,
          click: task('bold')
        },
        {
          label: zh ? '斜体' : 'Italic',
          accelerator: `${cmd}+i`,
          click: task('italic')
        },
        {
          label: zh ? '删除线' : 'Strikethrough',
          accelerator: `Ctrl+Shift+\``,
          click: task('strikethrough')
        },
        {
          label: 'Inline Code',
          accelerator: `Ctrl+\``,
          click: task('code')
        },
        {
          label: zh ? '图片' : 'Image',
          accelerator: `${cmd}+p`,
          submenu: [
            {
              label: zh ? '插入本机图片' : 'Insert local image',
              accelerator: `${cmd}+p`,
              click: (e, win) => {
                dialog.showOpenDialog({
                  properties: ['openFile', 'showHiddenFiles'],
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
              label: zh ? '自定义插入' : 'Custom insertion',
              click: (e, win) => {
                win?.webContents.send('key-task', 'insertNetworkImage')
              }
            }
          ]
        },
        {type: 'separator'},
        {
          label: zh ? '清除' : 'Clear',
          accelerator: `${cmd}+\\`,
          click: task('clear')
        }
      ]
    }
  )
  const winMenus:MenuOptions[number]['submenu']  = isMac ? [] : [
    {
      label: zh ? '显示菜单栏' : 'Show Menu Bar',
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
      label: zh ? '视图' : 'View',
      role: 'viewMenu',
      submenu: [
        {role: 'zoomIn', accelerator: 'Alt+Shift+=', label: 'Zoom In'},
        {role: 'zoomOut', accelerator: 'Alt+Shift+-', label: 'Zoom Out'},
        {type: 'separator'},
        ...winMenus,
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
        ...devTools
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
  return menus
}
export const createAppMenus = () => {
  const menus = getSystemMenus()
  let instance = Menu.buildFromTemplate(menus)
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
  ipcMain.on('refresh-recent', () => {
    if (!isMac) {
      setTimeout(() => {
        instance = Menu.buildFromTemplate(getSystemMenus())
        Menu.setApplicationMenu(instance)
      }, 300)
    }
  })
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
  ipcMain.on('set-locale', (e, lc: string) => {
    const menus = getSystemMenus()
    instance = Menu.buildFromTemplate(menus)
    Menu.setApplicationMenu(instance)
  })
}
