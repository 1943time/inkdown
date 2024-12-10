import { useCallback, useEffect, useRef } from 'react'
import { CodeNode, ElementProps } from '../../types/el'
import ace, { Ace } from 'ace-builds'
import '../utils/ace'
import isHotkey from 'is-hotkey'
import { ReactEditor } from 'slate-react'
import { useCoreContext } from '../../store/core'
import { Editor, Node, Path, Transforms } from 'slate'
import { useSelStatus } from '../../hooks/editor'
import { EditorUtils } from '../utils/editorUtils'
import { useGetSetState } from 'react-use'
import { Mermaid } from './CodeUI/Mermaid'
import { Katex } from './CodeUI/Katex/Katex'
import { langIconMap } from '../tools/langIconMap'
import { AutoComplete, Input, Popover } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { IArrowRight } from '../../icons/IArrowRight'
import { ICopy } from '../../icons/ICopy'
import { DragHandle } from '../tools/DragHandle'
import { useEditorStore } from '../store'
import { aceLangs, modeMap } from '../utils/ace'
import { filterScript } from '../utils/dom'

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

const findLink = (dom: HTMLElement) => {
  if (dom.tagName.toLowerCase() === 'a') {
    return dom
  }
  if (
    dom.parentElement &&
    [
      'span',
      'code',
      'b',
      'i',
      'strong',
      'kbd',
      'button',
      'img',
      'em',
      'label'
    ].includes(dom.tagName.toLowerCase())
  ) {
    return findLink(dom.parentElement)
  }
  return null
}

