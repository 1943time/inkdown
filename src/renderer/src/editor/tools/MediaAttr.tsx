import {ReactEditor} from 'slate-react'
import {Editor, NodeEntry, Path, Text, Transforms} from 'slate'
import {MediaNode} from '../../el'
import {useGetSetState} from 'react-use'
import {AutoComplete} from 'antd'
import {CheckOutlined, DeleteOutlined, ReloadOutlined} from '@ant-design/icons'
import React, {useCallback, useEffect, useRef} from 'react'
import {getOffsetLeft, mediaType} from '../utils/dom'
import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../store'
import {useSubject} from '../../hooks/subscribe'
import {treeStore} from '../../store/tree'
import {keyArrow} from '../plugins/hotKeyCommands/arrow'
import {IFileItem} from '../../index'
import {join, relative} from 'path'

export const MediaAttr = observer(() => {
  const store = useEditorStore()
  const [state, setState] = useGetSetState({
    visible: false,
    top: 0,
    left: 0,
    alt: '',
    url: '',
    width: 0,
    focus: false,
    filePaths: [] as {label: string, value: string}[],
    filterPaths: [] as {label: string, value: string}[]
  })
  const nodeRef = useRef<NodeEntry<MediaNode>>()
  const domRef = useRef<HTMLDivElement>(null)

  const getFilePaths = useCallback(() => {
    if (treeStore.root) {
      let files: {label: string, value: string}[] = []
      const stack: IFileItem[] = treeStore.root.children!.slice()
      while (stack.length) {
        const node = stack.shift()!
        if (!node.folder && ['image', 'video', 'document'].includes(mediaType(node.filePath))) {
          const path = relative(join(treeStore.openedNote!.filePath, '..'), node.filePath!)
          files.push({
            label: path,
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
    const dom = ReactEditor.toDOMNode(store.editor, node[0]) as HTMLElement
    let width = dom.clientWidth < 600 ? 600 : dom.clientWidth
    if (dom) {
      let top = store.offsetTop(dom)
      if (treeStore.tabs.length > 1) top += 32
      let left = getOffsetLeft(dom)
      if (!treeStore.fold) left -= treeStore.width
      if (left + width > window.innerWidth - 10) left = window.innerWidth - width - 20
      setState({
        top: top - 32, left, width, visible: true
      })
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
    if (state().focus && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      keyArrow(store.editor, e)
      ReactEditor.focus(store.editor)
    }
    if (e.key === 'Backspace' && nodeRef.current) {
      e.preventDefault()
      del()
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
  }, [])

  useEffect(() => {
    resize()
  }, [treeStore.size, store.openSearch, treeStore.tabs.length])
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
        bordered={false}
        className={'flex-1 mpath'}
        onKeyDown={keydown}
        autoFocus={true}
        allowClear={true}
        onSelect={e => {
          setState({url: e})
        }}
        options={state().filterPaths}
        onSearch={e => {
          setState({
            url: e,
            filterPaths: state().filePaths.filter(f => f.label.includes(e))
          })
        }}
        onMouseDown={e => {
          e.stopPropagation()
        }}
      />
      <div className={'rounded-sm dark:hover:bg-gray-200/10 hover:bg-gray-100 duration-200 ml-2 px-1 py-0.5'}>
        <CheckOutlined
          onClick={() => {
            const path = nodeRef.current![1]
            Transforms.setNodes(
              store.editor,
              {url: state().url || '', alt: state().alt || ''},
              {at: path}
            )
          }}
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
