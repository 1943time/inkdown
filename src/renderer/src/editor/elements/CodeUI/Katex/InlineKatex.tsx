import {observer} from 'mobx-react-lite'
import {ElementProps, InlineKatexNode} from '../../../../el'
import React, {useEffect, useMemo, useRef, useState} from 'react'
import {InlineChromiumBugfix} from '../../../utils/InlineChromiumBugfix'
import {useSelStatus} from '../../../../hooks/editor'
import katex from 'katex'
import {Editor, Node, Transforms} from 'slate'

export const InlineKatex = observer(({children, element, attributes}: ElementProps<InlineKatexNode>) => {
  const renderEl = useRef<HTMLElement>(null)
  const [selected, path, store] = useSelStatus(element)
  useEffect(() => {
    if (!selected) {
      const value = Node.string(element)
      katex.render(value, renderEl.current!, {
        strict: false,
        output: 'html',
        throwOnError: false,
        macros: {
          '\\f': '#1f(#2)'
        }
      })
    }
  }, [selected])
  return useMemo(() => (
      <span
        {...attributes}
        data-be={'inline-katex'}
        className={`relative`}
      >
        <span className={`inline-code-input ${selected ? 'px-1' : 'invisible h-0 overflow-hidden absolute'}`}>
          <InlineChromiumBugfix/>
          {children}
          <InlineChromiumBugfix/>
        </span>
        <span
          contentEditable={false}
          ref={renderEl}
          onClick={() => {
            Transforms.select(store.editor, Editor.end(store.editor, path))
          }}
          className={`mx-1 select-none ${selected ? 'invisible h-0 overflow-hidden absolute' : ''}`}
        />
      </span>
    ),
    [element, element.children, selected])
})
