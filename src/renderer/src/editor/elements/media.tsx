import { ReactEditor } from 'slate-react'
import { useGetSetState } from 'react-use'
import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { mediaType } from '../utils/dom'
import { useSelStatus } from '../../hooks/editor'
import { Transforms } from 'slate'
import { getImageData, nid } from '../../utils'
import { ElementProps, MediaNode } from '../../el'
import { isAbsolute, join } from 'path'
import { EditorUtils } from '../utils/editorUtils'
import { getRemoteMediaType } from '../utils/media'
import { Icon } from '@iconify/react'
import { MainApi } from '../../api/main'
import { writeFileSync } from 'fs'

const resize = (ctx: { e: React.MouseEvent; dom: HTMLElement; height?: number; cb: Function }) => {
  const height = ctx.height || ctx.dom.clientHeight
  const startY = ctx.e.clientY
  let resizeHeight = height
  const move = (e: MouseEvent) => {
    resizeHeight = height + e.clientY - startY
    ctx.dom.parentElement!.style.height = resizeHeight + 'px'
  }
  window.addEventListener('mousemove', move)
  window.addEventListener(
    'mouseup',
    (e) => {
      window.removeEventListener('mousemove', move)
      e.stopPropagation()
      ctx.cb(resizeHeight)
    },
    { once: true }
  )
}

