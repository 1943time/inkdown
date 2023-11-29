import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {SetNodeToDecorations, useHighlight} from '../editor/plugins/useHighlight'
import {Placeholder} from '../editor/tools/Placeholder'
import {Editable, Slate, withReact} from 'slate-react'
import {MElement, MLeaf} from '../editor/elements'
import {EditorUtils} from '../editor/utils/editorUtils'
import {EditorStore, EditorStoreContext} from '../editor/store'
import {observer} from 'mobx-react-lite'
import {configStore} from '../store/config'
import {parserMdToSchema} from '../editor/parser/parser'
import {readFileSync} from 'fs'

export const Webview = observer((props: {
  value?: any[]
  history?: boolean
  filePath?: string
}) => {
  const [ready, setReady] = useState(!!props.history)
  const store = useMemo(() => new EditorStore(true, props.history), [])
  const renderElement = useCallback((props: any) => <MElement {...props} children={props.children}/>, [])
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children}/>, [])
  const high = useHighlight(store)
  const print = async (filePath: string) => {
    store.webviewFilePath = filePath
    setReady(true)
    const schema = await parserMdToSchema([readFileSync(filePath, {encoding: 'utf-8'})])
    EditorUtils.reset(store.editor, schema[0] || [])
    setTimeout(() => {
      window.electron.ipcRenderer.send('print-pdf-ready', filePath)
    }, 300)
  }
  useEffect(() => {
    if (!props.history) window.electron.ipcRenderer.invoke('print-dom-ready').then(print)
  }, [])

  useEffect(() => {
    EditorUtils.reset(store.editor, props.value)
    store.webviewFilePath = props.filePath || null
  }, [props.value, props.filePath])

  if (!ready) return null
  return (
    <div className={`view w-full ${props.history ? '' : 'h-full'} content p-5 heading-line ${props.history ? '' : 'pdf'}`}>
      <EditorStoreContext.Provider value={store}>
        <Slate
          editor={store.editor}
          initialValue={[]}
        >
          <SetNodeToDecorations/>
          <Placeholder/>
          <Editable
            decorate={props.history ? high : undefined}
            spellCheck={false}
            readOnly={true}
            className={'w-full h-full'}
            renderElement={renderElement}
            renderLeaf={renderLeaf}
          />
        </Slate>
      </EditorStoreContext.Provider>
    </div>
  )
})
