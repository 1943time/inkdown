import { ReactEditor } from 'slate-react'
import { useGetSetState } from 'react-use'
import { createContext, useCallback, useContext, useMemo } from 'react'
import { AutoComplete, Input, Popover } from 'antd'
import { useMEditor } from '../../hooks/editor'
import { CodeLineNode, CodeNode, ElementProps } from '../../el'
import { codeCache } from '../plugins/useHighlight'
import { Mermaid } from './CodeUI/Mermaid'
import { Katex } from './CodeUI/Katex/Katex'
import { observer } from 'mobx-react-lite'
import { useEditorStore } from '../store'
import { Editor, Node, Path, Transforms } from 'slate'
import { useSubject } from '../../hooks/subscribe'
import { selChange$ } from '../plugins/useOnchange'
import { DragHandle } from '../tools/DragHandle'
import { runInAction } from 'mobx'
import { message$ } from '../../utils'
import { langIconMap } from '../tools/langIconMap'
import { SearchOutlined } from '@ant-design/icons'
import { ICopy } from '../../icons/ICopy'
import { IArrowRight } from '../../icons/IArrowRight'
import { useCoreContext } from '../../store/core'

export const CodeCtx = createContext({ lang: '', code: false })

const langOptions = Array.from(langIconMap).map(([lang, icon]) => {
  return {
    value: lang,
    label: (
      <span className={'flex items-center'}>
        <img src={icon} className={'w-4'} />
        <span className={'ml-1'}>{lang}</span>
      </span>
    )
  }
})

