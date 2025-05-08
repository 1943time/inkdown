import isHotkey from 'is-hotkey'
import { Store } from './store'
import { ReactEditor } from 'slate-react'
import { dataTransform, stringTransform } from '@/utils/common'

export class KeyboardStore {
  readonly taskMap = new Map<
    string,
    {
      system: string
      custom: string | undefined | null
      scene: 'note' | 'global'
      disabled?: boolean
    }
  >([
    [
      'insertTable',
      {
        system: 'mod+option+t',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'insertCode',
      {
        system: 'mod+option+c',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'insertFormulaBlock',
      {
        system: 'mod+shift+k',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'insertFormulaInline',
      {
        system: 'mod+option+k',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'insertQuote',
      {
        system: 'option+q',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'selectAll',
      {
        system: 'mod+a',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'selectLine',
      {
        system: 'mod+shift+l',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'selectWord',
      {
        system: 'mod+d',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'selectFormat',
      {
        system: 'mod+e',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'pastePlainText',
      {
        system: 'mod+shift+v',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'pasteMarkdownCode',
      {
        system: 'mod+option+v',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'newNote',
      {
        system: 'option+n',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'openSearch',
      {
        system: 'mod+f',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'save',
      {
        system: 'mod+s',
        custom: undefined,
        scene: 'note',
        disabled: true
      }
    ],
    [
      'newTab',
      {
        system: 'mod+t',
        custom: undefined,
        scene: 'global',
        disabled: true
      }
    ],
    [
      'closeCurrentTab',
      {
        system: 'mod+w',
        custom: undefined,
        scene: 'global',
        disabled: true
      }
    ],
    [
      'quickOpenNote',
      {
        system: 'mod+o',
        custom: undefined,
        scene: 'global'
      }
    ],
    [
      'lineBreakWithinParagraph',
      {
        system: 'mod+enter',
        custom: undefined,
        scene: 'note',
        disabled: true
      }
    ],
    [
      'undo',
      {
        system: 'mod+z',
        custom: undefined,
        scene: 'note',
        disabled: true
      }
    ],
    [
      'redo',
      {
        system: 'mod+shift+z',
        custom: undefined,
        scene: 'note',
        disabled: true
      }
    ],
    [
      'localImage',
      {
        system: 'mod+p',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'bulletedList',
      {
        system: 'mod+shift+u',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'numberedList',
      {
        system: 'mod+shift+o',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'taskList',
      {
        system: 'mod+shift+t',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'horizontalLine',
      {
        system: 'mod+option+/',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'head1',
      {
        system: 'mod+1',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'head2',
      {
        system: 'mod+2',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'head3',
      {
        system: 'mod+3',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'head4',
      {
        system: 'mod+4',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'paragraph',
      {
        system: 'mod+0',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'increaseHead',
      {
        system: 'mod+]',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'decreaseHead',
      {
        system: 'mod+[',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'bold',
      {
        system: 'mod+b',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'italic',
      {
        system: 'mod+i',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'strikethrough',
      {
        system: 'mod+option+s',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'inlineCode',
      {
        system: 'option+`',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'clear',
      {
        system: 'mod+\\',
        custom: undefined,
        scene: 'note'
      }
    ],
    [
      'openChat',
      {
        system: 'mod+l',
        custom: undefined,
        scene: 'global'
      }
    ]
  ])
  get currentTab() {
    return this.store.note.state.currentTab
  }
  constructor(private readonly store: Store) {
    this.store.model.getKeyboards().then((res) => {
      res.forEach((item) => {
        const r = this.taskMap.get(item.task)
        if (r) {
          r.custom = dataTransform(item.key)
        }
      })
    })
    window.addEventListener('keydown', (e) => {
      for (const [key, value] of this.taskMap) {
        if (value.custom === null) {
          continue
        }
        if (value.custom === undefined) {
          if (isHotkey(value.system, e)) {
            if (value.scene === 'note') {
              const container = this.currentTab?.container
              if (!container || !ReactEditor.isFocused(this.currentTab?.editor)) {
                continue
              }
            }
            e.preventDefault()
            this.run(key)
          }
        } else if (isHotkey(value.custom, e)) {
          if (value.scene === 'note') {
            const tab = this.store.note.state.currentTab
            const container = tab?.container
            if (!container || !ReactEditor.isFocused(tab.editor)) {
              continue
            }
          }
          e.preventDefault()
          this.run(key)
        }
      }
    })
  }
  setKeyboard(task: string, value: string | undefined | null) {
    this.taskMap.set(task, {
      ...this.taskMap.get(task)!,
      custom: value
    })
    this.store.model.putKeyboard({ task, key: stringTransform(value) })
  }
  resetKeyboard() {
    for (const [key, value] of this.taskMap) {
      if (value.custom !== undefined) {
        value.custom = undefined
        this.setKeyboard(key, undefined)
      }
    }
  }
  private run(task: string) {
    switch (task) {
      case 'insertTable':
        this.currentTab?.keyboard.insertTable()
        break
      case 'insertCode':
        this.currentTab?.keyboard.insertCode()
        break
      case 'insertFormulaBlock':
        this.currentTab?.keyboard.insertCode('katex')
        break
      case 'insertFormulaInline':
        this.currentTab?.keyboard.inlineKatex()
        break
      case 'insertQuote':
        this.currentTab?.keyboard.insertQuote()
        break
      case 'selectAll':
        this.currentTab?.keyboard.selectAll()
        break
      case 'selectLine':
        this.currentTab?.keyboard.selectLine()
        break
      case 'selectWord':
        this.currentTab?.keyboard.selectWord()
        break
      case 'selectFormat':
        this.currentTab?.keyboard.selectFormat()
        break
      case 'pastePlainText':
        this.currentTab?.keyboard.pastePlainText()
        break
      case 'pasteMarkdownCode':
        this.currentTab?.keyboard.pasteMarkdownCode()
        break
      case 'newTab':
        this.currentTab?.keyboard.newTab()
        break
      case 'closeCurrentTab':
        if (this.store.note.state.tabs.length > 1) {
          this.store.note.removeTab(this.store.note.state.tabIndex)
        }
        break
      case 'openSearch':
        this.currentTab?.keyboard.openSearch()
        break
      case 'lineBreakWithinParagraph':
        this.currentTab?.keyboard.lineBreakWithinParagraph()
        break
      case 'undo':
        this.currentTab?.keyboard.undo()
        break
      case 'redo':
        this.currentTab?.keyboard.redo()
        break
      case 'localImage':
        this.currentTab?.keyboard.localImage()
        break
      case 'bulletedList':
        this.currentTab?.keyboard.list('unordered')
        break
      case 'numberedList':
        this.currentTab?.keyboard.list('ordered')
        break
      case 'taskList':
        this.currentTab?.keyboard.list('task')
        break
      case 'horizontalLine':
        this.currentTab?.keyboard.horizontalLine()
        break
      case 'head1':
        this.currentTab?.keyboard.head(1)
        break
      case 'head2':
        this.currentTab?.keyboard.head(2)
        break
      case 'head3':
        this.currentTab?.keyboard.head(3)
        break
      case 'head4':
        this.currentTab?.keyboard.head(4)
        break
      case 'paragraph':
        this.currentTab?.keyboard.paragraph()
        break
      case 'increaseHead':
        this.currentTab?.keyboard.increaseHead()
        break
      case 'decreaseHead':
        this.currentTab?.keyboard.decreaseHead()
        break
      case 'bold':
        this.currentTab?.keyboard.toggleFormat('bold')
        break
      case 'italic':
        this.currentTab?.keyboard.toggleFormat('italic')
        break
      case 'strikethrough':
        this.currentTab?.keyboard.toggleFormat('strikethrough')
        break
      case 'inlineCode':
        this.currentTab?.keyboard.toggleFormat('code')
        break
      case 'clear':
        this.currentTab?.keyboard.clear()
        break
      case 'save':
        this.currentTab?.keyboard.save()
        break
      case 'openChat':
        this.store.settings.toggleChatBot()
        break
    }
  }
}
