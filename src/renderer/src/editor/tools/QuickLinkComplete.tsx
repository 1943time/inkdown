
import { useSubject } from '../../hooks/subscribe'
import { getSelRect } from '../utils/dom'
import { useGetSetState } from 'react-use'
import INote from '../../icons/INote'
import { useCallback, useEffect, useRef } from 'react'
import { Editor, Node, Text, Transforms } from 'slate'
import { EditorUtils } from '../utils/editorUtils'
import isHotkey from 'is-hotkey'
import { ISort } from '../../icons/keyboard/ISort'
import { join, parse } from 'path'
import { useEditorStore } from '../store'
import { runInAction } from 'mobx'
import { IFileItem } from '../../types'
import { isLink, parsePath, toRelativePath } from '../../utils/path'
import { observer } from 'mobx-react-lite'
import { useCoreContext } from '../../store/core'

let panelWidth = 350
type DocItem = IFileItem & { path: string; parentPath?: string }

export const QuickLinkComplete = observer(() => {
  const store = useEditorStore()
  const core = useCoreContext()
  const scrollRef = useRef<HTMLDivElement>(null)
  const keyword = useRef<string | undefined>('')
  const [state, setState] = useGetSetState({
    left: 0,
    y: 0,
    mode: 'top',
    index: 0,
    visible: false,
    docs: [] as DocItem[],
    filterDocs: [] as DocItem[],
  })
  useSubject(store.quickLinkText$, (ctx) => {
    keyword.current = ctx
    if (state().docs.length) {
      setState({
        index: 0,
        filterDocs: ctx
          ? state().docs.filter((n) => n.path?.toLowerCase().includes(ctx.toLowerCase()))
          : state().docs
      })
    }
  })
  const keydown = useCallback((e: KeyboardEvent) => {
    if (!store.openQuickLinkComplete) {
      return
    }
    if (isHotkey('esc', e)) {
      close()
    }
    if (isHotkey('up', e)) {
      e.preventDefault()
      e.stopPropagation()
      if (state().filterDocs.length && state().index > 0) {
        setState({
          index: state().index - 1
        })
      }
    }
    if (isHotkey('down', e)) {
      e.preventDefault()
      e.stopPropagation()
      if (state().index < state().filterDocs.length - 1) {
        setState({
          index: state().index + 1
        })
      }
    }
    if (isHotkey('enter', e)) {
      e.preventDefault()
      e.stopPropagation()
      const target = state().filterDocs[state().index]
      if (target) {
        setPath(target.path)
      } else {
        close()
      }
    }
    const target = scrollRef.current?.children[state().index] as HTMLDivElement
    if (target) {
      const { scrollTop, clientHeight } = scrollRef.current!
      if (target.offsetTop > scrollTop + clientHeight - 50) {
        scrollRef.current!.scroll({
          top: target.offsetTop
        })
      }
      if (target.offsetTop < scrollTop) {
        scrollRef.current!.scroll({
          top: target.offsetTop - 150
        })
      }
    }
  }, [])
  useEffect(() => {
    store.container
      ?.querySelector<HTMLInputElement>('.edit-area')
      ?.addEventListener('keydown', keydown)
    return () => {
      store.container
        ?.querySelector<HTMLInputElement>('.edit-area')
        ?.removeEventListener('keydown', keydown)
    }
  }, [])
  const insertLink = useCallback((path: string) => {
    const [node] = Editor.nodes(store.editor, {
      match: (n) => Text.isText(n),
      mode: 'lowest'
    })
    const text = Node.string(node[0])
    const match = text.match(/@[^\n@]*$/)
    const sel = store.editor.selection
    if (match && sel) {
      Transforms.insertNodes(
        store.editor,
        {
          text: parse(path).name,
          url: path
        },
        {
          at: {
            anchor: {
              path: sel.focus.path,
              offset: sel.focus.offset - match[0].length
            },
            focus: {
              path: sel.focus.path,
              offset: sel.focus.offset
            }
          },
          select: true
        }
      )
    }
  }, [])
  const setPath = useCallback((path: string) => {
    if (isLink(path)) {
      close(path)
    } else {
      const parse = parsePath(path)
      if (!parse.path && parse.hash) {
        return close('#' + parse.hash)
      }
      const filePath = store.openFilePath || ''
      const realPath = join(core.tree.root?.filePath || '', parse.path)
      const relativePath = realPath === store.openFilePath ? '' : toRelativePath(filePath, realPath)
      close(`${relativePath}${parse.hash ? `#${parse.hash}` : ''}`)
    }
  }, [])
  const close = useCallback((path?: string) => {
    EditorUtils.focus(store.editor)
    if (path) {
      insertLink(path)
    }
    runInAction(() => {
      store.openQuickLinkComplete = false
    })
    setState({
      filterDocs: [],
      docs: []
    })
  }, [])
  useEffect(() => {
    if (store.openQuickLinkComplete) {
      const rect = getSelRect()
      if (!rect) {
        return
      }
      const container = store.container!
      const client = container!.querySelector('.edit-area')?.clientHeight!
      const mode =
        window.innerHeight - rect.top - rect.height < 260
          ? 'bottom'
          : 'top'

      let y =
        mode === 'bottom'
          ? client - container.scrollTop - rect.bottom + 190
          : container.scrollTop + rect.top - 10
      let left = rect.x - 4
      if (!core.tree.fold) {
        left -= core.tree.width
      }
      if (left < 4) left = 4
      if (left > container.clientWidth - panelWidth) left = container.clientWidth - panelWidth - 4
      if (core.tree.tabs.length > 1) {
        y = mode === 'bottom' ? y + 30 : y - 30
      }
      const { docs, map } = core.tree.allNotes
      const notes = docs.filter(d => {
        return d.filePath !== core.tree.openedNote?.filePath
      })
      setState({
        left,
        y,
        mode,
        index: 0,
        visible: true,
        docs: notes,
        filterDocs: notes
      })
    } else {
      setState({
        visible: false
      })
    }
  }, [store.openQuickLinkComplete])
  if (!state().visible) {
    return null
  }
  return (
    <div
      className={'rounded absolute ctx-panel select-none z-50'}
      style={{
        left: state().left,
        top: state().mode === 'bottom' ? undefined :state().y,
        bottom: state().mode === 'bottom' ? state().y : undefined,
        width: panelWidth
      }}
    >
      <div className={'overflow-y-auto max-h-[230px] p-2'} ref={scrollRef}>
        {state().filterDocs.map((f, i) => {
          return (
            <div
              key={f.path}
              onMouseEnter={(e) => {
                setState({ index: i })
              }}
              onClick={(e) => {
                close(f.path)
              }}
              className={`flex justify-center py-0.5 rounded ${
                state().index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
              } cursor-pointer px-2 flex-col`}
            >
              <div
                className={'text-gray-600 dark:text-white/90 flex items-start leading-6 text-sm'}
              >
                <div className={'h-6 flex items-center'}>
                  <INote />
                </div>
                <span className={'ml-1 flex-1 max-w-full break-all'}>{f.filename}</span>
              </div>
              {!!f.parentPath && (
                <div className={'text-gray-500 dark:text-white/70 pl-[18px] break-all text-[13px]'}>
                  {f.parentPath}
                </div>
              )}
            </div>
          )
        })}
        {!state().filterDocs.length && (
          <div className={'py-2 text-center text-gray-400 text-sm'}>No related documents</div>
        )}

      </div>
      <div
          className={
            'text-xs h-6 flex items-center border-t leading-6 dark:border-white/5 dark:text-white/60 px-2 text-black/60 border-black/5'
          }
        >
          <span className={'scale-90 inline-block'}>
            Quickly insert space document link
          </span>
          <span className={'flex items-center'}>
          <ISort className={'ml-2 mr-1'}/>
          <span className={'text-xs'}>to navigate</span>
          </span>
        </div>
    </div>
  )
})
