import {ElementProps, MediaNode} from '../../el'
import {isAbsolute, join} from 'path'
import {ReactEditor} from 'slate-react'
import {useGetSetState} from 'react-use'
import Img from '../../icons/Img'
import {useEffect, useLayoutEffect, useMemo, useRef} from 'react'
import {Transforms} from 'slate'
import {getImageData, toArrayBuffer} from '../../utils'
import {mediaType} from '../utils/dom'
import {useSelStatus} from '../../hooks/editor'
import ky from 'ky'

const startMoving = (options: {
  dom: HTMLImageElement
  startX: number
  maxWidth: number
  direction: 'left' | 'right',
  onEnd: (width: number) => void
}) => {
  const startWidth = options.dom.clientWidth
  let width = startWidth
  const move = (e: MouseEvent) => {
    if (options.direction === 'right') {
      width = startWidth + e.clientX - options.startX
      options.dom.width = width
    } else {
      width = startWidth - (e.clientX - options.startX)
      options.dom.width = width
    }
    if (width < 20) {
      width = 20
      options.dom.width = width
    }
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', e => {
    window.removeEventListener('mousemove', move)
    options.onEnd(width)
  }, {once: true})
}
export function Media({element, attributes, children}: ElementProps<MediaNode>) {
  const [selected, path, store] = useSelStatus(element)
  const imgRef = useRef<HTMLImageElement>(null)
  const [state, setState] = useGetSetState({
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
              name: Date.now().toString(16) + '.' + (image ? image[1].toLowerCase() : type.split('/')[1]),
              buffer: buffer.buffer
            }).then(res => {
              Transforms.setNodes(store.editor, {
                url: res, downloadUrl: undefined, alt: ''
              }, {at: path})
            }).catch(e => {
              console.log('err', e)
            })
          })
        }
      })
    }
  }, [])
  return (
    <span
      {...attributes}
      className={`cursor-pointer mx-1 inline-block select-none`}
      data-be={'media'}
      contentEditable={false}
      onClick={(e) => {
        const path = ReactEditor.findPath(store.editor, element)
        ReactEditor.blur(store.editor)
        store.editor.apply({
          type: 'set_selection',
          properties: {},
          newProperties: {
            anchor: {path: [...path, 0], offset: 0}, focus: {path: [...path, 0], offset: 0}
          }
        })
      }}
    >
      {children}
      {(state().loadSuccess || state().url.startsWith('data:')) ?
        <span className={'inline-block top-1'}>
          <span
            className={`media-frame ${selected ? 'active' : ''}`}
          >
            {type === 'video' &&
              <video src={element.url} controls={true}/>
            }
            {type === 'document' &&
              <object data={element.url} className={'w-full h-auto'}/>
            }
            {(type === 'image' || state().url.startsWith('data:') || type === 'other') &&
              <>
                <img
                  src={state().url} alt={element.alt}
                  referrerPolicy={'no-referrer'}
                  draggable={false}
                  ref={imgRef}
                  className={'align-text-bottom border-2 border-red-500'}
                />
                <span
                  className={'img-drag-handle t1'}
                  onMouseDown={e => startMoving({
                    startX: e.clientX,
                    dom: imgRef.current!,
                    direction: 'left',
                    maxWidth: (store.container!.querySelector('.edit-area') as HTMLElement).clientWidth - 12,
                    onEnd: width => {
                      Transforms.setNodes(store.editor, {width}, {at: path})
                    }
                  })}
                />
                <span
                  className={'img-drag-handle t2'}
                  onMouseDown={e => startMoving({
                    startX: e.clientX,
                    dom: imgRef.current!,
                    direction: 'right',
                    maxWidth: (store.container!.querySelector('.edit-area') as HTMLElement).clientWidth - 12,
                    onEnd: width => {
                      Transforms.setNodes(store.editor, {width}, {at: path})
                    }
                  })}
                />
              </>
            }
          </span>
        </span>
        :
        (
          <span className={`inline-block align-text-top border rounded ${selected ? ' border-blue-500/60' : 'border-transparent'}`}>
            <Img className={'fill-gray-300 align-middle text-xl'}/>
          </span>
        )
      }
    </span>
  )
}
