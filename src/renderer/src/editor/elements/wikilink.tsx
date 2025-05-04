import { useStore } from '@/store/store'
import { ElementProps, WikiLinkNode } from '..'
import { useSelStatus } from '../utils'
import { InlineChromiumBugfix } from '../utils/InlineChromiumBugfix'
import { Editor, Node, Path, Transforms } from 'slate'
import { isMod } from '@/utils/common'
import { useMemo, useRef } from 'react'
import { EditorUtils } from '../utils/editorUtils'
import { useUpdateEffect } from 'react-use'

export function WikiLink({ element, children, attributes }: ElementProps<WikiLinkNode>) {
  const timer = useRef(0)
  const store = useStore()
  const [selected, path, tab] = useSelStatus(element)
  const pathRef = useRef<Path>(path)
  pathRef.current = path
  const displayText = useMemo(() => {
    const str = Node.string(element)
    const match = EditorUtils.parseWikiLink(str)
    return match?.displayText
  }, [element])
  useUpdateEffect(() => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try {
        const res = EditorUtils.parseWikiLink(Node.string(element) || '')
        if (res?.docName) {
          const doc = store.note.getWikiDoc(res.docName)
          if (doc) {
            Transforms.setNodes(tab.editor, { docId: doc.id }, { at: pathRef.current })
          }
        }
      } catch (error) {
        console.error(error)
      }
    }, 1000)
  }, [element.children])
  return (
    <span
      {...attributes}
      className={`wiki-link ${selected || !displayText ? 'selected' : ''}`}
      title={'mod + click to open link, mod + alt + click to open file in new tab'}
      onMouseDown={(e) => {
        if (isMod(e)) {
          e.stopPropagation()
        }
      }}
      onClick={(e) => {
        if (isMod(e)) {
          store.note.toWikiLink(Node.string(element), !!e.altKey)
        } else if (!selected) {
          Transforms.select(tab.editor, path)
          setTimeout(() => {
            Transforms.select(tab.editor, Editor.end(tab.editor, path))
          }, 16)
        }
      }}
    >
      <InlineChromiumBugfix />
      <span
        className={`${selected ? '' : 'inline-flex invisible w-0 h-0 overflow-hidden absolute'}`}
      >
        {children}
      </span>
      <span
        className={`${selected ? 'invisible w-0 h-0 overflow-hidden absolute' : 'underline'}`}
        contentEditable={false}
      >
        {displayText}
      </span>
      <InlineChromiumBugfix />
    </span>
  )
}
