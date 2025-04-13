import 'katex/dist/katex.min.css'
import React, {useEffect, useRef} from 'react'
import {Editor, Node, Transforms} from 'slate'
import {useGetSetState} from 'react-use'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {observer} from 'mobx-react-lite'
import {CodeNode} from '../../../../types/el'
import { getKatex } from '../../../../utils'
import { useEditorStore } from '../../../../store/editor'
import { EditorUtils } from '../../../utils/editorUtils'

export default observer((props: {
  el: CodeNode
}) => {
  const store = useEditorStore()
  const [state, setState] = useGetSetState({
    code: '',
    error: ''
  })
  const divRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  useEffect(() => {
    const code = props.el.code || ''
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setState({
        code: code
      })
      if (state().code) {
        try {
          if (divRef.current) {
            getKatex().then((res) => {
              res.render(state().code, divRef.current!, {
                strict: false,
                output: 'htmlAndMathml',
                throwOnError: false,
                displayMode: true,
                macros: {
                  '\\f': '#1f(#2)'
                }
              })
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
  }, [props.el])
  return (
    <div
      className={'mb-3 cursor-default select-none text-center bg-gray-500/5 py-4 rounded'}
      onClick={() => {
        const editor = store.codes.get(props.el)
        if (editor) {
          EditorUtils.focusAceEnd(editor)
        }
      }}
      contentEditable={false}>
      <div ref={divRef} className={`${!state().code.trim() ? 'hidden' : ''} katex-container`}/>
      {!state().code.trim() &&
        <div className={'text-center text-gray-500'}>Formula</div>
      }
    </div>
  )
})
