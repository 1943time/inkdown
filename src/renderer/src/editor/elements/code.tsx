import {ReactEditor, useSelected} from 'slate-react'
import {useGetSetState} from 'react-use'
import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef} from 'react'
import {AutoComplete} from 'antd'
import {useMEditor} from '../../hooks/editor'
import {CodeLineNode, CodeNode, ElementProps} from '../../el'
import {cacheLine} from '../plugins/useHighlight'
import {Mermaid} from './CodeUI/Mermaid'
import {Transforms} from 'slate'
import {Katex} from './CodeUI/Katex/Katex'
import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../store'
import {configStore} from '../../store/config'

export const CodeCtx = createContext({lang: '', code: false})
const langOptions = Array.from(window.api.langSet).map(l => {
  return {value: l}
})

export const CodeElement = observer((props: ElementProps<CodeNode>) => {
  const selected = useSelected()
  const store = useEditorStore()
  const [editor, update] = useMEditor(props.element)
  const [state, setState] = useGetSetState({
    lang: props.element.language,
    editable: false,
    options: langOptions
  })

  const setLanguage = useCallback(() => {
    setState({editable: false})
    props.element.children.forEach(l => cacheLine.delete(l))
    update({language: state().lang})
  }, [props.element, props.element.children])

  useEffect(() => {
    props.element.children.forEach((el, i) => {
      Transforms.setNodes(editor, {num: i + 1}, {
        at: ReactEditor.findPath(editor, el)
      })
    })
  }, [props.element.children.length])
  const child = useMemo(() => {
    return (
      <code>{props.children}</code>
    )
  }, [props.element, props.element.children, store.refreshHighlight])

  const visible = useMemo(() => {
    return (props.element.language !== 'mermaid' && !props.element.katex) || selected
  }, [selected, props.element])

  return (
    <CodeCtx.Provider value={{lang: props.element.language || '', code: true}}>
      <div
        {...props.attributes}
        data-be={'code'}
        className={`${configStore.config.codeLineNumber ? 'num' : ''} tab-${configStore.config.codeTabSize} code-highlight ${visible ? 'mb-4' : 'h-0 overflow-hidden'} ${!!props.element.katex ? 'katex-container' : ''}`}>
        <div
          className={`absolute z-10 right-2 top-1 flex items-center select-none ${props.element.language !== 'mermaid' || selected ? '' : 'hidden'}`}
          contentEditable={false}>
          {state().editable &&
            <AutoComplete
              size={'small'}
              value={state().lang}
              autoFocus={true}
              options={langOptions}
              style={{width: 130}}
              filterOption={(text, item) => {
                return item?.value.includes(text) || false
              }}
              onChange={e => {
                setState({lang: e})
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  setLanguage()
                }
              }}
              onBlur={setLanguage}
              className={'lang-select'}
            />
          }
          {!state().editable &&
            <>
              <div
                className={'duration-200 hover:text-sky-500 cursor-pointer text-gray-400 text-xs'}
                onClick={() => {
                  if (!props.element.katex) setState({editable: true})
                }}
              >
                {props.element.language ?
                  <span>{props.element.katex ? '公式' : props.element.language}</span> :
                  <span>{'plain text'}</span>
                }
              </div>
            </>
          }
        </div>
        <pre
          data-bl-type={'code'}
          className={'text-gray-200'}
          data-bl-lang={props.element.language}
        >
          {child}
        </pre>
      </div>
      {props.element.language === 'mermaid' &&
        <Mermaid lines={props.element.children} el={props.element}/>
      }
      {!!props.element.katex &&
        <Katex el={props.element}/>
      }
    </CodeCtx.Provider>
  )
})


export const CodeLine = observer((props: ElementProps<CodeLineNode>) => {
  const ctx = useContext(CodeCtx)
  const store = useEditorStore()
  return useMemo(() => {
    return (
      <div
        className={`code-line`}
        data-be={'code-line'}
        data-line={props.element.num}
        {...props.attributes}>
        {props.children}
      </div>
    )
  }, [props.element, props.element.children, ctx.lang, store.refreshHighlight])
})
