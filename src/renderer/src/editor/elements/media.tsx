import {ElementProps, MediaNode} from '../../el'
import {extname, join} from 'path'
import {ReactEditor} from 'slate-react'
import {useGetSetState, useSetState} from 'react-use'
import Img from '../../svg/Img'
import {useEffect, useMemo} from 'react'
import {treeStore} from '../../store/tree'
import {useEditorStore} from '../store'
import {useSubject} from '../../hooks/subscribe'
import {Path} from 'slate'
import {isAbsolute} from 'path'
import {getImageData} from '../../utils'
import {mediaType} from '../utils/dom'
export function Media({element, attributes, children}: ElementProps<MediaNode>) {
  const store = useEditorStore()
  const [state, setState] = useGetSetState({
    loadSuccess: false,
    url: '',
    selected: false,
    path: ReactEditor.findPath(store.editor, element)
  })
  const type = useMemo(() => {
    return mediaType(element.url)
  }, [element.url])
  useEffect(() => {
    if (type !== 'image') {
      setState({loadSuccess: true})
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
    img.onload = () => setState({loadSuccess: true})
    img.onerror = () => setState({loadSuccess: false})
  }, [element.url])
  useSubject(store.mediaNode$, node => {
    setState({selected: !!node && Path.equals(state().path, node[1])})
  })
  useEffect(() => {
    if (!store.editor.selection) return
    setState({selected: Path.equals(state().path, Path.parent(store.editor.selection.focus.path))})
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
      {state().loadSuccess && type !== 'other' ?
        <span className={'inline-block top-1'}>
          <span
            className={`relative border-2 ${state().selected ? ' border-blue-500/60' : 'border-transparent'} block`}
          >
            {type === 'video' &&
              <video src={element.url} controls={true}/>
            }
            {type === 'document' &&
              <object data={element.url} className={'w-full h-auto'}/>
            }
            {type === 'image' &&
              <img
                src={state().url} alt={element.alt}
                referrerPolicy={'no-referrer'}
                draggable={false}
                className={'align-text-bottom border-2 border-red-500'}
              />
            }
          </span>
        </span>
        :
        (
          <span className={`inline-block align-text-top border rounded ${state().selected ? ' border-blue-500/60' : 'border-transparent'}`}>
            <Img className={'fill-gray-300 align-middle text-xl'}/>
          </span>
        )
      }
    </span>
  )
}
