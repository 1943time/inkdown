import { memo, useCallback, useEffect, useRef } from 'react'
import ace, { Ace } from 'ace-builds'
import isHotkey from 'is-hotkey'
import { ReactEditor } from 'slate-react'
import { Editor, Path, Transforms } from 'slate'
import { EditorUtils } from '../utils/editorUtils'
import { useGetSetState } from 'react-use'
import { langIconMap } from '../tools/langIconMap'
import { AutoComplete, Input, Popover } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { DragHandle } from '../tools/DragHandle'
import { aceLangs, modeMap } from '../utils/ace'
import { filterScript } from '../utils/dom'
import Mermaid from './CodeUI/Mermaid'
import Katex from './CodeUI/Katex/Katex'
import { CodeNode, ElementProps } from '..'
import { useTab } from '@/store/note/TabCtx'
import { ChevronDown, Copy } from 'lucide-react'
import { useSelStatus } from '../utils'

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
    ['span', 'code', 'b', 'i', 'strong', 'kbd', 'button', 'img', 'em', 'label'].includes(
      dom.tagName.toLowerCase()
    )
  ) {
    return findLink(dom.parentElement)
  }
  return null
}

export const AceElement = memo(({ element, attributes, children }: ElementProps<CodeNode>) => {
  const tab = useTab()
  const [state, setState] = useGetSetState({
    showBorder: false,
    htmlStr: '',
    hide: !!element.render || !!element.katex || element.language === 'mermaid',
    lang: (element.language || '').toLowerCase(),
    openSelectMenu: false
  })
  const [selected, path] = useSelStatus(element)
  const codeRef = useRef(element.code || '')
  const pathRef = useRef<Path>(path)
  pathRef.current = path
  const posRef = useRef({ row: 0, column: 0 })
  const pasted = useRef(false)
  const timmer = useRef(0)
  const editorRef = useRef<Ace.Editor>(null)
  const dom = useRef<HTMLDivElement>(null)
  const update = useCallback(
    (data: Partial<CodeNode>) => {
      const code = editorRef.current?.getValue() || ''
      codeRef.current = code
      Transforms.setNodes(tab.editor, data, { at: path })
    },
    [path]
  )

  useEffect(() => {
    if (selected && !editorRef.current?.isFocused() && ReactEditor.isFocused(tab.editor)) {
      setState({ showBorder: true })
    } else if (state().showBorder) {
      setState({ showBorder: false })
    }
  }, [selected])
  const setLanguage = useCallback(() => {
    if (element.language?.toLowerCase() === state().lang) return
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
  }, [element, state().lang])

  useEffect(() => {
    let code = element.code || ''
    const settings = tab.store.settings.useNoteSettings.getState()
    const editor = ace.edit(dom.current!, {
      useWorker: false,
      value: code,
      fontSize: 13,
      maxLines: Infinity,
      wrap: settings.codeAutoBreak ? true : 'off',
      tabSize: settings.codeTabSize,
      showPrintMargin: false,
      readOnly: tab.useState.getState().historyView
    })
    editor.commands.addCommand({
      name: 'disableFind',
      bindKey: { win: 'Ctrl-F', mac: 'Command-F' },
      exec: () => {}
    })
    const t = dom.current!.querySelector('textarea')
    editor.on('focus', (e) => {
      ReactEditor.blur(tab.editor)
      tab.editor.selection = null
      tab.hideRanges()
      setState({ showBorder: false, hide: false })
    })
    editor.on('blur', () => {
      editor.selection.clearSelection()
      const lang = state().lang
      setState({
        hide: element.katex || (element.render && lang !== 'html') || lang === 'mermaid'
      })
    })
    editor.selection.on('changeCursor', () => {
      setTimeout(() => {
        const pos = editor.getCursorPosition()
        posRef.current = { row: pos.row, column: pos.column }
      })
    })
    editor.on('paste', (e) => {
      if (pasted.current) {
        e.text = ''
      } else {
        pasted.current = true
        setTimeout(() => {
          pasted.current = false
        }, 60)
      }
    })
    editor.container?.addEventListener('mousedown', (e) => {
      e.stopPropagation()
      setTimeout(() => {
        if (!editor.isFocused()) {
          editor.focus()
        }
      }, 16)
    })
    t?.addEventListener('keydown', (e) => {
      if (isHotkey('backspace', e)) {
        if (!codeRef.current) {
          const path = ReactEditor.findPath(tab.editor, element)
          Transforms.delete(tab.editor, { at: path })
          Transforms.insertNodes(
            tab.editor,
            {
              type: 'paragraph',
              children: [{ text: '' }]
            },
            { at: path }
          )
          Transforms.select(tab.editor, Editor.start(tab.editor, path))
          ReactEditor.focus(tab.editor)
        }
      }
      if (isHotkey('mod+enter', e) && pathRef.current) {
        EditorUtils.focus(tab.editor)
        Transforms.insertNodes(
          tab.editor,
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
        if (posRef.current.row === 0 && posRef.current.column === 0 && !element.frontmatter) {
          EditorUtils.focus(tab.editor)
          const path = pathRef.current!
          if (Path.hasPrevious(path)) {
            tab.selectPrev(path)
          } else {
            Transforms.insertNodes(tab.editor, EditorUtils.p, {
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
          EditorUtils.focus(tab.editor)
          const path = pathRef.current!
          if (Editor.hasPath(tab.editor, Path.next(path))) {
            tab.selectNext(path)
          } else {
            Transforms.insertNodes(tab.editor, EditorUtils.p, {
              at: Path.next(path),
              select: true
            })
          }
        }
      }
      const newEvent = new KeyboardEvent(e.type, e)
      window.dispatchEvent(newEvent)
    })
    let lang = state().lang as string
    setTimeout(() => {
      if (tab.store.settings.useState.getState().dark) {
        editor.setTheme(`ace/theme/cloud_editor_dark`)
      } else {
        editor.setTheme('ace/theme/cloud_editor')
      }
      import('./acemodes').then(() => {
        if (modeMap.has(lang)) {
          lang = modeMap.get(lang)!
        }
        if (aceLangs.has(lang)) {
          editor.session.setMode(`ace/mode/${lang}`)
        }
      })
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
    tab.codeMap.set(element, editorRef.current!)
    if (element.language === 'html' && !!element.render) {
      setState({
        htmlStr: filterScript(element.code)
      })
    }
    if (element.code !== codeRef.current) {
      editorRef.current?.setValue(element.code)
    }
  }, [element, tab])
  return (
    <div
      {...attributes}
      contentEditable={false}
      className={'ace-el drag-el'}
      data-be={'code'}
      data-lang={element.language}
    >
      {!element.frontmatter && <DragHandle />}
      <div
        style={{
          padding: state().hide ? 0 : undefined,
          marginBottom: state().hide ? 0 : undefined
        }}
        className={`ace-container drag-el ${
          element.frontmatter ? 'frontmatter' : ''
        } ${!state().hide ? 'border-2' : 'h-0 opacity-0'} ${
          state().showBorder
            ? 'bg-blue-500/10 dark:bg-blue-500/10'
            : 'bg-[rgb(253,253,253)] dark:bg-[rgba(36,38,41,.4)]'
        }`}
      >
        {!element.frontmatter && (
          <div
            contentEditable={false}
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (!editorRef.current?.isFocused()) {
                editorRef.current?.focus()
              }
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
                if (element.katex || element.render) {
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
                  onClick={(e) => e.stopPropagation()}
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
                {langIconMap.get(element.language?.toLowerCase()!) && !element.katex && (
                  <div className={'h-4 w-4 flex items-center justify-center mr-1'}>
                    <img
                      className={'w-4 h-4'}
                      src={langIconMap.get(element.language?.toLowerCase()!)}
                    />
                  </div>
                )}
                <div>
                  {element.language ? (
                    <span>
                      {element.katex
                        ? 'Formula'
                        : element.language === 'html' && element.render
                          ? 'Html Renderer'
                          : element.language}
                    </span>
                  ) : (
                    <span>{'plain text'}</span>
                  )}
                </div>
                {!element.katex && !element.render && <ChevronDown className={'text-lg ml-0.5'} />}
              </div>
            </Popover>
            <div>
              <div
                className={'text-lg cursor-pointer hover:text-black/80 dark:hover:text-white/80'}
                onMouseDown={(e) => {
                  e.preventDefault()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  const code = element.code || ''
                  tab.store.copySuccessfully(code)
                }}
              >
                <Copy />
              </div>
            </div>
          </div>
        )}
        <div ref={dom} style={{ height: 20, lineHeight: '22px' }}></div>
        <div className={'hidden'}>{children}</div>
      </div>
      {element.language === 'mermaid' && <Mermaid el={element} />}
      {!!element.katex && <Katex el={element} />}
      {element.language === 'html' && !!element.render && (
        <div
          className={'bg-gray-500/5 p-3 mb-3 whitespace-nowrap rounded leading-5 overflow-auto'}
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
})
