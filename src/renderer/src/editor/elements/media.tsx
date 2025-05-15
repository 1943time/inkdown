import { ReactEditor } from 'slate-react'
import { useGetSetState } from 'react-use'
import { useCallback, useLayoutEffect, useRef } from 'react'
import { mediaType, nodeResize } from '../utils/dom'
import { Transforms } from 'slate'
import { EditorUtils } from '../utils/editorUtils'
import { ElementProps, MediaNode } from '..'
import { LoadingOutlined } from '@ant-design/icons'
import { useTab } from '@/store/note/TabCtx'
import { getImageData, useSelStatus } from '../utils'
import { AlignLeft, AlignRight, Download, ScanEye } from 'lucide-react'

const alignType = new Map([
  ['left', 'justify-start'],
  ['right', 'justify-end']
])
export function Media({ element, attributes, children }: ElementProps<MediaNode>) {
  const tab = useTab()
  const [selected, path, store] = useSelStatus(element)
  const ref = useRef<HTMLElement>(null)
  const [state, setState] = useGetSetState({
    height: element.height,
    dragging: false,
    url: '',
    downloading: false,
    selected: false,
    type: mediaType(element.url)
  })

  const updateElement = useCallback(
    (attr: Record<string, any>) => {
      Transforms.setNodes(store.editor, attr, { at: path })
    },
    [path]
  )
  const initial = useCallback(async (element: MediaNode) => {
    const url = element.id
      ? getImageData(await tab.store.system.getFilePath(element.id))
      : element.url || ''
    let type = element.id
      ? mediaType(element.id)
      : element.mediaType
        ? element.mediaType
        : await tab.store.getRemoteMediaType(url)
    if (type && !element.mediaType) {
      updateElement({
        mediaType: type
      })
    }
    type = !type ? 'other' : type
    setState({ type: ['image', 'video', 'autio'].includes(type!) ? type! : 'other', url })
  }, [])

  useLayoutEffect(() => {
    initial(element)
  }, [element.url, element.downloadUrl])
  const download = useCallback(async () => {
    if (state().downloading) {
      return
    }
    const url = state().url
    let ext = url?.match(/\.\w+$/i)?.[0] || ''
    if (url.startsWith('file://')) {
      const path = url.replace('file://', '')
      if (window.api.fs.existsSync(path)) {
        const savePath = await tab.store.system.showSaveDialog({
          filters: [{ extensions: [ext], name: 'type' }]
        })
        if (savePath.filePath) {
          await window.api.fs.cp(path, savePath.filePath)
        }
      }
    } else {
      setState({ downloading: true })
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        if (!ext) {
          const contentType = res.headers.get('content-type') || ''
          ext = contentType.split('/')[1]
        }
        const save = await tab.store.system.showSaveDialog({
          filters: [{ extensions: [ext], name: 'type' }]
        })
        if (save.filePath) {
          window.api.fs.writeBuffer(save.filePath, await blob.arrayBuffer())
        }
      } catch (e) {
        if (url) {
          window.open(url)
        }
      } finally {
        setState({ downloading: false })
      }
    }
  }, [element])
  return (
    <div className={'py-2 relative group'} contentEditable={false} {...attributes}>
      {state().type !== 'other' && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className={`text-base  text-white group-hover:flex hidden items-center space-x-1 *:duration-200 *:cursor-pointer
            z-10 rounded border border-white/20 absolute bg-black/70 backdrop-blur right-3 top-4 px-1 h-7
            `}
        >
          {state().type === 'image' && (
            <>
              <div
                title={'Valid when the image width is not full'}
                className={`p-0.5 ${element.align === 'left' ? 'text-blue-500' : 'hover:text-gray-300'}`}
                onClick={() =>
                  updateElement({ align: element.align === 'left' ? undefined : 'left' })
                }
              >
                <AlignLeft size={16} />
              </div>
              <div
                title={'Valid when the image width is not full'}
                className={`p-0.5 ${element.align === 'right' ? 'text-blue-500' : 'hover:text-gray-300'}`}
                onClick={() =>
                  updateElement({ align: element.align === 'right' ? undefined : 'right' })
                }
              >
                <AlignRight size={16} />
              </div>
              <div
                className={'p-0.5 hover:text-gray-300'}
                onClick={() => {
                  tab.store.note.openPreviewImages(element)
                }}
              >
                <ScanEye size={16} />
              </div>
            </>
          )}
          {state().downloading ? (
            <div className={'p-0.5'}>
              <LoadingOutlined />
            </div>
          ) : (
            <div className={'p-0.5 hover:text-gray-300'} onClick={download}>
              <Download size={16} />
            </div>
          )}
        </div>
      )}
      {selected && element.url && !state().url.startsWith('file://') && (
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
        style={{
          padding: state().type === 'document' ? '15px 0' : undefined
        }}
        onContextMenu={(e) => {
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          if (!tab.state.focus) {
            EditorUtils.focus(store.editor)
          }
          tab.selectMedia(path)
          tab.dragStart(e)
          tab.dragEl = ReactEditor.toDOMNode(store.editor, element)
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
          className={`w-full h-full flex ${state().type === 'image' && element.align ? alignType.get(element.align) || 'justify-center' : 'justify-center'}`}
          style={{ height: state().height || (state().type === 'other' ? 260 : undefined) }}
        >
          {state().type === 'video' && (
            <video
              src={state().url}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
              controls={true}
              className={`rounded h-full ${state().dragging ? 'pointer-events-none' : ''} select-none`}
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
              className={`${state().dragging ? 'pointer-events-none' : ''} select-none`}
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
              <webview
                src={element.url}
                className={`w-full h-full select-none border-none rounded ${state().dragging ? 'pointer-events-none' : ''}`}
                allowFullScreen={true}
              />
            </div>
          )}
          {state().type === 'image' && !!state().url && (
            <img
              src={state().url}
              alt={'image'}
              draggable={false}
              referrerPolicy={'no-referrer'}
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
                e.stopPropagation()
                setState({ dragging: true })
                nodeResize({
                  e,
                  height: state().height,
                  dom: ref.current!,
                  cb: (height: number) => {
                    setState({ height })
                    Transforms.setNodes(store.editor, { height }, { at: path })
                    setState({ dragging: false })
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
