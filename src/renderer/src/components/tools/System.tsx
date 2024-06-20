import {observer} from 'mobx-react-lite'
import {AnimatePresence, motion} from 'framer-motion'
import {Editor, Element} from 'slate'
import { IKeyItem, KeyItems } from './KeyItems'
import { keyTask$ } from '../../hooks/keyboard'
import { useMemo } from 'react'
import IFormat from '../../icons/IFormat'
import {treeStore} from '../../store/tree'
import IAdd from '../../icons/IAdd'
import System from '../../icons/keyboard/System'

const actionKeys = (ctx: string[]):IKeyItem[] => [
  {
    name: 'Select All',
    key: ['mod', 'a'],
    click: () => keyTask$.next({key: 'selectAll'})
  },
  {
    name: 'Select Line',
    key: ['mod', 'shift', 'l'],
    click: () => keyTask$.next({key: 'selectLine'})
  },
  {
    name: 'Select Word',
    key: ['mod', 'd'],
    click: () => keyTask$.next({key: 'selectWord'})
  },
  {
    name: 'Select Format',
    key: ['mod', 'e'],
    disabled: ctx[0] === 'code-line',
    click: () => keyTask$.next({key: 'selectFormat'})
  },
  {type: 'hr'},
  {
    name: 'Paste as Plain Text',
    key: ['mod', 'shift', 'v'],
    click: () => keyTask$.next({key: 'pastePlainText'})
  },
  {
    name: 'Paste Markdown Code',
    key: ['mod', 'option', 'v'],
    click: () => keyTask$.next({key: 'pasteMarkdownCode'})
  },
  {type: 'hr'},
  {
    name: 'New Doc',
    key: ['option', 'n'],
    click: () => keyTask$.next({key: 'newNote'})
  },
  {
    name: 'Find in Page',
    key: ['mod', 'f'],
    click: () => keyTask$.next({key: 'openSearch'})
  },
  {
    name: 'Save',
    key: ['mod', 's'],
    click: () => keyTask$.next({key: 'save'})
  },
  {
    name: 'New Tab',
    key: ['mod', 't'],
    click: () => keyTask$.next({key: 'newTab'})
  },
  {
    name: 'Close Current Tab',
    key: ['mod', 'w'],
    click: () => treeStore.removeTab(treeStore.currentIndex),
    disabled: treeStore.tabs.length < 2
  },
  {
    name: 'Open Quickly',
    key: ['mod', 'o'],
    click: () => keyTask$.next({key: 'quickOpen'})
  },
  {type: 'hr'},
  {
    name: 'Undo',
    key: ['mod', 'z'],
    disabled: !treeStore.openedNote,
    click: () => keyTask$.next({key: 'undo'})
  },
  {
    name: 'Redo',
    key: ['mod', 'shift', 'z'],
    disabled: !treeStore.openedNote,
    click: () => keyTask$.next({key: 'redo'})
  }
]

const insertKeys = (ctx: string[]):IKeyItem[] => [
  {
    name: 'Table',
    key: ['mod', 'option', 't'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'insertTable'})
  },
  {
    name: 'Code',
    key: ['mod', 'option', 'c'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'insertCode'})
  },
  {
    name: 'Quote',
    key: ['option', 'q'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'insertQuote'})
  },
  {
    name: 'Formula block',
    key: ['mod', 'K'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'insertCode', args: ['katex']})
  },
  {
    name: 'Formula inline',
    key: ['mod', 'option', 'k'],
    disabled: ['code-line'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'inlineKatex'})
  },
  {
    name: 'Mermaid graphics',
    key: ['mod', 'option', 'm'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'insertCode', args: ['mermaid']})
  },
  {type: 'hr'},
  {
    name: 'Insert local image',
    key: ['mod', 'p'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'localImage'})
  },
  {type: 'hr'},
  {
    name: 'Bulleted list',
    key: ['mod', 'option', 'u'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'list', args: ['unordered']})
  },
  {
    name: 'Numbered list',
    key: ['mod', 'option', 'o'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'list', args: ['ordered']})
  },
  {
    name: 'To-do list',
    key: ['mod', 'option', 's'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'list', args: ['task']})
  },
  {type: 'hr'},
  {
    name: 'Horizontal Line',
    key: ['mod', 'option', '/'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'horizontalLine'})
  }
]

