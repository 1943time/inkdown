import { useEffect, useRef } from 'react'
import { useGetSetState } from 'react-use'
import { CodeNode } from '../../..'
import { EditorUtils } from '../../../utils/editorUtils'
import { useTab } from '@/store/note/TabCtx'
import katex from 'katex'
export default function Katex(props: { el: CodeNode }) {
  const tab = useTab()
  const [state, setState] = useGetSetState({
    code: '',
    error: ''
  })
  const divRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  useEffect(() => {
    const code = props.el.code || ''
    clearTimeout(timer.current)
    timer.current = window.setTimeout(
      () => {
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
                  '\\f': '#1f(#2)'
                }
              })
            }
          } catch (e) {
            console.log('err', e)
          }
        } else {
          setState({ error: '' })
        }
      },
      !state().code ? 0 : 300
    )
    return () => window.clearTimeout(timer.current)
  }, [props.el])
  return (
    <div
      className={'mb-3 cursor-default select-none text-center bg-gray-500/5 py-4 rounded'}
      onClick={() => {
        const editor = tab.codeMap.get(props.el)
        if (editor) {
          EditorUtils.focusAceEnd(editor)
        }
      }}
      contentEditable={false}
    >
      <div ref={divRef} className={`${!state().code.trim() ? 'hidden' : ''} katex-container`} />
      {!state().code.trim() && <div className={'text-center text-gray-500'}>Formula</div>}
    </div>
  )
}
