import {CodeLineNode, CodeNode} from '../../../el'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {useGetSetState, useUpdateEffect} from 'react-use'
import React, {useCallback, useEffect, useMemo, useRef} from 'react'
import {Editor, Node, Transforms} from 'slate'
import mermaid from 'mermaid'
import {configStore} from '../../../store/config'
import {observer} from 'mobx-react-lite'

export const Mermaid = observer((props: {
  lines: CodeLineNode[]
  el: CodeNode
}) => {
  const editor = useSlateStatic()
  const [state, setState] = useGetSetState({
    code: '',
    error: ''
  })
  const divRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  const id = useMemo(() => 'm' + (Date.now() + Math.ceil(Math.random() * 1000)), [])
  const render = useCallback(() => {
    mermaid.render(id, state().code).then(res => {
      setState({error: ''})
      divRef.current!.innerHTML = res.svg
    }).catch(e => {
      mermaid.parse(state().code).catch(e => {
        setState({error: e.toString(), code: ''})
      })
    }).finally(() => {
      document.querySelector('#d' + id)?.classList.add('hidden')
    })
  }, [])

  useUpdateEffect(() => {
    setTimeout(() => {
      render()
    })
  }, [configStore.config.dark])

  useEffect(() => {
    const code = props.lines.map(c => Node.string(c)).join('\n')
    if (state().code !== code) {
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        setState({code: code})
        if (state().code) {
          render()
        } else {
          setState({error: ''})
        }
      }, !state().code ? 0 : 300)
    }
    return () => window.clearTimeout(timer.current)
  }, [props.lines])
  return (
    <div
      className={'mermaid-container'}
      contentEditable={false}
      onClick={() => {
        Transforms.select(editor, Editor.start(editor, ReactEditor.findPath(editor, props.el)))
      }}
    >
      <div contentEditable={false} ref={divRef}
           className={`w-full flex justify-center ${state().code && !state().error ? '' : 'hidden'}`}></div>
      {state().error &&
        <div className={'text-center text-red-500/80'}>{state().error}</div>
      }
      {!state().code && !state().error &&
        <div className={'text-center text-gray-500'}>Empty</div>
      }
    </div>
  )
})