export const CodeElement = observer((props: ElementProps<CodeNode>) => {
  const core = useCoreContext()
  const store = useEditorStore()
  const [editor, update] = useMEditor(props.element)
  const [state, setState] = useGetSetState({
    lang: props.element.language?.toLowerCase() || '',
    editable: false,
    options: langOptions,
    openMenu: false,
    openSelectMenu: false,
    hide:
      props.element.katex ||
      props.element.render ||
      props.element.language?.toLowerCase() === 'mermaid'
  })

  const setLanguage = useCallback(() => {
    setState({ editable: false })
    if (props.element.language?.toLowerCase() === state().lang) return
    codeCache.delete(props.element)
    runInAction(() => (store.pauseCodeHighlight = true))
    update({ language: state().lang })
    setTimeout(() => {
      runInAction(() => {
        store.pauseCodeHighlight = false
        store.refreshHighlight = !store.refreshHighlight
      })
    })
  }, [props.element, props.element.children, state().lang])

  const child = useMemo(() => {
    return <code>{props.children}</code>
  }, [props.element, props.element.children, store.refreshHighlight])

  useSubject(
    selChange$,
    (ctx) => {
      if (props.element.katex || props.element.render || props.element.language === 'mermaid') {
        if (ctx && ctx.node && ctx.node[0].type === 'code-line' && ctx.sel) {
          const show = Path.equals(
            ReactEditor.findPath(store.editor, props.element),
            Path.parent(ctx.node[1])
          )
          setState({ hide: !show })
          return
        }
        setState({ hide: true })
      }
    },
    [props.element]
  )
  return (
    <CodeCtx.Provider value={{ lang: state().lang || '', code: true }}>
      <div
        className={`code-container ${core.config.state.codeAutoBreak ? 'wrap' : ''}`}
        {...props.attributes}
        style={{
          padding: state().hide ? 1 : undefined,
          marginBottom: state().hide ? 0 : undefined
        }}
      >
        <div
          data-be={'code'}
          style={{
            background: /#f{3,6}/i.test(core.config.state.codeBackground || '')
              ? '#fafafa'
              : core.config.state.codeBackground
          }}
          onDragStart={store.dragStart}
          className={`${core.config.codeDark ? 'dark' : 'light'} drag-el ${
            props.element.frontmatter ? 'frontmatter' : ''
          } num tab-${core.config.state.codeTabSize} code-highlight ${
            !state().hide ? '' : 'h-0 overflow-hidden border-none'
          } ${!!props.element.katex ? 'katex-container' : ''}`}
        >
          {!props.element.frontmatter && (
            <div
              contentEditable={false}
              className={
                'h-7 pl-3 pr-1.5 flex items-center w-full absolute left-0 top-0 text-sm text-black/60 dark:text-white/60 justify-between z-50 select-none'
              }
            >
              <Popover
                trigger={['click']}
                placement={'bottomLeft'}
                overlayClassName={'light-poppver'}
                arrow={false}
                open={state().openSelectMenu}
                onOpenChange={(v) => {
                  if (props.element.katex || props.element.render) {
                    return
                  }
                  setState({ openSelectMenu: v })
                  if (v) {
                    setTimeout(() => {
                      ;(document.querySelector('.lang-select input') as HTMLInputElement)?.focus()
                    })
                  }
                }}
                overlayInnerStyle={{ padding: 10 }}
                content={
                  <AutoComplete
                    value={state().lang}
                    options={langOptions}
                    placeholder={'Search'}
                    autoFocus={true}
                    style={{ width: 200 }}
                    filterOption={(text, item) => {
                      return item?.value.includes(text) || false
                    }}
                    onChange={(e) => {
                      setState({ lang: e })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        setLanguage()
                        setState({ openSelectMenu: false })
                      }
                    }}
                    onBlur={setLanguage}
                    className={'lang-select'}
                  >
                    <Input prefix={<SearchOutlined />} placeholder={'Search'} />
                  </AutoComplete>
                }
              >
                <div
                  className={
                    'flex items-center cursor-pointer hover:text-black/80 dark:hover:text-white/80'
                  }
                >
                  {langIconMap.get(props.element.language?.toLowerCase()!) &&
                    !props.element.katex && (
                      <div className={'h-4 w-4 flex items-center justify-center mr-1'}>
                        <img
                          className={'w-4 h-4'}
                          src={langIconMap.get(props.element.language?.toLowerCase()!)}
                        />
                      </div>
                    )}
                  <div>
                    {props.element.language ? (
                      <span>
                        {props.element.katex
                          ? 'Formula'
                          : props.element.language === 'html' && props.element.render
                          ? 'Html Renderer'
                          : props.element.language}
                      </span>
                    ) : (
                      <span>{'plain text'}</span>
                    )}
                  </div>
                  {!props.element.katex && !props.element.render && (
                    <IArrowRight className={'rotate-90 text-lg ml-0.5'} />
                  )}
                </div>
              </Popover>
              <div>
                <div
                  className={'text-lg cursor-pointer hover:text-black/80 dark:hover:text-white/80'}
                  onClick={() => {
                    const code = props.element.children?.map((c) => Node.string(c)).join('\n')
                    window.api.copyToClipboard(code)
                    message$.next({
                      type: 'success',
                      content: 'Copied to clipboard'
                    })
                  }}
                >
                  <ICopy />
                </div>
              </div>
            </div>
          )}
          {!props.element.frontmatter && <DragHandle />}
          <pre className={`code-line-list select-none`} contentEditable={false}>
            {!core.config.config.codeAutoBreak &&
              (props.children || []).map((c, i) => <div key={i} />)}
          </pre>
          <pre data-bl-type={'code'} className={'code-content'} data-bl-lang={state().lang}>
            {child}
          </pre>
        </div>
      </div>
      {props.element.language === 'mermaid' && (
        <Mermaid lines={props.element.children} el={props.element} />
      )}
      {!!props.element.katex && <Katex el={props.element} />}
      {props.element.language === 'html' && !!props.element.render && (
        <div
          className={'bg-gray-500/5 p-3 mb-3 whitespace-nowrap rounded leading-5 overflow-auto'}
          onClick={(e) => {
            e.stopPropagation()
            Transforms.select(
              editor,
              Editor.start(editor, ReactEditor.findPath(editor, props.element))
            )
          }}
          dangerouslySetInnerHTML={{
            __html: props.element.children?.map((c) => Node.string(c)).join('\n')
          }}
          contentEditable={false}
        />
      )}
    </CodeCtx.Provider>
  )
})

export const CodeLine = observer((props: ElementProps<CodeLineNode>) => {
  const ctx = useContext(CodeCtx)
  const store = useEditorStore()
  return useMemo(() => {
    return (
      <div className={`code-line`} data-be={'code-line'} {...props.attributes}>
        {props.children}
      </div>
    )
  }, [props.element, props.element.children, ctx.lang, store.refreshHighlight])
})
