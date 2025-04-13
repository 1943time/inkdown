import { ReactEditor } from 'slate-react'
import { useGetSetState } from 'react-use'
import React, { useCallback, useLayoutEffect, useRef } from 'react'
import { mediaType, nodeResize } from '../utils/dom'
import { useSelStatus } from '../../hooks/editor'
import { Transforms } from 'slate'
import { EditorUtils } from '../utils/editorUtils'
import { ElementProps, MediaNode } from '../../types/el'
import { db } from '../../store/db'
import { LoadingOutlined } from '@ant-design/icons'
import { useCoreContext } from '../../utils/env'
import { IDownload } from '../../icons/IDownload'
import { IAlignLeft } from '../../icons/keyboard/AlignLeft'
import { IAlignRight } from '../../icons/keyboard/AlignRight'
import { IFull } from '../../icons/keyboard/IFull'
import { fileSave } from 'browser-fs-access'
import { mb } from '../../utils'

const alignType = new Map([
  ['left', 'justify-start'],
  ['right', 'justify-end']
])
export function Media({ element, attributes, children }: ElementProps<MediaNode>) {
  const core = useCoreContext()
  const [selected, path, store] = useSelStatus(element)
  const ref = useRef<HTMLElement>(null)
  const [state, setState] = useGetSetState({
    height: element.height,
    dragging: false,
    url: '',
    downloading: false,
    uploading: false,
    selected: false,
    progress: 0,
    type: mediaType(element.url)
  })

  const upload = useCallback(async (id: string) => {
    const file = await db.file.get(id)
    if (file?.data) {
      setState({ uploading: true })
      const [up] = core.upload(id, file.data, (p) => setState({ progress: p }))
      up.then(() => {
        db.file.delete(id)
        setState({ uploading: false, progress: 0 })
      }).catch(() => {
        window.addEventListener(
          'online',
          () => {
            upload(id)
          },
          { once: true }
        )
      })
    }
  }, [])
  const updateElement = useCallback(
    (attr: Record<string, any>) => {
      Transforms.setNodes(store.editor, attr, { at: path })
    },
    [path]
  )
  const initial = useCallback(async (element: MediaNode) => {
    let url = element.url || ''
    if (element.id) {
      const file = await db.file.get(element.id)
      if (file) {
        if (file.data) {
          url = URL.createObjectURL(file.data)
          upload(element.id)
        }
      } else {
        url = core.service.getFileUrl(element.id)
      }
    }
    let type = element.id
      ? mediaType(element.id)
      : element.mediaType
        ? element.mediaType
        : await core.getRemoteMediaType(url)
    if (type && !element.mediaType) {
      updateElement({
        mediaType: type
      })
    }
    type = !type ? 'other' : type
    setState({ type: ['image', 'video', 'autio'].includes(type!) ? type! : 'other', url })
  }, [])

  useLayoutEffect(() => {
    if (element.downloadUrl) {
      // console.log('down', element.downloadUrl)
      // setState({ uploading: true })
      // core.api.uploadImageFromUrl
      //   .mutate({
      //     docCid: state().docId!,
      //     url: element.downloadUrl!
      //   })
      //   .then((res) => {
      //     if (res.name) {
      //       Transforms.setNodes(
      //         store.editor,
      //         {
      //           id: res.name,
      //           downloadUrl: null
      //         },
      //         { at: path }
      //       )
      //     }
      //   })
      //   .finally(() => {
      //     setState({ uploading: false })
      //   })
    }
    initial(element)
  }, [element.url, element.downloadUrl])
  const download = useCallback(async () => {
    if (state().downloading) {
      return
    }
    setState({ downloading: true })
    const url = element.id
      ? core.service.getFileUrl(element.id!)
      : element.url || ''
    try {
      if (element.size && element.size > 10 * mb) {
        throw new Error()
      } else {
        const head = await fetch(url, {method: 'HEAD'})
        if (head.ok && +(head.headers.get('content-length') || 0) > 10 * mb) {
          throw new Error()
        }
      }
      const res = await fetch(url)
      const blob = await res.blob()
      let ext = (element.id || element.url)?.match(/\.\w+$/i)?.[0] || ''
      if (!ext) {
        const contentType = res.headers.get('content-type') || ''
        ext = contentType.split('/')[1]
      }
      if (core.desktop) {
        const save = await window.api.dialog.showSaveIdalog({
          filters: [{ extensions: [ext], name: 'type' }]
        })
        if (save.filePath) {
          window.api.fs.writeBuffer(save.filePath, await blob.arrayBuffer())
        }
      } else {
        fileSave(blob, {
          fileName: `Untitled.${ext}`,
          extensions: ['.' + ext]
        }).catch(e => {})
      }
    } catch(e) {
      if (url) {
        window.open(element.url)
      }
    } finally {
      setState({ downloading: false })
    }
  }, [element])
  const setSize = useCallback(async () => {
    if (!element.size) {
      const url = element.id
      ? core.service.getFileUrl(element.id!)
      : element.url || ''
      const head = await fetch(url, {method: 'HEAD'})
      if (head.ok && head.headers.get('content-length')) {
        const size = +head.headers.get('content-length')!
        Transforms.setNodes(store.editor, { size }, { at: path })
      }
    }
  }, [element])
  return (
    <div className={'py-2 relative group'} contentEditable={false} {...attributes}>
      {state().type !== 'other' && !state().uploading && (
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
                <IAlignLeft />
              </div>
              <div
                title={'Valid when the image width is not full'}
                className={`p-0.5 ${element.align === 'right' ? 'text-blue-500' : 'hover:text-gray-300'}`}
                onClick={() =>
                  updateElement({ align: element.align === 'right' ? undefined : 'right' })
                }
              >
                <IAlignRight />
              </div>
              <div
                className={'p-0.5 hover:text-gray-300'}
                onClick={() => {
                  store.openPreviewImages(element)
                }}
              >
                <IFull />
              </div>
            </>
          )}
          {state().downloading ? (
            <div className={'p-0.5'}>
              <LoadingOutlined />
            </div>
          ) : (
            <div className={'p-0.5 hover:text-gray-300'} onClick={download}>
              <IDownload />
            </div>
          )}
        </div>
      )}
      {state().uploading && (
        <div
          className={`text-sm text-white/80
            z-10 rounded absolute bg-black/80 right-3 top-4 px-1.5 py-0.5
            `}
        >
          <LoadingOutlined />
          <span className={'ml-2'}>{state().progress}%</span>
        </div>
      )}
      {selected && element.url && !element.url.startsWith(location.origin) && (
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
          if (!store.focus) {
            EditorUtils.focus(store.editor)
          }
          EditorUtils.selectMedia(store, path)
          store.dragStart(e)
          store.dragEl = ReactEditor.toDOMNode(store.editor, element)
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
              {core.desktop ? (
                <webview
                  src={element.url}
                  className={`w-full h-full select-none border-none rounded ${state().dragging ? 'pointer-events-none' : ''}`}
                  allowFullScreen={true}
                />
              ) : (
                <iframe
                  allowFullScreen={true}
                  src={element.url}
                  className={`w-full h-full select-none border-none rounded ${state().dragging ? 'pointer-events-none' : ''}`}
                />
              )}
            </div>
          )}
          {state().type === 'image' && !!state().url && (
            <img
              src={state().url}
              alt={'image'}
              draggable={false}
              referrerPolicy={'no-referrer'}
              onLoad={setSize}
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
