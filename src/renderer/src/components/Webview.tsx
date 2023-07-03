import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {markdownParser} from '../editor/parser'
import {SetNodeToDecorations, useHighlight} from '../editor/plugins/useHighlight'
import {Placeholder} from '../editor/tools/Placeholder'
import {Editable, Slate, withReact} from 'slate-react'
import {treeStore} from '../store/tree'
import {htmlParser} from '../editor/plugins/htmlParser'
import {MElement, MLeaf} from '../editor/elements'
import {withMarkdown} from '../editor/plugins'
import {withHistory} from 'slate-history'
import {createEditor} from 'slate'
import {EditorUtils} from '../editor/utils/editorUtils'
import {EditorStore, EditorStoreContext} from '../editor/store'
export function Webview() {
  const [editor] = useState(() => withMarkdown(withReact(withHistory(createEditor()))))
  const store = useMemo(() => new EditorStore(editor), [])
  const high = useHighlight()
  const renderElement = useCallback((props: any) => <MElement {...props} children={props.children}/>, [])
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children}/>, [])
  useEffect(() => {
    window.electron.ipcRenderer.on('print-pdf-load', (e, filePath: string) => {
      const schema = markdownParser(filePath).schema
      EditorUtils.reset(editor, schema)
      setTimeout(() => {
        window.electron.ipcRenderer.sendToHost('print-pdf-ready')
      }, 300)
    })
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
            decorate={high}
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
}
