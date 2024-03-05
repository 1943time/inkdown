import {ReactEditor} from 'slate-react'
import {useGetSetState} from 'react-use'
import React, {createContext, useCallback, useContext, useMemo} from 'react'
import {AutoComplete, Tooltip} from 'antd'
import {useMEditor} from '../../hooks/editor'
import {CodeLineNode, CodeNode, ElementProps} from '../../el'
import {codeCache} from '../plugins/useHighlight'
import {Mermaid} from './CodeUI/Mermaid'
import {Katex} from './CodeUI/Katex/Katex'
import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../store'
import {configStore} from '../../store/config'
import {Editor, Node, Path, Transforms} from 'slate'
import {EyeOutlined} from '@ant-design/icons'
import {useSubject} from '../../hooks/subscribe'
import {selChange$} from '../plugins/useOnchange'
import {DragHandle} from '../tools/DragHandle'
import {runInAction} from 'mobx'
import {allLanguages, highlighter} from '../utils/highlight'

const lightTheme = new Set(['rose-pine-dawn', 'slack-ochin'])
const isDarkTheme = (theme: string = '') => {
  if (theme === 'auto') return configStore.config.dark
  return !/light/i.test(theme) && !lightTheme.has(theme)
}

export const CodeCtx = createContext({lang: '', code: false})
const langOptions = allLanguages.map(l => {
  return {value: l}
})

export const CodeElement = observer((props: ElementProps<CodeNode>) => {
  const store = useEditorStore()
  const [editor, update] = useMEditor(props.element)

  const [state, setState] = useGetSetState({
    lang: props.element.language?.toLowerCase() || '',
    editable: false,
    options: langOptions,
    hide: props.element.katex || props.element.render || props.element.language?.toLowerCase() === 'mermaid'
  })

  const html = useMemo(() => {
    if (store.webview && !store.history) {
      let html = highlighter.codeToHtml(props.element.children.map(n => Node.string(n)).join('\n'), {lang: state().lang as any, theme: configStore.config.codeTheme})
      html = html.replace(/<\/?pre[^>]*>/g, '').replace(/<\/?code>/, '')
      return html
    }
    return ''
  }, [store, state().lang])

  const setLanguage = useCallback(() => {
    setState({editable: false})
    codeCache.delete(props.element)
    runInAction(() => store.pauseCodeHighlight = true)
    update({language: state().lang})
    setTimeout(() => {
      runInAction(() => {
        store.pauseCodeHighlight = false
        store.refreshHighlight = !store.refreshHighlight
      })
    })
  }, [props.element, props.element.children, state().lang])

  const child = useMemo(() => {
    return (
      <code>{props.children}</code>
    )
  }, [props.element, props.element.children, store.refreshHighlight])

  useSubject(selChange$, (ctx) => {
    if (props.element.katex || props.element.render || props.element.language === 'mermaid') {
      if (ctx.node && ctx.node[0].type === 'code-line' && ctx.sel) {
        const show = Path.equals(ReactEditor.findPath(store.editor, props.element), Path.parent(ctx.node[1]))
        setState({hide: !show})
        return
      }
      setState({hide: true})
    }
  }, [props.element])
  return (
    <CodeCtx.Provider value={{lang: state().lang || '', code: true}}>
      <div
        className={'code-container'}
        style={{
          padding: state().hide ? 1 : undefined,
          marginBottom: state().hide ? 0 : undefined
        }}
      >
        <div
          {...props.attributes}
          data-be={'code'}
          style={{
            background: /#f{3,6}/i.test(configStore.config.codeBackground || '') ? '#fafafa' : configStore.config.codeBackground
          }}
          onDragStart={store.dragStart}
          className={`${configStore.codeDark ? 'dark' : 'light'} drag-el ${isDarkTheme(configStore.config.codeTheme) ? 'dark' : ''} ${props.element.frontmatter ? 'frontmatter' : ''} ${configStore.config.codeLineNumber && !store.webview ? 'num' : ''} tab-${configStore.config.codeTabSize} code-highlight ${!state().hide ? '' : 'h-0 overflow-hidden border-none'} ${!!props.element.katex ? 'katex-container' : ''}`}>
          <DragHandle/>
          <div
            className={`absolute z-10 right-2 top-1 flex items-center select-none`}
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
                {props.element.language === 'html' && props.element.render &&
                  <Tooltip mouseEnterDelay={1} title={'render html'}>
                    <EyeOutlined className={`mr-2 text-sky-500 hover:text-sky-600 duration-200`}/>
                  </Tooltip>
                }
                {!props.element.frontmatter &&
                  <div
                    className={'duration-200 hover:text-sky-500 text-gray-400 text-xs'}
                    onClick={() => {
                      if (!props.element.katex && !props.element.render) setState({editable: true})
                    }}
                  >
                    {props.element.language ?
                      <span>{props.element.katex ? 'Formula' : props.element.language}</span> :
                      <span>{'plain text'}</span>
                    }
                  </div>
                }
              </>
            }
          </div>
          {configStore.config.codeLineNumber && !store.webview &&
            <pre className={`code-line-list`} contentEditable={false}>
            {(props.children || []).map((c, i) =>
              <div key={i}/>
            )}
          </pre>
          }
          {store.webview && !store.history ?
            <pre
              data-bl-type={'code'}
              style={{
                paddingLeft: configStore.config.codeLineNumber && !store.webview ? 44 : 20,
                paddingRight: 20
              }}
              data-bl-lang={state().lang}
              dangerouslySetInnerHTML={{__html: html}}
            >
          </pre> : (
              <pre
                data-bl-type={'code'}
                className={'code-content'}
                data-bl-lang={state().lang}
              >
              {child}
            </pre>
            )
          }
        </div>
      </div>
      {props.element.language === 'mermaid' &&
        <Mermaid lines={props.element.children} el={props.element}/>
      }
      {!!props.element.katex &&
        <Katex el={props.element}/>
      }
      {props.element.language === 'html' && !!props.element.render &&
        <div
          className={'bg-gray-500/5 p-3 mb-3 whitespace-nowrap rounded leading-5 overflow-auto'}
          onClick={(e) => {
            e.stopPropagation()
            Transforms.select(editor, Editor.start(editor, ReactEditor.findPath(editor, props.element)))
          }}
          dangerouslySetInnerHTML={{__html: props.element.children?.map(c => Node.string(c)).join('\n')}}
          contentEditable={false}
        />
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
        {...props.attributes}>
        {props.children}
      </div>
    )
  }, [props.element, props.element.children, ctx.lang, store.refreshHighlight])
})
