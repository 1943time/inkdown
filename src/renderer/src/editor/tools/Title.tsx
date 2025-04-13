import { useCallback, useEffect, useRef } from 'react'
import { Tooltip } from 'antd'
import isHotkey from 'is-hotkey'
import { ReactEditor } from 'slate-react'
import { Editor, Transforms } from 'slate'
import { useGetSetState } from 'react-use'
import { IDoc } from 'types/model'
import { useStore } from '@/store/store'
import { TabStore } from '@/store/note/tab'
import { File } from 'lucide-react'

export function Title({ tab, doc }: { tab: TabStore; doc: IDoc }) {
  const store = useStore()
  const inputRef = useRef<HTMLDivElement>(null)
  const reduceFileName = store.settings.useState((state) => state.reduceFileName)
  const [state, setState] = useGetSetState({
    name: '',
    tip: false,
    tipMessage: ''
  })
  const nodeRef = useRef<IDoc | undefined>(doc)
  const setName = useCallback((name: string = '') => {
    if (inputRef.current) {
      inputRef.current.innerText = name
    }
    setState({ name })
  }, [])
  const getName = useCallback(() => {
    let name = (inputRef.current?.innerText || '').trim().replace(/\n/g, '')
    if (name.length > 300) {
      name = name.slice(0, 300)
      if (inputRef.current) {
        inputRef.current.innerText = name
      }
    }
    return name
  }, [])
  useEffect(() => {
    setState({ tip: false })
    setName(doc?.name)
  }, [doc])

  const detectRename = useCallback(async () => {
    const name = getName()
    if (name.includes('/')) {
      setState({
        tip: true,
        tipMessage: 'Please do not include special characters "/" in the file name.'
      })
      return false
    }
    const count = await store.model.findDocName({
      spaceId: doc.spaceId,
      name: name,
      parentId: doc.parentId
    })
    if (count) {
      setState({ tip: true, tipMessage: '' })
      return false
    }
    setState({ tip: false, tipMessage: '' })
    return true
  }, [doc])

  const save = useCallback(async () => {
    const name = getName()
    if (name === doc.name) {
      setState({ tip: false, tipMessage: '' })
    } else if (doc && (await detectRename())) {
      if (!name) {
        setName(doc.name)
      } else {
        // await core.service.rename(node, name)
        // refreshNavPath$.next(node)
        setState({ tip: false, tipMessage: '' })
      }
    }
  }, [doc])
  // useSubject(core.ipc.updateDoc$, (data) => {
  //   if (data.cid === nodeRef.current?.cid && data.title) {
  //     setName(data.title)
  //   }
  // })
  return (
    <Tooltip
      title={state().tipMessage || '已经有一个同名的文件'}
      color={'magenta'}
      open={state().tip}
      placement={'bottom'}
    >
      <div
        className={`${reduceFileName === 'true' ? 'mini mt-8 flex items-baseline mb-6 ' : 'mt-12 mb-4'}`}
      >
        {reduceFileName === 'true' && (
          <File
            className={
              'mr-1 relative top-0.5 text-sm flex-shrink-0 w-4 h-4 dark:text-white/60 text-black/60'
            }
          />
        )}
        <div
          contentEditable={true}
          ref={inputRef}
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData.getData('text/plain')
            if (text) {
              document.execCommand('insertText', false, text.replace(/\/|\n/g, ''))
            }
          }}
          suppressContentEditableWarning={true}
          onKeyDown={(e) => {
            if (
              inputRef.current &&
              inputRef.current.innerText.length > 300 &&
              e.key.toLowerCase() !== 'backspace' &&
              e.key.toLowerCase() !== 'enter'
            ) {
              e.preventDefault()
            }
            if (e.key.toLowerCase() === 'enter') {
              e.preventDefault()
            }
            if (isHotkey('mod+s', e)) {
              e.preventDefault()
              save()
            }
            if (isHotkey('enter', e) || isHotkey('down', e)) {
              e.preventDefault()
              try {
                ReactEditor.focus(tab.editor)
                Transforms.select(tab.editor, Editor.start(tab.editor, []))
              } catch (e) {
                console.error(e)
              }
            }
          }}
          onBlur={save}
          className={`page-title`}
        />
      </div>
    </Tooltip>
  )
}
