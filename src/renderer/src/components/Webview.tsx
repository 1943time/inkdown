import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {SetNodeToDecorations, useHighlight} from '../editor/plugins/useHighlight'
import {Placeholder} from '../editor/tools/Placeholder'
import {Editable, Slate, withReact} from 'slate-react'
import {MElement, MLeaf} from '../editor/elements'
import {withMarkdown} from '../editor/plugins'
import {withHistory} from 'slate-history'
import {createEditor} from 'slate'
import {EditorUtils} from '../editor/utils/editorUtils'
import {EditorStore, EditorStoreContext} from '../editor/store'
import {treeStore} from '../store/tree'
import {observer} from 'mobx-react-lite'
import {configStore} from '../store/config'

export const Webview = observer((props: {
  value?: any[]
  history?: boolean
}) => {
  const [editor] = useState(() => withMarkdown(withReact(withHistory(createEditor()))))
  const store = useMemo(() => new EditorStore(editor, true, props.history), [])
  const renderElement = useCallback((props: any) => <MElement {...props} children={props.children}/>, [])
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children}/>, [])
  const high = useHighlight(store)
  const print = (filePath: string) => {
    treeStore.openNewNote(filePath)
    EditorUtils.reset(editor, treeStore.schemaMap.get(treeStore.currentTab.current!)?.state || [])
    setTimeout(() => {
      window.electron.ipcRenderer.send('print-pdf-ready', filePath)
    }, 100)
  }
  useEffect(() => {
    if (!props.history) window.electron.ipcRenderer.invoke('print-dom-ready').then(print)
  }, [])

  useEffect(() => {
    EditorUtils.reset(editor, props.value)
  }, [props.value])

  return (
    <div className={`view w-full ${props.history ? '' : 'h-full'} content p-5 ${configStore.config.headingMarkLine ? 'heading-line' : ''}`}>
      <EditorStoreContext.Provider value={store}>
        <Slate
          editor={editor}
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