export function Media({ element, attributes, children }: ElementProps<MediaNode>) {
  const [selected, path, store] = useSelStatus(element)
  const ref = useRef<HTMLElement>(null)
  const [state, setState] = useGetSetState({
    height: element.height,
    dragging: false,
    loadSuccess: true,
    url: '',
    selected: false,
    type: mediaType(element.url)
  })
  const initial = useCallback(async () => {
    let type = !element.url?.startsWith('http')
      ? mediaType(element.url)
      : await getRemoteMediaType(element.url)
    type = !type ? 'image' : type
    setState({ type: ['image', 'video', 'autio'].includes(type!) ? type! : 'other' })
    let realUrl = element.url
    if (realUrl && !realUrl?.startsWith('http') && !realUrl.startsWith('file:')) {
      const currentFilePath = store.webview ? store.webviewFilePath : store.openFilePath
      const file = isAbsolute(realUrl) ? element.url : join(currentFilePath || '', '..', realUrl)
      const data = getImageData(file)
      if (data) {
        realUrl = data
      }
    }
    setState({ url: realUrl })
    if (state().type === 'image' || state().type === 'other') {
      const img = document.createElement('img')
      img.referrerPolicy = 'no-referrer'
      img.crossOrigin = 'anonymous'
      img.src = realUrl!
      img.onerror = (e) => {
        setState({ loadSuccess: false })
      }
      img.onload = () => setState({ loadSuccess: true })
    }
  }, [element])
  useLayoutEffect(() => {
    if (element.downloadUrl) {
      return
    }
    initial()
  }, [element.url, element.downloadUrl, store.webviewFilePath])

  const download = useCallback(
    async (url: string) => {
      let ext = await getRemoteMediaType(url)
      if (ext && ext !== 'other') {
        window.api.fetch(url).then(async (res) => {
          const buffer = await res.buffer()
          store
            .saveFile({
              name: nid() + '.' + ext![1],
              buffer: buffer.buffer
            })
            .then((res) => {
              Transforms.setNodes(
                store.editor,
                {
                  url: res,
                  downloadUrl: null
                },
                { at: path }
              )
            })
            .catch((e) => {
              console.log('err', e)
            })
        })
      }
    },
    [path]
  )
  useEffect(() => {
    if (!store.editor.selection) return
    if (element.downloadUrl) {
      download(decodeURIComponent(element.downloadUrl))
    }
  }, [element])
  return (
    <div className={'py-2 relative group'} contentEditable={false} {...attributes}>
      {state().loadSuccess && state().type === 'image' && (
        <>
          {state().url?.startsWith('http') && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className={`text-sm bg-gray-100 text-gray-700 dark:text-gray-100 group-hover:block hidden
            z-10 rounded border dark:border-gray-500 border-gray-300 absolute dark:bg-black backdrop-blur right-3 top-4 px-1 py-0.5 cursor-pointer
            `}
              onClick={() => {
                window.api.fetch(state().url).then(async (res) => {
                  const contentType = res.headers.get('content-type') || ''
                  const ext = contentType.split('/')[1]
                  if (ext) {
                    const buffer = await res.buffer()
                    MainApi.saveDialog({
                      filters: [{ name: 'img', extensions: [ext] }],
                      properties: ['createDirectory']
                    }).then((res) => {
                      if (res.filePath) {
                        writeFileSync(res.filePath, buffer)
                        MainApi.showInFolder(res.filePath)
                      }
                    })
                  }
                })
              }}
            >
              <Icon icon={'ic:round-download'} className={'dark:text-gray-200'} />
            </div>
          )}
          {(state().url?.startsWith('file:') || state().url?.startsWith('data:')) && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className={`text-sm bg-gray-100 text-gray-700 dark:text-gray-100 group-hover:block hidden
            z-10 rounded border dark:border-gray-500 border-gray-300 absolute dark:bg-black backdrop-blur right-3 top-4 p-0.5 px-1 cursor-pointer
            `}
              onClick={() => {
                MainApi.showInFolder(state().url.replace('file://', ''))
              }}
            >
              <Icon icon={'ph:folder-open'} className={'dark:text-gray-200'} />
            </div>
          )}
        </>
      )}
      {selected && (
        <>
          <div
            className={
              'absolute text-center w-full truncate left-0 -top-2 text-xs h-4 leading-4 dark:text-gray-500 text-gray-400'
            }
          >
            {element.url}
          </div>
        </>
      )}

      <div
        className={`drag-el group cursor-default relative flex justify-center mb-2 border-2 rounded ${
          selected ? 'border-gray-300 dark:border-gray-300/50' : 'border-transparent'
        }`}
        data-be={'media'}
        style={{ padding: state().type === 'document' ? '10px 0' : undefined }}
        draggable={true}
        onContextMenu={(e) => {
          e.stopPropagation()
        }}
        onDragStart={(e) => {
          try {
            store.dragStart(e)
            store.dragEl = ReactEditor.toDOMNode(store.editor, element)
          } catch (e) {}
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          if (!store.focus) {
            EditorUtils.focus(store.editor)
          }
          EditorUtils.selectMedia(store, path)
        }}
        onClick={(e) => {
          e.preventDefault()
          if (e.detail === 2) {
            Transforms.setNodes(store.editor, { height: undefined }, { at: path })
            setState({ height: undefined })
          }
        }}
      >
        <div
          className={'w-full h-full flex justify-center'}
          style={{ height: state().height || (state().type === 'other' ? 260 : undefined) }}
        >
          {state().type === 'video' && (
            <video
              src={element.url}
              controls={true}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
              className={`rounded h-full select-none ${
                state().dragging ? 'pointer-events-none' : ''
              }`}
              // @ts-ignore
              ref={ref}
            />
          )}
          {state().type === 'audio' && (
            <audio
              controls={true}
              src={element.url}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
              className={`select-none ${state().dragging ? 'pointer-events-none' : ''}`}
              // @ts-ignore
              ref={ref}
            />
          )}
          {state().type === 'other' && (
            <div
              className={'p-2 rounded bg-black/5 dark:bg-white/10 flex-1'}
              // @ts-ignore
              ref={ref}
            >
              <iframe
                src={element.url}
                referrerPolicy={'origin-when-cross-origin'}
                className={`w-full h-full border-none select-none rounded ${
                  state().dragging ? 'pointer-events-none' : ''
                }`}
              />
            </div>
          )}
          {state().type === 'image' && (
            <img
              src={state().url}
              alt={'image'}
              referrerPolicy={'no-referrer'}
              crossOrigin={'anonymous'}
              draggable={false}
              // @ts-ignore
              ref={ref}
              className={
                'align-text-bottom h-full rounded border border-transparent min-w-[20px] min-h-[20px] block object-contain'
              }
            />
          )}
          {selected && (
            <div
              draggable={false}
              className={
                'w-20 h-[6px] rounded-lg bg-zinc-500 dark:bg-zinc-400 absolute z-50 left-1/2 -ml-10 -bottom-[3px] cursor-row-resize'
              }
              onMouseDown={(e) => {
                e.preventDefault()
                setState({ dragging: true })
                resize({
                  e,
                  height: state().height,
                  dom: ref.current!,
                  cb: (height: number) => {
                    setState({ height, dragging: false })
                    Transforms.setNodes(store.editor, { height }, { at: path })
                  }
                })
              }}
            />
          )}
        </div>
        <span contentEditable={false}>{children}</span>
      </div>
    </div>
  )
}
