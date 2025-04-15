import { Element, Transforms } from 'slate'
import { ReactEditor } from 'slate-react'
import { useDebounce } from 'react-use'
import { CSSProperties, useRef } from 'react'
import { TabStore } from '@/store/note/tab'

export const useMonitorHeight = (tab: TabStore, el: Element) => {
  const first = useRef(true)
  useDebounce(
    () => {
      try {
        const path = ReactEditor.findPath(tab.editor, el)
        if (path.length > 1) return
        const dom = ReactEditor.toDOMNode(tab.editor, el)
        if (dom.clientHeight === el.h) return
        if (first.current && !!el.h) {
          first.current = false
          return
        }
        setTimeout(() => {
          try {
            first.current = false
            Transforms.setNodes(tab.editor, { h: dom.clientHeight }, { at: path })
            dom.style.containIntrinsicSize = `0px ${dom.clientHeight}px`
            // @ts-ignore
            dom.style.contentVisibility = 'auto'
          } catch (e) {
            console.error(e)
          }
        }, 100)
      } catch (e) {
        console.error(e)
      }
    },
    300,
    [el.children]
  )
}

export const getVisibleStyle = (el: Element): CSSProperties => {
  return {
    contentVisibility: el.h ? 'auto' : undefined,
    containIntrinsicSize: el.h ? `0px ${el.h}px` : undefined
  }
}
