import { useStore } from '@/store/store'
import { ElementProps, WikiLinkNode } from '..'
import { useSelStatus } from '../utils'
import { InlineChromiumBugfix } from '../utils/InlineChromiumBugfix'
import { Editor, Node, Transforms } from 'slate'
import { isMod } from '@/utils/common'
import { useMemo } from 'react'
import { EditorUtils } from '../utils/editorUtils'
import { ReactEditor } from 'slate-react'

export function WikiLink({ element, children, attributes }: ElementProps<WikiLinkNode>) {
  const store = useStore()
  const [selected, path, tab] = useSelStatus(element)
  const displayText = useMemo(() => {
    const str = Node.string(element)
    const match = EditorUtils.parseWikiLink(str)
    return match?.displayText
  }, [element])
  return (
    <span
      {...attributes}
      className={`wiki-link ${selected ? 'selected' : ''}`}
      onMouseDown={(e) => {
        if (isMod(e)) {
          e.stopPropagation()
        }
      }}
      onClick={(e) => {
        if (isMod(e)) {
          store.note.toWikiLink(Node.string(element))
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
