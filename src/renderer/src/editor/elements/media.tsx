import {ReactEditor} from 'slate-react'
import {useGetSetState} from 'react-use'
import React, {useEffect, useLayoutEffect, useMemo, useRef} from 'react'
import {mediaType} from '../utils/dom'
import {useSelStatus} from '../../hooks/editor'
import {Transforms} from 'slate'
import {getImageData, nid} from '../../utils'
import {ElementProps, MediaNode} from '../../el'
import {isAbsolute, join} from 'path'
import {EditorUtils} from '../utils/editorUtils'

const resize = (ctx: {
  e: React.MouseEvent,
  dom: HTMLElement,
  height?: number,
  cb: Function
}) => {
  const height = ctx.height || ctx.dom.clientHeight
  const startY = ctx.e.clientY
  let resizeHeight = height
  const move = (e: MouseEvent) => {
    resizeHeight = height + e.clientY - startY
    ctx.dom.parentElement!.style.height = resizeHeight + 'px'
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', (e) => {
    window.removeEventListener('mousemove', move)
    e.stopPropagation()
    ctx.cb(resizeHeight)
  }, {once: true})
}

export function Media({element, attributes, children}: ElementProps<MediaNode>) {
  const [selected, path, store] = useSelStatus(element)
  const ref = useRef<HTMLElement>(null)
  const [state, setState] = useGetSetState({
    height: element.height,
    dragging: false,
    loadSuccess: true,
    url: '',
    selected: false
  })

  const type = useMemo(() => {
    return mediaType(element.url)
  }, [element.url])

  useLayoutEffect(() => {
    if (element.downloadUrl) {
      return
    }
    if (!['image', 'other'].includes(type) || element.url?.startsWith('data:')) {
      setState({loadSuccess: true, url: element.url})
      return
    }
    let realUrl = element.url
    if (realUrl && !realUrl?.startsWith('http') && !realUrl.startsWith('file:')) {
      const currentFilePath = store.webview ? store.webviewFilePath : store.openFilePath
      const file = isAbsolute(realUrl) ? element.url : join(currentFilePath || '', '..', realUrl)
      const data = getImageData(file)
      if (data) {
        realUrl = data
      }
    }
    setState({url: realUrl})
    if (type === 'image' || type === 'other') {
      const img = document.createElement('img')
      img.referrerPolicy = 'no-referrer'
      img.crossOrigin = 'anonymous'
      img.src = realUrl!
      img.onerror = (e) => {
        setState({loadSuccess: false})
      }
      img.onload = () => setState({loadSuccess: true})
    }
  }, [element.url, element.downloadUrl, store.webviewFilePath])
  useEffect(() => {
    if (!store.editor.selection) return
    if (element.downloadUrl) {
      const url = decodeURIComponent(element.downloadUrl)
      window.api.fetch(url).then(res => {
        const type = res.headers.get('content-type') || ''
        const image = url.match(/[\w_-]+\.(png|webp|jpg|jpeg|gif|svg)/i)
        if (type.startsWith('image/') || image) {
          window.api.fetch(url).then(async res => {
            const buffer = await res.buffer()
            store.saveFile({
              name: nid() + '.' + (image ? image[1].toLowerCase() : type.split('/')[1]),
              buffer: buffer.buffer
            }).then(res => {
              Transforms.setNodes(store.editor, {
                url: res, downloadUrl: null
              }, {at: path})
            }).catch(e => {
              console.log('err', e)
            })
          })
        }
      })
    }
  }, [element])
  return (
    <div
      className={'py-2 relative'}
      contentEditable={false}
    >
      {selected &&
        <div className={'absolute text-center w-full truncate left-0 -top-2.5 text-xs h-5 leading-5 dark:text-gray-500 text-gray-400'}>
          {state().url}
        </div>
      }
      <div
        {...attributes}
        className={`drag-el group cursor-pointer relative flex justify-center mb-2 border-2 rounded ${selected ? 'border-gray-300 dark:border-gray-300/50' : 'border-transparent'}`}
        data-be={'media'}
        style={{padding: (type === 'document' || type === 'other') ? '10px 0' : undefined}}
        draggable={true}
        onContextMenu={e => {
          e.stopPropagation()
        }}
        onDragStart={e => {
          try {
            store.dragStart(e)
            store.dragEl = ReactEditor.toDOMNode(store.editor, element)
          } catch (e) {
          }
        }}
        onClick={(e) => {
          e.preventDefault()
          if (e.detail === 2) {
            Transforms.setNodes(store.editor, {height: undefined}, {at: path})
            setState({height: undefined})
          }
          EditorUtils.selectMedia(store, path)
        }}
      >
        <div
          className={'w-full h-full flex justify-center'}
          style={{height: state().height}}
        >
          {type === 'video' &&
            <video
              src={element.url} controls={true} className={'rounded h-full'}
              // @ts-ignore
              ref={ref}
            />
          }
          {type === 'audio' &&
            <audio
              controls={true} src={element.url}
              // @ts-ignore
              ref={ref}
            />
          }
          {type === 'document' &&
            <object
              data={element.url}
              className={'w-full h-full rounded'}
              // @ts-ignore
              ref={ref}
            />
          }
          {type === 'other' &&
            <iframe
              src={element.url}
              className={'w-full h-full rounded'}
              // @ts-ignore
              ref={ref}
            />
          }
          {type === 'image' &&
            <img
              src={state().url} alt={'image'}
              referrerPolicy={'no-referrer'}
              draggable={false}
              // @ts-ignore
              ref={ref}
              className={'align-text-bottom h-full rounded border border-transparent min-w-[20px] min-h-[20px] block object-contain'}
            />
          }
          {selected &&
            <div
              draggable={false}
              className={'w-20 h-[6px] rounded-lg bg-zinc-500 dark:bg-zinc-400 absolute z-50 left-1/2 -ml-10 -bottom-[3px] cursor-row-resize'}
              onMouseDown={e => {
                e.preventDefault()
                resize({
                  e,
                  height: state().height,
                  dom: ref.current!,
                  cb: (height: number) => {
                    setState({height})
                    Transforms.setNodes(store.editor, {height}, {at: path})
                  }
                })
              }}
            />
          }
        </div>
        <span contentEditable={false}>{children}</span>
      </div>
    </div>
  )
}
