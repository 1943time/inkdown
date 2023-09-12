import './katex.min.css'
import React, {useEffect, useRef} from 'react'
import {CodeNode} from '../../../../el'
import {Editor, Node, Transforms} from 'slate'
import {useGetSetState} from 'react-use'
import katex from 'katex'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {observer} from 'mobx-react-lite'

export const Katex = observer((props: {
  el: CodeNode
}) => {
  const editor = useSlateStatic()
  const [state, setState] = useGetSetState({
    code: '',
    error: ''
  })
  const divRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  useEffect(() => {
    const code = props.el.children.map(c => Node.string(c)).join('\n')
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setState({
        code: code
      })
      if (state().code) {
        try {
          if (divRef.current) {
            katex.render(state().code, divRef.current!, {
              strict: false,
              output: 'htmlAndMathml',
              throwOnError: false,
              displayMode: true,
              macros: {
                "\\f": "#1f(#2)"
              }
            })
          }
        } catch (e) {
          console.log('err', e)
        }
      } else {
        setState({error: ''})
      }
    }, !state().code ? 0 : 300)
    return () => window.clearTimeout(timer.current)
  }, [props.el.children])
  return (
    <div
      className={'mb-3 cursor-default select-none text-center bg-gray-500/5 py-4 rounded'}
      onClick={() => {
        Transforms.select(editor, Editor.start(editor, ReactEditor.findPath(editor, props.el)))
      }}
      contentEditable={false}>
      <div ref={divRef} className={`${!state().code.trim() ? 'hidden' : ''} katex-container`}/>
      {!state().code.trim() &&
        <div className={'text-center text-gray-500'}>Formula</div>
      }
    </div>
  )
})