export function AceElement(props: ElementProps<CodeNode>) {
  const core = useCoreContext()
  const store = useEditorStore()
  const [state, setState] = useGetSetState({
    showBorder: false,
    htmlStr: '',
    hide: !!props.element.render || !!props.element.katex || props.element.language === 'mermaid',
    lang: props.element.language || '',
    openSelectMenu: false
  })
  const codeRef = useRef(props.element.code || '')
  const pathRef = useRef<Path>()
  const posRef = useRef({ row: 0, column: 0 })
  const pasted = useRef(false)
  const timmer = useRef(0)
  const [selected, path] = useSelStatus(props.element)
  pathRef.current = path
  const editorRef = useRef<Ace.Editor>()
  const dom = useRef<HTMLDivElement>(null)
  const update = useCallback(
    (data: Partial<CodeNode>) => {
      const code = editorRef.current?.getValue() || ''
      codeRef.current = code
      Transforms.setNodes(store.editor, data, { at: path })
    },
    [path]
  )

  useEffect(() => {
    if (
      selected &&
      !editorRef.current?.isFocused() &&
      ReactEditor.isFocused(store.editor)
    ) {
      setState({ showBorder: true })
    } else if (state().showBorder) {
      setState({ showBorder: false })
    }
  }, [selected, path])
  const setLanguage = useCallback(() => {
    if (props.element.language?.toLowerCase() === state().lang) return
    let lang = state().lang
    update({ language: state().lang })
    if (modeMap.has(lang)) {
      lang = modeMap.get(lang)!
    }
    if (aceLangs.has(lang)) {
      editorRef.current?.session.setMode(`ace/mode/${lang}`)
    } else {
      editorRef.current?.session.setMode(`ace/mode/text`)
    }
  }, [props.element, props.element.children, state().lang])

  useEffect(() => {
    let code = props.element.code || ''
    const editor = ace.edit(dom.current!, {
      useWorker: false,
      value: code,
      fontSize: 13,
      maxLines: Infinity,
      wrap: core.config.config.codeAutoBreak ? true : 'off',
      tabSize: core.config.config.codeTabSize,
      showPrintMargin: false
    })
    editor.commands.addCommand({
      name: 'disableFind',
      bindKey: { win: 'Ctrl-F', mac: 'Command-F' },
      exec: () => {}
    })

    const t = dom.current!.querySelector('textarea')
    editor.on('focus', () => {
      setState({ showBorder: false, hide: false })
    })
    editor.on('blur', () => {
      editor.selection.clearSelection()
      setState({
        hide:
          props.element.katex ||
          (props.element.render && props.element.language !== 'html') ||
          props.element.language === 'mermaid'
      })
    })
    editor.selection.on('changeCursor', (e: any) => {
      setTimeout(() => {
        const pos = editor.getCursorPosition()
        posRef.current = { row: pos.row, column: pos.column }
      })
    })
    editor.on('paste', e => {
      if (pasted.current) {
        e.text = ''
      } else {
        pasted.current = true
        setTimeout(() => {
          pasted.current = false
        }, 60)
      }
    })
    t?.addEventListener('keydown', (e) => {
      if (isHotkey('backspace', e)) {
        if (!codeRef.current) {
          const path = ReactEditor.findPath(store.editor, props.element)
          Transforms.delete(store.editor, { at: path })
          Transforms.insertNodes(
            store.editor,
            {
              type: 'paragraph',
              children: [{ text: '' }]
            },
            { at: path }
          )
          Transforms.select(store.editor, Editor.start(store.editor, path))
          ReactEditor.focus(store.editor)
        }
      }
      if (isHotkey('mod+enter', e) && pathRef.current) {
        EditorUtils.focus(store.editor)
        Transforms.insertNodes(
          store.editor,
          { type: 'paragraph', children: [{ text: '' }] },
          {
            at: Path.next(pathRef.current),
            select: true
          }
        )
        e.stopPropagation()
        return
      }
      if (isHotkey('up', e)) {
        if (posRef.current.row === 0 && posRef.current.column === 0 && !props.element.frontmatter) {
          EditorUtils.focus(store.editor)
          const path = pathRef.current!
          if (Path.hasPrevious(path)) {
            EditorUtils.selectPrev(store, path)
          } else {
            Transforms.insertNodes(store.editor, EditorUtils.p, {
              at: path,
              select: true
            })
          }
        }
      }
      if (isHotkey('down', e)) {
        const length = editor.getSession().getLength()
        if (
          posRef.current.row === length - 1 &&
          posRef.current.column === editor.session.getLine(length - 1)?.length
        ) {
          EditorUtils.focus(store.editor)
          const path = pathRef.current!
          if (Editor.hasPath(store.editor, Path.next(path))) {
            EditorUtils.selectNext(store, path)
          } else {
            Transforms.insertNodes(store.editor, EditorUtils.p, {
              at: Path.next(path),
              select: true
            })
          }
        }
      }
      const newEvent = new KeyboardEvent(e.type, e)
      window.dispatchEvent(newEvent)
    })
    let lang = props.element.language as string
    setTimeout(() => {
      if (core.config.config.dark) {
        editor.setTheme(`ace/theme/cloud9_night`)
      } else {
        editor.setTheme('ace/theme/cloud_editor')
      }
      if (modeMap.has(lang)) {
        lang = modeMap.get(lang)!
      }
      if (aceLangs.has(lang)) {
        editor.session.setMode(`ace/mode/${lang}`)
      }
    }, 16)
    editorRef.current = editor
    editor.on('change', (e) => {
      clearTimeout(timmer.current)
      timmer.current = window.setTimeout(() => {
        update({ code: editor.getValue() })
      }, 100)
    })
    return () => {
      editor.destroy()
    }
  }, [])
  useEffect(() => {
    store.codes.set(props.element, editorRef.current!)
    if (props.element.language === 'html' && !!props.element.render) {
      setState({
        htmlStr: filterScript(props.element.code)
      })
    }
    if (props.element.code !== codeRef.current) {
      editorRef.current?.setValue(props.element.code)
    }
  }, [props.element])
  return (
    <div
      {...props.attributes}
      contentEditable={false}
      className={'ace-el drag-el'}
      data-be={'code'}
      data-lang={props.element.language}
    >
      {!props.element.frontmatter && <DragHandle />}
      <div
        onClick={(e) => {
          e.stopPropagation()
          editorRef.current?.focus()
        }}
        style={{
          padding: state().hide ? 0 : undefined,
          marginBottom: state().hide ? 0 : undefined
        }}
        className={`ace-container drag-el ${
          props.element.frontmatter ? 'frontmatter' : ''
        } ${!state().hide ? 'border-2' : 'h-0 opacity-0'} ${
          state().showBorder
            ? 'bg-blue-500/10 dark:bg-blue-500/10'
            : 'bg-[rgb(252,252,252)] dark:bg-[rgba(36,38,41,.4)]'
        }`}
      >
        {!props.element.frontmatter && (
          <div
            contentEditable={false}
            onClick={e => {
              e.stopPropagation()
            }}
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
                    ;(
                      document.querySelector(
                        '.lang-select input'
                      ) as HTMLInputElement
                    )?.focus()
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
                    <div
                      className={
                        'h-4 w-4 flex items-center justify-center mr-1'
                      }
                    >
                      <img
                        className={'w-4 h-4'}
                        src={langIconMap.get(
                          props.element.language?.toLowerCase()!
                        )}
                      />
                    </div>
                  )}
                <div>
                  {props.element.language ? (
                    <span>
                      {props.element.katex
                        ? 'Formula'
                        : props.element.language === 'html' &&
                          props.element.render
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
                className={
                  'text-lg cursor-pointer hover:text-black/80 dark:hover:text-white/80'
                }
                onClick={(e) => {
                  e.stopPropagation()
                  const code = props.element.code || ''
                  window.api.copyToClipboard(code)
                    core.message.success('Copied to clipboard')
                }}
              >
                <ICopy />
              </div>
            </div>
          </div>
        )}
        <div ref={dom} style={{ height: 20, lineHeight: '22px' }}></div>
        <div className={'hidden'}>{props.children}</div>
      </div>
      {props.element.language === 'mermaid' && <Mermaid el={props.element} />}
      {!!props.element.katex && <Katex el={props.element} />}
      {props.element.language === 'html' && !!props.element.render && (
        <div
          className={
            'bg-gray-500/5 p-3 mb-3 whitespace-nowrap rounded leading-5 overflow-auto'
          }
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            EditorUtils.focusAceEnd(editorRef.current!)
          }}
          dangerouslySetInnerHTML={{
            __html: state().htmlStr
          }}
          contentEditable={false}
        />
      )}
    </div>
  )
}
