import { ReactEditor } from 'slate-react'
import { useGetSetState } from 'react-use'
import { createContext, useCallback, useContext, useMemo } from 'react'
import { AutoComplete, Tooltip } from 'antd'
import { useMEditor } from '../../hooks/editor'
import { CodeLineNode, CodeNode, ElementProps } from '../../el'
import { codeCache } from '../plugins/useHighlight'
import { Mermaid } from './CodeUI/Mermaid'
import { Katex } from './CodeUI/Katex/Katex'
import { observer } from 'mobx-react-lite'
import { useEditorStore } from '../store'
import { configStore } from '../../store/config'
import { Editor, Node, Path, Transforms } from 'slate'
import { useSubject } from '../../hooks/subscribe'
import { selChange$ } from '../plugins/useOnchange'
import { DragHandle } from '../tools/DragHandle'
import { runInAction } from 'mobx'
import { allLanguages } from '../utils/highlight'
import { IMenu, openMenus } from '../../components/Menu'
import { Icon } from '@iconify/react'
import { message$ } from '../../utils'
import { EditorUtils } from '../utils/editorUtils'

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
    openMenu: false,
    hide: props.element.katex || props.element.render || props.element.language?.toLowerCase() === 'mermaid'
  })

  const setLanguage = useCallback(() => {
    setState({editable: false})
    if (props.element.language?.toLowerCase() === state().lang) return
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
      if (ctx && ctx.node && ctx.node[0].type === 'code-line' && ctx.sel) {
        const show = Path.equals(ReactEditor.findPath(store.editor, props.element), Path.parent(ctx.node[1]))
        setState({hide: !show})
        return
      }
      setState({hide: true})
    }
  }, [props.element])
  return (
    <CodeCtx.Provider value={{ lang: state().lang || '', code: true }}>
      <div
        className={`code-container ${configStore.config.codeAutoBreak ? 'wrap' : ''}`}
        {...props.attributes}
        style={{
          padding: state().hide ? 1 : undefined,
          marginBottom: state().hide ? 0 : undefined
        }}
      >
        <div
          data-be={'code'}
          style={{
            background: /#f{3,6}/i.test(configStore.config.codeBackground || '')
              ? '#fafafa'
              : configStore.config.codeBackground
          }}
          onDragStart={store.dragStart}
          className={`${configStore.codeDark ? 'dark' : 'light'} drag-el ${
            props.element.frontmatter ? 'frontmatter' : ''
          } ${configStore.config.codeLineNumber && !store.webview ? 'num' : ''} tab-${
            configStore.config.codeTabSize
          } code-highlight ${!state().hide ? '' : 'h-0 overflow-hidden border-none'} ${
            !!props.element.katex ? 'katex-container' : ''
          }`}
        >
          {!props.element.frontmatter && <DragHandle />}
          <div
            className={`absolute z-10 right-2 top-1 flex items-center select-none`}
            contentEditable={false}
          >
            {state().editable && (
              <AutoComplete
                size={'small'}
                value={state().lang}
                options={langOptions}
                style={{ width: 130 }}
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
                  }
                }}
                onBlur={setLanguage}
                className={'lang-select'}
              />
            )}
            {!state().editable && (
              <>
                {!props.element.frontmatter && (
                  <div
                    className={`${
                      state().openMenu
                        ? 'bg-gray-400/20'
                        : 'group-hover:opacity-100 hover:bg-gray-400/20'
                    } duration-200 hover:text-blue-400 text-gray-400 rounded px-1.5 py-0.5 text-xs cursor-pointer`}
                    onClick={(e) => {
                      if (props.element.render) {
                        return
                      }
                      setState({ openMenu: true })
                      const menus: IMenu[] = [
                        {
                          text: (
                            <div className={'flex items-center'}>
                              <Icon icon={'fluent:copy-16-regular'} className={'mr-1.5 text-lg'} />
                              copy
                            </div>
                          ),
                          click: () => {
                            window.api.copyToClipboard(
                              props.element.children?.map((c) => Node.string(c)).join('\n')
                            )
                            message$.next({
                              type: 'success',
                              content: 'Copied to clipboard'
                            })
                          }
                        },
                        { hr: true },
                        {
                          text: (
                            <div className={'flex items-center'}>
                              <Icon
                                icon={'material-symbols-light:delete-outline'}
                                className={'mr-1.5 text-lg'}
                              />
                              delete
                            </div>
                          ),
                          click: () => {
                            try {
                              Transforms.delete(editor, {
                                at: ReactEditor.findPath(editor, props.element)
                              })
                            } catch (e) {
                              console.error('delete code node error', e)
                            }
                          }
                        }
                      ]
                      if (!props.element.katex) {
                        menus.unshift({
                          text: (
                            <div className={'flex items-center'}>
                              <Icon icon={'ic:sharp-code'} className={'mr-1.5 text-lg'} />
                              {props.element.katex
                                ? 'Formula'
                                : props.element.language || 'plain text'}
                            </div>
                          ),
                          click: () => {
                            EditorUtils.blur(store.editor)
                            setState({ editable: true })
                            setTimeout(() => {
                              document
                                .querySelector<HTMLInputElement>('.lang-select input')
                                ?.focus()
                            }, 30)
                          }
                        })
                      }
                      openMenus(e, menus, () => {
                        setState({ openMenu: false })
                      })
                    }}
                  >
                    {props.element.language ? (
                      <span>
                        {props.element.katex
                          ? 'Formula'
                          : props.element.language === 'html' && props.element.render
                          ? 'Html Rendering'
                          : props.element.language}
                      </span>
                    ) : (
                      <span>{'plain text'}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {configStore.config.codeLineNumber && !store.webview && (
            <pre className={`code-line-list select-none`} contentEditable={false}>
              {!configStore.config.codeAutoBreak && (props.children || []).map((c, i) => (
                <div key={i} />
              ))}
            </pre>
          )}
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
      <div
        className={`code-line`}
        data-be={'code-line'}
        {...props.attributes}>
        {props.children}
      </div>
    )
  }, [props.element, props.element.children, ctx.lang, store.refreshHighlight])
})
