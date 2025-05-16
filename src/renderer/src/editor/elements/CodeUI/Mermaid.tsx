import { useGetSetState, useUpdateEffect } from 'react-use'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { EditorUtils } from '../../utils/editorUtils'
import { CodeNode } from '@/editor'
import { useTab } from '@/store/note/TabCtx'
import { useObserveKey } from '@/hooks/common'
import { useTranslation } from 'react-i18next'

export default function Mermaid(props: { el: CodeNode }) {
  const tab = useTab()
  const { t } = useTranslation()
  const [state, setState] = useGetSetState({
    code: '',
    error: ''
  })
  const divRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  const id = useMemo(() => 'm' + (Date.now() + Math.ceil(Math.random() * 1000)), [])
  const render = useCallback(() => {
    import('mermaid').then((res) => {
      res.default
        .render(id, state().code)
        .then((res) => {
          setState({ error: '' })
          divRef.current!.innerHTML = res.svg
        })
        .catch((e) => {
          res.default.parse(state().code).catch((e) => {
            setState({ error: e.toString(), code: '' })
          })
        })
        .finally(() => {
          document.querySelector('#d' + id)?.classList.add('hidden')
        })
    })
  }, [])
  useObserveKey(tab.store.settings.state, 'dark', () => {
    setTimeout(() => {
      render()
    })
  })

  useEffect(() => {
    const code = props.el.code || ''
    if (state().code !== code) {
      clearTimeout(timer.current)
      timer.current = window.setTimeout(
        () => {
          setState({ code: code })
          if (state().code) {
            render()
          } else {
            setState({ error: '' })
          }
        },
        !state().code ? 0 : 300
      )
    }
    return () => window.clearTimeout(timer.current)
  }, [props.el])
  return (
    <div
      className={'mermaid-container'}
      contentEditable={false}
      onClick={() => {
        const editor = tab.codeMap.get(props.el)
        if (editor) {
          EditorUtils.focusAceEnd(editor)
        }
      }}
    >
      <div
        contentEditable={false}
        ref={divRef}
        className={`w-full flex justify-center ${state().code && !state().error ? '' : 'hidden'}`}
      ></div>
      {state().error && <div className={'text-center text-red-500/80'}>{state().error}</div>}
      {!state().code && !state().error && (
        <div className={'text-center '}>{t('editor.mermaid.empty')}</div>
      )}
    </div>
  )
}