const formatKeys = (ctx: string[]):IKeyItem[] => [
  {
    name: 'Heading 1',
    key: ['mod', '1'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]) || ctx[1] === 'list-item',
    click: () => keyTask$.next({key: 'head', args: [1]})
  },
  {
    name: 'Heading 2',
    key: ['mod', '2'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]) || ctx[1] === 'list-item',
    click: () => keyTask$.next({key: 'head', args: [2]})
  },
  {
    name: 'Heading 3',
    key: ['mod', '3'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]) || ctx[1] === 'list-item',
    click: () => keyTask$.next({key: 'head', args: [3]})
  },
  {
    name: 'Heading 4',
    key: ['mod', '4'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]) || ctx[1] === 'list-item',
    click: () => keyTask$.next({key: 'head', args: [4]})
  },
  {
    name: 'Paragraph',
    key: ['mod', '0'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]),
    click: () => keyTask$.next({key: 'paragraph'})
  },
  {type: 'hr'},
  {
    name: 'Increase Heading Level',
    key: ['mod', ']'],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]) || ctx[1] === 'list-item',
    click: () => keyTask$.next({key: 'increaseHead'})
  },
  {
    name: 'Decrease Heading Level',
    key: ['mod', '['],
    disabled: ['code-line', 'table-cell'].includes(ctx[0]) || ctx[1] === 'list-item',
    click: () => keyTask$.next({key: 'decreaseHead'})
  },
  {type: 'hr'},
  {
    name: 'Bold',
    key: ['mod', 'b'],
    click: () => keyTask$.next({key: 'format', args: ['bold']})
  },
  {
    name: 'Italic',
    key: ['mod', 'i'],
    click: () => keyTask$.next({key: 'format', args: ['italic']})
  },
  {
    name: 'Strikethrough',
    key: ['mod', 'shift', 's'],
    click: () => keyTask$.next({key: 'format', args: ['strikethrough']})
  },
  {
    name: 'Inline Code',
    key: ['option', '`'],
    click: () => keyTask$.next({key: 'format', args: ['code']})
  },
  {
    name: 'Clear',
    key: ['mod', '\\'],
    click: () => keyTask$.next({key: 'clear'})
  }
]
export const SystemPanel = observer((props: {
  open: boolean
  tab: string
  onClose: () => void
}) => {
  const type = useMemo(() => {
    if (props.open) {
      const editor = treeStore.currentTab.store.editor
      const [node ] = Editor.nodes<any>(editor, {
        match: n => Element.isElement(n),
        mode: 'lowest'
      })
      if (node) {
        const p = Editor.parent(editor, node[1])
        return [node?.[0].type, p?.[0].type]
      }
      return []
    } else {
      return []
    }
  }, [props.open, treeStore.currentTab])
  return (
    <AnimatePresence>
      {props.open &&
        <motion.div
          transition={{
            duration: .1,
            ease: 'easeInOut'
          }}
          initial={{
            opacity: 0,
            x: 0
          }}
          animate={{
            opacity: 1,
            x: -18,
          }}
          exit={{
            opacity: 0,
            x: 0
          }}
          onMouseDown={e => e.preventDefault()}
          className={`w-[300px] absolute z-50 top-20 right-11 tools-panel px-2 ${props.open ? 'z-50' : ''}`}
        >
          {props.tab === 'actions' &&
            <>
              <div className={'p-1 border-b b1'}>
                <div
                  className={'flex items-center h-7 font-medium text-sm dark:text-gray-400 text-gray-600'}>
                  <System/>
                  <span className={'ml-1.5'}>Actions</span>
                </div>
              </div>
              <KeyItems keys={actionKeys(type)} onClick={props.onClose}/>
            </>
          }
          {props.tab === 'insert' &&
            <>
              <div className={'p-1 border-b b1'}>
                <div
                  className={'flex items-center h-7 font-medium text-sm dark:text-gray-400 text-gray-600'}>
                  <IAdd/>
                  <span className={'ml-1.5'}>Insert</span>
                </div>
              </div>
              <KeyItems keys={insertKeys(type)} onClick={props.onClose}/>
            </>
          }
          {props.tab === 'style' &&
            <>
              <div className={'p-1 border-b b1'}>
                <div
                  className={'flex items-center h-7 font-medium text-sm dark:text-gray-400 text-gray-600'}>
                  <IFormat className={'text-lg'}/>
                  <span className={'ml-1.5'}>Style</span>
                </div>
              </div>
              <KeyItems keys={formatKeys(type)} onClick={props.onClose}/>
            </>
          }
        </motion.div>
      }
    </AnimatePresence>
  )
})
