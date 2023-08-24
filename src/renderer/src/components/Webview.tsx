import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {markdownParser} from '../editor/parser'
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

export const Webview = observer(() => {
  const [editor] = useState(() => withMarkdown(withReact(withHistory(createEditor()))))
  const store = useMemo(() => new EditorStore(editor, true), [])
  const renderElement = useCallback((props: any) => <MElement {...props} children={props.children}/>, [])
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children}/>, [])
  const print = (filePath: string) => {
    treeStore.openNewNote(filePath)
    EditorUtils.reset(editor, treeStore.schemaMap.get(treeStore.currentTab.current!)?.state || [])
    setTimeout(() => {
      window.electron.ipcRenderer.send('print-pdf-ready', filePath)
    }, 100)
  }
  useEffect(() => {
    window.electron.ipcRenderer.invoke('print-dom-ready').then(print)
  }, [])
  return (
    <div className={'w-full h-full content p-5'}>
      <EditorStoreContext.Provider value={store}>
        <Slate
          editor={editor}
          initialValue={[]}
        >
          <SetNodeToDecorations/>
          <Placeholder/>
          <Editable
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
