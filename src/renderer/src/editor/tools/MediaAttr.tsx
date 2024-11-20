import {ReactEditor} from 'slate-react'
import {Editor, NodeEntry, Path, Text, Transforms} from 'slate'
import {MediaNode} from '../../el'
import {useGetSetState} from 'react-use'
import {AutoComplete} from 'antd'
import {CheckOutlined, DeleteOutlined, ReloadOutlined} from '@ant-design/icons'
import React, {ReactNode, useCallback, useEffect, useRef} from 'react'
import {getOffsetLeft, mediaType} from '../utils/dom'
import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../store'
import {useSubject} from '../../hooks/subscribe'
import {keyArrow} from '../plugins/hotKeyCommands/arrow'
import {IFileItem} from '../../index'
import {join, relative} from 'path'
import {getImageData} from '../../utils'
import isHotkey from 'is-hotkey'
import {EditorUtils} from '../utils/editorUtils'
import { toUnixPath } from '../../utils/path'
import { useCoreContext } from '../../store/core'

export const MediaAttr = observer(() => {
  const core = useCoreContext()
  const store = useEditorStore()
  const [state, setState] = useGetSetState({
    visible: false,
    top: 0,
    left: 0,
    alt: '',
    url: '',
    width: 0,
    focus: false,
    filePaths: [] as {label: string | ReactNode, value: string}[],
    filterPaths: [] as {label: string | ReactNode, value: string}[]
  })
  const nodeRef = useRef<NodeEntry<MediaNode>>()
  const domRef = useRef<HTMLDivElement>(null)

  const getFilePaths = useCallback(() => {
    if (core.tree.root) {
      let files: {label: string | ReactNode, value: string}[] = []
      const stack: IFileItem[] = core.tree.root.children!.slice()
      while (stack.length) {
        const node = stack.shift()!
        if (!node.folder && ['image', 'video', 'document'].includes(mediaType(node.filePath))) {
          const path = toUnixPath(
            relative(join(core.tree.openedNote!.filePath, '..'), node.filePath!)
          )
          files.push({
            label: (
              <div className={'flex items-center'}>
                <div className={'flex-1 max-w-full truncate'}>{path}</div>
                <div>
                  <img src={getImageData(node.filePath)} alt="" className={'w-7 h-7 ml-4 rounded-sm'}/>
                </div>
              </div>
            ),
            value: path
          })
        }
        if (node.folder) {
          stack.push(...node.children || [])
        }
      }
      return files
    }
    return []
  }, [])

  const save = useCallback(() => {
    if (nodeRef.current) {
      const node = nodeRef.current
      if (state().alt !== node[0].alt || state().url !== node[0].url) {
        Transforms.setNodes(store.editor, {alt: state().alt, url: state().url}, {at: node[1]})
      }
      nodeRef.current = undefined
    }
  }, [])

  const resize = useCallback(() => {
    const node = nodeRef.current
    if (!node) {
      setState({visible: false})
      return
    }
    try {
      const dom = ReactEditor.toDOMNode(store.editor, node[0]) as HTMLElement
      let width = dom.clientWidth < 400 ? 400 : dom.clientWidth
      if (dom) {
        let top = store.offsetTop(dom)
        if (core.tree.tabs.length > 1) top += 32
        let left = getOffsetLeft(dom)
        if (!core.tree.fold) left -= core.tree.width
        if (left + width > window.innerWidth - 10) left = window.innerWidth - width - 20
        setState({
          top: top - 32, left, width, visible: true
        })
        if (!nodeRef.current?.[0].url) {
          setTimeout(() => {
            domRef.current?.querySelector('input')?.select()
          }, 30)
        }
      }
    } catch (e) {
      console.error('media resize', e)
    }
  }, [])

  const del = useCallback(() => {
    if (!nodeRef.current) return
    const pre = Editor.previous(store.editor, {at: nodeRef.current![1]})
    if (pre) {
      Transforms.select(store.editor, Editor.end(store.editor, pre[1]))
    } else {
      Transforms.select(store.editor, Editor.start(store.editor, Path.parent(nodeRef.current![1])))
    }
    Transforms.delete(store.editor, {at: nodeRef.current![1]})
    ReactEditor.focus(store.editor)
  }, [])

  const keyboard = useCallback((e: KeyboardEvent) => {
    if (state().focus && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      keyArrow(store, e)
      ReactEditor.focus(store.editor)
    }
    if (e.key === 'Backspace' && nodeRef.current) {
      e.preventDefault()
      del()
    }
    if (isHotkey('enter', e)) {
      e.preventDefault()
      e.stopPropagation()
      const node = nodeRef.current
      if (node) {
        const nextLinePath = Path.next(Path.parent(node[1]))
        const nextPath = Path.next(node[1])
        if (Editor.hasPath(store.editor, nextPath)) {
          Transforms.transform(store.editor, {
            type: 'insert_node',
            path: nextPath,
            node: {text: ''},
          })
          Transforms.select(store.editor, nextPath)
          Transforms.liftNodes(store.editor, {
            at: nextPath,
            mode: 'lowest'
          })
          Transforms.select(store.editor, Editor.start(store.editor, nextLinePath))
        } else {
          Transforms.insertNodes(store.editor, EditorUtils.p, {at: nextLinePath, select: true})
        }
        ReactEditor.focus(store.editor)
      }
    }
  }, [])

  const blur = useCallback((e: MouseEvent) => {
    e.preventDefault()
    if (!domRef.current?.contains(e.target as HTMLElement) && state().focus) {
      close()
      window.removeEventListener('keydown', keyboard)
    }
    window.removeEventListener('click', blur)
  }, [])

  const close = useCallback(() => {
    nodeRef.current = undefined
    setState({focus: false, visible: false})
  }, [])

  useSubject(store.mediaNode$, node => {
    if (node) {
      window.removeEventListener('click', blur)
      nodeRef.current = node
      setState({
        focus: true,
        alt: node[0].alt || '',
        url: node[0].url || '',
        filePaths: getFilePaths()
      })
      setTimeout(() => {
        resize()
        window.addEventListener('click', blur)
      }, 100)
      window.addEventListener('keydown', keyboard)
    } else {
      if (state().visible) {
        close()
        window.removeEventListener('click', blur)
        window.removeEventListener('keydown', keyboard)
      }
    }
  })

  const keydown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      save()
    }
    if (isHotkey('backspace', e) && nodeRef.current) {
      e.preventDefault()
      EditorUtils.moveBeforeSpace(store.editor, nodeRef.current[1])
      Transforms.delete(store.editor, {at: nodeRef.current[1]})
      close()
      window.removeEventListener('keydown', keyboard)
      ReactEditor.focus(store.editor)
    }
  }, [])

  useEffect(() => {
    resize()
  }, [core.tree.size, store.openSearch, core.tree.tabs.length])

  const setUrl = useCallback(() => {
    const path = nodeRef.current![1]
    Transforms.setNodes(
      store.editor,
      {url: state().url || '', alt: state().alt || ''},
      {at: path}
    )
  }, [])
  return (
    <div
      className={`dark:bg-zinc-900 bg-white border border-gray-100 dark:border-gray-100/10 rounded-tr rounded-tl
      z-10 absolute dark:text-gray-300 text-gray-500 h-8 text-sm text-gray-200/70 px-2 select-none flex items-center ${!state().visible ? 'hidden' : ''}`}
      ref={domRef}
      style={{
        left: state().left,
        top: state().top,
        width: state().width
      }}
    >
      <AutoComplete
        size={'small'} placeholder={'url or filepath'}
        value={state().url}
        variant={'borderless'}
        className={'flex-1 mpath'}
        onKeyDown={keydown}
        autoFocus={true}
        allowClear={true}
        onSelect={e => {
          setState({url: e})
          setUrl()
        }}
        options={state().filterPaths}
        onSearch={e => {
          setState({
            url: e,
            filterPaths: state().filePaths.filter(f => f.value.includes(e))
          })
        }}
        onMouseDown={e => {
          e.stopPropagation()
        }}
      />
      <div className={'rounded-sm dark:hover:bg-gray-200/10 hover:bg-gray-100 duration-200 ml-2 px-1 py-0.5'}>
        <CheckOutlined
          onClick={setUrl}
          className={'dark:text-gray-300 text-gray-500 cursor-default relative'}
        />
      </div>
      <div className={'w-[1px] h-5 dark:bg-gray-200/10 bg-gray-200 flex-shrink-0 mx-1'}></div>
      <div className={'rounded-sm dark:hover:bg-gray-200/10 hover:bg-gray-100 duration-200 px-1 py-0.5'}>
        <ReloadOutlined
          className={'dark:text-gray-300 text-gray-500 cursor-pointer'}
          onClick={() => {
            Transforms.setNodes(store.editor, {
              width: undefined
            }, {at: nodeRef.current![1]})
          }}
        />
      </div>
      <div className={'w-[1px] h-5 dark:bg-gray-200/10 bg-gray-200 flex-shrink-0 mx-1'}></div>
      <div className={'rounded-sm dark:hover:bg-gray-200/10 hover:bg-gray-100 duration-200 px-1 py-0.5'}>
        <DeleteOutlined
          className={'dark:text-gray-300 text-gray-500 cursor-pointer'}
          onClick={del}
        />
      </div>
    </div>
  )
})
