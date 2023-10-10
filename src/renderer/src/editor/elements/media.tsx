import {ElementProps, MediaNode} from '../../el'
import {isAbsolute, join} from 'path'
import {ReactEditor} from 'slate-react'
import {useGetSetState} from 'react-use'
import Img from '../../svg/Img'
import {useEffect, useMemo, useRef} from 'react'
import {treeStore} from '../../store/tree'
import {Transforms} from 'slate'
import {getImageData, toArrayBuffer} from '../../utils'
import {mediaType} from '../utils/dom'
import {useSelStatus} from '../../hooks/editor'

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
    loadSuccess: false,
    url: '',
    selected: false
  })
  const type = useMemo(() => {
    return mediaType(element.url)
  }, [element.url])
  useEffect(() => {
    if (element.downloadUrl) {
      return
    }
    if (!['image', 'video', 'document'].includes(type) || element.url?.startsWith('data:')) {
      setState({loadSuccess: true, url: element.url})
      return
    }
    let realUrl = element.url
    if (!element.url.startsWith('http') && !element.url.startsWith('file:') && treeStore.openNote) {
      const file = isAbsolute(element.url) ? element.url : join(treeStore.currentTab.current!.filePath, '..', element.url)
      const data = getImageData(file)
      if (data) {
        realUrl = data
      }
    }
    setState({url: realUrl})
    const img = document.createElement('img')
    img.referrerPolicy = 'no-referrer'
    img.crossOrigin = 'anonymous'
    img.src = realUrl
    img.onload = () => {
      setState({loadSuccess: true})
    }
    img.onerror = () => setState({loadSuccess: false})
  }, [element.url, element.downloadUrl])
  useEffect(() => {
    if (!store.editor.selection) return
    if (element.downloadUrl) {
      const url = decodeURIComponent(element.downloadUrl)
      const image = url.match(/[\w_-]+\.(png|webp|jpg|jpeg|gif)/i)
      if (image) {
        window.api.got.get(element.downloadUrl, {
          responseType: 'buffer'
        }).then(res => {
          store.saveFile({
            name: Date.now().toString(16) + '.' + image[1].toLowerCase(),
            buffer: toArrayBuffer(res.rawBody)
          }).then(res => {
            Transforms.setNodes(store.editor, {
              url: res, downloadUrl: undefined, alt: ''
            }, {at: path})
          })
        })
      }
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
      {state().loadSuccess && (type !== 'other' || state().url.startsWith('data:')) ?
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
            {(type === 'image' || state().url.startsWith('data:')) &&
              <>
                <img
                  src={state().url} alt={element.alt}
                  referrerPolicy={'no-referrer'}
                  draggable={false}
                  width={element.width}
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
